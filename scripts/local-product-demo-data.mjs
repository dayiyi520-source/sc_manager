import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const docker = process.env.DOCKER_BIN || '/Users/maojingqiang/.docker/bin/docker';
const container = 'shichuang-manage-mysql';
const database = 'eaf_project_f194fd0628';
const tenant = 'local-tenant';
const targetProduct = '师创砺知堂';
const value = (input) => input == null ? 'NULL' : typeof input === 'number' ? String(input) : input === '' ? "''" : `CONVERT(0x${Buffer.from(String(input)).toString('hex')} USING utf8mb4)`;

function mysql(sql) {
  const result = spawnSync(docker, ['exec', '-i', container, 'sh', '-c', `MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 --batch --raw --skip-column-names -u "$MYSQL_USER" -D ${database}`], { input: sql, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || '本地数据库操作失败');
  return result.stdout.trim();
}

function query(sql) {
  return JSON.parse(mysql(`SELECT COALESCE(JSON_ARRAYAGG(JSON_OBJECT(${sql.fields})),JSON_ARRAY()) FROM ${sql.from} WHERE ${sql.where};`));
}

function fields(alias, names) {
  return names.map((name) => `${value(name)},${alias}.${name}`).join(',');
}

function snapshot() {
  const scope = `tenant_id_=${value(tenant)} AND delete_flag_=0`;
  return {
    products: query({ fields: fields('p', ['id_', 'name_']), from: 't_product_line p', where: `p.${scope.replaceAll(' AND ', ' AND p.')}` }),
    templates: query({ fields: fields('t', ['id_', 'category_', 'name_', 'description_', 'enabled_', 'is_default_']), from: 't_work_item_template_type t', where: `t.${scope.replaceAll(' AND ', ' AND t.')}` }),
    templateFlows: query({ fields: fields('f', ['template_type_id_', 'definition_']), from: 't_work_item_template_workflow f', where: `f.${scope.replaceAll(' AND ', ' AND f.')}` }),
    types: query({ fields: fields('t', ['id_', 'product_line_id_', 'category_', 'name_', 'is_default_']), from: 't_product_line_work_item_type t', where: `t.${scope.replaceAll(' AND ', ' AND t.')}` }),
    flows: query({ fields: fields('f', ['id_', 'product_line_id_', 'task_type_id_', 'workflow_version_', 'definition_', 'status_']), from: 't_product_workflow f', where: `f.${scope.replaceAll(' AND ', ' AND f.')}` }),
    versions: query({ fields: fields('v', ['id_', 'product_line_id_', 'name_', 'start_date_', 'end_date_', 'status_']), from: 't_product_line_version v', where: `v.${scope.replaceAll(' AND ', ' AND v.')}` }),
    items: query({ fields: fields('w', ['id_', 'product_line_id_', 'category_', 'version_id_', 'status_name_', 'title_']), from: 't_product_work_item w', where: `w.${scope.replaceAll(' AND ', ' AND w.')}` }),
    users: query({ fields: fields('u', ['id_', 'name_', 'department_', 'status_']), from: 't_sys_user u', where: `u.${scope.replaceAll(' AND ', ' AND u.')}` })
  };
}

export function buildPlan(data) {
  const missing = data.products.flatMap((product) => data.templates.filter((template) => !data.types.some((type) => type.product_line_id_ === product.id_ && type.category_ === template.category_ && type.name_ === template.name_)).map((template) => ({ product, template })));
  const templateFlows = new Map(data.templateFlows.map((flow) => [flow.template_type_id_, flow]));
  for (const { template } of missing) if (!templateFlows.has(template.id_)) throw new Error(`模板 ${template.name_} 没有状态流程`);
  const product = data.products.find((entry) => entry.name_ === targetProduct);
  if (!product) throw new Error('目标产品不存在');
  const type = data.types.find((entry) => entry.product_line_id_ === product.id_ && entry.category_ === '需求' && entry.name_ === '产品类型需求');
  const workflow = data.flows.filter((entry) => entry.product_line_id_ === product.id_ && entry.task_type_id_ === type?.id_ && entry.status_ === 'PUBLISHED')
    .sort((a, b) => Number(b.workflow_version_) - Number(a.workflow_version_))[0];
  if (!type || !workflow) throw new Error('目标产品缺少已发布的产品任务类型');
  const states = (typeof workflow.definition_ === 'string' ? JSON.parse(workflow.definition_) : workflow.definition_).states.filter((state) => state.enabled);
  for (const name of ['待处理', '已评审', '进行中', '已完成', '已取消']) if (!states.some((state) => state.name === name)) throw new Error(`目标产品缺少状态 ${name}`);
  const users = data.users.filter((entry) => entry.department_ === '产品规划部' && entry.status_ === 'enabled');
  if (!users.length) throw new Error('产品规划部缺少在职员工');
  const versions = data.versions.filter((entry) => entry.product_line_id_ === product.id_ && entry.status_ !== '已发布').sort((a, b) => a.start_date_.localeCompare(b.start_date_));
  if (versions.length < 2) throw new Error('目标产品没有足够的未发布迭代');
  const scenarios = [
    ['b827622b-3ce5-44c1-b38c-9b25f207382e', '待处理', '梳理课程目录和学段筛选条件'],
    ['b827622b-3ce5-44c1-b38c-9b25f207382e', '已评审', '确认课时进度的展示口径'],
    ['b827622b-3ce5-44c1-b38c-9b25f207382e', '进行中', '完善学习路径与节点提醒'],
    ['b827622b-3ce5-44c1-b38c-9b25f207382e', '已完成', '完成课程资源检索体验优化'],
    ['4f1149ef-84f9-43fd-9da1-191411998a0d', '待处理', '定义学习成果的统计维度'],
    ['4f1149ef-84f9-43fd-9da1-191411998a0d', '已评审', '评审教师备课资料上传流程'],
    ['4f1149ef-84f9-43fd-9da1-191411998a0d', '已取消', '取消重复的课程标签配置入口'],
    ['f7ce5998-fce4-4c12-a9aa-bb427ee00288', '进行中', '优化移动端课程续学入口'],
    [null, '待处理', '评估课程订阅消息触达方案'],
    [null, '已评审', '评审课程评价标签体系'],
    [null, '进行中', '梳理知识堂运营数据看板']
  ];
  const tasks = scenarios.filter(([, , title]) => !data.items.some((entry) => entry.product_line_id_ === product.id_ && entry.category_ === 'requirement' && entry.title_ === title)).map(([versionId, statusName, title], index) => {
    const version = versions.find((entry) => entry.id_ === versionId);
    if (versionId && !version) throw new Error(`迭代 ${versionId} 不存在或已发布`);
    const state = states.find((entry) => entry.name === statusName);
    const start = version?.start_date_ || '2026-10-01';
    const end = version?.end_date_ || '2026-10-25';
    const owner = users[index % users.length];
    const creator = users[(index + 1) % users.length];
    return { id: randomUUID(), product, versionId, type, workflow, state, title, start, end, owner, creator, index };
  });
  return { missing, tasks, templateFlows };
}

function main() {
  const context = spawnSync(docker, ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], { encoding: 'utf8' });
  if (context.status !== 0 || !/^unix:\/\//.test(context.stdout.trim()) || process.env.DOCKER_HOST) throw new Error('仅允许本机 Docker Unix socket');
  const plan = buildPlan(snapshot());
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', missingTypes: plan.missing.length, newTasks: plan.tasks.length, products: [...new Set(plan.missing.map(({ product }) => product.name_))] }, null, 2));
  if (!process.argv.includes('--apply') || (!plan.missing.length && !plan.tasks.length)) return;
  const backupDir = resolve('.codex-tmp', 'product-demo-' + new Date().toISOString().replaceAll(/[:.]/g, '-'));
  mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const backup = spawnSync(docker, ['exec', container, 'sh', '-c', `MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --default-character-set=utf8mb4 -u "$MYSQL_USER" --single-transaction --no-tablespaces ${database}`], { maxBuffer: 64 * 1024 * 1024 });
  if (backup.status !== 0 || !backup.stdout.length) throw new Error('备份失败，停止写入');
  writeFileSync(resolve(backupDir, 'before.sql'), backup.stdout, { mode: 0o600 });
  const sql = ['START TRANSACTION;'];
  for (const { product, template } of plan.missing) {
    const id = randomUUID();
    const flow = plan.templateFlows.get(template.id_);
    // Missing types never displace a product-specific default.
    sql.push(`INSERT INTO t_product_line_work_item_type(id_,tenant_id_,product_line_id_,category_,name_,description_,enabled_,is_default_,creator_name_,create_by_,update_by_,create_time_,update_time_) SELECT ${value(id)},${value(tenant)},${value(product.id_)},${value(template.category_)},${value(template.name_)},${value(template.description_ || '')},${Number(template.enabled_)},0,${value('本地模板同步')},${value('user-admin')},${value('user-admin')},NOW(6),NOW(6) WHERE NOT EXISTS(SELECT 1 FROM t_product_line_work_item_type WHERE tenant_id_=${value(tenant)} AND product_line_id_=${value(product.id_)} AND category_=${value(template.category_)} AND name_=${value(template.name_)} AND delete_flag_=0);`);
    sql.push(`INSERT INTO t_product_workflow(id_,tenant_id_,product_line_id_,category_,task_type_id_,workflow_version_,name_,status_,definition_,create_by_,update_by_,create_time_,update_time_) SELECT ${value(randomUUID())},${value(tenant)},${value(product.id_)},${value(({需求:'requirement',设计:'design',研发:'dev',测试:'test',缺陷:'bug',用例:'case'})[template.category_])},${value(id)},1,${value(template.name_ + '状态配置')},${value('PUBLISHED')},CAST(${value(JSON.stringify(flow.definition_))} AS JSON),${value('user-admin')},${value('user-admin')},NOW(6),NOW(6) WHERE EXISTS(SELECT 1 FROM t_product_line_work_item_type WHERE id_=${value(id)});`);
  }
  for (const task of plan.tasks) {
    const { id, product, versionId, type, workflow, state, title, start, end, owner, creator, index } = task;
    const done = state.group === 'COMPLETED' || state.group === 'CANCELLED';
    const active = state.group !== 'NOT_STARTED';
    const code = `LZ-DEMO-${String(index + 1).padStart(3, '0')}`;
    const description = `围绕“${title}”完成方案梳理、验收范围确认及相关方沟通。`;
    const expected = `“${title}”对应的业务流程可用，关键结果可以核对。`;
    const cc = JSON.stringify([usersForCc(task)]);
    const requestId = `local-lizhitang-${String(index + 1).padStart(3, '0')}`;
    const hash = createHash('sha256').update(requestId).digest('hex');
    sql.push(`INSERT INTO t_product_work_item(id_,tenant_id_,product_line_id_,category_,task_type_id_,code_,title_,description_,description_html_,expected_goal_,version_id_,workflow_id_,status_key_,status_name_,status_group_,status_color_,successful_,assignee_id_,assignee_name_,creator_name_,department_,cc_names_,priority_,planned_start_date_,planned_end_date_,expected_complete_date_,actual_start_at_,completed_at_,estimated_hours_,actual_hours_,source_type_,request_id_,request_hash_,progress_,create_by_,update_by_,create_time_,update_time_) VALUES(${[id,tenant,product.id_,'requirement',type.id_,code,title,description,`<p>${description}</p>`,expected,versionId,workflow.id_,state.key,state.name,state.group,state.color || 'neutral',state.successful ? 1 : 0,owner.id_,owner.name_,creator.name_,creator.department_,cc,['P1','P2','P3'][index % 3],start,end,index % 3 ? end : null,active ? `${start} 09:00:00` : null,done ? `${end} 18:00:00` : null,8 + (index % 4) * 4,active ? 3 + (index % 4) * 2 : 0,'MANUAL',requestId,hash,done && state.successful ? 100 : active ? 45 : 0,creator.id_,creator.id_].map(value).join(',')},NOW(6),NOW(6));`);
  }
  sql.push('COMMIT;');
  writeFileSync(resolve(backupDir, 'plan.json'), JSON.stringify({ missing: plan.missing.map(({ product, template }) => [product.name_, template.category_, template.name_]), tasks: plan.tasks.map(({ title, versionId, state }) => [title, versionId, state.name]) }, null, 2), { mode: 0o600 });
  mysql(sql.join('\n'));
  const after = snapshot();
  const remaining = buildPlan(after);
  if (remaining.missing.length || remaining.tasks.length) throw new Error(`写入后校验失败，备份位于 ${backupDir}；剩余类型 ${remaining.missing.length}、任务 ${remaining.tasks.length}`);
  console.log(JSON.stringify({ addedTypes: plan.missing.length, addedTasks: plan.tasks.length, backup: backupDir, verified: true }));
}

function usersForCc(task) { return task.creator.name_ === task.owner.name_ ? task.owner.name_ : task.creator.name_; }

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  main();
}
