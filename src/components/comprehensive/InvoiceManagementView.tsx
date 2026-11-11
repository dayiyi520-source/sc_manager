import React, { useState } from 'react';
import { Empty } from 'antd';
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
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
import { useApp } from '../../context/AppContext';
import { Contract, InvoiceApprovalRecord, InvoiceRecord, TaxProfile } from '../../types';
import { loadInvoiceLedger, saveInvoiceLedger } from '../../services/invoiceLedgerRepository';
import { DEMO_INVOICE_CONTRACTS } from '../../services/invoiceLedgerDemoData';

const TAX_RATES = ['1%', '3%', '6%', '9%', '13%'];

type InvoiceFormValues = {
  invoiceNo: string;
  title: string;
  contractId: string;
  paymentScheduleId: string;
  purchaseOrderCode: string;
  projectId: string;
  amount: string;
  taxRate: string;
  applicant: string;
  approvalReason: string;
  note: string;
};

const emptyInvoiceForm = (): InvoiceFormValues => ({
  invoiceNo: '', title: '', contractId: '', paymentScheduleId: '', purchaseOrderCode: '',
  projectId: '', amount: '', taxRate: '', applicant: '', approvalReason: '', note: ''
});

export const InvoiceManagementView: React.FC = () => {
  const {
    addToast, invoices, setInvoices, customers, contracts, projects, paymentSchedules,
    setPaymentSchedules, invoiceApprovals, setInvoiceApprovals, partners, currentUser
  } = useApp();
  const invoiceContracts: Contract[] = contracts.length ? contracts : DEMO_INVOICE_CONTRACTS;

  const [activeTab, setActiveTab] = useState<'sales' | 'purchase' | 'tax_profile'>('sales');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [invoiceEntryType, setInvoiceEntryType] = useState<'销项' | '进项'>('销项');
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormValues>(emptyInvoiceForm);

  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>(() => loadInvoiceLedger().taxProfiles);
  const [supplierOptions] = useState<string[]>(() => loadInvoiceLedger().supplierOptions);
  const availableSuppliers = [...new Set([...supplierOptions, ...partners.map((partner) => partner.name)])];

  const [newProfileForm, setNewProfileForm] = useState({
    companyName: '',
    taxId: '',
    bankName: '',
    bankAccount: '',
    addressPhone: ''
  });

  const selectedContract = invoiceContracts.find((contract) => contract.id === invoiceForm.contractId);
  const selectedProject = projects.find((project) => project.id === invoiceForm.projectId);
  const linkedPaymentSchedules = selectedContract
    ? paymentSchedules.filter((schedule) => schedule.contractId === selectedContract.id)
    : [];
  const paymentStageOptions = selectedContract
    ? linkedPaymentSchedules.length
      ? linkedPaymentSchedules.map((schedule) => ({
          id: schedule.id,
          name: schedule.stageName,
          amount: schedule.amount,
          invoicedAmount: schedule.invoicedAmount || 0
        }))
      : (selectedContract.paymentStages || []).map((stage) => ({
          id: `${selectedContract.id}:${stage.phase}`,
          name: stage.phase,
          amount: stage.amount,
          invoicedAmount: 0
        }))
    : [];
  const selectedPaymentStage = paymentStageOptions.find((stage) => stage.id === invoiceForm.paymentScheduleId);
  const existingStageInvoiceAmount = selectedPaymentStage
    ? invoices.filter((invoice) => invoice.paymentScheduleId === selectedPaymentStage.id).reduce((sum, invoice) => sum + invoice.amount, 0)
    : 0;
  const availableStageBalance = selectedPaymentStage
    ? Math.max(0, selectedPaymentStage.amount - Math.max(selectedPaymentStage.invoicedAmount, existingStageInvoiceAmount))
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
    const scheduleStage = paymentSchedules.find((schedule) => schedule.id === invoice.paymentScheduleId)?.stageName;
    if (scheduleStage) return scheduleStage;
    const [contractId, stageName] = invoice.paymentScheduleId?.split(':') || [];
    return invoiceContracts.find((contract) => contract.id === contractId)?.paymentStages?.find((stage) => stage.phase === stageName)?.phase || '—';
  };

  const openInvoiceModal = (type: '销项' | '进项') => {
    setInvoiceEntryType(type);
    setInvoiceForm({ ...emptyInvoiceForm(), applicant: currentUser.name });
    setShowInvoiceModal(true);
  };

  const updateInvoiceForm = (updates: Partial<InvoiceFormValues>) => {
    setInvoiceForm((previous) => ({ ...previous, ...updates }));
  };

  const handleContractChange = (contractId: string) => {
    const contract = invoiceContracts.find((item) => item.id === contractId);
    const schedules = paymentSchedules.filter((schedule) => schedule.contractId === contractId);
    const candidateProjects = projects.filter((project) =>
      (contract?.customerId && project.customerId === contract.customerId)
      || (contract?.customerName && project.customerName === contract.customerName)
    );
    const scheduleProject = schedules.map((schedule) => schedule.projectId).find(Boolean);
    const projectId = scheduleProject || (candidateProjects.length === 1 ? candidateProjects[0].id : '');
    updateInvoiceForm({ contractId, paymentScheduleId: '', projectId });
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (exceedsStageBalance && !invoiceForm.approvalReason.trim()) return;
    const contract = invoiceContracts.find((item) => item.id === invoiceForm.contractId);
    const project = projects.find((item) => item.id === invoiceForm.projectId);
    const customer = project?.customerId
      ? customers.find((item) => item.id === project.customerId)
      : customers.find((item) => item.name === project?.customerName);
    const title = invoiceEntryType === '销项'
      ? taxProfiles.find((profile) => profile.id === invoiceForm.title)?.companyName || ''
      : invoiceForm.title;
    const taxRateValue = Number(invoiceForm.taxRate.replace('%', ''));
    const approval: InvoiceApprovalRecord | undefined = exceedsStageBalance && selectedPaymentStage
      ? {
          id: `invoice-approval-${Date.now()}`,
          contractId: contract?.id,
          paymentScheduleId: selectedPaymentStage.id,
          projectId: project?.id,
          customerId: customer?.id,
          customerName: customer?.name,
          contractName: contract?.name,
          stageName: selectedPaymentStage.name,
          requestedAmount,
          availableAmount: availableStageBalance || 0,
          overAmount: requestedAmount - (availableStageBalance || 0),
          reason: invoiceForm.approvalReason.trim(),
          applicant: invoiceForm.applicant,
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
      applyDate: new Date().toISOString().slice(0,10),
      status: approval ? '待审批' : invoiceEntryType === '销项' ? '已开具' : '待认证',
      issueStatus: approval ? '待审批' : '已开具',
      certificationStatus: invoiceEntryType === '进项' ? '待认证' : undefined,
      approvalRecordId: approval?.id,
      applicant: invoiceForm.applicant || currentUser.name,
      relatedContractCode: contract?.code,
      paymentScheduleId: invoiceForm.paymentScheduleId || undefined,
      contractRef: contract?.name,
      projectId: project?.id,
      relatedProjectName: project?.name,
      customerId: customer?.id,
      purchaseOrderCode: invoiceForm.purchaseOrderCode.trim() || undefined,
      note: invoiceForm.note.trim() || undefined
    };

    const nextInvoices = [inv, ...invoices];
    const nextApprovals = approval ? [approval, ...invoiceApprovals] : invoiceApprovals;
    const nextPaymentSchedules = invoiceEntryType === '销项' && selectedPaymentStage
      ? paymentSchedules.map((schedule) => schedule.id === selectedPaymentStage.id
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
    addToast(approval ? 'info' : 'success', approval ? '超额开票申请已提交审批' : invoiceEntryType === '销项' ? '发票已开具并入账' : '进项发票已录入', `发票代码/号码：${inv.invoiceNo}`);
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
              placeholder="搜索发票单号、抬头名称、关联合同号、申请人..."
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
                  <th className="py-3 px-3">发票代码/单号</th>
                  <th className="py-3 px-3">购方抬头</th>
                  <th className="py-3 px-3">关联合同</th>
                  <th className="py-3 px-3">关联付款阶段</th>
                  <th className="py-3 px-3">关联项目</th>
                  <th className="py-3 px-3">关联客户</th>
                  <th className="py-3 px-3">含税开票金额</th>
                  <th className="py-3 px-3">适用税率 / 税额</th>
                  <th className="py-3 px-3">申请人</th>
                  <th className="py-3 px-3">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {salesInvoices
                  .filter((invoice) => [invoice.invoiceNo, invoice.customerOrSupplier, invoice.customerName, invoice.relatedContractCode, invoice.relatedProjectName, invoice.applicant].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.invoiceNo}</td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{inv.customerOrSupplier || '—'}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.relatedContractCode || '—'}</td>
                      <td className="py-3 px-3">{invoiceStageName(inv)}</td>
                      <td className="py-3 px-3">{inv.relatedProjectName || '—'}</td>
                      <td className="py-3 px-3">{inv.customerName || '—'}</td>
                      <td className="finance-amount">¥ {inv.amount.toLocaleString()}</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.taxRate} (¥{inv.taxAmount})</td>
                      <td className="py-3 px-3 text-[var(--text-body)]">{inv.applicant}</td>
                      <td className="py-3 px-3"><StatusTag status={inv.status} /></td>
                    </tr>
                  ))}
                {!salesInvoices.some((invoice) => [invoice.invoiceNo, invoice.customerOrSupplier, invoice.customerName, invoice.relatedContractCode, invoice.relatedProjectName, invoice.applicant].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase()))) && <tr><td colSpan={10} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的销项发票' : '暂无销项发票'} /></td></tr>}
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
                  <th className="py-3 px-3">关联采购单</th>
                  <th className="py-3 px-3">含税开票金额</th>
                  <th className="py-3 px-3">适用税率</th>
                  <th className="py-3 px-3">关联项目</th>
                  <th className="py-3 px-3">关联客户</th>
                  <th className="py-3 px-3">备注</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {purchaseInvoices
                  .filter((invoice) => [invoice.invoiceNo, invoice.customerOrSupplier, invoice.purchaseOrderCode, invoice.relatedProjectName, invoice.customerName, invoice.note].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((inv) => (
                    <tr key={inv.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.invoiceNo}</td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{inv.customerOrSupplier || '—'}</td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{inv.purchaseOrderCode || '—'}</td>
                      <td className="finance-amount">¥ {inv.amount.toLocaleString()}</td>
                      <td className="py-3 px-3">{inv.taxRate}</td>
                      <td className="py-3 px-3">{inv.relatedProjectName || '—'}</td>
                      <td className="py-3 px-3">{inv.customerName || '—'}</td>
                      <td className="py-3 px-3">{inv.note || '—'}</td>
                    </tr>
                  ))}
                {!purchaseInvoices.some((invoice) => [invoice.invoiceNo, invoice.customerOrSupplier, invoice.purchaseOrderCode, invoice.relatedProjectName, invoice.customerName, invoice.note].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase()))) && <tr><td colSpan={8} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的进项发票' : '暂无进项发票'} /></td></tr>}
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
        title="开具/登记增值税全电发票"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateInvoice} className="finance-form">
          <div className="finance-form-grid">
            <div>
              <label>发票代码/号码 <span className="text-[var(--danger)]">*</span></label>
              <input aria-label="发票代码/号码" required value={invoiceForm.invoiceNo} onChange={(event) => updateInvoiceForm({ invoiceNo: event.target.value })} className="finance-input" />
            </div>
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

          {invoiceEntryType === '销项' ? (
            <>
              <div className="finance-form-grid">
                <div>
                  <label>关联合同</label>
                  <select aria-label="关联合同" value={invoiceForm.contractId} onChange={(event) => handleContractChange(event.target.value)} className="finance-input">
                    <option value="">暂不关联合同</option>
                    {invoiceContracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.code} · {contract.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>关联付款阶段</label>
                  <select aria-label="关联付款阶段" value={invoiceForm.paymentScheduleId} onChange={(event) => updateInvoiceForm({ paymentScheduleId: event.target.value })} className="finance-input" disabled={!invoiceForm.contractId}>
                    <option value="">暂不关联付款阶段</option>
                    {paymentStageOptions.map((stage) => <option key={stage.id} value={stage.id}>{stage.name} · 可开票 ¥{Math.max(0, stage.amount - stage.invoicedAmount).toLocaleString()}</option>)}
                  </select>
                </div>
              </div>
              {selectedPaymentStage && <div className="finance-form-summary">付款阶段可开票余额：<strong>¥ {availableStageBalance?.toLocaleString()}</strong></div>}
            </>
          ) : (
            <div>
              <label>关联采购单</label>
              <input aria-label="关联采购单" value={invoiceForm.purchaseOrderCode} onChange={(event) => updateInvoiceForm({ purchaseOrderCode: event.target.value })} className="finance-input" placeholder="请输入采购单号（选填）" />
            </div>
          )}

          {invoiceEntryType === '进项' && (
            <div className="finance-form-grid">
              <div>
                <label>关联项目</label>
                <select aria-label="关联项目" value={invoiceForm.projectId} onChange={(event) => updateInvoiceForm({ projectId: event.target.value })} className="finance-input">
                  <option value="">暂不关联项目</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label>关联客户</label>
                <input aria-label="关联客户" readOnly value={selectedProject?.customerName || ''} className="finance-input" placeholder="选择项目后自动带入" />
              </div>
            </div>
          )}

          {invoiceEntryType === '销项' && (
            <div className="finance-form-grid">
              <div>
                <label>关联项目</label>
                <select aria-label="关联项目" value={invoiceForm.projectId} onChange={(event) => updateInvoiceForm({ projectId: event.target.value })} className="finance-input">
                  <option value="">暂不关联项目</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </div>
              <div>
                <label>关联客户</label>
                <input aria-label="关联客户" readOnly value={selectedProject?.customerName || ''} className="finance-input" placeholder="选择合同或项目后自动带入" />
              </div>
            </div>
          )}

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

          {invoiceEntryType === '销项' && (
            <>
              <div>
                <label>申请人</label>
                <input aria-label="申请人" value={invoiceForm.applicant} onChange={(event) => updateInvoiceForm({ applicant: event.target.value })} className="finance-input" />
              </div>
              <div>
                <label>超开票审批原因{exceedsStageBalance ? '（超出付款阶段余额时必填）' : ''}</label>
                <textarea aria-label="超开票审批原因" required={exceedsStageBalance} value={invoiceForm.approvalReason} onChange={(event) => updateInvoiceForm({ approvalReason: event.target.value })} className="finance-input" rows={3} placeholder={exceedsStageBalance ? `超出可开票余额 ¥${(requestedAmount - (availableStageBalance || 0)).toLocaleString()}，请说明业务原因` : '选填'} />
              </div>
            </>
          )}

          {invoiceEntryType === '进项' && (
            <div>
              <label>备注</label>
              <textarea aria-label="备注" value={invoiceForm.note} onChange={(event) => updateInvoiceForm({ note: event.target.value })} className="finance-input" rows={3} placeholder="请输入备注（选填）" />
            </div>
          )}
          <div className="finance-form-footer">
            <button type="button" onClick={() => setShowInvoiceModal(false)} className="finance-action">取消</button>
            <button type="submit" className="finance-action finance-action-primary">{invoiceEntryType === '销项' ? '确认开具入账' : '确认录入发票'}</button>
          </div>
        </form>
      </Modal>

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
