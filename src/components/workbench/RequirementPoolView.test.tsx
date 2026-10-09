// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useApp } from '../../context/AppContext';
import { requirementRepository } from '../../services/requirementRepository';
import { RequirementPoolView, isWorkOrderInScope } from './RequirementPoolView';
import type { RequirementTask } from '../../types';
import { copyToClipboard } from '../../utils/copyToClipboard';

vi.mock('../../utils/copyToClipboard', () => ({ copyToClipboard: vi.fn().mockResolvedValue(undefined) }));

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../product/RequirementTasksView', () => ({
  RequirementTasksView: ({ taskKind, itemLabel, creationContext }: { taskKind: string; itemLabel: string; creationContext: { sourceWorkOrder?: RequirementTask; onClose?: () => void; onCreated?: () => void } }) => <section aria-label={`新建${itemLabel}`} data-testid="embedded-task-create" data-kind={taskKind} data-source={creationContext.sourceWorkOrder?.id}><h2>新建{itemLabel}</h2><button onClick={creationContext.onClose}>取消任务新建</button><button onClick={() => { creationContext.onCreated?.(); creationContext.onClose?.(); }}>模拟任务保存</button></section>,
}));
vi.mock('../../services/requirementRepository', () => ({
  requirementRepository: { allForScope: vi.fn(), transferredBy: vi.fn(), employees: vi.fn(), detail: vi.fn(), receive: vi.fn(), reopen: vi.fn(), reassign: vi.fn(), memo: vi.fn(), createWorkItem: vi.fn() },
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
  it('includes unrelated matters in company scope', () => {
    expect(isWorkOrderInScope({ creatorName: '陈雅婷', ownerName: '陈雅婷' } as RequirementTask, 'all', { name: '林志豪' })).toBe(true);
  });
  const addRequirementTask = vi.fn();
  const addToast = vi.fn();

  beforeEach(() => {
    window.history.replaceState(null, '', '/app/wb_work_order');
    vi.clearAllMocks();
    vi.mocked(requirementRepository.allForScope).mockImplementation(async () => useApp().requirementTasks);
    vi.mocked(requirementRepository.transferredBy).mockResolvedValue(new Set());
    vi.mocked(requirementRepository.employees).mockResolvedValue([{ id: 'employee-1', name: '陈雅婷', department: '产品部' }]);
    vi.mocked(useApp).mockReturnValue({
      requirementTasks: [],
      addRequirementTask,
      setRequirementTasks: vi.fn(),
      productLines: [{ id: 'line-1', name: '协同产品' }],
      customers: [],
      leads: [],
      biddings: [{ id: 'bid-1', projectName: '中标项目甲', customerName: '客户甲', status: '中标', result: '中标', opportunityId: 'opp-1' }, { id: 'bid-2', projectName: '无产品项目', customerName: '客户乙', status: '中标', result: '中标' }],
      opportunities: [{ id: 'opp-1', name: '商机甲', relatedProduct: '协同产品' }],
      currentUser: { name: '林志豪', department: '管理部' },
      addToast,
      openPageTab: vi.fn(),
      setRequirementTaskDraft: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);
  });

  const openType = async (type: string) => {
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: type }));
  };

  it('defaults to created scope and only shows the department selector in company scope', async () => {
    const app = useApp();
    vi.mocked(useApp).mockReturnValue({ ...app, requirementTasks: [
      { id: 'mine', title: '本人创建事项', creatorName: '林志豪', ownerName: '陈雅婷' },
      { id: 'other', title: '全公司其他事项', creatorName: '陈雅婷', ownerName: '陈雅婷' },
    ] } as unknown as ReturnType<typeof useApp>);
    render(<RequirementPoolView />);
    await waitFor(() => expect(screen.getByRole('button', { name: '我创建的 (1)' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByText('全公司其他事项')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('所属部门')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '全公司的 (2)' }));
    expect(screen.getByText('全公司其他事项')).toBeInTheDocument();
    expect(screen.getByLabelText('所属部门')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '我部门的 (0)' }));
    expect(screen.queryByLabelText('所属部门')).not.toBeInTheDocument();
  });

  const openCustomerRequest = async () => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    await openType('产品需求');
  };

  const renderDetail = async (overrides: Partial<RequirementTask> = {}) => {
    const task = { id: 'receive-1', title: '接收协同事项', status: '待处理', ownerName: '林志豪', creatorName: '林志豪', workOrderType: '客户诉求', productLineName: '协同产品', specialFields: { projectName: '项目甲', requestSource: '客户访谈' }, ...overrides } as RequirementTask;
    window.history.replaceState(null, '', '/app/wb_work_order?detailId=receive-1');
    vi.mocked(requirementRepository.detail).mockResolvedValue({ ...task, events: [], workItems: [] });
    render(<RequirementPoolView />);
    await screen.findByRole('heading', { name: task.title });
    return task;
  };

  it('only enables tasks after reception is persisted and blocks duplicate reception', async () => {
    const task = await renderDetail();
    let resolve!: (value: Awaited<ReturnType<typeof requirementRepository.receive>>) => void;
    vi.mocked(requirementRepository.receive).mockReturnValue(new Promise((done) => { resolve = done; }));
    expect(screen.getByRole('button', { name: '新增任务' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: '事项全历程' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '基础字段' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '附件' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '事项接收' }));
    fireEvent.click(screen.getByRole('button', { name: '事项接收' }));
    expect(requirementRepository.receive).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '事项转交' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '新增任务' })).toBeDisabled();
    await act(async () => resolve({ ...task, status: '处理中', events: [] }));
    expect(screen.getByRole('button', { name: '新增任务' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '事项接收' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '新增任务' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '产品' }));
    expect(screen.getByRole('heading', { name: '新建产品任务' })).toBeVisible();
    expect(useApp().openPageTab).not.toHaveBeenCalled();
  });

  it('keeps pending status and task lock when reception fails', async () => {
    await renderDetail();
    vi.mocked(requirementRepository.receive).mockRejectedValueOnce(new Error('状态已变化'));
    fireEvent.click(screen.getByRole('button', { name: '事项接收' }));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith('error', '事项接收失败', '状态已变化'));
    expect(screen.getByRole('button', { name: '新增任务' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '事项接收' })).toBeEnabled();
  });

  it('restores the left-side fields, description and attachment empty state', async () => {
    await renderDetail({ descriptionHtml: '<p>必须恢复的事项描述</p>' });
    expect(screen.getByRole('region', { name: '基础字段' })).toHaveTextContent('协同产品');
    expect(screen.getByRole('region', { name: '基础字段' })).toHaveTextContent('项目甲');
    expect(screen.getByRole('region', { name: '事项描述' })).toHaveTextContent('必须恢复的事项描述');
    expect(screen.getByRole('region', { name: '附件' })).toHaveTextContent('暂无附件');
    expect(screen.getByRole('heading', { name: '事项全历程' })).toBeVisible();
  });

  it.each([
    ['产品', 'requirement', '产品任务'], ['设计', 'design', '设计任务'], ['缺陷', 'bug', '缺陷'],
    ['售前', 'presales', '售前任务'], ['交付', 'delivery', '交付任务'],
  ])('opens %s creation inside the matter detail without list navigation', async (label, kind, itemLabel) => {
    await renderDetail({ status: '处理中', productLineId: 'line-1' });
    fireEvent.click(screen.getByRole('button', { name: '新增任务' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: label }));
    expect(screen.getByRole('heading', { name: `新建${itemLabel}` })).toBeVisible();
    expect(screen.getByTestId('embedded-task-create')).toHaveAttribute('data-kind', kind);
    expect(screen.getByTestId('embedded-task-create')).toHaveAttribute('data-source', 'receive-1');
    expect(useApp().openPageTab).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '取消任务新建' }));
    expect(screen.queryByTestId('embedded-task-create')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '接收协同事项' })).toBeVisible();
  });

  it('refreshes associated tasks after the embedded form saves', async () => {
    await renderDetail({ status: '处理中', productLineId: 'line-1' });
    fireEvent.click(screen.getByRole('button', { name: '新增第一个任务' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '产品' }));
    vi.mocked(requirementRepository.detail).mockResolvedValue({ id: 'receive-1', title: '接收协同事项', status: '处理中', events: [], workItems: [{ id: 'new-task', taskType: '产品需求', title: '已保存任务', status: '待处理' }] } as unknown as Awaited<ReturnType<typeof requirementRepository.detail>>);
    fireEvent.click(screen.getByRole('button', { name: '模拟任务保存' }));
    expect(await screen.findByText('产品需求 · 已保存任务')).toBeVisible();
    expect(screen.queryByTestId('embedded-task-create')).not.toBeInTheDocument();
  });

  it('does not grant owner actions using a matching name when owner ids differ', async () => {
    const app = vi.mocked(useApp)();
    vi.mocked(useApp).mockReturnValue({ ...app, currentUser: { ...app.currentUser, id: 'user-1' } });
    await renderDetail({ assigneeId: 'user-2' });
    expect(screen.queryByRole('button', { name: '事项接收' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '事项转交' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '事项退回' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增任务' })).toBeDisabled();
  });

  it('keeps task creation available in processing even with an existing task', async () => {
    await renderDetail({ status: '处理中', taskId: 'existing-task' });
    expect(screen.getByRole('button', { name: '新增任务' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '事项接收' })).not.toBeInTheDocument();
  });

  it('shows presales creation fields and keeps removed historical values folded', async () => {
    await renderDetail({ workOrderType: '售前支持', specialFields: { opportunityName: '业务商机', supportType: '建设方案' } });
    expect(screen.getByText('所属商机')).toBeVisible();
    expect(screen.getByText('业务商机')).toBeVisible();
    expect(screen.getByText('支持类型')).toBeVisible();
    expect(screen.queryByText('关联客户', { selector: 'span' })).not.toBeInTheDocument();
    expect(screen.queryByText('所属线索/商机/投标')).not.toBeInTheDocument();
    expect(screen.queryByText('项目阶段')).not.toBeInTheDocument();
  });

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
    const task = { id: 'closed-item', code: 'WO-02', title: '已完成事项', status: '已完成', creatorName: '林志豪', revision: 4, events: [], workItems: [] };
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
    expect(screen.getByLabelText('所属产品 *').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('所属产品 *').closest('label')?.nextElementSibling).toBe(screen.getByLabelText('负责人 *').closest('label'));
    expect(screen.getByLabelText('优先级').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('期望完成时间 *').closest('.ant-picker')).not.toBeNull();
    expect(screen.getByLabelText('诉求来源 *')).toHaveClass('ant-input');

    const submit = screen.getByRole('button', { name: '发起协同' });
    expect(screen.getAllByRole('button', { name: '发起协同' })).toHaveLength(1);
    expect(submit.closest('.sticky')).not.toBeNull();
    expect(submit.closest('.sticky')).toHaveClass('-top-4', 'lg:-top-6', '-mt-6', 'px-6', 'py-4');
    expect(screen.getByTestId('rich-text-editor')).toHaveAttribute('data-size', 'work-order');
    expect(screen.getByText(/添加文档附件/)).toBeInTheDocument();
  });

  it.each([
    ['交付支持', ['所属项目 *', '所属产品 *']],
    ['其他协同', ['协助类型 *']],
  ])('uses Ant Design inputs for %s fields', async (type, labels) => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    await openType(type);

    expect(screen.getByLabelText('事项标题 *')).toHaveClass('ant-input');
    labels.forEach((label) => expect(screen.getByLabelText(label).closest('.ant-select')).not.toBeNull());
  });

  it('disables header actions while the work order is being submitted', async () => {
    let complete: ((value: boolean) => void) | undefined;
    addRequirementTask.mockReturnValue(new Promise<boolean>((resolve) => { complete = resolve; }));
    await openCustomerRequest();

    fireEvent.change(screen.getByLabelText('事项标题 *'), { target: { value: '客户反馈事项' } });
    fireEvent.mouseDown(screen.getByLabelText('所属项目 *'));
    fireEvent.click(await screen.findByText('中标项目甲', { selector: '.ant-select-item-option-content' }));
    fireEvent.mouseDown(screen.getByLabelText('所属产品 *'));
    fireEvent.click(await screen.findByText('协同产品', { selector: '.ant-select-item-option-content' }));
    fireEvent.mouseDown(screen.getByLabelText('负责人 *'));
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByLabelText('期望完成时间 *'), { target: { value: '2026-10-09' } });
    fireEvent.keyDown(screen.getByLabelText('期望完成时间 *'), { key: 'Enter', code: 'Enter' });
    fireEvent.blur(screen.getByLabelText('期望完成时间 *'));
    fireEvent.change(screen.getByLabelText('诉求来源 *'), { target: { value: '客户反馈' } });
    fireEvent.click(screen.getByRole('button', { name: '填写事项描述' }));
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));

    expect(screen.getByRole('button', { name: '提交中…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
    expect(addRequirementTask).toHaveBeenCalledWith(expect.objectContaining({ ownerName: '陈雅婷', priority: '中' }));

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

  it('limits product choices to the project and clears them on project changes', async () => {
    await openCustomerRequest();
    expect(screen.getByLabelText('所属产品 *')).toBeDisabled();
    expect(screen.getByLabelText('所属项目 *').compareDocumentPosition(screen.getByLabelText('所属产品 *')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText('优先级').closest('.ant-select')?.querySelector('.ant-select-content')).toHaveTextContent('中');
    fireEvent.mouseDown(screen.getByLabelText('所属项目 *'));
    fireEvent.click(await screen.findByText('中标项目甲', { selector: '.ant-select-item-option-content' }));
    expect(screen.getByLabelText('所属产品 *')).not.toBeDisabled();
    fireEvent.mouseDown(screen.getByLabelText('所属产品 *'));
    fireEvent.click(await screen.findByText('协同产品', { selector: '.ant-select-item-option-content' }));
    fireEvent.mouseDown(screen.getByLabelText('所属项目 *'));
    fireEvent.click(await screen.findByText('无产品项目', { selector: '.ant-select-item-option-content' }));
    expect(screen.getByLabelText('所属产品 *')).toBeDisabled();
    expect(screen.getByLabelText('所属产品 *').closest('.ant-select')).not.toHaveTextContent('协同产品');
  });

  it('places the other collaboration fields in the requested order', async () => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    await openType('其他协同');
    const labels = ['协助类型 *', '负责人 *', '所属项目', '所属产品'];
    labels.slice(0, -1).forEach((label, index) => expect(screen.getByLabelText(label).compareDocumentPosition(screen.getByLabelText(labels[index + 1])) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy());
    expect(screen.getByLabelText('协助类型 *').closest('label')?.nextElementSibling).toBe(screen.getByLabelText('负责人 *').closest('label'));
    expect(screen.getAllByLabelText('负责人 *')).toHaveLength(1);
    expect(screen.queryByLabelText(/期望结果/)).not.toBeInTheDocument();
  });

  const choose = async (label: string, option: string) => {
    fireEvent.mouseDown(screen.getByLabelText(label));
    fireEvent.click(await screen.findByText(option, { selector: '.ant-select-item-option-content' }));
  };

  it('creates other collaboration without an expected result and still requires the assistance type', async () => {
    addRequirementTask.mockResolvedValue(true);
    render(<RequirementPoolView />);
    await openType('其他协同');
    fireEvent.change(screen.getByLabelText('事项标题 *'), { target: { value: '资料获取协同' } });
    fireEvent.mouseDown(screen.getByLabelText('负责人 *'));
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByLabelText('期望完成时间 *'), { target: { value: '2026-10-09' } });
    fireEvent.keyDown(screen.getByLabelText('期望完成时间 *'), { key: 'Enter', code: 'Enter' });
    fireEvent.blur(screen.getByLabelText('期望完成时间 *'));
    fireEvent.click(screen.getByRole('button', { name: '填写事项描述' }));
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    expect(addRequirementTask).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('warning', '请完成所有必填业务参数');
    await choose('协助类型 *', '资料获取');
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent('陈雅婷');
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    await waitFor(() => expect(addRequirementTask).toHaveBeenCalledWith(expect.objectContaining({
      workOrderType: '其他问题', ownerName: '陈雅婷', priority: '中', specialFields: { problemType: '资料获取' },
    })));
    expect(addRequirementTask.mock.calls[0][0].specialFields).not.toHaveProperty('expectedResult');
  });

  it.each(['产品需求', '线上问题', '售前支持', '交付支持', '其他协同'])('defaults %s priority to medium on every new form', async (type) => {
    render(<RequirementPoolView />);
    await openType(type);
    expect(screen.getByLabelText('优先级').closest('.ant-select')?.querySelector('.ant-select-content')).toHaveTextContent('中');
    await choose('优先级', '高');
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await openType(type);
    expect(screen.getByLabelText('优先级').closest('.ant-select')?.querySelector('.ant-select-content')).toHaveTextContent('中');
  });

  it.each([
    [{ requirementOwnerUserId: 'employee-1', requirementOwner: '旧姓名' }, '陈雅婷'],
    [{ requirementOwner: '陈雅婷' }, '陈雅婷'],
    [{ ownerName: '陈雅婷', productOwner: '陈雅婷', requirementOwnerSecondary: '陈雅婷' }, '请选择负责人'],
    [{ requirementOwnerUserId: 'inactive', requirementOwner: '陈雅婷' }, '请选择负责人'],
  ])('uses only the configured active product primary owner: %j', async (configuration, expected) => {
    const context = vi.mocked(useApp)();
    vi.mocked(useApp).mockReturnValue({ ...context, productLines: [{ ...context.productLines[0], ...configuration }] });
    await openCustomerRequest();
    await choose('所属项目 *', '中标项目甲');
    await choose('所属产品 *', '协同产品');
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent(expected);
  });

  it('saves a manually changed owner and priority instead of the product defaults', async () => {
    const context = vi.mocked(useApp)();
    vi.mocked(useApp).mockReturnValue({ ...context, productLines: [{ ...context.productLines[0], requirementOwnerUserId: 'employee-1' }] });
    vi.mocked(requirementRepository.employees).mockResolvedValue([
      { id: 'employee-1', name: '陈雅婷', department: '产品部' },
      { id: 'employee-2', name: '林志豪', department: '管理部' },
    ]);
    addRequirementTask.mockResolvedValue(true);
    await openCustomerRequest();
    await choose('所属项目 *', '中标项目甲');
    await choose('所属产品 *', '协同产品');
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent('陈雅婷');
    fireEvent.mouseDown(screen.getByLabelText('负责人 *'));
    fireEvent.click(await screen.findByText(/林志豪/, { selector: '.ant-select-item-option-content' }));
    await choose('优先级', '高');
    fireEvent.change(screen.getByLabelText('事项标题 *'), { target: { value: '负责人调整' } });
    fireEvent.change(screen.getByLabelText('诉求来源 *'), { target: { value: '客户反馈' } });
    fireEvent.change(screen.getByLabelText('期望完成时间 *'), { target: { value: '2026-10-09' } });
    fireEvent.keyDown(screen.getByLabelText('期望完成时间 *'), { key: 'Enter', code: 'Enter' });
    fireEvent.blur(screen.getByLabelText('期望完成时间 *'));
    fireEvent.click(screen.getByRole('button', { name: '填写事项描述' }));
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    await waitFor(() => expect(addRequirementTask).toHaveBeenCalledWith(expect.objectContaining({ ownerName: '林志豪', priority: '高' })));
  });

  it('updates the owner on product changes and clears it when the source changes', async () => {
    const context = vi.mocked(useApp)();
    vi.mocked(useApp).mockReturnValue({ ...context,
      opportunities: [{ id: 'opp-1', name: '多产品商机', relatedProduct: '共享产品' }] as typeof context.opportunities,
      productLines: [
        { ...context.productLines[0], requirementOwnerUserId: 'employee-1', products: [{ id: 'shared', name: '共享产品' }] },
        { ...context.productLines[0], id: 'line-2', name: '另一产品', requirementOwnerUserId: 'employee-2', products: [{ id: 'shared', name: '共享产品' }] },
        { ...context.productLines[0], id: 'line-3', name: '无责任人产品', products: [{ id: 'shared', name: '共享产品' }] },
      ],
    });
    vi.mocked(requirementRepository.employees).mockResolvedValue([
      { id: 'employee-1', name: '陈雅婷' }, { id: 'employee-2', name: '林志豪' },
    ]);
    render(<RequirementPoolView />);
    await openType('售前支持');
    await choose('所属商机 *', '多产品商机');
    await choose('所属产品 *', '协同产品');
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent('陈雅婷');
    await choose('所属产品 *', '另一产品');
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent('林志豪');
    await choose('所属产品 *', '无责任人产品');
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent('请选择负责人');
    await choose('所属产品 *', '协同产品');
    fireEvent.click(screen.getByLabelText('所属商机 *').closest('.ant-select')!.querySelector('.ant-select-clear')!);
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent('请选择负责人');
    expect(screen.getByLabelText('所属产品 *')).toBeDisabled();
  });

  it('fills the primary owner when the employee directory arrives after product selection', async () => {
    const context = vi.mocked(useApp)();
    vi.mocked(useApp).mockReturnValue({ ...context, productLines: [{ ...context.productLines[0], requirementOwnerUserId: 'employee-1' }] });
    let resolveEmployees: (items: Awaited<ReturnType<typeof requirementRepository.employees>>) => void;
    vi.mocked(requirementRepository.employees).mockReturnValue(new Promise((resolve) => { resolveEmployees = resolve; }));
    await openCustomerRequest();
    await choose('所属项目 *', '中标项目甲');
    await choose('所属产品 *', '协同产品');
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent('请选择负责人');
    await act(async () => resolveEmployees!([{ id: 'employee-1', name: '陈雅婷' }]));
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent('陈雅婷');
    fireEvent.click(screen.getByLabelText('负责人 *').closest('.ant-select')!.querySelector('.ant-select-clear')!);
    vi.mocked(useApp).mockReturnValue({ ...context, productLines: [{ ...context.productLines[0], requirementOwnerUserId: 'employee-1', requirementOwner: '陈雅婷' }] });
    fireEvent.change(screen.getByLabelText('事项标题 *'), { target: { value: '保留手动清除' } });
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).toHaveTextContent('请选择负责人');
  });

  it('opens the list directly without metric cards or primary tabs and keeps the type filter', async () => {
    render(<RequirementPoolView />);
    expect(screen.queryByRole('tablist', { name: '协同事项视图' })).not.toBeInTheDocument();
    expect(screen.queryByText(/待处理 0 · 处理中 0 · 已处理 0/)).not.toBeInTheDocument();
    expect(screen.queryByText('每一处精微调整，都在点亮更广的世界。')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    const type = screen.getByLabelText('事项类型');
    expect(type.closest('.ant-select')).toHaveTextContent('类型');
    fireEvent.mouseDown(type);
    fireEvent.click(await screen.findByText('产品需求', { selector: '.ant-select-item-option-content' }));
    expect(type.closest('.ant-select')?.querySelector('.ant-select-clear')).toBeInTheDocument();
    fireEvent.click(type.closest('.ant-select')!.querySelector('.ant-select-clear')!);
    expect(type.closest('.ant-select')).toHaveTextContent('类型');
    fireEvent.mouseDown(screen.getByLabelText('状态'));
    await screen.findByText('待处理', { selector: '.ant-select-item-option-content' });
    expect(screen.queryByText('已搁置', { selector: '.ant-select-item-option-content' })).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: '详情' }));
    await waitFor(() => expect(requirementRepository.detail).toHaveBeenCalled());

    expect(screen.getByRole('button', { name: '新增任务' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '事项转交' }));
    expect(screen.queryByLabelText('流转类型 *')).not.toBeInTheDocument();
    expect(screen.getByLabelText('指定负责人 *')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入转交原因及交接说明...')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));

    fireEvent.click(screen.getByRole('button', { name: '事项退回' }));
    const rejectReason = screen.getByLabelText('驳回原因 *');
    fireEvent.mouseDown(rejectReason);
    const firstReason = await screen.findByText('事项内容不明确', { selector: '.ant-select-item-option-content' });
    fireEvent.click(firstReason);
    expect(rejectReason.closest('.ant-select')?.querySelector('.ant-select-content')).toHaveTextContent(firstReason.textContent || '');
  }, 15000);

  it.each([
    ['线上问题', '严重程度', '阻断主流程', '轻微缺陷'],
    ['售前支持', '支持类型 *', '建设方案', '招投标标书协同'],
    ['其他协同', '协助类型 *', '方向研讨', '其他'],
  ])('provides the configured %s business options', async (type, label, firstOption, lastOption) => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    await openType(type);
    fireEvent.mouseDown(screen.getByLabelText(label));
    expect(await screen.findByText(firstOption, { selector: '.ant-select-item-option-content' })).toBeInTheDocument();
    expect(await screen.findByText(lastOption, { selector: '.ant-select-item-option-content' })).toBeInTheDocument();
  });

  it.each(['untouched', 'selected', 'cleared'] as const)('submits an online issue with optional severity %s', async (state) => {
    addRequirementTask.mockResolvedValue(true);
    render(<RequirementPoolView />);
    await openType('线上问题');
    expect(screen.queryByLabelText('严重程度 *')).not.toBeInTheDocument();
    expect(screen.getByLabelText('严重程度').closest('.ant-select')).toHaveTextContent('请选择严重程度（选填）');
    await choose('所属项目 *', '中标项目甲');
    await choose('所属产品 *', '协同产品');
    fireEvent.mouseDown(screen.getByLabelText('负责人 *'));
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByLabelText('事项标题 *'), { target: { value: '线上异常' } });
    fireEvent.change(screen.getByLabelText('期望完成时间 *'), { target: { value: '2026-10-09' } });
    fireEvent.keyDown(screen.getByLabelText('期望完成时间 *'), { key: 'Enter', code: 'Enter' });
    fireEvent.blur(screen.getByLabelText('期望完成时间 *'));
    if (state !== 'untouched') {
      await choose('严重程度', '阻断主流程');
      expect(screen.getByLabelText('优先级').closest('.ant-select')?.querySelector('.ant-select-content')).toHaveTextContent('紧急');
    }
    if (state === 'cleared') {
      await choose('优先级', '高');
      fireEvent.click(screen.getByLabelText('严重程度').closest('.ant-select')!.querySelector('.ant-select-clear')!);
      expect(screen.getByLabelText('严重程度').closest('.ant-select')).toHaveTextContent('请选择严重程度（选填）');
      expect(screen.getByLabelText('优先级').closest('.ant-select')?.querySelector('.ant-select-content')).toHaveTextContent('高');
    }
    fireEvent.click(screen.getByRole('button', { name: '填写事项描述' }));
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    await waitFor(() => expect(addRequirementTask).toHaveBeenCalledWith(expect.objectContaining({
      workOrderType: '线上问题',
      priority: state === 'untouched' ? '中' : state === 'selected' ? '紧急' : '高',
    })));
    expect(addRequirementTask.mock.calls[0][0].specialFields.severity).toBe(state === 'untouched' ? undefined : state === 'selected' ? '阻断主流程' : '');
    expect(addToast).not.toHaveBeenCalledWith('warning', '请完成所有必填业务参数');
  });

  it.each(['交付支持', '售前支持'])('submits %s with the simplified business fields', async (type) => {
    addRequirementTask.mockResolvedValue(true);
    render(<RequirementPoolView />);
    await openType(type);
    if (type === '交付支持') {
      for (const label of ['项目阶段', '项目类型', '交付类型']) {
        expect(screen.queryByLabelText(`${label} *`)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
      }
      await choose('所属项目 *', '中标项目甲');
    } else {
      expect(screen.getByLabelText('所属商机 *').closest('.ant-select')).toHaveTextContent('输入商机名称');
      expect(screen.queryByLabelText('所属线索/商机/投标 *')).not.toBeInTheDocument();
      await choose('所属商机 *', '商机甲');
      await choose('支持类型 *', '建设方案');
    }
    await choose('所属产品 *', '协同产品');
    fireEvent.mouseDown(screen.getByLabelText('负责人 *'));
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByLabelText('事项标题 *'), { target: { value: '简化表单提交' } });
    fireEvent.change(screen.getByLabelText('期望完成时间 *'), { target: { value: '2026-10-09' } });
    fireEvent.keyDown(screen.getByLabelText('期望完成时间 *'), { key: 'Enter', code: 'Enter' });
    fireEvent.blur(screen.getByLabelText('期望完成时间 *'));
    fireEvent.click(screen.getByRole('button', { name: '填写事项描述' }));
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    await waitFor(() => expect(addRequirementTask).toHaveBeenCalledWith(expect.objectContaining({ workOrderType: type })));
    const fields = addRequirementTask.mock.calls[0][0].specialFields;
    if (type === '售前支持') {
      expect(fields).toMatchObject({ opportunityId: 'opp-1', opportunityName: '商机甲', relatedType: 'opportunity' });
    } else {
      for (const key of ['progressStage', 'other', 'deliveryType']) expect(fields[key]).toBeUndefined();
    }
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('offers all five creation types and only real opportunities for presales', async () => {
    const context = vi.mocked(useApp)();
    vi.mocked(useApp).mockReturnValue({ ...context, leads: [{ id: 'lead-only', name: '仅线索候选' }] } as unknown as ReturnType<typeof useApp>);
    render(<RequirementPoolView />);
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    expect((await screen.findAllByRole('menuitem')).map((item) => item.textContent)).toEqual(['产品需求', '线上问题', '售前支持', '交付支持', '其他协同']);
    fireEvent.click(screen.getByRole('menuitem', { name: '售前支持' }));
    fireEvent.mouseDown(screen.getByLabelText('所属商机 *'));
    expect(await screen.findByText('商机甲', { selector: '.ant-select-item-option-content' })).toBeInTheDocument();
    expect(screen.queryByText('仅线索候选')).not.toBeInTheDocument();
    expect(screen.queryByText('中标项目甲', { selector: '.ant-select-item-option-content' })).not.toBeInTheDocument();
  });

  it('blocks submission when a required project is missing', async () => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    await openType('线上问题');
    fireEvent.change(screen.getByLabelText('事项标题 *'), { target: { value: '线上异常' } });
    fireEvent.mouseDown(screen.getByLabelText('负责人 *'));
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.click(screen.getByRole('button', { name: '填写事项描述' }));
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
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
    fireEvent.click(screen.getByRole('button', { name: '详情' }));
    await waitFor(() => expect(requirementRepository.detail).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '事项转交' }));
    fireEvent.mouseDown(screen.getByLabelText('指定负责人 *'));
    fireEvent.click(await screen.findByText(/陈雅婷/, { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByPlaceholderText('请输入转交原因及交接说明...'), { target: { value: '工作调整' } });
    fireEvent.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => expect(addToast).toHaveBeenCalledWith('error', '事项转派失败', '工单已变化，请刷新后重试'));
    expect(screen.getByLabelText('指定负责人 *')).toBeInTheDocument();
    expect(setRequirementTasks).not.toHaveBeenCalled();
  });
});
