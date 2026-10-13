// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { OKRItem } from '../../../types';
import type { OkrPayload, OkrWork } from '../../../services/okrRepository';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import { MonthlyReviewEditor } from './MonthlyReviewEditor';
import { WorkEvidencePicker } from './WorkEvidencePicker';
class Observer { observe() {} unobserve() {} disconnect() {} }
globalThis.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;
const objective: OKRItem = { id: 'o', ownerId: 'me', ownerName: '本人', cycle: '2026-10', department: '软件研发部', category: 'my', objective: '目标', weight: 100, progress: 30, deadline: '', status: 'active', keyResults: [{ id: 'a', content: '动作', progress: 30, weight: 100, deadline: '', businessObject: '产品甲', version: 'V1' }, { id: 'done', content: '已完成动作', progress: 100, weight: 0, deadline: '' }] };
const viewer = { id: 'me', name: '本人', department: '软件研发部' };
const props = { okrs: [objective], work: [], viewer, busy: false, workLoading: false, onRefreshWork: vi.fn(), onCancel: vi.fn(), onSaveDraft: vi.fn(async (_value: OkrPayload) => true), onSubmit: vi.fn(async () => true), directSubmit: true };
const work = (id: string, kind = 'task'): OkrWork => ({ id, sourceId: id, kind, title: id, status: '处理中', ownerName: '本人', createdAt: '2026-10-01', updatedAt: '2026-10-13', dueDate: '', actualHours: 0, estimatedHours: 0, sourceWorkOrderIds: '[]', linkVersion: 0, productLineName: '产品甲', versionName: 'V1' });
describe('review writing adjustments', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-14T12:00:00')); vi.clearAllMocks(); });
  afterEach(() => vi.useRealTimers());
  it('keeps completed A visible and collapsed, removes narratives, and saves the separate plan', () => {
    render(<WeeklyReviewEditor {...props}/>);
    expect(screen.queryByRole('button', { name: '添加目标' })).not.toBeInTheDocument();
    expect(screen.getByText('A2：已完成动作')).toBeInTheDocument();
    expect(screen.queryByText(/本期成果/)).not.toBeInTheDocument();
    expect(screen.queryByText(/下一步计划/)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '下周计划' })).toBeInTheDocument();
    expect(document.querySelector('.okr-review-a-list')).toHaveClass('grid', 'gap-4', 'p-4');
    expect(document.querySelector('.okr-review-objective-body')).toBeInTheDocument();
    const planHeading = screen.getByText('3. 下周计划').parentElement!;
    expect(planHeading.querySelector('span[aria-hidden="true"]')).toHaveClass('bg-[var(--primary)]', 'h-4');
    fireEvent.change(screen.getByRole('textbox', { name: '下周计划' }), { target: { value: '完成下周验收' } });
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(props.onSaveDraft).toHaveBeenCalledWith(expect.objectContaining({ nextWeekPlan: '完成下周验收', krReviews: expect.arrayContaining([expect.objectContaining({ keyResultId: 'done' })]) }));
    expect(screen.getByText('4. 需要协助事项')).toBeInTheDocument();
  });
  it('puts the risk input before work evidence and opens only the personal task evidence tab', () => {
    const initialPayload: OkrPayload = { title: '草稿', reviewType: 'week', startDate: '2026-10-12', endDate: '2026-10-18', krReviews: [{ objectiveId: 'o', objectiveTitle: '目标', keyResultId: 'a', keyResultTitle: '动作', previousProgress: 30, currentProgress: 40, health: 'risk', blocker: '缺少资源', achievement: '历史成果', nextPlan: '历史计划', workIds: [] }] };
    render(<WeeklyReviewEditor {...props} initialPayload={initialPayload}/>);
    const risk = screen.getByText('风险原因及所需支持');
    const evidence = screen.getByText('本期关联工作证据');
    expect(risk.compareDocumentPosition(evidence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: '关联工作证据' })[0]);
    const dialog = screen.getByRole('dialog', { name: '关联工作证据' });
    expect(within(dialog).queryByRole('tab')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('tab', { name: /^协同事项/ })).not.toBeInTheDocument();
  });
  it('does not require removed per-A narratives for submission', () => {
    render(<WeeklyReviewEditor {...props}/>);
    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));
    expect(screen.getByRole('dialog', { name: '确认提交周报' })).toBeInTheDocument();
  });
  it('keeps existing task selection and excludes collaboration candidates', () => {
    const onConfirm = vi.fn();
    render(<WorkEvidencePicker work={[work('task'), work('collaboration', 'collaboration')]} viewer={viewer} product="产品甲" startDate="2026-10-12" endDate="2026-10-18" selectedIds={['task']} onConfirm={onConfirm} onCancel={vi.fn()}/>);
    expect(screen.queryByText('collaboration · collaboration')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认关联' }));
    expect(onConfirm).toHaveBeenCalledWith(['task']);
  });
  it('monthly A uses evidence instead of repeated result and plan inputs', () => {
    render(<MonthlyReviewEditor okrs={[objective]} records={[]} currentUserId="me" busy={false} onSaveDraft={props.onSaveDraft} onSubmit={props.onSubmit} onCancel={props.onCancel}/>);
    expect(screen.queryByPlaceholderText('归纳本月结果，不要逐周重复罗列')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('A1：动作'));
    expect(screen.getAllByRole('button', { name: '关联工作证据' })).toHaveLength(2);
  });
});

describe('task evidence counts', () => {
  it('counts only eligible owned tasks and updates search', () => {
    const others = { ...work('foreign'), assigneeId: 'other' };
    render(<WorkEvidencePicker work={[work('task'), work('task'), work('collaboration', 'collaboration'), others, { ...work('waiting'), status: '待处理', createdAt: '2026-10-12' }]} viewer={viewer} startDate="2026-10-12" endDate="2026-10-18" selectedIds={[]} onConfirm={vi.fn()} onCancel={vi.fn()}/>);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByText('task · task')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /^协同事项/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('搜索任务名称或编号'), { target: { value: 'collaboration' } });
    expect(screen.queryByText('task · task')).not.toBeInTheDocument();
  });
  it('does not misrepresent failed or loading data as zero', () => {
    render(<WorkEvidencePicker work={[]} loading error={new Error('断网')} startDate="2026-10-12" endDate="2026-10-18" selectedIds={[]} onConfirm={vi.fn()} onCancel={vi.fn()}/>);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认关联' })).toBeDisabled();
  });
});
