import { audienceIncludes, audienceLabel, validateAudience, validAudienceShape, type AudienceScope } from './workbenchAudience';
import type { CurrentUser, EmployeeOption } from '../types';
import { projectDeliveryMap, resolveProjectProductLines } from './projectDeliveryMap';
import { sanitizeHtml } from '../utils/sanitizeHtml';
import { LEGACY_WORKBENCH_FEEDS, MOCK_WORKBENCH_FEEDS } from '../data/mockSnapshot';
import type { ProductLine, ProjectItem, Customer, VersionIteration } from '../types';

export const newsTypes = ['专家报告', '政策文件', '友商动态'] as const;
export type NewsType = typeof newsTypes[number];
export type FeedType = 'dynamic' | 'square' | 'feedback' | 'competitor';
export type FeedCategory = 'dynamic' | 'square';
export const feedTypes: Array<{ key: FeedCategory; label: string }> = [{ key: 'dynamic', label: '产品动态' }, { key: 'square', label: '信息广场' }];
export const informationTags = ['产品信息', '评价吐槽', '行业资讯', ...newsTypes, '客户信息', '商机信息', '经验分享', '其他'] as const;
export interface WorkbenchFeed {
  tags?: string[]; audienceScopes?: AudienceScope[];
  id: string; type: FeedType; time: string; title: string; content: string; contentHtml?: string; visibility?: 'all' | 'specified'; audienceIds?: string[]; source?: { module: string; recordId: string; detailUrl?: string }; publicationState?: 'published' | 'withdrawn'; author?: string; authorId?: string;
  productId?: string; productName?: string; versionId?: string; versionName?: string;
  projectId?: string; projectName?: string; customerId?: string; customer?: string; activityName?: string; newsType?: NewsType;
}
export interface FeedInput { tags?: string[]; audienceScopes?: AudienceScope[]; type: FeedType; title: string; content: string; contentHtml?: string; visibility?: 'all' | 'specified'; audienceIds?: string[]; productId?: string; versionId?: string; projectId?: string; customerId?: string; activityName?: string; newsType?: NewsType }
export type FeedCatalog = { products: ProductLine[]; versions: VersionIteration[]; projects: ProjectItem[]; customers: Customer[]; people?: EmployeeOption[] };
export const FEEDS_KEY = 'shichuang.frontend.mock.workbench.feeds';
export const FEEDS_CHANGED = 'shichuang.workbench.feeds.changed';
export function listWorkbenchFeeds(): WorkbenchFeed[] {
  const stored = localStorage.getItem(FEEDS_KEY);
  if (!stored) return MOCK_WORKBENCH_FEEDS.map(normalizeFeed).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  let rows: unknown;
  try { rows = JSON.parse(stored); } catch { throw new Error('动态与评价保存数据无法读取，请检查浏览器存储'); }
  if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string' || !['dynamic', 'square', 'feedback', 'competitor'].includes(row.type) || typeof row.title !== 'string' || typeof row.content !== 'string' || typeof row.time !== 'string' || (row.audienceScopes !== undefined && !validAudienceShape(row.audienceScopes)))) throw new Error('动态与评价保存数据格式异常');
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
  return completed.map(normalizeFeed).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}
export function productVersions(catalog: FeedCatalog, productId?: string) {
  return [...new Map([...(catalog.products.find(row => row.id === productId)?.versions || []), ...catalog.versions.filter(row => row.productLineId === productId)].map(row => [row.id, row])).values()];
}
export function feedbackProducts(catalog: FeedCatalog, projectId?: string) {
  const project = catalog.projects.find(row => row.id === projectId);
  return project ? resolveProjectProductLines(projectDeliveryMap().find(row => row.id === project.id || row.name === project.name), catalog.products) : [];
}
export function feedCategory(feed: WorkbenchFeed): FeedCategory {
  return feed.type === 'dynamic' && ['产品发布', '产品'].includes(feed.source?.module || '') && Boolean(feed.versionId) ? 'dynamic' : 'square';
}
export function normalizeFeed(feed: WorkbenchFeed): WorkbenchFeed {
  const category = feedCategory(feed);
  const tags = feed.tags?.length ? feed.tags : [feed.type === 'competitor' ? feed.newsType || '行业资讯' : feed.type === 'feedback' ? '评价吐槽' : '产品信息'];
  return { ...feed, type: category, tags, audienceScopes: feed.audienceScopes?.length ? feed.audienceScopes : feed.visibility === 'specified' ? undefined : [['shichuang']],
    ...(category === 'dynamic' ? { source: { ...feed.source!, module: '产品发布' }, audienceScopes: [['shichuang']] as AudienceScope[] } : {}) };
}
export const feedScopeLabel = (feed: WorkbenchFeed) => audienceLabel(normalizeFeed(feed).audienceScopes);

export function createWorkbenchFeed(input: FeedInput, catalog: FeedCatalog, author: { id: string; name: string }, editingId?: string, source?: WorkbenchFeed['source']): WorkbenchFeed {
  if (input.type !== 'square') throw new Error('产品动态仅由产品版本发布同步，请在信息广场新建');
  const title = input.title.trim(), content = input.content.trim();
  if (!title || title.length > 120) throw new Error('标题须为 1 至 120 字');
  if (!content || content.length > 10000) throw new Error('信息简介须为 1 至 10000 字');
  const rows = listWorkbenchFeeds();
  if (source && (!source.module.trim() || !source.recordId.trim())) throw new Error('共享来源信息不完整');
  const sharedId = source ? `shared:${encodeURIComponent(source.module)}:${encodeURIComponent(source.recordId)}` : undefined;
  const existing = editingId ? rows.find(row => row.id === editingId) : undefined;
  if (editingId && (!existing || feedCategory(existing) != 'square')) throw new Error('该信息不可在工作台编辑');
  if (!Array.isArray(input.tags) || !input.tags.length || input.tags.some(tag => !informationTags.includes(tag as typeof informationTags[number]))) throw new Error('请选择有效的信息标签');
  const audienceScopes = validateAudience(input.audienceScopes, catalog.people || []);
  const project = catalog.projects.find(row => row.id === input.projectId);
  const product = catalog.products.find(row => row.id === input.productId);
  const customer = catalog.customers.find(row => row.id === input.customerId);
  if (input.projectId && !project) throw new Error('请选择有效的关联项目');
  if (input.productId && !product) throw new Error('请选择有效的关联产品');
  if (input.customerId && !customer) throw new Error('请选择有效的关联客户');
  const feed: WorkbenchFeed = {
    id: existing?.id || sharedId || globalThis.crypto?.randomUUID?.() || `feed-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    type: 'square', title, content, time: existing?.time || new Date().toISOString(),
    contentHtml: sanitizeHtml(input.contentHtml || '', { richText: true }), tags: [...new Set(input.tags)], audienceScopes,
    source: existing?.source || source, authorId: existing ? existing.authorId : author.id, author: existing ? existing.author : author.name, productId: product?.id, productName: product?.name,
    projectId: project?.id, projectName: project?.name, customerId: customer?.id, customer: customer?.name,
  };
  saveFeeds([feed, ...rows.filter(row => row.id !== feed.id)], '保存失败，浏览器存储不可用或空间不足，请重试');
  return feed;
}
function saveFeeds(rows: WorkbenchFeed[], error: string) {
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify(rows)); } catch { throw new Error(error); }
  window.dispatchEvent(new Event(FEEDS_CHANGED));
}

export function deleteWorkbenchFeed(id: string, authorId: string): void {
  const rows = listWorkbenchFeeds();
  const existing = rows.find(row => row.id === id);
  if (!existing || feedCategory(existing) != 'square') throw new Error('该信息不可在工作台删除');
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify(rows.filter(row => row.id !== id))); }
  catch { throw new Error('删除失败，浏览器存储不可用，请重试'); }
  window.dispatchEvent(new Event(FEEDS_CHANGED));
}

export function canViewWorkbenchFeed(feed: WorkbenchFeed, viewer: string | Pick<CurrentUser, 'id' | 'department' | 'organizationId'>) {
  if (feed.publicationState === 'withdrawn') return false;
  const normalized = normalizeFeed(feed);
  const viewerId = typeof viewer === 'string' ? viewer : viewer.id;
  // 保留旧指定成员记录的原权限，编辑后改用组织/部门范围，不自动扩大历史受众。
  if (!normalized.audienceScopes?.length) return feed.authorId === viewerId || Boolean(feed.audienceIds?.includes(viewerId));
  if (typeof viewer === 'string') return feed.authorId === viewerId;
  return audienceIncludes(normalized.audienceScopes, viewer);
}

/** Source owners submit a complete snapshot of their published records; missing records are withdrawn. */
export function syncWorkbenchFeeds(module: string, records: WorkbenchFeed[]) {
  if (!module.trim() || records.some(row => (row.audienceScopes !== undefined && !validAudienceShape(row.audienceScopes)) || !row.source || row.source.module !== module || !row.source.recordId || !row.title?.trim() || row.title.length > 120 || !row.content?.trim() || row.content.length > 10000 || (row.visibility !== undefined && !['all', 'specified'].includes(row.visibility)) || (row.publicationState !== undefined && !['published', 'withdrawn'].includes(row.publicationState)) || !['dynamic', 'square', 'feedback', 'competitor'].includes(row.type) || !Number.isFinite(new Date(row.time).getTime()) || (row.visibility === 'specified' && !row.audienceIds?.length && !row.audienceScopes?.length))) throw new Error('共享信息格式不完整');
  const unique = new Map(records.map(row => [row.source!.recordId, { ...row, id: `shared:${encodeURIComponent(module)}:${encodeURIComponent(row.source!.recordId)}`, contentHtml: sanitizeHtml(row.contentHtml || '', { richText: true }) }]));
  const rows = listWorkbenchFeeds().filter(row => row.source?.module !== module);
  try { localStorage.setItem(FEEDS_KEY, JSON.stringify([...unique.values(), ...rows])); } catch { throw new Error('同步失败，浏览器存储不可用或空间不足'); }
  window.dispatchEvent(new Event(FEEDS_CHANGED));
}
