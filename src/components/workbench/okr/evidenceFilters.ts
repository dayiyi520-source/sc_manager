import dayjs from 'dayjs';
import type { OkrWork } from '../../../services/okrRepository';
import type { EvidenceViewer } from '../../../services/reviewEvidenceRepository';
import { workSource } from './workAggregation';

export type EvidenceContext = { viewer?: EvidenceViewer; product?: string; version?: string; startDate: string; endDate: string; source: 'task' | 'ticket' };
const inPeriod = (value: string | undefined, context: EvidenceContext) => Boolean(value && dayjs(value).isValid() && !dayjs(value).isBefore(context.startDate, 'day') && !dayjs(value).isAfter(context.endDate, 'day'));
const finished = new Set(['已完成', '已发布', '已验收', '已关闭']);
const processing = new Set(['处理中', '进行中', '开发中', '研发中', '设计中', '测试中', '修复中']);
const inactive = new Set(['待处理', '待开始', '未开始', '待办', '已取消', '已驳回', '已搁置']);
export function filterEvidence(work: OkrWork[], context: EvidenceContext) {
  const unique = new Map<string, OkrWork>();
  for (const item of work) {
    if (workSource(item) !== context.source) continue;
    if (context.source === 'task' && inactive.has(item.status)) continue;
    if (item.createdAt && dayjs(item.createdAt).isAfter(context.endDate, 'day')) continue;
    if (!context.viewer && context.source === 'task') continue;
    if (context.viewer) {
      const mine = item.assigneeId ? item.assigneeId === context.viewer.id : item.ownerName === context.viewer.name;
      const created = item.creatorId ? item.creatorId === context.viewer.id : item.creatorName === context.viewer.name;
      const participated = item.participantIds?.includes(context.viewer.id) || item.participantNames?.includes(context.viewer.name);
      if (context.source === 'task' ? !mine : !(mine || created || participated)) continue;
    }
    if (context.product && ![item.productLineId, item.productLineName].includes(context.product)) continue;
    // Task evidence spans all versions of the selected product.
    const recentlyCreated = inPeriod(item.createdAt, context);
    const recentlyCompleted = (item.statusGroup === 'COMPLETED' || finished.has(item.status)) && inPeriod(item.completedAt, context);
    const ongoing = item.statusGroup ? ['IN_PROGRESS', 'PROCESSING', 'ACTIVE'].includes(item.statusGroup) : processing.has(item.status);
    const collaborationState = context.source === 'ticket' && ['待验收', '已退回'].includes(item.status);
    if (context.source === 'task' ? !(recentlyCompleted || ongoing) : !(recentlyCompleted || ongoing || collaborationState || (recentlyCreated && !['已取消', '已驳回', '已搁置'].includes(item.status)))) continue;
    const key = item.sourceId || item.id;
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

export function defaultCollapsedReview(item: { currentProgress: number; previousProgress: number; health: string; workIds: string[] }) {
  return item.currentProgress >= 100 || (item.currentProgress === item.previousProgress && item.health === 'normal' && !item.workIds.length);
}
