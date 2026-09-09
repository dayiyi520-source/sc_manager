// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequirementActionButtons } from './RequirementActionButtons';
import { isWorkOrderInScope, RequirementPoolView } from './RequirementPoolView';
import { useApp } from '../../context/AppContext';
import { requirementRepository } from '../../services/requirementRepository';
import type { RequirementTask } from '../../types';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { employees: vi.fn(), detail: vi.fn(), createWorkItem: vi.fn() } }));
afterEach(cleanup);

describe('work-order workflow form regression', () => {
  let records: RequirementTask[];
  const addToast = vi.fn();
  const setRequirementTaskDraft = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    records = [{ id: 'workflow-test', title: '流转回归工单', ownerName: '林志豪', creatorName: '林志豪', status: '待处理', priority: '中', dueDate: '2026-10-02', description: '原始描述', events: [] } as unknown as RequirementTask];
    vi.mocked(useApp).mockReturnValue({ requirementTasks: records, currentUser: { name: '林志豪', department: '测试' }, productLines: [], customers: [], biddings: [], opportunities: [], addToast, openPageTab: vi.fn(), setRequirementTaskDraft, setRequirementTasks: (update: (items: RequirementTask[]) => RequirementTask[]) => { records = update(records); } } as unknown as ReturnType<typeof useApp>);
    vi.mocked(requirementRepository.employees).mockResolvedValue([{ id: 'employee-test', name: '陈雅婷', department: '测试' }]);
    vi.mocked(requirementRepository.detail).mockResolvedValue({ events: [], workItems: [] } as unknown as Awaited<ReturnType<typeof requirementRepository.detail>>);
  });
  const openWorkflow = async () => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: '工单列表' }));
    fireEvent.click(screen.getByRole('button', { name: '详情' }));
    await waitFor(() => expect(requirementRepository.detail).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '工单流转' }));
  };
  const switchAction = (action: string) => fireEvent.change(screen.getByLabelText('流转类型 *'), { target: { value: action } });
  const selectAssignee = (label: string) => {
    fireEvent.change(screen.getByLabelText(label), { target: { value: '陈雅婷' } });
  };
  it('submits the selected reassignee and entered reason from the visible form', async () => {
    await openWorkflow();
    switchAction('reassign');
    selectAssignee('转派给负责人 *');
    fireEvent.change(screen.getByLabelText('转派原因说明 *'), { target: { value: '  请接手跟进  ' } });
    fireEvent.click(screen.getByRole('button', { name: '确认转派' }));
    expect(records[0].ownerName).toBe('陈雅婷');
    expect(records[0].events?.at(-1)?.reason).toBe('转派给 陈雅婷：请接手跟进');
    expect(addToast).toHaveBeenCalledWith('success', '工单转派成功', '已成功转派给 陈雅婷');
  });
  it('rejects whitespace reason without changing the work order', async () => {
    await openWorkflow();
    switchAction('reassign');
    selectAssignee('转派给负责人 *');
    fireEvent.change(screen.getByLabelText('转派原因说明 *'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '确认转派' }));
    expect(addToast).toHaveBeenCalledWith('warning', '请输入转派原因说明');
    expect(records[0].status).toBe('待处理');
  });
  it('rejects an unselected employee even when a reason is present', async () => {
    await openWorkflow();
    switchAction('reassign');
    fireEvent.change(screen.getByLabelText('转派给负责人 *'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('转派原因说明 *'), { target: { value: '交接' } });
    fireEvent.click(screen.getByRole('button', { name: '确认转派' }));
    expect(addToast).toHaveBeenCalledWith('warning', '请选择新的转派负责人', expect.any(String));
  });
  it('keeps all three drafts independent and retains them across switches', async () => {
    await openWorkflow();
    switchAction('reassign');
    selectAssignee('转派给负责人 *');
    fireEvent.change(screen.getByLabelText('转派原因说明 *'), { target: { value: '转派独立原因' } });
    switchAction('convert');
    expect(screen.getByLabelText('任务负责人 *')).toHaveValue('');
    expect(screen.getByLabelText('任务描述')).toHaveValue('');
    expect(screen.getByLabelText('期望完成时间')).toHaveValue('2026-10-02');
    fireEvent.change(screen.getByLabelText('任务描述'), { target: { value: '任务独立描述' } });
    switchAction('memo');
    expect(screen.getByLabelText('个人备忘内容 *')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('个人备忘内容 *'), { target: { value: '独立备忘' } });
    switchAction('reassign');
    expect(screen.getByLabelText('转派给负责人 *')).toHaveValue('陈雅婷');
    expect(screen.getByLabelText('转派原因说明 *')).toHaveValue('转派独立原因');
    switchAction('convert');
    expect(screen.getByLabelText('任务描述')).toHaveValue('任务独立描述');
    switchAction('memo');
    fireEvent.click(screen.getByRole('button', { name: '确认保存备忘' }));
    expect(records[0].events?.at(-1)?.reason).toBe('独立备忘');
  });
  it('keeps the same wide dialog for all three workflow types', async () => {
    await openWorkflow();
    for (const action of ['convert', 'reassign', 'memo', 'convert']) {
      switchAction(action);
      const dialog = screen.getByRole('heading', { name: '工单流转' }).parentElement?.parentElement;
      expect(dialog).toHaveClass('max-w-4xl');
      expect(dialog).not.toHaveClass('max-w-xl');
    }
  });
  it('resets drafts on reopening and inherits dates for new rows', async () => {
    await openWorkflow();
    fireEvent.click(screen.getByRole('button', { name: '+ 增加任务' }));
    expect(screen.getAllByLabelText('期望完成时间').map(input => (input as HTMLInputElement).value)).toEqual(['2026-10-02', '2026-10-02']);
    switchAction('reassign');
    fireEvent.change(screen.getByLabelText('转派原因说明 *'), { target: { value: '不应残留' } });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    fireEvent.click(screen.getByRole('button', { name: '工单流转' }));
    expect(screen.getAllByLabelText('任务描述')).toHaveLength(1);
    switchAction('reassign');
    expect(screen.getByLabelText('转派原因说明 *')).toHaveValue('');
  });
  it('uses the task description and edited deadline in the requirement draft', async () => {
    await openWorkflow();
    fireEvent.change(screen.getByLabelText('任务类型 *'), { target: { value: '产品需求' } });
    selectAssignee('任务负责人 *');
    fireEvent.change(screen.getByLabelText('任务描述'), { target: { value: '任务描述独立提交' } });
    fireEvent.change(screen.getByLabelText('期望完成时间'), { target: { value: '2026-10-09' } });
    fireEvent.click(screen.getByRole('button', { name: '确认转任务' }));
    expect(setRequirementTaskDraft).toHaveBeenCalledWith(expect.objectContaining({ ownerName: '陈雅婷', dueDate: '2026-10-09', description: '任务描述独立提交' }));
  });
  it('does not accept a reassignment reason as memo content', async () => {
    await openWorkflow();
    switchAction('reassign');
    fireEvent.change(screen.getByLabelText('转派原因说明 *'), { target: { value: '仅用于转派' } });
    switchAction('memo');
    fireEvent.change(screen.getByLabelText('个人备忘内容 *'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '确认保存备忘' }));
    expect(addToast).toHaveBeenCalledWith('warning', '请输入个人备忘录内容');
    expect(records[0].status).toBe('待处理');
  });
  it('submits task-specific notes and retains them when the downstream request fails', async () => {
    await openWorkflow();
    vi.mocked(requirementRepository.createWorkItem).mockRejectedValue(new Error('offline'));
    switchAction('reassign');
    fireEvent.change(screen.getByLabelText('转派原因说明 *'), { target: { value: '不应作为任务备注' } });
    switchAction('convert');
    fireEvent.change(screen.getByLabelText('任务类型 *'), { target: { value: '缺陷管理' } });
    selectAssignee('任务负责人 *');
    fireEvent.change(screen.getByLabelText('任务描述'), { target: { value: '缺陷任务独立描述' } });
    fireEvent.click(screen.getByRole('button', { name: '确认转任务' }));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith('error', '下游任务同步失败', expect.any(String)));
    expect(requirementRepository.createWorkItem).toHaveBeenCalledWith('workflow-test', { taskType: '缺陷管理', assigneeName: '陈雅婷', note: '缺陷任务独立描述' });
    expect(screen.getByLabelText('任务描述')).toHaveValue('缺陷任务独立描述');
  });
});

describe('RequirementPoolView action interactions', () => {
  it('renders work-order actions and invokes callbacks', () => {
    const onWork = vi.fn();
    const onHold = vi.fn();
    const onReject = vi.fn();
    const { rerender } = render(<RequirementActionButtons status="待处理" hasWorkItem={false} onWork={onWork} onHold={onHold} onReject={onReject} />);
    fireEvent.click(screen.getByRole('button', { name: '工单流转' }));
    fireEvent.click(screen.getByRole('button', { name: '工单搁置' }));
    fireEvent.click(screen.getByRole('button', { name: '工单驳回' }));
    expect(onWork).toHaveBeenCalledOnce();
    expect(onHold).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();

    rerender(<RequirementActionButtons status="已搁置" hasWorkItem={false} onWork={onWork} onHold={onHold} onReject={onReject} />);
    expect(screen.getByRole('button', { name: '工单流转' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '工单驳回' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '工单搁置' })).not.toBeInTheDocument();

    rerender(<RequirementActionButtons status="处理中" hasWorkItem onWork={onWork} onHold={onHold} onReject={onReject} />);
    expect(screen.queryByRole('button', { name: '工单流转' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '工单驳回' })).not.toBeInTheDocument();
  });

  it('keeps mine-all as a base filter and matches names robustly', () => {
    const user = '林志豪';
    expect(isWorkOrderInScope({ ownerName: '王浩然', creatorName: ' 林志豪 ' }, 'all', user)).toBe(true);
    expect(isWorkOrderInScope({ ownerName: '王浩然', creatorName: '陈雅婷' }, 'all', user)).toBe(false);
    expect(isWorkOrderInScope({ ownerName: ' 林志豪 ', creatorName: '陈雅婷' }, 'mine_owned', user)).toBe(true);
    expect(isWorkOrderInScope({ ownerName: '林志豪', creatorName: '陈雅婷' }, 'mine_created', user)).toBe(false);
  });
});
