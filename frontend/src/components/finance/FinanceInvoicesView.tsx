import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  Plus,
  Building,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Stamp
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { InvoiceRecord } from '../../types';

export const evaluateInvoiceApproval = (input: {
  invoiceType: InvoiceRecord['type'];
  requestedAmount: number;
  scheduleAmount?: number;
  invoicedAmount?: number;
}) => {
  const availableAmount = input.scheduleAmount === undefined
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, input.scheduleAmount - (input.invoicedAmount || 0));
  const overAmount = Math.max(0, input.requestedAmount - availableAmount);
  return { availableAmount, overAmount, needsApproval: input.invoiceType === '销项发票' && overAmount > 0 };
};

export const FinanceInvoicesView: React.FC = () => {
  const {
    invoices,
    addInvoice,
    updateInvoice,
    paymentSchedules,
    updatePaymentSchedule,
    invoiceApprovals,
    addInvoiceApproval,
    updateInvoiceApproval,
    currentUser,
    addToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formInvoiceNo, setFormInvoiceNo] = useState(`FP-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [formType, setFormType] = useState<'销项发票' | '进项发票'>('销项发票');
  const [formEntity, setFormEntity] = useState('国家电网华东分部');
  const [formAmount, setFormAmount] = useState(2400000);
  const [formTaxRate, setFormTaxRate] = useState('6% 增值税专用发票');
  const [formContractRef, setFormContractRef] = useState('SC-CT-2026-001');
  const [formPaymentScheduleId, setFormPaymentScheduleId] = useState('');
  const [formApprovalReason, setFormApprovalReason] = useState('');

  const filteredInvoices = invoices.filter((inv) => {
    const matchQ =
      inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerOrSupplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.contractRef.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || inv.type === typeFilter;
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchQ && matchType && matchStatus;
  });

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSchedule = paymentSchedules.find((schedule) => schedule.id === formPaymentScheduleId);
    const linkedInvoicedAmount = selectedSchedule
      ? invoices.filter((invoice) => invoice.paymentScheduleId === selectedSchedule.id && invoice.status !== '已作废' && invoice.status !== '已红冲').reduce((sum, invoice) => sum + invoice.amount, 0)
      : 0;
    const { availableAmount, overAmount, needsApproval } = evaluateInvoiceApproval({
      invoiceType: formType,
      requestedAmount: Number(formAmount),
      scheduleAmount: selectedSchedule?.amount,
      invoicedAmount: linkedInvoicedAmount
    });

    if (needsApproval && !formApprovalReason.trim()) {
      addToast('warning', '请填写超开票审批原因');
      return;
    }

    const approval = needsApproval
      ? addInvoiceApproval({
          customerName: formEntity,
          contractName: selectedSchedule?.contractName || formContractRef,
          stageName: selectedSchedule?.stageName || '未关联付款阶段',
          requestedAmount: Number(formAmount),
          availableAmount,
          overAmount,
          reason: formApprovalReason.trim(),
          status: '待审批',
          applicant: currentUser.name,
          paymentScheduleId: selectedSchedule?.id,
          contractId: selectedSchedule?.contractId
        })
      : undefined;

    addInvoice({
      invoiceNo: formInvoiceNo,
      type: formType,
      customerOrSupplier: formEntity,
      amount: Number(formAmount),
      taxRate: formTaxRate,
      issueDate: new Date().toISOString().split('T')[0],
      status: needsApproval ? '待审批' : '已开具',
      issueStatus: needsApproval ? '待审批' : '已开具',
      approvalRecordId: approval?.id,
      paymentScheduleId: selectedSchedule?.id,
      contractRef: formContractRef
    });
    if (selectedSchedule && !needsApproval) {
      updatePaymentSchedule(selectedSchedule.id, {
        isInvoiced: Number(formAmount) + linkedInvoicedAmount >= selectedSchedule.amount,
        invoiceStatus: Number(formAmount) + linkedInvoicedAmount >= selectedSchedule.amount ? '已开具' : '部分开具',
        invoicedAmount: linkedInvoicedAmount + Number(formAmount)
      });
    }
    setIsModalOpen(false);
    setFormApprovalReason('');
  };

  const handleApprovalDecision = (approvalId: string, status: '审批通过' | '审批拒绝') => {
    const approval = invoiceApprovals.find((item) => item.id === approvalId);
    if (!approval || approval.status !== '待审批') return;
    updateInvoiceApproval(approvalId, {
      status,
      approver: currentUser.name,
      approvedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      comment: status === '审批通过' ? '本地审批记录已确认通过' : '本地审批记录已拒绝'
    });
    const invoice = invoices.find((item) => item.approvalRecordId === approvalId);
    if (invoice) updateInvoice(invoice.id, { status: status === '审批通过' ? '已开具' : '待审批', issueStatus: status === '审批通过' ? '已开具' : '待审批' });
    addToast(status === '审批通过' ? 'success' : 'warning', status === '审批通过' ? '超开票审批已通过' : '超开票审批已拒绝');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="发票台账总数"
          value={invoices.length}
          unit="张"
          subText="全电发票合规归档"
          icon={<Receipt className="w-5 h-5" />}
        />
        <StatCard
          title="销项开票总额"
          value="¥900"
          unit="万元"
          change="税率 6% 专票"
          isPositive={true}
          subText="对应已确认回款"
          icon={<ArrowUpRight className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
        <StatCard
          title="进项抵扣发票"
          value="¥70"
          unit="万元"
          change="抵扣进项税"
          isPositive={true}
          subText="达梦/统信等采购"
          icon={<ArrowDownRight className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="税务合规稽核"
          value="100"
          unit="%"
          subText="三流一致红线校验"
          icon={<Stamp className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索发票号 / 抬头主体 / 合同号..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-64"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有发票类型</option>
            <option value="销项发票">销项发票 (给客户开)</option>
            <option value="进项发票">进项发票 (供应商收)</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有开具状态</option>
            <option value="已开具">已开具</option>
            <option value="已认证">已认证抵扣</option>
            <option value="待开具">待开具</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast('info', '税务报表导出', '正在生成《2026进销项税金测算表.xlsx》')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            导出税务明细
          </button>
          <button
            id="btn-add-invoice"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            开具/录入发票
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <th className="py-3 px-4">发票号码</th>
              <th className="py-3 px-4">类型</th>
              <th className="py-3 px-4">受票/开票主体</th>
              <th className="py-3 px-4">发票金额 (元)</th>
              <th className="py-3 px-4">适用税率</th>
              <th className="py-3 px-4">开票日期</th>
              <th className="py-3 px-4">关联合同</th>
              <th className="py-3 px-4">认证状态</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                  {inv.invoiceNo}
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      inv.type === '销项发票'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60'
                    }`}
                  >
                    {inv.type}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                  {inv.customerOrSupplier}
                </td>
                <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                  ¥{(inv.amount / 10000).toFixed(0)} 万元
                </td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{inv.taxRate}</td>
                <td className="py-3.5 px-4 font-mono text-slate-500">{inv.issueDate}</td>
                <td className="py-3.5 px-4 font-mono text-slate-500">{inv.contractRef}</td>
                <td className="py-3.5 px-4">
                  <StatusTag status={inv.status} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => addToast('info', '电子发票预览', `正在调阅发票【${inv.invoiceNo}】PDF版式文件`)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-xs"
                  >
                    查看版式
                  </button>
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
        title="开具/登记增值税全电发票"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveInvoice}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              确认开具入账
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                发票代码/号码 *
              </label>
              <input
                type="text"
                required
                value={formInvoiceNo}
                onChange={(e) => setFormInvoiceNo(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                发票方向 *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="销项发票">销项发票 (对客户开出)</option>
                <option value="进项发票">进项发票 (收到供应商发票)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              受票/开票企业主体抬头 *
            </label>
            <input
              type="text"
              required
              value={formEntity}
              onChange={(e) => setFormEntity(e.target.value)}
              placeholder="如：国家电网华东分部"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              关联付款阶段
            </label>
            <select
              value={formPaymentScheduleId}
              onChange={(e) => setFormPaymentScheduleId(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">暂不关联付款阶段</option>
              {paymentSchedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.contractName} · {schedule.stageName} · ¥{schedule.amount.toLocaleString()}
                </option>
              ))}
            </select>
            {formPaymentScheduleId && (
              <p className="mt-1 text-[11px] text-slate-500">
                当前可开票余额：¥{Math.max(0, (paymentSchedules.find((schedule) => schedule.id === formPaymentScheduleId)?.amount || 0) - invoices.filter((invoice) => invoice.paymentScheduleId === formPaymentScheduleId && invoice.status !== '已作废' && invoice.status !== '已红冲').reduce((sum, invoice) => sum + invoice.amount, 0)).toLocaleString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                含税开票金额 (元) *
              </label>
              <input
                type="number"
                required
                value={formAmount}
                onChange={(e) => setFormAmount(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                适用税率 *
              </label>
              <select
                value={formTaxRate}
                onChange={(e) => setFormTaxRate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="6% 增值税专用发票">6% 增值税专用发票 (软件开发与技术服务)</option>
                <option value="13% 增值税专用发票">13% 增值税专用发票 (硬件及介质采购)</option>
                <option value="3% 增值税普通发票">3% 增值税普通发票</option>
              </select>
            </div>
          </div>

          {formType === '销项发票' && (
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                超开票审批原因（超出付款阶段余额时必填）
              </label>
              <textarea
                rows={2}
                value={formApprovalReason}
                onChange={(e) => setFormApprovalReason(e.target.value)}
                placeholder="说明特殊业务背景、超开金额及预计回款安排"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          )}
        </form>
      </Modal>

      {invoiceApprovals.length > 0 && (
        <section className="dark-card rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[var(--text-primary)]">超开票审批记录</h3>
            <span className="text-[11px] text-[var(--text-muted)]">本地记录，后续可关联企业微信单号</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-main)] text-[var(--text-muted)]">
                  <th className="py-2 pr-3">客户 / 付款阶段</th>
                  <th className="py-2 pr-3">申请金额</th>
                  <th className="py-2 pr-3">超开金额</th>
                  <th className="py-2 pr-3">申请人</th>
                  <th className="py-2 pr-3">状态</th>
                  <th className="py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {invoiceApprovals.map((approval) => (
                  <tr key={approval.id}>
                    <td className="py-2.5 pr-3 text-[var(--text-body)]">
                      <div>{approval.customerName}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{approval.stageName}</div>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[var(--text-body)]">¥{approval.requestedAmount.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 font-mono text-[var(--warning)]">¥{approval.overAmount.toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-[var(--text-muted)]">{approval.applicant}</td>
                    <td className="py-2.5 pr-3"><StatusTag status={approval.status} /></td>
                    <td className="py-2.5 text-right">
                      {approval.status === '待审批' ? (
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => handleApprovalDecision(approval.id, '审批拒绝')} className="px-2 py-1 rounded border border-[var(--danger)]/40 text-[var(--danger)]">拒绝</button>
                          <button type="button" onClick={() => handleApprovalDecision(approval.id, '审批通过')} className="px-2 py-1 rounded bg-[var(--primary)] text-white">通过</button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)]">{approval.approvedAt || '等待处理'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
