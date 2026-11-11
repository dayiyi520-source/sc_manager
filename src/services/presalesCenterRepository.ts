import type { ProductLine } from '../types';

const STORAGE_KEY = 'crm.presales-center.v1';

export const DEFAULT_PRESALES_CATEGORIES = [
  { id: 'guide', name: '新人指引', description: '快速了解平台功能' },
  { id: 'policy', name: '政策文件', description: '重要政策和通知' },
  { id: 'pitch', name: '销售话术', description: '标准话术与案例' },
  { id: 'pricing', name: '价格体系', description: '产品价格与政策' },
  { id: 'qualification', name: '资质文件', description: '资质证书与材料' },
  { id: 'other', name: '其他文件', description: '常用文档资料' },
] as const;

export type PresalesCategory = { id: string; name: string; description: string };
export type PresalesProduct = { id: string; alias: string };
export type PresalesCenterConfig = { revision: number; categories: PresalesCategory[]; products: PresalesProduct[] };

export const defaultPresalesConfig = (): PresalesCenterConfig => ({
  revision: 0, categories: DEFAULT_PRESALES_CATEGORIES.map(category => ({ ...category })), products: [],
});

export const isSaleableProduct = (product: ProductLine) =>
  product.commercialAvailability === '可销售' || product.commercialAvailability === '可商用';

export function orderedSaleableProducts(products: ProductLine[], config: PresalesCenterConfig) {
  const ranks = new Map(config.products.map((product, index) => [product.id, index]));
  return products.filter(isSaleableProduct).sort((a, b) =>
    (ranks.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (ranks.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    || (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name, 'zh-CN'));
}

export function readPresalesConfig(): PresalesCenterConfig {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultPresalesConfig();
  try {
    const value = JSON.parse(raw) as PresalesCenterConfig;
    if (!Number.isInteger(value.revision) || value.revision < 0
      || !Array.isArray(value.categories) || !Array.isArray(value.products)
      || value.categories.length !== DEFAULT_PRESALES_CATEGORIES.length
      || new Set(value.categories.map(category => category.id)).size !== value.categories.length
      || !value.categories.every(category => DEFAULT_PRESALES_CATEGORIES.some(item => item.id === category.id)
        && typeof category.name === 'string' && typeof category.description === 'string')
      || !value.products.every(product => typeof product.id === 'string' && typeof product.alias === 'string')
      || new Set(value.products.map(product => product.id)).size !== value.products.length) throw new Error();
    return value;
  } catch { throw new Error('售前中心配置读取失败，原数据已保留'); }
}

export function savePresalesConfig(config: PresalesCenterConfig, expectedRevision: number) {
  const current = readPresalesConfig();
  if (current.revision !== expectedRevision) throw new Error('配置已在其他页面更新，请刷新后重试');
  const categories = config.categories.map(category => ({
    ...category, name: category.name.trim(), description: category.description.trim(),
  }));
  const products = config.products.map(product => ({ ...product, alias: product.alias.trim() }));
  if (categories.length !== DEFAULT_PRESALES_CATEGORIES.length
    || new Set(categories.map(category => category.id)).size !== categories.length
    || categories.some(category => !DEFAULT_PRESALES_CATEGORIES.some(item => item.id === category.id)
      || !category.name || category.name.length > 20 || category.description.length > 60)
    || new Set(categories.map(category => category.name)).size !== categories.length
    || new Set(products.map(product => product.id)).size !== products.length
    || products.some(product => !product.id || product.alias.length > 50)) {
    throw new Error('分类名称需唯一且不超过20字，描述不超过60字，产品别名不超过50字');
  }
  const next = { revision: current.revision + 1, categories, products };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
