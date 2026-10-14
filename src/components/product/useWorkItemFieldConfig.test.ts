// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { productRepository } from '../../services/productRepository';
import { useWorkItemFieldConfig } from './useWorkItemFieldConfig';

vi.mock('../../services/productRepository', () => ({ productRepository: { workItemFieldConfigurations: vi.fn() } }));
afterEach(cleanup);

it.each(['requirement', 'design', 'dev', 'test', 'bug', 'presales', 'delivery', 'ops'])('requires creation dates for %s despite hidden legacy settings', async (categoryCode) => {
  for (const scene of ['CREATE'] as const) {
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
  for (const scene of ['CREATE', 'DETAIL'] as const) {
    const { result, unmount } = renderHook(() => useWorkItemFieldConfig('bug', scene));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    for (const field of ['plannedStartDate', 'plannedEndDate']) expect(result.current.required(field)).toBe(scene !== 'DETAIL');
    unmount();
  }
});

it('keeps bug creation and detail properties ordered and removes legacy relation fields', () => {
  const { result } = renderHook(() => useWorkItemFieldConfig('bug', 'CREATE'));
  expect(result.current.fields.filter(field => field.sort >= 0).sort((a,b) => a.sort - b.sort).map(field => field.fieldCode)).toEqual(['assignee','verifier','priority','productLine','version','taskType','plannedStartDate','plannedEndDate','expectedCompleteDate','estimatedHours','attachments']);
  for (const code of ['expectedGoal','children','support','hours','actualHours']) expect(result.current.visible(code)).toBe(false);
  expect(result.current.visible('relatedTasks')).toBe(true);
});
