import type {ApiResponse} from '../types';
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); const token = sessionStorage.getItem('shichuang.session.token');
  headers.set('Accept', 'application/json'); if (init.body) headers.set('Content-Type', 'application/json'); if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, {...init, headers});
  const payload = await response.json().catch(() => ({code: 'INVALID_RESPONSE', message: '服务返回了无效数据', data: null})) as ApiResponse<T>;
  if (!response.ok) { if (response.status === 401) sessionStorage.removeItem('shichuang.session.token'); throw new ApiError(response.status, payload.code || 'REQUEST_FAILED', payload.message || '请求失败'); }
  return payload.data;
}
