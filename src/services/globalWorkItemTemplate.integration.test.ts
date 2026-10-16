// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import { categoryCode } from '../utils/workItemCategories';

describe('统一产研工作项模板', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('五类任务在不同产品使用同一全局类型及初始状态，忽略产品级覆盖', async () => {
    const products = await mockApiRequest('/api/product-lines');
    const templates = await mockApiRequest('/api/work-item-template');
    for (const category of ['requirement', 'design', 'dev', 'test', 'bug']) {
      const type = templates.find((item: { category: string; enabled: boolean; workflow?: { definition?: { states?: unknown[] } } }) => categoryCode(item.category) === category && item.enabled && item.workflow?.definition?.states?.length);
      expect(type, `${category}应有可用全局类型`).toBeTruthy();
      const [first, second] = products.slice(0, 2);
      const override = { id: `product-only-${category}`, category: type.category, name: '产品专属类型', enabled: true, isDefault: true };
      const stored = JSON.parse(localStorage.getItem('shichuang.frontend.mock.productLines') || JSON.stringify(products));
      localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify(stored.map((line: { id: string }) => line.id === first.id ? { ...line, workItemTypes: [override] } : line)));
      const listed = await mockApiRequest(`/api/product-lines/${first.id}/work-item-types?category=${encodeURIComponent(type.category)}`);
      expect(listed.some((item: { id: string }) => item.id === type.id)).toBe(true);
      expect(listed.some((item: { id: string }) => item.id === override.id)).toBe(false);
      for (const product of [first, second]) {
        const task = await mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ title: `${category}统一模板`, productLineId: product.id, category, taskTypeId: type.id, requestId: `${category}-${product.id}` }) });
        expect(task).toMatchObject({ taskTypeId: type.id, workflowId: type.workflow.id, status: expect.objectContaining({ name: type.workflow.definition.states.find((state: { initial: boolean }) => state.initial).name }) });
      }
      await expect(mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ title: '无效产品覆盖', productLineId: first.id, category, taskTypeId: override.id }) })).rejects.toThrow('工作项类型不可用');
    }
  });

  it('全局状态更新产生新流程，已绑定任务继续使用历史流程', async () => {
    const product = (await mockApiRequest('/api/product-lines'))[0];
    const type = (await mockApiRequest('/api/work-item-template')).find((item: { category: string; enabled: boolean; workflow?: { definition?: { states?: unknown[] } } }) => categoryCode(item.category) === 'requirement' && item.enabled && item.workflow?.definition?.states?.length);
    const old = await mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ title: '历史任务', category: 'requirement', productLineId: product.id, taskTypeId: type.id, requestId: 'historical-global' }) });
    const previous = await mockApiRequest(`/api/work-items/${old.id}/transitions?productLineId=${product.id}`);
    const nextDefinition = { ...type.workflow.definition, states: [...type.workflow.definition.states, { key: 'new-review', name: '新审核', group: 'IN_PROGRESS', enabled: true, initial: false }] };
    await mockApiRequest(`/api/work-item-template/types/${type.id}/workflow`, { method: 'PUT', body: JSON.stringify({ category: 'requirement', name: '新版状态', definition: nextDefinition }) });
    const current = (await mockApiRequest('/api/work-item-template')).find((item: { id: string }) => item.id === type.id);
    expect(current.workflow.id).not.toBe(type.workflow.id);
    await expect(mockApiRequest(`/api/work-item-template/types/${type.id}/workflow`, { method: 'PUT', body: JSON.stringify({ revision: type.workflow.revision, definition: nextDefinition }) })).rejects.toThrow('已更新');
    const historical = await mockApiRequest(`/api/work-items/${old.id}/transitions?productLineId=${product.id}`);
    expect(historical.statuses).toEqual(previous.statuses);
    expect(historical.statuses.some((state: { key: string }) => state.key === 'new-review')).toBe(false);
    const fresh = await mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ title: '新任务', category: 'requirement', productLineId: product.id, taskTypeId: type.id, requestId: 'current-global' }) });
    expect(fresh.workflowId).toBe(current.workflow.id);
  });

  it('模板停用或删除后禁止新建，历史任务保留已绑定状态', async () => {
    const product = (await mockApiRequest('/api/product-lines'))[0];
    const type = (await mockApiRequest('/api/work-item-template')).find((item: { category: string; enabled: boolean; workflow?: { definition?: { states?: unknown[] } } }) => categoryCode(item.category) === 'dev' && item.enabled && item.workflow?.definition?.states?.length);
    const existing = await mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ title: '已创建研发任务', category: 'dev', productLineId: product.id, taskTypeId: type.id }) });
    await mockApiRequest(`/api/work-item-template/types/${type.id}`, { method: 'PUT', body: JSON.stringify({ enabled: false }) });
    await expect(mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ title: '停用后新建', category: 'dev', productLineId: product.id, taskTypeId: type.id }) })).rejects.toThrow('工作项类型不可用');
    await mockApiRequest(`/api/work-item-template/types/${type.id}`, { method: 'DELETE' });
    expect((await mockApiRequest('/api/work-item-template')).some((item: { id: string }) => item.id === type.id)).toBe(false);
    expect((await mockApiRequest(`/api/work-items/${existing.id}/transitions?productLineId=${product.id}`)).statuses.length).toBeGreaterThan(0);
  });

  it('模板缺少已发布初始状态时阻止新建，不使用产品旧流程兜底', async () => {
    const product = (await mockApiRequest('/api/product-lines'))[0];
    const created = await mockApiRequest('/api/work-item-template/types', { method: 'POST', body: JSON.stringify({ category: '测试', name: '未发布模板', enabled: true }) });
    await expect(mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ title: '不可创建', category: 'test', productLineId: product.id, taskTypeId: created.id }) })).rejects.toThrow('未配置已发布的初始状态');
  });
});
