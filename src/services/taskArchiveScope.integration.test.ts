// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { productRepository } from './productRepository';
import { mockApiRequest } from './mockApi';
import { MOCK_PRODUCT_LINES } from '../data/mockSnapshot';
import { isArchivedByUser } from '../components/product/taskArchiveScope';
import type { CurrentUser, EmployeeOption, RequirementTask } from '../types';

const lineId = MOCK_PRODUCT_LINES[0].id;
const user = { id: 'archive-user', name: '同名归档人' } as CurrentUser;
const otherUser = { id: 'archive-other', name: '同名归档人' } as CurrentUser;
const session = (viewer: CurrentUser) => sessionStorage.setItem('shichuang.session', JSON.stringify({ user: viewer }));
const categories = ['requirement', 'design', 'dev', 'test', 'bug', 'presales', 'delivery', 'ops'] as const;
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

it.each(categories)('%s preserves complete archived records, operator identity, revision and restoration across rereads', async category => {
  session(otherUser);
  let taskId: string;
  let revision = 0;
  if (category === 'presales' || category === 'delivery' || category === 'ops') {
    const created = await productRepository.createBusinessTask(category, { title: '保留完整字段', ownerName: '其他负责人', priority: '高', projectId: 'project-test', projectName: '关联项目', description: '完整任务描述', estimatedHours: 7 });
    taskId = created.id;
    session(user);
    await productRepository.archiveBusinessTask(category, taskId);
    await productRepository.archiveBusinessTask(category, taskId);
  } else {
    const types = await productRepository.workItemTypes(lineId);
    const labels: Record<string, string> = { requirement: '需求', design: '设计', dev: '研发', test: '测试', bug: '缺陷' };
    const type = types.find(item => item.enabled && item.category === labels[category])!;
    const item = await mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ category, productLineId: lineId, taskTypeId: type.id, title: '保留完整字段', description: '完整任务描述', estimatedHours: 7 }) });
    taskId = item.id;
    revision = item.revision;
    session(user);
    await productRepository.deleteWorkItem(lineId, taskId, revision);
  }
  const records = await productRepository.archivedTaskRecords(category);
  const archived = records.find(task => task.id === taskId)!;
  expect(archived).toMatchObject({ archived: true, archivedById: user.id, operatorName: user.name, title: '保留完整字段', description: '完整任务描述', estimatedHours: 7, revision: revision + 1 });
  expect(archived.operatedAt).toBeTruthy();
  expect(isArchivedByUser(archived, user, [])).toBe(true);
  expect(isArchivedByUser(archived, otherUser, [])).toBe(false);
  expect((await productRepository.archivedTaskRecords(category)).find(task => task.id === taskId)).toEqual(archived);
  await expect(productRepository.restoreArchivedTask(category, taskId, revision)).rejects.toThrow('已更新');
  expect((await productRepository.archivedTaskRecords(category)).some(task => task.id === taskId)).toBe(true);
  await productRepository.restoreArchivedTask(category, taskId, archived.revision!);
  expect((await productRepository.archivedTaskRecords(category)).some(task => task.id === taskId)).toBe(false);
  await expect(productRepository.restoreArchivedTask(category, taskId, archived.revision!)).rejects.toThrow('不存在');
  const restored = category === 'presales' || category === 'delivery' || category === 'ops'
    ? await productRepository.businessTask(category, taskId)
    : await productRepository.workItemDetail(lineId, taskId);
  expect(typeof restored?.status === 'string' ? restored.status : restored?.status?.name).toBe(archived.status);
  expect(restored).toMatchObject({ title: archived.title, description: archived.description, estimatedHours: archived.estimatedHours, revision: revision + 2 });
  expect((restored as RequirementTask)?.archivedById).toBeUndefined();
});

it('only identifies legacy name-only archives when the directory resolves a unique person', () => {
  const task = { archived: true, operatorName: user.name } as RequirementTask;
  const directory = [user, otherUser] as unknown as EmployeeOption[];
  expect(isArchivedByUser(task, user, directory)).toBe(false);
  expect(isArchivedByUser(task, user, [directory[0]])).toBe(true);
  expect(isArchivedByUser({ ...task, archived: false }, user, [directory[0]])).toBe(false);
  expect(isArchivedByUser({ ...task, archivedById: otherUser.id }, user, [directory[0]])).toBe(false);
});

it.each(['presales', 'delivery', 'ops'] as const)('copies %s archive data into an independent unarchived task', async kind => {
  session(user);
  const created = await productRepository.createBusinessTask(kind, { title: '归档副本', projectId: 'project-test', archived: true, archivedById: user.id, operatedAt: '2026-10-22', revision: 99 });
  const copy = await productRepository.businessTask(kind, created.id);
  expect(copy).toMatchObject({ archived: false, revision: 0 });
  expect(copy.archivedById).toBeUndefined();
  expect((await productRepository.businessTasks(kind)).items.some(task => task.id === created.id)).toBe(true);
});
