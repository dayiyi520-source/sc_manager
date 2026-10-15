import { describe, expect, it } from 'vitest';
import { syncDesignProductNames, designGroupOf } from './designTaskPresentation';
import type { RequirementTask } from '../../types';

const task = { id: 'd', designVariant: 'product', productLineId: 'p', productLineName: '旧名称', title: '旧名称设计', versionName: 'V1.0' } as RequirementTask;
describe('design product names', () => {
  it('uses the product identity for source labels and grouping across successive renames', () => {
    for (const name of ['新名称', '再次改名']) {
      const result = syncDesignProductNames([task], [{ id: 'p', name }])[0];
      expect(result).toMatchObject({ productLineName: name, title: '旧名称设计', versionName: 'V1.0' });
      expect(designGroupOf(result)).toEqual({ key: 'p', name });
    }
  });
  it('resolves legacy names only when the alias identifies exactly one product', () => {
    const legacy = { ...task, productLineId: '' };
    const product = { id: 'p', name: '新名称', nameAliases: ['旧名称'] };
    expect(syncDesignProductNames([legacy], [product])[0]).toMatchObject({ productLineId: 'p', productLineName: '新名称' });
    expect(syncDesignProductNames([legacy], [product, { ...product, id: 'other' }])[0]).toBe(legacy);
  });
  it('preserves unresolved identities, empty catalogs and other design types', () => {
    expect(syncDesignProductNames([task], [])[0]).toBe(task);
    expect(syncDesignProductNames([task], [{ id: 'other', name: '旧名称' }])[0]).toBe(task);
    for (const designVariant of ['project', 'other'] as const) {
      const other = { ...task, designVariant };
      expect(syncDesignProductNames([other], [{ id: 'p', name: '新名称' }])[0]).toBe(other);
    }
  });
});
