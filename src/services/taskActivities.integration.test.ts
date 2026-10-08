// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

beforeEach(() => localStorage.clear());
it('persists creation, field edits, state changes and comments together', async () => {
  const task = await mockApiRequest('/api/ops-tasks', { method: 'POST', body: JSON.stringify({ title: '巡检任务' }) });
  const path = `/api/ops-tasks/${task.id}`;
  await mockApiRequest(path, { method: 'PUT', body: JSON.stringify({ title: '巡检与告警', status: '已完成', actualHours: 2 }) });
  await mockApiRequest(`${path}/comments`, { method: 'POST', body: JSON.stringify({ content: '  已确认  ' }) });
  const activities = await mockApiRequest(`${path}/activities`);
  expect(activities.map((event: any) => event.eventType)).toEqual(['WORK_ITEM_CREATED', 'WORK_ITEM_UPDATED', 'WORK_ITEM_COMMENTED']);
  expect(activities[1].content.changes).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'title', from: '巡检任务', to: '巡检与告警' }), expect.objectContaining({ field: 'status', to: '已完成' })]));
  expect(activities[2].content.content).toBe('已确认');
  expect(await mockApiRequest(`${path}/activities`)).toEqual(activities);
  await mockApiRequest(path, { method: 'PUT', body: JSON.stringify({ title: '巡检与告警' }) });
  expect(await mockApiRequest(`${path}/activities`)).toHaveLength(3);
  await expect(mockApiRequest(`${path}/comments`, { method: 'POST', body: '{"content":" "}' })).rejects.toThrow('不能为空');
  expect(await mockApiRequest(`${path}/activities`)).toHaveLength(3);
  expect(await mockApiRequest('/api/ops-tasks/demo-ops-1/activities')).not.toEqual(activities);
});
