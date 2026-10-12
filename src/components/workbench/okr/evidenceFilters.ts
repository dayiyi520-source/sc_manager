import dayjs from 'dayjs';
import type { OkrWork } from '../../../services/okrRepository';
import type { EvidenceViewer } from '../../../services/reviewEvidenceRepository';
import { workSource } from './workAggregation';

export type EvidenceContext = { viewer?: EvidenceViewer; product?: string; version?: string; startDate: string; endDate: string; source: 'task' | 'ticket' };
const inPeriod = (value: string | undefined, context: EvidenceContext) => Boolean(value && dayjs(value).isValid() && !dayjs(value).isBefore(context.startDate, 'day') && !dayjs(value).isAfter(context.endDate, 'day'));
const finished = new Set(['已完成', '已发布', '已验收', '已关闭']);
const processing = new Set(['处理中', '进行中', '开发中', '研发中', '设计中', '测试中', '修复中']);
const productionDepartment = (value = '') => /产研|产品|研发|开发|软件|设计|测试|技术/.test(value);
export function filterEvidence(work: OkrWork[], context: EvidenceContext) {
  const unique = new Map<string, OkrWork>();
  for (const item of work) {
    if (workSource(item) !== context.source) continue;
    if (item.createdAt && dayjs(item.createdAt).isAfter(context.endDate, 'day')) continue;
    if (context.viewer) {
      const mine = item.assigneeId ? item.assigneeId === context.viewer.id : item.ownerName === context.viewer.name;
      const created = item.creatorId ? item.creatorId === context.viewer.id : item.creatorName === context.viewer.name;
      const participated = item.participantIds?.includes(context.viewer.id) || item.participantNames?.includes(context.viewer.name);
      if (context.source === 'task' ? !mine : !(mine || created || participated)) continue;
    }
    const productFilter = context.source === 'ticket' || !context.viewer || productionDepartment(context.viewer.department);
    if (productFilter && context.product && ![item.productLineId, item.productLineName].includes(context.product)) continue;
    if (context.source === 'task' && productFilter && context.version && ![item.versionId, item.versionName].includes(context.version)) continue;
    const recentlyCreated = inPeriod(item.createdAt, context);
    const recentlyCompleted = finished.has(item.status) && inPeriod(item.completedAt, context);
    const ongoing = processing.has(item.status) || (!item.status && ['IN_PROGRESS', 'PROCESSING', 'ACTIVE'].includes(item.statusGroup || ''));
    const collaborationState = context.source === 'ticket' && ['待验收', '已退回'].includes(item.status);
    if (!(recentlyCompleted || ongoing || collaborationState || (recentlyCreated && !['已取消', '已驳回', '已搁置'].includes(item.status)))) continue;
    const key = item.sourceId || item.id;
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

export function defaultCollapsedReview(item: { currentProgress: number; previousProgress: number; health: string; workIds: string[] }) {
  return item.currentProgress >= 100 || (item.currentProgress === item.previousProgress && item.health === 'normal' && !item.workIds.length);
}
