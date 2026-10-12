import dayjs from 'dayjs';
import type { OkrCycleSettings, OkrCycleType } from './okrRepository';

export const cycleTypeLabels: Record<OkrCycleType, string> = { month: '月度', quarter: '季度', halfYear: '半年度', year: '年度' };
export const defaultCycles = (): OkrCycleSettings => ({ automatic: false, types: ['month'], crossAlignment: false, periods: [], schedules: { month: {daysBefore:3,time:'09:00'}, quarter:{daysBefore:0,time:'08:00'}, halfYear:{daysBefore:0,time:'08:00'}, year:{daysBefore:0,time:'08:00'} } });
export function periodBounds(key: string) {
  const month = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  const quarter = /^(\d{4})-Q([1-4])$/.exec(key);
  const half = /^(\d{4})-H([12])$/.exec(key);
  const year = /^\d{4}$/.test(key);
  if (!month && !quarter && !half && !year) return undefined;
  const start = dayjs(`${key.slice(0,4)}-${String(month ? Number(month[2]) : quarter ? (Number(quarter[2])-1)*3+1 : half ? (Number(half[2])-1)*6+1 : 1).padStart(2,'0')}-01`);
  const months = month ? 1 : quarter ? 3 : half ? 6 : 12;
  return { start: start.format('YYYY-MM-DD'), end: start.add(months,'month').subtract(1,'day').format('YYYY-MM-DD') };
}
export function periodLabel(key: string) {
  if (!periodBounds(key)) return key;
  if (key.includes('-Q')) return `${key.slice(0,4)}年第${key.slice(-1)}季度`;
  if (key.includes('-H')) return `${key.slice(0,4)}年${key.endsWith('1')?'上':'下'}半年`;
  return key.length === 4 ? `${key}年度` : dayjs(`${key}-01`).format('YYYY年MM月');
}
export function canAlignPeriod(child: string, parent: string, cross = false) {
  const c = periodBounds(child), p = periodBounds(parent);
  return !!c && !!p && (child === parent || cross && p.start <= c.start && p.end >= c.end);
}
export function periodKeyFor(type: OkrCycleType, date = dayjs()) {
  return type === 'month' ? date.format('YYYY-MM') : type === 'quarter' ? `${date.year()}-Q${Math.floor(date.month()/3)+1}` : type === 'halfYear' ? `${date.year()}-H${date.month()<6?1:2}` : date.format('YYYY');
}
/** Opening the app catches up due creations; no background scheduler is available in this frontend checkout. */
export function materializePeriods(config: OkrCycleSettings, now = dayjs()): OkrCycleSettings {
  if (!config.automatic) return config;
  const periods = new Set(config.periods);
  for (const type of config.types) {
    const current = periodKeyFor(type, now);
    periods.add(current);
    const bounds = periodBounds(current)!;
    const schedule = config.schedules[type];
    const due = dayjs(`${bounds.end}T${schedule.time}`).subtract(schedule.daysBefore,'day');
    if (!now.isBefore(due)) periods.add(periodKeyFor(type, dayjs(bounds.end).add(1,'day')));
  }
  return {...config,periods:[...periods].sort()};
}
