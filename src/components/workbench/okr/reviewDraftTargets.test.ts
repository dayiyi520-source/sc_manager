import { describe, expect, it } from 'vitest';
import type { OkrKrReview } from '../../../services/okrRepository';
import { reconcileReviewDraftTargets, restoreReviewDraftTargets } from './reviewDraftTargets';

const target: OkrKrReview = { objectiveId: 'o', objectiveTitle: '目标', keyResultId: 'k', keyResultTitle: '结果', previousProgress: 0, currentProgress: 0, health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: [], supervisorProgress: [{ id: 'own', currentProgress: 0 }] };
const saved: OkrKrReview = { ...target, achievement: '保留总结', supervisorProgress: [{ id: 'own', currentProgress: 30 }, { id: 'reassigned', currentProgress: 80 }] };

describe('supervisor draft permissions', () => {
  it.each([undefined, '2026-10-12'])('drops reassigned progress when restoring a copied or saved draft (%s)', startDate => {
    const restored = restoreReviewDraftTargets([target], { title: '草稿', startDate, krReviews: [saved] });
    expect(restored[0].supervisorProgress).toEqual([{ id: 'own', currentProgress: startDate ? 30 : 0 }]);
    expect(restored[0].achievement).toBe('保留总结');
    expect(saved.supervisorProgress).toHaveLength(2);
  });
  it('drops revoked permissions during live refresh without losing written content', () => {
    const refreshed = reconcileReviewDraftTargets([saved], [{ ...target, supervisorProgress: [] }]);
    expect(refreshed[0].supervisorProgress).toEqual([]);
    expect(refreshed[0].achievement).toBe('保留总结');
  });
});
