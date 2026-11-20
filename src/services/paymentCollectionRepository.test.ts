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

it('seeds representative demo plans and receipt records on first load', () => {
  const snapshot = loadPaymentCollection();

  expect(snapshot.plans.map((plan) => plan.category)).toEqual(expect.arrayContaining(['合同款', '投标保证金', '其他']));
  expect(snapshot.plans.some((plan) => plan.status === '部分回款')).toBe(true);
  expect(snapshot.plans.some((plan) => plan.status === '逾期未还')).toBe(true);
  expect(snapshot.records.length).toBeGreaterThan(0);
  expect(loadPaymentCollection()).toEqual(snapshot);
});

it('preserves an intentionally empty saved snapshot', () => {
  savePaymentCollection({ plans: [], records: [] });

  expect(loadPaymentCollection()).toEqual({ plans: [], records: [] });
});

it('restores demo data when the saved snapshot is malformed', () => {
  localStorage.setItem('shichuang.frontend.mock.paymentCollection', '{');

  expect(loadPaymentCollection().plans.length).toBeGreaterThan(0);
});

it('restores missing legacy demo contract names from their contract codes', () => {
  savePaymentCollection({
    plans: [
      { id: 'legacy-1', planCode: 'AR-OLD-1', contractCode: 'SC-CT-DEMO-001', customerName: '深圳职业技术大学', stageName: '初验款', planAmount: 100, receivedAmount: 0, uncollectedAmount: 100, dueDate: '2026-11-30', status: '待回款', manager: '财务' },
      { id: 'legacy-2', planCode: 'AR-OLD-2', contractCode: 'SC-CT-DEMO-002', customerName: '金华职业技术大学', stageName: '初验款', planAmount: 100, receivedAmount: 0, uncollectedAmount: 100, dueDate: '2026-11-30', status: '待回款', manager: '财务' }
    ],
    records: []
  });

  const snapshot = loadPaymentCollection();
  expect(snapshot.plans.map((plan) => plan.contractName)).toEqual([
    '智慧校园一体化平台建设项目合同',
    '在线精品课程资源库建设项目合同'
  ]);
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.paymentCollection') || '{}').plans).toEqual(snapshot.plans);
});
