import dayjs from 'dayjs';
import type { OkrRecord } from '../../../services/okrRepository';

export type OkrPeriodStatus = 'active' | 'upcoming' | 'ended';

export const periodStatusOptions = (): { label: string; value: OkrPeriodStatus }[] => [
  { label: '进行中', value: 'active' },
  { label: '未开始', value: 'upcoming' },
  { label: '已结束', value: 'ended' },
];

export function periodStatus(month: string, current = dayjs().format('YYYY-MM')): OkrPeriodStatus {
  if (month === current) return 'active';
  return month > current ? 'upcoming' : 'ended';
}

export function periodStatusLabel(month: string, current = dayjs().format('YYYY-MM')) {
  return periodStatusOptions().find(option => option.value === periodStatus(month, current))?.label || '已结束';
}

const recordMonth = (record: OkrRecord) => record.periodKey || record.payload.startDate?.slice(0, 7);

export function periodMonths(records: OkrRecord[], status: OkrPeriodStatus, current = dayjs().format('YYYY-MM')) {
  if (status === 'active') return [current];
  if (status === 'upcoming') return [dayjs(`${current}-01`).add(1, 'month').format('YYYY-MM')];
  return Array.from(new Set(records.map(recordMonth).filter((month): month is string => Boolean(month && /^\d{4}-\d{2}$/.test(month) && month < current)))).sort().reverse();
}

export function cycleOptions(records: OkrRecord[], ownerId: string, current = dayjs().format('YYYY-MM')) {
  const months = new Set(Array.from({ length: 12 }, (_, index) => dayjs(current).subtract(index, 'month').format('YYYY-MM')));
  records.forEach(record => {
    const month = recordMonth(record);
    if (month && /^\d{4}-\d{2}$/.test(month) && month < current) months.add(month);
  });
  months.add(dayjs(`${current}-01`).add(1, 'month').format('YYYY-MM'));

  return periodStatusOptions().map(option => ({
    label: option.label,
    value: option.value,
    children: [...months]
      .filter(month => periodStatus(month, current) === option.value)
      .sort()
      .reverse()
      .map(month => ({ value: month, label: dayjs(month).format('YYYY年MM月') })),
  }));
}
