import { describe, expect, it } from 'vitest';
import { filterReviewsByMonth, toggleReviewMonth } from './reviewMonthFilter';

const reviews = [
  { id: 'aug-week', createdAt: '2026-08-30 18:20' },
  { id: 'sep-week', createdAt: '2026-09-13 18:35' },
  { id: 'sep-month', createdAt: '2026-09-16 17:30' },
];

describe('review month filter', () => {
  it('returns only reviews created in the selected month', () => {
    expect(filterReviewsByMonth(reviews, '2026-09').map(review => review.id)).toEqual([
      'sep-week',
      'sep-month',
    ]);
  });

  it('keeps the full year without a selection and toggles the active month off', () => {
    expect(filterReviewsByMonth(reviews, null)).toEqual(reviews);
    expect(toggleReviewMonth(null, '2026-08')).toBe('2026-08');
    expect(toggleReviewMonth('2026-08', '2026-08')).toBeNull();
    expect(toggleReviewMonth('2026-08', '2026-09')).toBe('2026-09');
  });
});
