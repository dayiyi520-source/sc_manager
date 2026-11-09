import React, { useState } from 'react';
import { Empty } from 'antd';
import './approval-center.css';
import {
  FileCheck,
  Search,
  Filter,
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
import { ComprehensivePage } from '../comprehensive/ComprehensivePage';
import { ApprovalFlow } from '../../types';
import { pendingFor, reviewedBy } from '../workbench/workbenchListRules';

export const ApprovalCenterView: React.FC = () => {
  const {
    approvals,
    currentUser,
    approveFlow,
    rejectFlow,
    selectedApprovalIdForDetail,
    setSelectedApprovalIdForDetail,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'my_applied' | 'cc_me' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fast action states
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [actionTargetFlow, setActionTargetFlow] = useState<ApprovalFlow | null>(null);
  const [actionComment, setActionComment] = useState('');

  // Active detail flow
  const detailFlow = approvals.find((a) => a.id === selectedApprovalIdForDetail) || null;

  // Filtered list based on active tab
  const filteredApprovals = approvals.filter((a) => {
    // Tab filtering
    if (activeTab === 'pending' && !pendingFor(a, currentUser.name)) return false;
    if (activeTab === 'reviewed' && !reviewedBy(a, currentUser.name)) return false;
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

  const pendingCount = approvals.filter((a) => pendingFor(a, currentUser.name)).length;
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

  return (
    <ComprehensivePage title="审批管理" description="集中处理待办审批，并跟踪申请与历史记录" icon={<FileCheck className="w-5 h-5" />} hideHeader>
    <div className="approval-center space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="待我审批"
          value={`${pendingCount} 笔`}
          icon={<Clock className="w-5 h-5" />}
          onClick={() => setActiveTab('pending')}
        />
        <StatCard
          title="我发起的"
          value={`${myAppliedCount} 笔`}
          icon={<Send className="w-5 h-5" />}
          onClick={() => setActiveTab('my_applied')}
        />
        <StatCard
          title="已通过审批"
          value={`${passedCount} 笔`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          onClick={() => setActiveTab('history')}
        />
        <StatCard
          title="审批平均耗时"
          value="4.2 小时"
          icon={<Stamp className="w-5 h-5" />}
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-4">
          <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="审批分类">
            <button
              aria-pressed={activeTab === 'pending'}
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-[var(--primary)] text-[var(--text-on-primary)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              待我审批
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[var(--bg-overlay)] text-[var(--text-on-primary)] text-[11px] rounded-full font-mono">
                  {pendingCount}
                </span>
              )}
            </button>
            <button aria-pressed={activeTab === 'reviewed'} onClick={() => setActiveTab('reviewed')} className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'reviewed' ? 'bg-[var(--primary)] text-[var(--text-on-primary)] font-semibold' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'}`}><CheckCircle2 className="w-3.5 h-3.5" />我已审批</button>
            <button
              aria-pressed={activeTab === 'my_applied'}
              onClick={() => setActiveTab('my_applied')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'my_applied'
                  ? 'bg-[var(--primary)] text-[var(--text-on-primary)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              我发起的
            </button>
            <button
              aria-pressed={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[var(--primary)] text-[var(--text-on-primary)] font-semibold shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              已办历史
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
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-body)] focus:outline-hidden focus:border-[var(--primary)]"
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
          <table className="w-full text-left text-sm">
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
                  <td colSpan={8} className="py-8 text-center"><Empty description="暂无符合条件的审批流转记录" />
                  </td>
                </tr>
              ) : (
                filteredApprovals.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer group"
                    tabIndex={0}
                    role="button"
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedApprovalIdForDetail(item.id); } }}
                    onClick={() => setSelectedApprovalIdForDetail(item.id)}
                  >
                    <td className="py-3 px-3 font-mono font-medium text-[var(--active-text)]">
                      {item.code}
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <div className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--active-text)] transition-colors">
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
                      <div className="text-[var(--text-primary)] font-medium">{item.applicantName}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{item.applicantDept}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-[var(--text-primary)]">
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
                        {pendingFor(item, currentUser.name) ? (
                          <>
                            <button
                              onClick={() => handleOpenAction(item, 'approve')}
                              className="px-2 py-1 bg-[color-mix(in_srgb,var(--success)_12%,var(--bg-surface))] hover:bg-[color-mix(in_srgb,var(--success)_20%,var(--bg-surface))] text-[var(--success)] border border-[var(--success)] rounded text-[11px] font-medium transition-colors"
                            >
                              同意
                            </button>
                            <button
                              onClick={() => handleOpenAction(item, 'reject')}
                              className="px-2 py-1 bg-[color-mix(in_srgb,var(--danger)_12%,var(--bg-surface))] hover:bg-[color-mix(in_srgb,var(--danger)_20%,var(--bg-surface))] text-[var(--danger)] border border-[var(--danger)] rounded text-[11px] font-medium transition-colors"
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
          title={<span className="font-sans tracking-normal">审批详情：{detailFlow.code}</span>}
          subtitle={detailFlow.title}
          width="max-w-2xl"
          contentClassName="approval-detail-content overflow-y-auto"
        >
          <div className="space-y-6 text-sm">
            {/* Header info bar */}
            <div className="p-4 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[var(--text-body)] text-xs">申请人与发起时间</div>
                <div className="font-semibold text-[var(--text-primary)] mt-1 flex flex-wrap items-center gap-2 text-sm break-words">
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
              <h4 className="font-semibold text-base text-[var(--text-primary)] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--active-text)]" />
                审批表单内容
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(detailFlow.contentDetails || {}).map(([k, v]) => (
                  <div key={k} className="p-4 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)]">
                    <div className="text-xs text-[var(--text-body)]">{k}</div>
                    <div className="text-[var(--text-primary)] font-medium mt-1 break-all">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow Timeline */}
            <div className="space-y-3">
              <h4 className="font-semibold text-base text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--active-text)]" />
                审批流转节点与审批意见
              </h4>
              <div className="space-y-3 pl-2 border-l-2 border-[var(--border-main)] ml-2">
                {detailFlow.nodes.map((node, idx) => {
                  let statusColor = 'bg-[var(--text-muted)] text-[var(--text-on-primary)]';
                  if (node.status === 'passed') statusColor = 'bg-[var(--success)] text-[var(--text-on-primary)]';
                  if (node.status === 'current') statusColor = 'bg-[var(--primary)] text-[var(--text-on-primary)]';
                  if (node.status === 'rejected') statusColor = 'bg-[var(--danger)] text-[var(--text-on-primary)]';

                  return (
                    <div key={idx} className="relative pl-5 pb-2 space-y-1">
                      <div
                        className={`absolute -left-[17px] top-0.5 w-3.5 h-3.5 rounded-full ${statusColor} flex items-center justify-center text-[9px] font-bold`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">{node.title}</span>
                        <span className="text-xs text-[var(--text-muted)] font-mono">
                          {node.time || (node.status === 'current' ? '处理中...' : '等待中')}
                        </span>
                      </div>
                      <div className="text-[var(--text-body)] text-xs">
                        审核人：<span className="text-[var(--text-primary)]">{node.approver}</span> ({node.role})
                      </div>
                      {node.comment && (
                        <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-body)] text-xs mt-2 break-words">
                          “{node.comment}”
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions button footer */}
            {pendingFor(detailFlow, currentUser.name) && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-main)]">
                <button
                  onClick={() => handleOpenAction(detailFlow, 'reject')}
                  className="px-4 py-2 bg-[color-mix(in_srgb,var(--danger)_12%,var(--bg-surface))] hover:bg-[color-mix(in_srgb,var(--danger)_20%,var(--bg-surface))] text-[var(--danger)] border border-[var(--danger)] rounded-md font-medium text-xs transition-colors"
                >
                  驳回申请
                </button>
                <button
                  onClick={() => handleOpenAction(detailFlow, 'approve')}
                  className="px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-on-primary)] font-semibold rounded-md text-xs transition-colors shadow-sm"
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
        title={<span className="approval-modal-title">{actionType === 'approve' ? '确认通过审批' : '确认驳回审批'}</span>}
        subtitle={actionTargetFlow?.title}
      >
        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <label className="text-[var(--text-body)]">审批意见 / 批复说明</label>
            <textarea
              rows={3}
              value={actionComment}
              onChange={(e) => setActionComment(e.target.value)}
              className="w-full p-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActionModalOpen(false)}
              className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface-soft)] text-[var(--text-primary)] border border-[var(--border-main)] rounded-md text-sm transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              className={`px-4 py-2 font-semibold rounded-md text-sm transition-colors ${
                actionType === 'approve'
                  ? 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-on-primary)]'
                  : 'bg-[var(--danger)] hover:opacity-90 text-[var(--text-on-primary)]'
              }`}
            >
              确认{actionType === 'approve' ? '通过' : '驳回'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
    </ComprehensivePage>
  );
};
