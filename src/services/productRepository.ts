import { apiRequest } from './apiClient';
import type { ProductLine, VersionIteration, RequirementTask, DefectBug, DevTask } from '../types';

export const productRepository = {
  productLines: (keyword = '') => apiRequest<ProductLine[]>(`/api/product-lines?keyword=${encodeURIComponent(keyword)}`),
  createProductLine: (body: Partial<ProductLine>) => apiRequest<{ id: string; code: string }>('/api/product-lines', { method: 'POST', body: JSON.stringify(body) }),
  updateProductLine: (id: string, body: Partial<ProductLine>) => apiRequest<void>(`/api/product-lines/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  createVersion: (lineId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions`, { method: 'POST', body: JSON.stringify(body) }),
  updateVersion: (lineId: string, versionId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}`, { method: 'PUT', body: JSON.stringify(body) }),
  tasks: (taskType: 'bug' | 'dev') => apiRequest<Array<DefectBug | DevTask>>(taskType === 'bug' ? '/api/bugs' : '/api/dev-tasks'),
  task: (taskType: 'bug' | 'dev', id: string) => apiRequest<DefectBug | DevTask>(`${taskType === 'bug' ? '/api/bugs' : '/api/dev-tasks'}/${id}`),
  createTask: (taskType: 'bug' | 'dev', body: Partial<DefectBug> | Partial<DevTask>) => apiRequest<{ id: string; code: string }>(taskType === 'bug' ? '/api/bugs' : '/api/dev-tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskType: 'bug' | 'dev', id: string, body: Record<string, unknown>) => apiRequest<void>(`${taskType === 'bug' ? '/api/bugs' : '/api/dev-tasks'}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  designTasks: () => apiRequest<RequirementTask[]>('/api/design-tasks'),
  createDesignTask: (body: Partial<RequirementTask>) => apiRequest<{ id: string; code: string }>('/api/design-tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateDesignTask: (id: string, body: Record<string, unknown>) => apiRequest<void>(`/api/design-tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  businessTasks: (kind: 'presales' | 'delivery' | 'ops') => apiRequest<RequirementTask[]>(`/api/${kind === 'presales' ? 'presales' : kind === 'delivery' ? 'delivery' : 'ops'}-tasks`),
  businessTask: (kind: 'presales' | 'delivery' | 'ops', id: string) => apiRequest<RequirementTask>(`/api/${kind === 'presales' ? 'presales' : kind === 'delivery' ? 'delivery' : 'ops'}-tasks/${id}`),
  createBusinessTask: (kind: 'presales' | 'delivery' | 'ops', body: Partial<RequirementTask>) => apiRequest<{ id: string; code: string }>(`/api/${kind === 'presales' ? 'presales' : kind === 'delivery' ? 'delivery' : 'ops'}-tasks`, { method: 'POST', body: JSON.stringify(body) }),
  updateBusinessTask: (kind: 'presales' | 'delivery' | 'ops', id: string, body: Record<string, unknown>) => apiRequest<void>(`/api/${kind === 'presales' ? 'presales' : kind === 'delivery' ? 'delivery' : 'ops'}-tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) })
};
