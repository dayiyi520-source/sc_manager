// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import { findReviewForPayload } from './useOriginalOkr';
import type { OkrPayload, OkrRecord } from '../../../services/okrRepository';

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

const props = {
  okrs: [],
  work: [],
  busy: false,
  workLoading: false,
  onRefreshWork: vi.fn(),
  onSaveDraft: vi.fn(async () => true),
  onSubmit: vi.fn(async () => true),
  onCancel: vi.fn(),
};

describe('WeeklyReviewEditor approver routing', () => {
  it('shows the direct supervisor as the automatically assigned approver', () => {
    render(<WeeklyReviewEditor {...props} reviewerName="直属主管" />);

    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));

    expect(screen.getByText('直属主管')).toBeInTheDocument();
    expect(screen.getByText('直属上级（系统自动设置）')).toBeInTheDocument();
  });

  it('blocks submission when a non-root employee has no supervisor', () => {
    render(<WeeklyReviewEditor {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));

    expect(screen.getByText(/尚未配置直属上级，无法确定审批人/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '确认提交周报' })).not.toBeInTheDocument();
  });
});

describe('review period identity', () => {
  it('matches an existing review only by owner, type, and exact period', () => {
    const payload: OkrPayload = { title: '本周复盘', reviewType: 'week', startDate: '2026-09-21', endDate: '2026-09-27' };
    const records: OkrRecord[] = [{
      id: 'review-1', kind: 'review', ownerId: 'me', periodKey: '2026-09-21/2026-09-27', status: 'draft', version: 0,
      payload: { ...payload, title: '已有草稿' }
    }];

    expect(findReviewForPayload(records, 'me', '2026-09-21/2026-09-27', payload)?.id).toBe('review-1');
    expect(findReviewForPayload(records, 'other', '2026-09-21/2026-09-27', payload)).toBeUndefined();
    expect(findReviewForPayload(records, 'me', '2026-09-14/2026-09-20', payload)).toBeUndefined();
  });

  it('uses business assistance types and team member search without temporary task creation', () => {
    render(<WeeklyReviewEditor {...props} teamMembers={[{ id: 'member-1', name: '陈雅婷', department: '产品部', jobTitle: '产品经理' }]} />);

    expect(screen.queryByRole('button', { name: '临时任务' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加协助事项' }));

    expect(screen.getByText('请选择协助类型')).toBeInTheDocument();
    expect(screen.getByText('请选择期望协助人')).toBeInTheDocument();
    expect(screen.getByText(/非本月目标任务/)).toBeInTheDocument();
    expect(screen.getByText('暂无非本月目标工作')).toBeInTheDocument();
    expect(screen.getByText(/本月目标复盘/)).toBeInTheDocument();
  });
});
