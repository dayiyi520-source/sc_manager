import React, { useMemo, useState } from 'react';
import { Empty } from 'antd';
import './finance-management.css';
import { CreditCard, Plus, Search, DollarSign, AlertTriangle, CheckCircle2 } from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
import { useApp } from '../../context/AppContext';
import type { ActualPaymentRecord, PaymentPlan, ReceivableCategory } from '../../types';
import { loadPaymentCollection, savePaymentCollection } from '../../services/paymentCollectionRepository';
import { loadAccountsPayable, saveAccountsPayable } from '../../services/accountsPayableRepository';

type ReceivableTab = 'plan' | 'received' | 'overdue' | 'project';
const money = (value: number) => `¥ ${value.toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);
const categories: ReceivableCategory[] = ['合同回款', '保证金退回', '维保续费'];

export const PaymentCollectionManagementView: React.FC = () => {
  const { addToast, currentUser, contracts, projects } = useApp();
  const initial = useMemo(() => loadPaymentCollection(), []);
  const [payableSnapshot, setPayableSnapshot] = useState(loadAccountsPayable);
  const [plans, setPlans] = useState<PaymentPlan[]>(initial.plans);
  const [records, setRecords] = useState<ActualPaymentRecord[]>(initial.records);
  const [activeTab, setActiveTab] = useState<ReceivableTab>('plan');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [form, setForm] = useState({ category: '合同回款' as ReceivableCategory, contractId: '', sourcePayableId: '', stageIndex: '', projectId: '', customerName: '', stageName: '', amount: '', dueDate: '', note: '' });
  const [recordAmount, setRecordAmount] = useState('');
  const [recordPayMethod, setRecordPayMethod] = useState('银行转账');
  const persist = (nextPlans: PaymentPlan[], nextRecords: ActualPaymentRecord[]) => {
    try {
      savePaymentCollection({ plans: nextPlans, records: nextRecords });
      setPlans(nextPlans);
      setRecords(nextRecords);
      return true;
    } catch (error) {
      addToast('error', '回款计划保存失败', error instanceof Error ? error.message : '请稍后重试');
      return false;
    }
  };
  const selectedContract = contracts.find((contract) => contract.id === form.contractId);
  const selectedProject = projects.find((project) => project.id === form.projectId);
  const needsContract = form.category !== '保证金退回';
  const exactContractProject = selectedContract && projects.find((project) => project.name === selectedContract.relatedProduct);
  const customerProjects = selectedContract ? projects.filter((project) => project.customerId === selectedContract.customerId) : [];
  const contractProject = exactContractProject || (customerProjects.length === 1 ? customerProjects[0] : undefined);
  const selectedStage = selectedContract?.paymentStages?.[Number(form.stageIndex)];
  const depositPayables = payableSnapshot.payables.filter((payable) => payable.category === '招投标保证金' && payable.projectId === form.projectId && payable.paidAmount > (payable.returnedAmount || 0) + (payable.returnPlannedAmount || 0));
  const outstandingPlans = plans.filter((plan) => plan.uncollectedAmount > 0);
  const overduePlans = outstandingPlans.filter((plan) => plan.dueDate < today());
  const matchesSearch = (plan: PaymentPlan) => [plan.planCode, plan.category, plan.contractCode, plan.projectName, plan.customerName, plan.stageName].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPlans = plans.filter(matchesSearch);
  const filteredRecords = records.filter((record) => [record.recordCode, record.planCode, record.customerName].some((value) => value.toLowerCase().includes(searchQuery.toLowerCase())));

  const createPlan = (event: React.FormEvent) => {
    event.preventDefault();
    const project = needsContract ? contractProject || selectedProject : selectedProject;
    const customerName = needsContract ? selectedContract?.customerName || project?.customerName : project?.customerName;
    const amount = Number(needsContract ? selectedStage?.amount : form.amount);
    const dueDate = needsContract ? selectedStage?.dueDate : form.dueDate;
    const stageName = needsContract ? selectedStage?.phase : form.stageName;
    const deposit = payableSnapshot.payables.find((payable) => payable.id === form.sourcePayableId);
    const depositAvailable = deposit ? deposit.paidAmount - (deposit.returnedAmount || 0) - (deposit.returnPlannedAmount || 0) : 0;
    if (!project || !customerName || !amount || amount <= 0 || !dueDate || !stageName || (needsContract && (!selectedContract || form.stageIndex === '')) || (form.category === '保证金退回' && (!deposit || amount > depositAvailable))) return;
    const plan: PaymentPlan = {
      id: `receivable-${Date.now()}`, planCode: `AR-${today().replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      category: form.category, contractId: selectedContract?.id, contractCode: selectedContract?.code, sourcePayableId: deposit?.id,
      projectId: project.id, projectName: project.name, customerId: project.customerId, customerName,
      stageName: stageName || form.note.trim(), planAmount: amount, receivedAmount: 0, uncollectedAmount: amount,
      dueDate: dueDate || today(), status: dueDate && dueDate < today() ? '逾期未还' : '待回款', manager: currentUser.name
    };
    const nextPayableSnapshot = deposit ? { ...payableSnapshot, payables: payableSnapshot.payables.map((payable) => payable.id === deposit.id ? { ...payable, returnPlannedAmount: (payable.returnPlannedAmount || 0) + amount } : payable) } : payableSnapshot;
    try {
      if (deposit) saveAccountsPayable(nextPayableSnapshot);
      if (!persist([plan, ...plans], records)) {
        if (deposit) saveAccountsPayable(payableSnapshot);
        return;
      }
      if (deposit) setPayableSnapshot(nextPayableSnapshot);
    } catch (error) {
      if (deposit) {
        try { saveAccountsPayable(payableSnapshot); } catch { /* Keep the original save error visible. */ }
      }
      addToast('error', '应收计划保存失败', error instanceof Error ? error.message : '请稍后重试');
      return;
    }
    setForm({ category: '合同回款', contractId: '', sourcePayableId: '', stageIndex: '', projectId: '', customerName: '', stageName: '', amount: '', dueDate: '', note: '' });
    setShowPlanModal(false);
    addToast('success', '应收计划已建立', `计划编号：${plan.planCode}`);
  };

  const recordReceipt = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPlan) return;
    const amount = Number(recordAmount);
    if (!amount || amount <= 0 || amount > selectedPlan.uncollectedAmount) {
      addToast('error', '到账金额无效', '本次到账金额不能超过未收余额');
      return;
    }
    const record: ActualPaymentRecord = {
      id: `receipt-${Date.now()}`, recordCode: `REC-${today().replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      planCode: selectedPlan.planCode, customerName: selectedPlan.customerName, amount, payDate: new Date().toLocaleString(),
      payMethod: recordPayMethod, bankSerialNo: `TX-${Math.floor(Math.random() * 89999999 + 10000000)}`, operator: currentUser.name
    };
    const nextPlans = plans.map((plan) => {
      if (plan.id !== selectedPlan.id) return plan;
      const receivedAmount = plan.receivedAmount + amount;
      const uncollectedAmount = Math.max(0, plan.planAmount - receivedAmount);
      return { ...plan, receivedAmount, uncollectedAmount, status: uncollectedAmount === 0 ? '已回款' : '部分回款' };
    });
    const nextPayableSnapshot = selectedPlan.sourcePayableId ? { ...payableSnapshot, payables: payableSnapshot.payables.map((payable) => payable.id === selectedPlan.sourcePayableId ? { ...payable, returnPlannedAmount: Math.max(0, (payable.returnPlannedAmount || 0) - amount), returnedAmount: (payable.returnedAmount || 0) + amount } : payable) } : payableSnapshot;
    try {
      if (selectedPlan.sourcePayableId) saveAccountsPayable(nextPayableSnapshot);
      if (!persist(nextPlans, [record, ...records])) {
        if (selectedPlan.sourcePayableId) saveAccountsPayable(payableSnapshot);
        return;
      }
      if (selectedPlan.sourcePayableId) setPayableSnapshot(nextPayableSnapshot);
    } catch (error) {
      if (selectedPlan.sourcePayableId) {
        try { saveAccountsPayable(payableSnapshot); } catch { /* Keep the original save error visible. */ }
      }
      addToast('error', '到账记录保存失败', error instanceof Error ? error.message : '请稍后重试');
      return;
    }
    setSelectedPlan(null);
    setShowRecordModal(false);
    addToast('success', '到账记录已登记', `金额：${money(amount)}`);
  };

  const tabs = [
    { key: 'plan' as const, label: '应收计划', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { key: 'received' as const, label: '实际到账', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { key: 'overdue' as const, label: '逾期预警', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { key: 'project' as const, label: '项目收支', icon: <DollarSign className="w-3.5 h-3.5" /> }
  ];

  return <ComprehensivePage title="回款管理" description="跟踪项目应收、到账和项目资金余额" icon={<CreditCard className="w-5 h-5" />} hideHeader>
    <div className="finance-workspace space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="应收计划总额" value={money(plans.reduce((sum, plan) => sum + plan.planAmount, 0))} subText={`${plans.length} 笔项目应收`} icon={<DollarSign className="w-5 h-5" />} onClick={() => setActiveTab('plan')} />
        <StatCard title="累计实际到账" value={money(plans.reduce((sum, plan) => sum + plan.receivedAmount, 0))} subText={`${records.length} 笔到账记录`} icon={<CheckCircle2 className="w-5 h-5" />} onClick={() => setActiveTab('received')} />
        <StatCard title="未收余额" value={money(plans.reduce((sum, plan) => sum + plan.uncollectedAmount, 0))} subText={`${overduePlans.length} 笔逾期`} icon={<AlertTriangle className="w-5 h-5" />} onClick={() => setActiveTab('overdue')} />
      </div>
      <div className="finance-panel space-y-4">
        <div className="finance-header">
          <div className="finance-tabs" role="tablist" aria-label="回款视图">{tabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} className={`finance-tab ${activeTab === tab.key ? 'is-active' : ''}`}>{tab.icon}{tab.label}</button>)}</div>
          {activeTab === 'plan' && <button type="button" onClick={() => setShowPlanModal(true)} className="finance-action finance-action-primary"><Plus className="w-4 h-4" />新建应收计划</button>}
        </div>
        {activeTab !== 'project' && <div className="finance-search"><Search className="w-4 h-4" /><input aria-label="搜索应收计划" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索计划、客户、合同或项目..." className="finance-input" /></div>}
        {activeTab === 'plan' && <div className="finance-table-scroll"><table className="finance-table finance-table-wide"><thead><tr><th>计划编号</th><th>类别</th><th>关联合同</th><th>关联项目/客户</th><th>收款阶段</th><th>计划金额</th><th>已到账</th><th>未收余额</th><th>约定日期</th><th>状态</th><th>操作</th></tr></thead><tbody>{filteredPlans.map((plan) => <tr key={plan.id}><td className="font-mono">{plan.planCode}</td><td>{plan.category || '合同回款'}</td><td>{plan.contractCode || '—'}</td><td>{plan.projectName}<div className="text-[var(--text-muted)]">{plan.customerName}</div></td><td>{plan.stageName}</td><td className="finance-amount">{money(plan.planAmount)}</td><td className="finance-amount finance-amount-success">{money(plan.receivedAmount)}</td><td className="finance-amount finance-amount-warning">{money(plan.uncollectedAmount)}</td><td>{plan.dueDate}</td><td><StatusTag status={plan.status} /></td><td>{plan.uncollectedAmount > 0 && <button type="button" className="finance-action" onClick={() => { setSelectedPlan(plan); setRecordAmount(String(plan.uncollectedAmount)); setShowRecordModal(true); }}>登记到账</button>}</td></tr>)}{!filteredPlans.length && <tr><td colSpan={11} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的应收计划' : '暂无应收计划'} /></td></tr>}</tbody></table></div>}
        {activeTab === 'received' && <div className="finance-table-scroll"><table className="finance-table"><thead><tr><th>到账单号</th><th>关联计划</th><th>客户</th><th>到账金额</th><th>方式</th><th>银行流水号</th><th>到账时间</th><th>经办人</th></tr></thead><tbody>{filteredRecords.map((record) => <tr key={record.id}><td className="font-mono">{record.recordCode}</td><td>{record.planCode}</td><td>{record.customerName}</td><td className="finance-amount finance-amount-success">{money(record.amount)}</td><td>{record.payMethod}</td><td>{record.bankSerialNo}</td><td>{record.payDate}</td><td>{record.operator}</td></tr>)}{!filteredRecords.length && <tr><td colSpan={8} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的到账记录' : '暂无到账记录'} /></td></tr>}</tbody></table></div>}
        {activeTab === 'overdue' && <div className="finance-table-scroll"><table className="finance-table"><thead><tr><th>项目/客户</th><th>类别</th><th>关联合同</th><th>应收阶段</th><th>到期日</th><th>未收余额</th><th>操作</th></tr></thead><tbody>{overduePlans.filter(matchesSearch).map((plan) => <tr key={plan.id}><td>{plan.projectName}<div className="text-[var(--text-muted)]">{plan.customerName}</div></td><td>{plan.category}</td><td>{plan.contractCode || '—'}</td><td>{plan.stageName}</td><td>{plan.dueDate}</td><td className="finance-amount finance-amount-warning">{money(plan.uncollectedAmount)}</td><td><button type="button" className="finance-action" onClick={() => { setSelectedPlan(plan); setRecordAmount(String(plan.uncollectedAmount)); setShowRecordModal(true); }}>登记到账</button></td></tr>)}{!overduePlans.filter(matchesSearch).length && <tr><td colSpan={7} className="finance-empty-cell"><Empty description="暂无逾期应收" /></td></tr>}</tbody></table></div>}
        {activeTab === 'project' && <div className="finance-table-scroll"><table className="finance-table finance-table-wide"><thead><tr><th>项目/客户</th><th>累计实收</th><th>累计实付</th><th>实际净流入</th><th>未收余额</th><th>未付余额</th><th>预计净流入</th></tr></thead><tbody>{projects.map((project) => {
          const projectPlans = plans.filter((plan) => plan.projectId === project.id);
          const projectPayables = loadProjectPayables().filter((payable) => payable.projectId === project.id || (!payable.projectId && payable.projectName === project.name));
          const received = projectPlans.reduce((sum, plan) => sum + plan.receivedAmount, 0);
          const paid = projectPayables.reduce((sum, payable) => sum + payable.paidAmount, 0);
          const uncollected = projectPlans.reduce((sum, plan) => sum + plan.uncollectedAmount, 0);
          const unpaid = projectPayables.reduce((sum, payable) => sum + payable.unpaidAmount, 0);
          return <tr key={project.id}><td>{project.name}<div className="text-[var(--text-muted)]">{project.customerName}</div></td><td className="finance-amount finance-amount-success">{money(received)}</td><td className="finance-amount">{money(paid)}</td><td className="finance-amount">{money(received - paid)}</td><td className="finance-amount finance-amount-warning">{money(uncollected)}</td><td className="finance-amount finance-amount-warning">{money(unpaid)}</td><td className="finance-amount">{money(uncollected - unpaid)}</td></tr>;
        })}{!projects.length && <tr><td colSpan={7} className="finance-empty-cell"><Empty description="暂无项目收支" /></td></tr>}</tbody></table></div>}
      </div>
      <Modal isOpen={showPlanModal} className="finance-dialog" onClose={() => setShowPlanModal(false)} title="新建项目应收计划" maxWidth="lg">
        <form className="finance-form" onSubmit={createPlan}>
          <div className="finance-form-grid"><div><label>应收类别 *</label><select aria-label="应收类别" required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ReceivableCategory, contractId: '', sourcePayableId: '', stageIndex: '' })} className="finance-input">{categories.map((category) => <option key={category}>{category}</option>)}</select></div><div><label>关联合同{needsContract ? ' *' : ''}</label><select aria-label="关联合同" required={needsContract} value={form.contractId} onChange={(event) => { const contract = contracts.find((item) => item.id === event.target.value); const exactProject = contract && projects.find((item) => item.name === contract.relatedProduct); const matchingProjects = contract ? projects.filter((item) => item.customerId === contract.customerId) : []; const project = exactProject || (matchingProjects.length === 1 ? matchingProjects[0] : undefined); setForm({ ...form, contractId: event.target.value, projectId: project?.id || '', customerName: contract?.customerName || '', stageIndex: '', amount: '', dueDate: '', stageName: '' }); }} className="finance-input"><option value="">{needsContract ? '请选择合同' : '无'}</option>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.code} · {contract.name}</option>)}</select></div></div>
          {needsContract && <div><label>合同约定付款阶段 *</label><select aria-label="合同付款阶段" required value={form.stageIndex} onChange={(event) => setForm({ ...form, stageIndex: event.target.value, amount: '', dueDate: '', stageName: '' })} className="finance-input"><option value="">请选择约定阶段</option>{selectedContract?.paymentStages?.map((stage, index) => <option key={`${stage.phase}-${index}`} value={index}>{stage.phase} · {money(stage.amount)} · {stage.dueDate}</option>)}</select>{selectedStage && <div className="finance-form-summary">合同约定金额和日期将自动带入：{money(selectedStage.amount)} · {selectedStage.dueDate}</div>}</div>}
          <div className="finance-form-grid"><div><label>关联项目 *</label><select aria-label="关联项目" required value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} className="finance-input"><option value="">请选择项目</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div><label>客户</label><input aria-label="客户名称" readOnly value={form.category === '合同回款' ? selectedContract?.customerName || selectedProject?.customerName || '' : selectedProject?.customerName || ''} className="finance-input" placeholder="选择合同或项目后带出" /></div></div>
          {form.category === '保证金退回' && <div className="finance-form-grid"><div><label>原缴保证金记录 *</label><select aria-label="原缴保证金记录" required value={form.sourcePayableId} onChange={(event) => { const payable = depositPayables.find((item) => item.id === event.target.value); setForm({ ...form, sourcePayableId: event.target.value, amount: payable ? String(payable.paidAmount - (payable.returnedAmount || 0) - (payable.returnPlannedAmount || 0)) : '' }); }} className="finance-input"><option value="">请选择已支付的招投标保证金</option>{depositPayables.map((payable) => <option key={payable.id} value={payable.id}>{payable.payableCode} · {payable.supplierName} · 可退 {money(payable.paidAmount - (payable.returnedAmount || 0) - (payable.returnPlannedAmount || 0))}</option>)}</select></div><div><label>退回说明 *</label><input aria-label="应收说明" required value={form.stageName} onChange={(event) => setForm({ ...form, stageName: event.target.value })} className="finance-input" placeholder="如：项目投标保证金退回" /></div><div><label>应收金额 (元) *</label><input aria-label="应收金额" required type="number" min="0.01" max={depositPayables.find((item) => item.id === form.sourcePayableId)?.paidAmount} step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="finance-input" /></div></div>}
          {form.category === '保证金退回' && <div><label>约定收款日期 *</label><input aria-label="约定收款日期" required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="finance-input" /></div>}
          <div className="finance-form-footer"><button type="button" onClick={() => setShowPlanModal(false)} className="finance-action">取消</button><button type="submit" className="finance-action finance-action-primary">保存应收计划</button></div>
        </form>
      </Modal>
      <Modal isOpen={showRecordModal} className="finance-dialog" onClose={() => setShowRecordModal(false)} title="登记实际到账" maxWidth="md">
        {selectedPlan && <form className="finance-form" onSubmit={recordReceipt}><div className="finance-form-summary"><div>项目/客户：<strong>{selectedPlan.projectName} · {selectedPlan.customerName}</strong></div><div>应收阶段：<strong>{selectedPlan.stageName}</strong></div><div>未收余额：<strong>{money(selectedPlan.uncollectedAmount)}</strong></div></div><div><label>本次到账金额 (元) *</label><input aria-label="本次到账金额" required type="number" min="0.01" max={selectedPlan.uncollectedAmount} step="0.01" value={recordAmount} onChange={(event) => setRecordAmount(event.target.value)} className="finance-input" /></div><div><label>到账方式 *</label><select aria-label="到账方式" value={recordPayMethod} onChange={(event) => setRecordPayMethod(event.target.value)} className="finance-input"><option>银行转账</option><option>商业/银行承兑汇票</option><option>网银转账</option></select></div><div className="finance-form-footer"><button type="button" onClick={() => setShowRecordModal(false)} className="finance-action">取消</button><button type="submit" className="finance-action finance-action-primary">确认登记到账</button></div></form>}
      </Modal>
    </div>
  </ComprehensivePage>;
};

function loadProjectPayables() {
  try {
    const value = localStorage.getItem('shichuang.frontend.mock.accountsPayable');
    if (!value) return [];
    const parsed = JSON.parse(value) as { payables?: { projectId?: string; projectName?: string; paidAmount: number; unpaidAmount: number }[] };
    return Array.isArray(parsed.payables) ? parsed.payables.filter((item) => item.projectId || item.projectName) : [];
  } catch {
    return [];
  }
}

export default PaymentCollectionManagementView;
