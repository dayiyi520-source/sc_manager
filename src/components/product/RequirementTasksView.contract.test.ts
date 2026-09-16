import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const requirementSource = readFileSync(new URL('./RequirementTasksView.tsx', import.meta.url), 'utf8');
const productLineSource = readFileSync(new URL('./ProductLineDetailView.tsx', import.meta.url), 'utf8');

describe('requirement task Ant Design contract', () => {
  it('uses flat Ant Design controls for list filters and the create form', () => {
    expect(requirementSource).toContain('Segmented');
    expect(requirementSource).toContain('Popover');
    expect(requirementSource).toContain('mode="multiple"');
    expect(requirementSource).toContain('<Form layout="vertical"');
    expect(requirementSource).not.toContain('Cascader');
  });

  it('exposes the selected product-line detail tab state', () => {
    expect(productLineSource.match(/aria-selected=/g)).toHaveLength(3);
  });

  it('keeps children and relations in dedicated detail tabs', () => {
    expect(requirementSource).toContain("value: 'relations'");
    expect(requirementSource).toContain("value: 'children'");
    expect(requirementSource).toContain('title="添加子任务"');
    expect(requirementSource).toContain('父级任务');
  });

  it('uses Ant Design for estimated hours and omits acceptance criteria from create', () => {
    expect(requirementSource).toContain('<DetailNumberInput label="预计工时（小时）"');
    expect(requirementSource).not.toContain('<Form.Item label="验收标准"');
  });
});
