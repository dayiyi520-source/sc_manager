import dayjs, { type Dayjs } from 'dayjs';
import type { OkrKrReview, OkrMonthlyTask, OkrRecord } from '../../../services/okrRepository';

export const monthPeriod = (month: Dayjs) => ({
  startDate: month.startOf('month').format('YYYY-MM-DD'),
  endDate: month.endOf('month').format('YYYY-MM-DD')
});

export interface MonthlyEvidenceEntry {
  id: string;
  title: string;
  type: '任务' | '工单' | '非 OKR';
  progressChange: string;
  summary: string;
}

export interface MonthlyEvidenceWeek {
  reviewId: string;
  startDate: string;
  endDate: string;
  entries: MonthlyEvidenceEntry[];
}

export function eligibleWeeklyReviews(records: OkrRecord[], ownerId: string, month: Dayjs) {
  const { startDate, endDate } = monthPeriod(month);
  return records
    .filter(record => record.kind === 'review' && record.ownerId === ownerId)
    .filter(record => record.payload.reviewType === 'week')
    .filter(record => ['submitted', 'reviewed'].includes(record.status))
    .filter(record => {
      const start = dayjs(record.payload.startDate);
      const end = dayjs(record.payload.endDate);
      return start.isValid() && end.isValid()
        && !end.isBefore(startDate, 'day')
        && !start.isAfter(endDate, 'day');
    })
    .sort((left, right) => String(left.payload.startDate).localeCompare(String(right.payload.startDate)));
}

const uniqueText = (values: Array<string | undefined>) => Array.from(new Set(values.map(value => value?.trim()).filter(Boolean) as string[]));
const monthlyTaskStatus = (status: string) => {
  if (['已完成', '已发布', '已验收', '已关闭'].includes(status)) return '已完成';
  if (status.includes('阻塞') || status.includes('驳回')) return '已阻塞';
  return status === '待处理' ? '待处理' : '处理中';
};

export function aggregateKrReview(
  objectiveId: string,
  keyResultId: string,
  title: string,
  progress: number,
  weeklyReviews: OkrRecord[]
): OkrKrReview {
  const sources = weeklyReviews.flatMap(record => record.payload.krReviews || [])
    .filter(item => item.objectiveId === objectiveId && item.keyResultId === keyResultId);
  return {
    objectiveId,
    objectiveTitle: '',
    keyResultId,
    keyResultTitle: title,
    previousProgress: sources[0]?.previousProgress ?? progress,
    currentProgress: sources.at(-1)?.currentProgress ?? progress,
    health: sources.some(item => item.health === 'blocked') ? 'blocked' : sources.some(item => item.health === 'risk') ? 'risk' : 'normal',
    achievement: uniqueText(sources.map(item => item.achievement)).join('\n'),
    blocker: uniqueText(sources.map(item => item.blocker).filter(value => value && value !== '无')).join('\n'),
    nextPlan: uniqueText(sources.map(item => item.nextPlan)).join('\n'),
    evidenceNote: uniqueText(sources.map(item => item.evidenceNote)).join('；'),
    workIds: []
  };
}

export function suggestMonthlySummary(weeklyReviews: OkrRecord[]) {
  const summaries = uniqueText(weeklyReviews.map(record => record.payload.summary));
  const achievements = uniqueText(weeklyReviews.flatMap(record => (record.payload.krReviews || []).map(item => item.achievement)));
  return [...summaries, ...achievements].join('\n');
}

export function aggregateMonthlyTasks(weeklyReviews: OkrRecord[]): OkrMonthlyTask[] {
  const result: OkrMonthlyTask[] = [];
  const seen = new Set<string>();
  for (const record of weeklyReviews) {
    const extraWorkIds = new Set(record.payload.extraWork?.workIds || []);
    for (const item of (record.payload.items || []).filter(entry => extraWorkIds.has(entry.workId))) {
      if (seen.has(item.workId)) continue;
      seen.add(item.workId);
      result.push({
        id: `weekly-${record.id}-${item.workId}`,
        content: item.title,
        result: item.result || '',
        status: monthlyTaskStatus(item.status),
        sourceReviewId: record.id,
        workId: item.workId
      });
    }
    const description = record.payload.extraWork?.description;
    if (!description?.startsWith('[')) continue;
    try {
      const rows = JSON.parse(description) as Array<{ id?:string; content?:string; status?:string; note?:string }>;
      for (const [index, row] of rows.entries()) {
        const key = row.id || `${record.id}-${index}-${row.content}`;
        if (!row.content?.trim() || seen.has(key)) continue;
        seen.add(key);
        result.push({
          id: `weekly-${record.id}-${index}`,
          content: row.content.trim(),
          result: row.note?.trim() || '',
          status: monthlyTaskStatus(row.status || '已完成'),
          sourceReviewId: record.id
        });
      }
    } catch {
      if (description.trim()) result.push({
        id: `weekly-${record.id}-extra`,
        content: description.trim(),
        result: '',
        status: '已完成',
        sourceReviewId: record.id
      });
    }
  }
  return result;
}

export function monthlyEvidenceTimeline(weeklyReviews: OkrRecord[], keyResultId: string): MonthlyEvidenceWeek[] {
  return weeklyReviews.map(record => {
    const sourceKr = (record.payload.krReviews || []).find(item => item.keyResultId === keyResultId);
    const items = new Map((record.payload.items || []).map(item => [item.workId, item]));
    const entries: MonthlyEvidenceEntry[] = [];
    const seen = new Set<string>();
    for (const workId of sourceKr?.workIds || []) {
      const item = items.get(workId);
      if (!item || seen.has(workId)) continue;
      seen.add(workId);
      entries.push({
        id: `${record.id}-${workId}`,
        title: item.title,
        type: item.workType === 'ticket' ? '工单' : '任务',
        progressChange: `${sourceKr?.previousProgress ?? 0}% -> ${sourceKr?.currentProgress ?? 0}%`,
        summary: item.result?.trim() || sourceKr?.achievement?.trim() || '未填写成果简述'
      });
    }
    for (const workId of record.payload.extraWork?.workIds || []) {
      const item = items.get(workId);
      if (!item || seen.has(workId)) continue;
      seen.add(workId);
      entries.push({
        id: `${record.id}-${workId}`,
        title: item.title,
        type: item.workType === 'ticket' ? '工单' : '任务',
        progressChange: '-',
        summary: item.impact?.trim() || record.payload.extraWork?.impact || '未填写对 OKR 的影响'
      });
    }
    const description = record.payload.extraWork?.description;
    if (description?.startsWith('[')) {
      try {
        const rows = JSON.parse(description) as Array<{ id?:string; content?:string; impact?:string; note?:string }>;
        rows.forEach((row, index) => {
          if (!row.content?.trim()) return;
          entries.push({
            id: `${record.id}-manual-${row.id || index}`,
            title: row.content.trim(),
            type: '非 OKR',
            progressChange: '-',
            summary: row.impact?.trim() || row.note?.trim() || '未填写对 OKR 的影响'
          });
        });
      } catch {
        // Historical free-text extra work is displayed as one non-OKR entry.
      }
    } else if (description?.trim()) {
      entries.push({
        id: `${record.id}-manual-extra`,
        title: description.trim(),
        type: '非 OKR',
        progressChange: '-',
        summary: record.payload.extraWork?.impact || '未填写对 OKR 的影响'
      });
    }
    return {
      reviewId: record.id,
      startDate: record.payload.startDate || '',
      endDate: record.payload.endDate || '',
      entries
    };
  });
}
