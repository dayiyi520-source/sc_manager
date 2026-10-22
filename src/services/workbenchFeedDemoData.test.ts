// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_WORKBENCH_FEEDS, MOCK_WORKBENCH_FEEDS, MOCK_PRODUCT_LINES, MOCK_VERSIONS, MOCK_USERS, MOCK_CUSTOMERS } from '../data/mockSnapshot';
import { directoryProjects } from './customerDirectoryData';
import { feedbackProducts, FEEDS_KEY, listWorkbenchFeeds, newsTypes, productVersions, type FeedCatalog } from './workbenchFeeds';
const catalog = { products: MOCK_PRODUCT_LINES, versions: MOCK_VERSIONS, projects: directoryProjects(), customers: MOCK_CUSTOMERS } as FeedCatalog;
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
describe('complete original workbench demonstration messages', () => {
  it('uses valid current form associations and complete publication metadata for all six messages', () => {
    expect(MOCK_WORKBENCH_FEEDS).toHaveLength(6);
    for (const feed of listWorkbenchFeeds()) {
      const original = LEGACY_WORKBENCH_FEEDS.find(row => row.id === feed.id)!;
      expect(feed.time).toBe(original.time);
      expect(feed.visibility).toBe('all');
      expect(feed.title.trim()).not.toBe('');
      expect(feed.content.trim()).not.toBe('');
      expect(feed.contentHtml).toContain(feed.content);
      expect(MOCK_USERS.find(user => user.id === feed.authorId)?.name).toBe(feed.author);
      expect(MOCK_PRODUCT_LINES.find(product => product.id === feed.productId)?.name).toBe(feed.productName);
      if (original.type === 'dynamic') {
        expect(productVersions(catalog, feed.productId).find(version => version.id === feed.versionId)?.name).toBe(feed.versionName);
        expect(feed.projectId).toBeUndefined();
        expect(feed.customerId).toBeUndefined();
      } else if (original.type === 'feedback') {
        const project = catalog.projects.find(project => project.id === feed.projectId)!;
        expect(project.name).toBe(feed.projectName);
        expect(project.customerId).toBe(feed.customerId);
        expect(project.customerName).toBe(feed.customer);
        expect(feedbackProducts(catalog, feed.projectId).some(product => product.id === feed.productId)).toBe(true);
        expect(feed.versionId).toBeUndefined();
      } else {
        expect(newsTypes).toContain(feed.newsType);
        expect(feed.projectId).toBeUndefined();
        expect(feed.versionId).toBeUndefined();
        expect(feed.customerId).toBeUndefined();
      }
    }
  });
  it('upgrades an exact cached original snapshot once and persists complete fields for reload', () => {
    localStorage.setItem(FEEDS_KEY, JSON.stringify(LEGACY_WORKBENCH_FEEDS));
    const first = listWorkbenchFeeds();
    expect(first).toHaveLength(6);
    expect(first.every(row => row.authorId && row.productId && row.visibility)).toBe(true);
    const persisted = localStorage.getItem(FEEDS_KEY);
    expect(JSON.parse(persisted!)).toHaveLength(6);
    expect(listWorkbenchFeeds()).toEqual(first);
    expect(localStorage.getItem(FEEDS_KEY)).toBe(persisted);
  });
  it('preserves edited demos, user-created and shared records and does not recreate deleted samples', () => {
    const edited = { ...LEGACY_WORKBENCH_FEEDS[0], title: '我修改过的标题' };
    const associated = { ...LEGACY_WORKBENCH_FEEDS[1], productId: 'my-own-product' };
    const created = { ...LEGACY_WORKBENCH_FEEDS[0], id:'user-created', authorId:'me' };
    const shared = { ...LEGACY_WORKBENCH_FEEDS[2], source: {module:'外部',recordId:'one'} };
    localStorage.setItem(FEEDS_KEY, JSON.stringify([edited, associated, created, shared, LEGACY_WORKBENCH_FEEDS[4]]));
    const rows = listWorkbenchFeeds();
    expect(rows).toHaveLength(5);
    for (const original of [edited, associated, created, shared]) expect(rows.find(row => row.id === original.id)).toMatchObject({...original,type:'square'});
    expect(rows.find(row => row.id === LEGACY_WORKBENCH_FEEDS[4].id)?.newsType).toBe('友商动态');
    expect(rows.some(row => row.id === LEGACY_WORKBENCH_FEEDS[5].id)).toBe(false);
    localStorage.setItem(FEEDS_KEY, '[]');
    expect(listWorkbenchFeeds()).toEqual([]);
  });
  it('retains the original cached data and reports failure if an upgrade cannot be saved', () => {
    const original = JSON.stringify(LEGACY_WORKBENCH_FEEDS);
    localStorage.setItem(FEEDS_KEY, original);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => listWorkbenchFeeds()).toThrow('演示信息补全保存失败');
    expect(localStorage.getItem(FEEDS_KEY)).toBe(original);
  });
});
