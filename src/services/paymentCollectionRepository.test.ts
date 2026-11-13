// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { loadPaymentCollection, savePaymentCollection } from './paymentCollectionRepository';

afterEach(() => localStorage.clear());

it('persists project receivable plans and partial receipt records across reloads', () => {
  const snapshot = {
    plans: [{ id: 'plan-1', planCode: 'AR-001', category: '保证金退回', projectId: 'project-1', customerName: '学校甲', stageName: '投标保证金退回', planAmount: 1000, receivedAmount: 400, uncollectedAmount: 600, dueDate: '2026-11-30', status: '部分回款', manager: '财务' }],
    records: [{ id: 'receipt-1', recordCode: 'REC-001', planCode: 'AR-001', customerName: '学校甲', amount: 400, payDate: '2026-11-13', payMethod: '银行转账', bankSerialNo: 'TX-001', operator: '财务' }]
  } as unknown as ReturnType<typeof loadPaymentCollection>;

  savePaymentCollection(snapshot);

  expect(loadPaymentCollection()).toEqual(snapshot);
});
