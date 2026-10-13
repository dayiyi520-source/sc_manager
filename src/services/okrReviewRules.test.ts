import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import type { OKRItem } from '../types';
import type { OkrRecord, OkrSettings } from './okrRepository';
import { backfillReviews, currentReviewPeriod, recentSubmittedReviews, reviewSubmissionAccess, reviewWriteAccess } from './okrReviewRules';

export const settings: OkrSettings = { defaultView: 'list', timeRules: [{ key: 'weeklyReview', label: '周报', startDay: 2, endDay: 5, allowBackfill: true }], templates: [], dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] }, validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true } };
const objective: OKRItem = { id: 'o', cycle: '2026-09', ownerId: 'me', ownerName: '本人', category: 'my', department: '产品', objective: '目标', weight: 100, progress: 0, deadline: '', status: 'active', keyResults: [] };
const record = (id: string, status = 'submitted', ownerId = 'me'): OkrRecord => ({ id, kind: 'review', ownerId, status, version: 1, periodKey: '2026-09-07/2026-09-13', createdAt: `2026-09-${id.padStart(2, '0')}T12:00:00`, payload: { title: id, reviewType: 'week', startDate: '2026-09-07', endDate: '2026-09-13' } });

describe('review date rules', () => {
  it.each([['2026-10-09', false], ['2026-10-10', true], ['2026-10-20', true], ['2026-10-21', false]])('handles inclusive bounds on %s', (date, allowed) => expect(reviewWriteAccess({ ...settings, timeRules: [{ ...settings.timeRules[0], key: 'monthlyReview', startDay: 10, endDay: 20 }] }, 'month', dayjs(date)).allowed).toBe(allowed));
  it.each([['2026-10-12', false], ['2026-10-13', true], ['2026-10-16', true], ['2026-10-17', false], ['2026-11-03', true]])('checks weekdays independently of month dates on %s', (date, allowed) => expect(reviewWriteAccess(settings, 'week', dayjs(date)).allowed).toBe(allowed));
  it('supports Sunday and maps only the legacy full-month default to a whole week', () => {
    const sunday = { ...settings, timeRules: [{ ...settings.timeRules[0], startDay: 7, endDay: 7 }] };
    expect(reviewWriteAccess(sunday, 'week', dayjs('2026-10-18')).allowed).toBe(true);
    expect(reviewWriteAccess(sunday, 'week', dayjs('2026-10-19')).allowed).toBe(false);
    expect(reviewWriteAccess({ ...settings, timeRules: [{ ...settings.timeRules[0], startDay: 1, endDay: 31 }] }, 'week', dayjs('2026-10-18')).allowed).toBe(true);
    expect(reviewWriteAccess({ ...settings, timeRules: [{ ...settings.timeRules[0], startDay: 20, endDay: 31 }] }, 'week').allowed).toBe(false);
    expect(reviewWriteAccess(settings, 'week', dayjs('2026-10-12')).reason).toContain('周二至周五');
  });
  it('keeps a missing rule compatible but blocks unavailable and malformed settings', () => {
    expect(reviewWriteAccess(settings, 'month').allowed).toBe(true);
    expect(reviewWriteAccess(undefined, 'week').allowed).toBe(false);
    expect(reviewWriteAccess({ ...settings, timeRules: [{ ...settings.timeRules[0], startDay: 6, endDay: 5 }] }, 'week').allowed).toBe(false);
  });
  it('clamps both ends to the month end or rejects a short month', () => {
    const rules = { ...settings, timeRules: [{ ...settings.timeRules[0], key: 'monthlyReview', startDay: 30, endDay: 31, shortMonthRule: 'clamp' as const }] };
    expect(reviewWriteAccess(rules, 'month', dayjs('2026-02-27')).allowed).toBe(false);
    expect(reviewWriteAccess(rules, 'month', dayjs('2026-02-28')).allowed).toBe(true);
    expect(reviewWriteAccess({ ...rules, timeRules: [{ ...rules.timeRules[0], shortMonthRule: 'reject' }] }, 'month', dayjs('2026-02-28')).allowed).toBe(false);
  });
  it('separates current date limits, permitted backfill and future periods', () => {
    const now = dayjs('2026-10-25');
    expect(reviewSubmissionAccess(settings, { title: '', reviewType: 'week', ...currentReviewPeriod('week', now) }, now).allowed).toBe(false);
    expect(reviewSubmissionAccess(settings, record('1').payload, now).allowed).toBe(true);
    expect(reviewSubmissionAccess({ ...settings, timeRules: [{ ...settings.timeRules[0], allowBackfill: false }] }, record('1').payload, now).allowed).toBe(false);
    expect(reviewSubmissionAccess(settings, { title: '', reviewType: 'week', ...currentReviewPeriod('week', dayjs('2026-11-02')) }, now).allowed).toBe(false);
    expect(reviewSubmissionAccess(settings, { ...record('1').payload, endDate: '2026-09-12' }, now).allowed).toBe(false);
  });
  it('keeps cross-year weeks Monday to Sunday', () => expect(currentReviewPeriod('week', dayjs('2027-01-01'))).toEqual({ startDate: '2026-12-28', endDate: '2027-01-03' }));
});

describe('recent submitted and overdue records', () => {
  it('limits to five owned submissions and sorts by actual submission time before creation time', () => {
    const rows = Array.from({ length: 7 }, (_, i) => record(String(i + 1)));
    rows[0].submittedAt = '2026-10-10T12:00:00';
    expect(recentSubmittedReviews([...rows, record('8', 'draft'), record('9', 'submitted', 'other')], 'me').map(row => row.id)).toEqual(['1', '7', '6', '5', '4']);
  });
  it('deduplicates cross-month weeks and omits submitted, current and foreign periods', () => {
    const rows = backfillReviews([record('1')], [objective, { ...objective, id: 'oct', cycle: '2026-10' }, { ...objective, id: 'foreign', ownerId: 'other', cycle: '2026-08' }], 'me', settings, dayjs('2026-10-12'));
    expect(rows.some(row => row.startDate === '2026-09-07')).toBe(false);
    expect(rows.filter(row => row.type === 'week' && row.startDate === '2026-09-28')).toHaveLength(1);
    expect(rows.every(row => row.endDate < '2026-10-12')).toBe(true);
    expect(rows.some(row => row.type === 'month' && row.startDate.startsWith('2026-08'))).toBe(false);
  });
  it('preserves existing overdue drafts with no current eligible objective', () => {
    const draft = record('draft', 'draft');
    expect(backfillReviews([draft], [], 'me', settings, dayjs('2026-10-12'))).toEqual(expect.arrayContaining([expect.objectContaining({ draft, startDate: '2026-09-07' })]));
    const disabled = { ...settings, timeRules: [...settings.timeRules, { key: 'monthlyReview', label: '月报', startDay: 1, endDay: 31, allowBackfill: false }].map(rule => ({ ...rule, allowBackfill: false })) };
    expect(backfillReviews([draft], [objective], 'me', disabled, dayjs('2026-10-12'))).toEqual([]);
  });
});

 describe('universal backfill discovery', () => {
  it.each(['employee', 'supervisor', 'boss'])('offers configured overdue periods to %s without requiring a goal', ownerId => {
    const config = { ...settings, cycles: { automatic: false, types: ['month'] as const, schedules: {}, crossAlignment: false, periods: ['2026-09'] } };
    const items = backfillReviews([], [], ownerId, config as unknown as OkrSettings, dayjs('2026-10-13'));
    expect(items.some(item => item.type === 'week' && item.startDate === '2026-09-07')).toBe(true);
    expect(items.some(item => item.type === 'month' && item.startDate === '2026-09-01')).toBe(true);
  });
  it('uses owned monthly records when projection is unavailable without taking periods from another owner', () => {
    const own: OkrRecord = { id: 'goal', kind: 'objective', ownerId: 'me', status: 'active', version: 0, periodKey: '2026-09', payload: { title: '本人目标' } };
    const foreign = { ...own, id: 'foreign', ownerId: 'other', periodKey: '2026-08' };
    const items = backfillReviews([own, foreign], [], 'me', settings, dayjs('2026-10-13'));
    expect(items.some(item => item.type === 'month' && item.startDate === '2026-09-01')).toBe(true);
    expect(items.some(item => item.type === 'month' && item.startDate === '2026-08-01')).toBe(false);
  });
});
