// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useWorkItemFieldConfig } from './useWorkItemFieldConfig';

afterEach(cleanup);

it.each(['requirement', 'design', 'dev', 'test', 'bug', 'presales', 'delivery', 'ops'])('requires creation dates for %s with fixed fields', async (categoryCode) => {
  for (const scene of ['CREATE'] as const) {
    const { result, unmount } = renderHook(() => useWorkItemFieldConfig(categoryCode, scene));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    for (const field of ['plannedStartDate', 'plannedEndDate']) {
      expect(result.current.visible(field)).toBe(true);
      expect(result.current.required(field)).toBe(true);
    }
    unmount();
  }
});

it('keeps fixed creation dates required without changing detail rules', async () => {
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
