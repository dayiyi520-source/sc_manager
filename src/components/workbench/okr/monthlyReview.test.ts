import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import type { OkrRecord } from '../../../services/okrRepository';
import { aggregateKrReview, aggregateMonthlyTasks, eligibleWeeklyReviews, monthlyEvidenceTimeline, suggestMonthlySummary } from './monthlyReview';

const review = (id: string, startDate: string, status = 'submitted'): OkrRecord => ({
  id, kind: 'review', ownerId: 'me', periodKey: `${startDate}/${startDate}`, status, version: 1,
  payload: {
    title: id, reviewType: 'week', reviewMode: 'structured', startDate, endDate: startDate,
    summary: id === 'w1' ? '完成首周交付' : '',
    krReviews: [{
      objectiveId: 'o1', objectiveTitle: '目标', keyResultId: 'kr1', keyResultTitle: '结果',
      previousProgress: id === 'w1' ? 10 : 30, currentProgress: id === 'w1' ? 30 : 60,
      health: id === 'w1' ? 'normal' : 'risk', achievement: id === 'w1' ? '完成方案' : '完成上线',
      blocker: id === 'w1' ? '无' : '等待外部确认', nextPlan: '继续推进', workIds: []
    }]
  }
});

describe('monthly review aggregation', () => {
  it('only selects submitted weekly reviews owned by the user in the month', () => {
    const rows = [review('w1', '2026-09-02'), review('draft', '2026-09-09', 'draft'), review('oct', '2026-10-01')];
    expect(eligibleWeeklyReviews(rows, 'me', dayjs('2026-09-01')).map(row => row.id)).toEqual(['w1']);
  });

  it('summarizes the first and last progress without repeating text', () => {
    const rows = [review('w1', '2026-09-02'), review('w2', '2026-09-09')];
    const result = aggregateKrReview('o1', 'kr1', '结果', 60, rows);
    expect(result.previousProgress).toBe(10);
    expect(result.currentProgress).toBe(60);
    expect(result.health).toBe('risk');
    expect(result.achievement).toBe('完成方案\n完成上线');
    expect(result.nextPlan).toBe('继续推进');
    expect(suggestMonthlySummary(rows)).toContain('完成首周交付');
  });

  it('does not treat KR evidence as non-OKR work', () => {
    const row = review('w1', '2026-09-02');
    row.payload.items = [
      { workId: 'kr-work', title: 'KR 任务', status: '已完成', result: '', impact: '' },
      { workId: 'extra-work', title: '额外任务', status: '已完成', result: '已支持', impact: '' }
    ];
    row.payload.extraWork = { workIds: ['extra-work'], description: '', impact: 'none' };
    expect(aggregateMonthlyTasks([row]).map(item => item.workId)).toEqual(['extra-work']);
    expect(aggregateMonthlyTasks([row])[0].status).toBe('已完成');
  });

  it('groups KR evidence and non-OKR work by week', () => {
    const row = review('w1', '2026-09-02');
    row.payload.krReviews![0].workIds = ['kr-work'];
    row.payload.items = [
      { workId: 'kr-work', title: '稳定性改造', status: '已完成', workType: 'task', result: '故障率下降', impact: '' },
      { workId: 'extra-work', title: '客户支持', status: '已完成', workType: 'ticket', result: '', impact: '占用研发时间' }
    ];
    row.payload.extraWork = { workIds: ['extra-work'], description: '临时评审', impact: 'support' };
    const timeline = monthlyEvidenceTimeline([row], 'kr1');
    expect(timeline[0].entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '稳定性改造', progressChange: '10% -> 30%', summary: '故障率下降', type: '任务' }),
      expect.objectContaining({ title: '客户支持', progressChange: '-', summary: '占用研发时间', type: '工单' }),
      expect.objectContaining({ title: '临时评审', type: '非 OKR' })
    ]));
  });
});
