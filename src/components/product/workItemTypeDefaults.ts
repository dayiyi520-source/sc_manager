export const preferredWorkItemTypeName = (items: Array<{ name: string; isDefault?: boolean }>, current = '') =>
  items.some((item) => item.name === current) ? current : items.find((item) => item.isDefault)?.name || '';
