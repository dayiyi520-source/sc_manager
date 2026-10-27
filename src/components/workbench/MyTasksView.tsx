import { WorkbenchFeedCard } from './WorkbenchFeedCard';
import { WorkbenchLearningCard } from './WorkbenchLearningCard';
import { MyGoalProgressMetric } from './MyGoalProgressMetric';
import { useFeedReading } from './useFeedReading';
import { type TodoRecord } from './TodoDetail';
import { openWorkItemDetailLink } from '../../utils/workItemDetailLink';
import { FeedDetail } from './FeedDetail';
import { type WorkbenchFeed } from '../../services/workbenchFeeds';
import { FEED_TAB_KEY, TODO_TAB_KEY, rememberWorkbenchTab } from '../../services/workbenchPreferences';
import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  FileCheck,
  Users,
  Briefcase,
  Clock,
  ArrowRight,
  Calendar,
  MessageSquare,
  AlertCircle,
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/UIComponents';
import { Empty, Skeleton } from 'antd';
import { StatusBadge } from '@/components/common';
import { requirementRepository } from '../../services/requirementRepository';
import { useWorkbenchFeeds } from './useWorkbenchFeeds';
import { projectDeliveryMap } from '../../services/projectDeliveryMap';
import { getMyTaskMetrics } from './myTasksMetrics';

const TodoCenterView = React.lazy(() => import('./TodoCenterView').then(module => ({ default: module.TodoCenterView })));
const WorkbenchFeedsView = React.lazy(() => import('./WorkbenchFeedsView').then(module => ({ default: module.WorkbenchFeedsView })));

type MyTaskRecord = TodoRecord;

type TabType = 'all' | 'mine' | 'assist' | 'work_order';
type ApprovalTabType = 'pending' | 'my_apply' | 'cc_me';
type FeedTabType = 'dynamic' | 'square';

export const MyTasksView: React.FC<{ variant?: 'staff' | 'agent' }> = ({ variant = 'staff' }) => {
  const {
    openPageTab,
    opportunities,
    approvals,
    currentUser
  } = useApp();

  const { feeds: WORKBENCH_FEEDS, error: feedError, reload: reloadFeeds } = useWorkbenchFeeds();
  const [selectedFeed, setSelectedFeed] = useState<WorkbenchFeed>();
  const [innerView, setInnerView] = useState<'home' | 'todos' | 'feeds'>('home');
  const [taskRevision, setTaskRevision] = useState(0);
  const returnToMyTasks = () => { setInnerView('home'); setTaskRevision(value => value + 1); };
  const [todoTab, setTodoTab] = useState<TabType>('all');
  const [approvalTab, setApprovalTab] = useState<ApprovalTabType>('pending');

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
  const reading = useFeedReading(currentUser.id, WORKBENCH_FEEDS);
  const openFeeds = (category: FeedTabType) => { rememberWorkbenchTab(FEED_TAB_KEY, category); reading.browse(category); setInnerView('feeds'); };

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

  if (innerView !== 'home') return <React.Suspense fallback={<Skeleton active/>}>{innerView === 'todos' ? <TodoCenterView hideWorkOrderTab={variant === 'agent'} onBack={returnToMyTasks} backLabel={variant === 'agent' ? '返回代理商待办' : '返回我的待办'}/> : <WorkbenchFeedsView onBack={returnToMyTasks} backLabel={variant === 'agent' ? '返回代理商待办' : '返回我的待办'}/>}</React.Suspense>;

  return (
    <div className="space-y-6">
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
          title={variant === 'agent' ? '协同事项' : '协同事项/工单'}
          value={variant === 'agent' ? dashboardMetrics.collaborationCount : dashboardMetrics.collaborationAndWorkOrderCount}
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
        {variant === 'agent' && <><WorkbenchFeedCard category="square" feeds={WORKBENCH_FEEDS} error={feedError} onRetry={reloadFeeds} onMore={() => openFeeds('square')} onOpen={setSelectedFeed} isNew={reading.isNew} hasUpdates={reading.hasUpdates('square')}/><WorkbenchLearningCard /><WorkbenchFeedCard category="dynamic" feeds={WORKBENCH_FEEDS} error={feedError} onRetry={reloadFeeds} onMore={() => openFeeds('dynamic')} onOpen={setSelectedFeed} isNew={reading.isNew} hasUpdates={reading.hasUpdates('dynamic')}/></>}
        {/* 待办中心 */}
        <div className="lg:col-span-6 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden">
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
                {variant === 'staff' && <TabButton active={todoTab === 'work_order'} onClick={() => setTodoTab('work_order')}>工单 ({dashboardMetrics.workOrderCount})</TabButton>}
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
                      <button type="button" className="min-w-0 truncate text-left font-medium text-sm text-[var(--primary)] hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70" onClick={() => openWorkItemDetailLink(task.sourceId, task.taskGroup === 'assist' ? 'WORK_ORDER' : task.type, task.productLineId)}>{task.title}</button>
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

        {variant === 'staff' &&
        <div className="lg:col-span-6 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl shadow-sm overflow-hidden">
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
        </div>}

        {variant === 'staff' && <>
        <WorkbenchFeedCard category="square" feeds={WORKBENCH_FEEDS} error={feedError} onRetry={reloadFeeds} onMore={() => openFeeds('square')} onOpen={setSelectedFeed} isNew={reading.isNew} hasUpdates={reading.hasUpdates('square')}/>
        <WorkbenchFeedCard category="dynamic" feeds={WORKBENCH_FEEDS} error={feedError} onRetry={reloadFeeds} onMore={() => openFeeds('dynamic')} onOpen={setSelectedFeed} isNew={reading.isNew} hasUpdates={reading.hasUpdates('dynamic')}/>
        <MyGoalProgressMetric />
        <WorkbenchLearningCard />
        </>}
      </div>
    </div>
  );
};
