// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupTestCasesByDirectory, TestCaseLibraryView } from './TestCaseLibraryView';
import type { TestCase, TestCaseDirectory } from '../../types/testManagement';

const mocks = vi.hoisted(() => ({
  testCaseDirectories: vi.fn(),
  productLines: vi.fn(),
  workItemTypes: vi.fn(),
  testCases: vi.fn(),
}));

vi.mock('../../services/productRepository', () => ({ productRepository: {
  testCaseDirectories: mocks.testCaseDirectories,
  productLines: mocks.productLines,
  workItemTypes: mocks.workItemTypes,
  testCases: mocks.testCases,
  createTestCaseDirectory: vi.fn(),
  batchUpdateTestCases: vi.fn(),
  copyTestCaseDirectory: vi.fn(),
  renameTestCaseDirectory: vi.fn(),
  setTestCaseEnabled: vi.fn(),
  deleteTestCaseDirectory: vi.fn(),
} }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([]) } }));
vi.mock('./TestCaseEditorDrawer', () => ({ TestCaseEditorDrawer: () => null, directoryOptions: () => [] }));

describe('TestCaseLibraryView', () => {
  beforeEach(() => {
    mocks.testCaseDirectories.mockResolvedValue([]);
    mocks.productLines.mockResolvedValue([]);
    mocks.workItemTypes.mockResolvedValue([]);
    mocks.testCases.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
  });

  it('does not expose execution results in the reusable case library', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><TestCaseLibraryView productLineFilter="all" /></QueryClientProvider>);
    expect(await screen.findByText('当前目录暂无测试用例')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '最新执行结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建用例/ })).toBeInTheDocument();
  });

  it('uses task-style icon controls and filter fields', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><TestCaseLibraryView productLineFilter="all" /></QueryClientProvider>);

    await screen.findByText('当前目录暂无测试用例');
    expect(screen.queryByText('测试用例库')).not.toBeInTheDocument();
    expect(screen.queryByText('匹配操作')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('搜索编号或标题')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '搜索' }));
    expect(screen.getByPlaceholderText('搜索编号或标题')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '过滤器' }));

    expect(screen.getByLabelText('编号过滤值')).toBeInTheDocument();
    expect(screen.getByLabelText('标题过滤值')).toBeInTheDocument();
    expect(screen.getByLabelText('执行人')).toBeInTheDocument();
    expect(screen.getByLabelText('创建时间开始')).toBeInTheDocument();
    expect(screen.getByLabelText('创建时间结束')).toBeInTheDocument();
    expect(screen.queryByLabelText('状态')).not.toBeInTheDocument();
    expect(screen.getByLabelText('优先级')).toBeInTheDocument();
    expect(screen.getByLabelText('类型')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText('编号过滤值')).not.toBeInTheDocument();
  });

  it('reads type options from configured case subtypes instead of the current list', async () => {
    mocks.productLines.mockResolvedValue([{ id: 'line-1', name: '产品线', workItemTypes: [{ id: 'case-type', name: '接口测试', category: '用例', enabled: true }, { id: 'task-type', name: '测试任务', category: '测试', enabled: true }] }]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><TestCaseLibraryView productLineFilter="all" /></QueryClientProvider>);

    await screen.findByText('当前目录暂无测试用例');
    fireEvent.click(screen.getByRole('button', { name: '过滤器' }));
    fireEvent.mouseDown(screen.getByLabelText('类型'));
    expect(await screen.findByRole('option', { name: '接口测试' })).toBeInTheDocument();
    expect(screen.queryByText('测试任务')).not.toBeInTheDocument();
  });

  it('groups cases by directory path and keeps uncategorized cases visible', () => {
    const directories = [
      { id: 'root', parentId: null, name: '登录', sort: 1, caseCount: 1, productLineName: '全部用例' },
      { id: 'child', parentId: 'root', name: '密码', sort: 1, caseCount: 1, productLineName: '全部用例' },
    ] as TestCaseDirectory[];
    const cases = [{ id: 'a', directoryId: 'child' }, { id: 'b', directoryId: 'missing' }] as TestCase[];
    expect(groupTestCasesByDirectory(cases, directories)).toMatchObject([
      { key: 'child', path: '全部用例 / 登录 / 密码', items: [{ id: 'a' }] },
      { key: 'missing', path: '未分类', items: [{ id: 'b' }] },
    ]);
  });
});
