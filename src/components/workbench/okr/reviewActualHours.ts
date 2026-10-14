import type { OkrWork } from '../../../services/okrRepository';

/** Only completed tasks with a submitted actual-hours value contribute to a review. */
export function completedActualHours(work: { status: string; actualHours?: number; kind?: OkrWork['kind'] }): number | undefined {
  if (work.kind && work.kind !== 'task' || !['已完成', '已发布', '已验收', '已关闭'].includes(work.status)) return undefined;
  return Number.isFinite(work.actualHours) && (work.actualHours ?? 0) > 0 ? work.actualHours : undefined;
}
