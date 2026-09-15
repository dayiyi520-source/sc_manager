import { apiRequest } from './apiClient';
import type { ProductLine, ProductLineMember, ProductLineWorkItemCategory, ProductLineWorkItemType, VersionIteration, RequirementTask, DefectBug, DevTask } from '../types';
import type { PageResult } from './apiClient';

type SpecialTaskKind = 'bug' | 'dev';
type BusinessTaskKind = 'presales' | 'delivery' | 'ops';

const specialTaskPath = (kind: SpecialTaskKind) => kind === 'bug' ? '/api/bugs' : '/api/dev-tasks';
const businessTaskPath = (kind: BusinessTaskKind) => `/api/${kind}-tasks`;
const querySuffix = (values: Record<string,string|number>) => { const value = new URLSearchParams(Object.entries(values).map(([k,v])=>[k,String(v)])).toString(); return value ? `?${value}` : ''; };
const page = <T>(value: PageResult<T> | T[]): PageResult<T> => Array.isArray(value) ? ({ items: value, page: 1, pageSize: value.length || 20, total: value.length }) : value;

export const productRepository = {
  productLines: (keyword = '') => apiRequest<ProductLine[]>(`/api/product-lines?keyword=${encodeURIComponent(keyword)}`),
  createProductLine: (body: Partial<ProductLine>) => apiRequest<{ id: string; code: string }>('/api/product-lines', { method: 'POST', body: JSON.stringify(body) }),
  updateProductLine: (id: string, body: Partial<ProductLine>) => apiRequest<void>(`/api/product-lines/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  addProductLineMember: (id: string, body: Pick<ProductLineMember, 'name' | 'role'>) => apiRequest<void>(`/api/product-lines/${id}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateProductLineMember: (id: string, memberId: string, body: Pick<ProductLineMember, 'role'>) => apiRequest<void>(`/api/product-lines/${id}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeProductLineMember: (id: string, memberId: string) => apiRequest<void>(`/api/product-lines/${id}/members/${memberId}`, { method: 'DELETE' }),
  workItemTypes: (id: string, category?: ProductLineWorkItemCategory) => apiRequest<ProductLineWorkItemType[]>(`/api/product-lines/${id}/work-item-types${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  createWorkItemType: (id: string, body: Pick<ProductLineWorkItemType, 'category' | 'name' | 'description' | 'enabled'>) => apiRequest<{ id: string }>(`/api/product-lines/${id}/work-item-types`, { method: 'POST', body: JSON.stringify(body) }),
  updateWorkItemType: (id: string, typeId: string, body: Partial<Pick<ProductLineWorkItemType, 'category' | 'name' | 'description' | 'enabled'>>) => apiRequest<void>(`/api/product-lines/${id}/work-item-types/${typeId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteWorkItemType: (id: string, typeId: string) => apiRequest<void>(`/api/product-lines/${id}/work-item-types/${typeId}`, { method: 'DELETE' }),
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
};
