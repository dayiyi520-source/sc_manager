import { apiRequest } from './apiClient';
import type { ProductLine, ProductLineMember, ProductLineWorkItemCategory, ProductLineWorkItemType, VersionIteration, RequirementTask, RequirementMedia, DefectBug, DevTask } from '../types';
import type { PageResult } from './apiClient';
import type { SaveTestCaseInput, SaveTestPlanInput, SaveVersionTestReportInput, TestCase, TestCaseDirectory, TestCasePage, TestPlan, VersionTestReport, VersionTestReportListItem } from '../types/testManagement';
import type { SaveVersionReviewInput, VersionReview, VersionReviewListItem } from '../types/versionReview';

export type WorkItemReview = { title: string; content: string; contentHtml: string; media: RequirementMedia[]; revision: number; updatedAt?: string };

type SpecialTaskKind = 'bug' | 'dev';
type BusinessTaskKind = 'presales' | 'delivery' | 'ops';
export type WorkItemCategoryKey = string;
export type WorkItemAssociations = Pick<UnifiedWorkItem, 'projectId' | 'projectName' | 'needsCollaboration' | 'relatedTaskIds' | 'sourceWorkOrderIds' | 'sourceWorkOrderTitles'>;
export type WorkItemCategoryDefinition = { id: string; code: WorkItemCategoryKey; name: string; displayName: string; iconKey: string; capabilityType: 'STANDARD' | 'TEST_CASE'; sort: number; enabled: boolean; builtIn: boolean; revision: number };
export type WorkItemFieldScene = 'CREATE' | 'CREATE_CHILD' | 'LIST' | 'ITERATION' | 'DETAIL';
export type WorkItemFieldConfiguration = { fieldCode: string; label: string; description?: string; fieldType: string; visible: boolean; required: boolean; editable?: boolean; defaultValue?: string | string[] | number | boolean | null; sort: number; locked: boolean };
export type WorkItemFieldConfigurationSet = { categoryCode: string; scenes: Array<{ scene: WorkItemFieldScene; fields: WorkItemFieldConfiguration[] }> };
export type WorkItemWorkflow = {
  id: string;
  category: WorkItemCategoryKey;
  taskTypeId?: string | null;
  name: string;
  workflowVersion: number;
  status: 'DRAFT' | 'PUBLISHED' | string;
  revision: number;
  definition: {
    states: Array<{ key: string; name: string; group: string; initial: boolean; successful: boolean; enabled: boolean; stage: string; color: string }>;
    transitions: Array<{ key: string; from: string; to: string; name: string }>;
  };
};
export type WorkItemTemplateType = ProductLineWorkItemType & {
  revision?: number;
  workflow?: WorkItemWorkflow & { templateTypeId?: string | null };
};
export type UnifiedWorkItem = {
  projectId?: string; projectName?: string; needsCollaboration?: Array<'design' | 'dev' | 'test'>; relatedTaskIds?: string[]; sourceWorkOrderIds?: string[]; sourceWorkOrderTitles?: string[];
  id: string; code: string; category: WorkItemCategoryKey; title: string; productLineId: string;
  requirementId?: string | null; requirementTitle?: string | null; requirementInitiatorName?: string | null; customerId?: string | null; customerName?: string | null; assigneeName?: string; sourceType?: string; status?: { name?: string; group?: string; successful?: boolean };
  versionName?: string; taskTypeId?: string | null; workflowId?: string | null; statusKey?: string | null; statusColor?: string;
  priority?: string; severity?: string | null; parentWorkItemId?: string | null; versionId?: string | null; dueDate?: string | null;
  plannedStartDate?: string | null; plannedEndDate?: string | null; expectedCompleteDate?: string | null; completedAt?: string | null;
  estimatedHours?: number; actualHours?: number; createdAt?: string; creatorName?: string; ccNames?: string | string[]; revision?: number; potentialBlockingDefect?: boolean; hasChildren?: boolean;
};
export type WorkItemTransitionAction = {
  edgeKey: string; name: string; to: string; requiredFields: string[]; allowed: boolean; reasons: string[];
};
export type WorkItemStatusOption = {
  key: string; name: string; color: string; current: boolean; allowed: boolean; reasons: string[];
};
export type WorkItemTransitionOptions = {
  revision: number; actions: WorkItemTransitionAction[]; statuses: WorkItemStatusOption[];
};
export type AutomationRule = {
  id: string; name: string; enabled: boolean; triggerType: 'STATUS_CHANGED'; triggerTypeId: string;
  triggerStateKey: string; conditionType: 'NONE' | 'TASK_TYPE' | 'PRIORITY' | 'MULTI'; conditionValue?: string | null;
  conditions?: Array<Record<string, unknown>>; actionType: 'CREATE_SUBTASK' | 'DERIVE_PARENT_STATUS' | 'DISPATCH_REQUIREMENT_TASKS' | 'SET_ACTUAL_START_TIME' | 'MULTI';
  actions?: Array<Record<string, unknown>>; actionConfig: Record<string, unknown> | string;
  revision: number; updatedAt?: string;
};
export type AutomationLog = { id: string; ruleId: string; ruleName?: string; workItemId: string; workItemTitle?: string; result: string; detail?: string; createdAt: string };
export type NotificationEvent = 'ASSIGNED' | 'STATUS_CHANGED' | 'COMMENTED' | 'DELETED' | 'REPLIED' | 'MENTIONED' | 'CC_ADDED' | 'PARTICIPANT_ADDED';
export type NotificationRule = { event: NotificationEvent; recipients: string[]; channels: Array<'IN_APP' | 'DINGTALK'> };
export type NotificationSettings = { categories: Array<{ categoryCode: string; rules: NotificationRule[] }> };
export type ProductRoleTemplate = { id: string; name: string; responsibility: string; sort: number; revision: number; updatedAt?: string };
export type ResearchStatusScope = 'PRODUCT' | 'ITERATION';
export type ResearchStatusTemplate = { id: string; scope: ResearchStatusScope; name: string; phase: '待开始' | '处理中' | '已完成' | '已结束'; color: string; initial: boolean; enabled: boolean; sort: number; revision: number };
export type ArchivedProductLine = { id: string; name: string; code: string; ownerName?: string; archivedAt: string; archivedByName?: string };
export type RecycleBinItem = { id: string; category: WorkItemCategoryKey; title: string; code: string; versionId?: string | null; versionName: string; operatorName: string; operatedAt: string; revision: number };

const specialTaskPath = (kind: SpecialTaskKind) => kind === 'bug' ? '/api/bugs' : '/api/dev-tasks';
const businessTaskPath = (kind: BusinessTaskKind) => `/api/${kind}-tasks`;
const querySuffix = (values: Record<string,string|number>) => { const value = new URLSearchParams(Object.entries(values).map(([k,v])=>[k,String(v)])).toString(); return value ? `?${value}` : ''; };
const page = <T>(value: PageResult<T> | T[]): PageResult<T> => Array.isArray(value) ? ({ items: value, page: 1, pageSize: value.length || 20, total: value.length }) : value;

export const productRepository = {
  iterationTimeline: (lineId: string) => apiRequest<UnifiedWorkItem[]>(`/api/product-lines/${encodeURIComponent(lineId)}/iteration-timeline`),
  productRoleTemplates: () => apiRequest<ProductRoleTemplate[]>('/api/research-template/roles'),
  createProductRoleTemplate: (body: Pick<ProductRoleTemplate, 'name' | 'responsibility' | 'sort'>) => apiRequest<ProductRoleTemplate>('/api/research-template/roles', { method: 'POST', body: JSON.stringify(body) }),
  updateProductRoleTemplate: (id: string, body: Pick<ProductRoleTemplate, 'name' | 'responsibility' | 'sort' | 'revision'>) => apiRequest<ProductRoleTemplate>(`/api/research-template/roles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProductRoleTemplate: (id: string, revision: number) => apiRequest<void>(`/api/research-template/roles/${id}?revision=${revision}`, { method: 'DELETE' }),
  researchStatusTemplates: (scope: ResearchStatusScope) => apiRequest<ResearchStatusTemplate[]>(`/api/research-template/statuses?scope=${scope}`),
  saveResearchStatusTemplates: (scope: ResearchStatusScope, body: { originals: Array<{ id: string; revision: number }>; states: Array<Omit<ResearchStatusTemplate, 'scope' | 'revision'> & { revision?: number }> }) => apiRequest<ResearchStatusTemplate[]>(`/api/research-template/statuses?scope=${scope}`, { method: 'PUT', body: JSON.stringify(body) }),
  createResearchStatusTemplate: (scope: ResearchStatusScope, body: Omit<ResearchStatusTemplate, 'id' | 'scope' | 'revision'>) => apiRequest<ResearchStatusTemplate>(`/api/research-template/statuses?scope=${scope}`, { method: 'POST', body: JSON.stringify(body) }),
  updateResearchStatusTemplate: (id: string, body: Omit<ResearchStatusTemplate, 'id' | 'scope'>) => apiRequest<ResearchStatusTemplate>(`/api/research-template/statuses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteResearchStatusTemplate: (id: string, revision: number) => apiRequest<void>(`/api/research-template/statuses/${id}?revision=${revision}`, { method: 'DELETE' }),
  workItemCategories: () => apiRequest<WorkItemCategoryDefinition[]>('/api/work-item-categories'),
  createWorkItemCategory: (body: Pick<WorkItemCategoryDefinition, 'code' | 'name' | 'displayName' | 'iconKey' | 'capabilityType' | 'sort' | 'enabled'>) => apiRequest<{ id: string; code: string }>('/api/work-item-categories', { method: 'POST', body: JSON.stringify(body) }),
  updateWorkItemCategory: (id: string, body: Partial<Pick<WorkItemCategoryDefinition, 'name' | 'displayName' | 'iconKey' | 'capabilityType' | 'sort' | 'enabled'>>) => apiRequest<void>(`/api/work-item-categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWorkItemCategory: (id: string) => apiRequest<void>(`/api/work-item-categories/${id}`, { method: 'DELETE' }),
  workItemFieldConfigurations: (categoryCode: string) => apiRequest<WorkItemFieldConfigurationSet>(`/api/work-item-field-configurations?categoryCode=${encodeURIComponent(categoryCode)}`),
  saveWorkItemFieldConfigurations: (categoryCode: string, scene: WorkItemFieldScene, fields: WorkItemFieldConfiguration[]) => apiRequest<WorkItemFieldConfigurationSet>(`/api/work-item-field-configurations/${encodeURIComponent(categoryCode)}/${scene}`, { method: 'PUT', body: JSON.stringify({ fields }) }),
  workItemTemplate: () => apiRequest<WorkItemTemplateType[]>('/api/work-item-template'),
  notificationTemplate: () => apiRequest<NotificationSettings>('/api/notification-template'),
  saveNotificationTemplate: (body: NotificationSettings) => apiRequest<NotificationSettings>('/api/notification-template', { method: 'PUT', body: JSON.stringify(body) }),
  productNotificationSettings: (id: string) => apiRequest<NotificationSettings>(`/api/product-lines/${id}/notification-settings`),
  saveProductNotificationSettings: (id: string, body: NotificationSettings) => apiRequest<NotificationSettings>(`/api/product-lines/${id}/notification-settings`, { method: 'PUT', body: JSON.stringify(body) }),
  createWorkItemTemplateType: (body: Pick<ProductLineWorkItemType, 'category' | 'name' | 'description' | 'enabled' | 'isDefault'> & { workflow: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'> }) => apiRequest<{ id: string }>('/api/work-item-template/types', { method: 'POST', body: JSON.stringify(body) }),
  updateWorkItemTemplateType: (id: string, body: Partial<Pick<ProductLineWorkItemType, 'category' | 'name' | 'description' | 'enabled' | 'isDefault'>>) => apiRequest<void>(`/api/work-item-template/types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWorkItemTemplateType: (id: string) => apiRequest<void>(`/api/work-item-template/types/${id}`, { method: 'DELETE' }),
  updateWorkItemTemplateWorkflow: (id: string, body: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'> & { revision?: number }) => apiRequest<void>(`/api/work-item-template/types/${id}/workflow`, { method: 'PUT', body: JSON.stringify(body) }),
  productLines: (keyword = '') => apiRequest<ProductLine[]>(`/api/product-lines?keyword=${encodeURIComponent(keyword)}`),
  archivedProductLines: () => apiRequest<ArchivedProductLine[]>('/api/product-lines/archived'),
  createProductLine: (body: Partial<ProductLine>) => apiRequest<{ id: string; code: string }>('/api/product-lines', { method: 'POST', body: JSON.stringify(body) }),
  updateProductLine: (id: string, body: Partial<ProductLine>) => apiRequest<void>(`/api/product-lines/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  activateProductLine: (id: string) => apiRequest<void>(`/api/product-lines/${id}/activate`, { method: 'POST' }),
  disableProductLine: (id: string) => apiRequest<void>(`/api/product-lines/${id}/disable`, { method: 'POST' }),
  archiveProductLine: (id: string) => apiRequest<void>(`/api/product-lines/${id}/archive`, { method: 'POST' }),
  restoreProductLine: (id: string) => apiRequest<void>(`/api/product-lines/${id}/restore`, { method: 'POST' }),
  deleteProductLine: (id: string) => apiRequest<void>(`/api/product-lines/${id}`, { method: 'DELETE' }),
  recycleBin: (id: string) => apiRequest<RecycleBinItem[]>(`/api/product-lines/${id}/recycle-bin`),
  restoreRecycleBinItem: (lineId: string, id: string, revision: number) => apiRequest<void>(`/api/product-lines/${lineId}/recycle-bin/${id}/restore`, { method: 'POST', body: JSON.stringify({ revision }) }),
  purgeRecycleBinItem: (lineId: string, id: string, revision: number) => apiRequest<void>(`/api/product-lines/${lineId}/recycle-bin/${id}?revision=${revision}`, { method: 'DELETE' }),
  addProductLineMember: (id: string, body: Pick<ProductLineMember, 'userId' | 'role'>) => apiRequest<void>(`/api/product-lines/${id}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateProductLineMember: (id: string, memberId: string, body: Pick<ProductLineMember, 'role'>) => apiRequest<void>(`/api/product-lines/${id}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeProductLineMember: (id: string, memberId: string) => apiRequest<void>(`/api/product-lines/${id}/members/${memberId}`, { method: 'DELETE' }),
  workItemTypes: (id: string, category?: ProductLineWorkItemCategory) => apiRequest<ProductLineWorkItemType[]>(`/api/product-lines/${id}/work-item-types${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  childTypeRules: (id: string) => apiRequest<Array<{ parentTypeId: string; childTypeId: string; enabled: boolean }>>(`/api/product-lines/${id}/child-type-rules`),
  createWorkItemType: (id: string, body: Pick<ProductLineWorkItemType, 'category' | 'name' | 'description' | 'enabled' | 'isDefault'> & { workflow: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'> }) => apiRequest<{ id: string; workflowId: string }>(`/api/product-lines/${id}/work-item-types`, { method: 'POST', body: JSON.stringify(body) }),
  updateWorkItemType: (id: string, typeId: string, body: Partial<Pick<ProductLineWorkItemType, 'category' | 'name' | 'description' | 'enabled' | 'isDefault'>>) => apiRequest<void>(`/api/product-lines/${id}/work-item-types/${typeId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWorkItemType: (id: string, typeId: string) => apiRequest<void>(`/api/product-lines/${id}/work-item-types/${typeId}`, { method: 'DELETE' }),
  typeWorkflows: (id: string, typeId: string) => apiRequest<WorkItemWorkflow[]>(`/api/product-lines/${id}/work-item-types/${typeId}/workflows`),
  createTypeWorkflow: (id: string, typeId: string, body: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'>) => apiRequest<WorkItemWorkflow>(`/api/product-lines/${id}/work-item-types/${typeId}/workflows`, { method: 'POST', body: JSON.stringify({ ...body, revision: 0 }) }),
  updateTypeWorkflow: (id: string, typeId: string, workflowId: string, body: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'> & { revision: number }) => apiRequest<WorkItemWorkflow>(`/api/product-lines/${id}/work-item-types/${typeId}/workflows/${workflowId}`, { method: 'PUT', body: JSON.stringify(body) }),
  publishWorkflow: (id: string, workflowId: string, revision: number) => apiRequest<WorkItemWorkflow>(`/api/product-lines/${id}/workflows/${workflowId}/publish`, { method: 'POST', body: JSON.stringify({ revision }) }),
  automationRules: (id: string, keyword = '') => apiRequest<{ enabled: boolean; rules: AutomationRule[] }>(`/api/product-lines/${id}/automation-rules?keyword=${encodeURIComponent(keyword)}`),
  automationTemplate: () => apiRequest<{ enabled: boolean; rules: AutomationRule[] }>('/api/automation-template/rules'),
  createAutomationTemplateRule: (body: Omit<AutomationRule, 'id' | 'revision' | 'updatedAt'>) => apiRequest<AutomationRule>('/api/automation-template/rules', { method: 'POST', body: JSON.stringify(body) }),
  updateAutomationTemplateRule: (ruleId: string, body: Omit<AutomationRule, 'id' | 'updatedAt'>) => apiRequest<AutomationRule>(`/api/automation-template/rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAutomationTemplateRule: (ruleId: string) => apiRequest<void>(`/api/automation-template/rules/${ruleId}`, { method: 'DELETE' }),
  updateAutomationTemplateSetting: (enabled: boolean) => apiRequest<{ enabled: boolean }>('/api/automation-template/setting', { method: 'PUT', body: JSON.stringify({ enabled }) }),
  createAutomationRule: (id: string, body: Omit<AutomationRule, 'id' | 'revision' | 'updatedAt'>) => apiRequest<AutomationRule>(`/api/product-lines/${id}/automation-rules`, { method: 'POST', body: JSON.stringify(body) }),
  updateAutomationRule: (id: string, ruleId: string, body: Omit<AutomationRule, 'id' | 'updatedAt'>) => apiRequest<AutomationRule>(`/api/product-lines/${id}/automation-rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAutomationRule: (id: string, ruleId: string) => apiRequest<void>(`/api/product-lines/${id}/automation-rules/${ruleId}`, { method: 'DELETE' }),
  updateAutomationSetting: (id: string, enabled: boolean) => apiRequest<{ enabled: boolean }>(`/api/product-lines/${id}/automation-rules/setting`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
  automationLogs: (id: string) => apiRequest<AutomationLog[]>(`/api/product-lines/${id}/automation-rules/logs`),
  workItemDetail: (lineId: string, id: string) => apiRequest<Record<string, any>>(`/api/work-items/${id}?productLineId=${encodeURIComponent(lineId)}`),
  workItemReview: (lineId: string, id: string) => apiRequest<WorkItemReview | null>(`/api/work-items/${id}/review?productLineId=${encodeURIComponent(lineId)}`),
  saveWorkItemReview: (lineId: string, id: string, review: WorkItemReview) => apiRequest<WorkItemReview>(`/api/work-items/${id}/review?productLineId=${encodeURIComponent(lineId)}`, { method: 'PUT', body: JSON.stringify(review) }),
  workItemActivities: (lineId: string, id: string) => apiRequest<Record<string, unknown>[]>(`/api/work-items/${id}/activities?productLineId=${encodeURIComponent(lineId)}`),
  commentWorkItem: (lineId: string, id: string, content: string) => apiRequest<void>(`/api/work-items/${id}/comments?productLineId=${encodeURIComponent(lineId)}`, { method: 'POST', body: JSON.stringify({ content }) }),
  batchWorkItems: (body: { targets: Array<{ productLineId: string; id: string; revision: number }>; operation: string; value?: string; participants?: string[] }) => apiRequest<number>('/api/work-items/batch', { method: 'POST', body: JSON.stringify(body) }),
  workItems: (productLineId: string, category = '', keyword = '', values: { page?: number; pageSize?: number } = {}) => apiRequest<{ page: { items: UnifiedWorkItem[]; total: number; page?: number; pageSize?: number } }>(`/api/work-items?productLineId=${encodeURIComponent(productLineId)}&category=${encodeURIComponent(category)}&keyword=${encodeURIComponent(keyword)}&page=${values.page || 1}&pageSize=${values.pageSize || 100}`),
  createWorkItem: (body: WorkItemAssociations & { requestId: string; productLineId: string; category: WorkItemCategoryKey; taskTypeId: string; title: string; severity?: string; type?: string; env?: string; description?: string; descriptionHtml?: string; expectedGoal?: string; versionId?: string; requirementId?: string; customerId?: string; customerName?: string; parentWorkItemId?: string; assigneeId?: string; ccNames?: string[]; media?: RequirementMedia[]; priority: string; plannedStartDate?: string; plannedEndDate?: string; expectedCompleteDate?: string; estimatedHours?: number; actualHours?: number }) => apiRequest<Record<string, any>>('/api/work-items', { method: 'POST', body: JSON.stringify(body) }),
  updateWorkItem: (productLineId: string, id: string, body: WorkItemAssociations & { title?: string; description?: string; descriptionHtml?: string; expectedGoal?: string; versionId?: string; assigneeName?: string; priority?: string; plannedStartDate?: string; plannedEndDate?: string; expectedCompleteDate?: string; estimatedHours?: number; actualHours?: number; revision: number }) => apiRequest<Record<string, any>>(`/api/work-items/${id}?productLineId=${encodeURIComponent(productLineId)}`, { method: 'PUT', body: JSON.stringify(body) }),
  workItemTransitions: (productLineId: string, id: string) => apiRequest<WorkItemTransitionOptions>(`/api/work-items/${id}/transitions?productLineId=${encodeURIComponent(productLineId)}`),
  transitionWorkItem: (productLineId: string, id: string, body: { edgeKey: string; revision: number; reason?: string; actualHours?: number }) => apiRequest<Record<string, any>>(`/api/work-items/${id}/transitions?productLineId=${encodeURIComponent(productLineId)}`, { method: 'POST', body: JSON.stringify(body) }),
  deleteWorkItem: (productLineId: string, id: string, revision: number) => apiRequest<void>(`/api/work-items/${id}?productLineId=${encodeURIComponent(productLineId)}&revision=${revision}`, { method: 'DELETE' }),
  createWorkItemRelation: (productLineId: string, id: string, targetId: string) => apiRequest<Record<string, unknown>>(`/api/work-items/${id}/relations?productLineId=${encodeURIComponent(productLineId)}`, { method: 'POST', body: JSON.stringify({ targetId, type: 'RELATES_TO', scope: 'FINISH' }) }),
  workItemRelations: (productLineId: string, id: string) => apiRequest<{ relations: Array<{ id: string; sourceId: string; targetId: string; type: string; scope?: string; revision?: number }> }>(`/api/work-items/${id}/relations?productLineId=${encodeURIComponent(productLineId)}`),
  requirementSummary: (productLineId: string, requirementId: string) => apiRequest<{ requirement?: UnifiedWorkItem; linkedItems: UnifiedWorkItem[] }>(`/api/requirements/${encodeURIComponent(requirementId)}/summary?productLineId=${encodeURIComponent(productLineId)}`),
  productLineActivities: (id: string) => apiRequest<ProductLine['activities']>(`/api/product-lines/${id}/activities`),
  createVersion: (lineId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions`, { method: 'POST', body: JSON.stringify(body) }),
  updateVersion: (lineId: string, versionId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVersion: (lineId: string, versionId: string) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}`, { method: 'DELETE' }),
  assignRequirementToVersion: (lineId: string, versionId: string, requirementId: string) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}/requirements/${requirementId}`, { method: 'POST' }),
  assignWorkItemToVersion: (lineId: string, versionId: string, kind: 'requirement' | 'design' | 'bug' | 'dev' | 'test', itemId: string) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}/work-items/${kind}/${itemId}`, { method: 'POST' }),
  unassignWorkItemFromVersion: (lineId: string, versionId: string, kind: 'requirement' | 'design' | 'bug' | 'dev' | 'test', itemId: string) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}/work-items/${kind}/${itemId}`, { method: 'DELETE' }),
  tasks: async (taskType: SpecialTaskKind, values: Record<string,string|number> = {}) => page(await apiRequest<PageResult<DefectBug | DevTask> | Array<DefectBug | DevTask>>(`${specialTaskPath(taskType)}${querySuffix(values)}`)),
  task: (taskType: SpecialTaskKind, id: string) => apiRequest<DefectBug | DevTask>(`${specialTaskPath(taskType)}/${id}`),
  createTask: (taskType: SpecialTaskKind, body: Partial<DefectBug> | Partial<DevTask>) => apiRequest<{ id: string; code: string }>(specialTaskPath(taskType), { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskType: SpecialTaskKind, id: string, body: Record<string, unknown>) => apiRequest<void>(`${specialTaskPath(taskType)}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  designTasks: async (values: Record<string,string|number> = {}) => page(await apiRequest<PageResult<RequirementTask> | RequirementTask[]>(`/api/design-tasks${querySuffix(values)}`)),
  createDesignTask: (body: Partial<RequirementTask>) => apiRequest<{ id: string; code: string }>('/api/design-tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateDesignTask: (id: string, body: Record<string, unknown>) => apiRequest<void>(`/api/design-tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  businessTasks: async (kind: BusinessTaskKind, values: Record<string,string|number> = {}) => page(await apiRequest<PageResult<RequirementTask> | RequirementTask[]>(`${businessTaskPath(kind)}${querySuffix(values)}`)),
  businessTask: (kind: BusinessTaskKind, id: string) => apiRequest<RequirementTask>(`${businessTaskPath(kind)}/${id}`),
  businessTaskActivities: (kind: BusinessTaskKind, id: string) => apiRequest<Record<string, unknown>[]>(`${businessTaskPath(kind)}/${id}/activities`),
  commentBusinessTask: (kind: BusinessTaskKind, id: string, content: string) => apiRequest<void>(`${businessTaskPath(kind)}/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  createBusinessTask: (kind: BusinessTaskKind, body: Partial<RequirementTask>) => apiRequest<{ id: string; code: string }>(businessTaskPath(kind), { method: 'POST', body: JSON.stringify(body) }),
  updateBusinessTask: (kind: BusinessTaskKind, id: string, body: Record<string, unknown>) => apiRequest<void>(`${businessTaskPath(kind)}/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  ,testCaseDirectories: (lineId: string) => apiRequest<TestCaseDirectory[]>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories`)
  ,createTestCaseDirectory: (lineId: string, body: { parentId?: string | null; productLineId?: string; name: string; sort?: number }) => apiRequest<TestCaseDirectory>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories`, { method: 'POST', body: JSON.stringify(body) })
  ,renameTestCaseDirectory: (lineId: string, directoryId: string, name: string) => apiRequest<TestCaseDirectory>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories/${encodeURIComponent(directoryId)}`, { method: 'PUT', body: JSON.stringify({ name }) })
  ,deleteTestCaseDirectory: (lineId: string, directoryId: string) => apiRequest<void>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories/${encodeURIComponent(directoryId)}`, { method: 'DELETE' })
  ,copyTestCaseDirectory: (lineId: string, directoryId: string, body: { parentId?: string | null; name?: string }) => apiRequest<TestCaseDirectory>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories/${encodeURIComponent(directoryId)}/copy`, { method: 'POST', body: JSON.stringify(body) })
  ,testCases: (lineId: string, filters: { directoryId?: string; includeDescendants?: boolean; keyword?: string; priority?: string; ownerId?: string; creatorName?: string; participantName?: string; enabled?: boolean; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); });
    const query = params.toString();
    return apiRequest<TestCasePage>(`/api/product-lines/${encodeURIComponent(lineId)}/test-cases${query ? `?${query}` : ''}`);
  }
  ,testCaseDetail: (lineId: string, caseId: string) => apiRequest<TestCase>(`/api/product-lines/${encodeURIComponent(lineId)}/test-cases/${encodeURIComponent(caseId)}`)
  ,createTestCase: (lineId: string, body: SaveTestCaseInput) => apiRequest<TestCase>(`/api/product-lines/${encodeURIComponent(lineId)}/test-cases`, { method: 'POST', body: JSON.stringify(body) })
  ,updateTestCase: (lineId: string, caseId: string, body: SaveTestCaseInput) => apiRequest<TestCase>(`/api/product-lines/${encodeURIComponent(lineId)}/test-cases/${encodeURIComponent(caseId)}`, { method: 'PUT', body: JSON.stringify(body) })
  ,setTestCaseEnabled: (lineId: string, caseId: string, revision: number, enabled: boolean) => apiRequest<TestCase>(`/api/product-lines/${encodeURIComponent(lineId)}/test-cases/${encodeURIComponent(caseId)}/enabled`, { method: 'PUT', body: JSON.stringify({ revision, enabled }) })
  ,batchUpdateTestCases: (lineId: string, body: { caseIds: string[]; operation: 'MOVE' | 'OWNER' | 'PRIORITY' | 'DELETE' | 'TYPE'; value?: string }) => apiRequest<void>(`/api/product-lines/${encodeURIComponent(lineId)}/test-cases/batch`, { method: 'POST', body: JSON.stringify(body) })
  ,testPlans: (workItemId: string) => apiRequest<TestPlan[]>(`/api/work-items/${encodeURIComponent(workItemId)}/test-plans`)
  ,createTestPlan: (workItemId: string, body: SaveTestPlanInput) => apiRequest<TestPlan>(`/api/work-items/${encodeURIComponent(workItemId)}/test-plans`, { method: 'POST', body: JSON.stringify(body) })
  ,saveTestPlan: (workItemId: string, planId: string, body: SaveTestPlanInput) => apiRequest<TestPlan>(`/api/work-items/${encodeURIComponent(workItemId)}/test-plans/${encodeURIComponent(planId)}`, { method: 'PUT', body: JSON.stringify(body) })
  ,versionTestReports: (lineId: string, versionId: string) => apiRequest<VersionTestReportListItem[]>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/test-reports`)
  ,testReports: () => apiRequest<VersionTestReportListItem[]>('/api/test-reports')
  ,versionTestReport: (lineId: string, versionId: string, reportId: string) => apiRequest<VersionTestReport>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/test-reports/${encodeURIComponent(reportId)}`)
  ,createVersionTestReport: (lineId: string, versionId: string, body: SaveVersionTestReportInput) => apiRequest<VersionTestReport>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/test-reports`, { method: 'POST', body: JSON.stringify(body) })
  ,updateVersionTestReport: (lineId: string, versionId: string, reportId: string, body: SaveVersionTestReportInput) => apiRequest<VersionTestReport>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/test-reports/${encodeURIComponent(reportId)}`, { method: 'PUT', body: JSON.stringify(body) })
  ,deleteVersionTestReport: (lineId: string, versionId: string, reportId: string, revision: number) => apiRequest<void>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/test-reports/${encodeURIComponent(reportId)}?revision=${revision}`, { method: 'DELETE' })
  ,versionReviews: (lineId: string, versionId: string) => apiRequest<VersionReviewListItem[]>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/reviews`)
  ,allVersionReviews: () => apiRequest<VersionReviewListItem[]>('/api/version-reviews')
  ,versionReview: (lineId: string, versionId: string, reviewId: string) => apiRequest<VersionReview>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/reviews/${encodeURIComponent(reviewId)}`)
  ,createVersionReview: (lineId: string, versionId: string, body: SaveVersionReviewInput) => apiRequest<VersionReview>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/reviews`, { method: 'POST', body: JSON.stringify(body) })
  ,createAndSubmitVersionReview: (lineId: string, versionId: string, body: SaveVersionReviewInput) => apiRequest<VersionReview>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/reviews/submit`, { method: 'POST', body: JSON.stringify(body) })
  ,updateVersionReview: (lineId: string, versionId: string, reviewId: string, body: SaveVersionReviewInput) => apiRequest<VersionReview>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/reviews/${encodeURIComponent(reviewId)}`, { method: 'PUT', body: JSON.stringify(body) })
  ,updateAndSubmitVersionReview: (lineId: string, versionId: string, reviewId: string, body: SaveVersionReviewInput) => apiRequest<VersionReview>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/reviews/${encodeURIComponent(reviewId)}/submit`, { method: 'PUT', body: JSON.stringify(body) })
  ,submitVersionReview: (lineId: string, versionId: string, reviewId: string, revision: number) => apiRequest<VersionReview>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/reviews/${encodeURIComponent(reviewId)}/submit`, { method: 'POST', body: JSON.stringify({ revision }) })
  ,deleteVersionReview: (lineId: string, versionId: string, reviewId: string, revision: number) => apiRequest<void>(`/api/product-lines/${encodeURIComponent(lineId)}/versions/${encodeURIComponent(versionId)}/reviews/${encodeURIComponent(reviewId)}`, { method: 'DELETE', body: JSON.stringify({ revision }) })
};
