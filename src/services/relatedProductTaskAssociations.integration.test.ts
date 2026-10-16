// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
    { id: 'product-1', title: '产品任务', category: 'requirement', productLineId: 'line-1', revision: 0 },
    { id: 'dev-1', title: '研发任务', category: 'dev', productLineId: 'line-1', relatedTaskIds: [], revision: 0 },
    { id: 'test-1', title: '测试任务', category: 'test', productLineId: 'line-1', relatedTaskIds: [], revision: 0 },
  ]));
});

it.each([
  ['dev-1', '/api/dev-tasks/dev-1'],
  ['test-1', '/api/work-items/test-1'],
])('persists a linked product task for %s', async (taskId, updatePath) => {
  await mockApiRequest(updatePath, {
    method: 'PUT',
    body: JSON.stringify({ relatedTaskIds: ['product-1'], revision: 0 }),
  });

  const detail = await mockApiRequest(`/api/work-items/${taskId}`);
  expect(detail.relatedTaskIds).toEqual(['product-1']);
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems') || '[]').find((task: { id: string }) => task.id === taskId).relatedTaskIds).toEqual(['product-1']);
});
