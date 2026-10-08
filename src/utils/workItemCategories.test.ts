import { describe, expect, it } from 'vitest';
import { categoryCode, categoryValue, enabledCategoryOptions } from './workItemCategories';
import type { WorkItemCategoryDefinition } from '../services/productRepository';

describe('work item category compatibility', () => {
  it('keeps existing stored values and custom stable codes across rename', () => {
    expect(categoryValue('requirement')).toBe('需求');
    expect(categoryCode('需求')).toBe('requirement');
    expect(categoryValue('ops_task')).toBe('ops_task');
    expect(categoryCode('ops_task')).toBe('ops_task');
  });
  it('uses display names, configured order and enabled state without changing source', () => {
    const items = [
      { code: 'requirement', name: '产品', displayName: '产品任务', sort: 2, enabled: true, iconKey: 'requirement' },
      { code: 'ops_task', name: '运维', displayName: '运维任务', sort: 1, enabled: true, iconKey: 'dev' },
      { code: 'disabled', displayName: '停用分类', sort: 0, enabled: false },
    ] as WorkItemCategoryDefinition[];
    expect(enabledCategoryOptions(items).map(({ value, label }) => ({ value, label }))).toEqual([
      { value: 'ops_task', label: '运维任务' }, { value: '需求', label: '产品任务' },
    ]);
    expect(items[0].code).toBe('requirement');
  });
});
