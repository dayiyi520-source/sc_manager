import type { OkrKrReview, OkrPayload } from '../../../services/okrRepository';

export function createReviewCopyDraft(source: OkrPayload): OkrPayload {
  return {
    ...source,
    title: '',
    startDate: undefined,
    endDate: undefined,
    feedback: undefined,
    finalScore: undefined,
    evaluation: undefined,
    objectiveSnapshots: undefined,
    items: [],
    weeklyReviewIds: [],
    weeklyReviewSnapshots: [],
    monthlyOtherTasks: [],
    nextMonthPlans: [],
    krReviews: (source.krReviews || []).map(review => ({
      ...review,
      workIds: [],
      evidenceNote: '',
    })),
    extraWork: source.extraWork
      ? { ...source.extraWork, workIds: [], notes: {} }
      : { workIds: [], description: '', impact: 'none', notes: {} },
  };
}

export function mergeCopiedKrReviews(current: OkrKrReview[], copied: OkrKrReview[]) {
  return current.map((review, index) => {
    const source = copied.find(item => item.keyResultId === review.keyResultId) || copied[index];
    if (!source) return review;
    return {
      ...review,
      currentProgress: source.currentProgress,
      health: source.health,
      achievement: source.achievement,
      blocker: source.blocker,
      nextPlan: source.nextPlan,
      evidenceNote: source.evidenceNote,
      workIds: [],
    };
  });
}
