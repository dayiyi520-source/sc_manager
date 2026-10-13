import { describe, expect, it } from 'vitest';
import type { OkrWork } from '../../../services/okrRepository';
import { defaultCollapsedReview, filterEvidence } from './evidenceFilters';
const viewer = { id: 'me', name: '本人', department: '软件研发部' };
const context = { viewer, product: '产品甲', version: 'V1', startDate: '2026-09-28', endDate: '2026-10-04', source: 'task' as const };
const row = (patch: Partial<OkrWork>): OkrWork => ({ id: 'task:1', sourceId: '1', kind: 'task', title: '任务', status: '处理中', ownerName: '本人', productLineName: '产品甲', versionName: 'V1', createdAt: '2026-09-01', updatedAt: '2026-10-01', dueDate: '', actualHours: 0, estimatedHours: 0, sourceWorkOrderIds: '[]', linkVersion: 0, ...patch });
describe('review evidence defaults', () => {
  it('filters production tasks by product, version, ownership and selected-week activity', () => {
    const rows = [row({ id: 'ongoing', sourceId: 'ongoing' }), row({ id: 'new', sourceId: 'new', status: '待处理', createdAt: '2026-10-01' }), row({ id: 'done', sourceId: 'done', status: '已完成', completedAt: '2026-09-28' }), row({ id: 'old', sourceId: 'old', status: '已完成', completedAt: '2026-09-27' }), row({ id: 'updated', sourceId: 'updated', status: '已完成' }), row({ id: 'version', sourceId: 'version', versionName: 'V2' }), row({ id: 'product', sourceId: 'product', productLineName: '产品乙' }), row({ id: 'other', sourceId: 'other', ownerName: '其他人' }), row({ id: 'future', sourceId: 'future', createdAt: '2026-10-05' }), row({ id: 'waiting', sourceId: 'waiting', status: '待验收' })];
    expect(filterEvidence(rows, context).map(item => item.id)).toEqual(['ongoing', 'done', 'version']);
  });
  it('includes collaboration owner, participant and creator scopes without requiring KR version', () => {
    const rows = [row({ id: 'owned', sourceId: 'owned', kind: 'collaboration', status: '待验收', versionName: 'V2' }), row({ id: 'participant', sourceId: 'participant', kind: 'collaboration', status: '已退回', ownerName: '他人', participantIds: ['me'] }), row({ id: 'created', sourceId: 'created', kind: 'collaboration', status: '处理中', ownerName: '他人', creatorId: 'me' }), row({ id: 'foreign', sourceId: 'foreign', kind: 'collaboration', ownerName: '他人' }), row({ id: 'duplicate', sourceId: 'created', kind: 'collaboration', ownerName: '他人', creatorId: 'me' })];
    expect(filterEvidence(rows, { ...context, source: 'ticket' }).map(item => item.id)).toEqual(['owned', 'participant', 'created']);
  });
  it('enforces the selected product for support departments too', () => {
    expect(filterEvidence([row({ productLineName: '其他产品', versionName: 'V9' })], { ...context, viewer: { ...viewer, department: '人力行政部' } })).toHaveLength(0);
  });
  it('excludes waiting tasks even when their workflow group says in progress', () => {
    const rows = ['待处理', '待开始', '已取消'].map((status, index) => row({ id: String(index), sourceId: String(index), status, statusGroup: 'IN_PROGRESS' }));
    expect(filterEvidence(rows, context)).toEqual([]);
  });
  it('requires an identified owner and accepts published workflow groups', () => {
    expect(filterEvidence([row({})], { ...context, viewer: undefined })).toEqual([]);
    expect(filterEvidence([row({ status: '联调中', statusGroup: 'IN_PROGRESS' }), row({ id: 'done', sourceId: 'done', status: '上线完成', statusGroup: 'COMPLETED', completedAt: context.endDate }), row({ id: 'wait', sourceId: 'wait', status: '处理中', statusGroup: 'NOT_STARTED' })], context).map(item => item.id)).toEqual(['task:1', 'done']);
  });
  it('collapses complete or unchanged results while keeping risk and evidence visible', () => {
    const unchanged = { currentProgress: 30, previousProgress: 30, health: 'normal', workIds: [] };
    expect(defaultCollapsedReview(unchanged)).toBe(true);
    expect(defaultCollapsedReview({ ...unchanged, currentProgress: 100 })).toBe(true);
    expect(defaultCollapsedReview({ ...unchanged, health: 'risk' })).toBe(false);
    expect(defaultCollapsedReview({ ...unchanged, workIds: ['evidence'] })).toBe(false);
  });
});
