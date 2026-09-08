import { apiRequest } from './apiClient';
import type { ProductLine, VersionIteration, RequirementTask, DefectBug, DevTask } from '../types';

export const productRepository = {
  productLines: (keyword = '') => apiRequest<ProductLine[]>(`/api/product-lines?keyword=${encodeURIComponent(keyword)}`),
  createProductLine: (body: Partial<ProductLine>) => apiRequest<{ id: string; code: string }>('/api/product-lines', { method: 'POST', body: JSON.stringify(body) }),
  updateProductLine: (id: string, body: Partial<ProductLine>) => apiRequest<void>(`/api/product-lines/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  createVersion: (lineId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions`, { method: 'POST', body: JSON.stringify(body) }),
  updateVersion: (lineId: string, versionId: string, body: Partial<VersionIteration>) => apiRequest<void>(`/api/product-lines/${lineId}/versions/${versionId}`, { method: 'PUT', body: JSON.stringify(body) }),
  tasks: (taskType: 'bug' | 'dev') => apiRequest<Array<DefectBug | DevTask>>(`/api/product-work-items?taskType=${taskType}`),
  createTask: (taskType: 'bug' | 'dev', body: Partial<DefectBug> | Partial<DevTask>) => apiRequest<{ id: string; code: string }>(`/api/product-work-items?taskType=${taskType}`, { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (taskType: 'bug' | 'dev', id: string, body: Record<string, unknown>) => apiRequest<void>(`/api/product-work-items/${id}?taskType=${taskType}`, { method: 'PUT', body: JSON.stringify(body) })
};
