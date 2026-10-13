import type { OKRItem } from '../types';
import type { OkrKrReview, OkrPerson, OkrRecord, OkrReviewItem, OkrWeeklyReviewSnapshot } from './okrRepository';
import type { ReviewPeriod } from './okrReviewRules';
import type { EmployeeReviewSupport } from './supervisorReview';

export type EmployeeActionGroup = { authorId: string; authorName: string; actions: Array<{ id: string; objectiveId: string; title: string; progress: number }> };
export type EmployeeEvidence = OkrReviewItem & { employeeNames: string[]; missing?: boolean };
export type ExecutionStatus = 'ahead' | 'normal' | 'risk' | 'overdue';

export function employeeActionsForKr(records: OkrRecord[], people: OkrPerson[], supervisorId: string, target: Pick<OkrKrReview, 'objectiveId' | 'keyResultId'>, period: ReviewPeriod): EmployeeActionGroup[] {
  const members = new Map(people.filter(person => person.supervisorId === supervisorId && person.id !== supervisorId).map(person => [person.id, person]));
  const groups = new Map<string, EmployeeActionGroup>();
  for (const record of records) {
    if (record.kind === 'review' || !members.has(record.ownerId) || !['active', 'reviewed', 'completed', 'archived'].includes(record.status)
      || record.payload.inherited || record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved'
      || ![period.startDate.slice(0, 7), period.endDate.slice(0, 7)].includes(record.periodKey)) continue;
    const source = record.payload;
    const linked = source.sourceObjectiveId === target.objectiveId && source.sourceKrId === target.keyResultId
      || source.alignments?.some(link => link.parentObjectiveId === target.objectiveId && link.parentKeyResultId === target.keyResultId)
      || source.parentObjectiveId === target.objectiveId && (source.parentKeyResultId === target.keyResultId || source.parentActionId === target.keyResultId);
    if (!linked) continue;
    const actions = record.kind === 'action'
      ? [{ id: record.id, title: source.title, progress: source.progress || 0, objectiveId: record.id }]
      : (source.keyResults || []).filter(kr => kr.id === target.keyResultId || source.sourceKrId === target.keyResultId && source.keyResults?.length === 1)
        .flatMap(kr => (kr.executionActions || []).filter(action => action.ownerId === record.ownerId).map(action => ({ id: action.id, title: action.title, progress: action.progress, objectiveId: record.id })));
    if (!actions.length) continue;
    const group = groups.get(record.ownerId) || { authorId: record.ownerId, authorName: members.get(record.ownerId)!.name, actions: [] };
    group.actions = [...new Map([...group.actions, ...actions].map(action => [`${action.objectiveId}:${action.id}`, action])).values()];
    groups.set(record.ownerId, group);
  }
  return [...groups.values()].sort((a, b) => a.authorName.localeCompare(b.authorName, 'zh-CN'));
}

export function employeeEvidenceForKr(supports: EmployeeReviewSupport[], snapshots: OkrWeeklyReviewSnapshot[]): EmployeeEvidence[] {
  const reports = [...supports.map(support => ({ id: support.record.id, authorName: support.authorName, krReviews: support.contributions, items: support.record.payload.items || [] })),
    ...snapshots.filter(snapshot => !supports.some(support => support.record.id === snapshot.id))];
  const result = new Map<string, EmployeeEvidence>();
  for (const report of reports) {
    for (const workId of new Set(report.krReviews.flatMap(row => row.workIds))) {
      const item = report.items.find(row => row.workId === workId);
      const previous = result.get(workId);
      const row: EmployeeEvidence = item ? { ...item, employeeNames: [] } : { workId, title: `已失效的工作证据（${workId}）`, status: '无法读取', result: '', impact: '', employeeNames: [], missing: true };
      result.set(workId, { ...(previous && !previous.missing ? previous : row), employeeNames: [...new Set([...(previous?.employeeNames || []), report.authorName || '人员已停用'])] });
    }
  }
  return [...result.values()];
}

export function supervisorObjectiveSummary(objective: OKRItem, reviews: OkrKrReview[], today: string) {
  const rows = objective.keyResults.map(kr => ({ kr, review: reviews.find(row => row.keyResultId === kr.id) }));
  const weight = rows.reduce((sum, row) => sum + row.kr.weight, 0);
  const aggregate = (previous: boolean) => weight ? Math.round(rows.reduce((sum, row) => sum + row.kr.weight * (row.review ? previous ? row.review.previousProgress : row.review.currentProgress : row.kr.progress), 0) / weight * 10) / 10 : 0;
  const statuses: ExecutionStatus[] = rows.map(({ kr, review }) => {
    const progress = review?.currentProgress ?? kr.progress;
    if (progress < 100 && kr.deadline && kr.deadline < today) return 'overdue';
    if (kr.executionStatus === 'overdue') return 'overdue';
    if (review?.health === 'risk' || review?.health === 'blocked' || kr.executionStatus === 'risk') return 'risk';
    return kr.executionStatus || 'normal';
  });
  const status: ExecutionStatus = statuses.includes('overdue') ? 'overdue' : statuses.includes('risk') ? 'risk'
    : objective.executionStatus || (statuses.length && statuses.every(status => status === 'ahead') ? 'ahead' : 'normal');
  return { weight, previousProgress: aggregate(true), currentProgress: aggregate(false), status };
}
