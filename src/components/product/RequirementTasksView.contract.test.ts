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

  it('keeps the persisted product-line code read-only in settings', () => {
    expect(productLineSource).toContain('value={code} disabled readOnly');
    expect(productLineSource).not.toContain('编码创建后不可更改');
    const saveBasicInfo = productLineSource.slice(
      productLineSource.indexOf('const saveBasicInfo'),
      productLineSource.indexOf('const sections')
    );
    expect(saveBasicInfo).not.toContain('code: code.trim()');
  });

  it('allows a persisted product website to be edited above visibility', () => {
    const basicInfo = productLineSource.slice(
      productLineSource.indexOf("section === 'basic'"),
      productLineSource.indexOf("section === 'members'")
    );
    expect(basicInfo).toContain('<span>产品线网址</span>');
    expect(basicInfo.indexOf('<span>产品线网址</span>')).toBeLessThan(basicInfo.indexOf('<span>可见范围</span>'));
    expect(productLineSource).toContain("website: normalizedWebsite || ''");
    expect(productLineSource).toContain('loading={isSavingBasic}');
  });

  it('opens a selected version from the weekly fixed-column gantt view', () => {
    expect(productLineSource).toContain('时间区间（按周）');
    expect(productLineSource).toContain("sessionStorage.setItem('shichuang.productLineTargetVersionId', versionId)");
    expect(productLineSource).toContain('product-line-gantt-scroll');
    expect(productLineSource).toContain('product-line-gantt-time-heading');
    expect(productLineSource).toContain('product-line-gantt-tick-first');
    expect(productLineSource).toContain('product-line-gantt-tick-last');
    expect(productLineSource).toContain("width: `max(100%, ${timelineWidth}px)`");
  });

  it('uses category icons instead of text tags before task titles', () => {
    expect(requirementSource).toContain('workItemCategoryIcon');
    expect(requirementSource).toContain('work-item-category-icon');
    expect(requirementSource).not.toContain('shrink-0 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] px-1.5');
  });

  it('keeps children and relations in dedicated detail tabs', () => {
    expect(requirementSource).toContain("value: 'relations'");
    expect(requirementSource).toContain("value: 'children'");
    expect(requirementSource).toContain('title="添加子任务"');
    expect(requirementSource).toContain('父级任务');
  });

  it('replaces the detail drawer while creating a child and maps API category labels', () => {
    expect(requirementSource).toContain('{selectedTask && !childModalOpen && (');
    expect(requirementSource).toContain("item.category === workItemCategoryLabel[childCategory]");
    expect(requirementSource).toContain("selectedTask.category === 'bug'");
    expect(requirementSource).toContain('工作项类型读取失败');
    expect(requirementSource).toContain('onClose={cancelChildCreation}');
    expect(requirementSource).toMatch(/const cancelChildCreation = \(\) => \{[\s\S]*setChildModalOpen\(false\);[\s\S]*setSelectedTask\(null\);[\s\S]*\};/);
    expect(requirementSource).toMatch(/addToast\('success', '子任务已创建'\);[\s\S]*setChildModalOpen\(false\);[\s\S]*setSelectedTask\(null\);/);
    expect(requirementSource).toContain('await Promise.allSettled(refreshes)');
  });

  it('puts product line first and uses Ant Design for both hour fields', () => {
    const properties = requirementSource.slice(requirementSource.indexOf('properties={<Form layout="vertical" className="requirement-create-properties" requiredMark>'));
    expect(properties.indexOf('label="所属产品线"')).toBeLessThan(properties.indexOf('label={`${itemLabel}类型`}'));
    expect(requirementSource).toContain('<DetailNumberInput label="预计工时（小时）"');
    expect(requirementSource).toContain('label="实际工时（小时）"><InputNumber');
    expect(requirementSource).toContain('className="requirement-hours-input w-full"');
    expect(requirementSource).not.toContain('<Form.Item label="验收标准"');
  });

  it('uses configured workflow states and keeps parents with children read-only', () => {
    expect(requirementSource).toContain('productRepository.workItemTransitions');
    expect(requirementSource).toContain('productRepository.transitionWorkItem');
    expect(requirementSource).toContain("if (task.hasChildren) return <WorkItemStatusTag");
    expect(requirementSource).toContain('options.statuses');
  });
});
