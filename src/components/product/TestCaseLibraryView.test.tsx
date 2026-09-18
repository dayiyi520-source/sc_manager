// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { TestCaseLibraryView } from './TestCaseLibraryView';

describe('TestCaseLibraryView', () => {
  it('requires a product line before creating test cases', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><TestCaseLibraryView productLineFilter="all" /></QueryClientProvider>);
    expect(screen.getByRole('heading', { name: '请选择产品线' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建用例' })).toBeDisabled();
  });
});
