// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OkrPayload } from '../../../services/okrRepository';
import type { OKRItem } from '../../../types';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import { MonthlyReviewEditor } from './MonthlyReviewEditor';

class Observer { observe() {} disconnect() {} unobserve() {} }
globalThis.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;
const period = { startDate: '2026-10-12', endDate: '2026-10-18' };
const target: OKRItem = { id: 'o', cycle: '2026-10', ownerId: 'me', ownerName: '本人', department: '产品', category: 'my', objective: '实时目标', weight: 100, progress: 20, deadline: '', status: 'active', keyResults: [{ id: 'a', content: '实时本人 A', progress: 20, weight: 100, deadline: '' }] };
const props = { work: [], busy: false, workLoading: false, onRefreshWork: vi.fn(), onCancel: vi.fn(), onSubmit: vi.fn(async () => true), directSubmit: true };

describe('live review editors', () => {
  it('refreshes names and baseline without losing edited plans, risk notes, or progress', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const initialPayload: OkrPayload = { title: '保存的旧名称', ...period, reviewType: 'week', krReviews: [{ objectiveId: 'o', objectiveTitle: '旧目标', keyResultId: 'a', keyResultTitle: '旧动作', previousProgress: 20, currentProgress: 60, health: 'risk', achievement: '', blocker: '需要资源', nextPlan: '', workIds: [] }] };
    const { rerender } = render(<WeeklyReviewEditor {...props} okrs={[target]} periodOverride={period} initialPayload={initialPayload} onSaveDraft={save}/>);
    expect(screen.getByText('我的计划：实时本人 A')).toBeInTheDocument();
    expect(screen.queryByText('我的计划：旧动作')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '下周计划' }), { target: { value: '保留已填写计划' } });
    rerender(<WeeklyReviewEditor {...props} okrs={[{ ...target, objective: '更新后的目标', keyResults: [{ ...target.keyResults[0], content: '更新后的 A', progress: 30 }] }]} periodOverride={period} initialPayload={initialPayload} onSaveDraft={save}/>);
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ nextWeekPlan: '保留已填写计划', krReviews: [expect.objectContaining({ objectiveTitle: '更新后的目标', keyResultTitle: '更新后的 A', previousProgress: 0, currentProgress: 60, blocker: '需要资源' })] }));
  });
  it('adds newly loaded A without treating shared progress as a personal submission', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const { rerender } = render(<WeeklyReviewEditor {...props} okrs={[]} periodOverride={period} onSaveDraft={save}/>);
    rerender(<WeeklyReviewEditor {...props} okrs={[target]} periodOverride={period} onSaveDraft={save}/>);
    rerender(<WeeklyReviewEditor {...props} okrs={[{ ...target, keyResults: [{ ...target.keyResults[0], progress: 50 }] }]} periodOverride={period} onSaveDraft={save}/>);
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ krReviews: [expect.objectContaining({ currentProgress: 0, previousProgress: 0 })] }));
  });
  it('keeps both months of a cross-month week and excludes other months', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const previous = { ...target, id: 'previous', cycle: '2026-09', keyResults: [{ ...target.keyResults[0], id: 'previous-a' }] };
    render(<WeeklyReviewEditor {...props} okrs={[previous, target, { ...target, id: 'future', cycle: '2026-11' }]} periodOverride={{ startDate: '2026-09-28', endDate: '2026-10-04' }} onSaveDraft={save}/>);
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0].krReviews?.map(row => row.keyResultId)).toEqual(['previous-a', 'a']);
  });
  it('preserves lost targets until the author explicitly removes them and can continue', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const { rerender } = render(<WeeklyReviewEditor {...props} okrs={[target]} periodOverride={period} onSaveDraft={save}/>);
    fireEvent.change(screen.getByRole('textbox', { name: '下周计划' }), { target: { value: '保留计划' } });
    rerender(<WeeklyReviewEditor {...props} okrs={[]} periodOverride={period} onSaveDraft={save}/>);
    expect(screen.getByText('月度目标已变化，请确认失效内容')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /存草稿/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '移除失效内容' }));
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ nextWeekPlan: '保留计划', krReviews: [] }));
  });
  it('blocks an already-open submission confirmation if its monthly target disappears', () => {
    const submit = vi.fn(async () => true);
    const save = vi.fn(async () => true);
    const { rerender } = render(<WeeklyReviewEditor {...props} okrs={[target]} periodOverride={period} onSaveDraft={save} onSubmit={submit}/>);
    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));
    expect(screen.getByRole('dialog', { name: '确认提交周报' })).toBeInTheDocument();
    rerender(<WeeklyReviewEditor {...props} okrs={[]} periodOverride={period} onSaveDraft={save} onSubmit={submit}/>);
    expect(screen.getByRole('button', { name: '确认提交' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '确认提交' }));
    expect(submit).not.toHaveBeenCalled();
  });
  it('refreshes monthly A with the same target identity and preserves the summary', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const monthProps = { currentUserId: 'me', records: [], busy: false, onCancel: vi.fn(), onSubmit: vi.fn(async () => true), onSaveDraft: save, periodOverride: { startDate: '2026-10-01', endDate: '2026-10-31' } };
    const initialPayload = { title: '历史月报', summary: '保留月度总结' };
    const { rerender } = render(<MonthlyReviewEditor {...monthProps} initialPayload={initialPayload} okrs={[target]}/>);
    expect(screen.getByText('待填写')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('总结本月核心成果、业务价值、关键变化与主要问题')).not.toBeInTheDocument();
    rerender(<MonthlyReviewEditor {...monthProps} initialPayload={initialPayload} okrs={[{ ...target, keyResults: [{ ...target.keyResults[0], content: '实时新名称', progress: 55 }] }]} recordStatus="returned"/>);
    expect(screen.getByText('已退回')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ summary: '保留月度总结', krReviews: [expect.objectContaining({ keyResultTitle: '实时新名称', currentProgress: 0 })] }));
  });
});
