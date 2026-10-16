// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import { productRepository } from './productRepository';

beforeEach(() => localStorage.clear());
it.each([
  ['/api/work-item-field-configurations?categoryCode=requirement', 'GET'],
  ['/api/work-item-field-configurations/requirement/CREATE', 'PUT'],
  ['/api/product-lines/p/child-type-rules', 'GET'],
])('removed route %s rejects stale clients without changing saved data', async (path, method) => {
  localStorage.setItem('shichuang.frontend.mock.workItems', '[{"id":"existing"}]');
  await expect(mockApiRequest(path, { method, body: method === 'PUT' ? JSON.stringify({ fields: [] }) : undefined })).rejects.toThrow('功能已移除');
  expect(localStorage.getItem('shichuang.frontend.mock.workItems')).toBe('[{"id":"existing"}]');
});
it('repository no longer exposes field configuration operations', () => {
  expect(productRepository).not.toHaveProperty('workItemFieldConfigurations');
  expect(productRepository).not.toHaveProperty('saveWorkItemFieldConfigurations');
});
