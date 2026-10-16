// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => { localStorage.clear(); vi.resetModules(); vi.stubEnv('MODE', 'development'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('unrelated local queries do not read or wait for template files', async () => {
  const request = vi.fn().mockRejectedValue(new Error('文件服务不可用'));
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  const members = await mockApiRequest('/api/team-members');
  expect(members.length).toBeGreaterThan(0);
  expect(request).not.toHaveBeenCalled();
});

it('concurrent template and product activity reads share one file GET; another tab invalidates it', async () => {
  let file = { productLines: [{ id: 'p', name: '产品', versions: [] }], researchTypes: [] };
  const request = vi.fn(async () => ({ ok: true, json: async () => structuredClone(file) }));
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  await Promise.all(Array.from({ length: 40 }, (_, index) => mockApiRequest(index % 2 ? '/api/work-item-template' : '/api/product-lines/p/work-items/task/activities')));
  expect(request).toHaveBeenCalledTimes(1);
  file = { ...file, productLines: [{ id: 'p', name: '其他页修改', versions: [] }] };
  window.dispatchEvent(new StorageEvent('storage', { key: 'shichuang.frontend.mock.productLines' }));
  expect((await mockApiRequest('/api/product-lines'))[0].name).toBe('其他页修改');
  expect(request).toHaveBeenCalledTimes(2);
});

it('failed file reads can retry without leaving the queue stuck', async () => {
  const request = vi.fn().mockRejectedValueOnce(new TypeError('断网')).mockResolvedValue({ ok: true, json: async () => ({ researchTypes: [] }) });
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  const failed = await Promise.allSettled(Array.from({ length: 40 }, () => mockApiRequest('/api/work-item-template')));
  expect(failed.every(result => result.status === 'rejected')).toBe(true);
  expect(request).toHaveBeenCalledTimes(1);
  await expect(mockApiRequest('/api/work-item-template')).resolves.toEqual([]);
  expect(request).toHaveBeenCalledTimes(2);
});

it('product saves hydrate the other configurations read alongside the latest product revision', async () => {
  let file = { productLines: [{ id: 'p', name: '原名', versions: [] }], researchTypes: [{ id: 't', name: '旧模板', category: '需求' }] };
  const request = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      file.productLines[0].name = JSON.parse(String(init.body)).productPatch.changes.name;
      return { ok: true, json: async () => ({ value: structuredClone(file.productLines) }) };
    }
    return { ok: true, json: async () => structuredClone(file) };
  });
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  await mockApiRequest('/api/product-lines');
  file.researchTypes[0].name = '其他页面的新模板';
  await mockApiRequest('/api/product-lines/p', { method: 'PUT', body: JSON.stringify({ name: '新名' }) });
  expect((await mockApiRequest('/api/work-item-template'))[0].name).toBe('其他页面的新模板');
  expect(request).toHaveBeenCalledTimes(3);
});
