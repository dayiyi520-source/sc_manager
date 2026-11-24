import React, { useEffect, useState } from 'react';
import { Button, Empty, Popconfirm, Upload, message } from 'antd';
import type { UploadFile } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import './finance-management.css';
import { 
  Receipt, 
  Plus, 
  Search, 
  FileText, 
  Building2, 
  DollarSign, 
  Building
} from '@/components/common/octicons-compat';
import { Drawer, StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
import { useApp } from '../../context/AppContext';
import { AttachmentMetadata, Contract, EmployeeOption, InvoiceApprovalRecord, InvoiceRecord, TaxProfile } from '../../types';
import { loadInvoiceLedger, saveInvoiceLedger } from '../../services/invoiceLedgerRepository';
import { DEMO_INVOICE_CONTRACTS } from '../../services/invoiceLedgerDemoData';
import { teamRepository } from '../../services/teamRepository';
import { loadProcurementItems } from '../../services/procurementRepository';
import { FinanceDetailFields, FinanceDetailMetrics, FinanceDetailSection } from './FinanceDetailPrimitives';

const TAX_RATES = ['1%', '3%', '6%', '9%', '13%'];

type InvoiceFormValues = {
  invoiceNo: string;
  issueDate: string;
  title: string;
  contractId: string;
  paymentScheduleIds: string[];
  purchaseOrderCode: string;
  projectId: string;
  amount: string;
  taxRate: string;
  applicantId: string;
  approvalReason: string;
  note: string;
  attachments: AttachmentMetadata[];
};

const emptyInvoiceForm = (): InvoiceFormValues => ({
  invoiceNo: '', issueDate: '', title: '', contractId: '', paymentScheduleIds: [], purchaseOrderCode: '',
  projectId: '', amount: '', taxRate: '', applicantId: '', approvalReason: '', note: '', attachments: []
});

const readInvoiceFile = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const InvoiceManagementView: React.FC = () => {
  const {
    addToast, invoices, setInvoices, customers, contracts, projects, paymentSchedules,
    setPaymentSchedules, invoiceApprovals, setInvoiceApprovals, partners, currentUser
  } = useApp();
  const procurementItems = loadProcurementItems(projects).filter((item) => projects.some((project) =>
    item.projectId ? project.id === item.projectId : project.name === (item.projectName || item.relatedProject)
  ));
  const invoiceContracts: Contract[] = contracts.length ? contracts : DEMO_INVOICE_CONTRACTS;

  const [activeTab, setActiveTab] = useState<'sales' | 'purchase' | 'tax_profile'>('sales');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<InvoiceRecord | null>(null);
  const [invoiceEntryType, setInvoiceEntryType] = useState<'销项' | '进项'>('销项');
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormValues>(emptyInvoiceForm);
  const [applicantOptions, setApplicantOptions] = useState<EmployeeOption[]>([]);
  const [applicantOptionsLoading, setApplicantOptionsLoading] = useState(false);
  const [applicantOptionsError, setApplicantOptionsError] = useState('');
  const [invoiceAttachmentError, setInvoiceAttachmentError] = useState('');

  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>(() => loadInvoiceLedger().taxProfiles);
  const [supplierOptions] = useState<string[]>(() => loadInvoiceLedger().supplierOptions);
  const availableSuppliers = [...new Set([...supplierOptions, ...partners.map((partner) => partner.name)])];
  const selectedApplicant = applicantOptions.find((person) => person.id === invoiceForm.applicantId);

  useEffect(() => {
    let active = true;
    setApplicantOptionsLoading(true);
    setApplicantOptionsError('');
    void teamRepository.options().then((options) => {
      if (!active) return;
      setApplicantOptions(options.filter((person) => person.name.trim()));
      setInvoiceForm((previous) => ({
        ...previous,
        applicantId: previous.applicantId || (options.some((person) => person.id === currentUser.id) ? currentUser.id : '')
      }));
    }).catch((error: unknown) => {
      if (!active) return;
      setApplicantOptionsError(error instanceof Error ? error.message : '组织成员加载失败，请重试');
    }).finally(() => {
      if (active) setApplicantOptionsLoading(false);
    });
    return () => { active = false; };
  }, [currentUser.id]);

  const [newProfileForm, setNewProfileForm] = useState({
    companyName: '',
    taxId: '',
    bankName: '',
    bankAccount: '',
    addressPhone: ''
  });

  const selectedContract = invoiceContracts.find((contract) => contract.id === invoiceForm.contractId);
  const selectedProject = projects.find((project) => project.id === invoiceForm.projectId);
  const projectContracts = selectedProject ? invoiceContracts.filter((contract) => contract.relatedProduct === selectedProject.name || paymentSchedules.some((schedule) => schedule.contractId === contract.id && schedule.projectId === selectedProject.id)) : [];
  const projectProcurementItems = selectedProject ? procurementItems.filter((item) => item.projectId ? item.projectId === selectedProject.id : (item.projectName || item.relatedProject) === selectedProject.name) : [];
  const selectedProjectCustomer = selectedProject?.customerId
    ? customers.find((customer) => customer.id === selectedProject.customerId)
    : customers.find((customer) => customer.name === selectedProject?.customerName);
  const linkedPaymentSchedules = selectedContract
    ? paymentSchedules.filter((schedule) => schedule.contractId === selectedContract.id)
    : [];
  const paymentStageOptions = selectedContract
    ? (selectedContract.paymentStages?.length
      ? selectedContract.paymentStages.map((stage) => {
          const schedule = linkedPaymentSchedules.find((item) => item.stageName === stage.phase);
          return {
            id: schedule?.id || `${selectedContract.id}:${stage.phase}`,
            name: stage.phase,
            triggerCondition: stage.triggerCondition,
            percentage: stage.percentage,
            amount: stage.amount,
            invoicedAmount: schedule?.invoicedAmount || 0
          };
        })
      : linkedPaymentSchedules.map((schedule) => ({
          id: schedule.id,
          name: schedule.stageName,
          triggerCondition: undefined,
          percentage: 0,
          amount: schedule.amount,
          invoicedAmount: schedule.invoicedAmount || 0
        })))
    : [];
  const selectedPaymentStages = paymentStageOptions.filter((stage) => invoiceForm.paymentScheduleIds.includes(stage.id));
  const selectedStageAmount = selectedPaymentStages.reduce((sum, stage) => sum + stage.amount, 0);
  const availableStageBalance = selectedPaymentStages.length
    ? selectedPaymentStages.reduce((sum, stage) => sum + Math.max(0, stage.amount - stage.invoicedAmount), 0)
    : null;
  const requestedAmount = Number(invoiceForm.amount) || 0;
  const exceedsStageBalance = invoiceEntryType === '销项'
    && availableStageBalance !== null
    && requestedAmount > availableStageBalance;
  const salesInvoices = invoices.filter((invoice) => invoice.type === '销项' || invoice.type === '销项发票');
  const purchaseInvoices = invoices.filter((invoice) => invoice.type === '进项' || invoice.type === '进项发票');
  const salesTotal = salesInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const purchaseDeductionTotal = purchaseInvoices.reduce((sum, invoice) => sum + (invoice.taxAmount || 0), 0);
  const invoiceStageName = (invoice: InvoiceRecord) => {
    const stageIds = invoice.paymentScheduleIds || (invoice.paymentScheduleId ? [invoice.paymentScheduleId] : []);
    const stageNames = stageIds.map((stageId) => {
      const scheduleStage = paymentSchedules.find((schedule) => schedule.id === stageId)?.stageName;
      if (scheduleStage) return scheduleStage;
      const [contractId, stageName] = stageId.split(':');
      return invoiceContracts.find((contract) => contract.id === contractId)?.paymentStages?.find((stage) => stage.phase === stageName)?.phase || stageName;
    }).filter(Boolean);
    return stageNames.length ? stageNames.join('、') : '—';
  };

  const deleteInvoice = (invoice: InvoiceRecord) => {
    const nextInvoices = invoices.filter((item) => item.id !== invoice.id);
    const remainingStageAmount = invoice.paymentScheduleId
      ? nextInvoices
        .filter((item) => item.paymentScheduleId === invoice.paymentScheduleId)
        .reduce((sum, item) => sum + item.amount, 0)
      : 0;
    const nextPaymentSchedules = invoice.paymentScheduleId
      ? paymentSchedules.map((schedule) => schedule.id === invoice.paymentScheduleId
        ? {
            ...schedule,
            invoicedAmount: Math.max(0, (schedule.invoicedAmount || 0) - invoice.amount),
            invoiceStatus: remainingStageAmount > 0 ? '已开具' : '待开具',
            isInvoiced: remainingStageAmount > 0
          }
        : schedule)
      : paymentSchedules;
    const nextApprovals = invoice.approvalRecordId || invoice.id
      ? invoiceApprovals.filter((approval) => approval.id !== invoice.approvalRecordId && approval.invoiceId !== invoice.id)
      : invoiceApprovals;

    try {
      saveInvoiceLedger({ invoices: nextInvoices, paymentSchedules: nextPaymentSchedules, invoiceApprovals: nextApprovals, taxProfiles, supplierOptions });
    } catch (error) {
      addToast('error', '删除发票失败', error instanceof Error ? error.message : '请稍后重试');
      return;
    }
    setInvoices(nextInvoices);
    setPaymentSchedules(nextPaymentSchedules);
    setInvoiceApprovals(nextApprovals);
    addToast('success', '发票已删除', `发票号码：${invoice.invoiceNo}`);
  };

  const openInvoiceModal = (type: '销项' | '进项') => {
    setInvoiceEntryType(type);
    setInvoiceAttachmentError('');
    setInvoiceForm({ ...emptyInvoiceForm(), applicantId: applicantOptions.some((person) => person.id === currentUser.id) ? currentUser.id : '' });
    setShowInvoiceModal(true);
  };

  const updateInvoiceForm = (updates: Partial<InvoiceFormValues>) => {
    setInvoiceForm((previous) => ({ ...previous, ...updates }));
  };

  const handleContractChange = (contractId: string) => {
    updateInvoiceForm({ contractId, paymentScheduleIds: [], amount: '' });
  };

  const handleInvoiceProjectChange = (projectId: string) => {
    updateInvoiceForm({ projectId, contractId: '', purchaseOrderCode: '', paymentScheduleIds: [], amount: '' });
  };

  const togglePaymentStage = (stageId: string, checked: boolean) => {
    const paymentScheduleIds = checked
      ? [...invoiceForm.paymentScheduleIds, stageId]
      : invoiceForm.paymentScheduleIds.filter((id) => id !== stageId);
    const total = paymentStageOptions
      .filter((stage) => paymentScheduleIds.includes(stage.id))
      .reduce((sum, stage) => sum + stage.amount, 0);
    updateInvoiceForm({ paymentScheduleIds, amount: total ? String(total) : '' });
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (exceedsStageBalance && !invoiceForm.approvalReason.trim()) return;
    if (!invoiceForm.attachments.length) {
      setInvoiceAttachmentError('请上传至少一份发票附件');
      return;
    }
    if (invoiceEntryType === '销项' && (!invoiceForm.issueDate || !selectedApplicant)) return;
    setInvoiceAttachmentError('');
    const contract = invoiceContracts.find((item) => item.id === invoiceForm.contractId);
    const project = projects.find((item) => item.id === invoiceForm.projectId);
    const customer = project?.customerId
      ? customers.find((item) => item.id === project.customerId)
      : customers.find((item) => item.name === project?.customerName);
    if (!project || !customer) {
      addToast('error', '发票信息不完整', !project ? '请选择关联项目' : '关联项目未匹配到客户，请检查项目资料');
      return;
    }
    const title = invoiceEntryType === '销项'
      ? taxProfiles.find((profile) => profile.id === invoiceForm.title)?.companyName || ''
      : invoiceForm.title;
    const taxRateValue = Number(invoiceForm.taxRate.replace('%', ''));
    const approval: InvoiceApprovalRecord | undefined = exceedsStageBalance && selectedPaymentStages.length
      ? {
          id: `invoice-approval-${Date.now()}`,
          contractId: contract?.id,
          paymentScheduleId: selectedPaymentStages.length === 1 ? selectedPaymentStages[0].id : undefined,
          paymentScheduleIds: selectedPaymentStages.map((stage) => stage.id),
          projectId: project?.id,
          customerId: customer?.id,
          customerName: customer?.name,
          contractName: contract?.name,
          stageName: selectedPaymentStages.map((stage) => stage.name).join('、'),
          requestedAmount,
          availableAmount: availableStageBalance || 0,
          overAmount: requestedAmount - (availableStageBalance || 0),
          reason: invoiceForm.approvalReason.trim(),
          applicant: selectedApplicant?.name || currentUser.name,
          applicantId: selectedApplicant?.id,
          applicantDepartment: selectedApplicant?.department,
          appliedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          status: '待审批'
        }
      : undefined;
    const inv: InvoiceRecord = {
      id: Date.now().toString(),
      invoiceNo: invoiceForm.invoiceNo.trim(),
      type: invoiceEntryType,
      customerOrSupplier: title,
      customerName: customer?.name,
      category: invoiceEntryType === '销项' ? '销项发票' : '进项发票',
      amount: requestedAmount,
      taxRate: invoiceForm.taxRate,
      taxAmount: Math.round(requestedAmount * taxRateValue / (100 + taxRateValue) * 100) / 100,
      issueDate: invoiceEntryType === '销项' ? invoiceForm.issueDate : undefined,
      applyDate: new Date().toISOString().slice(0,10),
      status: approval ? '待审批' : invoiceEntryType === '销项' ? '已开具' : '待认证',
      issueStatus: approval ? '待审批' : '已开具',
      certificationStatus: invoiceEntryType === '进项' ? '待认证' : undefined,
      approvalRecordId: approval?.id,
      applicant: selectedApplicant?.name || currentUser.name,
      applicantId: selectedApplicant?.id,
      applicantDepartment: selectedApplicant?.department,
      attachments: invoiceForm.attachments,
      relatedContractCode: contract?.code,
      paymentScheduleId: invoiceForm.paymentScheduleIds.length === 1 ? invoiceForm.paymentScheduleIds[0] : undefined,
      paymentScheduleIds: invoiceForm.paymentScheduleIds,
      contractRef: contract?.name,
      projectId: project?.id,
      relatedProjectName: project?.name,
      customerId: customer?.id,
      purchaseOrderCode: invoiceForm.purchaseOrderCode.trim() || undefined,
      note: (invoiceEntryType === '销项' ? invoiceForm.approvalReason : invoiceForm.note).trim() || undefined
    };

    const nextInvoices = [inv, ...invoices];
    const nextApprovals = approval ? [approval, ...invoiceApprovals] : invoiceApprovals;
    const nextPaymentSchedules = invoiceEntryType === '销项' && selectedPaymentStages.length === 1
      ? paymentSchedules.map((schedule) => schedule.id === selectedPaymentStages[0].id
        ? { ...schedule, invoicedAmount: (schedule.invoicedAmount || 0) + requestedAmount, invoiceStatus: approval ? '待开具' : '已开具', isInvoiced: !approval }
        : schedule)
      : paymentSchedules;
    try {
      saveInvoiceLedger({ invoices: nextInvoices, paymentSchedules: nextPaymentSchedules, invoiceApprovals: nextApprovals, taxProfiles, supplierOptions });
    } catch (error) {
      addToast('error', '发票台账保存失败', error instanceof Error ? error.message : '请稍后重试');
      return;
    }
    setInvoices(nextInvoices);
    setPaymentSchedules(nextPaymentSchedules);
    setInvoiceApprovals(nextApprovals);
    setShowInvoiceModal(false);
    addToast(approval ? 'info' : 'success', approval ? '超额开票申请已提交审批' : invoiceEntryType === '销项' ? '发票已开具并入账' : '进项发票已录入', `发票号码：${inv.invoiceNo}`);
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const prof: TaxProfile = {
      id: Date.now().toString(),
      companyName: newProfileForm.companyName || '企业公司名称',
      taxId: newProfileForm.taxId || '91320000XXXXXXXXXX',
      bankName: newProfileForm.bankName || '开户银行',
      bankAccount: newProfileForm.bankAccount || '账号',
      addressPhone: newProfileForm.addressPhone || '地址及电话'
    };

    const nextTaxProfiles = [prof, ...taxProfiles];
    try {
      saveInvoiceLedger({ invoices, paymentSchedules, invoiceApprovals, taxProfiles: nextTaxProfiles, supplierOptions });
    } catch (error) {
      addToast('error', '抬头资料保存失败', error instanceof Error ? error.message : '请稍后重试');
      return;
    }
    setTaxProfiles(nextTaxProfiles);
    setShowProfileModal(false);
    addToast('success', '企业开票抬头录入成功', prof.companyName);
  };

  return (
    <ComprehensivePage title="发票管理" description="处理销项开票、进项登记与企业开票资质" icon={<Receipt className="w-5 h-5" />} hideHeader>
    <div className="finance-workspace space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="发票台账总数"
          value={`${invoices.length} 张`}
          subText="销项与进项发票"
          icon={<Receipt className="w-5 h-5" />}
          onClick={() => setActiveTab('sales')}
        />
        <StatCard
          title="销项开票总额"
          value={`¥ ${salesTotal.toLocaleString()}`}
          subText={`${salesInvoices.length} 张销项发票`}
          icon={<DollarSign className="w-5 h-5" />}
          onClick={() => setActiveTab('sales')}
        />
        <StatCard
          title="进项抵扣总额"
          value={`¥ ${purchaseDeductionTotal.toLocaleString()}`}
          subText={`可抵扣税额 ¥ ${purchaseDeductionTotal.toLocaleString()}`}
          icon={<FileText className="w-5 h-5" />}
          onClick={() => setActiveTab('purchase')}
        />
        <StatCard
          title="合作开票抬头库"
          value={`${taxProfiles.length} 家`}
          subText="已录入抬头资料"
          icon={<Building2 className="w-5 h-5" />}
          onClick={() => setActiveTab('tax_profile')}
        />
      </div>

      {/* Main Table Card */}
      <div className="finance-panel space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="finance-header">
          <div className="finance-tabs" role="tablist" aria-label="发票视图">
            <button
              type="button" role="tab" aria-selected={activeTab === 'sales'}
              onClick={() => setActiveTab('sales')}
              className={`finance-tab ${activeTab === 'sales' ? 'is-active' : ''}`}
            >
              <Receipt className="w-3.5 h-3.5" />
              销项开票
            </button>
            <button
              type="button" role="tab" aria-selected={activeTab === 'purchase'}
              onClick={() => setActiveTab('purchase')}
              className={`finance-tab ${activeTab === 'purchase' ? 'is-active' : ''}`}
            >
              <FileText className="w-3.5 h-3.5" />
              进项发票
            </button>
            <button
              type="button" role="tab" aria-selected={activeTab === 'tax_profile'}
              onClick={() => setActiveTab('tax_profile')}
              className={`finance-tab ${activeTab === 'tax_profile' ? 'is-active' : ''}`}
            >
              <Building className="w-3.5 h-3.5" />
              开票抬头信息库
            </button>
          </div>

          <div className="finance-actions">
            {(activeTab === 'sales' || activeTab === 'purchase') && (
              <button
                onClick={() => openInvoiceModal(activeTab === 'sales' ? '销项' : '进项')}
                className="finance-action finance-action-primary"
              >
                <Plus className="w-4 h-4" />
                {activeTab === 'sales' ? '开具发票' : '录入发票'}
              </button>
            )}
            {activeTab === 'tax_profile' && (
              <button
                onClick={() => setShowProfileModal(true)}
                className="finance-action"
              >
                <Plus className="w-4 h-4" />
                录入抬头资料
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div>
          <div className="finance-search">
            <Search className="w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'tax_profile' ? '搜索企业名称...' : '搜索发票单号、项目、客户、申请人...'}
              className="finance-input"
            />
          </div>
        </div>

        {/* Tab 1: 销项开票 */}
        {activeTab === 'sales' && (
          <div className="finance-table-scroll">
            <table className="finance-table finance-table-wide">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">发票号码</th>
                  <th className="py-3 px-3">开票日期</th>
                  <th className="py-3 px-3">关联合同</th>
                  <th className="py-3 px-3">关联项目</th>
                  <th className="py-3 px-3">关联客户</th>
                  <th className="py-3 px-3">含税开票金额</th>
                  <th className="py-3 px-3">适用税率 / 税额</th>
                  <th className="py-3 px-3">申请人</th>
                  <th className="py-3 px-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {salesInvoices
                  .filter((invoice) => [invoice.invoiceNo, invoice.customerOrSupplier, invoice.customerName, invoice.relatedContractCode, invoice.relatedProjectName, invoice.applicant].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono"><button type="button" className="finance-action-link" onClick={() => setDetailInvoice(inv)}>{inv.invoiceNo}</button></td>
                      <td className="py-3 px-3">{inv.issueDate || inv.applyDate || '—'}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.relatedContractCode || '—'}</td>
                      <td className="py-3 px-3">{inv.relatedProjectName || '—'}</td>
                      <td className="py-3 px-3">{inv.customerName || '—'}</td>
                      <td className="finance-amount">¥ {inv.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.taxRate} (¥{inv.taxAmount})</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.applicant}</td>
                      <td className="py-3 px-3 whitespace-nowrap"><button type="button" className="finance-action-link mr-3" onClick={() => setDetailInvoice(inv)}>详情</button><Popconfirm title={`确认删除发票 ${inv.invoiceNo}？`} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => deleteInvoice(inv)}><button type="button" className="finance-action-link finance-action-link-danger">删除</button></Popconfirm></td>
                    </tr>
                  ))}
                {!salesInvoices.some((invoice) => [invoice.invoiceNo, invoice.customerOrSupplier, invoice.customerName, invoice.relatedContractCode, invoice.relatedProjectName, invoice.applicant].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase()))) && <tr><td colSpan={9} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的销项发票' : '暂无销项发票'} /></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: 进项抵扣登记 */}
        {activeTab === 'purchase' && (
          <div className="finance-table-scroll">
            <table className="finance-table">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                  <th className="py-3 px-3">发票代码/单号</th>
                  <th className="py-3 px-3">销方/供应商名称</th>
                  <th className="py-3 px-3">关联采购单/合同</th>
                  <th className="py-3 px-3">含税开票金额</th>
                  <th className="py-3 px-3">适用税率</th>
                  <th className="py-3 px-3">关联项目</th>
                  <th className="py-3 px-3">关联客户</th>
                  <th className="py-3 px-3">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {purchaseInvoices
                  .filter((invoice) => [invoice.invoiceNo, invoice.customerOrSupplier, invoice.purchaseOrderCode, invoice.relatedContractCode, invoice.relatedProjectName, invoice.customerName, invoice.note].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.invoiceNo}</td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{inv.customerOrSupplier || '—'}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{[inv.purchaseOrderCode, inv.relatedContractCode].filter(Boolean).join(' / ') || '—'}</td>
                      <td className="finance-amount">¥ {inv.amount.toLocaleString()}</td>
                      <td className="py-3 px-3">{inv.taxRate}</td>
                      <td className="py-3 px-3">{inv.relatedProjectName || '—'}</td>
                      <td className="py-3 px-3">{inv.customerName || '—'}</td>
                      <td className="py-3 px-3">{inv.note || '—'}</td>
                    </tr>
                  ))}
                {!purchaseInvoices.some((invoice) => [invoice.invoiceNo, invoice.customerOrSupplier, invoice.purchaseOrderCode, invoice.relatedContractCode, invoice.relatedProjectName, invoice.customerName, invoice.note].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase()))) && <tr><td colSpan={8} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的进项发票' : '暂无进项发票'} /></td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: 开票抬头信息库 */}
        {activeTab === 'tax_profile' && (
          <div className="finance-profile-grid">
            {taxProfiles.filter((profile) => [profile.companyName, profile.taxId].some((value) => value.toLowerCase().includes(searchQuery.toLowerCase()))).map((prof) => (
              <article
                key={prof.id}
                className="finance-profile"
              >
                <div className="finance-profile-header">
                  <h4>{prof.companyName}</h4>
                  <StatusTag status={prof.isDemo ? '演示资料' : '已验真'} type={prof.isDemo ? 'info' : 'success'} />
                </div>
                <dl>
                  <dt>纳税人识别号</dt><dd className="finance-tax-id font-mono">{prof.taxId}</dd>
                  <dt>开户银行</dt><dd>{prof.bankName || '—'}</dd>
                  <dt>银行账号</dt><dd className="font-mono">{prof.bankAccount || '—'}</dd>
                  <dt>地址及电话</dt><dd>{prof.addressPhone || '—'}</dd>
                </dl>
              </article>
            ))}
            {!taxProfiles.some((profile) => [profile.companyName, profile.taxId].some((value) => value.toLowerCase().includes(searchQuery.toLowerCase()))) && <div className="col-span-full py-8"><Empty description={searchQuery ? '暂无匹配的开票抬头资料' : '暂无开票抬头资料'} /></div>}
          </div>
        )}
      </div>

      {/* Modal: 开具或录入发票 */}
      <Modal
        isOpen={showInvoiceModal}
        className="finance-dialog"
        onClose={() => setShowInvoiceModal(false)}
        title={invoiceEntryType === '销项' ? '开具增值税发票' : '录入增值税发票'}
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateInvoice} className="finance-form">
          <div className="finance-form-grid">
            <div>
              <label>发票号码 <span className="text-[var(--danger)]">*</span></label>
              <input aria-label="发票号码" required value={invoiceForm.invoiceNo} onChange={(event) => updateInvoiceForm({ invoiceNo: event.target.value })} className="finance-input" placeholder="请输入发票号码" />
            </div>
            {invoiceEntryType === '销项' && <div>
              <label>开票日期 <span className="text-[var(--danger)]">*</span></label>
              <input aria-label="开票日期" required type="date" value={invoiceForm.issueDate} onChange={(event) => updateInvoiceForm({ issueDate: event.target.value })} className="finance-input" />
            </div>}
            {invoiceEntryType === '销项' ? (
              <div>
                <label>购方抬头/客户名称 <span className="text-[var(--danger)]">*</span></label>
                <select aria-label="购方抬头/客户名称" required value={invoiceForm.title} onChange={(event) => updateInvoiceForm({ title: event.target.value })} className="finance-input">
                  <option value="">{taxProfiles.length ? '请选择开票抬头' : '暂无抬头资料，请先录入'}</option>
                  {taxProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.companyName}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label>销方抬头/供应商名称 <span className="text-[var(--danger)]">*</span></label>
                <select aria-label="销方抬头/供应商名称" required value={invoiceForm.title} onChange={(event) => updateInvoiceForm({ title: event.target.value })} className="finance-input">
                  <option value="">{partners.length ? '请选择供应商' : '暂无合作方资料'}</option>
                  {availableSuppliers.map((supplier) => <option key={supplier} value={supplier}>{supplier}</option>)}
                </select>
              </div>
            )}
          </div>
            {invoiceEntryType === '销项' && <div className="finance-form-grid">
              <div>
                <label>关联项目 <span className="text-[var(--danger)]">*</span></label>
                <select aria-label="关联项目" required value={invoiceForm.projectId} onChange={(event) => handleInvoiceProjectChange(event.target.value)} className="finance-input">
                  <option value="">请选择项目</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label>关联客户 <span className="text-[var(--danger)]">*</span></label>
                <input aria-label="关联客户" required readOnly value={selectedProjectCustomer?.name || selectedProject?.customerName || ''} className="finance-input" placeholder="选择项目后自动带入" />
              </div>
            </div>}
            {invoiceEntryType === '销项' && <div>
              <label>关联合同</label>
              <select aria-label="关联合同" value={invoiceForm.contractId} disabled={!selectedProject} onChange={(event) => handleContractChange(event.target.value)} className="finance-input">
                <option value="">{selectedProject ? '暂不关联合同' : '请先选择项目'}</option>
                {projectContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.code} · {contract.name}</option>)}
              </select>
            </div>}
          {invoiceEntryType === '销项' ? (
            <>
              {selectedContract && <section className="invoice-contract-payment-panel">
                <div className="finance-form-summary grid grid-cols-2 gap-3">
                  <div>合同名称：<strong>{selectedContract.name}</strong></div>
                  <div>合同金额：<strong>¥ {selectedContract.amount.toLocaleString()}</strong></div>
                  <div>合同客户：<strong>{selectedContract.customerName || '—'}</strong></div>
                  <div>签订日期：<strong>{selectedContract.signDate || '—'}</strong></div>
                </div>
                <h3 className="invoice-contract-payment-title">合同付款阶段</h3>
                {paymentStageOptions.length ? <div className="finance-table-scroll"><table className="finance-table finance-table-wide">
                  <thead><tr><th>阶段名称</th><th>完成内容</th><th>占比</th><th>金额</th><th>选择阶段</th></tr></thead>
                  <tbody>{paymentStageOptions.map((stage) => <tr key={stage.id}>
                    <td>{stage.name}</td><td>{stage.triggerCondition || '—'}</td><td>{stage.percentage ? `${stage.percentage}%` : '—'}</td><td className="finance-amount">¥ {stage.amount.toLocaleString()}</td>
                    <td><label className="finance-stage-check" title={`选择${stage.name}`}><input type="checkbox" aria-label={`选择阶段-${stage.name}`} checked={invoiceForm.paymentScheduleIds.includes(stage.id)} onChange={(event) => togglePaymentStage(stage.id, event.target.checked)} /><span aria-hidden="true" /></label></td>
                  </tr>)}</tbody>
                  <tfoot><tr><td colSpan={3}>所选阶段金额合计</td><td className="finance-amount">¥ {selectedStageAmount.toLocaleString()}</td><td /></tr></tfoot>
                </table></div> : <Empty description="该合同未维护付款阶段" />}
              </section>}
              {selectedPaymentStages.length > 0 && <div className="finance-form-summary">所选阶段可开票余额合计：<strong>¥ {availableStageBalance?.toLocaleString()}</strong></div>}
              <div className="finance-form-grid">
                <div>
                  <label>含税开票金额 (元) <span className="text-[var(--danger)]">*</span></label>
                  <input aria-label="含税开票金额 (元)" required type="number" min="0.01" step="0.01" value={invoiceForm.amount} onChange={(event) => updateInvoiceForm({ amount: event.target.value })} className="finance-input" placeholder="请输入开票金额" />
                </div>
                <div>
                  <label>适用税率 <span className="text-[var(--danger)]">*</span></label>
                  <select aria-label="适用税率" required value={invoiceForm.taxRate} onChange={(event) => updateInvoiceForm({ taxRate: event.target.value })} className="finance-input">
                    <option value="">请选择适用税率</option>
                    {TAX_RATES.map((rate) => <option key={rate} value={rate}>{rate}</option>)}
                  </select>
                </div>
              </div>
                <div>
                  <label>申请人 <span className="text-[var(--danger)]">*</span></label>
                  <select aria-label="申请人" required value={invoiceForm.applicantId} disabled={applicantOptionsLoading || !!applicantOptionsError} onChange={(event) => updateInvoiceForm({ applicantId: event.target.value })} className="finance-input">
                    <option value="">{applicantOptionsLoading ? '正在加载组织成员…' : applicantOptionsError ? '组织成员加载失败' : applicantOptions.length ? '请选择申请人' : '暂无可选组织成员'}</option>
                    {[...new Set(applicantOptions.map((person) => person.department || '未分配部门'))].sort().map((department) => <optgroup key={department} label={department}>{applicantOptions.filter((person) => (person.department || '未分配部门') === department).map((person) => <option key={person.id} value={person.id}>{person.name}{person.jobTitle ? ` · ${person.jobTitle}` : ''}</option>)}</optgroup>)}
                  </select>
                  {applicantOptionsError && <div role="alert" className="mt-2 text-xs text-[var(--danger)]">{applicantOptionsError}</div>}
                </div>
              <div>
                <label>备注{exceedsStageBalance ? '（超出付款阶段余额时必填）' : ''}</label>
                <textarea aria-label="备注" required={exceedsStageBalance} value={invoiceForm.approvalReason} onChange={(event) => updateInvoiceForm({ approvalReason: event.target.value })} className="finance-input" rows={3} placeholder={exceedsStageBalance ? `超出可开票余额 ¥${(requestedAmount - (availableStageBalance || 0)).toLocaleString()}，请说明业务原因` : '选填'} />
              </div>
            </>
          ) : (
            <>
              <div className="finance-form-grid">
                <div>
                  <label>关联项目 <span className="text-[var(--danger)]">*</span></label>
                  <select aria-label="关联项目" required value={invoiceForm.projectId} onChange={(event) => handleInvoiceProjectChange(event.target.value)} className="finance-input">
                    <option value="">请选择项目</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>关联客户 <span className="text-[var(--danger)]">*</span></label>
                  <input aria-label="关联客户" required readOnly value={selectedProjectCustomer?.name || selectedProject?.customerName || ''} className="finance-input" placeholder="选择项目后自动带入" />
                </div>
              </div>
              <div className="finance-form-grid">
                <div>
                  <label>关联采购单</label>
                  <select aria-label="关联采购单" disabled={!selectedProject} value={invoiceForm.purchaseOrderCode} onChange={(event) => updateInvoiceForm({ purchaseOrderCode: event.target.value })} className="finance-input">
                    <option value="">{selectedProject ? '暂不关联采购单' : '请先选择项目'}</option>
                    {projectProcurementItems.map((item) => <option key={item.id} value={item.code}>{item.code} · {item.description || item.name || '项目采购'} · {item.projectName || item.relatedProject}</option>)}
                  </select>
                </div>
                <div>
                  <label>关联合同</label>
                  <select aria-label="关联合同" disabled={!selectedProject} value={invoiceForm.contractId} onChange={(event) => updateInvoiceForm({ contractId: event.target.value })} className="finance-input">
                    <option value="">{selectedProject ? '暂不关联合同' : '请先选择项目'}</option>
                    {projectContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.code} · {contract.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="finance-form-grid">
                <div>
                  <label>含税开票金额 (元) <span className="text-[var(--danger)]">*</span></label>
                  <input aria-label="含税开票金额 (元)" required type="number" min="0.01" step="0.01" value={invoiceForm.amount} onChange={(event) => updateInvoiceForm({ amount: event.target.value })} className="finance-input" placeholder="请输入开票金额" />
                </div>
                <div>
                  <label>适用税率 <span className="text-[var(--danger)]">*</span></label>
                  <select aria-label="适用税率" required value={invoiceForm.taxRate} onChange={(event) => updateInvoiceForm({ taxRate: event.target.value })} className="finance-input">
                    <option value="">请选择适用税率</option>
                    {TAX_RATES.map((rate) => <option key={rate} value={rate}>{rate}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label>备注</label>
                <textarea aria-label="备注" value={invoiceForm.note} onChange={(event) => updateInvoiceForm({ note: event.target.value })} className="finance-input" rows={3} placeholder="请输入备注（选填）" />
              </div>
            </>
          )}
          <div>
            <label>上传发票 <span className="text-[var(--danger)]">*</span></label>
            <Upload
              accept="image/*,.pdf,application/pdf"
              multiple
              fileList={invoiceForm.attachments.map((attachment) => ({ uid: attachment.id, name: attachment.name, status: 'done' as const, size: attachment.size, type: attachment.mimeType, url: attachment.dataUrl }))}
              beforeUpload={async (file) => {
                const supported = file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                if (!supported) { addToast('error', '附件格式不支持', '请上传图片或 PDF 文件'); return Upload.LIST_IGNORE; }
                if (file.size > 10 * 1024 * 1024) { addToast('error', '附件超过大小限制', '单个附件不能超过 10 MB'); return Upload.LIST_IGNORE; }
                try {
                  const dataUrl = await readInvoiceFile(file);
                  updateInvoiceForm({ attachments: [...invoiceForm.attachments, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, mimeType: file.type, size: file.size, dataUrl }] });
                  setInvoiceAttachmentError('');
                } catch {
                  addToast('error', '附件读取失败', `无法读取文件：${file.name}`);
                }
                return Upload.LIST_IGNORE;
              }}
              onRemove={(file: UploadFile) => { updateInvoiceForm({ attachments: invoiceForm.attachments.filter((attachment) => attachment.id !== file.uid) }); return true; }}
            >
              <Button icon={<PaperClipOutlined />}>选择发票附件</Button>
            </Upload>
            {invoiceAttachmentError && <div role="alert" className="mt-2 text-xs text-[var(--danger)]">{invoiceAttachmentError}</div>}
          </div>
          <div className="finance-form-footer">
            <button type="button" onClick={() => setShowInvoiceModal(false)} className="finance-action">取消</button>
            <button type="submit" className="finance-action finance-action-primary">{invoiceEntryType === '销项' ? '确认开具入账' : '确认录入发票'}</button>
          </div>
        </form>
      </Modal>

      <Drawer isOpen={Boolean(detailInvoice)} onClose={() => setDetailInvoice(null)} title={<span className="font-sans tracking-normal">销项发票详情</span>} subtitle={detailInvoice?.invoiceNo ? <span className="font-mono tabular-nums">{detailInvoice.invoiceNo}</span> : undefined} width="max-w-4xl" contentClassName="overflow-y-auto">
        {detailInvoice && <div className="finance-detail">
          <FinanceDetailMetrics items={[
            { label: '含税开票金额', value: detailInvoice.amount.toLocaleString() + ' 元' },
            { label: '税额', value: detailInvoice.taxAmount == null ? '—' : detailInvoice.taxAmount.toLocaleString() + ' 元' },
            { label: "状态", value: <StatusTag status={detailInvoice.status} /> }
          ]} />
          <FinanceDetailSection title="发票信息"><FinanceDetailFields items={[
            { label: '发票号码', value: detailInvoice.invoiceNo, emphasis: true },
            { label: '发票类型', value: detailInvoice.category || '销项发票' },
            { label: '开票日期', value: detailInvoice.issueDate || detailInvoice.applyDate },
            { label: '购方抬头', value: detailInvoice.customerOrSupplier },
            { label: '适用税率', value: detailInvoice.taxRate },
            { label: '申请人', value: detailInvoice.applicant },
            { label: '申请人部门', value: detailInvoice.applicantDepartment }
          ]} /></FinanceDetailSection>
          <FinanceDetailSection title="业务关联"><FinanceDetailFields items={[
            { label: '关联合同', value: detailInvoice.contractRef || invoiceContracts.find((contract) => contract.code === detailInvoice.relatedContractCode)?.name },
            { label: '合同编号', value: detailInvoice.relatedContractCode },
            { label: '关联付款阶段', value: invoiceStageName(detailInvoice) },
            { label: '关联项目', value: detailInvoice.relatedProjectName || projects.find((project) => project.id === detailInvoice.projectId)?.name },
            { label: '关联客户', value: detailInvoice.customerName || customers.find((customer) => customer.id === detailInvoice.customerId)?.name },
            { label: '关联采购单', value: detailInvoice.purchaseOrderCode }
          ]} /></FinanceDetailSection>
          <FinanceDetailSection title="备注"><p className="finance-detail-note">{detailInvoice.note || "—"}</p></FinanceDetailSection>
          <FinanceDetailSection title="发票附件">{detailInvoice.attachments?.length ? <ul className="finance-detail-attachments">
            {detailInvoice.attachments.map((attachment) => <li key={attachment.id}>{attachment.dataUrl
              ? <a href={attachment.dataUrl} target="_blank" rel="noreferrer">{attachment.name}</a>
              : attachment.name}</li>)}
          </ul> : <Empty description="暂无附件" />}</FinanceDetailSection>
        </div>}
      </Drawer>

      {/* Modal: 录入开票抬头信息 */}
      <Modal
        isOpen={showProfileModal}
        className="finance-dialog"
        onClose={() => setShowProfileModal(false)}
        title="录入企业开票抬头资质"
        maxWidth="md"
      >
        <form onSubmit={handleCreateProfile} className="finance-form">
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">企业全称</label>
            <input
              type="text"
              aria-label="企业全称"
              required
              placeholder="如：南京师创智联科技有限公司"
              onChange={(e) => setNewProfileForm({ ...newProfileForm, companyName: e.target.value })}
              className="finance-input"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">统一社会信用代码 / 税号</label>
            <input
              type="text"
              aria-label="统一社会信用代码 / 税号"
              required
              placeholder="18位纳税人识别号"
              onChange={(e) => setNewProfileForm({ ...newProfileForm, taxId: e.target.value })}
              className="finance-input"
            />
          </div>
          <div className="finance-form-grid">
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">开户银行</label>
              <input
                type="text"
                aria-label="开户银行"
                placeholder="如：招商银行南京分行"
                onChange={(e) => setNewProfileForm({ ...newProfileForm, bankName: e.target.value })}
                className="finance-input"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-muted)] mb-1">银行卡账号</label>
              <input
                type="text"
                aria-label="银行卡账号"
                placeholder="例如：6222 0210 1022..."
                onChange={(e) => setNewProfileForm({ ...newProfileForm, bankAccount: e.target.value })}
                className="finance-input"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-[var(--text-muted)] mb-1">公司注册地址及电话</label>
            <input
              type="text"
              aria-label="公司注册地址及电话"
              placeholder="南京市江宁区紫金研创中心 A座 (025-88886666)"
              onChange={(e) => setNewProfileForm({ ...newProfileForm, addressPhone: e.target.value })}
              className="finance-input"
            />
          </div>
          <div className="finance-form-footer">
            <button type="button" onClick={() => setShowProfileModal(false)} className="finance-action">取消</button>
            <button type="submit" className="finance-action finance-action-primary">保存资质档案</button>
          </div>
        </form>
      </Modal>
    </div>
    </ComprehensivePage>
  );
};
