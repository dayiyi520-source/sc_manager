// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorkbenchFeed, listWorkbenchFeeds, productVersions, FEEDS_KEY, type FeedCatalog } from './workbenchFeeds';
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
    expect(saved.productId).toBeUndefined();
    expect(() => createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '内容' }, catalog, author)).toThrow('资讯类型');
    const news = createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '内容', newsType: '专家报告', customerId: 'c1' }, catalog, author);
    expect(news).toMatchObject({ newsType: '专家报告' });
    expect(news.customer).toBeUndefined(); expect(news.customerId).toBeUndefined(); expect(news.activityName).toBeUndefined();
    for (const newsType of ['政策文件', '友商动态'] as const) expect(createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '内容', newsType, activityName: '交流会' }, catalog, author)).toMatchObject({ newsType, activityName: '交流会' });
  });
  it('空白、超长、失效关联及存储失败均不保存', () => {
    expect(() => createWorkbenchFeed({ type: 'feedback', title: ' ', content: '内容' }, catalog, author)).toThrow('标题');
    expect(() => createWorkbenchFeed({ type: 'competitor', title: '资讯', content: '文'.repeat(10001) }, catalog, author)).toThrow('简要');
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
