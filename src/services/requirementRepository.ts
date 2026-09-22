import { apiRequest, PageResult } from './apiClient';
import type { AttachmentMetadata, DepartmentOption, EmployeeOption, RequirementTask, RequirementWorkItem, RequirementWorkOrderCandidate } from '../types';

function parseJson<T>(value: T | string | null | undefined, fallback: T): T {
  if (typeof value !== 'string') return value ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function normalizeRequirementTask(task: RequirementTask): RequirementTask {
  const specialFields = parseJson(task.specialFields, {});
  const media = parseJson(task.media, []);
  const ccNames = parseJson(task.ccNames, []);
  const sourceWorkOrderIds = parseJson(task.sourceWorkOrderIds, []);
  const sourceWorkOrderTitles = parseJson(task.sourceWorkOrderTitles, []);
  return {
    ...task,
    revision: task.revision ?? task.version,
    specialFields: specialFields && typeof specialFields === 'object' && !Array.isArray(specialFields) ? specialFields : {},
    media: Array.isArray(media) ? media : [],
    ccNames: Array.isArray(ccNames) ? ccNames : [],
    sourceWorkOrderIds: Array.isArray(sourceWorkOrderIds) ? sourceWorkOrderIds : [],
    sourceWorkOrderTitles: Array.isArray(sourceWorkOrderTitles) ? sourceWorkOrderTitles : [],
  };
}

export const requirementRepository = {
  list: (values: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)])).toString();
    return apiRequest<PageResult<RequirementTask>>(`/api/requirements?${query}`).then((page) => {
      const items = Array.isArray(page?.items) ? page.items : [];
      return { page: page?.page || 1, pageSize: page?.pageSize || 10, total: page?.total || items.length, ...page, items: items.map(normalizeRequirementTask) };
    });
  },
  create: (input: Partial<RequirementTask>) => apiRequest<{ id: string; code: string }>('/api/requirements', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<RequirementTask> & { version?: number }) => apiRequest<void>(`/api/requirements/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  comment: (id: string, content: string) => apiRequest<void>(`/api/requirements/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  detail: (id: string) => apiRequest<RequirementTask & { events?: RequirementTask['events']; workItems?: RequirementWorkItem[] }>(`/api/requirements/${id}`).then((detail) => normalizeRequirementTask(detail) as typeof detail),
  workOrderCandidates: (values: { keyword?: string; type?: string; requirementId?: string; limit?: number } = {}) => {
    const query = new URLSearchParams(Object.entries(values).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])).toString();
    return apiRequest<RequirementWorkOrderCandidate[]>(`/api/requirements/work-order-candidates?${query}`);
  },
  departments: () => apiRequest<DepartmentOption[]>('/api/requirements/departments'),
  employees: () => apiRequest<EmployeeOption[]>('/api/auth/dev-accounts'),
  transition: (id: string, action: 'hold' | 'reject', reason: string) => apiRequest<void>(`/api/requirements/${id}/transition`, { method: 'POST', body: JSON.stringify({ action, reason }) }),
  reassign: (id: string, input: { assigneeId: string; reason: string; handoffNote?: string; attachmentIds?: string[]; revision: number }) => apiRequest<RequirementTask & { pendingReassignmentId: string; owner: string; revision: number; events?: RequirementTask['events'] }>(`/api/requirements/${id}/reassign`, { method: 'POST', body: JSON.stringify(input) }).then((detail) => normalizeRequirementTask(detail) as typeof detail),
  acceptReassignment: (reassignmentId: string, revision: number) => apiRequest<{ id: string; status: string }>(`/api/requirements/reassign/${reassignmentId}/accept`, { method: 'POST', body: JSON.stringify({ revision }) }),
  rejectReassignment: (reassignmentId: string, reason: string) => apiRequest<{ id: string; status: string }>(`/api/requirements/reassign/${reassignmentId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  acceptanceFailed: (id: string, input: { workItemId?: string; taskOwnerId?: string; reason: string; attachmentIds?: string[] }) => apiRequest<{ id: string; status: string }>(`/api/requirements/${id}/acceptance-failed`, { method: 'POST', body: JSON.stringify(input) }),
  closeByOwner: (id: string, revision: number) => apiRequest<{ id: string; status: string }>(`/api/requirements/${id}/close`, { method: 'POST', body: JSON.stringify({ revision }) }),
  reopen: (id: string, input: { progress: number; revision: number; reason?: string }) => apiRequest<{ id: string; status: string; progress: number; revision: number }>(`/api/requirements/${id}/reopen`, { method: 'POST', body: JSON.stringify(input) }),
  memo: (id: string, input: { content: string; attachmentIds?: string[]; revision: number }) => apiRequest<RequirementTask & { events?: RequirementTask['events']; workItems?: RequirementWorkItem[] }>(`/api/requirements/${id}/memo`, { method: 'POST', body: JSON.stringify(input) }).then((detail) => normalizeRequirementTask(detail) as typeof detail),
  stageAttachment: (file: { name: string; mimeType: string; size: number; dataUrl: string }) => apiRequest<AttachmentMetadata>('/api/attachments/stage', { method: 'POST', body: JSON.stringify(file) }),
  bindAttachment: (id: string, input: { subjectType: string; subjectId: string; visibility: string }) => apiRequest<AttachmentMetadata>(`/api/attachments/${id}/bind`, { method: 'POST', body: JSON.stringify(input) }),
  createWorkItem: (id: string, input: { title?: string; taskType: string; assigneeName: string; note?: string }) => apiRequest<{ id: string; taskType: string; syncStatus?: string; retryCount?: number; syncError?: string }>(`/api/requirements/${id}/work-items`, { method: 'POST', body: JSON.stringify(input) }),
  createWorkItemsBatch: (id: string, tasks: Array<{ title?: string; taskType: string; assigneeName: string; note?: string; attachmentIds?: string[]; blocksClosure?: boolean }>) => apiRequest<{ items: RequirementWorkItem[]; count: number }>(`/api/requirements/${id}/work-items/batch`, { method: 'POST', body: JSON.stringify({ tasks }) }),
  workItems: (taskType = '') => apiRequest<RequirementWorkItem[]>(`/api/requirements/work-items?taskType=${encodeURIComponent(taskType)}`),
  syncStatus: (values: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)])).toString();
    return apiRequest<PageResult<RequirementWorkItem>>(`/api/requirements/work-items/sync-status?${query}`);
  },
  updateWorkItemStatus: (id: string, status: string) => apiRequest<void>(`/api/requirements/work-items/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateWorkItemProgress: (id: string, progress: number, revision?: number, reason?: string) => apiRequest<{ id: string; progress: number; revision: number }>(`/api/requirements/work-items/${id}/progress`, { method: 'PATCH', body: JSON.stringify({ progress, revision, reason }) }),
  myTasks: () => apiRequest<Array<{ id: string; type: string; title: string; status: string; assigneeName?: string; time?: string; dueDate?: string; progress?: number; overdueRisk?: boolean; taskGroup: 'mine' | 'assist'; targetPage: string; sourceId: string }>>('/api/requirements/my-tasks'),
  acceptWorkItem: (requirementId: string, workItemId: string) => apiRequest<{ id: string; status: string }>(`/api/requirements/${requirementId}/work-items/${workItemId}/acceptance`, { method: 'POST' }),
  retryWorkItem: (id: string) => apiRequest<{ syncStatus: string; retryableFailures: number; syncError?: string }>(`/api/requirements/work-items/${id}/retry`, { method: 'POST' })
};
