import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  FileCheck,
  Users,
  Briefcase,
  Target,
  Clock,
  ArrowRight,
  CheckCircle2,
  Calendar,
  MessageSquare,
  AlertCircle,
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';
import { StatusBadge } from '@/components/common';
import { WORKBENCH_FEEDS } from '../../data/mockData';
import { requirementRepository } from '../../services/requirementRepository';

type MyTaskRecord = {
  id: string;
  type: string;
  title: string;
  status: string;
  assigneeName?: string;
  time?: string;
  dueDate?: string;
  progress?: number;
  overdueRisk?: boolean;
  taskGroup: 'mine' | 'assist';
  targetPage: string;
  sourceId: string;
};

type TabType = 'all' | 'mine' | 'assist';
type ApprovalTabType = 'pending' | 'my_apply' | 'cc_me';
type FeedTabType = 'dynamic' | 'feedback' | 'competitor';

export const MyTasksView: React.FC = () => {
  const {
    openPageTab,
    customers,
    approvals,
    okrs,
    currentUser
  } = useApp();

  const [todoTab, setTodoTab] = useState<TabType>('all');
  const [approvalTab, setApprovalTab] = useState<ApprovalTabType>('pending');
  const [feedTab, setFeedTab] = useState<FeedTabType>('dynamic');
  const [realTasks, setRealTasks] = useState<MyTaskRecord[]>([]);
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setTaskLoading(true);
    setTaskError(null);
    requirementRepository.myTasks(currentUser.id)
      .then((items) => { if (active) setRealTasks(Array.isArray(items) ? items : []); })
      .catch((error) => { if (active) { setRealTasks([]); setTaskError(error instanceof Error ? error.message : '产品任务和协助事项服务暂不可用'); } })
      .finally(() => { if (active) setTaskLoading(false); });
    return () => { active = false; };
  }, [currentUser.id]);

  const pendingTodos = useMemo(() => realTasks, [realTasks]);
  const displayTodos = useMemo(() => {
    if (todoTab === 'mine') return realTasks.filter((task) => task.taskGroup === 'mine');
    if (todoTab === 'assist') return realTasks.filter((task) => task.taskGroup === 'assist');
    return realTasks;
  }, [realTasks, todoTab]);

  // 审批筛选
  const filteredApprovals = approvals.filter((a) => {
    if (approvalTab === 'pending') return a.status === '待审批' && a.nodes.some((node) => node.approver === currentUser.name && node.status === 'current');
    if (approvalTab === 'my_apply') return a.applicantName === currentUser.name && ['审批中', '待审批', '已驳回'].includes(a.status);
    return (a.ccNames || []).includes(currentUser.name) && ['审批中', '待审批'].includes(a.status);
  });

  // 获取用户OKR
  const currentCycle = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const myOkr = okrs.find((o) => o.cycle === currentCycle && (o.ownerId === currentUser.id || o.keyResults.some((keyResult) => keyResult.assigneeIds?.includes(currentUser.id))));

  // Tab组件
  const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
        active
          ? 'bg-[var(--bg-surface)] text-[var(--primary)] shadow-sm'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* 顶部核心指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="待办事项"
          value={pendingTodos.length}
          unit="项"
          icon={<CheckSquare className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          onClick={() => openPageTab('prod_req_tasks')}
        />
        <StatCard
          title="待办审批"
          value={approvals.filter((a) => a.status === '待审批' && a.nodes.some((node) => node.approver === currentUser.name && node.status === 'current')).length}
          unit="单"
          icon={<FileCheck className="w-5 h-5" />}
          iconBgColor="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
          onClick={() => openPageTab('approval_center')}
        />
        <StatCard
          title="跟进客户数"
          value={customers.length}
          unit="家"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
          onClick={() => openPageTab('crm_customers')}
        />
        <StatCard
          title="商机总额"
          value="1443"
          unit="万元"
          icon={<Briefcase className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
          onClick={() => openPageTab('crm_opportunities')}
        />
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 待办中心 */}
        <div className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-main)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                待办中心
              </div>
              <div className="flex bg-[var(--bg-surface-soft)] rounded-lg p-0.5">
                <TabButton active={todoTab === 'all'} onClick={() => setTodoTab('all')}>全部 ({pendingTodos.length})</TabButton>
                <TabButton active={todoTab === 'mine'} onClick={() => setTodoTab('mine')}>任务 ({realTasks.filter((task) => task.taskGroup === 'mine').length})</TabButton>
                <TabButton active={todoTab === 'assist'} onClick={() => setTodoTab('assist')}>协助事项 ({realTasks.filter((task) => task.taskGroup === 'assist').length})</TabButton>
              </div>
            </div>
          </div>

          <div className="p-5 max-h-80 overflow-y-auto">
            <div className="space-y-3">
              {taskLoading ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">正在加载我的工作...</div>
              ) : taskError ? (
                <div className="text-center py-8 text-[var(--danger)] text-sm"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-70" /><div>我的工作加载失败，请稍后重试</div><div className="mt-1 text-xs text-[var(--text-muted)]">{taskError}</div></div>
              ) : displayTodos.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  暂无相关工作
                </div>
              ) : (
                displayTodos.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => openPageTab(task.taskGroup === 'assist' ? 'wb_work_order' : task.targetPage)}
                    className="p-4 bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-hover)] border border-[var(--border-main)] rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {task.type === 'assistance' ? <Users className="w-4 h-4 shrink-0 text-[var(--primary)]" /> : <CheckSquare className="w-4 h-4 shrink-0 text-[var(--primary)]" />}
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">{task.title}</div>
                    </div>
                    <div className="flex items-center justify-between gap-3 mb-2 text-xs text-[var(--text-muted)]">
                      <span>负责人：{task.assigneeName || '未分配'}</span>
                      <StatusBadge status={task.status} />
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <Calendar className="w-3 h-3" />
                      <span>截止：{task.dueDate || '未设置'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 审批中心 */}
        <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-main)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[var(--danger)]" />
                审批中心
              </div>
              <div className="flex bg-[var(--bg-surface-soft)] rounded-lg p-0.5">
                <TabButton
                  active={approvalTab === 'pending'}
                  onClick={() => setApprovalTab('pending')}
                >
                  待审批
                </TabButton>
                <TabButton
                  active={approvalTab === 'my_apply'}
                  onClick={() => setApprovalTab('my_apply')}
                >
                  我申请的
                </TabButton>
                <TabButton
                  active={approvalTab === 'cc_me'}
                  onClick={() => setApprovalTab('cc_me')}
                >
                  抄送我的
                </TabButton>
              </div>
            </div>
          </div>

          <div className="p-5 max-h-80 overflow-y-auto">
            <div className="space-y-3">
              {filteredApprovals.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                  <FileCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  暂无审批单据
                </div>
              ) : (
                filteredApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    onClick={() => openPageTab('approval_center')}
                    className="p-4 bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-hover)] border border-[var(--border-main)] rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-sm text-[var(--text-primary)] mb-2 truncate">{approval.title}</div>
                    <div className="flex items-center justify-between gap-3 mb-2 text-xs text-[var(--text-muted)]">
                      <span>申请人：{approval.applicantName}</span>
                      <StatusBadge status={approval.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />
                        <span>{approval.submittedAt}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* OKR进度 */}
        <div className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-main)] flex items-center justify-between">
            <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--warning)]" />
              我的OKR进度
            </div>
            <button
              onClick={() => openPageTab('wb_okr_perf')}
              className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              查看详情
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-5">
            {myOkr ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-[var(--text-primary)] mb-1">
                      {myOkr.objective}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span>周期: {myOkr.cycle}</span>
                      <span>•</span>
                      <span>截止: {myOkr.deadline}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[var(--primary)]">
                      {myOkr.progress}%
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">整体进度</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {myOkr.keyResults.map((kr, idx) => (
                    <div
                      key={kr.id}
                      className="p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm text-[var(--text-primary)] font-medium">
                          KR{idx + 1}: {kr.content}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)] shrink-0">
                          {kr.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-[var(--bg-main)] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[var(--primary)] rounded-full transition-all"
                          style={{ width: `${kr.progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>权重: {kr.weight}%</span>
                        <span>截止: {kr.deadline}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                暂无OKR数据
              </div>
            )}
          </div>
        </div>

        {/* 动态与评价 */}
        <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-main)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--success)]" />
                动态与评价
              </div>
              <div className="flex bg-[var(--bg-surface-soft)] rounded-lg p-0.5">
                <TabButton
                  active={feedTab === 'dynamic'}
                  onClick={() => setFeedTab('dynamic')}
                >
                  产品动态
                </TabButton>
                <TabButton
                  active={feedTab === 'feedback'}
                  onClick={() => setFeedTab('feedback')}
                >
                  评价吐槽
                </TabButton>
                <TabButton
                  active={feedTab === 'competitor'}
                  onClick={() => setFeedTab('competitor')}
                >
                  友商动态
                </TabButton>
              </div>
            </div>
          </div>

          <div className="p-5 max-h-80 overflow-y-auto text-xs">
            {feedTab === 'dynamic' ? (
              <div className="relative ml-2 border-l border-[var(--primary)] pl-5 space-y-5">
                {WORKBENCH_FEEDS.filter((f) => f.type === 'dynamic').map((feed) => (
                  <div key={feed.id} className="relative space-y-1.5">
                    <span className="absolute -left-[26px] top-0.5 w-3 h-3 rounded-full border-2 border-[var(--primary)] bg-[var(--bg-surface)]" />
                    <div className="text-xs text-[var(--text-muted)]">{feed.time}</div>
                    <div className="font-semibold text-sm text-[var(--text-primary)]">
                      {feed.title}
                    </div>
                    <p className="text-[var(--text-body)] leading-relaxed">
                      {feed.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-main)]">
                {WORKBENCH_FEEDS.filter((f) => f.type === feedTab).map((feed) => (
                  <div key={feed.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-[var(--text-primary)]">
                        {feed.title}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{feed.time}</span>
                    </div>
                    <p className="text-[var(--text-body)] leading-relaxed">
                      {feed.content}
                    </p>
                    <div className="text-xs text-[var(--text-muted)]">
                      {feed.customer || feed.author}
                    </div>
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
