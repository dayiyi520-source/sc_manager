// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useApp } from '../../../context/AppContext';
import { productRepository } from '../../../services/productRepository';
import { useOriginalOkr } from './useOriginalOkr';
vi.mock('../../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../../services/productRepository', () => ({ productRepository: { productLines: vi.fn().mockResolvedValue([{ id: 'p', name: '原产品', versions: [] }]) } }));
vi.mock('../../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../../services/customerDirectoryRepository', () => ({ customerDirectoryRepository: { opportunities: vi.fn().mockResolvedValue({ items: [] }) } }));
vi.mock('../../../services/reviewEvidenceRepository', () => ({ loadReviewEvidence: vi.fn().mockResolvedValue([]) }));
vi.mock('../../../services/okrRepository', () => ({ okrRepository: {
  records: vi.fn().mockResolvedValue([{ id: 'o', kind: 'objective', ownerId: 'me', periodKey: '2026-10', status: 'active', version: 2, payload: { title: '月度目标', keyResults: [{ id: 'kr', structureType: 'product', businessObject: '原产品', title: '迭代计划', weight: 100, progress: 35, details: [{ id: 'r', name: '原产品', version: 'V1', progress: 35 }] }] } }]),
  people: vi.fn().mockResolvedValue([{ id: 'me', name: '本人', department: '产品', rootFlag: 1, supervisorId: null }]),
  settings: vi.fn().mockResolvedValue({}), actionParents: vi.fn().mockResolvedValue([])
} }));
afterEach(cleanup);
it('updates cached KR detail names when the live product catalog changes without rereading stale records', async () => {
  let products = [{ id: 'p', name: '原产品', versions: [], nameAliases: [] as string[] }];
  vi.mocked(useApp).mockImplementation(() => ({ currentUser: { id: 'me', name: '本人', department: '产品', role: 'admin' }, addToast: vi.fn(), productLines: products }) as unknown as ReturnType<typeof useApp>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, rerender } = renderHook(() => useOriginalOkr(), { wrapper });
  await waitFor(() => expect(result.current.records).toHaveLength(1));
  products = [{ id: 'p', name: '最新产品', versions: [], nameAliases: ['原产品'] }];
  rerender();
  expect(result.current.records[0].payload.keyResults![0].details![0]).toMatchObject({ id: 'r', name: '最新产品', productLineId: 'p', progress: 35, version: 'V1' });
  expect(result.current.productLineOptions).toContain('最新产品');
  expect(result.current.productLineOptions).not.toContain('原产品');
  expect(productRepository.productLines).toHaveBeenCalledTimes(1);
  client.clear();
});
