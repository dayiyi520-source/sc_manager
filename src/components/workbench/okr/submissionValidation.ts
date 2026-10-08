import dayjs from 'dayjs';

export const isSubmissionWeight = (weight: unknown): weight is number =>
  typeof weight === 'number' && Number.isInteger(weight) && weight >= 1 && weight <= 100;

export const isSubmissionDeadline = (deadline: unknown): boolean => {
  if (dayjs.isDayjs(deadline)) return deadline.isValid();
  return typeof deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    && dayjs(deadline).isValid() && dayjs(deadline).format('YYYY-MM-DD') === deadline;
};
