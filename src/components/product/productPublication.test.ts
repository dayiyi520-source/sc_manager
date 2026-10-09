// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { MOCK_PRODUCT_LINES, MOCK_VERSIONS } from '../../data/mockSnapshot';
import { mockApiRequest } from '../../services/mockApi';
import { formatVersionPublishedAt, latestReleasedVersion } from './productLinePresentation';
import type { ProductLine } from '../../types';

describe('product publication snapshot', () => {
  beforeEach(() => localStorage.clear());

  it('preserves the actual publication timestamp in both product summaries and iterations', () => {
    const product = MOCK_PRODUCT_LINES.find((item) => item.name === '师创砺知堂')!;
    const version = latestReleasedVersion(product)!;
    expect(version.code).toBe('V1.0.5');
    expect(formatVersionPublishedAt(version)).toBe('2026-09-20 00:00');
    expect(MOCK_VERSIONS.find((item) => item.id === version.id)?.releaseDate).toBe(version.releaseDate);
  });

  it('repairs cached missing publication dates without overwriting product edits or an existing date', async () => {
    const product = MOCK_PRODUCT_LINES.find((item) => item.name === '师创砺知堂')!;
    const cached: ProductLine = { ...product, description: '保留编辑', versions: product.versions!.map((version) => ({ ...version, releaseDate: undefined })) };
    localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([cached]));
    const products = await mockApiRequest('/api/product-lines');
    expect(products[0].description).toBe('保留编辑');
    expect(formatVersionPublishedAt(latestReleasedVersion(products[0]))).toBe('2026-09-20 00:00');
    cached.versions![0].releaseDate = '2026-09-21';
    localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([cached]));
    expect((await mockApiRequest('/api/product-lines'))[0].versions[0].releaseDate).toBe('2026-09-21');
  });

  it('does not manufacture an online version or publication date from planned dates', () => {
    expect(latestReleasedVersion({ versions: [{ id: 'draft', name: '草稿', status: '进行中', endDate: '2026-10-09' }] })).toBeUndefined();
    expect(latestReleasedVersion({ versions: [] })).toBeUndefined();
  });
});
