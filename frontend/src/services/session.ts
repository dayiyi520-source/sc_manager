import {apiRequest, ApiError} from './apiClient';
import type {CurrentUser} from '../types';
export interface Session { token: string; user: CurrentUser; expiresAt: number; }
const KEY = 'shichuang.session'; const TOKEN_KEY = 'shichuang.session.token';
const LOCAL_USERS: Record<string, CurrentUser> = {
  admin: {id: 'user-admin', name: '林志豪', avatar: '', role: 'admin', roleTitle: '超级系统管理员', department: '平台架构部'},
  sales: {id: 'user-sales', name: '陈雅婷', avatar: '', role: 'sales_director', roleTitle: '销售总监', department: '商务大客户部'},
  product: {id: 'user-product', name: '张瑞', avatar: '', role: 'product_manager', roleTitle: '产品经理', department: '产品中心'},
  tech: {id: 'user-tech', name: '王浩然', avatar: '', role: 'tech_lead', roleTitle: '技术负责人', department: '研发一组'},
};
export function readSession(): Session | null { try { const value = sessionStorage.getItem(KEY); return value ? JSON.parse(value) as Session : null; } catch { return null; } }
export function clearSession() { sessionStorage.removeItem(KEY); sessionStorage.removeItem(TOKEN_KEY); }
export async function devLogin(username: string): Promise<Session> {
  try { const data = await apiRequest<{token: string; expiresIn: number; user: CurrentUser}>('/api/auth/dev-login', {method: 'POST', body: JSON.stringify({username})}); const session = {token: data.token, user: data.user, expiresAt: Date.now() + data.expiresIn * 1000}; sessionStorage.setItem(KEY, JSON.stringify(session)); sessionStorage.setItem(TOKEN_KEY, data.token); return session; }
  catch (error) { if (!(error instanceof TypeError) && !(error instanceof ApiError && [404, 500, 502, 503].includes(error.status))) throw error; const user = LOCAL_USERS[username]; if (!user) throw error; const session = {token: `local-dev-${username}`, user, expiresAt: Date.now() + 8 * 60 * 60 * 1000}; sessionStorage.setItem(KEY, JSON.stringify(session)); sessionStorage.setItem(TOKEN_KEY, session.token); return session; }
}
