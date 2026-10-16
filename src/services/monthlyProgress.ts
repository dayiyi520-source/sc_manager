import type { OKRItem } from '../types';
import type { OkrKrReview, OkrPayload, OkrRecord } from './okrRepository';

export type MonthlyProgressPoint = { id: string; date: string; progress: number; monthly?: boolean };
const weighted = (rows: Array<{ progress: number; weight: number }>) => {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  return total ? Math.round(rows.reduce((sum, row) => sum + row.progress * row.weight, 0) / total * 10) / 10 : 0;
};

/** Match the goal hierarchy: KR weights first, then objective weights. */
export function monthlyOverallProgress(objectives: OKRItem[], reviews: OkrKrReview[]): number {
  return weighted(objectives.filter(objective => reviews.some(row => row.objectiveId === objective.id)).map(objective => ({
    weight: objective.weight,
    progress: weighted(objective.keyResults.filter(kr => reviews.some(row => row.objectiveId === objective.id && row.keyResultId === kr.id)).map(kr => ({
      weight: kr.weight, progress: reviews.find(row => row.objectiveId === objective.id && row.keyResultId === kr.id)!.currentProgress,
    }))),
  })));
}

/** Historical weights come only from the report snapshot, never today's goals or self score. */
export function savedReviewProgress(payload: OkrPayload): number | undefined {
  if (payload.monthlyMetrics?.overallProgress != null) return payload.monthlyMetrics.overallProgress;
  const reviews = payload.krReviews || [];
  if (payload.objectiveSnapshots?.length) {
    return weighted(payload.objectiveSnapshots.filter(objective => reviews.some(row => row.objectiveId === objective.id)).map(objective => ({ weight: objective.payload.weight ?? 100,
      progress: weighted((objective.payload.keyResults || []).filter(kr => reviews.some(row => row.objectiveId === objective.id && row.keyResultId === kr.id)).map(kr => ({ weight: kr.weight,
        progress: reviews.find(row => row.objectiveId === objective.id && row.keyResultId === kr.id)?.currentProgress ?? kr.progress }))),
    })));
  }
  // Legacy personal reports calculated the arithmetic mean of their selected plans.
  if (payload.reviewMode !== 'supervisor') return reviews.length ? Math.round(reviews.reduce((sum, row) => sum + row.currentProgress, 0) / reviews.length) : 0;
  return undefined;
}

export function monthlyProgressTrend(weeks: OkrRecord[], progress: number, endDate: string, department: boolean): MonthlyProgressPoint[] {
  const byPeriod = new Map<string, OkrRecord>();
  for (const record of weeks) {
    if (record.kind !== 'review' || !['submitted', 'reviewed'].includes(record.status) || record.payload.reviewType !== 'week') continue;
    if ((record.payload.reviewMode === 'supervisor') !== department || !record.payload.endDate || record.payload.endDate >= endDate) continue;
    const key = `${record.payload.startDate}:${record.payload.endDate}`;
    const previous = byPeriod.get(key);
    if (!previous || (record.submittedAt || record.createdAt || '') > (previous.submittedAt || previous.createdAt || '')) byPeriod.set(key, record);
  }
  const points = [...byPeriod.values()].sort((a, b) => a.payload.endDate!.localeCompare(b.payload.endDate!)).flatMap(record => {
    const value = record.payload.objectiveSnapshots?.length || record.payload.monthlyMetrics?.overallProgress != null ? savedReviewProgress(record.payload) : undefined;
    return value == null ? [] : [{ id: record.id, date: record.payload.endDate!, progress: value }];
  });
  return [...points, { id: 'month', date: endDate, progress, monthly: true }];
}
