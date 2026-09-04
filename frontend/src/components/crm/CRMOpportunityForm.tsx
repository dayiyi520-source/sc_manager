import React, { useState } from 'react';
import { Customer, Opportunity } from '../../types';

interface Props {
  customers: Customer[];
  initialCustomer?: Customer | null;
  onSubmit: (value: Omit<Opportunity, 'id'>) => void;
  onCancel?: () => void;
  formId?: string;
}

export const CRMOpportunityForm: React.FC<Props> = ({ customers, initialCustomer, onSubmit, formId }) => {
  const [name, setName] = useState('');
  const [customerName, setCustomerName] = useState(initialCustomer?.name || customers[0]?.name || '');
  const [type, setType] = useState<Opportunity['type']>('定制研发');
  const [relatedProduct, setRelatedProduct] = useState('数字化协同管理中枢 V4.2');
  const [isTrial, setIsTrial] = useState(false);
  const [deadline, setDeadline] = useState('2026-10-31');
  const [amount, setAmount] = useState(2600000);
  const [ownerName, setOwnerName] = useState('周销售');
  const [collaborators, setCollaborators] = useState('李工, 王经理');
  const [source, setSource] = useState('主动开发');
  const [probability, setProbability] = useState(60);
  const [remarks, setRemarks] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const customer = initialCustomer || customers.find((item) => item.name === customerName);
    if (!name.trim() || !customer) return;
    onSubmit({ name, customerId: customer.id, customerName: customer.name, type, relatedProduct, isTrial, deadline, stage: '需求确认', amount: Number(amount), ownerName, collaborators: collaborators.split(',').map((item) => item.trim()).filter(Boolean), source, probability: Number(probability), winRate: Number(probability), remarks, createdAt: new Date().toISOString().split('T')[0] });
  };

  const inputClass = 'w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white';
  return <form id={formId} onSubmit={submit} className="space-y-4 text-xs">
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2"><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">商机项目名称 *</label><input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="例如：国家电网数智调度协同平台定制采购" /></div>
      <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">关联客户 *</label>{initialCustomer ? <input readOnly value={customerName} className={inputClass} /> : <select value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass}>{customers.map((c) => <option key={c.id}>{c.name}</option>)}</select>}</div>
      <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">商机类型</label><select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}><option>标准产品</option><option>定制研发</option><option>信创适配</option><option>运维服务</option></select></div>
      <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">关联核心产品</label><input value={relatedProduct} onChange={(e) => setRelatedProduct(e.target.value)} className={inputClass} /></div>
      <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">预计商机金额 (元) *</label><input required type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputClass} /></div>
      <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">投标/结单截止日期</label><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} /></div>
      <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">赢单率预估 (%)</label><input type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(Number(e.target.value))} className={inputClass} /></div>
      <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">负责人</label><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} /></div>
      <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">协作人 (逗号分隔)</label><input value={collaborators} onChange={(e) => setCollaborators(e.target.value)} className={inputClass} /></div>
      <div><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">商机来源</label><select value={source} onChange={(e) => setSource(e.target.value)} className={inputClass}><option>主动开发</option><option>代理商</option><option>官方媒介</option><option>客户转介</option><option>标讯推送</option></select></div>
      <label className="flex items-center gap-2 pt-6 font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} />是否处于客户试用/POC阶段</label>
      <div className="col-span-2"><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">商机备注 / 决策关键点</label><textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass} /></div>
    </div>
  </form>;
};
