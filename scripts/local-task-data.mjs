import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const tenant = 'local-tenant';
const database = 'eaf_project_f194fd0628';
const container = 'shichuang-manage-mysql';
const docker = process.env.DOCKER_BIN || '/Users/maojingqiang/.docker/bin/docker';
const hash = (value) => createHash('sha256').update(value).digest().readUInt32BE();
const pick = (items, key) => items[hash(key) % items.length];
const day = (value) => value ? String(value).slice(0, 10) : null;
const addDays = (value, count) => new Date(Date.parse(value + 'T00:00:00Z') + count * 86400000).toISOString().slice(0, 10);
const blank = (value) => value == null || String(value).trim() === '';
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sqlValue = (value) => value == null ? 'NULL' : typeof value === 'number' ? String(value)
  : `CONVERT(0x${Buffer.from(String(value), 'utf8').toString('hex')} USING utf8mb4)`;
const target = (w) => ['requirement', 'design', 'dev', 'test', 'bug'].includes(w.category_)
  && !(w.category_ === 'requirement' && !blank(w.work_order_type_));

export function buildPlan(data) {
  const users = data.users.filter(u => u.status_ === 'enabled');
  const planners = users.filter(u => u.department_ === '产品规划部');
  const testerIds = new Set(data.members.filter(m => m.role_ === '测试').map(m => m.user_id_));
  const testers = users.filter(u => testerIds.has(u.id_));
  const reporters = users.filter(u => ['产品规划部', '交互设计部', '软件研发部'].includes(u.department_) || testerIds.has(u.id_));
  if (!planners.length || !testers.length || !reporters.length) throw new Error('人员候选不足，禁止写入');
  const workflows = new Map(data.workflows.map(f => [f.id_, f]));
  const products = new Set(data.products.map(p => p.id_));
  const types = new Map(data.types.map(t => [t.id_, t]));
  const versions = new Map(data.versions.map(v => [v.id_, v]));
  const originals = data.items.filter(target);
  const planned = new Map();
  for (const original of originals) {
    const w = { ...original };
    const id = w.id_;
    if (!products.has(w.product_line_id_)) throw new Error(`产品关联无效：${id}`);
    const type = types.get(w.task_type_id_);
    const workflow = workflows.get(w.workflow_id_);
    if (!type || type.product_line_id_ !== w.product_line_id_ || !workflow || workflow.product_line_id_ !== w.product_line_id_
      || workflow.category_ !== w.category_ || workflow.status_ !== 'PUBLISHED') throw new Error(`类型或发布流程无效：${id}`);
    const ownerPool = w.category_ === 'bug' ? testers : planners;
    const creatorPool = w.category_ === 'bug' ? reporters : planners;
    const owner = ownerPool.find(u => u.id_ === w.assignee_id_) || pick(ownerPool, id + ':owner');
    const creator = creatorPool.find(u => u.id_ === w.create_by_) || pick(creatorPool, id + ':creator');
    Object.assign(w, { assignee_id_: owner.id_, assignee_name_: owner.name_, create_by_: creator.id_, creator_name_: creator.name_, department_: creator.department_ });
    const states = workflow.definition_.states.filter(s => s.enabled);
    const state = states.find(s => s.name === w.status_name_) || states.find(s => s.key === w.status_key_) || states.find(s => s.initial);
    if (!state) throw new Error(`流程缺少可用状态：${id}`);
    Object.assign(w, { status_key_: state.key, status_name_: state.name, status_group_: state.group, status_color_: state.color || 'neutral', successful_: Number(state.successful) });
    const rawPriority = String(w.priority_ || '');
    w.priority_ = rawPriority.match(/^P[0-3](?:$|-)/)?.[0].slice(0, 2)
      || ({ '紧急': 'P0', '高': 'P1', '中': 'P2', '低': 'P3' })[rawPriority] || pick(['P0', 'P1', 'P2', 'P3'], id + ':priority');
    const version = versions.get(w.version_id_);
    if (w.version_id_ && (!version || version.product_line_id_ !== w.product_line_id_)) throw new Error(`版本关联无效：${id}`);
    const rangeStart = day(version?.start_date_) || '2026-09-21';
    const rangeEnd = day(version?.end_date_) || '2026-10-09';
    if (rangeEnd < rangeStart) throw new Error(`版本计划倒置：${id}`);
    const rangeLength = Math.round((Date.parse(rangeEnd) - Date.parse(rangeStart)) / 86400000);
    let start = day(w.planned_start_date_);
    let end = day(w.planned_end_date_);
    if (!start || (version && (start < rangeStart || start > rangeEnd))) start = addDays(rangeStart, hash(id + ':start') % Math.max(1, Math.min(8, rangeLength + 1)));
    if (!end || end < start || (version && end > rangeEnd)) end = [addDays(start, 2 + hash(id + ':duration') % 6), rangeEnd].sort()[0];
    w.planned_start_date_ = start;
    w.planned_end_date_ = end;
    if (!(Number(w.estimated_hours_) > 0)) w.estimated_hours_ = pick([4, 8, 12, 16, 24, 32], id + ':estimate');
    if (state.group === 'NOT_STARTED') {
      w.actual_hours_ = 0;
      w.actual_start_at_ = null;
      w.completed_at_ = null;
      w.progress_ = 0;
    } else {
      if (!(Number(w.actual_hours_) > 0)) w.actual_hours_ = Math.round(Number(w.estimated_hours_) * (state.successful ? 0.9 : 0.35) * 4) / 4;
      const actualStart = [start, '2026-09-28'].sort()[0] + ' 09:00:00.000000';
      if (!w.actual_start_at_) w.actual_start_at_ = actualStart;
      if (state.group === 'COMPLETED' || state.group === 'CANCELLED') {
        if (!w.completed_at_) w.completed_at_ = [end, '2026-09-29'].sort()[0] + ' 18:00:00.000000';
        w.progress_ = state.successful ? 100 : 0;
      } else {
        w.completed_at_ = null;
        if (!(Number(w.progress_) > 0 && Number(w.progress_) < 100)) w.progress_ = pick([20, 35, 50, 65, 80], id + ':progress');
      }
    }
    if (blank(w.description_)) w.description_ = `围绕“${w.title_}”完成${({requirement:'需求梳理与方案确认',design:'交互与视觉设计',dev:'功能实现和联调',test:'测试执行与结果记录',bug:'问题复现、处理跟踪和回归验证'})[w.category_]}，记录关键结果并同步关联产品。`;
    if (blank(w.description_html_)) w.description_html_ = '<p>' + w.description_.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '</p><p>') + '</p>';
    if (blank(w.expected_goal_)) w.expected_goal_ = `“${w.title_}”的约定范围已完成，关键结果可查看，异常及后续处理有记录。`;
    planned.set(id, w);
  }
  for (const w of planned.values()) {
    if (!w.parent_work_item_id_) continue;
    const parent = planned.get(w.parent_work_item_id_);
    if (!parent || parent.product_line_id_ !== w.product_line_id_ || parent.category_ !== w.category_ || w.category_ === 'bug') throw new Error(`父子关系无效：${w.id_}`);
    w.version_id_ = parent.version_id_;
  }
  for (const parent of planned.values()) {
    const children = [...planned.values()].filter(w => w.parent_work_item_id_ === parent.id_);
    if (!children.length) continue;
    if (['COMPLETED', 'CANCELLED'].includes(parent.status_group_) && children.some(w => !w.successful_)) throw new Error(`父任务已结束但子任务未完成：${parent.id_}`);
    parent.planned_start_date_ = [parent.planned_start_date_, ...children.map(w => w.planned_start_date_)].sort()[0];
    parent.planned_end_date_ = [parent.planned_end_date_, ...children.map(w => w.planned_end_date_)].sort().at(-1);
  }
  for (const original of originals) {
    const w = planned.get(original.id_);
    const expected = day(original.expected_complete_date_);
    if (!expected || expected === day(original.planned_end_date_)) {
      w.expected_complete_date_ = hash(w.id_ + ':expected') % 3 === 0 ? null
        : addDays(w.planned_end_date_, 1 + hash(w.id_ + ':expected-offset') % 3);
    } else w.expected_complete_date_ = expected;
  }
  return originals.map(before => {
    const after = planned.get(before.id_);
    const changes = Object.fromEntries(Object.entries(after).filter(([key, value]) => !equal(value, before[key])));
    return { id: before.id_, product: before.product_line_id_, revision: before.version_, before, changes };
  }).filter(p => Object.keys(p.changes).length);
}

function mysql(sql) {
  const result = spawnSync(docker, ['exec', '-i', container, 'sh', '-c',
    `MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 --batch --raw --skip-column-names -u "$MYSQL_USER" -D ${database}`], { input: sql, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || '本地 MySQL 执行失败');
  return result.stdout.trim();
}
function rows(table) {
  if (!/^t_[a-z_]+$/.test(table)) throw new Error('非法表名');
  const fields = mysql(`SHOW COLUMNS FROM ${table};`).split('\n').map(row => row.split('\t')[0]);
  const pairs = fields.map(f => `${sqlValue(f)},\`${f}\``).join(',');
  return JSON.parse(mysql(`SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(${pairs})),JSON_ARRAY()) FROM ${table} WHERE tenant_id_=${sqlValue(tenant)} AND delete_flag_=0;`));
}
function snapshot() {
  return { items: rows('t_product_work_item'), users: rows('t_sys_user'), members: rows('t_product_line_member'),
    products: rows('t_product_line'), types: rows('t_product_line_work_item_type'), workflows: rows('t_product_workflow'), versions: rows('t_product_line_version') };
}
function main() {
  const apply = process.argv.includes('--apply');
  const context = spawnSync(docker, ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], { encoding: 'utf8' });
  if (context.status !== 0 || !/^unix:\/\//.test(context.stdout.trim()) || process.env.DOCKER_HOST) {
    throw new Error('仅允许连接本机 Docker Unix socket，禁止写入远程数据库');
  }
  const data = snapshot();
  const plan = buildPlan(data);
  const counts = {};
  for (const p of plan) for (const field of Object.keys(p.changes)) counts[field] = (counts[field] || 0) + 1;
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', targets: data.items.filter(target).length, updates: plan.length, fields: counts }, null, 2));
  if (!apply || !plan.length) return;
  const output = resolve('.codex-tmp', 'task-data-' + new Date().toISOString().replaceAll(/[:.]/g, '-'));
  mkdirSync(output, { recursive: true, mode: 0o700 });
  const backup = spawnSync(docker, ['exec', container, 'sh', '-c', `MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --default-character-set=utf8mb4 -u "$MYSQL_USER" --single-transaction --no-tablespaces ${database}`], { maxBuffer: 64 * 1024 * 1024 });
  if (backup.status !== 0 || !backup.stdout.length) throw new Error('备份失败，禁止写入');
  writeFileSync(resolve(output, 'before.sql'), backup.stdout, { mode: 0o600 });
  writeFileSync(resolve(output, 'plan.json'), JSON.stringify(plan, null, 2), { mode: 0o600 });
  const statements = ['START TRANSACTION;', 'CREATE TEMPORARY TABLE task_data_guard(ok_ INT NOT NULL);'];
  for (const p of plan) {
    statements.push(`SELECT id_ FROM t_product_work_item WHERE id_=${sqlValue(p.id)} AND tenant_id_=${sqlValue(tenant)} FOR UPDATE;`);
    statements.push(`INSERT INTO task_data_guard SELECT IF(COUNT(*)=1,1,NULL) FROM t_product_work_item WHERE id_=${sqlValue(p.id)} AND tenant_id_=${sqlValue(tenant)} AND version_=${p.revision} AND delete_flag_=0;`);
    statements.push(`UPDATE t_product_work_item SET ${Object.entries(p.changes).map(([k, v]) => `\`${k}\`=${sqlValue(v)}`).join(',')},version_=version_+1,update_by_='user-admin',update_time_=NOW(6) WHERE id_=${sqlValue(p.id)} AND tenant_id_=${sqlValue(tenant)} AND version_=${p.revision} AND delete_flag_=0;`);
    const content = JSON.stringify({ title: '本地展示数据补齐', fields: Object.keys(p.changes), before: Object.fromEntries(Object.keys(p.changes).map(k => [k, p.before[k]])), after: p.changes });
    statements.push(`INSERT INTO t_product_work_item_activity(id_,tenant_id_,product_line_id_,subject_id_,event_type_,content_,create_by_,create_time_) VALUES(${sqlValue(randomUUID())},${sqlValue(tenant)},${sqlValue(p.product)},${sqlValue(p.id)},'LOCAL_DATA_ENRICHED',CAST(${sqlValue(content)} AS JSON),'user-admin',NOW(6));`);
  }
  statements.push('COMMIT;');
  mysql(statements.join('\n'));
  const after = snapshot();
  const remaining = buildPlan(after);
  if (remaining.length) throw new Error(`补齐后仍有 ${remaining.length} 条不满足规则，请检查 ${output}`);
  const excludedBefore = data.items.filter(w => !target(w));
  const excludedAfter = after.items.filter(w => !target(w));
  if (!equal(excludedBefore.sort((a,b) => a.id_.localeCompare(b.id_)), excludedAfter.sort((a,b) => a.id_.localeCompare(b.id_)))) throw new Error('非目标记录变化，请核对备份');
  console.log(JSON.stringify({ updated: plan.length, remaining: 0, excludedUnchanged: excludedAfter.length, backup: output }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
