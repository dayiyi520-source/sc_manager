// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestExecutionWorkspace } from './TestExecutionWorkspace';

const mocks = vi.hoisted(() => ({
  detail: vi.fn(),
  workItems: vi.fn(),
  save: vi.fn(),
  link: vi.fn(),
  end: vi.fn(),
}));

vi.mock('../../services/productRepository', () => ({ productRepository: {
  testExecutionDetail: mocks.detail,
  workItems: mocks.workItems,
  saveTestResult: mocks.save,
  linkTestResultDefect: mocks.link,
  endTestExecution: mocks.end,
} }));

const execution = {
  id: 'execution-1', workItemId: 'task-1', roundNo: 1, name: '第一轮', scopeType: 'ALL', executorName: '测试员', status: 'IN_PROGRESS', revision: 0,
  total: 1, passed: 0, failed: 0, notExecuted: 1,
  cases: [{ id: 'result-1', testCaseId: 'case-1', sort: 1, code: 'TC-000001', title: '登录流程', priority: 'P1', precondition: '已有账号', steps: [{ sort: 1, action: '提交登录', expectedResult: '进入首页' }], result: 'NOT_EXECUTED', revision: 0, evidence: [], defects: [] }]
};

const renderWorkspace = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TestExecutionWorkspace executionId="execution-1" productLineId="line-1" /></QueryClientProvider>);

describe('TestExecutionWorkspace', () => {
  beforeEach(() => {
    mocks.detail.mockResolvedValue(execution);
    mocks.workItems.mockResolvedValue({ page: { items: [], total: 0 } });
    mocks.save.mockResolvedValue(execution);
  });

  it('requires an actual result before saving a failed case', async () => {
    renderWorkspace();
    expect((await screen.findAllByText('登录流程')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('radio', { name: '失败' }));
    fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
    expect(await screen.findByText('失败时必须填写实际结果')).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('saves a passed result through the repository', async () => {
    renderWorkspace();
    await screen.findAllByText('登录流程');
    fireEvent.click(screen.getByRole('radio', { name: '通过' }));
    fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('result-1', expect.objectContaining({ result: 'PASSED', revision: 0 })));
  });
});
