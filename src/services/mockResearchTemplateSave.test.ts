// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.stubEnv('DEV', true);
  vi.stubEnv('MODE', 'development');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('文件写入失败会拒绝保存并恢复浏览器配置', async () => {
  const initial = [{ id: 'type-1', category: '需求', name: '原类型', revision: 0 }];
  const request = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ researchTypes: initial }) })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ message: '文件写入失败' }) });
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  await expect(mockApiRequest('/api/work-item-template/types/type-1', { method: 'PUT', body: JSON.stringify({ name: '新类型' }) })).rejects.toThrow('文件写入失败');
  expect(await mockApiRequest('/api/work-item-template')).toEqual(initial);
  expect(JSON.parse(request.mock.calls[1][1].body).previous).toEqual(initial);
});

it('连续保存携带上次成功版本，重新加载以文件结果覆盖旧缓存', async () => {
  const initial = [{ id: 'type-1', category: '需求', name: '文件类型', revision: 0 }];
  const request = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ researchTypes: initial }) })
    .mockResolvedValue({ ok: true, json: async () => ({ saved: true }) });
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  localStorage.setItem('shichuang.frontend.mock.researchTypes', JSON.stringify([{ name: '旧缓存' }]));
  expect(await mockApiRequest('/api/work-item-template')).toEqual(initial);
  await mockApiRequest('/api/work-item-template/types/type-1', { method: 'PUT', body: JSON.stringify({ name: '第一次' }) });
  await mockApiRequest('/api/work-item-template/types/type-1', { method: 'PUT', body: JSON.stringify({ name: '第二次' }) });
  expect(JSON.parse(request.mock.calls[2][1].body).previous[0].name).toBe('第一次');
  expect((await mockApiRequest('/api/work-item-template'))[0].name).toBe('第二次');
});

it('产品通知、自动化和状态流程写入文件，刷新恢复且不影响其他产品或全局模板', async () => {
  let file: Record<string, any> = { productLines: [
    { id: 'p1', name: '演示一', versions: [], workItemTypes: [{ id: 't1', name: '类型一', category: '需求' }] },
    { id: 'p2', name: '演示二', versions: [] },
  ], researchNotifications: { marker: '全局通知' } };
  const request = vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PUT') { const input = JSON.parse(String(init.body)); expect(input.previous).toEqual(file[input.key] ?? null); file = { ...file, [input.key]: input.value }; }
    return { ok: true, json: async () => file };
  });
  vi.stubGlobal('fetch', request);
  let { mockApiRequest } = await import('./mockApi');
  const save = (path: string, body: unknown, method = 'PUT') => mockApiRequest(path, { method, body: JSON.stringify(body) });
  await save('/api/product-lines/p1/notification-settings', { marker: '产品通知' });
  await save('/api/product-lines/p1/automation-rules/setting', { enabled: false });
  const rule = await save('/api/product-lines/p1/automation-rules', { name: '演示规则', enabled: true }, 'POST');
  await save(`/api/product-lines/p1/automation-rules/${rule.id}`, { name: '已修改规则', revision: 0 });
  const workflow = await save('/api/product-lines/p1/work-item-types/t1/workflows', { category: 'requirement', name: '状态配置', definition: { states: [{ key: 'pending', name: '待处理' }] } }, 'POST');
  await save(`/api/product-lines/p1/workflows/${workflow.id}/publish`, { revision: 0 }, 'POST');
  localStorage.clear(); vi.resetModules();
  ({ mockApiRequest } = await import('./mockApi'));
  expect(await mockApiRequest('/api/product-lines/p1/notification-settings')).toEqual({ marker: '产品通知' });
  expect(await mockApiRequest('/api/product-lines/p2/notification-settings')).toEqual({ marker: '全局通知' });
  expect(await mockApiRequest('/api/notification-template')).toEqual({ marker: '全局通知' });
  expect(await mockApiRequest('/api/product-lines/p1/automation-rules')).toMatchObject({ enabled: false, rules: expect.arrayContaining([expect.objectContaining({ name: '已修改规则' })]) });
  expect(await mockApiRequest('/api/product-lines/p1/work-item-types/t1/workflows')).toEqual([expect.objectContaining({ status: 'PUBLISHED', definition: workflow.definition })]);
});

it('历史演示类型固定为五类，兼容旧缓存并保留有效类型', async () => {
  vi.stubEnv('MODE', 'test');
  const { MOCK_REQUIREMENT_TASKS } = await import('../data/mockSnapshot');
  const allowed = ['客户诉求', '线上问题', '售前支持', '交付支持', '其他问题'];
  expect(new Set(MOCK_REQUIREMENT_TASKS.map(item => item.workOrderType)).size).toBe(5);
  expect(MOCK_REQUIREMENT_TASKS.every(item => allowed.includes(item.workOrderType!))).toBe(true);
  const { mockApiRequest } = await import('./mockApi');
  const first = MOCK_REQUIREMENT_TASKS[0]; const second = MOCK_REQUIREMENT_TASKS[1];
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{ ...first, category: 'requirement', workOrderType: undefined }, { ...second, category: 'requirement', workOrderType: '交付支持' }]));
  const items = (await mockApiRequest('/api/requirements')).items;
  expect(items[0].workOrderType).toBe(first.workOrderType);
  expect(items[1].workOrderType).toBe('交付支持');
  expect((await mockApiRequest('/api/requirements')).items).toEqual(items);
});
