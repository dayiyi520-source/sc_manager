import React, { useState } from 'react';
import {
  CheckSquare,
  FileCheck,
  Users,
  Briefcase,
  Layers,
  Target,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Calendar,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Filter,
  Plus
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';
import { WORKBENCH_FEEDS } from '../../data/mockData';

export const MyTasksView: React.FC = () => {
  const {
    openPageTab,
    customers,
    opportunities,
    requirementTasks,
    approvals,
    okrs,
    currentUser
  } = useApp();

  // Card Tab States
  const [todoTab, setTodoTab] = useState<'pending' | 'completed'>('pending');
  const [approvalTab, setApprovalTab] = useState<'pending' | 'my_apply' | 'cc_me' | 'approved'>('pending');
  const [feedTab, setFeedTab] = useState<'dynamic' | 'feedback' | 'supervise'>('dynamic');

  // Pending requirements/tasks for this user
  const pendingTodos = requirementTasks.filter((t) => t.status !== '已发布');
  const completedTodos = requirementTasks.filter((t) => t.status === '已发布');

  // Filtered approvals based on tab
  const filteredApprovals = approvals.filter((a) => {
    if (approvalTab === 'pending') return a.status === '待审批';
    if (approvalTab === 'my_apply') return a.applicantName === currentUser.name;
    if (approvalTab === 'cc_me') return true;
    return a.status === '已通过' || a.status === '已驳回';
  });

  // User's own OKRs
  const myOkr = okrs.find((o) => o.category === 'my') || okrs[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-todo"
          title="待办事项"
          value={pendingTodos.length}
          unit="项"
          icon={<CheckSquare className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          onClick={() => openPageTab('prod_req_tasks')}
        />
        <StatCard
          id="stat-approvals"
          title="待办审批"
          value={approvals.filter((a) => a.status === '待审批').length}
          unit="单"
          icon={<FileCheck className="w-5 h-5" />}
          iconBgColor="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          onClick={() => openPageTab('approval_center')}
        />
        <StatCard
          id="stat-customers"
          title="跟进客户数"
          value={customers.length}
          unit="家"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
          onClick={() => openPageTab('crm_customers')}
        />
        <StatCard
          id="stat-opps"
          title="商机总额"
          value="1443"
          unit="万元"
          icon={<Briefcase className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
          onClick={() => openPageTab('crm_opportunities')}
        />
      </div>

      {/* Main Grid Section: paired rows keep related cards at matching heights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card 1: 待办中心 */}
          <div className="workspace-card lg:col-span-7 h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  待办中心
                </div>
                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setTodoTab('pending')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      todoTab === 'pending'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    待处理 ({pendingTodos.length})
                  </button>
                  <button
                    onClick={() => setTodoTab('completed')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      todoTab === 'completed'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    已处理 ({completedTodos.length})
                  </button>
                </div>
              </div>

              {/* Jump to all */}
              <button
                onClick={() => openPageTab('prod_req_tasks')}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 font-medium group"
              >
                <span>查看全部</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* List Content */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {(todoTab === 'pending' ? pendingTodos : completedTodos).slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusTag status={task.priority} />
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>产品线：{task.productLineName}</span>
                      <span>·</span>
                      <span>版本：{task.versionName}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Clock className="w-3 h-3" />
                        预计截止：{task.dueDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {todoTab === 'pending' ? (
                      <button
                        onClick={() => openPageTab('prod_req_tasks')}
                        className="tech-button-primary px-2.5 py-1.5 rounded-md font-medium text-xs transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        去处理
                      </button>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        已完成
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: 审批流程 */}
          <div className="workspace-card lg:col-span-5 h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  审批流程
                </div>
                {/* 4 Tabs */}
                <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setApprovalTab('pending')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      approvalTab === 'pending'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    待审批
                  </button>
                  <button
                    onClick={() => setApprovalTab('my_apply')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      approvalTab === 'my_apply'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    我发起的
                  </button>
                  <button
                    onClick={() => setApprovalTab('cc_me')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      approvalTab === 'cc_me'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    抄送我的
                  </button>
                  <button
                    onClick={() => setApprovalTab('approved')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      approvalTab === 'approved'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    已审批
                  </button>
                </div>
              </div>

              <button
                onClick={() => openPageTab('approval_center')}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 font-medium group"
              >
                <span>查看全部</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredApprovals.length === 0 ? (
                <div className="p-8 text-center text-slate-400">当前没有需要处理的审批流程</div>
              ) : (
                filteredApprovals.map((appr) => (
                  <div
                    key={appr.id}
                    className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                          <span className="font-semibold truncate">{appr.type}</span>
                          <span className="text-slate-400 shrink-0">· {appr.applicantName}</span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 leading-relaxed truncate max-w-[230px]" title={appr.title}>{appr.title.replace(/^【[^】]+】\s*/, '')}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusTag status={appr.status === '待审批' ? '待审批' : '已审批'} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 3: 我的OKR */}
          <div className="workspace-card lg:col-span-7 h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-sm text-slate-900 dark:text-white">我的 OKR（本月）</span>
              </div>
              <button
                onClick={() => openPageTab('wb_okr_perf')}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1 group"
              >
                <span>OKR 复盘总结</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* O Item */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded text-[10px] font-bold">
                      O1
                    </span>
                    <span className="truncate max-w-[240px]">{myOkr.objective}</span>
                  </div>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{myOkr.progress}%</span>
                </div>
                {/* Progress bar */}
                <div className="tech-progress-track w-full h-2 rounded-full overflow-hidden">
                  <div
                    className="tech-progress-fill h-full rounded-full transition-all duration-500"
                    style={{ width: `${myOkr.progress}%` }}
                  />
                </div>
              </div>

              {/* KRs */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  关键结果支撑 (KR)
                </span>
                {myOkr.keyResults.map((kr, idx) => (
                  <div key={kr.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        KR{idx + 1}: {kr.content}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                        {kr.progress}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>权重: {kr.weight}%</span>
                      <span>截止: {kr.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 4: 动态与评价 */}
          <div className="workspace-card lg:col-span-5 h-full flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  动态与评价
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setFeedTab('dynamic')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      feedTab === 'dynamic'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    产品动态
                  </button>
                  <button
                    onClick={() => setFeedTab('feedback')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      feedTab === 'feedback'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    评价吐槽
                  </button>
                  <button
                    onClick={() => setFeedTab('supervise')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      feedTab === 'supervise'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    督办事项
                  </button>
                </div>
              </div>
            </div>

            {/* Feeds Timeline */}
            <div className="p-5 max-h-80 overflow-y-auto text-xs">
              {feedTab === 'dynamic' ? (
                <div className="relative ml-2 border-l border-blue-200 dark:border-blue-900/70 pl-5 space-y-5">
                  {WORKBENCH_FEEDS.filter((f) => f.type === 'dynamic').map((feed) => (
                    <div key={feed.id} className="relative space-y-1.5">
                      <span className="absolute -left-[26px] top-0.5 w-3 h-3 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-900" />
                      <div className="text-[11px] text-slate-400">{feed.time}</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{feed.title}</div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{feed.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {WORKBENCH_FEEDS.filter((f) => f.type === feedTab).map((feed) => (
                    <div key={feed.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]"><span className="font-semibold text-slate-800 dark:text-slate-200">{feed.title}</span><span className="text-slate-400">{feed.time}</span></div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{feed.content}</p>
                      <div className="text-[11px] text-slate-400">{feed.customer || feed.author}</div>
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
