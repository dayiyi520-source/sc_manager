type HierarchyItem = { id: string; kind: string; productLineId?: string; source: unknown };
export const parentWorkItemId = (item: HierarchyItem) => (item.source as { parentWorkItemId?: string | null }).parentWorkItemId;

export const workItemKey = (item: HierarchyItem) => `${item.productLineId || ''}:${item.kind}:${item.id}`;

// Keep ancestors when a filter matches a child; missing parents remain visible roots.
export function workItemHierarchy<T extends HierarchyItem>(items: T[], matches: T[] = items) {
  const byId = new Map(items.map((item) => [`${item.productLineId || ''}:${item.id}`, item]));
  const parentKey = (item: T) => `${item.productLineId || ''}:${parentWorkItemId(item)}`;
  const included = new Set<string>();
  for (const match of matches) {
    let item: T | undefined = match;
    const visited = new Set<string>();
    while (item && !visited.has(workItemKey(item))) {
      const key = workItemKey(item);
      visited.add(key);
      included.add(key);
      item = parentWorkItemId(item) ? byId.get(parentKey(item)) : undefined;
    }
  }
  const roots: T[] = [];
  const children = new Map<string, T[]>();
  for (const item of items) {
    if (!included.has(workItemKey(item))) continue;
    const parent = parentWorkItemId(item) ? byId.get(parentKey(item)) : undefined;
    const visited = new Set([workItemKey(item)]);
    let ancestor = parent;
    while (ancestor && !visited.has(workItemKey(ancestor))) {
      visited.add(workItemKey(ancestor));
      ancestor = parentWorkItemId(ancestor) ? byId.get(parentKey(ancestor)) : undefined;
    }
    if (!parent || ancestor) roots.push(item);
    else children.set(workItemKey(parent), [...(children.get(workItemKey(parent)) || []), item]);
  }
  return { roots, children };
}
