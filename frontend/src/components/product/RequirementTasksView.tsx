import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List,
  Clock,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  Edit,
  ExternalLink,
  Archive,
  CheckSquare,
  Building,
  Calendar,
  Sparkles,
  Inbox
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { RequirementTask } from '../../types';

export const RequirementTasksView: React.FC = () => {
  const {
    requirementTasks,
    addRequirementTask,
    updateRequirementTask,
    productLines,
    versions,
    customers,
    currentUser,
    openPageTab,
    addToast
  } = useApp();

  // Tab: 我负责的、我部门的、分配我的、其他部门
  const [activeTab, setActiveTab] = useState<'my_owned' | 'my_dept' | 'assigned_me' | 'other_dept'>('my_owned');
  const [viewMode, setViewMode] = useState<'board' | 'table'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [selectedTask, setSelectedTask] = useState<RequirementTask | null>(null);

  // Modal State (新建任务 云效风格: 任务名称、任务描述、期望目标、完成时间、分配负责人、紧急程度、关联版本、关联客户、关联产品、预计工时)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RequirementTask | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formDueDate, setFormDueDate] = useState('2026-09-18');
  const [formOwnerName, setFormOwnerName] = useState(currentUser.name);
  const [formPriority, setFormPriority] = useState<RequirementTask['priority']>('P1-高优');
  const [formVersionName, setFormVersionName] = useState('V4.2.0');
  const [formCustomerName, setFormCustomerName] = useState('国家电网华东分部数智调度中心');
  const [formProductLineName, setFormProductLineName] = useState(productLines[0]?.name || '数字化协同管理中枢');
  const [formEstimatedHours, setFormEstimatedHours] = useState(40);

  // TodoList (任务中心: 来源于其他模块产生，不能删除只能归档)
  const [todos, setTodos] = useState([
    {
      id: 'todo-1',
      createdAt: '2026-08-30',
      creator: '张总 (领导下派)',
      department: '公司高管层',
      taskType: '领导下派指令',
      ownerName: currentUser.name,
      estimatedHours: 16,
      actualHours: 8,
      status: '待处理',
      title: '紧急组织华东电网信创验收评审前置技术联调'
    },
    {
      id: 'todo-2',
      createdAt: '2026-08-29',
      creator: '赵测试 (QA部门)',
      department: '测试中心',
      taskType: '测试提Bug',
      ownerName: currentUser.name,
      estimatedHours: 8,
      actualHours: 8,
      status: '已处理',
      title: '排查达梦DM8连接池高并发压测偶发超时'
    },
    {
      id: 'todo-3',
      createdAt: '2026-08-28',
      creator: '王产品 (需求部门)',
      department: '产品中心',
      taskType: '产品提需求',
      ownerName: currentUser.name,
      estimatedHours: 24,
      actualHours: 12,
      status: '待处理',
      title: '输出全局检索全文倒排索引架构设计方案'
    },
    {
      id: 'todo-4',
      createdAt: '2026-08-27',
      creator: '孙实施 (现场交付)',
      department: '交付工程部',
      taskType: '实施提Bug',
      ownerName: currentUser.name,
      estimatedHours: 6,
      actualHours: 6,
      status: '已处理',
      title: '解决客户现场国产麒麟桌面版字体渲染模糊'
    }
  ]);

  const STAGES: RequirementTask['status'][] = ['待处理', '设计中', '研发中', '测试中', '已发布'];

  const openAddModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('完成相关需求PRD架构设计、前后端代码实现及单元测试');
    setFormTarget('通过自动化集成测试并满足信创三级等保要求');
    setFormDueDate('2026-09-18');
    setFormOwnerName(currentUser.name);
    setFormPriority('P1-高优');
    setFormVersionName('V4.2.0');
    setFormCustomerName('国家电网华东分部数智调度中心');
    setFormProductLineName(productLines[0]?.name || '数字化协同管理中枢');
    setFormEstimatedHours(40);
    setIsModalOpen(true);
  };

  const openEditModal = (task: RequirementTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormTarget('按期交付并通过质量验收');
    setFormDueDate(task.dueDate);
    setFormOwnerName(task.ownerName);
    setFormPriority(task.priority);
    setFormVersionName(task.versionName);
    setFormCustomerName(task.customerName || '国家电网华东分部数智调度中心');
    setFormProductLineName(task.productLineName);
    setFormEstimatedHours(task.estimatedHours);
    setIsModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', '请填写敏捷需求任务名称');
      return;
}
    if (editingTask) {
      updateRequirementTask(editingTask.id, {
        title: formTitle,
        description: formDescription,
        dueDate: formDueDate,
        ownerName: formOwnerName,
        priority: formPriority,
        versionName: formVersionName,
        customerName: formCustomerName,
        productLineName: formProductLineName,
        estimatedHours: Number(formEstimatedHours)
      });
      addToast('success', '需求任务信息已更新');
    } else {
      addRequirementTask({
        title: formTitle,
        description: formDescription,
        productLineId: `pl-${Date.now()}`,
        productLineName: formProductLineName,
        versionId: `v-${Date.now()}`,
        versionName: formVersionName,
        priority: formPriority,
        status: '待处理',
        ownerName: formOwnerName,
        dueDate: formDueDate,
        estimatedHours: Number(formEstimatedHours),
        customerName: formCustomerName
      });
      addToast('success', '敏捷需求已创建', '已自动同步录入云效需求池与版本规划');
    }
    setIsModalOpen(false);
  };

  const handleArchiveTodo = (todoId: string) => {
    setTodos(todos.map((t) => (t.id === todoId ? { ...t, status: t.status === '待处理' ? '已处理' : '已处理' } : t)));
    addToast('info', '待办任务已归档');
  };

  const filteredTasks = requirementTasks.filter((t) => {
    // Tab filter: 我负责的、我部门的、分配我的、其他部门
    if (activeTab === 'my_owned' && !t.ownerName.includes(currentUser.name.slice(0, 2))) {
      // Keep match
    }
    const matchQ =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.productLineName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPri = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchQ && matchPri && matchStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          id="stat-req-total"
          title="敏捷需求任务总计"
          value={requirementTasks.length}
          unit="个"
          subText="云效看板实时同步"
          icon={<Layers className="w-5 h-5" />}
        />
        <StatCard
          id="stat-req-inprogress"
          title="研发中攻坚需求"
          value={requirementTasks.filter((t) => t.status === '研发中').length}
          unit="个"
          change="3个 P0/P1"
          isPositive={false}
          subText="达梦高可用 & 监控中台"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
        <StatCard
          id="stat-req-testing"
          title="测试验收中"
          value={requirementTasks.filter((t) => t.status === '测试中').length}
          unit="个"
          change="自动化用例跑通"
          isPositive={true}
          subText="准备封版交付"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <StatCard
          id="stat-req-pending"
          title="待排期处理需求"
          value={requirementTasks.filter((t) => t.status === '待处理').length}
          unit="个"
          change="需求池待分配"
          isPositive={true}
          subText="纳入后续敏捷Sprint"
          icon={<Inbox className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
        />
      </div>

      {/* Tabs (我负责的、我部门的、分配我的、其他部门) + Search + Action */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* 4 Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('my_owned')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'my_owned'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              我负责的
            </button>
            <button
              onClick={() => setActiveTab('my_dept')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'my_dept'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              我部门的
            </button>
            <button
              onClick={() => setActiveTab('assigned_me')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'assigned_me'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              分配给我的
            </button>
            <button
              onClick={() => setActiveTab('other_dept')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeTab === 'other_dept'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              其他部门需求
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'}`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`p-1.5 rounded-md ${viewMode === 'board' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              id="btn-add-req-task"
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              新建敏捷任务
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务标题、负责人、产品线..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有紧急程度</option>
            <option value="P0-紧急阻断">P0-紧急阻断</option>
            <option value="P1-高优">P1-高优</option>
            <option value="P2-标准">P2-标准</option>
            <option value="P3-低优">P3-低优</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有状态</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Requirement List Table (列表信息: 标题、状态、优先级、负责人、创建人、添加时间) */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4">需求任务标题</th>
                  <th className="py-3 px-4">状态</th>
                  <th className="py-3 px-4">优先级</th>
                  <th className="py-3 px-4">所属产品线 / 版本</th>
                  <th className="py-3 px-4">负责人</th>
                  <th className="py-3 px-4">创建人</th>
                  <th className="py-3 px-4">截止时间</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <div className="hover:text-blue-600 flex items-center gap-2">
                        <StatusTag status={t.priority} />
                        <span>{t.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-md">
                        {t.description || '敏捷开发任务'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusTag status={t.status} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {t.priority}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {t.productLineName} · <span className="font-mono text-blue-600">{t.versionName}</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {t.ownerName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {currentUser.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {t.dueDate}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedTask(t)}
                          className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                        >
                          详情 <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => openEditModal(t, e)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const stageTasks = filteredTasks.filter((t) => t.status === stage);
            return (
              <div
                key={stage}
                className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex flex-col min-w-[220px] space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{stage}</h4>
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[11px] text-slate-700 dark:text-slate-300">
                    {stageTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {stageTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-lg shadow-xs hover:border-blue-400 transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <StatusTag status={t.priority} />
                        <span className="text-[10px] text-slate-400 font-mono">{t.versionName}</span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2">
                        {t.title}
                      </h5>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-700">
                        <span>{t.ownerName}</span>
                        <span>{t.estimatedHours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Center TodoList: 来源于其他模块产生 (领导下派、别部门@人、产品提需求、实施提bug、测试提bug、自己增加)，不能删除只能归档 */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-500" />
              任务中心 TodoList (跨部门协同与多源流转任务池)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              汇聚领导下派、测试缺陷、现场实施与产品需求流转指令 · 仅支持归档不可物理删除
            </p>
          </div>
          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded text-xs font-semibold">
            待处理 {todos.filter((t) => t.status === '待处理').length} 项
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                todo.status === '已处理'
                  ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-70'
                  : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700 shadow-xs'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded font-semibold text-[10px]">
                    {todo.taskType}
                  </span>
                  <span className={`font-bold text-slate-900 dark:text-white ${todo.status === '已处理' ? 'line-through text-slate-400' : ''}`}>
                    {todo.title}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                  <span>创建人: {todo.creator}</span>
                  <span>部门: {todo.department}</span>
                  <span>创建时间: {todo.createdAt}</span>
                  <span>责任人: {todo.ownerName}</span>
                  <span>预计工时: {todo.estimatedHours}h / 实耗: {todo.actualHours}h</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <StatusTag status={todo.status} />
                <button
                  onClick={() => handleArchiveTodo(todo.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded font-medium transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {todo.status === '待处理' ? '完成并归档' : '已归档'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Detail Drawer (详情页: 同创建页，区别是有内容) */}
      {selectedTask && (
        <Drawer
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={selectedTask.title}
          subtitle={`所属产品: ${selectedTask.productLineName} · 版本: ${selectedTask.versionName} · 负责人: ${selectedTask.ownerName}`}
          width="max-w-2xl"
          footer={
            <>
              <button
                onClick={(e) => openEditModal(selectedTask, e)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium"
              >
                编辑任务
              </button>
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
              >
                关闭
              </button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block">任务状态</span>
                <div className="mt-0.5">
                  <StatusTag status={selectedTask.status} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">紧急程度</span>
                <div className="mt-0.5">
                  <StatusTag status={selectedTask.priority} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">所属产品线与版本</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedTask.productLineName} · {selectedTask.versionName}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">关联客户主体</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedTask.customerName || '国家电网华东分部数智调度中心'}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">分配负责人</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedTask.ownerName}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">计划完成时间</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                  {selectedTask.dueDate} (预计工时 {selectedTask.estimatedHours}h)
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">期望目标</span>
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-emerald-800 dark:text-emerald-300 mt-1">
                  完成信创高可用集群主备切换单测与压测，达到公安部三级等保合规要求。
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">任务详细描述</span>
                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                  {selectedTask.description || '完成相关敏捷需求PRD架构设计、前后端代码实现及单元测试'}
                </div>
              </div>
              {selectedTask.taskType && selectedTask.taskId && <div className="col-span-2">
                <span className="text-slate-400 block">关联需求池项</span>
                <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg text-[var(--active-text)] mt-1">
                  来源需求池 · {selectedTask.code || selectedTask.id} · {selectedTask.taskType}
                </div>
              </div>}
            </div>
          </div>
        </Drawer>
      )}

      {/* Add / Edit Task Modal (云效风格: 任务名称、任务描述、期望目标、完成时间、分配负责人、紧急程度、关联版本、关联客户、关联产品、预计工时) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? '编辑敏捷需求任务' : '新建敏捷需求任务 (自动同步需求池与版本)'}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveTask}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              创建任务
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                敏捷需求任务名称 *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="例如：支持达梦DM8数据库读写分离与主备秒级切换"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                关联产品线 *
              </label>
              <select
                value={formProductLineName}
                onChange={(e) => setFormProductLineName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {productLines.map((pl) => (
                  <option key={pl.id} value={pl.name}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                关联版本 *
              </label>
              <select
                value={formVersionName}
                onChange={(e) => setFormVersionName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                紧急程度 (优先级) *
              </label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="P0-紧急阻断">P0-紧急阻断</option>
                <option value="P1-高优">P1-高优</option>
                <option value="P2-标准">P2-标准</option>
                <option value="P3-低优">P3-低优</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                分配负责人 *
              </label>
              <input
                type="text"
                value={formOwnerName}
                onChange={(e) => setFormOwnerName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                计划完成时间 *
              </label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                预计工时 (小时) *
              </label>
              <input
                type="number"
                value={formEstimatedHours}
                onChange={(e) => setFormEstimatedHours(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                关联客户主体
              </label>
              <select
                value={formCustomerName}
                onChange={(e) => setFormCustomerName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                期望目标
              </label>
              <input
                type="text"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                placeholder="例如：通过自动化单测，支撑压测QPS突破5000"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                任务描述与验收标准
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="详细记录需求背景、技术实现路径与交付验收标准..."
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
