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

  it('uses the collaboration type menu and the five weekly sections', () => {
    render(<WeeklyReviewEditor {...props} />);
    expect(screen.queryByRole('button', { name: '临时任务' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    for (const name of ['产品需求', '线上问题', '售前支持', '交付支持', '其他协同']) expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    expect(screen.getByText('2. 插播任务')).toBeInTheDocument();
    expect(screen.getByText('暂无插播任务')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建知识沉淀' })).toBeInTheDocument();
  });
});

 describe('weekly review creation status', () => {
  it('starts pending before the first draft save', () => {
    render(<WeeklyReviewEditor {...props} />);
    expect(screen.getByText('待填写')).toBeInTheDocument();
    expect(screen.queryByText('草稿状态')).not.toBeInTheDocument();
  });
  it.each([['draft', '草稿'], ['returned', '已退回']])('restores persisted %s state', (recordStatus, label) => {
    render(<WeeklyReviewEditor {...props} recordStatus={recordStatus} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
