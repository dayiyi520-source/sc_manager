import dayjs from 'dayjs';

export function employeeReviewHealth(progress: number, startDate: string | undefined, endDate: string | undefined, asOf: string) {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const date = dayjs(asOf);
  if (!startDate || !endDate || !start.isValid() || !end.isValid() || !date.isValid() || !end.isAfter(start, 'day')) return null;
  const elapsed = Math.max(0, Math.min(end.diff(start, 'day'), date.diff(start, 'day')));
  const expected = Math.max(0, Math.min(100, elapsed / end.diff(start, 'day') * 100));
  if (expected === 0) return null;
  if (progress + 1e-9 >= expected * 1.1) return '超预期';
  if (progress + 1e-9 >= expected * .9) return '正常';
  if (progress + 1e-9 >= expected * .75) return '风险';
  return '逾期';
}
