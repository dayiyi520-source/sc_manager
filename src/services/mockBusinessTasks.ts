import { BUSINESS_TASK_SEED_VERSION, MOCK_DELIVERY_TASKS, MOCK_PRESALES_TASKS } from '../data/mockBusinessTasks';
import { MOCK_DATABASE, MOCK_SNAPSHOT_VERSION, MOCK_USERS } from '../data/mockSnapshot';
import { SESSION_KEY } from './sessionStorage';
import type { RequirementTask } from '../types';

type Kind = 'presales' | 'delivery' | 'ops';
type AuditContext = {
  activities: () => Array<{ subjectId: string }>;
  record: (id: string, productLineId: string, eventType: string, content: Record<string, unknown>) => void;
  changes: (before: RequirementTask, after: RequirementTask) => void;
  validateCompletion: (body: Record<string, unknown>) => void;
};
const text = (value: unknown) => value == null ? '' : String(value);
const storageKey = (kind: Kind) => 'shichuang.frontend.mock.' + kind + 'Tasks';
const statusFlow = (kind: Kind) => kind === 'delivery' ? ['待处理', '处理中', '待审核', '已完成'] : ['待处理', '处理中', '已完成'];
function initialTasks(kind: Kind): RequirementTask[] {
  if (kind === 'ops') return [
    { id: 'demo-ops-1', code: 'OP-DEMO-001', title: '运维巡检与告警规则复核', description: '检查生产环境运行指标和告警规则。', status: '处理中', priority: '高', ownerName: '管理员', assigneeId: 'u-admin', creatorName: '管理员', creatorId: 'u-admin', department: '产研部门', projectId: 'project-1', projectName: '统一身份认证升级', productLineName: '', versionName: '', dueDate: '2026-10-20', plannedStartDate: '2026-10-12', estimatedHours: 8, actualHours: 2, createdAt: '2026-10-08T09:00:00+08:00' },
    { id: 'demo-ops-2', code: 'OP-DEMO-002', title: '数据库备份恢复演练', description: '完成备份恢复演练并记录结果。', status: '待处理', priority: '中', ownerName: '毛景强', assigneeId: 'u-002', creatorName: '管理员', creatorId: 'u-admin', department: '产研部门', projectId: 'project-2', projectName: '实训教学系统', productLineName: '', versionName: '', dueDate: '2026-10-22', plannedStartDate: '2026-10-13', estimatedHours: 6, actualHours: 0, createdAt: '2026-10-09T09:00:00+08:00' }
  ];
  const rows = MOCK_DATABASE[kind === 'presales' ? 't_crm_presales_task' : 't_project_delivery_task'] as unknown as Array<Record<string, unknown>>;
  return rows.filter(row => !Number(row.delete_flag_ || 0)).map(row => ({
    id: text(row.id_), code: text(row.code_), title: text(row.title_), description: text(row.description_),
    status: text(row.status_) || '待处理', priority: text(row.priority_) || '中', ownerName: text(row.owner_name_),
    assigneeId: text(row.assignee_id_) || undefined, creatorId: text(row.create_by_) || undefined,
    creatorName: text(row.creator_name_) || MOCK_USERS.find(user => user.id === row.create_by_)?.name,
    department: text(row.department_), productLineName: text(row.product_line_name_), versionName: text(row.version_name_),
    projectId: text(row.project_id_), projectName: text(row.project_name_), customerName: text(row.customer_name_),
    specialFields: text(row.special_fields_), createdAt: text(row.create_time_), dueDate: text(row.due_date_), estimatedHours: Number(row.estimated_hours_ || 0)
  }));
}
function read(kind: Kind): RequirementTask[] {
  const versionKey = storageKey(kind) + '.snapshotVersion';
  const seedKey = storageKey(kind) + '.seedVersion';
  if (localStorage.getItem(versionKey) !== MOCK_SNAPSHOT_VERSION) {
    localStorage.removeItem(storageKey(kind));
    localStorage.removeItem(seedKey);
    localStorage.setItem(versionKey, MOCK_SNAPSHOT_VERSION);
  }
  const saved = localStorage.getItem(storageKey(kind));
  const tasks: unknown = saved ? JSON.parse(saved) : initialTasks(kind);
  if (!Array.isArray(tasks)) throw new Error('本地任务数据无效');
  if (localStorage.getItem(seedKey) !== BUSINESS_TASK_SEED_VERSION) {
    const samples = kind === 'presales' ? MOCK_PRESALES_TASKS : MOCK_DELIVERY_TASKS;
    const storedIds = new Set(tasks.map(task => task.id));
    const merged = [...tasks, ...samples.filter(task => !storedIds.has(task.id))];
    write(kind, merged);
    localStorage.setItem(seedKey, BUSINESS_TASK_SEED_VERSION);
    return merged;
  }
  return tasks as RequirementTask[];
}
const write = (kind: Kind, tasks: RequirementTask[]) => localStorage.setItem(storageKey(kind), JSON.stringify(tasks));

export function handleMockBusinessTasks(path: string, method: string, body: Record<string, unknown>, audit: AuditContext) {
  const url = new URL(path, 'http://mock.local');
  const parts = url.pathname.split('/').filter(Boolean);
  const kind: Kind = parts[1] === 'presales-tasks' ? 'presales' : parts[1] === 'ops-tasks' ? 'ops' : 'delivery';
  const label = kind === 'presales' ? '售前任务' : kind === 'ops' ? '运维任务' : '交付任务';
  const tasks = read(kind);
  const taskId = parts[2] ? decodeURIComponent(parts[2]) : '';
  const task = taskId ? tasks.find(item => item.id === taskId) : undefined;
  if (taskId && !task) throw new Error(label + '不存在');
  if (task && parts[3] === 'activities' && method === 'GET') return audit.activities().filter(event => event.subjectId === taskId);
  if (task && parts[3] === 'comments' && method === 'POST') {
    const content = text(body.content).trim();
    if (!content || content.length > 10000) throw new Error('评论内容不能为空且不能超过10000字');
    audit.record(taskId, task.productLineId || '', 'WORK_ITEM_COMMENTED', { content });
    return null;
  }
  if (task && parts[3] === 'review' && method === 'POST') {
    if (kind !== 'delivery' || task.status !== '待审核') throw new Error('当前任务不在待审核状态');
    const action = text(body.action);
    if (!['approve', 'reject'].includes(action)) throw new Error('审核动作无效');
    const nextStatus = action === 'approve' ? '已完成' : '处理中';
    const updated = { ...task, status: nextStatus, reviewComment: text(body.comment), reviewedAt: new Date().toISOString(), reviewedBy: text(body.operatorName) || '主管' } as RequirementTask;
    write(kind, tasks.map(item => item.id === taskId ? updated : item));
    audit.record(taskId, task.productLineId || '', action === 'approve' ? 'BUSINESS_TASK_REVIEW_APPROVED' : 'BUSINESS_TASK_REVIEW_REJECTED', { fromStatus: task.status, toStatus: nextStatus, comment: text(body.comment) });
    return updated;
  }
  if (parts[3]) throw new Error('不支持的任务操作');
  if (method === 'GET') {
    if (task) return task;
    const visibleTasks = tasks.filter(item => !(item as RequirementTask & { archived?: boolean }).archived);
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
    return { items: visibleTasks.slice((page - 1) * pageSize, page * pageSize), total: visibleTasks.length, page, pageSize };
  }
  if (method === 'DELETE' && task) {
    write(kind, tasks.map(item => item.id === taskId ? { ...item, archived: true } : item));
    audit.record(taskId, task.productLineId || '', 'WORK_ITEM_ARCHIVED', { title: task.title });
    return null;
  }
  if (method === 'POST' && !taskId) {
    if (!text(body.title).trim()) throw new Error('任务标题不能为空');
    if (kind === 'ops' && !text(body.projectId).trim()) throw new Error('请选择关联项目');
    let user = MOCK_USERS[0];
    try { user = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')?.user || user; } catch { /* 失效本地会话使用演示账号。 */ }
    const created: RequirementTask = {
      ...body, id: kind + '-' + crypto.randomUUID(), code: (kind === 'presales' ? 'PS-' : 'DL-') + crypto.randomUUID().slice(0, 8),
      title: text(body.title).trim(), status: text(body.status) || '待处理', priority: text(body.priority) || '中',
      ownerName: text(body.ownerName) || user.name, assigneeId: text(body.assigneeId) || (text(body.ownerName) === user.name || !body.ownerName ? user.id : undefined),
      creatorId: user.id, creatorName: user.name, department: text(body.department) || undefined,
      productLineName: text(body.productLineName), versionName: text(body.versionName),
      dueDate: text(body.dueDate), estimatedHours: Number(body.estimatedHours) || 0, createdAt: new Date().toISOString()
    };
    write(kind, [created, ...tasks]);
    audit.record(created.id, created.productLineId || '', 'WORK_ITEM_CREATED', { title: created.title });
    return { id: created.id, code: created.code };
  }
  if (method === 'PUT' && task) {
    if (body.title !== undefined && !text(body.title).trim()) throw new Error('任务标题不能为空');
    const requestedStatus = text(body.status);
    const waitingApproval = kind === 'delivery' && requestedStatus === '已完成' && task.creatorId && task.assigneeId && task.creatorId !== task.assigneeId;
    const normalizedBody = waitingApproval ? { ...body, status: '待审核' } : body;
    if (requestedStatus === '已完成' && task.status !== '已完成' && !waitingApproval) audit.validateCompletion(body);
    const updated: RequirementTask = { ...task, ...normalizedBody, id: task.id, code: task.code, creatorId: task.creatorId, creatorName: task.creatorName, createdAt: task.createdAt };
    if (body.ownerName !== undefined && body.assigneeId === undefined && body.ownerName !== task.ownerName) updated.assigneeId = undefined;
    write(kind, tasks.map(item => item.id === taskId ? updated : item));
    audit.changes(task, updated);
    return null;
  }
  throw new Error('不支持的任务操作');
}
