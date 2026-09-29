import type { ProductLine } from '../../types';

type ProductLineVersion = NonNullable<ProductLine['versions']>[number];

export type ProductLineDisplayStatus = string;

export const productLineDisplayStatus = (productLine: Pick<ProductLine, 'health' | 'status' | 'versions'>): ProductLineDisplayStatus => {
  return productLine.status || productLine.health || '';
};

export const latestReleasedVersion = (productLine: Pick<ProductLine, 'versions'>) => [...(productLine.versions || [])]
  .filter((version) => version.statusPhase === '已完成' || Boolean(version.releaseDate))
  .sort((a, b) => {
    const releaseDiff = String(b.releaseDate || '').localeCompare(String(a.releaseDate || ''));
    return releaseDiff || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  })[0];

export const formatVersionPublishedAt = (version?: ProductLineVersion) => {
  if (!version?.releaseDate) return '未记录';
  return String(version.releaseDate).replace('T', ' ').slice(0, 16);
};
