import { describe, expect, it } from 'vitest';
import { adjustmentError, calculateOkrScore, scoreObjectivesFor, type ScoreAdjustment, type ScoreObjective } from './okrPerformanceScore';
import type { OkrPerson, OkrRecord } from './okrRepository';

const objective = (id: string, weight: number, progress: number, krProgress = progress): ScoreObjective => ({
  id, title: id, type: 'target', weight, progress,
  krs: [{ id: `${id}-kr`, title: '交付 KR', weight: 100, progress: krProgress }],
});
const adjustment = (kind: ScoreAdjustment['kind'], points: number, objectiveId?: string, krId?: string): ScoreAdjustment => ({
  id: kind, month: '2026-10', scope: 'personal', ownerId: 'employee', kind, points, objectiveId, krId,
  evidence: '已核验的交付记录', actorId: 'manager', status: 'approved', createdAt: '2026-10-31',
});

describe('OKR 绩效计分', () => {
  it('calculates the weighted 50-point base without bonuses or deductions', () => {
    const score = calculateOkrScore([objective('a', 30, 98), objective('b', 30, 96), objective('c', 40, 95)], []);
    expect(score.base).toBe(48.1);
    expect(score.total).toBe(48.1);
  });

  it('deducts low KR progress within each KR earned share and caps redline at 30', () => {
    const rows = [objective('a', 50, 85, 55), objective('b', 50, 70, 45)];
    const score = calculateOkrScore(rows, []);
    expect(score.automaticDeduction).toBe(6);
    expect(score.redline).toBe(true);
    expect(score.total).toBe(30);
    const low = calculateOkrScore([objective('a', 1, 10, 10), objective('b', 99, 100)], []);
    expect(low.objectiveRows[0].krRows[0].automaticDeduction).toBe(0.05);
    expect(low.total).toBe(30);
  });

  it('applies only approved items, caps challenge and total bonuses, and zeros a fraudulent O', () => {
    const challenge: ScoreObjective = { ...objective('challenge', 0, 100), type: 'challenge', deadline: '2026-10-31', actualCompletedAt: '2026-10-25' };
    const rows = [objective('a', 50, 100), objective('b', 50, 100), challenge];
    const entries = [adjustment('challenge-stage', 2, 'challenge'), adjustment('challenge-complete', 3, 'challenge'), adjustment('early', 1, 'a'), adjustment('fraud', 0, 'b', 'b-kr')];
    expect(calculateOkrScore(rows, entries).total).toBe(31);
    expect(calculateOkrScore(rows, [...entries, adjustment('early', 1, 'b')]).total).toBe(31);
    expect(calculateOkrScore(rows, entries.map(entry => entry.kind === 'fraud' ? { ...entry, status: 'submitted' as const } : entry)).total).toBe(56);
    expect(calculateOkrScore(rows, Array.from({ length: 12 }, (_, index) => ({ ...adjustment('early', 1, 'a'), id: String(index) }))).bonus).toBe(10);
  });

  it('validates evidence, range and delivery date before approval', () => {
    const challenge: ScoreObjective = { ...objective('challenge', 0, 65), type: 'challenge', deadline: '2026-10-31', actualCompletedAt: '2026-11-01' };
    expect(adjustmentError(adjustment('challenge-complete', 3, 'challenge'), [challenge])).toContain('100%');
    expect(adjustmentError(adjustment('quality', 6, 'a', 'a-kr'), [objective('a', 100, 90)])).toContain('1 至 5');
    expect(adjustmentError({ ...adjustment('early', 1, 'a'), evidence: '' }, [objective('a', 100, 90)])).toContain('依据');
  });

  it('uses each employee own approved progress for a shared child KR', () => {
    const people: OkrPerson[] = [
      { id: 'manager', name: '主管', department: '研发部', supervisorId: null, rootFlag: 0, version: 1 },
      { id: 'employee', name: '甲', department: '研发部', supervisorId: 'manager', rootFlag: 0, version: 1 },
      { id: 'other', name: '乙', department: '研发部', supervisorId: 'manager', rootFlag: 0, version: 1 },
    ];
    const records: OkrRecord[] = [{ id: 'o', kind: 'objective', ownerId: 'manager', periodKey: '2026-10', status: 'active', version: 1,
      payload: { goalLevel: 'department', goalModelVersion: 2, objectiveType: 'target', title: '交付', weight: 100,
        keyResults: [{ id: 'kr', title: '结果', weight: 100, progress: 90, details: [{ id: 'detail', name: '任务', assigneeIds: ['employee', 'other'], progress: 90 }] }] } }];
    const own = scoreObjectivesFor(records, people, 'employee', '2026-10', 'personal')[0];
    expect(own.krs[0]).toMatchObject({ id: 'detail', weight: 100, progress: 0 });
  });
});
