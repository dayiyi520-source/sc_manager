// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { MOCK_PRODUCT_LINES } from '../../data/mockSnapshot';
import { mockApiRequest } from '../../services/mockApi';
import type { ProductLine } from '../../types';
import { productLineDisplayStatus } from './productLinePresentation';

describe('iteration persistence', () => {
  const productId = MOCK_PRODUCT_LINES[0].id;
  const endpoint = `/api/product-lines/${productId}/versions`;
  const request = (path: string, method: string, body: object) => mockApiRequest(path, { method, body: JSON.stringify(body) });
  const readProduct = async () => (await mockApiRequest('/api/product-lines') as ProductLine[]).find((line) => line.id === productId)!;

  beforeEach(() => {
    localStorage.clear();
    // Isolate lifecycle assertions from snapshot history.
    localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ ...MOCK_PRODUCT_LINES[0], versions: [] }]));
  });

  it('persists creation, start and completion and derives the product status from the reloaded data', async () => {
    expect(productLineDisplayStatus(await readProduct())).toBe('空闲中');
    await request(endpoint, 'POST', { name: '状态验证', code: 'TEST-1', ownerName: '测试负责人', status: '已完成', endDate: '2026-10-10' });
    let product = await readProduct();
    const iteration = product.versions![0];
    expect(iteration.status).toBe('待开始');
    expect(iteration.releaseDate).toBe('');
    expect(productLineDisplayStatus(product)).toBe('迭代中');
    await request(`${endpoint}/${iteration.id}`, 'PUT', { status: '进行中' });
    expect((await readProduct()).versions![0]).toMatchObject({ status: '进行中', statusPhase: '处理中' });
    await request(`${endpoint}/${iteration.id}`, 'PUT', { status: '已完成' });
    product = await readProduct();
    expect(product.versions![0]).toMatchObject({ status: '已完成', statusPhase: '已完成', releaseDate: '' });
    expect(productLineDisplayStatus(product)).toBe('空闲中');
    await expect(request(`${endpoint}/${iteration.id}`, 'PUT', { status: '进行中' })).rejects.toThrow('迭代状态已变化');
    expect(productLineDisplayStatus(await readProduct())).toBe('空闲中');
  });

  it('rejects missing products and versions instead of reporting a successful save', async () => {
    await expect(request('/api/product-lines/missing/versions', 'POST', {})).rejects.toThrow('产品不存在');
    await expect(request(`${endpoint}/missing`, 'PUT', { status: '进行中' })).rejects.toThrow('版本不存在');
  });
});
