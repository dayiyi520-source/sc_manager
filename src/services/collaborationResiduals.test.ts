// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
const base = 'shichuang.frontend.mock.';
const creator = { id: 'res-creator', name: '创建人' };
const owner = { id: 'res-owner', name: '处理人' };
const nextOwner = { id: 'res-next', name: '接收人' };
const login = (user = creator) => sessionStorage.setItem('shichuang.session', JSON.stringify({ user }));
const post = (path: string, body: Record<string, unknown> = {}, method = 'POST') => mockApiRequest(path, { method, body: JSON.stringify(body) });
const detail = (id: string) => mockApiRequest(`/api/requirements/${id}`);
const create = () => post('/api/requirements', { title: '持久化排查事项', description: '说明', dueDate: '2026-10-30', assigneeId: owner.id, workOrderType: '其他问题', specialFields: { problemType: '其他' }, creatorName: '错误作者', status: '已完成' });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); login();
  localStorage.setItem(base + 'teamMembers', JSON.stringify([creator, owner, nextOwner].map(item => ({ ...item, status: 'enabled' }))));
  localStorage.setItem(base + 'workItems', '[]');
});
it('creates, edits and rereads a real matter; creation identity and history cannot be replaced', async () => {
  const saved = await create();
  expect(await detail(saved.id)).toMatchObject({ creatorId: creator.id, creatorName: creator.name, assigneeId: owner.id, status: '待处理', revision: 0 });
  await post(`/api/requirements/${saved.id}`, { title: '修改事项', revision: 0, creatorName: '伪造', createdAt: '2000-01-01', events: [], workItems: [] }, 'PUT');
  expect(await detail(saved.id)).toMatchObject({ title: '修改事项', creatorId: creator.id, createdAt: saved.createdAt, revision: 1, events: [expect.objectContaining({ eventType: '提需求' }), expect.objectContaining({ eventType: '修改事项' })] });
  await expect(post(`/api/requirements/${saved.id}`, { title: '过期写入', revision: 0 }, 'PUT')).rejects.toThrow('更新');
  const page = await mockApiRequest('/api/requirements');
  expect(page.items).toContainEqual(expect.objectContaining({ id: saved.id, title: '修改事项' }));
});
it('requires the actual recipient to accept a transfer and persists both acceptance and rejection', async () => {
  const matter = await create(); login(owner);
  let saved = await post(`/api/requirements/${matter.id}/reassign`, { assigneeId: nextOwner.id, reason: '交接', revision: 0 });
  expect(saved.assigneeId).toBe(owner.id);
  const pendingId = saved.pendingReassignment.id;
  await expect(post(`/api/requirements/${matter.id}/reassign`, { assigneeId: nextOwner.id, reason: '重复', revision: 1 })).rejects.toThrow('待接收');
  await expect(post(`/api/requirements/reassign/${pendingId}/accept`, { revision: 1 })).rejects.toThrow('被转派人');
  login(nextOwner);
  await post(`/api/requirements/reassign/${pendingId}/reject`, { reason: '暂无法接收', revision: 1 });
  expect(await detail(matter.id)).toMatchObject({ assigneeId: owner.id, revision: 2 });
  login(owner); saved = await post(`/api/requirements/${matter.id}/reassign`, { assigneeId: nextOwner.id, reason: '重新交接', revision: 2 });
  login(nextOwner); await post(`/api/requirements/reassign/${saved.pendingReassignment.id}/accept`, { revision: 3 });
  expect(await detail(matter.id)).toMatchObject({ assigneeId: nextOwner.id, ownerName: nextOwner.name, revision: 4 });
  expect((await detail(matter.id)).pendingReassignment).toBeUndefined();
  await expect(post(`/api/requirements/reassign/${saved.pendingReassignment.id}/accept`, { revision: 4 })).rejects.toThrow('已处理');
});
it('rejects the removed memo operation without changing the matter', async () => {
  const saved = await create();
  await expect(post(`/api/requirements/${saved.id}/memo`, { content: '不应保存', revision: 0 })).rejects.toThrow();
  expect(await detail(saved.id)).toMatchObject({ status: saved.status, revision: saved.revision, events: saved.events });
});
it('keeps historical private records hidden from other viewers', async () => {
  const saved = await create();
  const items = JSON.parse(localStorage.getItem(base + 'workItems')!);
  const historicalEvent = { id: 'historical-private', eventType: '个人备忘录', reason: '历史私密内容', metadata: { privateAuthorId: creator.id } };
  localStorage.setItem(base + 'workItems', JSON.stringify(items.map((item: any) => item.id === saved.id ? { ...item, events: [...item.events, historicalEvent] } : item)));
  expect(JSON.stringify(await detail(saved.id))).toContain('历史私密内容');
  login(owner);
  expect(JSON.stringify(await detail(saved.id))).not.toContain('历史私密内容');
  expect(JSON.stringify(await mockApiRequest('/api/requirements'))).not.toContain('历史私密内容');
});
it.each(['presales', 'delivery', 'ops'])('persists %s task cards and their latest status in the source matter', async kind => {
  const matter = await create();
  const route = `/api/${kind === 'ops' ? 'ops' : kind}-tasks`;
  const task = await post(route, { title: '关联任务', projectId: 'project', sourceWorkOrderIds: [matter.id], ownerName: owner.name, assigneeId: owner.id });
  expect((await detail(matter.id)).workItems).toContainEqual(expect.objectContaining({ id: task.id, title: '关联任务', status: '待处理' }));
  await post(`${route}/${task.id}`, { status: '处理中' }, 'PUT');
  expect((await detail(matter.id)).workItems).toContainEqual(expect.objectContaining({ id: task.id, status: '处理中' }));
});
it('keeps task owner identity, dates, creator and attached summaries consistent after editing', async () => {
  const matter = await create();
  const task = { id: 'res-dev', title: '研发', category: 'dev', sourceWorkOrderIds: [matter.id], ownerName: owner.name, assigneeId: owner.id, creatorId: creator.id, creatorName: creator.name, createdAt: '2026-10-01', revision: 0 };
  const items = JSON.parse(localStorage.getItem(base + 'workItems')!);
  localStorage.setItem(base + 'workItems', JSON.stringify([...items, task]));
  await post('/api/work-items/res-dev', { assigneeName: nextOwner.name, plannedEndDate: '2026-11-01', creatorName: '伪造', createdAt: '2000-01-01', revision: 0 }, 'PUT');
  expect(await mockApiRequest('/api/work-items/res-dev')).toMatchObject({ assigneeId: nextOwner.id, assigneeName: nextOwner.name, dueDate: '2026-11-01', creatorName: creator.name, createdAt: '2026-10-01' });
  await post('/api/dev-tasks/res-dev', { title: '更新研发', revision: 1 }, 'PUT');
  expect((await detail(matter.id)).workItems).toContainEqual(expect.objectContaining({ id: task.id, title: '更新研发', taskType: '研发任务' }));
});
it('does not report unknown mutations as successful saves', async () => {
  await expect(post('/api/requirements/missing/reassign', { reason: '转派' })).rejects.toThrow('不存在');
  await expect(post('/api/requirements/missing/unsupported')).rejects.toThrow('数据未保存');
});

it('returns saved matter candidates with the picker contract', async () => {
  const matter = await create();
  const choices = await mockApiRequest('/api/requirements/work-order-candidates?keyword=持久化');
  expect(choices).toContainEqual(expect.objectContaining({ id: matter.id, type: 'requirement', typeLabel: '协同事项', sourceType: 'WORK_ORDER' }));
});

it('removes stale reverse cards when a task is unlinked from a matter', async () => {
  const matter = await create();
  localStorage.setItem(base + 'workItems', JSON.stringify([...JSON.parse(localStorage.getItem(base + 'workItems')!), { id: 'unlink-dev', title: '解除关联任务', category: 'dev', sourceWorkOrderIds: [matter.id], revision: 0 }]));
  await post('/api/work-items/unlink-dev', { title: '已关联', revision: 0 }, 'PUT');
  expect((await detail(matter.id)).workItems.map((item: {id: string}) => item.id)).toContain('unlink-dev');
  await post('/api/work-items/unlink-dev', { sourceWorkOrderIds: [], revision: 1 }, 'PUT');
  expect((await detail(matter.id)).workItems.map((item: {id: string}) => item.id)).not.toContain('unlink-dev');
});
