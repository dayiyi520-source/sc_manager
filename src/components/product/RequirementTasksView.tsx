import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, DatePicker, Dropdown, Form, Input, InputNumber, Modal, Popover, Segmented, Select, Tag, Upload } from 'antd';
import { ApartmentOutlined, CopyOutlined, DeleteOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  Search,
  Filter,
  Plus,
  Check,
  FileText,
  Sparkles,
  List
} from '@/components/common/octicons-compat';
import { MessageSquare, Paperclip, X } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatusTag } from '../common/UIComponents';
import { DateField } from '../common';
import { DefectBug, DevTask, ProductLineWorkItemType, RequirementEvent, RequirementMedia, RequirementPoolItem, RequirementTask, RequirementWorkOrderCandidate, RequirementWorkOrderType } from '../../types';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
import { WorkItemStatusTag } from './WorkItemStatusTag';
import { LazyRichTextEditor as RichTextEditor } from './LazyRichTextEditor';
import { Pagination } from '../common/Pagination';
import { requirementRepository } from '../../services/requirementRepository';
import { teamRepository } from '../../services/teamRepository';
import { productRepository, UnifiedWorkItem, WorkItemTransitionAction, WorkItemTransitionOptions } from '../../services/productRepository';
import { readSession } from '../../services/session';
import { preferredWorkItemTypeName } from './workItemTypeDefaults';
import { CollapsibleDescription } from './CollapsibleDescription';

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
const apiPriority = (priority: string) => ({ 紧急: 'P0', 高: 'P1', 中: 'P2', 低: 'P3' }[normalizePriority(priority)] || 'P2');
const workItemCategoryLabel: Record<string, string> = { requirement: '需求', design: '设计', dev: '研发', test: '测试', bug: '缺陷' };

const SearchableSelect: React.FC<{ label: string; value: string; options: string[]; onChange: (value: string) => void; placeholder?: string; clearable?: boolean }> = ({ label, value, options, onChange, placeholder = '请选择', clearable }) => (
  <label className="block text-[var(--text-muted)]"><span>{label}</span><Select showSearch optionFilterProp="label" allowClear={clearable} value={value || undefined} onChange={(next) => onChange(next || '')} options={options.map((option) => ({ label: option, value: option }))} placeholder={placeholder} className="mt-1 w-full" /></label>
);

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

const DetailNumberInput: React.FC<{ label: string; value: number; onSave: (value: number) => void }> = ({ label, value, onSave }) => {
  const [draft, setDraft] = useState<number | null>(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { const next = draft ?? 0; if (next !== value) onSave(next); };
  return <label className="block text-[var(--text-muted)]"><span>{label}</span><InputNumber min={0} value={draft} onChange={setDraft} onBlur={commit} onPressEnter={commit} className="mt-1 w-full" /></label>;
};

const WORK_ORDER_TYPES: Array<{ key: RequirementWorkOrderType; label: string }> = [
  { key: 'requirement', label: '客户诉求' }, { key: 'bug', label: '线上问题' }, { key: 'task', label: '售前支持' },
  { key: 'risk', label: '交付支持' }, { key: 'source', label: '其他问题' }
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

export type WorkItemDetailContext = { task: RequirementTask; children: Array<Record<string, unknown>> };
export type WorkItemCreatePolicy = { requireRequirement?: boolean; allowedChildTypeNames?: string[] };
type RequirementTasksViewProps = {
  productLineFilter?: string;
  itemLabel?: string;
  taskKind?: 'requirement' | 'design' | 'test' | 'bug' | 'dev' | 'presales' | 'delivery' | 'ops';
  renderDetail?: (context: WorkItemDetailContext) => React.ReactNode;
  createPolicy?: WorkItemCreatePolicy;
};

export const RequirementTasksView: React.FC<RequirementTasksViewProps> = ({ productLineFilter = 'all', itemLabel = '需求任务', taskKind = 'requirement', renderDetail, createPolicy }) => {
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
    productRepository.businessTasks(taskKind).then((result) => setBusinessTasks(result.items)).catch(() => setBusinessTasks([]));
  }, [isBusinessTask, taskKind]);
  useEffect(() => {
    if (taskKind === 'bug') setSpecialTasks(bugs.map((item: DefectBug) => ({ ...item, ownerName: item.ownerName || item.assignee || '', expectedGoal: '', dueDate: '', priority: item.priority || '中', versionName: item.versionName || '', productLineName: item.productLineName || '', description: item.description || '', status: item.status || '待修复' })) as RequirementTask[]);
    else if (taskKind === 'dev') setSpecialTasks(devTasks.map((item: DevTask) => ({ ...item, ownerName: item.developer || '', expectedGoal: '', dueDate: '', priority: item.priority || '中', versionName: item.versionName || '', productLineName: item.productLineName || '', description: item.description || '', status: item.status || '开发中' })) as RequirementTask[]);
    else setSpecialTasks([]);
  }, [taskKind, bugs, devTasks]);
  const contextTasks = taskKind === 'design' ? designTasks : isBusinessTask ? businessTasks : isSpecialTask ? specialTasks : requirementTasks;
  const addTask = async (task: Partial<RequirementTask>) => {
    if (taskKind === 'design') return addDesignTask(task);
    if (isBusinessTask) {
      const optimistic: RequirementTask = { ...task, id: `${taskKind}-${Date.now()}`, title: task.title || `新建${itemLabel}`, description: task.description || '', expectedGoal: task.expectedGoal || '', status: task.status || '待处理', priority: task.priority || '中', ownerName: task.ownerName || currentUser.name, creatorName: currentUser.name, productLineName: task.productLineName || '', versionName: task.versionName || '', estimatedHours: task.estimatedHours || 0, dueDate: task.dueDate || '' };
      setBusinessTasks((prev) => [optimistic, ...prev]);
      try { await productRepository.createBusinessTask(taskKind, optimistic); setBusinessTasks((await productRepository.businessTasks(taskKind)).items); return true; }
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

  const remoteEnabled = Boolean(readSession());
  const remoteApiEnabled = (() => {
    const token = sessionStorage.getItem('shichuang.session.token');
    return Boolean(token && !token.startsWith('local-dev-'));
  })();
  const selectedProductLine = productLines.find((line) => line.id === productLineFilter);
  const serverPage = page;
  const serverPageSize = pageSize;
  const serverKeyword = searchQuery;
  const unifiedCategory = taskKind === 'requirement' || taskKind === 'design' || taskKind === 'dev' || taskKind === 'test' || taskKind === 'bug' ? taskKind : '';
  const csv = (values: string[]) => values.filter(Boolean).join(',');
  const serverQueryValues = {
    page: serverPage,
    pageSize: serverPageSize,
    keyword: serverKeyword,
    productLine: selectedProductLine?.name || '',
    searchOwners: activeTab === 'my_owned' ? currentUser.name : csv(searchOwnerNames),
    title: appliedFilters.title.value,
    titleOperator: appliedFilters.title.operator,
    statuses: csv(appliedFilters.status.values),
    statusOperator: appliedFilters.status.operator,
    owners: csv(appliedFilters.owner.values),
    ownerOperator: appliedFilters.owner.operator,
    creators: csv(activeTab === 'my_created' ? [currentUser.name] : appliedFilters.creator.values),
    creatorOperator: appliedFilters.creator.operator,
    customers: csv(appliedFilters.customer.values),
    customerOperator: appliedFilters.customer.operator,
    versions: csv(appliedFilters.version.values),
    versionOperator: appliedFilters.version.operator,
    createdFrom: appliedFilters.createdAt.from,
    createdTo: appliedFilters.createdAt.to,
    createdOperator: appliedFilters.createdAt.operator,
    plannedStartFrom: appliedFilters.plannedStartDate.from,
    plannedStartTo: appliedFilters.plannedStartDate.to,
    plannedStartOperator: appliedFilters.plannedStartDate.operator,
    ccNames: csv(appliedFilters.cc.values),
    ccOperator: appliedFilters.cc.operator,
    groupBy: groupBy === 'none' ? '' : groupBy,
    groupValue
  };
  const serverPageQuery = useQuery({
    queryKey: ['task-page', taskKind, serverQueryValues],
    enabled: Boolean(remoteEnabled && !unifiedCategory),
    queryFn: async (): Promise<{ items: RequirementTask[]; total: number; groups: Array<{ label: string; count: number }> }> => {
      if (taskKind === 'requirement') {
        const result = await requirementRepository.list({ ...serverQueryValues, workItemKind: 'requirement' });
        return { items: result.items, total: result.total, groups: result.groups || [] };
      }
      if (taskKind === 'design') {
        const result = await productRepository.designTasks(serverQueryValues);
        return { items: result.items, total: result.total, groups: result.groups || [] };
      }
      if (taskKind === 'bug' || taskKind === 'dev') {
        const result = await productRepository.tasks(taskKind, serverQueryValues);
        const items = result.items.map((item) => {
          const value = item as DefectBug & DevTask & RequirementTask;
          return taskKind === 'bug'
            ? { ...item, ownerName: value.ownerName || value.assignee || '', expectedGoal: value.expectedGoal || '', dueDate: value.dueDate || '', priority: value.priority || '中', versionName: value.versionName || '', productLineName: value.productLineName || '', description: value.description || '', status: value.status || '待修复' }
            : { ...item, ownerName: value.developer || value.ownerName || '', expectedGoal: value.expectedGoal || '', dueDate: value.dueDate || '', priority: value.priority || '中', versionName: value.versionName || '', productLineName: value.productLineName || '', description: value.description || '', status: value.status || '开发中' };
        }) as RequirementTask[];
        return { items, total: result.total, groups: result.groups || [] };
      }
      const result = await productRepository.businessTasks(taskKind as 'presales' | 'delivery' | 'ops', serverQueryValues);
      return { items: result.items, total: result.total, groups: result.groups || [] };
    }
  });
  const unifiedQuery = useQuery({
    queryKey: ['unified-task-page', unifiedCategory, productLineFilter, searchQuery],
    enabled: Boolean(unifiedCategory && remoteEnabled),
    queryFn: async () => {
      const lines = productLineFilter === 'all' ? productLines : productLines.filter((line) => line.id === productLineFilter);
      const results = await Promise.all(lines.map((line) => productRepository.workItems(line.id, unifiedCategory, searchQuery)));
      return results.flatMap((result) => result.page?.items || []).map((item) => ({
        ...item,
        status: item.status?.name || '待处理',
        ownerName: item.assigneeName || '',
        productLineName: productLines.find((line) => line.id === item.productLineId)?.name || '',
        dueDate: item.dueDate || '',
        priority: item.priority || 'P2-标准',
        expectedGoal: '',
        description: '',
        requirementType: item.category,
        workItemTypeId: item.taskTypeId || undefined,
        parentWorkItemId: item.parentWorkItemId || undefined,
        versionId: item.versionId || undefined,
        estimatedHours: Number(item.estimatedHours || 0),
        actualHours: Number(item.actualHours || 0),
        statusKey: item.statusKey || undefined,
        statusColor: item.statusColor || undefined,
        createdAt: item.createdAt,
        revision: item.revision,
        hasChildren: item.hasChildren
      })) as RequirementTask[];
    }
  });
  const activeTasks = unifiedCategory && remoteEnabled ? unifiedQuery.data || [] : contextTasks;
  const updateTask = async (id: string, updates: Partial<RequirementTask>): Promise<boolean> => {
    if (unifiedCategory && remoteEnabled) {
      const current = activeTasks.find((task) => task.id === id);
      if (!current?.productLineId || current.revision == null) {
        addToast('error', `${itemLabel}同步失败`, '工作项不存在或版本信息缺失，请刷新后重试');
        return false;
      }
      try {
        await productRepository.updateWorkItem(current.productLineId, id, {
          title: updates.title,
          description: updates.description,
          expectedGoal: updates.expectedGoal,
          versionId: updates.versionId,
          assigneeName: updates.ownerName,
          priority: updates.priority ? apiPriority(updates.priority) : undefined,
          plannedStartDate: updates.plannedStartDate,
          plannedEndDate: updates.dueDate,
          estimatedHours: updates.estimatedHours,
          actualHours: updates.actualHours,
          revision: current.revision
        });
        await unifiedQuery.refetch();
        return true;
      } catch (error) {
        addToast('error', `${itemLabel}同步失败`, error instanceof Error ? error.message : '请稍后重试');
        return false;
      }
    }
    if (taskKind === 'design') { updateDesignTask(id, updates); return true; }
    if (isBusinessTask) {
      setBusinessTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...updates } : task));
      try { await productRepository.updateBusinessTask(taskKind, id, updates as Record<string, unknown>); return true; }
      catch (error) { addToast('error', `${itemLabel}同步失败`, error instanceof Error ? error.message : '请稍后重试'); return false; }
    }
    if (isSpecialTask) {
      setSpecialTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...updates } : task));
      const body = taskKind === 'bug' ? { ...updates, assigneeName: updates.ownerName } : { ...updates, developer: updates.ownerName };
      try { await productRepository.updateTask(taskKind, id, body as Record<string, unknown>); return true; }
      catch (error) { addToast('error', `${itemLabel}同步失败`, error instanceof Error ? error.message : '请稍后重试'); return false; }
    }
    updateRequirementTask(id, updates);
    return true;
  };

  const [selectedTask, setSelectedTask] = useState<RequirementTask | null>(null);
  const [detailEditing, setDetailEditing] = useState(false);
  const detailDescriptionEditor = useRef<HTMLDivElement>(null);
  const [detailDescription, setDetailDescription] = useState('');
  const [detailDescriptionHtml, setDetailDescriptionHtml] = useState('');
  const [detailTab, setDetailTab] = useState<'relations' | 'activity' | 'children'>('activity');
  const [remoteCandidates, setRemoteCandidates] = useState<RequirementWorkOrderCandidate[]>([]);
  const [relatedWorkItems, setRelatedWorkItems] = useState<RequirementTask[]>([]);
  const [childWorkItems, setChildWorkItems] = useState<Array<Record<string, unknown>>>([]);
  const [parentWorkItem, setParentWorkItem] = useState<Record<string, unknown> | null>(null);
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [childTitle, setChildTitle] = useState('');
  const [childDescription, setChildDescription] = useState('');
  const [childPriority, setChildPriority] = useState<RequirementTask['priority']>('中');
  const [childPlannedStartDate, setChildPlannedStartDate] = useState('');
  const [childDueDate, setChildDueDate] = useState('');
  const [childEstimatedHours, setChildEstimatedHours] = useState<number | ''>('');
  const [childActualHours, setChildActualHours] = useState<number | ''>('');
  const [childCategory, setChildCategory] = useState<'design' | 'dev' | 'test' | 'bug'>('dev');
  const [childTypeId, setChildTypeId] = useState('');
  const [childTypes, setChildTypes] = useState<Array<{ id: string; name: string; enabled: boolean; category: string }>>([]);
  const [childTypesLoading, setChildTypesLoading] = useState(false);
  const [childTypesError, setChildTypesError] = useState(false);
  const [childTypesReloadKey, setChildTypesReloadKey] = useState(0);
  const [childCreating, setChildCreating] = useState(false);
  const [listChildren, setListChildren] = useState<Record<string, RequirementTask[]>>({});
  const [expandedListRows, setExpandedListRows] = useState<string[]>([]);
  const [transitionOptions, setTransitionOptions] = useState<Record<string, WorkItemTransitionOptions>>({});
  const [transitionLoadingId, setTransitionLoadingId] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDetailDescription(selectedTask?.description || '');
    setDetailDescriptionHtml(selectedTask?.descriptionHtml || '');
    setDetailTab('activity');
    setCommentDraft('');
    setDetailEditing(false);
    setChildWorkItems([]);
    setParentWorkItem(null);
    setRelatedWorkItems([]);
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) return;
    if (isBusinessTask || unifiedCategory) return;
    requirementRepository.detail(selectedTask.id)
      .then((detail) => setSelectedTask((current) => current?.id === detail.id ? { ...current, ...detail } : current))
      .catch(() => undefined);
  }, [selectedTask?.id, isBusinessTask, unifiedCategory]);

  useEffect(() => {
    if (!selectedTask?.productLineId) return;
    const detailRequest = productRepository.workItemDetail(selectedTask.productLineId, selectedTask.id);
    const summaryRequest = selectedTask.requirementId
      ? productRepository.requirementSummary(selectedTask.productLineId, selectedTask.requirementId)
      : Promise.resolve({ linkedItems: [] });
    const relationsRequest = productRepository.workItemRelations(selectedTask.productLineId, selectedTask.id);
    Promise.all([detailRequest, summaryRequest, relationsRequest])
      .then(async ([detail, summary, relationView]) => {
        setChildWorkItems(Array.isArray(detail.children) && detail.children.length ? detail.children : (summary.linkedItems || []).filter((item) => item.id !== selectedTask.id));
        setParentWorkItem(detail.parent && typeof detail.parent === 'object' ? detail.parent : null);
        const relatedIds = (relationView.relations || []).filter((relation) => relation.type === 'RELATES_TO').map((relation) => relation.sourceId === selectedTask.id ? relation.targetId : relation.sourceId);
        const relatedDetails = await Promise.all(relatedIds.map((id) => productRepository.workItemDetail(selectedTask.productLineId!, id)));
        setRelatedWorkItems(relatedDetails.map((item) => storedTask(item, selectedTask)));
      })
      .catch(() => { setChildWorkItems([]); setParentWorkItem(null); setRelatedWorkItems([]); });
  }, [selectedTask?.id, selectedTask?.productLineId]);

  const childCategoryOptions = useMemo(() => {
    if (!selectedTask) return [];
    if (selectedTask.category === 'test') return [{ value: 'test' as const, label: '测试' }, { value: 'bug' as const, label: '缺陷' }];
    if (selectedTask.category === 'bug') return [{ value: 'bug' as const, label: '缺陷' }];
    if (selectedTask.category === 'design') return [{ value: 'dev' as const, label: '研发' }, { value: 'test' as const, label: '测试' }];
    if (selectedTask.category === 'dev') return [{ value: 'dev' as const, label: '研发' }, { value: 'test' as const, label: '测试' }];
    return [{ value: 'design' as const, label: '设计' }, { value: 'dev' as const, label: '研发' }, { value: 'test' as const, label: '测试' }];
  }, [selectedTask]);

  const childTypeOptions = useMemo(() => childTypes
    .filter((item) => item.category === workItemCategoryLabel[childCategory])
    .filter((item) => !createPolicy?.allowedChildTypeNames?.length || childCategory !== 'test' || createPolicy.allowedChildTypeNames.includes(item.name))
    .map((item) => ({ value: item.id, label: item.name })), [childCategory, childTypes]);

  useEffect(() => {
    if (!childModalOpen || !selectedTask?.productLineId) return;
    let active = true;
    setChildTypes([]);
    setChildTypesError(false);
    setChildTypesLoading(true);
    productRepository.workItemTypes(selectedTask.productLineId)
      .then((items) => {
        if (active) setChildTypes(items.filter((item) => item.enabled) as Array<{ id: string; name: string; enabled: boolean; category: string }>);
      })
      .catch(() => {
        if (active) setChildTypesError(true);
      })
      .finally(() => {
        if (active) setChildTypesLoading(false);
      });
    return () => { active = false; };
  }, [childModalOpen, childTypesReloadKey, selectedTask?.productLineId]);

  useEffect(() => {
    setChildTypeId(childTypeOptions[0]?.value || '');
  }, [childTypeOptions]);

  const openChildModal = (task: RequirementTask | null = selectedTask) => {
    if (!task?.productLineId) return;
    setSelectedTask(task);
    const firstCategory = task.category === 'test' ? 'test' : task.category === 'bug' ? 'bug' : task.category === 'design' || task.category === 'dev' ? 'dev' : 'design';
    setChildCategory(firstCategory);
    setChildTitle('');
    setChildDescription('');
    setChildPriority('中');
    setChildPlannedStartDate('');
    setChildDueDate('');
    setChildEstimatedHours('');
    setChildActualHours('');
    setChildModalOpen(true);
  };

  const cancelChildCreation = () => {
    setChildModalOpen(false);
    setSelectedTask(null);
  };

  const createChildWorkItem = async () => {
    if (!selectedTask?.productLineId || !childTitle.trim() || !childTypeId) {
      addToast('warning', '请填写子任务名称并选择已配置的工作项类型');
      return;
    }
    const parentTask = selectedTask;
    try {
      setChildCreating(true);
      await productRepository.createWorkItem({
        requestId: `child-${parentTask.id}-${Date.now()}`,
        productLineId: parentTask.productLineId!,
        category: childCategory,
        taskTypeId: childTypeId,
        title: childTitle.trim(),
        description: childDescription,
        expectedGoal: '',
        versionId: parentTask.versionId || undefined,
        requirementId: parentTask.requirementId || (parentTask.category === 'requirement' ? parentTask.id : undefined),
        parentWorkItemId: parentTask.id,
        assigneeId: employeeOptions.find((item) => item.name === formOwnerName)?.id,
        priority: apiPriority(childPriority),
        plannedStartDate: childPlannedStartDate || undefined,
        plannedEndDate: childDueDate || undefined,
        estimatedHours: Number(childEstimatedHours || 0),
        actualHours: Number(childActualHours || 0)
      });
      addToast('success', '子任务已创建');
      setChildModalOpen(false);
      setSelectedTask(null);
      const refreshes: Promise<unknown>[] = [
        productRepository.workItemDetail(parentTask.productLineId!, parentTask.id).then((detail) => {
          const children = Array.isArray(detail.children) ? detail.children : [];
          setListChildren((current) => ({ ...current, [parentTask.id]: children.map((item: Record<string, unknown>) => storedTask(item, parentTask)) }));
        })
      ];
      if (unifiedCategory && remoteEnabled) refreshes.push(unifiedQuery.refetch());
      await Promise.allSettled(refreshes);
    } catch (error) {
      addToast('error', '子任务创建失败', error instanceof Error ? error.message : '请检查工作流和父子类型配置');
    } finally {
      setChildCreating(false);
    }
  };

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
    void updateTask(selectedTask.id, updates);
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
  const [formActualHours, setFormActualHours] = useState<number | ''>('');
  const [formRequirementType, setFormRequirementType] = useState('');
  const [configuredWorkItemTypes, setConfiguredWorkItemTypes] = useState<ProductLineWorkItemType[]>([]);
  const [formCcNames, setFormCcNames] = useState<string[]>([]);
  const [formPlannedStartDate, setFormPlannedStartDate] = useState('');
  const [formExpectedCompleteDate, setFormExpectedCompleteDate] = useState('');
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
  const [selectedRequirementTaskIds, setSelectedRequirementTaskIds] = useState<string[]>([]);
  const [formMedia, setFormMedia] = useState<RequirementMedia[]>([]);
  const descriptionEditor = useRef<HTMLDivElement>(null);
  const [formDescriptionHtml, setFormDescriptionHtml] = useState('');
  const [employees, setEmployees] = useState<string[]>([currentUser.name]);
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    teamRepository.options()
      .then((items) => {
        setEmployeeOptions(items);
        setEmployees(Array.from(new Set([currentUser.name, ...items.map((item) => item.name)])));
      })
      .catch(() => {
        setEmployeeOptions([]);
        setEmployees(Array.from(new Set([currentUser.name, ...requirementTasks.map((item) => item.ownerName).filter(Boolean)])));
      });
  }, [currentUser.name, requirementTasks]);

  const configuredCategory = taskKind === 'requirement' ? '需求' : taskKind === 'design' ? '设计' : taskKind === 'dev' ? '研发' : taskKind === 'test' ? '测试' : taskKind === 'bug' ? '缺陷' : undefined;
  useEffect(() => {
    const line = productLines.find((item) => item.name === formProductLineName) || productLines.find((item) => item.id === productLineFilter);
    if (!line || !configuredCategory) { setConfiguredWorkItemTypes([]); return; }
    const localItems = (line.workItemTypes || []).filter((item) => item.category === configuredCategory && item.enabled);
    const applyItems = (items: ProductLineWorkItemType[]) => {
      setConfiguredWorkItemTypes(items);
      if (!editingTask) setFormRequirementType((current) => preferredWorkItemTypeName(items, current));
    };
    if (localItems.length || !remoteApiEnabled) { applyItems(localItems); return; }
    let active = true;
    productRepository.workItemTypes(line.id, configuredCategory)
      .then((items) => { if (active) applyItems(items.filter((item) => item.enabled)); })
      .catch(() => { if (active) applyItems([]); });
    return () => { active = false; };
  }, [configuredCategory, editingTask, formProductLineName, productLineFilter, productLines, remoteApiEnabled]);

  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (controlsRef.current?.contains(target) || target.closest('.ant-select-dropdown, .ant-picker-dropdown, .ant-popover')) return;
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
    setFormActualHours('');
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
    setFormActualHours(requirementTaskDraft.actualHours || 0);
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
    setFormActualHours(task.actualHours || 0);
    setFormRequirementType(task.requirementType || '业务需求');
    setFormCcNames(task.ccNames || []);
    setFormPlannedStartDate(task.plannedStartDate || '');
    setFormExpectedCompleteDate(task.expectedCompleteDate || '');
    setSelectedWorkOrderIds(task.sourceWorkOrderIds || []);
    setSelectedRequirementTaskIds(task.requirementId ? [task.requirementId] : []);
    setFormMedia(task.media || []);
    setIsModalOpen(true);
  };

  const appendDocumentMedia = (files: File[]) => {
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
  };

  const handleSaveTask = async () => {
    if (!formTitle.trim()) {
      addToast('warning', `请填写${itemLabel}名称`);
      return;
    }
    if (configuredCategory && !formRequirementType) {
      addToast('warning', `请选择${itemLabel}类型`);
      return;
    }
    if (!editingTask && createPolicy?.requireRequirement && selectedRequirementTaskIds.length === 0) {
      addToast('warning', `新建${itemLabel}必须关联来源需求`);
      return;
    }
    const selectedProductLine = productLines.find((line) => line.name === formProductLineName);
    const selectedWorkItemType = configuredWorkItemTypes.find((item) => item.name === formRequirementType);
    if (configuredCategory && (!selectedProductLine || !selectedWorkItemType)) {
      addToast('warning', '请选择产品线及其已启用的工作项子类型');
      return;
    }
    const selectedVersion = versions.find((version) => version.name === formVersionName);
    let saveSucceeded = true;
    if (editingTask) {
      saveSucceeded = await updateTask(editingTask.id, {
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
        actualHours: Number(formActualHours),
        requirementType: formRequirementType,
        workItemTypeId: selectedWorkItemType?.id,
        ccNames: formCcNames,
        plannedStartDate: formPlannedStartDate,
        expectedCompleteDate: formExpectedCompleteDate,
        sourceWorkOrderIds: selectedWorkOrderIds,
        sourceWorkOrderTitles: candidateOptions.filter((item) => selectedWorkOrderIds.includes(item.id)).map((item) => item.title),
        requirementId: selectedRequirementTaskIds[0] || '',
        media: formMedia
      });
      if (saveSucceeded) addToast('success', `${itemLabel}信息已更新`);
    } else if (configuredCategory && selectedProductLine && selectedWorkItemType && unifiedCategory) {
      try {
        await productRepository.createWorkItem({
          requestId: `create-${unifiedCategory}-${Date.now()}`,
          productLineId: selectedProductLine.id,
          category: unifiedCategory,
          taskTypeId: selectedWorkItemType.id,
          title: formTitle.trim(),
          description: formDescription,
          expectedGoal: formTarget,
          versionId: selectedVersion?.id,
          requirementId: unifiedCategory === 'requirement' ? undefined : selectedRequirementTaskIds[0] || undefined,
          assigneeId: employeeOptions.find((item) => item.name === formOwnerName)?.id,
          priority: apiPriority(formPriority),
          plannedStartDate: formPlannedStartDate || undefined,
          plannedEndDate: formDueDate || undefined,
          estimatedHours: Number(formEstimatedHours) || 0,
          actualHours: Number(formActualHours) || 0
        });
        await unifiedQuery.refetch();
        addToast('success', `${itemLabel}已创建`, `已关联产品线子类型“${selectedWorkItemType.name}”及其最新状态流程`);
      } catch (error) {
        saveSucceeded = false;
        addToast('error', `${itemLabel}创建失败`, error instanceof Error ? error.message : '请检查产品线类型和状态配置');
      }
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
        actualHours: Number(formActualHours),
        customerName: formCustomerName,
        expectedGoal: formTarget,
        descriptionHtml: formDescriptionHtml,
        requirementType: formRequirementType,
        workItemTypeId: selectedWorkItemType?.id,
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

  const handleSaveAndContinue = () => {
    void handleSaveTask();
    if (formTitle.trim()) window.setTimeout(openAddModal, 0);
  };

  const unifiedTask = (item: UnifiedWorkItem, fallback?: RequirementTask): RequirementTask => ({
    ...((fallback || {}) as RequirementTask),
    id: item.id,
    code: item.code,
    title: item.title,
    category: item.category,
    status: item.status?.name || '待处理',
    priority: item.priority || 'P2',
    ownerName: item.assigneeName || '',
    productLineId: item.productLineId,
    productLineName: productLines.find((line) => line.id === item.productLineId)?.name || fallback?.productLineName || '',
    versionId: item.versionId || undefined,
    versionName: fallback?.versionName || '',
    requirementId: item.requirementId || undefined,
    parentWorkItemId: item.parentWorkItemId || undefined,
    workItemTypeId: item.taskTypeId || undefined,
    dueDate: item.dueDate || '',
    estimatedHours: Number(item.estimatedHours || 0),
    createdAt: item.createdAt,
    revision: item.revision,
    hasChildren: item.hasChildren
  });

  const storedTask = (item: Record<string, unknown>, fallback?: RequirementTask): RequirementTask => ({
    ...((fallback || {}) as RequirementTask),
    id: String(item.id || ''),
    code: String(item.code || ''),
    title: String(item.title || ''),
    category: String(item.category || fallback?.category || 'requirement') as RequirementTask['category'],
    status: String(item.statusName || (item.status && typeof item.status === 'object' ? (item.status as { name?: string }).name : '') || '待处理'),
    priority: String(item.priority || fallback?.priority || 'P2'),
    ownerName: String(item.assigneeName || ''),
    productLineId: String(item.productLineId || fallback?.productLineId || ''),
    productLineName: productLines.find((line) => line.id === String(item.productLineId || fallback?.productLineId || ''))?.name || fallback?.productLineName || '',
    versionId: item.versionId ? String(item.versionId) : fallback?.versionId,
    versionName: fallback?.versionName || '',
    requirementId: item.requirementId ? String(item.requirementId) : fallback?.requirementId,
    parentWorkItemId: item.parentWorkItemId ? String(item.parentWorkItemId) : undefined,
    workItemTypeId: item.taskTypeId ? String(item.taskTypeId) : undefined,
    plannedStartDate: item.plannedStartDate ? String(item.plannedStartDate) : undefined,
    dueDate: item.plannedEndDate ? String(item.plannedEndDate) : fallback?.dueDate || '',
    estimatedHours: Number(item.estimatedHours || 0),
    actualHours: Number(item.actualHours || 0),
    statusKey: item.statusKey ? String(item.statusKey) : fallback?.statusKey,
    statusColor: item.statusColor ? String(item.statusColor) : fallback?.statusColor,
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    revision: item.revision == null ? undefined : Number(item.revision),
    description: String(item.description || ''),
    expectedGoal: String(item.expectedGoal || ''),
    hasChildren: Boolean(item.hasChildren)
  });

  const loadTransitionOptions = async (task: RequirementTask, force = false) => {
    if (!task.productLineId || task.hasChildren || (!force && transitionOptions[task.id])) return;
    setTransitionLoadingId(task.id);
    try {
      const options = await productRepository.workItemTransitions(task.productLineId, task.id);
      setTransitionOptions((current) => ({ ...current, [task.id]: options }));
    } catch (error) {
      addToast('error', '状态配置读取失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setTransitionLoadingId((current) => current === task.id ? '' : current);
    }
  };

  const performTaskTransition = async (task: RequirementTask, action: WorkItemTransitionAction, revision: number, reason = '') => {
    if (!task.productLineId) return;
    setTransitionLoadingId(task.id);
    try {
      const updated = storedTask(await productRepository.transitionWorkItem(task.productLineId, task.id, { edgeKey: action.edgeKey, revision, reason }), task);
      setListChildren((current) => {
        const next: Record<string, RequirementTask[]> = {};
        Object.keys(current).forEach((parentId) => {
          next[parentId] = current[parentId].map((child) => child.id === task.id ? updated : child);
        });
        return next;
      });
      setSelectedTask((current) => current?.id === task.id ? updated : current);
      setTransitionOptions((current) => { const next = { ...current }; delete next[task.id]; return next; });
      await unifiedQuery.refetch();
      addToast('success', '任务状态已更新', `已进入“${updated.status}”`);
    } catch (error) {
      addToast('error', '任务状态更新失败', error instanceof Error ? error.message : '请刷新后重试');
    } finally {
      setTransitionLoadingId((current) => current === task.id ? '' : current);
    }
  };

  const requestTaskTransition = (task: RequirementTask, statusKey: string) => {
    const options = transitionOptions[task.id];
    if (!options || statusKey === task.statusKey) return;
    const action = options.actions.find((item) => item.to === statusKey && item.allowed);
    if (!action) { addToast('warning', '当前状态不能直接切换到所选状态'); return; }
    if (action.requiredFields.includes('reason')) {
      let reason = '';
      Modal.confirm({
        title: `将状态改为“${options.statuses.find((item) => item.key === statusKey)?.name || action.name}”`,
        content: <Input.TextArea rows={4} placeholder="请输入状态变更原因" onChange={(event) => { reason = event.target.value; }} />,
        okText: '确认变更', cancelText: '取消',
        onOk: async () => {
          if (!reason.trim()) { addToast('warning', '请填写状态变更原因'); throw new Error('状态变更原因不能为空'); }
          await performTaskTransition(task, action, options.revision, reason.trim());
        }
      });
      return;
    }
    void performTaskTransition(task, action, options.revision);
  };

  const taskStatusControl = (task: RequirementTask, fullWidth = false) => {
    if (task.hasChildren) return <WorkItemStatusTag name={task.status || '待处理'} />;
    if (!unifiedCategory || !task.productLineId || !task.statusKey) {
      return <Select aria-label={`${task.title}状态`} variant={fullWidth ? 'outlined' : 'borderless'} style={{ width: fullWidth ? '100%' : 120 }} popupMatchSelectWidth={160} showSearch optionFilterProp="label" value={task.status} options={STAGES.map((status, index) => ({ label: status, value: status, disabled: index < STAGES.indexOf(task.status) }))} onChange={(status) => updateTask(task.id, { status })} />;
    }
    const options = transitionOptions[task.id];
    const statuses = options?.statuses?.length ? options.statuses : [{ key: task.statusKey, name: task.status, color: task.statusColor || 'neutral', current: true, allowed: true, reasons: [] }];
    return <Select
      aria-label={`${task.title}状态`}
      variant={fullWidth ? 'outlined' : 'borderless'}
      style={{ width: fullWidth ? '100%' : 120 }}
      popupMatchSelectWidth={180}
      showSearch
      optionFilterProp="label"
      value={task.statusKey}
      loading={transitionLoadingId === task.id}
      options={statuses.map((status) => ({ label: status.name, value: status.key, disabled: !status.current && !status.allowed, title: status.reasons.join('；') }))}
      onOpenChange={(open) => { if (open) void loadTransitionOptions(task); }}
      onChange={(statusKey) => requestTaskTransition(task, statusKey)}
    />;
  };

  const copyTask = async (task: RequirementTask, linked: boolean) => {
    const category = ['requirement', 'design', 'dev', 'test', 'bug'].includes(String(task.category)) ? task.category as 'requirement' | 'design' | 'dev' | 'test' | 'bug' : unifiedCategory;
    if (!task.productLineId || !task.workItemTypeId || !category) { addToast('warning', '该任务尚未绑定产品线子类型，无法复制'); return; }
    try {
      const created = await productRepository.createWorkItem({
        requestId: `copy-${task.id}-${Date.now()}`,
        productLineId: task.productLineId,
        category,
        taskTypeId: task.workItemTypeId,
        title: `${task.title} - 副本`,
        description: task.description || '',
        expectedGoal: task.expectedGoal || '',
        versionId: task.versionId || undefined,
        requirementId: category === 'requirement' ? undefined : task.requirementId || undefined,
        assigneeId: employeeOptions.find((item) => item.name === task.ownerName)?.id,
        priority: apiPriority(task.priority),
        plannedStartDate: task.plannedStartDate || undefined,
        plannedEndDate: task.dueDate || undefined,
        estimatedHours: Number(task.estimatedHours || 0),
        actualHours: Number(task.actualHours || 0)
      });
      if (linked) await productRepository.createWorkItemRelation(task.productLineId, task.id, String(created.id));
      await unifiedQuery.refetch();
      addToast('success', linked ? '任务已复制并建立关联' : '任务已复制');
    } catch (error) { addToast('error', linked ? '复制并关联失败' : '复制任务失败', error instanceof Error ? error.message : '请稍后重试'); }
  };

  const deleteTask = (task: RequirementTask) => {
    if (!task.productLineId || task.revision == null) { addToast('warning', '该任务不是统一工作项，暂不能从此处删除'); return; }
    Modal.confirm({
      title: `删除任务“${task.title}”？`,
      content: '任务将被软删除；存在子任务时系统会阻止删除。',
      okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await productRepository.deleteWorkItem(task.productLineId!, task.id, task.revision!);
          if (selectedTask?.id === task.id) setSelectedTask(null);
          await unifiedQuery.refetch();
          addToast('success', '任务已删除');
        } catch (error) { addToast('error', '任务删除失败', error instanceof Error ? error.message : '请稍后重试'); }
      }
    });
  };

  const operationMenu = (task: RequirementTask) => ({
    items: [
      { key: 'child', icon: <PlusOutlined />, label: '添加子任务' },
      { key: 'copy', icon: <CopyOutlined />, label: '复制任务' },
      { key: 'copy-link', icon: <ApartmentOutlined />, label: '复制并关联' },
      { type: 'divider' as const },
      { key: 'delete', icon: <DeleteOutlined />, danger: true, label: '删除' }
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'child') openChildModal(task);
      if (key === 'copy') void copyTask(task, false);
      if (key === 'copy-link') void copyTask(task, true);
      if (key === 'delete') deleteTask(task);
    }
  });

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
  const productLineTasks = productLineFilter === 'all' ? activeTasks : activeTasks.filter((task) => task.productLineId === productLineFilter || task.productLineName === selectedProductLine?.name);
  const baseTasks = remoteEnabled ? productLineTasks : productLineTasks.filter((task) => categoryMatch(task, activeTab));
  const filteredTasks = baseTasks.filter((task) => {
    if (remoteEnabled) return true;
    const titlePart = searchQuery.trim().toLocaleLowerCase();
    const titleMatch = textMatches(task.title, titlePart);
    const ownerMatch = searchOwnerNames.length === 0 || searchOwnerNames.includes(task.ownerName);
    return titleMatch && ownerMatch && matchesFilters(task, appliedFilters);
  });
  const tabCounts = {
    all: unifiedCategory ? productLineTasks.filter((task) => !task.parentWorkItemId).length : remoteEnabled && activeTab === 'all' ? serverPageQuery.data?.total || 0 : productLineTasks.length,
    my_owned: unifiedCategory ? productLineTasks.filter((task) => !task.parentWorkItemId && categoryMatch(task, 'my_owned')).length : remoteEnabled && activeTab === 'my_owned' ? serverPageQuery.data?.total || 0 : productLineTasks.filter((task) => categoryMatch(task, 'my_owned')).length,
    my_created: unifiedCategory ? productLineTasks.filter((task) => !task.parentWorkItemId && categoryMatch(task, 'my_created')).length : remoteEnabled && activeTab === 'my_created' ? serverPageQuery.data?.total || 0 : productLineTasks.filter((task) => categoryMatch(task, 'my_created')).length
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
  const localGroupTabs: Array<[string, number]> = groupBy === 'none' ? [] : Array.from(filteredTasks.reduce((groups, task) => {
    const label = getGroupValue(task);
    groups.set(label, (groups.get(label) || 0) + 1);
    return groups;
  }, new Map<string, number>()).entries());
  const groupTabs: Array<[string, number]> = remoteEnabled && !unifiedCategory
    ? (serverPageQuery.data?.groups || []).map((group): [string, number] => [group.label, Number(group.count)])
    : localGroupTabs;
  const groupValueExists = groupTabs.some(([label]) => label === groupValue);
  const firstGroupValue = groupTabs[0]?.[0] || '';
  const effectiveGroupValue = groupBy === 'none' ? '' : groupValueExists ? groupValue : firstGroupValue;
  const rootTasks = unifiedCategory && remoteEnabled ? filteredTasks.filter((task) => !task.parentWorkItemId) : filteredTasks;
  const visibleTasks = (remoteEnabled && !unifiedCategory) || groupBy === 'none' ? rootTasks : rootTasks.filter((task) => getGroupValue(task) === effectiveGroupValue);
  const pagedTasks = remoteEnabled ? visibleTasks : visibleTasks.slice((page - 1) * pageSize, page * pageSize);
  const paginationTotal = unifiedCategory && remoteEnabled ? rootTasks.length : remoteEnabled ? serverPageQuery.data?.total || 0 : visibleTasks.length;

  useEffect(() => setPage(1), [activeTab, searchQuery, searchOwnerNames, appliedFilters, groupBy, groupValue, pageSize, productLineFilter]);
  useEffect(() => {
    if (!remoteEnabled || groupBy === 'none' || !firstGroupValue || groupValueExists) return;
    setGroupValue(firstGroupValue);
  }, [remoteEnabled, groupBy, firstGroupValue, groupValueExists]);

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
      <div className="filter-operator flex h-full items-center border-x border-[var(--border-main)]">
        <Select aria-label={`${label}过滤方式`} variant="borderless" value={value.operator} onChange={(operator) => setMultiFilter(field, { ...value, operator })} className="w-full" options={[{ label: '包含', value: 'include' }, { label: '不包含', value: 'exclude' }]} />
      </div>
      <div className="filter-value px-2"><Select aria-label={label} variant="borderless" mode="multiple" allowClear showSearch optionFilterProp="label" value={value.values} onChange={(values) => setMultiFilter(field, { ...value, values })} options={options.map((option) => ({ label: option, value: option }))} placeholder="请选择或输入关键字查询" className="w-full" /></div>
    </div>;
  };
  const dateFilterRow = (label: string, field: 'createdAt' | 'plannedStartDate') => {
    const value = filterDraft[field];
    const dateInput = (part: 'from' | 'to', placeholder: string) => <DatePicker aria-label={`${label}${part === 'from' ? '开始' : '结束'}`} variant="borderless" value={value[part] ? dayjs(value[part]) : null} onChange={(date) => setFilterDate(field, part, date ? date.format('YYYY-MM-DD') : '')} placeholder={placeholder} className="w-full" />;
    return <div className="filter-row grid h-8 grid-cols-[96px_88px_minmax(0,1fr)] items-center rounded-md border border-[var(--border-main)] bg-[var(--bg-card)]">
      <div className="filter-label flex h-full items-center px-3 font-medium text-[var(--text-body)]">{label}</div>
      <div className="filter-operator flex h-full items-center border-x border-[var(--border-main)]"><Select aria-label={`${label}过滤方式`} variant="borderless" value={value.operator} onChange={(operator) => setFilterDraft((current) => ({ ...current, [field]: { ...value, operator, to: operator === 'between' ? value.to : '' } }))} className="w-full" options={[{ label: '介于', value: 'between' }, { label: '等于', value: 'equals' }, { label: '大于', value: 'after' }, { label: '小于', value: 'before' }]} /></div>
      <div className={`grid items-center gap-2 px-2 ${value.operator === 'between' ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1'}`}>
        {dateInput('from', value.operator === 'between' ? '起始日期' : '选择日期')}
        {value.operator === 'between' && <><span className="text-center text-[var(--text-muted)]">-</span>{dateInput('to', '结束日期')}</>}
      </div>
    </div>;
  };

  const toggleListRow = async (task: RequirementTask) => {
    if (expandedListRows.includes(task.id)) {
      setExpandedListRows((rows) => rows.filter((item) => item !== task.id));
      return;
    }
    setExpandedListRows((rows) => [...rows, task.id]);
    if (listChildren[task.id] || !task.productLineId) return;
    try {
      const detail = await productRepository.workItemDetail(task.productLineId, task.id);
      const children = Array.isArray(detail.children) ? detail.children : [];
      setListChildren((current) => ({ ...current, [task.id]: children.map((item: Record<string, unknown>) => storedTask(item, task)) }));
    } catch (error) {
      setExpandedListRows((rows) => rows.filter((item) => item !== task.id));
      addToast('error', '子任务加载失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const renderTaskRows = (task: RequirementTask, depth = 0, isLast = true): React.ReactNode => {
    const children = listChildren[task.id] || [];
    const hasChildren = Boolean(task.hasChildren || children.length > 0);
    const expanded = expandedListRows.includes(task.id);
    const isChild = depth > 0;
    return <React.Fragment key={task.id}>
      <tr className={`${isChild ? 'bg-[var(--bg-surface-soft)]/60' : ''} transition-colors hover:bg-[var(--bg-surface-soft)]`}>
        <td className="max-w-[360px] px-4 py-3.5 font-semibold text-[var(--text-primary)]">
          <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: depth * 24 }}>
            <input type="checkbox" aria-label={`选择${task.title}`} className="h-4 w-4 shrink-0 rounded border-[var(--border-main)]" />
            {depth > 0 && <span aria-hidden="true" className="shrink-0 font-mono text-[var(--text-muted)]">{isLast ? '└─' : '├─'}</span>}
            {hasChildren ? <button type="button" aria-label={`${expanded ? '收起' : '展开'}${task.title}`} onClick={() => void toggleListRow(task)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]">{expanded ? '⌄' : '›'}</button> : <span className="w-5 shrink-0" />}
            <span className="shrink-0 rounded border border-[var(--border-main)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-body)]">{workItemCategoryLabel[String(task.category)] || '任务'}</span>
            <button type="button" onClick={() => setSelectedTask(task)} className="min-w-0 truncate text-left text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]" title={task.title}>{task.title}</button>
          </div>
        </td>
        <td className="px-4 py-3.5">
          {taskStatusControl(task)}
        </td>
        <td className="px-4 py-3.5"><StatusTag status={normalizePriority(task.priority)} /></td>
        <td className="max-w-[240px] px-4 py-3.5 text-[var(--text-body)]"><span className="line-clamp-2 font-mono text-[var(--primary)]" title={task.versionName || '未关联'}>{task.versionName || '未关联'}</span></td>
        <td className="px-4 py-3.5 text-[var(--text-muted)]">
          {isChild ? <Select aria-label={`${task.title}负责人`} variant="borderless" style={{ width: 120 }} popupMatchSelectWidth={160} showSearch optionFilterProp="label" value={task.ownerName || undefined} placeholder="未设置" options={employees.map((name) => ({ label: name, value: name }))} onChange={(ownerName) => updateTask(task.id, { ownerName })} /> : task.ownerName || '未设置'}
        </td>
        <td className="px-4 py-3.5 text-[var(--text-muted)]">{task.creatorName || currentUser.name}</td>
        <td className="px-4 py-3.5 font-mono text-[var(--text-muted)]">{task.createdAt || '—'}</td>
        <td className="px-4 py-3.5 text-right">
          <Dropdown menu={operationMenu(task)} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} aria-label={`操作${task.title}`} />
          </Dropdown>
        </td>
      </tr>
      {expanded && children.map((child, index) => renderTaskRows(child, depth + 1, index === children.length - 1))}
    </React.Fragment>;
  };

  return (
    <div className="task-page space-y-6 animate-in fade-in duration-150">
      {/* Tabs + Search + Filter + Group */}
      <div ref={controlsRef} className="task-page-toolbar bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* 分类 */}
          <div role="tablist" aria-label={`${itemLabel}范围`} className="requirement-scope-tabs inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-1">
            {([['all', '全部'], ['my_owned', '我负责的'], ['my_created', '我创建的']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={activeTab === value} onClick={() => setActiveTab(value)} className="requirement-scope-tab h-8 rounded-md px-4 text-xs font-semibold whitespace-nowrap">{label}·{tabCounts[value]}</button>)}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-1">
              <div className="flex h-8 items-center">
                <div className={`relative overflow-hidden transition-[width,opacity] duration-200 ease-out ${searchOpen ? 'mr-1 w-64 opacity-100' : 'w-0 opacity-0'}`}>
                  <Input autoFocus={searchOpen} allowClear prefix={<Search className="h-4 w-4" />} value={searchDraft} onChange={(event) => { const nextValue = event.target.value; if (nextValue.includes('@')) { setSearchDraft(nextValue.replaceAll('@', '')); setSearchOwnerPickerOpen(true); } else { setSearchDraft(nextValue); } }} onPressEnter={applySearch} placeholder="输入标题或@负责人" className="w-64" />
                </div>
              </div>
              <Button type="text" aria-label="搜索" aria-pressed={searchOpen} onClick={() => { setSearchOpen((open) => !open); setSearchOwnerPickerOpen(false); setFilterOpen(false); setGroupOpen(false); }} icon={<Search className="h-4 w-4" />} />
              <Badge count={activeFilterCount} size="small" offset={[-2, 2]}>
                <Button type="text" aria-label="过滤器" aria-pressed={filterOpen} onClick={() => { setFilterDraft(appliedFilters); setFilterOpen((open) => !open); setSearchOpen(false); setSearchOwnerPickerOpen(false); setGroupOpen(false); }} icon={<Filter className="h-4 w-4" />} />
              </Badge>
              <Popover
                trigger="click"
                open={groupOpen}
                onOpenChange={(open) => { setGroupOpen(open); if (open) { setFilterOpen(false); setSearchOpen(false); setSearchOwnerPickerOpen(false); } }}
                placement="bottomRight"
                content={<div className="w-48 space-y-2"><Input allowClear prefix={<Search className="h-4 w-4" />} value={groupQuery} onChange={(event) => setGroupQuery(event.target.value)} placeholder="搜索分组字段" />{visibleGroupOptions.map(([key, label]) => <Button block style={{ justifyContent: 'flex-start', textAlign: 'left' }} type="text" key={key} onClick={() => { setGroupBy(key); setGroupValue(''); setGroupOpen(false); }}>{`按${label}分组`}{groupBy === key && <Check className="ml-auto h-4 w-4" />}</Button>)}<Button block style={{ justifyContent: 'flex-start', textAlign: 'left' }} type="text" onClick={() => { setGroupBy('none'); setGroupValue(''); setGroupOpen(false); }}>取消分组{groupBy === 'none' && <Check className="ml-auto h-4 w-4" />}</Button></div>}
              >
                <Button type="text" aria-label="分组" aria-pressed={groupOpen} icon={<List className="h-4 w-4" />} />
              </Popover>
              {searchOpen && searchOwnerPickerOpen && <div className="absolute left-0 top-11 z-40 w-[min(88vw,300px)]"><Select aria-label="搜索负责人" mode="multiple" autoFocus open={searchOwnerPickerOpen} onDropdownVisibleChange={setSearchOwnerPickerOpen} showSearch allowClear optionFilterProp="label" value={searchOwnerNames} onChange={setSearchOwnerNames} options={employees.map((name) => ({ label: name, value: name }))} placeholder="搜索负责人" className="w-full" /></div>}
            </div>
            <Button
              type="primary"
              id="btn-add-req-task"
              onClick={openAddModal}
              icon={<Plus className="h-3.5 w-3.5" />}
            >新建{itemLabel}</Button>
          </div>
        </div>
        {filterOpen && <div className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-4">
          <div className="grid gap-2 overflow-visible lg:grid-cols-2">
            <div className="filter-row grid h-8 grid-cols-[96px_minmax(0,1fr)] items-center rounded-md border border-[var(--border-main)] bg-[var(--bg-card)]">
              <div className="filter-label flex h-full items-center px-3 font-medium text-[var(--text-body)]">标题</div>
              <div className="filter-value flex h-full items-center border-l border-[var(--border-main)] px-2"><Input aria-label="标题过滤值" variant="borderless" value={filterDraft.title.value} onChange={(event) => setFilterDraft((current) => ({ ...current, title: { ...current.title, value: event.target.value } }))} placeholder="请输入标题关键词" /></div>
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
          <div className="mt-3 flex justify-end gap-2"><Button onClick={clearFilters}>清空</Button><Button type="primary" onClick={() => { setAppliedFilters(filterDraft); setFilterOpen(false); }}>应用过滤</Button></div>
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
                  <th className="py-3 px-4">迭代版本</th>
                  <th className="py-3 px-4">负责人</th>
                  <th className="py-3 px-4">创建人</th>
                  <th className="py-3 px-4">创建时间</th>
                  <th className="py-3 px-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedTasks.map((task, index) => renderTaskRows(task, 0, index === pagedTasks.length - 1))}
                {pagedTasks.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-[var(--text-muted)]">{unifiedCategory && remoteEnabled && unifiedQuery.isPending ? `正在加载${itemLabel}...` : unifiedCategory && remoteEnabled && unifiedQuery.isError ? <span className="inline-flex items-center gap-2">{itemLabel}加载失败<Button size="small" onClick={() => unifiedQuery.refetch()}>重试</Button></span> : serverPageQuery.isPending && remoteEnabled && !unifiedCategory ? `正在加载${itemLabel}...` : serverPageQuery.isError && remoteEnabled && !unifiedCategory ? <span className="inline-flex items-center gap-2">{itemLabel}加载失败<Button size="small" onClick={() => serverPageQuery.refetch()}>重试</Button></span> : `没有符合当前搜索、过滤或分组条件的${itemLabel === '需求任务' ? '需求' : itemLabel}`}</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination total={paginationTotal} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* Task Detail Drawer */}
      {selectedTask && !childModalOpen && (
        <WorkItemCreatePanel
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          title={`${itemLabel}详情`}
          presentation="drawer"
          showContinueOption={false}
          footer={
            <>
              <Button type="primary" ghost={!detailEditing} onClick={() => setDetailEditing((value) => !value)}>{detailEditing ? '保存' : '编辑'}</Button>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="h-10 rounded-lg border border-[var(--border-main)] px-4 text-xs font-semibold text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]"
              >
                关闭
              </button>
            </>
          }
          properties={<div className={`space-y-6 text-xs ${detailEditing ? '' : 'pointer-events-none opacity-80'}`}>
            <section className="space-y-3">
              <h3 className="font-semibold text-[var(--text-primary)]">基础字段</h3>
              <SearchableSelect label="所属产品线" value={selectedTask.productLineName || ''} options={productLines.map((line) => line.name)} onChange={(productLineName) => saveDetailUpdates({ productLineName, productLineId: productLines.find((line) => line.name === productLineName)?.id, versionName: '' })} placeholder="未设置" />
              <div><span className="block text-[var(--text-muted)]">当前状态</span><div className="mt-1">{taskStatusControl(selectedTask, true)}</div></div>
              <SearchableSelect label="需求类型" value={selectedTask.requirementType || ''} options={['业务需求', '产品优化', '技术需求', '合规需求']} onChange={(requirementType) => saveDetailUpdates({ requirementType })} placeholder="未设置" clearable />
              {selectedTask.parentWorkItemId ? <SearchableSelect label="负责人" value={selectedTask.ownerName || ''} options={employees} onChange={(ownerName) => saveDetailUpdates({ ownerName })} placeholder="未设置" /> : <div><span className="block text-[var(--text-muted)]">负责人</span><span className="mt-1 block text-[var(--text-body)]">{selectedTask.ownerName || '未设置'}</span></div>}
              <SearchableSelect label="优先级" value={normalizePriority(selectedTask.priority)} options={['紧急', '高', '中', '低']} onChange={(priority) => saveDetailUpdates({ priority: priority as RequirementTask['priority'] })} />
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
              <DetailNumberInput label="预计工时（小时）" value={Number(selectedTask.estimatedHours || 0)} onSave={(estimatedHours) => saveDetailUpdates({ estimatedHours })} />
            </section>
            <section className="space-y-3 border-t border-[var(--border-main)] pt-4">
              <h3 className="font-semibold text-[var(--text-primary)]">附件</h3>
              {Array.isArray(selectedTask.media) && selectedTask.media.length ? selectedTask.media.map((item) => <a key={item.id} href={item.dataUrl} download={item.name} className="flex items-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2 text-[var(--text-body)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"><FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{item.name}</span></a>) : <p className="rounded-lg border border-dashed border-[var(--border-main)] px-3 py-3 text-center text-[var(--text-muted)]">暂无附件</p>}
            </section>
          </div>}
        >
          <div className="w-full space-y-5 text-xs">
            <div className={detailEditing ? '' : 'pointer-events-none opacity-80'}>
              <DetailTextInput label={`${itemLabel}名称`} value={selectedTask.title} onSave={(title) => title.trim() && saveDetailUpdates({ title })} />
            </div>
            {parentWorkItem && <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-2">
              <span className="block text-[var(--text-muted)]">父级任务</span>
              <button type="button" onClick={() => setSelectedTask(storedTask(parentWorkItem, selectedTask))} className="mt-1 flex max-w-full items-center gap-2 text-left text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]">
                <span className="shrink-0 font-mono text-[11px]">{String(parentWorkItem.code || '')}</span>
                <span className="truncate">{String(parentWorkItem.title || '')}</span>
              </button>
            </section>}
            {renderDetail && <section className="test-task-detail-extension">{renderDetail({ task: selectedTask, children: childWorkItems })}</section>}
            <div className={`space-y-5 ${detailEditing ? '' : 'pointer-events-none opacity-80'}`}>
              <label className="block text-[var(--text-muted)]">
                <span>任务描述</span>
                <div className="mt-1">
                  {detailEditing ? <RichTextEditor
                    key={`detail-${selectedTask.id}-${detailEditing ? 'edit' : 'readonly'}`}
                    readOnly={!detailEditing}
                    editor={detailDescriptionEditor}
                    value={detailDescription}
                    htmlValue={detailDescriptionHtml}
                    onInput={(text, html) => {
                      setDetailDescription(text);
                      setDetailDescriptionHtml(html);
                    }}
                    onBlur={() => saveDetailUpdates({ 
                      description: detailDescription, 
                      descriptionHtml: detailDescriptionHtml 
                    })}
                    placeholder="详细记录需求背景、业务场景和实现说明..."
                  /> : <CollapsibleDescription value={detailDescription} emptyText="未填写任务描述" />}
                </div>
              </label>
            </div>
            <section className="border-t border-[var(--border-main)] pt-4">
              <div className="mb-4 border-b border-[var(--border-main)] px-3 py-2">
                <Segmented
                  value={detailTab}
                  onChange={(value) => setDetailTab(value as 'activity' | 'relations' | 'children')}
                  options={[
                    { label: `动态 · ${selectedTask.events?.length || 0}`, value: 'activity' },
                    { label: `关联对象 · ${relatedWorkItems.length + (selectedTask.sourceWorkOrderIds?.length || 0)}`, value: 'relations' },
                    { label: `子任务 · ${childWorkItems.length}`, value: 'children' },
                  ]}
                />
              </div>
              {detailTab === 'relations' ? (
                <div className="space-y-4">
                  {relatedWorkItems.length > 0 && <div className="overflow-hidden rounded-lg border border-[var(--border-main)]">{relatedWorkItems.map((item) => <button type="button" key={item.id} onClick={() => setSelectedTask(item)} className="grid w-full grid-cols-[100px_minmax(0,1fr)_100px] items-center gap-3 border-b border-[var(--border-main)] px-3 py-2 text-left last:border-b-0 hover:bg-[var(--bg-surface-soft)]"><span className="font-mono text-[var(--text-muted)]">{item.code || '工作项'}</span><span className="truncate text-[var(--primary)]">{item.title}</span><span className="text-[var(--text-body)]">{item.status}</span></button>)}</div>}
                  <WorkOrderPicker candidates={candidateOptions} selectedIds={selectedTask.sourceWorkOrderIds || []} onChange={detailEditing ? updateLinkedWorkOrders : () => undefined} placeholder="选择关联工单" />
                  {!relatedWorkItems.length && !(selectedTask.sourceWorkOrderIds || []).length && <p className="rounded-lg border border-dashed border-[var(--border-main)] px-3 py-6 text-center text-[var(--text-muted)]">暂无关联对象</p>}
                </div>
              ) : detailTab === 'children' ? (
                <div className="space-y-3">
                  <div className="flex justify-end"><Button size="small" icon={<PlusOutlined />} onClick={() => openChildModal()}>添加子任务</Button></div>
                  {childWorkItems.length > 0 ? <div className="overflow-hidden rounded-lg border border-[var(--border-main)]">{childWorkItems.map((child) => <div key={String(child.id)} className="grid grid-cols-[90px_minmax(0,1fr)_100px_120px] items-center gap-3 border-b border-[var(--border-main)] px-3 py-2 last:border-b-0">
                    <span className="text-[var(--text-muted)]">{workItemCategoryLabel[String(child.category)] || String(child.category || '工作项')}</span>
                    <button type="button" onClick={() => setSelectedTask(storedTask(child, selectedTask))} className="truncate text-left text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]">{String(child.title || '')}</button>
                    <span className="text-[var(--text-body)]">{String(child.statusName || (child.status && typeof child.status === 'object' ? (child.status as { name?: string }).name : '') || '待处理')}</span>
                    <span className="truncate text-[var(--text-muted)]">{String(child.assigneeName || '未分配')}</span>
                  </div>)}</div> : <div className="rounded-lg border border-dashed border-[var(--border-main)] px-3 py-6 text-center text-[var(--text-muted)]">暂无子任务</div>}
                </div>
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
                    <label className="block text-[var(--text-muted)]"><span>发表评论</span><textarea disabled={!detailEditing} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} rows={4} placeholder={detailEditing ? '记录进展、问题或需要协同的事项...' : '点击编辑后可发表评论'} className="mt-2 min-h-24 w-full resize-y rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-60" /></label>
                    <div className="mt-3 flex justify-end"><button type="button" onClick={submitComment} disabled={!detailEditing || !commentDraft.trim()} className="tech-button-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"><MessageSquare className="h-3.5 w-3.5" />发布评论</button></div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </WorkItemCreatePanel>
      )}
      <WorkItemCreatePanel
        isOpen={childModalOpen}
        onClose={cancelChildCreation}
        title="添加子任务"
        showContinueOption={false}
        footer={<><Button disabled={childCreating} onClick={cancelChildCreation}>取消</Button><Button type="primary" loading={childCreating} disabled={childTypesLoading || childTypesError || !childTypeId} onClick={() => void createChildWorkItem()}>创建</Button></>}
        properties={<Form layout="vertical" className="requirement-create-properties">
          <Form.Item label="子任务分类" required><Select value={childCategory} options={childCategoryOptions} onChange={setChildCategory} /></Form.Item>
          <Form.Item
            label="工作项类型"
            required
            validateStatus={childTypesError ? 'error' : undefined}
            help={childTypesError
              ? <span>工作项类型读取失败，<Button type="link" size="small" onClick={() => setChildTypesReloadKey((value) => value + 1)}>重新加载</Button></span>
              : !childTypesLoading && childTypeOptions.length === 0 ? '当前分类未配置可用工作项类型' : undefined}
          >
            <Select showSearch optionFilterProp="label" value={childTypeId || undefined} loading={childTypesLoading} disabled={childTypesLoading || childTypesError || childTypeOptions.length === 0} placeholder={childTypesLoading ? '正在加载工作项类型' : '请选择已配置类型'} options={childTypeOptions} onChange={setChildTypeId} />
          </Form.Item>
          <Form.Item label="优先级" required><Select value={childPriority} onChange={setChildPriority} options={['紧急', '高', '中', '低'].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item label="计划开始时间"><DatePicker value={childPlannedStartDate ? dayjs(childPlannedStartDate) : null} onChange={(date) => setChildPlannedStartDate(date ? date.format('YYYY-MM-DD') : '')} className="w-full" /></Form.Item>
          <Form.Item label="计划完成时间"><DatePicker value={childDueDate ? dayjs(childDueDate) : null} onChange={(date) => setChildDueDate(date ? date.format('YYYY-MM-DD') : '')} className="w-full" /></Form.Item>
          <Form.Item label="预计工时（小时）"><InputNumber min={0} precision={2} value={childEstimatedHours === '' ? null : childEstimatedHours} onChange={(value) => setChildEstimatedHours(value ?? '')} className="requirement-hours-input w-full" /></Form.Item>
          <Form.Item label="实际工时（小时）"><InputNumber min={0} precision={2} value={childActualHours === '' ? null : childActualHours} onChange={(value) => setChildActualHours(value ?? '')} className="requirement-hours-input w-full" /></Form.Item>
        </Form>}
      >
        <Form layout="vertical" className="w-full">
          <Form.Item label="子任务名称" required><Input value={childTitle} onChange={(event) => setChildTitle(event.target.value)} placeholder="例如：完成接口联调" /></Form.Item>
          {selectedTask && <section className="mb-6 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-2"><span className="block text-xs text-[var(--text-muted)]">父级任务</span><div className="mt-1 flex min-w-0 gap-2 text-xs"><span className="shrink-0 font-mono text-[var(--text-muted)]">{selectedTask.code || selectedTask.id}</span><span className="truncate text-[var(--text-primary)]">{selectedTask.title}</span></div></section>}
          <Form.Item label="任务描述"><Input.TextArea rows={8} value={childDescription} onChange={(event) => setChildDescription(event.target.value)} placeholder="补充子任务范围、交付物和注意事项" /></Form.Item>
        </Form>
      </WorkItemCreatePanel>

      {/* Add / Edit Task Modal (云效风格: 任务名称、任务描述、期望目标、完成时间、分配负责人、紧急程度、关联版本、关联客户、关联产品、预计工时) */}
      <WorkItemCreatePanel
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? `编辑${itemLabel}` : `新建${itemLabel}`}
        showContinueOption={!editingTask}
        secondaryAction={!editingTask ? <Button onClick={handleSaveAndContinue}>保存并继续</Button> : undefined}
        footer={
          <>
            <Button onClick={() => setIsModalOpen(false)}>取消</Button>
            <Button type="primary" onClick={() => void handleSaveTask()}>保存</Button>
          </>
        }
        properties={<Form layout="vertical" className="requirement-create-properties" requiredMark>
          <Form.Item label="所属产品线" required><Select showSearch optionFilterProp="label" value={formProductLineName || undefined} onChange={(value) => { setFormProductLineName(value); setFormVersionName(''); setFormRequirementType(''); }} options={productLines.map((line) => ({ label: line.name, value: line.name }))} placeholder="请选择所属产品线" /></Form.Item>
          <Form.Item label={`${itemLabel}类型`} required><Select showSearch optionFilterProp="label" value={formRequirementType || undefined} onChange={setFormRequirementType} options={configuredWorkItemTypes.map((item) => ({ label: item.name, value: item.name }))} disabled={!configuredWorkItemTypes.length} placeholder={configuredWorkItemTypes.length ? `请选择${itemLabel}类型` : '请先在产品线工作项设置中启用类型'} /></Form.Item>
          <Form.Item label="负责人" required><Select showSearch optionFilterProp="label" value={formOwnerName || undefined} onChange={setFormOwnerName} options={employees.map((value) => ({ label: value, value }))} placeholder="搜索并选择负责人" /></Form.Item>
          <Form.Item label="优先级" required><Select value={formPriority || undefined} onChange={(value) => setFormPriority(value)} options={['紧急', '高', '中', '低'].map((value) => ({ label: value, value }))} placeholder="请选择优先级" /></Form.Item>
          <Form.Item label="计划开始时间" required><DatePicker value={formPlannedStartDate ? dayjs(formPlannedStartDate) : null} onChange={(date) => setFormPlannedStartDate(date ? date.format('YYYY-MM-DD') : '')} className="w-full" placeholder="请选择日期" /></Form.Item>
          <Form.Item label="计划完成时间"><DatePicker value={formDueDate ? dayjs(formDueDate) : null} onChange={(date) => setFormDueDate(date ? date.format('YYYY-MM-DD') : '')} className="w-full" placeholder="请选择日期" /></Form.Item>
          <Form.Item label="期望完成时间"><DatePicker value={formExpectedCompleteDate ? dayjs(formExpectedCompleteDate) : null} onChange={(date) => setFormExpectedCompleteDate(date ? date.format('YYYY-MM-DD') : '')} className="w-full" placeholder="请选择日期" /></Form.Item>
          <Form.Item label="迭代版本"><Select showSearch allowClear optionFilterProp="label" value={formVersionName || undefined} onChange={(value) => setFormVersionName(value || '')} options={versions.filter((version) => !version.productLineName || version.productLineName === formProductLineName).map((version) => ({ label: version.name, value: version.name }))} placeholder="暂不关联" /></Form.Item>
          <Form.Item label="关联客户"><Select showSearch allowClear optionFilterProp="label" value={formCustomerName || undefined} onChange={(value) => setFormCustomerName(value || '')} options={customers.map((customer) => ({ label: customer.name, value: customer.name }))} placeholder="暂不关联" /></Form.Item>
          <Form.Item label="参与人"><Select mode="multiple" showSearch allowClear optionFilterProp="label" value={formCcNames} onChange={setFormCcNames} options={employees.map((value) => ({ label: value, value }))} placeholder="搜索并选择参与人" /></Form.Item>
          <Form.Item label="预计工时（小时）"><InputNumber min={0} precision={2} value={formEstimatedHours === '' ? null : formEstimatedHours} onChange={(value) => setFormEstimatedHours(value ?? '')} className="requirement-hours-input w-full" placeholder="请输入预计工时" /></Form.Item>
          <Form.Item label="实际工时（小时）"><InputNumber min={0} precision={2} value={formActualHours === '' ? null : formActualHours} onChange={(value) => setFormActualHours(value ?? '')} className="requirement-hours-input w-full" placeholder="请输入实际工时" /></Form.Item>
          <Form.Item label="附件">
            <Upload accept=".txt,.doc,.docx,.xls,.xlsx,.pdf" multiple showUploadList={false} beforeUpload={(file) => { appendDocumentMedia([file]); return Upload.LIST_IGNORE; }}><Button block icon={<Paperclip className="h-4 w-4" />}>添加文档附件</Button></Upload>
            {formMedia.map((item) => <div key={item.id} className="mt-2 flex items-center gap-2 text-[var(--text-body)]"><FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{item.name}</span><Button type="text" danger size="small" aria-label={`移除附件${item.name}`} onClick={() => setFormMedia((items) => items.filter((media) => media.id !== item.id))} icon={<X className="h-4 w-4" />} /></div>)}
          </Form.Item>
        </Form>}
      >
        <Form layout="vertical" className="w-full" data-work-item-form>
          <Form.Item label={`${itemLabel}名称`} required><Input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} placeholder="例如：支持达梦DM8数据库读写分离与主备秒级切换" /></Form.Item>
          <Form.Item label="任务描述"><RichTextEditor size="work-order" editor={descriptionEditor} value={formDescription} htmlValue={formDescriptionHtml} onInput={(text, html) => { setFormDescription(text); setFormDescriptionHtml(html); }} onBlur={() => { /* auto-save description */ }} placeholder="详细记录需求背景、业务场景和实现说明..." /></Form.Item>
          <Form.Item label="关联对象"><WorkOrderPicker candidates={candidateOptions.filter((item) => item.id !== editingTask?.id)} selectedIds={[...selectedRequirementTaskIds, ...selectedWorkOrderIds]} onChange={(ids) => { const selectedId = ids.slice(-1)[0] || ''; const selectedItem = candidateOptions.find((item) => item.id === selectedId); setSelectedRequirementTaskIds(selectedItem?.type === 'requirement' ? [selectedId] : []); setSelectedWorkOrderIds(selectedItem && selectedItem.type !== 'requirement' ? [selectedId] : []); }} placeholder="请选择关联工单" /></Form.Item>
        </Form>
      </WorkItemCreatePanel>
    </div>
  );
};
