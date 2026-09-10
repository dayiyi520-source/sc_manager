import React, { useEffect, useRef, useState } from 'react';
import { DatePicker, Cascader, Segmented } from "antd";
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
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';
import { DevTask } from '../../types';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
import { RichTextEditor } from './RichTextEditor';
import { Pagination } from '../common/Pagination';
import { InlineEditableSelect } from '../common/InlineEditableSelect';

export const DevTasksView: React.FC = () => {
  const { devTasks, requirementTasks, addDevTask, updateDevTask, addToast } = useApp();
  const employees = Array.from(new Set(devTasks.map((task) => task.developer).filter(Boolean)));

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const taskStatuses = ['待处理', '设计中', '待开发', '开发中', '待测试', '测试中', '待验收', '已验收', '已发布', '已完成', '已提测', '已合并上线'];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DevTask | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'requirement'>('overview');
  const [formTitle, setFormTitle] = useState('');
  const [formRepo, setFormRepo] = useState('');
  const [formBranch, setFormBranch] = useState('');
  const [formDeveloper, setFormDeveloper] = useState('');
  const [formPriority, setFormPriority] = useState<DevTask['priority']>('');
  const [formHours, setFormHours] = useState<number | ''>('');
  const descriptionEditor = useRef<HTMLDivElement>(null);
  const [formDescription, setFormDescription] = useState('');
  const [formDescriptionHtml, setFormDescriptionHtml] = useState('');
  const [formRequirementId, setFormRequirementId] = useState('');
  const openAddModal = () => {
    setFormTitle('');
    setFormRepo('');
    setFormBranch('');
    setFormDeveloper('');
    setFormPriority('');
    setFormHours('');
    setFormDescription('');
    setFormDescriptionHtml('');
    setFormRequirementId('');
    setIsModalOpen(true);
  };

  const filteredTasks = devTasks.filter((t) => {
    const matchQ =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.developer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.repo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchQ && matchStatus;
  });
  const pagedTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [searchQuery, statusFilter, pageSize]);

  const handleSaveDevTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', '请填写研发工程任务标题');
      return;
    }

    addDevTask({
      reqTaskId: `req-${Date.now()}`,
      title: formTitle,
      description: formDescription,
      repo: formRepo,
      branch: formBranch,
      developer: formDeveloper,
      priority: formPriority,
      status: '进行中',
      commitsCount: 3,
      spentHours: 4,
      estimatedHours: Number(formHours)
      ,requirementId: formRequirementId
    });
    setIsModalOpen(false);
  };

  const handleSaveAndContinue = (e: React.MouseEvent) => {
    handleSaveDevTask(e as unknown as React.FormEvent);
    if (formTitle.trim()) window.setTimeout(openAddModal, 0);
  };

  const handleCompleteTask = (task: DevTask) => {
    updateDevTask(task.id, { status: '已合并' });
    addToast('success', 'PR 已合并至主干', `【${task.title}】自动化 CI/CD 流水线构建通过并部署至预发环境`);
  };

  return (
    <div className="task-page space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="研发工程任务总计"
          value={devTasks.length}
          unit="项"
          icon={<FileCode2 className="w-5 h-5" />}
        />
        <StatCard
          title="进行中活跃分支"
          value={devTasks.filter((t) => t.status === '进行中').length}
          unit="条"
          icon={<GitBranch className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
        <StatCard
          title="待 Code Review"
          value={devTasks.filter((t) => t.status === '待评审').length}
          unit="个"
          icon={<GitPullRequest className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
        />
        <StatCard
          title="CI/CD 构建通过率"
          value="99.4"
          unit="%"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
      </div>

      {/* Toolbar */}
      <div className="task-page-toolbar bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索研发任务 / 分支 / 工程师..."
              className="app-control h-8 pl-8 pr-3 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="app-control h-8 px-3 text-xs"
          >
            <option value="all">所有研发状态</option>
            {taskStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>

        <button
          id="btn-add-dev-task"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          创建研发子任务
        </button>
      </div>

      {/* Dev Tasks Table */}
      <div className="task-page-table bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <th className="py-3 px-4">研发任务项</th>
              <th className="py-3 px-4">所属代码仓</th>
              <th className="py-3 px-4">工作特性分支</th>
              <th className="py-3 px-4">责任开发者</th>
              <th className="py-3 px-4">优先级</th>
              <th className="py-3 px-4">提交数</th>
              <th className="py-3 px-4">工时进度</th>
              <th className="py-3 px-4">状态</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagedTasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <button type="button" onClick={() => { setSelectedTask(task); setDetailTab('overview'); }} className="text-left hover:text-blue-600">{task.title}</button>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">{task.repo}</td>
                <td className="py-3.5 px-4 font-mono text-blue-600 dark:text-blue-400">
                  <div className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-slate-400" />
                    <span>{task.branch}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300"><InlineEditableSelect value={task.developer} options={employees} onChange={(developer) => updateDevTask(task.id, { developer })} /></td>
                <td className="py-3.5 px-4"><StatusTag status={task.priority.replace(/^P[0123]-(紧急|高优|标准)$/, '$1').replace('高优', '高').replace('标准', '中')} /></td>
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
                  <InlineEditableSelect value={task.status} options={taskStatuses} tone="status" onChange={(status) => updateDevTask(task.id, { status })} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => { setSelectedTask(task); setDetailTab('overview'); }}
                      className="px-2 py-1 text-[var(--active-text)] hover:text-[var(--primary-hover)] rounded font-medium text-xs"
                    >
                      详情
                    </button>
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
        <Pagination total={filteredTasks.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {selectedTask && (
        <WorkItemCreatePanel
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title="研发任务详情"
          presentation="drawer"
          showContinueOption={false}
          footer={<button type="button" onClick={() => setSelectedTask(null)} className="tech-button-primary h-10 rounded-lg px-4 text-xs font-semibold">关闭</button>}
          properties={<div className="space-y-6 text-xs">
            <section className="space-y-3">
              <h3 className="font-semibold text-[var(--text-primary)]">基础字段</h3>
              <DetailField label="当前状态"><StatusTag status={selectedTask.status} /></DetailField>
              <DetailField label="代码仓库">{selectedTask.repo || '未设置'}</DetailField>
              <DetailField label="特性分支"><span className="font-mono">{selectedTask.branch || '未设置'}</span></DetailField>
              <DetailField label="责任开发者">{selectedTask.developer || '未设置'}</DetailField>
              <DetailField label="优先级"><StatusTag status={selectedTask.priority} /></DetailField>
              <DetailField label="所属产品线">{selectedTask.productLineName || '未设置'}</DetailField>
              <DetailField label="迭代版本">{selectedTask.versionName || '未设置'}</DetailField>
              <DetailField label="截止时间"><span className="font-mono">{selectedTask.dueDate || '未设置'}</span></DetailField>
            </section>
            <section className="space-y-3 border-t border-[var(--border-main)] pt-4">
              <h3 className="font-semibold text-[var(--text-primary)]">工时</h3>
              <DetailField label="预计工时（小时）">{selectedTask.estimatedHours ?? 0}</DetailField>
              <DetailField label="已投入工时（小时）">{selectedTask.spentHours ?? 0}</DetailField>
            </section>
          </div>}
        >
          <div className="w-full space-y-5 text-xs">
            <div className="border-b border-[var(--border-main)] px-3 py-2">
              <Segmented
                value={detailTab}
                onChange={(value) => setDetailTab(value as 'overview' | 'requirement')}
                options={[
                  { label: '任务详情', value: 'overview' },
                  { label: '关联需求', value: 'requirement' },
                ]}
              />
            </div>
            {detailTab === 'requirement' ? <DetailField label="关联需求">{requirementTasks.find((item) => item.id === selectedTask.requirementId)?.title || '未关联需求'}</DetailField> : <>
            <DetailField label="研发任务名称"><span className="font-medium">{selectedTask.title}</span></DetailField>
            <DetailField label="任务描述"><p className="min-h-28 whitespace-pre-wrap break-words leading-6">{selectedTask.description || '未填写任务描述'}</p></DetailField>
            </>}
          </div>
        </WorkItemCreatePanel>
      )}

      {/* Modal */}
      <WorkItemCreatePanel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="创建研发分支任务"
        secondaryAction={<button type="button" onClick={handleSaveAndContinue} className="app-button-secondary h-10 px-4 text-xs font-semibold">保存并继续</button>}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="app-button-secondary h-10 px-4 text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveDevTask}
              className="tech-button-primary h-10 rounded-lg px-4 text-xs font-semibold"
            >
              保存任务并创建 Git 分支
            </button>
          </>
        }
        properties={<div className="space-y-4 text-xs">
          <div className="flex flex-col gap-1.5" required>
            <label className="text-xs font-medium text-[var(--text-primary)]">目标代码仓 <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={formRepo ? [formRepo] : undefined}
              onChange={(value: any) => setFormRepo(value?.[0] || '')}
              options={['shichuang-hub-backend', 'shichuang-crm-frontend', 'shichuang-gateway-core'].map((opt: string) => ({ label: opt, value: opt }))}
              placeholder="请选择目标代码仓"
              className="w-full"
            />
          </div>
          <label className="block text-[var(--text-muted)]">特性分支 *<input required value={formBranch} onChange={(e) => setFormBranch(e.target.value)} placeholder="feat/feature-name" className="mt-1 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2.5 font-mono text-[var(--text-primary)]" /></label>
          <div className="flex flex-col gap-1.5" required>
            <label className="text-xs font-medium text-[var(--text-primary)]">责任开发者 <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={formDeveloper ? [formDeveloper] : undefined}
              onChange={(value: any) => setFormDeveloper(value?.[0] || '')}
              options={employees.map((opt: string) => ({ label: opt, value: opt }))}
              placeholder="搜索并选择开发者"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5" required>
            <label className="text-xs font-medium text-[var(--text-primary)]">优先级 <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={formPriority ? [formPriority] : undefined}
              onChange={(value: any) => (value) => setFormPriority(value as DevTask['priority'])(value?.[0] || '')}
              options={['紧急', '高', '中', '低'].map((opt: string) => ({ label: opt, value: opt }))}
              placeholder="请选择优先级"
              className="w-full"
            />
          </div>
          <label className="block text-[var(--text-muted)]">预计工时（小时）<input min="0" type="number" value={formHours} onChange={(e) => setFormHours(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2.5 text-[var(--text-primary)]" /></label>
        </div>}
      >
        <form onSubmit={handleSaveDevTask} className="w-full space-y-5 text-xs" data-work-item-form>
          <div className="col-span-2">
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              研发任务描述 *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="如：编写人大金仓 Kingbase 驱动方言转换拦截器"
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="col-span-2"><label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">任务描述</label><RichTextEditor editor={descriptionEditor} value={formDescription} htmlValue={formDescriptionHtml} onInput={(text, html) => { setFormDescription(text); setFormDescriptionHtml(html); }} /></div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)]">关联需求任务</label>
            <Cascader
              showSearch allowClear
              value={formRequirementId ? [formRequirementId] : undefined}
              onChange={(value: any) => (title) => setFormRequirementId(requirementTasks.find((task) => task.title === title)?.id || '')(value?.[0] || '')}
              options={requirementTasks.map((task) => task.title).map((opt: any) => typeof opt === 'string' ? { label: opt, value: opt } : opt)}
              placeholder="请选择关联需求任务"
              className="w-full"
            />
          </div>

        </form>
      </WorkItemCreatePanel>
    </div>
  );
};

const DetailField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <span className="block text-[var(--text-muted)]">{label}</span>
    <div className="mt-1 min-h-8 break-words rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)]">{children}</div>
  </div>
);
