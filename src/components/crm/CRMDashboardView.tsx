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

export const CRMDashboardView: React.FC = () => {
  const { customers, opportunities, contracts, openPageTab } = useAppCrm();

  const [rankingTab, setRankingTab] = useState<'partners' | 'customers' | 'products'>('partners');
  const [trendMetric, setTrendMetric] = useState<'customers' | 'opportunities' | 'conversion'>('opportunities');

  // Trend Data for 趋势图 (新增客户、新增商机、商机转化率)
  const trendData = [
    { month: '3月', newCustomers: 3, newOpps: 5, convRate: 60, oppAmount: 420 },
    { month: '4月', newCustomers: 4, newOpps: 7, convRate: 64, oppAmount: 680 },
    { month: '5月', newCustomers: 6, newOpps: 9, convRate: 67, oppAmount: 850 },
    { month: '6月', newCustomers: 5, newOpps: 8, convRate: 70, oppAmount: 920 },
    { month: '7月', newCustomers: 8, newOpps: 12, convRate: 71, oppAmount: 1240 },
    { month: '8月', newCustomers: 6, newOpps: 10, convRate: 75, oppAmount: 1443 }
  ];

  // 商机漏斗 6阶段 (发现商机、需求确认、方案设计、商务谈判、招投标、中标)
  const funnelStages = [
    { stage: '1. 发现商机', count: 28, amount: 2680, color: 'from-blue-600 to-indigo-600', pct: 100 },
    { stage: '2. 需求确认', count: 22, amount: 2150, color: 'from-indigo-600 to-sky-600', pct: 78.5 },
    { stage: '3. 方案设计', count: 16, amount: 1680, color: 'from-sky-600 to-cyan-600', pct: 57.1 },
    { stage: '4. 商务谈判', count: 11, amount: 1290, color: 'from-cyan-600 to-amber-600', pct: 39.2 },
    { stage: '5. 招投标', count: 7, amount: 960, color: 'from-amber-600 to-emerald-600', pct: 25.0 },
    { stage: '6. 中标赢单', count: 4, amount: 620, color: 'from-emerald-600 to-teal-500', pct: 14.3 }
  ];

  // 商机来源分布 (主动开发、代理商、官方媒介、客户转介、标讯)
  const sourceDistribution = [
    { name: '主动开发', value: 35, count: 10, color: '#3B82F6' },
    { name: '代理商/渠道', value: 25, count: 7, color: '#8B5CF6' },
    { name: '标讯推送', value: 18, count: 5, color: '#10B981' },
    { name: '客户转介', value: 14, count: 4, color: '#F59E0B' },
    { name: '官方媒介/官网', value: 8, count: 2, color: '#EC4899' }
  ];

  // 流失商机分析 (流失原因、数量、金额、占比)
  const lostOppsAnalysis = [
    { reason: '预算削减/暂缓采购', count: 4, amount: 380, pct: 40.0, tag: '预算原因' },
    { reason: '信创技术偏离过大', count: 3, amount: 320, pct: 30.0, tag: '技术原因' },
    { reason: '友商低价恶性竞争', count: 2, amount: 150, pct: 20.0, tag: '商务原因' },
    { reason: '客户内部决策调整', count: 1, amount: 90, pct: 10.0, tag: '决策原因' }
  ];

  // 1. 合作伙伴贡献榜 (按照金额，商机和成交项目辅助显示)
  const partnerRanking = [
    { name: '上海神州数码集成有限公司', amount: 480, opps: 5, deals: 3, level: '战略核心伙伴' },
    { name: '东软集团华东行业代表处', amount: 360, opps: 4, deals: 2, level: '战略核心伙伴' },
    { name: '中软国际政企事业部', amount: 280, opps: 3, deals: 2, level: '方案集成伙伴' },
    { name: '江苏未来智能技术发展有限公司', amount: 190, opps: 2, deals: 1, level: '区域分销伙伴' }
  ];

  // 2. 客户贡献榜 (累计金额、客户等级、项目数)
  const customerRanking = [
    { name: '国家电网华东分部数智调度中心', amount: 480, level: 'S级-战略', projectCount: 2 },
    { name: '上海电气自动化集团智能制造所', amount: 320, level: 'A级-重点', projectCount: 1 },
    { name: '浙江省能源集团数字中枢', amount: 260, level: 'A级-重点', projectCount: 1 },
    { name: '浦发银行金融科技创新部', amount: 180, level: 'B级-标准', projectCount: 1 }
  ];

  // 3. 产品贡献榜 (产品、贡献金额、成交数)
  const productRanking = [
    { name: '师创智联数字化协同管理中枢 V4.2', amount: 680, deals: 4, category: '核心中枢' },
    { name: '信创高可用集群版 (达梦/金仓适配)', amount: 420, deals: 3, category: '信创产品' },
    { name: '大客户私有化协同OS定制服务', amount: 240, deals: 2, category: '定制方案' },
    { name: '微服务敏捷网关与API中台', amount: 103, deals: 1, category: '技术组件' }
  ];

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
          value="14"
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
          value="8"
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
          value="4"
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
