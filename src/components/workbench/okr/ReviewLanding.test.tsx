// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OkrRecord, OkrSettings } from '../../../services/okrRepository';
import { ReviewLanding } from './ReviewLanding';

const settings: OkrSettings = { defaultView: 'list', timeRules: [], templates: [], dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] }, validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true } };
const draft: OkrRecord = { id: 'old-draft', kind: 'review', ownerId: 'me', status: 'draft', version: 1, periodKey: '2026-09-07/2026-09-13', payload: { title: '历史周报草稿', reviewType: 'week', startDate: '2026-09-07', endDate: '2026-09-13', summary: '保留填写内容' } };
const props = { records: [] as OkrRecord[], objectives: [], ownerId: 'me', settings, onRetry: vi.fn(), onOpen: vi.fn(), onViewAll: vi.fn(), onViewReview: vi.fn() };

describe('review landing interactions', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-12T12:00:00')); vi.clearAllMocks(); });
  afterEach(() => vi.useRealTimers());
  it('opens the configured custom week and shows its due notification', () => {
    const cycle = { id: 'custom', month: '2026-10', startDate: '2026-10-10', endDate: '2026-10-16', template: 'byRole' as const, notifyAt: '2026-10-12T09:00', deadline: '2026-10-17T18:00', allowBackfill: false };
    render(<ReviewLanding {...props} settings={{ ...settings, weeklyReviewCycles: [cycle] }}/>);
    expect(screen.getByText('周报待提交')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '写周报' }));
    expect(props.onOpen).toHaveBeenCalledWith('week', { startDate: cycle.startDate, endDate: cycle.endDate }, undefined);
  });
  it('shows at most five recent cards and opens the full list or a detail', () => {
    const records = Array.from({ length: 7 }, (_, i) => ({ ...draft, id: String(i), status: 'submitted', submittedAt: `2026-09-${String(i + 10).padStart(2, '0')}`, payload: { ...draft.payload, title: `已提交复盘${i}` } }));
    render(<ReviewLanding {...props} records={records}/>);
    const recent = screen.getByRole('region', { name: '最近提交的' });
    expect(within(recent).getAllByRole('button', { name: /^查看复盘/ })).toHaveLength(5);
    expect(screen.queryByRole('button', { name: '查看复盘：已提交复盘0' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /查看全部/ }));
    expect(props.onViewAll).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '查看复盘：已提交复盘6' }));
    expect(props.onViewReview).toHaveBeenCalledWith('6');
  });
  it('disables week and month independently using configured dates', () => {
    render(<ReviewLanding {...props} settings={{ ...settings, timeRules: [{ key: 'weeklyReview', label: '周报', startDay: 5, endDay: 7 }, { key: 'monthlyReview', label: '月报', startDay: 1, endDay: 15 }] }}/>);
    expect(screen.getByRole('button', { name: '写周报' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '写月报' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '写月报' }));
    expect(props.onOpen).toHaveBeenCalledWith('month', { startDate: '2026-10-01', endDate: '2026-10-31' }, undefined);
  });
  it.each([['loading', { settingsLoading: true }], ['failure', { settingsError: new Error('断网') }]])('blocks writing on configuration %s', (_, extra) => {
    render(<ReviewLanding {...props} {...extra}/>);
    expect(screen.getByRole('button', { name: '写周报' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '写月报' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /可补交的/ })).toBeDisabled();
    if ('settingsError' in extra) { fireEvent.click(screen.getByRole('button', { name: /重\s*试/ })); expect(props.onRetry).toHaveBeenCalledOnce(); }
  });
  it('opens the overdue drawer and restores the selected draft with its original period', () => {
    render(<ReviewLanding {...props} records={[draft]}/>);
    fireEvent.click(screen.getByRole('button', { name: /可补交的/ }));
    const dialog = screen.getByRole('dialog', { name: '已逾期的总结' });
    expect(within(dialog).getByText('历史周报草稿')).toBeInTheDocument();
    const draftCard = within(dialog).getByText('历史周报草稿').closest('article')!;
    fireEvent.click(within(draftCard).getByRole('button', { name: /填\s*写/ }));
    expect(props.onOpen).toHaveBeenCalledWith('week', { startDate: '2026-09-07', endDate: '2026-09-13' }, draft);
  });
  it('keeps company write actions clickable even outside the configured window or after submission', () => {
    const closed = { ...settings, timeRules: [{ key: 'weeklyReview', label: '周报', startDay: 5, endDay: 7 }, { key: 'monthlyReview', label: '月报', startDay: 30, endDay: 31 }] };
    render(<ReviewLanding {...props} exempt settings={closed}/>);
    expect(screen.getByRole('button', { name: '写周报' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '写月报' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '写周报' }));
    expect(props.onOpen).toHaveBeenCalled();
  });
  it('uses empty feedback when no records are available', () => {
    render(<ReviewLanding {...props}/>);
    expect(screen.getByText('暂无已提交的复盘')).toBeInTheDocument();
    expect(document.querySelector('.ant-empty-image svg')).toBeInTheDocument();
    expect(document.querySelector('.review-banana')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /可补交的/ }));
    expect(screen.getByText('暂无可补交的总结')).toBeInTheDocument();
  });
});
