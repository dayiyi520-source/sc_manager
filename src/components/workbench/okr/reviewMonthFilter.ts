export function filterReviewsByMonth<T extends { createdAt: string }>(reviews: T[], selectedMonth: string | null) {
  if (!selectedMonth) return reviews;
  return reviews.filter(review => review.createdAt.startsWith(selectedMonth));
}

export function toggleReviewMonth(currentMonth: string | null, nextMonth: string) {
  return currentMonth === nextMonth ? null : nextMonth;
}
