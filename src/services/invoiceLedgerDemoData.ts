import type { Contract, InvoiceApprovalRecord, InvoiceRecord, PaymentSchedule, TaxProfile } from '../types';

export const DEMO_INVOICE_CONTRACTS: Contract[] = [{
  id: 'contract-1', code: 'SC-CT-2026-001', name: '国家电网数智调度协同平台定制采购合同',
  customerId: 'c-1', customerName: '国家电网华东分部数智调度中心', relatedProduct: '智慧校园一体化平台建设项目',
  type: '主合同', amount: 6400000, signDate: '2026-01-15', status: '履行中',
  paymentStages: [{ phase: '第二期（初验款）', percentage: 30, amount: 1920000, status: '待付款', dueDate: '2026-11-30' }]
}];

export const DEMO_TAX_PROFILES: TaxProfile[] = [
  { id: 'demo-profile-001', companyName: '演示抬头·国家电网华东分部', taxId: 'DEMO-TAX-0001', bankName: '演示银行', bankAccount: 'DEMO-ACCOUNT-0001', addressPhone: '演示地址 000-0000', isDemo: true },
  { id: 'demo-profile-002', companyName: '演示抬头·金华职业技术大学', taxId: 'DEMO-TAX-0002', bankName: '演示银行', bankAccount: 'DEMO-ACCOUNT-0002', addressPhone: '演示地址 000-0000', isDemo: true }
];

export const DEMO_SUPPLIERS = ['演示供应商·华东设备服务', '演示供应商·云安软件服务'];

export const DEMO_PAYMENT_SCHEDULES: PaymentSchedule[] = [{
  id: 'demo-stage-contract-1-stage-2',
  contractId: 'contract-1',
  customerId: 'c-1',
  contractName: '国家电网数智调度协同平台定制采购合同',
  customerName: '国家电网华东分部数智调度中心',
  stageName: '第二期（初验款）',
  amount: 1920000,
  invoicedAmount: 768000,
  dueDate: '2026-11-30',
  status: '待付款',
  invoiceStatus: '已开具'
}];

export const DEMO_INVOICES: InvoiceRecord[] = [
  {
    id: 'demo-invoice-sales-001', invoiceNo: 'FP-DEMO-2026-001', type: '销项',
    customerOrSupplier: DEMO_TAX_PROFILES[0].companyName, customerName: '国家电网华东分部数智调度中心',
    customerId: 'c-1', category: '销项发票', amount: 768000, taxRate: '6%', taxAmount: 43471.7,
    applyDate: '2026-11-01', status: '已开具', issueStatus: '已开具', applicant: '林志豪',
    relatedContractCode: 'SC-CT-2026-001', contractRef: '国家电网数智调度协同平台定制采购合同',
    paymentScheduleId: DEMO_PAYMENT_SCHEDULES[0].id
  },
  {
    id: 'demo-invoice-sales-002', invoiceNo: 'FP-DEMO-2026-002', type: '销项',
    customerOrSupplier: DEMO_TAX_PROFILES[1].companyName, customerName: '金华职业技术大学',
    customerId: 'delivery-customer-002', projectId: 'delivery-project-002', relatedProjectName: '在线精品课程资源库建设项目',
    category: '销项发票', amount: 326000, taxRate: '6%', taxAmount: 18452.83,
    applyDate: '2026-11-03', status: '已开具', issueStatus: '已开具', applicant: '林志豪'
  },
  {
    id: 'demo-invoice-purchase-001', invoiceNo: 'FP-DEMO-2026-101', type: '进项',
    customerOrSupplier: DEMO_SUPPLIERS[0], customerName: '金华职业技术大学', customerId: 'delivery-customer-002',
    projectId: 'delivery-project-002', relatedProjectName: '在线精品课程资源库建设项目',
    purchaseOrderCode: 'PO-DEMO-2026-013', category: '进项发票', amount: 86400, taxRate: '13%', taxAmount: 9932.74,
    applyDate: '2026-11-04', status: '待认证', certificationStatus: '待认证', note: '演示用设备采购发票'
  },
  {
    id: 'demo-invoice-purchase-002', invoiceNo: 'FP-DEMO-2026-102', type: '进项',
    customerOrSupplier: DEMO_SUPPLIERS[1], customerName: '浙江工业职业技术学院', customerId: 'seed-customer-02',
    projectId: 'delivery-project-003', relatedProjectName: '智慧实训基地升级项目',
    purchaseOrderCode: 'PO-DEMO-2026-021', category: '进项发票', amount: 53000, taxRate: '6%', taxAmount: 3000,
    applyDate: '2026-11-06', status: '已认证', certificationStatus: '已认证', note: '演示用软件服务发票'
  }
];

export const DEMO_INVOICE_APPROVALS: InvoiceApprovalRecord[] = [];

export const DEMO_TAX_PROFILES_SNAPSHOT: TaxProfile[] = DEMO_TAX_PROFILES.map((profile) => ({ ...profile }));
export const DEMO_SUPPLIERS_SNAPSHOT = [...DEMO_SUPPLIERS];
export const DEMO_PAYMENT_SCHEDULES_SNAPSHOT: PaymentSchedule[] = DEMO_PAYMENT_SCHEDULES.map((schedule) => ({ ...schedule }));
export const DEMO_INVOICES_SNAPSHOT: InvoiceRecord[] = DEMO_INVOICES.map((invoice) => ({ ...invoice }));
export const DEMO_APPROVALS_SNAPSHOT: InvoiceApprovalRecord[] = DEMO_INVOICE_APPROVALS.map((approval) => ({ ...approval }));
