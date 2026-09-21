import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./TestTaskWorkspace.tsx', import.meta.url), 'utf8');

describe('test task detail contract', () => {
  it('keeps case-authoring children on the standard test task detail page', () => {
    expect(source).not.toContain("if (typeName === '用例编写') return");
    expect(source).toContain("{ key: 'basic', label: '基本信息'");
    expect(source).toContain("{ key: 'plan', label: '测试计划'");
  });

  it('shows the product task title with truncation and puts the parent reference below the metadata row', () => {
    expect(source).not.toContain('所属需求：');
    expect(source).toContain('产品任务：{truncateTitle(productTaskTitle)}');
    expect(source).toContain('value.slice(0, maxLength)');
    expect(source).toContain('title={productTaskTitle}');
    expect(source.indexOf('className="test-task-detail-meta"')).toBeLessThan(source.indexOf('className="test-task-parent-reference"'));
  });
});
