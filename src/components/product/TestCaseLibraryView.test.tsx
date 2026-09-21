// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { groupTestCasesByDirectory, TestCaseLibraryView } from './TestCaseLibraryView';
import type { TestCase, TestCaseDirectory } from '../../types/testManagement';

const mocks = vi.hoisted(() => ({
  testCaseDirectories: vi.fn(),
  productLines: vi.fn(),
  testCases: vi.fn(),
}));

vi.mock('../../services/productRepository', () => ({ productRepository: {
  testCaseDirectories: mocks.testCaseDirectories,
  productLines: mocks.productLines,
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
    mocks.testCases.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
  });

  it('does not expose execution results in the reusable case library', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><TestCaseLibraryView productLineFilter="all" /></QueryClientProvider>);
    expect(await screen.findByText('当前目录暂无测试用例')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '最新执行结果' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建用例/ })).toBeInTheDocument();
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
