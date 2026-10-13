import dayjs from 'dayjs';
import type { OkrWork } from './okrRepository';
import type { EvidenceViewer } from './reviewEvidenceRepository';
import { productRepository } from './productRepository';
import { requirementRepository } from './requirementRepository';
import { workSource } from '../components/workbench/okr/workAggregation';
import type { ReviewPeriod } from './okrReviewRules';

export type ReviewStatusChange = { status: string; createdAt: string };
export type MonthlyReviewMetrics = { taskCount: number; collaborationCount: number; totalHours: number; overtimeHours?: number };
const taskStates = new Set(['已完成', '处理中', '进行中', '开发中', '研发中', '设计中', '测试中', '修复中']);
const collaborationStates = new Set(['处理中', '进行中', '已完成', '待验收', '已退回', '已驳回']);
export const isReviewOwner = (item: OkrWork, viewer: EvidenceViewer) => item.assigneeId ? item.assigneeId === viewer.id : item.ownerName === viewer.name;

export function calculateMonthlyReviewMetrics(work: OkrWork[], period: ReviewPeriod, viewer: EvidenceViewer): MonthlyReviewMetrics {
  const unique = new Map<string, OkrWork>();
  for (const item of work) {
    if (!isReviewOwner(item, viewer)) continue;
    const source = workSource(item);
    const changes = [...(item.statusChanges || [])];
    if (item.completedAt) changes.push({ status: '已完成', createdAt: item.completedAt });
    const states = source === 'task' ? taskStates : collaborationStates;
    if (!changes.some(change => states.has(change.status) && dayjs(change.createdAt).isValid()
      && !dayjs(change.createdAt).isBefore(period.startDate, 'day') && !dayjs(change.createdAt).isAfter(period.endDate, 'day'))) continue;
    const key = `${source}:${item.sourceId || item.id}`;
    unique.set(key, item);
  }
  const rows = [...unique.values()];
  return {
    taskCount: rows.filter(item => workSource(item) === 'task').length,
    collaborationCount: rows.filter(item => workSource(item) === 'ticket').length,
    totalHours: Math.round(rows.reduce((sum, item) => sum + (Number.isFinite(item.actualHours) ? item.actualHours : 0), 0) * 100) / 100,
  };
}

// Only the monthly editor loads audit history; weekly evidence loading stays unchanged.
export async function loadMonthlyReviewMetrics(work: OkrWork[], period: ReviewPeriod, viewer: EvidenceViewer) {
  const unique = new Map<string, OkrWork>();
  work.filter(item => isReviewOwner(item, viewer)).forEach(item => unique.set(`${workSource(item)}:${item.sourceId || item.id}`, item));
  const rows = await Promise.all([...unique.values()].map(async item => {
    if (item.statusChanges) return item;
    if (workSource(item) === 'ticket') {
      const detail = await requirementRepository.detail(item.sourceId || item.id);
      return { ...item, statusChanges: (detail.events || []).filter(event => event.toStatus && event.fromStatus !== event.toStatus)
        .map(event => ({ status: event.toStatus!, createdAt: event.createdAt })) };
    }
    if (!item.productLineId) return item;
    const events = await productRepository.workItemActivities(item.productLineId, item.sourceId || item.id);
    const statusChanges = events.flatMap(event => {
      if (event.eventType !== 'WORK_ITEM_TRANSITIONED') return [];
      const content = typeof event.content === 'string' ? JSON.parse(event.content) : event.content;
      if (!content || typeof content !== 'object' || !('toName' in content) || typeof content.toName !== 'string' || typeof event.createdAt !== 'string') return [];
      return [{ status: content.toName, createdAt: event.createdAt }];
    });
    return { ...item, statusChanges };
  }));
  return calculateMonthlyReviewMetrics(rows, period, viewer);
}
