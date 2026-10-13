import { describe, expect, it } from 'vitest';
import type { OkrKrReview, OkrPerson, OkrRecord } from './okrRepository';
import { employeeSupportsForKr, supervisorProgressBaseline, canReadReviewRecord } from './supervisorReview';
import { monthlyReviewTargets } from './okrReviewTargets';
const manager: OkrPerson = { id: 'manager', name: '主管', department: '产品', supervisorId: 'boss', rootFlag: 0, version: 1 };
const employee: OkrPerson = { ...manager, id: 'employee', name: '员工', supervisorId: 'manager' };
const period = { startDate: '2026-10-12', endDate: '2026-10-18' };
const kr: OkrKrReview = { objectiveId: 'manager-o', objectiveTitle: '部门目标', keyResultId: 'manager-kr', keyResultTitle: '部门 KR', previousProgress: 20, currentProgress: 40, health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: [] };
const goal: OkrRecord = { id: 'employee-goal', kind: 'objective', ownerId: 'employee', periodKey: '2026-10', status: 'active', version: 0, payload: { title: '个人承接', goalLevel: 'personal', sourceObjectiveId: 'manager-o', sourceKrId: 'manager-kr', keyResults: [{ id: 'manager-kr', title: '承接 KR', weight: 100, progress: 0, executionActions: [{ id: 'employee-a', title: '本人 A', ownerId: 'employee', progress: 60 }] }] } };
const review: OkrRecord = { id: 'employee-review', kind: 'review', ownerId: 'employee', periodKey: `${period.startDate}/${period.endDate}`, status: 'submitted', version: 1, payload: { title: '员工周报', reviewType: 'week', ...period, krReviews: [{ ...kr, objectiveId: 'employee-goal', keyResultId: 'employee-a', keyResultTitle: '本人 A', currentProgress: 60, evidenceNote: '员工完成证据' }] } };

describe('supervisor goal review contracts', () => {
  it('projects the supervisor KR instead of its nested personal A', () => {
    const record: OkrRecord = { ...goal, id: 'manager-o', ownerId: 'manager', payload: { ...goal.payload, goalLevel: 'department', keyResults: [{ id: 'manager-kr', title: '部门 KR', weight: 100, progress: 40, assigneeIds: ['employee'], executionActions: [{ id: 'manager-a', title: '本人 A', ownerId: 'manager', progress: 80 }] }] } };
    expect(monthlyReviewTargets([record], 'manager', [manager, employee])[0].keyResults).toMatchObject([{ id: 'manager-kr', content: '部门 KR', progress: 40 }]);
  });
  it('only reads direct-report submitted support for the exact period and explicit KR association', () => {
    const foreign = { ...review, id: 'foreign', ownerId: 'other' };
    const draft = { ...review, id: 'draft', status: 'draft' };
    const old = { ...review, id: 'old', payload: { ...review.payload, startDate: '2026-10-05', endDate: '2026-10-11' } };
    const supports = employeeSupportsForKr([goal, review, foreign, draft, old], [manager, employee], 'manager', kr, period);
    expect(supports).toHaveLength(1);
    expect(supports[0]).toMatchObject({ record: { id: 'employee-review' }, authorName: '员工', contributions: [{ keyResultId: 'employee-a', evidenceNote: '员工完成证据' }] });
    expect(employeeSupportsForKr([goal, review], [manager, employee], 'manager', { ...kr, objectiveId: 'same-title-other-o' }, period)).toEqual([]);
    expect(employeeSupportsForKr([goal, review], [manager, employee], 'manager', { ...kr, keyResultId: 'other-kr' }, period)).toEqual([]);
  });
  it('does not include unaligned work under another employee goal merely because the report also mentions this KR', () => {
    const extra = { ...review, payload: { ...review.payload, krReviews: [...review.payload.krReviews!, { ...kr, objectiveId: 'unrelated', keyResultId: 'other-a', achievement: '不属于这个 KR' }] } };
    expect(employeeSupportsForKr([goal, extra], [manager, employee], 'manager', kr, period)[0].contributions).toHaveLength(1);
  });
  it('keeps contributions for multiple KRs in one aligned goal separate', () => {
    const multiple: OkrRecord = { ...goal, payload: { ...goal.payload, sourceObjectiveId: undefined, sourceKrId: undefined, alignments: [{ parentObjectiveId: 'manager-o', parentKeyResultId: 'manager-kr' }, { parentObjectiveId: 'manager-o', parentKeyResultId: 'second-kr' }], keyResults: [...goal.payload.keyResults!, { id: 'second-kr', title: '另一 KR', weight: 50, progress: 0, executionActions: [{ id: 'second-a', title: '另一 A', ownerId: 'employee', progress: 10 }] }] } };
    const both = { ...review, payload: { ...review.payload, krReviews: [...review.payload.krReviews!, { ...review.payload.krReviews![0], keyResultId: 'second-a' }] } };
    expect(employeeSupportsForKr([multiple, both], [manager, employee], 'manager', kr, period)[0].contributions.map(row => row.keyResultId)).toEqual(['employee-a']);
  });
  it('matches saved legacy breakdown actions by their real action ID despite grouped objective IDs', () => {
    const action: OkrRecord = { ...goal, id: 'legacy-action', kind: 'action', payload: { title: '真实历史动作', parentObjectiveId: 'manager-o', parentKeyResultId: 'manager-kr' } };
    const old = { ...review, payload: { ...review.payload, krReviews: [{ ...review.payload.krReviews![0], objectiveId: '2026-10:manager-o', keyResultId: 'legacy-action' }] } };
    expect(employeeSupportsForKr([action, old], [manager, employee], 'manager', kr, period)[0].contributions[0].keyResultId).toBe('legacy-action');
  });
  it('keeps a historical direct-KR reference only when that KR was explicitly assigned to the employee', () => {
    const parent: OkrRecord = { ...goal, id: 'manager-o', ownerId: 'manager', payload: { title: '部门目标', keyResults: [{ id: 'manager-kr', title: '部门 KR', weight: 100, progress: 20, assigneeIds: ['employee'] }] } };
    const old = { ...review, payload: { ...review.payload, krReviews: [{ ...review.payload.krReviews![0], objectiveId: 'manager-o', keyResultId: 'manager-kr' }] } };
    expect(employeeSupportsForKr([parent, old], [manager, employee], 'manager', kr, period)).toHaveLength(1);
    expect(employeeSupportsForKr([{ ...parent, payload: { ...parent.payload, keyResults: [{ ...parent.payload.keyResults![0], assigneeIds: ['other'] }] } }, old], [manager, employee], 'manager', kr, period)).toEqual([]);
  });
  it('uses the latest earlier supervisor submission as previous progress', () => {
    const previous: OkrRecord = { ...review, id: 'manager-previous', ownerId: 'manager', payload: { ...review.payload, startDate: '2026-10-05', endDate: '2026-10-11', krReviews: [{ ...kr, currentProgress: 25 }] } };
    const older: OkrRecord = { ...previous, id: 'older', payload: { ...previous.payload, startDate: '2026-09-28', endDate: '2026-10-04', krReviews: [{ ...kr, currentProgress: 15 }] } };
    expect(supervisorProgressBaseline([kr], [older, previous, { ...previous, id: 'draft', status: 'draft' }], 'manager', period)[0]).toMatchObject({ previousProgress: 25, currentProgress: 40 });
  });
  it('grants submitted direct-report reads without exposing their drafts or other teams', () => {
    expect(canReadReviewRecord(review, 'manager', [manager, employee])).toBe(true);
    expect(canReadReviewRecord({ ...review, status: 'draft' }, 'manager', [manager, employee])).toBe(false);
    expect(canReadReviewRecord({ ...review, status: 'returned' }, 'manager', [manager, employee])).toBe(false);
    expect(canReadReviewRecord(review, 'boss', [manager, employee])).toBe(false);
    expect(canReadReviewRecord(review, 'employee', [manager, employee])).toBe(true);
  });
});
