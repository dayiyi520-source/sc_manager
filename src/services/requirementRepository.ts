import { apiRequest, PageResult } from './apiClient';
import type { DepartmentOption, EmployeeOption, RequirementTask, RequirementWorkItem, RequirementWorkOrderCandidate } from '../types';

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
  reassign: (id: string, input: { assigneeId: string; reason: string; revision: number }) => apiRequest<RequirementTask & { events?: RequirementTask['events']; workItems?: RequirementWorkItem[] }>(`/api/requirements/${id}/reassign`, { method: 'POST', body: JSON.stringify(input) }).then((detail) => normalizeRequirementTask(detail) as typeof detail),
  memo: (id: string, input: { content: string; revision: number }) => apiRequest<RequirementTask & { events?: RequirementTask['events']; workItems?: RequirementWorkItem[] }>(`/api/requirements/${id}/memo`, { method: 'POST', body: JSON.stringify(input) }).then((detail) => normalizeRequirementTask(detail) as typeof detail),
  createWorkItem: (id: string, input: { title?: string; taskType: string; assigneeName: string; note?: string }) => apiRequest<{ id: string; taskType: string; syncStatus?: string; retryCount?: number; syncError?: string }>(`/api/requirements/${id}/work-items`, { method: 'POST', body: JSON.stringify(input) }),
  workItems: (taskType = '') => apiRequest<RequirementWorkItem[]>(`/api/requirements/work-items?taskType=${encodeURIComponent(taskType)}`),
  syncStatus: (values: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)])).toString();
    return apiRequest<PageResult<RequirementWorkItem>>(`/api/requirements/work-items/sync-status?${query}`);
  },
  updateWorkItemStatus: (id: string, status: string) => apiRequest<void>(`/api/requirements/work-items/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  retryWorkItem: (id: string) => apiRequest<{ syncStatus: string; retryableFailures: number; syncError?: string }>(`/api/requirements/work-items/${id}/retry`, { method: 'POST' })
};
