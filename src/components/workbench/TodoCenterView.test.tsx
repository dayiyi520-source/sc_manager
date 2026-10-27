// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { openWorkItemDetailLink } from '../../utils/workItemDetailLink';
import { TodoCenterView } from './TodoCenterView';
import { requirementRepository } from '../../services/requirementRepository';
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ currentUser: { id: 'me' } }) }));
vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { myTasks: vi.fn(), updateWorkItemProgress: vi.fn() } }));
vi.mock('./okr/OkrProvider', () => ({ OkrProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./TodoDetail', () => ({ TodoDetail: ({ task, onClose }: { task: { sourceId: string }; onClose: () => void }) => <div role="dialog">{task.sourceId}<button onClick={onClose}>关闭详情</button></div> }));
vi.mock('../../utils/workItemDetailLink', () => ({ openWorkItemDetailLink: vi.fn() }));
afterEach(cleanup);
describe('完整待办中心', () => {
  it('全部仅按标题搜索，其他分类保留类型与状态筛选，并可打开来源详情', async () => {
    sessionStorage.clear();
    vi.mocked(requirementRepository.myTasks).mockResolvedValue([
      { id: 't', sourceId: 'task-1', title: '已完成研发', status: '已完成', type: 'dev', taskGroup: 'mine', targetPage: 'prod_rd_tasks', assigneeId: 'me', assigneeName: '本人' },
      { id: 'a', sourceId: 'matter-1', title: '处理中协同', status: '处理中', type: 'assistance', taskGroup: 'assist', targetPage: 'wb_work_order', assigneeId: 'me', assigneeName: '本人' },
    ]);
    render(<TodoCenterView onBack={vi.fn()}/>);
    expect(await screen.findByRole('button', { name: '已完成研发' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '已完成研发' }));
    expect(openWorkItemDetailLink).toHaveBeenCalledWith('task-1','dev',undefined);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader',{name:'进度'})).not.toBeInTheDocument();
    expect(requirementRepository.myTasks).toHaveBeenCalledWith('me', true);
    fireEvent.click(screen.getByRole('tab', { name: '协同事项 (1)' }));
    expect(screen.queryByRole('button', { name: '已完成研发' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '处理中协同' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('搜索待办'), { target: { value: '没有匹配' } });
    expect(screen.getByText('暂无工作事项')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('搜索待办'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('tab', { name: '全部 (2)' }));
    expect(screen.queryByLabelText('待办类型')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('待办状态')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '已完成研发' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '处理中协同' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '任务 (1)' }));
    fireEvent.mouseDown(screen.getByLabelText('待办类型'));
    fireEvent.click(await screen.findByText('研发任务', { selector: '.ant-select-item-option-content' }));
    expect(screen.queryByLabelText('待办负责人')).not.toBeInTheDocument();
    expect(screen.getByLabelText('搜索待办').closest('.todo-center-search')).toBeInTheDocument();
    expect(screen.getByLabelText('待办状态')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '已完成研发' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '处理中协同' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '全部 (2)' }));
    expect(screen.getByRole('button', { name: '处理中协同' })).toBeInTheDocument();
  });
  it('失败可重试', async () => {
    vi.mocked(requirementRepository.myTasks).mockRejectedValueOnce(new Error('读取失败')).mockResolvedValueOnce([]);
    render(<TodoCenterView onBack={vi.fn()}/>);
    expect(await screen.findByText('读取失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重 试' }));
    expect(await screen.findByText('暂无工作事项')).toBeInTheDocument();
  });
  it('事项标题打开已有整页详情且不提供进度入口', async () => {
    sessionStorage.clear();
    vi.mocked(requirementRepository.myTasks).mockResolvedValue([{ id:'a',sourceId:'matter',title:'协同验收',type:'assistance',taskGroup:'assist',status:'处理中',progress:20 }] as never);
    render(<TodoCenterView onBack={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button',{name:'协同验收'}));
    expect(openWorkItemDetailLink).toHaveBeenCalledWith('matter','WORK_ORDER',undefined);
    expect(screen.queryByRole('columnheader',{name:'进度'})).not.toBeInTheDocument();
    expect(screen.queryByText('20%')).not.toBeInTheDocument();
  });
});
