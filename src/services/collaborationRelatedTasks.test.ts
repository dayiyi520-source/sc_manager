import { expect, it, vi } from 'vitest';
import { collaborationRelatedTasks, loadCollaborationRelatedTasks } from './collaborationRelatedTasks';
import { productRepository, type UnifiedWorkItem } from './productRepository';
import type { RequirementWorkItem } from '../types';
vi.mock('./productRepository', () => ({ productRepository: { workItems: vi.fn() } }));
const task = (id: string, category: string, relatedTaskIds: string[] = []): UnifiedWorkItem => ({ id, code: id, title: id, category, productLineId: 'line-1', relatedTaskIds, status: { name: '处理中' }, assigneeName: '负责人' });
const direct = [{ id: 'p-1', requirementId: 'matter-1', taskType: '产品需求', title: '产品任务', status: '待处理', assigneeName: '旧负责人', blocksClosure: true }] as RequirementWorkItem[];

it('includes reverse design/dev/test references once with live fields but does not traverse unrelated tasks', () => {
  const items = [task('p-1', 'requirement'), task('d-1', 'design', ['p-1']), task('r-1', 'dev', ['p-1']), task('t-1', 'test', ['p-1']), task('unrelated', 'dev', ['other']), task('second-level', 'design', ['d-1'])];
  const result = collaborationRelatedTasks('matter-1', direct, [...items, items[1]]);
  expect(result.items.map((item) => item.id)).toEqual(['p-1', 'd-1', 'r-1', 't-1']);
  expect(result.items[0]).toMatchObject({ status: '处理中', assigneeName: '负责人', blocksClosure: true, productLineId: 'line-1' });
  expect(result.items[1]).toMatchObject({ blocksClosure: false });
  expect([...result.indirectIds]).toEqual(['d-1', 'r-1', 't-1']);
  expect(collaborationRelatedTasks('matter-1', direct, [items[0]]).items).toHaveLength(1);
});

it('finds directly associated products even when the embedded summary is missing', () => {
  const result = collaborationRelatedTasks('matter-1', [], [{ ...task('p-1', 'requirement'), sourceWorkOrderIds: ['matter-1'] }, task('d-1', 'design', ['p-1'])]);
  expect(result.items.map((item) => item.id)).toEqual(['p-1', 'd-1']);
});

it('loads all pages across accessible products and propagates failures', async () => {
  vi.mocked(productRepository.workItems).mockResolvedValueOnce({ page: { items: [task('p-1', 'requirement')], total: 2 } } as never)
    .mockResolvedValueOnce({ page: { items: [task('d-1', 'design', ['p-1'])], total: 2 } } as never);
  expect((await loadCollaborationRelatedTasks('matter-1', direct, ['line-1', 'line-1'])).items).toHaveLength(2);
  expect(productRepository.workItems).toHaveBeenNthCalledWith(2, 'line-1', '', '', { page: 2 });
  vi.mocked(productRepository.workItems).mockRejectedValueOnce(new Error('无权限'));
  await expect(loadCollaborationRelatedTasks('matter-1', direct, ['line-1'])).rejects.toThrow('无权限');
});
