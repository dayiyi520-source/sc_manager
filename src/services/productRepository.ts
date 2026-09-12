import { apiRequest } from './apiClient';
import type { ProductLine, ProductLineMember, VersionIteration, RequirementTask, DefectBug, DevTask } from '../types';

type SpecialTaskKind = 'bug' | 'dev';
type BusinessTaskKind = 'presales' | 'delivery' | 'ops';

const specialTaskPath = (kind: SpecialTaskKind) => kind === 'bug' ? '/api/bugs' : '/api/dev-tasks';
const businessTaskPath = (kind: BusinessTaskKind) => `/api/${kind}-tasks`;

export const productRepository = {
  productLines: (keyword = '') => apiRequest<ProductLine[]>(`/api/product-lines?keyword=${encodeURIComponent(keyword)}`),
  createProductLine: (body: Partial<ProductLine>) => apiRequest<{ id: string; code: string }>('/api/product-lines', { method: 'POST', body: JSON.stringify(body) }),
  updateProductLine: (id: string, body: Partial<ProductLine>) => apiRequest<void>(`/api/product-lines/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  addProductLineMember: (id: string, body: Pick<ProductLineMember, 'name' | 'role'>) => apiRequest<void>(`/api/product-lines/${id}/members`, { method: 'POST', body: JSON.stringify(body) }),
  productLineActivities: (id: string) => apiRequest<ProductLine['activities']>(`/api/product-lines/${id}/activities`),
  createVersion: (lineId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions`, { method: 'POST', body: JSON.stringify(body) }),
  updateVersion: (lineId: string, versionId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteVersion: (lineId: string, versionId: string) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}`, { method: 'DELETE' }),
  tasks: (taskType: SpecialTaskKind) => apiRequest<Array<DefectBug | DevTask>>(specialTaskPath(taskType)),
  task: (taskType: SpecialTaskKind, id: string) => apiRequest<DefectBug | DevTask>(`${specialTaskPath(taskType)}/${id}`),
  createTask: (taskType: SpecialTaskKind, body: Partial<DefectBug> | Partial<DevTask>) => apiRequest<{ id: string; code: string }>(specialTaskPath(taskType), { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskType: SpecialTaskKind, id: string, body: Record<string, unknown>) => apiRequest<void>(`${specialTaskPath(taskType)}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  designTasks: () => apiRequest<RequirementTask[]>('/api/design-tasks'),
  createDesignTask: (body: Partial<RequirementTask>) => apiRequest<{ id: string; code: string }>('/api/design-tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateDesignTask: (id: string, body: Record<string, unknown>) => apiRequest<void>(`/api/design-tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  businessTasks: (kind: BusinessTaskKind) => apiRequest<RequirementTask[]>(businessTaskPath(kind)),
  businessTask: (kind: BusinessTaskKind, id: string) => apiRequest<RequirementTask>(`${businessTaskPath(kind)}/${id}`),
  createBusinessTask: (kind: BusinessTaskKind, body: Partial<RequirementTask>) => apiRequest<{ id: string; code: string }>(businessTaskPath(kind), { method: 'POST', body: JSON.stringify(body) }),
  updateBusinessTask: (kind: BusinessTaskKind, id: string, body: Record<string, unknown>) => apiRequest<void>(`${businessTaskPath(kind)}/${id}`, { method: 'PUT', body: JSON.stringify(body) })
};
