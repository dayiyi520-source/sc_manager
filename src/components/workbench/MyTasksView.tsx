import { TodoDetail, type TodoRecord } from './TodoDetail';
import { FeedDetail } from './FeedDetail';
import { type WorkbenchFeed } from '../../services/workbenchFeeds';
import { FeedSummary } from './FeedSummary';
import { FEED_TAB_KEY, TODO_TAB_KEY, rememberWorkbenchTab } from '../../services/workbenchPreferences';
import dayjs from 'dayjs';
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
  Bell,
  AlertCircle,
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';
import { Empty, Skeleton } from 'antd';
import { StatusBadge } from '@/components/common';
import { requirementRepository } from '../../services/requirementRepository';
import { useWorkbenchFeeds } from './useWorkbenchFeeds';
import { projectDeliveryMap } from '../../services/projectDeliveryMap';
import { getMyTaskMetrics } from './myTasksMetrics';
import { hasUnreadFeed, unreadFeedIds } from './feedUnread';

const TodoCenterView = React.lazy(() => import('./TodoCenterView').then(module => ({ default: module.TodoCenterView })));
const WorkbenchFeedsView = React.lazy(() => import('./WorkbenchFeedsView').then(module => ({ default: module.WorkbenchFeedsView })));

type MyTaskRecord = TodoRecord;

type TabType = 'all' | 'mine' | 'assist' | 'work_order';
type ApprovalTabType = 'pending' | 'my_apply' | 'cc_me';
type FeedTabType = 'dynamic' | 'feedback' | 'competitor';

export const MyTasksView: React.FC = () => {
  const {
    openPageTab,
    opportunities,
    approvals,
    okrs,
    currentUser
  } = useApp();

  const { feeds: WORKBENCH_FEEDS, error: feedError, reload: reloadFeeds } = useWorkbenchFeeds();
  const [selectedTask, setSelectedTask] = useState<TodoRecord>();
  const [selectedFeed, setSelectedFeed] = useState<WorkbenchFeed>();
  const [innerView, setInnerView] = useState<'home' | 'todos' | 'feeds'>('home');
  const [taskRevision, setTaskRevision] = useState(0);
  const returnToMyTasks = () => { setInnerView('home'); setTaskRevision(value => value + 1); };
  const [todoTab, setTodoTab] = useState<TabType>('all');
  const [approvalTab, setApprovalTab] = useState<ApprovalTabType>('pending');
  const [feedTab, setFeedTab] = useState<FeedTabType>('dynamic');
  const [readFeedIds, setReadFeedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('shichuang.frontend.mock.workbench.feedRead') || '[]')); } catch { return new Set(); }
  });
  const [realTasks, setRealTasks] = useState<MyTaskRecord[]>([]);
  const [taskLoading, setTaskLoading] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setTaskLoading(true);
    setTaskError(null);
    requirementRepository.myTasks(currentUser.id)
      .then((items) => { if (active) setRealTasks(Array.isArray(items) ? items : []); })
      .catch((error) => { if (active) { setRealTasks([]); setTaskError(error instanceof Error ? error.message : '产品任务和协同事项服务暂不可用'); } })
      .finally(() => { if (active) setTaskLoading(false); });
    return () => { active = false; };
  }, [currentUser.id, taskRevision]);

  const pendingTodos = useMemo(() => realTasks, [realTasks]);
  const feedUnreadIds = useMemo(() => unreadFeedIds(WORKBENCH_FEEDS, readFeedIds), [WORKBENCH_FEEDS, readFeedIds]);
  const markFeedTabRead = (nextTab: FeedTabType) => {
    setFeedTab(nextTab);
    setReadFeedIds((current) => {
      const next = new Set(current);
      WORKBENCH_FEEDS.filter((feed) => feed.type === nextTab).forEach((feed) => next.add(feed.id));
      try { localStorage.setItem('shichuang.frontend.mock.workbench.feedRead', JSON.stringify([...next])); } catch { /* browser storage unavailable */ }
      return next;
    });
  };

  const dashboardMetrics = useMemo(() => getMyTaskMetrics(realTasks, opportunities, projectDeliveryMap()), [realTasks, opportunities]);
  const displayTodos = useMemo(() => {
    if (todoTab === 'mine') return realTasks.filter((task) => task.taskGroup === 'mine');
    if (todoTab === 'assist') return realTasks.filter((task) => task.taskGroup === 'assist' && task.type !== 'work_order');
    if (todoTab === 'work_order') return realTasks.filter((task) => task.type === 'work_order');
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

  if (innerView !== 'home') return <React.Suspense fallback={<Skeleton active/>}>{innerView === 'todos' ? <TodoCenterView onBack={returnToMyTasks}/> : <WorkbenchFeedsView onBack={returnToMyTasks}/>}</React.Suspense>;

  return (
    <div className="space-y-6">
      {selectedTask && <TodoDetail task={selectedTask} onClose={() => { setSelectedTask(undefined); setTaskRevision(value => value + 1); }}/>}
      <FeedDetail key={selectedFeed?.id || 'closed'} feed={selectedFeed ? WORKBENCH_FEEDS.find(feed => feed.id === selectedFeed.id) : undefined} onClose={() => setSelectedFeed(undefined)}/>
      {/* 顶部核心指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="待办任务"
          value={dashboardMetrics.todoTaskCount}
          unit="项"
          icon={<CheckSquare className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
        <StatCard
          title="协同事项/工单"
          value={dashboardMetrics.collaborationAndWorkOrderCount}
          unit="项"
          icon={<MessageSquare className="w-5 h-5" />}
          iconBgColor="bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400"
        />
        <StatCard
          title="跟进商机数"
          value={dashboardMetrics.opportunityCount}
          unit="家"
          icon={<Users className="w-5 h-5" />}
          iconBgColor="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
        />
        <StatCard
          title="项目交付数"
          value={dashboardMetrics.projectDeliveryCount}
          unit="项"
          icon={<Briefcase className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 待办中心 */}
        <div className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-main)] flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[var(--primary)]" />
                待办中心
              </div>
              <div className="flex bg-[var(--bg-surface-soft)] rounded-lg p-0.5">
                <TabButton active={todoTab === 'all'} onClick={() => setTodoTab('all')}>全部 ({pendingTodos.length})</TabButton>
                <TabButton active={todoTab === 'mine'} onClick={() => setTodoTab('mine')}>任务 ({realTasks.filter((task) => task.taskGroup === 'mine').length})</TabButton>
                <TabButton active={todoTab === 'assist'} onClick={() => setTodoTab('assist')}>协同事项 ({dashboardMetrics.collaborationCount})</TabButton>
                <TabButton active={todoTab === 'work_order'} onClick={() => setTodoTab('work_order')}>工单 ({dashboardMetrics.workOrderCount})</TabButton>
              </div>
            </div>
            <button className="shrink-0 text-xs text-[var(--primary)] hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70" onClick={() => { rememberWorkbenchTab(TODO_TAB_KEY, todoTab); setInnerView('todos'); }}>查看更多</button>
          </div>

          <div className="p-5 max-h-80 overflow-y-auto">
            <div className="space-y-3">
              {taskLoading && !realTasks.length ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">正在加载我的工作...</div>
              ) : taskError ? (
                <div className="text-center py-8 text-[var(--danger)] text-sm"><AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-70" /><div>我的工作加载失败，请稍后重试</div><div className="mt-1 text-xs text-[var(--text-muted)]">{taskError}</div></div>
              ) : displayTodos.length === 0 ? (
                todoTab === 'work_order' ? <Empty description="暂无工单" /> : (
                  <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                    <Empty description="暂无相关工作"/>
                  </div>
                )
              ) : (
                displayTodos.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {task.type === 'assistance' ? <Users className="w-4 h-4 shrink-0 text-[var(--primary)]" /> : <CheckSquare className="w-4 h-4 shrink-0 text-[var(--primary)]" />}
                      <button type="button" className="min-w-0 truncate text-left font-medium text-sm text-[var(--primary)] hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70" onClick={() => setSelectedTask(task)}>{task.title}</button>
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
          <div className="px-5 py-4 border-b border-[var(--border-main)] flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
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
          <div className="px-5 py-4 border-b border-[var(--border-main)] flex flex-wrap gap-3 items-center justify-between">
            <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Target className="w-4 h-4 text-[var(--warning)]" />
              我的目标进度
            </div>
            <button
              onClick={() => openPageTab('wb_okr_perf')}
              className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
            >
              查看详情
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-5 max-h-[520px] overflow-y-auto">
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
                  {myOkr.keyResults.map((kr, idx) => {
                    const actions = (kr.executionActions || []).filter((action) => !action.ownerId || action.ownerId === currentUser.id);
                    const hasEmployeeActions = actions.length > 0;
                    return (
                      <div key={kr.id} className="p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm text-[var(--text-primary)] font-medium">{myOkr.primaryLabel === 'KR' ? `个人动作${idx + 1}` : hasEmployeeActions ? `部门 KR${idx + 1}` : `KR${idx + 1}`}: {kr.content}</span>
                          <span className="font-semibold text-[var(--text-primary)] shrink-0">{kr.progress}%</span>
                        </div>
                        <div className="w-full bg-[var(--bg-main)] rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${kr.progress}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <span>权重: {kr.weight}%</span>
                          <span>截止: {kr.deadline}</span>
                        </div>
                        {hasEmployeeActions && <div className="ml-3 border-l-2 border-[var(--primary)]/30 pl-3 space-y-2" aria-label="个人动作">
                          <div className="text-xs font-medium text-[var(--text-muted)]">个人动作</div>
                          {actions.map((action) => <div key={action.id} className="flex items-start justify-between gap-3 rounded-md bg-[var(--bg-main)] px-3 py-2 text-xs">
                            <span className="min-w-0 text-[var(--text-body)]">{action.title}</span>
                            <span className="shrink-0 font-semibold text-[var(--text-primary)]">{action.progress}%</span>
                          </div>)}
                        </div>}
                      </div>
                    );
                  })}
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
          <div className="px-5 py-4 border-b border-[var(--border-main)] flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--success)]" />
                动态与评价
              </div>
              <div className="flex bg-[var(--bg-surface-soft)] rounded-lg p-0.5">
                <TabButton
                  active={feedTab === 'dynamic'}
                  onClick={() => markFeedTabRead('dynamic')}
                >
                  <span className="relative">产品动态{hasUnreadFeed(WORKBENCH_FEEDS, readFeedIds, 'dynamic') && <i aria-label="产品动态有更新" className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />}</span>
                </TabButton>
                <TabButton
                  active={feedTab === 'feedback'}
                  onClick={() => markFeedTabRead('feedback')}
                >
                  <span className="relative">评价吐槽{hasUnreadFeed(WORKBENCH_FEEDS, readFeedIds, 'feedback') && <i aria-label="评价吐槽有更新" className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />}</span>
                </TabButton>
                <TabButton
                  active={feedTab === 'competitor'}
                  onClick={() => markFeedTabRead('competitor')}
                >
                  <span className="relative">行业资讯{hasUnreadFeed(WORKBENCH_FEEDS, readFeedIds, 'competitor') && <i aria-label="行业资讯有更新" className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />}</span>
                </TabButton>
              </div>
            </div>
            <button className="shrink-0 text-xs text-[var(--primary)] hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70" onClick={() => { rememberWorkbenchTab(FEED_TAB_KEY, feedTab); setInnerView('feeds'); }}>查看更多</button>
          </div>

          <div className="p-5 max-h-[520px] overflow-y-auto text-xs">
            {feedError ? <div role="alert" className="space-y-2 text-[var(--danger)]">{feedError}<button className="ml-3 hover:underline" onClick={reloadFeeds}>重试</button></div> : !WORKBENCH_FEEDS.some(feed => feed.type === feedTab) ? <Empty description="暂无动态与评价"/> : feedTab === 'dynamic' ? (
              <div className="divide-y divide-[var(--border-main)]">
                {WORKBENCH_FEEDS.filter((f) => f.type === 'dynamic').slice(0, 5).map((feed) => (
                  <div key={feed.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="min-w-0 font-semibold text-sm text-[var(--primary)] flex items-center gap-1">
                        <button type="button" className="min-w-0 truncate text-left hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70" onClick={() => setSelectedFeed(feed)}>{feed.title}</button>{feedUnreadIds.has(feed.id) && <Bell aria-label="有新内容" className="h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{dayjs(feed.time).isValid() ? dayjs(feed.time).format('YYYY-MM-DD HH:mm') : feed.time}</span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{[feed.productName, feed.versionName, feed.projectName, feed.source?.module].filter(Boolean).join(' · ')}</div>
                    <FeedSummary content={feed.content}/>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-main)]">
                {WORKBENCH_FEEDS.filter((f) => f.type === feedTab).slice(0, 5).map((feed) => (
                  <div key={feed.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="min-w-0 font-semibold text-sm text-[var(--primary)] flex items-center gap-1">
                        <button type="button" className="min-w-0 truncate text-left hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70" onClick={() => setSelectedFeed(feed)}>{feed.title}</button>{feedUnreadIds.has(feed.id) && <Bell aria-label="有新内容" className="h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{dayjs(feed.time).isValid() ? dayjs(feed.time).format('YYYY-MM-DD HH:mm') : feed.time}</span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{[feed.productName, feed.versionName, feed.projectName, feed.source?.module].filter(Boolean).join(' · ')}</div><FeedSummary content={feed.content}/>
                    <div className="text-xs text-[var(--text-muted)]">
                      {feed.type === 'competitor' && feed.newsType ? `${feed.newsType} · ` : ''}{(feed.type !== 'competitor' ? feed.customer : undefined) || feed.author}
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
