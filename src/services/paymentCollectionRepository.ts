import type { ActualPaymentRecord, PaymentPlan } from '../types';

export interface PaymentCollectionSnapshot {
  plans: PaymentPlan[];
  records: ActualPaymentRecord[];
}

const STORAGE_KEY = 'shichuang.frontend.mock.paymentCollection';

const DEMO_SNAPSHOT: PaymentCollectionSnapshot = {
  plans: [
    { id: 'demo-receivable-001', planCode: 'AR-DEMO-2026-001', category: '合同回款', contractId: 'demo-contract-001', contractCode: 'SC-CT-DEMO-001', projectId: 'delivery-project-001', projectName: '智慧校园一体化平台建设项目', customerId: 'delivery-customer-001', customerName: '深圳职业技术大学', stageName: '第二期（初验款）', planAmount: 1920000, receivedAmount: 1200000, uncollectedAmount: 720000, dueDate: '2026-11-30', status: '部分回款', manager: '林志豪' },
    { id: 'demo-receivable-002', planCode: 'AR-DEMO-2026-002', category: '合同回款', contractId: 'demo-contract-002', contractCode: 'SC-CT-DEMO-002', projectId: 'delivery-project-002', projectName: '在线精品课程资源库建设项目', customerId: 'delivery-customer-002', customerName: '金华职业技术大学', stageName: '项目初验款', planAmount: 680000, receivedAmount: 0, uncollectedAmount: 680000, dueDate: '2026-11-12', status: '逾期未还', manager: '林志豪' },
    { id: 'demo-receivable-003', planCode: 'AR-DEMO-2026-003', category: '保证金退回', sourcePayableId: 'demo-payable-deposit-001', projectId: 'delivery-project-002', projectName: '在线精品课程资源库建设项目', customerId: 'delivery-customer-002', customerName: '金华职业技术大学', stageName: '招投标保证金退回', planAmount: 25000, receivedAmount: 0, uncollectedAmount: 25000, dueDate: '2026-12-05', status: '待回款', manager: '周明' },
    { id: 'demo-receivable-004', planCode: 'AR-DEMO-2026-004', category: '维保续费', contractId: 'demo-contract-003', contractCode: 'SC-MT-DEMO-003', projectId: 'delivery-project-003', projectName: '智慧实训基地升级项目', customerId: 'seed-customer-002', customerName: '浙江工业职业技术学院', stageName: '年度维保续费', planAmount: 120000, receivedAmount: 120000, uncollectedAmount: 0, dueDate: '2026-10-30', status: '已回款', manager: '周明' }
  ],
  records: [
    { id: 'demo-receipt-001', recordCode: 'REC-DEMO-2026-001', planCode: 'AR-DEMO-2026-001', customerName: '深圳职业技术大学', amount: 700000, payDate: '2026-10-18', payMethod: '银行转账', bankSerialNo: 'TX-DEMO-AR-001', operator: '林志豪' },
    { id: 'demo-receipt-002', recordCode: 'REC-DEMO-2026-002', planCode: 'AR-DEMO-2026-001', customerName: '深圳职业技术大学', amount: 500000, payDate: '2026-11-10', payMethod: '银行转账', bankSerialNo: 'TX-DEMO-AR-002', operator: '林志豪' },
    { id: 'demo-receipt-003', recordCode: 'REC-DEMO-2026-003', planCode: 'AR-DEMO-2026-004', customerName: '浙江工业职业技术学院', amount: 120000, payDate: '2026-10-25', payMethod: '网银转账', bankSerialNo: 'TX-DEMO-AR-003', operator: '周明' }
  ]
};

const cloneDemoSnapshot = (): PaymentCollectionSnapshot => ({
  plans: DEMO_SNAPSHOT.plans.map((plan) => ({ ...plan })),
  records: DEMO_SNAPSHOT.records.map((record) => ({ ...record }))
});

export function loadPaymentCollection(): PaymentCollectionSnapshot {
  if (typeof localStorage === 'undefined') return { plans: [], records: [] };
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) {
    const initial = cloneDemoSnapshot();
    savePaymentCollection(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(value) as Partial<PaymentCollectionSnapshot>;
    return {
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      records: Array.isArray(parsed.records) ? parsed.records : []
    };
  } catch {
    const initial = cloneDemoSnapshot();
    savePaymentCollection(initial);
    return initial;
  }
}

export function savePaymentCollection(snapshot: PaymentCollectionSnapshot): void {
  if (typeof localStorage === 'undefined') throw new Error('当前环境不支持保存回款计划');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
