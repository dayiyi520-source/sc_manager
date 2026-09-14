import dayjs from 'dayjs';
import type { OkrWork } from '../../../services/okrRepository';

export function reviewPeriod(type: 'week' | 'month', now = dayjs()) {
  // Calendar weeks run from Monday through Sunday, including across month/year boundaries.
  const start = type === 'month' ? now.startOf('month') : now.startOf('day').subtract((now.day() + 6) % 7, 'day');
  const end = type === 'month' ? now.endOf('month') : start.add(6, 'day');
  return {startDate:start.format('YYYY-MM-DD'), endDate:end.format('YYYY-MM-DD')};
}

export function completedWorkInPeriod(work: OkrWork[], start: string, end: string) {
  return work.filter(w => ['已完成', '已验收', '已发布', '已关闭'].includes(w.status)
    && dayjs(w.updatedAt).isValid() && !dayjs(w.updatedAt).isBefore(start, 'day')
    && !dayjs(w.updatedAt).isAfter(end, 'day'));
}
