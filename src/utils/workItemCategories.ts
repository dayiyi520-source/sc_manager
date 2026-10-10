import type { WorkItemCategoryDefinition } from '../services/productRepository';

const LEGACY_VALUES: Record<string, string> = { requirement: '需求', design: '设计', dev: '研发', test: '测试', bug: '缺陷', case: '用例' };
export const categoryValue = (code: string) => LEGACY_VALUES[code] || code;
export const categoryCode = (value: string) => Object.entries(LEGACY_VALUES).find(([, legacy]) => legacy === value)?.[0] || value;
export const isTaskCategory = (value: string) => !['case', '测试用例'].includes(categoryCode(value).toLowerCase());
export const displayedTaskCategoryCodes = (options: string[], stored: string[]) =>
  [...new Set([...options, ...stored].map(categoryCode))].filter(isTaskCategory);
export const enabledCategoryOptions = (items: WorkItemCategoryDefinition[]) => items
  .filter((item) => item.enabled && isTaskCategory(item.code) && item.capabilityType !== 'TEST_CASE')
  .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code))
  .map((item) => ({ value: categoryValue(item.code), label: item.displayName, code: item.code, iconKey: item.iconKey }));
