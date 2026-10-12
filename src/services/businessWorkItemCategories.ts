import type { WorkItemCategoryDefinition } from './productRepository';

// Append missing built-in categories while preserving existing names and enabled state.
export const withBusinessWorkItemCategories = (categories: WorkItemCategoryDefinition[]): WorkItemCategoryDefinition[] => {
  const defaults = [
    { code: 'ops', name: '运维', displayName: '运维任务', iconKey: 'ops' },
    { code: 'presales', name: '售前', displayName: '售前任务', iconKey: 'presales' },
    { code: 'delivery', name: '交付', displayName: '交付任务', iconKey: 'delivery' },
  ];
  return [...categories, ...defaults.filter((item) => !categories.some((category) => category.code === item.code)).map((item, index) => ({ ...item, id: `category-${item.code}`, capabilityType: 'STANDARD' as const, sort: Math.max(0, ...categories.map((category) => category.sort)) + index + 1, enabled: true, builtIn: true, revision: 0 }))];
};
