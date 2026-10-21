// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TodoCenterView } from './TodoCenterView';
import { requirementRepository } from '../../services/requirementRepository';
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ currentUser: { id: 'me' } }) }));
vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { myTasks: vi.fn(), updateWorkItemProgress: vi.fn() } }));
vi.mock('./okr/OkrProvider', () => ({ OkrProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./TodoDetail', () => ({ TodoDetail: ({ task, onClose }: { task: { sourceId: string }; onClose: () => void }) => <div role="dialog">{task.sourceId}<button onClick={onClose}>关闭详情</button></div> }));
afterEach(cleanup);
describe('完整待办中心', () => {
  it('读取本人全部事项，分类、状态和搜索联动，保留来源详情链接', async () => {
    sessionStorage.clear();
    vi.mocked(requirementRepository.myTasks).mockResolvedValue([
      { id: 't', sourceId: 'task-1', title: '已完成研发', status: '已完成', type: 'dev', taskGroup: 'mine', targetPage: 'prod_rd_tasks', assigneeId: 'me', assigneeName: '本人' },
      { id: 'a', sourceId: 'matter-1', title: '处理中协同', status: '处理中', type: 'assistance', taskGroup: 'assist', targetPage: 'wb_work_order', assigneeId: 'me', assigneeName: '本人' },
    ]);
    render(<TodoCenterView onBack={vi.fn()}/>);
    expect(await screen.findByRole('button', { name: '已完成研发' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '已完成研发' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('task-1');
    fireEvent.click(screen.getByText('关闭详情'));
    expect(requirementRepository.myTasks).toHaveBeenCalledWith('me', true);
    await waitFor(() => expect(screen.getByRole('button', { name: '修改进度：已完成研发' })).toBeDisabled());
    fireEvent.click(screen.getByRole('tab', { name: '协同事项 (1)' }));
    expect(screen.queryByRole('button', { name: '已完成研发' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '处理中协同' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('搜索待办'), { target: { value: '没有匹配' } });
    expect(screen.getByText('暂无工作事项')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('搜索待办'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('tab', { name: '全部 (2)' }));
    fireEvent.mouseDown(screen.getByLabelText('待办类型'));
    fireEvent.click(await screen.findByText('研发任务', { selector: '.ant-select-item-option-content' }));
    expect(screen.queryByLabelText('待办负责人')).not.toBeInTheDocument();
    expect(screen.getByLabelText('搜索待办').closest('.todo-center-search')).toBeInTheDocument();
    expect(screen.getByLabelText('待办状态')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '已完成研发' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '处理中协同' })).not.toBeInTheDocument();
  });
  it('失败可重试', async () => {
    vi.mocked(requirementRepository.myTasks).mockRejectedValueOnce(new Error('读取失败')).mockResolvedValueOnce([]);
    render(<TodoCenterView onBack={vi.fn()}/>);
    expect(await screen.findByText('读取失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重 试' }));
    expect(await screen.findByText('暂无工作事项')).toBeInTheDocument();
  });
  it('截止日期后展示可编辑进度，失败保留输入并可重试保存，返回入口可用', async () => {
    sessionStorage.clear();
    vi.mocked(requirementRepository.myTasks).mockResolvedValue([{ id: 't', sourceId: 'multi', title: '跨天研发', type: 'dev', status: '处理中', taskGroup: 'mine', targetPage: 'prod_rd_tasks', assigneeName: '本人', revision: 3, progress: 20 }]);
    vi.mocked(requirementRepository.updateWorkItemProgress).mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce({ id: 'multi', progress: 55, revision: 4 });
    const back = vi.fn(); render(<TodoCenterView onBack={back}/>);
    await screen.findByRole('button', { name: '修改进度：跨天研发' });
    expect(screen.getAllByRole('columnheader').map(row => row.textContent).slice(-2)).toEqual(['截止日期', '进度']);
    expect(screen.queryByRole('heading', { name: '待办中心' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: '修改进度：跨天研发' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '修改进度：跨天研发' })); fireEvent.change(await screen.findByLabelText('当前进度'), { target: { value: '55' } });
    await waitFor(() => expect(screen.getByRole('button', { name: /保\s*存/ })).not.toHaveClass('ant-btn-loading'));
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    expect(await screen.findByText('保存失败')).toBeInTheDocument(); expect(screen.getByLabelText('当前进度')).toHaveValue('55');
    await waitFor(() => expect(screen.getByRole('button', { name: /保\s*存/ })).not.toHaveClass('ant-btn-loading'));
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await screen.findByText('55%');
    expect(requirementRepository.updateWorkItemProgress).toHaveBeenLastCalledWith('multi', 55, 3);
    fireEvent.click(screen.getByRole('button', { name: '返回我的待办' })); expect(back).toHaveBeenCalledOnce();
  });

});
