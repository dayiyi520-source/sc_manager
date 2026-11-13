// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { InvoiceManagementView } from './InvoiceManagementView';
import { PaymentCollectionManagementView } from './PaymentCollectionManagementView';
import { loadInvoiceLedger } from '../../services/invoiceLedgerRepository';

const { addToast } = vi.hoisted(() => ({ addToast: vi.fn() }));
vi.mock('../../context/AppContext', async () => {
  const React = await import('react');
  return {
    useApp: () => {
      const [invoices, setInvoices] = React.useState(() => loadInvoiceLedger().invoices);
      const [paymentSchedules, setPaymentSchedules] = React.useState(() => loadInvoiceLedger().paymentSchedules);
      const [invoiceApprovals, setInvoiceApprovals] = React.useState(() => loadInvoiceLedger().invoiceApprovals);
      return {
        addToast, invoices, setInvoices, paymentSchedules, setPaymentSchedules, invoiceApprovals, setInvoiceApprovals,
        currentUser: { id: 'user-1', name: '测试申请人', department: '财务' },
        customers: [{ id: 'customer-1', name: '测试客户' }],
        contracts: [{ id: 'contract-1', code: 'CT-001', name: '测试合同', customerId: 'customer-1', customerName: '测试客户', relatedProduct: '', type: '主合同', amount: 200000, signDate: '', status: '履行中', paymentStages: [{ phase: '初验款', percentage: 50, amount: 100000, status: '待付款', dueDate: '2026-11-30' }] }],
        projects: [{ id: 'project-1', code: 'P-001', name: '测试项目', customerId: 'customer-1', customerName: '测试客户', stage: '项目立项', progress: 20, pmName: '项目经理', startDate: '' }],
        partners: [{ id: 'partner-1', name: '测试供应商', type: '集成服务商', level: '一级', contactName: '联系人', contactPhone: '', status: '合作中' }]
      };
    }
  };
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

it('loads mock ledger data and switches invoice actions by tab', () => {
  render(<InvoiceManagementView />);
  expect(screen.getByRole('tablist', { name: '发票视图' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '开具发票' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '录入抬头资料' })).not.toBeInTheDocument();
  expect(screen.getByText('FP-DEMO-2026-001')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '进项发票' }));
  expect(screen.getByRole('button', { name: '录入发票' })).toBeInTheDocument();
  expect(screen.getByText('FP-DEMO-2026-101')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '开票抬头信息库' }));
  expect(screen.queryByRole('button', { name: '开具发票' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '录入发票' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '录入抬头资料' })).toBeInTheDocument();
  expect(screen.getByText('演示抬头·国家电网华东分部')).toBeInTheDocument();
  expect(screen.getAllByText('演示资料')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: '录入抬头资料' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: '录入企业开票抬头资质' })).toBeInTheDocument();
  fireEvent.change(within(dialog).getByPlaceholderText('如：南京师创智联科技有限公司'), { target: { value: '测试单位' } });
  fireEvent.change(within(dialog).getByPlaceholderText('18位纳税人识别号'), { target: { value: '123456789012345678' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '保存资质档案' }));
  const card = screen.getByText('测试单位').closest('.finance-profile');
  expect(card).toHaveTextContent('123456789012345678');
  expect(card).toHaveTextContent('开户银行');
});

it('requires an overage reason and records a sales invoice with linked contract data', () => {
  render(<InvoiceManagementView />);
  expect(screen.queryByRole('button', { name: '录入抬头资料' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '开票抬头信息库' }));
  fireEvent.click(screen.getByRole('button', { name: '录入抬头资料' }));
  const profileDialog = screen.getByRole('dialog');
  fireEvent.change(within(profileDialog).getByLabelText('企业全称'), { target: { value: '客户甲开票抬头' } });
  fireEvent.change(within(profileDialog).getByLabelText('统一社会信用代码 / 税号'), { target: { value: '123456789012345678' } });
  fireEvent.click(within(profileDialog).getByRole('button', { name: '保存资质档案' }));
  fireEvent.click(screen.getByRole('tab', { name: '销项开票' }));
  fireEvent.click(screen.getByRole('button', { name: '开具发票' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: '开具/登记增值税全电发票' })).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('发票代码/号码'), { target: { value: 'FP-001' } });
  const profileOption = within(dialog).getByRole('option', { name: '客户甲开票抬头' });
  fireEvent.change(within(dialog).getByLabelText('购方抬头/客户名称'), { target: { value: profileOption.getAttribute('value') } });
  fireEvent.change(within(dialog).getByLabelText('关联合同'), { target: { value: 'contract-1' } });
  fireEvent.change(within(dialog).getByLabelText('关联付款阶段'), { target: { value: 'demo-stage-contract-1-stage-2' } });
  expect(within(dialog).getByLabelText('关联项目')).toHaveValue('project-1');
  expect(within(dialog).getByLabelText('关联客户')).toHaveValue('测试客户');
  fireEvent.change(within(dialog).getByLabelText('含税开票金额 (元)'), { target: { value: '1200000' } });
  fireEvent.change(within(dialog).getByLabelText('适用税率'), { target: { value: '6%' } });
  const reason = within(dialog).getByLabelText('超开票审批原因');
  expect(reason).toBeRequired();
  fireEvent.click(within(dialog).getByRole('button', { name: '确认开具入账' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.change(reason, { target: { value: '项目实施计划调整，申请提前开票' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '确认开具入账' }));
  const savedLedger = JSON.parse(localStorage.getItem('shichuang.frontend.mock.invoiceLedger') || '{}');
  expect(savedLedger.invoiceApprovals[0]).toMatchObject({
    contractId: 'contract-1', paymentScheduleId: 'demo-stage-contract-1-stage-2', requestedAmount: 1200000, availableAmount: 1152000,
    overAmount: 48000, reason: '项目实施计划调整，申请提前开票'
  });
  expect(screen.getByText('FP-001')).toBeInTheDocument();
  expect(screen.getByText('待审批')).toBeInTheDocument();
});

it('records a purchase invoice with project-derived customer and updated ledger columns', () => {
  render(<InvoiceManagementView />);
  fireEvent.click(screen.getByRole('tab', { name: '进项发票' }));
  fireEvent.click(screen.getByRole('button', { name: '录入发票' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('发票代码/号码'), { target: { value: 'FP-P-001' } });
  fireEvent.change(within(dialog).getByLabelText('销方抬头/供应商名称'), { target: { value: '测试供应商' } });
  fireEvent.change(within(dialog).getByLabelText('关联采购单'), { target: { value: 'PO-001' } });
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  expect(within(dialog).getByLabelText('关联客户')).toHaveValue('测试客户');
  fireEvent.change(within(dialog).getByLabelText('含税开票金额 (元)'), { target: { value: '500' } });
  fireEvent.change(within(dialog).getByLabelText('适用税率'), { target: { value: '13%' } });
  fireEvent.change(within(dialog).getByLabelText('备注'), { target: { value: '办公设备采购' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '确认录入发票' }));
  expect(screen.getByText('FP-P-001')).toBeInTheDocument();
  expect(screen.getByText('PO-001')).toBeInTheDocument();
  expect(screen.getByText('办公设备采购')).toBeInTheDocument();
  expect(screen.getByText('¥ 500')).toBeInTheDocument();
});

it('creates a project receivable, records a partial receipt, and shows project cash position', () => {
  render(<PaymentCollectionManagementView />);
  expect(screen.getByRole('tablist', { name: '回款视图' })).toBeInTheDocument();
  expect(screen.getByText('暂无应收计划')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '实际到账' }));
  expect(screen.getByText('暂无到账记录')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '应收计划' }));
  fireEvent.click(screen.getByRole('button', { name: '新建应收计划' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('关联合同'), { target: { value: 'contract-1' } });
  fireEvent.change(within(dialog).getByLabelText('合同付款阶段'), { target: { value: '0' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '保存应收计划' }));
  expect(screen.getByText('测试客户')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '登记到账' }));
  const receiptDialog = screen.getByRole('dialog');
  fireEvent.change(within(receiptDialog).getByLabelText('本次到账金额'), { target: { value: '40000' } });
  fireEvent.click(within(receiptDialog).getByRole('button', { name: '确认登记到账' }));
  expect(screen.getAllByText('¥ 60,000').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('tab', { name: '项目收支' }));
  expect(screen.getByRole('columnheader', { name: '实际净流入' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '预计净流入' })).toBeInTheDocument();
});

it('links a deposit refund plan to the paid project deposit and reserves its return amount', () => {
  localStorage.setItem('shichuang.frontend.mock.accountsPayable', JSON.stringify({
    payables: [{ id: 'deposit-1', payableCode: 'AP-DEPOSIT-1', category: '招投标保证金', supplierName: '招标单位', projectId: 'project-1', projectName: '测试项目', amount: 50000, paidAmount: 50000, unpaidAmount: 0, dueDate: '2026-10-01', status: '已结清', applicant: '财务' }],
    payments: []
  }));
  render(<PaymentCollectionManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建应收计划' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('应收类别'), { target: { value: '保证金退回' } });
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  fireEvent.change(within(dialog).getByLabelText('原缴保证金记录'), { target: { value: 'deposit-1' } });
  fireEvent.change(within(dialog).getByLabelText('应收说明'), { target: { value: '投标保证金退回' } });
  fireEvent.change(within(dialog).getByLabelText('约定收款日期'), { target: { value: '2026-11-30' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '保存应收计划' }));
  const plan = JSON.parse(localStorage.getItem('shichuang.frontend.mock.paymentCollection') || '{}').plans[0];
  const deposit = JSON.parse(localStorage.getItem('shichuang.frontend.mock.accountsPayable') || '{}').payables[0];
  expect(plan).toMatchObject({ sourcePayableId: 'deposit-1', planAmount: 50000, projectId: 'project-1' });
  expect(deposit.returnPlannedAmount).toBe(50000);
});
