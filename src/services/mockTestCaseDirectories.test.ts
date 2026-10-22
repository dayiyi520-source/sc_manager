// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import type { TestCase, TestCaseDirectory } from '../types/testManagement';

const base = '/api/product-lines/line-1/test-case-directories';
const request = (path: string, method: string, body?: unknown) => mockApiRequest(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

describe('test case directory persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ id: 'line-1', name: '产品一' }, { id: 'line-2', name: '产品二' }]));
    localStorage.setItem('shichuang.frontend.mock.testCaseDirectories', '[]');
    localStorage.setItem('shichuang.frontend.mock.testCases', '[]');
  });

  it('uses the current product name for historical directories and newly created children', async () => {
    localStorage.setItem('shichuang.frontend.mock.testCaseDirectories', JSON.stringify([{ id: 'historical-root', name: '登录', productLineId: 'line-1', productLineName: '旧产品名', parentId: null, sort: 0, caseCount: 0 }]));
    const directories = await mockApiRequest(base) as TestCaseDirectory[];
    expect(directories[0]).toMatchObject({ productLineId: 'line-1', productLineName: '产品一' });
    const child = await request('/api/product-lines/all/test-case-directories', 'POST', { productLineId: directories[0].productLineId, parentId: directories[0].id, name: '子目录' });
    expect(child).toMatchObject({ productLineId: 'line-1', productLineName: '产品一', parentId: 'historical-root' });
    localStorage.setItem('shichuang.frontend.mock.productLines', JSON.stringify([{ id: 'line-1', name: '改名后的产品' }]));
    expect((await mockApiRequest(base) as TestCaseDirectory[]).every(item => item.productLineName === '改名后的产品')).toBe(true);
  });

  it('persists root and child creation, rename and empty deletion across reads', async () => {
    const root = await request('/api/product-lines/all/test-case-directories', 'POST', { productLineId: 'line-1', name: ' 登录 ' });
    const child = await request(base, 'POST', { parentId: root.id, name: '密码登录' });
    await request(`${base}/${root.id}`, 'PUT', { name: '账号登录' });
    expect(await mockApiRequest(base)).toEqual(expect.arrayContaining([expect.objectContaining({ id: root.id, name: '账号登录' }), expect.objectContaining({ id: child.id, parentId: root.id })]));
    await expect(request(`${base}/${root.id}`, 'DELETE')).rejects.toThrow('包含子目录或测试用例');
    await request(`${base}/${child.id}`, 'DELETE');
    await request(`${base}/${root.id}`, 'DELETE');
    expect(await mockApiRequest(base)).toEqual([]);
  });

  it('copies descendants and cases with independent identities and preserves original plans', async () => {
    const root = await request(base, 'POST', { name: '登录' });
    const child = await request(base, 'POST', { parentId: root.id, name: '密码' });
    const original = { id: 'case-1', code: 'CASE-1', title: '密码验证', productLineId: 'line-1', directoryId: child.id, workItemTypeId: 'type-1', statusKey: 'ready', enabled: false, revision: 3, referenceCount: 2, latestResult: 'FAILED', steps: [{ id: 'step-1', sort: 1, action: '输入密码', expectedResult: '登录成功' }] };
    localStorage.setItem('shichuang.frontend.mock.testCases', JSON.stringify([original]));
    localStorage.setItem('shichuang.frontend.mock.testPlans', JSON.stringify([{ id: 'plan-1', cases: [{ testCaseId: 'case-1' }] }]));
    const plans = localStorage.getItem('shichuang.frontend.mock.testPlans');
    const copied = await request(`${base}/${root.id}/copy`, 'POST', { name: '登录副本' });
    const directories = await mockApiRequest(base) as TestCaseDirectory[];
    const copiedChild = directories.find(item => item.parentId === copied.id)!;
    expect(copiedChild.name).toBe('密码');
    const result = await mockApiRequest(`/api/product-lines/line-1/test-cases?directoryId=${copied.id}&includeDescendants=true`);
    expect(result.items).toHaveLength(1);
    const item = result.items[0] as TestCase;
    expect(item).toMatchObject({ directoryId: copiedChild.id, workItemTypeId: 'type-1', statusKey: 'ready', enabled: false, revision: 0, referenceCount: 0, latestResult: null });
    expect(item.id).not.toBe(original.id);
    expect(item.steps[0]).toMatchObject({ action: '输入密码', expectedResult: '登录成功' });
    expect(item.steps[0].id).not.toBe('step-1');
    expect(directories.find(item => item.id === copied.id)?.caseCount).toBe(1);
    expect(localStorage.getItem('shichuang.frontend.mock.testPlans')).toBe(plans);
    await expect(request(`${base}/${child.id}`, 'DELETE')).rejects.toThrow('包含子目录或测试用例');
  });

  it('rejects invalid, duplicate and cross-product writes without changing storage', async () => {
    const root = await request(base, 'POST', { name: '登录' });
    const before = localStorage.getItem('shichuang.frontend.mock.testCaseDirectories');
    await expect(request(base, 'POST', { name: ' 登录 ' })).rejects.toThrow('不能重复');
    await expect(request(base, 'POST', { name: ' ' })).rejects.toThrow('1至120');
    await expect(request('/api/product-lines/line-2/test-case-directories', 'POST', { name: '子目录', parentId: root.id })).rejects.toThrow('父目录');
    await expect(request(`/api/product-lines/line-2/test-case-directories/${root.id}`, 'DELETE')).rejects.toThrow('不属于当前产品');
    await expect(request(`${base}/missing`, 'PUT', { name: '改名' })).rejects.toThrow('目录不存在');
    expect(localStorage.getItem('shichuang.frontend.mock.testCaseDirectories')).toBe(before);
  });
});
