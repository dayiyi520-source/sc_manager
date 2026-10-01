import { apiRequest } from './apiClient'
import type { CurrentUser } from '../types'
import { MOCK_USERS } from '../data/mockSnapshot'
export interface Session { token:string; user:CurrentUser; expiresAt:number }
import { SESSION_KEY as KEY, SESSION_TOKEN_KEY as TOKEN_KEY, clearStoredSession } from './sessionStorage'
function storage(){return window.sessionStorage}
export function readSession(): Session | null {
  try {
    const value = storage().getItem(KEY);
    if (!value) return null;
    const session = JSON.parse(value) as Session;
    if (!session?.token || !session.user?.id
      || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()
      || storage().getItem(TOKEN_KEY) !== session.token) return null;
    if (import.meta.env.VITE_MOCK_MODE !== 'false' && !MOCK_USERS.some(user => user.id === session.user.id)) {
      const matches = MOCK_USERS.filter(user => user.name === session.user.name && user.role === session.user.role);
      if (matches.length === 1) {
        session.user = matches[0];
        storage().setItem(KEY, JSON.stringify(session));
      }
    }
    return session;
  } catch { return null; }
}
export const clearSession = clearStoredSession;
const ROLE_USERNAMES: Record<CurrentUser['role'], string> = {
  admin: 'admin',
  sales_director: 'sales',
  product_manager: 'product',
  tech_lead: 'tech',
};

export function sessionUsername(session: Session): string {
  const username = (session.user as CurrentUser & { username?: string }).username;
  return username || ROLE_USERNAMES[session.user.role] || 'admin';
}

export async function devLogin(username: string) {
  const data = await apiRequest<{token:string;expiresIn:number;user:CurrentUser}>('/api/auth/dev-login', {
    method: 'POST', body: JSON.stringify({username}),
  });
  if (!data?.token || !data.user?.id || !Number.isFinite(data.expiresIn) || data.expiresIn <= 0) {
    throw new Error('登录服务返回无效会话，请重试');
  }
  const session = {token:data.token, user:data.user, expiresAt:Date.now()+data.expiresIn*1000};
  storage().setItem(KEY, JSON.stringify(session));
  storage().setItem(TOKEN_KEY, data.token);
  return session;
}
