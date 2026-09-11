import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('VersionIterationView delete confirmation', () => {
  it('uses the themed Ant Design confirmation instead of a native browser dialog', () => {
    const source = readFileSync(new URL('./VersionIterationView.tsx', import.meta.url), 'utf8');

    expect(source).toContain('showDeleteConfirm({');
    expect(source).toContain("content: '删除后不可恢复，请确认是否继续。'");
    expect(source).toContain('onOk: () => {');
    expect(source).not.toContain('window.confirm');
  });
});
