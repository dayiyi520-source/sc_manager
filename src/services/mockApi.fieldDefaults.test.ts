/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useWorkItemFieldConfig } from '../components/product/useWorkItemFieldConfig';

afterEach(cleanup);
describe('固定任务字段', () => {
  it.each(['requirement', 'design', 'dev', 'test'])('%s 表单保留关联项，不恢复旧子任务及字段', category => {
    const { result } = renderHook(() => useWorkItemFieldConfig(category, 'CREATE'));
    expect(result.current.visible('collaborationItems')).toBe(true);
    expect(result.current.visible('relatedTasks')).toBe(category !== 'requirement');
    for (const field of ['expectedGoal', 'children', 'hours', 'cc']) expect(result.current.visible(field)).toBe(false);
    expect(result.current.visible('estimatedHours')).toBe(true);
  });
});
