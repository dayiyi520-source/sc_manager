import React, { useState } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  Plus,
  Building,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Download,
  CreditCard
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { PaymentSchedule } from '../../types';

export const FinanceReceivablesView: React.FC = () => {
  const { paymentSchedules, updatePaymentSchedule, contracts, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredSchedules = paymentSchedules.filter((ps) => {
    const matchQ =
      ps.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ps.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ps.contractName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || ps.status === statusFilter;
    return matchQ && matchStatus;
  });

  const handleConfirmCollection = (ps: PaymentSchedule) => {
    updatePaymentSchedule(ps.id, { status: '已收讫' });
    addToast('success', `回款已确认入账`, `【${ps.customerName}】${ps.stageName} ¥${(ps.amount / 10000).toFixed(0)}万元 已到账并生成财务凭证`);
  };

  const handleSendReminder = (ps: PaymentSchedule) => {
    addToast('info', '催收对账单已发出', `已向【${ps.customerName}】财务部推送正式付款提醒函与阶段验收附件`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="应收分期总规模"
          value="¥1,620"
          unit="万元"
          subText="全生命周期回款计划"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="已收讫到账款项"
          value="¥900"
          unit="万元"
          change="实收回款 55.6%"
          isPositive={true}
          subText="首期款与上线节点款"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="待催收应收款"
          value="¥720"
          unit="万元"
          change="待到账"
          isPositive={false}
          subText="UAT验收与终验款"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
        />
        <StatCard
          title="超期逾期账款"
          value="¥0"
          unit="万元"
          change="0 坏账风险"
          isPositive={true}
          subText="央国企信誉优良"
          icon={<CreditCard className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索客户 / 合同名称 / 分期节点..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-64"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有回款状态</option>
            <option value="已收讫">已收讫入账</option>
            <option value="待付款">待付款催收</option>
          </select>
        </div>

        <button
          onClick={() => addToast('info', '报表导出中', '正在导出《2026年企业应收账款全景对账台账.xlsx》')}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
        >
          <Download className="w-3.5 h-3.5" />
          导出应收对账台账
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <th className="py-3 px-4">款项分期阶段</th>
              <th className="py-3 px-4">对应合同</th>
              <th className="py-3 px-4">客户主体</th>
              <th className="py-3 px-4">应收金额 (元)</th>
              <th className="py-3 px-4">预计/实际到账日期</th>
              <th className="py-3 px-4">发票开具状态</th>
              <th className="py-3 px-4">状态</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSchedules.map((ps) => (
              <tr key={ps.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{ps.stageName}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{ps.contractName}</td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{ps.customerName}</td>
                <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                  ¥{(ps.amount / 10000).toFixed(0)} 万元
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-500">{ps.dueDate}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      ps.isInvoiced
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                    }`}
                  >
                    {ps.isInvoiced ? '已开具发票' : '待开发票'}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <StatusTag status={ps.status} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {ps.status !== '已收讫' ? (
                      <>
                        <button
                          onClick={() => handleSendReminder(ps)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded font-medium text-xs flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          催收提醒
                        </button>
                        <button
                          onClick={() => handleConfirmCollection(ps)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs shadow-xs"
                        >
                          确认到账
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400 text-[11px]">已核销闭环</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
