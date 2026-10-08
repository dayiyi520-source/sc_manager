// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useApp } from '../../context/AppContext';
import { requirementRepository } from '../../services/requirementRepository';
import { RequirementPoolView } from './RequirementPoolView';
import type { RequirementTask } from '../../types';
import { copyToClipboard } from '../../utils/copyToClipboard';

vi.mock('../../utils/copyToClipboard', () => ({ copyToClipboard: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../services/requirementRepository', () => ({
  requirementRepository: { employees: vi.fn(), detail: vi.fn(), reopen: vi.fn(), reassign: vi.fn(), memo: vi.fn(), createWorkItem: vi.fn() },
  normalizeRequirementTask: (task: RequirementTask) => task,
}));
vi.mock('../product/LazyRichTextEditor', () => ({
  LazyRichTextEditor: ({ size, onInput }: { size?: string; onInput: (text: string, html: string) => void }) => (
    <div data-testid="rich-text-editor" data-size={size}>
      <button type="button" onClick={() => onInput('事项详细描述', '<p>事项详细描述</p>')}>填写事项描述</button>
    </div>
  ),
}));

describe('workbench work-order creation layout', () => {
  const addRequirementTask = vi.fn();
  const addToast = vi.fn();

  beforeEach(() => {
    window.history.replaceState(null, '', '/app/wb_work_order');
    vi.clearAllMocks();
    vi.mocked(requirementRepository.employees).mockResolvedValue([{ id: 'employee-1', name: '陈雅婷', department: '产品部' }]);
    vi.mocked(useApp).mockReturnValue({
      requirementTasks: [],
      addRequirementTask,
      setRequirementTasks: vi.fn(),
      productLines: [{ id: 'line-1', name: '协同产品' }],
      customers: [],
      leads: [],
      biddings: [{ id: 'bid-1', projectName: '中标项目甲', customerName: '客户甲', status: '中标', result: '中标' }],
      opportunities: [],
      currentUser: { name: '林志豪', department: '管理部' },
      addToast,
      openPageTab: vi.fn(),
      setRequirementTaskDraft: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);
  });

  const openCustomerRequest = async () => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /产品需求/ }));
  };

  it('opens a shared detail outside the list and copies its business number and standalone link', async () => {
    window.history.replaceState(null, '', '/manager/app/wb_work_order?detailId=shared-item');
    const task = { id: 'shared-item', code: 'WO-20261008-01', title: '分享事项', status: '待处理', ownerName: '林志豪', events: [], workItems: [] };
    vi.mocked(requirementRepository.detail).mockResolvedValue(task as unknown as Awaited<ReturnType<typeof requirementRepository.detail>>);
    render(<RequirementPoolView />);
    fireEvent.click(await screen.findByRole('button', { name: '复制事项编号' }));
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith('WO-20261008-01'));
    fireEvent.click(screen.getByRole('button', { name: '复制详情链接' }));
    await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith(`${window.location.origin}/manager/app/wb_work_order?detailId=shared-item`));
    expect(screen.queryByRole('button', { name: '事项搁置' })).not.toBeInTheDocument();
    fireEvent.click(document.getElementById('btn-drawer-close')!);
    expect(window.location.search).toBe('');
  });

  it('reports clipboard failure without closing the detail', async () => {
    window.history.replaceState(null, '', '/app/wb_work_order?detailId=shared-item');
    vi.mocked(requirementRepository.detail).mockResolvedValue({ id: 'shared-item', code: 'WO-01', title: '分享事项', events: [], workItems: [] } as unknown as Awaited<ReturnType<typeof requirementRepository.detail>>);
    vi.mocked(copyToClipboard).mockRejectedValueOnce(new Error('权限被拒绝'));
    render(<RequirementPoolView />);
    fireEvent.click(await screen.findByRole('button', { name: '复制事项编号' }));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith('error', '复制失败', '权限被拒绝'));
    expect(screen.getByRole('button', { name: '复制详情链接' })).toBeInTheDocument();
  });

  it('reports inaccessible shared details', async () => {
    window.history.replaceState(null, '', '/app/wb_work_order?detailId=missing');
    vi.mocked(requirementRepository.detail).mockRejectedValueOnce(new Error('无权访问'));
    render(<RequirementPoolView />);
    await waitFor(() => expect(addToast).toHaveBeenCalledWith('error', '事项详情加载失败', '无权访问'));
    expect(screen.queryByRole('button', { name: '复制事项编号' })).not.toBeInTheDocument();
  });

  it('reopens with a handler and reason, without a progress field or a second reassignment dialog', async () => {
    window.history.replaceState(null, '', '/app/wb_work_order?detailId=closed-item');
    const task = { id: 'closed-item', code: 'WO-02', title: '已关闭事项', status: '已关闭', creatorName: '林志豪', revision: 4, events: [], workItems: [] };
    vi.mocked(requirementRepository.detail).mockResolvedValue(task as unknown as Awaited<ReturnType<typeof requirementRepository.detail>>);
    vi.mocked(requirementRepository.reopen).mockRejectedValueOnce(new Error('保存失败')).mockResolvedValueOnce({ ...task, status: '处理中', revision: 5, progress: 0 } as unknown as Awaited<ReturnType<typeof requirementRepository.reopen>>);
    render(<RequirementPoolView />);
    fireEvent.click(await screen.findByRole('button', { name: '重新开启' }));
    expect(screen.queryByText('当前进度')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认重开' }));
    expect(requirementRepository.reopen).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByText('请选择处理人').closest('.ant-select')!.querySelector('.ant-select-content')!);
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByPlaceholderText('请输入重新开启原因'), { target: { value: '  补充产品需求  ' } });
    fireEvent.click(screen.getByRole('button', { name: '确认重开' }));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith('error', '事项重开失败', '保存失败'));
    expect(screen.getByPlaceholderText('请输入重新开启原因')).toHaveValue('  补充产品需求  ');
    fireEvent.click(screen.getByRole('button', { name: '确认重开' }));
    await waitFor(() => expect(requirementRepository.reopen).toHaveBeenLastCalledWith('closed-item', { assigneeId: 'employee-1', reason: '补充产品需求', revision: 4 }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '确认重开' })).not.toBeInTheDocument());
    expect(requirementRepository.reassign).not.toHaveBeenCalled();
  });

  it('keeps one submit action in the sticky header and uses the large editor', async () => {
    await openCustomerRequest();

    expect(screen.getByLabelText('事项标题 *')).toHaveClass('ant-input');
    expect(screen.getByLabelText('所属产品').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('负责人 *').compareDocumentPosition(screen.getByLabelText('所属产品')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText('优先级').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('期望完成时间').closest('.ant-picker')).not.toBeNull();
    expect(screen.getByLabelText('诉求类型 *').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('诉求来源 *')).toHaveClass('ant-input');

    const submit = screen.getByRole('button', { name: '发起协助' });
    expect(screen.getAllByRole('button', { name: '发起协助' })).toHaveLength(1);
    expect(submit.closest('.sticky')).not.toBeNull();
    expect(submit.closest('.sticky')).toHaveClass('-top-4', 'lg:-top-6', '-mt-6', 'px-6', 'py-4');
    expect(screen.getByTestId('rich-text-editor')).toHaveAttribute('data-size', 'work-order');
    expect(screen.getByText(/添加文档附件/)).toBeInTheDocument();
  });

  it.each([
    ['交付支持', ['项目阶段 *', '项目类型 *', '交付类型 *']],
    ['其他问题', ['协助类型 *']],
  ])('uses Ant Design inputs for %s fields', async (type, labels) => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(type) }));

    expect(screen.getByLabelText('事项标题 *')).toHaveClass('ant-input');
    labels.forEach((label) => expect(screen.getByLabelText(label).closest('.ant-select')).not.toBeNull());
  });

  it('disables header actions while the work order is being submitted', async () => {
    let complete: ((value: boolean) => void) | undefined;
    addRequirementTask.mockReturnValue(new Promise<boolean>((resolve) => { complete = resolve; }));
    await openCustomerRequest();

    fireEvent.change(screen.getByLabelText('事项标题 *'), { target: { value: '客户反馈事项' } });
    fireEvent.mouseDown(screen.getByLabelText('所属产品'));
    fireEvent.click(await screen.findByText('协同产品', { selector: '.ant-select-item-option-content' }));
    fireEvent.mouseDown(screen.getByLabelText('负责人 *'));
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.mouseDown(screen.getByLabelText('所属项目 *'));
    fireEvent.click(await screen.findByText('中标项目甲', { selector: '.ant-select-item-option-content' }));
    fireEvent.mouseDown(screen.getByLabelText('诉求类型 *'));
    fireEvent.click(await screen.findByText('新功能', { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByLabelText('诉求来源 *'), { target: { value: '客户反馈' } });
    fireEvent.click(screen.getByRole('button', { name: '填写事项描述' }));
    fireEvent.click(screen.getByRole('button', { name: '发起协助' }));

    expect(screen.getByRole('button', { name: '提交中…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();

    await act(async () => complete?.(true));
  });

  it('renders the selected label and clear control for Ant Design selects', async () => {
    await openCustomerRequest();
    const priority = screen.getByLabelText('优先级');
    fireEvent.mouseDown(priority);
    fireEvent.click(await screen.findByText('高', { selector: '.ant-select-item-option-content' }));
    expect(priority.closest('.ant-select')?.querySelector('.ant-select-content')).toHaveTextContent('高');
    expect(priority.closest('.ant-select')?.querySelector('.ant-select-clear')).toBeInTheDocument();
  });

  it('shows selected values in the workflow and reject dialog triggers', async () => {
    const task = { id: 'work-order-1', title: '弹窗下拉回归工单', status: '待处理', priority: '中', ownerName: '林志豪', creatorName: '林志豪', events: [] } as unknown as RequirementTask;
    vi.mocked(requirementRepository.detail).mockResolvedValue({ events: [], workItems: [] } as unknown as Awaited<ReturnType<typeof requirementRepository.detail>>);
    vi.mocked(useApp).mockReturnValue({
      requirementTasks: [task],
      addRequirementTask,
      setRequirementTasks: vi.fn(),
      productLines: [{ id: 'line-1', name: '协同产品' }],
      customers: [],
      biddings: [],
      opportunities: [],
      currentUser: { name: '林志豪', department: '管理部' },
      addToast: vi.fn(),
      openPageTab: vi.fn(),
      setRequirementTaskDraft: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);

    render(<RequirementPoolView />);
    fireEvent.click(screen.getByRole('tab', { name: '事项列表' }));
    fireEvent.click(screen.getByRole('button', { name: '详情' }));
    await waitFor(() => expect(requirementRepository.detail).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '事项流转' }));
    const workflowType = screen.getByLabelText('流转类型 *');
    fireEvent.mouseDown(workflowType);
    fireEvent.click(await screen.findByText('转任务', { selector: '.ant-select-item-option-content' }));
    fireEvent.mouseDown(screen.getByLabelText('任务类型 *'));
    const productOption = await screen.findByText('产品需求', { selector: '.ant-select-item-option-content' });
    expect(Array.from(productOption.closest('.ant-select-dropdown')?.querySelectorAll('.ant-select-item-option-content') || []).map((item) => item.textContent)).toEqual(['产品需求', '缺陷管理', '设计任务', '研发任务']);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(workflowType);
    fireEvent.click(await screen.findByText('转派给他人', { selector: '.ant-select-item-option-content' }));
    expect(workflowType.closest('.ant-select')?.querySelector('.ant-select-content')).toHaveTextContent('转派给他人');
    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    fireEvent.click(screen.getByRole('button', { name: '事项驳回' }));
    const rejectReason = screen.getByLabelText('驳回原因 *');
    fireEvent.mouseDown(rejectReason);
    const firstReason = await screen.findByText('事项内容不明确', { selector: '.ant-select-item-option-content' });
    fireEvent.click(firstReason);
    expect(rejectReason.closest('.ant-select')?.querySelector('.ant-select-content')).toHaveTextContent(firstReason.textContent || '');
  }, 15000);

  it.each([
    ['线上问题', '缺陷类型 *', '系统缺陷', '安全漏洞'],
    ['售前支持', '支持类型 *', '建设方案', '招投标标书协同'],
    ['交付支持', '项目阶段 *', '项目移交', '运维追踪'],
    ['其他问题', '协助类型 *', '方向研讨', '其他'],
  ])('provides the configured %s business options', async (type, label, firstOption, lastOption) => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(type) }));
    fireEvent.mouseDown(screen.getByLabelText(label));
    expect(await screen.findByText(firstOption, { selector: '.ant-select-item-option-content' })).toBeInTheDocument();
    expect(await screen.findByText(lastOption, { selector: '.ant-select-item-option-content' })).toBeInTheDocument();
  });

  it('blocks submission when a visible business parameter is missing', async () => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /线上问题/ }));
    fireEvent.change(screen.getByLabelText('事项标题 *'), { target: { value: '线上异常' } });
    fireEvent.mouseDown(screen.getByLabelText('负责人 *'));
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.click(screen.getByRole('button', { name: '填写事项描述' }));
    fireEvent.click(screen.getByRole('button', { name: '发起协助' }));
    expect(addToast).toHaveBeenCalledWith('warning', '请完成所有必填业务参数');
    expect(addRequirementTask).not.toHaveBeenCalled();
  });

  it('keeps the reassignment dialog and local data when persistence fails', async () => {
    const addToast = vi.fn();
    const setRequirementTasks = vi.fn();
    const task = { id: 'work-order-2', title: '转派失败工单', status: '待处理', priority: '中', ownerName: '林志豪', creatorName: '林志豪', productLineId: 'line-1', productLineName: '协同产品', revision: 2, events: [] } as unknown as RequirementTask;
    vi.mocked(requirementRepository.detail).mockResolvedValue({ ...task, events: [], workItems: [] });
    vi.mocked(requirementRepository.reassign).mockRejectedValue(new Error('工单已变化，请刷新后重试'));
    vi.mocked(useApp).mockReturnValue({
      requirementTasks: [task], addRequirementTask, setRequirementTasks,
      productLines: [{ id: 'line-1', name: '协同产品' }], customers: [], biddings: [], opportunities: [],
      currentUser: { name: '林志豪', department: '管理部' }, addToast, openPageTab: vi.fn(), setRequirementTaskDraft: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);

    render(<RequirementPoolView />);
    fireEvent.click(screen.getByRole('tab', { name: '事项列表' }));
    fireEvent.click(screen.getByRole('button', { name: '详情' }));
    await waitFor(() => expect(requirementRepository.detail).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '事项流转' }));
    fireEvent.mouseDown(screen.getByLabelText('流转类型 *'));
    fireEvent.click(await screen.findByText('转派给他人', { selector: '.ant-select-item-option-content' }));
    fireEvent.mouseDown(screen.getByLabelText('转派给负责人 *'));
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByPlaceholderText('请输入转派原因及交接说明...'), { target: { value: '工作调整' } });
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => expect(addToast).toHaveBeenCalledWith('error', '事项转派失败', '工单已变化，请刷新后重试'));
    expect(screen.getByLabelText('转派给负责人 *')).toBeInTheDocument();
    expect(setRequirementTasks).not.toHaveBeenCalled();
  });
});
