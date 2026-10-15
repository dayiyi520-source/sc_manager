import dayjs, { type Dayjs } from 'dayjs';
import type { OkrSettings, OkrWeeklyReviewCycle } from './okrRepository';

const dateValid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).isValid() && dayjs(value).format('YYYY-MM-DD') === value;
const timeValid = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && dayjs(value).isValid() && dayjs(value).format('YYYY-MM-DDTHH:mm') === value;
export const weeklyCycleState = (row: OkrWeeklyReviewCycle, now = dayjs()) => now.isBefore(dayjs(row.startDate)) ? '未开始' : now.isAfter(dayjs(row.endDate).endOf('day')) ? '已结束' : '进行中';
export function validateWeeklyCycles(rows: OkrWeeklyReviewCycle[], previous: OkrWeeklyReviewCycle[] = [], now = dayjs()): string | undefined {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row.id || ids.has(row.id)) return '周报周期标识重复';
    ids.add(row.id);
    if (row.title !== undefined && (!row.title.trim() || row.title.trim().length > 100)) return '周报周期标题须为1至100个字符';
    if (!dateValid(row.startDate) || !dateValid(row.endDate) || row.startDate > row.endDate || row.month !== row.startDate.slice(0, 7)) return '周报周期日期或所属月份无效';
    if (typeof row.allowBackfill !== 'boolean') return '请选择有效的补录规则';
    if (!timeValid(row.notifyAt) || !timeValid(row.deadline) || row.notifyAt > row.deadline || dayjs(row.notifyAt).isBefore(dayjs(row.startDate)) || dayjs(row.deadline).isBefore(dayjs(row.endDate).startOf('day'))) return '通知时间须在周期开始后且不晚于截止时间，截止日期不能早于周期结束日期';
    const old = previous.find(item => item.id === row.id);
    if ((!old || weeklyCycleState(old, now) === '未开始') && weeklyCycleState(row, now) !== '未开始') return '只能新增或调整为未开始的周报周期';
  }
  const ordered = [...rows].sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (ordered.some((row, index) => index > 0 && row.startDate <= ordered[index - 1].endDate)) return '周报周期时间不能重叠';
  for (const old of previous) {
    const next = rows.find(row => row.id === old.id);
    if (weeklyCycleState(old, now) !== '未开始' && (!next || ['title', 'month', 'startDate', 'endDate', 'notifyAt', 'deadline', 'allowBackfill'].some(key => old[key as keyof OkrWeeklyReviewCycle] !== next[key as keyof OkrWeeklyReviewCycle]))) return '已开始或已结束的周报周期不能修改或删除';
  }
}
export function weeklyCycleFor(settings: OkrSettings | undefined, startDate?: string, endDate?: string) {
  return settings?.weeklyReviewCycles?.find(row => row.startDate === startDate && row.endDate === endDate);
}
export function activeWeeklyCycle(settings: OkrSettings | undefined, now: Dayjs = dayjs()) {
  const today = now.format('YYYY-MM-DD');
  return settings?.weeklyReviewCycles?.find(row => row.startDate <= today && row.endDate >= today);
}
export function configuredWeeklyAccess(settings: OkrSettings | undefined, startDate: string, endDate: string, now = dayjs()) {
  const row = weeklyCycleFor(settings, startDate, endDate);
  if (!row) return undefined;
  if (now.isBefore(dayjs(row.startDate))) return { allowed: false, reason: '尚未到该周期的填写时间' };
  if (now.isAfter(dayjs(row.deadline))) return { allowed: row.allowBackfill, reason: row.allowBackfill ? '' : '该周报周期已截止，不允许补录' };
  return { allowed: true, reason: '' };
}
