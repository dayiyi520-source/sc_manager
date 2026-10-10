// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { productRepository } from '../../services/productRepository';
import { useWorkItemFieldConfig } from './useWorkItemFieldConfig';

vi.mock('../../services/productRepository', () => ({ productRepository: { workItemFieldConfigurations: vi.fn() } }));
afterEach(cleanup);

it.each(['requirement', 'design', 'dev', 'test', 'bug', 'presales', 'delivery', 'ops'])('requires creation dates for %s despite hidden legacy settings', async (categoryCode) => {
  for (const scene of ['CREATE', 'CREATE_CHILD'] as const) {
    vi.mocked(productRepository.workItemFieldConfigurations).mockResolvedValue({ categoryCode, scenes: [{ scene, fields: ['plannedStartDate', 'plannedEndDate'].map((fieldCode) => ({ fieldCode, visible: false, required: false })) }] } as never);
    const { result, unmount } = renderHook(() => useWorkItemFieldConfig(categoryCode, scene));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    for (const field of ['plannedStartDate', 'plannedEndDate']) {
      expect(result.current.visible(field)).toBe(true);
      expect(result.current.required(field)).toBe(true);
    }
    unmount();
  }
});

it('keeps creation dates required when configuration loading fails, without changing detail rules', async () => {
  vi.mocked(productRepository.workItemFieldConfigurations).mockRejectedValue(new Error('配置不可用'));
  for (const scene of ['CREATE', 'CREATE_CHILD', 'DETAIL'] as const) {
    const { result, unmount } = renderHook(() => useWorkItemFieldConfig('bug', scene));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    for (const field of ['plannedStartDate', 'plannedEndDate']) expect(result.current.required(field)).toBe(scene !== 'DETAIL');
    unmount();
  }
});
