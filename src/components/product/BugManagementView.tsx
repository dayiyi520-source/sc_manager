import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DatePicker, Cascader, Segmented } from "antd";
import {
  Bug,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Paperclip,
  GitBranch,
  Layers,
  Sparkles,
  RotateCcw,
  ArrowRight
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';
import { SearchableSelect } from '../common';
import { BugItem } from '../../types';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
import { RichTextEditor } from './RichTextEditor';
import { Pagination } from '../common/Pagination';
import { InlineEditableSelect } from '../common/InlineEditableSelect';

export const BugManagementView: React.FC = () => {
  const { bugs, addBug, updateBug, productLines, versions, currentUser, addToast, requirementTasks } = useApp();
  const employees = Array.from(new Set([currentUser.name, ...bugs.map((bug) => bug.assignee).filter(Boolean)]));
  const bugStatuses = ['待处理', '设计中', '待开发', '开发中', '待测试', '测试中', '待验收', '已验收', '已发布', '已完成', '待修复', '修复中', '待验证', '已关闭'];

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const descriptionEditor = useRef<HTMLDivElement>(null);
  const [formDescriptionHtml, setFormDescriptionHtml] = useState('');

  const [selectedBug, setSelectedBug] = useState<BugItem | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'requirement'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<BugItem | null>(null);

  // Form Fields: 缺陷名称、所属产品线、关联版本、缺陷类型、严重程度、处理人、参与人、预计解决时间、所属环境、缺陷描述、复现步骤
  const [formTitle, setFormTitle] = useState('');
  const [formProductLine, setFormProductLine] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [formType, setFormType] = useState('');
  const [formSeverity, setFormSeverity] = useState<BugItem['severity']>('');
  const [formPriority, setFormPriority] = useState<NonNullable<BugItem['priority']>>('中');
  const [formAssignee, setFormAssignee] = useState('');
  const [formCc, setFormCc] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formEnv, setFormEnv] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSteps, setFormSteps] = useState('');
  const [formStatus, setFormStatus] = useState<BugItem['status']>('待修复');
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
  const [selectedRequirementId, setSelectedRequirementId] = useState('');
  const [workOrderQuery, setWorkOrderQuery] = useState('');
  const availableWorkOrders = useMemo(() => requirementTasks.filter((item) => item.status === '待处理' && item.workOrderType === '线上问题'), [requirementTasks]);
  const filteredWorkOrders = useMemo(() => availableWorkOrders.filter((item) => item.title.toLocaleLowerCase().includes(workOrderQuery.trim().toLocaleLowerCase())), [availableWorkOrders, workOrderQuery]);

  const openAddModal = () => {
    setEditingBug(null);
    setFormTitle('');
    setFormProductLine('');
    setFormVersion('');
    setFormType('');
    setFormSeverity('');
    setFormPriority('中');
    setFormAssignee('');
    setFormCc('');
    setFormDueDate('');
    setFormEnv('');
    setFormDescription('');
    setFormSteps('');
    setFormStatus('待修复');
    setSelectedWorkOrderIds([]);
    setSelectedRequirementId('');
    setWorkOrderQuery('');
    setIsModalOpen(true);
  };

  const openEditModal = (bug: BugItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBug(bug);
    setFormTitle(bug.title);
    setFormProductLine(bug.productLineName);
    setFormVersion(bug.versionName);
    setFormType(bug.type || '功能缺陷');
    setFormSeverity(bug.severity);
    setFormPriority(bug.priority || '中');
    setFormAssignee(bug.assignee);
    setFormDueDate('2026-09-10');
    setFormEnv(bug.env || '测试集成环境 (K8s QA)');
    setFormDescription(bug.description || '');
    setFormSteps('1. 登录管理端\n2. 触发对应操作\n3. 观察返回异常');
    setFormStatus(bug.status);
    setSelectedWorkOrderIds(bug.sourceWorkOrderIds || []);
    setSelectedRequirementId(bug.requirementId || '');
    setWorkOrderQuery('');
    setIsModalOpen(true);
  };

  const handleSaveBug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', '请填写缺陷 Bug 标题');
      return;
    }

    if (editingBug) {
      updateBug(editingBug.id, {
        title: formTitle,
        productLineName: formProductLine,
        versionName: formVersion,
        type: formType,
        severity: formSeverity,
        priority: formPriority,
        assignee: formAssignee,
        status: formStatus,
        env: formEnv,
        description: formDescription
        ,sourceWorkOrderIds: selectedWorkOrderIds
        ,sourceWorkOrderTitles: availableWorkOrders.filter((item) => selectedWorkOrderIds.includes(item.id)).map((item) => item.title)
        ,requirementId: selectedRequirementId
      });
      addToast('success', '缺陷记录已更新');
    } else {
      addBug({
        code: `BUG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: formTitle,
        productLineName: formProductLine,
        versionName: formVersion,
        type: formType,
        severity: formSeverity,
        priority: formPriority,
        status: formStatus,
        reporter: currentUser.name,
        assignee: formAssignee,
        env: formEnv,
        createdAt: new Date().toISOString().split('T')[0],
        description: formDescription
        ,sourceWorkOrderIds: selectedWorkOrderIds
        ,sourceWorkOrderTitles: availableWorkOrders.filter((item) => selectedWorkOrderIds.includes(item.id)).map((item) => item.title)
        ,requirementId: selectedRequirementId
      });
    }
    setIsModalOpen(false);
  };

  const handleSaveAndContinue = (e: React.MouseEvent) => {
    handleSaveBug(e as unknown as React.FormEvent);
    if (formTitle.trim()) window.setTimeout(openAddModal, 0);
  };

  const filteredBugs = bugs.filter((b) => {
    const matchQ =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.productLineName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSev = severityFilter === 'all' || b.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchEnv = envFilter === 'all' || (b.env && b.env.includes(envFilter));
    return matchQ && matchSev && matchStatus && matchEnv;
  });
  const pagedBugs = filteredBugs.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [searchQuery, severityFilter, statusFilter, envFilter, pageSize]);

  // 6 Top Metrics: 缺陷总数、待修复、待验证、本月缺陷、缺陷解决率、缺陷平均修复时长
  const totalBugs = bugs.length + 16;
  const pendingFixBugs = bugs.filter((b) => b.status === '待修复' || b.status === '修复中').length;
  const pendingVerifyBugs = bugs.filter((b) => b.status === '待验证').length;
  const thisMonthBugs = 20;
  const fixRate = 88;
  const avgFixTime = '4.2h';

  return (
    <div className="task-page space-y-6 animate-in fade-in duration-150">
      {/* 6 Stats: 缺陷总数、待修复、待验证、本月缺陷、缺陷解决率、缺陷平均修复时长 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          id="stat-bug-total"
          title="缺陷总数"
          value={totalBugs}
          unit="个"
          icon={<Bug className="w-4 h-4" />}
        />
        <StatCard
          id="stat-bug-pending-fix"
          title="待修复缺陷"
          value={pendingFixBugs}
          unit="个"
          icon={<AlertTriangle className="w-4 h-4" />}
          iconBgColor="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
        />
        <StatCard
          id="stat-bug-verify"
          title="待验证闭环"
          value={pendingVerifyBugs}
          unit="个"
          icon={<Clock className="w-4 h-4" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
        />
        <StatCard
          id="stat-bug-month"
          title="本月新增缺陷"
          value={thisMonthBugs}
          unit="个"
          icon={<Layers className="w-4 h-4" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
        <StatCard
          id="stat-bug-rate"
          title="缺陷解决率"
          value={`${fixRate}%`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <StatCard
          id="stat-bug-time"
          title="平均修复时长"
          value={avgFixTime}
          icon={<Clock className="w-4 h-4" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
        />
      </div>

      {/* Filter and Action Bar (筛选项: 编号/名称、所属产品线、所属版本、状态、优先级、环境) */}
      <div className="task-page-toolbar bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索编号、缺陷名称、处理人..."
              className="app-control h-8 pl-8 pr-3 text-xs"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="app-control h-8 px-3 text-xs"
          >
            <option value="all">所有严重程度</option>
            <option value="致命阻断">致命阻断</option>
            <option value="严重缺陷">严重缺陷</option>
            <option value="一般问题">一般问题</option>
            <option value="轻微优化">轻微优化</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="app-control h-8 px-3 text-xs"
          >
            <option value="all">所有状态</option>
            {bugStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>

          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="app-control h-8 px-3 text-xs"
          >
            <option value="all">所有环境</option>
            <option value="开发环境">开发环境</option>
            <option value="测试">测试环境</option>
            <option value="预发布">预发布环境</option>
            <option value="生产">生产环境</option>
          </select>
        </div>

        <button
          id="btn-add-bug"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          提报缺陷 Bug
        </button>
      </div>

      {/* Bug List Table (列表字段: 缺陷名称、缺陷类型、严重程度、所属产品、版本、环境、提出人、处理人、预计解决时间、状态、操作) */}
      <div className="task-page-table bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="py-3 px-4">缺陷编号与标题</th>
                <th className="py-3 px-4">缺陷类型</th>
                <th className="py-3 px-4">严重程度</th>
                <th className="py-3 px-4">优先级</th>
                <th className="py-3 px-4">所属产品 / 版本</th>
                <th className="py-3 px-4">所属环境</th>
                <th className="py-3 px-4">提出人</th>
                <th className="py-3 px-4">处理人</th>
                <th className="py-3 px-4">状态</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {pagedBugs.map((bug) => (
                <tr
                  key={bug.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-slate-400">{bug.code || `BUG-${bug.id}`}</span>
                      <button type="button" onClick={() => { setSelectedBug(bug); setDetailTab('overview'); }} className="text-left text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]">{bug.title}</button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {bug.type || '功能缺陷'}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={bug.severity} />
                  </td>
                  <td className="py-3.5 px-4"><StatusTag status={bug.priority || '中'} /></td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    {bug.productLineName} · <span className="font-mono text-blue-600">{bug.versionName}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {bug.env || '测试环境'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {bug.reporter}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                    <InlineEditableSelect value={bug.assignee || ''} options={employees} onChange={(assignee) => updateBug(bug.id, { assignee, ownerName: assignee })} />
                  </td>
                  <td className="py-3.5 px-4">
                    <InlineEditableSelect value={bug.status} options={bugStatuses} tone="status" onChange={(status) => updateBug(bug.id, { status })} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => { setSelectedBug(bug); setDetailTab('overview'); }}
                        className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                      >
                        详情 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filteredBugs.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* Bug Detail Panel */}
      {selectedBug && (
        <WorkItemCreatePanel
          isOpen={!!selectedBug}
          onClose={() => setSelectedBug(null)}
          title="缺陷详情"
          presentation="drawer"
          showContinueOption={false}
          footer={<>
            <button type="button" onClick={(event) => { const bug = selectedBug; setSelectedBug(null); openEditModal(bug, event); }} className="app-button-secondary h-10 px-4 text-xs font-semibold">编辑缺陷</button>
            <button type="button" onClick={() => setSelectedBug(null)} className="tech-button-primary h-10 rounded-lg px-4 text-xs font-semibold">关闭</button>
          </>}
          properties={<div className="space-y-6 text-xs">
            <section className="space-y-3">
              <h3 className="font-semibold text-[var(--text-primary)]">基础字段</h3>
              <DetailField label="当前状态"><StatusTag status={selectedBug.status} /></DetailField>
              <DetailField label="所属产品线">{selectedBug.productLineName || '未设置'}</DetailField>
              <DetailField label="关联版本">{selectedBug.versionName || '未设置'}</DetailField>
              <DetailField label="严重程度"><StatusTag status={selectedBug.severity} /></DetailField>
              <DetailField label="优先级"><StatusTag status={selectedBug.priority || '中'} /></DetailField>
              <DetailField label="缺陷类型">{selectedBug.type || '功能缺陷'}</DetailField>
              <DetailField label="责任处理人">{selectedBug.assignee || '未设置'}</DetailField>
              <DetailField label="参与人">{formCc || '未设置'}</DetailField>
              <DetailField label="所属环境">{selectedBug.env || '未设置'}</DetailField>
              <DetailField label="提报人">{selectedBug.reporter || '未设置'}</DetailField>
              <DetailField label="创建时间"><span className="font-mono">{selectedBug.createdAt || '未设置'}</span></DetailField>
            </section>
          </div>}
        >
          <div className="w-full space-y-5 text-xs">
            <div className="flex items-center gap-5 border-b border-[var(--border-main)]"><button type="button" onClick={() => setDetailTab('overview')} className={`border-b-2 px-1 pb-2 text-sm ${detailTab === 'overview' ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)]'}`}>缺陷详情</button><button type="button" onClick={() => setDetailTab('requirement')} className={`border-b-2 px-1 pb-2 text-sm ${detailTab === 'requirement' ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)]'}`}>关联需求</button></div>
            {detailTab === 'requirement' ? <DetailField label="关联需求">{requirementTasks.find((item) => item.id === selectedBug.requirementId)?.title || '未关联需求'}</DetailField> : <>
            <DetailField label="缺陷编号"><span className="font-mono">{selectedBug.code || '未设置'}</span></DetailField>
            <DetailField label="缺陷名称"><span className="font-medium">{selectedBug.title}</span></DetailField>
            <DetailField label="复现步骤 / 缺陷描述"><p className="min-h-28 whitespace-pre-wrap break-words leading-6">{selectedBug.description || '未填写缺陷描述'}</p></DetailField>
            <DetailField label="关联工单">
              {selectedBug.sourceWorkOrderTitles?.length ? <div className="flex flex-wrap gap-2">{selectedBug.sourceWorkOrderTitles.map((title, index) => <span key={`${title}-${index}`} className="max-w-full truncate rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--text-body)]">{title}</span>)}</div> : '未关联工单'}
            </DetailField>
            </>}
          </div>
        </WorkItemCreatePanel>
      )}

      {/* Add / Edit Modal */}
      <WorkItemCreatePanel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBug ? '编辑缺陷记录' : '提报新缺陷 Bug'}
        showContinueOption={!editingBug}
        secondaryAction={!editingBug ? <button type="button" onClick={handleSaveAndContinue} className="app-button-secondary h-10 px-4 text-xs font-semibold">保存并继续</button> : undefined}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="app-button-secondary h-10 px-4 text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveBug}
              className="tech-button-primary h-10 rounded-lg px-4 text-xs font-semibold"
            >
              提交缺陷
            </button>
          </>
        }
        properties={<div className="space-y-4 text-xs">
          <SearchableSelect label="所属产品线" required value={formProductLine} options={productLines.map((pl) => pl.name)} onChange={(value) => { setFormProductLine(value); setFormVersion(''); }} placeholder="请选择所属产品线" />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-primary)]">关联版本 <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={formVersion ? [formVersion] : undefined}
              onChange={(value) => setFormVersion(value?.[0])}
              options={versions.filter((v) => !v.productLineName || v.productLineName === formProductLine).map((v) => v.name).map((opt: string) => ({ label: opt, value: opt }))}
              placeholder="请选择关联版本"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-primary)]">严重程度 <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={formSeverity ? [formSeverity] : undefined}
              onChange={(value) => value?.[0] && setFormSeverity(value[0] as BugItem['severity'])}
              options={[{ label: '致命阻断', value: '致命阻断' }, { label: '严重缺陷', value: '严重缺陷' }, { label: '一般问题', value: '一般问题' }, { label: '轻微优化', value: '轻微优化' }]}
              placeholder="请选择严重程度"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-primary)]">优先级 <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={formPriority ? [formPriority] : undefined}
              onChange={(value) => value?.[0] && setFormPriority(value[0] as NonNullable<BugItem['priority']>)}
              options={[{ label: '紧急', value: '紧急' }, { label: '高', value: '高' }, { label: '中', value: '中' }, { label: '低', value: '低' }]}
              placeholder="请选择优先级"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)]">缺陷类型</label>
            <Cascader
              showSearch
              allowClear value={formType ? [formType] : undefined}
              onChange={(value) => setFormType(value?.[0])}
              options={[{ label: '功能缺陷', value: '功能缺陷' }, { label: '性能缺陷', value: '性能缺陷' }, { label: 'UI交互', value: 'UI交互' }, { label: '安全漏洞', value: '安全漏洞' }, { label: '环境配置', value: '环境配置' }]}
              placeholder="请选择缺陷类型"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-primary)]">责任处理人 <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={formAssignee ? [formAssignee] : undefined}
              onChange={(value) => setFormAssignee(value?.[0])}
              options={employees}
              placeholder="搜索并选择处理人"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)]">关联需求任务</label>
            <Cascader
              showSearch
              allowClear value={selectedRequirementId ? [selectedRequirementId] : undefined}
              onChange={(value) => { const title = value?.[0]; setSelectedRequirementId(requirementTasks.find((task) => task.title === title)?.id || ''); }}
              options={requirementTasks.map((task) => task.title).map((opt: string) => ({ label: opt, value: opt }))}
              placeholder="请选择关联需求任务"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)]">参与人</label>
            <Cascader
              showSearch
              allowClear value={formCc ? [formCc] : undefined}
              onChange={(value) => setFormCc(value?.[0])}
              options={employees}
              placeholder="搜索并选择参与人"
              className="w-full"
            />
          </div>
          <label className="block text-[var(--text-muted)]">所属环境<input value={formEnv} onChange={(e) => setFormEnv(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2.5 text-[var(--text-primary)]" /></label>
          <div className="border-t border-[var(--border-main)] pt-4"><label className="block text-[var(--text-muted)]">关联工单中心（线上问题）</label><input value={workOrderQuery} onChange={(e) => setWorkOrderQuery(e.target.value)} placeholder="搜索线上问题工单" className="mt-1 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2.5 text-[var(--text-primary)]" />{workOrderQuery.trim() && <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-1">{filteredWorkOrders.filter((item) => !selectedWorkOrderIds.includes(item.id)).map((item) => <button type="button" key={item.id} onClick={() => { setSelectedWorkOrderIds((ids) => [...ids, item.id]); setWorkOrderQuery(''); }} className="block w-full rounded p-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]">{item.title}</button>)}</div>}<div className="mt-2 flex flex-wrap gap-1">{selectedWorkOrderIds.map((id) => { const item = availableWorkOrders.find((candidate) => candidate.id === id); return <span key={id} className="inline-flex items-center gap-1 rounded bg-[var(--bg-surface-soft)] px-2 py-1 text-[11px]">{item?.title || id}<button type="button" aria-label={`移除关联工单${item?.title || id}`} onClick={() => setSelectedWorkOrderIds((ids) => ids.filter((value) => value !== id))}>×</button></span>; })}</div></div>
        </div>}
      >
        <form onSubmit={handleSaveBug} className="w-full space-y-5 text-xs" data-work-item-form>
          <div className="space-y-5">
            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                缺陷 Bug 名称 *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="例如：高并发导入数据导致连接池耗尽抛出500"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                复现步骤
              </label>
              <RichTextEditor editor={descriptionEditor} value={formDescription || formSteps} htmlValue={formDescriptionHtml} onInput={(text, html) => { setFormDescription(text); setFormSteps(text); setFormDescriptionHtml(html); }} placeholder="请详细描述复现步骤、实际结果和期望结果..." />
            </div>
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
