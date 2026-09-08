import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Stamp,
  Building,
  DollarSign,
  ChevronRight,
  User,
  MessageSquare,
  ShieldCheck,
  Send,
  RefreshCw,
  FileText,
  ArrowRight
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { ApprovalFlow } from '../../types';

export const ApprovalCenterView: React.FC = () => {
  const {
    approvals,
    setApprovals,
    currentUser,
    approveFlow,
    rejectFlow,
    selectedApprovalIdForDetail,
    setSelectedApprovalIdForDetail,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pending' | 'my_applied' | 'cc_me' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fast action states
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionTargetFlow, setActionTargetFlow] = useState<ApprovalFlow | null>(null);
  const [actionComment, setActionComment] = useState('');

  // New Approval modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState<ApprovalFlow['type']>('合同用印审批');
  const [formCustomer, setFormCustomer] = useState('国家电网华东分部数智调度中心');
  const [formProduct, setFormProduct] = useState('师创智联协同OS');
  const [formAmount, setFormAmount] = useState(1200000);
  const [formReason, setFormReason] = useState('');

  // Active detail flow
  const detailFlow = approvals.find((a) => a.id === selectedApprovalIdForDetail) || null;

  // Filtered list based on active tab
  const filteredApprovals = approvals.filter((a) => {
    // Tab filtering
    if (activeTab === 'pending' && a.status !== '待审批') return false;
    if (activeTab === 'my_applied' && a.applicantName !== currentUser.name) return false;
    if (activeTab === 'history' && a.status === '待审批') return false;

    // Search query
    const matchQ =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.relatedCustomer && a.relatedCustomer.toLowerCase().includes(searchQuery.toLowerCase()));

    // Type
    const matchType = typeFilter === 'all' || a.type === typeFilter;

    return matchQ && matchType;
  });

  const pendingCount = approvals.filter((a) => a.status === '待审批').length;
  const myAppliedCount = approvals.filter((a) => a.applicantName === currentUser.name).length;
  const passedCount = approvals.filter((a) => a.status === '已通过').length;

  const handleOpenAction = (flow: ApprovalFlow, type: 'approve' | 'reject') => {
    setActionTargetFlow(flow);
    setActionType(type);
    setActionComment(type === 'approve' ? '同意，符合公司业务规范。' : '驳回，请补充更详细的技术方案说明。');
    setActionModalOpen(true);
  };

  const handleConfirmAction = () => {
    if (!actionTargetFlow) return;
    if (actionType === 'approve') {
      approveFlow(actionTargetFlow.id, actionComment);
    } else {
      rejectFlow(actionTargetFlow.id, actionComment);
    }
    setActionModalOpen(false);
    setActionTargetFlow(null);
  };

  const handleCreateApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', '请填写审批流程主题');
      return;
    }

    const newApproval: ApprovalFlow = {
      id: `appr-${Date.now()}`,
      code: `APPR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: formTitle,
      type: formType,
      applicantName: currentUser.name,
      applicantDept: currentUser.department,
      status: '待审批',
      relatedCustomer: formCustomer,
      relatedProduct: formProduct,
      amount: formAmount,
      submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      nodes: [
        {
          title: '发起申请',
          approver: currentUser.name,
          role: currentUser.roleTitle,
          status: 'passed',
          time: new Date().toISOString().replace('T', ' ').substring(0, 16),
          comment: formReason || '请领导审批'
        },
        {
          title: '部门主管审核',
          approver: '林志豪',
          role: '平台技术委员会',
          status: 'current'
        },
        {
          title: '总经理终审',
          approver: '总经办',
          role: '总经理',
          status: 'waiting'
        }
      ],
      contentDetails: {
        '审批主题': formTitle,
        '关联合同/客户': formCustomer,
        '关联产品线': formProduct,
        '涉及金额': `¥ ${formAmount.toLocaleString()} 元`,
        '申请说明': formReason || '无补充说明'
      }
    };

    setApprovals((prev) => [newApproval, ...prev]);
    setIsNewModalOpen(false);
    setFormTitle('');
    setFormReason('');
    addToast('success', '审批申请已成功提交', `单号：${newApproval.code}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="待我审批"
          value={`${pendingCount} 笔`}
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-[color-mix(in_srgb,var(--warning)_10%,var(--bg-surface))] text-[var(--warning)] border border-[color-mix(in_srgb,var(--warning)_20%,var(--border-main))]"
          onClick={() => setActiveTab('pending')}
        />
        <StatCard
          title="我发起的"
          value={`${myAppliedCount} 笔`}
          icon={<Send className="w-5 h-5" />}
          iconBgColor="bg-sky-500/10 text-sky-400 border border-sky-500/20"
          onClick={() => setActiveTab('my_applied')}
        />
        <StatCard
          title="已通过审批"
          value={`${passedCount} 笔`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          onClick={() => setActiveTab('history')}
        />
        <StatCard
          title="审批平均耗时"
          value="4.2 小时"
          icon={<Stamp className="w-5 h-5" />}
          iconBgColor="bg-purple-500/10 text-purple-400 border border-purple-500/20"
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg p-5 shadow-sm space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              待我审批
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-black/20 text-black text-[10px] rounded-full font-mono">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('my_applied')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'my_applied'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              我发起的
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              已办历史
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="px-3.5 py-1.5 bg-[var(--warning)] text-black hover:bg-[var(--accent-gold-hover)] font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              发起新审批
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="按审批单号、主题、申请人、关联合同或客户搜索..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-body)] focus:outline-hidden focus:border-[var(--warning)]"
            >
              <option value="all">所有审批类型</option>
              <option value="合同用印审批">合同用印审批</option>
              <option value="商机特批报价">商机特批报价</option>
              <option value="招投标立项">招投标立项</option>
              <option value="需求重大变更">需求重大变更</option>
              <option value="采购与报销">采购与报销</option>
            </select>
          </div>
        </div>

        {/* List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-main)] bg-[var(--bg-main)] text-[var(--text-muted)]">
                <th className="py-3 px-3">审批单号</th>
                <th className="py-3 px-3">审批事项与主题</th>
                <th className="py-3 px-3">审批类型</th>
                <th className="py-3 px-3">申请人 / 部门</th>
                <th className="py-3 px-3">关联标的 / 金额</th>
                <th className="py-3 px-3">申请时间</th>
                <th className="py-3 px-3">当前状态</th>
                <th className="py-3 px-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {filteredApprovals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--text-muted)]">
                    暂无符合条件的审批流转记录
                  </td>
                </tr>
              ) : (
                filteredApprovals.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer group"
                    onClick={() => setSelectedApprovalIdForDetail(item.id)}
                  >
                    <td className="py-3 px-3 font-mono font-medium text-[var(--warning)]">
                      {item.code}
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--warning)] transition-colors">
                        {item.title}
                      </div>
                      {item.relatedCustomer && (
                        <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                          {item.relatedCustomer}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-body)] text-[11px]">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-white font-medium">{item.applicantName}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{item.applicantDept}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-white">
                      {item.amount ? `¥${(item.amount / 10000).toFixed(0)}万` : '-'}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-muted)] font-mono">
                      {item.submittedAt}
                    </td>
                    <td className="py-3 px-3">
                      <StatusTag status={item.status} />
                    </td>
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {item.status === '待审批' ? (
                          <>
                            <button
                              onClick={() => handleOpenAction(item, 'approve')}
                              className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-medium transition-colors"
                            >
                              同意
                            </button>
                            <button
                              onClick={() => handleOpenAction(item, 'reject')}
                              className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded text-[11px] font-medium transition-colors"
                            >
                              驳回
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setSelectedApprovalIdForDetail(item.id)}
                            className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)] text-xs"
                          >
                            详情 <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approval Details Drawer */}
      {detailFlow && (
        <Drawer
          isOpen={!!detailFlow}
          onClose={() => setSelectedApprovalIdForDetail(null)}
          title={`审批详情：${detailFlow.code}`}
          subtitle={detailFlow.title}
          size="lg"
        >
          <div className="space-y-6 text-xs">
            {/* Header info bar */}
            <div className="p-4 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)] flex items-center justify-between">
              <div>
                <div className="text-[var(--text-muted)] text-[11px]">申请人与发起时间</div>
                <div className="font-semibold text-white mt-1 flex items-center gap-2 text-sm">
                  {detailFlow.applicantName} ({detailFlow.applicantDept})
                  <span className="text-xs text-[var(--text-muted)] font-mono font-normal">
                    {detailFlow.submittedAt}
                  </span>
                </div>
              </div>
              <StatusTag status={detailFlow.status} />
            </div>

            {/* Structured details key-value */}
            <div className="space-y-3">
              <h4 className="font-serif font-semibold text-sm text-white tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--warning)]" />
                审批表单内容
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(detailFlow.contentDetails || {}).map(([k, v]) => (
                  <div key={k} className="p-3 rounded bg-[var(--bg-main)] border border-[var(--border-main)]">
                    <div className="text-[11px] text-[var(--text-muted)]">{k}</div>
                    <div className="text-white font-medium mt-1 font-mono">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow Timeline */}
            <div className="space-y-3">
              <h4 className="font-serif font-semibold text-sm text-white tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--warning)]" />
                审批流转节点与审批意见
              </h4>
              <div className="space-y-3 pl-2 border-l-2 border-[var(--border-main)] ml-2">
                {detailFlow.nodes.map((node, idx) => {
                  let statusColor = 'bg-[var(--text-muted)] text-black';
                  if (node.status === 'passed') statusColor = 'bg-emerald-500 text-black';
                  if (node.status === 'current') statusColor = 'bg-[var(--warning)] text-black animate-pulse';
                  if (node.status === 'rejected') statusColor = 'bg-rose-500 text-white';

                  return (
                    <div key={idx} className="relative pl-5 pb-2 space-y-1">
                      <div
                        className={`absolute -left-[17px] top-0.5 w-3.5 h-3.5 rounded-full ${statusColor} flex items-center justify-center text-[9px] font-bold`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{node.title}</span>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">
                          {node.time || (node.status === 'current' ? '处理中...' : '等待中')}
                        </span>
                      </div>
                      <div className="text-[var(--text-muted)] text-[11px]">
                        审核人：<span className="text-white">{node.approver}</span> ({node.role})
                      </div>
                      {node.comment && (
                        <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-body)] text-[11px] mt-1">
                          “{node.comment}”
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions button footer */}
            {detailFlow.status === '待审批' && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-main)]">
                <button
                  onClick={() => handleOpenAction(detailFlow, 'reject')}
                  className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-md font-medium text-xs transition-colors"
                >
                  驳回申请
                </button>
                <button
                  onClick={() => handleOpenAction(detailFlow, 'approve')}
                  className="px-5 py-2 bg-[var(--warning)] hover:bg-[var(--accent-gold-hover)] text-black font-semibold rounded-md text-xs transition-colors shadow-sm"
                >
                  同意审批
                </button>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* Fast Action Modal (Approve / Reject) */}
      <Modal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={actionType === 'approve' ? '确认通过审批' : '确认驳回审批'}
        subtitle={actionTargetFlow?.title}
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)]">审批意见 / 批复说明</label>
            <textarea
              rows={3}
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              className="w-full p-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActionModalOpen(false)}
              className="px-3.5 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-body)] rounded-md text-xs"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              className={`px-4 py-1.5 font-semibold rounded-md text-xs ${
                actionType === 'approve'
                  ? 'bg-[var(--warning)] hover:bg-[var(--accent-gold-hover)] text-black'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              确认{actionType === 'approve' ? '通过' : '驳回'}
            </button>
          </div>
        </div>
      </Modal>

      {/* New Approval Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="发起新审批流程"
        subtitle="提交合同用印、商机特批、招投标立项或需求重大变更"
      >
        <form onSubmit={handleCreateApproval} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)]">审批事项主题 *</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="例如：【合同用印】国家电网华东二期扩容合同签署审批"
              className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)]">审批类型</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              >
                <option value="合同用印审批">合同用印审批</option>
                <option value="商机特批报价">商机特批报价</option>
                <option value="招投标立项">招投标立项</option>
                <option value="需求重大变更">需求重大变更</option>
                <option value="采购与报销">采购与报销</option>
                <option value="合作伙伴准入">合作伙伴准入</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)]">涉及标的金额 (元)</label>
              <input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-[var(--text-primary)] font-mono focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)]">关联客户 / 机构</label>
              <input
                type="text"
                value={formCustomer}
                onChange={(e) => setFormCustomer(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[var(--text-muted)]">关联产品线</label>
              <input
                type="text"
                value={formProduct}
                onChange={(e) => setFormProduct(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--warning)]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[var(--text-muted)]">申请说明 / 交付背景</label>
            <textarea
              rows={3}
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="说明业务背景、用印类型或特殊折扣依据..."
              className="w-full p-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--warning)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-3.5 py-1.5 bg-[var(--bg-elevated)] hover:bg-[var(--border-subtle)] text-[var(--text-body)] rounded-md text-xs"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[var(--warning)] hover:bg-[var(--accent-gold-hover)] text-black font-semibold rounded-md text-xs shadow-sm"
            >
              提交审批
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
