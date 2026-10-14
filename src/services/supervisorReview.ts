import type { OkrKrReview, OkrPerson, OkrRecord, OkrWeeklyReviewSnapshot } from './okrRepository';
import type { ReviewPeriod } from './okrReviewRules';

const submitted = new Set(['submitted', 'reviewed', 'active']);
export type EmployeeReviewSupport = { record: OkrRecord; authorName: string; contributions: OkrKrReview[] };

export function canReadReviewRecord(record: OkrRecord, viewerId: string | null, people: OkrPerson[]) {
  if (record.kind !== 'review' || !viewerId || record.ownerId === viewerId) return true;
  return submitted.has(record.status) && people.some(person => person.id === record.ownerId && person.supervisorId === viewerId);
}

export function employeeSupportsForKr(records: OkrRecord[], people: OkrPerson[], supervisorId: string, target: Pick<OkrKrReview, 'objectiveId' | 'keyResultId'>, period: ReviewPeriod, reviewType: 'week' | 'month' = 'week'): EmployeeReviewSupport[] {
  const directReports = new Map(people.filter(person => person.id !== supervisorId && person.supervisorId === supervisorId).map(person => [person.id, person]));
  const linked = (goal: OkrRecord) => goal.payload.sourceObjectiveId === target.objectiveId && goal.payload.sourceKrId === target.keyResultId
    || goal.payload.alignments?.some(link => link.parentObjectiveId === target.objectiveId && link.parentKeyResultId === target.keyResultId)
    || goal.payload.parentObjectiveId === target.objectiveId && (goal.payload.parentKeyResultId === target.keyResultId || goal.payload.parentActionId === target.keyResultId);
  const sources = new Map(records.filter(record => record.kind !== 'review' && directReports.has(record.ownerId) && record.status !== 'deleted' && !record.payload.inherited && linked(record)).map(record => [record.id, record]));
  const unique = new Map<string, EmployeeReviewSupport>();
  for (const record of records) {
    if (record.kind !== 'review' || !submitted.has(record.status) || !directReports.has(record.ownerId)
      || record.payload.reviewType !== reviewType || record.payload.startDate !== period.startDate || record.payload.endDate !== period.endDate) continue;
    const contributions = (record.payload.krReviews || []).filter(row => {
      const source = sources.get(row.objectiveId) || sources.get(row.keyResultId);
      if (!source) {
        const parent = records.find(goal => goal.kind === 'objective' && goal.ownerId === supervisorId && goal.id === target.objectiveId && goal.status !== 'deleted');
        return row.objectiveId === target.objectiveId && row.keyResultId === target.keyResultId
          && Boolean(parent?.payload.keyResults?.find(kr => kr.id === target.keyResultId)?.assigneeIds?.includes(record.ownerId));
      }
      if (source.ownerId !== record.ownerId) return false;
      if (source.kind === 'action') return source.id === row.keyResultId;
      const matchingKr = source.payload.keyResults?.find(kr => kr.id === row.keyResultId || kr.executionActions?.some(action => action.id === row.keyResultId && action.ownerId === record.ownerId));
      if (!matchingKr) return false;
      if (matchingKr.id !== row.keyResultId) return matchingKr.id === target.keyResultId
        || source.payload.sourceKrId === target.keyResultId && source.payload.keyResults?.length === 1;
      return matchingKr.id === target.keyResultId || source.payload.sourceKrId === target.keyResultId && source.payload.keyResults?.length === 1;
    });
    if (contributions.length) unique.set(record.id, { record, authorName: directReports.get(record.ownerId)!.name, contributions });
  }
  return [...unique.values()].sort((a, b) => a.authorName.localeCompare(b.authorName, 'zh-CN') || a.record.id.localeCompare(b.record.id));
}

export function supervisorProgressBaseline(targets: OkrKrReview[], records: OkrRecord[], ownerId: string, period: ReviewPeriod) {
  const previous = records.filter(record => record.kind === 'review' && record.ownerId === ownerId && submitted.has(record.status)
    && record.payload.reviewType === 'week' && record.payload.endDate && record.payload.endDate < period.startDate)
    .sort((a, b) => b.payload.endDate!.localeCompare(a.payload.endDate!) || (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return targets.map(target => {
    const review = previous.flatMap(record => record.payload.krReviews || []).find(row => row.objectiveId === target.objectiveId && row.keyResultId === target.keyResultId);
    return { ...target, previousProgress: review?.currentProgress ?? target.previousProgress };
  });
}

export function employeeSupportSnapshots(supports: EmployeeReviewSupport[]): OkrWeeklyReviewSnapshot[] {
  return supports.map(({ record, authorName, contributions }) => ({
    id: record.id, authorId: record.ownerId, authorName, title: record.payload.title,
    startDate: record.payload.startDate!, endDate: record.payload.endDate!, status: record.status,
    summary: undefined, krReviews: contributions.map(row => ({ ...row, employeeReviewSnapshots: undefined })), assistance: [],
    items: (record.payload.items || []).filter(item => contributions.some(kr => kr.workIds.includes(item.workId))),
  }));
}
