import dayjs from 'dayjs';
import type { OkrPayload, OkrRecord, OkrSettings, OkrTimeRule } from './okrRepository';
import type { OKRItem } from '../types';

export type ReviewType = 'week' | 'month';
export type ReviewPeriod = { startDate: string; endDate: string };
export type BackfillReview = ReviewPeriod & { type: ReviewType; title: string; draft?: OkrRecord };
export const RECENT_REVIEW_LIMIT = 5;
const submittedStatuses = new Set(['submitted', 'reviewed', 'active']);

export function currentReviewPeriod(type: ReviewType, now = dayjs()): ReviewPeriod {
  const start = type === 'month' ? now.startOf('month') : now.startOf('day').subtract((now.day() + 6) % 7, 'day');
  return { startDate: start.format('YYYY-MM-DD'), endDate: (type === 'month' ? start.endOf('month') : start.add(6, 'day')).format('YYYY-MM-DD') };
}

export const REVIEW_WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** The legacy full-month default means unrestricted access and maps to the whole week. */
export function normalizeWeeklyReviewRule(rule: OkrTimeRule): OkrTimeRule {
  if (rule.key !== 'weeklyReview' || rule.startDay !== 1 || rule.endDay !== 31) return rule;
  const { shortMonthRule: _shortMonthRule, ...weeklyRule } = rule;
  return { ...weeklyRule, startDay: 1, endDay: 7 };
}

export function reviewWriteAccess(settings: OkrSettings | undefined, type: ReviewType, now = dayjs()) {
  if (!settings) return { allowed: false, reason: '填写日期配置尚未加载' };
  const configured = settings.timeRules.find(item => item.key === (type === 'week' ? 'weeklyReview' : 'monthlyReview'));
  const rule = configured ? normalizeWeeklyReviewRule(configured) : undefined;
  if (!rule) return { allowed: true, reason: '' }; // Existing configurations without time rules remain compatible.
  if (!Number.isInteger(rule.startDay) || !Number.isInteger(rule.endDay) || rule.startDay < 1 || rule.endDay > (type === 'week' ? 7 : 31) || rule.startDay > rule.endDay) {
    return { allowed: false, reason: '填写日期配置无效，请联系管理员' };
  }
  if (type === 'week') {
    const weekday = (now.day() + 6) % 7 + 1;
    const allowed = weekday >= rule.startDay && weekday <= rule.endDay;
    return { allowed, reason: allowed ? '' : `每周填写时间为${REVIEW_WEEKDAYS[rule.startDay - 1]}至${REVIEW_WEEKDAYS[rule.endDay - 1]}，当前不可填写` };
  }
  const days = now.daysInMonth();
  if (rule.shortMonthRule === 'reject' && rule.endDay > days) return { allowed: false, reason: '本月天数不足，当前填写日期不可用' };
  const start = Math.min(rule.startDay, days);
  const end = Math.min(rule.endDay, days);
  const allowed = now.date() >= start && now.date() <= end;
  return { allowed, reason: allowed ? '' : `本月填写日期为${start}日至${end}日，当前不可填写` };
}

export function allowsReviewBackfill(settings: OkrSettings | undefined, type: ReviewType) {
  if (!settings) return false;
  return settings.timeRules.find(item => item.key === (type === 'week' ? 'weeklyReview' : 'monthlyReview'))?.allowBackfill !== false;
}

export function reviewSubmissionAccess(settings: OkrSettings | undefined, payload: OkrPayload, now = dayjs()) {
  if (!settings) return { allowed: false, reason: '填写日期配置尚未加载，请稍后重试' };
  if (payload.reviewType !== 'week' && payload.reviewType !== 'month') return { allowed: false, reason: '复盘类型无效' };
  const type = payload.reviewType;
  const current = currentReviewPeriod(type, now);
  const start = dayjs(payload.startDate);
  const end = dayjs(payload.endDate);
  const expected = currentReviewPeriod(type, start);
  if (!payload.startDate || !payload.endDate || !start.isValid() || !end.isValid() || expected.startDate !== payload.startDate || expected.endDate !== payload.endDate) {
    return { allowed: false, reason: '复盘周期无效，请重新选择' };
  }
  if (payload.startDate === current.startDate && payload.endDate === current.endDate) return reviewWriteAccess(settings, type, now);
  if (end.isBefore(now, 'day')) return { allowed: allowsReviewBackfill(settings, type), reason: allowsReviewBackfill(settings, type) ? '' : '当前设置不允许补交此类复盘' };
  return { allowed: false, reason: '尚未到该周期的填写时间' };
}

export function recentSubmittedReviews(records: OkrRecord[], ownerId: string) {
  const timestamp = (record: OkrRecord) => {
    const value = dayjs(record.submittedAt || record.createdAt || '');
    return value.isValid() ? value.valueOf() : 0;
  };
  return records.filter(record => record.kind === 'review' && record.ownerId === ownerId && submittedStatuses.has(record.status))
    .sort((a, b) => timestamp(b) - timestamp(a) || b.id.localeCompare(a.id))
    .slice(0, RECENT_REVIEW_LIMIT);
}

export function reviewPeriodTitle(type: ReviewType, period: ReviewPeriod) {
  const start = dayjs(period.startDate);
  return type === 'month' ? `${start.format('YYYY年MM月')}月报` : `${start.format('YYYY年MM月DD日')}—${dayjs(period.endDate).format('MM月DD日')}周报`;
}

export function backfillReviews(records: OkrRecord[], objectives: OKRItem[], ownerId: string, settings: OkrSettings | undefined, now = dayjs()): BackfillReview[] {
  if (!settings) return [];
  const mine = records.filter(record => record.kind === 'review' && record.ownerId === ownerId && record.status !== 'deleted');
  const periods = new Map<string, BackfillReview>();
  const add = (type: ReviewType, period: ReviewPeriod) => {
    if (!allowsReviewBackfill(settings, type) || !dayjs(period.endDate).isBefore(now, 'day')) return;
    const matching = mine.filter(record => record.payload.reviewType === type && record.payload.startDate === period.startDate && record.payload.endDate === period.endDate);
    if (matching.some(record => submittedStatuses.has(record.status))) return;
    const draft = matching.find(record => ['draft', 'returned'].includes(record.status));
    periods.set(`${type}:${period.startDate}`, { ...period, type, title: draft?.payload.title || reviewPeriodTitle(type, period), draft });
  };
  const cycles = new Set([
    ...(settings.cycles?.periods || []),
    ...records.filter(record => record.ownerId === ownerId && record.status !== 'deleted' && ['objective', 'action', 'review'].includes(record.kind)).map(record => record.periodKey),
    ...mine.flatMap(record => record.payload.startDate ? [record.payload.startDate.slice(0, 7)] : []),
    ...objectives.filter(objective => objective.ownerId === ownerId && ['active', 'submitted', 'reviewed', 'completed', 'archived'].includes(objective.status || '')).map(objective => objective.cycle),
  ]);
  for (const cycle of cycles) {
    if (!/^\d{4}-\d{2}$/.test(cycle)) continue;
    const month = dayjs(`${cycle}-01`);
    if (!month.isValid() || month.format('YYYY-MM') !== cycle || month.isAfter(now, 'month')) continue;
    add('month', currentReviewPeriod('month', month));
    let week = dayjs(currentReviewPeriod('week', month).startDate);
    while (!week.isAfter(month.endOf('month'), 'day')) {
      add('week', currentReviewPeriod('week', week));
      week = week.add(7, 'day');
    }
  }
  for (const record of mine) {
    if (['draft', 'returned'].includes(record.status) && record.payload.startDate && record.payload.endDate && (record.payload.reviewType === 'week' || record.payload.reviewType === 'month')) {
      const period = { startDate: record.payload.startDate, endDate: record.payload.endDate };
      if (reviewSubmissionAccess(settings, record.payload, now).allowed) add(record.payload.reviewType, period);
    }
  }
  return [...periods.values()].sort((a, b) => b.endDate.localeCompare(a.endDate) || a.type.localeCompare(b.type));
}
