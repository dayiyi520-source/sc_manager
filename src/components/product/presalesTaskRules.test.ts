import { describe, expect, it } from 'vitest';
import { inferLegacyPresalesType, presalesCustomerRequired, presalesSpecialFields, PRESALES_TASK_TYPES, readPresalesTaskFields, validatePresalesAssociations } from './presalesTaskRules';

describe('presales task type rules', () => {
  it('exposes the supported types in the required order', () => {
    expect(PRESALES_TASK_TYPES).toEqual(['标前工作', '招投标工作', '标后工作', '售前宣发', '其他']);
  });

  it.each([
    ['标前工作', '', '请选择关联商机'],
    ['招投标工作', '', '请选择关联招投标'],
    ['标后工作', '', undefined],
    ['售前宣发', '', undefined],
    ['其他', '', undefined],
    ['标前工作', 'opportunity-1', '请选择关联客户'],
    ['招投标工作', 'bidding-1', '请选择关联客户'],
    ['', '', '请选择售前任务类型'],
  ] as const)('validates %s association rules', (type, sourceId, expected) => {
    expect(validatePresalesAssociations(type, sourceId)).toBe(expected);
  });

  it('requires a customer only for pre-bid and tender tasks', () => {
    expect(validatePresalesAssociations('标前工作', 'o1', 'c1')).toBeUndefined();
    expect(validatePresalesAssociations('招投标工作', 'b1', 'c1')).toBeUndefined();
    for (const type of ['标后工作', '售前宣发', '其他']) {
      expect(presalesCustomerRequired(type)).toBe(false);
      expect(validatePresalesAssociations(type, '', '')).toBeUndefined();
    }
  });

  it('reads object and JSON special fields without inventing a type for legacy sources', () => {
    expect(readPresalesTaskFields('{"presalesType":"其他"}')).toEqual({ presalesType: '其他' });
    expect(readPresalesTaskFields('{broken')).toEqual({});
    expect(inferLegacyPresalesType({ biddingId: 'b1' })).toBe('');
    expect(inferLegacyPresalesType({ opportunityId: 'o1' })).toBe('');
    expect(inferLegacyPresalesType({})).toBe('');
  });

  it('persists only the selected source kind and preserves an optional type without a source', () => {
    expect(presalesSpecialFields('标前工作', { id: 'o1', name: '商机甲' })).toEqual({ presalesType: '标前工作', opportunityId: 'o1', opportunityName: '商机甲' });
    expect(presalesSpecialFields('招投标工作', { id: 'b1', name: '招投标甲' })).toEqual({ presalesType: '招投标工作', biddingId: 'b1', biddingName: '招投标甲' });
    expect(presalesSpecialFields('其他')).toEqual({ presalesType: '其他' });
  });
});
