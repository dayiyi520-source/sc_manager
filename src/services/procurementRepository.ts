import type { ProcurementItem } from '../types';

const STORAGE_KEY = 'shichuang.frontend.mock.procurementItems';

export function loadProcurementItems(): ProcurementItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProcurementItems(items: ProcurementItem[]): void {
  if (typeof localStorage === 'undefined') throw new Error('当前环境不支持保存项目采购');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
