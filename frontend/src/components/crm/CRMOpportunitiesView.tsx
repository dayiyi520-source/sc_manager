import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Filter,
  Plus,
  Building,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Award,
  Edit,
  UserCheck,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  FileCheck,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { Opportunity } from '../../types';
import { CRMDetailInfoCard } from './CRMDetailInfoCard';
import { CRMFollowupTimeline } from './CRMFollowupTimeline';
import { CRMFollowupForm } from './CRMFollowupForm';

export const CRMOpportunitiesView: React.FC = () => {
  const {
    opportunities,
    addOpportunity,
    updateOpportunity,
    advanceOpportunityStage,
    customers,
    selectedOpportunityIdForDetail,
    setSelectedOpportunityIdForDetail,
    openPageTab,
    addToast
    ,followUps,
    addFollowUp
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [stageFollowupOpen, setStageFollowupOpen] = useState(false);
  const [oppDetailTab, setOppDetailTab] = useState<'journey' | 'collab'>('journey');

  // Form Fields: 商机名称、客户、商机类型、关联产品、是否试用、投标截止日期、商机金额、负责人、协作人、商机来源、赢单率、商机备注
  const [formName, setFormName] = useState('');
  const [formCustomerName, setFormCustomerName] = useState(customers[0]?.name || '国家电网华东分部数智调度中心');
  const [formType, setFormType] = useState<Opportunity['type']>('定制研发');
  const [formRelatedProduct, setFormRelatedProduct] = useState('数字化协同管理中枢 V4.2');
  const [formIsTrial, setFormIsTrial] = useState<boolean>(false);
  const [formDeadline, setFormDeadline] = useState('2026-10-31');
  const [formAmount, setFormAmount] = useState(2600000);
  const [formOwnerName, setFormOwnerName] = useState('周销售');
  const [formCollaborators, setFormCollaborators] = useState('李工, 王经理');
  const [formSource, setFormSource] = useState<Opportunity['source']>('主动开发');
  const [formProbability, setFormProbability] = useState(60);
  const [formRemarks, setFormRemarks] = useState('');

  // 6 Funnel stages: 发现商机、需求确认、方案设计、商务谈判、招投标、中标赢单
  const STAGES: Opportunity['stage'][] = [
    '发现商机',
    '需求确认',
    '方案设计',
    '商务谈判',
    '招投标',
    '中标赢单'
  ];

  const activeOpp = opportunities.find((o) => o.id === selectedOpportunityIdForDetail) || null;

  const openAddModal = () => {
    addToast('info', '商机必须从线索转化', '请先在线索管理中创建线索并完成转商机');
    openPageTab('crm_leads');
    return;
    setEditingOpp(null);
    setFormName('');
    setFormCustomerName(customers[0]?.name || '国家电网华东分部数智调度中心');
    setFormType('定制研发');
    setFormRelatedProduct('数字化协同管理中枢 V4.2');
    setFormIsTrial(false);
    setFormDeadline('2026-10-31');
    setFormAmount(2800000);
    setFormOwnerName('周销售');
    setFormCollaborators('李工, 赵测试');
    setFormSource('主动开发');
    setFormProbability(60);
    setFormRemarks('重点大客户信创升级项目，需提供国产数据库深度支持');
    setIsModalOpen(true);
  };

  const openEditModal = (opp: Opportunity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingOpp(opp);
    setFormName(opp.name);
    setFormCustomerName(opp.customerName);
    setFormType(opp.type || '定制研发');
    setFormRelatedProduct(opp.relatedProduct || '数字化协同管理中枢 V4.2');
    setFormIsTrial(!!opp.isTrial);
    setFormDeadline(opp.deadline || opp.expectedCloseDate || '2026-10-31');
    setFormAmount(opp.amount);
    setFormOwnerName(opp.ownerName);
    setFormCollaborators(opp.collaborators ? opp.collaborators.join(', ') : '李工');
    setFormSource(opp.source || '主动开发');
    setFormProbability(opp.probability || opp.winRate || 60);
    setFormRemarks(opp.remarks || opp.keyDecision || '');
    setIsModalOpen(true);
  };

  const handleSaveOpp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('warning', '请填写商机项目名称');
      return;
    }

    if (editingOpp) {
      updateOpportunity(editingOpp.id, {
        name: formName,
        customerName: formCustomerName,
        type: formType,
        relatedProduct: formRelatedProduct,
        isTrial: formIsTrial,
        deadline: formDeadline,
        amount: Number(formAmount),
        ownerName: formOwnerName,
        collaborators: formCollaborators.split(',').map((c) => c.trim()),
        source: formSource,
        probability: Number(formProbability),
        winRate: Number(formProbability),
        remarks: formRemarks
      });
      addToast('success', '商机信息已更新');
    } else {
      const customer = customers.find((item) => item.name === formCustomerName);
      if (!customer) {
        addToast('warning', '请先创建或选择有效客户');
        return;
      }
      addOpportunity({
        name: formName,
        customerId: customer.id,
        customerName: formCustomerName,
        type: formType,
        relatedProduct: formRelatedProduct,
        isTrial: formIsTrial,
        deadline: formDeadline,
        stage: '需求确认',
        amount: Number(formAmount),
        ownerName: formOwnerName,
        collaborators: formCollaborators.split(',').map((c) => c.trim()),
        source: formSource,
        probability: Number(formProbability),
        winRate: Number(formProbability),
        remarks: formRemarks,
        createdAt: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(false);
  };

  const handleAdvance = (opp: Opportunity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    advanceOpportunityStage(opp.id);
  };

  const filteredOpportunities = opportunities.filter((o) => {
    const matchQuery =
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStage = stageFilter === 'all' || o.stage === stageFilter;
    const matchType = typeFilter === 'all' || o.type === typeFilter;
    return matchQuery && matchStage && matchType;
  });

  // 5 Top Metrics: 商机总数、商机总金额、签约率、进行中商机、待跟进
  const totalCount = opportunities.length;
  const totalAmount = opportunities.reduce((acc, o) => acc + o.amount, 0);
  const wonCount = opportunities.filter((o) => o.stage === '签约赢单' || o.stage === '中标赢单').length;
  const winRateAvg = Math.round((wonCount / (totalCount || 1)) * 100);
  const inProgressCount = opportunities.filter((o) => o.stage !== '签约赢单' && o.stage !== '中标赢单').length;
  const pendingFollowCount = opportunities.filter((o) => o.stage === '发现商机' || o.stage === '需求确认').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 5 Stats: 商机总数、商机总金额、签约率、进行中商机、待跟进 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          id="stat-opp-total"
          title="商机总数"
          value={totalCount}
          unit="个"
          change="+18% 环比"
          isPositive={true}
          subText="漏斗在途商机充足"
          icon={<Briefcase className="w-5 h-5" />}
        />
        <StatCard
          id="stat-opp-amount"
          title="商机总金额"
          value={`¥${(totalAmount / 10000).toFixed(0)}`}
          unit="万"
          change="+320万 增长"
          isPositive={true}
          subText="含高意向储备"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <StatCard
          id="stat-opp-winrate"
          title="商机签约赢单率"
          value="75"
          unit="%"
          change="高于行业均值"
          isPositive={true}
          subText="信创标杆加持"
          icon={<Percent className="w-5 h-5" />}
          iconBgColor="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
        />
        <StatCard
          id="stat-opp-inprogress"
          title="进行中商机"
          value={inProgressCount}
          unit="个"
          change="方案设计/招投标中"
          isPositive={true}
          subText="重点攻坚项目中"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
        <StatCard
          id="stat-opp-pending"
          title="待跟进初期商机"
          value={pendingFollowCount}
          unit="个"
          change="需尽快拜访"
          isPositive={false}
          subText="需求确认阶段"
          icon={<AlertCircle className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
        />
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索商机、客户、负责人..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有推进阶段</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有商机类型</option>
            <option value="标准产品">标准产品</option>
            <option value="定制研发">定制研发</option>
            <option value="信创适配">信创适配</option>
            <option value="运维服务">运维服务</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast('info', '商机导出就绪', '已导出当前筛选条件的商机 Excel 报表')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            导出商机
          </button>

          <button
            id="btn-add-opportunity"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            从线索转化商机
          </button>
        </div>
      </div>

      {/* Board View (6 Stages) */}
      {/* Table View (表格列: 商机名称、商机类型、客户、金额、负责人、协作人、推进阶段、投标截止日期、赢单率、操作) */}
      {
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4">商机名称</th>
                  <th className="py-3 px-4">商机类型</th>
                  <th className="py-3 px-4">客户</th>
                  <th className="py-3 px-4">金额</th>
                  <th className="py-3 px-4">负责人</th>
                  <th className="py-3 px-4">协作人</th>
                  <th className="py-3 px-4">推进阶段</th>
                  <th className="py-3 px-4">投标截止日期</th>
                  <th className="py-3 px-4">赢单率</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOpportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    onClick={() => setSelectedOpportunityIdForDetail(opp.id)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="hover:text-blue-600">{opp.name}</div>
                      <div className="text-[10px] text-slate-400">{opp.relatedProduct || '数字化协同管理中枢'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {opp.type || '定制研发'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {opp.customerName}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      ¥{(opp.amount / 10000).toFixed(0)}万
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {opp.ownerName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {opp.collaborators ? opp.collaborators.join(', ') : '李工'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusTag status={opp.stage} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {opp.deadline || opp.expectedCloseDate || '2026-10-31'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                      {opp.winRate || opp.probability || 60}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedOpportunityIdForDetail(opp.id)}
                          className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                        >
                          详情 <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }

      {/* Opportunity Detail Drawer */}
      {activeOpp && (
        <Drawer
          isOpen={!!activeOpp}
          onClose={() => setSelectedOpportunityIdForDetail(null)}
          title={activeOpp.name}
          subtitle={`关联客户: ${activeOpp.customerName} · 负责人: ${activeOpp.ownerName}`}
          width="max-w-2xl"
          footer={
            <>
              <button
                onClick={(e) => openEditModal(activeOpp, e)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium"
              >
                编辑商机
              </button>
              {activeOpp.stage !== '中标赢单' && activeOpp.stage !== '签约赢单' && (
                <button
                  onClick={(e) => { e.stopPropagation(); setStageFollowupOpen(true); }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  阶段跟进
                </button>
              )}
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <CRMDetailInfoCard fields={[
              { label: '商机类型', value: activeOpp.type || '定制研发' },
              { label: '推进阶段', value: <StatusTag status={activeOpp.stage} /> },
              { label: '预计商机金额', value: `¥${(activeOpp.amount / 10000).toFixed(0)} 万元` },
              { label: '综合赢单概率', value: `${activeOpp.winRate || activeOpp.probability || 60}%` },
              { label: '关联核心产品', value: activeOpp.relatedProduct },
              { label: '投标/预计结单时间', value: activeOpp.deadline || activeOpp.expectedCloseDate },
              { label: '负责人及协作团队', value: `${activeOpp.ownerName} (主责) · ${(activeOpp.collaborators || []).join(', ') || '暂无'}` },
              { label: '商机来源渠道', value: activeOpp.source || '主动开发' },
              { label: '商机备注与攻坚说明', value: activeOpp.remarks || activeOpp.keyDecision, wide: true }
            ]} />
            <div className="flex gap-4 border-b border-slate-200 pb-2 dark:border-slate-800"><button type="button" onClick={() => setOppDetailTab('journey')} className={oppDetailTab === 'journey' ? 'border-b-2 border-blue-600 pb-2 font-semibold text-blue-600' : 'pb-2 text-slate-500'}>全历程跟进记录</button><button type="button" onClick={() => setOppDetailTab('collab')} className={oppDetailTab === 'collab' ? 'border-b-2 border-blue-600 pb-2 font-semibold text-blue-600' : 'pb-2 text-slate-500'}>跨模块联动协作状态</button></div>
            {oppDetailTab === 'journey' ? <CRMFollowupTimeline records={followUps.filter((item) => item.opportunityId === activeOpp.id)} /> : <div className="space-y-2">{followUps.filter((item) => item.opportunityId === activeOpp.id && item.assistanceType && item.assistanceType !== '无协助需求（仅记录）').map((item) => <div key={item.id} className="rounded-xl border border-blue-100 bg-blue-50/50 p-3"><div className="font-semibold text-blue-700">{item.assistanceType}</div><div className="mt-1 text-xs text-slate-600">{item.content}</div>{item.productLines?.length ? <div className="mt-1 text-[11px] text-slate-500">产品线：{item.productLines.join('、')}</div> : null}</div>)}{followUps.filter((item) => item.opportunityId === activeOpp.id && item.assistanceType && item.assistanceType !== '无协助需求（仅记录）').length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-xs text-slate-500">暂无协作卡片</div>}</div>}
          </div>
        </Drawer>
      )}

      {activeOpp && <Modal isOpen={stageFollowupOpen} onClose={() => setStageFollowupOpen(false)} title="阶段跟进">
        <CRMFollowupForm formId="stage-followup-form" customers={customers} opportunities={opportunities} initialCustomer={customers.find((item) => item.id === activeOpp.customerId)} onSubmit={(value) => { addFollowUp({ ...value, opportunityId: activeOpp.id, opportunityName: activeOpp.name }); handleAdvance(activeOpp); setStageFollowupOpen(false); }} />
        <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setStageFollowupOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs">取消</button><button type="submit" form="stage-followup-form" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">保存并推进</button></div>
      </Modal>}

      {/* Add / Edit Modal (商机名称、客户、商机类型、关联产品、是否试用、投标截止日期、商机金额、负责人、协作人、商机来源、赢单率、商机备注) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOpp ? '编辑商机信息' : '录入新商机'}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveOpp}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存商机
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveOpp} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                商机项目名称 *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：国家电网数智调度协同平台定制采购"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                关联客户 *
              </label>
              <select
                value={formCustomerName}
                onChange={(e) => setFormCustomerName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                商机类型
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="标准产品">标准产品</option>
                <option value="定制研发">定制研发</option>
                <option value="信创适配">信创适配</option>
                <option value="运维服务">运维服务</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                关联核心产品
              </label>
              <input
                type="text"
                value={formRelatedProduct}
                onChange={(e) => setFormRelatedProduct(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                预计商机金额 (元) *
              </label>
              <input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                投标/结单截止日期
              </label>
              <input
                type="date"
                value={formDeadline}
                onChange={(e) => setFormDeadline(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                赢单率预估 (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formProbability}
                onChange={(e) => setFormProbability(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                负责人
              </label>
              <input
                type="text"
                value={formOwnerName}
                onChange={(e) => setFormOwnerName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                协作人 (逗号分隔)
              </label>
              <input
                type="text"
                value={formCollaborators}
                onChange={(e) => setFormCollaborators(e.target.value)}
                placeholder="例如：李工, 赵测试"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                商机来源
              </label>
              <select
                value={formSource}
                onChange={(e) => setFormSource(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="主动开发">主动开发</option>
                <option value="代理商">代理商</option>
                <option value="官方媒介">官方媒介</option>
                <option value="客户转介">客户转介</option>
                <option value="标讯推送">标讯推送</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isTrialCheckbox"
                checked={formIsTrial}
                onChange={(e) => setFormIsTrial(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isTrialCheckbox" className="font-medium text-slate-700 dark:text-slate-300">
                是否处于客户试用/POC阶段
              </label>
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                商机备注 / 决策关键点
              </label>
              <textarea
                rows={3}
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="记录客户技术痛点、竞争对手动态及赢单关键支撑要素..."
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
