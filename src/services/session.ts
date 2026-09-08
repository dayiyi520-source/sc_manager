import { apiRequest, ApiError } from './apiClient'
import type { CurrentUser } from '../types'
export interface Session { token:string; user:CurrentUser; expiresAt:number }
const KEY='shichuang.session'
const TOKEN_KEY='shichuang.session.token'
function storage(){return window.sessionStorage}
export function readSession():Session|null{try{const value=storage().getItem(KEY);return value?JSON.parse(value) as Session:null}catch{return null}}
export function clearSession(){storage().removeItem(KEY);storage().removeItem(TOKEN_KEY)}
const LOCAL_USERS: Record<string, CurrentUser> = {
  admin: { id: 'user-admin', name: '林志豪', avatar: '', role: 'admin', roleTitle: '超级系统管理员', department: '平台架构部' },
  sales: { id: 'user-sales', name: '陈雅婷', avatar: '', role: 'sales_director', roleTitle: '销售总监', department: '商务大客户部' },
  product: { id: 'user-product', name: '张瑞', avatar: '', role: 'product_manager', roleTitle: '产品经理', department: '产品中心' },
  tech: { id: 'user-tech', name: '王浩然', avatar: '', role: 'tech_lead', roleTitle: '技术负责人', department: '研发一组' }
};
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

export async function devLogin(username:string){
  try {
    const data=await apiRequest<{token:string;expiresIn:number;user:CurrentUser}>('/api/auth/dev-login',{method:'POST',body:JSON.stringify({username})});
    if (!data?.token || !data.user) throw new TypeError('开发登录响应无效');
    const session={token:data.token,user:data.user,expiresAt:Date.now()+data.expiresIn*1000};
    storage().setItem(KEY,JSON.stringify(session));storage().setItem(TOKEN_KEY,data.token);return session;
  } catch (error) {
    const serviceUnavailable = error instanceof TypeError
      || (error instanceof ApiError && (error.code === 'INVALID_RESPONSE' || [404, 502, 503].includes(error.status)));
    if (!serviceUnavailable || !LOCAL_USERS[username]) throw error;
    const session={token:`local-dev-${username}`,user:LOCAL_USERS[username],expiresAt:Date.now()+8*60*60*1000};
    storage().setItem(KEY,JSON.stringify(session));storage().setItem(TOKEN_KEY,session.token);return session;
  }
}
