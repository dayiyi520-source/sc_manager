import {
  MOCK_BUGS,
  MOCK_DATABASE,
  MOCK_DESIGN_TASKS,
  MOCK_DEV_TASKS,
  MOCK_PRODUCT_LINES,
  MOCK_REQUIREMENT_TASKS,
  MOCK_SNAPSHOT_VERSION,
  MOCK_TEAM_MEMBERS,
  MOCK_TEST_CASE_DIRECTORIES,
  MOCK_TEST_CASES,
  MOCK_TEST_EXECUTIONS,
  MOCK_TEST_PLANS,
  MOCK_TEST_TASKS,
  MOCK_USERS,
  MOCK_VERSIONS,
  MOCK_OKR_PEOPLE,
  MOCK_OKR_RECORDS,
  MOCK_OKR_SETTINGS,
} from '../data/mockSnapshot';
import type { ProductLine } from '../types';
import type { CurrentUser, EmployeeOption } from '../types';
import type {
  CreateTestExecutionInput,
  SaveTestPlanInput,
  TestCase,
  TestExecution,
  TestExecutionCase,
  TestPlan,
  TestPlanCase,
} from '../types/testManagement';

const KEYS = {
  snapshot: 'shichuang.frontend.mock.snapshotVersion',
  members: 'shichuang.frontend.mock.teamMembers',
  plans: 'shichuang.frontend.mock.testPlans',
  executions: 'shichuang.frontend.mock.testExecutions',
  cases: 'shichuang.frontend.mock.testCases',
  okrRecords: 'shichuang.frontend.mock.okrRecords',
  okrPeople: 'shichuang.frontend.mock.okrPeople',
  okrSettings: 'shichuang.frontend.mock.okrSettings',
  productLines: 'shichuang.frontend.mock.productLines',
  researchRoles: 'shichuang.frontend.mock.researchRoles',
  researchStatuses: 'shichuang.frontend.mock.researchStatuses',
  researchCategories: 'shichuang.frontend.mock.researchCategories',
  researchFields: 'shichuang.frontend.mock.researchFields',
  researchTypes: 'shichuang.frontend.mock.researchTypes',
  researchNotifications: 'shichuang.frontend.mock.researchNotifications',
  researchAutomation: 'shichuang.frontend.mock.researchAutomation',
  researchAutomationSetting: 'shichuang.frontend.mock.researchAutomationSetting',
  workItems: 'shichuang.frontend.mock.workItems',
};

// 每次导入新数据库快照时，淘汰浏览器里由旧演示数据留下的本地状态。
if (typeof window !== 'undefined' && localStorage.getItem(KEYS.snapshot) !== MOCK_SNAPSHOT_VERSION) {
  Object.values(KEYS).filter((key) => key !== KEYS.snapshot).forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(KEYS.snapshot, MOCK_SNAPSHOT_VERSION);
}

const now = () => new Date().toISOString();
const text = (value: unknown) => value == null ? '' : String(value);
const read = <T>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
};
const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const bodyOf = (init?: RequestInit) => { try { return init?.body ? JSON.parse(String(init.body)) as Record<string, any> : {}; } catch { return {}; } };
const queryOf = (path: string) => new URL(path, window.location.origin).searchParams;
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const getEmployeeOptions = (): EmployeeOption[] => getMembers().filter((member) => member.status === 'enabled').map((member) => {
  const seed = MOCK_USERS.find((user) => user.id === member.id);
  return { id: member.id, name: member.name, avatar: seed?.avatar, department: member.department || seed?.department, role: seed?.role || 'product_manager', roleTitle: member.jobTitle || seed?.roleTitle };
});
const initialWorkItems = [
  ...MOCK_REQUIREMENT_TASKS.map((task) => ({ ...task, category: 'requirement' })),
  ...MOCK_DESIGN_TASKS.map((task) => ({ ...task, category: 'design' })),
  ...MOCK_DEV_TASKS.map((task) => ({ ...task, category: 'dev' })),
  ...MOCK_TEST_TASKS.map((task) => ({ ...task, category: 'test' })),
  ...MOCK_BUGS.map((bug) => ({ ...bug, category: 'bug', assigneeName: bug.ownerName })),
];
const getWorkItems = () => read<any[]>(KEYS.workItems, initialWorkItems.map((item) => ({ ...item })));
const testTasks = MOCK_TEST_TASKS.map((task) => ({
  id: task.id,
  code: task.code || task.id,
  category: 'test',
  title: task.title,
  productLineId: task.productLineId || '',
  versionId: task.versionId || '',
  assigneeName: task.ownerName || '',
  creatorName: task.creatorName || '',
  ccNames: [],
  status: { name: task.status || '待处理', group: task.status === '已完成' ? '已完成' : '处理中', successful: task.status === '已完成' },
  statusKey: task.status || 'testing', priority: task.priority || 'P2-标准', revision: 0,
  parentWorkItemId: null, estimatedHours: task.estimatedHours || 16, actualHours: task.actualHours || 8,
  createdAt: task.createdAt || '', dueDate: task.dueDate || '',
}));

const defaultCases = (): TestCase[] => MOCK_TEST_CASES.map((item) => ({ ...item, steps: [...item.steps] }));

const getCases = () => read<TestCase[]>(KEYS.cases, defaultCases());
const getPlans = () => read<TestPlan[]>(KEYS.plans, MOCK_TEST_PLANS.map((item) => ({ ...item, cases: [...item.cases] })));
const getExecutions = () => read<TestExecution[]>(KEYS.executions, MOCK_TEST_EXECUTIONS.map((item) => ({ ...item, cases: [...item.cases] })));
const getMembers = () => read(KEYS.members, MOCK_TEAM_MEMBERS.map((item) => ({ ...item })));
const getProductLines = () => read<ProductLine[]>(KEYS.productLines, MOCK_PRODUCT_LINES.map((item) => ({ ...item, versions: [...(item.versions || [])] })));
const getOkrPeople = () => {
  const cached = read(KEYS.okrPeople, MOCK_OKR_PEOPLE);
  return MOCK_OKR_PEOPLE.map((person) => {
    const saved = cached.find((item) => item.id === person.id);
    return saved && saved.version > person.version ? { ...person, ...saved } : { ...person };
  });
};
const planCases = (caseIds: string[]): TestPlanCase[] => getCases().filter((item) => caseIds.includes(item.id)).map((item, index) => ({
  linkId: id('link'), testCaseId: item.id, sort: index + 1, code: item.code, title: item.title, priority: item.priority,
  ownerName: item.ownerName, enabled: item.enabled, latestResult: item.latestResult,
}));
const stats = (cases: TestExecutionCase[]) => ({ total: cases.length, passed: cases.filter((item) => item.result === 'PASSED').length, failed: cases.filter((item) => item.result === 'FAILED').length, notExecuted: cases.filter((item) => item.result === 'NOT_EXECUTED').length });

const databaseRows = (table: keyof typeof MOCK_DATABASE) => (MOCK_DATABASE[table] as unknown as Array<Record<string, any>>).filter((row) => Number(row.delete_flag_ || 0) === 0);
const categoryCode = (value: string) => ({ 产品: 'requirement', 需求: 'requirement', 设计: 'design', 研发: 'dev', 测试: 'test', 缺陷: 'bug', 用例: 'case' } as Record<string, string>)[value] || value;
const templateCategories = () => read(KEYS.researchCategories, databaseRows('t_work_item_category_dictionary').map((row) => ({ id: row.id_, code: row.code_, name: row.name_, displayName: row.display_name_ || row.name_, iconKey: row.icon_key_ || row.code_, capabilityType: row.capability_type_ || 'STANDARD', sort: Number(row.sort_ || 0), enabled: Boolean(row.enabled_), builtIn: Boolean(row.built_in_), revision: Number(row.version_ || 0) })));
const templateRoles = () => read(KEYS.researchRoles, databaseRows('t_product_role_template').map((row) => ({ id: row.id_, name: row.name_, responsibility: row.responsibility_ || '', sort: Number(row.sort_ || 0), revision: Number(row.version_ || 0), updatedAt: row.update_time_ })));
const templateStatuses = () => read(KEYS.researchStatuses, databaseRows('t_research_status_template').map((row) => ({ id: row.id_, scope: row.scope_, name: row.name_, phase: row.phase_, color: row.color_ || 'neutral', initial: Boolean(row.initial_), enabled: Boolean(row.enabled_), sort: Number(row.sort_ || 0), revision: Number(row.version_ || 0) })));
const DETAIL_FIELD_DEFINITIONS: Record<string, Array<[string, string, string, string, boolean]>> = {
  common: [
    ['title', '标题', 'text', '详情页顶部任务标题，可点击修改', true], ['creator', '创建人', 'user', '任务创建人，只读', false], ['createdAt', '创建时间', 'date', '任务创建时间，只读', false], ['updater', '更新人', 'user', '最近一次修改人，只读', false], ['updatedAt', '更新时间', 'date', '最近一次修改时间，只读', false],
    ['parent', '主任务', 'relation', '当前任务所属的父任务，只读', false], ['description', '任务描述', 'text', '左侧描述区，可进入富文本编辑', true], ['status', '当前状态', 'select', '右侧基础字段中的任务状态', true], ['assignee', '负责人', 'user', '右侧基础字段中的负责人', true], ['priority', '优先级', 'select', '右侧基础字段中的优先级', true],
    ['productLine', '归属产品', 'relation', '任务所属产品或产品线', true], ['version', '迭代版本', 'relation', '任务关联的迭代版本', true], ['plannedStartDate', '计划开始时间', 'date', '任务计划开始日期', true], ['dueDate', '计划完成时间', 'date', '任务计划完成日期', true], ['expectedCompleteDate', '期望完成时间', 'date', '业务期望完成日期', true],
    ['customer', '关联客户', 'relation', '任务关联的客户对象', true], ['participants', '参与人', 'user', '需要同步或关注任务的成员', true], ['estimatedHours', '预计工时', 'number', '任务预计投入的小时数', true], ['actualHours', '实际工时', 'number', '任务实际投入的小时数', true], ['relations', '关联对象', 'section', '详情页下方的关联产品任务和协助事项', true], ['children', '子任务', 'section', '详情页下方的子任务列表', true], ['support', '支撑项', 'section', '详情页下方关联的测试计划等支撑事项', true], ['hours', '工时', 'section', '详情页下方的工时汇总和统计', true],
  ],
  dev: [['repo', '代码仓库', 'text', '研发任务关联的代码仓库地址或名称', true], ['branch', '特性分支', 'text', '研发任务对应的代码分支', true]],
  bug: [['severity', '严重程度', 'select', '缺陷影响范围和紧急程度', true], ['type', '缺陷类型', 'select', '缺陷所属的问题类型', true], ['env', '所属环境', 'select', '缺陷出现或验证的运行环境', true]],
};
const DETAIL_FIELDS = (categoryCode: string) => [...DETAIL_FIELD_DEFINITIONS.common, ...(categoryCode === 'dev' ? DETAIL_FIELD_DEFINITIONS.dev : []), ...(categoryCode === 'bug' ? DETAIL_FIELD_DEFINITIONS.bug : [])].map(([fieldCode, label, fieldType, description, editable], index) => ({
  fieldCode,
  label,
  fieldType,
  description,
  visible: true,
  required: REQUIRED_FIELD_CODES.has(fieldCode),
  editable: Boolean(editable),
  sort: index + 1,
  locked: REQUIRED_FIELD_CODES.has(fieldCode),
}));
const FIELD_METADATA: Record<string, { label: string; fieldType: string; description: string }> = {
  title: { label: '标题', fieldType: 'text', description: '工作项标题' },
  description: { label: '任务描述', fieldType: 'text', description: '工作项详细描述' },
  expectedGoal: { label: '期望结果', fieldType: 'text', description: '任务完成后预期达到的结果' },
  productLine: { label: '归属产品', fieldType: 'relation', description: '任务所属产品或产品线' },
  taskType: { label: '任务类型', fieldType: 'select', description: '工作项所属类型' },
  status: { label: '当前状态', fieldType: 'select', description: '工作项当前处理状态' },
  assignee: { label: '负责人', fieldType: 'user', description: '负责处理该工作项的成员' },
  creator: { label: '创建人', fieldType: 'user', description: '创建该工作项的成员' },
  cc: { label: '参与人', fieldType: 'user', description: '需要同步或关注该工作项的成员' },
  priority: { label: '优先级', fieldType: 'select', description: '工作项处理优先级' },
  plannedStartDate: { label: '计划开始时间', fieldType: 'date', description: '任务计划开始日期' },
  plannedEndDate: { label: '计划完成时间', fieldType: 'date', description: '任务计划完成日期' },
  expectedCompleteDate: { label: '期望完成时间', fieldType: 'date', description: '业务期望完成日期' },
  createdAt: { label: '创建时间', fieldType: 'date', description: '工作项创建时间' },
  updatedAt: { label: '更新时间', fieldType: 'date', description: '工作项最近更新时间' },
  version: { label: '迭代版本', fieldType: 'relation', description: '任务关联的迭代版本' },
  requirement: { label: '关联对象', fieldType: 'relation', description: '任务关联的需求或其他工作项' },
  customer: { label: '关联客户', fieldType: 'relation', description: '任务关联的客户对象' },
  estimatedHours: { label: '预计工时', fieldType: 'number', description: '任务预计投入的小时数' },
  actualHours: { label: '实际工时', fieldType: 'number', description: '任务实际投入的小时数' },
  repo: { label: '代码仓库', fieldType: 'text', description: '研发任务关联的代码仓库' },
  branch: { label: '特性分支', fieldType: 'text', description: '研发任务对应的代码分支' },
  commitsCount: { label: '提交数', fieldType: 'number', description: '研发任务关联的代码提交数量' },
  severity: { label: '严重程度', fieldType: 'select', description: '缺陷影响范围和紧急程度' },
  type: { label: '缺陷类型', fieldType: 'select', description: '缺陷所属的问题类型' },
  env: { label: '所属环境', fieldType: 'select', description: '缺陷出现或验证的运行环境' },
  attachments: { label: '附件', fieldType: 'relation', description: '工作项关联的附件' },
};
const REQUIRED_FIELD_CODES = new Set(['title', 'status', 'assignee']);
const normalizeTemplateField = (field: any) => {
  const metadata = FIELD_METADATA[field.fieldCode];
  const locked = REQUIRED_FIELD_CODES.has(field.fieldCode);
  return {
    ...(metadata ? { ...field, ...metadata } : field),
    required: locked ? true : Boolean(field.required),
    visible: locked ? true : Boolean(field.visible),
    locked: locked || Boolean(field.locked),
  };
};
const templateFields = () => {
  const stored = read<any[] | null>(KEYS.researchFields, null);
  const base = (stored || databaseRows('t_work_item_field_configuration').map((row) => ({ categoryCode: row.category_code_, scene: row.scene_, fieldCode: row.field_code_, label: row.field_code_, fieldType: 'text', visible: Boolean(row.visible_), required: Boolean(row.required_), editable: true, sort: Number(row.sort_ || 0), locked: false }))).map(normalizeTemplateField);
  const categories = ['requirement', 'design', 'dev', 'test', 'bug'];
  const detail = categories.flatMap((categoryCode) => DETAIL_FIELDS(categoryCode).map((field) => ({ ...field, categoryCode, scene: 'DETAIL' })));
  const detailCodes = new Set(detail.map((field) => `${field.categoryCode}:${field.fieldCode}`));
  const detailDefaults = new Map(detail.map((field) => [`${field.categoryCode}:${field.fieldCode}`, field]));
  const normalizedBase = base.filter((field) => field.scene !== 'DETAIL' || detailCodes.has(`${field.categoryCode}:${field.fieldCode}`)).map((field) => {
    if (field.scene !== 'DETAIL') return normalizeTemplateField(field);
    const defaults = detailDefaults.get(`${field.categoryCode}:${field.fieldCode}`);
    return defaults ? { ...defaults, ...field, label: defaults.label, fieldType: defaults.fieldType, description: defaults.description } : field;
  });
  const existing = new Set(normalizedBase.filter((field) => field.scene === 'DETAIL').map((field) => `${field.categoryCode}:${field.fieldCode}`));
  return [...normalizedBase, ...detail.filter((field) => !existing.has(`${field.categoryCode}:${field.fieldCode}`))];
};
const templateTypes = () => {
  const workflows = databaseRows('t_work_item_template_workflow');
  return read(KEYS.researchTypes, databaseRows('t_work_item_template_type').map((row) => ({ id: row.id_, category: row.category_, name: row.name_, description: row.description_ || '', enabled: Boolean(row.enabled_), isDefault: Boolean(row.is_default_), revision: Number(row.version_ || 0), workflow: workflows.find((workflow) => workflow.template_type_id_ === row.id_) ? { id: workflows.find((workflow) => workflow.template_type_id_ === row.id_).id_, category: categoryCode(row.category_), taskTypeId: row.id_, name: workflows.find((workflow) => workflow.template_type_id_ === row.id_).name_, workflowVersion: 1, status: 'PUBLISHED', revision: Number(workflows.find((workflow) => workflow.template_type_id_ === row.id_).revision_ || 0), definition: workflows.find((workflow) => workflow.template_type_id_ === row.id_).definition_ } : undefined })));
};
const templateNotifications = () => read(KEYS.researchNotifications, databaseRows('t_notification_template')[0]?.config_ || { categories: [] });
const templateAutomation = () => ({ enabled: read(KEYS.researchAutomationSetting, Boolean(databaseRows('t_automation_template_setting')[0]?.enabled_ ?? true)), rules: read(KEYS.researchAutomation, databaseRows('t_automation_template_rule').map((row) => ({ id: row.id_, name: row.name_, enabled: Boolean(row.enabled_), triggerType: row.trigger_type_, triggerTypeId: row.trigger_type_id_, triggerStateKey: row.trigger_state_key_, conditionType: row.condition_type_, conditionValue: row.condition_value_, actionType: row.action_type_, actions: row.actions_ || [], conditions: row.conditions_ || [], actionConfig: row.action_config_ || {}, revision: Number(row.version_ || 0), updatedAt: row.update_time_ }))) });
const unifiedWorkItem = (item: any) => ({
  ...item,
  assigneeName: item.assigneeName ?? item.ownerName ?? '',
  status: typeof item.status === 'string'
    ? { name: item.status, group: item.status === '已完成' ? 'COMPLETED' : 'IN_PROGRESS', successful: item.status === '已完成' }
    : item.status || { name: '未设置', group: 'IN_PROGRESS', successful: false },
  revision: item.revision ?? 0,
});

const unfinishedTask = (status: unknown, assistanceStatus?: unknown) => {
  const statusName = String(status || '');
  const assistanceState = String(assistanceStatus || '');
  return !['已完成', '已关闭', '已取消', '已驳回'].includes(statusName)
    && assistanceState !== 'COMPLETED';
};

const myTasks = (viewerId: string) => {
  const viewerName = MOCK_USERS.find((user) => user.id === viewerId)?.name || '';
  const workItems = getWorkItems()
    .filter((item) => (item.assigneeId === viewerId || (!item.assigneeId && item.ownerName === viewerName)) && item.requirementType !== '协助事项' && unfinishedTask(item.status))
    .map((item) => ({
      id: `task-${item.id}`,
      type: item.category || 'requirement',
      title: item.title,
      status: item.status || '未设置',
      assigneeName: item.assigneeName ?? item.ownerName ?? '',
      time: item.createdAt || '',
      dueDate: item.dueDate || '',
      progress: Number(item.progress || 0),
      overdueRisk: false,
      taskGroup: 'mine' as const,
      targetPage: item.category === 'design' ? 'prod_design_tasks' : item.category === 'dev' ? 'prod_rd_tasks' : item.category === 'test' ? 'prod_test_tasks' : item.category === 'bug' ? 'prod_bugs' : 'prod_req_tasks',
      sourceId: item.id,
    }));
  const assistanceItems = databaseRows('t_product_work_item')
    .filter((row) => text(row.requirement_type_) === '协助事项')
    .filter((row) => text(row.assistance_owner_id_ || row.assignee_id_) === viewerId)
    .filter((row) => unfinishedTask(row.status_name_, row.assistance_task_status_))
    .map((row) => ({
      id: `assistance-${text(row.id_)}`,
      type: 'assistance',
      title: text(row.title_),
      status: text(row.status_name_) || text(row.assistance_status_) || '待处理',
      assigneeName: text(row.assignee_name_) || MOCK_USERS.find((user) => user.id === text(row.assistance_owner_id_ || row.assignee_id_))?.name || '',
      time: text(row.create_time_).slice(0, 10),
      dueDate: text(row.expected_complete_date_ || row.planned_end_date_).slice(0, 10),
      progress: Number(row.progress_ || 0),
      overdueRisk: false,
      taskGroup: 'assist' as const,
      targetPage: 'wb_work_order',
      sourceId: text(row.id_),
    }));
  return [...workItems, ...assistanceItems];
};

function makeExecution(plan: TestPlan, input: CreateTestExecutionInput, roundNo: number): TestExecution {
  const selected = input.scopeType === 'CUSTOM' && input.testCaseIds.length ? input.testCaseIds : plan.cases.map((item) => item.testCaseId);
  const cases: TestExecutionCase[] = plan.cases.filter((item) => selected.includes(item.testCaseId)).map((item, index) => {
    const source = getCases().find((value) => value.id === item.testCaseId)!;
    return { id: id('execution-case'), testCaseId: source.id, sort: index + 1, code: source.code, title: source.title, precondition: source.precondition, priority: source.priority, steps: source.steps, result: 'NOT_EXECUTED', actualResult: null, executorName: null, executedAt: null, revision: 0, evidence: [], defects: [] };
  });
  return { id: id('execution'), workItemId: plan.workItemId, testPlanId: plan.id || '', planName: plan.name, roundNo, name: input.name, scopeType: input.scopeType, environment: input.environment || null, buildVersion: input.buildVersion || null, executorName: MOCK_USERS[0]?.name || '', status: 'IN_PROGRESS', startTime: now(), endTime: null, revision: 0, ...stats(cases), cases };
}

export async function mockApiRequest(path: string, init: RequestInit = {}): Promise<any> {
  const method = (init.method || 'GET').toUpperCase();
  const clean = path.split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  const body = bodyOf(init);

  if (clean === '/api/auth/dev-login' && method === 'POST') {
    const user = MOCK_USERS.find((item) => item.role === body.username || (body.username === 'admin' && item.role === 'admin')) || MOCK_USERS[0];
    return { token: `dev-token-${user.role}`, expiresIn: 86400, user };
  }
  if (clean === '/api/auth/dev-accounts') return MOCK_USERS.map((user) => ({ username: user.role === 'admin' ? 'admin' : user.role.replace('_', '-'), name: user.name, role: user.roleTitle }));
  if (clean === '/api/product-lines' && method === 'GET') return getProductLines();
  if (clean === '/api/product-lines' && method === 'POST') {
    const input = body as Partial<ProductLine>;
    const product: ProductLine = { ...input, id: id('pl'), name: input.name || '新建产品', code: input.code || 'PL-NEW', description: input.description || '', ownerName: input.ownerName || '', visibility: input.visibility || '公开', commercialAvailability: input.commercialAvailability || '不可商用', sort: Number(input.sort || 0), status: '待规划', createdAt: now(), versions: [] };
    const products = [...getProductLines(), product]; write(KEYS.productLines, products); return product;
  }
  if (parts[1] === 'product-lines' && parts[2] && method === 'PUT') {
    const products = getProductLines(); const index = products.findIndex((item) => item.id === parts[2]);
    if (index >= 0) { products[index] = { ...products[index], ...body }; write(KEYS.productLines, products); return products[index]; }
  }
  if (clean === '/api/team-members/options' && method === 'GET') return getEmployeeOptions();
  if (clean === '/api/team-members/departments' && method === 'GET') return Array.from(new Set(getMembers().map((item) => item.department).filter(Boolean))).sort();
  if (clean === '/api/team-members' && method === 'GET') {
    const query = queryOf(path); const keyword = (query.get('keyword') || '').trim().toLowerCase(); const department = query.get('department') || ''; const status = query.get('status') || '';
    return getMembers().filter((member) => (!department || member.department === department) && (!status || member.status === status) && (!keyword || [member.name, member.department, member.jobTitle, member.phone, member.email].some((value) => String(value || '').toLowerCase().includes(keyword))));
  }
  if (clean === '/api/team-members' && method === 'POST') {
    const member = { id: id('member'), name: String(body.name || ''), department: String(body.department || ''), jobTitle: String(body.jobTitle || ''), phone: body.phone ? String(body.phone) : undefined, email: body.email ? String(body.email) : undefined, status: 'enabled' as const, loginEnabled: false, version: 0 };
    write(KEYS.members, [...getMembers(), member]); return member;
  }
  if (parts[1] === 'team-members' && parts[2] && method === 'PUT') {
    const members = getMembers(); const index = members.findIndex((member) => member.id === parts[2]); if (index < 0) throw new Error('成员不存在');
    members[index] = { ...members[index], name: String(body.name || members[index].name), department: String(body.department || members[index].department), jobTitle: String(body.jobTitle || members[index].jobTitle), phone: body.phone ? String(body.phone) : undefined, email: body.email ? String(body.email) : undefined, version: members[index].version + 1 };
    write(KEYS.members, members); return members[index];
  }
  if (parts[1] === 'team-members' && parts[2] && parts[3] === 'status' && method === 'PATCH') {
    const members = getMembers(); const index = members.findIndex((member) => member.id === parts[2]); if (index < 0) throw new Error('成员不存在');
    members[index] = { ...members[index], status: body.status === 'disabled' ? 'disabled' : 'enabled', version: members[index].version + 1 };
    write(KEYS.members, members); return members[index];
  }
  if (clean === '/api/requirements/departments' && method === 'GET') return getEmployeeOptions().map((item) => ({ id: item.id, name: item.department || '产品研发部', managerName: item.name }));
  if (clean === '/api/requirements' && method === 'GET') return { items: MOCK_REQUIREMENT_TASKS, page: 1, pageSize: 100, total: MOCK_REQUIREMENT_TASKS.length };
  if (clean === '/api/design-tasks' && method === 'GET') return { items: MOCK_DESIGN_TASKS, page: 1, pageSize: 100, total: MOCK_DESIGN_TASKS.length };
  if (clean === '/api/bugs' && method === 'GET') return { items: MOCK_BUGS, page: 1, pageSize: 100, total: MOCK_BUGS.length };
  if (clean === '/api/dev-tasks' && method === 'GET') return { items: MOCK_DEV_TASKS, page: 1, pageSize: 100, total: MOCK_DEV_TASKS.length };
  if (['design-tasks', 'dev-tasks', 'bugs'].includes(parts[1]) && parts[2] && method === 'PUT') {
    const items = getWorkItems();
    const index = items.findIndex((item) => item.id === parts[2]);
    if (index < 0) throw new Error('工作项不存在');
    const current = items[index];
    const revision = Number(current.revision || 0);
    if (body.revision != null && Number(body.revision) !== revision) throw new Error('工作项已被其他人更新，请刷新后重试');
    const assigneeName = body.assigneeName ?? body.developer ?? current.assigneeName ?? current.ownerName ?? '';
    items[index] = { ...current, ...body, ownerName: assigneeName, assigneeName, revision: revision + 1 };
    write(KEYS.workItems, items);
    return items[index];
  }
  if (clean === '/api/okr/people' && method === 'GET') return getOkrPeople();
  if (clean === '/api/okr/settings' && method === 'GET') return read(KEYS.okrSettings, MOCK_OKR_SETTINGS);
  if (clean === '/api/okr/settings' && method === 'PUT') { write(KEYS.okrSettings, body); return body; }
  if (clean === '/api/okr/records' && method === 'GET') {
    const viewerId = queryOf(path).get('viewerId');
    return read(KEYS.okrRecords, MOCK_OKR_RECORDS).filter((record: any) => !viewerId || record.ownerId === viewerId || record.payload?.keyResults?.some((keyResult: any) => keyResult.assigneeIds?.includes(viewerId)));
  }
  if (clean === '/api/okr/records' && method === 'POST') { const record = { id: id('okr'), kind: body.kind, ownerId: body.viewerId || MOCK_USERS[0]?.id, periodKey: body.periodKey, status: body.submit === false ? 'draft' : 'active', version: 0, createdAt: now(), payload: body.payload || {} }; const records = read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS); write(KEYS.okrRecords, [...records, record]); return { id: record.id }; }
  if (parts[1] === 'okr' && parts[2] === 'records' && parts[3] && method === 'PATCH') { const records = read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS); const index = records.findIndex((record) => record.id === parts[3]); if (index < 0) throw new Error('目标记录不存在'); records[index] = { ...records[index], ...(body.payload ? { payload: body.payload } : {}), status: body.action === 'submit' ? 'active' : records[index].status, version: records[index].version + 1 }; write(KEYS.okrRecords, records); return records[index]; }
  if (parts[1] === 'okr' && parts[2] === 'people' && parts[3] && method === 'PUT') { const people = getOkrPeople(); const index = people.findIndex((person) => person.id === parts[3]); if (index < 0) throw new Error('组织成员不存在'); people[index] = { ...people[index], supervisorId: body.supervisorId || null, rootFlag: body.root ? 1 : 0, version: people[index].version + 1 }; write(KEYS.okrPeople, people); return people[index]; }
  if (clean === '/api/okr/work' && method === 'GET') return [];
  if (clean === '/api/okr/actions/parents' && method === 'GET') { const periodKey = queryOf(path).get('periodKey'); return read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS).filter((record) => record.kind === 'objective' && (!periodKey || record.periodKey === periodKey)); }
  if (clean === '/api/okr/actions' && method === 'POST') { const record = { id: id('okr-action'), kind: 'action', ownerId: body.viewerId || MOCK_USERS[0]?.id, periodKey: body.periodKey, status: body.submit === false ? 'draft' : 'active', version: 0, createdAt: now(), payload: body.payload || {} }; const records = read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS); write(KEYS.okrRecords, [...records, record]); return { id: record.id }; }
  if (parts[1] === 'okr' && parts[2] && parts[3] === 'events' && method === 'GET') return [];

  if (clean === '/api/research-template/roles' && method === 'GET') return templateRoles();
  if (clean === '/api/research-template/roles' && method === 'POST') { const roles = templateRoles(); const role = { id: id('role'), ...body, revision: 0, updatedAt: now() }; write(KEYS.researchRoles, [...roles, role]); return role; }
  if (parts[1] === 'research-template' && parts[2] === 'roles' && parts[3] && method === 'PUT') { const roles = templateRoles(); const index = roles.findIndex((role: any) => role.id === parts[3]); if (index >= 0) { roles[index] = { ...roles[index], ...body, revision: roles[index].revision + 1, updatedAt: now() }; write(KEYS.researchRoles, roles); return roles[index]; } }
  if (parts[1] === 'research-template' && parts[2] === 'roles' && parts[3] && method === 'DELETE') { write(KEYS.researchRoles, templateRoles().filter((role: any) => role.id !== parts[3])); return null; }
  if (clean === '/api/research-template/statuses' && method === 'GET') { const scope = queryOf(path).get('scope') || 'PRODUCT'; return templateStatuses().filter((status: any) => status.scope === scope); }
  if (clean === '/api/research-template/statuses' && method === 'PUT') { const scope = queryOf(path).get('scope') || 'PRODUCT'; const all = templateStatuses().filter((status: any) => status.scope !== scope); const next = (body.states || []).map((state: any, index: number) => ({ ...state, scope, sort: state.sort || index + 1, revision: state.revision || 0 })); write(KEYS.researchStatuses, [...all, ...next]); return next; }
  if (clean === '/api/research-template/statuses' && method === 'POST') { const scope = queryOf(path).get('scope') || 'PRODUCT'; const status = { id: id('status'), ...body, scope, revision: 0, sort: body.sort || templateStatuses().filter((item: any) => item.scope === scope).length + 1 }; write(KEYS.researchStatuses, [...templateStatuses(), status]); return status; }
  if (parts[1] === 'research-template' && parts[2] === 'statuses' && parts[3] && method === 'PUT') { const statuses = templateStatuses(); const index = statuses.findIndex((status: any) => status.id === parts[3]); if (index >= 0) { statuses[index] = { ...statuses[index], ...body, revision: statuses[index].revision + 1 }; write(KEYS.researchStatuses, statuses); return statuses[index]; } }
  if (parts[1] === 'research-template' && parts[2] === 'statuses' && parts[3] && method === 'DELETE') { write(KEYS.researchStatuses, templateStatuses().filter((status: any) => status.id !== parts[3])); return null; }
  if (clean === '/api/work-item-categories' && method === 'GET') return templateCategories();
  if (clean === '/api/work-item-categories' && method === 'POST') { const category = { id: id('category'), ...body, builtIn: false, revision: 0 }; write(KEYS.researchCategories, [...templateCategories(), category]); return category; }
  if (parts[1] === 'work-item-categories' && parts[2] && method === 'PUT') { const categories = templateCategories(); const index = categories.findIndex((item: any) => item.id === parts[2]); if (index >= 0) { categories[index] = { ...categories[index], ...body, revision: categories[index].revision + 1 }; write(KEYS.researchCategories, categories); return categories[index]; } }
  if (parts[1] === 'work-item-categories' && parts[2] && method === 'DELETE') { const category = templateCategories().find((item: any) => item.id === parts[2]); if (category?.builtIn) throw new Error('内置分类不可删除'); write(KEYS.researchCategories, templateCategories().filter((item: any) => item.id !== parts[2])); return null; }
  if (clean === '/api/work-item-field-configurations' && method === 'GET') { const categoryCodeValue = queryOf(path).get('categoryCode') || ''; const fields = templateFields().filter((field: any) => field.categoryCode === categoryCodeValue); const scenes = Array.from(new Set(fields.map((field: any) => field.scene))).map((scene) => ({ scene, fields: fields.filter((field: any) => field.scene === scene).sort((a: any, b: any) => a.sort - b.sort) })); return { categoryCode: categoryCodeValue, scenes }; }
  if (parts[1] === 'work-item-field-configurations' && parts[2] && parts[3] && method === 'PUT') { const categoryCodeValue = decodeURIComponent(parts[2]); const scene = decodeURIComponent(parts[3]); const current = templateFields().filter((field: any) => !(field.categoryCode === categoryCodeValue && field.scene === scene)); const next = (body.fields || []).map((field: any, index: number) => normalizeTemplateField({ ...field, categoryCode: categoryCodeValue, scene, sort: field.sort || index + 1 })); write(KEYS.researchFields, [...current, ...next]); const scenes = Array.from(new Set([...current, ...next].filter((field: any) => field.categoryCode === categoryCodeValue).map((field: any) => field.scene))).map((item) => ({ scene: item, fields: [...current, ...next].filter((field: any) => field.categoryCode === categoryCodeValue && field.scene === item).sort((a: any, b: any) => a.sort - b.sort) })); return { categoryCode: categoryCodeValue, scenes }; }
  if (clean === '/api/work-item-template' && method === 'GET') return templateTypes();
  if (clean === '/api/work-item-template/types' && method === 'POST') { const template = { id: id('type'), category: body.category, name: body.name, description: body.description || '', enabled: body.enabled !== false, isDefault: Boolean(body.isDefault), revision: 0, workflow: body.workflow ? { id: id('workflow'), category: body.workflow.category, taskTypeId: '', name: body.workflow.name, workflowVersion: 1, status: 'PUBLISHED', revision: 0, definition: body.workflow.definition } : undefined }; if (template.workflow) template.workflow.taskTypeId = template.id; write(KEYS.researchTypes, [...templateTypes(), template]); return { id: template.id }; }
  if (parts[1] === 'work-item-template' && parts[2] === 'types' && parts[3] && parts[4] === 'workflow' && method === 'PUT') { const templates = templateTypes(); const index = templates.findIndex((item: any) => item.id === parts[3]); if (index >= 0) { const current = templates[index].workflow; templates[index] = { ...templates[index], workflow: { id: current?.id || id('workflow'), category: body.category || current?.category || categoryCode(templates[index].category), taskTypeId: templates[index].id, name: body.name || current?.name || `${templates[index].name}状态配置`, workflowVersion: current?.workflowVersion || 1, status: 'PUBLISHED', revision: (current?.revision || 0) + 1, definition: body.definition || current?.definition || { states: [] } } }; write(KEYS.researchTypes, templates); return templates[index].workflow; } }
  if (parts[1] === 'work-item-template' && parts[2] === 'types' && parts[3] && method === 'PUT') { const templates = templateTypes(); const index = templates.findIndex((item: any) => item.id === parts[3]); if (index >= 0) { templates[index] = { ...templates[index], ...body, revision: (templates[index].revision || 0) + 1 }; write(KEYS.researchTypes, templates); return templates[index]; } }
  if (parts[1] === 'work-item-template' && parts[2] === 'types' && parts[3] && method === 'DELETE') { write(KEYS.researchTypes, templateTypes().filter((item: any) => item.id !== parts[3])); return null; }
  if (clean === '/api/notification-template' && method === 'GET') return templateNotifications();
  if (clean === '/api/notification-template' && method === 'PUT') { write(KEYS.researchNotifications, body); return body; }
  if (clean === '/api/automation-template/rules' && method === 'GET') return templateAutomation();
  if (clean === '/api/automation-template/rules' && method === 'POST') { const rule = { ...body, id: id('automation'), revision: 0, updatedAt: now() }; const next = [...templateAutomation().rules, rule]; write(KEYS.researchAutomation, next); return rule; }
  if (parts[1] === 'automation-template' && parts[2] === 'rules' && parts[3] && method === 'PUT') { const rules = templateAutomation().rules; const index = rules.findIndex((rule: any) => rule.id === parts[3]); if (index >= 0) { rules[index] = { ...rules[index], ...body, revision: rules[index].revision + 1, updatedAt: now() }; write(KEYS.researchAutomation, rules); return rules[index]; } }
  if (parts[1] === 'automation-template' && parts[2] === 'rules' && parts[3] && method === 'DELETE') { write(KEYS.researchAutomation, templateAutomation().rules.filter((rule: any) => rule.id !== parts[3])); return null; }
  if (clean === '/api/automation-template/setting' && method === 'PUT') { const enabled = Boolean(body.enabled); write(KEYS.researchAutomationSetting, enabled); return { enabled }; }
  if (clean === '/api/product-lines/archived' && method === 'GET') return [];

  // 产品级配置在真实系统中由全局产研模板继承；纯前端演示保持同样的读取关系。
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'work-item-types' && method === 'GET') {
    const category = queryOf(path).get('category') || '';
    const inherited = templateTypes().filter((item: any) => !category || item.category === category || categoryCode(item.category) === category);
    return inherited.map((item: any) => ({ ...item, productLineId: parts[2] }));
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'child-type-rules' && method === 'GET') return [];
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'notification-settings' && method === 'GET') return templateNotifications();
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'notification-settings' && method === 'PUT') { write(KEYS.researchNotifications, body); return body; }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'activities' && method === 'GET') return [];
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'automation-rules' && parts[4] === 'logs' && method === 'GET') return [];
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'automation-rules' && parts[4] === 'setting' && method === 'PUT') { const enabled = Boolean(body.enabled); return { enabled }; }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'automation-rules' && method === 'GET') { const template = templateAutomation(); const keyword = (queryOf(path).get('keyword') || '').toLowerCase(); return { enabled: template.enabled, rules: template.rules.filter((rule: any) => !keyword || rule.name.toLowerCase().includes(keyword)) }; }

  if (clean.startsWith('/api/work-items/') && parts.length === 3 && method === 'GET') {
    const found = [...getWorkItems().map(unifiedWorkItem), ...MOCK_BUGS.map((bug) => unifiedWorkItem({ ...bug, category: 'bug', assigneeName: bug.ownerName }))].find((item) => item.id === parts[2]);
    return found || null;
  }
  if (parts[1] === 'work-items' && parts[2] && parts.length === 3 && method === 'PUT') {
    const items = getWorkItems();
    const index = items.findIndex((item) => item.id === parts[2]);
    if (index < 0) {
      const bugIndex = MOCK_BUGS.findIndex((bug) => bug.id === parts[2]);
      if (bugIndex < 0) throw new Error('工作项不存在');
      const bug = MOCK_BUGS[bugIndex];
      const revision = Number((bug as any).revision || 0);
      if (body.revision != null && Number(body.revision) !== revision) throw new Error('工作项已被其他人更新，请刷新后重试');
      const updatedBug = { ...bug, ownerName: String(body.assigneeName ?? bug.ownerName ?? ''), revision: revision + 1 };
      MOCK_BUGS[bugIndex] = updatedBug;
      return unifiedWorkItem({ ...updatedBug, category: 'bug', assigneeName: updatedBug.ownerName });
    }
    const current = items[index];
    const revision = Number(current.revision || 0);
    if (body.revision != null && Number(body.revision) !== revision) throw new Error('工作项已被其他人更新，请刷新后重试');
    const updated = { ...current, ...body, ownerName: body.assigneeName ?? current.ownerName, assigneeName: body.assigneeName ?? current.assigneeName ?? current.ownerName, revision: revision + 1 };
    items[index] = updated;
    write(KEYS.workItems, items);
    return unifiedWorkItem(updated);
  }
  if (clean === '/api/work-items' && method === 'GET') {
    const query = queryOf(path); const productLineId = query.get('productLineId'); const category = query.get('category'); const keyword = (query.get('keyword') || '').toLowerCase();
    let items = getWorkItems().filter((item) => (!productLineId || item.productLineId === productLineId) && (!category || category === item.category) && (!keyword || item.title.toLowerCase().includes(keyword) || String(item.code || '').toLowerCase().includes(keyword)));
    items = items.map((item) => unifiedWorkItem(item)) as any;
    return { page: { items, page: Number(query.get('page') || 1), pageSize: Number(query.get('pageSize') || 100), total: items.length } };
  }
  if (clean === '/api/requirements/my-tasks' && method === 'GET') {
    const viewerId = queryOf(path).get('viewerId') || '';
    return viewerId ? myTasks(viewerId) : [];
  }
  if (parts[1] === 'work-items' && parts[2] && parts[3] === 'transitions' && method === 'GET') return { revision: 0, actions: [], statuses: [] };
  if (parts[1] === 'work-items' && parts[2] && parts[3] === 'relations' && method === 'GET') return { relations: [] };
  if (parts[1] === 'requirements' && parts[2] && parts[3] === 'summary' && method === 'GET') { const requirement = [...getWorkItems()].find((item) => item.id === parts[2]); return { requirement: requirement || undefined, linkedItems: [] }; }
  if (clean.endsWith('/test-case-directories') && method === 'GET') return MOCK_TEST_CASE_DIRECTORIES;
  if (clean.endsWith('/test-cases') && method === 'GET') { const query = queryOf(path); const items = getCases().filter((item) => !query.get('productLineId') || item.productLineId === query.get('productLineId')); return { items, page: 1, pageSize: items.length || 20, total: items.length }; }
  if (parts.length >= 4 && parts[1] === 'work-items' && parts[3] === 'test-plans') {
    const workItemId = parts[2]; const plans = getPlans();
    if (method === 'GET') return plans.filter((plan) => plan.workItemId === workItemId);
    if (method === 'POST') { const input = body as SaveTestPlanInput; const plan: TestPlan = { id: id('plan'), workItemId: input.workItemId || workItemId, executable: true, name: input.name, environment: input.environment, startDate: input.startDate, endDate: input.endDate, ownerId: input.ownerId, ownerName: input.ownerName, revision: 0, cases: planCases(input.testCaseIds || []) }; write(KEYS.plans, [...plans, plan]); return plan; }
    if (method === 'PUT' && parts[4]) { const index = plans.findIndex((plan) => plan.id === parts[4]); if (index >= 0) { plans[index] = { ...plans[index], ...body, cases: planCases(body.testCaseIds || []) as any, revision: plans[index].revision + 1 }; write(KEYS.plans, plans); return plans[index]; } }
  }
  if (parts.length >= 4 && parts[1] === 'work-items' && parts[3] === 'test-executions') {
    const workItemId = parts[2]; const executions = getExecutions();
    if (method === 'GET') return executions.filter((item) => item.workItemId === workItemId);
    if (method === 'POST') { const plan = getPlans().find((item) => item.id === body.planId); if (!plan) return null; const roundNo = executions.filter((item) => item.testPlanId === plan.id).length + 1; const execution = makeExecution(plan, body as CreateTestExecutionInput, roundNo); write(KEYS.executions, [...executions, execution]); return execution; }
  }
  if (parts[1] === 'test-executions' && parts[2] && method === 'GET') return getExecutions().find((item) => item.id === parts[2]) || null;
  if (parts[1] === 'test-executions' && parts[2] && parts[3] === 'end' && method === 'POST') { const executions = getExecutions(); const index = executions.findIndex((item) => item.id === parts[2]); if (index >= 0) { executions[index] = { ...executions[index], status: 'ENDED', endTime: now(), revision: executions[index].revision + 1 }; write(KEYS.executions, executions); return executions[index]; } }
  if (parts[1] === 'test-execution-cases' && parts[2] && method === 'PUT') { const executions = getExecutions(); const execution = executions.find((item) => item.cases.some((testCase) => testCase.id === parts[2])); if (execution) { const target = execution.cases.find((testCase) => testCase.id === parts[2])!; Object.assign(target, { ...body, executedAt: now(), executorName: MOCK_USERS[0]?.name || '', revision: target.revision + 1 }); Object.assign(execution, stats(execution.cases)); write(KEYS.executions, executions); return execution; } }
  if (clean.endsWith('/test-overview')) { const workItemId = parts[2]; const executions = getExecutions().filter((item) => item.workItemId === workItemId); const latest = executions[executions.length - 1]; return { workItemId, childCount: 0, completedChildCount: 0, caseCount: latest?.total || 0, executionCount: executions.length, total: latest?.total || 0, passed: latest?.passed || 0, failed: latest?.failed || 0, notExecuted: latest?.notExecuted || 0, defectCount: 0, blockingDefectCount: 0, conclusion: latest && latest.notExecuted === 0 && latest.failed === 0 ? 'PASSED' : 'NOT_PASSED', blockers: [], defects: [], children: [] }; }
  if (method === 'GET') return [];
  if (method === 'POST') return { id: id('mock'), code: `MOCK-${Date.now()}` };
  return null;
}
