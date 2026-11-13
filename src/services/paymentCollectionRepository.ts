import type { ActualPaymentRecord, PaymentPlan } from '../types';

export interface PaymentCollectionSnapshot {
  plans: PaymentPlan[];
  records: ActualPaymentRecord[];
}

const STORAGE_KEY = 'shichuang.frontend.mock.paymentCollection';

export function loadPaymentCollection(): PaymentCollectionSnapshot {
  if (typeof localStorage === 'undefined') return { plans: [], records: [] };
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) return { plans: [], records: [] };
  try {
    const parsed = JSON.parse(value) as Partial<PaymentCollectionSnapshot>;
    return {
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
  } catch {
    return { plans: [], records: [] };
  }
}

export function savePaymentCollection(snapshot: PaymentCollectionSnapshot): void {
  if (typeof localStorage === 'undefined') throw new Error('当前环境不支持保存回款计划');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
