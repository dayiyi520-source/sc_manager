import React, { useMemo, useState } from 'react';
import { Empty } from 'antd';
import './approval-center.css';
import {
  FileCheck,
  Search,
  Clock,
  CheckCircle2,
  Stamp,
  ShieldCheck,
  FileText,
  Send
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer } from '../common/UIComponents';
import { ComprehensivePage } from '../comprehensive/ComprehensivePage';
import { ApprovalFlow } from '../../types';
import { pendingFor, reviewedBy } from '../workbench/workbenchListRules';

export const ApprovalCenterView: React.FC = () => {
  const {
    approvals,
    currentUser,
    selectedApprovalIdForDetail,
    setSelectedApprovalIdForDetail,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'pending' | 'my_applied' | 'cc_me' | 'reviewed' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [applicantFilter, setApplicantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Active detail flow
  const detailFlow = approvals.find((a) => a.id === selectedApprovalIdForDetail) || null;

  const displayStatus = (status: string) => status === '已通过' ? '已完成' : status === '已撤销' ? '已驳回' : status;
  const currentDate = new Date();
  const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const todayCount = approvals.filter(approval => approval.submittedAt.slice(0, 10) === today).length;
  const inProgressCount = approvals.filter(approval => displayStatus(approval.status) === '审批中').length;
  const completedCount = approvals.filter(approval => ['已完成', '已驳回'].includes(displayStatus(approval.status))).length;
  const averageHours = useMemo(() => {
    const durations = approvals.flatMap(approval => {
      if (displayStatus(approval.status) !== '已完成' || !approval.completedAt) return [];
      const start = Date.parse(approval.submittedAt.replace(' ', 'T'));
      const end = Date.parse(approval.completedAt.replace(' ', 'T'));
      return Number.isFinite(start) && Number.isFinite(end) && end >= start ? [(end - start) / 3600000] : [];
    });
    return durations.length ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;
  }, [approvals]);

  const filteredApprovals = approvals.filter((a) => {
    // Tab filtering
    if (activeTab === 'pending' && !pendingFor(a, currentUser.name)) return false;
    if (activeTab === 'my_applied' && a.applicantName !== currentUser.name) return false;
    if (activeTab === 'cc_me' && !a.ccNames?.includes(currentUser.name)) return false;
    if (activeTab === 'reviewed' && !reviewedBy(a, currentUser.name)) return false;

    // Search query
    const matchQ =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.relatedCustomer && a.relatedCustomer.toLowerCase().includes(searchQuery.toLowerCase()));

    // Type
    const matchType = typeFilter === 'all' || a.type === typeFilter;
    const matchApplicant = applicantFilter === 'all' || a.applicantName === applicantFilter;
    const matchStatus = statusFilter === 'all' || displayStatus(a.status) === statusFilter;

    return matchQ && matchType && matchApplicant && matchStatus;
  });

  const pendingCount = approvals.filter((a) => pendingFor(a, currentUser.name)).length;
  const currentNodeLabel = (flow: ApprovalFlow) => flow.status === '已完成'
    ? '已完成'
    : flow.nodes.find(node => node.status === 'current')?.title || '—';

  return (
    <ComprehensivePage title="审批管理" description="集中处理待办审批，并跟踪申请与历史记录" icon={<FileCheck className="w-5 h-5" />} hideHeader>
    <div className="approval-center space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="今日发起"
          value={`${todayCount} 笔`}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="审批中"
          value={`${inProgressCount} 笔`}
          icon={<Send className="w-5 h-5" />}
        />
        <StatCard
          title="已审批"
          value={`${completedCount} 笔`}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          title="审批平均耗时"
          value={`${averageHours.toFixed(1)} 小时`}
          icon={<Stamp className="w-5 h-5" />}
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-main)]">
          <div className="approval-category-tabs flex items-center gap-2 overflow-x-auto" role="group" aria-label="审批分类">
            <button
              aria-pressed={activeTab === 'pending'}
              onClick={() => setActiveTab('pending')}
              className={`approval-category-tab text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'pending' ? 'is-active' : ''}`}
            >
              <Clock className="w-3.5 h-3.5" />
              待我审批
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-[var(--bg-overlay)] text-[var(--text-on-primary)] text-[11px] rounded-full font-mono">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              aria-pressed={activeTab === 'my_applied'}
              onClick={() => setActiveTab('my_applied')}
              className={`approval-category-tab text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'my_applied' ? 'is-active' : ''}`}
            >
              <Send className="w-3.5 h-3.5" />
              我发起的
            </button>
            <button aria-pressed={activeTab === 'cc_me'} onClick={() => setActiveTab('cc_me')} className={`approval-category-tab text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'cc_me' ? 'is-active' : ''}`}><ShieldCheck className="w-3.5 h-3.5" />抄送我的</button>
            <button aria-pressed={activeTab === 'reviewed'} onClick={() => setActiveTab('reviewed')} className={`approval-category-tab text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'reviewed' ? 'is-active' : ''}`}><CheckCircle2 className="w-3.5 h-3.5" />我已审批</button>
            <button
              aria-pressed={activeTab === 'all'}
              onClick={() => setActiveTab('all')}
              className={`approval-category-tab text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'all' ? 'is-active' : ''}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              全部
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="approval-filter-bar">
          <div className="approval-search-field">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索审批单号、主题或关联内容"
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--primary)]"
            />
          </div>

          <div className="approval-filter-selects">
            <select aria-label="申请人筛选" value={applicantFilter} onChange={event => setApplicantFilter(event.target.value)} className="px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-body)] focus:outline-hidden focus:border-[var(--primary)]">
              <option value="all">所有申请人</option>
              {[...new Set(approvals.map(approval => approval.applicantName))].map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <select aria-label="审批状态筛选" value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="px-3 py-1.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-body)] focus:outline-hidden focus:border-[var(--primary)]">
              <option value="all">所有审批状态</option>
              {['待审批', '审批中', '已驳回', '已完成'].map(status => <option key={status} value={status}>{status}</option>)}
            </select>
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
              <option value="补卡审批">补卡审批</option>
              <option value="请假审批">请假审批</option>
              <option value="考勤异常申诉审批">考勤异常申诉审批</option>
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
                <th className="py-3 px-3">当前节点</th>
                <th className="py-3 px-3">申请人 / 部门</th>
                <th className="py-3 px-3">申请时间</th>
                <th className="py-3 px-3">当前状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {filteredApprovals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center"><Empty description="暂无符合条件的审批流转记录" />
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
                    <td className="py-3 px-3 text-[var(--text-body)]">{currentNodeLabel(item)}</td>
                    <td className="py-3 px-3">
                      <div className="text-[var(--text-primary)] font-medium">{item.applicantName}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{item.applicantDept}</div>
                    </td>
                    <td className="py-3 px-3 text-[var(--text-muted)] font-mono">
                      {item.submittedAt}
                    </td>
                    <td className="py-3 px-3">
                      <StatusTag status={displayStatus(item.status)} />
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
              <StatusTag status={displayStatus(detailFlow.status)} />
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

          </div>
        </Drawer>
      )}

    </div>
    </ComprehensivePage>
  );
};
