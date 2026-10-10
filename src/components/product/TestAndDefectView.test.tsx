// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestAndDefectView } from './TestAndDefectView';

const mocks = vi.hoisted(() => ({ renderTestTaskWorkspace: vi.fn(), renderReportWorkspace: vi.fn() }));

vi.mock('./TestCaseLibraryView', () => ({
  TestCaseLibraryView: ({ productLineFilter }: { productLineFilter?: string }) => <div>用例库工作区：{productLineFilter}</div>
}));

vi.mock('./TestPlanWorkspace', () => ({
  TestPlanWorkspace: ({ productLineFilter, onDetailChange }: { productLineFilter?: string; onDetailChange?: (open: boolean) => void }) => {
    const [detail, setDetail] = React.useState(false);
    return <div>{detail ? '计划详情内容' : `测试计划工作区：${productLineFilter}`}<button onClick={() => { setDetail(!detail); onDetailChange?.(!detail); }}>{detail ? '返回计划列表' : '打开计划详情'}</button></div>;
  }
}));

vi.mock('./TestTaskWorkspace', () => ({
  TestTaskWorkspace: (props: { productLineFilter?: string }) => {
    mocks.renderTestTaskWorkspace(props);
    return <div>测试任务统一工作项页面</div>;
  }
}));

vi.mock('./VersionTestReportWorkspace', () => ({
  VersionTestReportWorkspace: (props: { productLineFilter?: string }) => {
    mocks.renderReportWorkspace(props);
    return <div>测试报告工作区</div>;
  }
}));

describe('TestAndDefectView', () => {
  beforeEach(() => {
    mocks.renderTestTaskWorkspace.mockClear();
    mocks.renderReportWorkspace.mockClear();
  });

  it('打开计划详情隐藏一级页签和产品导航，返回恢复列表', () => {
    render(<TestAndDefectView mode="management" />);
    fireEvent.click(screen.getByRole('button', { name: '打开计划详情' }));
    expect(screen.queryByRole('tab', { name: '测试计划' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: '产品导航栏' })).not.toBeInTheDocument();
    expect(screen.getByText('计划详情内容')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '返回计划列表' }));
    expect(screen.getByRole('tab', { name: '测试计划' })).toBeVisible();
    expect(screen.getByRole('navigation', { name: '产品导航栏' })).toBeVisible();
  });

  it('默认展示测试任务，并复用统一工作项页面', () => {
    render(<TestAndDefectView productLineFilter="line-1" />);

    expect(screen.getByRole('tab', { name: '测试任务' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '用例库' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '测试报告' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '缺陷管理' })).not.toBeInTheDocument();
    expect(screen.getByText('测试任务统一工作项页面')).toBeInTheDocument();
    expect(mocks.renderTestTaskWorkspace).toHaveBeenCalledWith(expect.objectContaining({ productLineFilter: 'line-1' }));
  });

  it('切换到用例库时传递当前产品', () => {
    render(<TestAndDefectView productLineFilter="line-1" />);

    fireEvent.click(screen.getByRole('tab', { name: '用例库' }));

    expect(screen.getByText('用例库工作区：line-1')).toBeInTheDocument();
  });

  it('在测试任务后显示测试计划，切换时保留产品范围', () => {
    render(<TestAndDefectView productLineFilter="line-1" />);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['测试任务', '测试计划', '用例库', '测试报告']);
    fireEvent.click(screen.getByRole('tab', { name: '测试计划' }));
    expect(screen.getByText('测试计划工作区：line-1')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '产品导航栏' })).toBeInTheDocument();
  });

  it('切换到测试报告时传递当前产品', () => {
    render(<TestAndDefectView productLineFilter="line-2" />);

    fireEvent.click(screen.getByRole('tab', { name: '测试报告' }));

    expect(screen.getByText('测试报告工作区')).toBeInTheDocument();
    expect(mocks.renderReportWorkspace).toHaveBeenCalledWith(expect.objectContaining({ productLineFilter: 'line-2' }));
  });

  it('将测试任务与测试管理拆分为两个菜单工作区', () => {
    const { rerender } = render(<TestAndDefectView mode="tasks" productLineFilter="line-1" />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByText('测试任务统一工作项页面')).toBeInTheDocument();
    rerender(<TestAndDefectView mode="management" productLineFilter="line-1" />);
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['测试计划', '用例库', '测试报告']);
    expect(screen.getByRole('tab', { name: '测试计划' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('测试计划工作区：line-1')).toBeVisible();
  });

  it('反复切换任务与管理时，始终显示有效管理内容并保留已选标签', () => {
    const { rerender } = render(<TestAndDefectView mode="tasks" productLineFilter="line-1" />);
    for (let index = 0; index < 3; index += 1) {
      rerender(<TestAndDefectView mode="management" productLineFilter="line-1" />);
      expect(screen.getByText('测试计划工作区：line-1')).toBeVisible();
      rerender(<TestAndDefectView mode="tasks" productLineFilter="line-1" />);
      expect(screen.getByText('测试任务统一工作项页面')).toBeVisible();
    }
    rerender(<TestAndDefectView mode="management" productLineFilter="line-1" />);
    fireEvent.click(screen.getByRole('tab', { name: '用例库' }));
    rerender(<TestAndDefectView mode="tasks" productLineFilter="line-2" />);
    rerender(<TestAndDefectView mode="management" productLineFilter="line-2" />);
    expect(screen.getByRole('tab', { name: '用例库' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('用例库工作区：line-2')).toBeVisible();
  });

  it('仅在测试任务和测试报告内容区显示产品导航', () => {
    render(<TestAndDefectView productLineFilter="line-1" productLines={[{ id: 'line-1', name: '核心产品' }]} />);
    expect(screen.getByRole('navigation', { name: '产品导航栏' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '用例库' }));
    expect(screen.queryByRole('navigation', { name: '产品导航栏' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '测试报告' }));
    expect(screen.getByRole('navigation', { name: '产品导航栏' })).toBeInTheDocument();
  });
});
