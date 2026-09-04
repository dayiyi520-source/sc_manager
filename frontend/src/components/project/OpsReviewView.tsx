import React, { useState } from 'react';
import {
  TrendingUp,
  Search,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  PieChart,
  BarChart3,
  Calendar,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';

export const OpsReviewView: React.FC = () => {
  const { projects, openPageTab } = useApp();

  const [searchQuery, setSearchQuery] = useState('');

  const opsData = [
    {
      id: 'ops-1',
      projectName: '国家电网华东分布式协同调度平台一期',
      budget: 4800000,
      cost: 1950000,
      profit: 2850000,
      margin: '59.4%',
      manMonths: 28,
      efficiency: '¥17.1万/人月',
      status: '卓越'
    },
    {
      id: 'ops-2',
      projectName: '招商局智慧船务协同办公中枢',
      budget: 3200000,
      cost: 1320000,
      profit: 1880000,
      margin: '58.8%',
      manMonths: 19,
      efficiency: '¥16.8万/人月',
      status: '优良'
    },
    {
      id: 'ops-3',
      projectName: '智行新能源汽车智能制造MES系统',
      budget: 2600000,
      cost: 1450000,
      profit: 1150000,
      margin: '44.2%',
      manMonths: 21,
      efficiency: '¥12.3万/人月',
      status: '正常'
    },
    {
      id: 'ops-4',
      projectName: '华为鸿蒙物联数据采集汇聚网关',
      budget: 5600000,
      cost: 2100000,
      profit: 3500000,
      margin: '62.5%',
      manMonths: 30,
      efficiency: '¥18.6万/人月',
      status: '卓越'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="交付运营投入产出比 ROI"
          value="2.85"
          unit="x"
          change="+0.3x 提升"
          isPositive={true}
          subText="标准化基座复用效益显现"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="交付项目平均毛利率"
          value="58.4"
          unit="%"
          change="高于行业基准"
          isPositive={true}
          subText="目标 > 50%"
          icon={<DollarSign className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="研发与交付人效产出"
          value="16.5"
          unit="万/人月"
          change="人效提升 18%"
          isPositive={true}
          subText="低代码与信创引擎加速"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
        <StatCard
          title="标准化组件复用率"
          value="74.2"
          unit="%"
          subText="研发成本降低 32%"
          icon={<Layers className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              各重大项目交付人效与财务损益复盘核算
            </h3>
            <span className="text-xs text-slate-400">
              基于工时系统与财务实际发生支出的精细化 ROI 核算
            </span>
          </div>

          <div className="text-xs text-slate-500">
            财务结算周期：<span className="font-semibold text-slate-800 dark:text-slate-200">2026年半年度</span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="py-3 px-4">项目名称</th>
                <th className="py-3 px-4">合同预算</th>
                <th className="py-3 px-4">实际发生成本</th>
                <th className="py-3 px-4">项目净毛利</th>
                <th className="py-3 px-4">毛利率</th>
                <th className="py-3 px-4">投入人月</th>
                <th className="py-3 px-4">人均产出效能</th>
                <th className="py-3 px-4">运营评级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {opsData.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {d.projectName}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                    ¥{(d.budget / 10000).toFixed(0)}万
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                    ¥{(d.cost / 10000).toFixed(0)}万
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ¥{(d.profit / 10000).toFixed(0)}万
                  </td>
                  <td className="py-3.5 px-4 font-bold text-blue-600">{d.margin}</td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{d.manMonths} 人月</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                    {d.efficiency}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        d.status === '卓越'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60'
                          : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60'
                      }`}
                    >
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
