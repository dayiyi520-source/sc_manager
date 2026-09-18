import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { preferredWorkItemTypeName } from './workItemTypeDefaults';

const productLinesSource = readFileSync(new URL('./ProductLinesView.tsx', import.meta.url), 'utf8');
const settingsSource = readFileSync(new URL('./ProductLineDetailView.tsx', import.meta.url), 'utf8');
const tasksSource = readFileSync(new URL('./RequirementTasksView.tsx', import.meta.url), 'utf8');
const datePickerStyles = readFileSync(new URL('../../styles/antd-override.css', import.meta.url), 'utf8');

describe('product line work item defaults', () => {
  it('keeps a valid explicit selection and otherwise chooses the default type', () => {
    const items = [
      { name: '产品类型需求', isDefault: true },
      { name: '技术类需求', isDefault: false },
    ];
    expect(preferredWorkItemTypeName(items, '技术类需求')).toBe('技术类需求');
    expect(preferredWorkItemTypeName(items, '')).toBe('产品类型需求');
    expect(preferredWorkItemTypeName([{ name: '其他需求' }], '')).toBe('');
  });

  it('creates product lines with the template enabled by default', () => {
    expect(productLinesSource).toContain('useState(true)');
    expect(productLinesSource).toContain('initializeWorkItemTemplate');
    expect(productLinesSource).toContain('aria-label="工作项设置模板"');
    expect(productLinesSource).toContain('if (!saved) return');
  });

  it('edits and labels the default work item type', () => {
    expect(settingsSource).toContain('aria-label="是否默认"');
    expect(settingsSource).toContain("<Tag color=\"blue\">默认</Tag>");
    expect(settingsSource).toContain('isDefault: Boolean(item.isDefault)');
  });

  it('keeps planned completion optional and lets Ant Design own DatePicker internals', () => {
    expect(tasksSource).toContain('<Form.Item label="计划完成时间"><DatePicker');
    expect(tasksSource).not.toContain('<Form.Item label="计划完成时间" required>');
    expect(datePickerStyles).toContain('.tech-shell .ant-picker .ant-picker-input > input');
    expect(datePickerStyles).not.toContain('.task-page .work-item-panel .ant-picker .ant-picker-input');
    expect(datePickerStyles).not.toContain('.ant-picker-cell-inner');
  });
});
