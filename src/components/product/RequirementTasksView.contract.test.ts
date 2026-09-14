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
});
