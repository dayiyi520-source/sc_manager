import React, { useState } from 'react';
import {
  PieChart,
  DollarSign,
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  Building,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/UIComponents';

export const FinanceCostProfitView: React.FC = () => {
  const { addToast } = useApp();

  const costBreakdown = [
    { category: '研发人员薪酬与人月工时', amount: 4600000, percentage: '56.8%', note: '核心研发组、架构师与前端' },
    { category: '信创数据库与中间件授权采购', amount: 1500000, percentage: '18.5%', note: '达梦DM8、东方通TongWeb等许可' },
    { category: '公安部三级等保与第三方认证测评', amount: 650000, percentage: '8.0%', note: '合规认证与专家驻场' },
    { category: '项目交付差旅与驻场运营补贴', amount: 550000, percentage: '6.8%', note: '华东电网与招商局现场驻场' },
    { category: '服务器算力与云基础设施分摊', amount: 800000, percentage: '9.9%', note: '测试环境与信创适配私有云集群' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="年度经营总收入"
          value="¥1,620"
          unit="万元"
          change="+32.4% 增长"
          isPositive={true}
          subText="完成率 108%"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="项目总发生成本"
          value="¥810"
          unit="万元"
          change="预算控制率 94%"
          isPositive={true}
          subText="人月成本占比 56.8%"
          icon={<PieChart className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
        />
        <StatCard
          title="综合毛利润 (GP)"
          value="¥810"
          unit="万元"
          change="毛利率 50.0%"
          isPositive={true}
          subText="健康盈利水平"
          icon={<TrendingUp className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="净利润率 (EBITDA)"
          value="38.5"
          unit="%"
          subText="扣除管理分摊费用后"
          icon={<BarChart3 className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
      </div>

      {/* Breakdown Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              企业研发与交付直接成本科目穿透拆解
            </h3>
            <span className="text-xs text-slate-400">
              精准核算至人月、软硬件采购与测评外协费用
            </span>
          </div>

          <button
            onClick={() => addToast('info', '损益表导出', '正在生成《2026年半年度项目成本损益多维核算表.xlsx》')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium text-xs self-start"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            导出财务损益核算表
          </button>
        </div>

        <div className="space-y-4 pt-2">
          {costBreakdown.map((item) => (
            <div key={item.category} className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.category}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{item.note}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ¥{(item.amount / 10000).toFixed(0)} 万元 ({item.percentage})
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: item.percentage }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
