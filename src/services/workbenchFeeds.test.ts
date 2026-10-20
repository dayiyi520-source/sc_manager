// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canViewWorkbenchFeed, syncWorkbenchFeeds, createWorkbenchFeed, deleteWorkbenchFeed, listWorkbenchFeeds, productVersions, FEEDS_KEY, type FeedCatalog } from './workbenchFeeds';
vi.mock('./projectDeliveryMap', () => ({ projectDeliveryMap: () => [{ id: 'project', name: '项目甲', products: [{ id: 'p1', name: '产品甲' }] }], resolveProjectProductLines: (project: unknown, products: Array<{ id: string }>) => project ? products.filter(row => row.id === 'p1') : [] }));
const catalog = { products: [{ id: 'p1', name: '产品甲', versions: [{ id: 'v1', name: 'V1', productLineId: 'p1' }] }, { id: 'p2', name: '产品乙' }], versions: [{ id: 'v2', name: 'V2', productLineId: 'p2' }], projects: [{ id: 'project', name: '项目甲', customerId: 'c1', customerName: '客户甲' }], customers: [{ id: 'c1', name: '客户甲' }] } as unknown as FeedCatalog;
const author = { id: 'me', name: '本人' };
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
describe('动态与评价保存', () => {
  it('保存产品和版本快照并可重新读取', () => {
    const saved = createWorkbenchFeed({ type: 'dynamic', title: ' 发布 ', content: ' 版本内容 ', productId: 'p1', versionId: 'v1' }, catalog, author);
    expect(listWorkbenchFeeds()[0]).toMatchObject({ id: saved.id, title: '发布', content: '版本内容', productName: '产品甲', versionName: 'V1', authorId: 'me' });
    expect(productVersions(catalog, 'p2').map(row => row.id)).toEqual(['v2']);
    expect(() => createWorkbenchFeed({ type: 'dynamic', title: '发布', content: '内容', productId: 'p1', versionId: 'v2' }, catalog, author)).toThrow('有效的产品和版本');
  });
  it('客户按项目自动带入，类型不携带旧关联字段', () => {
    const saved = createWorkbenchFeed({ type: 'feedback', title: '评价', content: '内容', projectId: 'project', customerId: 'invalid', productId: 'p1', versionId: 'v1' }, catalog, author);
    expect(saved).toMatchObject({ projectName: '项目甲', customerId: 'c1', customer: '客户甲' });
    expect(saved.productId).toBe('p1');
    expect(() => createWorkbenchFeed({ type: 'feedback', title: '评价', content: '内容', projectId: 'project', productId: 'p2' }, catalog, author)).toThrow('该项目下有效的产品');
    expect(() => createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '内容' }, catalog, author)).toThrow('资讯类型');
    const news = createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '内容', newsType: '专家报告', customerId: 'c1' }, catalog, author);
    expect(news).toMatchObject({ newsType: '专家报告' });
    expect(news.customer).toBeUndefined(); expect(news.customerId).toBeUndefined(); expect(news.activityName).toBeUndefined();
    for (const newsType of ['政策文件', '友商动态'] as const) { const row = createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '内容', newsType, activityName: '交流会' }, catalog, author); expect(row.newsType).toBe(newsType); expect(row.activityName).toBeUndefined(); }
  });
  it('空白、超长、失效关联及存储失败均不保存', () => {
    expect(() => createWorkbenchFeed({ type: 'feedback', title: ' ', content: '内容' }, catalog, author)).toThrow('标题');
    expect(() => createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '文'.repeat(10001) }, catalog, author)).toThrow('信息简介');
    expect(() => createWorkbenchFeed({ type: 'feedback', title: '评价', content: '内容', projectId: 'missing' }, catalog, author)).toThrow('有效的项目');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '内容', activityName: '行业交流', newsType: '政策文件' }, catalog, author)).toThrow('保存失败');
  });
  it('损坏存储明确报错，不覆盖已有内容', () => {
    localStorage.setItem(FEEDS_KEY, 'broken');
    expect(() => listWorkbenchFeeds()).toThrow('无法读取');
    expect(() => createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '内容', activityName: '行业交流', newsType: '政策文件' }, catalog, author)).toThrow();
    expect(localStorage.getItem(FEEDS_KEY)).toBe('broken');
  });
});

describe('信息权限与共享同步', () => {
  it('只有本人创建的记录可删除，刷新读取不恢复；来源记录不可删除', () => {
    const own = createWorkbenchFeed({ type: 'feedback', title: '待删除', content: '内容', projectId: 'project' }, catalog, author);
    expect(() => deleteWorkbenchFeed(own.id, 'other')).toThrow('不可在工作台删除');
    syncWorkbenchFeeds('外部', [{ id: 'source-1', type: 'feedback', title: '共享', content: '内容', time: '2026-10-20T12:00:00Z', source: { module: '外部', recordId: '1' } }]);
    const shared = listWorkbenchFeeds().find(row => row.source?.module === '外部')!;
    expect(() => deleteWorkbenchFeed(shared.id, 'me')).toThrow('不可在工作台删除');
    deleteWorkbenchFeed(own.id, 'me');
    expect(listWorkbenchFeeds().some(row => row.id === own.id)).toBe(false);
    expect(listWorkbenchFeeds().some(row => row.id === shared.id)).toBe(true);
  });
  it('富文本清理危险内容，指定人员可见，作者可编辑但其他人不可覆盖', () => {
    const input = { type: 'feedback' as const, title: '评价', content: '内容', contentHtml: '<p><strong>内容</strong><script>alert(1)</script><img src="x" onerror="bad()"></p><table><tr><td style="color: #ff0000; background-image: url(javascript:bad())" colspan="2">表格</td></tr></table>', projectId: 'project', visibility: 'specified' as const, audienceIds: ['other', 'other'] };
    const saved = createWorkbenchFeed(input, catalog, author);
    expect(saved.contentHtml).toContain('<strong>内容</strong>');
    expect(saved.contentHtml).not.toMatch(/script|onerror|background-image/);
    expect(saved.contentHtml).toContain('<table>');
    expect(saved.contentHtml).toContain('colspan="2"');
    expect(saved.contentHtml).toContain('color: #ff0000');
    expect(saved.audienceIds).toEqual(['other']);
    expect(canViewWorkbenchFeed(saved, 'other')).toBe(true);
    expect(canViewWorkbenchFeed(saved, 'me')).toBe(true);
    expect(canViewWorkbenchFeed(saved, 'stranger')).toBe(false);
    expect(() => createWorkbenchFeed(input, catalog, { id: 'stranger', name: '他人' }, saved.id)).toThrow('不可在工作台编辑');
    createWorkbenchFeed({ ...input, title: '已更新' }, catalog, author, saved.id);
    expect(listWorkbenchFeeds().filter(row => row.id === saved.id)).toHaveLength(1);
    expect(listWorkbenchFeeds().find(row => row.id === saved.id)?.title).toBe('已更新');
  });
  it('来源快照按来源和记录去重更新，撤回不可见，缺失移出且保留其他来源及本地', () => {
    localStorage.setItem(FEEDS_KEY, '[]');
    const local = createWorkbenchFeed({ type: 'feedback', title: '本地', content: '内容', projectId: 'project' }, catalog, author);
    const record = { id: 'external', type: 'competitor' as const, title: '共享', content: '内容', time: '2026-10-20T12:00:00Z', source: { module: '行业资讯', recordId: '1' } };
    syncWorkbenchFeeds('行业资讯', [record, { ...record, title: '更新' }]);
    syncWorkbenchFeeds('产品', [{ ...record, source: { module: '产品', recordId: '1' } }]);
    expect(listWorkbenchFeeds()).toHaveLength(3);
    expect(listWorkbenchFeeds().find(row => row.source?.module === '行业资讯')?.title).toBe('更新');
    syncWorkbenchFeeds('行业资讯', [{ ...record, publicationState: 'withdrawn' }]);
    expect(canViewWorkbenchFeed(listWorkbenchFeeds().find(row => row.source?.module === '行业资讯')!, 'me')).toBe(false);
    expect(() => createWorkbenchFeed({ type: 'feedback', title: '非法编辑', content: '内容', projectId: 'project' }, catalog, author, listWorkbenchFeeds().find(row => row.source?.module === '产品')!.id)).toThrow();
    syncWorkbenchFeeds('行业资讯', []);
    expect(listWorkbenchFeeds()).toHaveLength(2);
    expect(listWorkbenchFeeds().some(row => row.id === local.id)).toBe(true);
    const before = localStorage.getItem(FEEDS_KEY);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => syncWorkbenchFeeds('产品', [])).toThrow('同步失败');
    expect(localStorage.getItem(FEEDS_KEY)).toBe(before);
  });
});
