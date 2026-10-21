import { projectDeliveryMap, resolveProjectProductLines } from './projectDeliveryMap';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import { LEGACY_WORKBENCH_FEEDS, MOCK_WORKBENCH_FEEDS } from '../data/mockSnapshot';
import type { ProductLine, ProjectItem, Customer, VersionIteration } from '../types';

export const newsTypes = ['专家报告', '政策文件', '友商动态'] as const;
export type NewsType = typeof newsTypes[number];
export type FeedType = 'dynamic' | 'feedback' | 'competitor';
export const feedTypes: Array<{ key: FeedType; label: string }> = [{ key: 'dynamic', label: '产品动态' }, { key: 'feedback', label: '评价吐槽' }, { key: 'competitor', label: '行业资讯' }];
export interface WorkbenchFeed {
  id: string; type: FeedType; time: string; title: string; content: string; contentHtml?: string; visibility?: 'all' | 'specified'; audienceIds?: string[]; source?: { module: string; recordId: string; detailUrl?: string }; publicationState?: 'published' | 'withdrawn'; author?: string; authorId?: string;
  productId?: string; productName?: string; versionId?: string; versionName?: string;
  projectId?: string; projectName?: string; customerId?: string; customer?: string; activityName?: string; newsType?: NewsType;
}
export interface FeedInput { type: FeedType; title: string; content: string; contentHtml?: string; visibility?: 'all' | 'specified'; audienceIds?: string[]; productId?: string; versionId?: string; projectId?: string; customerId?: string; activityName?: string; newsType?: NewsType }
export type FeedCatalog = { products: ProductLine[]; versions: VersionIteration[]; projects: ProjectItem[]; customers: Customer[] };
export const FEEDS_KEY = 'shichuang.frontend.mock.workbench.feeds';
export const FEEDS_CHANGED = 'shichuang.workbench.feeds.changed';
export function listWorkbenchFeeds(): WorkbenchFeed[] {
  const stored = localStorage.getItem(FEEDS_KEY);
  if (!stored) return [...MOCK_WORKBENCH_FEEDS].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  let rows: unknown;
  try { rows = JSON.parse(stored); } catch { throw new Error('动态与评价保存数据无法读取，请检查浏览器存储'); }
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string' || !feedTypes.some(type => type.key === row.type) || typeof row.title !== 'string' || typeof row.content !== 'string' || typeof row.time !== 'string')) throw new Error('动态与评价保存数据格式异常');
  // Only exact original demo snapshots qualify; custom, edited and source records remain intact.
  let upgraded = false;
  const completed = (rows as WorkbenchFeed[]).map(row => {
    const legacy = LEGACY_WORKBENCH_FEEDS.find(legacy => legacy.id === row.id);
    if (!legacy) return row;
    const original = legacy as unknown as Record<string, unknown>;
    const storedRow = row as unknown as Record<string, unknown>;
    if (Object.keys(original).length !== Object.keys(storedRow).length || !Object.entries(original).every(([key, value]) => storedRow[key] === value)) return row;
    const replacement = MOCK_WORKBENCH_FEEDS.find(feed => feed.id === row.id);
    if (!replacement) return row;
    upgraded = true;
    return { ...replacement };
  });
  if (upgraded) {
    try { localStorage.setItem(FEEDS_KEY, JSON.stringify(completed)); }
    catch { throw new Error('历史演示信息补全保存失败，请检查浏览器存储后重试'); }
  }
  return completed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}
export function productVersions(catalog: FeedCatalog, productId?: string) {
  return [...new Map([...(catalog.products.find(row => row.id === productId)?.versions || []), ...catalog.versions.filter(row => row.productLineId === productId)].map(row => [row.id, row])).values()];
}
export function feedbackProducts(catalog: FeedCatalog, projectId?: string) {
  const project = catalog.projects.find(row => row.id === projectId);
  return project ? resolveProjectProductLines(projectDeliveryMap().find(row => row.id === project.id || row.name === project.name), catalog.products) : [];
}
export function createWorkbenchFeed(input: FeedInput, catalog: FeedCatalog, author: { id: string; name: string }, editingId?: string): WorkbenchFeed {
  if (!feedTypes.some(row => row.key === input.type)) throw new Error('请选择类型');
  const title = input.title.trim(), content = input.content.trim();
  if (!title || title.length > 120) throw new Error('标题须为 1 至 120 字');
  if (!content || content.length > 10000) throw new Error('信息简介须为 1 至 10000 字');
  const rows = listWorkbenchFeeds();
  const existing = editingId ? rows.find(row => row.id === editingId) : undefined;
  if (editingId && (!existing || existing.source || existing.authorId !== author.id)) throw new Error('该信息不可在工作台编辑');
  if (input.visibility && !['all', 'specified'].includes(input.visibility)) throw new Error('请选择有效的可见范围');
  if (input.visibility === 'specified' && !input.audienceIds?.length) throw new Error('请选择可见人员');
  let relations: Partial<WorkbenchFeed> = {};
  if (input.type === 'dynamic') {
    const product = catalog.products.find(row => row.id === input.productId);
    const version = productVersions(catalog, product?.id).find(row => row.id === input.versionId);
    if (!product || !version) throw new Error('请选择有效的产品和版本');
    relations = { productId: product.id, productName: product.name, versionId: version.id, versionName: version.name };
  } else if (input.type === 'feedback') {
    const project = catalog.projects.find(row => row.id === input.projectId);
    if (!project) throw new Error('请选择有效的项目');
    const product = input.productId ? feedbackProducts(catalog, project.id).find(row => row.id === input.productId) : undefined;
    if (input.productId && !product) throw new Error('请选择该项目下有效的产品');
    relations = { productId: product?.id, productName: product?.name, projectId: project.id, projectName: project.name, customerId: project.customerId, customer: project.customerName || catalog.customers.find(row => row.id === project.customerId)?.name };
  } else {
    if (!newsTypes.includes(input.newsType as NewsType)) throw new Error('请选择资讯类型');
    const product = input.productId ? catalog.products.find(row => row.id === input.productId) : undefined;
    if (input.productId && !product) throw new Error('请选择有效的产品');
    relations = { newsType: input.newsType, productId: product?.id, productName: product?.name };
  }
  const feed: WorkbenchFeed = { id: existing?.id || globalThis.crypto?.randomUUID?.() || `feed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, type: input.type, title, content, time: existing?.time || new Date().toISOString(), contentHtml: sanitizeHtml(input.contentHtml || '', { richText: true }), visibility: input.visibility || 'all', audienceIds: input.visibility === 'specified' ? [...new Set(input.audienceIds)] : undefined, authorId: author.id, author: author.name, ...relations };
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify([feed, ...rows.filter(row => row.id !== feed.id)])); } catch { throw new Error('保存失败，浏览器存储不可用或空间不足，请重试'); }
  window.dispatchEvent(new Event(FEEDS_CHANGED));
  return feed;
}

export function deleteWorkbenchFeed(id: string, authorId: string): void {
  const rows = listWorkbenchFeeds();
  const existing = rows.find(row => row.id === id);
  if (!existing || existing.source || existing.authorId !== authorId) throw new Error('该信息不可在工作台删除');
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify(rows.filter(row => row.id !== id))); }
  catch { throw new Error('删除失败，浏览器存储不可用，请重试'); }
  window.dispatchEvent(new Event(FEEDS_CHANGED));
}

export function canViewWorkbenchFeed(feed: WorkbenchFeed, viewerId: string) {
  return feed.publicationState !== 'withdrawn' && (feed.visibility !== 'specified' || feed.authorId === viewerId || Boolean(feed.audienceIds?.includes(viewerId)));
}

/** Source owners submit a complete snapshot of their published records; missing records are withdrawn. */
export function syncWorkbenchFeeds(module: string, records: WorkbenchFeed[]) {
  if (!module.trim() || records.some(row => !row.source || row.source.module !== module || !row.source.recordId || !row.title?.trim() || row.title.length > 120 || !row.content?.trim() || row.content.length > 10000 || (row.visibility !== undefined && !['all', 'specified'].includes(row.visibility)) || (row.publicationState !== undefined && !['published', 'withdrawn'].includes(row.publicationState)) || !feedTypes.some(type => type.key === row.type) || !Number.isFinite(new Date(row.time).getTime()) || (row.visibility === 'specified' && !row.audienceIds?.length))) throw new Error('共享信息格式不完整');
  const unique = new Map(records.map(row => [row.source!.recordId, { ...row, id: `shared:${encodeURIComponent(module)}:${encodeURIComponent(row.source!.recordId)}`, contentHtml: sanitizeHtml(row.contentHtml || '', { richText: true }) }]));
  const rows = listWorkbenchFeeds().filter(row => row.source?.module !== module);
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify([...unique.values(), ...rows])); } catch { throw new Error('同步失败，浏览器存储不可用或空间不足'); }
  window.dispatchEvent(new Event(FEEDS_CHANGED));
}
