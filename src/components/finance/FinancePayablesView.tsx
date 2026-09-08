import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Plus,
  Building,
  CheckCircle2,
  Clock,
  Download,
  AlertTriangle,
  Receipt,
  FileCheck
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';

export const FinancePayablesView: React.FC = () => {
  const { addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [payables, setPayables] = useState([
    {
      id: 'ap-1',
      supplierName: '武汉达梦数据库股份有限公司',
      type: '信创基础软件采购',
      amount: 480000,
      dueDate: '2026-09-15',
      status: '待支付',
      invoiceReceived: true,
      contractRef: 'SC-PO-2026-081',
      note: '国家电网项目专用DM8企业级数据库授权许可'
    },
    {
      id: 'ap-2',
      supplierName: '统信软件技术有限公司',
      type: '操作系统软件采购',
      amount: 220000,
      dueDate: '2026-08-30',
      status: '已支付',
      invoiceReceived: true,
      contractRef: 'SC-PO-2026-077',
      note: 'UOS服务器版操作系统批量授权'
    },
    {
      id: 'ap-3',
      supplierName: '中科软科技专家咨询组',
      type: '信创等保三级评测外协',
      amount: 180000,
      dueDate: '2026-10-10',
      status: '待支付',
      invoiceReceived: false,
      contractRef: 'SC-PO-2026-092',
      note: '公安部等保三级现场测评服务款项'
    }
  ]);

  const [formSupplier, setFormSupplier] = useState('');
  const [formType, setFormType] = useState('信创基础软件采购');
  const [formAmount, setFormAmount] = useState(150000);
  const [formDueDate, setFormDueDate] = useState('2026-09-30');
  const [formNote, setFormNote] = useState('');

  const handleSavePayable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplier.trim()) {
      addToast('warning', '请填写供应商名称');
      return;
    }

    setPayables([
      {
        id: `ap-${Date.now()}`,
        supplierName: formSupplier,
        type: formType,
        amount: Number(formAmount),
        dueDate: formDueDate,
        status: '待支付',
        invoiceReceived: false,
        contractRef: `SC-PO-2026-${Math.floor(100 + Math.random() * 900)}`,
        note: formNote || '日常项目软硬件外协采购'
      },
      ...payables
    ]);
    setIsModalOpen(false);
    addToast('success', '应付款单已录入财务系统');
  };

  const handlePay = (p: (typeof payables)[0]) => {
    setPayables(payables.map((item) => (item.id === p.id ? { ...item, status: '已支付' } : item)));
    addToast('success', '付款审批已完成', `已向【${p.supplierName}】拨付 ¥${(p.amount / 10000).toFixed(0)}万元`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="应付采购支出总额"
          value="¥88"
          unit="万元"
          subText="软硬件供应商与外协"
          icon={<CreditCard className="w-5 h-5" />}
        />
        <StatCard
          title="已拨付支付总额"
          value="¥22"
          unit="万元"
          change="履约信誉良好"
          isPositive={true}
          subText="统信软件等厂商"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="待付款支出"
          value="¥66"
          unit="万元"
          change="本月排期付款"
          isPositive={false}
          subText="达梦数据库授权"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
        />
        <StatCard
          title="进项发票接收率"
          value="66.7"
          unit="%"
          subText="进项抵扣合规"
          icon={<Receipt className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索供应商 / 采购类型 / 合同号..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-64"
          />
        </div>

        <button
          id="btn-add-payable"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新建应付款申请
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <th className="py-3 px-4">供应商名称</th>
              <th className="py-3 px-4">采购类型</th>
              <th className="py-3 px-4">采购合同编号</th>
              <th className="py-3 px-4">应付金额 (元)</th>
              <th className="py-3 px-4">约定付款日期</th>
              <th className="py-3 px-4">进项发票</th>
              <th className="py-3 px-4">付款状态</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {payables
              .filter(
                (p) =>
                  p.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.type.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>{p.supplierName}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{p.type}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{p.contractRef}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                    ¥{(p.amount / 10000).toFixed(0)} 万元
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{p.dueDate}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        p.invoiceReceived
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60'
                      }`}
                    >
                      {p.invoiceReceived ? '已收发票' : '待催发票'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={p.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {p.status !== '已支付' ? (
                      <button
                        onClick={() => handlePay(p)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-xs shadow-xs"
                      >
                        审批付款
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">已核销结算</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新建供应商应付账款申请"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSavePayable}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              提交应付审核
            </button>
          </>
        }
      >
        <form onSubmit={handleSavePayable} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              供应商主体全称 *
            </label>
            <input
              type="text"
              required
              value={formSupplier}
              onChange={(e) => setFormSupplier(e.target.value)}
              placeholder="如：武汉达梦数据库股份有限公司"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                采购类别 *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="信创基础软件采购">信创基础软件采购</option>
                <option value="操作系统软件采购">操作系统软件采购</option>
                <option value="硬件及服务器采购">硬件及服务器采购</option>
                <option value="专家咨询与等保外协">专家咨询与等保外协</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                应付金额 (元) *
              </label>
              <input
                type="number"
                required
                value={formAmount}
                onChange={(e) => setFormAmount(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              用途与项目说明
            </label>
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="如：国家电网项目专用数据库许可采购"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
