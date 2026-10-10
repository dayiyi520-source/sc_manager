import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveTemplateValue } from '../../scripts/mock-research-template-plugin';

describe('项目产研模板持久化', () => {
  let directory: string;
  let file: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'research-template-'));
    file = join(directory, 'template.json');
    writeFileSync(file, '{}');
  });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));
  it('独立保存配置，重新读取保留结果，恢复不覆盖其他配置', () => {
    saveTemplateValue(file, 'researchTypes', [{ id: 'type', description: '修改' }], null);
    saveTemplateValue(file, 'researchAutomationSetting', false, null);
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    expect(saved.researchTypes[0].description).toBe('修改');
    saveTemplateValue(file, 'researchTypes', [{ id: 'type', description: '原描述' }], saved.researchTypes);
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ researchTypes: [{ id: 'type', description: '原描述' }], researchAutomationSetting: false });
  });
  it('旧页面保存冲突时保留已保存数据', () => {
    saveTemplateValue(file, 'researchTypes', [{ id: 'new' }], null);
    expect(() => saveTemplateValue(file, 'researchTypes', [{ id: 'stale' }], null)).toThrow('刷新');
    expect(JSON.parse(readFileSync(file, 'utf8')).researchTypes).toEqual([{ id: 'new' }]);
  });
  it('拒绝非模板字段和错误的数据形态', () => {
    expect(() => saveTemplateValue(file, '../other', [], null)).toThrow('不支持');
    expect(() => saveTemplateValue(file, 'researchTypes', {}, null)).toThrow('格式');
    expect(() => saveTemplateValue(file, 'researchAutomationSetting', [], null)).toThrow('格式');
    expect(readFileSync(file, 'utf8')).toBe('{}');
  });
});
