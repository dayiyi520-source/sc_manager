import { apiRequest } from './apiClient';
import type { ProductLine, ProductLineMember, ProductLineWorkItemCategory, ProductLineWorkItemType, VersionIteration, RequirementTask, DefectBug, DevTask } from '../types';
import type { PageResult } from './apiClient';
import type { CreateTestExecutionInput, SaveTestCaseInput, SaveTestPlanInput, TestCase, TestCaseDirectory, TestCasePage, TestEvidence, TestExecution, TestExecutionScope, TestPlan, TestResultStatus, TestTaskOverview } from '../types/testManagement';

type SpecialTaskKind = 'bug' | 'dev';
type BusinessTaskKind = 'presales' | 'delivery' | 'ops';
export type WorkItemCategoryKey = 'requirement' | 'design' | 'dev' | 'test' | 'bug';
export type WorkItemWorkflow = {
  id: string;
  category: WorkItemCategoryKey;
  taskTypeId?: string | null;
  name: string;
  workflowVersion: number;
  status: 'DRAFT' | 'PUBLISHED' | string;
  revision: number;
  definition: { states: Array<Record<string, unknown>>; transitions: Array<Record<string, unknown>> };
};
export type UnifiedWorkItem = {
  id: string; code: string; category: WorkItemCategoryKey; title: string; productLineId: string;
  requirementId?: string | null; assigneeName?: string; status?: { name?: string; group?: string; successful?: boolean };
  taskTypeId?: string | null; workflowId?: string | null; statusKey?: string | null; statusColor?: string;
  priority?: string; parentWorkItemId?: string | null; versionId?: string | null; dueDate?: string | null;
  estimatedHours?: number; actualHours?: number; createdAt?: string; revision?: number; potentialBlockingDefect?: boolean; hasChildren?: boolean;
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
  conditions?: Array<Record<string, unknown>>; actionType: 'CREATE_SUBTASK' | 'DERIVE_PARENT_STATUS' | 'MULTI';
  actions?: Array<Record<string, unknown>>; actionConfig: Record<string, unknown> | string;
  revision: number; updatedAt?: string;
};
export type AutomationLog = { id: string; ruleId: string; workItemId: string; result: string; detail?: string; createdAt: string };

const specialTaskPath = (kind: SpecialTaskKind) => kind === 'bug' ? '/api/bugs' : '/api/dev-tasks';
const businessTaskPath = (kind: BusinessTaskKind) => `/api/${kind}-tasks`;
const querySuffix = (values: Record<string,string|number>) => { const value = new URLSearchParams(Object.entries(values).map(([k,v])=>[k,String(v)])).toString(); return value ? `?${value}` : ''; };
const page = <T>(value: PageResult<T> | T[]): PageResult<T> => Array.isArray(value) ? ({ items: value, page: 1, pageSize: value.length || 20, total: value.length }) : value;

export const productRepository = {
  productLines: (keyword = '') => apiRequest<ProductLine[]>(`/api/product-lines?keyword=${encodeURIComponent(keyword)}`),
  createProductLine: (body: Partial<ProductLine>) => apiRequest<{ id: string; code: string }>('/api/product-lines', { method: 'POST', body: JSON.stringify(body) }),
  updateProductLine: (id: string, body: Partial<ProductLine>) => apiRequest<void>(`/api/product-lines/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  addProductLineMember: (id: string, body: Pick<ProductLineMember, 'userId' | 'role'>) => apiRequest<void>(`/api/product-lines/${id}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateProductLineMember: (id: string, memberId: string, body: Pick<ProductLineMember, 'role'>) => apiRequest<void>(`/api/product-lines/${id}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeProductLineMember: (id: string, memberId: string) => apiRequest<void>(`/api/product-lines/${id}/members/${memberId}`, { method: 'DELETE' }),
  workItemTypes: (id: string, category?: ProductLineWorkItemCategory) => apiRequest<ProductLineWorkItemType[]>(`/api/product-lines/${id}/work-item-types${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  createWorkItemType: (id: string, body: Pick<ProductLineWorkItemType, 'category' | 'name' | 'description' | 'enabled' | 'isDefault'> & { workflow: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'> }) => apiRequest<{ id: string; workflowId: string }>(`/api/product-lines/${id}/work-item-types`, { method: 'POST', body: JSON.stringify(body) }),
  updateWorkItemType: (id: string, typeId: string, body: Partial<Pick<ProductLineWorkItemType, 'category' | 'name' | 'description' | 'enabled' | 'isDefault'>>) => apiRequest<void>(`/api/product-lines/${id}/work-item-types/${typeId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWorkItemType: (id: string, typeId: string) => apiRequest<void>(`/api/product-lines/${id}/work-item-types/${typeId}`, { method: 'DELETE' }),
  workflows: (id: string) => apiRequest<WorkItemWorkflow[]>(`/api/product-lines/${id}/workflows`),
  typeWorkflows: (id: string, typeId: string) => apiRequest<WorkItemWorkflow[]>(`/api/product-lines/${id}/work-item-types/${typeId}/workflows`),
  createTypeWorkflow: (id: string, typeId: string, body: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'>) => apiRequest<WorkItemWorkflow>(`/api/product-lines/${id}/work-item-types/${typeId}/workflows`, { method: 'POST', body: JSON.stringify({ ...body, revision: 0 }) }),
  updateTypeWorkflow: (id: string, typeId: string, workflowId: string, body: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'> & { revision: number }) => apiRequest<WorkItemWorkflow>(`/api/product-lines/${id}/work-item-types/${typeId}/workflows/${workflowId}`, { method: 'PUT', body: JSON.stringify(body) }),
  createWorkflow: (id: string, body: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'>) => apiRequest<WorkItemWorkflow>(`/api/product-lines/${id}/workflows`, { method: 'POST', body: JSON.stringify({ ...body, revision: 0 }) }),
  updateWorkflow: (id: string, workflowId: string, body: Pick<WorkItemWorkflow, 'category' | 'name' | 'definition'> & { revision: number }) => apiRequest<WorkItemWorkflow>(`/api/product-lines/${id}/workflows/${workflowId}`, { method: 'PUT', body: JSON.stringify(body) }),
  publishWorkflow: (id: string, workflowId: string, revision: number) => apiRequest<WorkItemWorkflow>(`/api/product-lines/${id}/workflows/${workflowId}/publish`, { method: 'POST', body: JSON.stringify({ revision }) }),
  automationRules: (id: string, keyword = '') => apiRequest<{ enabled: boolean; rules: AutomationRule[] }>(`/api/product-lines/${id}/automation-rules?keyword=${encodeURIComponent(keyword)}`),
  createAutomationRule: (id: string, body: Omit<AutomationRule, 'id' | 'revision' | 'updatedAt'>) => apiRequest<AutomationRule>(`/api/product-lines/${id}/automation-rules`, { method: 'POST', body: JSON.stringify(body) }),
  updateAutomationRule: (id: string, ruleId: string, body: Omit<AutomationRule, 'id' | 'updatedAt'>) => apiRequest<AutomationRule>(`/api/product-lines/${id}/automation-rules/${ruleId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAutomationRule: (id: string, ruleId: string) => apiRequest<void>(`/api/product-lines/${id}/automation-rules/${ruleId}`, { method: 'DELETE' }),
  updateAutomationSetting: (id: string, enabled: boolean) => apiRequest<{ enabled: boolean }>(`/api/product-lines/${id}/automation-rules/setting`, { method: 'PUT', body: JSON.stringify({ enabled }) }),
  automationLogs: (id: string) => apiRequest<AutomationLog[]>(`/api/product-lines/${id}/automation-rules/logs`),
  workItemDetail: (lineId: string, id: string) => apiRequest<Record<string, any>>(`/api/work-items/${id}?productLineId=${encodeURIComponent(lineId)}`),
  workItems: (productLineId: string, category = '', keyword = '') => apiRequest<{ page: { items: UnifiedWorkItem[]; total: number } }>(`/api/work-items?productLineId=${encodeURIComponent(productLineId)}&category=${encodeURIComponent(category)}&keyword=${encodeURIComponent(keyword)}&page=1&pageSize=100`),
  createWorkItem: (body: { requestId: string; productLineId: string; category: WorkItemCategoryKey; taskTypeId: string; title: string; description?: string; expectedGoal?: string; versionId?: string; requirementId?: string; parentWorkItemId?: string; assigneeId?: string; priority: string; plannedStartDate?: string; plannedEndDate?: string; estimatedHours?: number; actualHours?: number }) => apiRequest<Record<string, any>>('/api/work-items', { method: 'POST', body: JSON.stringify(body) }),
  updateWorkItem: (productLineId: string, id: string, body: { title?: string; description?: string; expectedGoal?: string; versionId?: string; assigneeName?: string; priority?: string; plannedStartDate?: string; plannedEndDate?: string; estimatedHours?: number; actualHours?: number; revision: number }) => apiRequest<Record<string, any>>(`/api/work-items/${id}?productLineId=${encodeURIComponent(productLineId)}`, { method: 'PUT', body: JSON.stringify(body) }),
  workItemTransitions: (productLineId: string, id: string) => apiRequest<WorkItemTransitionOptions>(`/api/work-items/${id}/transitions?productLineId=${encodeURIComponent(productLineId)}`),
  transitionWorkItem: (productLineId: string, id: string, body: { edgeKey: string; revision: number; reason?: string }) => apiRequest<Record<string, any>>(`/api/work-items/${id}/transitions?productLineId=${encodeURIComponent(productLineId)}`, { method: 'POST', body: JSON.stringify(body) }),
  deleteWorkItem: (productLineId: string, id: string, revision: number) => apiRequest<void>(`/api/work-items/${id}?productLineId=${encodeURIComponent(productLineId)}&revision=${revision}`, { method: 'DELETE' }),
  createWorkItemRelation: (productLineId: string, id: string, targetId: string) => apiRequest<Record<string, unknown>>(`/api/work-items/${id}/relations?productLineId=${encodeURIComponent(productLineId)}`, { method: 'POST', body: JSON.stringify({ targetId, type: 'RELATES_TO', scope: 'FINISH' }) }),
  workItemRelations: (productLineId: string, id: string) => apiRequest<{ relations: Array<{ id: string; sourceId: string; targetId: string; type: string; scope?: string; revision?: number }> }>(`/api/work-items/${id}/relations?productLineId=${encodeURIComponent(productLineId)}`),
  requirementSummary: (productLineId: string, requirementId: string) => apiRequest<{ linkedItems: UnifiedWorkItem[] }>(`/api/requirements/${encodeURIComponent(requirementId)}/summary?productLineId=${encodeURIComponent(productLineId)}`),
  productLineActivities: (id: string) => apiRequest<ProductLine['activities']>(`/api/product-lines/${id}/activities`),
  createVersion: (lineId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions`, { method: 'POST', body: JSON.stringify(body) }),
  updateVersion: (lineId: string, versionId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVersion: (lineId: string, versionId: string) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}`, { method: 'DELETE' }),
  assignRequirementToVersion: (lineId: string, versionId: string, requirementId: string) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}/requirements/${requirementId}`, { method: 'POST' }),
  assignWorkItemToVersion: (lineId: string, versionId: string, kind: 'requirement' | 'design' | 'bug' | 'dev', itemId: string) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}/work-items/${kind}/${itemId}`, { method: 'POST' }),
  unassignWorkItemFromVersion: (lineId: string, versionId: string, kind: 'requirement' | 'design' | 'bug' | 'dev', itemId: string) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}/work-items/${kind}/${itemId}`, { method: 'DELETE' }),
  tasks: async (taskType: SpecialTaskKind, values: Record<string,string|number> = {}) => page(await apiRequest<PageResult<DefectBug | DevTask> | Array<DefectBug | DevTask>>(`${specialTaskPath(taskType)}${querySuffix(values)}`)),
  task: (taskType: SpecialTaskKind, id: string) => apiRequest<DefectBug | DevTask>(`${specialTaskPath(taskType)}/${id}`),
  createTask: (taskType: SpecialTaskKind, body: Partial<DefectBug> | Partial<DevTask>) => apiRequest<{ id: string; code: string }>(specialTaskPath(taskType), { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskType: SpecialTaskKind, id: string, body: Record<string, unknown>) => apiRequest<void>(`${specialTaskPath(taskType)}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  designTasks: async (values: Record<string,string|number> = {}) => page(await apiRequest<PageResult<RequirementTask> | RequirementTask[]>(`/api/design-tasks${querySuffix(values)}`)),
  createDesignTask: (body: Partial<RequirementTask>) => apiRequest<{ id: string; code: string }>('/api/design-tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateDesignTask: (id: string, body: Record<string, unknown>) => apiRequest<void>(`/api/design-tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  businessTasks: async (kind: BusinessTaskKind, values: Record<string,string|number> = {}) => page(await apiRequest<PageResult<RequirementTask> | RequirementTask[]>(`${businessTaskPath(kind)}${querySuffix(values)}`)),
  businessTask: (kind: BusinessTaskKind, id: string) => apiRequest<RequirementTask>(`${businessTaskPath(kind)}/${id}`),
  createBusinessTask: (kind: BusinessTaskKind, body: Partial<RequirementTask>) => apiRequest<{ id: string; code: string }>(businessTaskPath(kind), { method: 'POST', body: JSON.stringify(body) }),
  updateBusinessTask: (kind: BusinessTaskKind, id: string, body: Record<string, unknown>) => apiRequest<void>(`${businessTaskPath(kind)}/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  ,testCaseDirectories: (lineId: string) => apiRequest<TestCaseDirectory[]>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories`)
  ,createTestCaseDirectory: (lineId: string, body: { parentId?: string | null; productLineId?: string; name: string; sort?: number }) => apiRequest<TestCaseDirectory>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories`, { method: 'POST', body: JSON.stringify(body) })
  ,renameTestCaseDirectory: (lineId: string, directoryId: string, name: string) => apiRequest<TestCaseDirectory>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories/${encodeURIComponent(directoryId)}`, { method: 'PUT', body: JSON.stringify({ name }) })
  ,deleteTestCaseDirectory: (lineId: string, directoryId: string) => apiRequest<void>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories/${encodeURIComponent(directoryId)}`, { method: 'DELETE' })
  ,copyTestCaseDirectory: (lineId: string, directoryId: string, body: { parentId?: string | null; name?: string }) => apiRequest<TestCaseDirectory>(`/api/product-lines/${encodeURIComponent(lineId)}/test-case-directories/${encodeURIComponent(directoryId)}/copy`, { method: 'POST', body: JSON.stringify(body) })
  ,testCases: (lineId: string, filters: { directoryId?: string; keyword?: string; priority?: string; ownerId?: string; enabled?: boolean; page?: number; pageSize?: number } = {}) => {
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
  ,testPlan: (workItemId: string) => apiRequest<TestPlan>(`/api/work-items/${encodeURIComponent(workItemId)}/test-plan`)
  ,testPlans: (workItemId: string) => apiRequest<TestPlan[]>(`/api/work-items/${encodeURIComponent(workItemId)}/test-plans`)
  ,createTestPlan: (workItemId: string, body: SaveTestPlanInput) => apiRequest<TestPlan>(`/api/work-items/${encodeURIComponent(workItemId)}/test-plans`, { method: 'POST', body: JSON.stringify(body) })
  ,saveTestPlan: (workItemId: string, planId: string, body: SaveTestPlanInput) => apiRequest<TestPlan>(`/api/work-items/${encodeURIComponent(workItemId)}/test-plans/${encodeURIComponent(planId)}`, { method: 'PUT', body: JSON.stringify(body) })
  ,testExecutions: (workItemId: string) => apiRequest<TestExecution[]>(`/api/work-items/${encodeURIComponent(workItemId)}/test-executions`)
  ,createTestExecution: (workItemId: string, body: CreateTestExecutionInput) => apiRequest<TestExecution>(`/api/work-items/${encodeURIComponent(workItemId)}/test-executions`, { method: 'POST', body: JSON.stringify(body) })
  ,testExecutionDetail: (executionId: string) => apiRequest<TestExecution>(`/api/test-executions/${encodeURIComponent(executionId)}`)
  ,saveTestResult: (resultId: string, body: { result: Exclude<TestResultStatus, 'NOT_EXECUTED'>; actualResult?: string; evidence: TestEvidence[]; revision: number }) => apiRequest<TestExecution>(`/api/test-execution-cases/${encodeURIComponent(resultId)}`, { method: 'PUT', body: JSON.stringify(body) })
  ,endTestExecution: (executionId: string, revision: number) => apiRequest<TestExecution>(`/api/test-executions/${encodeURIComponent(executionId)}/end`, { method: 'POST', body: JSON.stringify({ revision }) })
  ,linkTestResultDefect: (resultId: string, defectWorkItemId: string, revision: number) => apiRequest<TestExecution>(`/api/test-execution-cases/${encodeURIComponent(resultId)}/defects`, { method: 'POST', body: JSON.stringify({ defectWorkItemId, revision }) })
  ,testTaskOverview: (workItemId: string) => apiRequest<TestTaskOverview>(`/api/work-items/${encodeURIComponent(workItemId)}/test-overview`)
};
