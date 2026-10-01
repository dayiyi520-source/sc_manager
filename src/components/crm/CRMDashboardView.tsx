import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  Layers,
  BarChart2,
  PieChart as PieChartIcon,
  Award,
  ArrowUpRight,
  ShieldCheck,
  Target,
  FileCheck,
  Flame,
  ArrowDownRight,
  Percent,
  CheckCircle2,
  Calendar,
  Building,
  Boxes
} from '@/components/common/octicons-compat';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useAppCrm } from '../../hooks/useAppCrm';
import { StatCard, StatusTag } from '../common/UIComponents';
import type { Opportunity } from '../../types';

export const CRMDashboardView: React.FC = () => {
  const { customers, opportunities, contracts, partners, openPageTab } = useAppCrm();

  const [rankingTab, setRankingTab] = useState<'partners' | 'customers' | 'products'>('partners');
  const [trendMetric, setTrendMetric] = useState<'customers' | 'opportunities' | 'conversion'>('opportunities');

  const monthKey = (value: string | undefined) => (value || '').slice(0, 7);
  const trendMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const trendData = trendMonths.map((key) => {
    const monthOpps = opportunities.filter((item) => monthKey(item.createdAt) === key);
    const monthCustomers = customers.filter((item) => monthKey(item.createdAt) === key);
    const won = monthOpps.filter((item) => item.stage === '中标赢单').length;
    return { month: key.slice(5).replace(/^0/, '') + '月', newCustomers: monthCustomers.length, newOpps: monthOpps.length, convRate: monthOpps.length ? Math.round((won / monthOpps.length) * 100) : 0, oppAmount: Math.round(monthOpps.reduce((sum, item) => sum + (item.amount || 0), 0) / 10000) };
  });

  // 商机漏斗 6阶段 (发现商机、需求确认、方案设计、商务谈判、招投标、中标)
  const funnelStages = ['发现商机', '需求确认', '方案设计', '商务谈判', '招投标', '中标赢单'].map((stage, index) => {
    const items = opportunities.filter((item) => item.stage === stage);
    const total = opportunities.length;
    return { stage: `${index + 1}. ${stage}`, count: items.length, amount: Math.round(items.reduce((sum, item) => sum + (item.amount || 0), 0) / 10000), color: 'from-blue-600 to-indigo-600', pct: total ? Math.round((items.length / total) * 1000) / 10 : 0 };
  });

  // 商机来源分布 (主动开发、代理商、官方媒介、客户转介、标讯)
  const sourceCounts = new Map<string, number>();
  customers.forEach((item) => sourceCounts.set(item.source, (sourceCounts.get(item.source) || 0) + 1));
  const sourceDistribution = Array.from(sourceCounts.entries()).map(([name, count], index) => ({ name, value: customers.length ? Math.round((count / customers.length) * 100) : 0, count, color: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'][index % 5] }));

  // 流失商机分析 (流失原因、数量、金额、占比)
  const lostOpps = opportunities.filter((item) => item.status === '已废弃');
  const lostOppsAnalysis = lostOpps.length ? [{ reason: '已废弃商机', count: lostOpps.length, amount: Math.round(lostOpps.reduce((sum, item) => sum + (item.amount || 0), 0) / 10000), pct: 100, tag: '状态' }] : [];

  // 1. 合作伙伴贡献榜 (按照金额，商机和成交项目辅助显示)
  const partnerRanking = partners.map((item) => ({ name: item.name, amount: item.totalAmount || 0, opps: item.oppsContributed || 0, deals: item.dealsWon || 0, level: item.level }));

  // 2. 客户贡献榜 (累计金额、客户等级、项目数)
  const customerRanking = customers.map((customer) => ({ name: customer.name, amount: contracts.filter((item) => item.customerId === customer.id).reduce((sum, item) => sum + (item.amount || 0), 0), level: customer.level, projectCount: contracts.filter((item) => item.customerId === customer.id).length })).filter((item) => item.amount > 0);

  // 3. 产品贡献榜 (产品、贡献金额、成交数)
  const productRanking = Array.from(opportunities.reduce((map, item) => map.set(item.relatedProduct || '未关联产品', [...(map.get(item.relatedProduct || '未关联产品') || []), item]), new Map<string, Opportunity[]>()).entries()).map(([name, items]) => ({ name, amount: Math.round(items.reduce((sum, item) => sum + (item.amount || 0), 0) / 10000), deals: items.length, category: '商机' }));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 5 Core Top Metrics: 客户数、商机数、进行中项目、本月新增、本月成交数 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          id="stat-customers"
          title="客户数"
          value={customers.length}
          unit="家"
          change="+2家 S级"
          isPositive={true}
          subText="重点标杆 3 家"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          onClick={() => openPageTab('crm_customers')}
        />
        <StatCard
          id="stat-opps"
          title="商机数"
          value={opportunities.length}
          unit="个"
          change="+18.5% 环比"
          isPositive={true}
          subText="商机总额 ¥1,443万"
          icon={<Briefcase className="w-5 h-5" />}
          iconBgColor="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
          onClick={() => openPageTab('crm_opportunities')}
        />
        <StatCard
          id="stat-projects"
          title="进行中项目"
          value={contracts.length}
          unit="个"
          change="交付准时"
          isPositive={true}
          subText="按计划实施交付"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
          onClick={() => openPageTab('proj_list')}
        />
        <StatCard
          id="stat-new-this-month"
          title="本月新增"
          value={customers.filter((item) => monthKey(item.createdAt) === trendMonths[trendMonths.length - 1]).length + opportunities.filter((item) => monthKey(item.createdAt) === trendMonths[trendMonths.length - 1]).length}
          unit="家/个"
          change="+33% 同比"
          isPositive={true}
          subText="含2笔千万级招投标"
          icon={<Flame className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
        />
        <StatCard
          id="stat-deals-won"
          title="本月成交数"
          value={opportunities.filter((item) => item.stage === '中标赢单').length}
          unit="笔"
          change="成交 ¥1,280万"
          isPositive={true}
          subText="商机综合赢单率 75%"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
          onClick={() => openPageTab('crm_contracts')}
        />
      </div>

      {/* 趋势图: 新增客户、新增商机、商机转化率 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              客户商机与转化发展趋势 (近6个月)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              监控全周期获客速率、商机孵化量与终端赢单转化率趋势
            </p>
          </div>
          {/* Trend Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setTrendMetric('opportunities')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                trendMetric === 'opportunities'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              新增商机 (个)
            </button>
            <button
              onClick={() => setTrendMetric('customers')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                trendMetric === 'customers'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              新增客户 (家)
            </button>
            <button
              onClick={() => setTrendMetric('conversion')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                trendMetric === 'conversion'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              商机转化率 (%)
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="var(--neon-purple)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#22d3ee" strokeOpacity={0.14} />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d1424',
                  borderColor: '#22d3ee',
                  borderWidth: 1,
                  boxShadow: '0 0 18px rgba(34, 211, 238, 0.16)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey={
                  trendMetric === 'opportunities'
                    ? 'newOpps'
                    : trendMetric === 'customers'
                    ? 'newCustomers'
                    : 'convRate'
                }
                name={
                  trendMetric === 'opportunities'
                    ? '新增商机(个)'
                    : trendMetric === 'customers'
                    ? '新增客户(家)'
                    : '转化率(%)'
                }
                stroke="var(--neon-cyan)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#trendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2-Column: 分布漏斗图 (商机漏斗 + 来源分布 + 流失分析) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 商机漏斗 (6阶段: 发现商机、需求确认、方案设计、商务谈判、招投标、中标) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                全链路商机转化漏斗 (6大核心推进阶段)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                阶段转化率监控及在途商机金额沉淀
              </p>
            </div>
            <button
              onClick={() => openPageTab('crm_opportunities')}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              商机看板 &gt;
            </button>
          </div>

          {/* 6 Funnel Bars */}
          <div className="space-y-3 pt-1 text-xs">
            {funnelStages.map((stage, idx) => (
              <div key={stage.stage} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{stage.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 dark:text-slate-400">¥{stage.amount} 万元</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                      {stage.count} 个 ({stage.pct}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-lg overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded bg-gradient-to-r ${stage.color} flex items-center px-3 font-semibold text-[11px] text-white transition-all duration-500 shadow-xs`}
                    style={{ width: `${Math.max(18, stage.pct)}%` }}
                  >
                    阶段沉淀 ¥{stage.amount}万
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 流失商机分析 */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 mb-2.5 flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
              流失商机归因分析 (流失原因、数量、金额、占比)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {lostOppsAnalysis.map((item) => (
                <div key={item.reason} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.reason}</span>
                  </div>
                  <div className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                    {item.count} 笔 / ¥{item.amount}万
                  </div>
                  <div className="text-[10px] text-slate-400">
                    流失占比 {item.pct}% · {item.tag}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: 商机来源分布 + 3大贡献榜单 */}
        <div className="lg:col-span-5 space-y-6">
          {/* 商机来源分布 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-600" />
                商机来源渠道分布 (5大主要渠道)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sourceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 text-xs">
                {sourceDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {item.count} 个 ({item.value}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3大榜单 (Tabs: 合作伙伴贡献榜、客户贡献榜、产品贡献榜) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                综合价值贡献榜单
              </h3>
              {/* Tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-[11px]">
                <button
                  onClick={() => setRankingTab('partners')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    rankingTab === 'partners'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  合作伙伴榜
                </button>
                <button
                  onClick={() => setRankingTab('customers')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    rankingTab === 'customers'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  客户贡献榜
                </button>
                <button
                  onClick={() => setRankingTab('products')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    rankingTab === 'products'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  产品贡献榜
                </button>
              </div>
            </div>

            {/* List for Partner Ranking */}
            {rankingTab === 'partners' && (
              <div className="space-y-2.5 text-xs">
                {partnerRanking.map((p, idx) => (
                  <div key={p.name} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{p.level}</span>
                          <span>·</span>
                          <span>商机: {p.opps}个</span>
                          <span>·</span>
                          <span>成交: {p.deals}项</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono text-sm shrink-0">
                      ¥{p.amount}万
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* List for Customer Ranking */}
            {rankingTab === 'customers' && (
              <div className="space-y-2.5 text-xs">
                {customerRanking.map((c, idx) => (
                  <div key={c.name} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{c.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <StatusTag status={c.level} />
                          <span>项目数: {c.projectCount}个</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm shrink-0">
                      累计 ¥{c.amount}万
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* List for Product Ranking */}
            {rankingTab === 'products' && (
              <div className="space-y-2.5 text-xs">
                {productRanking.map((p, idx) => (
                  <div key={p.name} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-400 text-white' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{p.category}</span>
                          <span>·</span>
                          <span>成交数: {p.deals}套</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-purple-600 dark:text-purple-400 font-mono text-sm shrink-0">
                      ¥{p.amount}万
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
