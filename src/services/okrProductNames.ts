import type { ProductLine } from '../types';
import type { OkrKrDetail, OkrRecord } from './okrRepository';

/** Resolve only structured associations; never replace text in titles or descriptions. */
export function syncOkrProductNames(records: OkrRecord[], products: ProductLine[]): OkrRecord[] {
  const byId = new Map(products.map(product => [product.id, product]));
  const byName = new Map<string, ProductLine[]>();
  for (const product of products) {
    for (const name of new Set([product.name, ...(product.nameAliases || [])])) {
      const normalized = name.trim();
      if (normalized) byName.set(normalized, [...(byName.get(normalized) || []), product]);
    }
  }
  const find = (name?: string, id?: string) => {
    if (id) return byId.get(id);
    const matches = byName.get(name?.trim() || '') || [];
    return matches.length === 1 ? matches[0] : undefined;
  };
  const names = (input: unknown) => typeof input === 'string' ? input.split(',').map(name => find(name)?.name || name).join(',') : input;
  const detail = (row: OkrKrDetail, structure?: string): OkrKrDetail => {
    if (structure !== 'product' && structure !== 'delivery') return row;
    const product = find(structure === 'delivery' ? row.version : row.name, row.productLineId);
    if (!product) return row;
    const field = structure === 'delivery' ? 'version' : 'name';
    if (row[field] === product.name && row.productLineId === product.id) return row;
    return { ...row, [field]: product.name, productLineId: product.id };
  };
  const node = (input: unknown, inheritedStructure?: string): unknown => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
    const value = input as Record<string, unknown>;
    const structure = typeof value.structureType === 'string' ? value.structureType : inheritedStructure;
    let changed = false;
    const next = { ...value };
    const set = (key: string, result: unknown) => { if (result !== value[key]) { next[key] = result; changed = true; } };
    if (structure === 'product') set('businessObject', names(value.businessObject));
    if (value.productLine) set('productLine', names(value.productLine));
    if (Array.isArray(value.details)) {
      const rows = value.details as OkrKrDetail[];
      const updated = rows.map(row => detail(row, structure));
      if (updated.some((row, index) => row !== rows[index])) set('details', updated);
    }
    for (const key of ['keyResults', 'executionActions']) {
      if (Array.isArray(value[key])) {
        const children = value[key] as unknown[];
        const updated = children.map(child => node(child, structure));
        if (updated.some((child, index) => child !== children[index])) set(key, updated);
      }
    }
    if (value.sourceKrData) set('sourceKrData', node(value.sourceKrData, structure));
    return changed ? next : input;
  };
  return records.map(record => {
    const payload = node(record.payload) as OkrRecord['payload'];
    const pendingPayload = record.changeRequest && (record.changeRequest.status === 'pending' ? node(record.changeRequest.payload) : record.changeRequest.payload) as OkrRecord['payload'];
    return payload === record.payload && (!record.changeRequest || pendingPayload === record.changeRequest.payload)
      ? record
      : { ...record, payload, ...(record.changeRequest ? { changeRequest: { ...record.changeRequest, payload: pendingPayload } } : {}) };
  });
}
