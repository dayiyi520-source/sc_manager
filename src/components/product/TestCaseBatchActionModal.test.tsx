// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TestCaseBatchActionModal } from './TestCaseBatchActionModal';

const directories = [{
  id: 'dir-1',
  parentId: null,
  name: '核心流程',
  sort: 1,
  caseCount: 2,
  productLineId: 'line-1',
  productLineName: '星河平台',
}];

const baseProps = {
  open: true,
  action: 'move' as const,
  directories,
  directoryPath: [] as string[],
  value: undefined,
  employees: [],
  employeesLoading: false,
  employeesError: false,
  directoriesLoading: false,
  directoriesError: false,
  submitting: false,
  error: '',
  onDirectoryPathChange: vi.fn(),
  onValueChange: vi.fn(),
  onCancel: vi.fn(),
  onSubmit: vi.fn(),
};

describe('TestCaseBatchActionModal', () => {
  it('uses a labelled form and rejects product-line roots as move targets', () => {
    const { rerender } = render(<TestCaseBatchActionModal {...baseProps} />);
    expect(screen.getByRole('dialog', { name: '移动用例' })).toBeInTheDocument();
    expect(screen.getByLabelText('目标目录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保\s*存/ })).toBeDisabled();

    rerender(<TestCaseBatchActionModal {...baseProps} directoryPath={['product-line:line-1']} />);
    expect(screen.getByRole('button', { name: /保\s*存/ })).toBeDisabled();

    rerender(<TestCaseBatchActionModal {...baseProps} directoryPath={['product-line:line-1', 'dir-1']} />);
    expect(screen.getByRole('button', { name: /保\s*存/ })).toBeEnabled();
  });

  it('keeps failure feedback inside the active modal', () => {
    render(<TestCaseBatchActionModal {...baseProps} error="目标目录已失效" />);
    expect(screen.getByText('目标目录已失效')).toBeInTheDocument();
  });
});
