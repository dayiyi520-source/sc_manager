import type { AccountsPayablePaymentRecord, AccountsPayableRecord } from '../types';

export interface AccountsPayableSnapshot {
  payables: AccountsPayableRecord[];
  payments: AccountsPayablePaymentRecord[];
}

const STORAGE_KEY = 'shichuang.frontend.mock.accountsPayable';

const DEMO_PAYABLES: AccountsPayableRecord[] = [
  {
    id: 'demo-payable-001', payableCode: 'AP-DEMO-2026-001', supplierName: '演示供应商·华东设备服务',
    purchaseOrderCode: 'PO-DEMO-2026-013', projectName: '在线精品课程资源库建设项目', amount: 86400,
    paidAmount: 30000, unpaidAmount: 56400, dueDate: '2026-11-20', status: '部分付款', applicant: '林志豪', note: '设备采购尾款'
  },
  {
    id: 'demo-payable-002', payableCode: 'AP-DEMO-2026-002', supplierName: '演示供应商·云安软件服务',
    purchaseOrderCode: 'PO-DEMO-2026-021', projectName: '智慧实训基地升级项目', amount: 53000,
    paidAmount: 0, unpaidAmount: 53000, dueDate: '2026-11-08', status: '逾期', applicant: '林志豪', note: '软件服务尾款'
  },
  {
    id: 'demo-payable-003', payableCode: 'AP-DEMO-2026-003', supplierName: '演示供应商·办公服务',
    purchaseOrderCode: 'PO-DEMO-2026-025', projectName: '通用行政采购', amount: 12800,
    paidAmount: 12800, unpaidAmount: 0, dueDate: '2026-10-30', status: '已结清', applicant: '周明', note: '办公用品采购'
  }
];

const DEMO_PAYMENTS: AccountsPayablePaymentRecord[] = [{
  id: 'demo-payable-payment-001', paymentCode: 'APP-DEMO-2026-001', payableCode: 'AP-DEMO-2026-001',
  supplierName: '演示供应商·华东设备服务', amount: 30000, payDate: '2026-10-28', payMethod: '银行转账',
  bankSerialNo: 'TX-DEMO-26001', operator: '林志豪'
}];

const cloneSnapshot = (): AccountsPayableSnapshot => ({
  payables: DEMO_PAYABLES.map((item) => ({ ...item })),
  payments: DEMO_PAYMENTS.map((item) => ({ ...item }))
});

export function loadAccountsPayable(): AccountsPayableSnapshot {
  if (typeof localStorage === 'undefined') return { payables: [], payments: [] };
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) {
    const initial = cloneSnapshot();
    saveAccountsPayable(initial);
    return initial;
  }
  try {
    const parsed = JSON.parse(value) as Partial<AccountsPayableSnapshot>;
    return {
      payables: Array.isArray(parsed.payables) ? parsed.payables : cloneSnapshot().payables,
      payments: Array.isArray(parsed.payments) ? parsed.payments : cloneSnapshot().payments
    };
  } catch {
    const initial = cloneSnapshot();
    saveAccountsPayable(initial);
    return initial;
  }
}

export function saveAccountsPayable(snapshot: AccountsPayableSnapshot): void {
  if (typeof localStorage === 'undefined') throw new Error('当前环境不支持保存应付账款');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
