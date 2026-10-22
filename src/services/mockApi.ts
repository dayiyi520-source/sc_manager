import { reviewTemplateAggregations } from './reviewTemplateAggregation';
import { myTaskProgress, canUpdateMyTaskProgress, validateMyTaskProgress } from './myTaskProgress';
import { mutateCollaboration } from './mockCollaborationMutations';
import { newestCreatedFirst } from '../utils/creationOrder';
import { SESSION_KEY } from './sessionStorage';
import { validateReviewProgress, syncSubmittedReviewProgress } from './okrReviewProgressSync';
import { bindReviewTemplate } from './reviewTemplateConfiguration';
import { normalizeDefectStatusLabels } from './defectStatusLabels';
import { syncOkrProductNames } from './okrProductNames';
import { customerDirectoryRequest } from './customerDirectoryData';
import { mockStateEndpoint } from './mockStateEndpoint';
import { createMockReadWindow } from './mockReadWindow';
import { createOkrFilePersistence } from './okrFilePersistence';
import { createOkrFileCache } from './okrFileCache';
import savedOkrState from '../data/mockOkrState.json';
import { migrateWorkItems } from './workItemTemplateSync';
import { submitDepartmentReview } from './departmentReviewAggregation';
import { normalizedPolicy, validatePolicy, isOkrAdmin, hasOkrPermission, canEditOkr, confirmationReviewer, canUpdateOkrSettings, canViewPending, reconcileConfirmationRequests } from './okrSettingsPolicy';
import { withBusinessWorkItemCategories } from './businessWorkItemCategories';
import { productTaskPreviewSamples, PRODUCT_PREVIEW_SEED_VERSION } from '../data/mockProductTaskPreview';
import type { OkrRecord } from './okrRepository';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import { applyCollaborationWorkflow } from './mockCollaborationWorkflow';
import type { OkrSettings } from './okrRepository';
import { reviewSubmissionAccess } from './okrReviewRules';
import { canReadReviewRecord } from './supervisorReview';
import { archivedBusinessTaskRecords, archivedBusinessTasks, handleMockBusinessTasks, mutateArchivedBusinessTask } from './mockBusinessTasks';
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
import type { SaveVersionReviewInput, VersionReview, VersionReviewListItem } from '../types/versionReview';
import { normalizeVersionStatus } from '../components/product/productLinePresentation';
import type { AttachmentMetadata, CurrentUser, EmployeeOption } from '../types';
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
  planAssociations: 'shichuang.frontend.mock.testPlanAssociations',
  cases: 'shichuang.frontend.mock.testCases',
  okrRecords: 'shichuang.frontend.mock.okrRecords',
  okrPeople: 'shichuang.frontend.mock.okrPeople',
  okrSettings: 'shichuang.frontend.mock.okrSettings',
  productLines: 'shichuang.frontend.mock.productLines',
  researchRoles: 'shichuang.frontend.mock.researchRoles',
  researchStatuses: 'shichuang.frontend.mock.researchStatuses',
  researchCategories: 'shichuang.frontend.mock.researchCategories',
  researchTypes: 'shichuang.frontend.mock.researchTypes',
  researchNotifications: 'shichuang.frontend.mock.researchNotifications',
  workItems: 'shichuang.frontend.mock.workItems',
  opsTasks: 'shichuang.frontend.mock.opsTasks',
  taskActivities: 'shichuang.frontend.mock.taskActivities',
  attachments: 'shichuang.frontend.mock.attachments',
  versionReviews: 'shichuang.frontend.mock.versionReviews',
};

// 每次导入新数据库快照时，淘汰浏览器里由旧演示数据留下的本地状态。
const runtimeMockVersion = import.meta.env.VITE_MOCK_DATA_VERSION || MOCK_SNAPSHOT_VERSION;
if (typeof window !== 'undefined' && localStorage.getItem(KEYS.snapshot) !== runtimeMockVersion) {
  Object.values(KEYS).filter((key) => key !== KEYS.snapshot && ![KEYS.okrRecords, KEYS.okrSettings, KEYS.okrPeople].includes(key)).forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(KEYS.workItems + '.previewSeedVersion');
  localStorage.setItem(KEYS.snapshot, runtimeMockVersion);
}

let okrFileCache: ReturnType<typeof createOkrFileCache> | undefined;
const fileCache = () => okrFileCache ??= createOkrFileCache(localStorage);
const stateStorage = (key: string) => import.meta.env.MODE !== 'test' && [KEYS.okrRecords, KEYS.okrPeople, KEYS.okrSettings].includes(key) ? fileCache() : localStorage;

const now = () => new Date().toISOString();
const text = (value: unknown) => value == null ? '' : String(value);
const read = <T>(key: string, fallback: T): T => {
  const templateKey = key.replace('shichuang.frontend.mock.', '');
  const savedState = templateKey.startsWith('okr') ? savedOkrState : savedResearchTemplate;
  const seed = Object.prototype.hasOwnProperty.call(savedState, templateKey) ? (savedState as Record<string, unknown>)[templateKey] as T : fallback;
  let value: T;
  try { const stored = stateStorage(key).getItem(key); value = stored ? JSON.parse(stored) as T : seed; } catch { value = seed; }
  if ([KEYS.researchTypes, KEYS.researchStatuses, KEYS.productLines, KEYS.workItems].includes(key)) {
    const normalized = normalizeDefectStatusLabels(value);
    if (normalized !== value) stateStorage(key).setItem(key, JSON.stringify(normalized));
    value = normalized;
  }
  if (key === KEYS.okrRecords && Array.isArray(value)) {
    const normalized = syncOkrProductNames(value as OkrRecord[], getProductLines());
    if (normalized.some((record, index) => record !== value[index])) stateStorage(key).setItem(key, JSON.stringify(normalized));
    return normalized as T;
  }
  return value;
};
const write = (key: string, value: unknown) => {
  const serialized = JSON.stringify(value);
  if (stateStorage(key).getItem(key) !== serialized) stateStorage(key).setItem(key, serialized);
};
const bodyOf = (init?: RequestInit) => { try { return init?.body ? JSON.parse(String(init.body)) as Record<string, any> : {}; } catch { return {}; } };
const queryOf = (path: string) => new URL(path, window.location.origin).searchParams;
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const getEmployeeOptions = (): EmployeeOption[] => getMembers().filter((member) => member.status === 'enabled').map((member) => {
  const seed = MOCK_USERS.find((user) => user.id === member.id);
  return { id: member.id, organizationId: member.organizationId || 'shichuang', name: member.name, avatar: seed?.avatar, department: member.department || seed?.department, role: seed?.role || 'product_manager', jobTitle: member.jobTitle, roleTitle: member.jobTitle || seed?.roleTitle };
});
const taskOperator = () => {
  let viewer: CurrentUser | undefined;
  try { viewer = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')?.user; } catch { /* 兼容失效的演示会话。 */ }
  const user = viewer || MOCK_USERS[0];
  const member = getEmployeeOptions().find(member => member.id === user?.id);
  return { id: user?.id || '', name: member?.name || user?.name || '当前用户' };
};
const initialWorkItems = [
  ...MOCK_REQUIREMENT_TASKS.map((task) => ({ ...task, category: 'requirement' })),
  ...MOCK_DESIGN_TASKS.map((task) => ({ ...task, category: 'design' })),
  ...MOCK_DEV_TASKS.map((task) => ({ ...task, category: 'dev' })),
  ...MOCK_TEST_TASKS.map((task) => ({ ...task, category: 'test' })),
  ...MOCK_BUGS.map((bug) => ({ ...bug, category: 'bug', assigneeName: bug.ownerName })),
];
const snapshotWorkItems = new Map(MOCK_DATABASE.t_product_work_item.map(row => [row.id_, row]));
const readWorkItems = () => {
  const hadStoredItems = localStorage.getItem(KEYS.workItems) !== null;
  const tasks = read<any[]>(KEYS.workItems, initialWorkItems.map(item => ({ ...item })));
  const seedKey = KEYS.workItems + '.previewSeedVersion';
  if (localStorage.getItem(seedKey) !== PRODUCT_PREVIEW_SEED_VERSION) {
    // Preview seed data is only added to a fresh browser. Never merge it into an explicit saved dataset.
    const merged = hadStoredItems ? tasks : [...tasks, ...productTaskPreviewSamples()];
    write(KEYS.workItems, merged); localStorage.setItem(seedKey, PRODUCT_PREVIEW_SEED_VERSION);
    return merged;
  }
  return tasks;
};
const getWorkItems = () => {
 const items = readWorkItems().map((item) => {
  if (!item.plannedStartDate && Number(item.estimatedHours || 0) > 0) { const offset = Math.abs(String(item.id).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 12; item = { ...item, plannedStartDate: `2026-10-${String(1 + offset).padStart(2, '0')}`, plannedEndDate: `2026-10-${String(3 + offset).padStart(2, '0')}` }; }
  const snapshot = snapshotWorkItems.get(item.id);
  item = { ...item, workItemTypeId: item.workItemTypeId || snapshot?.task_type_id_, workflowId: item.workflowId || snapshot?.workflow_id_, statusKey: item.statusKey || snapshot?.status_key_ };
  const migratedType = (collaborationTypes as Record<string, string>)[item.id];
  if (item.category === 'requirement' && (item.workOrderType || migratedType) && ['已驳回', '已退回'].includes(item.status)) {
    const returnEvent = [...(item.events || [])].reverse().find((event: any) => ['退回', '事项退回'].includes(event.eventType) && event.metadata?.ownerChanged === true);
    const returnedOwnerName = String(returnEvent?.metadata?.fromAssigneeName || '').trim();
    const matchingOwners = returnedOwnerName ? getMembers().filter(member => member.name.trim() === returnedOwnerName) : [];
    item = { ...item, status: '已退回', ...(returnedOwnerName ? { ownerName: returnedOwnerName, assigneeName: returnedOwnerName, assigneeId: returnEvent?.metadata?.fromAssigneeId || (matchingOwners.length === 1 ? matchingOwners[0].id : undefined) } : {}) };
  }
  return item.category === 'requirement' && migratedType && !['客户诉求', '线上问题', '售前支持', '交付支持', '其他问题'].includes(item.workOrderType)
    ? { ...item, workOrderType: migratedType } : item;
});
 const migrated = migrateWorkItems(items, getProductLines(), getMembers(), templateTypes(true));
 if (JSON.stringify(migrated) !== JSON.stringify(items)) write(KEYS.workItems, migrated);
 return migrated.sort(newestCreatedFirst);
};
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
const taskLabels: Record<string, string> = { requirement: '产品需求', design: '设计任务', dev: '研发任务', test: '测试任务', bug: '缺陷管理', ops: '运维任务', presales: '售前任务', delivery: '交付任务' };
const attachWorkItemToRequirement = (task: Record<string, any>, taskType?: string, previousTask?: Record<string, any>) => {
  const parentIds = new Set([task.requirementId, ...(task.sourceWorkOrderIds || [])].filter(Boolean));
  const previousParentIds = new Set([previousTask?.requirementId, ...(previousTask?.sourceWorkOrderIds || [])].filter(Boolean));
  if (!parentIds.size && !previousParentIds.size) return;
  const items = getWorkItems();
  const updated = items.map(current => {
    if (!parentIds.has(current.id) && !previousParentIds.has(current.id)) return current;
    if (!parentIds.has(current.id)) return { ...current, workItems: (current.workItems || []).filter((item: RequirementWorkItem) => item.id !== task.id) };
    const summaries = Array.isArray(current.workItems) ? current.workItems : [];
    const previous = summaries.find((item: RequirementWorkItem) => item.id === task.id);
    const summary = { ...previous, ...workItemSummary({ ...task, requirementId: current.id }, taskLabels[task.category] || taskType), category: task.category, productLineId: task.productLineId };
    return { ...current, workItems: [...summaries.filter((item: RequirementWorkItem) => item.id !== task.id), summary] };
  });
  write(KEYS.workItems, updated);
};
const syncAttachedWorkItem = attachWorkItemToRequirement;
const visibleMatter = (item: any) => ({ ...item, events: (item.events || []).filter((event: any) => !event.metadata?.privateAuthorId || event.metadata.privateAuthorId === taskOperator().id) });
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
const getTestPlanAssociations = () => read<Record<string, string[]>>(KEYS.planAssociations, {});
const findActiveTestTask = (workItemId: string) => getWorkItems().find((item) => item.id === workItemId && item.category === 'test' && !item.deleted && !item.deleteFlag);
const getMembers = () => read(KEYS.members, MOCK_TEAM_MEMBERS.map((item) => ({ ...item })));
const getProductLines = (): ProductLine[] => {
 const products = read<ProductLine[]>(KEYS.productLines, MOCK_PRODUCT_LINES.map((item) => ({ ...item, versions: [...(item.versions || [])] }))).map((product) => {
  const snapshotVersions = MOCK_PRODUCT_LINES.find((item) => item.id === product.id)?.versions || [];
  const originalName = MOCK_PRODUCT_LINES.find(item => item.id === product.id)?.name;
  const nameAliases = [...new Set([...(product.nameAliases || []), originalName].filter((name): name is string => Boolean(name && name !== product.name)))];
  return { ...product, ...(nameAliases.length ? { nameAliases } : {}), versions: product.versions?.map((version) => ({
    ...version,
    releaseDate: version.releaseDate || snapshotVersions.find((item) => item.id === version.id)?.releaseDate || '',
  })) };
});
 return products;
};

const versionReviewSeeds = (products: ProductLine[], members: EmployeeOption[]): VersionReview[] => products.flatMap((product, productIndex) => (product.versions || []).slice(0, 1).map((version) => {
  const first = members[productIndex % Math.max(members.length, 1)];
  const second = members[(productIndex + 1) % Math.max(members.length, 1)];
  const participantIds = [first?.id, second?.id].filter(Boolean) as string[];
  return { id: `mock-version-review-${productIndex + 1}`, productLineId: product.id, productLineName: product.name, versionId: version.id, versionName: version.name, meetingTopic: `${version.name}版本发布评审`, reviewType: ['产品内部审核', '技术内部审核', '产品跨部门审核'][productIndex % 3], initiatorName: first?.name || '林志豪', participantNames: participantIds.map(id => members.find(member => member.id === id)?.name || '').filter(Boolean).join('、'), meetingTime: `2026-10-${String(8 + productIndex).padStart(2, '0')} 14:00:00`, reviewDate: `2026-10-${String(8 + productIndex).padStart(2, '0')}`, conclusion: productIndex % 3 === 2 ? '有条件通过' : '通过', summary: '版本功能、测试结果和上线风险已完成评估。', agendaConclusion: '核心功能符合发布要求，按计划推进版本发布。', remainingIssues: productIndex % 2 ? '补充上线后的监控指标。' : '', relatedTaskIds: [], attachments: [], status: 'SUBMITTED', participantCount: participantIds.length, revision: 0, createdAt: `2026-10-${String(7 + productIndex).padStart(2, '0')}T06:00:00.000Z`, updatedAt: `2026-10-${String(8 + productIndex).padStart(2, '0')}T08:00:00.000Z`, participants: participantIds.map(id => ({ id, name: members.find(member => member.id === id)?.name || id })) };
}));
const getVersionReviews = (): VersionReview[] => read<VersionReview[]>(KEYS.versionReviews, versionReviewSeeds(getProductLines(), getEmployeeOptions()));
const versionReviewListItem = (review: VersionReview): VersionReviewListItem => ({ ...review });
const mergeVersionReview = (current: VersionReview, input: SaveVersionReviewInput, products: ProductLine[], members: EmployeeOption[], status: VersionReview['status']): VersionReview => {
  const product = products.find(item => item.id === input.productLineId) || products.find(item => item.id === current.productLineId);
  const version = product?.versions?.find(item => item.id === input.versionId) || product?.versions?.find(item => item.id === current.versionId);
  const participants = (input.participantIds || []).map(id => ({ id, name: members.find(member => member.id === id)?.name || id }));
  return { ...current, ...input, productLineId: product?.id, productLineName: product?.name, versionId: version?.id, versionName: version?.name, participants, participantNames: participants.map(item => item.name).join('、'), participantCount: participants.length, status, revision: current.revision + 1, updatedAt: now() };
};

const getOkrPeople = () => {
  const cached = read(KEYS.okrPeople, MOCK_OKR_PEOPLE);
  const settings = normalizedPolicy(read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings), MOCK_OKR_PEOPLE);
  return MOCK_OKR_PEOPLE.map((person) => {
    const saved = cached.find((item) => item.id === person.id);
    const member = getMembers().find(item => item.id === person.id);
    return { ...(saved && saved.version > person.version ? { ...person, ...saved } : person), ...(member ? { name: member.name, department: member.department, jobTitle: member.jobTitle } : {}), ...(settings.supervisorIds ? { goalRole: settings.supervisorIds.includes(person.id) ? 'supervisor' as const : 'employee' as const } : {}) };
  });
};
const planCases = (caseIds: string[]): TestPlanCase[] => getCases().filter((item) => caseIds.includes(item.id)).map((item, index) => ({
  linkId: id('link'), testCaseId: item.id, sort: index + 1, code: item.code, title: item.title, priority: item.priority,
  ownerName: item.ownerName, enabled: item.enabled, latestResult: item.latestResult, executionStatus: 'NOT_EXECUTED', defectIds: [],
}));

const databaseRows = (table: keyof typeof MOCK_DATABASE) => (MOCK_DATABASE[table] as unknown as Array<Record<string, any>>).filter((row) => Number(row.delete_flag_ || 0) === 0);
const taskActivities = () => read<any[]>(KEYS.taskActivities, databaseRows('t_product_work_item_activity').map((row) => ({ id: row.id_, subjectId: row.subject_id_, productLineId: row.product_line_id_, eventType: row.event_type_, content: row.content_, operatorName: MOCK_USERS.find((user) => user.id === row.create_by_)?.name || row.create_by_, createdAt: row.create_time_ })));
const recordTaskActivity = (subjectId: string, productLineId: string, eventType: string, content: Record<string, unknown>) => {
  write(KEYS.taskActivities, [...taskActivities(), { id: id('activity'), subjectId, productLineId, eventType, content, operatorName: taskOperator().name, createdAt: now() }]);
};
const validateCompletion = (body: Record<string, any>) => {
  if (body.actualHours == null || typeof body.actualHours !== 'number' || !Number.isFinite(body.actualHours) || body.actualHours < 0 || body.actualHours > 99999999.99 || Math.abs(body.actualHours * 100 - Math.round(body.actualHours * 100)) > 1e-6) throw new Error('请填写有效的完成工时');
  if (body.completionReview !== undefined) {
    const review = body.completionReview;
    if (!review || typeof review.content !== 'string' || review.content.length > 10000 || !Array.isArray(review.media) || review.media.some((media: any) => !media.id || !media.name || !/^data:[^;,]+;base64,[a-zA-Z0-9+/=\s]*$/.test(media.dataUrl || ''))) throw new Error('复盘总结或附件数据无效');
  }
};
const recordTaskChanges = (before: Record<string, any>, after: Record<string, any>) => {
  const codes = ['title', 'description', 'descriptionHtml', 'expectedGoal', 'priority', 'assigneeName', 'ownerName', 'versionId', 'customerName', 'plannedStartDate', 'plannedEndDate', 'dueDate', 'estimatedHours', 'actualHours', 'status'];
  const changes = codes.filter((field) => JSON.stringify(before[field] ?? '') !== JSON.stringify(after[field] ?? '')).map((field) => ({ field, from: before[field] ?? '', to: after[field] ?? '' }));
  if (after.completionReview && JSON.stringify(before.completionReview) !== JSON.stringify(after.completionReview)) recordTaskActivity(String(after.id), String(after.productLineId || ''), 'WORK_ITEM_REVIEWED', { review: { title: `${after.title}复盘总结`, ...after.completionReview } });
  if (changes.length) recordTaskActivity(String(after.id), String(after.productLineId || ''), 'WORK_ITEM_UPDATED', { changes });
};
const categoryCode = (value: string) => ({ 产品: 'requirement', 需求: 'requirement', 设计: 'design', 研发: 'dev', 测试: 'test', 缺陷: 'bug', 用例: 'case' } as Record<string, string>)[value] || value;
const isTestCaseCategory = (value: any) => String(value?.code || value?.category || value?.name || '').toLowerCase() === 'case' || value?.capabilityType === 'TEST_CASE';
const templateCategories = () => withBusinessWorkItemCategories(read(KEYS.researchCategories, databaseRows('t_work_item_category_dictionary').map((row) => ({ id: row.id_, code: row.code_, name: row.name_, displayName: row.display_name_ || row.name_, iconKey: row.icon_key_ || row.code_, capabilityType: row.capability_type_ || 'STANDARD', sort: Number(row.sort_ || 0), enabled: Boolean(row.enabled_), builtIn: Boolean(row.built_in_), revision: Number(row.version_ || 0) }))).filter((item: any) => !isTestCaseCategory(item)));
const templateRoles = () => read(KEYS.researchRoles, databaseRows('t_product_role_template').map((row) => ({ id: row.id_, name: row.name_, responsibility: row.responsibility_ || '', sort: Number(row.sort_ || 0), revision: Number(row.version_ || 0), updatedAt: row.update_time_ })));
const templateStatuses = () => read(KEYS.researchStatuses, databaseRows('t_research_status_template').map((row) => ({ id: row.id_, scope: row.scope_, name: row.name_, phase: row.phase_, color: row.color_ || 'neutral', initial: Boolean(row.initial_), enabled: Boolean(row.enabled_), sort: Number(row.sort_ || 0), revision: Number(row.version_ || 0) })));
const templateTypes = (includeArchived = false): any[] => {
  const workflows = databaseRows('t_work_item_template_workflow');
  return read(KEYS.researchTypes, databaseRows('t_work_item_template_type').map((row) => ({ id: row.id_, category: row.category_, name: row.name_, description: row.description_ || '', enabled: Boolean(row.enabled_), isDefault: Boolean(row.is_default_), revision: Number(row.version_ || 0), workflow: workflows.find((workflow) => workflow.template_type_id_ === row.id_) ? { id: workflows.find((workflow) => workflow.template_type_id_ === row.id_).id_, category: categoryCode(row.category_), taskTypeId: row.id_, name: workflows.find((workflow) => workflow.template_type_id_ === row.id_).name_, workflowVersion: 1, status: 'PUBLISHED', revision: Number(workflows.find((workflow) => workflow.template_type_id_ === row.id_).revision_ || 0), definition: workflows.find((workflow) => workflow.template_type_id_ === row.id_).definition_ } : undefined }))).filter((item: any) => !isTestCaseCategory(item) && (includeArchived || !item.archived));
};
const globalTaskTypes = (includeArchived = false): any[] => templateTypes(includeArchived)
  .filter((item: any) => ['requirement', 'design', 'dev', 'test', 'bug'].includes(categoryCode(item.category)))
  .map((item: any) => ({ ...item, workflows: [item.workflow, ...(item.workflows || [])].filter(Boolean) }));
const defaultProductWorkflow = (type: any) => ({ id: `mock-workflow-${type.id}`, category: categoryCode(type.category), taskTypeId: type.id, name: `${type.name}状态流程`, revision: 0, status: 'PUBLISHED', workflowVersion: 1, definition: { states: [{ key: 'todo', name: '待处理', group: 'NOT_STARTED', initial: true, successful: false, enabled: true, stage: '待处理', color: 'neutral' }, { key: 'processing', name: '处理中', group: 'IN_PROGRESS', initial: false, successful: false, enabled: true, stage: '处理中', color: 'blue' }, { key: 'completed', name: '已完成', group: 'COMPLETED', initial: false, successful: true, enabled: true, stage: '已完成', color: 'green' }], transitions: [{ key: 'todo-processing', from: 'todo', to: 'processing', name: '开始处理' }, { key: 'processing-completed', from: 'processing', to: 'completed', name: '完成任务', requiredFields: ['actualHours'] }] } } );
const productTypes = (product: ProductLine | undefined): any[] => {
  if (product?.workItemTypes) return product.workItemTypes.map((type: any) => ({ ...type, workflows: (type.workflows || (type.workflow ? [type.workflow] : [])).length ? (type.workflows || [type.workflow]) : [defaultProductWorkflow(type)] }));
  const types = databaseRows('t_product_line_work_item_type').filter(row => row.product_line_id_ === product?.id && !row.delete_flag_);
  if (!types.length) return templateTypes();
  const workflows = databaseRows('t_product_workflow');
  return types.map(row => ({ id: row.id_, name: row.name_, category: row.category_, enabled: Boolean(row.enabled_), isDefault: Boolean(row.is_default_), revision: Number(row.version_ || 0), workflows: workflows.filter(flow => flow.task_type_id_ === row.id_ && !flow.delete_flag_).map(flow => ({ id: flow.id_, category: categoryCode(row.category_), taskTypeId: row.id_, name: flow.name_, revision: Number(flow.version_ || 0), status: flow.status_, workflowVersion: flow.workflow_version_, definition: flow.definition_ })).length ? workflows.filter(flow => flow.task_type_id_ === row.id_ && !flow.delete_flag_).map(flow => ({ id: flow.id_, category: categoryCode(row.category_), taskTypeId: row.id_, name: flow.name_, revision: Number(flow.version_ || 0), status: flow.status_, workflowVersion: flow.workflow_version_, definition: flow.definition_ })) : [defaultProductWorkflow({ id: row.id_, name: row.name_, category: row.category_ })] }));
};
const templateNotifications = () => read(KEYS.researchNotifications, databaseRows('t_notification_template')[0]?.config_ || { categories: [] });
const statusForWorkItem = (item: any, typesByProduct: Map<string, any[]>) => {
  if (typeof item.status !== 'string') return item.status || { name: '未设置', group: 'UNCLASSIFIED', successful: false };
  const canonical: Record<string, string> = { '待处理': 'NOT_STARTED', '处理中': 'IN_PROGRESS', '已完成': 'COMPLETED', '已取消': 'CANCELLED' };
  let types = typesByProduct.get(item.productLineId);
  if (!types) {
    types = item.taskTypeId || item.workItemTypeId ? [...productTypes(getProductLines().find(line => line.id === item.productLineId)), ...globalTaskTypes(true)] : [];
    if (types.length) typesByProduct.set(item.productLineId, types);
  }
  const type = types.find(type => type.id === (item.taskTypeId || item.workItemTypeId) && [...(type.workflows || []), type.workflow].some(flow => flow?.id === item.workflowId))
    || types.find(type => type.id === (item.taskTypeId || item.workItemTypeId));
  const workflows = type?.workflows || (type?.workflow ? [type.workflow] : []);
  const workflow = workflows.find((flow: any) => flow.id === item.workflowId && flow.status === 'PUBLISHED');
  const states = (workflow ? [workflow] : workflows.filter((flow: any) => flow.status === 'PUBLISHED')).flatMap((flow: any) => flow.definition?.states || []);
  const state = states.find((state: any) => state.name === item.status) || states.find((state: any) => item.statusKey && state.key === item.statusKey);
  return { name: state?.name || item.status, group: state?.group || canonical[item.status] || 'UNCLASSIFIED', successful: state?.successful ?? item.status === '已完成' };
};
const unifiedWorkItem = (item: any, typesByProduct = new Map<string, any[]>()) => ({
  ...item,
  taskTypeId: item.taskTypeId || item.workItemTypeId,
  assigneeName: item.assigneeName ?? item.ownerName ?? '',
  status: statusForWorkItem(item, typesByProduct),
  revision: item.revision ?? 0,
});

const unfinishedTask = (status: unknown, assistanceStatus?: unknown) => {
  const statusName = String(status || '');
  const assistanceState = String(assistanceStatus || '');
  return !['已完成', '已关闭', '已取消', '已驳回'].includes(statusName)
    && assistanceState !== 'COMPLETED';
};

const myTasks = (viewerId: string, includeFinished = false) => {
  const viewerName = MOCK_USERS.find((user) => user.id === viewerId)?.name || '';
  const sourceItems = getWorkItems();
  const workItems = sourceItems
    .filter((item) => !item.deleted && !item.deleteFlag && (item.assigneeId === viewerId || (viewerName && !item.assigneeId && item.ownerName === viewerName)) && item.requirementType !== '协助事项' && (includeFinished || unfinishedTask(item.status)))
    .map((item) => ({
      id: `task-${item.id}`,
      type: item.category || 'requirement',
      title: item.title,
      status: item.status || '未设置',
      taskTypeId: item.taskTypeId || item.workItemTypeId,
      assigneeName: item.assigneeName ?? item.ownerName ?? '',
      assigneeId: item.assigneeId, revision: Number(item.revision || 0),
      time: item.createdAt || '',
      dueDate: item.dueDate || '',
      progress: myTaskProgress(item.progress, item.status),
      overdueRisk: false,
      taskGroup: 'mine' as const,
      targetPage: item.category === 'design' ? 'prod_design_tasks' : item.category === 'dev' ? 'prod_rd_tasks' : item.category === 'test' ? 'prod_test_tasks' : item.category === 'bug' ? 'prod_bugs' : 'prod_req_tasks',
      sourceId: item.id, productLineId: item.productLineId,
    }));
  const assistanceItems = databaseRows('t_product_work_item')
    .map((row) => {
      const current = sourceItems.find(item => item.id === text(row.id_));
      if (!current) return row;
      const ownerChanged = current.assigneeId && current.assigneeId !== text(row.assignee_id_);
      return { ...row, status_name_: current.status ?? row.status_name_, progress_: current.progress ?? row.progress_, revision_: current.revision ?? row.version_, delete_flag_: current.deleted || current.deleteFlag || row.delete_flag_, assistance_task_status_: current.assistanceTaskStatus ?? row.assistance_task_status_, ...(ownerChanged ? { assistance_owner_id_: current.assigneeId, assignee_name_: current.assigneeName || current.ownerName } : {}) };
    })
    .filter((row) => text(row.requirement_type_) === '协助事项')
    .filter((row) => text(row.assistance_owner_id_ || row.assignee_id_) === viewerId)
    .filter((row) => !Number(row.delete_flag_ || 0) && (includeFinished || unfinishedTask(row.status_name_, row.assistance_task_status_)))
    .map((row) => ({
      id: `assistance-${text(row.id_)}`,
      type: 'assistance',
      title: text(row.title_),
      status: text(row.status_name_) || text(row.assistance_status_) || '待处理',
      assigneeName: text(row.assignee_name_) || MOCK_USERS.find((user) => user.id === text(row.assistance_owner_id_ || row.assignee_id_))?.name || '',
      time: text(row.create_time_).slice(0, 10),
      dueDate: text(row.expected_complete_date_ || row.planned_end_date_).slice(0, 10),
      progress: myTaskProgress(row.progress_, text(row.status_name_)),
      revision: Number(row.revision_ ?? row.version_ ?? 0), assigneeId: text(row.assistance_owner_id_ || row.assignee_id_),
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
  if (clean.startsWith('/api/customer-directory/')) return customerDirectoryRequest(path, method);
  if (clean === '/api/archived-tasks' && method === 'GET') {
    const query = queryOf(path);
    if (query.get('records') === 'true') {
      const category = query.get('category') || '';
      if (['presales', 'delivery', 'ops'].includes(category)) return archivedBusinessTaskRecords(category as 'presales' | 'delivery' | 'ops');
      const products = getProductLines();
      const versions = products.flatMap(product => product.versions || []);
      return getWorkItems().filter(item => (item.deleted || item.deleteFlag) && item.category === category).map(item => {
        const record = unifiedWorkItem(item);
        return { ...record, archived: true, status: record.status?.name || item.status || '未设置',
          ownerName: record.assigneeName || '', productLineName: products.find(line => line.id === item.productLineId)?.name || item.productLineName || '',
          versionName: versions.find(version => version.id === item.versionId)?.name || item.versionName || '',
          workItemTypeId: record.taskTypeId, estimatedHours: Number(item.estimatedHours || 0), dueDate: item.dueDate || '',
          requirementType: category === 'bug' ? item.type || item.requirementType : item.requirementType };
      });
    }

    const names = new Map(getProductLines().map((line) => [line.id, line.name]));
    const categories: Record<string, string> = { requirement: '产品任务', design: '设计任务', dev: '研发任务', test: '测试任务', bug: '缺陷任务' };
    return [...getWorkItems().filter((item) => item.deleted || item.deleteFlag).map((item) => ({
      id: item.id, title: item.title, category: item.category, taskType: categories[item.category] || item.category,
      sourceId: item.productLineId, sourceName: names.get(item.productLineId) || item.productLineName || '未关联',
      operatorName: item.operatorName || '未记录', operatedAt: item.operatedAt || '', revision: Number(item.revision || 0)
    })), ...archivedBusinessTasks()].sort((a, b) => b.operatedAt.localeCompare(a.operatedAt));
  }
  if (parts[1] === 'archived-tasks' && parts[2] && parts[3]) {
    const category = parts[2]; const taskId = decodeURIComponent(parts[3]);
    const revision = method === 'POST' ? Number(body.revision) : Number(queryOf(path).get('revision'));
    if (['presales', 'delivery', 'ops'].includes(category)) {
      mutateArchivedBusinessTask(category as 'presales' | 'delivery' | 'ops', taskId, revision, method === 'DELETE' ? 'purge' : 'restore');
      return null;
    }
    const items = getWorkItems();
    const item = items.find((task) => task.id === taskId && task.category === category && (task.deleted || task.deleteFlag));
    if (!item) throw new Error('归档任务不存在');
    if (Number(item.revision || 0) !== revision) throw new Error('任务已更新，请刷新后重试');
    if (method === 'POST' && parts[4] === 'restore') {
      Object.assign(item, { deleted: false, deleteFlag: 0, archivedById: undefined, operatorName: undefined, operatedAt: undefined, revision: revision + 1 }); write(KEYS.workItems, items); return null;
    }
    if (method === 'DELETE') { write(KEYS.workItems, items.filter((task) => task.id !== item.id)); return null; }
    throw new Error('不支持的归档操作');
  }
  if (parts[0] === 'api' && ['presales-tasks', 'delivery-tasks', 'ops-tasks'].includes(parts[1])) {
    const result = handleMockBusinessTasks(path, method, body, { activities: taskActivities, record: recordTaskActivity, changes: recordTaskChanges, validateCompletion });
    if ((method === 'POST' && parts.length === 2) || (method === 'PUT' && parts.length === 3)) {
      const taskId = parts[2] || (result as { id: string }).id;
      const task = handleMockBusinessTasks(`/api/${parts[1]}/${taskId}`, 'GET', {}, { activities: taskActivities, record: recordTaskActivity, changes: recordTaskChanges, validateCompletion });
      attachWorkItemToRequirement({ ...task, category: parts[1] === 'ops-tasks' ? 'ops' : parts[1] === 'presales-tasks' ? 'presales' : 'delivery' });
    }
    return result;
  }
  if (parts[1] === 'version-reviews' || (parts[1] === 'product-lines' && parts[3] === 'versions' && parts[5] === 'reviews')) {
    const reviews = getVersionReviews(); const products = getProductLines(); const members = getEmployeeOptions();
    const lineId = parts[1] === 'version-reviews' ? '' : parts[2]; const versionId = parts[1] === 'version-reviews' ? '' : parts[4];
    if (parts[1] === 'version-reviews' && method === 'GET') return reviews.map(versionReviewListItem);
    const scoped = reviews.filter(item => (!lineId || item.productLineId === lineId) && (!versionId || item.versionId === versionId));
    if (parts[1] === 'product-lines' && parts[5] === 'reviews' && !parts[6] && method === 'GET') return scoped.map(versionReviewListItem);
    if (parts[1] === 'product-lines' && parts[5] === 'reviews' && !parts[6] && method === 'POST') {
      const created = mergeVersionReview({ id: id('version-review'), productLineId: lineId, versionId, revision: 0, status: 'DRAFT', participantCount: 0, participants: [], createdAt: now(), updatedAt: now() } as VersionReview, body as SaveVersionReviewInput, products, members, 'DRAFT');
      write(KEYS.versionReviews, [...reviews, created]); return created;
    }
    if (parts[6] === 'submit' && method === 'POST') {
      const created = mergeVersionReview({ id: id('version-review'), productLineId: lineId, versionId, revision: 0, status: 'DRAFT', participantCount: 0, participants: [], createdAt: now(), updatedAt: now() } as VersionReview, body as SaveVersionReviewInput, products, members, 'SUBMITTED');
      write(KEYS.versionReviews, [...reviews, created]); return created;
    }
    const reviewId = parts[6]; const current = reviews.find(item => item.id === reviewId);
    if (!current) throw new Error('版本评审不存在');
    if (parts[5] === 'reviews' && parts[7] === 'submit' && ['POST', 'PUT'].includes(method)) { if (method === 'POST' && body.revision !== undefined && body.revision !== current.revision) throw new Error('版本评审已被更新，请刷新后重试'); const updated = mergeVersionReview(current, method === 'PUT' ? body as SaveVersionReviewInput : { ...current, participantIds: (current.participants || []).map(item => item.id) } as SaveVersionReviewInput, products, members, 'SUBMITTED'); const next = reviews.map(item => item.id === reviewId ? updated : item); write(KEYS.versionReviews, next); return updated; }
    if (parts[5] === 'reviews' && method === 'GET') return current;
    if (parts[5] === 'reviews' && method === 'PUT') { if (body.revision !== current.revision) throw new Error('版本评审已被更新，请刷新后重试'); const updated = mergeVersionReview(current, body as SaveVersionReviewInput, products, members, 'DRAFT'); write(KEYS.versionReviews, reviews.map(item => item.id === reviewId ? updated : item)); return updated; }
    if (parts[5] === 'reviews' && method === 'DELETE') { if (body.revision !== current.revision) throw new Error('版本评审已被更新，请刷新后重试'); write(KEYS.versionReviews, reviews.filter(item => item.id !== reviewId)); return null; }
  }

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
    targets.forEach((item: any) => Object.assign(item, { deleted: true, deleteFlag: 1, revision: Number(item.revision || 0) + 1, operatedAt, archivedById: taskOperator().id, operatorName: taskOperator().name }));
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
    Object.assign(item, { deleted: true, deleteFlag: 1, revision: Number(item.revision || 0) + 1, operatedAt: now(), archivedById: taskOperator().id, operatorName: taskOperator().name });
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
      if (!text(body.projectId).trim()) throw new Error('请选择关联项目');
      const task: RequirementTask = {
        ...body, id: id('ops'), code: `OPS-${Date.now()}`,
        title: text(body.title).trim(), status: text(body.status) || '待处理',
        priority: text(body.priority) || '中', ownerName: text(body.ownerName),
        productLineName: text(body.productLineName), versionName: text(body.versionName),
        estimatedHours: Number(body.estimatedHours) || 0, dueDate: text(body.dueDate), createdAt: now(),
      };
      write(KEYS.opsTasks, [task, ...tasks]);
      attachWorkItemToRequirement(task, '运维任务');
      recordTaskActivity(task.id, String(task.productLineId || ''), 'WORK_ITEM_CREATED', { title: task.title });
      return { id: task.id, code: task.code };
    }
    if (method === 'PUT' && taskId) {
      const task = tasks.find(item => item.id === taskId);
      if (!task) throw new Error('运维任务不存在');
      if (body.title !== undefined && !text(body.title).trim()) throw new Error('任务标题不能为空');
      if (body.status === '已完成' && task.status !== '已完成') validateCompletion(body);
      const updated = { ...task, ...body, id: task.id, code: task.code };
      write(KEYS.opsTasks, tasks.map(item => item.id === taskId ? updated : item));
      syncAttachedWorkItem({ ...updated, taskType: '运维任务' });
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
      if (body.status !== current.status && body.status !== previousStatus && !((previousStatus === '待开始' && body.status === '进行中') || (previousStatus === '进行中' && body.status === '已完成') || (previousStatus === '已完成' && body.status === '已发布'))) throw new Error('迭代状态已变化，请刷新后重试');
    }
    Object.assign(current, body, { id: current.id, productLineId: product.id, productLineName: product.name });
    if (body.status !== undefined) current.statusPhase = body.status === '进行中' ? '处理中' : body.status;
    if (body.status === '已发布' && !current.releaseDate) current.releaseDate = now();
    write(KEYS.productLines, products);
    return current;
  }
  if (clean === '/api/product-lines' && method === 'POST') {
    const input = body as Partial<ProductLine>;
    const product: ProductLine = { ...input, id: id('pl'), name: input.name || '新建产品', code: input.code || 'PL-NEW', description: input.description || '', ownerName: input.ownerName || '', visibility: input.visibility || '公开', commercialAvailability: input.commercialAvailability || '不可销售', sort: Number(input.sort || 0), status: '待规划', createdAt: now(), versions: [] };
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
    if (index >= 0) {
      const previous = products[index];
      const name = body.name === undefined ? previous.name : String(body.name).trim();
      if (!name) throw new Error('产品名称不能为空');
      const nameAliases = [...new Set([...(previous.nameAliases || []), ...(name !== previous.name ? [previous.name] : [])])];
      products[index] = { ...previous, ...body, id: previous.id, name, nameAliases };
      write(KEYS.productLines, products);
      return products[index];
    }
  }
  if (clean === '/api/team-members/options' && method === 'GET') return getEmployeeOptions();
  if (clean === '/api/team-members/departments' && method === 'GET') return Array.from(new Set(getMembers().map((item) => item.department).filter(Boolean))).sort();
  if (clean === '/api/team-members' && method === 'GET') {
    const query = queryOf(path); const keyword = (query.get('keyword') || '').trim().toLowerCase(); const department = query.get('department') || ''; const status = query.get('status') || '';
    return getMembers().filter((member) => (!department || member.department === department) && (!status || member.status === status) && (!keyword || [member.name, member.department, member.jobTitle, member.phone, member.email].some((value) => String(value || '').toLowerCase().includes(keyword))));
  }
  if (clean === '/api/team-members' && method === 'POST') {
    if (body.organizationId && !['shichuang', 'agency'].includes(body.organizationId)) throw new Error('请选择有效的所属组织');
    const member = { organizationId: body.organizationId || 'shichuang', id: id('member'), name: String(body.name || ''), department: String(body.department || ''), jobTitle: String(body.jobTitle || ''), phone: body.phone ? String(body.phone) : undefined, email: body.email ? String(body.email) : undefined, status: 'enabled' as const, loginEnabled: false, version: 0 };
    write(KEYS.members, [...getMembers(), member]); return member;
  }
  if (parts[1] === 'team-members' && parts[2] && method === 'PUT') {
    const members = getMembers(); const index = members.findIndex((member) => member.id === parts[2]); if (index < 0) throw new Error('成员不存在');
    if (body.organizationId && !['shichuang', 'agency'].includes(body.organizationId)) throw new Error('请选择有效的所属组织');
    members[index] = { ...members[index], organizationId: body.organizationId || members[index].organizationId || 'shichuang', name: String(body.name || members[index].name), department: String(body.department || members[index].department), jobTitle: String(body.jobTitle || members[index].jobTitle), phone: body.phone ? String(body.phone) : undefined, email: body.email ? String(body.email) : undefined, version: members[index].version + 1 };
    write(KEYS.members, members); return members[index];
  }
  if (parts[1] === 'team-members' && parts[2] && parts[3] === 'status' && method === 'PATCH') {
    const members = getMembers(); const index = members.findIndex((member) => member.id === parts[2]); if (index < 0) throw new Error('成员不存在');
    members[index] = { ...members[index], status: body.status === 'disabled' ? 'disabled' : 'enabled', version: members[index].version + 1 };
    write(KEYS.members, members); return members[index];
  }
  if (parts[1] === 'requirements' && ((parts.length === 2 && method === 'POST') || (parts.length === 3 && method === 'PUT') || (parts[3] === 'reassign' && method === 'POST') || (parts[2] === 'reassign' && ['accept', 'reject'].includes(parts[4]) && method === 'POST'))) {
    const result = mutateCollaboration(parts, method, body, { items: getWorkItems(), people: getEmployeeOptions(), viewer: taskOperator(), save: items => write(KEYS.workItems, items), id: () => id('matter'), now: now() });
    return visibleMatter(result);
  }
  if (clean === '/api/requirements/departments' && method === 'GET') return getEmployeeOptions().map((item) => ({ id: item.id, name: item.department || '产品研发部', managerName: item.name }));
  if (clean === '/api/requirements' && method === 'GET') {
    const query = queryOf(path);
    const items = getWorkItems().filter((item) => item.category === 'requirement' && !item.deleted && !item.deleteFlag && (!query.get('status') || item.status === query.get('status')));
    const page = Math.max(1, Number(queryOf(path).get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(queryOf(path).get('pageSize') || 100)));
    return { items: items.slice((page - 1) * pageSize, page * pageSize).map(visibleMatter), page, pageSize, total: items.length };
  }
  if (clean === '/api/requirements/audit-events' && method === 'GET') {
    const query = queryOf(path);
    const items = getWorkItems().filter((item) => item.category === 'requirement' && !item.deleted && !item.deleteFlag).flatMap((item) => visibleMatter(item).events.map((event) => ({ ...event, requirementId: item.id }))).filter((event) => (!query.get('eventType') || event.eventType === query.get('eventType')) && (!query.get('operatorName') || event.operatorName === query.get('operatorName')));
    const page = Math.max(1, Number(query.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize') || 100)));
    return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length };
  }
  if (parts.length === 5 && parts[1] === 'requirements' && parts[2] === 'work-items' && parts[4] === 'progress' && method === 'PATCH') {
    validateMyTaskProgress(body.progress);
    const operator = taskOperator();
    const taskId = decodeURIComponent(parts[3]);
    const visible = myTasks(operator.id, true).find(row => row.sourceId === taskId);
    if (!visible) throw new Error('任务已删除或负责人已变更，只能修改本人待办进度');
    if (!canUpdateMyTaskProgress(visible.status)) throw new Error('已结束事项不能修改进度');
    if (!Number.isInteger(body.revision) || body.revision !== visible.revision) throw new Error('任务已被更新，请刷新后重试');
    if (visible.progress === body.progress) return { id: taskId, progress: body.progress, revision: visible.revision };
    const items = getWorkItems();
    let index = items.findIndex(item => item.id === taskId);
    if (index < 0) {
      const seed = initialWorkItems.find(item => item.id === taskId);
      if (!seed) throw new Error('任务不存在，请刷新后重试');
      items.push({ ...seed }); index = items.length - 1;
    }
    const current = items[index];
    const revision = visible.revision + 1;
    items[index] = { ...current, progress: body.progress, revision, updatedAt: now(), events: [...(current.events || []), { id: id('progress'), eventType: '更新进度', operatorName: operator.name, createdAt: now(), metadata: { from: visible.progress, to: body.progress } }] };
    write(KEYS.workItems, items);
    return { id: taskId, progress: body.progress, revision };
  }
  if (clean === '/api/requirements/my-tasks' && method === 'GET') {
    const viewerId = queryOf(path).get('viewerId') || '';
    return viewerId ? myTasks(viewerId, queryOf(path).get('includeFinished') === 'true') : [];
  }
  if (clean === '/api/requirements/work-order-candidates' && method === 'GET') {
    const query = queryOf(path); const keyword = (query.get('keyword') || '').trim().toLowerCase();
    return getWorkItems().filter(item => item.workOrderType && !item.deleted && !item.deleteFlag && item.id !== query.get('requirementId') && (!query.get('type') || item.workOrderType === query.get('type')) && (!keyword || [item.title, item.code, item.ownerName].some(value => String(value || '').toLowerCase().includes(keyword))))
      .slice(0, Math.min(200, Number(query.get('limit')) || 100)).map(item => ({ id: item.id, code: item.code, title: item.title, type: 'requirement', typeLabel: '协同事项', creatorName: item.creatorName, expectedCompleteDate: item.expectedCompleteDate, summary: item.description, ownerName: item.ownerName, productLineId: item.productLineId, productLineName: item.productLineName, status: item.status, category: item.category, sourceType: 'WORK_ORDER' }));
  }
  if (parts[1] === 'requirements' && parts[2] && parts.length === 3 && method === 'GET') {
    const item = getWorkItems().find((candidate) => candidate.id === parts[2]);
    if (!item) throw new Error('事项不存在');
    return { ...visibleMatter(item), workItems: item.workItems || [] };
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
      return { ...visibleMatter(current), workItems: current.workItems || [] };
    }
    const revision = Number(current.revision ?? current.version ?? 0);
    if (body.revision !== revision) throw new Error('事项已被其他人更新，请刷新后重试');
    const event = { id: id('comment'), eventType: '发表评论', operatorName: viewer.name, createdAt: now(), metadata: { commentContent: content, commentAuthorId: viewer.id || viewer.name, commentRequestId: requestId } };
    const updated = { ...current, revision: revision + 1, events: [...(current.events || []), event] };
    items[index] = updated;
    write(KEYS.workItems, items);
    return { ...visibleMatter(updated), workItems: updated.workItems || [] };
  }
  if (parts[1] === 'requirements' && parts[2] && method === 'POST' && (parts[3] === 'reopen' || parts[3] === 'acceptance-failed' || parts[3] === 'transition' && body.action === 'close')) {
    const items = getWorkItems();
    let viewer: { id?: string; name?: string } | undefined;
    try { viewer = JSON.parse(sessionStorage.getItem('shichuang.session') || 'null')?.user; } catch { /* 无效会话不得修改事项。 */ }
    const action = parts[3] === 'transition' ? 'close' : parts[3] as 'reopen' | 'acceptance-failed';
    const updated = applyCollaborationWorkflow(action, parts[2], body, { items, people: getEmployeeOptions(), viewer, now: now(), eventId: id('event') });
    if (action === 'acceptance-failed') {
      const staged = read<AttachmentMetadata[]>(KEYS.attachments, []);
      const ids = Array.isArray(body.attachmentIds) ? body.attachmentIds.map(String) : [];
      if (ids.some(attachmentId => !staged.some(attachment => attachment.id === attachmentId))) throw new Error('反馈附件失效，请重新上传');
      const event = updated.events?.at(-1);
      if (event?.metadata) event.metadata.attachments = staged.filter(attachment => ids.includes(attachment.id));
    }
    write(KEYS.workItems, items.map(item => item.id === updated.id ? updated : item));
    return { ...visibleMatter(updated), workItems: updated.workItems || [] };
  }
  if (parts[1] === 'requirements' && parts[2] && parts[3] === 'transition' && method === 'POST') {
    const items = getWorkItems();
    const index = items.findIndex((candidate) => candidate.id === parts[2]);
    if (index < 0) throw new Error('事项不存在');
    const current = items[index];
    const status = body.action === 'reject' ? '已退回' : body.action === 'hold' ? '已搁置' : body.status;
    if (!['处理中', '已退回', '已搁置'].includes(status)) throw new Error('不支持的事项状态');
    if (current.pendingReassignment) throw new Error('请先处理待接收转派');
    if (status === '处理中' && current.status !== '待处理') throw new Error('事项状态已变化，请刷新');
    const returning = body.action === 'reject';
    if (returning && (current.status !== '待处理' || !text(body.reason).trim())) throw new Error('仅待处理事项可退回，请填写退回原因');
    const event = { id: id('event'), eventType: status === '处理中' ? '事项接收' : returning ? '退回' : '搁置', fromStatus: current.status, toStatus: status, reason: text(body.reason), operatorName: current.ownerName, createdAt: now() };
    items[index] = { ...current, status, revision: Number(current.revision || current.version || 0) + 1, events: [...(current.events || []), event] };
    write(KEYS.workItems, items);
    return null;
  }
  if (parts[1] === 'requirements' && parts[2] && ['complete', 'acceptance-passed'].includes(parts[3]) && method === 'POST') {
    const items = getWorkItems(); const index = items.findIndex((candidate) => candidate.id === parts[2]);
    if (index < 0) throw new Error('事项不存在');
    const current = items[index]; const revision = Number(current.revision || current.version || 0);
    if (body.revision != null && Number(body.revision) !== revision) throw new Error('事项已被其他人更新，请刷新后重试');
    const ratedAcceptance = parts[3] === 'acceptance-passed';
    if (ratedAcceptance && (!Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 5)) throw new Error('请选择1至5星的验收评价');
    if (ratedAcceptance && text(body.comment).length > 500) throw new Error('评价内容不能超过500字');
    const nextStatus = parts[3] === 'complete' ? '待验收' : parts[3] === 'acceptance-passed' ? '已完成' : '处理中';
    if ((parts[3] === 'complete' && current.status !== '处理中') || (parts[3] === 'acceptance-passed' && current.status !== '待验收') || (parts[3] === 'acceptance-failed' && current.status !== '待验收')) throw new Error('当前事项状态不允许此操作');
    if (parts[3] === 'complete' && (current.workItems || []).some((item: RequirementWorkItem) => item.blocksClosure !== false && item.status !== '已完成' && item.assistanceTaskStatus !== 'COMPLETED')) throw new Error('存在未完成的关联任务');
    const stagedAttachments = read<any[]>(KEYS.attachments, []);
    const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds.map(String) : [];
    const previousOwnerName = String(current.ownerName || current.assigneeName || '').trim();
    const previousAssigneeId = String(current.assigneeId || '').trim();
    const nextOwnerName = previousOwnerName;
    const nextAssigneeId = previousAssigneeId;
    const ownerChanged = Boolean(nextOwnerName && nextOwnerName !== previousOwnerName) || Boolean(previousAssigneeId && nextAssigneeId && nextAssigneeId !== previousAssigneeId);
    const event = { id: id('event'), eventType: parts[3] === 'complete' ? '事项完成' : parts[3] === 'acceptance-passed' ? '验收通过' : '验收未通过', fromStatus: current.status, toStatus: nextStatus, reason: ratedAcceptance ? text(body.comment).trim() : text(body.note || body.reason), operatorName: ratedAcceptance ? current.creatorName : current.ownerName, createdAt: now(), metadata: { ...(parts[3] === 'complete' ? { processingAssigneeId: previousAssigneeId, processingAssigneeName: previousOwnerName } : {}), ...(ratedAcceptance ? { rating: body.rating } : {}), ...(body.noteHtml ? { noteHtml: text(body.noteHtml) } : {}), ...(ownerChanged ? { ownerChanged: true, fromAssigneeName: previousOwnerName, assigneeName: nextOwnerName } : {}), attachments: stagedAttachments.filter((attachment) => attachmentIds.includes(String(attachment.id))) } };
    items[index] = { ...current, status: nextStatus, workItems: current.workItems, ...((parts[3] === 'complete' || parts[3] === 'acceptance-failed') && ownerChanged ? { ownerName: nextOwnerName, assigneeName: nextOwnerName, ...(nextAssigneeId ? { assigneeId: nextAssigneeId } : {}) } : {}), revision: revision + 1, events: [...(current.events || []), event] };
    write(KEYS.workItems, items); return { id: current.id, status: nextStatus };
  }
  if (clean === '/api/design-tasks' && method === 'POST') {
    if (!String(body.title || '').trim()) throw new Error('任务标题不能为空');
    const task = { ...body, id: id('design'), code: `DESIGN-${Date.now()}`, category: 'design', status: body.status || '待处理', assigneeName: body.ownerName || '', revision: 0, createdAt: now(), updatedAt: now() };
    write(KEYS.workItems, [...getWorkItems(), task]);
    return { id: task.id, code: task.code };
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
    if (index < 0 || items[index].deleted || items[index].deleteFlag) throw new Error('工作项不存在或已归档');
    const current = items[index];
    if (current.deleted || current.deleteFlag) throw new Error('工作项已归档');
    const revision = Number(current.revision || 0);
    if (body.revision != null && Number(body.revision) !== revision) throw new Error('工作项已被其他人更新，请刷新后重试');
    const assigneeName = body.assigneeName ?? body.developer ?? current.assigneeName ?? current.ownerName ?? '';
    items[index] = { ...current, ...body, id: current.id, creatorId: current.creatorId, creatorName: current.creatorName, createdAt: current.createdAt, ownerName: assigneeName, assigneeName, revision: revision + 1 };
    write(KEYS.workItems, items);
    syncAttachedWorkItem(items[index], undefined, current);
    recordTaskChanges(current, items[index]);
    return items[index];
  }
  if (clean === '/api/okr/people' && method === 'GET') return getOkrPeople();
  if (clean === '/api/okr/settings' && method === 'GET') { const settings=normalizedPolicy(read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings),getOkrPeople()); write(KEYS.okrSettings,settings); return settings; }
  if (clean === '/api/okr/settings' && method === 'PUT') {
    const people=getOkrPeople(), current=normalizedPolicy(read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings),people);
    if (!body.viewerId) throw new Error('无配置权限');
    if ((body.version ?? 0)!==(current.version ?? 0)) throw new Error('配置已更新，请刷新后重试');
    const {viewerId: _viewerId,...input}=body;
    if (!canUpdateOkrSettings(body.viewerId,input as OkrSettings,current,people)) throw new Error('当前配置项无保存权限；仅管理员或获得对应权限的子管理员可保存设置');
    const error=validatePolicy(input as OkrSettings,people,current); if(error) throw new Error(error);
    const saved=normalizedPolicy({...input,version:(current.version ?? 0)+1} as OkrSettings,people);
    const pendingRecords = read<OkrRecord[]>(KEYS.okrRecords, MOCK_OKR_RECORDS as OkrRecord[]);
    const reassigned = reconcileConfirmationRequests(pendingRecords,saved,people);
    write(KEYS.okrSettings,saved); write(KEYS.okrRecords,reassigned); return saved;
  }
  if (parts[1] === 'okr' && parts[2] === 'records' && parts[3] && parts[4] === 'viewed' && method === 'POST') {
    const records = read<OkrRecord[]>(KEYS.okrRecords, MOCK_OKR_RECORDS as OkrRecord[]);
    const record = records.find(row => row.id === parts[3] && row.kind === 'review');
    if (!body.viewerId || !getOkrPeople().some(person => person.id === body.viewerId) || !record || !['submitted', 'reviewed', 'active'].includes(record.status) || !canReadReviewRecord(record, body.viewerId, getOkrPeople(), read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings))) throw new Error('复盘不存在或无查看权限');
    if (!record.viewedBy?.includes(body.viewerId)) {
      write(KEYS.okrRecords, records.map(row => row.id === record.id ? { ...row, viewedBy: [...(row.viewedBy || []), body.viewerId] } : row));
    }
    return null;
  }
  if (clean === '/api/okr/records' && method === 'GET') {
    const viewerId = queryOf(path).get('viewerId');
    const settings = read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings);
    const reviewPeople = getOkrPeople();
    return read(KEYS.okrRecords, MOCK_OKR_RECORDS).filter((record: any) => canViewPending(record, viewerId || '', settings, reviewPeople) && record.status !== 'deleted' && canReadReviewRecord(record, viewerId, reviewPeople, settings));
  }
  if ((clean === '/api/okr/records' && method === 'POST') || (parts[1] === 'okr' && parts[2] === 'records' && parts[3] && method === 'PATCH')) {
    const mutation = mutateOkrLifecycle(parts[3], body, read<OkrRecord[]>(KEYS.okrRecords, MOCK_OKR_RECORDS as OkrRecord[]), getOkrPeople(), read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings));
    if (mutation) { write(KEYS.okrRecords, mutation.records); return mutation.value; }
  }
  if (clean === '/api/okr/records' && method === 'POST') {
    const records = read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS);
    const ownerId = body.viewerId || MOCK_USERS[0]?.id;
    if (body.kind === 'review') {
      if (!body.viewerId) throw new Error('缺少复盘提交人');
      if (records.some(record => record.kind === 'review' && record.status !== 'deleted' && record.ownerId === ownerId && record.periodKey === body.periodKey && record.payload.reviewType === body.payload?.reviewType)) throw new Error('本周期已有复盘，请继续编辑原记录');
      if (body.submit !== false) {
        const access = reviewSubmissionAccess(read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings), body.payload || {});
        if (!access.allowed) throw new Error(access.reason);
      }
    }
    const submittedAt = body.kind === 'review' && body.submit !== false ? now() : undefined;
    let record: OkrRecord = { id: id('okr'), kind: body.kind, ownerId, periodKey: body.periodKey, status: body.submit === false ? 'draft' : body.kind === 'review' ? 'submitted' : 'active', version: 0, createdAt: now(), ...(submittedAt ? { submittedAt } : {}), payload: body.payload || {} };
    const owner = getOkrPeople().find(person=>person.id===ownerId);
    const settings = read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings);
    if (record.kind === 'review') {
      if (!owner) throw new Error('复盘人员不存在');
      record.payload = bindReviewTemplate(record.payload, settings, owner, getOkrPeople(), body.submit !== false);
      record.payload.reviewTemplateAggregations = reviewTemplateAggregations(record.payload, records, getOkrPeople(), ownerId, body.submit !== false);
      validateReviewProgress(record.payload, ownerId, records, getOkrPeople());
    }
    const reviewerId = record.kind === 'objective' && body.submit !== false && owner && settings.confirmation ? confirmationReviewer(owner,'create',record.payload,settings,getOkrPeople()) : undefined;
    if (reviewerId) record = {...record,status:'submitted',changeRequest:{id:id('change'),purpose:'initial',status:'pending',reason:'目标首次提交',reviewerId,payload:record.payload,baseVersion:0,requestedAt:now()}};
    const department = record.kind === 'review' && body.submit !== false ? submitDepartmentReview(record.payload, ownerId, records, getOkrPeople()) : { records, payload: record.payload };
    record = { ...record, payload: department.payload };
    write(KEYS.okrRecords, syncSubmittedReviewProgress([...department.records, record], record, getOkrPeople()));
    return { id: record.id };
  }
  if (parts[1] === 'okr' && parts[2] === 'records' && parts[3] && method === 'PATCH') {
    const records = read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS);
    const index = records.findIndex(record => record.id === parts[3]);
    if (index < 0) throw new Error('目标记录不存在');
    const record = records[index];
    if (record.kind === 'review') {
      if (!body.viewerId || record.ownerId !== body.viewerId) throw new Error('只能修改本人复盘');
      if (body.action === 'delete') {
        if (record.status !== 'draft') throw new Error('已提交的复盘无法删除');
        if (body.version !== record.version) throw new Error('复盘已变化，请刷新后重试');
        records[index] = { ...record, status: 'deleted', version: record.version + 1, deletedAt: now(), deletedBy: body.viewerId };
        write(KEYS.okrRecords, records);
        return records[index];
      }
      if (!['draft', 'returned'].includes(record.status)) throw new Error('已提交的复盘不能重复提交或修改');
      if (body.version !== record.version) throw new Error('复盘已变化，请刷新后重试');
      if (!['save', 'submit'].includes(body.action)) throw new Error('不支持此复盘操作');
      const owner = getOkrPeople().find(person => person.id === record.ownerId);
      if (!owner) throw new Error('复盘人员不存在');
      const payload = bindReviewTemplate(body.payload || record.payload, read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings), owner, getOkrPeople(), body.action === 'submit', record.payload);
      if (payload.reviewType !== record.payload.reviewType || payload.startDate !== record.payload.startDate || payload.endDate !== record.payload.endDate) throw new Error('不能修改原复盘的周期');
      if (body.action === 'submit') {
        const access = reviewSubmissionAccess(read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings), payload);
        if (!access.allowed) throw new Error(access.reason);
      }
      payload.reviewTemplateAggregations = reviewTemplateAggregations(payload, records, getOkrPeople(), record.ownerId, body.action === 'submit');
      validateReviewProgress(payload, record.ownerId, records, getOkrPeople());
      const department = body.action === 'submit' ? submitDepartmentReview(payload, record.ownerId, records, getOkrPeople()) : { records, payload };
      const next = { ...record, payload: department.payload, status: body.action === 'submit' ? 'submitted' : record.status, ...(body.action === 'submit' ? { submittedAt: now() } : {}), version: record.version + 1 };
      const saved = department.records.map(row => row.id === record.id ? next : row);
      write(KEYS.okrRecords, body.action === 'submit' ? syncSubmittedReviewProgress(saved, next, getOkrPeople()) : saved);
      return next;
    }
    if (record.kind === 'objective' || record.kind === 'action') {
      if (!body.viewerId || !canEditOkr(record,body.viewerId,read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings),getOkrPeople())) throw new Error('只能修改本人目标或已授权的公司级目标');
      if (record.status === 'deleted' && body.action === 'delete') return record;
      if (record.status === 'deleted') throw new Error('目标已删除');
      if (body.version !== record.version) throw new Error('目标已被更新，请刷新后重试');
      if (record.changeRequest?.status === 'pending') throw new Error('已有待确认申请，请等待确认或撤回');
      const queueConfirmation = (purpose: 'delete' | 'update' | 'initial') => {
        if (record.kind !== 'objective') return undefined;
        const people = getOkrPeople(), owner = people.find(person=>person.id===record.ownerId);
        const settings = read<OkrSettings>(KEYS.okrSettings, MOCK_OKR_SETTINGS as OkrSettings);
        const reviewerId = owner && settings.confirmation ? confirmationReviewer(owner,purpose === 'initial' ? 'create' : purpose,body.payload || record.payload,settings,people) : undefined;
        if (!reviewerId) return undefined;
        const next = {...record,version:record.version+1,changeRequest:{id:id('change'),purpose,status:'pending',reason:body.payload?.changeReason || (purpose === 'delete' ? '申请删除目标' : '申请修改目标'),reviewerId,payload:body.payload || record.payload,baseVersion:record.version,requestedAt:now()}};
        records[index] = next; write(KEYS.okrRecords,records); return next;
      };
      const group = record.kind === 'action' ? legacyGoalActions(record, records) : [record];
      const groupIds = new Set(group.map(item => item.id));
      const dependents = records.filter(item => item.status !== 'deleted' && item.kind !== 'review' && !groupIds.has(item.id) && (groupIds.has(item.payload?.parentObjectiveId) || groupIds.has(item.payload?.parentActionId) || groupIds.has(item.payload?.parentKeyResultId) || item.payload?.alignments?.some((alignment: any) => groupIds.has(alignment.parentObjectiveId) || groupIds.has(alignment.parentKeyResultId))));
      if (body.action === 'delete') {
        if (dependents.length) throw new Error('目标已有下级对齐，不能直接删除');
        if (!['draft','submitted'].includes(record.status)) { const pending = queueConfirmation('delete'); if (pending) return pending; }
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
      if (body.action === 'submit' || body.action === 'save' && !['draft','submitted'].includes(record.status)) { const pending = queueConfirmation(['draft','submitted'].includes(record.status) ? 'initial' : 'update'); if (pending) return pending; }
    }
    records[index] = { ...record, ...(body.payload ? { payload: body.payload } : {}), status: body.action === 'submit' ? 'active' : record.status, version: record.version + 1 };
    write(KEYS.okrRecords, records);
    return records[index];
  }
  if (parts[1] === 'okr' && parts[2] === 'people' && parts[3] && method === 'PUT') { const people = getOkrPeople(); const index = people.findIndex((person) => person.id === parts[3]); if (index < 0) throw new Error('组织成员不存在'); people[index] = { ...people[index], supervisorId: body.supervisorId || null, rootFlag: body.root ? 1 : 0, version: people[index].version + 1 }; write(KEYS.okrPeople, people); return people[index]; }
  if (clean === '/api/okr/work' && method === 'GET') return [];
  if (clean === '/api/okr/actions/parents' && method === 'GET') { const query = queryOf(path); return assignedGoalActions(read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS), getOkrPeople().find(person => person.id === query.get('viewerId'))).filter(record => !query.get('periodKey') || record.periodKey === query.get('periodKey')); }
  if (clean === '/api/okr/actions' && method === 'POST') { const record = { id: id('okr-action'), kind: 'action', ownerId: body.viewerId || MOCK_USERS[0]?.id, periodKey: body.periodKey, status: body.submit === false ? 'draft' : 'active', version: 0, createdAt: now(), payload: body.payload || {} }; const records = read<any[]>(KEYS.okrRecords, MOCK_OKR_RECORDS); write(KEYS.okrRecords, [...records, record]); return { id: record.id }; }
  if (parts[1] === 'okr' && parts[2] && parts[3] === 'events' && method === 'GET') {
    const record = read<OkrRecord[]>(KEYS.okrRecords, MOCK_OKR_RECORDS as OkrRecord[]).find(item => item.id === parts[2]);
    return (record?.changeHistory || []).map(change => ({ action: change.feedback === '申请人撤回' ? '申请人撤回确认流程' : change.status === 'approved' ? `${change.purpose === 'initial' ? '目标首次确认已生效' : change.purpose === 'delete' ? '目标删除已确认' : '目标修改已生效'}：${change.reason}` : `${change.purpose === 'initial' ? '目标首次提交' : '目标修改'}退回：${change.feedback}`, operator: getOkrPeople().find(person => person.id === change.reviewerId)?.name || '审核人', createdAt: change.reviewedAt || change.requestedAt }));
  }

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
  if (clean === '/api/work-item-template' && method === 'GET') return templateTypes();
  if (clean === '/api/work-item-template/types' && method === 'POST') { const template = { id: id('type'), category: body.category, name: body.name, description: body.description || '', enabled: body.enabled !== false, isDefault: Boolean(body.isDefault), revision: 0, workflow: body.workflow ? { id: id('workflow'), category: body.workflow.category, taskTypeId: '', name: body.workflow.name, workflowVersion: 1, status: 'PUBLISHED', revision: 0, definition: body.workflow.definition } : undefined }; if (template.workflow) template.workflow.taskTypeId = template.id; write(KEYS.researchTypes, [...templateTypes(true), template]); return { id: template.id }; }
  if (parts[1] === 'work-item-template' && parts[2] === 'types' && parts[3] && parts[4] === 'workflow' && method === 'PUT') {
    const templates = templateTypes(true);
    const index = templates.findIndex((item: any) => item.id === parts[3] && !item.archived);
    if (index < 0) throw new Error('工作项模板不存在');
    const current = templates[index].workflow;
    if (body.revision != null && Number(body.revision) !== Number(current?.revision || 0)) throw new Error('状态配置已更新，请刷新后重试');
    const workflow = { id: id('workflow'), category: body.category || current?.category || categoryCode(templates[index].category), taskTypeId: templates[index].id, name: body.name || current?.name || `${templates[index].name}状态配置`, workflowVersion: Number(current?.workflowVersion || 0) + 1, status: 'PUBLISHED', revision: Number(current?.revision || 0) + 1, definition: body.definition || current?.definition || { states: [] } };
    templates[index] = { ...templates[index], workflow, workflows: [...(templates[index].workflows || []), ...(current ? [current] : [])] };
    write(KEYS.researchTypes, templates);
    return workflow;
  }
  if (parts[1] === 'work-item-template' && parts[2] === 'types' && parts[3] && method === 'PUT') { const templates = templateTypes(true); const index = templates.findIndex((item: any) => item.id === parts[3] && !item.archived); if (index >= 0) { templates[index] = { ...templates[index], ...body, revision: (templates[index].revision || 0) + 1 }; write(KEYS.researchTypes, templates); return templates[index]; } }
  if (parts[1] === 'work-item-template' && parts[2] === 'types' && parts[3] && method === 'DELETE') { const templates = templateTypes(true); const index = templates.findIndex((item: any) => item.id === parts[3] && !item.archived); if (index < 0) throw new Error('工作项模板不存在'); templates[index] = { ...templates[index], archived: true, enabled: false }; write(KEYS.researchTypes, templates); return null; }
  if (clean === '/api/notification-template' && method === 'GET') return templateNotifications();
  if (clean === '/api/notification-template' && method === 'PUT') { write(KEYS.researchNotifications, body); return body; }
  // 五类任务读取同一租户模板；用例保留独立类型路径。
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'work-item-types' && !parts[4] && method === 'GET') {
    const category = queryOf(path).get('category') || '';
    const product = getProductLines().find((item) => item.id === parts[2]);
    if (!product) throw new Error('产品不存在');
    const inherited = (categoryCode(category) === 'case' ? productTypes(product) : globalTaskTypes())
      .filter((item: any) => !category || categoryCode(item.category) === categoryCode(category));
    return inherited.map((item: any) => ({ ...item, productLineId: parts[2] }));
  }
  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'work-item-types' && parts[5] === 'workflows') {
    const products = getProductLines();
    const product = products.find((item) => item.id === parts[2]);
    if (!product) throw new Error('产品不存在');
    const types = structuredClone(productTypes(product));
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
    let types = [...productTypes(product)];
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
  if (parts[1] === 'product-lines' && parts[2] && ['notification-settings', 'workflows'].includes(parts[3])) {
    const products = getProductLines();
    const product = products.find((item) => item.id === parts[2]) as (ProductLine & { notificationSettings?: any }) | undefined;
    if (!product) throw new Error('产品不存在');
    if (parts[3] === 'notification-settings') {
      if (method === 'GET') return product.notificationSettings ?? templateNotifications();
      if (method !== 'PUT') throw new Error('不支持的通知设置操作');
      product.notificationSettings = body;
      write(KEYS.productLines, products);
      return body;
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

  if (parts[1] === 'product-lines' && parts[2] && parts[3] === 'iteration-timeline' && method === 'GET') {
    const line = getProductLines().find((product) => product.id === parts[2]);
    if (!line) return [];
    return getWorkItems()
      .filter((item) => item.productLineId === line.id && !item.deleted && !item.deleteFlag)
      .map((item) => ({
        ...unifiedWorkItem(item),
        versionName: item.versionName || line.versions?.find((version) => version.id === item.versionId)?.name || '',
      }));
  }

  if (clean.startsWith('/api/work-items/') && parts.length === 3 && method === 'GET') {
    const found = getWorkItems().find(item => !item.deleted && !item.deleteFlag && item.id === parts[2]);
    return found ? unifiedWorkItem(found) : null;
  }
  if (parts[1] === 'work-items' && parts[2] && parts.length === 3 && method === 'PUT') {
    if (body.assigneeName !== undefined || body.assigneeId !== undefined) {
      const people = getEmployeeOptions();
      const matches = people.filter(person => body.assigneeId ? person.id === body.assigneeId : person.name === body.assigneeName);
      if (matches.length !== 1) throw new Error('请选择唯一有效的负责人');
      body.assigneeId = matches[0].id;
      body.assigneeName = matches[0].name;
    }
    if (body.plannedEndDate !== undefined) body.dueDate = body.plannedEndDate;

    if (body.verifierId != null) {
      const verifier = getEmployeeOptions().find(employee => employee.id === body.verifierId);
      if (!verifier) throw new Error('验证者不存在或已停用');
      body.verifierName = verifier.name;
    }
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
    if (body.versionId !== undefined) {
      const product = getProductLines().find(product => product.id === (body.productLineId || current.productLineId));
      const version = product?.versions?.find(version => version.id === body.versionId);
      if (body.versionId && !version) throw new Error('请选择当前产品的有效迭代版本');
      body.versionName = version?.name || '';
    }
    if (current.category === 'requirement') delete body.needsCollaboration;

    if (current.deleted || current.deleteFlag) throw new Error('工作项已归档');
    const revision = Number(current.revision || 0);
    if (body.revision != null && Number(body.revision) !== revision) throw new Error('工作项已被其他人更新，请刷新后重试');
    const updated = { ...current, ...body, id: current.id, creatorId: current.creatorId, creatorName: current.creatorName, createdAt: current.createdAt, ownerName: body.assigneeName ?? current.ownerName, assigneeName: body.assigneeName ?? current.assigneeName ?? current.ownerName, revision: revision + 1 };
    items[index] = updated;
    write(KEYS.workItems, items);
    syncAttachedWorkItem(updated, undefined, current);
    recordTaskChanges(current, updated);
    return unifiedWorkItem(updated);
  }
  if (clean === '/api/work-items' && method === 'POST') {
    if (!String(body.title || '').trim()) throw new Error('任务标题不能为空');
    const product = getProductLines().find((line) => line.id === body.productLineId);
    const type = globalTaskTypes().find((item: any) => item.id === body.taskTypeId);
    if (!product || !type || !type.enabled || categoryCode(type.category) !== body.category) throw new Error('产品或工作项类型不可用，请刷新后重试');
    const items = getWorkItems(); const existing = items.find((item) => item.requestId && item.requestId === body.requestId);
    if (existing) {
      if (existing.creatorId !== taskOperator().id || existing.title !== String(body.title).trim() || existing.category !== body.category || existing.productLineId !== body.productLineId) throw new Error('提交标识已使用，请重新提交');
      return unifiedWorkItem(existing);
    }
    if (body.category === 'bug' && body.verifierId && !getEmployeeOptions().some(employee => employee.id === body.verifierId)) throw new Error('验证者不存在或已停用');
    const owner = getEmployeeOptions().find((employee) => employee.id === body.assigneeId);
    const workflow = (type.workflows || (type.workflow ? [type.workflow] : [])).find((flow: any) => flow.status === 'PUBLISHED');
    const initial = workflow?.definition?.states?.find((state: any) => state.initial && state.enabled !== false);
    if (!initial) throw new Error('当前工作项类型未配置已发布的初始状态');
    const task = { ...body, verifierName: getEmployeeOptions().find(employee => employee.id === body.verifierId)?.name || '', id: id(body.category), code: `${String(body.category).toUpperCase()}-${Date.now()}`, title: String(body.title).trim(), status: initial.name, statusKey: initial.key, workflowId: workflow.id, statusColor: initial.color, revision: 0, productLineName: product.name, ownerName: owner?.name || '', assigneeName: owner?.name || '', creatorId: taskOperator().id, creatorName: taskOperator().name, createdAt: now(), dueDate: body.plannedEndDate || '', requirementType: body.category === 'bug' ? body.type || '系统缺陷' : type.name, workItemTypeId: type.id, needsCollaboration: body.needsCollaboration ?? (body.category === 'requirement' ? ['dev', 'test'] : undefined) };
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
    const typesByProduct = new Map<string, any[]>();
    items = items.map((item) => unifiedWorkItem(item, typesByProduct)) as any;
    const page = Math.max(1, Number(query.get('page') || 1)); const pageSize = Math.max(1, Number(query.get('pageSize') || 100));
    return { page: { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length } };
  }
  if (parts[1] === 'work-items' && parts[2] && parts[3] === 'transitions' && ['GET', 'POST'].includes(method)) {
    const items = getWorkItems();
    const index = items.findIndex((item) => item.id === parts[2] && item.productLineId === queryOf(path).get('productLineId'));
    if (index < 0 || items[index].deleted || items[index].deleteFlag) throw new Error('任务不存在或已归档');
    const current = items[index];
    const product = getProductLines().find((line) => line.id === current.productLineId);
    const type: any = [...productTypes(product), ...globalTaskTypes(true)].find((type: any) => type.id === (current.taskTypeId || current.workItemTypeId));
    const workflows = type?.workflows || (type?.workflow ? [type.workflow] : []);
    const matchingWorkflow = workflows.find((workflow: any) => workflow.status === 'PUBLISHED' && (!current.workflowId || workflow.id === current.workflowId));
    const snapshotWorkflow = current.workflowId ? databaseRows('t_product_workflow').find(flow => flow.id_ === current.workflowId && flow.product_line_id_ === current.productLineId && !flow.delete_flag_ && flow.status_ === 'PUBLISHED') : undefined;
    const workflow = matchingWorkflow || (snapshotWorkflow ? { id: snapshotWorkflow.id_, status: snapshotWorkflow.status_, definition: snapshotWorkflow.definition_ } : workflows.find((flow: any) => flow.status === 'PUBLISHED' && flow.definition?.states?.some((state: any) => state.key === current.statusKey || state.name === current.status)));
    if (!workflow?.definition?.states?.length) throw new Error('任务绑定的状态流程已失效，请检查工作项设置中发布的流程');
    const states = workflow?.definition?.states?.filter((state: any) => state.enabled !== false) || [];
    const currentKey = states.find((state: any) => state.key === current.statusKey)?.key || states.find((state: any) => state.name === current.status)?.key;
    let role = '';
    try { role = JSON.parse(sessionStorage.getItem('shichuang.session') || 'null')?.user?.role || ''; } catch { /* 无效会话不可变更状态 */ }
    const edges = (workflow?.definition?.transitions || []).filter((edge: any) => edge.from === currentKey && states.some((state: any) => state.key === edge.to));
    const actions = edges.map((edge: any) => {
      const reasons = [...(edge.roles?.length && !edge.roles.includes(role) ? ['当前角色无权执行此流转'] : []), ...(edge.approvalTasks?.length ? ['该流转需要审批'] : [])];
      return { edgeKey: edge.key, name: edge.name, to: edge.to, requiredFields: edge.requiredFields || [], allowed: !reasons.length, reasons };
    });
    const revision = Number(current.revision || 0);
    if (method === 'GET') return { revision, actions, statuses: states.map((state: any) => ({ key: state.key, name: state.name, color: state.color || 'neutral', current: state.key === currentKey, allowed: state.key === currentKey || actions.some((action: any) => action.to === state.key && action.allowed), reasons: actions.find((action: any) => action.to === state.key)?.reasons || [] })) };
    if (body.revision !== revision) throw new Error('任务已被其他人更新，请刷新后重试');
    const action = actions.find((action: any) => action.edgeKey === body.edgeKey);
    if (!action?.allowed) throw new Error(action?.reasons.join('；') || '当前状态不允许此流转');
    for (const field of action.requiredFields) { if (body[field] == null || body[field] === '') throw new Error(field === 'reason' ? '请填写状态变更原因' : `请填写${field}`); }
    const state = states.find((state: any) => state.key === action.to);
    if (state.name === '已完成') validateCompletion(body);
    const updated = { ...current, status: state.name, statusKey: state.key, statusColor: state.color, revision: revision + 1, ...(state.name === '已完成' ? { actualHours: body.actualHours, completionReview: body.completionReview, completedAt: now() } : {}) };
    items[index] = updated;
    write(KEYS.workItems, items);
    syncAttachedWorkItem(updated, undefined, current);
    recordTaskActivity(current.id, current.productLineId, 'WORK_ITEM_TRANSITIONED', { fromName: current.status, toName: state.name, reason: body.reason || '', ...(state.name === '已完成' ? { actualHours: body.actualHours } : {}) });
    if (updated.completionReview && state.name === '已完成') recordTaskActivity(current.id, current.productLineId, 'WORK_ITEM_REVIEWED', { review: { title: `${current.title}复盘总结`, ...updated.completionReview } });
    return unifiedWorkItem(updated);
  }
  if (parts[1] === 'work-items' && parts[2] && parts[3] === 'relations' && method === 'GET') {
    const item = getWorkItems().find((candidate) => candidate.id === parts[2]);
    const ids = [...(item?.relatedTaskIds || []), ...(item?.sourceWorkOrderIds || [])];
    return { relations: ids.map((targetId) => ({ id: `${parts[2]}-${targetId}`, sourceId: parts[2], targetId, type: 'RELATES_TO', scope: 'FINISH', revision: 0 })) };
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
  if (parts.length === 4 && parts[1] === 'work-items' && parts[3] === 'available-test-plans' && method === 'GET') {
    const workItemId = parts[2];
    const task = findActiveTestTask(workItemId);
    if (!task) throw new Error('测试任务不存在或已归档');
    if (!task.productLineId) throw new Error('请先为当前测试任务关联产品线');
    const plans = getPlans();
    const linkedIds = new Set([...(getTestPlanAssociations()[workItemId] || []), ...plans.filter((plan) => plan.workItemId === workItemId).map((plan) => String(plan.id || ''))]);
    const tasksById = new Map(getWorkItems().filter((item) => item.category === 'test' && !item.deleted && !item.deleteFlag).map((item) => [item.id, item]));
    return plans.flatMap((plan) => {
      const sourceTask = tasksById.get(plan.workItemId);
      if (!plan.id || linkedIds.has(String(plan.id)) || !sourceTask || sourceTask.productLineId !== task.productLineId) return [];
      return [{ plan, workItemTitle: String(sourceTask.title || ''), workItemCode: String(sourceTask.code || sourceTask.id) }];
    });
  }
  if (parts.length === 4 && parts[1] === 'work-items' && parts[3] === 'test-plan-associations' && method === 'POST') {
    const workItemId = parts[2];
    const task = findActiveTestTask(workItemId);
    if (!task) throw new Error('测试任务不存在或已归档');
    if (!task.productLineId) throw new Error('请先为当前测试任务关联产品线');
    const requestedIds = body.testPlanIds;
    if (!Array.isArray(requestedIds) || requestedIds.length === 0 || requestedIds.some((planId) => typeof planId !== 'string' || !planId.trim()) || new Set(requestedIds).size !== requestedIds.length) throw new Error('请选择有效的测试计划');
    const plans = getPlans();
    const tasksById = new Map(getWorkItems().filter((item) => item.category === 'test' && !item.deleted && !item.deleteFlag).map((item) => [item.id, item]));
    const selectedPlans = requestedIds.map((planId) => plans.find((plan) => plan.id === planId));
    if (selectedPlans.some((plan) => !plan)) throw new Error('部分测试计划不存在，请刷新后重试');
    if (selectedPlans.some((plan) => {
      const sourceTask = tasksById.get(plan!.workItemId);
      return !sourceTask || sourceTask.productLineId !== task.productLineId;
    })) throw new Error('仅可关联同一产品线的有效测试计划');
    const associations = getTestPlanAssociations();
    const existing = new Set(associations[workItemId] || []);
    const ownedPlanIds = new Set(plans.filter((plan) => plan.workItemId === workItemId).map((plan) => String(plan.id || '')));
    associations[workItemId] = [...new Set([...(associations[workItemId] || []), ...requestedIds.filter((planId) => !ownedPlanIds.has(planId))])];
    if (associations[workItemId].length !== existing.size || [...existing].some((planId) => !associations[workItemId].includes(planId))) write(KEYS.planAssociations, associations);
    return null;
  }
  if (parts.length >= 4 && parts[1] === 'work-items' && parts[3] === 'test-plans') {
    const workItemId = parts[2]; const plans = getPlans();
    if (method === 'GET') {
      const linkedIds = new Set(getTestPlanAssociations()[workItemId] || []);
      return plans.filter((plan) => plan.workItemId === workItemId || Boolean(plan.id && linkedIds.has(plan.id)));
    }
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
  if (['requirements', 'work-items', 'design-tasks', 'dev-tasks', 'bugs'].includes(parts[1])) throw new Error('暂不支持此任务或事项操作，数据未保存');
  if (method === 'GET') return [];
  if (method === 'POST') return { id: id('mock'), code: `MOCK-${Date.now()}` };
  return null;
}

const templateRoutes: Record<string, string> = {
  '/api/product-lines': 'productLines',
  '/api/research-template/roles': 'researchRoles',
  '/api/research-template/statuses': 'researchStatuses',
  '/api/work-item-categories': 'researchCategories',
  '/api/work-item-template': 'researchTypes',
  '/api/notification-template': 'researchNotifications',
};
const templateFileEndpoint = mockStateEndpoint('research-template');
let templateFile: Record<string, unknown> = {};
const templateReadWindow = createMockReadWindow();
let templateQueue: Promise<unknown> = Promise.resolve();
let templateReadFailure: { error: unknown } | undefined;

async function templateFileRequest(init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(templateFileEndpoint, { ...init, signal: AbortSignal.timeout(8000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || '项目 Mock 保存失败');
  return result;
}

let okrFilePersistence: ReturnType<typeof createOkrFilePersistence> | undefined;
export async function mockApiRequest(path: string, init: RequestInit = {}): Promise<any> {
  // Removed routes must not fall through to the permissive legacy Mock fallback.
  if (/^\/api\/work-item-field-configurations(?:[/?]|$)/.test(path) || /^\/api\/product-lines\/[^/]+\/child-type-rules(?:[/?]|$)/.test(path)) {
    throw new Error('旧字段配置与子任务规则功能已移除');
  }
  if (path.split('?')[0].startsWith('/api/okr/') && import.meta.env.MODE !== 'test') {
    okrFilePersistence ??= createOkrFilePersistence(fileCache());
    return okrFilePersistence.run(() => handleMockApiRequest(path, init), (init.method || 'GET').toUpperCase() === 'GET');
  }
  if (import.meta.env.MODE === 'test') return handleMockApiRequest(path, init);
  const clean = path.split('?')[0];
  const route = Object.keys(templateRoutes).find((route) => clean === route || clean.startsWith(`${route}/`));
  // Task normalization depends on product workflows even outside product-line routes.
  const needsTemplates = /^\/api\/(requirements|work-items|design-tasks|dev-tasks|bugs|test-cases|test-plans|test-case-directories|version-reviews)(\/|$)/.test(clean);
  if (!route && !needsTemplates) return handleMockApiRequest(path, init);
  const previousFailure = templateReadFailure;
  const operation = templateQueue.then(async () => {
    if (previousFailure !== templateReadFailure) throw templateReadFailure!.error;
    const readOnly = (init.method || 'GET').toUpperCase() === 'GET';
    if ((readOnly && !templateReadWindow.isFresh()) || !Object.keys(templateFile).length) {
      let latest: Record<string, unknown>;
      try { latest = await templateFileRequest(); }
      catch (error) { templateReadFailure = { error }; throw error; }
      templateFile = latest;
      for (const key of Object.values(templateRoutes)) {
        if (Object.prototype.hasOwnProperty.call(latest, key)) write(`shichuang.frontend.mock.${key}`, latest[key]);
      }
      templateReadWindow.markFresh();
    }
    if (readOnly || !route) return handleMockApiRequest(path, init);
    const key = templateRoutes[route];
    const storageKey = `shichuang.frontend.mock.${key}`;
    const previousLocal = localStorage.getItem(storageKey);
    const productId = /^\/api\/product-lines\/([^/]+)$/.exec(clean)?.[1];
    const basicFields = ['name', 'description', 'website', 'sort', 'visibility', 'commercialAvailability'];
    const body = bodyOf(init);
    const basicSave = productId && (init.method || 'GET').toUpperCase() === 'PUT' && Object.keys(body).every(field => basicFields.includes(field));
    if (basicSave) {
      const previousProducts = (templateFile.productLines || []) as ProductLine[];
      const previousProduct = previousProducts.find(product => product.id === decodeURIComponent(productId));
      if (!previousProduct) throw new Error('产品不存在，请刷新后重试');
      const changes = Object.fromEntries(Object.entries(body).filter(([field, value]) => JSON.stringify(value ?? null) !== JSON.stringify(previousProduct[field] ?? null)));
      const previous = Object.fromEntries(Object.keys(changes).map(field => [field, previousProduct[field] ?? null]));
      // Check against the latest file without replacing the baseline the user edited.
      const latest = await templateFileRequest();
      const current = (latest.productLines as ProductLine[] || []).find(product => product.id === previousProduct.id);
      if (!current) throw new Error('产品不存在，请刷新后重试');
      for (const [field, value] of Object.entries(changes)) {
        if (JSON.stringify(current[field] ?? null) !== JSON.stringify(previous[field]) && JSON.stringify(current[field] ?? null) !== JSON.stringify(value ?? null)) throw new Error('产品信息已被修改，请刷新产品信息后重试；当前填写内容已保留');
      }
      const response = await templateFileRequest({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'productLines', value: latest.productLines, productPatch: { id: previousProduct.id, previous, changes } }) });
      if (!Array.isArray(response.value)) throw new Error('产品保存结果无效，请刷新核对');
      templateFile = { ...latest, productLines: response.value };
      templateReadWindow.markFresh();
      for (const templateKey of Object.values(templateRoutes)) {
        if (Object.prototype.hasOwnProperty.call(templateFile, templateKey)) write(`shichuang.frontend.mock.${templateKey}`, templateFile[templateKey]);
      }
      return (response.value as ProductLine[]).find(product => product.id === previousProduct.id);
    }
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
      templateReadWindow.invalidate();
      if (previousLocal === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, previousLocal);
      throw error;
    }
  });
  templateQueue = operation.catch(() => { templateReadWindow.invalidate(); });
  return operation;
}
