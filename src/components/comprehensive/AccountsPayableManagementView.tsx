import React, { useMemo, useState } from 'react';
import { Empty } from 'antd';
import { AlertTriangle, CheckCircle2, CreditCard, DollarSign, Plus, Search } from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
import { useApp } from '../../context/AppContext';
import type { AccountsPayablePaymentRecord, AccountsPayableRecord } from '../../types';
import { loadAccountsPayable, saveAccountsPayable } from '../../services/accountsPayableRepository';
import './finance-management.css';

type PayableTab = 'ledger' | 'payments' | 'overdue';

const money = (value: number) => `¥ ${value.toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);

export const AccountsPayableManagementView: React.FC = () => {
  const { addToast, currentUser } = useApp();
  const initialSnapshot = useMemo(() => loadAccountsPayable(), []);
  const [payables, setPayables] = useState<AccountsPayableRecord[]>(initialSnapshot.payables);
  const [payments, setPayments] = useState<AccountsPayablePaymentRecord[]>(initialSnapshot.payments);
  const [activeTab, setActiveTab] = useState<PayableTab>('ledger');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<AccountsPayableRecord | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payableForm, setPayableForm] = useState({ supplierName: '', purchaseOrderCode: '', projectName: '', amount: '', dueDate: '', note: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', payMethod: '银行转账' });

  const totalAmount = payables.reduce((sum, item) => sum + item.amount, 0);
  const paidAmount = payables.reduce((sum, item) => sum + item.paidAmount, 0);
  const unpaidAmount = payables.reduce((sum, item) => sum + item.unpaidAmount, 0);
  const overduePayables = payables.filter((item) => item.unpaidAmount > 0 && item.dueDate < today());
  const filteredPayables = payables.filter((item) => [item.payableCode, item.supplierName, item.purchaseOrderCode, item.projectName].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase())));
  const filteredPayments = payments.filter((item) => [item.paymentCode, item.payableCode, item.supplierName].some((value) => value.toLowerCase().includes(searchQuery.toLowerCase())));

  const persist = (nextPayables: AccountsPayableRecord[], nextPayments: AccountsPayablePaymentRecord[]) => {
    saveAccountsPayable({ payables: nextPayables, payments: nextPayments });
    setPayables(nextPayables);
    setPayments(nextPayments);
  };

  const handleCreatePayable = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(payableForm.amount);
    if (!payableForm.supplierName.trim() || !payableForm.dueDate || !amount || amount <= 0) return;
    const payable: AccountsPayableRecord = {
      id: `payable-${Date.now()}`, payableCode: `AP-${today().replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      supplierName: payableForm.supplierName.trim(), purchaseOrderCode: payableForm.purchaseOrderCode.trim() || undefined,
      projectName: payableForm.projectName.trim() || undefined, amount, paidAmount: 0, unpaidAmount: amount,
      dueDate: payableForm.dueDate, status: payableForm.dueDate < today() ? '逾期' : '待付款', applicant: currentUser.name,
      note: payableForm.note.trim() || undefined
    };
    persist([payable, ...payables], payments);
    setPayableForm({ supplierName: '', purchaseOrderCode: '', projectName: '', amount: '', dueDate: '', note: '' });
    setShowPayableModal(false);
    addToast('success', '应付账款已建立', `单号：${payable.payableCode}`);
  };

  const openPaymentModal = (payable: AccountsPayableRecord) => {
    setSelectedPayable(payable);
    setPaymentForm({ amount: String(payable.unpaidAmount), payMethod: '银行转账' });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPayable) return;
    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0 || amount > selectedPayable.unpaidAmount) return;
    const nextPayable: AccountsPayableRecord = {
      ...selectedPayable, paidAmount: selectedPayable.paidAmount + amount, unpaidAmount: selectedPayable.unpaidAmount - amount,
      status: selectedPayable.unpaidAmount - amount === 0 ? '已结清' : selectedPayable.dueDate < today() ? '逾期' : '部分付款'
    };
    const payment: AccountsPayablePaymentRecord = {
      id: `payable-payment-${Date.now()}`, paymentCode: `APP-${today().replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      payableCode: selectedPayable.payableCode, supplierName: selectedPayable.supplierName, amount,
      payDate: today(), payMethod: paymentForm.payMethod, bankSerialNo: `TX-${Math.floor(Math.random() * 89999999 + 10000000)}`, operator: currentUser.name
    };
    persist(payables.map((item) => item.id === selectedPayable.id ? nextPayable : item), [payment, ...payments]);
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
    <ComprehensivePage title="应付账款" description="管理供应商应付款、付款记录与到期风险" icon={<CreditCard className="w-5 h-5" />} hideHeader>
      <div className="finance-workspace space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="应付账款总额" value={money(totalAmount)} subText={`${payables.length} 笔应付记录`} icon={<DollarSign className="w-5 h-5" />} onClick={() => setActiveTab('ledger')} />
          <StatCard title="已付款总额" value={money(paidAmount)} subText={`${payments.length} 笔付款记录`} icon={<CheckCircle2 className="w-5 h-5" />} onClick={() => setActiveTab('payments')} />
          <StatCard title="待付款余额" value={money(unpaidAmount)} subText="当前未结清应付金额" icon={<CreditCard className="w-5 h-5" />} onClick={() => setActiveTab('ledger')} />
          <StatCard title="逾期应付款" value={money(overduePayables.reduce((sum, item) => sum + item.unpaidAmount, 0))} subText={`${overduePayables.length} 笔超过付款节点`} icon={<AlertTriangle className="w-5 h-5" />} onClick={() => setActiveTab('overdue')} />
        </div>

        <div className="finance-panel space-y-4">
          <div className="finance-header">
            <div className="finance-tabs" role="tablist" aria-label="应付账款视图">
              {tabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className={`finance-tab ${activeTab === tab.key ? 'is-active' : ''}`}>{tab.icon}{tab.label}</button>)}
            </div>
            <div className="finance-actions"><button type="button" onClick={() => setShowPayableModal(true)} className="finance-action finance-action-primary"><Plus className="w-4 h-4" />新建应付账款</button></div>
          </div>
          <div className="finance-search"><Search className="w-4 h-4" /><input aria-label="搜索应付账款" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索应付单号、供应商、采购单或项目..." className="finance-input" /></div>

          {activeTab === 'ledger' && <div className="finance-table-scroll"><table className="finance-table finance-table-wide"><thead><tr><th>应付单号</th><th>供应商</th><th>关联采购单</th><th>关联项目</th><th>应付金额</th><th>已付款</th><th>未付款余额</th><th>到期日</th><th>状态</th><th>操作</th></tr></thead><tbody>{filteredPayables.map((item) => <tr key={item.id}><td className="font-mono">{item.payableCode}</td><td className="font-semibold">{item.supplierName}</td><td>{item.purchaseOrderCode || '—'}</td><td>{item.projectName || '—'}</td><td className="finance-amount">{money(item.amount)}</td><td className="finance-amount finance-amount-success">{money(item.paidAmount)}</td><td className="finance-amount finance-amount-warning">{money(item.unpaidAmount)}</td><td>{item.dueDate}</td><td><StatusTag status={item.status} /></td><td>{item.unpaidAmount > 0 ? <button type="button" className="finance-action" onClick={() => openPaymentModal(item)}>登记付款</button> : <span className="text-[var(--success)]">已结清</span>}</td></tr>)}{filteredPayables.length === 0 && <tr><td colSpan={10} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的应付账款' : '暂无应付账款'} /></td></tr>}</tbody></table></div>}

          {activeTab === 'payments' && <div className="finance-table-scroll"><table className="finance-table"><thead><tr><th>付款流水号</th><th>应付单号</th><th>供应商</th><th>付款金额</th><th>付款方式</th><th>付款日期</th><th>银行流水号</th><th>经办人</th></tr></thead><tbody>{filteredPayments.map((item) => <tr key={item.id}><td className="font-mono">{item.paymentCode}</td><td className="font-mono">{item.payableCode}</td><td className="font-semibold">{item.supplierName}</td><td className="finance-amount finance-amount-success">{money(item.amount)}</td><td>{item.payMethod}</td><td>{item.payDate}</td><td className="font-mono">{item.bankSerialNo}</td><td>{item.operator}</td></tr>)}{filteredPayments.length === 0 && <tr><td colSpan={8} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的付款记录' : '暂无付款记录'} /></td></tr>}</tbody></table></div>}

          {activeTab === 'overdue' && <div className="space-y-3">{overduePayables.map((item) => <div key={item.id} className="finance-overdue"><div className="flex items-center gap-3"><div className="finance-overdue-icon"><AlertTriangle className="w-4 h-4" /></div><div><div className="finance-overdue-title">{item.supplierName} · {item.payableCode}</div><div className="text-[var(--text-muted)]">到期日 {item.dueDate}，未付款 {money(item.unpaidAmount)}</div></div></div><button type="button" className="finance-action finance-action-danger" onClick={() => openPaymentModal(item)}>登记付款</button></div>)}{overduePayables.length === 0 && <Empty description="暂无逾期应付款" />}</div>}
        </div>
      </div>

      <Modal isOpen={showPayableModal} className="finance-dialog" onClose={() => setShowPayableModal(false)} title="新建应付账款" maxWidth="md">
        <form className="finance-form" onSubmit={handleCreatePayable}>
          <div className="finance-form-grid"><div><label>供应商名称 *</label><input aria-label="供应商名称" required value={payableForm.supplierName} onChange={(event) => setPayableForm({ ...payableForm, supplierName: event.target.value })} className="finance-input" placeholder="请输入供应商名称" /></div><div><label>关联采购单</label><input aria-label="关联采购单" value={payableForm.purchaseOrderCode} onChange={(event) => setPayableForm({ ...payableForm, purchaseOrderCode: event.target.value })} className="finance-input" placeholder="请输入采购单号" /></div></div>
          <div className="finance-form-grid"><div><label>关联项目</label><input aria-label="关联项目" value={payableForm.projectName} onChange={(event) => setPayableForm({ ...payableForm, projectName: event.target.value })} className="finance-input" placeholder="请输入项目名称" /></div><div><label>含税应付金额 (元) *</label><input aria-label="含税应付金额 (元)" required type="number" min="0.01" step="0.01" value={payableForm.amount} onChange={(event) => setPayableForm({ ...payableForm, amount: event.target.value })} className="finance-input" /></div></div>
          <div className="finance-form-grid"><div><label>计划付款日期 *</label><input aria-label="计划付款日期" required type="date" value={payableForm.dueDate} onChange={(event) => setPayableForm({ ...payableForm, dueDate: event.target.value })} className="finance-input" /></div><div><label>备注</label><input aria-label="备注" value={payableForm.note} onChange={(event) => setPayableForm({ ...payableForm, note: event.target.value })} className="finance-input" /></div></div>
          <div className="finance-form-footer"><button type="button" onClick={() => setShowPayableModal(false)} className="finance-action">取消</button><button type="submit" className="finance-action finance-action-primary">保存应付账款</button></div>
        </form>
      </Modal>

      <Modal isOpen={showPaymentModal} className="finance-dialog" onClose={() => setShowPaymentModal(false)} title="登记付款" maxWidth="md">
        {selectedPayable && <form className="finance-form" onSubmit={handleRecordPayment}><div className="finance-form-summary"><div>供应商：<strong>{selectedPayable.supplierName}</strong></div><div>未付款余额：<strong>{money(selectedPayable.unpaidAmount)}</strong></div></div><div><label>本次付款金额 (元) *</label><input aria-label="本次付款金额 (元)" required type="number" min="0.01" max={selectedPayable.unpaidAmount} step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} className="finance-input" /></div><div><label>付款方式 *</label><select aria-label="付款方式" value={paymentForm.payMethod} onChange={(event) => setPaymentForm({ ...paymentForm, payMethod: event.target.value })} className="finance-input"><option>银行转账</option><option>网银支付</option><option>商业承兑汇票</option></select></div><div className="finance-form-footer"><button type="button" onClick={() => setShowPaymentModal(false)} className="finance-action">取消</button><button type="submit" className="finance-action finance-action-primary">确认登记付款</button></div></form>}
      </Modal>
    </ComprehensivePage>
  );
};

export default AccountsPayableManagementView;
