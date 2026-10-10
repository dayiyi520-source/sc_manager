import { assignedGoalActions, legacyGoalActions } from './okrGoalRules';
import collaborationTypes from '../data/mockCollaborationTypes.json';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import savedResearchTemplate from '../data/mockResearchTemplate.json';
import { handleMockTestReports, TEST_REPORT_STORAGE_KEY } from './mockTestReports';
import {
  MOCK_BUGS,
  MOCK_DATABASE,
  MOCK_DESIGN_TASKS,
  MOCK_DEV_TASKS,
  MOCK_PRODUCT_LINES,
  MOCK_REQUIREMENT_TASKS,
  MOCK_OPS_TASKS,
  MOCK_SNAPSHOT_VERSION,
  MOCK_TEAM_MEMBERS,
  MOCK_TEST_CASE_DIRECTORIES,
  MOCK_TEST_CASES,
  MOCK_TEST_PLANS,
  MOCK_TEST_TASKS,
  MOCK_USERS,
  MOCK_VERSIONS,
  MOCK_OKR_PEOPLE,
  MOCK_OKR_RECORDS,
  MOCK_OKR_SETTINGS,
} from '../data/mockSnapshot';
import type { ProductLine, RequirementTask, RequirementWorkItem, VersionIteration } from '../types';
import { normalizeVersionStatus } from '../components/product/productLinePresentation';
import type { CurrentUser, EmployeeOption } from '../types';
import type {
  SaveTestPlanInput,
  TestCase,
  TestPlan,
  TestPlanCase,
} from '../types/testManagement';

const KEYS = {
  testReports: TEST_REPORT_STORAGE_KEY,
  snapshot: 'shichuang.frontend.mock.snapshotVersion',
  members: 'shichuang.frontend.mock.teamMembers',
  plans: 'shichuang.frontend.mock.testPlans',
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
  opsTasks: 'shichuang.frontend.mock.opsTasks',
  taskActivities: 'shichuang.frontend.mock.taskActivities',
  attachments: 'shichuang.frontend.mock.attachments',
};

// 每次导入新数据库快照时，淘汰浏览器里由旧演示数据留下的本地状态。
if (typeof window !== 'undefined' && localStorage.getItem(KEYS.snapshot) !== MOCK_SNAPSHOT_VERSION) {
  Object.values(KEYS).filter((key) => key !== KEYS.snapshot).forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(KEYS.snapshot, MOCK_SNAPSHOT_VERSION);
}

const now = () => new Date().toISOString();
const text = (value: unknown) => value == null ? '' : String(value);
const read = <T>(key: string, fallback: T): T => {
  const templateKey = key.replace('shichuang.frontend.mock.', '');
  const seed = Object.prototype.hasOwnProperty.call(savedResearchTemplate, templateKey) ? (savedResearchTemplate as Record<string, unknown>)[templateKey] as T : fallback;
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : seed; } catch { return seed; }
};
const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
const bodyOf = (init?: RequestInit) => { try { return init?.body ? JSON.parse(String(init.body)) as Record<string, any> : {}; } catch { return {}; } };
const queryOf = (path: string) => new URL(path, window.location.origin).searchParams;
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const getEmployeeOptions = (): EmployeeOption[] => getMembers().filter((member) => member.status === 'enabled').map((member) => {
  const seed = MOCK_USERS.find((user) => user.id === member.id);
  return { id: member.id, name: member.name, avatar: seed?.avatar, department: member.department || seed?.department, role: seed?.role || 'product_manager', jobTitle: member.jobTitle, roleTitle: member.jobTitle || seed?.roleTitle };
});
const initialWorkItems = [
  ...MOCK_REQUIREMENT_TASKS.map((task) => ({ ...task, category: 'requirement' })),
  ...MOCK_DESIGN_TASKS.map((task) => ({ ...task, category: 'design' })),
  ...MOCK_DEV_TASKS.map((task) => ({ ...task, category: 'dev' })),
  ...MOCK_TEST_TASKS.map((task) => ({ ...task, category: 'test' })),
  ...MOCK_BUGS.map((bug) => ({ ...bug, category: 'bug', assigneeName: bug.ownerName })),
];
const getWorkItems = () => read<any[]>(KEYS.workItems, initialWorkItems.map((item) => ({ ...item }))).map((item) => {
  const migratedType = (collaborationTypes as Record<string, string>)[item.id];
  if (item.category === 'requirement' && (item.workOrderType || migratedType) && ['已驳回', '已退回'].includes(item.status)) {
    const creator = getMembers().find((member) => member.id === item.creatorId || member.name === item.creatorName);
    item = { ...item, status: '已退回', ...(item.creatorName ? { ownerName: item.creatorName, assigneeName: item.creatorName, assigneeId: item.creatorId || creator?.id || '' } : {}) };
  }
  return item.category === 'requirement' && migratedType && !['客户诉求', '线上问题', '售前支持', '交付支持', '其他问题'].includes(item.workOrderType)
    ? { ...item, workOrderType: migratedType } : item;
});
const workItemSummary = (task: Record<string, any>, taskType?: string): RequirementWorkItem => ({
  id: String(task.id),
  requirementId: String(task.requirementId),
  taskType: String(taskType || task.requirementType || task.taskType || '产品需求') as RequirementWorkItem['taskType'],
  title: String(task.title || ''),
  assigneeName: String(task.assigneeName || task.ownerName || ''),
  status: String(task.status || '待处理'),
  revision: Number(task.revision || 0),
  createdAt: task.createdAt || now(),
});
const attachWorkItemToRequirement = (task: Record<string, any>, taskType?: string) => {
  if (!task.requirementId) return;
  const items = getWorkItems();
  const index = items.findIndex((item) => item.id === task.requirementId);
  if (index < 0) return;
  const current = items[index];
  const summaries = Array.isArray(current.workItems) ? current.workItems : [];
  const summary = workItemSummary(task, taskType);
  items[index] = { ...current, workItems: [...summaries.filter((item: RequirementWorkItem) => item.id !== summary.id), summary] };
  write(KEYS.workItems, items);
};
const syncAttachedWorkItem = (task: Record<string, any>) => {
  if (!task.requirementId) return;
  const items = getWorkItems();
  const index = items.findIndex((item) => item.id === task.requirementId);
  if (index < 0) return;
  const current = items[index];
  const summaries = Array.isArray(current.workItems) ? current.workItems : [];
  const summary = workItemSummary(task);
  items[index] = { ...current, workItems: summaries.map((item: RequirementWorkItem) => item.id === summary.id ? { ...item, ...summary } : item) };
  write(KEYS.workItems, items);
};
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
const getMembers = () => read(KEYS.members, MOCK_TEAM_MEMBERS.map((item) => ({ ...item })));
const getProductLines = (): ProductLine[] => read<ProductLine[]>(KEYS.productLines, MOCK_PRODUCT_LINES.map((item) => ({ ...item, versions: [...(item.versions || [])] }))).map((product) => {
  const snapshotVersions = MOCK_PRODUCT_LINES.find((item) => item.id === product.id)?.versions || [];
  return { ...product, versions: product.versions?.map((version) => ({
    ...version,
    releaseDate: version.releaseDate || snapshotVersions.find((item) => item.id === version.id)?.releaseDate || '',
  })) };
});
const getOkrPeople = () => {
  const cached = read(KEYS.okrPeople, MOCK_OKR_PEOPLE);
  return MOCK_OKR_PEOPLE.map((person) => {
    const saved = cached.find((item) => item.id === person.id);
    const member = getMembers().find(item => item.id === person.id);
    return { ...(saved && saved.version > person.version ? { ...person, ...saved } : person), ...(member ? { name: member.name, department: member.department, jobTitle: member.jobTitle } : {}) };
  });
};
const planCases = (caseIds: string[]): TestPlanCase[] => getCases().filter((item) => caseIds.includes(item.id)).map((item, index) => ({
  linkId: id('link'), testCaseId: item.id, sort: index + 1, code: item.code, title: item.title, priority: item.priority,
  ownerName: item.ownerName, enabled: item.enabled, latestResult: item.latestResult, executionStatus: 'NOT_EXECUTED', defectIds: [],
}));

const databaseRows = (table: keyof typeof MOCK_DATABASE) => (MOCK_DATABASE[table] as unknown as Array<Record<string, any>>).filter((row) => Number(row.delete_flag_ || 0) === 0);
const taskActivities = () => read<any[]>(KEYS.taskActivities, databaseRows('t_product_work_item_activity').map((row) => ({ id: row.id_, subjectId: row.subject_id_, productLineId: row.product_line_id_, eventType: row.event_type_, content: row.content_, operatorName: MOCK_USERS.find((user) => user.id === row.create_by_)?.name || row.create_by_, createdAt: row.create_time_ })));
const recordTaskActivity = (subjectId: string, productLineId: string, eventType: string, content: Record<string, unknown>) => {
  write(KEYS.taskActivities, [...taskActivities(), { id: id('activity'), subjectId, productLineId, eventType, content, operatorName: MOCK_USERS[0]?.name || '当前用户', createdAt: now() }]);
};
const recordTaskChanges = (before: Record<string, any>, after: Record<string, any>) => {
  const codes = ['title', 'description', 'descriptionHtml', 'expectedGoal', 'priority', 'assigneeName', 'ownerName', 'versionId', 'customerName', 'plannedStartDate', 'plannedEndDate', 'dueDate', 'estimatedHours', 'actualHours', 'status'];
  const changes = codes.filter((field) => JSON.stringify(before[field] ?? '') !== JSON.stringify(after[field] ?? '')).map((field) => ({ field, from: before[field] ?? '', to: after[field] ?? '' }));
  if (changes.length) recordTaskActivity(String(after.id), String(after.productLineId || ''), 'WORK_ITEM_UPDATED', { changes });
};
const categoryCode = (value: string) => ({ 产品: 'requirement', 需求: 'requirement', 设计: 'design', 研发: 'dev', 测试: 'test', 缺陷: 'bug', 用例: 'case' } as Record<string, string>)[value] || value;
const isTestCaseCategory = (value: any) => String(value?.code || value?.category || value?.name || '').toLowerCase() === 'case' || value?.capabilityType === 'TEST_CASE';
const templateCategories = () => read(KEYS.researchCategories, databaseRows('t_work_item_category_dictionary').map((row) => ({ id: row.id_, code: row.code_, name: row.name_, displayName: row.display_name_ || row.name_, iconKey: row.icon_key_ || row.code_, capabilityType: row.capability_type_ || 'STANDARD', sort: Number(row.sort_ || 0), enabled: Boolean(row.enabled_), builtIn: Boolean(row.built_in_), revision: Number(row.version_ || 0) }))).filter((item: any) => !isTestCaseCategory(item));
const templateRoles = () => read(KEYS.researchRoles, databaseRows('t_product_role_template').map((row) => ({ id: row.id_, name: row.name_, responsibility: row.responsibility_ || '', sort: Number(row.sort_ || 0), revision: Number(row.version_ || 0), updatedAt: row.update_time_ })));
const templateStatuses = () => read(KEYS.researchStatuses, databaseRows('t_research_status_template').map((row) => ({ id: row.id_, scope: row.scope_, name: row.name_, phase: row.phase_, color: row.color_ || 'neutral', initial: Boolean(row.initial_), enabled: Boolean(row.enabled_), sort: Number(row.sort_ || 0), revision: Number(row.version_ || 0) })));
const DETAIL_FIELD_DEFINITIONS: Record<string, Array<[string, string, string, string, boolean]>> = {
  common: [
    ['title', '标题', 'text', '详情页顶部任务标题，可点击修改', true], ['creator', '创建人', 'user', '任务创建人，只读', false], ['createdAt', '创建时间', 'date', '任务创建时间，只读', false], ['updater', '更新人', 'user', '最近一次修改人，只读', false], ['updatedAt', '更新时间', 'date', '最近一次修改时间，只读', false],
    ['expectedGoal', '期望结果', 'text', '任务完成后预期达到的结果', true], ['parent', '主任务', 'relation', '当前任务所属的父任务，只读', false], ['description', '任务描述', 'text', '左侧描述区，可进入富文本编辑', true], ['status', '当前状态', 'select', '右侧基础字段中的任务状态', true], ['assignee', '负责人', 'user', '右侧基础字段中的负责人', true], ['priority', '优先级', 'select', '右侧基础字段中的优先级', true],
    ['productLine', '归属产品', 'relation', '任务所属产品或产品线', true], ['version', '迭代版本', 'relation', '任务关联的迭代版本', true], ['plannedStartDate', '计划开始时间', 'date', '任务计划开始日期', true], ['dueDate', '计划完成时间', 'date', '任务计划完成日期', true], ['expectedCompleteDate', '期望完成时间', 'date', '业务期望完成日期', true],
    ['customer', '关联客户', 'relation', '任务关联的客户对象', true], ['participants', '参与人', 'user', '需要同步或关注任务的成员', true], ['estimatedHours', '预计工时', 'number', '任务预计投入的小时数', true], ['actualHours', '实际工时', 'number', '任务实际投入的小时数', true], ['taskType', '任务类型', 'select', '工作项所属类型', true], ['relations', '关联对象', 'section', '详情页下方的关联产品任务和协同事项', true], ['children', '子任务', 'section', '详情页下方的子任务列表', true], ['support', '支撑项', 'section', '详情页下方关联的测试计划等支撑事项', true], ['hours', '工时', 'section', '详情页下方的工时汇总和统计', true],
  ],
  dev: [['repo', '代码仓库', 'text', '研发任务关联的代码仓库地址或名称', true], ['branch', '特性分支', 'text', '研发任务对应的代码分支', true]],
  bug: [['severity', '严重程度', 'select', '缺陷影响范围和紧急程度', true], ['type', '缺陷类型', 'select', '缺陷所属的问题类型', true], ['env', '所属环境', 'select', '缺陷出现或验证的运行环境', true]],
};
const DETAIL_FIELDS = (categoryCode: string) => [...DETAIL_FIELD_DEFINITIONS.common.flatMap((field): Array<[string, string, string, string, boolean]> => field[0] === 'relations' ? [['collaborationItems', '协同事项', 'section', '关联工作台中的协同事项', true], ['relatedTasks', '关联任务', 'section', '关联其他类型任务', true]] : field[0] === 'customer' ? [['project', '关联项目', 'relation', '任务关联的项目对象', true]] : [field]), ...(categoryCode === 'dev' ? DETAIL_FIELD_DEFINITIONS.dev : []), ...(categoryCode === 'bug' ? DETAIL_FIELD_DEFINITIONS.bug : [])].map(([fieldCode, label, fieldType, description, editable], index) => ({
  fieldCode,
  label,
  fieldType,
  description,
  visible: true,
  required: REQUIRED_FIELD_CODES.has(fieldCode),
  editable: Boolean(editable),
  sort: index + 1,
  locked: REQUIRED_FIELD_CODES.has(fieldCode) || ['creator', 'createdAt', 'updater', 'updatedAt'].includes(fieldCode),
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
  customer: { label: '关联项目', fieldType: 'relation', description: '任务关联的项目对象' },
  collaborationItems: { label: '协同事项', fieldType: 'relation', description: '关联工作台中的协同事项' },
  relatedTasks: { label: '关联任务', fieldType: 'relation', description: '关联其他类型任务' },
  project: { label: '关联项目', fieldType: 'relation', description: '任务关联的项目对象' },
  needsCollaboration: { label: '需要协同', fieldType: 'multiSelect', description: '创建后下发到设计、开发或测试待分配任务' },
  estimatedHours: { label: '预计工时', fieldType: 'number', description: '任务预计投入的小时数' },
  actualHours: { label: '实际工时', fieldType: 'number', description: '任务实际投入的小时数' },
  relations: { label: '关联对象', fieldType: 'section', description: '关联产品任务和协同事项' },
  children: { label: '子任务', fieldType: 'section', description: '创建后维护子任务' },
  support: { label: '支撑项', fieldType: 'section', description: '创建后关联测试计划等支撑事项' },
  hours: { label: '工时', fieldType: 'section', description: '创建后登记和统计工时' },
  repo: { label: '代码仓库', fieldType: 'text', description: '研发任务关联的代码仓库' },
  branch: { label: '特性分支', fieldType: 'text', description: '研发任务对应的代码分支' },
  commitsCount: { label: '提交数', fieldType: 'number', description: '研发任务关联的代码提交数量' },
  severity: { label: '严重程度', fieldType: 'select', description: '缺陷影响范围和紧急程度' },
  type: { label: '缺陷类型', fieldType: 'select', description: '缺陷所属的问题类型' },
  env: { label: '所属环境', fieldType: 'select', description: '缺陷出现或验证的运行环境' },
  attachments: { label: '附件', fieldType: 'relation', description: '工作项关联的附件' },
};
const REQUIRED_FIELD_CODES = new Set(['title', 'status', 'assignee']);
const DETAIL_SYSTEM_FIELD_CODES = new Set(['creator', 'createdAt', 'updater', 'updatedAt']);
// 历史配置中曾使用 requirement 作为独立关联字段，现统一由 relations 关系区承载。
const LEGACY_FIELD_CODES = new Set(['requirement']);
const CREATE_ASSOCIATION_FIELD_CODES = ['collaborationItems', 'relatedTasks', 'children', 'support', 'hours'];
const CREATE_COMMON_FIELD_CODES = ['title', 'expectedGoal', 'description', 'productLine', 'taskType', 'assignee', 'priority', 'plannedStartDate', 'plannedEndDate', 'version', 'project', 'cc', 'estimatedHours', 'actualHours', 'attachments'];
const DEFAULT_HIDDEN_CREATE_FIELD_CODES = new Set(['expectedGoal', 'hours', 'collaborationItems', 'children', 'cc']);
const DEFAULT_HIDDEN_DETAIL_FIELD_CODES = new Set(['support', 'participants', 'taskType']);
const defaultFieldVisible = (scene: string, fieldCode: string) => scene === 'CREATE'
  ? !DEFAULT_HIDDEN_CREATE_FIELD_CODES.has(fieldCode)
  : scene === 'DETAIL' ? !DEFAULT_HIDDEN_DETAIL_FIELD_CODES.has(fieldCode) : true;
const normalizeTemplateField = (field: any) => {
  const metadata = FIELD_METADATA[field.fieldCode];
  const detailSystemField = field.scene === 'DETAIL' && DETAIL_SYSTEM_FIELD_CODES.has(field.fieldCode);
  const creationDate = (field.scene === 'CREATE' || field.scene === 'CREATE_CHILD') && (field.fieldCode === 'plannedStartDate' || field.fieldCode === 'plannedEndDate');
  const locked = REQUIRED_FIELD_CODES.has(field.fieldCode) || detailSystemField || creationDate;
  return {
    ...(metadata ? { ...field, ...metadata } : field),
    required: locked ? true : Boolean(field.required),
    visible: locked ? true : Boolean(field.visible),
    locked: locked || Boolean(field.locked),
  };
};
const templateFields = () => {
  const stored = read<any[] | null>(KEYS.researchFields, null);
  const base = (stored || databaseRows('t_work_item_field_configuration').map((row) => ({ categoryCode: row.category_code_, scene: row.scene_, fieldCode: row.field_code_, label: row.field_code_, fieldType: 'text', visible: defaultFieldVisible(row.scene_, row.field_code_) && Boolean(row.visible_), required: Boolean(row.required_), editable: true, defaultValue: null, sort: Number(row.sort_ || 0), locked: false })))
    .flatMap((field) => field.fieldCode === 'relations' ? ['collaborationItems', 'relatedTasks'].filter((code) => !stored?.some((existing) => existing.categoryCode === field.categoryCode && existing.scene === field.scene && existing.fieldCode === code)).map((code) => ({ ...field, fieldCode: code })) : [{ ...field, fieldCode: field.fieldCode === 'customer' ? 'project' : field.fieldCode }])
    .filter((field, index, all) => !LEGACY_FIELD_CODES.has(field.fieldCode) && all.findIndex((other) => other.categoryCode === field.categoryCode && other.scene === field.scene && other.fieldCode === field.fieldCode) === index)
    .map(normalizeTemplateField);
  const categories = [...new Set(['requirement', 'design', 'dev', 'test', 'bug', ...templateCategories().map((item: any) => item.code)])].filter((code) => code !== 'case');
  // New categories inherit the common field contract until customized independently.
  categories.forEach((code) => {
    ['CREATE', 'CREATE_CHILD', 'LIST', 'ITERATION'].forEach((scene) => {
      if (base.some((field) => field.categoryCode === code && field.scene === scene)) return;
      base.push(...base.filter((field) => field.categoryCode === 'requirement' && field.scene === scene).map((field) => ({ ...field, categoryCode: code })));
    });
  });
  const createScenes = ['CREATE', 'CREATE_CHILD'];
  const baseWithCreateAssociations = [...base];
  createScenes.forEach((scene) => {
    if (!baseWithCreateAssociations.some((field) => field.categoryCode === 'requirement' && field.scene === scene && field.fieldCode === 'needsCollaboration')) baseWithCreateAssociations.push({ categoryCode: 'requirement', scene, fieldCode: 'needsCollaboration', ...FIELD_METADATA.needsCollaboration, visible: true, required: false, editable: true, defaultValue: ['dev', 'test'], sort: 12, locked: false });
  });
  // Sparse historical scenes must retain overrides while receiving missing common controls.
  categories.forEach((categoryCode) => createScenes.forEach((scene) => {
    CREATE_COMMON_FIELD_CODES.filter((fieldCode) => scene === 'CREATE' || fieldCode !== 'expectedGoal').forEach((fieldCode) => {
      if (baseWithCreateAssociations.some((field) => field.categoryCode === categoryCode && field.scene === scene && field.fieldCode === fieldCode)) return;
      const metadata = FIELD_METADATA[fieldCode];
      const sort = Math.max(0, ...baseWithCreateAssociations.filter((field) => field.categoryCode === categoryCode && field.scene === scene).map((field) => field.sort)) + 1;
      baseWithCreateAssociations.push(normalizeTemplateField({ categoryCode, scene, fieldCode, ...metadata, visible: defaultFieldVisible(scene, fieldCode), required: false, editable: fieldCode !== 'actualHours', defaultValue: fieldCode === 'priority' ? '中' : null, sort, locked: false }));
    });
  }));
  categories.forEach((categoryCode) => createScenes.forEach((scene) => CREATE_ASSOCIATION_FIELD_CODES.forEach((fieldCode) => {
    if (baseWithCreateAssociations.some((field) => field.categoryCode === categoryCode && field.scene === scene && field.fieldCode === fieldCode)) return;
    const metadata = FIELD_METADATA[fieldCode];
    baseWithCreateAssociations.push({ categoryCode, scene, fieldCode, label: metadata.label, fieldType: metadata.fieldType, description: metadata.description, visible: defaultFieldVisible(scene, fieldCode), required: false, editable: true, defaultValue: null, sort: baseWithCreateAssociations.filter((field) => field.categoryCode === categoryCode && field.scene === scene).length + 1, locked: false });
  })));
  const detail = categories.flatMap((categoryCode) => DETAIL_FIELDS(categoryCode).map((field) => ({ ...field, visible: defaultFieldVisible('DETAIL', field.fieldCode), categoryCode, scene: 'DETAIL' })));
  const detailCodes = new Set(detail.map((field) => `${field.categoryCode}:${field.fieldCode}`));
  const detailDefaults = new Map(detail.map((field) => [`${field.categoryCode}:${field.fieldCode}`, field]));
  const normalizedBase = baseWithCreateAssociations.filter((field) => field.scene !== 'DETAIL' || detailCodes.has(`${field.categoryCode}:${field.fieldCode}`)).map((field) => {
    if (field.scene !== 'DETAIL') return normalizeTemplateField(field);
    const defaults = detailDefaults.get(`${field.categoryCode}:${field.fieldCode}`);
    return defaults ? normalizeTemplateField({ ...defaults, ...field, label: defaults.label, fieldType: defaults.fieldType, description: defaults.description }) : normalizeTemplateField(field);
  });
  const existing = new Set(normalizedBase.filter((field) => field.scene === 'DETAIL').map((field) => `${field.categoryCode}:${field.fieldCode}`));
  return [...normalizedBase, ...detail.filter((field) => !existing.has(`${field.categoryCode}:${field.fieldCode}`))];
};
const templateTypes = () => {
  const workflows = databaseRows('t_work_item_template_workflow');
  return read(KEYS.researchTypes, databaseRows('t_work_item_template_type').map((row) => ({ id: row.id_, category: row.category_, name: row.name_, description: row.description_ || '', enabled: Boolean(row.enabled_), isDefault: Boolean(row.is_default_), revision: Number(row.version_ || 0), workflow: workflows.find((workflow) => workflow.template_type_id_ === row.id_) ? { id: workflows.find((workflow) => workflow.template_type_id_ === row.id_).id_, category: categoryCode(row.category_), taskTypeId: row.id_, name: workflows.find((workflow) => workflow.template_type_id_ === row.id_).name_, workflowVersion: 1, status: 'PUBLISHED', revision: Number(workflows.find((workflow) => workflow.template_type_id_ === row.id_).revision_ || 0), definition: workflows.find((workflow) => workflow.template_type_id_ === row.id_).definition_ } : undefined }))).filter((item: any) => !isTestCaseCategory(item));
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
    .filter((item) => !item.deleted && !item.deleteFlag && (item.assigneeId === viewerId || (!item.assigneeId && item.ownerName === viewerName)) && item.requirementType !== '协助事项' && unfinishedTask(item.status))
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

async function handleMockApiRequest(path: string, init: RequestInit = {}): Promise<any> {
  const method = (init.method || 'GET').toUpperCase();
  const clean = path.split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  const body = bodyOf(init);
  if (parts.includes('test-reports')) {
    let session: { user?: { name?: string } } | null = null;
    try { session = JSON.parse(sessionStorage.getItem('shichuang.session') || 'null'); } catch { /* 兼容失效的本地会话。 */ }
    return handleMockTestReports(path, method, body, getProductLines(), session?.user?.name || '当前用户');
  }

  if (parts[1] === 'work-items' && parts[2] && parts[3] === 'review') {
    const line = queryOf(path).get('productLineId') || '';
    const item = getWorkItems().find((task) => task.id === parts[2] && task.productLineId === line);
    if (!item || item.deleted || item.deleteFlag) throw new Error('任务不存在或已归档');
    if (!['requirement', 'design', 'dev', 'test'].includes(item.category)) throw new Error('该任务类型不支持复盘总结');
    const events = taskActivities().filter((event) => event.subjectId === item.id && event.productLineId === line && event.eventType === 'WORK_ITEM_REVIEWED');
    const previous = events.at(-1)?.content?.review;
    if (method === 'GET') return previous || null;
    if (method === 'PUT') {
      if (body.revision !== (previous?.revision || 0)) throw new Error('复盘总结已被更新，请重新打开后重试');
      const title = text(body.title).trim();
      if (!title) throw new Error('请输入标题');
      if (!Array.isArray(body.media) || body.media.some((media: any) => !media.id || !media.name || !/^data:[^;,]+;base64,[a-zA-Z0-9+/=\s]*$/.test(media.dataUrl || ''))) throw new Error('附件数据无效');
      const review = { title, content: text(body.content), contentHtml: sanitizeHtml(text(body.contentHtml)), media: body.media.map((media: any) => ({ id: text(media.id), name: text(media.name), type: media.type === 'image' ? 'image' : 'file', dataUrl: media.dataUrl, ...(media.size != null ? { size: media.size } : {}), ...(media.mimeType ? { mimeType: media.mimeType } : {}) })), revision: (previous?.revision || 0) + 1, updatedAt: now() };
      recordTaskActivity(item.id, line, 'WORK_ITEM_REVIEWED', { review });
      return review;
    }
    throw new Error('不支持的复盘操作');
  }

  if (clean === '/api/work-items/batch' && method === 'POST' && body.operation === 'delete') {
    const items = getWorkItems();
    if (!Array.isArray(body.targets) || !body.targets.length || new Set(body.targets.map((target: any) => target.id)).size !== body.targets.length) throw new Error('请选择有效任务');
    const targets = body.targets.map((target: any) => {
      const item = items.find((task) => task.id === target.id && task.productLineId === target.productLineId);
      if (!item) throw new Error('任务不存在');
      if (Number(item.revision || 0) !== target.revision) throw new Error('任务已更新，请刷新后重试');
      return item;
    });
    const operatedAt = now();
    targets.forEach((item: any) => Object.assign(item, { deleted: true, deleteFlag: 1, revision: Number(item.revision || 0) + 1, operatedAt, operatorName: MOCK_USERS[0]?.name || '当前用户' }));
    write(KEYS.workItems, items);
    return targets.length;
  }
  if (parts[1] === 'work-items' && parts[2] && parts.length === 3 && method === 'DELETE') {
    const query = queryOf(path);
    const items = getWorkItems();
    const item = items.find((task) => task.id === parts[2] && task.productLineId === query.get('productLineId'));
    if (!item) throw new Error('任务不存在');
    if (item.deleted || item.deleteFlag) return null;
    if (query.get('revision') == null || Number(query.get('revision')) !== Number(item.revision || 0)) throw new Error('任务已更新，请刷新后重试');
    Object.assign(item, { deleted: true, deleteFlag: 1, revision: Number(item.revision || 0) + 1, operatedAt: now(), operatorName: MOCK_USERS[0]?.name || '当前用户' });
    write(KEYS.workItems, items);
    return null;
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'recycle-bin') {
    const items = getWorkItems();
    if (method === 'GET') return items.filter((item) => item.productLineId === parts[2] && (item.deleted || item.deleteFlag)).map((item) => ({ ...item, versionName: item.versionName || getProductLines().find((line) => line.id === parts[2])?.versions?.find((version) => version.id === item.versionId)?.name || '未设置' }));
    const item = items.find((task) => task.id === parts[4] && task.productLineId === parts[2] && (task.deleted || task.deleteFlag));
    if (!item) throw new Error('归档任务不存在');
    const revision = method === 'POST' ? body.revision : Number(queryOf(path).get('revision'));
    if (revision !== Number(item.revision || 0)) throw new Error('任务已更新，请刷新后重试');
    if (method === 'POST' && parts[5] === 'restore') {
      Object.assign(item, { deleted: false, deleteFlag: 0, revision: Number(item.revision || 0) + 1 });
      write(KEYS.workItems, items);
      return null;
    }
    if (method === 'DELETE') { write(KEYS.workItems, items.filter((task) => task.id !== item.id)); return null; }
    throw new Error('不支持的归档操作');
  }

  if (parts[1] === 'work-items' && parts[2] && ['activities', 'comments'].includes(parts[3])) {
    const item = [...getWorkItems(), ...MOCK_BUGS].find((task) => task.id === parts[2]);
    const line = queryOf(path).get('productLineId') || '';
    if (!item || String(item.productLineId || '') !== line) throw new Error('工作项不存在');
    if (parts[3] === 'activities' && method === 'GET') return taskActivities().filter((event) => event.subjectId === item.id && event.productLineId === line);
    if (parts[3] === 'comments' && method === 'POST') {
      const content = text(body.content).trim();
      if (!content || content.length > 10000) throw new Error('评论内容不能为空且不能超过10000字');
      recordTaskActivity(item.id, line, 'WORK_ITEM_COMMENTED', { content });
      return null;
    }
  }

  if (clean === '/api/attachments/stage' && method === 'POST') {
    const attachment = { ...body, id: id('attachment'), scanStatus: 'PASSED', visibility: 'SHARED' };
    write(KEYS.attachments, [...read<any[]>(KEYS.attachments, []), attachment]);
    return attachment;
  }

  if (parts[0] === 'api' && parts[1] === 'ops-tasks') {
    const tasks = read<RequirementTask[]>(KEYS.opsTasks, MOCK_OPS_TASKS.map(item => ({ ...item })));
    const taskId = parts[2] ? decodeURIComponent(parts[2]) : undefined;
    if (taskId && ['activities', 'comments'].includes(parts[3])) {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) throw new Error('运维任务不存在');
      if (parts[3] === 'activities' && method === 'GET') return taskActivities().filter((event) => event.subjectId === taskId);
      if (parts[3] === 'comments' && method === 'POST') {
        const content = text(body.content).trim();
        if (!content || content.length > 10000) throw new Error('评论内容不能为空且不能超过10000字');
        recordTaskActivity(taskId, String(task.productLineId || ''), 'WORK_ITEM_COMMENTED', { content });
        return null;
      }
    }
    if (method === 'GET') {
      if (!taskId) return { items: tasks, total: tasks.length };
      const task = tasks.find(item => item.id === taskId);
      if (!task) throw new Error('运维任务不存在');
      return task;
    }
    if (method === 'POST' && !taskId) {
      if (!text(body.title).trim()) throw new Error('任务标题不能为空');
      const task: RequirementTask = {
        ...body, id: id('ops'), code: `OPS-${Date.now()}`,
        title: text(body.title).trim(), status: text(body.status) || '待处理',
        priority: text(body.priority) || '中', ownerName: text(body.ownerName),
        productLineName: text(body.productLineName), versionName: text(body.versionName),
        estimatedHours: Number(body.estimatedHours) || 0, dueDate: text(body.dueDate), createdAt: now(),
      };
      write(KEYS.opsTasks, [task, ...tasks]);
      recordTaskActivity(task.id, String(task.productLineId || ''), 'WORK_ITEM_CREATED', { title: task.title });
      return { id: task.id, code: task.code };
    }
    if (method === 'PUT' && taskId) {
      const task = tasks.find(item => item.id === taskId);
      if (!task) throw new Error('运维任务不存在');
      if (body.title !== undefined && !text(body.title).trim()) throw new Error('任务标题不能为空');
      const updated = { ...task, ...body, id: task.id, code: task.code };
      write(KEYS.opsTasks, tasks.map(item => item.id === taskId ? updated : item));
      recordTaskChanges(task, updated);
      return null;
    }
    throw new Error('不支持的运维任务操作');
  }

  if (clean === '/api/auth/dev-login' && method === 'POST') {
    const user = MOCK_USERS.find((item) => item.role === body.username || (body.username === 'admin' && item.role === 'admin')) || MOCK_USERS[0];
    return { token: `dev-token-${user.role}`, expiresIn: 86400, user };
  }
  if (clean === '/api/auth/dev-accounts') return MOCK_USERS.map((user) => ({ username: user.role === 'admin' ? 'admin' : user.role.replace('_', '-'), name: user.name, role: user.roleTitle }));
  if (clean === '/api/product-lines' && method === 'GET') return getProductLines().filter((product: any) => !product.archivedAt && product.status !== '已归档');
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'archive' && method === 'POST') {
    const products = getProductLines();
    const product: any = products.find((item) => item.id === parts[2]);
    if (!product) throw new Error('产品不存在');
    if (product.archivedAt || product.status === '已归档') throw new Error('产品已归档');
    Object.assign(product, { archivedAt: now(), archivedByName: MOCK_USERS[0]?.name || '当前用户', archivedPreviousStatus: product.status, archivedPreviousHealth: product.health, status: '已归档', health: '已归档' });
    write(KEYS.productLines, products);
    return null;
  }
  if (clean === '/api/product-lines/archived' && method === 'GET') {
    return getProductLines().filter((product: any) => product.archivedAt || product.status === '已归档').map((product: any) => ({ id: product.id, name: product.name, code: product.code, ownerName: product.ownerName, archivedAt: product.archivedAt, archivedByName: product.archivedByName }));
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'restore' && method === 'POST') {
    const products = getProductLines();
    const product: any = products.find((item) => item.id === parts[2]);
    if (!product) throw new Error('产品不存在');
    if (!product.archivedAt && product.status !== '已归档') throw new Error('产品未归档');
    Object.assign(product, { status: product.archivedPreviousStatus || '待规划', health: product.archivedPreviousHealth, archivedAt: undefined, archivedByName: undefined, archivedPreviousStatus: undefined, archivedPreviousHealth: undefined });
    write(KEYS.productLines, products);
    return null;
  }
  if (parts[1] === 'product-lines' && parts[2] && !parts[3] && method === 'DELETE') {
    const products = getProductLines();
    if (!products.some((item) => item.id === parts[2])) throw new Error('产品不存在');
    write(KEYS.productLines, products.filter((item) => item.id !== parts[2]));
    return null;
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'versions' && parts.length <= 5 && ['POST', 'PUT'].includes(method)) {
    const products = getProductLines();
    const product = products.find((item) => item.id === parts[2]);
    if (!product) throw new Error('产品不存在');
    const versions = product.versions || [];
    if (method === 'POST' && !parts[4]) {
      if (!text(body.name).trim() || !text(body.code).trim() || !text(body.ownerName).trim()) throw new Error('请填写版本名称、版本号和版本负责人');
      if (versions.some((item) => item.code === text(body.code).trim())) throw new Error('版本号已存在');
      const version: VersionIteration = { ...body, id: id('ver'), name: text(body.name).trim(), code: text(body.code).trim(), productLineId: product.id, productLineName: product.name, status: '待开始', statusPhase: '待开始', releaseDate: '', createdAt: now() };
      product.versions = [...versions, version];
      write(KEYS.productLines, products);
      return version;
    }
    const current = versions.find((item) => item.id === parts[4]);
    if (!current) throw new Error('版本不存在');
    if (body.status !== undefined) {
      const previousStatus = normalizeVersionStatus(current.status, current.statusPhase);
      if (body.status !== previousStatus && !((previousStatus === '待开始' && body.status === '进行中') || (previousStatus === '进行中' && body.status === '已完成'))) throw new Error('迭代状态已变化，请刷新后重试');
    }
    Object.assign(current, body, { id: current.id, productLineId: product.id, productLineName: product.name });
    if (body.status !== undefined) current.statusPhase = body.status === '进行中' ? '处理中' : body.status;
    write(KEYS.productLines, products);
    return current;
  }
  if (clean === '/api/product-lines' && method === 'POST') {
    const input = body as Partial<ProductLine>;
    const product: ProductLine = { ...input, id: id('pl'), name: input.name || '新建产品', code: input.code || 'PL-NEW', description: input.description || '', ownerName: input.ownerName || '', visibility: input.visibility || '公开', commercialAvailability: input.commercialAvailability || '不可商用', sort: Number(input.sort || 0), status: '待规划', createdAt: now(), versions: [] };
    const products = [...getProductLines(), product]; write(KEYS.productLines, products); return product;
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'members' && ['POST', 'DELETE'].includes(method)) {
    const products = getProductLines();
    const product = products.find((item) => item.id === parts[2]);
    if (!product) throw new Error('产品不存在');
    if (method === 'POST') {
      const user = getMembers().find((item) => item.id === body.userId && item.status === 'enabled');
      if (!user) throw new Error('成员不可用');
      if (!templateRoles().some((role: any) => role.name === body.role)) throw new Error('所属角色不可用');
      if (!(product.members || []).some((member) => typeof member !== 'string' && member.userId === user.id)) {
        product.members = [...(product.members || []), { id: id('product-member'), userId: user.id, name: user.name, role: body.role }] as ProductLine['members'];
      }
    } else product.members = (product.members || []).filter((member) => typeof member === 'string' || member.id !== parts[4]) as ProductLine['members'];
    write(KEYS.productLines, products);
    return null;
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'members' && parts[4] && method === 'PUT') {
    const products = getProductLines(); const product = products.find((item) => item.id === parts[2]);
    if (!product) throw new Error('产品不存在');
    const member = (product.members || []).find((item) => typeof item !== 'string' && item.id === parts[4]);
    if (!member || typeof member === 'string') throw new Error('产品成员不存在');
    if (!templateRoles().some((role: any) => role.name === body.role)) throw new Error('所属角色不可用');
    member.role = body.role; write(KEYS.productLines, products); return null;
  }
  if (parts[1] === 'product-lines' && parts[2] && !parts[3] && method === 'PUT') {
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
  if (clean === '/api/requirements' && method === 'GET') {
    const query = queryOf(path);
    const items = getWorkItems().filter((item) => item.category === 'requirement' && !item.deleted && !item.deleteFlag && (!query.get('status') || item.status === query.get('status')));
    const page = Math.max(1, Number(queryOf(path).get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(queryOf(path).get('pageSize') || 100)));
    return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length };
  }
  if (clean === '/api/requirements/audit-events' && method === 'GET') {
    const query = queryOf(path);
    const items = getWorkItems().filter((item) => item.category === 'requirement' && !item.deleted && !item.deleteFlag).flatMap((item) => (item.events || []).map((event) => ({ ...event, requirementId: item.id }))).filter((event) => (!query.get('eventType') || event.eventType === query.get('eventType')) && (!query.get('operatorName') || event.operatorName === query.get('operatorName')));
    const page = Math.max(1, Number(query.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize') || 100)));
    return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length };
  }
  if (clean === '/api/requirements/my-tasks' && method === 'GET') {
    const viewerId = queryOf(path).get('viewerId') || '';
    return viewerId ? myTasks(viewerId) : [];
  }
  if (parts[1] === 'requirements' && parts[2] && parts.length === 3 && method === 'GET') {
    const item = getWorkItems().find((candidate) => candidate.id === parts[2]);
    if (!item) throw new Error('事项不存在');
    return { ...item, events: item.events || [], workItems: item.workItems || [] };
  }
  if (parts[1] === 'requirements' && parts[2] && parts[3] === 'comments' && method === 'POST') {
    const items = getWorkItems();
    const index = items.findIndex((item) => item.id === parts[2] && item.category === 'requirement' && !item.deleted && !item.deleteFlag);
    if (index < 0) throw new Error('事项不存在');
    const current = items[index];
    let viewer: { id?: string; name?: string } | undefined;
    try { viewer = JSON.parse(sessionStorage.getItem('shichuang.session') || 'null')?.user; } catch { /* 无效会话不可发表评论。 */ }
    if (!viewer?.name) throw new Error('请登录后发表评论');
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content || content.length > 1000) throw new Error('评论需填写1至1000字');
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    if (!requestId || requestId.length > 100) throw new Error('评论提交标识无效，请重新提交');
    const previous = (current.events || []).find((event) => event.eventType === '发表评论' && event.metadata?.commentRequestId === requestId);
    if (previous) {
      if (previous.metadata?.commentContent !== content || previous.metadata?.commentAuthorId !== (viewer.id || viewer.name)) throw new Error('评论提交标识已使用，请重新提交');
      return { ...current, events: current.events || [], workItems: current.workItems || [] };
    }
    const revision = Number(current.revision ?? current.version ?? 0);
    if (body.revision !== revision) throw new Error('事项已被其他人更新，请刷新后重试');
    const event = { id: id('comment'), eventType: '发表评论', operatorName: viewer.name, createdAt: now(), metadata: { commentContent: content, commentAuthorId: viewer.id || viewer.name, commentRequestId: requestId } };
    const updated = { ...current, revision: revision + 1, events: [...(current.events || []), event] };
    items[index] = updated;
    write(KEYS.workItems, items);
    return { ...updated, workItems: updated.workItems || [] };
  }
  if (parts[1] === 'requirements' && parts[2] && parts[3] === 'reopen' && method === 'POST') {
    const items = getWorkItems();
    const index = items.findIndex((item) => item.id === parts[2] && !item.deleted && !item.deleteFlag);
    if (index < 0) throw new Error('事项不存在');
    const current = items[index];
    const revision = Number(current.revision ?? current.version ?? 0);
    if (Number(body.revision) !== revision) throw new Error('事项已被其他人更新，请刷新后重试');
    if (current.status !== '已完成') throw new Error('仅已完成事项可以重新开启');
    const owner = getMembers().find((member) => member.id === body.assigneeId && member.status === 'enabled');
    if (!owner || !text(body.reason).trim()) throw new Error('请选择有效处理人并填写重开原因');
    const event = { id: id('event'), eventType: '事项重开', fromStatus: current.status, toStatus: '待处理', reason: text(body.reason).trim(), operatorName: current.creatorName, createdAt: now(), metadata: { ownerChanged: true, fromAssigneeName: current.ownerName, assigneeName: owner.name } };
    items[index] = { ...current, status: '待处理', progress: 0, ownerName: owner.name, assigneeName: owner.name, assigneeId: owner.id, revision: revision + 1, events: [...(current.events || []), event] };
    write(KEYS.workItems, items);
    return items[index];
  }
  if (parts[1] === 'requirements' && parts[2] && parts[3] === 'transition' && method === 'POST') {
    const items = getWorkItems();
    const index = items.findIndex((candidate) => candidate.id === parts[2]);
    if (index < 0) throw new Error('事项不存在');
    const current = items[index];
    const status = body.action === 'reject' ? '已退回' : body.action === 'hold' ? '已搁置' : body.status;
    if (!['处理中', '已退回', '已搁置'].includes(status)) throw new Error('不支持的事项状态');
    if (status === '处理中' && current.status !== '待处理') throw new Error('事项状态已变化，请刷新');
    const returning = body.action === 'reject';
    if (returning && (current.status !== '待处理' || !text(body.reason).trim() || !current.creatorName)) throw new Error('仅待处理事项可退回，请确认创建人并填写退回原因');
    const creator = returning ? getMembers().find((member) => member.id === current.creatorId || member.name === current.creatorName) : undefined;
    const event = { id: id('event'), eventType: status === '处理中' ? '事项接收' : returning ? '退回' : '搁置', fromStatus: current.status, toStatus: status, reason: text(body.reason), operatorName: current.ownerName, createdAt: now(), ...(returning ? { metadata: { ownerChanged: true, fromAssigneeName: current.ownerName, assigneeName: current.creatorName } } : {}) };
    items[index] = { ...current, status, ...(returning ? { ownerName: current.creatorName, assigneeName: current.creatorName, assigneeId: current.creatorId || creator?.id || '' } : {}), revision: Number(current.revision || current.version || 0) + 1, events: [...(current.events || []), event] };
    write(KEYS.workItems, items);
    return null;
  }
  if (parts[1] === 'requirements' && parts[2] && ['complete', 'acceptance-passed', 'acceptance-failed'].includes(parts[3]) && method === 'POST') {
    const items = getWorkItems(); const index = items.findIndex((candidate) => candidate.id === parts[2]);
    if (index < 0) throw new Error('事项不存在');
    const current = items[index]; const revision = Number(current.revision || current.version || 0);
    if (body.revision != null && Number(body.revision) !== revision) throw new Error('事项已被其他人更新，请刷新后重试');
    const ratedAcceptance = parts[3] === 'acceptance-passed';
    if (ratedAcceptance && (!Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 5)) throw new Error('请选择1至5星的验收评价');
    if (ratedAcceptance && text(body.comment).length > 500) throw new Error('评价内容不能超过500字');
    const nextStatus = parts[3] === 'complete' ? '待验收' : parts[3] === 'acceptance-passed' ? '已完成' : '处理中';
    if ((parts[3] === 'complete' && !(current.status === '处理中' || (current.status === '已退回' && current.ownerName === current.creatorName))) || (parts[3] === 'acceptance-passed' && current.status !== '待验收') || (parts[3] === 'acceptance-failed' && current.status !== '待验收')) throw new Error('当前事项状态不允许此操作');
    if (parts[3] === 'complete' && (current.workItems || []).some((item: RequirementWorkItem) => item.status !== '已完成' && item.assistanceTaskStatus !== 'COMPLETED')) throw new Error('存在未完成的关联任务');
    const stagedAttachments = read<any[]>(KEYS.attachments, []);
    const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds.map(String) : [];
    const previousOwnerName = String(current.ownerName || current.assigneeName || '').trim();
    const previousAssigneeId = String(current.assigneeId || '').trim();
    const creatorName = String(current.creatorName || '').trim();
    const creatorId = String(current.creatorId || MOCK_USERS.find((user) => user.name === creatorName)?.id || '').trim();
    const failedTask = parts[3] === 'acceptance-failed'
      ? (current.workItems || []).find((item: RequirementWorkItem) => item.id === String(body.workItemId || '') && (item.status === '已完成' || item.assistanceTaskStatus === 'COMPLETED'))
      : undefined;
    if (parts[3] === 'acceptance-failed' && !failedTask) throw new Error('请选择已完成的关联任务');
    const failedTaskAssigneeId = failedTask ? String((failedTask as RequirementWorkItem & { assigneeId?: string }).assigneeId || '') : '';
    const failedOwner = failedTask ? MOCK_USERS.find((user) => user.id === String(body.taskOwnerId || failedTaskAssigneeId)) : undefined;
    const nextOwnerName = String(parts[3] === 'complete' ? (body.assigneeName || creatorName || previousOwnerName) : parts[3] === 'acceptance-failed' ? (failedOwner?.name || failedTask?.assigneeName || previousOwnerName) : previousOwnerName).trim();
    const nextAssigneeId = String(parts[3] === 'complete' ? (body.assigneeId || creatorId || previousAssigneeId) : parts[3] === 'acceptance-failed' ? (body.taskOwnerId || failedTaskAssigneeId || previousAssigneeId) : previousAssigneeId).trim();
    const ownerChanged = Boolean(nextOwnerName && nextOwnerName !== previousOwnerName) || Boolean(previousAssigneeId && nextAssigneeId && nextAssigneeId !== previousAssigneeId);
    const event = { id: id('event'), eventType: parts[3] === 'complete' ? '事项完成' : parts[3] === 'acceptance-passed' ? '验收通过' : '验收未通过', fromStatus: current.status, toStatus: nextStatus, reason: ratedAcceptance ? text(body.comment).trim() : text(body.note || body.reason), operatorName: ratedAcceptance ? current.creatorName : current.ownerName, createdAt: now(), metadata: { ...(ratedAcceptance ? { rating: body.rating } : {}), ...(body.noteHtml ? { noteHtml: text(body.noteHtml) } : {}), ...(ownerChanged ? { ownerChanged: true, fromAssigneeName: previousOwnerName, assigneeName: nextOwnerName } : {}), attachments: stagedAttachments.filter((attachment) => attachmentIds.includes(String(attachment.id))) } };
    const nextWorkItems = parts[3] === 'acceptance-failed'
      ? (current.workItems || []).map((item: RequirementWorkItem) => item.id === failedTask?.id ? { ...item, status: '处理中', assistanceTaskStatus: 'PROCESSING', assigneeName: nextOwnerName } : item)
      : current.workItems;
    items[index] = { ...current, status: nextStatus, workItems: nextWorkItems, ...((parts[3] === 'complete' || parts[3] === 'acceptance-failed') && ownerChanged ? { ownerName: nextOwnerName, assigneeName: nextOwnerName, ...(nextAssigneeId ? { assigneeId: nextAssigneeId } : {}) } : {}), revision: revision + 1, events: [...(current.events || []), event] };
    write(KEYS.workItems, items); return { id: current.id, status: nextStatus };
  }
  if (clean === '/api/design-tasks' && method === 'GET') { const items = getWorkItems().filter((item) => item.category === 'design' && !item.deleted && !item.deleteFlag); return { items, page: 1, pageSize: 100, total: items.length }; }
  if (clean === '/api/bugs' && method === 'GET') {
    const items = getWorkItems().filter((item) => item.category === 'bug' && !item.deleted && !item.deleteFlag).map((item) => ({ ...item, assignee: item.assigneeName || item.ownerName || item.assignee || '', reporter: item.reporter || item.creatorName || '', versionName: item.versionName || getProductLines().find((line) => line.id === item.productLineId)?.versions?.find((version) => version.id === item.versionId)?.name || '' }));
    return { items, page: 1, pageSize: 100, total: items.length };
  }
  if (clean === '/api/dev-tasks' && method === 'GET') { const items = getWorkItems().filter((item) => item.category === 'dev' && !item.deleted && !item.deleteFlag); return { items, page: 1, pageSize: 100, total: items.length }; }
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
    return read(KEYS.okrRecords, MOCK_OKR_RECORDS).filter((record: any) => record.status !== 'deleted' && (record.kind !== 'review' || !viewerId || record.ownerId === viewerId));
  }
  if (clean === '/api/okr/records' && method === 'POST') { const record = { id: id('okr'), kind: body.kind, ownerId: body.viewerId || MOCK_USERS[0]?.id, periodKey: body.periodKey, status: body.submit === false ? 'draft' : 'active', version: 0, createdAt: now(), payload: body.payload || {} }; const records = read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS); write(KEYS.okrRecords, [...records, record]); return { id: record.id }; }
  if (parts[1] === 'okr' && parts[2] === 'records' && parts[3] && method === 'PATCH') {
    const records = read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS);
    const index = records.findIndex(record => record.id === parts[3]);
    if (index < 0) throw new Error('目标记录不存在');
    const record = records[index];
    if (record.kind === 'objective' || record.kind === 'action') {
      if (!body.viewerId || record.ownerId !== body.viewerId) throw new Error('只能修改或删除本人制定的目标');
      if (record.status === 'deleted' && body.action === 'delete') return record;
      if (record.status === 'deleted') throw new Error('目标已删除');
      if (body.version !== record.version) throw new Error('目标已被更新，请刷新后重试');
      const group = record.kind === 'action' ? legacyGoalActions(record, records) : [record];
      const groupIds = new Set(group.map(item => item.id));
      const dependents = records.filter(item => item.status !== 'deleted' && item.kind !== 'review' && !groupIds.has(item.id) && (groupIds.has(item.payload?.parentObjectiveId) || groupIds.has(item.payload?.parentActionId) || groupIds.has(item.payload?.parentKeyResultId) || item.payload?.alignments?.some((alignment: any) => groupIds.has(alignment.parentObjectiveId) || groupIds.has(alignment.parentKeyResultId))));
      if (body.action === 'delete') {
        if (dependents.length) throw new Error('目标已有下级对齐，不能直接删除');
        groupIds.forEach(recordId => { const i = records.findIndex(item => item.id === recordId); records[i] = { ...records[i], status: 'deleted', version: records[i].version + 1, deletedAt: now(), deletedBy: body.viewerId }; });
        write(KEYS.okrRecords, records);
        return records[index];
      }
      if (record.kind === 'action' && body.payload?.keyResults) {
        const retainedIds = new Set(body.payload.keyResults.map((item: any) => item.id));
        if (dependents.some(item => !retainedIds.has(item.payload.parentActionId || item.payload.parentKeyResultId) && groupIds.has(item.payload.parentActionId || item.payload.parentKeyResultId) || item.payload.alignments?.some((alignment: any) => groupIds.has(alignment.parentKeyResultId) && !retainedIds.has(alignment.parentKeyResultId)))) throw new Error('已被下级对齐的动作不能移除');
        groupIds.forEach(recordId => { const i = records.findIndex(item => item.id === recordId); if (i !== index) records[i] = { ...records[i], status: 'deleted', version: records[i].version + 1 }; });
        dependents.forEach(item => {
          const i = records.findIndex(row => row.id === item.id);
          records[i] = { ...item, version: item.version + 1, payload: { ...item.payload,
            ...(groupIds.has(item.payload.parentActionId || item.payload.parentKeyResultId) ? { parentObjectiveId: record.id } : {}),
            ...(item.payload.alignments ? { alignments: item.payload.alignments.map((alignment: any) => groupIds.has(alignment.parentKeyResultId) ? { ...alignment, parentObjectiveId: record.id } : alignment) } : {}),
          } };
        });
        records[index] = { ...record, kind: 'objective', payload: body.payload, status: body.action === 'submit' ? 'active' : record.status, version: record.version + 1 };
        write(KEYS.okrRecords, records);
        return records[index];
      }
      if (body.payload) {
        const retainedIds = new Set((body.payload.keyResults || []).map((item: any) => item.id));
        if (dependents.some(item => (item.payload.parentObjectiveId === record.id && (item.payload.parentActionId || item.payload.parentKeyResultId) && !retainedIds.has(item.payload.parentActionId || item.payload.parentKeyResultId)) || item.payload.alignments?.some((alignment: any) => alignment.parentObjectiveId === record.id && alignment.parentKeyResultId && !retainedIds.has(alignment.parentKeyResultId)))) throw new Error('已被下级对齐的动作不能移除');
      }
    }
    records[index] = { ...record, ...(body.payload ? { payload: body.payload } : {}), status: body.action === 'submit' ? 'active' : record.status, version: record.version + 1 };
    write(KEYS.okrRecords, records);
    return records[index];
  }
  if (parts[1] === 'okr' && parts[2] === 'people' && parts[3] && method === 'PUT') { const people = getOkrPeople(); const index = people.findIndex((person) => person.id === parts[3]); if (index < 0) throw new Error('组织成员不存在'); people[index] = { ...people[index], supervisorId: body.supervisorId || null, rootFlag: body.root ? 1 : 0, version: people[index].version + 1 }; write(KEYS.okrPeople, people); return people[index]; }
  if (clean === '/api/okr/work' && method === 'GET') return [];
  if (clean === '/api/okr/actions/parents' && method === 'GET') { const query = queryOf(path); return assignedGoalActions(read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS), getOkrPeople().find(person => person.id === query.get('viewerId'))).filter(record => !query.get('periodKey') || record.periodKey === query.get('periodKey')); }
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
  if (parts[1] === 'work-item-field-configurations' && parts[2] && parts[3] && method === 'PUT') { const categoryCodeValue = decodeURIComponent(parts[2]); const scene = decodeURIComponent(parts[3]); const current = templateFields().filter((field: any) => !(field.categoryCode === categoryCodeValue && field.scene === scene)); const next = (body.fields || []).map((field: any, index: number) => normalizeTemplateField({ ...field, categoryCode: categoryCodeValue, scene, sort: index + 1, defaultValue: field.defaultValue ?? null })); write(KEYS.researchFields, [...current, ...next]); const scenes = Array.from(new Set([...current, ...next].filter((field: any) => field.categoryCode === categoryCodeValue).map((field: any) => field.scene))).map((item) => ({ scene: item, fields: [...current, ...next].filter((field: any) => field.categoryCode === categoryCodeValue && field.scene === item).sort((a: any, b: any) => a.sort - b.sort) })); return { categoryCode: categoryCodeValue, scenes }; }
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
  // 产品级配置在真实系统中由全局产研模板继承；纯前端演示保持同样的读取关系。
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'work-item-types' && !parts[4] && method === 'GET') {
    const category = queryOf(path).get('category') || '';
    const product = getProductLines().find((item) => item.id === parts[2]);
    const inherited = (product?.workItemTypes ?? templateTypes()).filter((item: any) => !category || item.category === category || categoryCode(item.category) === category);
    return inherited.map((item: any) => ({ ...item, productLineId: parts[2] }));
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'child-type-rules' && method === 'GET') return [];
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'work-item-types' && parts[5] === 'workflows') {
    const products = getProductLines();
    const product = products.find((item) => item.id === parts[2]);
    if (!product) throw new Error('产品不存在');
    const types = structuredClone(product.workItemTypes ?? templateTypes());
    const type = types.find((item: any) => item.id === parts[4]) as any;
    if (!type) throw new Error('工作项类型不存在');
    const workflows = type.workflows ?? (type.workflow ? [type.workflow] : []);
    if (method === 'GET') return workflows;
    let workflow: any;
    if (method === 'POST') {
      workflow = { ...body, id: id('workflow'), taskTypeId: type.id, status: 'DRAFT', revision: 0, workflowVersion: workflows.length + 1 };
      workflows.push(workflow);
    } else if (method === 'PUT') {
      workflow = workflows.find((item: any) => item.id === parts[6]);
      if (!workflow) throw new Error('状态流程不存在');
      if (body.revision !== workflow.revision || workflow.status !== 'DRAFT') throw new Error('状态流程已更新，请刷新后重试');
      Object.assign(workflow, body, { revision: workflow.revision + 1 });
    } else throw new Error('不支持的状态流程操作');
    type.workflows = workflows;
    product.workItemTypes = types;
    write(KEYS.productLines, products);
    return workflow;
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'work-item-types' && ['POST', 'PUT', 'DELETE'].includes(method)) {
    const products = getProductLines();
    const product = products.find((item) => item.id === parts[2]);
    if (!product) throw new Error('产品不存在');
    let types = [...(product.workItemTypes ?? templateTypes())];
    let createdId = parts[4];
    if (method === 'POST') {
      createdId = id('type');
      types.push({ ...body, id: createdId, creatorName: '当前用户', createdAt: now() } as any);
    } else if (method === 'DELETE') types = types.filter((item) => item.id !== parts[4]);
    else {
      if (!types.some((item) => item.id === parts[4])) throw new Error('工作项类型不存在');
      types = types.map((item) => item.id === parts[4] ? { ...item, ...body } : item);
    }
    if (body.isDefault) types = types.map((item) => item.id !== createdId && categoryCode(item.category) === categoryCode(body.category || types.find((type) => type.id === createdId)?.category) ? { ...item, isDefault: false } : item);
    product.workItemTypes = types;
    write(KEYS.productLines, products);
    return { id: createdId };
  }
  if (parts[1] === 'product-lines' && parts[2] && ['notification-settings', 'automation-rules', 'workflows'].includes(parts[3])) {
    const products = getProductLines();
    const product = products.find((item) => item.id === parts[2]) as (ProductLine & { notificationSettings?: any; automation?: { enabled: boolean; rules: any[] } }) | undefined;
    if (!product) throw new Error('产品不存在');
    if (parts[3] === 'notification-settings') {
      if (method === 'GET') return product.notificationSettings ?? templateNotifications();
      if (method !== 'PUT') throw new Error('不支持的通知设置操作');
      product.notificationSettings = body;
      write(KEYS.productLines, products);
      return body;
    }
    if (parts[3] === 'automation-rules') {
      if (parts[4] === 'logs' && method === 'GET') return [];
      const automation = product.automation ?? structuredClone(templateAutomation());
      if (method === 'GET') {
        const keyword = (queryOf(path).get('keyword') || '').toLowerCase();
        return { enabled: automation.enabled, rules: automation.rules.filter((rule: any) => !keyword || rule.name.toLowerCase().includes(keyword)) };
      }
      let result: any;
      if (parts[4] === 'setting' && method === 'PUT') {
        automation.enabled = Boolean(body.enabled);
        result = { enabled: automation.enabled };
      } else if (!parts[4] && method === 'POST') {
        result = { ...body, id: id('automation'), revision: 0, updatedAt: now() };
        automation.rules.push(result);
      } else {
        const index = automation.rules.findIndex((rule: any) => rule.id === parts[4]);
        if (index < 0) throw new Error('自动化规则不存在');
        if (method === 'DELETE') automation.rules.splice(index, 1);
        else if (method === 'PUT') {
          if (body.revision !== automation.rules[index].revision) throw new Error('自动化规则已更新，请刷新后重试');
          result = { ...automation.rules[index], ...body, revision: automation.rules[index].revision + 1, updatedAt: now() };
          automation.rules[index] = result;
        } else throw new Error('不支持的自动化操作');
      }
      product.automation = automation;
      write(KEYS.productLines, products);
      return result ?? null;
    }
    const type = product.workItemTypes?.find((item: any) => item.workflow?.id === parts[4] || item.workflows?.some((workflow: any) => workflow.id === parts[4])) as any;
    const workflow = type?.workflows?.find((item: any) => item.id === parts[4]) ?? type?.workflow;
    if (!workflow || parts[5] !== 'publish' || method !== 'POST') throw new Error('状态流程不存在');
    if (body.revision !== workflow.revision) throw new Error('状态流程已更新，请刷新后重试');
    workflow.status = 'PUBLISHED';
    workflow.revision += 1;
    type.workflow = workflow;
    write(KEYS.productLines, products);
    return workflow;
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'activities' && method === 'GET') return [];

  if (clean.startsWith('/api/work-items/') && parts.length === 3 && method === 'GET') {
    const found = getWorkItems().filter((item) => !item.deleted && !item.deleteFlag).map(unifiedWorkItem).find((item) => item.id === parts[2]);
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
      const updatedBug = { ...bug, ...body, ownerName: String(body.assigneeName ?? bug.ownerName ?? ''), revision: revision + 1 };
      MOCK_BUGS[bugIndex] = updatedBug;
      recordTaskChanges(bug, updatedBug);
      return unifiedWorkItem({ ...updatedBug, category: 'bug', assigneeName: updatedBug.ownerName });
    }
    const current = items[index];
    const revision = Number(current.revision || 0);
    if (body.revision != null && Number(body.revision) !== revision) throw new Error('工作项已被其他人更新，请刷新后重试');
    const updated = { ...current, ...body, ownerName: body.assigneeName ?? current.ownerName, assigneeName: body.assigneeName ?? current.assigneeName ?? current.ownerName, revision: revision + 1 };
    items[index] = updated;
    write(KEYS.workItems, items);
    syncAttachedWorkItem(updated);
    recordTaskChanges(current, updated);
    return unifiedWorkItem(updated);
  }
  if (clean === '/api/work-items' && method === 'POST') {
    if (!String(body.title || '').trim()) throw new Error('任务标题不能为空');
    const product = getProductLines().find((line) => line.id === body.productLineId);
    const type = (product?.workItemTypes ?? templateTypes()).find((item: any) => item.id === body.taskTypeId);
    if (!product || !type || !type.enabled || categoryCode(type.category) !== body.category) throw new Error('产品或工作项类型不可用，请刷新后重试');
    const items = getWorkItems(); const existing = items.find((item) => item.requestId && item.requestId === body.requestId);
    if (existing) return unifiedWorkItem(existing);
    const owner = getEmployeeOptions().find((employee) => employee.id === body.assigneeId);
    const task = { ...body, id: id(body.category), code: `${String(body.category).toUpperCase()}-${Date.now()}`, title: String(body.title).trim(), status: '待处理', statusKey: 'pending', revision: 0, productLineName: product.name, ownerName: owner?.name || '', assigneeName: owner?.name || '', creatorName: MOCK_USERS[0]?.name || '当前用户', createdAt: now(), dueDate: body.plannedEndDate || '', requirementType: type.name, workItemTypeId: type.id, needsCollaboration: body.needsCollaboration ?? (body.category === 'requirement' ? ['dev', 'test'] : undefined) };
    write(KEYS.workItems, [task, ...items]);
    attachWorkItemToRequirement(task, type.name);
    recordTaskActivity(task.id, product.id, 'WORK_ITEM_CREATED', { title: task.title });
    return unifiedWorkItem(task);
  }
  if (parts[1] === 'requirements' && parts[2] && parts[3] === 'work-items' && parts[4] === 'batch' && method === 'POST') {
    const items = getWorkItems();
    const requirementIndex = items.findIndex((item) => item.id === parts[2]);
    if (requirementIndex < 0) throw new Error('事项不存在');
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    if (!tasks.length) throw new Error('至少创建一个任务');
    const requirement = items[requirementIndex];
    const created = tasks.map((input: Record<string, any>) => {
      if (!String(input.taskType || '').trim()) throw new Error('任务类型不能为空');
      if (!String(input.assigneeName || '').trim()) throw new Error('任务负责人不能为空');
      return { id: id('assist'), requirementId: requirement.id, taskType: input.taskType, title: String(input.title || requirement.title).trim(), assigneeName: String(input.assigneeName).trim(), note: input.note || '', status: '待处理', assistanceTaskStatus: 'PENDING', createdAt: now(), blocksClosure: input.blocksClosure ?? true };
    });
    items[requirementIndex] = { ...requirement, status: requirement.status === '待处理' ? '处理中' : requirement.status, workItems: [...(Array.isArray(requirement.workItems) ? requirement.workItems : []), ...created] };
    write(KEYS.workItems, [ ...items.slice(0, requirementIndex), items[requirementIndex], ...items.slice(requirementIndex + 1) ]);
    return { items: created, count: created.length };
  }
  if (parts[1] === 'requirements' && parts[2] && parts[3] === 'work-items' && parts[4] && ['status', 'progress'].includes(parts[5]) && ['PATCH', 'PUT'].includes(method)) {
    const items = getWorkItems();
    const requirementIndex = items.findIndex((item) => Array.isArray(item.workItems) && item.workItems.some((child: RequirementWorkItem) => child.id === parts[4]));
    if (requirementIndex < 0) throw new Error('关联任务不存在');
    const requirement = items[requirementIndex];
    const children = requirement.workItems.map((child: RequirementWorkItem) => child.id === parts[4]
      ? { ...child, ...(parts[5] === 'status' ? { status: String(body.status || child.status), assistanceTaskStatus: body.status === '已完成' ? 'COMPLETED' : child.assistanceTaskStatus } : { progress: Number(body.progress || 0) }), revision: Number(child.revision || 0) + 1 }
      : child);
    items[requirementIndex] = { ...requirement, workItems: children };
    write(KEYS.workItems, items);
    return children.find((child: RequirementWorkItem) => child.id === parts[4]);
  }
  if (clean === '/api/work-items' && method === 'GET') {
    const query = queryOf(path); const productLineId = query.get('productLineId'); const category = query.get('category'); const keyword = (query.get('keyword') || '').toLowerCase();
    let items = getWorkItems().filter((item) => !item.deleted && !item.deleteFlag && (!productLineId || item.productLineId === productLineId) && (!category || category === item.category) && (!keyword || String(item.title || '').toLowerCase().includes(keyword) || String(item.code || '').toLowerCase().includes(keyword) || (category === 'bug' && String(item.id).toLowerCase().includes(keyword))));
    if (category === 'bug') items = items.filter((item) => !item.deleted && !item.deleteFlag);
    items = items.map((item) => unifiedWorkItem(item)) as any;
    const page = Math.max(1, Number(query.get('page') || 1)); const pageSize = Math.max(1, Number(query.get('pageSize') || 100));
    return { page: { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length } };
  }
  if (parts[1] === 'work-items' && parts[2] && parts[3] === 'transitions' && method === 'GET') return { revision: 0, actions: [], statuses: [] };
  if (parts[1] === 'work-items' && parts[2] && parts[3] === 'relations' && method === 'GET') {
    const item = getWorkItems().find((candidate) => candidate.id === parts[2]);
    const ids = [...(item?.relatedTaskIds || []), ...(item?.sourceWorkOrderIds || [])];
    return { relations: ids.map((targetId) => ({ id: `${parts[2]}-${targetId}`, sourceId: parts[2], targetId, type: 'RELATES_TO', scope: 'FINISH', revision: 0 })) };
  }
  if (parts[1] === 'work-items' && parts[2] && parts[3] === 'relations' && method === 'POST') {
    const items = getWorkItems(); const index = items.findIndex((candidate) => candidate.id === parts[2]);
    if (index >= 0) { const current = items[index]; const relatedTaskIds = Array.from(new Set([...(current.relatedTaskIds || []), String(body.targetId || '')].filter(Boolean))); items[index] = { ...current, relatedTaskIds }; write(KEYS.workItems, items); return { id: `${parts[2]}-${body.targetId}`, sourceId: parts[2], targetId: body.targetId, type: 'RELATES_TO', scope: 'FINISH', revision: 0 }; }
    return { id: id('relation'), sourceId: parts[2], targetId: body.targetId, type: 'RELATES_TO', scope: 'FINISH', revision: 0 };
  }
  if (parts[1] === 'requirements' && parts[2] && parts[3] === 'summary' && method === 'GET') { const requirement = [...getWorkItems()].find((item) => item.id === parts[2]); return { requirement: requirement || undefined, linkedItems: [] }; }
  if (clean.endsWith('/test-case-directories') && method === 'GET') {
    const lineId = parts[2] || '';
    const allCases = getCases();
    const children = new Map<string, string[]>();
    MOCK_TEST_CASE_DIRECTORIES.forEach((item) => { if (item.parentId) children.set(item.parentId, [...(children.get(item.parentId) || []), item.id]); });
    const descendants = (directoryId: string): string[] => [directoryId, ...(children.get(directoryId) || []).flatMap(descendants)];
    return MOCK_TEST_CASE_DIRECTORIES.filter((item) => !lineId || lineId === 'all' || item.productLineId === lineId).map((item) => ({ ...item, caseCount: allCases.filter((testCase) => testCase.directoryId && descendants(item.id).includes(testCase.directoryId)).length }));
  }
  if (clean.endsWith('/test-cases') && method === 'GET') {
    const query = queryOf(path); const lineId = parts[2] || query.get('productLineId') || ''; let items = getCases().filter((item) => !lineId || lineId === 'all' || item.productLineId === lineId);
    const directoryId = query.get('directoryId');
    if (directoryId) {
      const children = new Map<string, string[]>();
      MOCK_TEST_CASE_DIRECTORIES.forEach((item) => { if (item.parentId) children.set(item.parentId, [...(children.get(item.parentId) || []), item.id]); });
      const descendants = (id: string): string[] => [id, ...(children.get(id) || []).flatMap(descendants)];
      const allowed = query.get('includeDescendants') === 'true' ? descendants(directoryId) : [directoryId];
      items = items.filter((item) => allowed.includes(item.directoryId));
    }
    const keyword = (query.get('keyword') || '').toLowerCase();
    if (keyword) items = items.filter((item) => item.title.toLowerCase().includes(keyword) || item.code.toLowerCase().includes(keyword));
    return { items, page: Number(query.get('page') || 1), pageSize: Number(query.get('pageSize') || items.length || 20), total: items.length };
  }
  if (parts.length >= 4 && parts[1] === 'work-items' && parts[3] === 'test-plans') {
    const workItemId = parts[2]; const plans = getPlans();
    if (method === 'GET') return plans.filter((plan) => plan.workItemId === workItemId);
    if (method === 'POST') { const input = body as SaveTestPlanInput; const plan: TestPlan = { id: id('plan'), workItemId: input.workItemId || workItemId, executable: true, name: input.name, environment: input.environment, startDate: input.startDate, endDate: input.endDate, ownerId: input.ownerId, ownerName: input.ownerName, revision: 0, cases: planCases(input.testCaseIds || []) }; write(KEYS.plans, [...plans, plan]); return plan; }
    if (method === 'PUT' && parts[4]) {
      const index = plans.findIndex((plan) => plan.id === parts[4] && plan.workItemId === workItemId);
      if (index < 0) throw new Error('测试计划不存在');
      const current = plans[index];
      if (body.revision !== current.revision) throw new Error('测试计划已被更新，请刷新后重试');
      const task = getWorkItems().find((item) => item.id === workItemId && !item.deleted && !item.deleteFlag);
      if (!task) throw new Error('测试任务不存在');
      const caseIds = body.testCaseIds;
      if (!Array.isArray(caseIds) || new Set(caseIds).size !== caseIds.length || caseIds.some((caseId) => !getCases().some((item) => item.id === caseId && item.productLineId === task.productLineId && item.enabled))) throw new Error('请选择当前产品的有效用例');
      const results = body.caseResults || [];
      if (!Array.isArray(results) || new Set(results.map((result) => result.testCaseId)).size !== results.length) throw new Error('用例结果无效');
      results.forEach((result) => {
        if (!caseIds.includes(result.testCaseId) || !['NOT_EXECUTED', 'PASSED', 'FAILED', 'DEFERRED'].includes(result.executionStatus) || !Array.isArray(result.defectIds) || new Set(result.defectIds).size !== result.defectIds.length) throw new Error('用例结果无效');
        if (result.defectIds.some((defectId) => !getWorkItems().some((item) => item.id === defectId && item.category === 'bug' && item.productLineId === task.productLineId && !item.deleted && !item.deleteFlag))) throw new Error('请选择当前产品的有效缺陷');
      });
      const cases = planCases(caseIds).map((item) => ({ ...item, ...current.cases.find((old) => old.testCaseId === item.testCaseId), ...results.find((result) => result.testCaseId === item.testCaseId) }));
      plans[index] = { ...current, name: body.name, environment: body.environment, startDate: body.startDate, endDate: body.endDate, ownerId: body.ownerId, ownerName: body.ownerName, cases, revision: current.revision + 1 };
      write(KEYS.plans, plans); return plans[index];
    }
  }
  if (method === 'GET') return [];
  if (method === 'POST') return { id: id('mock'), code: `MOCK-${Date.now()}` };
  return null;
}

const templateRoutes: Record<string, string> = {
  '/api/product-lines': 'productLines',
  '/api/research-template/roles': 'researchRoles',
  '/api/research-template/statuses': 'researchStatuses',
  '/api/work-item-categories': 'researchCategories',
  '/api/work-item-field-configurations': 'researchFields',
  '/api/work-item-template': 'researchTypes',
  '/api/notification-template': 'researchNotifications',
  '/api/automation-template/rules': 'researchAutomation',
  '/api/automation-template/setting': 'researchAutomationSetting',
};
const templateFileEndpoint = '/__dev/research-template';
let templateFile: Record<string, unknown> = {};
let templateReady: Promise<void> | undefined;
let templateQueue: Promise<unknown> = Promise.resolve();

async function templateFileRequest(init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(templateFileEndpoint, init);
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || '项目 Mock 保存失败');
  return result;
}

export async function mockApiRequest(path: string, init: RequestInit = {}): Promise<any> {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return handleMockApiRequest(path, init);
  if (!templateReady) {
    templateReady = templateFileRequest().then((data) => {
      templateFile = data;
      for (const key of Object.values(templateRoutes)) {
        if (Object.prototype.hasOwnProperty.call(data, key)) write(`shichuang.frontend.mock.${key}`, data[key]);
      }
    }).catch((error) => { templateReady = undefined; throw error; });
  }
  await templateReady;
  const clean = path.split('?')[0];
  const route = Object.keys(templateRoutes).find((route) => clean === route || clean.startsWith(`${route}/`));
  if (!route) return handleMockApiRequest(path, init);
  const operation = templateQueue.then(async () => {
    if ((init.method || 'GET').toUpperCase() === 'GET') return handleMockApiRequest(path, init);
    const key = templateRoutes[route];
    const storageKey = `shichuang.frontend.mock.${key}`;
    const previousLocal = localStorage.getItem(storageKey);
    try {
      const result = await handleMockApiRequest(path, init);
      const nextLocal = localStorage.getItem(storageKey);
      if (nextLocal !== previousLocal) {
        const value = JSON.parse(nextLocal!);
        await templateFileRequest({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value, previous: templateFile[key] ?? null }) });
        templateFile[key] = value;
      }
      return result;
    } catch (error) {
      if (previousLocal === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, previousLocal);
      throw error;
    }
  });
  templateQueue = operation.catch(() => undefined);
  return operation;
}
