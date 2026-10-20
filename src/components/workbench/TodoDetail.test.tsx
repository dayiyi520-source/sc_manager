// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TodoDetail, type TodoRecord } from './TodoDetail';
import { requirementRepository } from '../../services/requirementRepository';
import { productRepository } from '../../services/productRepository';
vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { detail: vi.fn() } }));
vi.mock('../../services/productRepository', () => ({ productRepository: { businessTask: vi.fn(), workItemDetail: vi.fn() } }));
vi.mock('../product/RequirementTasksView', () => ({ RequirementTasksView: ({ initialDetail, onDetailClose }: { initialDetail: { title: string }; onDetailClose: () => void }) => <div role="dialog">任务：{initialDetail.title}<button onClick={onDetailClose}>关闭任务</button></div> }));
vi.mock('./RequirementPoolView', () => ({ RequirementPoolView: ({ initialDetail, onDetailClose }: { initialDetail: { title: string }; onDetailClose: () => void }) => <div role="dialog">事项：{initialDetail.title}<button onClick={onDetailClose}>关闭事项</button></div> }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const task = { sourceId: 'source', title: '首页标题', type: 'dev', taskGroup: 'mine', productLineId: 'product' } as TodoRecord;
describe('待办原地详情', () => {
  it('详情数据准备好前不显示骨架抽屉', async () => {
    let resolveDetail!: (value: { title: string }) => void;
    vi.mocked(productRepository.workItemDetail).mockReturnValue(new Promise(resolve => { resolveDetail = resolve; }) as never);
    render(<TodoDetail task={task} onClose={vi.fn()}/>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('.ant-skeleton')).toBeNull();
    await act(async () => resolveDetail({ title: '实际任务' }));
    expect(await screen.findByText('任务：实际任务')).toBeInTheDocument();
  });
  it('按来源产品读取任务，交给原任务详情并保留关闭回调', async () => {
    vi.mocked(productRepository.workItemDetail).mockResolvedValue({ title: '实际任务', status: { name: '处理中' } } as never);
    const close = vi.fn(); render(<TodoDetail task={task} onClose={close}/>);
    expect(await screen.findByText('任务：实际任务')).toBeInTheDocument();
    expect(productRepository.workItemDetail).toHaveBeenCalledWith('product', 'source');
    expect(requirementRepository.detail).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('关闭任务')); expect(close).toHaveBeenCalledOnce();
  });
  it('协同事项读取原事项详情，失败可重试', async () => {
    vi.mocked(requirementRepository.detail).mockRejectedValueOnce(new Error('读取失败')).mockResolvedValueOnce({ title: '实际事项' } as never);
    render(<TodoDetail task={{ ...task, taskGroup: 'assist', type: 'assistance' }} onClose={vi.fn()}/>);
    expect(await screen.findByText('读取失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(await screen.findByText('事项：实际事项')).toBeInTheDocument();
    expect(requirementRepository.detail).toHaveBeenCalledWith('source');
    expect(productRepository.workItemDetail).not.toHaveBeenCalled();
  });
  it('售前任务走原业务详情', async () => {
    vi.mocked(productRepository.businessTask).mockResolvedValue({ title: '售前任务' } as never);
    render(<TodoDetail task={{ ...task, type: 'presales' }} onClose={vi.fn()}/>);
    expect(await screen.findByText('任务：售前任务')).toBeInTheDocument();
    expect(productRepository.businessTask).toHaveBeenCalledWith('presales', 'source');
  });
});
