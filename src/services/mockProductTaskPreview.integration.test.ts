// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import { MOCK_USERS } from '../data/mockSnapshot';
import { PRODUCT_PREVIEW_SEED_VERSION } from '../data/mockProductTaskPreview';
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it('ships three owned and created samples for each product task category to a new browser', async () => {
  const admin = MOCK_USERS.find(user => user.role === 'admin')!;
  for (const category of ['requirement', 'design', 'dev', 'test', 'bug']) {
    const result = await mockApiRequest('/api/work-items?category=' + category);
    const samples = result.page.items.filter((item: { id: string }) => item.id.startsWith('demo-preview-'));
    expect(samples).toHaveLength(3);
    expect(samples.every((item: { assigneeName: string; creatorName: string }) => item.assigneeName === admin.name && item.creatorName === admin.name)).toBe(true);
  }
});
it('preserves browser edits and manual records without duplicating seeded product tasks', async () => {
  await mockApiRequest('/api/work-items?category=dev');
  const key = 'shichuang.frontend.mock.workItems';
  const tasks = JSON.parse(localStorage.getItem(key)!);
  tasks.find((item: { id: string }) => item.id === 'demo-preview-dev-1').title = '已编辑的演示任务';
  tasks.push({ id: 'manual-record', title: '手动记录', category: 'dev', status: '处理中' });
  localStorage.setItem(key, JSON.stringify(tasks));
  for (let count = 0; count < 2; count++) await mockApiRequest('/api/work-items?category=dev');
  const saved = JSON.parse(localStorage.getItem(key)!);
  expect(saved.filter((item: { id: string }) => item.id.startsWith('demo-preview-dev-'))).toHaveLength(3);
  expect(saved.find((item: { id: string }) => item.id === 'demo-preview-dev-1').title).toBe('已编辑的演示任务');
  expect(saved.find((item: { id: string }) => item.id === 'manual-record').title).toBe('手动记录');
  expect(localStorage.getItem(key + '.previewSeedVersion')).toBe(PRODUCT_PREVIEW_SEED_VERSION);
});
