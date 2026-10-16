// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it('自定义工作项分类保存后可重新读取且不改写其他分类', async () => {
  const before = await mockApiRequest('/api/work-item-categories');
  await mockApiRequest('/api/work-item-categories', { method: 'POST', body: JSON.stringify({ code: 'custom_ops', name: '运维', displayName: '运维任务', iconKey: 'dev', capabilityType: 'STANDARD', sort: 1, enabled: true }) });
  const after = await mockApiRequest('/api/work-item-categories');
  expect(after.find((item: { code: string }) => item.code === 'custom_ops')).toMatchObject({ displayName: '运维任务', enabled: true });
  expect(after.filter((item: { code: string }) => item.code !== 'custom_ops')).toEqual(before);
});
