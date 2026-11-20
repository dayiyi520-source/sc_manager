import React, { useMemo, useState } from 'react';
import { Button, Empty, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { PaperClipOutlined } from '@ant-design/icons';
import './finance-management.css';
import { CreditCard, Plus, Search, DollarSign, AlertTriangle, CheckCircle2 } from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Modal, Drawer } from '../common/UIComponents';
import { ComprehensivePage } from './ComprehensivePage';
import { useApp } from '../../context/AppContext';
import type { ActualPaymentRecord, AttachmentMetadata, PaymentPlan, PaymentPlanStage, ReceivableCategory } from '../../types';
import { loadPaymentCollection, savePaymentCollection } from '../../services/paymentCollectionRepository';
import { loadAccountsPayable, saveAccountsPayable } from '../../services/accountsPayableRepository';
import { RECEIVABLE_DEMO_CONTRACTS } from '../../services/receivableContractDemoData';

type ReceivableTab = 'plan' | 'received' | 'overdue' | 'project';
const money = (value: number) => `¥ ${value.toLocaleString()}`;
const today = () => new Date().toISOString().slice(0, 10);
const localDateTimeNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const displayDateTime = (value: string) => value.includes('T') ? value.replace('T', ' ') : value || '—';
const categories: ReceivableCategory[] = ['合同款', '运营中心分成', '投标保证金', '履约保证金', '质保金', '其他'];
const DEPOSIT_CATEGORIES: ReceivableCategory[] = ['投标保证金', '履约保证金', '质保金'];
const emptyReceivableForm = () => ({ category: '合同款' as ReceivableCategory, contractId: '', sourcePayableId: '', stageIndex: '', projectId: '', customerName: '', stageName: '', amount: '', dueDate: '', note: '' });

export const PaymentCollectionManagementView: React.FC = () => {
  const { addToast, currentUser, contracts, projects, isRemoteData } = useApp();
  const availableContracts = isRemoteData ? contracts : [...contracts, ...RECEIVABLE_DEMO_CONTRACTS];
  const initial = useMemo(() => loadPaymentCollection(), []);
  const [payableSnapshot, setPayableSnapshot] = useState(loadAccountsPayable);
  const [plans, setPlans] = useState<PaymentPlan[]>(initial.plans);
  const [records, setRecords] = useState<ActualPaymentRecord[]>(initial.records);
  const [activeTab, setActiveTab] = useState<ReceivableTab>('plan');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [detailPlan, setDetailPlan] = useState<PaymentPlan | null>(null);
  const [planAttachments, setPlanAttachments] = useState<AttachmentMetadata[]>([]);
  const [receiptAttachments, setReceiptAttachments] = useState<AttachmentMetadata[]>([]);
  const [receiptNote, setReceiptNote] = useState('');
  const [receiptAllocations, setReceiptAllocations] = useState<Record<string, string>>({});
  const [contractStageDates, setContractStageDates] = useState<Record<string, string>>({});
  const [attachmentError, setAttachmentError] = useState('');
  const [form, setForm] = useState(emptyReceivableForm);
  const [recordAmount, setRecordAmount] = useState('');
  const [receiptDateTime, setReceiptDateTime] = useState(localDateTimeNow);
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
  const selectedContract = availableContracts.find((contract) => contract.id === form.contractId);
  const selectedProject = projects.find((project) => project.id === form.projectId);
  const needsContract = form.category === '合同款' || form.category === '运营中心分成';
  const needsDepositSource = DEPOSIT_CATEGORIES.includes(form.category);
  const exactContractProject = selectedContract && projects.find((project) => project.name === selectedContract.relatedProduct);
  const customerProjects = selectedContract ? projects.filter((project) => project.customerId === selectedContract.customerId) : [];
  const contractProject = exactContractProject || (customerProjects.length === 1 ? customerProjects[0] : undefined);
  const depositPayables = payableSnapshot.payables.filter((payable) => (payable.category === form.category || (form.category === '投标保证金' && payable.category === '招投标保证金')) && payable.projectId === form.projectId && payable.paidAmount > (payable.returnedAmount || 0) + (payable.returnPlannedAmount || 0));
  const selectedDepositPayable = depositPayables.find((payable) => payable.id === form.sourcePayableId);
  const selectedDepositAvailable = selectedDepositPayable ? selectedDepositPayable.paidAmount - (selectedDepositPayable.returnedAmount || 0) - (selectedDepositPayable.returnPlannedAmount || 0) : 0;
  const contractStages: PaymentPlanStage[] = (selectedContract?.paymentStages || []).map((stage, index) => {
    const id = selectedContract!.id + '-stage-' + index;
    return { id, phase: stage.phase, triggerCondition: stage.triggerCondition, percentage: stage.percentage, amount: stage.amount, dueDate: contractStageDates[id] || undefined, receivedAmount: 0 };
  });
  const contractPlanExists = Boolean(selectedContract && plans.some((plan) => plan.contractId === selectedContract.id));
  const contractTotal = contractStages.reduce((sum, stage) => sum + stage.amount, 0);
  const receiptAllocationTotal = Object.values(receiptAllocations).reduce<number>((sum, amount) => sum + (Number(amount) || 0), 0);
  const outstandingPlans = plans.filter((plan) => plan.uncollectedAmount > 0);
  const overduePlans = outstandingPlans.filter((plan) => plan.stages?.length
    ? plan.stages.some((stage) => Boolean(stage.dueDate) && stage.amount > stage.receivedAmount && stage.dueDate! < today())
    : Boolean(plan.dueDate) && plan.dueDate! < today());
  const matchesSearch = (plan: PaymentPlan) => [plan.planCode, plan.category, plan.contractName, plan.contractCode, plan.projectName, plan.customerName, plan.stageName].some((value) => value?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredPlans = plans.filter(matchesSearch);
  const filteredRecords = records.filter((record) => [record.recordCode, record.planCode, record.customerName].some((value) => value.toLowerCase().includes(searchQuery.toLowerCase())));
  const contractName = (plan: PaymentPlan) => plan.contractName || availableContracts.find((contract) => contract.id === plan.contractId || contract.code === plan.contractCode)?.name || plan.contractCode || '—';
  const planForRecord = (record: ActualPaymentRecord) => plans.find((plan) => plan.planCode === record.planCode);
  const openPlanModal = () => { setForm(emptyReceivableForm()); setPlanAttachments([]); setContractStageDates({}); setAttachmentError(''); setShowPlanModal(true); };
  const closePlanModal = () => { setShowPlanModal(false); setForm(emptyReceivableForm()); setPlanAttachments([]); setContractStageDates({}); setAttachmentError(''); };
  const openRecordModal = (plan: PaymentPlan) => { setSelectedPlan(plan); setRecordAmount(String(plan.uncollectedAmount)); setReceiptAllocations({}); setReceiptNote(''); setReceiptAttachments([]); setReceiptDateTime(localDateTimeNow()); setAttachmentError(''); setShowRecordModal(true); };
  const closeRecordModal = () => { setShowRecordModal(false); setSelectedPlan(null); setReceiptAllocations({}); setReceiptNote(''); setReceiptAttachments([]); setReceiptDateTime(localDateTimeNow()); setAttachmentError(''); };

  const createPlan = (event: React.FormEvent) => {
    event.preventDefault();
    const project = needsContract ? contractProject : selectedProject;
    const customerName = needsContract ? selectedContract?.customerName || project?.customerName : project?.customerName;
    const amount = needsContract ? contractTotal : Number(form.amount);
    const dueDate = needsContract ? contractStages.map((stage) => stage.dueDate).filter((value): value is string => Boolean(value)).sort()[0] : form.dueDate;
    const stageName = needsContract ? contractStages.length + ' 个阶段' : form.stageName;
    const deposit = payableSnapshot.payables.find((payable) => payable.id === form.sourcePayableId);
    const depositAvailable = deposit ? deposit.paidAmount - (deposit.returnedAmount || 0) - (deposit.returnPlannedAmount || 0) : 0;
    const depositCategoryMatches = deposit?.category === form.category || (form.category === '投标保证金' && deposit?.category === '招投标保证金');
    if (!project || !customerName || !amount || amount <= 0 || (!needsContract && !dueDate) || !stageName || (needsContract && (!selectedContract || contractPlanExists || !contractStages.length)) || (needsDepositSource && (!deposit || !depositCategoryMatches || deposit.projectId !== project.id || amount > depositAvailable))) return;
    const plan: PaymentPlan = {
      id: `receivable-${Date.now()}`, planCode: `AR-${today().replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      category: form.category, contractId: selectedContract?.id, contractCode: selectedContract?.code, contractName: selectedContract?.name, sourcePayableId: deposit?.id,
      projectId: project.id, projectName: project.name, customerId: project.customerId, customerName,
      stageName: stageName || form.note.trim(), stages: needsContract ? contractStages : undefined,
      planAmount: amount, receivedAmount: 0, uncollectedAmount: amount,
      dueDate, status: dueDate && dueDate < today() ? '逾期未还' : '待回款', manager: currentUser.name,
      note: form.note.trim() || undefined, attachments: planAttachments
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
    setForm(emptyReceivableForm());
    setPlanAttachments([]);
    setShowPlanModal(false);
    addToast('success', '应收计划已建立', `计划编号：${plan.planCode}`);
  };

  const recordReceipt = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPlan) return;
    const stageAllocations = selectedPlan.stages?.map((stage) => ({
      stageId: stage.id, stageName: stage.phase, amount: Number(receiptAllocations[stage.id]) || 0
    })).filter((allocation) => allocation.amount > 0);
    const amount = selectedPlan.stages?.length ? receiptAllocationTotal : Number(recordAmount);
    if (!amount || amount <= 0 || amount > selectedPlan.uncollectedAmount) {
      addToast('error', '到账金额无效', '本次到账金额不能超过未收余额');
      return;
    }
    if (selectedPlan.stages?.length && (!stageAllocations?.length || stageAllocations.some((allocation) => {
      const stage = selectedPlan.stages?.find((item) => item.id === allocation.stageId);
      return !stage || allocation.amount > stage.amount - stage.receivedAmount;
    }))) {
      addToast('error', '阶段到账金额无效', '请填写有效的阶段到账金额，且不得超过该阶段未收金额');
      return;
    }
    const record: ActualPaymentRecord = {
      id: `receipt-${Date.now()}`, recordCode: `REC-${today().replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      planCode: selectedPlan.planCode, customerName: selectedPlan.customerName, amount, payDate: receiptDateTime,
      payMethod: recordPayMethod, operator: currentUser.name,
      stageAllocations, note: receiptNote.trim() || undefined, attachments: receiptAttachments
    };
    const nextPlans = plans.map((plan) => {
      if (plan.id !== selectedPlan.id) return plan;
      const stages = plan.stages?.map((stage) => ({
        ...stage,
        receivedAmount: stage.receivedAmount + (stageAllocations?.find((allocation) => allocation.stageId === stage.id)?.amount || 0)
      }));
      const receivedAmount = stages?.length
        ? stages.reduce((sum, stage) => sum + stage.receivedAmount, 0)
        : plan.receivedAmount + amount;
      const uncollectedAmount = Math.max(0, plan.planAmount - receivedAmount);
      const isOverdue = stages?.some((stage) => Boolean(stage.dueDate) && stage.amount > stage.receivedAmount && stage.dueDate! < today()) ?? (Boolean(plan.dueDate) && plan.dueDate! < today());
      return { ...plan, stages, receivedAmount, uncollectedAmount, status: uncollectedAmount === 0 ? '已回款' : isOverdue ? '逾期未还' : receivedAmount > 0 ? '部分回款' : '待回款' };
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
    setReceiptNote('');
    setReceiptAttachments([]);
    setReceiptAllocations({});
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
          {activeTab === 'plan' && <button type="button" onClick={openPlanModal} className="finance-action finance-action-primary"><Plus className="w-4 h-4" />新建应收计划</button>}
        </div>
        {activeTab !== 'project' && <div className="finance-search"><Search className="w-4 h-4" /><input aria-label="搜索应收计划" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索计划、客户、合同或项目..." className="finance-input" /></div>}
        {activeTab === 'plan' && <div className="finance-table-scroll"><table className="finance-table finance-table-wide"><thead><tr><th>计划编号</th><th>应收类型</th><th>合同名称</th><th>关联项目/客户</th><th>计划金额</th><th>已到账</th><th>未收余额</th><th>约定日期</th><th>状态</th><th>操作</th></tr></thead><tbody>{filteredPlans.map((plan) => <tr key={plan.id}><td className="font-mono"><button type="button" className="finance-action-link" onClick={() => setDetailPlan(plan)}>{plan.planCode}</button></td><td>{plan.category || '合同款'}</td><td>{contractName(plan)}</td><td>{plan.projectName}<div className="text-[var(--text-muted)]">{plan.customerName}</div></td><td className="finance-amount">{money(plan.planAmount)}</td><td className="finance-amount finance-amount-success">{money(plan.receivedAmount)}</td><td className="finance-amount finance-amount-warning">{money(plan.uncollectedAmount)}</td><td>{plan.dueDate || plan.stages?.map((stage) => stage.dueDate).filter((value): value is string => Boolean(value)).sort()[0] || '—'}</td><td><StatusTag status={plan.status} /></td><td><div className="flex flex-wrap items-center gap-3"><button type="button" className="finance-action-link" onClick={() => setDetailPlan(plan)}>详情</button>{plan.uncollectedAmount > 0 && <button type="button" className="finance-action-link" onClick={() => openRecordModal(plan)}>登记到账</button>}</div></td></tr>)}{!filteredPlans.length && <tr><td colSpan={10} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的应收计划' : '暂无应收计划'} /></td></tr>}</tbody></table></div>}
        {activeTab === 'received' && <div className="finance-table-scroll"><table className="finance-table"><thead><tr><th>到账单号</th><th>关联计划</th><th>客户</th><th>到账金额</th><th>阶段分配</th><th>备注/凭证</th><th>方式</th><th>到账时间</th><th>经办人</th></tr></thead><tbody>{filteredRecords.map((record) => <tr key={record.id}><td className="font-mono">{record.recordCode}</td><td>{planForRecord(record) ? <button type="button" className="finance-action-link" onClick={() => setDetailPlan(planForRecord(record) || null)}>{record.planCode}</button> : record.planCode}</td><td>{record.customerName}</td><td className="finance-amount finance-amount-success">{money(record.amount)}</td><td>{record.stageAllocations?.length ? record.stageAllocations.map((allocation) => <div key={allocation.stageId}>{allocation.stageName}：{money(allocation.amount)}</div>) : '—'}</td><td>{record.note && <div className="max-w-48 break-words">{record.note}</div>}<AttachmentList attachments={record.attachments || []} /></td><td>{record.payMethod}</td><td>{displayDateTime(record.payDate)}</td><td>{record.operator}</td></tr>)}{!filteredRecords.length && <tr><td colSpan={9} className="finance-empty-cell"><Empty description={searchQuery ? '暂无匹配的到账记录' : '暂无到账记录'} /></td></tr>}</tbody></table></div>}
        {activeTab === 'overdue' && <div className="finance-table-scroll"><table className="finance-table"><thead><tr><th>项目/客户</th><th>类别</th><th>合同名称</th><th>应收阶段</th><th>到期日</th><th>未收余额</th><th>操作</th></tr></thead><tbody>{overduePlans.filter(matchesSearch).map((plan) => <tr key={plan.id}><td>{plan.projectName}<div className="text-[var(--text-muted)]">{plan.customerName}</div></td><td>{plan.category}</td><td>{contractName(plan)}</td><td>{plan.stageName}</td><td>{plan.dueDate || plan.stages?.map((stage) => stage.dueDate).filter(Boolean).sort()[0] || '—'}</td><td className="finance-amount finance-amount-warning">{money(plan.uncollectedAmount)}</td><td><button type="button" className="finance-action-link" onClick={() => openRecordModal(plan)}>登记到账</button></td></tr>)}{!overduePlans.filter(matchesSearch).length && <tr><td colSpan={7} className="finance-empty-cell"><Empty description="暂无逾期应收" /></td></tr>}</tbody></table></div>}
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
      <Modal isOpen={showPlanModal} className="finance-dialog" onClose={closePlanModal} title="新建项目应收计划" maxWidth="lg">
        <form className="finance-form" onSubmit={createPlan}>
          <div className="finance-form-grid"><div><label>应收类型 *</label><select aria-label="应收类型" required value={form.category} onChange={(event) => { setForm({ ...form, category: event.target.value as ReceivableCategory, contractId: '', sourcePayableId: '', stageIndex: '', customerName: '', stageName: '', amount: '', dueDate: '' }); setContractStageDates({}); }} className="finance-input">{categories.map((category) => <option key={category}>{category}</option>)}</select></div><div><label>关联合同{needsContract ? ' *' : ''}</label><select aria-label="关联合同" required={needsContract} value={form.contractId} disabled={!needsContract} onChange={(event) => { const contract = availableContracts.find((item) => item.id === event.target.value); const exactProject = contract && projects.find((item) => item.name === contract.relatedProduct); const matchingProjects = contract ? projects.filter((item) => item.customerId === contract.customerId) : []; const project = exactProject || (matchingProjects.length === 1 ? matchingProjects[0] : undefined); setForm({ ...form, contractId: event.target.value, projectId: project?.id || '', customerName: contract?.customerName || '', stageIndex: '', amount: '', dueDate: '', stageName: '' }); setContractStageDates({}); }} className="finance-input"><option value="">{needsContract ? '请选择合同' : '无'}</option>{availableContracts.map((contract) => <option key={contract.id} value={contract.id} disabled={plans.some((plan) => plan.contractId === contract.id)}>{contract.code} · {contract.name}{contract.isDemo ? '（演示）' : ''}{plans.some((plan) => plan.contractId === contract.id) ? '（已建应收计划）' : ''}</option>)}</select></div></div>
          {needsContract && selectedContract && <div className="finance-form-summary"><div className="grid grid-cols-2 gap-3"><div>合同名称：<strong>{selectedContract.name}</strong></div><div>合同金额：<strong>{money(selectedContract.amount)}</strong></div><div>合同客户：<strong>{selectedContract.customerName}</strong></div><div>签订日期：<strong>{selectedContract.signDate || '—'}</strong></div></div>{contractPlanExists ? <p role="alert" className="mt-3 text-[var(--danger)]">该合同已建立应收计划，不能重复创建。</p> : !contractProject ? <p role="alert" className="mt-3 text-[var(--danger)]">合同未关联到唯一项目，请先完善合同项目关系。</p> : !contractStages.length ? <p role="alert" className="mt-3 text-[var(--danger)]">该合同尚未维护付款阶段，暂不能建立应收计划。</p> : <div className="mt-4 overflow-x-auto"><table className="finance-table"><thead><tr><th>阶段名称</th><th>完成内容</th><th>占比</th><th>金额</th><th>约定时间（选填）</th></tr></thead><tbody>{contractStages.map((stage) => <tr key={stage.id}><td>{stage.phase}</td><td>{stage.triggerCondition || '—'}</td><td>{stage.percentage}%</td><td>{money(stage.amount)}</td><td><input aria-label={'阶段约定时间-' + stage.phase} type="date" value={stage.dueDate || ''} onChange={(event) => setContractStageDates({ ...contractStageDates, [stage.id]: event.target.value })} className="finance-input" /></td></tr>)}</tbody></table><p className="mt-3">计划总额：<strong>{money(contractTotal)}</strong></p></div>}</div>}
          <div className="finance-form-grid"><div><label>关联项目 *</label><select aria-label="关联项目" required value={form.projectId} disabled={needsContract} onChange={(event) => setForm({ ...form, projectId: event.target.value, sourcePayableId: '', amount: needsDepositSource ? '' : form.amount })} className="finance-input"><option value="">{needsContract ? '由合同自动带出' : '请选择项目'}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div><div><label>客户</label><input aria-label="客户名称" readOnly value={needsContract ? selectedContract?.customerName || selectedProject?.customerName || '' : selectedProject?.customerName || ''} className="finance-input" placeholder="选择合同或项目后带出" /></div></div>
          {needsDepositSource && <>
            <div className="finance-form-grid"><div><label>原缴保证金记录 *</label><select aria-label="原缴保证金记录" required value={form.sourcePayableId} onChange={(event) => { const payable = depositPayables.find((item) => item.id === event.target.value); setForm({ ...form, sourcePayableId: event.target.value, stageName: payable ? `${form.category}退回` : '', amount: payable ? String(payable.paidAmount - (payable.returnedAmount || 0) - (payable.returnPlannedAmount || 0)) : '' }); }} className="finance-input"><option value="">{depositPayables.length ? `请选择已支付的${form.category}` : `当前项目暂无可退的${form.category}`}</option>{depositPayables.map((payable) => <option key={payable.id} value={payable.id}>{payable.payableCode} · {payable.supplierName} · 可退 {money(payable.paidAmount - (payable.returnedAmount || 0) - (payable.returnPlannedAmount || 0))}</option>)}</select></div><div><label>退回说明 *</label><input aria-label="应收说明" required value={form.stageName} onChange={(event) => setForm({ ...form, stageName: event.target.value })} className="finance-input" placeholder={`如：项目${form.category}退回`} /></div></div>
            <div className="finance-form-grid"><div><label>应收金额 (元) *</label><input aria-label="应收金额" required type="number" min="0.01" max={selectedDepositAvailable || undefined} step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="finance-input" /></div><div><label>约定收款日期 *</label><input aria-label="约定收款日期" required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="finance-input" /></div></div>
          </>}
          {form.category === '其他' && <>
            <div className="finance-form-grid"><div><label>应收说明 *</label><input aria-label="应收说明" required value={form.stageName} onChange={(event) => setForm({ ...form, stageName: event.target.value })} className="finance-input" placeholder="请输入应收说明" /></div><div><label>应收金额 (元) *</label><input aria-label="应收金额" required type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="finance-input" /></div></div>
            <div><label>约定收款日期 *</label><input aria-label="约定收款日期" required type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="finance-input" /></div>
          </>}
          <div><label>计划备注</label><textarea aria-label="计划备注" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="finance-input" rows={3} placeholder="补充本次应收计划说明（选填）" /></div>
          <AttachmentPicker value={planAttachments} onChange={setPlanAttachments} onError={(message) => { setAttachmentError(message); addToast('error', '附件上传失败', message); }} onSuccess={() => setAttachmentError('')} label="上传计划附件" />
          {attachmentError && showPlanModal && <div role="alert" className="text-xs text-[var(--danger)]">{attachmentError}</div>}
          <div className="finance-form-footer"><button type="button" onClick={closePlanModal} className="finance-action">取消</button><button type="submit" className="finance-action finance-action-primary" disabled={needsContract && (!selectedContract || contractPlanExists || !contractProject || !contractStages.length)}>保存应收计划</button></div>
        </form>
      </Modal>
      <Modal isOpen={showRecordModal} className="finance-dialog" onClose={closeRecordModal} title="登记实际到账" maxWidth="md">
        {selectedPlan && <form className="finance-form" onSubmit={recordReceipt}><div className="finance-form-summary"><div>项目/客户：<strong>{selectedPlan.projectName} · {selectedPlan.customerName}</strong></div><div>关联计划：<strong>{selectedPlan.planCode}</strong></div><div>未收余额：<strong>{money(selectedPlan.uncollectedAmount)}</strong></div></div>{selectedPlan.stages?.length ? <><div className="space-y-3"><h4 className="font-semibold text-[var(--text-primary)]">本次到账阶段分配</h4>{selectedPlan.stages.map((stage) => { const remaining = Math.max(0, stage.amount - stage.receivedAmount); return <div key={stage.id} className="finance-form-summary grid grid-cols-[minmax(0,1fr)_150px] items-center gap-3"><div><strong>{stage.phase}</strong><div className="mt-1 text-[var(--text-muted)]">约定 {money(stage.amount)} · 已到账 {money(stage.receivedAmount)} · 未收 {money(remaining)}</div></div><input aria-label={'到账分配-' + stage.phase} type="number" min="0" max={remaining} step="0.01" disabled={remaining <= 0} value={receiptAllocations[stage.id] || ''} onChange={(event) => setReceiptAllocations({ ...receiptAllocations, [stage.id]: event.target.value })} className="finance-input" placeholder="本次到账金额" /></div>; })}</div><div className="finance-form-summary">本次到账金额：<strong aria-label="本次到账金额">{money(receiptAllocationTotal)}</strong></div></> : <div><label>本次到账金额 (元) *</label><input aria-label="本次到账金额" required type="number" min="0.01" max={selectedPlan.uncollectedAmount} step="0.01" value={recordAmount} onChange={(event) => setRecordAmount(event.target.value)} className="finance-input" /></div>}<div><label>到账时间 *</label><input aria-label="到账时间" type="datetime-local" required value={receiptDateTime} onChange={(event) => setReceiptDateTime(event.target.value)} className="finance-input" /></div><div><label>到账方式 *</label><select aria-label="到账方式" value={recordPayMethod} onChange={(event) => setRecordPayMethod(event.target.value)} className="finance-input"><option>银行转账</option><option>商业/银行承兑汇票</option><option>网银转账</option></select></div><div><label>到账备注</label><textarea aria-label="到账备注" value={receiptNote} onChange={(event) => setReceiptNote(event.target.value)} className="finance-input" rows={2} placeholder="填写到账说明（选填）" /></div><AttachmentPicker value={receiptAttachments} onChange={setReceiptAttachments} onError={(message) => { setAttachmentError(message); addToast('error', '附件上传失败', message); }} onSuccess={() => setAttachmentError('')} label="上传到账凭证" />{attachmentError && !showPlanModal && <div role="alert" className="text-xs text-[var(--danger)]">{attachmentError}</div>}<div className="finance-form-footer"><button type="button" onClick={closeRecordModal} className="finance-action">取消</button><button type="submit" className="finance-action finance-action-primary">确认登记到账</button></div></form>}
      </Modal>
      <Drawer isOpen={Boolean(detailPlan)} onClose={() => setDetailPlan(null)} title="应收计划详情" subtitle={detailPlan ? detailPlan.planCode : undefined} width="max-w-4xl" contentClassName="overflow-y-auto"><div className="space-y-4">{detailPlan && <><div className="finance-form-summary grid grid-cols-2 gap-3"><div>计划编号：<strong>{detailPlan.planCode}</strong></div><div>合同名称：<strong>{contractName(detailPlan)}</strong></div><div>项目/客户：<strong>{detailPlan.projectName} · {detailPlan.customerName}</strong></div><div>计划总额：<strong>{money(detailPlan.planAmount)}</strong></div><div>已到账：<strong>{money(detailPlan.receivedAmount)}</strong></div><div>未收余额：<strong>{money(detailPlan.uncollectedAmount)}</strong></div></div>{detailPlan.stages?.length ? <div className="finance-table-scroll"><table className="finance-table"><thead><tr><th>阶段名称</th><th>完成内容</th><th>占比</th><th>约定金额</th><th>已到账</th><th>未收金额</th><th>约定日期</th><th>状态</th></tr></thead><tbody>{detailPlan.stages.map((stage) => <tr key={stage.id}><td>{stage.phase}</td><td>{stage.triggerCondition || '—'}</td><td>{stage.percentage}%</td><td>{money(stage.amount)}</td><td>{money(stage.receivedAmount)}</td><td>{money(Math.max(0, stage.amount - stage.receivedAmount))}</td><td>{stage.dueDate || '—'}</td><td>{stage.receivedAmount >= stage.amount ? '已完成' : stage.receivedAmount > 0 ? '部分到账' : '待到账'}</td></tr>)}</tbody></table></div> : <p className="text-[var(--text-muted)]">该应收计划未关联合同付款阶段。</p>}{detailPlan.note && <p className="whitespace-pre-wrap">计划备注：{detailPlan.note}</p>}<AttachmentList attachments={detailPlan.attachments || []} /></>}</div></Drawer>
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

function AttachmentPicker({ value, onChange, onError, onSuccess, label }: {
  value: AttachmentMetadata[];
  onChange: React.Dispatch<React.SetStateAction<AttachmentMetadata[]>>;
  onError: (message: string) => void;
  onSuccess: () => void;
  label: string;
}) {
  return <div><label>{label}</label><Upload
    accept="image/*,.pdf,application/pdf"
    multiple
    fileList={value.map((attachment) => ({ uid: attachment.id, name: attachment.name, status: 'done' as const, size: attachment.size, type: attachment.mimeType, url: attachment.dataUrl }))}
    beforeUpload={async (file) => {
      const supported = file.type.startsWith('image/') || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!supported) { onError('仅支持图片或 PDF 文件'); return Upload.LIST_IGNORE; }
      if (file.size > 10 * 1024 * 1024) { onError('单个附件不能超过 10 MB'); return Upload.LIST_IGNORE; }
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('文件读取失败，请重新选择'));
          reader.readAsDataURL(file);
        });
        onChange((previous) => [...previous, { id: 'receivable-file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), name: file.name, mimeType: file.type, size: file.size, dataUrl }]);
        onSuccess();
      } catch (error) {
        onError(error instanceof Error ? error.message : '文件读取失败，请重新选择');
      }
      return Upload.LIST_IGNORE;
    }}
    onRemove={(file: UploadFile) => { onChange((previous) => previous.filter((attachment) => attachment.id !== file.uid)); return true; }}
  ><Button icon={<PaperClipOutlined />}>选择附件</Button></Upload></div>;
}

function AttachmentList({ attachments }: { attachments: AttachmentMetadata[] }) {
  if (!attachments.length) return null;
  return <div><h4 className="mb-2 font-medium">附件</h4><ul className="space-y-1">{attachments.map((attachment) => <li key={attachment.id}>{attachment.dataUrl ? <a className="text-[var(--active-text)] hover:underline" href={attachment.dataUrl} target="_blank" rel="noreferrer">{attachment.name}</a> : attachment.name}</li>)}</ul></div>;
}

export default PaymentCollectionManagementView;
