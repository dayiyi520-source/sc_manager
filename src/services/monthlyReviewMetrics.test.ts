import * as evidence from './reviewEvidenceRepository';
import { describe, expect, it, vi } from 'vitest';
import { calculateMonthlyReviewMetrics, loadMonthlyReviewMetrics, loadDepartmentMonthlyComparison } from './monthlyReviewMetrics';
import type { OkrWork } from './okrRepository';
import { productRepository } from './productRepository';
import { requirementRepository } from './requirementRepository';
const period = { startDate: '2026-10-01', endDate: '2026-10-31' };
const viewer = { id: 'me', name: '本人' };
const work = (id: string, changes: OkrWork['statusChanges'], patch: Partial<OkrWork> = {}): OkrWork => ({ id, sourceId: id, kind: 'task', title: id, status: '处理中', assigneeId: 'me', actualHours: 2, estimatedHours: 0, dueDate: '', createdAt: '2026-09-01', updatedAt: '2026-10-12', sourceWorkOrderIds: '[]', linkVersion: 0, statusChanges: changes, ...patch });

describe('monthly personal review statistics', () => {
  it('uses transitions in the selected month, deduplicates source IDs and excludes non-owner and mere edits', () => {
    const task = work('t', [{ status: '处理中', createdAt: '2026-10-01' }, { status: '已完成', createdAt: '2026-10-31 23:59:59' }]);
    const ticket = work('c', [{ status: '待验收', createdAt: '2026-10-15' }, { status: '已退回', createdAt: '2026-10-16' }], { kind: 'collaboration', actualHours: 3.25 });
    expect(calculateMonthlyReviewMetrics([task, { ...task, id: 'alias' }, ticket, { ...ticket, id: 'c-alias' },
      work('old', [{ status: '处理中', createdAt: '2026-09-30' }]), work('next', [{ status: '已完成', createdAt: '2026-11-01' }]),
      work('other', task.statusChanges, { assigneeId: 'other' }), work('edit', []), work('new', [{ status: '待处理', createdAt: '2026-10-10' }]),
    ], period, viewer)).toEqual({ taskCount: 1, collaborationCount: 1, totalHours: 5.25 });
  });
  it('counts a completedAt fallback and excludes invalid timestamps', () => {
    expect(calculateMonthlyReviewMetrics([work('done', undefined, { completedAt: '2026-10-10' }), work('invalid', [{ status: '处理中', createdAt: 'bad' }])], period, viewer)).toMatchObject({ taskCount: 1, totalHours: 2 });
  });
  it('reads task and collaboration history even after their current status moves on', async () => {
    const tasks = vi.spyOn(productRepository, 'workItemActivities').mockResolvedValue([{ eventType: 'WORK_ITEM_TRANSITIONED', content: JSON.stringify({ toName: '处理中' }), createdAt: '2026-10-10' }]);
    const collaborations = vi.spyOn(requirementRepository, 'detail').mockResolvedValue({ events: [{ id: 'e', eventType: '事项完成', toStatus: '待验收', createdAt: '2026-10-12', operatorName: '本人' }] } as Awaited<ReturnType<typeof requirementRepository.detail>>);
    expect(await loadMonthlyReviewMetrics([work('t', undefined, { productLineId: 'p', status: '已搁置' }), work('c', undefined, { kind: 'collaboration', status: '已关闭' })], period, viewer)).toMatchObject({ taskCount: 1, collaborationCount: 1, totalHours: 4 });
    tasks.mockRestore(); collaborations.mockRestore();
  });
  it('does not silently show a zero on audit history failure', async () => {
    const request = vi.spyOn(productRepository, 'workItemActivities').mockRejectedValue(new Error('读取失败'));
    await expect(loadMonthlyReviewMetrics([work('t', undefined, { productLineId: 'p' })], period, viewer)).rejects.toThrow('读取失败');
    request.mockRestore();
  });
});

describe('department monthly comparison', () => {
  const me = { id: 'me', name: '本人', department: '产品部', supervisorId: null, rootFlag: 0, version: 1 };
  const colleague = { ...me, id: 'colleague', name: '同事' };
  it('includes zero-hour members in the denominator and excludes other departments', async () => {
    const load = vi.spyOn(evidence, 'loadReviewEvidence').mockResolvedValue([]);
    const result = await loadDepartmentMonthlyComparison([work('t', [{ status: '处理中', createdAt: '2026-10-10' }], { actualHours: 8 })], period, me, [me, colleague, { ...me, id: 'outside', department: '研发部' }]);
    expect(result).toMatchObject({ departmentAverageHours: 4, departmentTotalHours: 8, departmentMemberCount: 2, departmentTaskCount: 1 });
    expect(result).not.toHaveProperty('departmentAverageOvertimeHours');
    expect(load).toHaveBeenCalledOnce();
    load.mockRestore();
  });
  it('does not return a partial mean on permission or network failure', async () => {
    const load = vi.spyOn(evidence, 'loadReviewEvidence').mockRejectedValue(new Error('无权限'));
    expect(await loadDepartmentMonthlyComparison([], period, me, [me, colleague])).toEqual({ departmentUnavailable: true });
    load.mockRestore();
  });
  it('does not infer a department or silently use the viewer alone when roster is absent', async () => {
    expect(await loadDepartmentMonthlyComparison([], period, me, [])).toEqual({ departmentUnavailable: true });
    expect(await loadDepartmentMonthlyComparison([], period, { id: 'me', name: '本人' }, [me])).toEqual({ departmentUnavailable: true });
  });
});
