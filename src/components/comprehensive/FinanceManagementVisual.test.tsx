// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InvoiceManagementView } from './InvoiceManagementView';
import { PaymentCollectionManagementView } from './PaymentCollectionManagementView';
import { loadInvoiceLedger } from '../../services/invoiceLedgerRepository';
import { RECEIVABLE_DEMO_CONTRACTS } from '../../services/receivableContractDemoData';
import { directoryProjects } from '../../services/customerDirectoryData';
import { ProcurementManagementView } from './ProcurementManagementView';

const { addToast, teamOptions } = vi.hoisted(() => ({ addToast: vi.fn(), teamOptions: vi.fn() }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: teamOptions } }));
vi.mock('../../context/AppContext', async () => {
  const React = await import('react');
  return {
    useApp: () => {
      const [invoices, setInvoices] = React.useState(() => loadInvoiceLedger().invoices);
      const [paymentSchedules, setPaymentSchedules] = React.useState(() => loadInvoiceLedger().paymentSchedules);
      const [invoiceApprovals, setInvoiceApprovals] = React.useState(() => loadInvoiceLedger().invoiceApprovals);
      return {
        addToast, invoices, setInvoices, paymentSchedules, setPaymentSchedules, invoiceApprovals, setInvoiceApprovals,
        isRemoteData: false,
        currentUser: { id: 'user-1', name: '测试申请人', department: '财务' },
        customers: [{ id: 'customer-1', name: '测试客户' }],
        contracts: [
          { id: 'contract-1', code: 'CT-001', name: '测试合同', customerId: 'customer-1', customerName: '测试客户', relatedProduct: '测试项目', type: '主合同', amount: 200000, signDate: '', status: '履行中', paymentStages: [{ phase: '第一笔', percentage: 30, amount: 60000, status: '待付款', triggerCondition: '合同签订后', dueDate: '2026-11-30' }, { phase: '尾款', percentage: 70, amount: 140000, status: '待付款', triggerCondition: '项目验收后', dueDate: '2026-12-30' }] },
          { id: 'contract-2', code: 'CT-002', name: '其他项目合同', customerId: 'customer-2', customerName: '演示学校一', relatedProduct: '在线精品课程资源库建设项目', type: '主合同', amount: 100000, signDate: '', status: '履行中', paymentStages: [] }
        ],
        projects: [{ id: 'project-1', code: 'P-001', name: '测试项目', customerId: 'customer-1', customerName: '测试客户', stage: '项目立项', progress: 20, pmName: '项目经理', startDate: '' }, ...directoryProjects()],
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

beforeEach(() => {
  teamOptions.mockResolvedValue([
    { id: 'user-1', name: '测试申请人', department: '财务', organizationId: 'shichuang', jobTitle: '财务专员' },
    { id: 'user-2', name: '其他申请人', department: '商务部', organizationId: 'shichuang', jobTitle: '商务经理' }
  ]);
});

it('loads mock ledger data and switches invoice actions by tab', () => {
  render(<InvoiceManagementView />);
  expect(screen.getByPlaceholderText('搜索发票单号、项目、客户、申请人...')).toBeInTheDocument();
  expect(screen.getByRole('tablist', { name: '发票视图' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '开具发票' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '录入抬头资料' })).not.toBeInTheDocument();
  expect(screen.getByText('FP-DEMO-2026-001')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '进项发票' }));
  expect(screen.getByPlaceholderText('搜索发票单号、项目、客户、申请人...')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '录入发票' })).toBeInTheDocument();
  expect(screen.getByText('FP-DEMO-2026-101')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '开票抬头信息库' }));
  expect(screen.getByPlaceholderText('搜索企业名称...')).toBeInTheDocument();
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

it('opens sales invoice details from the invoice number or detail action and confirms deletion', async () => {
  render(<InvoiceManagementView />);
  const salesTable = screen.getByRole('table');
  expect(within(salesTable).queryByText('购方抬头')).not.toBeInTheDocument();
  expect(within(salesTable).queryByText('状态')).not.toBeInTheDocument();
  expect(within(salesTable).queryByText('关联付款阶段')).not.toBeInTheDocument();
  expect(within(salesTable).getByText('开票日期').compareDocumentPosition(within(salesTable).getByText('申请人')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'FP-DEMO-2026-001' }));
  expect(screen.getByRole('heading', { name: '销项发票详情' })).toBeInTheDocument();
  expect(document.querySelector('.finance-detail-metrics')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '发票信息' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '业务关联' })).toBeInTheDocument();
  expect(screen.getAllByText('SC-CT-2026-001')).toHaveLength(2);
  expect(screen.getAllByText('第二期（初验款）')).toHaveLength(1);
  expect(screen.getAllByText('国家电网华东分部数智调度中心')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: '关闭' }));

  fireEvent.click(screen.getAllByRole('button', { name: '详情' })[0]);
  expect(screen.getByRole('heading', { name: '销项发票详情' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '关闭' }));

  const invoiceRow = screen.getByRole('button', { name: 'FP-DEMO-2026-001' }).closest('tr');
  expect(invoiceRow).not.toBeNull();
  fireEvent.click(within(invoiceRow as HTMLElement).getByRole('button', { name: '删除' }));
  fireEvent.click(within(invoiceRow as HTMLElement).getByRole('button', { name: '删除' }));
  await waitFor(() => expect(document.querySelectorAll('.ant-popconfirm-buttons button')).toHaveLength(2));
  fireEvent.click(document.querySelectorAll('.ant-popconfirm-buttons button')[1]);
  await waitFor(() => expect(screen.queryByRole('button', { name: 'FP-DEMO-2026-001' })).not.toBeInTheDocument());
  expect(loadInvoiceLedger().invoices.some((invoice) => invoice.id === 'demo-invoice-sales-001')).toBe(false);
  expect(loadInvoiceLedger().paymentSchedules[0].invoicedAmount).toBe(0);
});

it('requires an overage note and invoice attachment, and records date and organization applicant', async () => {
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
  expect(within(dialog).getByRole('heading', { name: '开具增值税发票' })).toBeInTheDocument();
  const salesFieldOrder = ['发票号码', '开票日期', '购方抬头/客户名称', '关联项目', '关联客户', '关联合同', '含税开票金额 (元)', '适用税率', '申请人', '备注', '上传发票'];
  const salesFormLabels = [...dialog.querySelectorAll('form label')].map((label) => label.textContent?.replace('*', '').trim());
  let lastFieldIndex = -1;
  for (const field of salesFieldOrder) {
    const fieldIndex = salesFormLabels.findIndex((label, index) => index > lastFieldIndex && label?.startsWith(field));
    expect(fieldIndex, `${field} should follow the requested form order`).toBeGreaterThan(lastFieldIndex);
    lastFieldIndex = fieldIndex;
  }
  expect(within(dialog).queryByLabelText('关联付款阶段')).not.toBeInTheDocument();
  expect(within(dialog).queryByLabelText(/阶段约定时间/)).not.toBeInTheDocument();
  const noteWrapper = within(dialog).getByLabelText('备注').closest('div');
  const uploadWrapper = within(dialog).getByText('上传发票').closest('div');
  expect(noteWrapper?.parentElement).not.toHaveClass('finance-form-grid');
  expect(uploadWrapper?.parentElement).not.toHaveClass('finance-form-grid');
  fireEvent.change(within(dialog).getByLabelText('发票号码'), { target: { value: 'FP-001' } });
  expect(within(dialog).getByPlaceholderText('请输入发票号码')).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('开票日期'), { target: { value: '2026-11-12' } });
  await waitFor(() => expect(within(dialog).getByLabelText('申请人')).toHaveValue('user-1'));
  fireEvent.change(within(dialog).getByLabelText('申请人'), { target: { value: 'user-2' } });
  const profileOption = within(dialog).getByRole('option', { name: '客户甲开票抬头' });
  fireEvent.change(within(dialog).getByLabelText('购方抬头/客户名称'), { target: { value: profileOption.getAttribute('value') } });
  const salesProject = within(dialog).getByLabelText('关联项目');
  expect(salesProject).toBeRequired();
  expect(within(dialog).getByLabelText('关联客户')).toBeRequired();
  fireEvent.change(salesProject, { target: { value: 'project-1' } });
  const salesContract = within(dialog).getByLabelText('关联合同');
  expect(within(salesContract).getByRole('option', { name: 'CT-001 · 测试合同' })).toBeInTheDocument();
  expect(within(salesContract).queryByRole('option', { name: /CT-002/ })).not.toBeInTheDocument();
  fireEvent.change(salesContract, { target: { value: 'contract-1' } });
  fireEvent.click(within(dialog).getByLabelText('选择阶段-第一笔'));
  expect(within(dialog).getByLabelText('关联项目')).toHaveValue('project-1');
  expect(within(dialog).getByLabelText('关联客户')).toHaveValue('测试客户');
  expect(within(dialog).getByLabelText('含税开票金额 (元)')).toHaveValue(60000);
  fireEvent.change(within(dialog).getByLabelText('含税开票金额 (元)'), { target: { value: '1200000' } });
  fireEvent.change(within(dialog).getByLabelText('适用税率'), { target: { value: '6%' } });
  const reason = within(dialog).getByLabelText('备注');
  expect(reason).toBeRequired();
  fireEvent.click(within(dialog).getByRole('button', { name: '确认开具入账' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.change(reason, { target: { value: '项目实施计划调整，申请提前开票' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '确认开具入账' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('请上传至少一份发票附件');
  const invoiceFile = new File(['invoice contents'], 'invoice.pdf', { type: 'application/pdf' });
  const uploadInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(uploadInput, { target: { files: [invoiceFile] } });
  expect(await within(dialog).findByText('invoice.pdf')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: '确认开具入账' }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.invoiceLedger') || '{}').invoices[0]?.invoiceNo).toBe('FP-001'));
  const savedLedger = JSON.parse(localStorage.getItem('shichuang.frontend.mock.invoiceLedger') || '{}');
  expect(savedLedger.invoiceApprovals[0]).toMatchObject({
    contractId: 'contract-1', paymentScheduleId: 'contract-1:第一笔', paymentScheduleIds: ['contract-1:第一笔'], requestedAmount: 1200000, availableAmount: 60000,
    overAmount: 1140000, reason: '项目实施计划调整，申请提前开票', applicant: '其他申请人', applicantId: 'user-2', applicantDepartment: '商务部'
  });
  expect(savedLedger.invoices[0]).toMatchObject({
    invoiceNo: 'FP-001', issueDate: '2026-11-12', applicant: '其他申请人', applicantId: 'user-2', applicantDepartment: '商务部',
    note: '项目实施计划调整，申请提前开票', attachments: [expect.objectContaining({ name: 'invoice.pdf', mimeType: 'application/pdf', size: invoiceFile.size, dataUrl: expect.stringContaining('data:application/pdf;base64,') })]
  });
  expect(screen.getByRole('button', { name: 'FP-001' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'FP-001' }));
  expect(screen.getByText('待审批')).toBeInTheDocument();
  expect(screen.getAllByText('2026-11-12')).toHaveLength(2);
});

it('supports selecting multiple contract stages and editing the summed invoice amount', () => {
  render(<InvoiceManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '开具发票' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  fireEvent.change(within(dialog).getByLabelText('关联合同'), { target: { value: 'contract-1' } });
  expect(within(dialog).getByLabelText('关联合同')).toHaveValue('contract-1');
  const amount = within(dialog).getByLabelText('含税开票金额 (元)');
  expect(within(dialog).queryByLabelText(/阶段约定时间/)).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByLabelText('选择阶段-第一笔'));
  expect(amount).toHaveValue(60000);
  fireEvent.click(within(dialog).getByLabelText('选择阶段-尾款'));
  expect(amount).toHaveValue(200000);
  fireEvent.change(amount, { target: { value: '180000' } });
  expect(amount).toHaveValue(180000);
  fireEvent.click(within(dialog).getByLabelText('选择阶段-尾款'));
  expect(amount).toHaveValue(60000);
});

it('requires and saves a purchase invoice attachment with project-derived customer and ledger columns', async () => {
  localStorage.setItem('shichuang.frontend.mock.procurementItems', JSON.stringify([
    { id: 'purchase-1', code: 'PO-001', type: '硬件设备', supplier: '测试供应商', description: '办公设备', amount: 500, status: '待审批', projectId: 'project-1', projectName: '测试项目', customerId: 'customer-1', customerName: '测试客户' },
    { id: 'purchase-2', code: 'PO-002', type: '硬件设备', supplier: '其他供应商', description: '其他项目设备', amount: 600, status: '待审批', projectId: 'project-2', projectName: '其他项目', customerId: 'customer-2', customerName: '其他客户' }
  ]));
  render(<InvoiceManagementView />);
  fireEvent.click(screen.getByRole('tab', { name: '进项发票' }));
  fireEvent.click(screen.getByRole('button', { name: '录入发票' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { name: '录入增值税发票' })).toBeInTheDocument();
  expect(within(dialog).getByLabelText('关联合同')).not.toBeRequired();
  expect(within(dialog).getByLabelText('关联项目')).toBeRequired();
  expect(within(dialog).getByLabelText('关联客户')).toBeRequired();
  expect(within(dialog).queryByText('合同付款阶段')).not.toBeInTheDocument();
  const purchaseProject = within(dialog).getByLabelText('关联项目');
  const purchaseSelector = within(dialog).getByLabelText('关联采购单');
  expect(purchaseSelector).toBeDisabled();
  fireEvent.change(purchaseProject, { target: { value: 'project-1' } });
  expect(within(purchaseSelector).getByRole('option', { name: /PO-001/ })).toBeInTheDocument();
  expect(within(purchaseSelector).queryByRole('option', { name: /PO-002/ })).not.toBeInTheDocument();
  const purchaseContract = within(dialog).getByLabelText('关联合同');
  expect(purchaseContract).not.toBeDisabled();
  expect(within(purchaseContract).getByRole('option', { name: 'CT-001 · 测试合同' })).toBeInTheDocument();
  expect(within(purchaseContract).queryByRole('option', { name: /CT-002/ })).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('发票号码'), { target: { value: 'FP-P-001' } });
  fireEvent.change(within(dialog).getByLabelText('销方抬头/供应商名称'), { target: { value: '测试供应商' } });
  fireEvent.change(purchaseSelector, { target: { value: 'PO-001' } });
  fireEvent.change(within(dialog).getByLabelText('关联合同'), { target: { value: 'contract-1' } });
  expect(within(dialog).getByLabelText('关联客户')).toHaveValue('测试客户');
  fireEvent.change(purchaseProject, { target: { value: 'project-2' } });
  expect(within(dialog).getByLabelText('关联采购单')).toHaveValue('');
  expect(within(dialog).getByLabelText('关联合同')).toHaveValue('');
  fireEvent.change(purchaseProject, { target: { value: 'project-1' } });
  fireEvent.change(within(dialog).getByLabelText('关联采购单'), { target: { value: 'PO-001' } });
  fireEvent.change(within(dialog).getByLabelText('关联合同'), { target: { value: 'contract-1' } });
  fireEvent.change(within(dialog).getByLabelText('含税开票金额 (元)'), { target: { value: '500' } });
  fireEvent.change(within(dialog).getByLabelText('适用税率'), { target: { value: '13%' } });
  fireEvent.change(within(dialog).getByLabelText('备注'), { target: { value: '办公设备采购' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '确认录入发票' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('请上传至少一份发票附件');
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.invoiceLedger') || '{}').invoices.some((invoice: { invoiceNo: string }) => invoice.invoiceNo === 'FP-P-001')).toBe(false);
  const invoiceFile = new File(['purchase invoice'], 'purchase-invoice.pdf', { type: 'application/pdf' });
  const uploadInput = dialog.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(uploadInput, { target: { files: [invoiceFile] } });
  expect(await within(dialog).findByText('purchase-invoice.pdf')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: '确认录入发票' }));
  await waitFor(() => expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.invoiceLedger') || '{}').invoices[0]?.invoiceNo).toBe('FP-P-001'));
  const savedInvoice = JSON.parse(localStorage.getItem('shichuang.frontend.mock.invoiceLedger') || '{}').invoices[0];
  expect(savedInvoice.attachments).toEqual([expect.objectContaining({
    name: 'purchase-invoice.pdf', mimeType: 'application/pdf', size: invoiceFile.size,
    dataUrl: expect.stringContaining('data:application/pdf;base64,')
  })]);
  expect(loadInvoiceLedger().invoices[0].attachments).toEqual(savedInvoice.attachments);
  expect(screen.getByText('FP-P-001')).toBeInTheDocument();
  expect(screen.getByText(/PO-001 \/ CT-001/)).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '关联采购单/合同' })).toBeInTheDocument();
  expect(screen.getByText('CT-001', { exact: false })).toBeInTheDocument();
  expect(screen.getByText('办公设备采购')).toBeInTheDocument();
  expect(screen.getByText('¥ 500')).toBeInTheDocument();
});

it('blocks a purchase invoice when its required project is missing', async () => {
  render(<InvoiceManagementView />);
  fireEvent.click(screen.getByRole('tab', { name: '进项发票' }));
  fireEvent.click(screen.getByRole('button', { name: '录入发票' }));
  const dialog = screen.getByRole('dialog');
  const project = within(dialog).getByLabelText('关联项目');
  expect(project).toBeRequired();
  expect(within(dialog).getByLabelText('关联客户')).toBeRequired();
  fireEvent.change(within(dialog).getByLabelText('发票号码'), { target: { value: 'FP-P-NO-PROJECT' } });
  fireEvent.change(within(dialog).getByLabelText('销方抬头/供应商名称'), { target: { value: '测试供应商' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '确认录入发票' }));
  expect(project).toBeInvalid();
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.invoiceLedger') || '{}').invoices.some((invoice: { invoiceNo: string }) => invoice.invoiceNo === 'FP-P-NO-PROJECT')).toBe(false);
});

it('creates one contract plan with all payment stages and allocates receipts across stages', () => {
  localStorage.setItem('shichuang.frontend.mock.paymentCollection', JSON.stringify({ plans: [], records: [] }));
  render(<PaymentCollectionManagementView />);
  expect(screen.getByRole('tablist', { name: '回款视图' })).toBeInTheDocument();
  expect(screen.getByText('暂无应收计划')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '实际到账' }));
  expect(screen.getByText('暂无到账记录')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '应收计划' }));
  fireEvent.click(screen.getByRole('button', { name: '新建应收计划' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  expect(within(dialog).getByLabelText('关联合同')).toHaveValue('');
  expect(within(dialog).getByLabelText('关联合同')).not.toBeDisabled();
  expect(within(dialog).getByRole('option', { name: /CT-001 · 测试合同/ })).toBeInTheDocument();
  expect(within(dialog).queryByRole('option', { name: /CT-002/ })).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('关联合同'), { target: { value: 'contract-1' } });
  expect(within(dialog).queryByLabelText('合同付款阶段')).not.toBeInTheDocument();
  expect(within(dialog).getByLabelText('关联项目')).toHaveValue('project-1');
  expect(within(dialog).getByLabelText('关联项目')).not.toBeDisabled();
  expect(within(dialog).getByLabelText('客户名称')).toHaveValue('测试客户');
  expect(within(dialog).getByText('合同签订后')).toBeInTheDocument();
  expect(within(dialog).getByText('项目验收后')).toBeInTheDocument();
  const firstStageDate = within(dialog).getByLabelText('阶段约定时间-第一笔');
  expect(firstStageDate).toHaveValue('');
  expect(firstStageDate).not.toBeRequired();
  fireEvent.change(firstStageDate, { target: { value: '2026-11-30' } });
  fireEvent.change(within(dialog).getByLabelText('计划备注'), { target: { value: '合同阶段应收说明' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '保存应收计划' }));
  const createdPlan = JSON.parse(localStorage.getItem('shichuang.frontend.mock.paymentCollection') || '{}').plans[0];
  expect(createdPlan).toMatchObject({ contractName: '测试合同', dueDate: '2026-11-30', planAmount: 200000, uncollectedAmount: 200000, note: '合同阶段应收说明', stages: [{ phase: '第一笔', amount: 60000, dueDate: '2026-11-30' }, { phase: '尾款', amount: 140000 }] });
  expect(screen.queryByRole('columnheader', { name: '收款阶段' })).not.toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '合同名称' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '新建应收计划' }));
  const duplicateDialog = screen.getByRole('dialog');
  fireEvent.change(within(duplicateDialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  expect(within(duplicateDialog).getByRole('option', { name: /CT-001 · 测试合同/ })).toBeDisabled();
  fireEvent.click(within(duplicateDialog).getByRole('button', { name: '关闭' }));
  const planRow = screen.getByRole('button', { name: createdPlan.planCode }).closest('tr') as HTMLElement;
  expect(within(planRow).getByRole('button', { name: createdPlan.planCode })).toHaveClass('finance-action-link');
  fireEvent.click(within(planRow).getByRole('button', { name: createdPlan.planCode }));
  expect(screen.getByRole('heading', { name: '应收计划详情' })).toBeInTheDocument();
  expect(document.querySelector('.finance-detail-metrics')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '付款阶段' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '关闭' }));
  const detailButton = within(planRow).getByRole('button', { name: '详情' });
  expect(detailButton).toHaveClass('finance-action-link');
  expect(within(planRow).getByRole('button', { name: '登记到账' })).toHaveClass('finance-action-link');
  fireEvent.click(detailButton);
  expect(screen.getByRole('heading', { name: '应收计划详情' })).toBeInTheDocument();
  expect(screen.getByText('合同签订后')).toBeInTheDocument();
  expect(screen.getByText('项目验收后')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '关闭' }));
  expect(screen.queryByRole('heading', { name: '应收计划详情' })).not.toBeInTheDocument();
  expect(screen.getByText('测试客户')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '登记到账' }));
  const receiptDialog = screen.getByRole('dialog');
  const salesInvoiceSelector = within(receiptDialog).getByLabelText('关联销项发票');
  expect(salesInvoiceSelector).not.toBeRequired();
  expect(within(salesInvoiceSelector).getByRole('option', { name: 'FP-DEMO-2026-002 / 在线精品课程资源库建设项目' })).toBeInTheDocument();
  expect(within(salesInvoiceSelector).queryByRole('option', { name: /FP-DEMO-2026-101/ })).not.toBeInTheDocument();
  fireEvent.change(salesInvoiceSelector, { target: { value: 'demo-invoice-sales-002' } });
  const firstStageAllocation = within(receiptDialog).getByLabelText('到账分配-第一笔');
  const receiptDateTime = within(receiptDialog).getByLabelText('到账时间');
  expect(receiptDateTime).toBeRequired();
  fireEvent.change(receiptDateTime, { target: { value: '2026-11-20T10:15' } });
  expect(firstStageAllocation).toHaveAttribute('max', '60000');
  fireEvent.change(firstStageAllocation, { target: { value: '60001' } });
  expect(firstStageAllocation).toBeInvalid();
  fireEvent.click(within(receiptDialog).getByRole('button', { name: '确认登记到账' }));
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.paymentCollection') || '{}').records).toHaveLength(0);
  fireEvent.change(firstStageAllocation, { target: { value: '30000' } });
  fireEvent.change(within(receiptDialog).getByLabelText('到账分配-尾款'), { target: { value: '10000' } });
  fireEvent.change(within(receiptDialog).getByLabelText('到账备注'), { target: { value: '首笔分段到账' } });
  expect(within(receiptDialog).getByLabelText('本次到账金额')).toHaveTextContent('¥ 40,000');
  fireEvent.click(within(receiptDialog).getByRole('button', { name: '确认登记到账' }));
  const savedCollection = JSON.parse(localStorage.getItem('shichuang.frontend.mock.paymentCollection') || '{}');
  expect(savedCollection.records[0]).toMatchObject({ amount: 40000, payDate: '2026-11-20T10:15', note: '首笔分段到账', salesInvoiceId: 'demo-invoice-sales-002', salesInvoiceNo: 'FP-DEMO-2026-002', salesInvoiceProjectName: '在线精品课程资源库建设项目', stageAllocations: [{ stageId: 'contract-1-stage-0', amount: 30000 }, { stageId: 'contract-1-stage-1', amount: 10000 }] });
  expect(savedCollection.plans[0]).toMatchObject({ receivedAmount: 40000, uncollectedAmount: 160000, status: '部分回款' });
  expect(savedCollection.plans[0].stages).toMatchObject([{ receivedAmount: 30000 }, { receivedAmount: 10000 }]);
  fireEvent.click(screen.getByRole('tab', { name: '实际到账' }));
  expect(screen.getByRole('columnheader', { name: '关联销项发票' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: '银行流水号' })).not.toBeInTheDocument();
  const receiptRow = screen.getByText(savedCollection.records[0].recordCode).closest('tr') as HTMLElement;
  expect(within(receiptRow).getByText('FP-DEMO-2026-002 / 在线精品课程资源库建设项目')).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: '银行流水号' })).not.toBeInTheDocument();
  expect(within(receiptRow).getByRole('button', { name: createdPlan.planCode })).toHaveClass('finance-action-link');
  expect(within(receiptRow).getByText('2026-11-20 10:15')).toBeInTheDocument();
  fireEvent.click(within(receiptRow).getByRole('button', { name: createdPlan.planCode }));
  expect(screen.getByRole('heading', { name: '应收计划详情' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '关闭' }));
  fireEvent.click(screen.getByRole('tab', { name: '应收计划' }));
  const updatedPlanRow = screen.getByRole('button', { name: createdPlan.planCode }).closest('tr') as HTMLElement;
  fireEvent.click(within(updatedPlanRow).getByRole('button', { name: '登记到账' }));
  const secondReceiptDialog = screen.getByRole('dialog');
  fireEvent.change(within(secondReceiptDialog).getByLabelText('到账分配-第一笔'), { target: { value: '30000' } });
  fireEvent.change(within(secondReceiptDialog).getByLabelText('到账分配-尾款'), { target: { value: '130000' } });
  fireEvent.change(within(secondReceiptDialog).getByLabelText('到账时间'), { target: { value: '2026-12-01T14:30' } });
  fireEvent.click(within(secondReceiptDialog).getByRole('button', { name: '确认登记到账' }));
  const completedCollection = JSON.parse(localStorage.getItem('shichuang.frontend.mock.paymentCollection') || '{}');
  expect(completedCollection.records).toHaveLength(2);
  expect(completedCollection.records[0].stageAllocations.map(({ stageName, amount }: { stageName: string; amount: number }) => ({ stageName, amount }))).toEqual([{ stageName: '第一笔', amount: 30000 }, { stageName: '尾款', amount: 130000 }]);
  expect(completedCollection.plans[0]).toMatchObject({ receivedAmount: 200000, uncollectedAmount: 0, status: '已回款' });
  expect(completedCollection.plans[0].stages).toMatchObject([{ receivedAmount: 60000 }, { receivedAmount: 140000 }]);
  expect(within(planRow).queryByRole('button', { name: '登记到账' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '项目收支' }));
  expect(screen.getByRole('columnheader', { name: '实际净流入' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: '预计净流入' })).toBeInTheDocument();
});

it('offers three linked receivable demo contracts with balanced stage terms in local mock mode', () => {
  expect(RECEIVABLE_DEMO_CONTRACTS).toHaveLength(3);
  for (const contract of RECEIVABLE_DEMO_CONTRACTS) {
    expect(contract.isDemo).toBe(true);
    expect(contract.customerId).toBeTruthy();
    expect(contract.paymentStages?.reduce((sum, stage) => sum + stage.percentage, 0)).toBe(100);
    expect(contract.paymentStages?.reduce((sum, stage) => sum + stage.amount, 0)).toBe(contract.amount);
    expect(directoryProjects().some((project) => project.name === contract.relatedProduct && project.customerId === contract.customerId)).toBe(true);
  }

  render(<PaymentCollectionManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建应收计划' }));
  const dialog = screen.getByRole('dialog');
  const project = directoryProjects().find((item) => item.name === RECEIVABLE_DEMO_CONTRACTS[0].relatedProduct);
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: project?.id } });
  for (const contract of RECEIVABLE_DEMO_CONTRACTS) {
    const option = within(dialog).queryByRole('option', { name: new RegExp(contract.code + '.*演示') });
    if (contract.id === RECEIVABLE_DEMO_CONTRACTS[0].id) expect(option).toBeInTheDocument();
    else expect(option).not.toBeInTheDocument();
  }
  const secondDemoProject = directoryProjects().find((item) => item.name === RECEIVABLE_DEMO_CONTRACTS[1].relatedProduct);
  fireEvent.change(within(dialog).getByLabelText('关联合同'), { target: { value: RECEIVABLE_DEMO_CONTRACTS[0].id } });
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: secondDemoProject?.id } });
  expect(within(dialog).getByLabelText('关联合同')).toHaveValue('');
  expect(within(dialog).getByRole('option', { name: new RegExp(RECEIVABLE_DEMO_CONTRACTS[1].code + '.*演示') })).toBeInTheDocument();
  expect(within(dialog).queryByRole('option', { name: new RegExp(RECEIVABLE_DEMO_CONTRACTS[0].code + '.*演示') })).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: project?.id } });
  fireEvent.change(within(dialog).getByLabelText('关联合同'), { target: { value: RECEIVABLE_DEMO_CONTRACTS[0].id } });
  expect(within(dialog).getByLabelText('关联项目')).toHaveValue(project?.id);
  expect(within(dialog).getByLabelText('客户名称')).toHaveValue(RECEIVABLE_DEMO_CONTRACTS[0].customerName);
});

it('shows only project purchases, reports distinct project count, and keeps project required on creation', () => {
  const project = { id: 'project-1', name: '测试项目', customerId: 'customer-1', customerName: '测试客户' };
  localStorage.setItem('shichuang.frontend.mock.procurementItems', JSON.stringify([
    { id: 'project-purchase-1', code: 'PO-001', supplier: '供应商甲', description: '项目设备', amount: 1200, status: '待审批', projectId: project.id, projectName: project.name, customerName: project.customerName },
    { id: 'legacy-general-purchase', code: 'PO-GENERAL', supplier: '供应商乙', description: '行政用品', amount: 300, status: '待审批', relatedProject: '通用项目' }
  ]));
  render(<ProcurementManagementView />);
  expect(screen.getByText('PO-001')).toBeInTheDocument();
  expect(screen.queryByText('PO-GENERAL')).not.toBeInTheDocument();
  expect(screen.getByText('关联项目数').parentElement?.parentElement).toHaveTextContent(/1\s*个/);
  expect(screen.getByText('采购总金额').parentElement?.parentElement).toHaveTextContent('¥ 1,200');
  expect(screen.queryByRole('tab', { name: '入库登记与资产联动' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '新建采购申请' })).not.toBeInTheDocument();
  const approvalButton = screen.getByRole('button', { name: '发起采购审批' });
  expect(approvalButton).toHaveClass('bg-[var(--bg-elevated)]');
  expect(approvalButton).not.toHaveClass('bg-[var(--primary)]');
  fireEvent.click(screen.getByRole('button', { name: '新建采购单' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByLabelText('关联项目')).toBeRequired();
  expect(within(dialog).getByLabelText('关联客户')).toHaveAttribute('readonly');
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: project.id } });
  expect(within(dialog).getByLabelText('关联客户')).toHaveValue(project.customerName);
});

it('shows the matching contract name for a saved plan whose old contract id no longer resolves', () => {
  localStorage.setItem('shichuang.frontend.mock.paymentCollection', JSON.stringify({
    plans: [{ id: 'legacy-plan', planCode: 'AR-LEGACY-001', category: '合同款', contractId: 'removed-contract-id', contractCode: 'CT-001', projectId: 'project-1', projectName: '测试项目', customerId: 'customer-1', customerName: '测试客户', stageName: '合同款', planAmount: 200, receivedAmount: 0, uncollectedAmount: 200, dueDate: '2026-12-30', status: '待回款', manager: '财务' }],
    records: []
  }));
  render(<PaymentCollectionManagementView />);
  expect(screen.getByText('测试合同')).toBeInTheDocument();
  expect(screen.queryByText('CT-001')).not.toBeInTheDocument();
});

it('offers the new receivable types and requires the matching deposit category and project', () => {
  localStorage.setItem('shichuang.frontend.mock.accountsPayable', JSON.stringify({
    payables: [
      { id: 'bid-deposit', payableCode: 'AP-BID', category: '投标保证金', supplierName: '招标单位', projectId: 'project-1', projectName: '测试项目', amount: 30000, paidAmount: 30000, unpaidAmount: 0, dueDate: '2026-10-01', status: '已结清', applicant: '财务' },
      { id: 'performance-deposit', payableCode: 'AP-PERFORMANCE', category: '履约保证金', supplierName: '业主单位', projectId: 'project-1', projectName: '测试项目', amount: 20000, paidAmount: 20000, unpaidAmount: 0, dueDate: '2026-10-02', status: '已结清', applicant: '财务' }
    ], payments: []
  }));
  render(<PaymentCollectionManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建应收计划' }));
  const dialog = screen.getByRole('dialog');
  const category = within(dialog).getByLabelText('应收类型');
  expect([...category.querySelectorAll('option')].map(option => option.textContent)).toEqual(['合同款', '运营中心分成', '投标保证金', '履约保证金', '质保金', '其他']);
  fireEvent.change(category, { target: { value: '投标保证金' } });
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  const source = within(dialog).getByLabelText('原缴保证金记录');
  expect([...source.querySelectorAll('option')].map(option => option.textContent)).toEqual(['请选择已支付的投标保证金', 'AP-BID · 招标单位 · 可退 ¥ 30,000']);
  fireEvent.change(category, { target: { value: '履约保证金' } });
  const performanceSource = within(dialog).getByLabelText('原缴保证金记录');
  expect([...performanceSource.querySelectorAll('option')].map(option => option.textContent)).toEqual(['请选择已支付的履约保证金', 'AP-PERFORMANCE · 业主单位 · 可退 ¥ 20,000']);
  fireEvent.change(category, { target: { value: '运营中心分成' } });
  expect(within(dialog).getByLabelText('关联合同')).toBeRequired();
  expect(within(dialog).queryByLabelText('合同付款阶段')).not.toBeInTheDocument();
});

it('creates an other-type receivable from manually entered amount and date without a contract', () => {
  localStorage.setItem('shichuang.frontend.mock.paymentCollection', JSON.stringify({ plans: [], records: [] }));
  render(<PaymentCollectionManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建应收计划' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('应收类型'), { target: { value: '其他' } });
  expect(within(dialog).getByLabelText('关联合同')).not.toBeRequired();
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  fireEvent.change(within(dialog).getByLabelText('应收说明'), { target: { value: '项目服务补款' } });
  fireEvent.change(within(dialog).getByLabelText('应收金额'), { target: { value: '2800' } });
  fireEvent.change(within(dialog).getByLabelText('约定收款日期'), { target: { value: '2026-12-15' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '保存应收计划' }));

  const plan = JSON.parse(localStorage.getItem('shichuang.frontend.mock.paymentCollection') || '{}').plans[0];
  expect(plan).toMatchObject({ category: '其他', stageName: '项目服务补款', planAmount: 2800, dueDate: '2026-12-15', projectId: 'project-1' });
});

it('links a deposit refund plan to the paid project deposit and reserves its return amount', () => {
  localStorage.setItem('shichuang.frontend.mock.accountsPayable', JSON.stringify({
    payables: [{ id: 'deposit-1', payableCode: 'AP-DEPOSIT-1', category: '投标保证金', supplierName: '招标单位', projectId: 'project-1', projectName: '测试项目', amount: 50000, paidAmount: 50000, unpaidAmount: 0, dueDate: '2026-10-01', status: '已结清', applicant: '财务' }],
    payments: []
  }));
  render(<PaymentCollectionManagementView />);
  fireEvent.click(screen.getByRole('button', { name: '新建应收计划' }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('应收类型'), { target: { value: '投标保证金' } });
  fireEvent.change(within(dialog).getByLabelText('关联项目'), { target: { value: 'project-1' } });
  fireEvent.change(within(dialog).getByLabelText('原缴保证金记录'), { target: { value: 'deposit-1' } });
  fireEvent.change(within(dialog).getByLabelText('应收说明'), { target: { value: '投标保证金退回' } });
  fireEvent.change(within(dialog).getByLabelText('约定收款日期'), { target: { value: '2026-11-30' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '保存应收计划' }));
  const plan = JSON.parse(localStorage.getItem('shichuang.frontend.mock.paymentCollection') || '{}').plans[0];
  const deposit = JSON.parse(localStorage.getItem('shichuang.frontend.mock.accountsPayable') || '{}').payables[0];
  expect(plan).toMatchObject({ category: '投标保证金', sourcePayableId: 'deposit-1', planAmount: 50000, projectId: 'project-1' });
  expect(deposit.returnPlannedAmount).toBe(50000);
});
