// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

beforeEach(() => localStorage.clear());

describe('local operations tasks', () => {
  it('provides four distinct samples and opens their details', async () => {
    const list = await mockApiRequest('/api/ops-tasks');
    expect(list.items).toHaveLength(4);
    expect(new Set(list.items.map((item: { code: string }) => item.code)).size).toBe(4);
    expect(new Set(list.items.map((item: { status: string }) => item.status)).size).toBe(4);
    expect(await mockApiRequest(`/api/ops-tasks/${list.items[0].id}`)).toMatchObject(list.items[0]);
    expect((await mockApiRequest('/api/ops-tasks')).total).toBe(4);
  });

  it('retains edits and new tasks across repeated reads without reseeding', async () => {
    await mockApiRequest('/api/ops-tasks/demo-ops-1', { method: 'PUT', body: JSON.stringify({ title: '调整后的告警策略', id: 'invalid', code: 'invalid' }) });
    const created = await mockApiRequest('/api/ops-tasks', { method: 'POST', body: JSON.stringify({ title: '新增巡检任务', ownerName: '值班人员' }) });
    expect((await mockApiRequest('/api/ops-tasks')).total).toBe(5);
    expect(await mockApiRequest('/api/ops-tasks/demo-ops-1')).toMatchObject({ title: '调整后的告警策略', id: 'demo-ops-1', code: 'OPS-DEMO-001' });
    expect(await mockApiRequest(`/api/ops-tasks/${created.id}`)).toMatchObject({ title: '新增巡检任务' });
  });

  it('rejects missing records and blank titles without changing stored tasks', async () => {
    await expect(mockApiRequest('/api/ops-tasks/missing')).rejects.toThrow('不存在');
    await expect(mockApiRequest('/api/ops-tasks/missing', { method: 'PUT', body: '{}' })).rejects.toThrow('不存在');
    await expect(mockApiRequest('/api/ops-tasks/demo-ops-1', { method: 'PUT', body: JSON.stringify({ title: ' ' }) })).rejects.toThrow('不能为空');
    await expect(mockApiRequest('/api/ops-tasks', { method: 'POST', body: JSON.stringify({ title: '' }) })).rejects.toThrow('不能为空');
    expect((await mockApiRequest('/api/ops-tasks')).total).toBe(4);
  });
});
