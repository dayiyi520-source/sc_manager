import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { activeWeeklyCycle, validateWeeklyCycles } from './weeklyReviewCycles';
import { reviewPeriodFor, reviewSubmissionAccess, backfillReviews } from './okrReviewRules';
import type { OkrSettings, OkrWeeklyReviewCycle } from './okrRepository';
const cycle: OkrWeeklyReviewCycle = { id: 'w', month: '2026-11', startDate: '2026-11-03', endDate: '2026-11-09', template: 'byRole', notifyAt: '2026-11-07T09:00', deadline: '2026-11-10T18:00', allowBackfill: false };
const settings = { timeRules: [], weeklyReviewCycles: [cycle] } as unknown as OkrSettings;
describe('configured weekly cycles', () => {
  it('uses a custom week and enforces deadline and backfill at submission', () => {
    expect(reviewPeriodFor(settings, 'week', dayjs('2026-11-04'))).toEqual({ startDate: cycle.startDate, endDate: cycle.endDate });
    const payload = { title: '周报', reviewType: 'week' as const, startDate: cycle.startDate, endDate: cycle.endDate };
    expect(reviewSubmissionAccess(settings, payload, dayjs('2026-11-02')).allowed).toBe(false);
    expect(reviewSubmissionAccess(settings, payload, dayjs('2026-11-10T18:00')).allowed).toBe(true);
    expect(reviewSubmissionAccess(settings, payload, dayjs('2026-11-10T18:01')).allowed).toBe(false);
    const backfill = { ...settings, weeklyReviewCycles: [{ ...cycle, allowBackfill: true }] };
    expect(reviewSubmissionAccess(backfill, payload, dayjs('2026-12-01')).allowed).toBe(true);
    expect(backfillReviews([], [], 'e', backfill, dayjs('2026-12-01')).some(row => row.startDate === cycle.startDate)).toBe(true);
    expect(activeWeeklyCycle(settings, dayjs('2026-11-04'))).toEqual(cycle);
  });
  it('locks begun or finished cycles, permits future deletion and rejects overlap and invalid dates', () => {
    expect(validateWeeklyCycles([cycle], [], dayjs('2026-10-15'))).toBeUndefined();
    expect(validateWeeklyCycles([], [cycle], dayjs('2026-11-03'))).toContain('不能修改或删除');
    expect(validateWeeklyCycles([{ ...cycle, allowBackfill: true }], [cycle], dayjs('2026-12-01'))).toContain('不能修改或删除');
    expect(validateWeeklyCycles([], [cycle], dayjs('2026-10-15'))).toBeUndefined();
    expect(validateWeeklyCycles([{ ...cycle, startDate: '2026-10-01', month: '2026-10' }], [cycle], dayjs('2026-10-15'))).toContain('未开始');
    expect(validateWeeklyCycles([cycle, { ...cycle, id: 'other' }], [], dayjs('2026-10-15'))).toContain('重叠');
    expect(validateWeeklyCycles([{ ...cycle, notifyAt: '2026-11-11T09:00' }], [], dayjs('2026-10-15'))).toContain('通知');
    expect(validateWeeklyCycles([{ ...cycle, endDate: '2026-11-31' }], [], dayjs('2026-10-15'))).toContain('日期');
  });
  it('does not allow ordinary calendar weeks in a configured month and keeps legacy months', () => {
    expect(reviewSubmissionAccess(settings, { title: '', reviewType: 'week', startDate: '2026-11-02', endDate: '2026-11-08' }, dayjs('2026-11-04')).allowed).toBe(false);
    expect(reviewSubmissionAccess(settings, { title: '', reviewType: 'week', startDate: '2026-10-12', endDate: '2026-10-18' }, dayjs('2026-10-15')).allowed).toBe(true);
  });
});
