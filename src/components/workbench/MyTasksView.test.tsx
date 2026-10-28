// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyTasksView } from './MyTasksView';
import { requirementRepository } from '../../services/requirementRepository';
import { openWorkItemDetailLink } from '../../utils/workItemDetailLink';
import { FEEDS_KEY } from '../../services/workbenchFeeds';

vi.mock('../../utils/workItemDetailLink', () => ({ openWorkItemDetailLink: vi.fn() }));
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
  it('分别统计任务、协同、工单和待审批，且四张卡片不响应点击', async () => {
    vi.mocked(requirementRepository.myTasks).mockResolvedValue([
      { id: 'matter-1', taskGroup: 'assist', type: 'assistance', status: '处理中' },
      { id: 'order-1', taskGroup: 'assist', type: 'work_order', status: '待处理' },
    ] as never);

    render(<MyTasksView />);
    await waitFor(() => expect(within(screen.getAllByTestId('metric-card')[1]).getByText('1 项')).toBeInTheDocument());

    const cards = screen.getAllByTestId('metric-card');
    expect(cards).toHaveLength(4);
    expect(cards.map(card => card.querySelector('span')?.textContent)).toEqual(['待办任务','协同事项','工单','待审批']);
    expect(within(cards[2]).getByText('1 项')).toBeInTheDocument();
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

it('首页标题在新标签打开整页任务详情，卡片其他位置不触发', async () => {
  vi.mocked(openWorkItemDetailLink).mockClear();
  vi.mocked(requirementRepository.myTasks).mockResolvedValue([{ id: 't', sourceId: 'source-1', title: '验收待办', status: '处理中', taskGroup: 'mine', type: 'dev', productLineId: 'p', assigneeName: '本人' }] as never);
  render(<MyTasksView/>);
  const title = await screen.findByRole('button', { name: '验收待办' });
  fireEvent.click(title.closest('.rounded-lg')!);
  expect(openWorkItemDetailLink).not.toHaveBeenCalled();
  fireEvent.click(title);
  expect(openWorkItemDetailLink).toHaveBeenCalledWith('source-1', 'dev', 'p');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

it('每个待办分类只展示按记录时间排序的最近十条', async () => {
  const items = Array.from({ length: 12 }, (_, index) => ({ id: `t-${index}`, sourceId: `t-${index}`, title: `待办-${index}`, status: '待处理', taskGroup: 'mine', type: 'dev', time: `2026-10-${String(index + 1).padStart(2, '0')}` }));
  vi.mocked(requirementRepository.myTasks).mockResolvedValue(items as never);
  render(<MyTasksView/>);
  fireEvent.click(await screen.findByRole('button', { name: '任务 (12)' }));
  expect(await screen.findByRole('button', { name: '待办-11' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '待办-0' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '待办-1' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^待办-\d+$/ })).toHaveLength(10);
});

it('replaces approvals with learning only in the agent dashboard while retaining both information cards',async()=>{
 vi.mocked(requirementRepository.myTasks).mockResolvedValue([]);
 const view=render(<MyTasksView/>);
 expect(screen.getByText('审批中心')).toBeInTheDocument();expect(screen.getByRole('region',{name:'我的学习'})).toBeInTheDocument();
 view.unmount();render(<MyTasksView variant="agent"/>);
 expect(screen.queryByText('审批中心')).not.toBeInTheDocument();
 expect(await screen.findByRole('region',{name:'我的学习'})).toBeInTheDocument();
 expect(screen.getByRole('region',{name:'信息广场'})).toBeInTheDocument();
 expect(screen.getByRole('region',{name:'产品动态'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'我的目标进度 40%'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:/^工单/})).not.toBeInTheDocument();
 expect(within(screen.getAllByTestId('metric-card')[1]).getByText('协同事项')).toBeInTheDocument();
 expect([...document.querySelectorAll('section[aria-label]')].map(node=>node.getAttribute('aria-label'))).toEqual(['信息广场','我的学习','产品动态']);
});

it('agent collaboration center shows only the latest ten matters without category tabs', async () => {
  vi.mocked(requirementRepository.myTasks).mockResolvedValue([
    { id: 'task', sourceId: 'task', title: '普通任务', status: '待处理', taskGroup: 'mine', type: 'dev', time: '2026-10-28' },
    { id: 'order', sourceId: 'order', title: '工单记录', status: '待处理', taskGroup: 'assist', type: 'work_order', time: '2026-10-28' },
    ...Array.from({ length: 12 }, (_, index) => ({ id: `matter-${index}`, sourceId: `matter-${index}`, title: `协同-${index}`, status: '处理中', taskGroup: 'assist', type: 'assistance', time: `2026-10-${String(index + 1).padStart(2, '0')}` })),
  ] as never);
  render(<MyTasksView variant="agent"/>);
  expect(await screen.findByText('协同中心')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '全部 (14)' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '任务 (1)' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '协同事项 (12)' })).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: '协同-11' })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /^协同-\d+$/ })).toHaveLength(10);
  expect(screen.queryByRole('button', { name: '协同-0' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '普通任务' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '工单记录' })).not.toBeInTheDocument();
});
