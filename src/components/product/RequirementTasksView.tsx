import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowRight,
  Check,
  FileText,
  Calendar,
  Sparkles,
  List
} from '@/components/common/octicons-compat';
import { MessageSquare, Paperclip, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusTag } from '../common/UIComponents';
import { DefectBug, DevTask, RequirementEvent, RequirementMedia, RequirementPoolItem, RequirementTask, RequirementWorkOrderCandidate, RequirementWorkOrderType } from '../../types';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
import { RichTextEditor } from './RichTextEditor';
import { SearchableSelect } from '../common/SearchableSelect';
import { Pagination } from '../common/Pagination';
import { InlineEditableSelect } from '../common/InlineEditableSelect';
import { DateField } from '../common/DateField';
import { requirementRepository } from '../../services/requirementRepository';
import { productRepository } from '../../services/productRepository';

type RequirementFilterState = {
  title: { operator: TextFilterOperator; value: string };
  status: MultiFilterValue;
  owner: MultiFilterValue;
  creator: MultiFilterValue;
  customer: MultiFilterValue;
  version: MultiFilterValue;
  createdAt: DateFilterValue;
  plannedStartDate: DateFilterValue;
  cc: MultiFilterValue;
};

type RequirementGroupKey = 'none' | 'priority' | 'status' | 'owner' | 'creator' | 'version' | 'customer' | 'requirementType';
type TextFilterOperator = 'include' | 'exclude';
type DateFilterOperator = 'between' | 'equals' | 'after' | 'before';
type MultiFilterValue = { operator: TextFilterOperator; values: string[] };
type DateFilterValue = { operator: DateFilterOperator; from: string; to: string };

const emptyMultiFilter = (): MultiFilterValue => ({ operator: 'include', values: [] });
const emptyDateFilter = (): DateFilterValue => ({ operator: 'between', from: '', to: '' });
const createEmptyRequirementFilters = (): RequirementFilterState => ({
  title: { operator: 'include', value: '' },
  status: emptyMultiFilter(), owner: emptyMultiFilter(), creator: emptyMultiFilter(), customer: emptyMultiFilter(), version: emptyMultiFilter(),
  createdAt: emptyDateFilter(), plannedStartDate: emptyDateFilter(), cc: emptyMultiFilter()
});

const normalizePriority = (priority: string) => ({
  'P0-紧急阻断': '紧急',
  'P1-高优': '高',
  'P2-标准': '中',
  'P2-普通': '中',
  'P3-低优': '低'
}[priority] || priority);

// DateField is shared with all task and work-order forms.

const DetailField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <span className="block text-[var(--text-muted)]">{label}</span>
    <div className="mt-1 min-h-8 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)]">
      {children}
    </div>
  </div>
);

const DetailTextInput: React.FC<{ label: string; value: string; onSave: (value: string) => void; multiline?: boolean }> = ({ label, value, onSave, multiline = false }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { if (draft !== value) onSave(draft); };
  return <label className="block text-[var(--text-muted)]"><span>{label}</span>{multiline ? <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} rows={4} className="mt-1 min-h-24 w-full resize-y rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20" /> : <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} className="mt-1 h-8 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20" />}</label>;
};

const DetailDateInput: React.FC<{ label: string; value?: string; onSave: (value: string) => void }> = ({ label, value = '', onSave }) => <DateField label={label} value={value} onChange={onSave} />;

const WORK_ORDER_TYPES: Array<{ key: RequirementWorkOrderType; label: string }> = [
  { key: 'requirement', label: '需求' }, { key: 'task', label: '任务' }, { key: 'bug', label: '缺陷' },
  { key: 'risk', label: '风险' }, { key: 'source', label: '原始诉求' }, { key: 'topic', label: '主题' }
];

const WorkOrderPicker: React.FC<{
  candidates: RequirementWorkOrderCandidate[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}> = ({ candidates, selectedIds, onChange, placeholder = '选择关联工单' }) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<RequirementWorkOrderType | 'all'>('all');
  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds.filter(Boolean) : [];
  const safeCandidates = (Array.isArray(candidates) ? candidates : []).filter((item): item is RequirementWorkOrderCandidate => Boolean(item && item.id)).map((item) => ({ ...item, title: item.title || item.id, typeLabel: item.typeLabel || '工单' }));
  const filtered = safeCandidates.filter((item) => (type === 'all' || item.type === type) && (!keyword.trim() || [item.title, item.code, item.ownerName, item.summary].filter(Boolean).join(' ').toLowerCase().includes(keyword.trim().toLowerCase())));
  const selected = safeSelectedIds.map((id) => safeCandidates.find((item) => item.id === id) || { id, title: id, typeLabel: '工单' } as RequirementWorkOrderCandidate);
  const toggle = (id: string) => onChange(safeSelectedIds.includes(id) ? safeSelectedIds.filter((item) => item !== id) : [...safeSelectedIds, id]);
  return <div className="space-y-2">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-9 w-full items-center justify-between rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 text-left text-[var(--text-body)] hover:border-[var(--primary)]">
      <span>{selected.length ? `已关联 ${selected.length} 条工单` : placeholder}</span><span className="text-[var(--text-muted)]">{open ? '收起' : '选择'}</span>
    </button>
    {selected.length > 0 && <div className="flex flex-wrap gap-1.5">{selected.map((item) => <span key={item.id} className="inline-flex max-w-full items-center gap-1 rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--text-body)]"><span className="max-w-48 truncate">{item.title}</span><button type="button" onClick={() => toggle(item.id)} aria-label={`移除${item.title}`}><X className="h-3 w-3" /></button></span>)}</div>}
    {open && <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-3 shadow-sm">
      <div className="flex items-center gap-2"><input autoFocus value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索标题、编号、负责人" className="h-8 min-w-0 flex-1 rounded-md border border-[var(--border-main)] bg-transparent px-2 text-xs outline-none focus:border-[var(--primary)]" /><button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--text-muted)]">关闭</button></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{[{ key: 'all' as const, label: '全部' }, ...WORK_ORDER_TYPES].map((item) => <button type="button" key={item.key} onClick={() => setType(item.key)} className={`rounded-md px-2 py-1 text-[11px] ${type === item.key ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-surface-soft)] text-[var(--text-muted)]'}`}>{item.label} {item.key !== 'all' && <span>({safeCandidates.filter((candidate) => candidate.type === item.key).length})</span>}</button>)}</div>
      <div className="mt-3 max-h-56 space-y-1 overflow-auto">{filtered.length ? filtered.map((item) => <button type="button" key={item.id} onClick={() => toggle(item.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-[var(--bg-surface-soft)]"><span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${safeSelectedIds.includes(item.id) ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border-main)]'}`}>{safeSelectedIds.includes(item.id) && <Check className="h-3 w-3" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs text-[var(--text-primary)]">{item.title}</span><span className="block truncate text-[11px] text-[var(--text-muted)]">{item.typeLabel}{item.code ? ` · ${item.code}` : ''}{item.ownerName ? ` · ${item.ownerName}` : ''}{item.productLineName ? ` · ${item.productLineName}` : ''}</span></span></button>) : <p className="py-6 text-center text-xs text-[var(--text-muted)]">暂无匹配工单</p>}</div>
    </div>}
  </div>;
};

export const RequirementTasksView: React.FC<{ productLineFilter?: string; itemLabel?: string; taskKind?: 'requirement' | 'design' | 'bug' | 'dev' | 'presales' | 'delivery' | 'ops' }> = ({ productLineFilter = 'all', itemLabel = '需求任务', taskKind = 'requirement' }) => {
  const {
    requirementTasks,
    designTasks,
    addRequirementTask,
    updateRequirementTask,
    addDesignTask,
    updateDesignTask,
    productLines,
    versions,
    customers,
    currentUser,
    bugs,
    devTasks,
    requirementPool,
    risks,
    requirementTaskDraft,
    setRequirementTaskDraft,
    openPageTab,
    addToast,
    addRequirementTaskComment
  } = useApp();
  const [businessTasks, setBusinessTasks] = useState<RequirementTask[]>([]);
  const [specialTasks, setSpecialTasks] = useState<RequirementTask[]>([]);
  const isBusinessTask = taskKind === 'presales' || taskKind === 'delivery' || taskKind === 'ops';
  const isSpecialTask = taskKind === 'bug' || taskKind === 'dev';
  useEffect(() => {
    if (!isBusinessTask) { setBusinessTasks([]); return; }
    productRepository.businessTasks(taskKind).then(setBusinessTasks).catch(() => setBusinessTasks([]));
  }, [isBusinessTask, taskKind]);
  useEffect(() => {
    if (taskKind === 'bug') setSpecialTasks(bugs.map((item: DefectBug) => ({ ...item, ownerName: item.ownerName || item.assignee || '', expectedGoal: '', dueDate: '', priority: item.priority || '中', versionName: item.versionName || '', productLineName: item.productLineName || '', description: item.description || '', status: item.status || '待修复' })) as RequirementTask[]);
    else if (taskKind === 'dev') setSpecialTasks(devTasks.map((item: DevTask) => ({ ...item, ownerName: item.developer || '', expectedGoal: '', dueDate: '', priority: item.priority || '中', versionName: item.versionName || '', productLineName: item.productLineName || '', description: item.description || '', status: item.status || '开发中' })) as RequirementTask[]);
    else setSpecialTasks([]);
  }, [taskKind, bugs, devTasks]);
  const activeTasks = taskKind === 'design' ? designTasks : isBusinessTask ? businessTasks : isSpecialTask ? specialTasks : requirementTasks;
  const addTask = async (task: Partial<RequirementTask>) => {
    if (taskKind === 'design') return addDesignTask(task);
    if (isBusinessTask) {
      const optimistic: RequirementTask = { ...task, id: `${taskKind}-${Date.now()}`, title: task.title || `新建${itemLabel}`, description: task.description || '', expectedGoal: task.expectedGoal || '', status: task.status || '待处理', priority: task.priority || '中', ownerName: task.ownerName || currentUser.name, creatorName: currentUser.name, productLineName: task.productLineName || '', versionName: task.versionName || '', estimatedHours: task.estimatedHours || 0, dueDate: task.dueDate || '' };
      setBusinessTasks((prev) => [optimistic, ...prev]);
      try { await productRepository.createBusinessTask(taskKind, optimistic); setBusinessTasks(await productRepository.businessTasks(taskKind)); return true; }
      catch (error) { setBusinessTasks((prev) => prev.filter((item) => item.id !== optimistic.id)); addToast('error', `${itemLabel}保存失败`, error instanceof Error ? error.message : '请稍后重试'); return false; }
    }
    if (isSpecialTask) {
      const optimistic = { ...task, id: `${taskKind}-${Date.now()}`, title: task.title || `新建${itemLabel}`, description: task.description || '', ownerName: task.ownerName || currentUser.name, status: task.status || (taskKind === 'bug' ? '待修复' : '开发中'), priority: task.priority || '中', productLineName: task.productLineName || '', versionName: task.versionName || '', expectedGoal: '', dueDate: '' } as RequirementTask;
      setSpecialTasks((prev) => [optimistic, ...prev]);
      const body = taskKind === 'bug' ? { ...task, assigneeName: task.ownerName } : { ...task, developer: task.ownerName };
      try { await productRepository.createTask(taskKind, body as Partial<DefectBug> | Partial<DevTask>); return true; }
      catch (error) { setSpecialTasks((prev) => prev.filter((item) => item.id !== optimistic.id)); addToast('error', `${itemLabel}保存失败`, error instanceof Error ? error.message : '请稍后重试'); return false; }
    }
    return addRequirementTask(task);
  };
  const updateTask = (id: string, updates: Partial<RequirementTask>) => {
    if (taskKind === 'design') return updateDesignTask(id, updates);
    if (isBusinessTask) {
      setBusinessTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...updates } : task));
      void productRepository.updateBusinessTask(taskKind, id, updates as Record<string, unknown>).catch((error) => addToast('error', `${itemLabel}同步失败`, error instanceof Error ? error.message : '请稍后重试'));
      return;
    }
    if (isSpecialTask) {
      setSpecialTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...updates } : task));
      const body = taskKind === 'bug' ? { ...updates, assigneeName: updates.ownerName } : { ...updates, developer: updates.ownerName };
      void productRepository.updateTask(taskKind, id, body as Record<string, unknown>).catch((error) => addToast('error', `${itemLabel}同步失败`, error instanceof Error ? error.message : '请稍后重试'));
      return;
    }
    return updateRequirementTask(id, updates);
  };

  const [activeTab, setActiveTab] = useState<'all' | 'my_owned' | 'my_created'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchOwnerPickerOpen, setSearchOwnerPickerOpen] = useState(false);
  const [searchOwnerNames, setSearchOwnerNames] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<RequirementFilterState>(createEmptyRequirementFilters);
  const [appliedFilters, setAppliedFilters] = useState<RequirementFilterState>(createEmptyRequirementFilters);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupQuery, setGroupQuery] = useState('');
  const [groupBy, setGroupBy] = useState<RequirementGroupKey>('none');
  const [groupValue, setGroupValue] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selectedTask, setSelectedTask] = useState<RequirementTask | null>(null);
  const detailDescriptionEditor = useRef<HTMLDivElement>(null);
  const [detailDescription, setDetailDescription] = useState('');
  const [detailDescriptionHtml, setDetailDescriptionHtml] = useState('');
  const [detailTab, setDetailTab] = useState<'workOrders' | 'activity'>('activity');
  const [remoteCandidates, setRemoteCandidates] = useState<RequirementWorkOrderCandidate[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDetailDescription(selectedTask?.description || '');
    setDetailDescriptionHtml(selectedTask?.descriptionHtml || '');
    setDetailTab('activity');
    setCommentDraft('');
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) return;
    if (isBusinessTask || taskKind === 'design') return;
    requirementRepository.detail(selectedTask.id)
      .then((detail) => setSelectedTask((current) => current?.id === detail.id ? { ...current, ...detail } : current))
      .catch(() => undefined);
  }, [selectedTask?.id, isBusinessTask, taskKind]);

  const localCandidates = useMemo<RequirementWorkOrderCandidate[]>(() => [
    ...requirementTasks.map((item) => ({ id: item.id, type: 'requirement' as const, typeLabel: '需求', title: item.title, code: item.code, ownerName: item.ownerName, productLineName: item.productLineName, status: item.status, summary: item.description })),
    ...requirementTasks.filter((item) => item.id !== selectedTask?.id).flatMap((item) => (item.events || []).filter((event) => event.eventType === '转任务').map((event) => ({ id: String(event.metadata?.taskId || `${item.id}-task`), type: 'task' as const, typeLabel: '任务', title: String(event.metadata?.taskTitle || item.title), ownerName: String(event.metadata?.assigneeName || item.ownerName), productLineName: item.productLineName, status: item.status }))),
    ...bugs.map((item: DefectBug) => ({ id: item.id, type: 'bug' as const, typeLabel: '缺陷', title: item.title, code: item.code, ownerName: item.ownerName || item.assignee, productLineName: item.productLineName, status: item.status, summary: item.description })),
    ...devTasks.map((item: DevTask) => ({ id: item.id, type: 'task' as const, typeLabel: '任务', title: item.title, ownerName: item.developer, productLineName: item.productLineName, status: item.status, summary: item.description })),
    ...requirementPool.map((item: RequirementPoolItem) => ({ id: item.id, type: 'source' as const, typeLabel: '原始诉求', title: item.title, code: item.code, ownerName: item.submitter, productLineName: item.productLineName, status: item.status, summary: item.description })),
    ...risks.map((item) => ({ id: item.id, type: 'risk' as const, typeLabel: '风险', title: item.title, status: item.status, summary: item.mitigationPlan }))
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index && item.id !== selectedTask?.id), [requirementTasks, bugs, devTasks, requirementPool, risks, selectedTask?.id]);

  const candidateOptions = remoteCandidates.length ? remoteCandidates.filter((item) => item.id !== selectedTask?.id) : localCandidates;
  useEffect(() => {
    requirementRepository.workOrderCandidates({ requirementId: selectedTask?.id || '', limit: 200 }).then((items) => setRemoteCandidates(Array.isArray(items) ? items : [])).catch(() => setRemoteCandidates([]));
  }, [selectedTask?.id]);

  const updateLinkedWorkOrders = (ids: string[]) => {
    if (!selectedTask) return;
    const titles = ids.map((id) => candidateOptions.find((item) => item.id === id)?.title || id);
    saveDetailUpdates({ sourceWorkOrderIds: ids, sourceWorkOrderTitles: titles });
  };

  const saveDetailUpdates = (updates: Partial<RequirementTask>) => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, updates);
    setSelectedTask((current) => current ? { ...current, ...updates } : current);
  };

  const submitComment = () => {
    if (!selectedTask || !commentDraft.trim()) return;
    addRequirementTaskComment(selectedTask.id, commentDraft);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const event: RequirementEvent = {
      id: `comment-preview-${Date.now()}`,
      eventType: '评论',
      operatorName: currentUser.name,
      metadata: { content: commentDraft.trim() },
      createdAt: now
    };
    setSelectedTask((current) => current ? { ...current, events: [...(current.events || []), event] } : current);
    setCommentDraft('');
  };

  const eventSummary = (event: RequirementEvent) => {
    const metadata = event.metadata || {};
    if (event.eventType === '提需求') return '提交了需求';
    if (event.eventType === '变更状态') return `将状态从“${event.fromStatus || '未设置'}”变更为“${event.toStatus || '未设置'}”`;
    if (event.eventType === '变更负责人') return `将负责人变更为“${String(metadata.to || '未分配')}”`;
    if (event.eventType === '修改参与人') return '修改了参与人';
    if (event.eventType === '评论') return '发表了评论';
    return event.eventType;
  };

  // Modal State (新建任务 云效风格: 任务名称、任务描述、期望目标、完成时间、分配负责人、紧急程度、关联版本、关联客户、关联产品、预计工时)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RequirementTask | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formPriority, setFormPriority] = useState<RequirementTask['priority']>('');
  const [formVersionName, setFormVersionName] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formProductLineName, setFormProductLineName] = useState('');
  const [formEstimatedHours, setFormEstimatedHours] = useState<number | ''>('');
  const [formRequirementType, setFormRequirementType] = useState('');
  const [formCcNames, setFormCcNames] = useState<string[]>([]);
  const [formPlannedStartDate, setFormPlannedStartDate] = useState('');
  const [formExpectedCompleteDate, setFormExpectedCompleteDate] = useState('');
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
  const [selectedRequirementTaskIds, setSelectedRequirementTaskIds] = useState<string[]>([]);
  const [formMedia, setFormMedia] = useState<RequirementMedia[]>([]);
  const descriptionEditor = useRef<HTMLDivElement>(null);
  const [formDescriptionHtml, setFormDescriptionHtml] = useState('');
  const [employees, setEmployees] = useState<string[]>([currentUser.name]);

  useEffect(() => {
    requirementRepository.employees()
      .then((items) => setEmployees(Array.from(new Set([currentUser.name, ...items.map((item) => item.name)]))))
      .catch(() => setEmployees(Array.from(new Set([currentUser.name, ...requirementTasks.map((item) => item.ownerName).filter(Boolean)]))));
  }, [currentUser.name, requirementTasks]);

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (controlsRef.current?.contains(event.target as Node)) return;
      setSearchOpen(false);
      setSearchOwnerPickerOpen(false);
      setFilterOpen(false);
      setGroupOpen(false);
    };
    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, []);

  const availableWorkOrders = useMemo(
    () => requirementTasks.filter((item) => item.status === '待处理' && ['客户诉求', '线上问题', '其他问题'].includes(item.workOrderType || '')),
    [requirementTasks]
  );
  const STAGES: RequirementTask['status'][] = ['待处理', '设计中', '待开发', '研发中', '开发中', '待测试', '测试中', '待验收', '已验收', '已发布', '已完成'];

  const openAddModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormDescriptionHtml('');
    setFormTarget('');
    setFormDueDate('');
    setFormOwnerName('');
    setFormPriority('');
    setFormVersionName('');
    setFormCustomerName('');
    setFormProductLineName('');
    setFormEstimatedHours('');
    setFormRequirementType('');
    setFormCcNames([]);
    setFormPlannedStartDate('');
    setFormExpectedCompleteDate('');
    setSelectedWorkOrderIds([]);
    setSelectedRequirementTaskIds([]);
    setFormMedia([]);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!requirementTaskDraft) return;
    setEditingTask(null);
    setFormTitle(requirementTaskDraft.title || '');
    setFormDescription(requirementTaskDraft.description || '');
    setFormDescriptionHtml('');
    setFormTarget(requirementTaskDraft.expectedGoal || '');
    setFormOwnerName(requirementTaskDraft.ownerName || currentUser.name);
    setFormPriority(requirementTaskDraft.priority || '中');
    setFormProductLineName(requirementTaskDraft.productLineName || productLines[0]?.name || '');
    setFormVersionName(requirementTaskDraft.versionName || '');
    setFormDueDate(requirementTaskDraft.dueDate || '');
    setFormExpectedCompleteDate(requirementTaskDraft.expectedCompleteDate || requirementTaskDraft.dueDate || '');
    setFormCustomerName(requirementTaskDraft.customerName || '');
    setFormRequirementType(requirementTaskDraft.requirementType || '业务需求');
    setFormCcNames(requirementTaskDraft.ccNames || []);
    setFormPlannedStartDate(requirementTaskDraft.plannedStartDate || '');
    setSelectedWorkOrderIds(requirementTaskDraft.sourceWorkOrderIds || []);
    setSelectedRequirementTaskIds(requirementTaskDraft.requirementId ? [requirementTaskDraft.requirementId] : []);
    setFormEstimatedHours(40);
    setFormMedia([]);
    setIsModalOpen(true);
    setRequirementTaskDraft(null);
  }, [requirementTaskDraft, currentUser.name, productLines, setRequirementTaskDraft]);

  const openEditModal = (task: RequirementTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormTarget(task.expectedGoal || '');
    setFormDueDate(task.dueDate);
    setFormOwnerName(task.ownerName);
    setFormPriority(normalizePriority(task.priority) as RequirementTask['priority']);
    setFormVersionName(task.versionName);
    setFormCustomerName(task.customerName || '国家电网华东分部数智调度中心');
    setFormProductLineName(task.productLineName);
    setFormEstimatedHours(task.estimatedHours);
    setFormRequirementType(task.requirementType || '业务需求');
    setFormCcNames(task.ccNames || []);
    setFormPlannedStartDate(task.plannedStartDate || '');
    setFormExpectedCompleteDate(task.expectedCompleteDate || '');
    setSelectedWorkOrderIds(task.sourceWorkOrderIds || []);
    setSelectedRequirementTaskIds(task.requirementId ? [task.requirementId] : []);
    setFormMedia(task.media || []);
    setIsModalOpen(true);
  };

  const onDocumentMedia = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []) as File[];
    const allowed = /\.(txt|doc|docx|xls|xlsx|pdf)$/i;
    files.filter((file) => allowed.test(file.name)).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setFormMedia((items) => [...items, {
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        type: 'file',
        dataUrl: String(reader.result),
        size: file.size,
        mimeType: file.type
      }]);
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', `请填写${itemLabel}名称`);
      return;
}
    const selectedProductLine = productLines.find((line) => line.name === formProductLineName);
    const selectedVersion = versions.find((version) => version.name === formVersionName);
    let saveSucceeded = true;
    if (editingTask) {
      updateTask(editingTask.id, {
        title: formTitle,
        description: formDescription,
        descriptionHtml: formDescriptionHtml,
        expectedGoal: formTarget,
        dueDate: formDueDate,
        ownerName: formOwnerName,
        priority: formPriority,
        productLineId: selectedProductLine?.id,
        versionName: formVersionName,
        versionId: selectedVersion?.id,
        customerName: formCustomerName,
        productLineName: formProductLineName,
        estimatedHours: Number(formEstimatedHours),
        requirementType: formRequirementType,
        ccNames: formCcNames,
        plannedStartDate: formPlannedStartDate,
        expectedCompleteDate: formExpectedCompleteDate,
        sourceWorkOrderIds: selectedWorkOrderIds,
        sourceWorkOrderTitles: candidateOptions.filter((item) => selectedWorkOrderIds.includes(item.id)).map((item) => item.title),
        requirementId: selectedRequirementTaskIds[0] || '',
        media: formMedia
      });
      addToast('success', `${itemLabel}信息已更新`);
    } else {
      const saved = await addTask({
        title: formTitle,
        description: formDescription,
        productLineId: selectedProductLine?.id,
        productLineName: formProductLineName,
        versionId: selectedVersion?.id,
        versionName: formVersionName,
        priority: formPriority,
        status: '待处理',
        ownerName: formOwnerName,
        dueDate: formDueDate,
        estimatedHours: Number(formEstimatedHours),
        customerName: formCustomerName,
        expectedGoal: formTarget,
        descriptionHtml: formDescriptionHtml,
        requirementType: formRequirementType,
        ccNames: formCcNames,
        plannedStartDate: formPlannedStartDate,
        expectedCompleteDate: formExpectedCompleteDate,
        sourceWorkOrderIds: selectedWorkOrderIds,
        sourceWorkOrderTitles: candidateOptions.filter((item) => selectedWorkOrderIds.includes(item.id)).map((item) => item.title),
        requirementId: selectedRequirementTaskIds[0] || '',
        media: formMedia
      });
      saveSucceeded = saved !== false;
      if (saveSucceeded) addToast('success', taskKind === 'design' ? '设计任务已写入' : isBusinessTask ? `${itemLabel}已写入` : '需求任务已写入', taskKind === 'design' ? '已保存到设计任务数据表' : isBusinessTask ? `已保存到${itemLabel}数据表` : '已自动同步录入云效需求池与版本规划');
    }
    if (saveSucceeded) setIsModalOpen(false);
  };

  const handleSaveAndContinue = (e: React.MouseEvent) => {
    void handleSaveTask(e as unknown as React.FormEvent);
    if (formTitle.trim()) window.setTimeout(openAddModal, 0);
  };

  const uniqueValues = (values: Array<string | undefined>) => Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const creatorOptions = uniqueValues(requirementTasks.map((task) => task.creatorName || currentUser.name));
  const customerOptions = uniqueValues(requirementTasks.map((task) => task.customerName));
  const versionOptions = uniqueValues(requirementTasks.map((task) => task.versionName));
  const ccOptions = uniqueValues(requirementTasks.flatMap((task) => task.ccNames || []));
  const groupOptions: Array<[RequirementGroupKey, string]> = [
    ['priority', '优先级'],
    ['status', '状态'],
    ['owner', '负责人'],
    ['creator', '创建者'],
    ['version', '迭代版本'],
    ['customer', '关联客户'],
    ['requirementType', '需求类型']
  ];
  const categoryMatch = (task: RequirementTask, tab: typeof activeTab) => {
    if (tab === 'all') return true;
    if (tab === 'my_owned') return task.ownerName.trim() === currentUser.name.trim();
    return (task.creatorName || '').trim() === currentUser.name.trim();
  };
  const textMatches = (value: string | undefined, query: string) => !query || (value || '').toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const matchesTextFilter = (value: string | undefined, filter: { operator: TextFilterOperator; value: string }) => {
    if (!filter.value.trim()) return true;
    const matched = textMatches(value, filter.value.trim());
    return filter.operator === 'include' ? matched : !matched;
  };
  const matchesMultiFilter = (values: Array<string | undefined>, filter: MultiFilterValue) => {
    if (filter.values.length === 0) return true;
    const matched = values.some((value) => value && filter.values.includes(value));
    return filter.operator === 'include' ? matched : !matched;
  };
  const matchesDateFilter = (value: string | undefined, filter: DateFilterValue) => {
    if (!filter.from && !filter.to) return true;
    const normalizedValue = value || '';
    if (!normalizedValue) return false;
    if (filter.operator === 'equals') return normalizedValue === filter.from;
    if (filter.operator === 'after') return normalizedValue > filter.from;
    if (filter.operator === 'before') return normalizedValue < filter.from;
    const start = filter.from && filter.to && filter.from > filter.to ? filter.to : filter.from;
    const end = filter.from && filter.to && filter.from > filter.to ? filter.from : filter.to;
    return (!start || normalizedValue >= start) && (!end || normalizedValue <= end);
  };
  const matchesFilters = (task: RequirementTask, filters: RequirementFilterState) => (
    matchesTextFilter(task.title, filters.title) &&
    matchesMultiFilter([task.status], filters.status) &&
    matchesMultiFilter([task.ownerName], filters.owner) &&
    matchesMultiFilter([task.creatorName || currentUser.name], filters.creator) &&
    matchesMultiFilter([task.customerName], filters.customer) &&
    matchesMultiFilter([task.versionName], filters.version) &&
    matchesDateFilter(task.createdAt, filters.createdAt) &&
    matchesDateFilter(task.plannedStartDate, filters.plannedStartDate) &&
    matchesMultiFilter(task.ccNames || [], filters.cc)
  );
  const selectedProductLine = productLines.find((line) => line.id === productLineFilter);
  const productLineTasks = productLineFilter === 'all' ? activeTasks : activeTasks.filter((task) => task.productLineId === productLineFilter || task.productLineName === selectedProductLine?.name);
  const baseTasks = productLineTasks.filter((task) => categoryMatch(task, activeTab));
  const filteredTasks = baseTasks.filter((task) => {
    const titlePart = searchQuery.trim().toLocaleLowerCase();
    const titleMatch = textMatches(task.title, titlePart);
    const ownerMatch = searchOwnerNames.length === 0 || searchOwnerNames.includes(task.ownerName);
    return titleMatch && ownerMatch && matchesFilters(task, appliedFilters);
  });
  const tabCounts = {
    all: productLineTasks.length,
    my_owned: productLineTasks.filter((task) => categoryMatch(task, 'my_owned')).length,
    my_created: productLineTasks.filter((task) => categoryMatch(task, 'my_created')).length
  };
  const getGroupValue = (task: RequirementTask) => {
    switch (groupBy) {
      case 'priority': return normalizePriority(task.priority) || '未设置';
      case 'status': return task.status || '未设置';
      case 'owner': return task.ownerName || '未设置';
      case 'creator': return task.creatorName || currentUser.name;
      case 'version': return task.versionName || '未关联';
      case 'customer': return task.customerName || '未关联';
      case 'requirementType': return task.requirementType || '未设置';
      default: return '';
    }
  };
  const groupTabs = groupBy === 'none' ? [] : Array.from(filteredTasks.reduce((groups, task) => {
    const label = getGroupValue(task);
    groups.set(label, (groups.get(label) || 0) + 1);
    return groups;
  }, new Map<string, number>()));
  const effectiveGroupValue = groupBy === 'none' ? '' : groupTabs.some(([label]) => label === groupValue) ? groupValue : groupTabs[0]?.[0] || '';
  const visibleTasks = groupBy === 'none' ? filteredTasks : filteredTasks.filter((task) => getGroupValue(task) === effectiveGroupValue);
  const pagedTasks = visibleTasks.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [activeTab, searchQuery, searchOwnerNames, appliedFilters, groupBy, groupValue, pageSize, productLineFilter]);

  const applySearch = () => {
    setSearchQuery(searchDraft.trim());
    setSearchOwnerPickerOpen(false);
  };

  const clearFilters = () => {
    setFilterDraft(createEmptyRequirementFilters());
    setAppliedFilters(createEmptyRequirementFilters());
  };
  const activeFilterCount = [
    appliedFilters.title.value,
    appliedFilters.status.values.length > 0,
    appliedFilters.owner.values.length > 0,
    appliedFilters.creator.values.length > 0,
    appliedFilters.customer.values.length > 0,
    appliedFilters.version.values.length > 0,
    appliedFilters.createdAt.from || appliedFilters.createdAt.to,
    appliedFilters.plannedStartDate.from || appliedFilters.plannedStartDate.to,
    appliedFilters.cc.values.length > 0
  ].filter(Boolean).length;
  const operatorText = (operator: TextFilterOperator) => operator === 'include' ? '包含' : '不包含';
  const dateOperatorText = (operator: DateFilterOperator) => ({ between: '介于', equals: '等于', after: '大于', before: '小于' }[operator]);
  const appliedFilterLabels: Array<{ key: keyof RequirementFilterState; text: string }> = [
    appliedFilters.title.value && { key: 'title', text: `标题：“${appliedFilters.title.value}”` },
    appliedFilters.status.values.length > 0 && { key: 'status', text: `状态 ${operatorText(appliedFilters.status.operator)} ${appliedFilters.status.values.join('、')}` },
    appliedFilters.owner.values.length > 0 && { key: 'owner', text: `负责人 ${operatorText(appliedFilters.owner.operator)} ${appliedFilters.owner.values.join('、')}` },
    appliedFilters.creator.values.length > 0 && { key: 'creator', text: `创建人 ${operatorText(appliedFilters.creator.operator)} ${appliedFilters.creator.values.join('、')}` },
    appliedFilters.customer.values.length > 0 && { key: 'customer', text: `关联客户 ${operatorText(appliedFilters.customer.operator)} ${appliedFilters.customer.values.join('、')}` },
    appliedFilters.version.values.length > 0 && { key: 'version', text: `迭代版本 ${operatorText(appliedFilters.version.operator)} ${appliedFilters.version.values.join('、')}` },
    (appliedFilters.createdAt.from || appliedFilters.createdAt.to) && { key: 'createdAt', text: `创建时间 ${dateOperatorText(appliedFilters.createdAt.operator)} ${appliedFilters.createdAt.from}${appliedFilters.createdAt.to ? ` 至 ${appliedFilters.createdAt.to}` : ''}` },
    (appliedFilters.plannedStartDate.from || appliedFilters.plannedStartDate.to) && { key: 'plannedStartDate', text: `计划开始时间 ${dateOperatorText(appliedFilters.plannedStartDate.operator)} ${appliedFilters.plannedStartDate.from}${appliedFilters.plannedStartDate.to ? ` 至 ${appliedFilters.plannedStartDate.to}` : ''}` },
    appliedFilters.cc.values.length > 0 && { key: 'cc', text: `参与人 ${operatorText(appliedFilters.cc.operator)} ${appliedFilters.cc.values.join('、')}` }
  ].filter(Boolean) as Array<{ key: keyof RequirementFilterState; text: string }>;
  const groupLabel = groupOptions.find(([key]) => key === groupBy)?.[1];
  const visibleGroupOptions = groupOptions.filter(([, label]) => label.includes(groupQuery.trim()));
  const hasSearch = Boolean(searchQuery || searchOwnerNames.length);
  const filterInputClass = 'h-8 w-full rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]';
  const setFilterDate = (field: 'createdAt' | 'plannedStartDate', part: 'from' | 'to', value: string) => {
    setFilterDraft((current) => ({ ...current, [field]: { ...current[field], [part]: value } }));
  };
  const setMultiFilter = (field: 'status' | 'owner' | 'creator' | 'customer' | 'version' | 'cc', value: MultiFilterValue) => {
    setFilterDraft((current) => ({ ...current, [field]: value }));
  };
  const removeAppliedFilter = (field: keyof RequirementFilterState) => {
    const emptyFilters = createEmptyRequirementFilters();
    setAppliedFilters((current) => ({ ...current, [field]: emptyFilters[field] } as RequirementFilterState));
  };
  const multiFilterRow = (label: string, field: 'status' | 'owner' | 'creator' | 'customer' | 'version' | 'cc', options: string[]) => {
    const value = filterDraft[field];
    return <div className="filter-row grid h-8 grid-cols-[96px_88px_minmax(0,1fr)] items-center rounded-md border border-[var(--border-main)] bg-[var(--bg-card)]">
      <div className="filter-label flex h-full items-center px-3 font-medium text-[var(--text-body)]">{label}</div>
      <div className="filter-operator flex h-full items-center border-x border-[var(--border-main)] px-2">
        <select aria-label={`${label}过滤方式`} value={value.operator} onChange={(event) => setMultiFilter(field, { ...value, operator: event.target.value as TextFilterOperator })} className="h-8 w-full border-0 bg-transparent p-0 text-[var(--text-primary)] outline-none">
          <option value="include">包含</option><option value="exclude">不包含</option>
        </select>
      </div>
      <div className="filter-value px-2"><SearchableSelect label={label} hideLabel compact multiple value="" options={options} selectedValues={value.values} onChange={() => undefined} onChangeMultiple={(values) => setMultiFilter(field, { ...value, values })} placeholder="请选择或输入关键字查询" clearable /></div>
    </div>;
  };
  const dateFilterRow = (label: string, field: 'createdAt' | 'plannedStartDate') => {
    const value = filterDraft[field];
    const dateInput = (part: 'from' | 'to', placeholder: string) => <span className="relative flex h-8 min-w-0 items-center px-3 text-[var(--text-muted)] focus-within:text-[var(--text-primary)]">
      <span className={`pointer-events-none truncate ${value[part] ? 'text-[var(--text-primary)]' : ''}`}>{value[part] || placeholder}</span>
      <Calendar className="pointer-events-none absolute right-2.5 h-4 w-4 text-[var(--text-muted)]" />
      <input aria-label={`${label}${part === 'from' ? '开始' : '结束'}`} type="date" value={value[part]} onChange={(event) => setFilterDate(field, part, event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </span>;
    return <div className="filter-row grid h-8 grid-cols-[96px_88px_minmax(0,1fr)] items-center rounded-md border border-[var(--border-main)] bg-[var(--bg-card)]">
      <div className="filter-label flex h-full items-center px-3 font-medium text-[var(--text-body)]">{label}</div>
      <div className="filter-operator flex h-full items-center border-x border-[var(--border-main)] px-2"><select aria-label={`${label}过滤方式`} value={value.operator} onChange={(event) => setFilterDraft((current) => ({ ...current, [field]: { ...value, operator: event.target.value as DateFilterOperator, to: event.target.value === 'between' ? value.to : '' } }))} className="h-8 w-full border-0 bg-transparent p-0 text-[var(--text-primary)] outline-none"><option value="between">介于</option><option value="equals">等于</option><option value="after">大于</option><option value="before">小于</option></select></div>
      <div className={`grid items-center gap-2 px-2 ${value.operator === 'between' ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1'}`}>
        {dateInput('from', value.operator === 'between' ? '起始日期' : '选择日期')}
        {value.operator === 'between' && <><span className="text-center text-[var(--text-muted)]">-</span>{dateInput('to', '结束日期')}</>}
      </div>
    </div>;
  };

  return (
    <div className="task-page space-y-6 animate-in fade-in duration-150">
      {/* Tabs + Search + Filter + Group */}
      <div ref={controlsRef} className="task-page-toolbar bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* 分类 */}
          <div className="app-segmented flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {([['all', '全部'], ['my_owned', '我负责的'], ['my_created', '我创建的']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium transition-colors ${activeTab === key ? 'border-slate-200/80 bg-white font-semibold text-[#1677FF] shadow-2xs dark:border-[#2C3440] dark:bg-[#121923] dark:text-[#6EA0FF]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-[#7C8796] dark:hover:text-[#F8FAFC]'}`}>
                {label}·{tabCounts[key]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-1">
              <div className="flex h-8 items-center">
                <div className={`relative overflow-hidden transition-[width,opacity] duration-200 ease-out ${searchOpen ? 'mr-1 w-64 opacity-100' : 'w-0 opacity-0'}`}>
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><input autoFocus={searchOpen} value={searchDraft} onChange={(event) => { const nextValue = event.target.value; if (nextValue.includes('@')) { setSearchDraft(nextValue.replaceAll('@', '')); setSearchOwnerPickerOpen(true); } else { setSearchDraft(nextValue); } }} onKeyDown={(event) => { event.stopPropagation(); if (event.key === 'Enter') { event.preventDefault(); applySearch(); } }} placeholder="输入标题或@负责人" className="app-control h-8 w-64 pl-8 pr-3 text-xs" />
                </div>
              </div>
              <button type="button" aria-label="搜索" aria-pressed={searchOpen} onClick={() => { setSearchOpen((open) => !open); setSearchOwnerPickerOpen(false); setFilterOpen(false); setGroupOpen(false); }} className={`rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${searchOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}><Search className="h-4 w-4" /></button>
              <button type="button" aria-label="过滤器" aria-pressed={filterOpen} onClick={() => { setFilterDraft(appliedFilters); setFilterOpen((open) => !open); setSearchOpen(false); setSearchOwnerPickerOpen(false); setGroupOpen(false); }} className={`relative rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${filterOpen || activeFilterCount ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}><Filter className="h-4 w-4" />{activeFilterCount > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-blue-600 px-1 text-center text-[10px] leading-4 text-white">{activeFilterCount}</span>}</button>
              <button type="button" aria-label="分组" aria-pressed={groupOpen} onClick={() => { setGroupOpen((open) => !open); setFilterOpen(false); setSearchOpen(false); setSearchOwnerPickerOpen(false); }} className={`rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${groupOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}><List className="h-4 w-4" /></button>
              {searchOpen && searchOwnerPickerOpen && <div className="absolute left-0 top-11 z-40 w-[min(88vw,300px)]"><SearchableSelect label="搜索负责人" hideLabel hideTrigger open={searchOwnerPickerOpen} onOpenChange={setSearchOwnerPickerOpen} compact multiple value="" options={employees} selectedValues={searchOwnerNames} onChange={() => undefined} onChangeMultiple={setSearchOwnerNames} placeholder="搜索负责人" clearable /></div>}
              {groupOpen && <div className="absolute right-0 top-11 z-40 w-64 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-3 shadow-xl"><div className="mb-2 flex items-center gap-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)] px-2"><Search className="h-4 w-4 text-[var(--text-muted)]" /><input value={groupQuery} onChange={(event) => setGroupQuery(event.target.value)} placeholder="搜索..." className="h-8 min-w-0 flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]" /></div>{visibleGroupOptions.map(([key, label]) => <button key={key} type="button" onClick={() => { setGroupBy(key); setGroupValue(''); setGroupOpen(false); }} className="flex w-full items-center justify-between px-1 py-2 text-left text-[var(--text-primary)] hover:text-[var(--primary)]">按{label}分组{groupBy === key && <Check className="h-4 w-4 text-emerald-500" />}</button>)}<button type="button" onClick={() => { setGroupBy('none'); setGroupValue(''); setGroupOpen(false); }} className="flex w-full items-center justify-between border-t border-[var(--border-main)] px-1 py-2 text-left text-[var(--text-primary)] hover:text-[var(--primary)]">取消分组{groupBy === 'none' && <Check className="h-4 w-4 text-emerald-500" />}</button></div>}
            </div>
            <button
              id="btn-add-req-task"
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              新建{itemLabel}
            </button>
          </div>
        </div>
        {filterOpen && <div className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-4">
          <div className="grid gap-2 overflow-visible lg:grid-cols-2">
            <div className="filter-row grid h-8 grid-cols-[96px_minmax(0,1fr)] items-center rounded-md border border-[var(--border-main)] bg-[var(--bg-card)]">
              <div className="filter-label flex h-full items-center px-3 font-medium text-[var(--text-body)]">标题</div>
              <div className="filter-value flex h-full items-center border-l border-[var(--border-main)] px-2"><input value={filterDraft.title.value} onChange={(event) => setFilterDraft((current) => ({ ...current, title: { ...current.title, value: event.target.value } }))} className={`${filterInputClass} h-8 border-0 bg-transparent p-0 focus:border-0`} placeholder="请输入标题关键词" /></div>
            </div>
            {multiFilterRow('状态', 'status', STAGES)}
            {multiFilterRow('负责人', 'owner', employees)}
            {multiFilterRow('创建人', 'creator', creatorOptions)}
            {multiFilterRow('关联客户', 'customer', customerOptions)}
            {multiFilterRow('迭代版本', 'version', versionOptions)}
            {dateFilterRow('创建时间', 'createdAt')}
            {dateFilterRow('计划开始时间', 'plannedStartDate')}
            {multiFilterRow('参与人', 'cc', ccOptions)}
          </div>
          <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={clearFilters} className="app-button-secondary h-8 px-3 text-xs">清空</button><button type="button" onClick={() => { setAppliedFilters(filterDraft); setFilterOpen(false); }} className="tech-button-primary h-8 rounded-lg px-3 text-xs">应用过滤</button></div>
        </div>}
        {(hasSearch || activeFilterCount > 0) && <div className="flex min-h-11 flex-wrap items-center gap-2 border-b border-[var(--border-main)] px-1 py-2 text-[11px]">
          {hasSearch && <span className="group/tag inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">搜索：{searchQuery || '负责人'}{searchOwnerNames.length ? ` · ${searchOwnerNames.join('、')}` : ''}<button type="button" aria-label="清除搜索" onClick={() => { setSearchDraft(''); setSearchQuery(''); setSearchOwnerNames([]); }} className="opacity-0 transition-opacity group-hover/tag:opacity-100"><X className="h-3 w-3" /></button></span>}
          {appliedFilterLabels.map(({ key, text }) => <span key={key} className="group/tag inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">{text}<button type="button" aria-label={`删除${text}`} onClick={() => removeAppliedFilter(key)} className="opacity-0 transition-opacity group-hover/tag:opacity-100"><X className="h-3 w-3" /></button></span>)}
          {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="text-blue-600 hover:text-blue-700">清空过滤条件</button>}
        </div>}
        {groupBy !== 'none' && <div className="flex min-h-11 flex-wrap items-center gap-4 border-b border-[var(--border-main)] px-1 py-2 text-xs">
          <span className="font-medium text-[var(--text-body)]">按{groupLabel}分组：</span>
          {groupTabs.map(([label, count]) => <button key={label} type="button" onClick={() => setGroupValue(label)} className={`border-b-2 px-1 py-1 transition-colors ${effectiveGroupValue === label ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{label}<span className="ml-1 text-[var(--active-text)]">{count}</span></button>)}
          <button type="button" onClick={() => { setGroupBy('none'); setGroupValue(''); }} className="text-[var(--active-text)] hover:text-[var(--primary-hover)]">取消分组</button>
        </div>}
      </div>

      {/* Requirement List Table (列表信息: 标题、状态、优先级、负责人、创建人、添加时间) */}
      <div className="task-page-table bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4">标题</th>
                  <th className="py-3 px-4">状态</th>
                  <th className="py-3 px-4">优先级</th>
                  <th className="py-3 px-4">产品线</th>
                  <th className="py-3 px-4">负责人</th>
                  <th className="py-3 px-4">创建人</th>
                  <th className="py-3 px-4">创建时间</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedTasks.map((t) => (
                  <React.Fragment key={t.id}>
                  <tr
                    key={`${t.id}-row`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="max-w-[320px] py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      <button type="button" onClick={() => setSelectedTask(t)} className="line-clamp-2 max-w-[320px] text-left text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]" title={t.title}>{t.title}</button>
                    </td>
                    <td className="py-3.5 px-4">
                      <InlineEditableSelect value={t.status} options={STAGES} tone="status" onChange={(status) => updateTask(t.id, { status })} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusTag status={normalizePriority(t.priority)} />
                    </td>
                    <td className="max-w-[240px] py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      <span className="line-clamp-2" title={`${t.productLineName || '未设置'} · ${t.versionName || '未关联'}`}>{t.productLineName || '未设置'} · <span className="font-mono text-blue-600">{t.versionName || '未关联'}</span></span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <InlineEditableSelect value={t.ownerName} options={employees} onChange={(ownerName) => updateTask(t.id, { ownerName })} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {t.creatorName || currentUser.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {t.createdAt || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedTask(t)}
                          className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                        >
                          详情 <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  </React.Fragment>
                ))}
                {pagedTasks.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">没有符合当前搜索、过滤或分组条件的{itemLabel === '需求任务' ? '需求' : itemLabel}</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination total={visibleTasks.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* Task Detail Drawer */}
      {selectedTask && (
        <WorkItemCreatePanel
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={`${itemLabel}详情`}
          presentation="drawer"
          showContinueOption={false}
          footer={
            <>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="tech-button-primary h-10 rounded-lg px-4 text-xs font-semibold"
              >
                关闭
              </button>
            </>
          }
          properties={<div className="space-y-6 text-xs">
            <section className="space-y-3">
              <h3 className="font-semibold text-[var(--text-primary)]">基础字段</h3>
              <SearchableSelect label="当前状态" value={selectedTask.status} options={STAGES} onChange={(status) => saveDetailUpdates({ status })} />
              <SearchableSelect label="需求类型" value={selectedTask.requirementType || ''} options={['业务需求', '产品优化', '技术需求', '合规需求']} onChange={(requirementType) => saveDetailUpdates({ requirementType })} placeholder="未设置" clearable />
              <SearchableSelect label="负责人" value={selectedTask.ownerName || ''} options={employees} onChange={(ownerName) => saveDetailUpdates({ ownerName })} placeholder="未设置" />
              <SearchableSelect label="优先级" value={normalizePriority(selectedTask.priority)} options={['紧急', '高', '中', '低']} onChange={(priority) => saveDetailUpdates({ priority: priority as RequirementTask['priority'] })} />
              <SearchableSelect label="所属产品线" value={selectedTask.productLineName || ''} options={productLines.map((line) => line.name)} onChange={(productLineName) => saveDetailUpdates({ productLineName, productLineId: productLines.find((line) => line.name === productLineName)?.id, versionName: '' })} placeholder="未设置" />
              <DetailDateInput label="计划开始时间" value={selectedTask.plannedStartDate} onSave={(plannedStartDate) => saveDetailUpdates({ plannedStartDate })} />
              <DetailDateInput label="计划完成时间" value={selectedTask.dueDate} onSave={(dueDate) => saveDetailUpdates({ dueDate })} />
              <DetailDateInput label="期望完成时间" value={selectedTask.expectedCompleteDate} onSave={(expectedCompleteDate) => saveDetailUpdates({ expectedCompleteDate })} />
              <SearchableSelect label="迭代版本" value={selectedTask.versionName || ''} options={versions.filter((v) => !v.productLineName || v.productLineName === selectedTask.productLineName).map((v) => v.name)} onChange={(versionName) => saveDetailUpdates({ versionName, versionId: versions.find((v) => v.name === versionName)?.id })} placeholder="未设置" clearable />
              <SearchableSelect label="关联客户" value={selectedTask.customerName || ''} options={customers.map((customer) => customer.name)} onChange={(customerName) => saveDetailUpdates({ customerName })} placeholder="未关联" clearable />
              <SearchableSelect label="参与人" value="" options={employees.filter((name) => !(selectedTask.ccNames || []).includes(name))} onChange={(name) => saveDetailUpdates({ ccNames: [...(selectedTask.ccNames || []), name] })} placeholder="添加参与人" />
              {selectedTask.ccNames?.length ? <div className="flex flex-wrap gap-1.5">{selectedTask.ccNames.map((name) => <button type="button" key={name} onClick={() => saveDetailUpdates({ ccNames: selectedTask.ccNames?.filter((item) => item !== name) })} className="rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--text-body)]">{name} ×</button>)}</div> : null}
            </section>
            <section className="space-y-3 border-t border-[var(--border-main)] pt-4">
              <h3 className="font-semibold text-[var(--text-primary)]">工时</h3>
              <DetailTextInput label="预计工时（小时）" value={String(selectedTask.estimatedHours ?? 0)} onSave={(value) => saveDetailUpdates({ estimatedHours: Number(value) || 0 })} />
            </section>
            <section className="space-y-3 border-t border-[var(--border-main)] pt-4">
              <h3 className="font-semibold text-[var(--text-primary)]">附件</h3>
              {selectedTask.media?.length ? selectedTask.media.map((item) => <a key={item.id} href={item.dataUrl} download={item.name} className="flex items-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2 text-[var(--text-body)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"><FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{item.name}</span></a>) : <p className="rounded-lg border border-dashed border-[var(--border-main)] px-3 py-3 text-center text-[var(--text-muted)]">暂无附件</p>}
            </section>
          </div>}
        >
          <div className="w-full space-y-5 text-xs">
            <DetailTextInput label={`${itemLabel}名称`} value={selectedTask.title} onSave={(title) => title.trim() && saveDetailUpdates({ title })} />
            <DetailTextInput label="验收标准" value={selectedTask.expectedGoal || ''} onSave={(expectedGoal) => saveDetailUpdates({ expectedGoal })} multiline />
            <label className="block text-[var(--text-muted)]"><span>任务描述</span><div className="mt-1"><RichTextEditor editor={detailDescriptionEditor} value={detailDescription} htmlValue={detailDescriptionHtml} onInput={(text, html) => { setDetailDescription(text); setDetailDescriptionHtml(html); }} onBlur={() => saveDetailUpdates({ description: detailDescription, descriptionHtml: detailDescriptionHtml })} placeholder="详细记录需求背景、业务场景和实现说明..." /></div></label>
            <section className="border-t border-[var(--border-main)] pt-4">
              <div className="mb-4 flex items-center gap-5 border-b border-[var(--border-main)]">
                <button type="button" onClick={() => setDetailTab('activity')} className={`border-b-2 px-1 pb-2 text-sm ${detailTab === 'activity' ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)]'}`}>动态 <span className="ml-1 text-[11px]">{selectedTask.events?.length || 0}</span></button>
                <button type="button" onClick={() => setDetailTab('workOrders')} className={`border-b-2 px-1 pb-2 text-sm ${detailTab === 'workOrders' ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)]'}`}>关联工单 <span className="ml-1 text-[11px]">{selectedTask.sourceWorkOrderIds?.length || 0}</span></button>
              </div>
              {detailTab === 'workOrders' ? (
                <WorkOrderPicker candidates={candidateOptions} selectedIds={selectedTask.sourceWorkOrderIds || []} onChange={updateLinkedWorkOrders} placeholder="选择关联工单" />
              ) : (
                <div className="space-y-5">
                  <div className="space-y-4">
                    {(selectedTask.events || []).length ? [...(selectedTask.events || [])].reverse().map((event) => {
                      const metadata = event.metadata || {};
                      return <div key={event.id} className="relative pl-6 text-xs">
                        <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--primary)] ring-4 ring-[var(--primary)]/10" />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--text-muted)]"><span className="font-medium text-[var(--text-primary)]">{event.operatorName}</span><span>{eventSummary(event)}</span><span className="font-mono text-[11px]">{event.createdAt}</span></div>
                        {event.eventType === '评论' && <p className="mt-2 rounded-lg bg-[var(--bg-surface-soft)] px-3 py-2 leading-5 text-[var(--text-body)]">{String(metadata.content || '')}</p>}
                      </div>;
                    }) : <p className="text-[var(--text-muted)]">暂无动态记录</p>}
                  </div>
                  <div className="border-t border-[var(--border-main)] pt-4">
                    <label className="block text-[var(--text-muted)]"><span>发表评论</span><textarea value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} rows={4} placeholder="记录进展、问题或需要协同的事项..." className="mt-2 min-h-24 w-full resize-y rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20" /></label>
                    <div className="mt-3 flex justify-end"><button type="button" onClick={submitComment} disabled={!commentDraft.trim()} className="tech-button-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"><MessageSquare className="h-3.5 w-3.5" />发布评论</button></div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </WorkItemCreatePanel>
      )}

      {/* Add / Edit Task Modal (云效风格: 任务名称、任务描述、期望目标、完成时间、分配负责人、紧急程度、关联版本、关联客户、关联产品、预计工时) */}
      <WorkItemCreatePanel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? `编辑${itemLabel}` : `新建${itemLabel}`}
        showContinueOption={!editingTask}
        secondaryAction={!editingTask ? <button type="button" onClick={handleSaveAndContinue} className="app-button-secondary h-10 px-4 text-xs font-semibold">保存并继续</button> : undefined}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="app-button-secondary h-10 px-4 text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveTask}
              className="tech-button-primary h-10 rounded-lg px-4 text-xs font-semibold"
            >
              保存
            </button>
          </>
        }
        properties={<div className="space-y-6 text-xs">
          <section className="space-y-3">
            <h3 className="font-semibold text-[var(--text-primary)]">基础字段</h3>
            <SearchableSelect label="需求类型" required value={formRequirementType} options={['业务需求', '产品优化', '技术需求', '合规需求']} onChange={setFormRequirementType} placeholder="请选择需求类型" />
            <SearchableSelect label="负责人" required value={formOwnerName} options={employees} onChange={setFormOwnerName} placeholder="搜索并选择负责人" />
            <SearchableSelect label="优先级" required value={formPriority} options={['紧急', '高', '中', '低']} onChange={(value) => setFormPriority(value as RequirementTask['priority'])} placeholder="请选择优先级" />
            <SearchableSelect label="所属产品线" required value={formProductLineName} options={productLines.map((pl) => pl.name)} onChange={(value) => { setFormProductLineName(value); setFormVersionName(''); }} placeholder="请选择所属产品线" />
            <DateField label="计划开始时间" value={formPlannedStartDate} onChange={setFormPlannedStartDate} required />
            <DateField label="计划完成时间" value={formDueDate} onChange={setFormDueDate} required />
            <DateField label="期望完成时间" value={formExpectedCompleteDate} onChange={setFormExpectedCompleteDate} />
            <SearchableSelect label="迭代版本" value={formVersionName} options={versions.filter((v) => !v.productLineName || v.productLineName === formProductLineName).map((v) => v.name)} onChange={setFormVersionName} placeholder="暂不关联" clearable emptyText="该产品线暂无可选版本" />
            <SearchableSelect label="关联客户" value={formCustomerName} options={customers.map((c) => c.name)} onChange={setFormCustomerName} placeholder="暂不关联" clearable />
            <SearchableSelect label="参与人" value="" options={employees.filter((name) => !formCcNames.includes(name))} onChange={(name) => setFormCcNames((items) => [...items, name])} placeholder="搜索并选择参与人" />
            {formCcNames.length > 0 && <div className="flex flex-wrap gap-1.5">{formCcNames.map((name) => <span key={name} className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--text-body)]">{name}<button type="button" aria-label={`移除参与人${name}`} onClick={() => setFormCcNames((items) => items.filter((item) => item !== name))}><X className="h-3 w-3" /></button></span>)}</div>}
          </section>
          <section className="space-y-3 border-t border-[var(--border-main)] pt-4">
            <h3 className="font-semibold text-[var(--text-primary)]">工时</h3>
            <label className="block text-[var(--text-muted)]">预计工时（小时）<input min="0" type="number" value={formEstimatedHours} onChange={(e) => setFormEstimatedHours(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2.5 text-[var(--text-primary)]" /></label>
          </section>
          <section className="space-y-3 border-t border-[var(--border-main)] pt-4">
            <h3 className="font-semibold text-[var(--text-primary)]">附件</h3>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-strong)] px-3 py-3 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"><Paperclip className="h-4 w-4" />添加文档附件<input type="file" accept=".txt,.doc,.docx,.xls,.xlsx,.pdf" multiple className="sr-only" onChange={onDocumentMedia} /></label>
            {formMedia.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-lg bg-[var(--bg-surface-soft)] p-2 text-[var(--text-body)]"><FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{item.name}</span><button type="button" aria-label={`移除附件${item.name}`} onClick={() => setFormMedia((items) => items.filter((media) => media.id !== item.id))}><X className="h-4 w-4" /></button></div>)}
          </section>
        </div>}
      >
        <form onSubmit={handleSaveTask} className="w-full space-y-5 text-xs" data-work-item-form>
          <div className="space-y-5">
            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {itemLabel}名称 *
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
                验收标准
              </label>
              <input
                type="text"
                value={formTarget}
                onChange={(e) => setFormTarget(e.target.value)}
                placeholder="例如：通过自动化单测，支撑压测 QPS 突破 5000"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                任务描述
              </label>
              <RichTextEditor editor={descriptionEditor} value={formDescription} htmlValue={formDescriptionHtml} onInput={(text, html) => { setFormDescription(text); setFormDescriptionHtml(html); }} placeholder="详细记录需求背景、业务场景和实现说明..." />
            </div>

            <label className="block text-[var(--text-muted)]"><span>关联对象</span><WorkOrderPicker candidates={candidateOptions.filter((item) => item.id !== editingTask?.id)} selectedIds={[...selectedRequirementTaskIds, ...selectedWorkOrderIds]} onChange={(ids) => { const selectedId = ids.slice(-1)[0] || ''; const selectedItem = candidateOptions.find((item) => item.id === selectedId); setSelectedRequirementTaskIds(selectedItem?.type === 'requirement' ? [selectedId] : []); setSelectedWorkOrderIds(selectedItem && selectedItem.type !== 'requirement' ? [selectedId] : []); }} placeholder="请选择关联需求或工单" /></label>
          </div>
        </form>
      </WorkItemCreatePanel>
    </div>
  );
};
