// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
const item = { id: 'task', productLineId: 'line', taskTypeId: 'type', category: 'dev', statusKey: 'doing', status: '研发中', revision: 2, title: '复盘验收' };
const workflow = { id: 'flow', status: 'PUBLISHED', definition: { states: [{ key: 'doing', name: '研发中', enabled: true }, { key: 'done', name: '已完成', enabled: true, successful: true }], transitions: [{ key: 'finish', from: 'doing', to: 'done', roles: ['admin'], requiredFields: ['reason'] }] } };
const review = { content: '补充回归覆盖', media: [{ id: 'media', name: '复盘.txt', type: 'file', dataUrl: 'data:text/plain;base64,b2s=' }] };
const route = '/api/work-items/task/transitions?productLineId=line';
const complete = (body = {}) => mockApiRequest(route, { method: 'POST', body: JSON.stringify({ edgeKey: 'finish', revision: 2, reason: '验收完成', actualHours: 3.25, completionReview: review, ...body }) });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([item]));
  localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ id: 'line', workItemTypes: [{ id: 'type', workflow }] }]));
  sessionStorage.setItem('shichuang.session', JSON.stringify({ user: { role: 'admin' } }));
});
it('saves completion hours, summary and attachment together and reads them again', async () => {
  expect(await mockApiRequest(route)).toMatchObject({ revision: 2, actions: [{ edgeKey: 'finish', allowed: true }] });
  expect(await complete()).toMatchObject({ status: { name: '已完成' }, actualHours: 3.25, completionReview: review, revision: 3 });
  expect(await mockApiRequest('/api/work-items/task')).toMatchObject({ actualHours: 3.25, completionReview: review, revision: 3 });
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems')!)[0]).toMatchObject({ status: '已完成', completionReview: review });
  await expect(complete()).rejects.toThrow('任务已被其他人更新');
});
it('rejects invalid attachments, hours and missing reasons without partial writes', async () => {
  await expect(complete({ completionReview: { content: '', media: [{ name: 'invalid' }] } })).rejects.toThrow('附件数据无效');
  await expect(complete({ actualHours: -1 })).rejects.toThrow('完成工时');
  await expect(complete({ reason: '' })).rejects.toThrow('状态变更原因');
  expect(await mockApiRequest('/api/work-items/task')).toMatchObject({ status: { name: '研发中' }, revision: 2 });
  expect(localStorage.getItem('shichuang.frontend.mock.taskActivities')).toBeNull();
});
it('preserves role, product and parent restrictions', async () => {
  sessionStorage.setItem('shichuang.session', JSON.stringify({ user: { role: 'viewer' } }));
  await expect(complete()).rejects.toThrow('无权');
  sessionStorage.setItem('shichuang.session', JSON.stringify({ user: { role: 'admin' } }));
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{ ...item, hasChildren: true }]));
  await expect(complete()).rejects.toThrow('父任务');
  await expect(mockApiRequest('/api/work-items/task/transitions?productLineId=other')).rejects.toThrow('任务不存在');
});
it('requires a project for ops creation and persists completion review', async () => {
  await expect(mockApiRequest('/api/ops-tasks', { method: 'POST', body: JSON.stringify({ title: '运维验收' }) })).rejects.toThrow('关联项目');
  const created = await mockApiRequest('/api/ops-tasks', { method: 'POST', body: JSON.stringify({ title: '运维验收', projectId: 'project' }) });
  await mockApiRequest(`/api/ops-tasks/${created.id}`, { method: 'PUT', body: JSON.stringify({ status: '已完成', actualHours: 2, completionReview: review }) });
  await mockApiRequest(`/api/ops-tasks/${created.id}`, { method: 'PUT', body: JSON.stringify({ status: '已完成', title: '运维验收更新' }) });
  expect(await mockApiRequest(`/api/ops-tasks/${created.id}`)).toMatchObject({ projectId: 'project', status: '已完成', actualHours: 2, completionReview: review });
});

it('restores snapshot task workflow bindings even when browser task caches lack them', async () => {
  localStorage.clear();
  const { MOCK_REQUIREMENT_TASKS } = await import('../data/mockSnapshot');
  const task = MOCK_REQUIREMENT_TASKS.find(task => task.title && task.productLineId)!;
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{ ...task, category: 'requirement' }]));
  const path = `/api/work-items/${task.id}/transitions?productLineId=${task.productLineId}`;
  let options = await mockApiRequest(path);
  expect(options.statuses.length).toBeGreaterThan(1);
  // Follow the published flow to completion, preserving validation and revision checks.
  for (let step = 0; step < 16 && !options.statuses.some((state: any) => state.current && state.name === '已完成'); step++) {
    const action = options.actions.find((action: any) => action.allowed && options.statuses.find((state: any) => state.key === action.to)?.name === '已完成') || options.actions.find((action: any) => action.allowed && !/取消|关闭|退回/.test(options.statuses.find((state: any) => state.key === action.to)?.name || ''));
    expect(action).toBeDefined();
    await mockApiRequest(path, { method: 'POST', body: JSON.stringify({ edgeKey: action.edgeKey, revision: options.revision, reason: '流程验收', actualHours: 2, completionReview: review }) });
    options = await mockApiRequest(path);
  }
  expect(await mockApiRequest(`/api/work-items/${task.id}`)).toMatchObject({ status: { name: '已完成' }, actualHours: 2 });
});
