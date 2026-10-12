// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OkrPayload } from '../../../services/okrRepository';
import { MonthlyReviewEditor } from './MonthlyReviewEditor';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';

class Observer { observe() {} disconnect() {} unobserve() {} }
globalThis.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;

describe('historical review editors', () => {
  it('keeps the selected historical week and restores draft work evidence', () => {
    const onSaveDraft = vi.fn(async (_payload: OkrPayload) => true);
    render(<WeeklyReviewEditor okrs={[]} work={[]} busy={false} workLoading={false} directSubmit onRefreshWork={vi.fn()} onCancel={vi.fn()} onSubmit={vi.fn(async () => true)} onSaveDraft={onSaveDraft} periodOverride={{ startDate: '2026-09-07', endDate: '2026-09-13' }} initialPayload={{ title: '草稿', reviewType: 'week', startDate: '2026-09-07', endDate: '2026-09-13', items: [{ workId: 'task-1', title: '旧任务', status: '已完成', result: '完成证据', impact: '' }], extraWork: { workIds: ['task-1'], description: '原始内容', impact: 'none', notes: { 'task-1': '完成证据' } } }}/>);
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(onSaveDraft.mock.calls[0][0]).toMatchObject({ reviewType: 'week', startDate: '2026-09-07', endDate: '2026-09-13', extraWork: { workIds: ['task-1'], description: '原始内容' }, items: [expect.objectContaining({ workId: 'task-1', result: '完成证据' })] });
  });
  it('keeps a selected historical month and prefilled draft summary', () => {
    const onSaveDraft = vi.fn(async (_payload: OkrPayload) => true);
    render(<MonthlyReviewEditor okrs={[]} records={[]} currentUserId="me" busy={false} onCancel={vi.fn()} onSubmit={vi.fn(async () => true)} onSaveDraft={onSaveDraft} periodOverride={{ startDate: '2026-09-01', endDate: '2026-09-30' }} initialPayload={{ title: '草稿', reviewType: 'month', startDate: '2026-09-01', endDate: '2026-09-30', summary: '保留月报内容' }}/>);
    expect(screen.getByDisplayValue('保留月报内容')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(onSaveDraft.mock.calls[0][0]).toMatchObject({ title: '[月报] 2026年09月复盘', reviewType: 'month', startDate: '2026-09-01', endDate: '2026-09-30', summary: '保留月报内容' });
  });
});
