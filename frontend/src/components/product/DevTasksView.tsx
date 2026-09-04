import React, { useState } from 'react';
import {
  FileCode2,
  GitBranch,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  Play,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { DevTask } from '../../types';

export const DevTasksView: React.FC = () => {
  const { devTasks, addDevTask, updateDevTask, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formRepo, setFormRepo] = useState('shichuang-hub-backend');
  const [formBranch, setFormBranch] = useState('feat/dm8-readwrite-split');
  const [formDeveloper, setFormDeveloper] = useState('李工 (架构)');
  const [formHours, setFormHours] = useState(16);

  const filteredTasks = devTasks.filter((t) => {
    const matchQ =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.developer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.repo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchQ && matchStatus;
  });

  const handleSaveDevTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', '请填写研发工程任务标题');
      return;
    }

    addDevTask({
      reqTaskId: `req-${Date.now()}`,
      title: formTitle,
      repo: formRepo,
      branch: formBranch,
      developer: formDeveloper,
      status: '进行中',
      commitsCount: 3,
      spentHours: 4,
      estimatedHours: Number(formHours)
    });
    setIsModalOpen(false);
  };

  const handleCompleteTask = (task: DevTask) => {
    updateDevTask(task.id, { status: '已合并' });
    addToast('success', 'PR 已合并至主干', `【${task.title}】自动化 CI/CD 流水线构建通过并部署至预发环境`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="研发工程任务总计"
          value={devTasks.length}
          unit="项"
          subText="Git 代码仓库协同"
          icon={<FileCode2 className="w-5 h-5" />}
        />
        <StatCard
          title="进行中活跃分支"
          value={devTasks.filter((t) => t.status === '进行中').length}
          unit="条"
          change="提交正常"
          isPositive={true}
          subText="feat/dm8 & feat/im-engine"
          icon={<GitBranch className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
        <StatCard
          title="待 Code Review"
          value={devTasks.filter((t) => t.status === '待评审').length}
          unit="个"
          change="等待架构审核"
          isPositive={false}
          subText="网关高并发限流 PR"
          icon={<GitPullRequest className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
        />
        <StatCard
          title="CI/CD 构建通过率"
          value="99.4"
          unit="%"
          subText="SonarQube 0 异味"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
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
              placeholder="搜索研发任务 / 分支 / 工程师..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有研发状态</option>
            <option value="进行中">进行中</option>
            <option value="待评审">待评审 (PR)</option>
            <option value="已合并">已合并上线</option>
          </select>
        </div>

        <button
          id="btn-add-dev-task"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          创建研发子任务
        </button>
      </div>

      {/* Dev Tasks Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <th className="py-3 px-4">研发任务项</th>
              <th className="py-3 px-4">所属代码仓</th>
              <th className="py-3 px-4">工作特性分支</th>
              <th className="py-3 px-4">责任开发者</th>
              <th className="py-3 px-4">提交数</th>
              <th className="py-3 px-4">工时进度</th>
              <th className="py-3 px-4">状态</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{task.title}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">{task.repo}</td>
                <td className="py-3.5 px-4 font-mono text-blue-600 dark:text-blue-400">
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-slate-400" />
                    <span>{task.branch}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{task.developer}</td>
                <td className="py-3.5 px-4 text-slate-600">
                  <div className="flex items-center gap-1">
                    <GitCommit className="w-3 h-3 text-slate-400" />
                    <span>{task.commitsCount} commits</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  {task.spentHours}h / {task.estimatedHours}h
                </td>
                <td className="py-3.5 px-4">
                  <StatusTag status={task.status} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {task.status !== '已合并' && (
                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-medium text-xs"
                      >
                        合并代码 PR
                      </button>
                    )}
                    <button
                      onClick={() => addToast('info', '流水线状态', '自动化单元测试全部 Pass，覆盖率 88.5%')}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium text-xs"
                    >
                      CI 日志
                    </button>
                  </div>
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
        title="创建研发分支任务"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveDevTask}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存任务并创建 Git 分支
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveDevTask} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              研发任务描述 *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="如：编写人大金仓 Kingbase 驱动方言转换拦截器"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                目标代码仓 *
              </label>
              <select
                value={formRepo}
                onChange={(e) => setFormRepo(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              >
                <option value="shichuang-hub-backend">shichuang-hub-backend</option>
                <option value="shichuang-crm-frontend">shichuang-crm-frontend</option>
                <option value="shichuang-gateway-core">shichuang-gateway-core</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                特性分支名称 (Branch) *
              </label>
              <input
                type="text"
                required
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value)}
                placeholder="如：feat/kingbase-dialect"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                责任开发者 *
              </label>
              <input
                type="text"
                value={formDeveloper}
                onChange={(e) => setFormDeveloper(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                预计工时 (h)
              </label>
              <input
                type="number"
                value={formHours}
                onChange={(e) => setFormHours(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
