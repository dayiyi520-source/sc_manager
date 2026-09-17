import { describe, expect, it } from 'vitest';
import type { OkrKrReview, OkrPayload } from '../../../services/okrRepository';
import { createReviewCopyDraft, mergeCopiedKrReviews } from './reviewCopy';

const source: OkrPayload = {
  title: '[周报] 历史周期',
  startDate: '2026-08-01',
  endDate: '2026-08-07',
  reviewType: 'week',
  reviewMode: 'structured',
  summary: '历史摘要',
  selfScore: 92,
  feedback: '主管评价',
  finalScore: 95,
  evaluation: 'A',
  items: [{ workId: 'old-work', title: '历史任务', status: '已完成', result: '完成', impact: '' }],
  krReviews: [{
    objectiveId: 'old-objective', objectiveTitle: '历史目标', keyResultId: 'old-kr', keyResultTitle: '历史 KR',
    previousProgress: 20, currentProgress: 70, health: 'risk', achievement: '历史成果', blocker: '历史风险',
    nextPlan: '历史计划', evidenceNote: '历史证据', workIds: ['old-work'],
  }],
  extraWork: { workIds: ['old-extra'], description: '计划外工作', impact: 'support', notes: { 'old-extra': '说明' } },
  weeklyReviewIds: ['old-week'],
  weeklyReviewSnapshots: [],
  monthlyOtherTasks: [{ id: 'old-task', content: '历史任务', result: '完成', status: '已完成' }],
  nextMonthPlans: [{ id: 'old-plan', content: '历史计划' }],
  otherNotes: '其他补充',
  nextMonthArrangement: '下月安排',
};

describe('review copy draft', () => {
  it('keeps editable content but removes source-period identity and evidence', () => {
    const draft = createReviewCopyDraft(source);

    expect(draft.summary).toBe('历史摘要');
    expect(draft.otherNotes).toBe('其他补充');
    expect(draft.nextMonthArrangement).toBe('下月安排');
    expect(draft.title).toBe('');
    expect(draft.startDate).toBeUndefined();
    expect(draft.endDate).toBeUndefined();
    expect(draft.feedback).toBeUndefined();
    expect(draft.finalScore).toBeUndefined();
    expect(draft.items).toEqual([]);
    expect(draft.weeklyReviewIds).toEqual([]);
    expect(draft.monthlyOtherTasks).toEqual([]);
    expect(draft.nextMonthPlans).toEqual([]);
    expect(draft.krReviews?.[0].workIds).toEqual([]);
    expect(draft.extraWork).toEqual({ workIds: [], description: '计划外工作', impact: 'support', notes: {} });
  });

  it('copies KR conclusions onto current valid KR identities', () => {
    const current: OkrKrReview[] = [{
      objectiveId: 'current-objective', objectiveTitle: '当前目标', keyResultId: 'current-kr', keyResultTitle: '当前 KR',
      previousProgress: 60, currentProgress: 60, health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: [],
    }];
    const merged = mergeCopiedKrReviews(current, source.krReviews || []);

    expect(merged[0]).toMatchObject({
      objectiveId: 'current-objective', keyResultId: 'current-kr', previousProgress: 60,
      currentProgress: 70, health: 'risk', achievement: '历史成果', blocker: '历史风险', nextPlan: '历史计划',
      workIds: [],
    });
  });
});
