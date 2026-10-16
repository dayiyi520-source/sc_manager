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
    .mockResolvedValueOnce({ ok: false, json: async () => ({ message: '文件写入失败' }) })
    .mockResolvedValue({ ok: true, json: async () => ({ researchTypes: initial }) });
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  await expect(mockApiRequest('/api/work-item-template/types/type-1', { method: 'PUT', body: JSON.stringify({ name: '新类型' }) })).rejects.toThrow('文件写入失败');
  expect(await mockApiRequest('/api/work-item-template')).toEqual(initial);
  expect(JSON.parse(request.mock.calls[1][1].body).previous).toEqual(initial);
});

it('连续保存携带上次成功版本，重新加载以文件结果覆盖旧缓存', async () => {
  const initial = [{ id: 'type-1', category: '需求', name: '文件类型', revision: 0 }];
  const request = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ researchTypes: initial }) })
    .mockImplementation(async (_path, init) => init?.method === 'PUT' ? { ok: true, json: async () => ({ saved: true }) } : { ok: true, json: async () => ({ researchTypes: JSON.parse(localStorage.getItem('shichuang.frontend.mock.researchTypes') || '[]') }) });
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  localStorage.setItem('shichuang.frontend.mock.researchTypes', JSON.stringify([{ name: '旧缓存' }]));
  expect(await mockApiRequest('/api/work-item-template')).toEqual(initial);
  await mockApiRequest('/api/work-item-template/types/type-1', { method: 'PUT', body: JSON.stringify({ name: '第一次' }) });
  await mockApiRequest('/api/work-item-template/types/type-1', { method: 'PUT', body: JSON.stringify({ name: '第二次' }) });
  const writes = request.mock.calls.filter(call => call[1]?.method === 'PUT');
  expect(JSON.parse(writes[1][1].body).previous[0].name).toBe('第一次');
  expect((await mockApiRequest('/api/work-item-template'))[0].name).toBe('第二次');
});

it('产品通知和状态流程写入文件，刷新恢复且不影响其他产品或全局模板', async () => {
  let file: Record<string, any> = { productLines: [
    { id: 'p1', name: '演示一', versions: [], workItemTypes: [{ id: 't1', name: '类型一', category: '需求', enabled: true }] },
    { id: 'p2', name: '演示二', versions: [] },
  ], researchTypes: [{ id: 't1', name: '类型一', category: '需求', enabled: true }], researchNotifications: { marker: '全局通知' } };
  const request = vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PUT') { const input = JSON.parse(String(init.body)); expect(input.previous).toEqual(file[input.key] ?? null); file = { ...file, [input.key]: input.value }; }
    return { ok: true, json: async () => file };
  });
  vi.stubGlobal('fetch', request);
  let { mockApiRequest } = await import('./mockApi');
  const save = (path: string, body: unknown, method = 'PUT') => mockApiRequest(path, { method, body: JSON.stringify(body) });
  await save('/api/product-lines/p1/notification-settings', { marker: '产品通知' });
  const [{ id: typeId }] = await mockApiRequest('/api/product-lines/p1/work-item-types');
  const workflow = await save(`/api/product-lines/p1/work-item-types/${typeId}/workflows`, { category: 'requirement', name: '状态配置', definition: { states: [{ key: 'pending', name: '待处理' }] } }, 'POST');
  await save(`/api/product-lines/p1/workflows/${workflow.id}/publish`, { revision: 0 }, 'POST');
  localStorage.clear(); vi.resetModules();
  ({ mockApiRequest } = await import('./mockApi'));
  expect(await mockApiRequest('/api/product-lines/p1/notification-settings')).toEqual({ marker: '产品通知' });
  expect(await mockApiRequest('/api/product-lines/p2/notification-settings')).toEqual({ marker: '全局通知' });
  expect(await mockApiRequest('/api/notification-template')).toEqual({ marker: '全局通知' });
  expect(await mockApiRequest(`/api/product-lines/p1/work-item-types/${typeId}/workflows`)).toEqual(expect.arrayContaining([expect.objectContaining({ status: 'PUBLISHED', definition: workflow.definition })]));
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


it('基本信息只提交当前产品变化字段，读取刷新更新基准且不覆盖其他产品', async () => {
  let file: Record<string, any> = { productLines: [{ id: 'p1', name: '原名', description: '原描述', versions: [] }, { id: 'p2', name: '其他产品', versions: [] }] };
  const request = vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      const input = JSON.parse(String(init.body));
      expect(input.productPatch).toEqual(expect.objectContaining({ id: 'p1', changes: expect.objectContaining({ name: '新名' }), previous: expect.objectContaining({ name: '原名' }) }));
      expect(input.productPatch.changes).not.toHaveProperty('workItemTypes');
      file.productLines = file.productLines.map((product: any) => product.id === 'p1' ? { ...product, ...input.productPatch.changes } : product);
      return { ok: true, json: async () => ({ saved: true, value: file.productLines }) };
    }
    return { ok: true, json: async () => structuredClone(file) };
  });
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  await mockApiRequest('/api/product-lines');
  file.productLines[1].name = '其他页面修改了另一个产品';
  await mockApiRequest('/api/product-lines/p1', { method: 'PUT', body: JSON.stringify({ name: '新名', description: '原描述' }) });
  expect(file.productLines[1].name).toBe('其他页面修改了另一个产品');
  file.productLines[0].description = '外部新描述';
  window.dispatchEvent(new Event('focus'));
  expect((await mockApiRequest('/api/product-lines')).find((product: any) => product.id === 'p1').description).toBe('外部新描述');
});

it('当前字段冲突拒绝写入，刷新重新读取后可保存；写入失败不会修改缓存', async () => {
  let file: Record<string, any> = { productLines: [{ id: 'p', name: '原名', versions: [] }] };
  let fail = false;
  const request = vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      if (fail) return { ok: false, json: async () => ({ message: '文件写入失败' }) };
      const input = JSON.parse(String(init.body));
      file.productLines[0] = { ...file.productLines[0], ...input.productPatch.changes };
      return { ok: true, json: async () => ({ saved: true, value: structuredClone(file.productLines) }) };
    }
    return { ok: true, json: async () => structuredClone(file) };
  });
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  await mockApiRequest('/api/product-lines');
  file.productLines[0].name = '他人改名';
  const save = () => mockApiRequest('/api/product-lines/p', { method: 'PUT', body: JSON.stringify({ name: '我的输入' }) });
  await expect(save()).rejects.toThrow('产品信息已被修改');
  expect(request.mock.calls.filter(call => call[1]?.method === 'PUT')).toHaveLength(0);
  expect(file.productLines[0].name).toBe('他人改名');
  await mockApiRequest('/api/product-lines');
  const before = localStorage.getItem('shichuang.frontend.mock.productLines');
  fail = true;
  await expect(save()).rejects.toThrow('文件写入失败');
  expect(localStorage.getItem('shichuang.frontend.mock.productLines')).toBe(before);
  fail = false;
  await save();
  expect(file.productLines[0].name).toBe('我的输入');
});

it('保存前读取失败不写入，校验后发生竞争也不覆盖并可重试', async () => {
  let failRead = false;
  let race = false;
  let file = { productLines: [{ id: 'p', name: '原名', versions: [] }] };
  const request = vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      if (race) return { ok: false, json: async () => ({ message: '产品信息已被修改，请刷新产品信息后重试；当前填写内容已保留' }) };
      const input = JSON.parse(String(init.body));
      file.productLines[0] = { ...file.productLines[0], ...input.productPatch.changes };
      return { ok: true, json: async () => ({ saved: true, value: structuredClone(file.productLines) }) };
    }
    return failRead ? { ok: false, json: async () => ({ message: '读取失败' }) } : { ok: true, json: async () => structuredClone(file) };
  });
  vi.stubGlobal('fetch', request);
  const { mockApiRequest } = await import('./mockApi');
  await mockApiRequest('/api/product-lines');
  const before = localStorage.getItem('shichuang.frontend.mock.productLines');
  const save = () => mockApiRequest('/api/product-lines/p', { method: 'PUT', body: JSON.stringify({ name: '新名' }) });
  failRead = true;
  await expect(save()).rejects.toThrow('读取失败');
  expect(request.mock.calls.filter(call => call[1]?.method === 'PUT')).toHaveLength(0);
  failRead = false; race = true;
  await expect(save()).rejects.toThrow('产品信息已被修改');
  expect(localStorage.getItem('shichuang.frontend.mock.productLines')).toBe(before);
  race = false;
  await save();
  expect(file.productLines[0].name).toBe('新名');
});
