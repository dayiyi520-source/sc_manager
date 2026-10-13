import type { OKRItem } from '../../../types';
import type { OkrKrReview, OkrPayload } from '../../../services/okrRepository';
import { mergeCopiedKrReviews } from './reviewCopy';

export function reviewDraftTargets(objectives: OKRItem[]): OkrKrReview[] {
  return objectives.flatMap(objective => objective.keyResults.map(kr => ({
    objectiveId: objective.id, objectiveTitle: objective.objective,
    keyResultId: kr.id, keyResultTitle: kr.content,
    previousProgress: kr.progress, currentProgress: kr.progress,
    health: 'normal' as const, achievement: '', blocker: '', nextPlan: '', workIds: [],
  })));
}

export function restoreReviewDraftTargets(current: OkrKrReview[], payload?: OkrPayload): OkrKrReview[] {
  if (!payload?.startDate) return mergeCopiedKrReviews(current, payload?.krReviews || []);
  const restored = current.map(target => {
    const saved = payload.krReviews?.find(row => row.keyResultId === target.keyResultId && row.objectiveId === target.objectiveId);
    if (!saved) return target;
    return { ...saved, objectiveId: target.objectiveId, objectiveTitle: target.objectiveTitle,
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
    return { ...edited, objectiveTitle: target.objectiveTitle, keyResultTitle: target.keyResultTitle,
      previousProgress: target.previousProgress,
      currentProgress: edited.currentProgress === (baseline?.currentProgress ?? edited.previousProgress) ? target.currentProgress : edited.currentProgress };
  });
  return result.concat(previous.filter(row => !current.some(target => target.keyResultId === row.keyResultId && target.objectiveId === row.objectiveId)));
}

export function detachedReviewDescription(rows: OkrKrReview[]) {
  return rows.map(row => [row.keyResultTitle, row.supervisorJudgment, row.achievement, row.blocker, row.nextPlan, row.evidenceNote].filter(Boolean).join('；')).join('\n');
}
