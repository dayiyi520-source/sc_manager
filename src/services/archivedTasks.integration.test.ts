// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

describe('统一归档任务', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

  it('汇总产品及三类业务任务，并按来源恢复及校验版本', async () => {
    const product = (await mockApiRequest('/api/product-lines'))[0];
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{
      id: 'archived-product-task', title: '产品归档任务', category: 'requirement',
      productLineId: product.id, deleted: true, deleteFlag: 1, revision: 2,
      operatedAt: '2026-10-16T08:00:00Z', operatorName: '管理员'
    }]));
    const created = await Promise.all((['presales', 'delivery', 'ops'] as const).map((kind) => mockApiRequest(`/api/${kind}-tasks`, { method: 'POST', body: JSON.stringify({ title: `${kind}归档任务`, projectId: 'project' }) })));
    await Promise.all((['presales', 'delivery', 'ops'] as const).map((kind, index) => mockApiRequest(`/api/${kind}-tasks/${created[index].id}`, { method: 'DELETE' })));

    const archived = await mockApiRequest('/api/archived-tasks');
    const productItem = archived.find((item: { id: string }) => item.id === 'archived-product-task');
    expect(productItem).toMatchObject({ taskType: '产品任务', sourceName: product.name });
    for (const kind of ['presales', 'delivery', 'ops'] as const) {
      expect(archived.some((item: { category: string }) => item.category === kind)).toBe(true);
    }
    await expect(mockApiRequest('/api/archived-tasks/requirement/archived-product-task/restore', { method: 'POST', body: JSON.stringify({ revision: 1 }) })).rejects.toThrow('已更新');
    await mockApiRequest('/api/archived-tasks/requirement/archived-product-task/restore', { method: 'POST', body: JSON.stringify({ revision: productItem.revision }) });
    const businessItem = archived.find((item: { category: string }) => item.category === 'ops');
    await mockApiRequest(`/api/archived-tasks/ops/${businessItem.id}/restore`, { method: 'POST', body: JSON.stringify({ revision: businessItem.revision }) });
    expect((await mockApiRequest('/api/archived-tasks')).some((item: { id: string }) => item.id === businessItem.id)).toBe(false);
    expect((await mockApiRequest('/api/ops-tasks')).items.some((item: { id: string }) => item.id === businessItem.id)).toBe(true);
    const purgeItem = archived.find((item: { category: string }) => item.category === 'delivery');
    await mockApiRequest(`/api/archived-tasks/delivery/${purgeItem.id}?revision=${purgeItem.revision}`, { method: 'DELETE' });
    expect((await mockApiRequest('/api/archived-tasks')).some((item: { id: string }) => item.id === purgeItem.id)).toBe(false);
  });
});
