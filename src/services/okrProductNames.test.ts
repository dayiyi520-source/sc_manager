import { describe, expect, it } from 'vitest';
import { syncOkrProductNames } from './okrProductNames';
import type { OkrRecord } from './okrRepository';
import type { ProductLine } from '../types';
const products = [{ id: 'p', name: '新产品', nameAliases: ['旧产品'], versions: [{ id: 'v', code: 'V1' }] }] as ProductLine[];
const record = (payload: Record<string, unknown>) => ({ id: 'o', kind: 'objective', version: 3, payload: { title: '旧产品名称在正文不替换', ...payload } } as OkrRecord);
describe('KR product identity and current display names', () => {
  it('updates product rows and nested actions while preserving dates, progress, row ids and free text', () => {
    const original = record({ keyResults: [{ id: 'kr', structureType: 'product', businessObject: '旧产品', details: [{ id: 'r', name: '旧产品', version: 'V1', progress: 40, stage: '研发', plannedStartDate: '2026-10-01' }], executionActions: [{ id: 'a', title: '旧产品正文不替换', details: [{ id: 'ar', name: '旧产品', version: 'V1' }] }] }] });
    const next = syncOkrProductNames([original], products)[0];
    expect(next.payload.keyResults![0]).toMatchObject({ businessObject: '新产品', details: [{ id: 'r', name: '新产品', productLineId: 'p', version: 'V1', progress: 40, stage: '研发', plannedStartDate: '2026-10-01' }], executionActions: [{ title: '旧产品正文不替换', details: [{ id: 'ar', name: '新产品', productLineId: 'p' }] }] });
    expect(next.payload.title).toBe(original.payload.title);
    expect(original.payload.keyResults![0].details![0].name).toBe('旧产品');
    expect(syncOkrProductNames([next], products)[0]).toEqual(next);
  });
  it('does not mistake a delivery project name for a product name', () => {
    const original = record({ keyResults: [{ id: 'kr', structureType: 'delivery', businessObject: '旧产品', details: [{ id: 'r', name: '旧产品', version: '旧产品', targetStage: '验收' }] }] });
    expect(syncOkrProductNames([original], products)[0].payload.keyResults![0]).toMatchObject({ businessObject: '旧产品', details: [{ name: '旧产品', version: '新产品', targetStage: '验收' }] });
  });
  it('uses stable ids and leaves missing or ambiguous products unchanged', () => {
    const original = record({ keyResults: [{ id: 'kr', structureType: 'product', businessObject: '旧产品', details: [{ id: 'r', name: '旧产品', productLineId: 'missing', version: 'V1' }, { id: 'r2', name: '旧产品', productLineId: 'p', version: 'V1' }] }] });
    const duplicate = [...products, { id: 'other', name: '另一产品', nameAliases: ['旧产品'] } as ProductLine];
    const kr = syncOkrProductNames([original], duplicate)[0].payload.keyResults![0];
    expect(kr.businessObject).toBe('旧产品');
    expect(kr.details![0].name).toBe('旧产品');
    expect(kr.details![1].name).toBe('新产品');
  });
});

it('preserves a historical version-as-name row instead of interpreting it as a product', () => {
  const original = record({ keyResults: [{ id: 'legacy', structureType: 'product', businessObject: '旧产品', details: [{ id: 'legacy-detail', name: 'V1', progress: 10 }] }] });
  const kr = syncOkrProductNames([original], products)[0].payload.keyResults![0];
  expect(kr.businessObject).toBe('新产品');
  expect(kr.details).toEqual(original.payload.keyResults![0].details);
});
it('updates current pending-change payload but preserves historical approval evidence', () => {
  const original = record({ keyResults: [{ id: 'kr', structureType: 'product', businessObject: '旧产品', details: [{ id: 'r', name: '旧产品', version: 'V1' }] }] });
  original.changeRequest = { id: 'change', status: 'pending', reason: '名称同步', reviewerId: 'reviewer', baseVersion: 3, requestedAt: '2026-10-15', payload: original.payload, previousPayload: original.payload };
  const next = syncOkrProductNames([original], products)[0];
  expect(next.changeRequest!.payload.keyResults![0].details![0].name).toBe('新产品');
  expect(next.changeRequest!.previousPayload!.keyResults![0].details![0].name).toBe('旧产品');
});
