import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, ApiError } from './apiClient';
import { clearSession, devLogin, readSession } from './session';

describe('devLogin', () => {
  const storage = {
    value: new Map<string, string>(),
    getItem(key: string) { return this.value.get(key) ?? null; },
    setItem(key: string, value: string) { this.value.set(key, value); },
    removeItem(key: string) { this.value.delete(key); },
    clear() { this.value.clear(); },
  };

  beforeEach(() => {
    vi.stubGlobal('window', { sessionStorage: storage, dispatchEvent: vi.fn() });
    vi.stubGlobal('sessionStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    storage.clear();
  });

  it('does not fabricate a session when the development service returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 })));

    await expect(devLogin('admin')).rejects.toMatchObject({status:404});
    expect(readSession()).toBeNull();
  });

  it('keeps authentication failures visible instead of falling back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: '登录失败', data: null }), { status: 401 })));

    await expect(devLogin('admin')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' } satisfies Partial<ApiError>);
    expect(readSession()).toBeNull();
    clearSession();
  });
  async function login(token = 'real-token') {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{token, expiresIn:3600, user:{id:'user-tech',role:'tech_lead'}}}))));
    return devLogin('tech');
  }

  it('accepts a valid backend session', async () => {
    await login();
    expect(readSession()?.token).toBe('real-token');
  });

  it.each(['expired', 'missing-token', 'mismatched-token', 'malformed', 'legacy'])('rejects %s sessions', async (kind) => {
    const session = await login();
    if (kind === 'expired') storage.setItem('shichuang.session', JSON.stringify({...session, expiresAt:Date.now()-1}));
    if (kind === 'missing-token') storage.removeItem('shichuang.session.token');
    if (kind === 'mismatched-token') storage.setItem('shichuang.session.token','another-token');
    if (kind === 'malformed') storage.setItem('shichuang.session','{');
    if (kind === 'legacy') {
      storage.setItem('shichuang.session', JSON.stringify({...session,token:'local-dev-tech'}));
      storage.setItem('shichuang.session.token','local-dev-tech');
    }
    expect(readSession()).toBeNull();
  });

  it('clears the entire session and notifies the route guard on 401', async () => {
    await login();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', {status:401})));
    await expect(apiRequest('/api/okr/records')).rejects.toMatchObject({status:401});
    expect(storage.getItem('shichuang.session')).toBeNull();
    expect(storage.getItem('shichuang.session.token')).toBeNull();
    expect(window.dispatchEvent).toHaveBeenCalledOnce();
  });

  it('does not clear a newer login when an old request returns 401', async () => {
    await login('old');
    let respond!: (response:Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => {respond=resolve;})));
    const pending = apiRequest('/api/okr/records');
    await login('new');
    respond(new Response('{}', {status:401}));
    await expect(pending).rejects.toMatchObject({status:401});
    expect(readSession()?.token).toBe('new');
  });

  it('keeps a valid session on service outage and does not retry writes', async () => {
    await login();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', {status:503}));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest('/api/okr/records', {method:'POST',body:'{}'})).rejects.toMatchObject({status:503});
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(readSession()?.token).toBe('real-token');
  });

});
