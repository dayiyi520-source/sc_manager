// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProductLine } from '../types';
import { defaultPresalesConfig, orderedSaleableProducts, readPresalesConfig, savePresalesConfig } from './presalesCenterRepository';

beforeEach(() => localStorage.clear());

describe('售前中心配置', () => {
  it('only includes saleable product lines without changing their source names', () => {
    const products = [
      { id: 'one', name: '原名一', commercialAvailability: '可商用' },
      { id: 'two', name: '原名二', commercialAvailability: '不可销售' },
      { id: 'three', name: '原名三', commercialAvailability: '可销售' },
    ] as ProductLine[];
    const config = defaultPresalesConfig();
    config.products = [{ id: 'three', alias: '别名三' }, { id: 'one', alias: '别名一' }];
    expect(orderedSaleableProducts(products, config).map(product => product.id)).toEqual(['three', 'one']);
    expect(products[0].name).toBe('原名一');
  });

  it('persists categories and product aliases and prevents stale saves', () => {
    const config = defaultPresalesConfig();
    config.categories.reverse();
    config.categories[0].description = '新描述';
    config.products = [{ id: 'p1', alias: '展示别名' }];
    const saved = savePresalesConfig(config, 0);
    expect(readPresalesConfig()).toEqual(saved);
    expect(() => savePresalesConfig(config, 0)).toThrow('其他页面更新');
  });

  it('preserves damaged storage and rejects duplicate category names', () => {
    localStorage.setItem('crm.presales-center.v1', '{broken');
    expect(() => readPresalesConfig()).toThrow('读取失败');
    expect(() => savePresalesConfig(defaultPresalesConfig(), 0)).toThrow('读取失败');
    expect(localStorage.getItem('crm.presales-center.v1')).toBe('{broken');
    localStorage.clear();
    const config = defaultPresalesConfig();
    config.categories[1].name = config.categories[0].name;
    expect(() => savePresalesConfig(config, 0)).toThrow('唯一');
  });
});
