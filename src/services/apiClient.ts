export interface ApiResponse<T> { code: string; message: string; data: T; requestId: string }
export interface PageResult<T> { items: T[]; page: number; pageSize: number; total: number }
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const SESSION_TOKEN_KEY = 'shichuang.session.token'
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message) } }
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); const token = sessionStorage.getItem(SESSION_TOKEN_KEY)
  headers.set('Accept','application/json'); if(init.body) headers.set('Content-Type','application/json'); if(token) headers.set('Authorization',`Bearer ${token}`)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(`${API_BASE}${path}`,{...init, headers, signal: init.signal || controller.signal})
    clearTimeout(timer)
    const payload = await response.json().catch(() => ({code:'INVALID_RESPONSE',message:'服务返回了无效数据',data:null})) as ApiResponse<T>
    if(!response.ok){ if(response.status===401)sessionStorage.removeItem(SESSION_TOKEN_KEY); throw new ApiError(response.status,payload.code||'REQUEST_FAILED',payload.message||'请求失败') }
    return payload.data
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}
