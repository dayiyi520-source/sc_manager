import type { ProductLine } from '../../types';

type ProductLineVersion = NonNullable<ProductLine['versions']>[number];

export type IterationStatus = '待开始' | '进行中' | '已完成';
export const ITERATION_STATUSES: IterationStatus[] = ['待开始', '进行中', '已完成'];

export const normalizeVersionStatus = (status?: string, phase?: string): IterationStatus => {
  if (ITERATION_STATUSES.includes(status as IterationStatus)) return status as IterationStatus;
  if (['已发布', '已结束', '已取消', '已关闭'].includes(status || '')) return '已完成';
  if (phase === '已完成' || phase === '已结束' || phase === '已发布') return '已完成';
  if (phase === '处理中' || status === '处理中') return '进行中';
  return '待开始';
};

export type ProductLineDisplayStatus = '空闲中' | '迭代中';

export const productLineDisplayStatus = (productLine: Pick<ProductLine, 'health' | 'status' | 'versions'>): ProductLineDisplayStatus => {
  return (productLine.versions || []).some((version) => normalizeVersionStatus(version.status, version.statusPhase) !== '已完成') ? '迭代中' : '空闲中';
};

export const latestReleasedVersion = (productLine: Pick<ProductLine, 'versions'>) => [...(productLine.versions || [])]
  .filter((version) => version.status === '已发布' || version.statusPhase === '已发布' || (version.statusPhase === '已完成' && Boolean(version.releaseDate)) || (!version.status && !version.statusPhase && Boolean(version.releaseDate)))
  .sort((a, b) => {
    const releaseDiff = String(b.releaseDate || '').localeCompare(String(a.releaseDate || ''));
    return releaseDiff || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  })[0];

export const formatVersionPublishedAt = (version?: ProductLineVersion) => {
  if (!version?.releaseDate) return '未记录';
  return String(version.releaseDate).replace('T', ' ').slice(0, 16);
};
