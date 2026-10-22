import type { ProductLine } from '../types';
import { listWorkbenchFeeds, syncWorkbenchFeeds, type WorkbenchFeed } from './workbenchFeeds';

export function productReleaseFeeds(products: ProductLine[]): WorkbenchFeed[] {
  return products.flatMap(product => (product.versions || []).filter(version =>
    version.status === '已发布' || version.statusPhase === '已发布' || (version.statusPhase === '已完成' && Boolean(version.releaseDate))
  ).map(version => ({
    id: `release:${product.id}:${version.id}`, type: 'dynamic' as const,
    title: `${product.name} ${version.code || version.name} 发布`.slice(0, 120),
    content: (String(version.changelog || version.content || '').trim() || `${product.name} ${version.code || version.name} 已发布。`).slice(0, 10000),
    time: version.releaseDate || version.createdAt || '',
    productId: product.id, productName: product.name, versionId: version.id, versionName: version.code || version.name,
    source: { module: '产品发布', recordId: `${product.id}:${version.id}`, detailUrl: `${import.meta.env.BASE_URL}app/prod_versions` },
    author: version.ownerName || product.ownerName || '未记录发布人', tags: ['产品信息'], audienceScopes: [['shichuang']] as [string][],
  }))).filter(feed => Number.isFinite(new Date(feed.time).getTime()));
}
export function syncProductReleaseFeeds(products: ProductLine[]) {
  const incoming = productReleaseFeeds(products);
  const current = listWorkbenchFeeds().filter(feed => feed.source?.module === '产品发布');
  const fields = (feed: WorkbenchFeed) => JSON.stringify([feed.source?.recordId, feed.title, feed.content, feed.time, feed.productName, feed.versionName, feed.author]);
  if (JSON.stringify(current.map(fields).sort()) === JSON.stringify(incoming.map(fields).sort())) return;
  syncWorkbenchFeeds('产品发布', incoming);
}
