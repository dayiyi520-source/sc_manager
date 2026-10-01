import React, { useState } from 'react';
import {
  Users,
  Plus,
  Building,
  Briefcase,
  Edit,
  Layers,
  Sparkles,
  CheckCircle2,
  FileCheck,
  Paperclip,
  Upload,
  ArrowRight
} from '@/components/common/octicons-compat';
import { StatCard, StatusTag, Drawer, Modal, FormField, FORM_CONTROL_CLASS } from '../common/UIComponents';
import { Customer } from '../../types';
import { CRMFollowupForm } from './CRMFollowupForm';
import { Pagination } from '../common/Pagination';
import { DataTable } from '../common/DataTable';
import { CRMCustomerInfoCard } from './CRMCustomerInfoCard';
import { CRMDetailTabs } from './CRMDetailTabs';
import { CRMDetailActions } from './CRMDetailActions';
import { CRMDetailLayout } from './CRMDetailLayout';
import { ListToolbar } from '../common/ListToolbar';
import { useAppCrm } from '../../hooks/useAppCrm';

const CUSTOMER_TYPES = ['高校', '教育主管单位', '其他'] as const;
const normalizeCustomerType = (value?: string) => CUSTOMER_TYPES.includes(value as (typeof CUSTOMER_TYPES)[number]) ? value || '其他' : '其他';
const EmptyContent: React.FC = () => <div className="rounded-lg border border-dashed border-[var(--border-main)] px-4 py-8 text-center text-xs text-[var(--text-muted)]">暂无</div>;

export const CRMCustomersView: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomer,
    opportunities,
    leads,
    followUps,
    addFollowUp,
    contracts,
    biddings,
    requirementTasks,
    openPageTab,
    selectedCustomerIdForDetail,
    setSelectedCustomerIdForDetail,
    addToast
  } = useAppCrm();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Customer workspace detail tabs: 基本信息 | 客户商机 | 跟进旅程 | 客户项目 | 需求与协助
  const [detailTab, setDetailTab] = useState<'profile' | 'leads' | 'opps' | 'followups' | 'projects' | 'demands'>('profile');

  // Add / Edit Customer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<Customer['type'] | ''>('');
  const [formLevel, setFormLevel] = useState<Customer['level'] | ''>('');
  const [formIndustry, setFormIndustry] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formContactTitle, setFormContactTitle] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formSchoolLevel, setFormSchoolLevel] = useState('');
  const [formSchoolNature, setFormSchoolNature] = useState('');
  const [formSchoolType, setFormSchoolType] = useState('');
  const [formOwnership, setFormOwnership] = useState<Customer['ownership'] | ''>('');
  const [formRegion, setFormRegion] = useState('');
  const [formSource, setFormSource] = useState<Customer['source'] | ''>('');
  const [formAnnualBudget, setFormAnnualBudget] = useState<number | ''>('');
  const [formTags, setFormTags] = useState('');

  // Sub Modals inside Drawer

  const [isAddFollowupModalOpen, setIsAddFollowupModalOpen] = useState(false);


  // Active customer for the workspace detail page
  const activeCustomer = customers.find((c) => c.id === selectedCustomerIdForDetail) || null;

  React.useEffect(() => () => setSelectedCustomerIdForDetail(null), [setSelectedCustomerIdForDetail]);

  const openCustomerDetail = (customerId: string) => {
    setDetailTab('profile');
    setSelectedCustomerIdForDetail(customerId);
  };

  const customerOpportunities = activeCustomer
    ? opportunities.filter((item) => item.customerId === activeCustomer.id)
    : [];
  const customerLeads = activeCustomer
    ? leads.filter((item) => item.customerId === activeCustomer.id)
    : [];
  const customerFollowups = activeCustomer
    ? followUps.filter((item) => item.customerId === activeCustomer.id)
    : [];
  const customerContracts = activeCustomer
    ? contracts.filter((item) => item.customerId === activeCustomer.id)
    : [];
  const customerBiddingProjects = activeCustomer
    ? biddings.filter((item) => item.customerId === activeCustomer.id)
    : [];

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormCode('');
    setFormType('');
    setFormLevel('');
    setFormIndustry('');
    setFormContactName('');
    setFormContactTitle('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormSchoolLevel('');
    setFormSchoolNature('');
    setFormSchoolType('');
    setFormOwnership('');
    setFormRegion('');
    setFormSource('');
    setFormAnnualBudget('');
    setFormTags('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCustomer(c);
    setFormName(c.name);
    setFormCode(c.code);
    setFormType(normalizeCustomerType(c.type));
    setFormLevel(c.level || '');
    setFormIndustry(c.industry || '');
    setFormContactName(c.contactName);
    setFormContactTitle(c.contactTitle || '');
    setFormPhone(c.contactPhone);
    setFormEmail(c.contactEmail || '');
    setFormAddress(c.address);
    setFormSchoolLevel(c.schoolLevel || '');
    setFormSchoolNature(c.schoolNature || '');
    setFormSchoolType(c.schoolType || '');
    setFormOwnership(c.ownership || '');
    setFormRegion(c.region || '');
    setFormSource(c.source || '');
    setFormAnnualBudget(c.annualBudget ?? '');
    setFormTags(c.tags ? c.tags.join(', ') : '');
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formType || !formContactName.trim()) {
      addToast('warning', '请填写客户名称、客户类型与核心联系人');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name: formName,
        code: formCode || undefined,
        type: formType,
        level: formLevel || undefined,
        industry: formIndustry,
        contactName: formContactName,
        contactTitle: formContactTitle,
        contactPhone: formPhone,
        contactEmail: formEmail,
        address: formAddress,
        schoolLevel: formSchoolLevel,
        schoolNature: formSchoolNature,
        schoolType: formSchoolType,
        ownership: formOwnership || undefined,
        region: formRegion,
        source: formSource || undefined,
        annualBudget: formAnnualBudget === '' ? undefined : Number(formAnnualBudget),
        tags: formTags ? formTags.split(',').map((t) => t.trim()).filter(Boolean) : []
      });
      addToast('success', '客户档案更新成功');
    } else {
      addCustomer({
        name: formName,
        code: formCode || undefined,
        type: formType,
        level: formLevel || undefined,
        industry: formIndustry,
        contactName: formContactName,
        contactTitle: formContactTitle,
        contactPhone: formPhone,
        contactEmail: formEmail,
        address: formAddress,
        schoolLevel: formSchoolLevel,
        schoolNature: formSchoolNature,
        schoolType: formSchoolType,
        ownership: formOwnership || undefined,
        region: formRegion,
        source: formSource || undefined,
        annualBudget: formAnnualBudget === '' ? undefined : Number(formAnnualBudget),
        tags: formTags ? formTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        createdAt: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(false);
  };


  const filteredCustomers = customers.filter((c) => {
    const matchQuery =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || normalizeCustomerType(c.type) === typeFilter;
    const matchLevel = levelFilter === 'all' || c.level === levelFilter;
    return matchQuery && matchType && matchLevel;
  });
  const pagedCustomers = filteredCustomers.slice((page - 1) * pageSize, page * pageSize);
  React.useEffect(() => setPage(1), [searchQuery, typeFilter, levelFilter, pageSize]);

  // 5 Stats: 全部客户、代理商客户、进行中项目、待转化项目、本月新增
  const totalCustomersCount = customers.length;
  const keyCustomersCount = customers.filter((c) => c.source === '代理商').length;
  const inProgressProjectsCount = customers.reduce((acc, c) => acc + (c.activeProjectsCount || 1), 0);
  const pendingConvertCount = opportunities.filter((o) => o.stage !== '签约赢单' && o.stage !== '中标赢单').length;
  const newThisMonthCount = 4;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className={activeCustomer ? 'hidden' : 'space-y-6'}>
      {/* 5 Core Top Metrics: 全部客户、代理商客户、进行中项目、待转化项目、本月新增 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          id="stat-cust-total"
          title="全部客户"
          value={totalCustomersCount}
          unit="家"
          change="+2家本月"
          isPositive={true}
          subText="建档覆盖率 100%"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          id="stat-cust-key"
          title="代理商客户"
          value={keyCustomersCount}
          unit="家"
          change="来源为代理商"
          isPositive={true}
          subText="代理商来源客户"
          icon={<Building className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
        />
        <StatCard
          id="stat-cust-projects"
          title="进行中项目"
          value={inProgressProjectsCount}
          unit="个"
          change="交付阶段"
          isPositive={true}
          subText="履约进度稳定"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          onClick={() => openPageTab('proj_list')}
        />
        <StatCard
          id="stat-cust-pending-opps"
          title="待转化项目"
          value={pendingConvertCount}
          unit="个"
          change="跟进商机"
          isPositive={true}
          subText="预计金额 ¥1,443万"
          icon={<Briefcase className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          onClick={() => openPageTab('crm_opportunities')}
        />
        <StatCard
          id="stat-cust-new-month"
          title="本月新增"
          value={newThisMonthCount}
          unit="家"
          change="+25% 环比"
          isPositive={true}
          subText="新签标杆战略合作"
          icon={<Sparkles className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
      </div>

      <ListToolbar searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="搜索客户名称、编号、联系人、行业..." filters={<>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有客户类型</option>
            {CUSTOMER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有客户等级</option>
            <option value="S级-战略">S级-战略客户</option>
            <option value="A级-重点">A级-重点客户</option>
            <option value="B级-标准">B级-标准客户</option>
            <option value="C级-培育">C级-培育客户</option>
          </select>
        </>} actions={<>
          <button
            onClick={() => addToast('info', '导入模板已就绪', '支持Excel/CSV格式批量导入客户名录')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            导入客户
          </button>
          <button
            id="btn-add-customer"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            新增客户
          </button>
        </>} />

      {/* Customer List Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <DataTable>
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="py-3 px-4">客户名称</th>
                <th className="py-3 px-4">类型</th>
                <th className="py-3 px-4">客户等级</th>
                <th className="py-3 px-4">联系人</th>
                <th className="py-3 px-4">进行中项目</th>
                <th className="py-3 px-4">潜在商机</th>
                <th className="py-3 px-4">客户来源</th>
                <th className="py-3 px-4">最近跟进</th>
                <th className="py-3 px-4">标签</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedCustomers.map((c) => (
                <tr key={c.id}>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-500 shrink-0" />
                      <button
                        type="button"
                        onClick={() => openCustomerDetail(c.id)}
                        className="text-left hover:text-blue-600 focus-visible:text-blue-600 transition-colors"
                      >
                        {c.name}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {normalizeCustomerType(c.type)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={c.level} />
                  </td>
                  <td className="py-3.5 px-4">
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">{c.contactName}</div>
                      <div className="text-[10px] text-slate-400">{c.contactTitle} · {c.contactPhone}</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-blue-600">
                    {c.activeProjectsCount || 1} 个
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-amber-600">
                    {c.potentialOppsCount || 1} 笔
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {c.source || '主动开发'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{c.lastFollowUp || '今日'}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags?.length ? c.tags.slice(0, 2).map((t, index) => (
                        <span key={t} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${['bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'][index % 2]}`}>
                          {t}
                        </span>
                      )) : <span className="text-slate-400">无</span>}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openCustomerDetail(c.id)}
                        className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                      >
                        详情 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
        </DataTable>
        <Pagination total={filteredCustomers.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
      </div>

      {/* Customer detail workspace: 5 top-level tabs */}
      {activeCustomer && (
        <CRMDetailLayout title={activeCustomer.name} subtitle={`客户编码：${activeCustomer.code} · ${activeCustomer.level} · ${activeCustomer.industry}`} onBack={() => setSelectedCustomerIdForDetail(null)} backLabel="返回客户列表" actions={<CRMDetailActions><button type="button" onClick={() => openEditModal(activeCustomer)} className="rounded-md border border-[var(--border-main)] px-3 py-1.5 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--active-text)]">编辑档案</button></CRMDetailActions>} tabs={<CRMDetailTabs tabs={[{ key: 'profile', label: '基本信息' }, { key: 'opps', label: `客户商机 (${customerOpportunities.length})` }, { key: 'leads', label: `客户线索 (${customerLeads.length})` }, { key: 'followups', label: '跟进旅程' }, { key: 'projects', label: '客户项目' }, { key: 'demands', label: '需求与协助' }]} activeKey={detailTab} onChange={setDetailTab} />}>

            {/* Tab 1: 基本信息 */}
            {detailTab === 'profile' && (
              <div className="space-y-4">
                <CRMCustomerInfoCard customer={activeCustomer} />
              </div>
            )}

            {/* Tab 2: 客户商机 (商机统计、商机信息、操作) */}
            {detailTab === 'opps' && (
              <div className="space-y-4">
                {/* 商机统计: 总数、待跟进、已转化 */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-center">
                    <span className="text-slate-400 text-[11px]">商机总数</span>
                    <div className="font-bold text-slate-800 dark:text-white text-base mt-0.5">
                      {customerOpportunities.length} 个
                    </div>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-center">
                    <span className="text-amber-600 dark:text-amber-400 text-[11px]">待跟进商机</span>
                    <div className="font-bold text-amber-600 dark:text-amber-400 text-base mt-0.5">
                      {customerOpportunities.filter((o) => o.stage !== '签约赢单').length} 个
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-center">
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">已转化成交</span>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5">
                      {customerOpportunities.filter((o) => o.stage === '签约赢单').length} 个
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">商机列表清单</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { addToast('info', '商机必须从线索转化', '请先在线索管理中创建并转化该客户的线索'); openPageTab('crm_leads'); }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                    >
                      + 商机登记
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {customerOpportunities.length === 0 ? <EmptyContent /> : customerOpportunities.map((opp) => (
                      <div
                        key={opp.id}
                        className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{opp.name}</span>
                          <StatusTag status={opp.stage} />
                        </div>
                        <p className="text-slate-500 text-[11px]">{opp.remarks || '重点跟进商机'}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>登记人：{opp.ownerName}</span>
                          <span>预计金额：<strong className="text-blue-600 font-mono">¥{(opp.amount / 10000).toFixed(0)}万</strong></span>
                          <span>商机来源：{opp.source}</span>
                          <span>登记时间：{opp.createdAt}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {detailTab === 'leads' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">客户线索</span>
                  <button type="button" onClick={() => openPageTab('crm_leads')} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium">进入线索管理</button>
                </div>
                {customerLeads.length === 0 ? (
                  <EmptyContent />
                ) : customerLeads.map((lead) => (
                  <div key={lead.id} className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
                    <div className="flex items-center justify-between"><span className="font-bold text-slate-900 dark:text-white">{lead.name}</span><StatusTag status={lead.status} /></div>
                    <div className="mt-2 text-[11px] text-slate-500">联系人：{lead.schoolContact} · 负责人：{lead.ownerName}</div>
                    <div className="mt-1 text-[11px] text-slate-400">意向产品：{lead.products.join('、') || '待补充'} · 创建于 {lead.createdAt}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: 跟进进度 (时间线) */}
            {detailTab === 'followups' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">客户日常跟进动态</span>
                  <button
                    onClick={() => setIsAddFollowupModalOpen(true)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                  >
                    + 跟进登记
                  </button>
                </div>

                <div className="space-y-3 relative pl-4 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
                  {customerFollowups.length === 0 ? <EmptyContent /> : customerFollowups.map((f) => (
                      <div key={f.id} className="relative space-y-1">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white dark:ring-slate-900" />
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {f.method || '日常跟进'} · {f.date}
                          </span>
                          <span className="text-blue-600">跟进人: {f.creator || '周销售'}</span>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-slate-700 dark:text-slate-300">
                          {f.content}
                        </div>
                        {f.attachments?.length ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Paperclip className="w-3.5 h-3.5" />
                            补充附件 {f.attachments.length} 个
                          </div>
                        ) : null}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Tab 4: 客户项目 (已购项目 + 商机招标) */}
            {detailTab === 'projects' && (
              <div className="space-y-5">
                {/* 已购项目 */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    已购履约项目
                  </h4>
                  {customerContracts.length === 0 ? <EmptyContent /> : customerContracts.map((c) => (
                      <div key={c.id} className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                          <StatusTag status={c.status} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500">
                          <div>项目编号: <span className="font-mono text-slate-700 dark:text-slate-300">{c.code}</span></div>
                          <div>合同金额: <span className="font-semibold text-emerald-600">¥{(c.amount / 10000).toFixed(0)}万</span></div>
                          <div>合同类型: {c.type}</div>
                          <div>交付负责人: 李工 (架构师)</div>
                          <div>上线时间: 2026-06-30</div>
                          <div>关联产品: {c.relatedProduct}</div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* 试用中项目：没有数据时不展示空区块 */}
                {customerBiddingProjects.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-blue-500" />
                      试用中项目
                    </h4>
                    {customerBiddingProjects.map((b) => (
                      <div key={b.id} className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{b.projectName}</span>
                          <StatusTag status={b.status} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500">
                          <div>招标时间: {b.publishDate || '2026-08-01'}</div>
                          <div>投标截止: {b.deadline}</div>
                          <div>投标金额: ¥{((b.bidAmount || 4800000) / 10000).toFixed(0)}万</div>
                          <div>负责人: {b.commercialLeader}</div>
                          <div>相关文件: 招标文件、投标文件.pdf</div>
                          <div>当前结果: <strong className="text-emerald-600">{b.result}</strong></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 5: 需求与协助 (需求标题、所属项目、关联产品、优先级、当前状态、负责人、预计版本、预计解决时间; 操作: 登记需求，跳转至需求池) */}
            {detailTab === 'demands' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">客户专属需求与协助事项</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedCustomerIdForDetail(null);
                        openPageTab('wb_work_order');
                      }}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                    >
                      + 登记需求
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {requirementTasks.filter((r) => !r.customerId || r.customerId === activeCustomer.id).length === 0 ? <EmptyContent /> : requirementTasks
                    .filter((r) => !r.customerId || r.customerId === activeCustomer.id)
                    .slice(0, 3)
                    .map((r) => (
                      <div key={r.id} className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusTag status={r.priority} />
                            <span className="font-bold text-slate-900 dark:text-white">{r.title}</span>
                          </div>
                          <StatusTag status={r.status} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500">
                          <div>所属项目: {activeCustomer.name}定制中枢</div>
                          <div>关联产品: {r.productLineName}</div>
                          <div>负责人: {r.ownerName}</div>
                          <div>预计版本: {r.versionName}</div>
                          <div>预计解决: {r.dueDate}</div>
                          <div>工时评估: {r.estimatedHours}小时</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
        </CRMDetailLayout>
      )}

      {/* Add / Edit Customer Drawer */}
      <Drawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? '编辑客户主体档案' : '新建客户主体档案'}
        width="max-w-xl"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveCustomer}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存档案
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="客户名称" required className="col-span-2">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：国家电网华东分部数智调度中心"
                className={FORM_CONTROL_CLASS}
                required
              />
            </FormField>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                客户类型 *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">请选择客户类型</option>
                {CUSTOMER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                客户等级 *
              </label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">请选择客户等级</option>
                <option value="S级-战略">S级-战略客户</option>
                <option value="A级-重点">A级-重点客户</option>
                <option value="B级-标准">B级-标准客户</option>
                <option value="C级-培育">C级-培育客户</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                核心联系人姓名 *
              </label>
              <input
                type="text"
                value={formContactName}
                onChange={(e) => setFormContactName(e.target.value)}
                placeholder="例如：张总"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                职务头衔
              </label>
              <input
                type="text"
                value={formContactTitle}
                onChange={(e) => setFormContactTitle(e.target.value)}
                placeholder="例如：信息化部总经理"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                联系电话
              </label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="例如：13800138000"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                客户来源渠道
              </label>
              <select
                value={formSource}
                onChange={(e) => setFormSource(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">请选择来源渠道</option>
                <option value="主动开发">主动开发</option>
                <option value="代理商">代理商</option>
                <option value="官方媒介">官方媒介</option>
                <option value="客户转介">客户转介</option>
                <option value="行业展会">行业展会</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                客户标签 (逗号分隔)
              </label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="例如：重点客户, 信创示范, 国产化改造"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                注册及办公地址
              </label>
              <input
                type="text"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="例如：上海市浦东新区张江高科园区"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div className="col-span-2 border-t border-[var(--border-main)] pt-4">
              <div className="text-xs font-semibold text-[var(--text-primary)] mb-3">学校主数据画像（本地维护）</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1"><span className="text-[var(--text-muted)]">办学层次</span><select value={formSchoolLevel} onChange={(e) => setFormSchoolLevel(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"><option value="">未设置</option><option>本科</option><option>专科</option><option>中职</option><option>基础教育</option></select></label>
                <label className="space-y-1"><span className="text-[var(--text-muted)]">性质类别</span><select value={formSchoolNature} onChange={(e) => setFormSchoolNature(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"><option value="">未设置</option><option>综合类</option><option>理工类</option><option>师范类</option><option>职业教育</option></select></label>
                <label className="space-y-1"><span className="text-[var(--text-muted)]">办学类型</span><select value={formSchoolType} onChange={(e) => setFormSchoolType(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"><option value="">未设置</option><option>普通高等学校</option><option>高等职业院校</option><option>中等职业学校</option><option>基础教育学校</option></select></label>
                <label className="space-y-1"><span className="text-[var(--text-muted)]">公民办</span><select value={formOwnership} onChange={(e) => setFormOwnership(e.target.value as Customer['ownership'])} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"><option value="">请选择办学性质</option><option>公办</option><option>民办</option></select></label>
                <label className="col-span-2 space-y-1"><span className="text-[var(--text-muted)]">所属大区</span><select value={formRegion} onChange={(e) => setFormRegion(e.target.value)} className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"><option value="">未设置</option><option>华东</option><option>华南</option><option>华北</option><option>西南</option><option>西北</option><option>东北</option></select></label>
              </div>
            </div>
          </div>
        </form>
      </Drawer>

      {/* Sub Modal: 跟进登记 */}
      <Modal
        isOpen={isAddFollowupModalOpen}
        onClose={() => setIsAddFollowupModalOpen(false)}
        title="录入客户跟进动态"
        footer={
          <>
            <button
              onClick={() => setIsAddFollowupModalOpen(false)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded text-xs"
            >
              取消
            </button>
            <button type="submit" form="customer-followup-form"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
            >
              提交跟进
            </button>
          </>
        }
      >
        <CRMFollowupForm formId="customer-followup-form" customers={customers} opportunities={opportunities} initialCustomer={activeCustomer} onSubmit={(value) => { addFollowUp(value); setIsAddFollowupModalOpen(false); addToast('success', '跟进登记成功'); }} />
      </Modal>

    </div>
  );
};
