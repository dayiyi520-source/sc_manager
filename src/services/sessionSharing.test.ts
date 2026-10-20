// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSession, devLogin, readSession } from './session';
import { invalidateSession, SESSION_KEY, SESSION_TOKEN_KEY, SHARED_SESSION_KEY } from './sessionStorage';
vi.mock('./apiClient', () => ({ apiRequest: vi.fn(async () => ({ token: 'test-session', expiresIn: 3600, user: { id: 'test-user', role: 'admin' } })) }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
describe('同源新窗口复用登录会话', () => {
  it('登录后空白窗口恢复同一会话，刷新后仍保留原过期时间', async () => {
    const session = await devLogin('admin');
    sessionStorage.clear();
    expect(readSession()).toEqual(session);
    expect(sessionStorage.getItem(SESSION_TOKEN_KEY)).toBe(session.token);
    expect(readSession()?.expiresAt).toBe(session.expiresAt);
  });
  it('升级前的有效会话可供复制链接打开的新窗口使用', () => {
    const session = { token: 'legacy-valid', user: { id: 'test-user' }, expiresAt: Date.now() + 60000 };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(SESSION_TOKEN_KEY, session.token);
    expect(readSession()).toEqual(session);
    sessionStorage.clear();
    expect(readSession()).toEqual(session);
  });
  it('退出后旧窗口和新窗口均无法恢复已退出的会话', async () => {
    const session = await devLogin('admin');
    clearSession();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(SESSION_TOKEN_KEY, session.token);
    expect(readSession()).toBeNull();
    sessionStorage.clear();
    expect(readSession()).toBeNull();
  });
  it.each(['expired', 'mismatched', 'malformed'])('拒绝 %s 共享会话', async kind => {
    const session = await devLogin('admin');
    if (kind === 'expired') session.expiresAt = Date.now() - 1;
    localStorage.setItem(SHARED_SESSION_KEY, kind === 'malformed' ? '{' : JSON.stringify({ session: JSON.stringify(session), token: kind === 'mismatched' ? 'wrong' : session.token }));
    sessionStorage.clear();
    expect(readSession()).toBeNull();
  });
  it('旧窗口的失败请求不能清除其他窗口的新登录', async () => {
    const session = await devLogin('admin');
    const next = { ...session, token: 'new-login' };
    localStorage.setItem(SHARED_SESSION_KEY, JSON.stringify({ session: JSON.stringify(next), token: next.token }));
    invalidateSession(session.token);
    sessionStorage.clear();
    expect(readSession()?.token).toBe('new-login');
  });
});
