import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';

export const FinanceOverviewView: React.FC = () => {
  const { financeStats, contracts, openPageTab } = useApp();

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="年度累计签署合同额"
          value={`¥${(financeStats.totalContractAmount / 10000).toFixed(0)}`}
          unit="万元"
          change="+32.4% 稳健增长"
          isPositive={true}
          subText="超额完成季度经营考核"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="已实收回款总额"
          value={`¥${(financeStats.receivedAmount / 10000).toFixed(0)}`}
          unit="万元"
          change="回款率 55.6%"
          isPositive={true}
          subText="现金流储备健康充足"
          icon={<ArrowUpRight className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="待催收应收账款 (AR)"
          value={`¥${(financeStats.pendingReceivables / 10000).toFixed(0)}`}
          unit="万元"
          change="阶段款催收"
          isPositive={false}
          subText="本月到期 ¥240万"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
          onClick={() => openPageTab('fin_receivables')}
        />
        <StatCard
          title="累计已开具增值税发票"
          value={`¥${(financeStats.invoicedAmount / 10000).toFixed(0)}`}
          unit="万元"
          subText="三流一致合规入账"
          icon={<Receipt className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Grid for Cashflow Trend & Pending Receivables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cashflow In/Out Visual */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                月度经营现金流入 vs 支出成本走势
              </h3>
              <span className="text-xs text-slate-400">单位：万元 (人民币)</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400">回款流入</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-400">研发与采购支出</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            {[
              { month: '2026-03', in: 280, out: 120, net: '+160' },
              { month: '2026-04', in: 340, out: 140, net: '+200' },
              { month: '2026-05', in: 190, out: 110, net: '+80' },
              { month: '2026-06', in: 420, out: 160, net: '+260' },
              { month: '2026-07', in: 310, out: 130, net: '+180' },
              { month: '2026-08 (本月)', in: 260, out: 125, net: '+135' }
            ].map((row) => (
              <div key={row.month} className="space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-700 dark:text-slate-300 font-mono">{row.month}</span>
                  <span className="text-emerald-600 font-bold">净现金流入 {row.net} 万元</span>
                </div>
                <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <div
                    className="bg-emerald-500 rounded-full"
                    style={{ width: `${(row.in / 500) * 100}%` }}
                    title={`流入: ${row.in}万`}
                  />
                  <div
                    className="bg-blue-500 rounded-full opacity-70"
                    style={{ width: `${(row.out / 500) * 100}%` }}
                    title={`支出: ${row.out}万`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Key Contract Invoicing Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">重点合同履约回款</h3>
            <button
              onClick={() => openPageTab('fin_receivables')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              查看应收台账 &gt;
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {contracts.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800"
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-900 dark:text-white line-clamp-1">{c.name}</span>
                  <span className="font-bold text-emerald-600 shrink-0">
                    ¥{(c.amount / 10000).toFixed(0)}万
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{c.customerName}</span>
                  <span>已回款 {Math.round((c.paidAmount / c.amount) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${(c.paidAmount / c.amount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
