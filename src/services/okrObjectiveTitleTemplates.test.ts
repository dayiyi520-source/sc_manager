import { describe, expect, it } from 'vitest';
import { normalizeObjectiveTitleTemplates, validateObjectiveTitleTemplates, PRODUCT_KR_STAGES } from './okrObjectiveTitleTemplates';
import type { OkrSettings, OkrObjectiveTitleTemplate } from './okrRepository';
const row: OkrObjectiveTitleTemplate = { id: 'o', department: '研发', title: '版本交付', guidance: '', enabled: true, krTypes: ['product'] };
describe('department objective templates', () => {
  it('validates KR selection and rejects duplicate titles within one department', () => {
    expect(validateObjectiveTitleTemplates([row])).toBeUndefined();
    expect(validateObjectiveTitleTemplates([{ ...row, krTypes: [] }])).toContain('至少选择');
    expect(validateObjectiveTitleTemplates([row, { ...row, id: 'o2' }])).toContain('重复');
    expect(validateObjectiveTitleTemplates([row, { ...row, id: 'o2', department: '设计' }])).toBeUndefined();
  });
  it('migrates legacy types only when missing and never replaces an explicit selection', () => {
    const settings = { templates: [{ department: '研发', type: 'support', fields: [] }], objectiveTitleTemplates: [{ ...row, krTypes: undefined }, row] } as OkrSettings;
    expect(normalizeObjectiveTitleTemplates(settings).map(item => item.krTypes)).toEqual([['support'], ['product']]);
    expect(PRODUCT_KR_STAGES).toEqual(['产品设计', 'UI设计', '产品开发', '测试验收', '上线运维']);
  });
});
