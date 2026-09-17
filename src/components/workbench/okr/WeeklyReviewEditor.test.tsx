// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';

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
