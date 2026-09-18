// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestAndDefectView } from './TestAndDefectView';

const mocks = vi.hoisted(() => ({ renderRequirementTasks: vi.fn(), renderTestTaskWorkspace: vi.fn() }));

vi.mock('./RequirementTasksView', () => ({
  RequirementTasksView: (props: { productLineFilter?: string; itemLabel: string; taskKind: string }) => {
    mocks.renderRequirementTasks(props);
    return <div>{props.itemLabel}统一工作项页面</div>;
  }
}));

vi.mock('./TestCaseLibraryView', () => ({
  TestCaseLibraryView: ({ productLineFilter }: { productLineFilter?: string }) => <div>用例库工作区：{productLineFilter}</div>
}));

vi.mock('./TestTaskWorkspace', () => ({
  TestTaskWorkspace: (props: { productLineFilter?: string }) => {
    mocks.renderTestTaskWorkspace(props);
    return <div>测试任务统一工作项页面</div>;
  }
}));

describe('TestAndDefectView', () => {
  beforeEach(() => {
    mocks.renderRequirementTasks.mockClear();
    mocks.renderTestTaskWorkspace.mockClear();
  });

  it('默认展示测试任务，并复用统一工作项页面', () => {
    render(<TestAndDefectView productLineFilter="line-1" />);

    expect(screen.getByRole('tab', { name: '测试任务' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '用例库' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '缺陷管理' })).toBeInTheDocument();
    expect(screen.getByText('测试任务统一工作项页面')).toBeInTheDocument();
    expect(mocks.renderTestTaskWorkspace).toHaveBeenCalledWith(expect.objectContaining({ productLineFilter: 'line-1' }));
  });

  it('切换到用例库时传递当前产品线', () => {
    render(<TestAndDefectView productLineFilter="line-1" />);

    fireEvent.click(screen.getByRole('tab', { name: '用例库' }));

    expect(screen.getByText('用例库工作区：line-1')).toBeInTheDocument();
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
