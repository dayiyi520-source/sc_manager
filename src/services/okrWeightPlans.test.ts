// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { applyOkrWeightPlan, getOkrWeightPlan, reviewOkrWeightPlan, saveOkrWeightPlan } from './okrWeightPlans';
import type { OkrRecord } from './okrRepository';
const people = [
  { id: 'boss', name: '公司制定人', department: '管理部', supervisorId: null, rootFlag: 1, version: 1 },
  { id: 'manager', name: '主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
  { id: 'employee', name: '员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 },
];

const record = (id: string, weight: number, krWeights: number[]): OkrRecord => ({
  id, kind: 'objective', ownerId: 'manager', periodKey: '2026-10', status: 'active', version: 3,
  payload: { title: id, weight, keyResults: krWeights.map((value, index) => ({ id: `${id}-kr-${index}`, title: `KR${index + 1}`, weight: value, progress: 0 })) },
});

describe('月度目标权重方案', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the active version until the whole plan is approved', () => {
    saveOkrWeightPlan('employee', '2026-10', { objectiveWeights: { o1: 40 }, keyResultWeights: { o1: { 'o1-kr-0': 30, 'o1-kr-1': 70 } }, baseVersions: { o1: 3 } });
    expect(applyOkrWeightPlan([record('o1', 100, [50, 50])], 'employee')).toEqual([record('o1', 100, [50, 50])]);
    expect(getOkrWeightPlan('employee', '2026-10')?.status).toBe('submitted');
    reviewOkrWeightPlan('employee', '2026-10', 'manager', 'approve', people);
    expect(applyOkrWeightPlan([record('o1', 100, [50, 50])], 'employee')[0].payload).toMatchObject({ weight: 40, keyResults: [{ weight: 30 }, { weight: 70 }] });
  });

  it('returns a plan without changing the active version and preserves a feedback message', () => {
    saveOkrWeightPlan('employee', '2026-10', { objectiveWeights: { o1: 40 }, keyResultWeights: { o1: { 'o1-kr-0': 30, 'o1-kr-1': 70 } }, baseVersions: { o1: 3 } });
    reviewOkrWeightPlan('employee', '2026-10', 'manager', 'return', people, '请重新平衡第二组 KR');
    expect(getOkrWeightPlan('employee', '2026-10')).toMatchObject({ status: 'returned', feedback: '请重新平衡第二组 KR', reviewerId: 'manager' });
    expect(applyOkrWeightPlan([record('o1', 100, [50, 50])], 'employee')[0].payload.weight).toBe(100);
  });

  it('auto approves a plan submitted by a supervisor', () => {
    const saved = saveOkrWeightPlan('manager', '2026-10', { objectiveWeights: { o1: 100 }, keyResultWeights: {}, baseVersions: { o1: 1 }, autoApprove: true });
    expect(saved.status).toBe('approved');
  });
  it('rejects company goal owners and other reviewers for an employee plan', () => {
    saveOkrWeightPlan('employee', '2026-10', { objectiveWeights: { o1: 100 }, keyResultWeights: {}, baseVersions: { o1: 3 } });
    expect(() => reviewOkrWeightPlan('employee', '2026-10', 'boss', 'approve', people)).toThrow('仅直属主管');
    expect(getOkrWeightPlan('employee', '2026-10')?.status).toBe('submitted');
  });
});
