import { describe, expect, it } from 'vitest';
import type { OkrPerson, OkrRecord, OkrKrReview } from './okrRepository';
import { normalizeGoalAssignments, assignedDetailRows } from './okrAssignments';
import { monthlyReviewTargets } from './okrReviewTargets';
import { syncSubmittedReviewProgress, validateReviewProgress } from './okrReviewProgressSync';
const people: OkrPerson[] = [
  { id: 'boss', name: '老板', department: '公司', supervisorId: null, rootFlag: 1, version: 1 },
  { id: 'm', name: '主管', department: '研发', supervisorId: 'boss', rootFlag: 0, version: 1 },
  ...['a', 'b'].map(id => ({ id, name: id, department: '研发', supervisorId: 'm', rootFlag: 0, version: 1 })),
];
const company: OkrRecord = { id: 'company', kind: 'objective', ownerId: 'boss', status: 'active', periodKey: '2026-10', version: 1, payload: { title: '公司', goalLevel: 'company', progress: 0, keyResults: [{ id: 'c', title: '公司KR', progress: 0, weight: 100 }] } };
const department: OkrRecord = { id: 'dept', kind: 'objective', ownerId: 'm', status: 'active', periodKey: '2026-10', version: 1, payload: { title: '部门', goalLevel: 'department', sourceObjectiveId: 'company', sourceKrId: 'c', progress: 20, keyResults: [{ id: 'k', title: '主KR', progress: 0, weight: 75, assigneeIds: ['a', 'b'], details: [{ id: 'd1', name: '产品', assigneeIds: ['a', 'b'], progress: 0 }, { id: 'd2', name: '项目', assigneeIds: ['b'], progress: 0 }] }, { id: 'other', title: '其他', progress: 80, weight: 25 }] } };
const personal = (id: string): OkrRecord => ({ id: `goal-${id}`, kind: 'objective', ownerId: id, status: 'active', periodKey: '2026-10', version: 1, payload: { title: '承接', goalLevel: 'personal', sourceObjectiveId: 'dept', sourceKrId: 'k', keyResults: [{ id: 'k', title: '主KR', progress: 0, weight: 100, executionActions: [{ id: `action-${id}`, title: '本人动作', ownerId: id, progress: 0, weight: 100 }] }] } });
const row = (id: string, value: number): OkrKrReview => ({ objectiveId: `goal-${id}`, objectiveTitle: '承接', keyResultId: `action-${id}`, keyResultTitle: '本人动作', previousProgress: 0, currentProgress: value, detailProgress: [{ id: 'd1', previousProgress: 0, currentProgress: value }], health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: [] });
const report = (id: string, value: number, endDate = '2026-10-18'): OkrRecord => ({ id: `report-${id}-${endDate}`, kind: 'review', ownerId: id, periodKey: '', status: 'submitted', submittedAt: `${endDate}T12:00:00Z`, version: 1, payload: { title: '周报', reviewType: 'week', startDate: '2026-10-12', endDate, krReviews: [row(id, value)] } });
const base = () => [company, department, personal('a'), personal('b')];
describe('子 KR 指派与复盘正式进度', () => {
  it('keeps legacy sub KR rows unassigned and deduplicates explicit row assignments', () => {
    const payload = normalizeGoalAssignments({ title: '部门', goalLevel: 'department', keyResults: [{ id: 'k', title: 'k', weight: 100, progress: 0, assigneeIds: ['a'], details: [{ id: 'old', name: '旧行' }, { id: 'empty', name: '无指派', assigneeIds: [] }, { id: 'new', name: '新行', assigneeIds: ['b', 'a', 'b'] }] }] });
    expect(payload.keyResults![0].assigneeIds).toEqual(['b', 'a']);
    expect(assignedDetailRows(payload.keyResults![0], 'a')?.map(row => row.id)).toEqual(['new']);
    expect(JSON.parse(JSON.stringify(payload)).keyResults[0].details[1].assigneeIds).toEqual([]);
  });
  it.each(['week', 'month'] as const)('filters employee rows and rejects tampered %s drafts, removed assignments and cycles', reviewType => {
    const records = base();
    expect(monthlyReviewTargets(records, 'a', people)[0].keyResults[0].parentKeyResultDetails?.map(row => row.id)).toEqual(['d1']);
    const payload = { ...report('a', 40).payload, reviewType };
    expect(() => validateReviewProgress(payload, 'a', records, people)).not.toThrow();
    expect(() => validateReviewProgress({ ...payload, krReviews: [{ ...row('a', 40), detailProgress: [{ id: 'd2', previousProgress: 0, currentProgress: 100 }] }] }, 'a', records, people)).toThrow('子 KR');
    expect(() => validateReviewProgress({ ...payload, startDate: '2026-09-01', endDate: '2026-09-30' }, 'a', records, people)).toThrow('周期');
    const revoked = records.map(record => record.id === 'dept' ? { ...record, payload: normalizeGoalAssignments({ ...record.payload, keyResults: record.payload.keyResults!.map(kr => ({ ...kr, details: kr.details?.map(detail => ({ ...detail, assigneeIds: ['b'] })) })) }) } : record);
    expect(() => validateReviewProgress(payload, 'a', revoked, people)).toThrow('本人');
  });
  it('does not write drafts; submitted employee updates propagate through weighted ancestors and retain audit history', () => {
    const first = report('a', 40), second = report('b', 80);
    second.payload.krReviews![0].detailProgress!.push({ id: 'd2', previousProgress: 0, currentProgress: 100 });
    const records = [...syncSubmittedReviewProgress([...base(), first], first, people), second];
    const draft = { ...second, status: 'draft' };
    expect(syncSubmittedReviewProgress(records, draft, people)).toBe(records);
    const saved = syncSubmittedReviewProgress(records, second, people);
    const dept = saved.find(record => record.id === 'dept')!;
    expect(dept.payload.keyResults![0].details?.map(row => row.progress)).toEqual([60, 100]);
    expect(dept.payload.keyResults![0].progress).toBe(80);
    expect(dept.payload.progress).toBe(80);
    expect(saved.find(record => record.id === 'company')!.payload.progress).toBe(80);
    expect(saved.find(record => record.id === 'goal-a')!.payload.progress).toBe(40);
    expect(dept.progressHistory?.some(entry => entry.itemId === 'd1' && entry.progress === 60)).toBe(true);
    expect(syncSubmittedReviewProgress(saved, second, people)).toEqual(saved);
    expect(department.payload.keyResults![0].progress).toBe(0);
  });
  it('uses absolute latest business-period values across weekly/monthly reports; older backfill never overrides them', () => {
    const latest = { ...report('a', 90, '2026-10-31'), payload: { ...report('a', 90, '2026-10-31').payload, reviewType: 'month' as const } };
    const old = report('a', 20);
    const saved = syncSubmittedReviewProgress([...base(), latest, old], old, people);
    expect(saved.find(record => record.id === 'goal-a')!.payload.progress).toBe(90);
    expect(saved.find(record => record.id === 'dept')!.payload.keyResults![0].details![0].progress).toBe(45);
  });
  it('blocks supervisor edits to nonassigned rows and leaves unrelated historical targets intact', () => {
    const supervisor = report('m', 80);
    supervisor.payload.krReviews = [{ ...row('m', 80), objectiveId: 'dept', keyResultId: 'k', supervisorProgress: [{ id: 'd1', currentProgress: 80 }] }];
    expect(() => validateReviewProgress(supervisor.payload, 'm', base(), people)).toThrow('无权');
    const unrelated = { ...company, id: 'untouched', payload: { ...company.payload, progress: 37 } };
    const submitted = report('a', 40);
    const saved = syncSubmittedReviewProgress([...base(), unrelated, submitted], submitted, people);
    expect(saved.find(record => record.id === 'untouched')).toEqual(unrelated);
  });
});

it.each(['week', 'month'] as const)('uses approved live assignments for %s, ignores pending changes and rejects legacy permission fallback', reviewType => {
  const original = base();
  const legacy = { ...department, payload: { ...department.payload, keyResults: [{ ...department.payload.keyResults![0], assigneeIds: ['a', 'm'], details: [{ id: 'legacy', name: '旧行' }] }] } };
  const records = original.map(record => record.id === legacy.id ? legacy : record);
  expect(monthlyReviewTargets(records, 'a', people)[0].keyResults).toEqual([]);
  const supervisor = { ...report('m', 80).payload, reviewType, krReviews: [{ ...row('m', 80), detailProgress: [], objectiveId: 'dept', keyResultId: 'k', supervisorProgress: [{ id: 'legacy', currentProgress: 80 }] }] };
  expect(() => validateReviewProgress(supervisor, 'm', records, people)).toThrow('无权');
  const pending: OkrRecord = { ...department, changeRequest: { id: 'change', status: 'pending', purpose: 'update', payload: legacy.payload } as OkrRecord['changeRequest'] };
  const before = original.map(record => record.id === pending.id ? pending : record);
  expect(monthlyReviewTargets(before, 'a', people)[0].keyResults[0].parentKeyResultDetails?.map(row => row.id)).toEqual(['d1']);
  const approved = original.map(record => record.id === pending.id ? { ...department, payload: { ...department.payload, keyResults: [{ ...department.payload.keyResults![0], assigneeIds: ['a', 'm'], details: [{ id: 'd1', name: '已转派', assigneeIds: ['m'] }, { id: 'd2', name: '本人', assigneeIds: ['a'] }] }] } } : record);
  expect(monthlyReviewTargets(approved, 'a', people)[0].keyResults[0].parentKeyResultDetails?.map(row => row.id)).toEqual(['d2']);
  expect(() => validateReviewProgress({ ...report('a', 40).payload, reviewType }, 'a', approved, people)).toThrow('子 KR');
});

it.each(['week', 'month'] as const)('reviews direct department assignments without personal copies in %s', reviewType => {
  const records = [company, department];
  const targets = monthlyReviewTargets(records, 'a', people);
  expect(targets).toMatchObject([{ id: 'dept', keyResults: [{ id: 'k', parentKeyResultDetails: [{ id: 'd1' }] }] }]);
  const submitted = report('a', 60);
  submitted.payload = { ...submitted.payload, reviewType, krReviews: [{ ...row('a', 60), objectiveId: 'dept', keyResultId: 'k' }] };
  expect(() => validateReviewProgress(submitted.payload, 'a', records, people)).not.toThrow();
  const saved = syncSubmittedReviewProgress([...records, submitted], submitted, people);
  expect(saved.find(record => record.id === 'dept')!.payload.keyResults![0].details![0].progress).toBe(30);
  expect(syncSubmittedReviewProgress(saved, submitted, people)).toEqual(saved);
  const revoked = { ...department, payload: { ...department.payload, keyResults: department.payload.keyResults!.map(kr => ({ ...kr, details: kr.details?.map(detail => ({ ...detail, assigneeIds: ['b'] })) })) } };
  expect(() => validateReviewProgress(submitted.payload, 'a', [revoked], people)).toThrow('本人');
});
