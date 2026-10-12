// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import { MOCK_SNAPSHOT_VERSION } from '../data/mockSnapshot';
import type { RequirementTask } from '../types';
import type { PageResult } from './apiClient';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
const create = async (kind: 'presales' | 'delivery', title: string) => await mockApiRequest('/api/' + kind + '-tasks', { method: 'POST', body: JSON.stringify({ title }) }) as { id: string };
describe('local commercial task routes', () => {
  it('seeds eight tasks per kind and paginates independent stores', async () => {
    expect((await mockApiRequest('/api/presales-tasks') as PageResult<RequirementTask>).total).toBe(8);
    const first = await create('presales', '售前一');
    const second = await create('presales', '售前二');
    const delivery = await create('delivery', '交付一');
    const page1 = await mockApiRequest('/api/presales-tasks?page=1&pageSize=1') as PageResult<RequirementTask>;
    const page2 = await mockApiRequest('/api/presales-tasks?page=2&pageSize=1') as PageResult<RequirementTask>;
    expect(page1).toMatchObject({ total: 10, items: [{ id: second.id }] });
    expect(page2.items.map(item => item.id)).toEqual([first.id]);
    const deliveries = await mockApiRequest('/api/delivery-tasks') as PageResult<RequirementTask>;
    expect(deliveries.total).toBe(9);
    expect(deliveries.items[0].id).toBe(delivery.id);
  });
  it('retains stored tasks and edited sample records when adding missing samples', async () => {
    const key = 'shichuang.frontend.mock.presalesTasks';
    localStorage.setItem(key + '.snapshotVersion', MOCK_SNAPSHOT_VERSION);
    localStorage.setItem(key, JSON.stringify([{ id: 'manual-task', title: '用户已有任务' }, { id: 'demo-presales-1', title: '用户编辑后的样例' }]));
    const first = await mockApiRequest('/api/presales-tasks') as PageResult<RequirementTask>;
    const second = await mockApiRequest('/api/presales-tasks') as PageResult<RequirementTask>;
    expect(first.total).toBe(9);
    expect(second.items).toEqual(first.items);
    expect(first.items.find(item => item.id === 'manual-task')?.title).toBe('用户已有任务');
    expect(first.items.find(item => item.id === 'demo-presales-1')?.title).toBe('用户编辑后的样例');
  });
  it('honors a persisted empty array after initialization instead of repeatedly reseeding', async () => {
    await mockApiRequest('/api/delivery-tasks');
    localStorage.setItem('shichuang.frontend.mock.deliveryTasks', '[]');
    expect((await mockApiRequest('/api/delivery-tasks') as PageResult<RequirementTask>).total).toBe(0);
  });
  it.each(['presales', 'delivery'])('provides stable unique %s samples with populated business fields', async kind => {
    const result = await mockApiRequest('/api/' + kind + '-tasks') as PageResult<RequirementTask>;
    expect(result.items).toHaveLength(8);
    expect(new Set(result.items.map(item => item.id)).size).toBe(8);
    expect(new Set(result.items.map(item => item.code)).size).toBe(8);
    expect(new Set(result.items.map(item => item.status)).size).toBeGreaterThan(3);
    expect(result.items.every(item => item.ownerName && item.creatorName && item.createdAt && item.projectName && item.customerName)).toBe(true);
    expect((await mockApiRequest('/api/' + kind + '-tasks') as PageResult<RequirementTask>).items).toEqual(result.items);
  });
  it('persists creation and edits while protecting identity and creation information', async () => {
    const created = await create('presales', '新增售前任务');
    const before = await mockApiRequest('/api/presales-tasks/' + created.id) as RequirementTask;
    await mockApiRequest('/api/presales-tasks/' + created.id, { method: 'PUT', body: JSON.stringify({ title: '更新标题', id: '冒充', code: '冒充', creatorName: '冒充', createdAt: '冒充' }) });
    expect(await mockApiRequest('/api/presales-tasks/' + created.id)).toMatchObject({ title: '更新标题', id: before.id, code: before.code, creatorName: before.creatorName, createdAt: before.createdAt });
    await expect(mockApiRequest('/api/delivery-tasks/missing')).rejects.toThrow('不存在');
  });
  it('rejects invalid writes without changing task counts', async () => {
    await expect(create('presales', '  ')).rejects.toThrow('标题不能为空');
    expect((await mockApiRequest('/api/presales-tasks') as PageResult<RequirementTask>).total).toBe(8);
    const created = await create('delivery', '交付任务');
    await expect(mockApiRequest('/api/delivery-tasks/' + created.id, { method: 'PUT', body: JSON.stringify({ status: '已完成' }) })).rejects.toThrow('完成工时');
    expect(await mockApiRequest('/api/delivery-tasks/' + created.id)).toMatchObject({ status: '待处理' });
  });
  it('retains task comments and operations across subsequent reads', async () => {
    const created = await create('delivery', '交付任务');
    await mockApiRequest('/api/delivery-tasks/' + created.id + '/comments', { method: 'POST', body: JSON.stringify({ content: '已联系客户' }) });
    const activities = await mockApiRequest('/api/delivery-tasks/' + created.id + '/activities') as Array<{ eventType: string; content: unknown }>;
    expect(activities.map(event => event.eventType)).toEqual(['WORK_ITEM_CREATED', 'WORK_ITEM_COMMENTED']);
    expect(activities[1].content).toEqual({ content: '已联系客户' });
    await expect(mockApiRequest('/api/delivery-tasks/' + created.id + '/comments', { method: 'POST', body: JSON.stringify({ content: ' ' }) })).rejects.toThrow('评论内容');
  });
});
