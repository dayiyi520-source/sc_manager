// @vitest-environment jsdom
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { productRepository } from '../../services/productRepository';
import { useProductQueries } from './useProductQueries';

it('reloads saved design tasks in mock mode while remote-only queries stay disabled', async () => {
  const saved = { id: 'saved-design', status: '已完成', actualHours: 2 };
  const load = vi.spyOn(productRepository, 'designTasks').mockResolvedValue({ items: [saved] } as any);
  vi.spyOn(productRepository, 'productLines').mockResolvedValue([]);
  const open = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return renderHook(() => useProductQueries('session', false, true), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
  };
  const first = open();
  await waitFor(() => expect(first.result.current.designQuery.data?.items).toEqual([saved]));
  expect(first.result.current.requirementQuery.fetchStatus).toBe('idle');
  first.unmount();
  const refreshed = open();
  await waitFor(() => expect(refreshed.result.current.designQuery.data?.items).toEqual([saved]));
  expect(load).toHaveBeenCalledTimes(2);
  refreshed.unmount();
  vi.restoreAllMocks();
});
