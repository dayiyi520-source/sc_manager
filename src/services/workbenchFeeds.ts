import { MOCK_WORKBENCH_FEEDS } from '../data/mockSnapshot';
import type { ProductLine, ProjectItem, Customer, VersionIteration } from '../types';

export const newsTypes = ['专家报告', '政策文件', '友商动态'] as const;
export type NewsType = typeof newsTypes[number];
export type FeedType = 'dynamic' | 'feedback' | 'competitor';
export const feedTypes: Array<{ key: FeedType; label: string }> = [{ key: 'dynamic', label: '产品动态' }, { key: 'feedback', label: '评价吐槽' }, { key: 'competitor', label: '行业资讯' }];
export interface WorkbenchFeed {
  id: string; type: FeedType; time: string; title: string; content: string; author?: string; authorId?: string;
  productId?: string; productName?: string; versionId?: string; versionName?: string;
  projectId?: string; projectName?: string; customerId?: string; customer?: string; activityName?: string; newsType?: NewsType;
}
export interface FeedInput { type: FeedType; title: string; content: string; productId?: string; versionId?: string; projectId?: string; customerId?: string; activityName?: string; newsType?: NewsType }
export type FeedCatalog = { products: ProductLine[]; versions: VersionIteration[]; projects: ProjectItem[]; customers: Customer[] };
export const FEEDS_KEY = 'shichuang.frontend.mock.workbench.feeds';
export const FEEDS_CHANGED = 'shichuang.workbench.feeds.changed';
export function listWorkbenchFeeds(): WorkbenchFeed[] {
  const stored = localStorage.getItem(FEEDS_KEY);
  if (!stored) return [...MOCK_WORKBENCH_FEEDS];
  let rows: unknown;
  try { rows = JSON.parse(stored); } catch { throw new Error('动态与评价保存数据无法读取，请检查浏览器存储'); }
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string' || !feedTypes.some(type => type.key === row.type) || typeof row.title !== 'string' || typeof row.content !== 'string' || typeof row.time !== 'string')) throw new Error('动态与评价保存数据格式异常');
  return rows as WorkbenchFeed[];
}
export function productVersions(catalog: FeedCatalog, productId?: string) {
  return [...new Map([...(catalog.products.find(row => row.id === productId)?.versions || []), ...catalog.versions.filter(row => row.productLineId === productId)].map(row => [row.id, row])).values()];
}
export function createWorkbenchFeed(input: FeedInput, catalog: FeedCatalog, author: { id: string; name: string }): WorkbenchFeed {
  if (!feedTypes.some(row => row.key === input.type)) throw new Error('请选择类型');
  const title = input.title.trim(), content = input.content.trim();
  if (!title || title.length > 120) throw new Error('标题须为 1 至 120 字');
  if (!content || content.length > 10000) throw new Error('简要须为 1 至 10000 字');
  let relations: Partial<WorkbenchFeed> = {};
  if (input.type === 'dynamic') {
    const product = catalog.products.find(row => row.id === input.productId);
    const version = productVersions(catalog, product?.id).find(row => row.id === input.versionId);
    if (!product || !version) throw new Error('请选择有效的产品和版本');
    relations = { productId: product.id, productName: product.name, versionId: version.id, versionName: version.name };
  } else if (input.type === 'feedback') {
    const project = catalog.projects.find(row => row.id === input.projectId);
    if (!project) throw new Error('请选择有效的项目');
    relations = { projectId: project.id, projectName: project.name, customerId: project.customerId, customer: project.customerName || catalog.customers.find(row => row.id === project.customerId)?.name };
  } else {
    if (!newsTypes.includes(input.newsType as NewsType)) throw new Error('请选择资讯类型');
    if ((input.activityName?.trim().length || 0) > 120) throw new Error('活动名称不能超过 120 字');
    relations = { activityName: input.activityName?.trim() || undefined, newsType: input.newsType };
  }
  const feed: WorkbenchFeed = { id: globalThis.crypto?.randomUUID?.() || `feed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, type: input.type, title, content, time: new Date().toISOString(), authorId: author.id, author: author.name, ...relations };
  const rows = listWorkbenchFeeds();
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify([feed, ...rows])); } catch { throw new Error('保存失败，浏览器存储不可用或空间不足，请重试'); }
  window.dispatchEvent(new Event(FEEDS_CHANGED));
  return feed;
}
