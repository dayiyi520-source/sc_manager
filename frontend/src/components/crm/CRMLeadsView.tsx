import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Filter, Plus, Search, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Lead, LeadStatus } from '../../types';
import { Drawer, Modal, StatCard, StatusTag } from '../common/UIComponents';
import { CRMFollowupTimeline } from './CRMFollowupTimeline';
import { CRMFollowupForm } from './CRMFollowupForm';

const LEAD_TABS: Array<{ key: LeadStatus | 'all'; label: string }> = [
  { key: '待确认', label: '待确认线索' },
  { key: '跟进中', label: '跟进中线索' },
  { key: '转商机', label: '已转商机线索' },
  { key: '已废弃', label: '已废弃线索' },
  { key: 'all', label: '全部线索' }
];

export const resolveLeadInitialTab = (items: Pick<Lead, 'status'>[]): LeadStatus | 'all' =>
  items.some((item) => item.status === '待确认') ? '待确认' : items.some((item) => item.status === '跟进中') ? '跟进中' : 'all';

export const CRMLeadsView: React.FC = () => {
  const {
    leads,
    customers,
    productLines,
    addLead,
    updateLead,
    convertLeadToOpportunity,
    openPageTab,
    addToast,
    crmLoading,
    followUps,
    addFollowUp
  } = useApp();
  const [activeTab, setActiveTab] = useState<LeadStatus | 'all'>('跟进中');
  const hasUserSelectedTab = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [formName, setFormName] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSource, setFormSource] = useState<Lead['source']>('市场活动');
  const [formProducts, setFormProducts] = useState<string[]>([]);
  const [conversionAmount, setConversionAmount] = useState(0);
  const [followupOpen, setFollowupOpen] = useState(false);

  useEffect(() => {
    if (crmLoading || hasUserSelectedTab.current || !leads.length) return;
    setActiveTab(resolveLeadInitialTab(leads));
  }, [crmLoading, leads]);

  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const matchesTab = activeTab === 'all' || lead.status === activeTab;
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || [lead.name, lead.customerName, lead.ownerName, lead.schoolContact].some((value) => value.toLowerCase().includes(query));
    return matchesTab && matchesQuery;
  }), [activeTab, leads, searchQuery]);

  const openAddModal = () => {
    setFormName('');
    setFormCustomerId(customers[0]?.id || '');
    setFormContact(customers[0]?.contactName || '');
    setFormPhone(customers[0]?.contactPhone || '');
    setFormSource('市场活动');
    setFormProducts(productLines[0]?.name ? [productLines[0].name] : []);
    setIsModalOpen(true);
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((item) => item.id === customerId);
    setFormCustomerId(customerId);
    setFormContact(customer?.contactName || '');
    setFormPhone(customer?.contactPhone || '');
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formName.trim() || !formCustomerId || !formContact.trim() || formProducts.length === 0) {
      addToast('warning', '请补齐线索名称、客户、联系人和意向产品');
      return;
    }
    addLead({ name: formName.trim(), customerId: formCustomerId, schoolContact: formContact.trim(), contactPhone: formPhone.trim(), source: formSource, products: formProducts });
    setIsModalOpen(false);
  };

  const handleConvert = () => {
    if (!convertingLead) return;
    convertLeadToOpportunity(convertingLead.id, { amount: Number(conversionAmount) });
    setConvertingLead(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="待确认线索" value={leads.filter((lead) => lead.status === '待确认').length} unit="条" subText="待首次联系" icon={<Filter className="w-5 h-5" />} />
        <StatCard title="已转商机" value={leads.filter((lead) => lead.status === '转商机').length} unit="条" subText="已进入商机漏斗" icon={<ArrowRight className="w-5 h-5" />} iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50" />
        <StatCard title="线索转化率" value={`${leads.length ? Math.round((leads.filter((lead) => lead.status === '转商机').length / leads.length) * 100) : 0}`} unit="%" subText="按当前线索统计" icon={<UserRound className="w-5 h-5" />} />
      </div>

      <div className="dark-panel rounded-lg p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            {LEAD_TABS.map((tab) => (
              <button key={tab.key} type="button" onClick={() => { hasUserSelectedTab.current = true; setActiveTab(tab.key); }} className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${activeTab === tab.key ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'}`}>
                {tab.label}
                <span className="ml-1.5 font-mono">{tab.key === 'all' ? leads.length : leads.filter((lead) => lead.status === tab.key).length}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜索线索、客户或联系人" className="pl-8 pr-3 py-1.5 rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] text-xs text-[var(--text-primary)]" />
            </div>
            <button type="button" onClick={openAddModal} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--primary)] text-white text-xs font-semibold"><Plus className="w-3.5 h-3.5" />新增线索</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="border-b border-[var(--border-main)] text-[var(--text-muted)]"><th className="py-3 px-3">线索名称</th><th className="py-3 px-3">学校/客户</th><th className="py-3 px-3">联系人</th><th className="py-3 px-3">意向产品</th><th className="py-3 px-3">负责人</th><th className="py-3 px-3">来源</th><th className="py-3 px-3">状态</th><th className="py-3 px-3 text-right">操作</th></tr></thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[var(--bg-elevated)]">
                  <td className="py-3 px-3 font-medium text-[var(--text-primary)]">{lead.name}<div className="text-[11px] text-[var(--text-muted)] mt-0.5">{lead.createdAt}</div></td>
                  <td className="py-3 px-3 text-[var(--text-body)]">{lead.customerName}</td>
                  <td className="py-3 px-3 text-[var(--text-body)]">{lead.schoolContact}<div className="text-[11px] text-[var(--text-muted)]">{lead.contactPhone || '未填写联系方式'}</div></td>
                  <td className="py-3 px-3 text-[var(--text-body)]">{lead.products.join('、') || '待补充'}</td>
                  <td className="py-3 px-3 text-[var(--text-muted)]">{lead.ownerName}</td>
                  <td className="py-3 px-3 text-[var(--text-muted)]">{lead.source}</td>
                  <td className="py-3 px-3"><StatusTag status={lead.status} /></td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setSelectedLead(lead)} className="text-[var(--active-text)]">详情</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[var(--text-muted)]">暂无符合条件的线索</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="新增市场线索">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <label className="block space-y-1"><span className="text-[var(--text-muted)]">线索名称 *</span><input value={formName} onChange={(event) => setFormName(event.target.value)} className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)]" /></label>
          <label className="block space-y-1"><span className="text-[var(--text-muted)]">学校/客户 *</span><select value={formCustomerId} onChange={(event) => handleCustomerChange(event.target.value)} className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)]"><option value="">请选择客户</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="space-y-1"><span className="text-[var(--text-muted)]">学校联系人 *</span><input value={formContact} onChange={(event) => setFormContact(event.target.value)} className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)]" /></label><label className="space-y-1"><span className="text-[var(--text-muted)]">联系方式</span><input value={formPhone} onChange={(event) => setFormPhone(event.target.value)} className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)]" /></label></div>
          <label className="block space-y-1"><span className="text-[var(--text-muted)]">线索来源</span><select value={formSource} onChange={(event) => setFormSource(event.target.value as Lead['source'])} className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)]">{(['市场活动', '官网引流', '客户转介绍', '二次复购'] as Lead['source'][]).map((source) => <option key={source}>{source}</option>)}</select></label>
          <fieldset><legend className="text-[var(--text-muted)] mb-1">意向产品 *</legend><div className="grid grid-cols-2 gap-2">{productLines.map((product) => <label key={product.id} className="flex items-center gap-2 text-[var(--text-body)]"><input type="checkbox" checked={formProducts.includes(product.name)} onChange={(event) => setFormProducts((prev) => event.target.checked ? [...prev, product.name] : prev.filter((name) => name !== product.name))} />{product.name}</label>)}</div></fieldset>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 rounded-md border border-[var(--border-main)] text-[var(--text-body)]">取消</button><button type="submit" className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-white font-semibold">保存线索</button></div>
        </form>
      </Modal>

      <Modal isOpen={!!convertingLead} onClose={() => setConvertingLead(null)} title="转为商机">
        <div className="space-y-4 text-xs"><p className="text-[var(--text-body)]">将线索“{convertingLead?.name}”转为商机，客户和意向产品会自动带入。</p><label className="block space-y-1"><span className="text-[var(--text-muted)]">预计金额（元）</span><input type="number" min={0} value={conversionAmount} onChange={(event) => setConversionAmount(Number(event.target.value))} className="w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-main)] p-2 text-[var(--text-primary)]" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setConvertingLead(null)} className="px-3 py-1.5 rounded-md border border-[var(--border-main)] text-[var(--text-body)]">取消</button><button type="button" onClick={handleConvert} className="px-3 py-1.5 rounded-md bg-[var(--primary)] text-white font-semibold">确认转商机</button></div></div>
      </Modal>

      {selectedLead && <Drawer isOpen={Boolean(selectedLead)} onClose={() => setSelectedLead(null)} title="线索详情与历程" width="max-w-4xl">
        <div className="space-y-5 text-xs">
          <section className="rounded-2xl border border-slate-700 bg-[var(--bg-surface-soft)] p-6">
            <div className="flex items-start justify-between border-b border-slate-700 pb-5"><h2 className="text-2xl font-semibold text-[var(--text-primary)]">{selectedLead.name}</h2><StatusTag status={selectedLead.status === '待确认' ? '待确认' : selectedLead.status === '已废弃' ? '已废弃' : selectedLead.status === '转商机' ? '转商机' : '跟进中'} /></div>
            <div className="mt-6 grid grid-cols-2 gap-x-10 gap-y-5 text-base"><div><span className="text-slate-400">学校名称：</span><span className="text-slate-100">{selectedLead.customerName}</span></div><div><span className="text-slate-400">联系人：</span><span className="text-slate-100">{selectedLead.schoolContact} ({selectedLead.contactPhone || '未填写'})</span></div><div><span className="text-slate-400">所属部门：</span><span className="text-slate-100">{selectedLead.department}</span></div><div><span className="text-slate-400">客户经理：</span><span className="text-slate-100">{selectedLead.ownerName}</span></div><div><span className="text-slate-400">意向产品：</span><span className="text-slate-100">{selectedLead.products.join('、') || '待补充'}</span></div><div><span className="text-slate-400">线索来源：</span><span className="text-slate-100">{selectedLead.source}</span></div></div>
          </section>
          <div className="flex items-center justify-between"><h3 className="text-xl font-semibold text-[var(--text-primary)]">跟进记录</h3><div className="flex gap-3"><button type="button" onClick={() => setFollowupOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">添加跟进</button><button type="button" onClick={() => { setConvertingLead(selectedLead); setConversionAmount(0); }} disabled={selectedLead.status === '转商机' || selectedLead.status === '已废弃'} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm text-emerald-400">转商机</button><button type="button" onClick={() => { updateLead(selectedLead.id, { status: '已废弃' }); setSelectedLead({ ...selectedLead, status: '已废弃' }); }} disabled={selectedLead.status === '转商机' || selectedLead.status === '已废弃'} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300">转为废弃</button></div></div>
          <CRMFollowupTimeline records={followUps.filter((item) => item.customerId === selectedLead.customerId && (!item.opportunityId || item.opportunityId === selectedLead.convertedOpportunityId))} />
        </div>
      </Drawer>}
      {selectedLead && <Modal isOpen={followupOpen} onClose={() => setFollowupOpen(false)} title="添加跟进记录"><CRMFollowupForm formId="lead-followup-form" customers={customers} opportunities={[]} initialCustomer={customers.find((item) => item.id === selectedLead.customerId)} onSubmit={(value) => { addFollowUp({ ...value, customerId: selectedLead.customerId, customerName: selectedLead.customerName }); updateLead(selectedLead.id, { status: '跟进中', latestFollowUpAt: value.followTime }); setFollowupOpen(false); setSelectedLead({ ...selectedLead, status: '跟进中', latestFollowUpAt: value.followTime }); }} /><div className="mt-3 flex justify-end"><button type="submit" form="lead-followup-form" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">保存跟进</button></div></Modal>}
    </div>
  );
};
