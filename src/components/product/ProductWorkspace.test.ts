// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateResponsibilities } from './ProductResponsibilitiesSettings';
import { validateProductDocument } from './ProductDocumentsPanel';
import { sanitizeProductDocument } from './productDocumentHtml';
import { loadProductTaskAllocation } from './ProductTaskAllocationView';
import { productRepository } from '../../services/productRepository';
import { mockApiRequest } from '../../services/mockApi';
import type { ProductLine } from '../../types';
import { responsibilitySummary, normalizeResponsibilityNames } from './productResponsibilityPresentation';

describe('product workspace business rules', () => {
  beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
  it('requires all three primary owners, permits multiple secondary owners, rejects duplicates', () => {
    const valid = { requirementOwnerUserId: 'a', techOwnerUserId: 'b', testOwnerUserId: 'c' };
    expect(validateResponsibilities(valid)).toBe('');
    expect(validateResponsibilities({ ...valid, testOwnerUserId: '' })).toContain('测试责任人');
    expect(validateResponsibilities({ ...valid, techOwnerSecondaryUserId: 'b' })).toContain('不能相同');
    expect(validateResponsibilities({ ...valid, techOwnerSecondaryUserId: ['d', 'e'] })).toBe('');
    expect(normalizeResponsibilityNames('张三、李四')).toEqual(['张三', '李四']);
    expect(responsibilitySummary(['张三', '李四', '王五'])).toEqual({ label: '张三 +2', title: '张三、李四、王五' });
  });
  it('rejects empty document names and content while preserving safe tables and images', () => {
    expect(validateProductDocument('', '<p>正文</p>')).toContain('名称');
    expect(validateProductDocument('介绍', '<p><br></p>')).toContain('内容');
    expect(validateProductDocument('介绍', '<img src="data:image/png;base64,abcd">')).toBe('');
    const safe = sanitizeProductDocument('<script>alert(1)</script><table><tr><td onclick="x()">正文</td></tr></table><a href="javascript:x()">链接</a>');
    expect(safe).toContain('<table>'); expect(safe).not.toMatch(/script|onclick|javascript/);
  });
  it('loads all product task pages and derives allocation only from current product relations', async () => {
    vi.spyOn(productRepository, 'workItems').mockImplementation(async (line, category, _keyword, options) => ({ page: {
      total: category === 'requirement' ? 2 : 1,
      items: category === 'requirement' ? [{ id: options?.page === 2 ? 'r2' : 'r1', code: 'P', category, title: '产品任务', productLineId: line }] : [{ id: 'd1', code: 'D', category, title: '研发任务', productLineId: line, requirementId: 'r2' }]
    } }));
    const rows = await loadProductTaskAllocation([{ id: 'line', name: '产品' } as ProductLine], 'dev');
    expect(rows.map((row) => [row.id, row.allocated])).toEqual([['r1', false]]);
  });
  it('persists three document categories and explicit deletion through the frontend adapter', async () => {
    const line = await mockApiRequest('/api/product-lines', { method: 'POST', body: JSON.stringify({ name: '文档产品', code: 'docs' }) });
    const document = { name: '介绍.html', source: 'online', html: '<p>内容</p>', size: 12, operatorName: '成员', updatedAt: '2026-10-09T00:00:00Z' };
    await mockApiRequest(`/api/product-lines/${line.id}`, { method: 'PUT', body: JSON.stringify({ documents: { introduction: document, manual: document } }) });
    let lines = await mockApiRequest('/api/product-lines');
    expect(lines.find((item: ProductLine) => item.id === line.id).documents.introduction.html).toBe('<p>内容</p>');
    await mockApiRequest(`/api/product-lines/${line.id}`, { method: 'PUT', body: JSON.stringify({ documents: { introduction: null, manual: document } }) });
    lines = await mockApiRequest('/api/product-lines');
    expect(lines.find((item: ProductLine) => item.id === line.id).documents).toMatchObject({ introduction: null, manual: document });
  });
  it('persists project and independent associations and defaults collaboration only when absent', async () => {
    const line = await mockApiRequest('/api/product-lines', { method: 'POST', body: JSON.stringify({ name: '任务产品', code: 'tasks' }) });
    const types = await mockApiRequest(`/api/product-lines/${line.id}/work-item-types?category=requirement`);
    const create = (extra: object) => mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ title: '协同任务', productLineId: line.id, category: 'requirement', taskTypeId: types[0].id, projectId: 'p1', projectName: '项目一', sourceWorkOrderIds: ['w1'], relatedTaskIds: ['d1', 't1'], ...extra }) });
    const task = await create({ needsCollaboration: [] });
    const detail = await mockApiRequest(`/api/work-items/${task.id}`);
    expect(detail).toMatchObject({ projectId: 'p1', sourceWorkOrderIds: ['w1'], relatedTaskIds: ['d1', 't1'], needsCollaboration: [] });
    const defaultTask = await create({});
    expect((await mockApiRequest(`/api/work-items/${defaultTask.id}`)).needsCollaboration).toEqual(['dev', 'test']);
  });
  it('routes explicit collaboration selections independently', async () => {
    vi.spyOn(productRepository, 'workItems').mockImplementation(async (line, category) => ({ page: { total: category === 'requirement' ? 3 : 0, items: category === 'requirement' ? [
      { id: 'design-only', code: 'P1', category, title: '设计', productLineId: line, needsCollaboration: ['design'] },
      { id: 'none', code: 'P2', category, title: '无协同', productLineId: line, needsCollaboration: [] },
      { id: 'default', code: 'P3', category, title: '历史', productLineId: line }
    ] : [] } }));
    const lines = [{ id: 'line', name: '产品' } as ProductLine];
    expect((await loadProductTaskAllocation(lines, 'design')).map((item) => item.id)).toEqual(['design-only']);
    expect((await loadProductTaskAllocation(lines, 'dev')).map((item) => item.id)).toEqual(['default']);
  });
  it('inherits template types and preserves product overrides after refresh', async () => {
    const line = await mockApiRequest('/api/product-lines', { method: 'POST', body: JSON.stringify({ name: '模板产品', code: 'templates' }) });
    const inherited = await mockApiRequest(`/api/product-lines/${line.id}/work-item-types`);
    expect(inherited.length).toBeGreaterThan(0);
    const requirementType = inherited.find((item: any) => item.category === 'requirement' || item.category === '需求');
    expect(requirementType).toBeTruthy();
    const overrides = inherited.map((item: any) => item.id === requirementType.id ? { ...item, enabled: false } : item);
    await mockApiRequest(`/api/product-lines/${line.id}`, { method: 'PUT', body: JSON.stringify({ workItemTypes: overrides }) });
    expect(await mockApiRequest(`/api/product-lines/${line.id}/work-item-types`)).toEqual(overrides);
    await expect(mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ title: '禁用类型任务', productLineId: line.id, category: 'requirement', taskTypeId: requirementType.id }) })).rejects.toThrow('不可用');
  });
});
