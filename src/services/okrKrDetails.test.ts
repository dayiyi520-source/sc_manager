import { describe, expect, it } from 'vitest';
import { krDetails, krDetailsError } from './okrKrDetails';
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
