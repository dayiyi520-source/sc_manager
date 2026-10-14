import { describe, expect, it } from 'vitest';
import { krDetails, krDetailsError, supervisorKrTitle } from './okrKrDetails';
import { planChanged } from './okrThreeLevelRules';
import type { OkrKr } from './okrRepository';

const kr: OkrKr = { id: 'k', title: '版本计划', weight: 100, progress: 0, deadline: '2026-10-31', details: [
  { id: 'v1', name: 'V1', stage: 'UI设计', plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-10' },
  { id: 'v2', name: 'V2', stage: '上线', plannedStartDate: '2026-10-11', plannedEndDate: '2026-10-30' },
] };
describe('KR 明细计划校验', () => {
  it('accepts independent dates and stages within one KR', () => {
    expect(krDetailsError(kr)).toBeUndefined();
  });
  it.each([
    [{ ...kr.details![1], plannedStartDate: undefined }, '有效计划'],
    [{ ...kr.details![1], plannedEndDate: undefined }, '有效计划'],
    [{ ...kr.details![1], plannedStartDate: '2026-02-30' }, '有效计划'],
    [{ ...kr.details![1], plannedStartDate: '2026-10-31' }, '早于'],
    [{ ...kr.details![1], plannedEndDate: '2026-11-01' }, '超过'],
    [{ ...kr.details![1], stage: '' }, '阶段'],
    [{ ...kr.details![1], name: 'V1' }, '重复'],
  ])('rejects invalid row %#', (row, message) => {
    expect(krDetailsError({ ...kr, details: [kr.details![0], row] })).toContain(message);
  });
  it('keeps legacy records readable without rewriting them', () => {
    const legacy = { ...kr, details: undefined, version: 'V1', stage: '设计' };
    expect(krDetails(legacy)).toMatchObject([{ name: 'V1', stage: '设计', plannedEndDate: '2026-10-31' }]);
    expect(legacy.details).toBeUndefined();
  });
  it('detects detail date changes even when the KR deadline stays unchanged', () => {
    expect(planChanged({ title: 'O', keyResults: [kr] }, { title: 'O', keyResults: [{ ...kr, details: kr.details!.map(row => ({ ...row, plannedStartDate: '2026-10-02' })) }] })).toBe(true);
  });
  it('allows filling a missing legacy start while preserving its original end', () => {
    const legacy = { ...kr, details: undefined, version: 'V1', stage: '设计' };
    expect(planChanged({title:'O',keyResults:[legacy]}, {title:'O',keyResults:[{...legacy,details:krDetails(legacy).map(row=>({...row,plannedStartDate:'2026-10-01'}))}]})).toBe(false);
  });
});

it('allows multiple versions of one product and the same version name across products', () => {
  const row = { id: 'a', name: '产品甲', version: 'V1', stage: '设计', plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-10' };
  const productKr = { ...kr, structureType: 'product' as const, businessObject: '产品甲,产品乙', details: [row, { ...row, id: 'b', version: 'V2' }, { ...row, id: 'c', name: '产品乙' }] };
  expect(krDetailsError(productKr)).toBeUndefined();
  expect(krDetailsError({ ...productKr, details: [row, { ...row, id: 'b' }] })).toContain('重复');
  expect(krDetailsError({ ...productKr, details: [{ ...row, version: undefined }] })).toContain('迭代版本');
});

it('keeps historical product rows with a version name readable and valid', () => {
  const legacy = { ...kr, structureType: 'product' as const, businessObject: '产品甲' };
  expect(krDetailsError(legacy)).toBeUndefined();
  expect(krDetails(legacy)[0].name).toBe('V1');
});

it('derives supervisor KR summaries from saved child rows and leaves legacy titles readable', () => {
 const base={id:'k',title:'历史内容',weight:100,progress:0};
 expect(supervisorKrTitle({...base,structureType:'product',details:[{id:'a',name:'甲',version:'V1'},{id:'b',name:'甲',version:'V2'}]})).toBe('按期完成2个产品版本迭代计划 · 达到对应的验收阶段');
 expect(supervisorKrTitle({...base,structureType:'delivery',details:[{id:'a',name:'项目甲',version:'产品甲'}]})).toBe('按期完成1个项目包含的产品推进计划 · 达到目标里程碑');
 expect(supervisorKrTitle({...base,structureType:'product'})).toBe('历史内容');
});
