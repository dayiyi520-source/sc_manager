import { describe, expect, it } from 'vitest';
import { monthlyOverallProgress, monthlyProgressTrend, savedReviewProgress } from './monthlyProgress';
import type { OKRItem } from '../types';
import type { OkrKrReview, OkrRecord } from './okrRepository';
const row = (objectiveId: string, keyResultId: string, currentProgress: number) => ({ objectiveId, keyResultId, currentProgress } as OkrKrReview);
const week = (id: string, endDate: string, progress: number, department = false): OkrRecord => ({ id, kind: 'review', ownerId: 'me', periodKey: endDate, status: 'submitted', version: 1,
  payload: { title: id, reviewMode: department ? 'supervisor' : 'structured', reviewType: 'week', startDate: endDate, endDate, krReviews: [row('o', 'a', progress)], objectiveSnapshots: [{ id: 'o', period: '2026-10', payload: { title: '目标', weight: 100, keyResults: [{ id: 'a', title: '计划', weight: 100, progress }] } }] } });
describe('monthly progress', () => {
  it('weights KR first, then objective, instead of averaging all plans', () => {
    const objectives = [{ id: 'o', weight: 80, keyResults: [{ id: 'a', weight: 75 }, { id: 'b', weight: 25 }] }, { id: 'p', weight: 20, keyResults: [{ id: 'c', weight: 100 }] }] as OKRItem[];
    expect(monthlyOverallProgress(objectives, [row('o', 'a', 100), row('o', 'b', 0), row('p', 'c', 0)])).toBe(60);
  });
  it('retains every actual preceding week and appends one monthly point without a three-week limit', () => {
    const weeks = ['04','11','18','25'].map((date, i) => week(`w${i}`, `2026-10-${date}`, i * 20));
    const points = monthlyProgressTrend([...weeks, week('next', '2026-11-01', 100), week('department', '2026-10-15', 99, true)], 80, '2026-10-31', false);
    expect(points.map(point => point.progress)).toEqual([0,20,40,60,80]);
    expect(points.at(-1)).toMatchObject({ monthly: true, date: '2026-10-31' });
  });
  it('uses saved weights and does not substitute self score for progress', () => {
    const payload = { ...week('w','2026-10-10', 100, true).payload, selfScore: 95, krReviews: [row('o', 'a', 100), row('o', 'b', 0)], objectiveSnapshots: [{ id: 'o', period: '2026-10', payload: { title: '部门目标', keyResults: [{ id: 'a', title: '甲', progress: 100, weight: 20 },{ id: 'b', title: '乙', progress: 0, weight: 80 }] } }] };
    expect(savedReviewProgress(payload)).toBe(20);
    expect(savedReviewProgress({ ...payload, objectiveSnapshots: undefined })).toBeUndefined();
  });
  it('deduplicates a weekly period and handles no weekly reports without adding zero points', () => {
    const older = { ...week('old','2026-10-10',20), submittedAt: '2026-10-10T12:00:00' };
    const newer = { ...week('new','2026-10-10',50), submittedAt: '2026-10-10T14:00:00' };
    expect(monthlyProgressTrend([older,newer], 70, '2026-10-31', false).map(point => point.progress)).toEqual([50,70]);
    expect(monthlyProgressTrend([], 0, '2026-10-31', false)).toHaveLength(1);
  });
});

it('does not make up weighted historical points when old reports lack a saved basis', () => {
  const legacy = week('legacy', '2026-10-10', 80);
  legacy.payload.objectiveSnapshots = undefined;
  expect(monthlyProgressTrend([legacy], 90, '2026-10-31', false)).toEqual([{ id: 'month', date: '2026-10-31', progress: 90, monthly: true }]);
});
