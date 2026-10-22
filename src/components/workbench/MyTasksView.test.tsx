// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyTasksView } from './MyTasksView';
import { requirementRepository } from '../../services/requirementRepository';
import { FEEDS_KEY } from '../../services/workbenchFeeds';

const openPageTab = vi.fn();
afterEach(() => { cleanup(); localStorage.removeItem(FEEDS_KEY); });
vi.mock('./MyGoalProgressMetric', () => ({ MyGoalProgressMetric: () => <button onClick={() => openPageTab('wb_okr_perf')}>我的目标进度 40%</button> }));
vi.mock('./TodoDetail', () => ({ TodoDetail: ({ task, onClose }: { task: { sourceId: string }; onClose: () => void }) => <div role="dialog">{task.sourceId}<button onClick={onClose}>关闭待办详情</button></div> }));
vi.mock('./TodoCenterView', () => ({ TodoCenterView: ({ onBack }: { onBack: () => void }) => <section>内嵌待办中心<button onClick={onBack}>返回我的待办</button></section> }));
vi.mock('./WorkbenchFeedsView', () => ({ WorkbenchFeedsView: ({ onBack }: { onBack: () => void }) => <section>内嵌动态与评价<button onClick={onBack}>返回我的待办</button></section> }));

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
    fireEvent.click(screen.getByRole('button', { name: '返回我的待办' }));
    await waitFor(() => expect(screen.queryByText('正在加载我的工作...')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查看更多信息广场' }));
    expect(await screen.findByText('内嵌动态与评价')).toBeInTheDocument();
    expect(openPageTab).not.toHaveBeenCalled();
    await waitFor(() => expect(sessionStorage.getItem('shichuang.workbench.feedTab')).toBe('square'));
  });
});

it('首页仅点击待办标题打开详情并保持当前工作标签', async () => {
  vi.mocked(requirementRepository.myTasks).mockResolvedValue([{ id: 't', sourceId: 'source-1', title: '验收待办', status: '处理中', taskGroup: 'mine', type: 'dev', assigneeName: '本人' }] as never);
  render(<MyTasksView/>);
  const title = await screen.findByRole('button', { name: '验收待办' });
  fireEvent.click(title.closest('.rounded-lg')!);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(title);
  expect(screen.getByRole('dialog')).toHaveTextContent('source-1');
  expect(openPageTab).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('关闭待办详情'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '验收待办' })).toBeInTheDocument();
});

it('首页动态仅点击标题打开详情', async () => {
  vi.mocked(requirementRepository.myTasks).mockResolvedValue([]);
  localStorage.setItem(FEEDS_KEY, JSON.stringify([{ id: 'feed-1', type: 'dynamic', title: '首页动态标题', content: '首页动态简介', time: '2026-10-20T00:00:00Z', visibility: 'all' }]));
  render(<MyTasksView/>);
  const title = await screen.findByRole('button', { name: '首页动态标题' });
  fireEvent.click(screen.getByText('首页动态简介'));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(title);
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
});

it('replaces approvals with learning only in the agent dashboard while retaining both information cards',async()=>{
 vi.mocked(requirementRepository.myTasks).mockResolvedValue([]);
 const view=render(<MyTasksView/>);
 expect(screen.getByText('审批中心')).toBeInTheDocument();expect(screen.queryByRole('region',{name:'我的学习'})).not.toBeInTheDocument();
 view.unmount();render(<MyTasksView variant="agent"/>);
 expect(screen.queryByText('审批中心')).not.toBeInTheDocument();
 expect(await screen.findByRole('region',{name:'我的学习'})).toBeInTheDocument();
 expect(screen.getByRole('region',{name:'信息广场'})).toBeInTheDocument();
 expect(screen.getByRole('region',{name:'产品动态'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'我的目标进度 40%'}));expect(openPageTab).toHaveBeenCalledWith('wb_okr_perf');
});
