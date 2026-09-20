// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestAndDefectView } from './TestAndDefectView';

const mocks = vi.hoisted(() => ({ renderTestTaskWorkspace: vi.fn(), renderReportWorkspace: vi.fn() }));

vi.mock('./TestCaseLibraryView', () => ({
  TestCaseLibraryView: ({ productLineFilter }: { productLineFilter?: string }) => <div>用例库工作区：{productLineFilter}</div>
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

  it('默认展示测试任务，并复用统一工作项页面', () => {
    render(<TestAndDefectView productLineFilter="line-1" />);

    expect(screen.getByRole('tab', { name: '测试任务' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '用例库' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '测试报告' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '缺陷管理' })).not.toBeInTheDocument();
    expect(screen.getByText('测试任务统一工作项页面')).toBeInTheDocument();
    expect(mocks.renderTestTaskWorkspace).toHaveBeenCalledWith(expect.objectContaining({ productLineFilter: 'line-1' }));
  });

  it('切换到用例库时传递当前产品线', () => {
    render(<TestAndDefectView productLineFilter="line-1" />);

    fireEvent.click(screen.getByRole('tab', { name: '用例库' }));

    expect(screen.getByText('用例库工作区：line-1')).toBeInTheDocument();
  });

  it('切换到测试报告时传递当前产品线', () => {
    render(<TestAndDefectView productLineFilter="line-2" />);

    fireEvent.click(screen.getByRole('tab', { name: '测试报告' }));

    expect(screen.getByText('测试报告工作区')).toBeInTheDocument();
    expect(mocks.renderReportWorkspace).toHaveBeenCalledWith(expect.objectContaining({ productLineFilter: 'line-2' }));
  });
});
