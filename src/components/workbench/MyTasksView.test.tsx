// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyTasksView } from './MyTasksView';
import { requirementRepository } from '../../services/requirementRepository';

const openPageTab = vi.fn();
afterEach(cleanup);
vi.mock('./TodoCenterView', () => ({ TodoCenterView: ({ onBack }: { onBack: () => void }) => <section>内嵌待办中心<button onClick={onBack}>返回我的任务</button></section> }));
vi.mock('./WorkbenchFeedsView', () => ({ WorkbenchFeedsView: ({ onBack }: { onBack: () => void }) => <section>内嵌动态与评价<button onClick={onBack}>返回我的任务</button></section> }));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    openPageTab,
    opportunities: [],
    approvals: [],
    okrs: [],
    currentUser: { id: 'user-1', name: '测试用户' },
  }),
}));
vi.mock('../../services/requirementRepository', () => ({
  requirementRepository: { myTasks: vi.fn() },
}));
vi.mock('../common/UIComponents', () => ({
  StatCard: ({ title, value, unit, subText, onClick }: { title: string; value: number; unit: string; subText?: string; onClick?: () => void }) => (
    <div data-testid="metric-card" onClick={onClick} data-clickable={Boolean(onClick)}>
      <span>{title}</span><span>{value} {unit}</span>{subText && <span>{subText}</span>}
    </div>
  ),
  StatusTag: () => null,
}));

describe('我的工作指标卡片', () => {
  beforeEach(() => { openPageTab.mockClear(); sessionStorage.clear(); });
  it('合并协同事项与工单，且四张卡片不响应点击', async () => {
    vi.mocked(requirementRepository.myTasks).mockResolvedValue([
      { id: 'matter-1', taskGroup: 'assist', type: 'assistance', status: '处理中' },
      { id: 'order-1', taskGroup: 'assist', type: 'work_order', status: '待处理' },
    ] as never);

    render(<MyTasksView />);
    await waitFor(() => expect(within(screen.getAllByTestId('metric-card')[1]).getByText('2 项')).toBeInTheDocument());

    const cards = screen.getAllByTestId('metric-card');
    expect(cards).toHaveLength(4);
    expect(within(cards[1]).queryByText(/工单 \d+ 项/)).not.toBeInTheDocument();
    for (const card of cards) {
      expect(card).toHaveAttribute('data-clickable', 'false');
      fireEvent.click(card);
    }
    expect(openPageTab).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '工单 (1)' }));
    fireEvent.click(screen.getAllByRole('button', { name: '查看更多' })[0]);
    expect(await screen.findByText('内嵌待办中心')).toBeInTheDocument();
    expect(openPageTab).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('shichuang.workbench.todoTab')).toBe('work_order');
    fireEvent.click(screen.getByRole('button', { name: '返回我的任务' }));
    await waitFor(() => expect(screen.queryByText('正在加载我的工作...')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /评价吐槽/ }));
    fireEvent.click(screen.getAllByRole('button', { name: '查看更多' })[1]);
    expect(await screen.findByText('内嵌动态与评价')).toBeInTheDocument();
    expect(openPageTab).not.toHaveBeenCalled();
    await waitFor(() => expect(sessionStorage.getItem('shichuang.workbench.feedTab')).toBe('feedback'));
  });
});
