// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import { MOCK_REQUIREMENT_TASKS, MOCK_DESIGN_TASKS, MOCK_DEV_TASKS, MOCK_TEST_TASKS } from '../data/mockSnapshot';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it.each(['requirement', 'design', 'dev', 'test'])('resolves published status choices for snapshot %s tasks', async category => {
  const sources = { requirement: MOCK_REQUIREMENT_TASKS, design: MOCK_DESIGN_TASKS, dev: MOCK_DEV_TASKS, test: MOCK_TEST_TASKS };
  const task = sources[category as keyof typeof sources].find(item => item.productLineId)!;
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{ ...task, category }]));
  const result = await mockApiRequest(`/api/work-items/${task.id}/transitions?productLineId=${task.productLineId}`);
  expect(result.statuses.length).toBeGreaterThan(1);
});
it('recovers stale workflow identity using the same type published state definition', async () => {
  localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ id: 'line', workItemTypes: [{ id: 'type', category: '研发', workflow: { id: 'published', status: 'PUBLISHED', definition: { states: [{ key: 'todo', name: '待处理' }, { key: 'doing', name: '处理中' }], transitions: [{ key: 'start', from: 'todo', to: 'doing' }] } } }] }]));
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{ id: 'task', productLineId: 'line', taskTypeId: 'type', workflowId: 'old', statusKey: 'todo', status: '待处理' }]));
  const result = await mockApiRequest('/api/work-items/task/transitions?productLineId=line');
  expect(result.statuses).toHaveLength(2);
  expect(result.actions[0]).toMatchObject({ allowed: true, to: 'doing' });
});

it.each(['presales','delivery','ops'])('copies and archives %s tasks without relation endpoints', async kind => {
  const created = await mockApiRequest(`/api/${kind}-tasks`, { method: 'POST', body: JSON.stringify({ title: '可归档任务', projectId: 'project' }) });
  await mockApiRequest(`/api/${kind}-tasks/${created.id}`, { method: 'DELETE' });
  expect((await mockApiRequest(`/api/${kind}-tasks`)).items.some((item: {id: string}) => item.id === created.id)).toBe(false);
  await expect(mockApiRequest(`/api/${kind}-tasks/${created.id}/children`, { method: 'POST' })).rejects.toThrow('不支持');
});
