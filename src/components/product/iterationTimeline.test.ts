import { describe, expect, it } from 'vitest';
import type { UnifiedWorkItem } from '../../services/productRepository';
import { DAY, dateTime, interval, productTaskItems, riskFor, stagesFor } from './iterationTimeline';

const task = (id: string, values: Partial<UnifiedWorkItem> = {}): UnifiedWorkItem => ({ id, code: id, category: 'requirement', title: id, productLineId: 'p', versionId: 'v', ...values });
const today = dateTime('2026-09-29')!;
describe('产品迭代甘特图计算', () => {
  it('拒绝缺失、无效及倒置日期，不使用创建时间', () => {
    expect(interval(undefined, '2026-09-29')).toBeNull();
    expect(dateTime('2026-02-30')).toBeNull();
    expect(interval('2026-09-30', '2026-09-29')).toBeNull();
    expect(stagesFor([task('r', { createdAt: '2026-09-01' })]).stages).toEqual([]);
  });
  it('按最早开始、最晚结束聚合阶段，重叠阶段错层，同一天包含在区间内', () => {
    const result = stagesFor([
      task('a', { plannedStartDate: '2026-09-01', plannedEndDate: '2026-09-10' }),
      task('b', { plannedStartDate: '2026-09-03', plannedEndDate: '2026-09-12' }),
      task('d', { category: 'design', plannedStartDate: '2026-09-10', plannedEndDate: '2026-09-15' }),
      task('c', { category: 'dev', plannedStartDate: '2026-09-16', plannedEndDate: '2026-09-16' }),
      task('x', { status: { group: 'CANCELLED' }, plannedStartDate: '2026-08-01', plannedEndDate: '2026-12-01' })
    ]);
    expect(result.stages[0]).toMatchObject({ start: dateTime('2026-09-01'), end: dateTime('2026-09-12'), lane: 0 });
    expect(result.stages[1].lane).toBe(1);
    expect(result.stages[2].lane).toBe(0);
    expect(result.missing).toEqual(['测试验收']);
  });
  it('依据状态与完成日期区分延期、延期完成和预计延期', () => {
    const plan = interval('2026-09-01', '2026-09-27')!;
    expect(riskFor(plan, 'IN_PROGRESS', null, [], today).text).toBe('已延期 2 天');
    expect(riskFor(plan, 'COMPLETED', '2026-09-28T12:00:00', [], today).text).toBe('延期完成 1 天');
    expect(riskFor(plan, 'COMPLETED', '2026-09-27', [], today).text).toBe('按期完成');
    expect(riskFor(plan, 'COMPLETED', null, [], today).text).toBe('完成日期未记录');
    expect(riskFor(plan, 'CANCELLED', null, [], today).tail).toBeNull();
    expect(riskFor(plan, 'IN_PROGRESS', null, [{ start: plan.start, end: plan.end + 3 * DAY, name: '测试验收', color: '', lane: 0 }], plan.end).text).toBe('预计延期 3 天');
  });
  it('只聚合当前产品任务的后代和关联任务，不跨版本串入', () => {
    const root = task('r');
    const items = [root, task('d', { category: 'design', parentWorkItemId: 'r', versionId: null }), task('sub', { category: 'dev', parentWorkItemId: 'd', versionId: null }), task('test', { category: 'test', requirementId: 'r' }), task('other', { category: 'dev', parentWorkItemId: 'r', versionId: 'v2' }), task('unrelated')];
    expect(productTaskItems(root, items).map((item) => item.id)).toEqual(['r', 'd', 'sub', 'test']);
  });
});
