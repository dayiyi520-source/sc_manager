import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './apiClient';
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
    vi.stubGlobal('window', { sessionStorage: storage });
    vi.stubGlobal('sessionStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    storage.clear();
  });

  it('creates a local session when the development service returns 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 })));

    const session = await devLogin('admin');

    expect(session.token).toBe('local-dev-admin');
    expect(readSession()?.user.role).toBe('admin');
  });

  it('keeps authentication failures visible instead of falling back', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: '登录失败', data: null }), { status: 401 })));

    await expect(devLogin('admin')).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' } satisfies Partial<ApiError>);
    expect(readSession()).toBeNull();
    clearSession();
  });
});
