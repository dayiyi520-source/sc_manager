import type { OKRItem } from '../types';
import type { OkrKrReview, OkrPerson, OkrRecord, OkrPayload, OkrWeeklyReviewSnapshot } from './okrRepository';
import type { ReviewPeriod } from './okrReviewRules';
import { employeeActionsForKr } from './supervisorSupportPanels';
import { employeeSupportsForKr } from './supervisorReview';
import { monthlyReviewTargets } from './okrReviewTargets';

const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : 0;
const submitted = (record: OkrRecord, reviewType: 'week' | 'month' = 'week') => record.kind === 'review' && record.payload.reviewType === reviewType && ['submitted', 'reviewed', 'active'].includes(record.status);

export function departmentKrAggregation(objective: OKRItem, target: OkrKrReview, records: OkrRecord[], people: OkrPerson[], ownerId: string, period: ReviewPeriod, reviewType: 'week' | 'month' = 'week'): OkrKrReview {
  const source = objective.keyResults.find(kr => kr.id === target.keyResultId);
  const details = (source?.details || []).map(row => source?.businessObject && !row.version && /^v?\d+(?:\.\d+)*$/i.test(row.name.trim()) ? { ...row, name: source.businessObject, version: row.name } : row);
  const rowIds = details.length ? details.map(row => row.id) : [target.keyResultId];
  const groups = employeeActionsForKr(records, people, ownerId, target, period);
  const live = employeeSupportsForKr(records, people, ownerId, target, period, reviewType);
  for (const report of live) {
    if (!groups.some(group => group.authorId === report.record.ownerId)) groups.push({ authorId: report.record.ownerId, authorName: report.authorName, actions: report.contributions.map(row => ({ id: row.keyResultId, objectiveId: row.objectiveId, title: row.keyResultTitle, progress: row.currentProgress })) });
  }
  const contributors: NonNullable<OkrKrReview['contributors']> = [];
  for (const group of groups) {
    const previousPeriods = records.filter(record => submitted(record, reviewType) && record.ownerId === group.authorId && record.payload.endDate && record.payload.endDate < period.startDate)
      .sort((a, b) => b.payload.endDate!.localeCompare(a.payload.endDate!) || (b.submittedAt || '').localeCompare(a.submittedAt || ''));
    const previous = previousPeriods.flatMap(record => record.payload.krReviews || []);
    const current = live.filter(report => report.record.ownerId === group.authorId).sort((a,b) => (b.record.submittedAt || '').localeCompare(a.record.submittedAt || '')).flatMap(report => report.contributions);
    for (const detailId of rowIds) {
      const actions = group.actions.filter(action => {
        if (!details.length) return true;
        const record = records.find(row => row.id === action.objectiveId);
        const kr = record?.payload.keyResults?.find(row => row.executionActions?.some(item => item.id === action.id));
        return !kr?.details?.length || kr.details.some(row => row.id === detailId);
      });
      if (!actions.length) continue;
      const values = actions.map(action => {
        const matches = (row: OkrKrReview) => row.objectiveId === action.objectiveId && row.keyResultId === action.id;
        const last = previous.find(row => matches(row) && (!details.length || row.detailProgress?.some(item => item.id === detailId)));
        const now = current.find(row => matches(row) && (!details.length || row.detailProgress?.some(item => item.id === detailId)));
        const prior = details.length ? last?.detailProgress?.find(row => row.id === detailId)?.currentProgress ?? 0 : last?.currentProgress ?? 0;
        const value = details.length ? now?.detailProgress?.find(row => row.id === detailId)?.currentProgress ?? prior : now?.currentProgress ?? prior;
        return { previous: prior, current: value, submitted: Boolean(now) };
      });
      contributors.push({ authorId: group.authorId, authorName: group.authorName, detailId, previousProgress: average(values.map(value => value.previous)), currentProgress: average(values.map(value => value.current)), submitted: values.every(value => value.submitted) });
    }
  }
  const detailProgress = rowIds.map(id => {
    const rows = contributors.filter(row => row.detailId === id);
    return { id, previousProgress: average(rows.map(row => row.previousProgress)), currentProgress: average(rows.map(row => row.currentProgress)) };
  });
  return { ...target, detailRows: details, contributors, detailProgress, previousProgress: average(detailProgress.map(row => row.previousProgress)), currentProgress: average(detailProgress.map(row => row.currentProgress)) };
}

export function departmentContentSnapshots(records: OkrRecord[], people: OkrPerson[], ownerId: string, period: ReviewPeriod, reviewType: 'week' | 'month' = 'week'): OkrWeeklyReviewSnapshot[] {
  const members = new Set(people.filter(person => person.supervisorId === ownerId && person.id !== ownerId).map(person => person.id));
  const latest = new Map<string, OkrRecord>();
  for (const record of records.filter(record => submitted(record, reviewType) && members.has(record.ownerId) && record.payload.startDate === period.startDate && record.payload.endDate === period.endDate).sort((a,b) => (a.submittedAt || '').localeCompare(b.submittedAt || ''))) latest.set(record.ownerId, record);
  return [...latest.values()].map(record => ({ id: record.id, authorId: record.ownerId, authorName: people.find(person => person.id === record.ownerId)?.name || '人员已停用', title: record.payload.title, startDate: period.startDate, endDate: period.endDate, status: record.status, krReviews: record.payload.krReviews || [], assistance: record.payload.assistance || [], items: record.payload.items || [], extraWork: record.payload.extraWork, knowledgeEntries: record.payload.knowledgeEntries || [] }));
}

/** Recompute from authoritative records; apply all updates in the same record-store write. */
export function submitDepartmentReview(payload: OkrPayload, ownerId: string, records: OkrRecord[], people: OkrPerson[]) {
  if (payload.reviewMode !== 'supervisor' || !['week', 'month'].includes(payload.reviewType || '') || !payload.startDate || !payload.endDate) return { records, payload };
  if (!people.some(person => person.supervisorId === ownerId && person.id !== ownerId)) throw new Error('当前人员无部门周报汇总权限');
  const reviewType = payload.reviewType as 'week' | 'month';
  const period = { startDate: payload.startDate, endDate: payload.endDate };
  const objectives = monthlyReviewTargets(records, ownerId, people).filter(objective => [period.startDate.slice(0,7),period.endDate.slice(0,7)].includes(objective.cycle));
  const reviews = (payload.krReviews || []).map(review => {
    const objective = objectives.find(row => row.id === review.objectiveId && row.keyResults.some(kr => kr.id === review.keyResultId));
    if (!objective) throw new Error('部门目标已变化，请刷新后重新提交');
    return departmentKrAggregation(objective, review, records, people, ownerId, period, reviewType);
  });
  const next = records.map(record => {
    const rows = reviews.filter(review => review.objectiveId === record.id);
    if (!rows.length) return record;
    const expectedVersion = payload.departmentObjectiveVersions?.[record.id];
    if (expectedVersion != null && expectedVersion !== record.version) throw new Error('部门目标已被更新，请刷新后重试');
    if (record.changeRequest?.status === 'pending') throw new Error('部门目标有待确认修改，请先处理');
    if (record.ownerId !== ownerId || record.status === 'deleted') throw new Error('无权更新此部门目标');
    const keyResults = (record.payload.keyResults || []).map(kr => {
      const review = rows.find(row => row.keyResultId === kr.id);
      return review ? { ...kr, progress: review.currentProgress, details: kr.details?.map(detail => ({ ...detail, progress: review.detailProgress?.find(row => row.id === detail.id)?.currentProgress ?? detail.progress })) } : kr;
    });
    const weight = keyResults.reduce((sum, kr) => sum + kr.weight, 0);
    const progress = weight ? Math.round(keyResults.reduce((sum, kr) => sum + kr.progress * kr.weight, 0) / weight * 10) / 10 : 0;
    return { ...record, version: record.version + 1, progressHistory: [...(record.progressHistory || []), ...rows.map(row => ({ id: crypto.randomUUID(), itemId: row.keyResultId, operatorId: ownerId, createdAt: new Date().toISOString(), previousProgress: record.payload.keyResults?.find(kr => kr.id === row.keyResultId)?.progress || 0, progress: row.currentProgress, status: 'normal' as const, note: `部门${reviewType === 'month' ? '月' : '周'}报 ${period.startDate} 至 ${period.endDate} 汇总同步`, attachments: [] }))], payload: { ...record.payload, keyResults, progress } };
  });
  return { records: next, payload: { ...payload, krReviews: reviews, syncKrProgress: true, departmentContentSnapshots: departmentContentSnapshots(records, people, ownerId, period, reviewType) } };
}
