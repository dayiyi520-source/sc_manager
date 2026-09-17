// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestAndDefectView } from './TestAndDefectView';

const mocks = vi.hoisted(() => ({ renderRequirementTasks: vi.fn() }));

vi.mock('./RequirementTasksView', () => ({
  RequirementTasksView: (props: { productLineFilter?: string; itemLabel: string; taskKind: string }) => {
    mocks.renderRequirementTasks(props);
    return <div>{props.itemLabel}统一工作项页面</div>;
  }
}));

describe('TestAndDefectView', () => {
  beforeEach(() => {
    mocks.renderRequirementTasks.mockClear();
  });

  it('默认展示测试任务，并复用统一工作项页面', () => {
    render(<TestAndDefectView productLineFilter="line-1" />);

    expect(screen.getByRole('tab', { name: '测试任务' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('测试任务统一工作项页面')).toBeInTheDocument();
    expect(mocks.renderRequirementTasks).toHaveBeenCalledWith(expect.objectContaining({
      productLineFilter: 'line-1',
      itemLabel: '测试任务',
      taskKind: 'test'
    }));
  });

  it('切换到缺陷管理时复用缺陷分类的统一工作项页面', () => {
    render(<TestAndDefectView productLineFilter="line-2" />);

    fireEvent.click(screen.getByRole('tab', { name: '缺陷管理' }));

    expect(screen.getByRole('tab', { name: '缺陷管理' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('缺陷管理统一工作项页面')).toBeInTheDocument();
    expect(mocks.renderRequirementTasks).toHaveBeenCalledWith(expect.objectContaining({
      productLineFilter: 'line-2',
      itemLabel: '缺陷管理',
      taskKind: 'bug'
    }));
  });
});
