import type { OKRItem } from '../../../types';
import type { OkrKrReview, OkrPayload } from '../../../services/okrRepository';
import { mergeCopiedKrReviews } from './reviewCopy';
import type { OkrRecord } from '../../../services/okrRepository';

function permittedSupervisorProgress(target: OkrKrReview, saved: OkrKrReview) {
  return target.supervisorProgress === undefined ? saved.supervisorProgress
    : saved.supervisorProgress?.filter(row => target.supervisorProgress!.some(item => item.id === row.id));
}

export function reviewDraftTargets(objectives: OKRItem[]): OkrKrReview[] {
  return objectives.flatMap(objective => objective.keyResults.map(kr => ({
    objectiveId: objective.id, objectiveTitle: objective.objective,
    keyResultId: kr.id, keyResultTitle: kr.content,
    previousProgress: kr.progress, currentProgress: kr.progress,
    detailRows: kr.parentKeyResultDetails ?? kr.details, health: 'normal' as const, achievement: '', blocker: '', nextPlan: '', workIds: [],
  })));
}

/** A personal baseline never comes from a shared KR or subtable. */
export function employeeReviewBaseline(targets: OkrKrReview[], records: OkrRecord[], ownerId: string, startDate: string) {
  const history = records.filter(record => record.kind === 'review' && record.ownerId === ownerId
    && ['submitted', 'reviewed', 'active'].includes(record.status) && record.payload.reviewType === 'week'
    && Boolean(record.payload.endDate && record.payload.endDate < startDate))
    .sort((a, b) => (b.payload.endDate || '').localeCompare(a.payload.endDate || '') || (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  return targets.map(target => {
    const previous = history.flatMap(record => record.payload.krReviews || []).find(row => row.objectiveId === target.objectiveId && row.keyResultId === target.keyResultId);
    return { ...target, previousProgress: previous?.currentProgress ?? 0, currentProgress: previous?.currentProgress ?? 0,
      detailProgress: previous?.detailProgress?.filter(row => !target.detailRows || target.detailRows.some(detail => detail.id === row.id)).map(row => ({ ...row, previousProgress: row.currentProgress })) };
  });
}

export function restoreReviewDraftTargets(current: OkrKrReview[], payload?: OkrPayload): OkrKrReview[] {
  if (!payload?.startDate) return mergeCopiedKrReviews(current, payload?.krReviews || []).map(saved => {
    const target = current.find(row => row.objectiveId === saved.objectiveId && row.keyResultId === saved.keyResultId);
    return target ? { ...saved, supervisorProgress: permittedSupervisorProgress(target, saved) } : saved;
  });
  const restored = current.map(target => {
    const saved = payload.krReviews?.find(row => row.keyResultId === target.keyResultId && row.objectiveId === target.objectiveId);
    if (!saved) return target;
    return { ...saved, supervisorProgress: permittedSupervisorProgress(target, saved), detailRows: target.detailRows, detailProgress: saved.detailProgress?.filter(row => !target.detailRows || target.detailRows.some(detail => detail.id === row.id)), objectiveId: target.objectiveId, objectiveTitle: target.objectiveTitle,
      keyResultId: target.keyResultId, keyResultTitle: target.keyResultTitle };
  });
  return restored.concat((payload.krReviews || []).filter(row => !current.some(target => target.keyResultId === row.keyResultId && target.objectiveId === row.objectiveId)));
}

/** Refresh names/baselines; keep edited conclusions and detached input for recovery. */
export function reconcileReviewDraftTargets(previous: OkrKrReview[], current: OkrKrReview[], priorTargets?: OkrKrReview[]) {
  const result = current.map(target => {
    const edited = previous.find(row => row.keyResultId === target.keyResultId && row.objectiveId === target.objectiveId);
    if (!edited) return target;
    const baseline = priorTargets?.find(row => row.keyResultId === target.keyResultId && row.objectiveId === target.objectiveId);
    return { ...edited, supervisorProgress: permittedSupervisorProgress(target, edited), objectiveTitle: target.objectiveTitle, keyResultTitle: target.keyResultTitle,
      detailRows: target.detailRows, previousProgress: target.previousProgress, detailProgress: edited.detailProgress?.filter(row => !target.detailRows || target.detailRows.some(detail => detail.id === row.id)).map(row => {
        const prior = target.detailProgress?.find(item => item.id === row.id);
        return { ...row, previousProgress: prior?.previousProgress ?? row.previousProgress,
          currentProgress: row.currentProgress === (baseline?.detailProgress?.find(item => item.id === row.id)?.currentProgress ?? row.previousProgress) ? prior?.currentProgress ?? row.currentProgress : row.currentProgress };
      }),
      currentProgress: edited.currentProgress === (baseline?.currentProgress ?? edited.previousProgress) ? target.currentProgress : edited.currentProgress };
  });
  return result.concat(previous.filter(row => !current.some(target => target.keyResultId === row.keyResultId && target.objectiveId === row.objectiveId)));
}

export function detachedReviewDescription(rows: OkrKrReview[]) {
  return rows.map(row => [row.keyResultTitle, row.supervisorJudgment, row.achievement, row.blocker, row.nextPlan, row.evidenceNote].filter(Boolean).join('；')).join('\n');
}
