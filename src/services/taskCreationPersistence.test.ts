// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { mockApiRequest } from './mockApi';
import { updateSessionUser, readSession } from './session';
import { productRepository } from './productRepository';
import { loadProductTaskAllocation } from '../components/product/ProductTaskAllocationView';
import type { CurrentUser, ProductLine } from '../types';

const product = { id: 'data-product', name: '院校门户系统', versions: [{ id: 'data-version', name: '同名版本', productLineId: 'data-product' }] } as ProductLine;
const user = (id: string, name: string) => ({ id, name, role: 'admin', roleTitle: '管理员', department: '产研' }) as CurrentUser;
const lin = user('data-lin', '林志豪');
const mao = user('data-mao', '毛景强');
const create = (category: string, extra = {}) => mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ requestId: crypto.randomUUID(), productLineId: product.id, category, taskTypeId: `data-${category}`, title: '创建回归', versionId: 'data-version', assigneeId: mao.id, priority: 'MEDIUM', ...extra }) });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([product]));
  localStorage.setItem('shichuang.frontend.mock.teamMembers', JSON.stringify([lin, mao].map(u => ({ ...u, status: 'enabled' }))));
  localStorage.setItem('shichuang.frontend.mock.workItems', '[]');
  localStorage.setItem('shichuang.frontend.mock.researchTypes', JSON.stringify(['requirement', 'design', 'dev', 'test'].map(category => ({ id: `data-${category}`, name: category, category, enabled: true, isDefault: true, workflow: { id: `flow-${category}`, status: 'PUBLISHED', definition: { states: [{ key: 'todo', name: '待处理', initial: true, enabled: true }] } } }))));
  sessionStorage.setItem('shichuang.session', JSON.stringify({ token: 'task-data-test', expiresAt: Date.now() + 60000, user: lin }));
  sessionStorage.setItem('shichuang.session.token', 'task-data-test');
  vi.spyOn(productRepository, 'workItems').mockImplementation((line, kind) => mockApiRequest(`/api/work-items?productLineId=${line}&category=${kind}`));
});
afterEach(() => vi.restoreAllMocks());

it('uses the active identity for creator and activity, retaining the original creator after switching', async () => {
  const first = await create('requirement', { creatorName: '伪造创建人' });
  expect(first).toMatchObject({ creatorId: lin.id, creatorName: lin.name, assigneeName: mao.name });
  updateSessionUser(mao);
  expect(readSession()?.user).toMatchObject(mao);
  const second = await create('requirement');
  expect(second).toMatchObject({ creatorId: mao.id, creatorName: mao.name });
  expect(await mockApiRequest(`/api/work-items/${first.id}`)).toMatchObject({ creatorId: lin.id, creatorName: lin.name });
  const activities = await mockApiRequest(`/api/work-items/${second.id}/activities?productLineId=${product.id}`);
  expect(activities).toContainEqual(expect.objectContaining({ operatorName: mao.name }));
});

it.each(['design', 'dev', 'test'] as const)('persists %s allocation and rereads it as allocated', async kind => {
  const source = await create('requirement', { needsCollaboration: [kind] });
  expect((await loadProductTaskAllocation([product], kind)).find(item => item.id === source.id)?.allocated).toBe(false);
  const allocated = await create(kind, { requirementId: source.id, relatedTaskIds: [source.id] });
  const page = await mockApiRequest(`/api/work-items?productLineId=${product.id}&category=${kind}`);
  expect(page.page.items).toContainEqual(expect.objectContaining({ id: allocated.id, requirementId: source.id, versionId: 'data-version' }));
  for (let reload = 0; reload < 2; reload++) {
    expect((await loadProductTaskAllocation([product], kind)).find(item => item.id === source.id)).toMatchObject({ allocated: true, allocatedTask: { id: allocated.id } });
  }
});

it('recognizes existing related-task associations as allocated', async () => {
  const source = await create('requirement', { needsCollaboration: ['dev'] });
  await create('dev', { relatedTaskIds: [source.id] });
  expect((await loadProductTaskAllocation([product], 'dev')).find(item => item.id === source.id)?.allocated).toBe(true);
});

it('sorts before pagination by actual creation time, not storage order or update time', async () => {
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
    { id: 'older', category: 'dev', productLineId: product.id, title: '旧', createdAt: '2026-10-01T12:00:00+08:00', updatedAt: '2026-12-01' },
    { id: 'missing', category: 'dev', productLineId: product.id },
    { id: 'latest', category: 'dev', productLineId: product.id, title: '新', createdAt: '2026-10-02T05:00:00Z' },
  ]));
  const first = await mockApiRequest(`/api/work-items?productLineId=${product.id}&category=dev&pageSize=1`);
  expect(first.page.items.map((item: { id: string }) => item.id)).toEqual(['latest']);
  const all = await mockApiRequest(`/api/work-items?productLineId=${product.id}&category=dev`);
  expect(all.page.items.map((item: { id: string }) => item.id)).toEqual(['latest', 'older', 'missing']);
});
