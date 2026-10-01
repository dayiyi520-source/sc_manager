// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import dayjs from 'dayjs';
import { describe, expect, it, vi } from 'vitest';
import type { OkrPayload } from '../../../services/okrRepository';
import type { OKRItem } from '../../../types';
import { MonthlyReviewEditor } from './MonthlyReviewEditor';

describe('review copy editor persistence', () => {
  it('prefills in memory and only creates a current-period payload after save', () => {
    const onSaveDraft = vi.fn(async (_payload: OkrPayload) => true);
    const onSubmit = vi.fn(async (_payload: OkrPayload) => true);
    const currentMonth = dayjs().format('YYYY-MM');
    const okrs: OKRItem[] = [{
      id: 'current-objective',
      cycle: currentMonth,
      ownerId: 'me',
      ownerName: '当前用户',
      department: '产品部',
      category: 'my',
      objective: '当前目标',
      weight: 100,
      progress: 50,
      deadline: dayjs().endOf('month').format('YYYY-MM-DD'),
      status: 'active',
      keyResults: [{ id: 'current-kr', content: '当前 KR', progress: 50, weight: 100, deadline: dayjs().endOf('month').format('YYYY-MM-DD') }],
    }];
    const initialPayload: OkrPayload = {
      title: '[月报] 历史月份',
      reviewType: 'month',
      reviewMode: 'monthly',
      summary: '复制后的月度总结',
      otherNotes: '复制后的补充',
      nextMonthArrangement: '复制后的下月安排',
      krReviews: [{
        objectiveId: 'old-objective', objectiveTitle: '历史目标', keyResultId: 'old-kr', keyResultTitle: '历史 KR',
        previousProgress: 20, currentProgress: 70, health: 'normal', achievement: '复制后的成果', blocker: '', nextPlan: '继续推进', workIds: [],
      }],
    };

    render(<MonthlyReviewEditor okrs={okrs} records={[]} currentUserId="me" busy={false} initialPayload={initialPayload} onCancel={vi.fn()} onSaveDraft={onSaveDraft} onSubmit={onSubmit} />);

    expect(screen.getByDisplayValue('复制后的月度总结')).toBeInTheDocument();
    expect(screen.getByDisplayValue('复制后的成果')).toBeInTheDocument();
    expect(onSaveDraft).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));

    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(onSaveDraft.mock.calls[0][0]).toMatchObject({
      reviewType: 'month',
      title: `[月报] ${dayjs().format('YYYY年MM月')}复盘`,
      summary: '复制后的月度总结',
      weeklyReviewIds: [],
      monthlyOtherTasks: [],
    });
  });
});
