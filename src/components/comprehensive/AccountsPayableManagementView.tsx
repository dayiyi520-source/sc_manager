import React, { useMemo, useState } from 'react';
import { Empty } from 'antd';
import { AlertTriangle, CheckCircle2, CreditCard, DollarSign, Plus, Search } from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Modal, Drawer } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
import { useApp } from '../../context/AppContext';
import type { AccountsPayablePaymentRecord, AccountsPayableRecord, InvoiceRecord, ProjectPayableCategory } from '../../types';
import { loadAccountsPayable, saveAccountsPayable } from '../../services/accountsPayableRepository';
import { loadInvoiceLedger } from '../../services/invoiceLedgerRepository';
import { FinanceDetailFields, FinanceDetailMetrics, FinanceDetailSection } from './FinanceDetailPrimitives';
import './finance-management.css';

type PayableTab = 'ledger' | 'payments' | 'overdue';
const payableCategories: ProjectPayableCategory[] = ['运营中心分成', '投标报名费', '投标保证金', '中标服务费', '专家评审费', '投标平台服务费', '履约保证金', '质保金', '第三方采购'];

const money = (value: number) => `¥ ${value.toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);

export const AccountsPayableManagementView: React.FC = () => {
  const { addToast, currentUser, projects, contracts, invoices: contextInvoices } = useApp();
  const availableInvoices = contextInvoices || loadInvoiceLedger().invoices;
  const purchaseInvoices = availableInvoices.filter((invoice) => invoice.type === '进项' || invoice.type === '进项发票');
  const initialSnapshot = useMemo(() => loadAccountsPayable(), []);
  const [payables, setPayables] = useState<AccountsPayableRecord[]>(initialSnapshot.payables);
  const [payments, setPayments] = useState<AccountsPayablePaymentRecord[]>(initialSnapshot.payments);
  const [activeTab, setActiveTab] = useState<PayableTab>('ledger');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<AccountsPayableRecord | null>(null);
  const [detailPayable, setDetailPayable] = useState<AccountsPayableRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payableForm, setPayableForm] = useState({ category: '第三方采购' as ProjectPayableCategory, supplierName: '', purchaseOrderCode: '', projectId: '', contractId: '', amount: '', dueDate: '', note: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', payMethod: '银行转账', invoiceId: '' });
  const selectedProject = projects.find((item) => item.id === payableForm.projectId);

  const projectPayables = payables.filter((item) => projects.some((project) => project.id === item.projectId || project.name === item.projectName));
  const totalAmount = projectPayables.reduce((sum, item) => sum + item.amount, 0);
  const paidAmount = projectPayables.reduce((sum, item) => sum + item.paidAmount, 0);
  const unpaidAmount = projectPayables.reduce((sum, item) => sum + item.unpaidAmount, 0);
  const overduePayables = projectPayables.filter((item) => item.unpaidAmount > 0 && item.dueDate < today());
  const filteredPayables = projectPayables.filter((item) => [item.payableCode, item.category, item.supplierName, item.purchaseOrderCode, item.projectName, item.contractCode].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase())));
  const projectPayableCodes = new Set(projectPayables.map((item) => item.payableCode));
  const filteredPayments = payments.filter((item) => projectPayableCodes.has(item.payableCode) && [item.paymentCode, item.payableCode, item.supplierName].some((value) => value.toLowerCase().includes(searchQuery.toLowerCase())));
  const invoiceProjectName = (invoice: InvoiceRecord) => invoice.relatedProjectName || projects.find((project) => project.id === invoice.projectId)?.name || '未关联项目';
  const paymentInvoiceLabel = (payment: AccountsPayablePaymentRecord) => {
    const invoice = purchaseInvoices.find((item) => item.id === payment.invoiceId);
    const invoiceNo = invoice?.invoiceNo || payment.invoiceNo;
    return invoiceNo ? invoiceNo + ' / ' + (invoice ? invoiceProjectName(invoice) : payment.invoiceProjectName || '未关联项目') : '—';
  };

  const persist = (nextPayables: AccountsPayableRecord[], nextPayments: AccountsPayablePaymentRecord[]) => {
    try {
      saveAccountsPayable({ payables: nextPayables, payments: nextPayments });
      setPayables(nextPayables);
      setPayments(nextPayments);
      return true;
    } catch (error) {
      addToast('error', '付款管理保存失败', error instanceof Error ? error.message : '请稍后重试');
      return false;
    }
  };

  const handleCreatePayable = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(payableForm.amount);
    const project = projects.find((item) => item.id === payableForm.projectId);
    const contract = contracts.find((item) => item.id === payableForm.contractId);
    if (!project || !project.customerName?.trim() || !payableForm.dueDate || !amount || amount <= 0 || (payableForm.category === '运营中心分成' && !contract)) return;
    const payable: AccountsPayableRecord = {
      id: `payable-${Date.now()}`, payableCode: `AP-${today().replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      category: payableForm.category, supplierName: project.customerName.trim(), purchaseOrderCode: payableForm.purchaseOrderCode.trim() || undefined,
      projectId: project.id, projectName: project.name, customerId: project.customerId, customerName: project.customerName,
      contractId: contract?.id, contractCode: contract?.code, amount, paidAmount: 0, unpaidAmount: amount,
      dueDate: payableForm.dueDate, status: payableForm.dueDate < today() ? '逾期' : '待付款', applicant: currentUser.name,
      note: payableForm.note.trim() || undefined
    };
    if (!persist([payable, ...payables], payments)) return;
    setPayableForm({ category: '第三方采购', supplierName: '', purchaseOrderCode: '', projectId: '', contractId: '', amount: '', dueDate: '', note: '' });
    setShowPayableModal(false);
    addToast('success', '付款计划已建立', `单号：${payable.payableCode}`);
  };

  const openPaymentModal = (payable: AccountsPayableRecord) => {
    setSelectedPayable(payable);
    setPaymentForm({ amount: String(payable.unpaidAmount), payMethod: '银行转账', invoiceId: '' });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPayable) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0 || amount > selectedPayable.unpaidAmount) return;
    const invoice = purchaseInvoices.find((item) => item.id === paymentForm.invoiceId);
    const nextPayable: AccountsPayableRecord = {
      ...selectedPayable, paidAmount: selectedPayable.paidAmount + amount, unpaidAmount: selectedPayable.unpaidAmount - amount,
      status: selectedPayable.unpaidAmount - amount === 0 ? '已结清' : selectedPayable.dueDate < today() ? '逾期' : '部分付款'
    };
    const payment: AccountsPayablePaymentRecord = {
      id: `payable-payment-${Date.now()}`, paymentCode: `APP-${today().replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      payableCode: selectedPayable.payableCode, supplierName: selectedPayable.supplierName, amount,
      payDate: today(), payMethod: paymentForm.payMethod, bankSerialNo: `TX-${Math.floor(Math.random() * 89999999 + 10000000)}`, operator: currentUser.name,
      invoiceId: invoice?.id, invoiceNo: invoice?.invoiceNo, invoiceProjectName: invoice ? invoiceProjectName(invoice) : undefined
    };
    if (!persist(payables.map((item) => item.id === selectedPayable.id ? nextPayable : item), [payment, ...payments])) return;
    setSelectedPayable(null);
    setShowPaymentModal(false);
    addToast('success', '付款记录已登记', `金额：${money(amount)}`);
  };

  const tabs = [
    { key: 'ledger' as const, label: '应付台账', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { key: 'payments' as const, label: '付款记录', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: 'overdue' as const, label: '到期预警', icon: <AlertTriangle className="w-3.5 h-3.5" /> }
  ];

  return (
    <ComprehensivePage title="付款管理" description="管理项目付款计划、付款记录及到期事项" icon={<CreditCard className="w-5 h-5" />} hideHeader>
      <div className="finance-workspace space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="应付总额" value={money(totalAmount)} subText={`${projectPayables.length} 笔付款计划`} icon={<DollarSign className="w-5 h-5" />} onClick={() => setActiveTab('ledger')} />
          <StatCard title="已付款总额" value={money(paidAmount)} subText={`${payments.length} 笔付款记录`} icon={<CheckCircle2 className="w-5 h-5" />} onClick={() => setActiveTab('payments')} />
          <StatCard title="待付款余额" value={money(unpaidAmount)} subText="当前未结清应付金额" icon={<CreditCard className="w-5 h-5" />} onClick={() => setActiveTab('ledger')} />
          <StatCard title="逾期应付款" value={money(overduePayables.reduce((sum, item) => sum + item.unpaidAmount, 0))} subText={`${overduePayables.length} 笔超过付款节点`} icon={<AlertTriangle className="w-5 h-5" />} onClick={() => setActiveTab('overdue')} />
        </div>

        <div className="finance-panel space-y-4">
          <div className="finance-header">
          <div className="finance-tabs" role="tablist" aria-label="付款管理视图">
              {tabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className={`finance-tab ${activeTab === tab.key ? 'is-active' : ''}`}>{tab.icon}{tab.label}</button>)}
            </div>
            <div className="finance-actions"><button type="button" onClick={() => setShowPayableModal(true)} className="finance-action finance-action-primary"><Plus className="w-4 h-4" />新建付款计划</button></div>
          </div>
          <div className="finance-search"><Search className="w-4 h-4" /><input aria-label="搜索付款管理" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索应付单、类别、收款客户、合同或项目..." className="finance-input" /></div>

          {activeTab === 'ledger' && <div className="finance-table-scroll"><table className="finance-table finance-table-wide"><thead><tr><th>应付单号</th><th>付款类型</th><th>收款客户</th><th>关联项目/客户</th><th>关联合同</th><th>应付金额</th><th>已付款</th><th>未付款余额</th><th>到期日</th><th>状态</th><th>操作</th></tr></thead><tbody>{filteredPayables.map((item) => <tr key={item.id}><td className="font-mono"><button type="button" className="finance-action-link" onClick={() => setDetailPayable(item)}>{item.payableCode}</button></td><td>{item.category || '第三方采购'}</td><td className="font-semibold">{item.supplierName}</td><td>{item.projectName || '—'}<div className="text-[var(--text-muted)]">{item.customerName || '—'}</div></td><td>{item.contractCode || '—'}</td><td className="finance-amount">{money(item.amount)}</td><td className="finance-amount finance-amount-success">{money(item.paidAmount)}</td><td className="finance-amount finance-amount-warning">{money(item.unpaidAmount)}</td><td>{item.dueDate}</td><td><StatusTag status={item.status} /></td><td><div className="flex flex-wrap items-center gap-3"><button type="button" className="finance-action-link" onClick={() => setDetailPayable(item)}>详情</button>{item.unpaidAmount > 0 && <button type="button" className="finance-action-link" onClick={() => openPaymentModal(item)}>登记付款</button>}</div></td></tr>)}{filteredPayables.length === 0 && <tr><td colSpan={11} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的付款计划' : '暂无付款计划'} /></td></tr>}</tbody></table></div>}

          {activeTab === 'payments' && <div className="finance-table-scroll"><table className="finance-table"><thead><tr><th>付款流水号</th><th>应付单号</th><th>收款客户</th><th>关联进项发票</th><th>付款金额</th><th>付款方式</th><th>付款日期</th><th>银行流水号</th><th>经办人</th></tr></thead><tbody>{filteredPayments.map((item) => <tr key={item.id}><td className="font-mono">{item.paymentCode}</td><td className="font-mono">{item.payableCode}</td><td className="font-semibold">{item.supplierName}</td><td>{paymentInvoiceLabel(item)}</td><td className="finance-amount finance-amount-success">{money(item.amount)}</td><td>{item.payMethod}</td><td>{item.payDate}</td><td className="font-mono">{item.bankSerialNo}</td><td>{item.operator}</td></tr>)}{filteredPayments.length === 0 && <tr><td colSpan={9} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的付款记录' : '暂无付款记录'} /></td></tr>}</tbody></table></div>}

          {activeTab === 'overdue' && <div className="space-y-3">{overduePayables.map((item) => <div key={item.id} className="finance-overdue"><div className="flex items-center gap-3"><div className="finance-overdue-icon"><AlertTriangle className="w-4 h-4" /></div><div><div className="finance-overdue-title">{item.supplierName} · {item.payableCode}</div><div className="text-[var(--text-muted)]">到期日 {item.dueDate}，未付款 {money(item.unpaidAmount)}</div></div></div><button type="button" className="finance-action finance-action-danger" onClick={() => openPaymentModal(item)}>登记付款</button></div>)}{overduePayables.length === 0 && <Empty description="暂无逾期应付款" />}</div>}
        </div>
      </div>

      <Modal isOpen={showPayableModal} className="finance-dialog" onClose={() => setShowPayableModal(false)} title="新建付款计划" maxWidth="md">
        <form className="finance-form" onSubmit={handleCreatePayable}>
          <div className="finance-form-grid"><div><label>付款类型 *</label><select aria-label="付款类型" required value={payableForm.category} onChange={(event) => setPayableForm({ ...payableForm, category: event.target.value as ProjectPayableCategory, contractId: '' })} className="finance-input"><option value="">请选择付款类型</option>{payableCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></div><div><label>关联项目 *</label><select aria-label="关联项目" required value={payableForm.projectId} onChange={(event) => setPayableForm({ ...payableForm, projectId: event.target.value })} className="finance-input"><option value="">请选择项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.customerName}</option>)}</select></div></div>
          <div className="finance-form-grid"><div><label>收款客户 *</label><input aria-label="收款客户" required readOnly value={selectedProject?.customerName || ''} className="finance-input" placeholder="选择关联项目后自动带出" /></div><div><label>关联合同{payableForm.category === '运营中心分成' ? ' *' : ''}</label><select aria-label="关联合同" required={payableForm.category === '运营中心分成'} value={payableForm.contractId} onChange={(event) => setPayableForm({ ...payableForm, contractId: event.target.value })} className="finance-input"><option value="">{payableForm.category === '运营中心分成' ? '请选择分成合同' : '无'}</option>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.code} · {contract.name}</option>)}</select></div></div>
          <div className="finance-form-grid"><div><label>关联采购单</label><input aria-label="关联采购单" value={payableForm.purchaseOrderCode} onChange={(event) => setPayableForm({ ...payableForm, purchaseOrderCode: event.target.value })} className="finance-input" placeholder="项目采购时填写" /></div><div><label>含税应付金额 (元) *</label><input aria-label="含税应付金额 (元)" required type="number" min="0.01" step="0.01" value={payableForm.amount} onChange={(event) => setPayableForm({ ...payableForm, amount: event.target.value })} className="finance-input" /></div></div>
          <div className="finance-form-grid"><div><label>计划付款日期 *</label><input aria-label="计划付款日期" required type="date" value={payableForm.dueDate} onChange={(event) => setPayableForm({ ...payableForm, dueDate: event.target.value })} className="finance-input" /></div><div><label>备注</label><input aria-label="备注" value={payableForm.note} onChange={(event) => setPayableForm({ ...payableForm, note: event.target.value })} className="finance-input" /></div></div>
          <div className="finance-form-footer"><button type="button" onClick={() => setShowPayableModal(false)} className="finance-action">取消</button><button type="submit" className="finance-action finance-action-primary">保存付款计划</button></div>
        </form>
      </Modal>

      <Modal isOpen={showPaymentModal} className="finance-dialog" onClose={() => setShowPaymentModal(false)} title="登记付款" maxWidth="md">
        {selectedPayable && <form className="finance-form" onSubmit={handleRecordPayment}><div className="finance-form-summary"><div>供应商：<strong>{selectedPayable.supplierName}</strong></div><div>未付款余额：<strong>{money(selectedPayable.unpaidAmount)}</strong></div></div><div><label>本次付款金额 (元) *</label><input aria-label="本次付款金额 (元)" required type="number" min="0.01" max={selectedPayable.unpaidAmount} step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} className="finance-input" /></div><div><label>付款方式 *</label><select aria-label="付款方式" value={paymentForm.payMethod} onChange={(event) => setPaymentForm({ ...paymentForm, payMethod: event.target.value })} className="finance-input"><option>银行转账</option><option>网银支付</option><option>商业承兑汇票</option></select></div><div><label>关联进项发票</label><select aria-label="关联进项发票" value={paymentForm.invoiceId} onChange={(event) => setPaymentForm({ ...paymentForm, invoiceId: event.target.value })} className="finance-input"><option value="">暂不关联进项发票</option>{purchaseInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNo} / {invoiceProjectName(invoice)}</option>)}</select></div><div className="finance-form-footer"><button type="button" onClick={() => setShowPaymentModal(false)} className="finance-action">取消</button><button type="submit" className="finance-action finance-action-primary">确认登记付款</button></div></form>}
      </Modal>
      <Drawer isOpen={Boolean(detailPayable)} onClose={() => setDetailPayable(null)} title={<span className="font-sans tracking-normal">应付台账详情</span>} subtitle={detailPayable?.payableCode ? <span className="font-mono tabular-nums">{detailPayable.payableCode}</span> : undefined} width="max-w-4xl" contentClassName="overflow-y-auto">
        {detailPayable && <div className="finance-detail">
          <FinanceDetailMetrics items={[
            { label: '应付金额', value: money(detailPayable.amount) },
            { label: '已付款', value: money(detailPayable.paidAmount) },
            { label: '未付款余额', value: money(detailPayable.unpaidAmount) },
            { label: "状态", value: <StatusTag status={detailPayable.status} /> }
          ]} />
          <FinanceDetailSection title="应付信息"><FinanceDetailFields items={[
            { label: '应付单号', value: detailPayable.payableCode, emphasis: true },
            { label: '付款类型', value: detailPayable.category || '第三方采购' },
            { label: '收款客户', value: detailPayable.supplierName },
            { label: '计划付款日期', value: detailPayable.dueDate }
          ]} /></FinanceDetailSection>
          <FinanceDetailSection title="业务关联"><FinanceDetailFields items={[
            { label: '关联项目', value: detailPayable.projectName },
            { label: '关联客户', value: detailPayable.customerName },
            { label: '关联合同', value: detailPayable.contractCode },
            { label: '关联采购单', value: detailPayable.purchaseOrderCode },
            { label: '申请人', value: detailPayable.applicant }
          ]} /></FinanceDetailSection>
          <FinanceDetailSection title="付款记录">{payments.filter((payment) => payment.payableCode === detailPayable.payableCode).length ? <div className="finance-table-scroll"><table className="finance-table"><thead><tr><th>付款流水号</th><th>关联进项发票</th><th>付款金额</th><th>付款方式</th><th>付款日期</th><th>经办人</th></tr></thead><tbody>{payments.filter((payment) => payment.payableCode === detailPayable.payableCode).map((payment) => <tr key={payment.id}><td className="font-mono">{payment.paymentCode}</td><td>{paymentInvoiceLabel(payment)}</td><td className="finance-amount">{money(payment.amount)}</td><td>{payment.payMethod}</td><td>{payment.payDate}</td><td>{payment.operator}</td></tr>)}</tbody></table></div> : <Empty description="暂无付款记录" />}</FinanceDetailSection>
          <FinanceDetailSection title="备注"><p className="finance-detail-note">{detailPayable.note || "—"}</p></FinanceDetailSection>
        </div>}
      </Drawer>
    </ComprehensivePage>
  );
};

export default AccountsPayableManagementView;
