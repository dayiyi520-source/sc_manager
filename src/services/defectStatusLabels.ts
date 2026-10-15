/** Correct a historical label without changing workflow or task identifiers. */
export function normalizeDefectStatusLabels<T>(value: T): T {
  if (Array.isArray(value)) {
    const next = value.map(item => normalizeDefectStatusLabels(item));
    return (next.some((item, index) => item !== value[index]) ? next : value) as T;
  }
  if (!value || typeof value !== 'object') return value;
  const source = value as Record<string, unknown>;
  let changed = false;
  const next = Object.fromEntries(Object.entries(source).map(([key, item]) => {
    let normalized = normalizeDefectStatusLabels(item);
    if (key === 'status' && item === '再不修复') normalized = '暂不修复';
    // Workflow states/transitions carry a key; status dictionary entries carry a scope.
    if (key === 'name' && (source.key || source.scope)) {
      if (item === '再不修复') normalized = '暂不修复';
      if (item === '进入再不修复') normalized = '进入暂不修复';
    }
    if (normalized !== item) changed = true;
    return [key, normalized];
  }));
  return (changed ? next : value) as T;
}
