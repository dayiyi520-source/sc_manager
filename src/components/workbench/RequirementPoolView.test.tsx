// @vitest-environment jsdom
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useApp } from '../../context/AppContext';
import { requirementRepository } from '../../services/requirementRepository';
import { RequirementPoolView } from './RequirementPoolView';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../services/requirementRepository', () => ({
  requirementRepository: { employees: vi.fn(), detail: vi.fn() },
}));
vi.mock('../product/RichTextEditor', () => ({
  RichTextEditor: ({ size, onInput }: { size?: string; onInput: (text: string, html: string) => void }) => (
    <div data-testid="rich-text-editor" data-size={size}>
      <button type="button" onClick={() => onInput('工单详细描述', '<p>工单详细描述</p>')}>填写工单描述</button>
    </div>
  ),
}));

describe('workbench work-order creation layout', () => {
  const addRequirementTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirementRepository.employees).mockResolvedValue([{ id: 'employee-1', name: '陈雅婷', department: '产品部' }]);
    vi.mocked(useApp).mockReturnValue({
      requirementTasks: [],
      addRequirementTask,
      setRequirementTasks: vi.fn(),
      productLines: [],
      customers: [],
      biddings: [],
      opportunities: [],
      currentUser: { name: '林志豪', department: '管理部' },
      addToast: vi.fn(),
      openPageTab: vi.fn(),
      setRequirementTaskDraft: vi.fn(),
    } as unknown as ReturnType<typeof useApp>);
  });

  const openCustomerRequest = async () => {
    render(<RequirementPoolView />);
    await waitFor(() => expect(requirementRepository.employees).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /客户诉求/ }));
  };

  it('keeps one submit action in the sticky header and uses the large editor', async () => {
    await openCustomerRequest();

    expect(screen.getByLabelText('工单标题 *')).toHaveClass('ant-input');
    expect(screen.getByLabelText('负责人 *').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('优先级').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('期望完成时间').closest('.ant-picker')).not.toBeNull();
    expect(screen.getByLabelText('诉求类型').closest('.ant-select')).not.toBeNull();
    expect(screen.getByLabelText('诉求来源')).toHaveClass('ant-input');

    const submit = screen.getByRole('button', { name: '提交工单' });
    expect(screen.getAllByRole('button', { name: '提交工单' })).toHaveLength(1);
    expect(submit.closest('.sticky')).not.toBeNull();
    expect(submit.closest('.sticky')).toHaveClass('-top-4', 'lg:-top-6', '-mt-6', 'px-6', 'py-4');
    expect(screen.getByTestId('rich-text-editor')).toHaveAttribute('data-size', 'work-order');
    expect(screen.getByText(/添加文档附件/)).toBeInTheDocument();
  });

  it('disables header actions while the work order is being submitted', async () => {
    let complete: ((value: boolean) => void) | undefined;
    addRequirementTask.mockReturnValue(new Promise<boolean>((resolve) => { complete = resolve; }));
    await openCustomerRequest();

    fireEvent.change(screen.getByLabelText('工单标题 *'), { target: { value: '客户反馈工单' } });
    fireEvent.mouseDown(screen.getByLabelText('负责人 *'));
    fireEvent.click(await screen.findByText('陈雅婷', { selector: '.ant-select-item-option-content' }));
    fireEvent.click(screen.getByRole('button', { name: '填写工单描述' }));
    fireEvent.click(screen.getByRole('button', { name: '提交工单' }));

    expect(screen.getByRole('button', { name: '提交中…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();

    await act(async () => complete?.(true));
  });
});
