// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import { MOCK_PRODUCT_LINES, MOCK_USERS } from '../data/mockSnapshot';
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

it('returns active product work items for the product iteration timeline', async () => {
  const product = MOCK_PRODUCT_LINES.find((item) => item.versions?.length) || MOCK_PRODUCT_LINES[0];
  const version = product.versions?.[0];
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
    { id: 'timeline-active', title: '迭代任务', category: 'dev', productLineId: product.id, versionId: version?.id, status: '处理中' },
    { id: 'timeline-deleted', title: '已归档任务', category: 'dev', productLineId: product.id, versionId: version?.id, deleted: true, status: '处理中' },
  ]));

  const result = await mockApiRequest(`/api/product-lines/${product.id}/iteration-timeline`);

  expect(result).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'timeline-active', productLineId: product.id, versionId: version?.id, versionName: version?.name || '' }),
  ]));
  expect(result).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'timeline-deleted' })]));
});


it('does not classify pending or cancelled string statuses as processing', async () => {
  await mockApiRequest('/api/work-items');
  const key = 'shichuang.frontend.mock.workItems';
  const tasks = JSON.parse(localStorage.getItem(key)!);
  const product = MOCK_PRODUCT_LINES[0];
  for (const [index, status] of ['待处理', '处理中', '已完成', '已取消', '未知状态'].entries()) {
    tasks.push({ id: `group-regression-${index}`, title: status, category: 'requirement', productLineId: product.id, status });
  }
  localStorage.setItem(key, JSON.stringify(tasks));
  const result = await mockApiRequest(`/api/work-items?productLineId=${product.id}&pageSize=200`);
  const group = (index: number) => result.page.items.find((item: { id: string }) => item.id === `group-regression-${index}`).status.group;
  expect(group(0)).toBe('NOT_STARTED');
  expect(group(1)).toBe('IN_PROGRESS');
  expect(group(2)).toBe('COMPLETED');
  expect(group(3)).not.toBe('IN_PROGRESS');
  expect(group(4)).not.toBe('IN_PROGRESS');
});


it('preserves custom published workflow grouping instead of guessing by status name', async () => {
  localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ id: 'custom-line', workItemTypes: [{ id: 'custom-type', category: '研发', enabled: true, workflow: { id: 'custom-flow', status: 'PUBLISHED', definition: { states: [{ key: 'queued', name: '等待排期', group: 'NOT_STARTED', enabled: true }, { key: 'working', name: '联调中', group: 'IN_PROGRESS', enabled: true }] } } }] }]));
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([{ id: 'custom-group', title: '排期工作', category: 'dev', productLineId: 'custom-line', taskTypeId: 'custom-type', workflowId: 'custom-flow', statusKey: 'queued', status: '等待排期' }]));
  const item = await mockApiRequest('/api/work-items/custom-group');
  expect(item.status).toMatchObject({ name: '等待排期', group: 'NOT_STARTED' });
});
