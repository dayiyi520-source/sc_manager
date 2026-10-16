import { newestCreatedFirst } from '../../utils/creationOrder';
import { taskVersionOptions } from './taskVersionOptions';
import { BUSINESS_TASK_STATUSES, canReviewCompletion, isCompletionPending, needsCompletionApproval, normalizeDeliveryTask } from '../../utils/businessTaskWorkflow';
import { isPendingVerification } from '../../services/workItemTemplateSync';
import { BUSINESS_TASK_SCOPES, businessTaskSource, matchesBusinessTaskScope } from './businessTaskPresentation';
import { loadBusinessTasks } from '../../services/businessTaskRepository';
import { designGroupOf, designTypeLabel, designVariantOf, syncDesignProductNames } from './designTaskPresentation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { openWorkItemDetailLink, workItemDetailLink } from '../../utils/workItemDetailLink';
import { copyToClipboard } from '../../utils/copyToClipboard';
import { workOrderDisplayName } from '../../utils/workOrderDisplay';
import { collaborationCandidatesFor } from '../../utils/collaborationCandidates';
import { normalizeTaskActivity, taskActivitySummary, formatTaskActivityTime } from '../../utils/taskActivity';
import { DetailCopyButton } from '../common/DetailCopyButton';
import { Alert, Badge, Button, Checkbox, DatePicker, Dropdown, Empty, Form, Input, InputNumber, Modal, Popover, Segmented, Select, Spin, Table, Tag, Tooltip, Upload } from 'antd';
import { CopyOutlined, DeleteOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { directoryCustomers, directoryProjects } from '../../services/customerDirectoryData';
import { projectDeliveryMap } from '../../services/projectDeliveryMap';
import { StatusTag } from '../common/UIComponents';
import { DefectBug, DevTask, EmployeeOption, ProductLineWorkItemType, RequirementMedia, RequirementPoolItem, RequirementTask, RequirementWorkOrderCandidate, RequirementWorkOrderType } from '../../types';
import { WorkItemCreatePanel, WorkItemDetailHeader, WorkItemRelationTabs } from './WorkItemCreatePanel';
import { WorkItemStatusTag } from './WorkItemStatusTag';
import { LazyRichTextEditor as RichTextEditor } from './LazyRichTextEditor';
import { Pagination } from '../common/Pagination';
import { requirementRepository } from '../../services/requirementRepository';
import { teamRepository } from '../../services/teamRepository';
import { productRepository, UnifiedWorkItem, WorkItemTransitionAction, WorkItemTransitionOptions } from '../../services/productRepository';
import { readSession } from '../../services/session';
import { preferredWorkItemTypeName } from './workItemTypeDefaults';
import { CollapsibleDescription } from './CollapsibleDescription';
import { employeeSelectOptions, PersonIdentity } from '../common/PersonIdentity';
import { WorkItemGroupMenu } from './UnifiedWorkItemControls';
import { WorkItemCategoryIcon } from './WorkItemCategoryIcon';
import { WorkItemBatchBar } from './WorkItemBatchBar';
import type { TaskCompletionReview } from '../../types';
import type { TestPlan } from '../../types/testManagement';
import { openTaskCompletionDialog } from './TaskCompletionDialog';
import { useWorkItemFieldConfig } from './useWorkItemFieldConfig';
import type { DesignTaskVariant } from './DesignTasksView';
import { loadProductTaskAllocation, ProductTaskAllocationView, type AllocationRow, type DesignAllocationExtra } from './ProductTaskAllocationView';

type RequirementFilterState = {
  title: { operator: TextFilterOperator; value: string };
  status: MultiFilterValue;
  owner: MultiFilterValue;
  creator: MultiFilterValue;
  project: MultiFilterValue;
  version: MultiFilterValue;
  createdAt: DateFilterValue;
  plannedStartDate: DateFilterValue;
  cc: MultiFilterValue;
};

type RequirementGroupKey = 'none' | 'priority' | 'status' | 'owner' | 'creator' | 'version' | 'project' | 'requirementType';
type TextFilterOperator = 'include' | 'exclude';
type DateFilterOperator = 'between' | 'equals' | 'after' | 'before';
type MultiFilterValue = { operator: TextFilterOperator; values: string[] };
type DateFilterValue = { operator: DateFilterOperator; from: string; to: string };

const configuredCategoryForFilter = (category: string) => ({ requirement: '需求', design: '设计', dev: '研发', test: '测试', bug: '缺陷' }[category] || category);

const emptyMultiFilter = (): MultiFilterValue => ({ operator: 'include', values: [] });
const emptyDateFilter = (): DateFilterValue => ({ operator: 'between', from: '', to: '' });
const createEmptyRequirementFilters = (): RequirementFilterState => ({
  title: { operator: 'include', value: '' },
  status: emptyMultiFilter(), owner: emptyMultiFilter(), creator: emptyMultiFilter(), project: emptyMultiFilter(), version: emptyMultiFilter(),
  createdAt: emptyDateFilter(), plannedStartDate: emptyDateFilter(), cc: emptyMultiFilter()
});

const normalizePriority = (priority: string) => ({
  P0: '紧急', P1: '高', P2: '中', P3: '低',
  'P0-紧急': '紧急',
  'P0-紧急阻断': '紧急',
  'P1-高优': '高',
  'P2-标准': '中',
  'P2-普通': '中',
  'P3-低优': '低'
}[priority] || priority);
const apiPriority = (priority: string) => ({ 紧急: 'P0', 高: 'P1', 中: 'P2', 低: 'P3' }[normalizePriority(priority)] || priority);
const workItemCategoryLabel: Record<string, string> = { requirement: '需求', design: '设计', dev: '研发', test: '测试', bug: '缺陷' };
const DetailField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <span className="block text-[var(--text-muted)]">{label}</span>
    <div className="mt-1 min-h-8 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)]">
      {children}
    </div>
  </div>
);

const WORK_ORDER_TYPES: Array<{ key: RequirementWorkOrderType; label: string }> = [
  { key: 'requirement', label: '产品需求' }, { key: 'bug', label: '线上问题' }, { key: 'task', label: '售前支持' },
  { key: 'risk', label: '交付支持' }, { key: 'source', label: '其他问题' }
];

export const WorkOrderPicker: React.FC<{
  candidates: RequirementWorkOrderCandidate[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  onNavigate?: (item: RequirementWorkOrderCandidate) => void;
  disabled?: boolean;
  relationMode?: 'workOrder' | 'productTask';
}> = ({ candidates, selectedIds, onChange, placeholder = '选择关联事项', onNavigate, disabled = false, relationMode = 'workOrder' }) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [type, setType] = useState<RequirementWorkOrderType | 'all' | 'pending' | 'processing' | 'completed'>('all');
  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds.filter(Boolean) : [];
  const safeCandidates = (Array.isArray(candidates) ? candidates : []).filter((item): item is RequirementWorkOrderCandidate => Boolean(item && item.id)).map((item) => ({ ...item, title: item.title || item.id, typeLabel: workOrderDisplayName(item.typeLabel) || '事项' }));
  const taskStatus = (item: RequirementWorkOrderCandidate) => item.status || '';
  const filtered = safeCandidates.filter((item) => {
    const status = taskStatus(item);
    const statusMatch = type === 'all' || (relationMode === 'productTask' ? ({ pending: '待处理', processing: '处理中', completed: '已完成' } as Record<string, string>)[type] === status : item.type === type);
    return statusMatch && (!keyword.trim() || [item.title, item.code, item.ownerName, item.summary].filter(Boolean).join(' ').toLowerCase().includes(keyword.trim().toLowerCase()));
  });
  const selected = safeSelectedIds.map((id) => safeCandidates.find((item) => item.id === id) || { id, title: id, typeLabel: '事项' } as RequirementWorkOrderCandidate);
  const toggle = (id: string) => { if (!disabled) onChange(safeSelectedIds.includes(id) ? safeSelectedIds.filter((item) => item !== id) : [...safeSelectedIds, id]); };
  const iconCategory = (item: RequirementWorkOrderCandidate) => relationMode === 'productTask' ? 'requirement' : item.type === 'requirement' ? 'requirement' : item.type === 'bug' ? 'bug' : 'assistance';
  return <div className="space-y-2">
    <button type="button" disabled={disabled} onClick={() => setOpen((value) => !value)} className="flex h-9 w-full items-center justify-between rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 text-left text-[var(--text-body)] hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50">
      <span>{selected.length ? `已关联 ${selected.length} 条事项` : placeholder}</span><span className="text-[var(--text-muted)]">{open ? '收起' : '选择'}</span>
    </button>
    {selected.length > 0 && <div className="space-y-2">{selected.map((item) => <div key={item.id} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2"><WorkItemCategoryIcon category={iconCategory(item)} className="h-4 w-4 shrink-0 text-[var(--primary)]" /><button type="button" className="min-w-0 flex-1 truncate text-left font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]" onClick={() => onNavigate?.(item)}>{item.title}</button><button type="button" className="shrink-0 text-[var(--text-muted)] hover:text-[var(--danger)]" onClick={() => toggle(item.id)} aria-label={`移除${item.title}`}><X className="h-3 w-3" /></button></div>
      <div className="mt-2 grid gap-1 text-xs text-[var(--text-muted)] sm:grid-cols-2">{relationMode === 'productTask' ? <><span>负责人：{item.ownerName || '未分配'}</span><span>状态：{item.status || '未设置'}</span></> : <><span>创建人：{item.creatorName || item.ownerName || '未设置'}</span><span>期望完成时间：{item.expectedCompleteDate || '未设置'}</span></>}</div>
    </div>)}</div>}
    {open && <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-3 shadow-sm">
      <div className="flex items-center gap-2"><input autoFocus value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索标题、编号、负责人" className="h-8 min-w-0 flex-1 rounded-md border border-[var(--border-main)] bg-transparent px-2 text-xs outline-none focus:border-[var(--primary)]" /><button type="button" onClick={() => setOpen(false)} className="text-xs text-[var(--text-muted)]">关闭</button></div>
      <div className="mt-3 flex flex-wrap gap-1.5">{(relationMode === 'productTask' ? [{ key: 'all' as const, label: '全部' }, { key: 'pending' as const, label: '待处理' }, { key: 'processing' as const, label: '处理中' }, { key: 'completed' as const, label: '已完成' }] : [{ key: 'all' as const, label: '全部' }, ...WORK_ORDER_TYPES]).map((item) => <button type="button" key={item.key} onClick={() => setType(item.key)} className={`rounded-md px-2 py-1 text-[11px] ${type === item.key ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-surface-soft)] text-[var(--text-muted)]'}`}>{item.label} {item.key !== 'all' && <span>({safeCandidates.filter((candidate) => relationMode === 'productTask' ? taskStatus(candidate) === ({ pending: '待处理', processing: '处理中', completed: '已完成' } as Record<string, string>)[item.key] : candidate.type === item.key).length})</span>}</button>)}</div>
      <div className="mt-3 max-h-56 space-y-1 overflow-auto">{filtered.length ? filtered.map((item) => <button type="button" key={item.id} onClick={() => toggle(item.id)} className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-[var(--bg-surface-soft)]"><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${safeSelectedIds.includes(item.id) ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border-main)]'}`}>{safeSelectedIds.includes(item.id) && <Check className="h-3 w-3" />}</span><WorkItemCategoryIcon category={item.category || (item.sourceType === 'WORK_ORDER' ? 'assistance' : item.type === 'bug' ? 'bug' : 'requirement')} className="mt-0.5 shrink-0 text-[var(--primary)]" /><span className="min-w-0 flex-1"><span className="block truncate text-xs text-[var(--text-primary)]">{item.title}</span><span className="block truncate text-[11px] text-[var(--text-muted)]">{item.typeLabel}{item.ownerName ? ` · 负责人：${item.ownerName}` : ' · 负责人：未分配'}{item.status ? ` · 状态：${item.status}` : ''}</span></span></button>) : <p className="py-6 text-center text-xs text-[var(--text-muted)]">暂无匹配事项</p>}</div>
    </div>}
  </div>;
};

export type WorkItemDetailContext = {
  task: RequirementTask;
  editing: boolean;
  onUpdate: (updates: Partial<RequirementTask>) => void;
  employeeNames: string[];
  employeeOptions: EmployeeOption[];
  versions: Array<{ id: string; name: string; productLineName?: string }>;
  statusControl: React.ReactNode;
};
export type WorkItemCreationContext = {
  productLineId: string;
  sourceWorkOrder?: RequirementTask;
  relatedProductTask?: RequirementTask;
  versionId?: string;
  parent?: RequirementTask;
  onClose?: () => void;
  onCreated?: () => void;
  assigneeId?: string;
  assigneeName?: string;
  title?: string;
  onSubmit?: (input: Parameters<typeof productRepository.createWorkItem>[0]) => Promise<void>;
};
type RequirementTasksViewProps = {
  productLineFilter?: string;
  itemLabel?: string;
  taskKind?: 'requirement' | 'design' | 'test' | 'bug' | 'dev' | 'presales' | 'delivery' | 'ops';
  initialScope?: 'all' | 'my_owned' | 'my_created' | 'my_participated' | 'my_department';
  initialDetail?: RequirementTask;
  onDetailClose?: () => void;
  renderDetail?: (context: WorkItemDetailContext) => React.ReactNode;
  creationContext?: WorkItemCreationContext;
  designVariant?: DesignTaskVariant;
  designVariantFilter?: DesignTaskVariant | 'all';
  designOwnershipFilter?: string;
  onDesignVariantChange?: (variant: DesignTaskVariant) => void;
  designExtras?: DesignAllocationExtra[];
};

const EMPTY_REQUIREMENT_TASKS: RequirementTask[] = [];
const EMPTY_BUGS: DefectBug[] = [];
const EMPTY_DEV_TASKS: DevTask[] = [];

export const RequirementTasksView: React.FC<RequirementTasksViewProps> = ({ productLineFilter = 'all', itemLabel = '产品任务', taskKind = 'requirement', initialScope = 'all', initialDetail, onDetailClose, renderDetail, creationContext, designVariant = 'product', designVariantFilter = designVariant, designOwnershipFilter = '', onDesignVariantChange, designExtras = [] }) => {
  const queryClient = useQueryClient();
  const [detailSearch] = useState(() => creationContext ? '' : window.location.search);
  const {
    requirementTasks = EMPTY_REQUIREMENT_TASKS,
    designTasks = EMPTY_REQUIREMENT_TASKS,
    addRequirementTask,
    updateRequirementTask,
    addDesignTask,
    setDesignTasks,
    productLines = [],
    projects = [],
    opportunities = [],
    biddings = [],
    versions = [],
    customers = [],
    currentUser,
    bugs = EMPTY_BUGS,
    devTasks = EMPTY_DEV_TASKS,
    requirementPool = [],
    risks = [],
    requirementTaskDraft,
    setRequirementTaskDraft,
    openPageTab,
    addToast
  } = useApp();
  const projectOptions = useMemo(() => directoryProjects(), []);
  const directoryCustomerOptions = useMemo(() => directoryCustomers(), []);
  const [businessTasks, setBusinessTasks] = useState<RequirementTask[]>([]);
  const [specialTasks, setSpecialTasks] = useState<RequirementTask[]>([]);
  const isBusinessTask = taskKind === 'presales' || taskKind === 'delivery' || taskKind === 'ops';
  const isCommercialTask = taskKind === 'presales' || taskKind === 'delivery';
  const isDeliveryReview = taskKind === 'delivery';
  const commercialTasksQuery = useQuery({
    queryKey: ['business-task-list', taskKind, currentUser.id],
    enabled: isCommercialTask,
    queryFn: () => loadBusinessTasks(taskKind as 'presales' | 'delivery')
  });
  const isSpecialTask = taskKind === 'bug' || taskKind === 'dev';
  useEffect(() => {
    if (!isBusinessTask || isCommercialTask) { setBusinessTasks([]); return; }
    productRepository.businessTasks(taskKind).then((result) => setBusinessTasks(result.items)).catch(() => setBusinessTasks([]));
  }, [isBusinessTask, isCommercialTask, taskKind]);
  useEffect(() => {
    if (taskKind === 'bug') setSpecialTasks(bugs.map((item: DefectBug) => ({ ...item, ownerName: item.ownerName || item.assignee || '', expectedGoal: '', dueDate: '', priority: item.priority || '中', versionName: item.versionName || '', productLineName: item.productLineName || '', description: item.description || '', status: item.status || '待修复' })) as RequirementTask[]);
    else if (taskKind === 'dev') setSpecialTasks(devTasks.map((item: DevTask) => ({ ...item, ownerName: item.developer || '', expectedGoal: '', dueDate: '', priority: item.priority || '中', versionName: item.versionName || '', productLineName: item.productLineName || '', description: item.description || '', status: item.status || '开发中' })) as RequirementTask[]);
    else setSpecialTasks([]);
  }, [taskKind, bugs, devTasks]);
  const currentDesignTasks = useMemo(() => syncDesignProductNames(designTasks, productLines), [designTasks, productLines]);
  const contextTasks = taskKind === 'design' ? currentDesignTasks : isCommercialTask ? commercialTasksQuery.data || EMPTY_REQUIREMENT_TASKS : isBusinessTask ? businessTasks : isSpecialTask ? specialTasks : requirementTasks;
  const addTask = async (task: Partial<RequirementTask>) => {
    if (taskKind === 'design') return addDesignTask(task);
    if (isBusinessTask) {
      const optimistic: RequirementTask = { ...task, id: `${taskKind}-${Date.now()}`, title: task.title || `新建${itemLabel}`, description: task.description || '', expectedGoal: task.expectedGoal || '', status: task.status || '待处理', priority: task.priority || '中', ownerName: task.ownerName || currentUser.name, creatorName: currentUser.name, productLineName: task.productLineName || '', versionName: task.versionName || '', estimatedHours: task.estimatedHours || 0, dueDate: task.dueDate || '' };
      setBusinessTasks((prev) => [optimistic, ...prev]);
      try { await productRepository.createBusinessTask(taskKind, optimistic); if (isCommercialTask) await queryClient.invalidateQueries({ queryKey: ['business-task-list', taskKind] }); else setBusinessTasks((await productRepository.businessTasks(taskKind)).items); return true; }
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
  const productTaskScope = isCommercialTask || taskKind === 'requirement' || taskKind === 'design' || taskKind === 'dev' || taskKind === 'test' || taskKind === 'bug' || taskKind === 'ops';
  const reviewInFlight = useRef(new Set<string>());
  const [reviewBusyId, setReviewBusyId] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my_owned' | 'my_created' | 'my_participated' | 'my_department' | 'my_pending_review' | 'my_verification'>(productTaskScope ? 'my_owned' : initialScope);
  useEffect(() => { if (productTaskScope) setActiveTab('my_owned'); }, [productTaskScope, taskKind]);
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
  const [batchIds, setBatchIds] = useState<string[]>([]);
  useEffect(() => setBatchIds([]), [taskKind, productLineFilter, activeTab, searchQuery, appliedFilters, page, pageSize]);
  const [pendingDetailTarget, setPendingDetailTarget] = useState<{ itemId: string; productLineId: string } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('shichuang.task.search');
    if (creationContext) return;
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as { targetPage?: string; title?: string; itemId?: string; productLineId?: string };
      const targetPageByKind: Record<string, string> = {
        requirement: 'prod_req_tasks', design: 'prod_design_tasks', dev: 'prod_rd_tasks',
        bug: 'prod_bugs', test: 'prod_test_tasks', presales: 'crm_presales_tasks',
        delivery: 'proj_delivery_tasks', ops: 'proj_ops_tasks'
      };
      if (payload.targetPage !== targetPageByKind[taskKind]) return;
      const title = String(payload.title || '').trim();
      setSearchDraft(title);
      setSearchQuery(title);
      setSearchOpen(Boolean(title));
      if (payload.itemId) setPendingDetailTarget({ itemId: payload.itemId, productLineId: String(payload.productLineId || '') });
      sessionStorage.removeItem('shichuang.task.search');
    } catch {
      sessionStorage.removeItem('shichuang.task.search');
    }
  }, [taskKind]);

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
  const createFields = useWorkItemFieldConfig(unifiedCategory || taskKind, 'CREATE', designVariant as DesignTaskVariant);
  const listFields = useWorkItemFieldConfig(unifiedCategory || taskKind, 'LIST');
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
    versions: csv(appliedFilters.version.values),
    versionOperator: appliedFilters.version.operator,
    createdFrom: appliedFilters.createdAt.from,
    createdTo: appliedFilters.createdAt.to,
    createdOperator: appliedFilters.createdAt.operator,
    plannedStartFrom: appliedFilters.plannedStartDate.from,
    plannedStartTo: appliedFilters.plannedStartDate.to,
    plannedStartOperator: appliedFilters.plannedStartDate.operator,
    ccNames: activeTab === 'my_participated' ? currentUser.name : csv(appliedFilters.cc.values),
    ccOperator: appliedFilters.cc.operator,
    groupBy: groupBy === 'none' ? '' : groupBy,
    groupValue
  };
  const serverPageQuery = useQuery({
    queryKey: ['task-page', taskKind, serverQueryValues],
    enabled: Boolean(remoteEnabled && !unifiedCategory && !isCommercialTask),
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
  const productLineKey = productLines.map((line) => line.id).join(',');
  const filterStatusesQuery = useQuery({
    queryKey: ['task-filter-statuses', unifiedCategory, productLineFilter, productLineKey],
    enabled: filterOpen && Boolean(unifiedCategory && remoteEnabled),
    retry: false,
    queryFn: async () => {
      const lines = productLines.filter(line => productLineFilter === 'all' || line.id === productLineFilter);
      const types = (await Promise.all(lines.map(line => productRepository.workItemTypes(line.id)))).flat();
      return types.filter(type => type.enabled && type.category === configuredCategoryForFilter(unifiedCategory)).flatMap(type => {
        const value = type as ProductLineWorkItemType & { workflow?: { status: string; definition?: { states?: Array<{ name: string; enabled?: boolean }> } }; workflows?: Array<{ status: string; definition?: { states?: Array<{ name: string; enabled?: boolean }> } }> };
        return (value.workflows || (value.workflow ? [value.workflow] : [])).filter(flow => flow.status === 'PUBLISHED').flatMap(flow => (flow.definition?.states || []).filter(state => state.enabled !== false).map(state => state.name));
      });
    }
  });
  const [showProductTasks, setShowProductTasks] = useState(false);
  const [productTaskDetail, setProductTaskDetail] = useState<RequirementTask | null>(null);
  const [allocationParent, setAllocationParent] = useState<AllocationRow | null>(null);
  const productTasksQuery = useQuery({
    queryKey: ['product-task-allocation', taskKind, productLineFilter, productLineKey],
    enabled: taskKind === 'dev' || taskKind === 'test' || taskKind === 'design',
    queryFn: () => loadProductTaskAllocation(productLines.filter((line) => productLineFilter === 'all' || line.id === productLineFilter), taskKind as 'design' | 'dev' | 'test')
  });
  const openProductTask = (task: AllocationRow) => setProductTaskDetail({
    ...task, category: 'requirement', status: task.status?.name || '未设置', priority: task.priority || '中',
    ownerName: task.assigneeName || '', versionName: versions.find((version) => version.id === task.versionId)?.name || '',
    versionId: task.versionId || undefined, dueDate: task.dueDate || undefined,
    plannedStartDate: task.plannedStartDate || undefined, plannedEndDate: task.plannedEndDate || undefined,
    expectedCompleteDate: task.expectedCompleteDate || undefined, completedAt: task.completedAt || undefined,
    customerId: task.customerId || undefined, customerName: task.customerName || undefined,
    requirementId: task.requirementId || undefined, parentWorkItemId: task.parentWorkItemId || undefined,
    taskTypeId: task.taskTypeId || undefined, workflowId: task.workflowId || undefined, statusKey: task.statusKey || undefined,
    ccNames: parseParticipantNames(task.ccNames)
  });
  const allocationKind = taskKind === 'dev' || taskKind === 'test' || taskKind === 'design' ? taskKind : 'dev';
  const createAllocatedTask = (task: AllocationRow) => {
    const targetKind = allocationKind === 'design' ? 'design' : allocationKind;
    setShowProductTasks(false);
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('product-task-create', { detail: { targetKind, parent: task, relatedProductTask: task } }));
    }, 0);
  };
  const versionKey = versions.map((version) => `${version.id}:${version.name}:${version.code || ''}`).join(',');
  const unifiedQuery = useQuery({
    queryKey: ['unified-task-page', unifiedCategory, productLineFilter, searchQuery, productLineKey, versionKey],
    enabled: Boolean(unifiedCategory && remoteEnabled),
    queryFn: async () => {
      const lines = productLineFilter === 'all' ? productLines : productLines.filter((line) => line.id === productLineFilter);
      const results = await Promise.all(lines.map(async (line) => {
        const [first, types] = await Promise.all([
          productRepository.workItems(line.id, unifiedCategory, searchQuery),
          productRepository.workItemTypes(line.id),
        ]);
        const items = [...(first.page?.items || [])];
        const total = first.page?.total || 0;
        for (let nextPage = 2; items.length < total; nextPage++) {
          const next = await productRepository.workItems(line.id, unifiedCategory, searchQuery, { page: nextPage });
          if (!next.page?.items?.length) break;
          items.push(...next.page.items);
        }
        return items.map((item) => ({ ...item, requirementType: types.find((type) => type.id === item.taskTypeId)?.name || item.requirementType || '未设置' }));
      }));
      return results.flat().map((item) => ({
        ...item,
        status: item.status?.name || '未设置',
        ownerName: item.assigneeName || '',
        creatorName: item.creatorName || '',
        ccNames: parseParticipantNames(item.ccNames),
        plannedStartDate: item.plannedStartDate || undefined,
        productLineName: productLines.find((line) => line.id === item.productLineId)?.name || '',
        dueDate: item.dueDate || '',
        priority: item.priority || '',
        expectedGoal: '',
        description: '',
        requirementType: item.category === 'bug' ? (item as UnifiedWorkItem & { type?: string }).type || item.requirementType : item.requirementType,
        workItemTypeId: item.taskTypeId || undefined,
        workflowId: item.workflowId || undefined,
        parentWorkItemId: item.parentWorkItemId || undefined,
        versionId: item.versionId || undefined,
        versionName: versions.find((version) => version.id === item.versionId)?.name || '',
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
  // 设计任务的数量和分类来自设计任务接口，列表也使用同一份数据，避免与统一工作项接口产生数量不一致。
  const activeTasks = taskKind === 'design' ? contextTasks : unifiedCategory && remoteEnabled ? unifiedQuery.data || [] : contextTasks;
  const updateTask = async (id: string, updates: Partial<RequirementTask>): Promise<boolean> => {
    if (taskKind === 'design') {
      const current = activeTasks.find((task) => task.id === id) || selectedTask;
      if (!current) return false;
      try {
        await productRepository.updateDesignTask(id, { ...updates, assigneeName: updates.ownerName, revision: current.revision });
        const savedTask = { ...current, ...updates, revision: Number(current.revision || 0) + 1 };
        setDesignTasks((items) => items.map((item) => item.id === id ? savedTask : item));
        setSelectedTask((item) => item?.id === id ? savedTask : item);
        void serverPageQuery.refetch();
        return true;
      } catch (error) {
        addToast('error', '设计任务保存失败', error instanceof Error ? error.message : '请稍后重试');
        return false;
      }
    }
    if (unifiedCategory && remoteEnabled) {
      const current = activeTasks.find((task) => task.id === id) || (selectedTask?.id === id ? selectedTask : undefined);
      const productLineId = current?.productLineId || selectedTask?.productLineId;
      if (!productLineId || current?.revision == null) {
        addToast('error', `${itemLabel}同步失败`, '工作项不存在或版本信息缺失，请刷新后重试');
        return false;
      }
      try {
        const saved = await productRepository.updateWorkItem(productLineId, id, {
          title: updates.title,
          ...(detailCategory === 'bug' && updates.requirementType ? { type: updates.requirementType } : {}),
          description: updates.description,
          descriptionHtml: updates.descriptionHtml,
          expectedGoal: updates.expectedGoal,
          versionId: updates.versionId,
          assigneeName: updates.ownerName,
          verifierId: updates.verifierId,
          verifierName: updates.verifierName,
          priority: updates.priority ? apiPriority(updates.priority) : undefined,
          plannedStartDate: updates.plannedStartDate,
          plannedEndDate: updates.dueDate,
          expectedCompleteDate: updates.expectedCompleteDate,
          estimatedHours: updates.estimatedHours,
          actualHours: updates.actualHours,
          completionReview: updates.completionReview,
          productLineId: updates.productLineId,
          designVariant: updates.designVariant,
          designProjectName: updates.designProjectName,
          designSourceDepartment: updates.designSourceDepartment,
          projectId: updates.projectId,
          projectName: updates.projectName,
          relatedTaskIds: updates.relatedTaskIds,
          sourceWorkOrderIds: updates.sourceWorkOrderIds,
          sourceWorkOrderTitles: updates.sourceWorkOrderTitles,
          revision: current.revision
        });
        const savedTask = storedTask(saved, current);
        queryClient.setQueryData<RequirementTask[]>(['unified-task-page', unifiedCategory, productLineFilter, searchQuery, productLines.map((line) => line.id).join(',')], (items) => items?.map((item) => item.id === id ? { ...item, ...savedTask } : item));
        setSelectedTask((item) => item?.id === id ? savedTask : item);
        void unifiedQuery.refetch().catch(() => undefined);
        return true;
      } catch (error) {
        addToast('error', `${itemLabel}同步失败`, error instanceof Error ? error.message : '请稍后重试');
        return false;
      }
    }
    if (isBusinessTask) {
      try {
        const result = await productRepository.updateBusinessTask(taskKind, id, { ...updates, ...(isCommercialTask && updates.ownerName !== undefined ? { assigneeId: employeeOptions.find(employee => employee.name === updates.ownerName)?.id || '' } : {}) });
        const previous = activeTasks.find(task => task.id === id) || (selectedTask?.id === id ? selectedTask : undefined);
        const fallback = previous ? { ...previous, ...updates, ...(taskKind === 'delivery' && updates.status === '已完成' && needsCompletionApproval(previous) ? { status: '处理中', completionApproval: 'pending' as const } : {}) } : undefined;
        const saved = result ? (taskKind === 'delivery' ? normalizeDeliveryTask(result) : result) : fallback;
        if (saved) {
          setBusinessTasks(prev => prev.map(task => task.id === id ? saved : task));
          setSelectedTask(current => current?.id === id ? saved : current);
          if (isCommercialTask) queryClient.setQueryData<RequirementTask[]>(['business-task-list', taskKind], tasks => tasks?.map(task => task.id === id ? saved : task));
        }
        if (isCommercialTask) await queryClient.invalidateQueries({ queryKey: ['business-task-list', taskKind] });
        void queryClient.invalidateQueries({ queryKey: ['task-activities', taskKind] });
        return true;
      }
      catch (error) { addToast('error', `${itemLabel}同步失败`, error instanceof Error ? error.message : '请稍后重试'); return false; }
    }
    if (isSpecialTask) {
      const body = taskKind === 'bug' ? { ...updates, assigneeName: updates.ownerName } : { ...updates, developer: updates.ownerName };
      try { await productRepository.updateTask(taskKind, id, body as Record<string, unknown>); setSpecialTasks((prev) => prev.map((task) => task.id === id ? { ...task, ...updates } : task)); return true; }
      catch (error) { addToast('error', `${itemLabel}同步失败`, error instanceof Error ? error.message : '请稍后重试'); return false; }
    }
    updateRequirementTask(id, updates);
    return true;
  };

  const [selectedTask, setSelectedTask] = useState<RequirementTask | null>(initialDetail || null);
  const handledDetailId = useRef('');
  const [testPlanPickerOpen, setTestPlanPickerOpen] = useState(false);
  const [selectedTestPlanIds, setSelectedTestPlanIds] = useState<string[]>([]);
  const [testPlanAssociationSaving, setTestPlanAssociationSaving] = useState(false);
  const [testPlanAssociationError, setTestPlanAssociationError] = useState('');
  const [testPlanSearch, setTestPlanSearch] = useState('');
  const testTaskPlansQuery = useQuery({
    queryKey: ['test-task-plans', selectedTask?.id],
    queryFn: () => selectedTask ? productRepository.testPlans(selectedTask.id) : Promise.resolve([] as TestPlan[]),
    enabled: taskKind === 'test' && Boolean(selectedTask?.id),
    retry: false,
  });
  const availableTestPlansQuery = useQuery({
    queryKey: ['available-test-plans', selectedTask?.id],
    queryFn: () => selectedTask ? productRepository.availableTestPlans(selectedTask.id) : Promise.resolve([]),
    enabled: taskKind === 'test' && testPlanPickerOpen && Boolean(selectedTask?.id),
    retry: false,
  });
  const filteredTestPlanCandidates = useMemo(() => {
    const keyword = testPlanSearch.trim().toLocaleLowerCase();
    return (availableTestPlansQuery.data || []).filter(({ plan, workItemTitle, workItemCode }) =>
      !keyword || `${plan.name || ''} ${workItemTitle} ${workItemCode}`.toLocaleLowerCase().includes(keyword));
  }, [availableTestPlansQuery.data, testPlanSearch]);
  useEffect(() => {
    setTestPlanPickerOpen(false);
    setSelectedTestPlanIds([]);
    setTestPlanAssociationError('');
  }, [selectedTask?.id]);
  const [detailWorkItemTypes, setDetailWorkItemTypes] = useState<ProductLineWorkItemType[]>([]);
  const detailCategory = unifiedCategory || taskKind;
  const detailVariant = selectedTask ? designVariantOf(selectedTask) : designVariant;
  const detailFields = useWorkItemFieldConfig(detailCategory, 'DETAIL', detailVariant as DesignTaskVariant);
  const detailVisible = detailFields.visible;
  const detailEditable = detailFields.editable;
  const relationTabOrder: Array<'collaborationItems' | 'relatedTasks' | 'testPlans'> = taskKind === 'test'
    ? ['collaborationItems', 'relatedTasks', 'testPlans']
    : taskKind === 'requirement' ? ['collaborationItems']
      : ['collaborationItems', 'relatedTasks'];
  useEffect(() => {
    if (!selectedTask?.productLineId) { setDetailWorkItemTypes([]); return; }
    let active = true;
    setDetailWorkItemTypes([]);
    productRepository.workItemTypes(selectedTask.productLineId)
      .then((items) => { if (active) setDetailWorkItemTypes(items); })
      .catch(() => { if (active) setDetailWorkItemTypes([]); });
    return () => { active = false; };
  }, [selectedTask?.productLineId]);
  const [detailEditing, setDetailEditing] = useState(false);
  const detailDescriptionEditor = useRef<HTMLDivElement>(null);
  const [detailDescription, setDetailDescription] = useState('');
  const [detailDescriptionHtml, setDetailDescriptionHtml] = useState('');
  const [detailEstimatedHours, setDetailEstimatedHours] = useState<number | null>(0);
  const [detailActualHours, setDetailActualHours] = useState<number | null>(0);
  const [detailTab, setDetailTab] = useState<'collaborationItems' | 'relatedTasks' | 'testPlans' | 'activity' | 'support' | 'hours'>('activity');
  const [remoteCandidates, setRemoteCandidates] = useState<RequirementWorkOrderCandidate[]>([]);
  const [relatedWorkItems, setRelatedWorkItems] = useState<RequirementTask[]>([]);
  const [transitionOptions, setTransitionOptions] = useState<Record<string, WorkItemTransitionOptions>>({});
  const [transitionLoadingId, setTransitionLoadingId] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const commentTargetRef = useRef(selectedTask?.id);
  commentTargetRef.current = selectedTask?.id;
  const activityQuery = useQuery({
    queryKey: ['task-activities', taskKind, selectedTask?.productLineId, selectedTask?.id, selectedTask?.revision, selectedTask?.status],
    enabled: Boolean(selectedTask && (isBusinessTask || selectedTask.productLineId)),
    queryFn: async () => {
      const records = isBusinessTask
        ? await productRepository.businessTaskActivities(taskKind as 'presales' | 'delivery' | 'ops', selectedTask!.id)
        : await productRepository.workItemActivities(selectedTask!.productLineId!, selectedTask!.id);
      return records.map(normalizeTaskActivity);
    },
  });
  const taskEvents = activityQuery.data || selectedTask?.events || [];
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDetailTab('activity');
    setCommentDraft('');
    setDetailEditing(false);
    setRelatedWorkItems([]);
  }, [selectedTask?.id]);

  useEffect(() => {
    setDetailDescription(selectedTask?.description || '');
    setDetailDescriptionHtml(selectedTask?.descriptionHtml || '');
  }, [selectedTask?.id, selectedTask?.description, selectedTask?.descriptionHtml]);

  useEffect(() => {
    setDetailEstimatedHours(Number(selectedTask?.estimatedHours || 0));
  }, [selectedTask?.id, selectedTask?.estimatedHours]);

  useEffect(() => {
    setDetailActualHours(Number(selectedTask?.actualHours || 0));
  }, [selectedTask?.id, selectedTask?.actualHours]);

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
      : Promise.resolve({ requirement: undefined, linkedItems: [] });
    const relationsRequest = productRepository.workItemRelations(selectedTask.productLineId, selectedTask.id);
    Promise.all([detailRequest, summaryRequest, relationsRequest])
      .then(async ([detail, summary, relationView]) => {
        setSelectedTask((current) => current?.id === detail.id ? {
          ...storedTask(detail, current),
          requirementTitle: summary.requirement?.title || current.requirementTitle
        } : current);
        const relatedIds = (relationView.relations || []).filter((relation) => relation.type === 'RELATES_TO').map((relation) => relation.sourceId === selectedTask.id ? relation.targetId : relation.sourceId);
        const relatedDetails = await Promise.all(relatedIds.map((id) => productRepository.workItemDetail(selectedTask.productLineId!, id)));
        setRelatedWorkItems(relatedDetails.map((item) => storedTask(item, selectedTask)));
      })
      .catch(() => { setRelatedWorkItems([]); });
  }, [selectedTask?.id, selectedTask?.productLineId]);

  const localCandidates = useMemo<RequirementWorkOrderCandidate[]>(() => [
    ...requirementTasks.map((item) => ({ id: item.id, type: 'requirement' as const, typeLabel: '需求', title: item.title, code: item.code, ownerName: item.ownerName, creatorName: item.creatorName, expectedCompleteDate: item.expectedCompleteDate, productLineName: item.productLineName, status: item.status, summary: item.description })),
    ...requirementTasks.filter((item) => item.id !== selectedTask?.id).flatMap((item) => (item.events || []).filter((event) => event.eventType === '转任务').map((event) => ({ id: String(event.metadata?.taskId || `${item.id}-task`), type: 'task' as const, typeLabel: '任务', title: String(event.metadata?.taskTitle || item.title), ownerName: String(event.metadata?.assigneeName || item.ownerName), productLineName: item.productLineName, status: item.status }))),
    ...bugs.map((item: DefectBug) => ({ id: item.id, type: 'bug' as const, typeLabel: '缺陷', title: item.title, code: item.code, ownerName: item.ownerName || item.assignee, productLineName: item.productLineName, status: item.status, summary: item.description })),
    ...devTasks.map((item: DevTask) => ({ id: item.id, type: 'task' as const, typeLabel: '任务', title: item.title, ownerName: item.developer, productLineName: item.productLineName, status: item.status, summary: item.description })),
    ...requirementPool.map((item: RequirementPoolItem) => ({ id: item.id, type: 'source' as const, typeLabel: '原始诉求', title: item.title, code: item.code, ownerName: item.submitter, productLineName: item.productLineName, status: item.status, summary: item.description })),
    ...risks.map((item) => ({ id: item.id, type: 'risk' as const, typeLabel: '风险', title: item.title, status: item.status, summary: item.mitigationPlan }))
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index && item.id !== selectedTask?.id), [requirementTasks, bugs, devTasks, requirementPool, risks, selectedTask?.id]);

  const candidateOptions = remoteCandidates.length ? remoteCandidates.filter((item) => item.id !== selectedTask?.id) : localCandidates;
  const collaborationCandidates = collaborationCandidatesFor(candidateOptions, requirementTasks, creationContext?.sourceWorkOrder);
  const linkedTaskQuery = useQuery({ queryKey: ['task-association-options', productLineKey], queryFn: async () => (await Promise.all(productLines.map(async (line) => {
    const items: UnifiedWorkItem[] = [];
    for (let page = 1; ; page++) { const result = await productRepository.workItems(line.id, '', '', { page }); items.push(...result.page.items); if (!result.page.items.length || items.length >= result.page.total) break; }
    return items;
  }))).flat() });
  const taskCandidates: RequirementWorkOrderCandidate[] = (linkedTaskQuery.data || []).filter((item) => {
    if (item.id === selectedTask?.id) return false;
    if (taskKind === 'design' || taskKind === 'dev' || taskKind === 'test') {
      const status = item.status?.name || '';
      return item.category === 'requirement' && status !== '已取消';
    }
    return item.category !== taskKind;
  }).map((item) => ({ id: item.id, productLineId: item.productLineId, title: item.title, code: item.code, type: item.category === 'bug' ? 'bug' : 'task', category: item.category, typeLabel: workItemCategoryLabel[item.category] || '任务', ownerName: item.assigneeName, productLineName: productLines.find((line) => line.id === item.productLineId)?.name, status: item.status?.name }));
  const relatedProductTask = creationContext?.relatedProductTask || (allocationParent ? {
    ...allocationParent, status: allocationParent.status?.name, ownerName: allocationParent.assigneeName
  } : undefined);
  const creationTaskCandidates: RequirementWorkOrderCandidate[] = relatedProductTask ? [
    { id: relatedProductTask.id, productLineId: relatedProductTask.productLineId || creationContext?.productLineId, title: relatedProductTask.title, code: relatedProductTask.code, type: 'requirement', category: 'requirement', typeLabel: '产品任务', ownerName: relatedProductTask.ownerName, status: relatedProductTask.status },
    ...taskCandidates.filter((item) => item.id !== relatedProductTask.id)
  ] : taskCandidates;
  useEffect(() => {
    requirementRepository.workOrderCandidates({ requirementId: selectedTask?.id || '', limit: 200 }).then((items) => setRemoteCandidates(Array.isArray(items) ? items : [])).catch(() => setRemoteCandidates([]));
  }, [selectedTask?.id]);

  const updateLinkedWorkOrders = (ids: string[]) => {
    if (!selectedTask) return;
    const titles = ids.map((id) => candidateOptions.find((item) => item.id === id)?.title || id);
    saveDetailUpdates({ sourceWorkOrderIds: ids, sourceWorkOrderTitles: titles });
  };

  const navigateWorkOrderCandidate = (item: RequirementWorkOrderCandidate) => {
    openWorkItemDetailLink(item.id, item.sourceType === 'WORK_ORDER' ? 'WORK_ORDER' : item.category || 'requirement', item.productLineId);
  };

  const saveDetailUpdates = async (updates: Partial<RequirementTask>) => {
    if (!selectedTask) return false;
    const saved = await updateTask(selectedTask.id, updates);
    if (saved) setSelectedTask((current) => current ? { ...current, ...updates } : current);
    return saved;
  };

  const openWorkItemDetail = async (item: Record<string, unknown>, fallback?: RequirementTask) => {
    const lineId = String(item.productLineId || fallback?.productLineId || '');
    const id = String(item.id || '');
    if (!lineId || !id) return;
    try {
      const detail = await productRepository.workItemDetail(lineId, id);
      setSelectedTask(storedTask(detail, fallback));
    } catch (error) {
      addToast('error', '关联任务详情加载失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const submitComment = async () => {
    if (!selectedTask || !commentDraft.trim() || commentSaving) return;
    const content = commentDraft.trim();
    if (content.length > 10000) { addToast('error', '评论发布失败', '评论不能超过10000字'); return; }
    setCommentSaving(true);
    try {
      if (isBusinessTask) await productRepository.commentBusinessTask(taskKind as 'presales' | 'delivery' | 'ops', selectedTask.id, content);
      else if (selectedTask.productLineId) await productRepository.commentWorkItem(selectedTask.productLineId, selectedTask.id, content);
      else await requirementRepository.comment(selectedTask.id, content);
      if (commentTargetRef.current === selectedTask.id) setCommentDraft('');
      addToast('success', '评论已发布');
      if (isBusinessTask || selectedTask.productLineId) await activityQuery.refetch();
      else {
        const detail = await requirementRepository.detail(selectedTask.id);
        setSelectedTask((current) => current?.id === detail.id ? { ...current, ...detail } : current);
      }
    } catch (error) { addToast('error', '评论发布失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setCommentSaving(false); }
  };

  const closeTaskDetail = () => {
    setPendingDetailTarget(null);
    setSelectedTask(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('detailId');
    url.searchParams.delete('productLineId');
    window.history.replaceState(null, '', url);
    onDetailClose?.();
  };
  const copyTaskValue = async (link: boolean) => {
    if (!selectedTask) return;
    const url = workItemDetailLink(selectedTask.id, selectedTask.category || taskKind, selectedTask.productLineId);
    try { await copyToClipboard(link ? url : selectedTask.code || selectedTask.id); addToast('success', link ? '详情链接已复制' : '任务编号已复制'); }
    catch (error) { addToast('error', '复制失败', error instanceof Error ? error.message : '请检查浏览器剪贴板权限'); }
  };
  useEffect(() => {
    const onAllocationCreate = (event: Event) => {
      const detail = (event as CustomEvent<{ targetKind?: string; parent?: AllocationRow; relatedProductTask?: AllocationRow }>).detail;
      if (detail?.targetKind !== taskKind || !detail.parent) return;
      openAddModal();
      setAllocationParent(detail.parent);
      setFormProductLineName(detail.parent.productLineName || '', detail.parent.productLineId);
      setFormVersionName(detail.parent.versionName || '', detail.parent.versionId || undefined);
      if (detail.relatedProductTask) setSelectedRequirementTaskIds([detail.relatedProductTask.id]);
    };
    window.addEventListener('product-task-create', onAllocationCreate);
    return () => window.removeEventListener('product-task-create', onAllocationCreate);
  }, [taskKind]);

  useEffect(() => {
    const params = new URLSearchParams(detailSearch);
    const id = params.get('detailId') || '';
    if (!id || handledDetailId.current === id) return;
    const task = activeTasks.find((item) => item.id === id) || contextTasks.find((item) => item.id === id) || linkedTaskQuery.data?.find((item) => item.id === id);
    const lineId = params.get('productLineId') || task?.productLineId;
    if (lineId || isBusinessTask) { handledDetailId.current = id; setPendingDetailTarget({ itemId: id, productLineId: lineId || '' }); }
    else if (task) { handledDetailId.current = id; setSelectedTask(task); }
  }, [detailSearch, activeTasks, contextTasks, linkedTaskQuery.data]);

  const eventSummary = taskActivitySummary;

  // Modal State (新建任务 云效风格: 任务名称、任务描述、期望目标、完成时间、分配负责人、紧急程度、迭代版本、关联客户、关联产品、预计工时)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RequirementTask | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formPriority, setFormPriority] = useState<RequirementTask['priority']>('中');
  const [formVersionName, setFormVersionNameValue] = useState('');
  const [formVersionId, setFormVersionId] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formBusinessSource, setFormBusinessSource] = useState('');
  const [formBusinessCustomer, setFormBusinessCustomer] = useState('');
  const [needsCollaboration, setNeedsCollaboration] = useState<Array<'design' | 'dev' | 'test'>>(['dev', 'test']);
  const [taskSaving, setTaskSaving] = useState(false);
  const [formProductLineName, setFormProductLineNameValue] = useState('');
  const [formProductLineId, setFormProductLineId] = useState('');
  const formProductLine = productLines.find(line => line.id === formProductLineId) || productLines.find(line => line.name === formProductLineName);
  const formVersions = taskVersionOptions(versions, formProductLine);
  const setFormProductLineName = (name: string, productId?: string) => {
    setFormProductLineNameValue(name);
    setFormProductLineId(productId || productLines.find(line => line.name === name)?.id || '');
  };
  const setFormVersionName = (name: string, versionId?: string) => {
    setFormVersionNameValue(name);
    setFormVersionId(versionId || formVersions.find(version => version.name === name)?.id || '');
  };
  const [formSourceDepartment, setFormSourceDepartment] = useState('');
  const [formEstimatedHours, setFormEstimatedHours] = useState<number | ''>('');
  const [formActualHours, setFormActualHours] = useState<number | ''>('');
  const [formRequirementType, setFormRequirementType] = useState('');
  const [configuredWorkItemTypes, setConfiguredWorkItemTypes] = useState<ProductLineWorkItemType[]>([]);
  const [taskTypeLoadState, setTaskTypeLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [taskSaveIssue, setTaskSaveIssue] = useState<{ type: 'warning' | 'error'; title: string; description?: string } | null>(null);
  const [formVerifierId, setFormVerifierId] = useState('');
  const [formCcNames, setFormCcNames] = useState<string[]>([]);
  const [formPlannedStartDate, setFormPlannedStartDate] = useState('');
  const [formExpectedCompleteDate, setFormExpectedCompleteDate] = useState('');
  const [selectedWorkOrderIds, setSelectedWorkOrderIds] = useState<string[]>([]);
  const [selectedRequirementTaskIds, setSelectedRequirementTaskIds] = useState<string[]>([]);
  const [formMedia, setFormMedia] = useState<RequirementMedia[]>([]);
  const descriptionEditor = useRef<HTMLDivElement>(null);
  const [formDescriptionHtml, setFormDescriptionHtml] = useState('');
  const deliveryProject = useMemo(() => projectDeliveryMap().find((project) => project.id === formCustomerName), [formCustomerName]);
  const opsProductOptions = useMemo(() => {
    if (taskKind !== 'ops' || !formCustomerName) return productLines;
    const productNames = new Set((deliveryProject?.products || []).map((product) => product.name));
    return productLines.filter((line) => productNames.has(line.name) || productNames.has(line.id));
  }, [deliveryProject, formCustomerName, productLines, taskKind]);
  const [employees, setEmployees] = useState<string[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const resolvedEmployeeOptions = employeeOptions;
  const employeeNameOptions = employeeSelectOptions(employeeOptions, 'name');
  const handleFormOwnerChange = (ownerName: string) => {
    setFormOwnerName(ownerName);
  };

  const designVariantMeta: Record<DesignTaskVariant, { label: string; fieldLabel: string; placeholder: string; defaultType: string }> = {
    product: { label: '产品设计', fieldLabel: '所属产品', placeholder: '请选择所属产品', defaultType: '产品设计' },
    project: { label: '项目设计', fieldLabel: '所属项目', placeholder: '请选择所属项目', defaultType: '项目设计' },
    other: { label: '其他设计', fieldLabel: '来源部门', placeholder: '请选择来源部门', defaultType: '其他设计' }
  };
  const currentDesignVariant = designVariantMeta[designVariant];
  const designSourceOptions = Array.from(new Set([...employeeOptions.map((item) => item.department).filter(Boolean), currentUser.department, formSourceDepartment])).filter(Boolean).map((value) => ({ label: value, value }));
  useEffect(() => {
    teamRepository.options()
      .then((items) => {
        setEmployeeOptions(items);
        setEmployees(Array.from(new Set(items.map((item) => item.name).filter(Boolean))));
      })
      .catch(() => {
        setEmployeeOptions([]);
        setEmployees([]);
      });
  }, [currentUser.name, requirementTasks]);

  const configuredCategory = taskKind === 'requirement' ? '需求' : taskKind === 'design' ? '设计' : taskKind === 'dev' ? '研发' : taskKind === 'test' ? '测试' : taskKind === 'bug' ? '缺陷' : undefined;
  useEffect(() => {
    if (!isModalOpen) return;
    const line = productLines.find((item) => item.id === formProductLineId) || productLines.find((item) => item.name === formProductLineName) || productLines.find((item) => item.id === productLineFilter) || (taskKind === 'design' && designVariant !== 'product' ? productLines[0] : undefined);
    if (!line || !configuredCategory) { setConfiguredWorkItemTypes([]); setTaskTypeLoadState('idle'); return; }
    const applyItems = (items: ProductLineWorkItemType[]) => {
      setConfiguredWorkItemTypes(items);
      if (!editingTask && taskKind !== 'bug') setFormRequirementType((current) => preferredWorkItemTypeName(items, current));
    };
    let active = true;
    setTaskTypeLoadState('loading');
    productRepository.workItemTypes(line.id, configuredCategory)
      .then((items) => { if (active) { applyItems(items.filter((item) => item.enabled)); setTaskTypeLoadState('ready'); } })
      .catch(() => { if (active) { applyItems([]); setTaskTypeLoadState('error'); } });
    return () => { active = false; };
  }, [configuredCategory, designVariant, editingTask, formProductLineId, formProductLineName, isModalOpen, productLineFilter, productLines, remoteApiEnabled, taskKind]);

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

  const openAddModal = (variantOverride?: DesignTaskVariant) => {
    setTaskSaveIssue(null);
    const openingVariant = taskKind === 'design' ? (variantOverride || designVariant) : designVariant;
    const openingVariantMeta = designVariantMeta[openingVariant];
    setAllocationParent(null);
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormDescriptionHtml('');
    setFormTarget('');
    setFormDueDate('');
    setFormOwnerName(taskKind === 'bug' ? currentUser.name : '');
    setFormVerifierId(employeeOptions.find(employee => employee.id === currentUser.id || employee.name === currentUser.name)?.id || currentUser.id || '');
    setFormPriority('中');
    setFormVersionName('');
    setFormCustomerName('');
    setFormBusinessSource('');
    setFormBusinessCustomer('');
    setFormSourceDepartment('');
    const selectedProduct = productLineFilter !== 'all'
      ? productLines.find((productLine) => productLine.id === productLineFilter)
      : undefined;
    setFormProductLineName(taskKind === 'ops' ? '' : selectedProduct?.name || '', taskKind === 'ops' ? undefined : selectedProduct?.id);
    setFormEstimatedHours('');
    setFormActualHours('');
    setFormRequirementType(taskKind === 'bug' ? '系统缺陷' : taskKind === 'design' ? openingVariantMeta.defaultType : '');
    setFormCcNames([]);
    setFormPlannedStartDate('');
    setFormExpectedCompleteDate('');
    setSelectedWorkOrderIds([]);
    setSelectedRequirementTaskIds([]);
    setNeedsCollaboration(['dev', 'test']);
    setFormMedia([]);
    setIsModalOpen(true);
  };

  const creationIntentKey = `${taskKind}:${creationContext?.productLineId || ''}:${creationContext?.versionId || ''}:${creationContext?.relatedProductTask?.id || ''}`;
  const consumedCreationIntent = useRef('');
  useEffect(() => {
    if (!creationContext || consumedCreationIntent.current === creationIntentKey) return;
    const line = productLines.find((item) => item.id === creationContext.productLineId);
    if (!line && !creationContext.sourceWorkOrder) return;
    const version = versions.find((item) => item.id === creationContext.versionId);
    const ownerName = employeeOptions.find((item) => item.id === creationContext.assigneeId)?.name || creationContext.assigneeName;
    if (creationContext.versionId && !version) return;
    if (creationContext.assigneeId && !ownerName) return;
    consumedCreationIntent.current = creationIntentKey;
    openAddModal();
    const source = creationContext.sourceWorkOrder;
    const sourceFields = source?.specialFields && typeof source.specialFields === 'object' ? source.specialFields : {};
    const sourceProject = projectOptions.find(project => project.id === source?.projectId || project.name === (source?.projectName || sourceFields.projectName));
    setFormProductLineName(line?.name || '', line?.id);
    if (taskKind === 'design' && designVariant === 'project') setFormCustomerName(sourceProject?.id || '');
    if (taskKind === 'design' && designVariant === 'other') setFormSourceDepartment(source?.department || currentUser.department || '');
    if (taskKind === 'ops' && sourceProject) setFormCustomerName(sourceProject.id);
    if (creationContext.sourceWorkOrder) setSelectedWorkOrderIds([creationContext.sourceWorkOrder.id]);
    if (creationContext.relatedProductTask) setSelectedRequirementTaskIds([creationContext.relatedProductTask.id]);
    setFormVersionName(version?.name || '', version?.id);
    setFormOwnerName(ownerName || (taskKind === 'bug' ? currentUser.name : ''));
    setFormVerifierId(employeeOptions.find(employee => employee.id === currentUser.id || employee.name === currentUser.name)?.id || currentUser.id || '');
    setFormTitle(creationContext.title || '');
  }, [creationContext, creationIntentKey, productLines, versions, employeeOptions, designVariant, projectOptions, currentUser.department]);

  useEffect(() => {
    const raw = sessionStorage.getItem('shichuang.iterationTaskCreate');
    if (creationContext) return;
    if (!raw) return;
    let intent: { kind?: string; productLineId?: string; versionId?: string };
    try { intent = JSON.parse(raw); } catch { sessionStorage.removeItem('shichuang.iterationTaskCreate'); return; }
    if (intent.kind !== taskKind) return;
    const line = productLines.find((item) => item.id === intent.productLineId);
    const version = versions.find((item) => item.id === intent.versionId && (
      item.productLineId === line?.id || item.productLineName === line?.name
    ));
    if (!line || !version) return;
    sessionStorage.removeItem('shichuang.iterationTaskCreate');
    openAddModal();
    setFormProductLineName(line.name, line.id);
    setFormVersionName(version.name, version.id);
  }, [taskKind, productLines, versions]);

  useEffect(() => {
    const raw = sessionStorage.getItem('shichuang.productTaskCreate');
    if (creationContext) return;
    if (!raw) return;
    let intent: { kind?: string; productLineId?: string };
    try { intent = JSON.parse(raw); } catch { sessionStorage.removeItem('shichuang.productTaskCreate'); return; }
    if (intent.kind !== taskKind) return;
    const line = productLines.find((item) => item.id === intent.productLineId);
    if (!line) return;
    sessionStorage.removeItem('shichuang.productTaskCreate');
    openAddModal();
    setFormProductLineName(line.name, line.id);
  }, [taskKind, productLines]);

  useEffect(() => {
    if (!requirementTaskDraft || creationContext) return;
    setEditingTask(null);
    setFormTitle(requirementTaskDraft.title || '');
    setFormDescription(requirementTaskDraft.description || '');
    setFormDescriptionHtml('');
    setFormTarget(requirementTaskDraft.expectedGoal || '');
    setFormOwnerName(requirementTaskDraft.ownerName || currentUser.name);
    setFormPriority(requirementTaskDraft.priority || '中');
    setFormProductLineName(requirementTaskDraft.productLineName || productLines[0]?.name || '', requirementTaskDraft.productLineId);
    setFormVersionName(requirementTaskDraft.versionName || '', requirementTaskDraft.versionId);
    setFormDueDate(requirementTaskDraft.dueDate || '');
    setFormExpectedCompleteDate(requirementTaskDraft.expectedCompleteDate || '');
    setFormCustomerName(requirementTaskDraft.projectId || '');
    setNeedsCollaboration(requirementTaskDraft.needsCollaboration ?? ['dev', 'test']);
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
    setFormDescriptionHtml(task.descriptionHtml || '');
    setFormTarget(task.expectedGoal || '');
    setFormDueDate(task.dueDate);
    setFormOwnerName(task.ownerName);
    setFormVerifierId(task.verifierId || employeeOptions.find(employee => employee.name === task.verifierName)?.id || '');
    setFormPriority(normalizePriority(task.priority) as RequirementTask['priority']);
    setFormVersionName(task.versionName, task.versionId);
    setFormCustomerName(task.projectId || projectOptions.find((project) => project.name === task.designProjectName)?.id || '');
    setFormBusinessCustomer(task.customerId || task.customerName || '');
    const businessFields = typeof task.specialFields === 'object' && task.specialFields ? task.specialFields as Record<string, unknown> : {};
    setFormBusinessSource(String(businessFields.sourceId || businessFields.opportunityId || businessFields.biddingId || businessFields.opportunityName || businessFields.biddingName || ''));
    setFormSourceDepartment(task.designSourceDepartment || task.department || '');
    setNeedsCollaboration(task.needsCollaboration ?? ['dev', 'test']);
    setFormProductLineName(task.productLineName, task.productLineId);
    setFormEstimatedHours(task.estimatedHours);
    setFormActualHours(task.actualHours || 0);
    setFormRequirementType(task.requirementType || '业务需求');
    setFormCcNames(task.ccNames || []);
    setFormPlannedStartDate(task.plannedStartDate || '');
    setFormExpectedCompleteDate(task.expectedCompleteDate || '');
    setSelectedWorkOrderIds(task.sourceWorkOrderIds || []);
    setSelectedRequirementTaskIds(task.relatedTaskIds || []);
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
    if (taskSaving) return false;
    setTaskSaveIssue(null);
    const reportSaveIssue = (type: 'warning' | 'error', title: string, description?: string) => {
      setTaskSaveIssue({ type, title, description });
      addToast(type, title, description);
    };
    if (!formTitle.trim()) {
      reportSaveIssue('warning', `请填写${itemLabel}名称`);
      return;
    }
    if (configuredCategory && createFields.required('productLine') && !formProductLineName) { reportSaveIssue('warning', '请选择关联产品'); return false; }
    if (configuredCategory && taskTypeLoadState === 'ready' && !configuredWorkItemTypes.length) { reportSaveIssue('warning', '当前产品没有可用的任务类型', '请先在产研模板中启用类型'); return false; }
    if (configuredCategory && taskTypeLoadState === 'loading') { reportSaveIssue('warning', '任务类型加载中，请稍后保存'); return false; }
    if (configuredCategory && taskTypeLoadState === 'error') { reportSaveIssue('error', '任务类型加载失败', '请重新选择关联产品后重试'); return false; }
    if (configuredCategory && !formRequirementType) {
      reportSaveIssue('warning', `请选择${itemLabel}类型`);
      return;
    }
    const selectedProductLine = formProductLine;
    const selectedWorkItemType = configuredWorkItemTypes.find((item) => item.name === formRequirementType || (taskKind === 'design' && designTypeLabel(item.name) === formRequirementType)) || (taskKind === 'bug' ? configuredWorkItemTypes.find(item => item.isDefault) || configuredWorkItemTypes[0] : undefined);
    const designWithoutProduct = taskKind === 'design' && designVariant !== 'product';
    if (configuredCategory && !designWithoutProduct && (!selectedProductLine || !selectedWorkItemType)) {
      reportSaveIssue('warning', '请选择产品及其已启用的工作项子类型');
      return;
    }
    const selectedVersion = formVersions.find((version) => version.id === formVersionId);
    if (createFields.required('version') && !selectedVersion) { reportSaveIssue('warning', '请选择关联产品的迭代版本'); return false; }
    if (!formPlannedStartDate || !formDueDate) {
      reportSaveIssue('warning', !formPlannedStartDate ? '请选择计划开始时间' : '请选择计划完成时间');
      return false;
    }
    if (formPlannedStartDate && formDueDate && formPlannedStartDate > formDueDate) { reportSaveIssue('warning', '计划完成时间不能早于计划开始时间'); return false; }
    if (taskKind === 'ops' && !formCustomerName) { reportSaveIssue('warning', '请选择关联项目'); return false; }
    if (taskKind === 'presales' && (!formBusinessSource || !formBusinessCustomer)) { reportSaveIssue('warning', !formBusinessSource ? '请选择关联商机或投标项' : '请选择关联客户'); return false; }
    if (taskKind === 'delivery' && (!formCustomerName || !formBusinessCustomer)) { reportSaveIssue('warning', !formCustomerName ? '请选择关联项目' : '请选择关联客户'); return false; }
    const projectName = projectOptions.find((project) => project.id === formCustomerName)?.name || '';
    const businessCustomer = directoryCustomerOptions.find((customer) => customer.id === formBusinessCustomer || customer.name === formBusinessCustomer);
    const businessSource = [...opportunities, ...biddings].find((item) => item.id === formBusinessSource || item.name === formBusinessSource || (item as any).projectName === formBusinessSource);
    const designProject = taskKind === 'design' && designVariant === 'project' ? projectOptions.find((project) => project.id === formCustomerName) : undefined;
    const associationValues = { ...(taskKind === 'bug' ? { verifierId: formVerifierId, verifierName: employeeOptions.find(employee => employee.id === formVerifierId)?.name || '' } : {}), ...(isBusinessTask ? { customerId: businessCustomer?.id || formBusinessCustomer, customerName: businessCustomer?.name || formBusinessCustomer, specialFields: taskKind === 'presales' ? { opportunityId: businessSource?.id, opportunityName: (businessSource as any)?.name, biddingId: (businessSource as any)?.id, biddingName: (businessSource as any)?.name } : { projectStage: '' } } : {}), ...(taskKind === 'design' ? { designVariant: designVariant as DesignTaskVariant, designProjectName: designProject?.name || '', designSourceDepartment: formSourceDepartment } : {}), projectId: designProject?.id || (taskKind === 'design' && designVariant === 'project' ? '' : formCustomerName), projectName: designProject?.name || projectName, ...(taskKind === 'requirement' && !editingTask ? { needsCollaboration } : {}), relatedTaskIds: taskKind === 'requirement' && !editingTask ? [] : selectedRequirementTaskIds, sourceWorkOrderIds: selectedWorkOrderIds, sourceWorkOrderTitles: selectedWorkOrderIds.map((id) => collaborationCandidates.find((item) => item.id === id)?.title || (creationContext?.sourceWorkOrder?.id === id ? creationContext.sourceWorkOrder.title : id)), ...(creationContext?.sourceWorkOrder ? { requirementId: creationContext.sourceWorkOrder.id, sourceType: 'WORK_ORDER' } : {}) };
    const requiredValues: Record<string, unknown> = { source: formBusinessSource, customer: formBusinessCustomer, productLine: formProductLineName, sourceDepartment: formSourceDepartment, taskType: formRequirementType, assignee: formOwnerName, priority: formPriority, project: formCustomerName, expectedGoal: formTarget, description: formDescription, plannedStartDate: formPlannedStartDate, plannedEndDate: formDueDate, expectedCompleteDate: formExpectedCompleteDate, version: formVersionName, cc: formCcNames, attachments: formMedia, estimatedHours: formEstimatedHours, collaborationItems: selectedWorkOrderIds, relatedTasks: selectedRequirementTaskIds, needsCollaboration };
    const missingField = createFields.fields.find((field) => field.visible && field.required && !(taskKind === 'requirement' && !editingTask && field.fieldCode === 'relatedTasks') && field.fieldCode in requiredValues && (Array.isArray(requiredValues[field.fieldCode]) ? !(requiredValues[field.fieldCode] as unknown[]).length : requiredValues[field.fieldCode] == null || requiredValues[field.fieldCode] === ''));
    if (missingField) { reportSaveIssue('warning', `请填写${missingField.label}`); return false; }
    setTaskSaving(true);
    let saveSucceeded = true;
    try {
    if (editingTask) {
      saveSucceeded = await updateTask(editingTask.id, {
        ...associationValues,
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
        productLineName: formProductLineName,
        estimatedHours: Number(formEstimatedHours),
        actualHours: Number(formActualHours),
        requirementType: formRequirementType,
        workItemTypeId: selectedWorkItemType?.id,
        ccNames: formCcNames,
        plannedStartDate: formPlannedStartDate,
        expectedCompleteDate: formExpectedCompleteDate,
        sourceWorkOrderIds: selectedWorkOrderIds,
        sourceWorkOrderTitles: associationValues.sourceWorkOrderTitles,
        requirementId: editingTask.requirementId,
        media: formMedia
      });
      if (saveSucceeded) addToast('success', `${itemLabel}信息已更新`);
    } else if (configuredCategory && !designWithoutProduct && selectedProductLine && selectedWorkItemType && unifiedCategory) {
      try {
        const submitWorkItem = creationContext?.onSubmit || productRepository.createWorkItem;
        await submitWorkItem({
          ...associationValues,
          requestId: `create-${unifiedCategory}-${Date.now()}`,
          productLineId: selectedProductLine.id,
          category: unifiedCategory,
          taskTypeId: selectedWorkItemType.id,
          ...(taskKind === 'bug' ? { type: formRequirementType, verifierId: formVerifierId, verifierName: employeeOptions.find(employee => employee.id === formVerifierId)?.name } : {}),
          title: formTitle.trim(),
          description: formDescription,
          descriptionHtml: formDescriptionHtml,
          expectedGoal: formTarget,
          versionId: selectedVersion?.id,
          assigneeId: employeeOptions.find((item) => item.name === formOwnerName)?.id,
          ccNames: formCcNames,
          media: formMedia,
          priority: apiPriority(formPriority),
          plannedStartDate: formPlannedStartDate || undefined,
          plannedEndDate: formDueDate || undefined,
          expectedCompleteDate: formExpectedCompleteDate || undefined,
          estimatedHours: Number(formEstimatedHours) || 0,
          actualHours: Number(formActualHours) || 0
          , requirementId: creationContext?.sourceWorkOrder?.id || allocationParent?.id || creationContext?.relatedProductTask?.id || creationContext?.parent?.id
        });
        await unifiedQuery.refetch();
        window.dispatchEvent(new CustomEvent('product-task-created', { detail: { source: 'product-task', productLineId: selectedProductLine.id, needsCollaboration: needsCollaboration || [] } }));
        addToast('success', `${itemLabel}已创建`, `已关联产品子类型“${selectedWorkItemType.name}”及其最新状态流程`);
      } catch (error) {
        saveSucceeded = false;
        reportSaveIssue('error', `${itemLabel}创建失败`, error instanceof Error ? error.message : '请检查产品类型和状态配置');
      }
    } else {
      const saved = await addTask({
        ...associationValues,
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
        expectedGoal: formTarget,
        descriptionHtml: formDescriptionHtml,
        requirementType: formRequirementType,
        workItemTypeId: selectedWorkItemType?.id,
        ccNames: formCcNames,
        plannedStartDate: formPlannedStartDate,
        expectedCompleteDate: formExpectedCompleteDate,
        sourceWorkOrderIds: selectedWorkOrderIds,
        sourceWorkOrderTitles: associationValues.sourceWorkOrderTitles,
        media: formMedia
      });
      saveSucceeded = saved !== false;
      if (saveSucceeded) addToast('success', taskKind === 'design' ? '设计任务已写入' : isBusinessTask ? `${itemLabel}已写入` : '需求任务已写入', taskKind === 'design' ? '已保存到设计任务数据表' : isBusinessTask ? `已保存到${itemLabel}数据表` : '已自动同步录入云效需求池与版本规划');
    }
      if (saveSucceeded) {
        await Promise.all(['unified-task-page', 'product-task-allocation', 'design-tasks', 'product-dev-tasks', 'product-bugs', 'requirements'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
        if (!editingTask && !creationContext) { setActiveTab('my_created'); setShowProductTasks(false); setPage(1); setSearchQuery(''); setSearchDraft(''); setSearchOwnerNames([]); setAppliedFilters(createEmptyRequirementFilters()); setGroupBy('none'); }
        if (allocationParent?.id) window.dispatchEvent(new CustomEvent('product-task-created', { detail: { parentId: allocationParent.id } }));
        setIsModalOpen(false);
        setAllocationParent(null);
        creationContext?.onCreated?.();
        creationContext?.onClose?.();
      }
      return saveSucceeded;
    } catch (error) { reportSaveIssue('error', '任务保存失败', error instanceof Error ? error.message : '请稍后重试'); return false; }
    finally { setTaskSaving(false); }
  };

  const handleSaveAndContinue = async () => {
    if (await handleSaveTask()) openAddModal();
  };

  const parseParticipantNames = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((name): name is string => typeof name === 'string');
    if (typeof value !== 'string' || !value.trim()) return [];
    try { return parseParticipantNames(JSON.parse(value)); } catch { return []; }
  };

  const unifiedTask = (item: UnifiedWorkItem, fallback?: RequirementTask): RequirementTask => ({
    ...((fallback || {}) as RequirementTask),
    verifierId: String(item.verifierId ?? fallback?.verifierId ?? ''),
    verifierName: String(item.verifierName ?? fallback?.verifierName ?? ''),
    projectId: item.projectId ?? fallback?.projectId,
    projectName: item.projectName ?? fallback?.projectName,
    relatedTaskIds: item.relatedTaskIds ?? fallback?.relatedTaskIds,
    sourceWorkOrderIds: item.sourceWorkOrderIds ?? fallback?.sourceWorkOrderIds,
    sourceWorkOrderTitles: item.sourceWorkOrderTitles ?? fallback?.sourceWorkOrderTitles,
    needsCollaboration: item.needsCollaboration ?? fallback?.needsCollaboration,
    id: item.id,
    code: item.code,
    title: item.title,
    category: item.category as RequirementTask['category'],
    status: item.status?.name || '未设置',
    statusKey: item.statusKey || undefined,
    statusColor: item.statusColor || undefined,
    priority: item.priority || '',
    ownerName: item.assigneeName || '',
    creatorName: item.creatorName || fallback?.creatorName || '',
    ccNames: parseParticipantNames(item.ccNames),
    productLineId: item.productLineId,
    productLineName: productLines.find((line) => line.id === item.productLineId)?.name || fallback?.productLineName || '',
    versionId: item.versionId || undefined,
    versionName: item.versionName != null ? String(item.versionName) : versions.find((version) => version.id === item.versionId)?.name || fallback?.versionName || '',
    customerId: item.customerId ? String(item.customerId) : fallback?.customerId,
    customerName: item.customerName ? String(item.customerName) : fallback?.customerName,
    requirementId: item.requirementId || undefined,
    requirementTitle: item.requirementTitle || fallback?.requirementTitle,
    requirementInitiatorName: item.requirementInitiatorName || fallback?.requirementInitiatorName,
    sourceType: (item as UnifiedWorkItem & { sourceType?: string }).sourceType || fallback?.sourceType,
    parentWorkItemId: item.parentWorkItemId || undefined,
    workItemTypeId: item.taskTypeId || undefined,
    dueDate: item.dueDate || '',
    expectedCompleteDate: item.expectedCompleteDate ? String(item.expectedCompleteDate) : undefined,
    estimatedHours: Number(item.estimatedHours || 0),
    createdAt: item.createdAt,
    revision: item.revision,
    hasChildren: item.hasChildren
  });

  const storedTask = (item: Record<string, unknown>, fallback?: RequirementTask): RequirementTask => ({
    ...((fallback || {}) as RequirementTask),
    verifierId: String(item.verifierId ?? fallback?.verifierId ?? ''),
    verifierName: String(item.verifierName ?? fallback?.verifierName ?? ''),
    projectId: String(item.projectId ?? fallback?.projectId ?? ''),
    projectName: String(item.projectName ?? fallback?.projectName ?? ''),
    relatedTaskIds: Array.isArray(item.relatedTaskIds) ? item.relatedTaskIds as string[] : fallback?.relatedTaskIds,
    sourceWorkOrderIds: Array.isArray(item.sourceWorkOrderIds) ? item.sourceWorkOrderIds as string[] : fallback?.sourceWorkOrderIds,
    sourceWorkOrderTitles: Array.isArray(item.sourceWorkOrderTitles) ? item.sourceWorkOrderTitles as string[] : fallback?.sourceWorkOrderTitles,
    needsCollaboration: Array.isArray(item.needsCollaboration) ? item.needsCollaboration as RequirementTask['needsCollaboration'] : fallback?.needsCollaboration,
    designVariant: (item.designVariant || fallback?.designVariant) as RequirementTask['designVariant'],
    designProjectName: String(item.designProjectName ?? item.projectName ?? fallback?.designProjectName ?? ''),
    designSourceDepartment: String(item.designSourceDepartment ?? fallback?.designSourceDepartment ?? ''),
    requirementType: String((item.category === 'bug' ? item.type : undefined) ?? item.requirementType ?? fallback?.requirementType ?? ''),
    expectedCompleteDate: String(item.expectedCompleteDate ?? fallback?.expectedCompleteDate ?? ''),
    media: Array.isArray(item.media) ? item.media as RequirementMedia[] : fallback?.media,
    id: String(item.id || ''),
    code: String(item.code || ''),
    title: String(item.title || ''),
    category: String(item.category || fallback?.category || 'requirement') as RequirementTask['category'],
    status: String(item.statusName || (item.status && typeof item.status === 'object' ? (item.status as { name?: string }).name : '') || '未设置'),
    priority: String(item.priority ?? fallback?.priority ?? ''),
    ownerName: String(item.assigneeName ?? item.ownerName ?? fallback?.ownerName ?? ''),
    creatorName: String(item.creatorName || fallback?.creatorName || ''),
    ccNames: parseParticipantNames(item.ccNames),
    productLineId: String(item.productLineId ?? fallback?.productLineId ?? ''),
    productLineName: item.productLineName != null ? String(item.productLineName) : productLines.find((line) => line.id === String(item.productLineId ?? fallback?.productLineId ?? ''))?.name || fallback?.productLineName || '',
    versionId: item.versionId ? String(item.versionId) : fallback?.versionId,
    versionName: item.versionName != null ? String(item.versionName) : versions.find((version) => version.id === item.versionId)?.name || fallback?.versionName || '',
    customerId: item.customerId ? String(item.customerId) : fallback?.customerId,
    customerName: item.customerName ? String(item.customerName) : fallback?.customerName,
    requirementId: item.requirementId ? String(item.requirementId) : fallback?.requirementId,
    requirementTitle: item.requirementTitle ? String(item.requirementTitle) : fallback?.requirementTitle,
    requirementInitiatorName: item.requirementInitiatorName ? String(item.requirementInitiatorName) : fallback?.requirementInitiatorName,
    sourceType: item.sourceType ? String(item.sourceType) : fallback?.sourceType,
    parentWorkItemId: item.parentWorkItemId ? String(item.parentWorkItemId) : undefined,
    workItemTypeId: item.taskTypeId ? String(item.taskTypeId) : undefined,
    plannedStartDate: item.plannedStartDate ? String(item.plannedStartDate) : undefined,
    dueDate: String(item.plannedEndDate ?? item.dueDate ?? fallback?.dueDate ?? ''),
    estimatedHours: Number(item.estimatedHours || 0),
    actualHours: Number(item.actualHours || 0),
    statusKey: item.statusKey ? String(item.statusKey) : fallback?.statusKey,
    statusColor: item.statusColor ? String(item.statusColor) : fallback?.statusColor,
    createdAt: item.createdAt ? String(item.createdAt) : undefined,
    revision: item.revision == null ? undefined : Number(item.revision),
    description: String(item.description ?? fallback?.description ?? ''),
    descriptionHtml: String(item.descriptionHtml ?? fallback?.descriptionHtml ?? ''),
    expectedGoal: String(item.expectedGoal || ''),
    hasChildren: Boolean(item.hasChildren)
  });

  useEffect(() => {
    if (!pendingDetailTarget) return;
    const fallback = activeTasks.find((task) => task.id === pendingDetailTarget.itemId);
    const productLineId = pendingDetailTarget.productLineId || fallback?.productLineId || '';
    if (!productLineId && !isBusinessTask) return;
    let active = true;
    const request = isBusinessTask
      ? productRepository.businessTask(taskKind as 'presales' | 'delivery' | 'ops', pendingDetailTarget.itemId)
      : productRepository.workItemDetail(productLineId, pendingDetailTarget.itemId);
    request
      .then((detail) => {
        if (!active) return;
        setSelectedTask(isBusinessTask ? taskKind === 'delivery' ? normalizeDeliveryTask(detail as RequirementTask) : detail as RequirementTask : storedTask(detail, fallback));
        setPendingDetailTarget(null);
      })
      .catch((error) => {
        if (!active) return;
        addToast('error', `${itemLabel}详情加载失败`, error instanceof Error ? error.message : '请稍后重试');
        setPendingDetailTarget(null);
      });
    return () => { active = false; };
  }, [activeTasks, pendingDetailTarget, taskKind]);

  const loadTransitionOptions = async (task: RequirementTask, force = false) => {
    if (!task.productLineId || (!force && transitionOptions[task.id])) return;
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

  const performTaskTransition = async (task: RequirementTask, action: WorkItemTransitionAction, revision: number, reason = '', actualHours?: number, completionReview?: TaskCompletionReview) => {
    if (!task.productLineId) return;
    setTransitionLoadingId(task.id);
    try {
      const updated = storedTask(await productRepository.transitionWorkItem(task.productLineId, task.id, { edgeKey: action.edgeKey, revision, reason, actualHours, completionReview }), task);
      if (taskKind === 'design') setDesignTasks((items) => items.map((item) => item.id === task.id ? updated : item));
      setSelectedTask((current) => current?.id === task.id ? updated : current);
      setTransitionOptions((current) => { const next = { ...current }; delete next[task.id]; return next; });
      await unifiedQuery.refetch();
      addToast('success', '任务状态已更新', `已进入“${updated.status}”`);
    } catch (error) {
      addToast('error', '任务状态更新失败', error instanceof Error ? error.message : '请刷新后重试');
      throw error;
    } finally {
      setTransitionLoadingId((current) => current === task.id ? '' : current);
    }
  };

  const requestTaskTransition = (task: RequirementTask, statusKey: string) => {
    const options = transitionOptions[task.id];
    if (!options || statusKey === task.statusKey) return;
    const action = options.actions.find((item) => item.to === statusKey && item.allowed);
    if (!action) { addToast('warning', '当前状态不能直接切换到所选状态'); return; }
    if (options.statuses.find((item) => item.key === statusKey)?.name === '已完成') {
      openTaskCompletionDialog((hours, reason, review) => performTaskTransition(task, action, options.revision, reason, hours, review), action.requiredFields.includes('reason'));
      return;
    }
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
    void performTaskTransition(task, action, options.revision).catch(() => undefined);
  };

  const taskStatusControl = (task: RequirementTask, fullWidth = false, disabled = false) => {
    if (isBusinessTask) {
      const pending = isDeliveryReview && isCompletionPending(task);
      return <Select disabled={disabled || pending} aria-label={`${task.title}状态`} variant={fullWidth ? 'outlined' : 'borderless'} style={{ width: fullWidth ? '100%' : 120 }} value={pending ? '处理中' : task.status} options={BUSINESS_TASK_STATUSES.map((status) => ({ label: status, value: status }))} onChange={(status) => {
        if (status === task.status) return;
        if (status === '已完成') {
          openTaskCompletionDialog(async (actualHours, _reason, completionReview) => {
            if (!await updateTask(task.id, { status: '已完成', actualHours, completionReview })) throw new Error('保存失败，请重试');
          }, false, isDeliveryReview && needsCompletionApproval(task));
        } else void updateTask(task.id, { status });
      }} />;
    }
    if (!unifiedCategory || !task.productLineId) {
      return <Select disabled={disabled} aria-label={`${task.title}状态`} variant={fullWidth ? 'outlined' : 'borderless'} style={{ width: fullWidth ? '100%' : 120 }} popupMatchSelectWidth={160} showSearch optionFilterProp="label" value={task.status} options={STAGES.map((status, index) => ({ label: status, value: status, disabled: index < STAGES.indexOf(task.status) }))} onChange={(status) => { if (status === '已完成') openTaskCompletionDialog(async (actualHours, _reason, completionReview) => { if (!await updateTask(task.id, { status, actualHours, completionReview })) throw new Error('保存失败，请重试'); setSelectedTask((current) => current?.id === task.id ? { ...current, status, actualHours } : current); }); else void updateTask(task.id, { status }); }} />;
    }
    const options = transitionOptions[task.id];
    const statuses = options?.statuses?.length ? options.statuses : [{ key: task.statusKey || 'current', name: task.status, color: task.statusColor || 'neutral', current: true, allowed: true, reasons: [] }];
    return <Select
      aria-label={`${task.title}状态`}
      variant={fullWidth ? 'outlined' : 'borderless'}
      style={{ width: fullWidth ? '100%' : 120 }}
      popupMatchSelectWidth={180}
      showSearch
      disabled={disabled}
      optionFilterProp="label"
      value={options?.statuses.find((status) => status.current)?.key || task.statusKey || 'current'}
      loading={transitionLoadingId === task.id}
      options={statuses.map((status) => ({ label: status.name, value: status.key, disabled: !status.current && !status.allowed, title: status.reasons.join('；') }))}
      onFocus={() => { void loadTransitionOptions(task); }}
      onOpenChange={(open) => { if (open) void loadTransitionOptions(task, true); }}
      onChange={(statusKey) => requestTaskTransition(task, statusKey)}
    />;
  };

  const copyTask = async (task: RequirementTask) => {
    if (isBusinessTask) {
      try {
        await productRepository.createBusinessTask(taskKind, { ...task, title: `${task.title} - 副本`, status: '待处理', actualHours: 0, relatedTaskIds: [], sourceWorkOrderIds: [] });
        if (isCommercialTask) await commercialTasksQuery.refetch(); else setBusinessTasks((await productRepository.businessTasks(taskKind)).items);
        addToast('success', '任务已复制');
      } catch (error) { addToast('error', '复制任务失败', error instanceof Error ? error.message : '请稍后重试'); }
      return;
    }
    const category = ['requirement', 'design', 'dev', 'test', 'bug'].includes(String(task.category)) ? task.category as 'requirement' | 'design' | 'dev' | 'test' | 'bug' : unifiedCategory;
    if (!task.productLineId || !task.workItemTypeId || !category) { addToast('warning', '该任务尚未绑定产品子类型，无法复制'); return; }
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
        actualHours: 0
      });
      await unifiedQuery.refetch();
      addToast('success', '任务已复制');
    } catch (error) { addToast('error', '复制任务失败', error instanceof Error ? error.message : '请稍后重试'); }
  };

  const refreshTaskLists = async () => {
    await Promise.all([...(isCommercialTask ? [commercialTasksQuery.refetch()] : isBusinessTask ? [productRepository.businessTasks(taskKind).then(result => setBusinessTasks(result.items))] : [unifiedQuery.refetch()]), ...['requirements', 'design-tasks', 'product-dev-tasks', 'product-bugs', 'product-recycle-bin'].map((key) => queryClient.invalidateQueries({ queryKey: [key] }))]);
  };

  const deleteTask = (task: RequirementTask) => {
    if (!isBusinessTask && (!task.productLineId || task.revision == null)) { addToast('warning', '该任务不是统一工作项，暂不能从此处归档'); return; }
    Modal.confirm({
      title: `归档任务“${task.title}”？`,
      content: '归档后任务将从当前列表移除，可在系统与组织的产研模板中恢复。',
      okText: '归档', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          if (isBusinessTask) await productRepository.archiveBusinessTask(taskKind, task.id);
          else await productRepository.deleteWorkItem(task.productLineId!, task.id, task.revision!);
          if (selectedTask?.id === task.id) setSelectedTask(null);
          await refreshTaskLists();
          addToast('success', '任务已归档');
        } catch (error) { addToast('error', '任务归档失败', error instanceof Error ? error.message : '请稍后重试'); }
      }
    });
  };

  const operationMenu = (task: RequirementTask) => ({
    items: [
      { key: 'copy', icon: <CopyOutlined />, label: '复制任务' },
      { type: 'divider' as const },
      { key: 'delete', icon: <DeleteOutlined />, danger: true, label: '归档' }
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'copy') void copyTask(task);
      if (key === 'delete') deleteTask(task);
    }
  });

  const uniqueValues = (values: Array<string | undefined>) => Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  const designTaskTypeOf = (task: RequirementTask): DesignTaskVariant => {
    if (task.designVariant) return task.designVariant;
    const typeName = task.requirementType || '';
    if (typeName.includes('其他')) return 'other';
    if (typeName.includes('物料') || typeName.includes('项目')) return 'project';
    return 'product';
  };
  const designSourceOwnershipValue = (task: RequirementTask, variant = designTaskTypeOf(task)) => {
    if (variant === 'product') {
      const linkedVersion = versions.find((version) => version.id === task.versionId);
      return [syncDesignProductNames([task], productLines)[0].productLineName, linkedVersion?.code || task.versionName || '未关联'].filter(Boolean).join(' / ') || '未设置';
    }
    if (variant === 'project') return task.designProjectName || (task as RequirementTask & { projectName?: string }).projectName || task.productLineName || '未设置';
    return task.designSourceDepartment || task.department || '未设置';
  };
  const designOwnershipLabel = '来源归属';
  const creatorOptions = uniqueValues(requirementTasks.map((task) => task.creatorName || currentUser.name));
  const statusFilterOptions = Array.from(new Set([...(isBusinessTask ? BUSINESS_TASK_STATUSES : filterStatusesQuery.data?.length ? filterStatusesQuery.data : BUSINESS_TASK_STATUSES), ...activeTasks.map(task => task.status)])).filter(status => status !== '待审核');
  const projectFilterOptions = uniqueValues([...projectOptions.map(project => project.name), ...activeTasks.map(task => task.projectName || task.designProjectName)]);
  const versionOptions = uniqueValues(requirementTasks.map((task) => taskKind === 'design' ? designSourceOwnershipValue(task) : task.versionName));
  const ccOptions = uniqueValues(requirementTasks.flatMap((task) => task.ccNames || []));
  const groupOptions: Array<[RequirementGroupKey, string]> = [
    ['priority', '优先级'],
    ['status', '状态'],
    ['owner', '负责人'],
    ['creator', '创建者'],
    ['version', taskKind === 'design' ? designOwnershipLabel : '迭代版本'],
    ['project', '关联项目'],
    ['requirementType', '类型']
  ];
  const categoryMatch = (task: RequirementTask, tab: typeof activeTab) => {
    if (tab === 'all') return true;
    if (tab === 'my_verification') return isPendingVerification(task, currentUser);
    if (tab === 'my_pending_review') return isCompletionPending(task);
    if (isCommercialTask && tab !== 'my_participated') return matchesBusinessTaskScope(task, tab as 'my_owned' | 'my_created' | 'my_department', currentUser, employeeOptions);
    if (tab === 'my_owned') return task.ownerName.trim() === currentUser.name.trim();
    if (tab === 'my_created') return (task.creatorName || '').trim() === currentUser.name.trim();
    if (tab === 'my_department') return Boolean(currentUser.department) && (task.department || employeeOptions.find((employee) => employee.name === task.ownerName)?.department || task.departmentId || '').trim() === currentUser.department.trim();
    return (task.ccNames || []).some((name) => name.trim() === currentUser.name.trim());
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
    matchesMultiFilter([isCommercialTask ? task.creatorName : task.creatorName || currentUser.name], filters.creator) &&
    matchesMultiFilter([task.projectName || task.designProjectName || projectOptions.find(project => project.id === task.projectId)?.name], filters.project) &&
    matchesMultiFilter([taskKind === 'design' ? designSourceOwnershipValue(task) : task.versionName], filters.version) &&
    matchesDateFilter(task.createdAt, filters.createdAt) &&
    matchesDateFilter(task.plannedStartDate, filters.plannedStartDate) &&
    matchesMultiFilter(task.ccNames || [], filters.cc)
  );
  const designVariantTasks = taskKind === 'design' && designVariantFilter !== 'all' ? activeTasks.filter((task) => designTaskTypeOf(task) === designVariantFilter) : activeTasks;
  const designOwnershipTasks = taskKind === 'design' && designOwnershipFilter ? designVariantTasks.filter(task => designGroupOf(task).key === designOwnershipFilter) : designVariantTasks;
  const productLineTasks = productLineFilter === 'all' ? designOwnershipTasks : designOwnershipTasks.filter((task) => task.productLineId === productLineFilter || task.productLineName === selectedProductLine?.name);
  const baseTasks = remoteEnabled && !unifiedCategory && taskKind !== 'ops' && !isCommercialTask ? productLineTasks : productLineTasks.filter((task) => categoryMatch(task, activeTab));
  const filteredTasks = baseTasks.filter((task) => {
    if (remoteEnabled && !unifiedCategory && taskKind !== 'ops' && !isCommercialTask) return true;
    const titlePart = searchQuery.trim().toLocaleLowerCase();
    const titleMatch = textMatches(task.title, titlePart);
    const ownerMatch = searchOwnerNames.length === 0 || searchOwnerNames.includes(task.ownerName);
    return titleMatch && ownerMatch && matchesFilters(task, appliedFilters);
  });
  const tabCounts = {
    all: unifiedCategory ? productLineTasks.length : isCommercialTask || taskKind === 'ops' ? productLineTasks.length : remoteEnabled && activeTab === 'all' ? serverPageQuery.data?.total || 0 : productLineTasks.length,
    my_owned: unifiedCategory ? productLineTasks.filter((task) => categoryMatch(task, 'my_owned')).length : remoteEnabled && taskKind !== 'ops' && !isCommercialTask && activeTab === 'my_owned' ? serverPageQuery.data?.total || 0 : productLineTasks.filter((task) => categoryMatch(task, 'my_owned')).length,
    my_created: unifiedCategory ? productLineTasks.filter((task) => categoryMatch(task, 'my_created')).length : remoteEnabled && taskKind !== 'ops' && !isCommercialTask && activeTab === 'my_created' ? serverPageQuery.data?.total || 0 : productLineTasks.filter((task) => categoryMatch(task, 'my_created')).length,
    my_participated: unifiedCategory ? productLineTasks.filter((task) => categoryMatch(task, 'my_participated')).length : remoteEnabled && activeTab === 'my_participated' ? serverPageQuery.data?.total || 0 : productLineTasks.filter((task) => categoryMatch(task, 'my_participated')).length,
    my_department: unifiedCategory ? productLineTasks.filter((task) => categoryMatch(task, 'my_department')).length : productLineTasks.filter((task) => categoryMatch(task, 'my_department')).length,
    my_verification: productLineTasks.filter(task => categoryMatch(task, 'my_verification')).length,
    my_pending_review: productLineTasks.filter((task) => categoryMatch(task, 'my_pending_review')).length
  };
  const getGroupValue = (task: RequirementTask) => {
    switch (groupBy) {
      case 'priority': return normalizePriority(task.priority) || '未设置';
      case 'status': return task.status || '未设置';
      case 'owner': return task.ownerName || '未设置';
      case 'creator': return task.creatorName || currentUser.name;
      case 'version': return taskKind === 'design' ? designSourceOwnershipValue(task) : task.versionName || '未关联';
      case 'project': return task.projectName || task.designProjectName || projectOptions.find(project => project.id === task.projectId)?.name || '未关联';
      case 'requirementType': return designTypeLabel(task.requirementType || '未设置');
      default: return '';
    }
  };
  const rootTasks = [...filteredTasks].sort(newestCreatedFirst);
  const localGroupTabs: Array<[string, number]> = groupBy === 'none' ? [] : Array.from(rootTasks.reduce((groups, task) => {
    const label = getGroupValue(task);
    groups.set(label, (groups.get(label) || 0) + 1);
    return groups;
  }, new Map<string, number>()).entries());
  const groupTabs: Array<[string, number]> = remoteEnabled && !unifiedCategory && taskKind !== 'ops' && !isCommercialTask
    ? (serverPageQuery.data?.groups || []).map((group): [string, number] => [group.label, Number(group.count)])
    : localGroupTabs;
  const groupValueExists = groupTabs.some(([label]) => label === groupValue);
  const firstGroupValue = groupTabs[0]?.[0] || '';
  const effectiveGroupValue = groupBy === 'none' ? '' : groupValueExists ? groupValue : firstGroupValue;
  const visibleTasks = (remoteEnabled && !unifiedCategory && taskKind !== 'ops' && !isCommercialTask) || groupBy === 'none' ? rootTasks : rootTasks.filter((task) => getGroupValue(task) === effectiveGroupValue);
  const pagedTasks = remoteEnabled && unifiedCategory
    ? visibleTasks.slice((page - 1) * pageSize, page * pageSize)
    : remoteEnabled && taskKind !== 'ops' && !isCommercialTask ? visibleTasks : visibleTasks.slice((page - 1) * pageSize, page * pageSize);
  const paginationTotal = taskKind === 'ops' || isCommercialTask ? visibleTasks.length : unifiedCategory && remoteEnabled ? visibleTasks.length : remoteEnabled ? serverPageQuery.data?.total || 0 : visibleTasks.length;

  useEffect(() => { if (isCommercialTask && page > Math.max(1, Math.ceil(paginationTotal / pageSize))) setPage(Math.max(1, Math.ceil(paginationTotal / pageSize))); }, [isCommercialTask, page, pageSize, paginationTotal]);
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
    appliedFilters.project.values.length > 0,
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
    appliedFilters.project.values.length > 0 && { key: 'project', text: `关联项目 ${operatorText(appliedFilters.project.operator)} ${appliedFilters.project.values.join('、')}` },
    appliedFilters.version.values.length > 0 && { key: 'version', text: `${taskKind === 'design' ? designOwnershipLabel : '迭代版本'} ${operatorText(appliedFilters.version.operator)} ${appliedFilters.version.values.join('、')}` },
    (appliedFilters.createdAt.from || appliedFilters.createdAt.to) && { key: 'createdAt', text: `创建时间 ${dateOperatorText(appliedFilters.createdAt.operator)} ${appliedFilters.createdAt.from}${appliedFilters.createdAt.to ? ` 至 ${appliedFilters.createdAt.to}` : ''}` },
    (appliedFilters.plannedStartDate.from || appliedFilters.plannedStartDate.to) && { key: 'plannedStartDate', text: `计划开始时间 ${dateOperatorText(appliedFilters.plannedStartDate.operator)} ${appliedFilters.plannedStartDate.from}${appliedFilters.plannedStartDate.to ? ` 至 ${appliedFilters.plannedStartDate.to}` : ''}` },
    appliedFilters.cc.values.length > 0 && { key: 'cc', text: `参与人 ${operatorText(appliedFilters.cc.operator)} ${appliedFilters.cc.values.join('、')}` }
  ].filter(Boolean) as Array<{ key: keyof RequirementFilterState; text: string }>;
  const groupLabel = groupOptions.find(([key]) => key === groupBy)?.[1];
  const hasSearch = Boolean(searchQuery || searchOwnerNames.length);
  const setFilterDate = (field: 'createdAt' | 'plannedStartDate', part: 'from' | 'to', value: string) => {
    setFilterDraft((current) => ({ ...current, [field]: { ...current[field], [part]: value } }));
  };
  const setMultiFilter = (field: 'status' | 'owner' | 'creator' | 'project' | 'version' | 'cc', value: MultiFilterValue) => {
    setFilterDraft((current) => ({ ...current, [field]: value }));
  };
  const removeAppliedFilter = (field: keyof RequirementFilterState) => {
    const emptyFilters = createEmptyRequirementFilters();
    setAppliedFilters((current) => ({ ...current, [field]: emptyFilters[field] } as RequirementFilterState));
  };
  const multiFilterRow = (label: string, field: 'status' | 'owner' | 'creator' | 'project' | 'version' | 'cc', options: string[]) => {
    const value = filterDraft[field];
    return <div className="filter-row grid h-8 grid-cols-[96px_88px_minmax(0,1fr)] items-center rounded-md border border-[var(--border-main)] bg-[var(--bg-card)]">
      <div className="filter-label flex h-full items-center px-3 font-medium text-[var(--text-body)]">{label}</div>
      <div className="filter-operator flex h-full items-center border-x border-[var(--border-main)]">
        <Select aria-label={`${label}过滤方式`} variant="borderless" value={value.operator} onChange={(operator) => setMultiFilter(field, { ...value, operator })} className="w-full" options={[{ label: '包含', value: 'include' }, { label: '不包含', value: 'exclude' }]} />
      </div>
      <div className="filter-value px-2"><Select loading={field === 'status' && filterStatusesQuery.isFetching} aria-label={label} variant="borderless" mode="multiple" allowClear showSearch optionFilterProp="label" value={value.values} onChange={(values) => setMultiFilter(field, { ...value, values })} options={options.map((option) => ({ label: option, value: option }))} placeholder="请选择或输入关键字查询" className="w-full" /></div>
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

  const reviewCompletion = async (task: RequirementTask, action: 'approve' | 'reject') => {
    if (reviewInFlight.current.has(task.id)) return;
    reviewInFlight.current.add(task.id);
    setReviewBusyId(task.id);
    try {
      const result = await productRepository.reviewBusinessTask(task.id, action);
      const saved: RequirementTask = result || { ...task, status: action === 'approve' ? '已完成' : '处理中', completionApproval: action === 'approve' ? 'approved' : 'rejected' };
      setSelectedTask(current => current?.id === task.id ? saved : current);
      queryClient.setQueryData<RequirementTask[]>(['business-task-list', 'delivery'], tasks => tasks?.map(item => item.id === task.id ? saved : item));
      await queryClient.invalidateQueries({ queryKey: ['business-task-list', 'delivery'] });
      await queryClient.invalidateQueries({ queryKey: ['task-activities', 'delivery'] });
      addToast('success', action === 'approve' ? '审核已通过，任务已完成' : '已拒绝完成申请，任务保持处理中');
    } catch (error) {
      addToast('error', '审核失败', error instanceof Error ? error.message : '请重试');
    } finally {
      reviewInFlight.current.delete(task.id);
      setReviewBusyId('');
    }
  };

  const renderTaskRows = (task: RequirementTask): React.ReactNode => {
    const linkedVersion = versions.find((version) => version.id === task.versionId);
    const designTaskType = taskKind === 'design' ? designTaskTypeOf(task) : undefined;
    const source = isCommercialTask ? businessTaskSource(task, taskKind, { projects, opportunities, biddings, customers }) : undefined;
    const productVersion = source ? source.ownership : taskKind === 'design' ? designSourceOwnershipValue(task, designTaskType) : [task.productLineName, linkedVersion?.code || (task.versionId ? '版本号未设置' : '未关联')].filter(Boolean).join(' / ');
    return <React.Fragment key={task.id}>
      <tr className="transition-colors hover:bg-[var(--bg-surface-soft)]">
        <td className="max-w-[360px] px-4 py-3.5 font-semibold text-[var(--text-primary)]">
          <div className="flex min-w-0 items-center gap-2">
            <Checkbox aria-label={`选择${task.title}`} checked={batchIds.includes(task.id)} onChange={(event) => setBatchIds((ids) => event.target.checked ? [...ids, task.id] : ids.filter((id) => id !== task.id))} />
            <Tooltip title={workItemCategoryLabel[String(task.category)] || '任务'}>
              <span className="work-item-category-icon" aria-label={workItemCategoryLabel[String(task.category)] || '任务'}><WorkItemCategoryIcon category={String(task.category)} /></span>
            </Tooltip>
            <button type="button" onClick={() => setSelectedTask(task)} className="min-w-0 truncate text-left text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]" title={task.title}>{task.title}</button>
          </div>
        </td>
        <td className="whitespace-nowrap px-4 py-3.5">
          {taskStatusControl(task)}
        </td>
        {taskKind === 'design' && <td className="whitespace-nowrap px-4 py-3.5 text-[var(--text-body)]">{({ product: '产品设计', project: '项目设计', other: '其他设计' } as Record<DesignTaskVariant, string>)[designTaskType || 'product']}</td>}
        {(isCommercialTask || listFields.visible('priority')) && <td className="whitespace-nowrap px-4 py-3.5"><StatusTag status={normalizePriority(task.priority)} /></td>}{taskKind === 'ops' && <td className="whitespace-nowrap px-4 py-3.5 text-[var(--text-body)]">{task.projectName || '未关联'}</td>}
        {(isCommercialTask || taskKind === 'design' || (taskKind !== 'ops' && listFields.visible('version'))) && <td className="px-4 py-3.5 text-[var(--text-body)]"><span className="block truncate whitespace-nowrap text-[var(--primary)]" title={productVersion}>{productVersion}</span></td>}
        {taskKind === 'delivery' && <td className="px-4 py-3.5 text-[var(--text-body)]"><span className="block truncate" title={source?.stage}>{source?.stage}</span></td>}
        {(isCommercialTask || listFields.visible('assignee')) && <td className="whitespace-nowrap px-4 py-3.5 text-[var(--text-muted)]">
          <div className="work-item-owner-cell">
            <Select disabled={isDeliveryReview && isCompletionPending(task)} aria-label={`${task.title}负责人`} variant="borderless" className="work-item-owner-select" style={{ width: 180 }} popupMatchSelectWidth={220} showSearch optionFilterProp="label" value={task.ownerName || undefined} labelRender={({ value }) => <PersonIdentity name={String(value)} variant="list" />} placeholder="未设置" options={employeeNameOptions} onChange={(ownerName) => void updateTask(task.id, { ownerName })} />
          </div>
        </td>}
        {(isCommercialTask || listFields.visible('creator')) && <td className="whitespace-nowrap px-4 py-3.5 text-[var(--text-muted)]"><PersonIdentity name={isCommercialTask ? task.creatorName : task.creatorName || currentUser.name} emptyLabel="未设置" variant="list" /></td>}
        {(isCommercialTask || listFields.visible('createdAt')) && <td className="whitespace-nowrap px-4 py-3.5 font-mono text-[var(--text-muted)]">{task.createdAt ? dayjs(task.createdAt).format('YYYY-MM-DD') : '—'}</td>}
        <td className="task-list-action-cell whitespace-nowrap px-4 py-3.5 text-right">
          {isDeliveryReview && activeTab === 'my_pending_review' ? <div className="inline-flex gap-2">
            <Button aria-label="通过" type="link" disabled={!canReviewCompletion(task, currentUser) || Boolean(reviewBusyId)} loading={reviewBusyId === task.id} onClick={() => void reviewCompletion(task, 'approve')}>通过</Button>
            <Button aria-label="拒绝" type="link" danger disabled={!canReviewCompletion(task, currentUser) || Boolean(reviewBusyId)} onClick={() => void reviewCompletion(task, 'reject')}>拒绝</Button>
          </div> : <Dropdown menu={operationMenu(task)} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} aria-label={`操作${task.title}`} />
          </Dropdown>}
        </td>
      </tr>
    </React.Fragment>;
  };

  return (
    <div className="task-page space-y-6 animate-in fade-in duration-150">
      {!creationContext && !initialDetail && <div>
      {/* Tabs + Search + Filter + Group */}
      <div ref={controlsRef} className="task-page-toolbar bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* 分类 */}
          <div role="tablist" aria-label={`${itemLabel}范围`} className="requirement-scope-tabs inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-1">
            {(productTaskScope ? [...(taskKind === 'bug' ? [['my_owned', '我负责的'], ['my_created', '我创建的'], ['my_verification', '待我验证的'], ['my_department', '我部门的'], ['all', '全公司的']] as const : BUSINESS_TASK_SCOPES), ...(isDeliveryReview ? [['my_pending_review', '待审核']] as const : [])] : [['all', '全部'], ['my_owned', '我负责的'], ['my_created', '我创建的'], ['my_participated', '我参与的']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={!showProductTasks && activeTab === value} onClick={() => { setShowProductTasks(false); setActiveTab(value); }} className="requirement-scope-tab h-8 rounded-md px-4 text-xs font-semibold whitespace-nowrap">{label}·{isCommercialTask && !commercialTasksQuery.data ? '—' : tabCounts[value]}</button>)}
            {(taskKind === 'dev' || taskKind === 'test' || taskKind === 'design') && <button type="button" role="tab" aria-selected={showProductTasks} onClick={() => { setShowProductTasks(true); setFilterOpen(false); setGroupOpen(false); setSearchOpen(false); }} className="requirement-scope-tab h-8 rounded-md px-4 text-xs font-semibold whitespace-nowrap">待分配任务·{productTasksQuery.data?.length || 0}</button>}
          </div>

          {!showProductTasks && <div className="flex items-center gap-2">
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
                content={<WorkItemGroupMenu query={groupQuery} groupBy={groupBy} options={groupOptions} onQueryChange={setGroupQuery} onSelect={(key) => { setGroupBy(key as RequirementGroupKey); setGroupValue(''); setGroupOpen(false); }} />}
              >
                <Button type="text" aria-label="分组" aria-pressed={groupOpen} icon={<List className="h-4 w-4" />} />
              </Popover>
              {searchOpen && searchOwnerPickerOpen && <div className="absolute left-0 top-11 z-40 w-[min(88vw,300px)]"><Select aria-label="搜索负责人" mode="multiple" autoFocus open={searchOwnerPickerOpen} onDropdownVisibleChange={setSearchOwnerPickerOpen} showSearch allowClear optionFilterProp="label" value={searchOwnerNames} onChange={setSearchOwnerNames} options={employeeNameOptions} placeholder="搜索负责人或职位" className="w-full" /></div>}
            </div>
            {taskKind === 'design' ? <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'product', label: '产品设计' },
                  { key: 'project', label: '项目设计' },
                  { key: 'other', label: '其他设计' }
                ],
                onClick: ({ key }) => {
                  const variant = key as DesignTaskVariant;
                  onDesignVariantChange?.(variant);
                  window.setTimeout(() => openAddModal(variant), 0);
                }
              }}
            ><Button type="primary" id="btn-add-req-task" icon={<Plus className="h-3.5 w-3.5" />}>新建设计任务</Button></Dropdown> : <Button type="primary" id="btn-add-req-task" onClick={openAddModal} icon={<Plus className="h-3.5 w-3.5" />}>新建</Button>}
          </div>}
        </div>
        {filterOpen && <div className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-4">
          <div className="grid gap-2 overflow-visible lg:grid-cols-2">
            <div className="filter-row grid h-8 grid-cols-[96px_minmax(0,1fr)] items-center rounded-md border border-[var(--border-main)] bg-[var(--bg-card)]">
              <div className="filter-label flex h-full items-center px-3 font-medium text-[var(--text-body)]">标题</div>
              <div className="filter-value flex h-full items-center border-l border-[var(--border-main)] px-2"><Input aria-label="标题过滤值" variant="borderless" value={filterDraft.title.value} onChange={(event) => setFilterDraft((current) => ({ ...current, title: { ...current.title, value: event.target.value } }))} placeholder="请输入标题关键词" /></div>
            </div>
            {multiFilterRow('状态', 'status', statusFilterOptions)}
            {multiFilterRow('负责人', 'owner', employees)}
            {multiFilterRow('创建人', 'creator', creatorOptions)}
            {multiFilterRow('关联项目', 'project', projectFilterOptions)}
            {multiFilterRow(taskKind === 'design' ? designOwnershipLabel : '迭代版本', 'version', versionOptions)}
            {dateFilterRow('创建时间', 'createdAt')}
            {dateFilterRow('计划开始时间', 'plannedStartDate')}
            {multiFilterRow('参与人', 'cc', ccOptions)}
          </div>
          {filterStatusesQuery.isError && <div role="alert" className="mt-3 flex items-center gap-2 text-xs text-[var(--danger)]">状态选项加载失败，当前仅展示已有任务状态<Button size="small" onClick={() => void filterStatusesQuery.refetch()}>重试</Button></div>}
          <div className="mt-3 flex justify-end gap-2"><Button onClick={clearFilters}>清空</Button><Button type="primary" onClick={() => { setAppliedFilters(filterDraft); setFilterOpen(false); }}>应用过滤</Button></div>
        </div>}
        {!showProductTasks && (hasSearch || activeFilterCount > 0) && <div className="flex min-h-11 flex-wrap items-center gap-2 border-b border-[var(--border-main)] px-1 py-2 text-[11px]">
          {hasSearch && <span className="group/tag inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">搜索：{searchQuery || '负责人'}{searchOwnerNames.length ? ` · ${searchOwnerNames.join('、')}` : ''}<button type="button" aria-label="清除搜索" onClick={() => { setSearchDraft(''); setSearchQuery(''); setSearchOwnerNames([]); }} className="opacity-0 transition-opacity group-hover/tag:opacity-100"><X className="h-3 w-3" /></button></span>}
          {appliedFilterLabels.map(({ key, text }) => <span key={key} className="group/tag inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">{text}<button type="button" aria-label={`删除${text}`} onClick={() => removeAppliedFilter(key)} className="opacity-0 transition-opacity group-hover/tag:opacity-100"><X className="h-3 w-3" /></button></span>)}
          {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="text-blue-600 hover:text-blue-700">清空过滤条件</button>}
        </div>}
        {!showProductTasks && groupBy !== 'none' && <div className="flex min-h-11 flex-wrap items-center gap-4 border-b border-[var(--border-main)] px-1 py-2 text-xs">
          <span className="font-medium text-[var(--text-body)]">按{groupLabel}分组：</span>
          {groupTabs.map(([label, count]) => <button key={label} type="button" onClick={() => setGroupValue(label)} className={`border-b-2 px-1 py-1 transition-colors ${effectiveGroupValue === label ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{label}<span className="ml-1 text-[var(--active-text)]">{count}</span></button>)}
          <button type="button" onClick={() => { setGroupBy('none'); setGroupValue(''); }} className="text-[var(--active-text)] hover:text-[var(--primary-hover)]">取消分组</button>
        </div>}
      </div>

      {/* Requirement List Table (列表信息: 标题、状态、优先级、负责人、创建人、添加时间) */}
      {showProductTasks ? <ProductTaskAllocationView kind={allocationKind} items={productTasksQuery.data || []} designExtras={designExtras} productOptions={productLines.map((line) => ({ label: line.name, value: line.name }))} loading={productTasksQuery.isPending} error={productTasksQuery.isError} onRetry={() => void productTasksQuery.refetch()} onOpen={openProductTask} onCreate={createAllocatedTask}  /> : <div className="task-page-table bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <WorkItemBatchBar targets={activeTasks.filter((task) => batchIds.includes(task.id)).map((task) => ({ id: task.id, category: String(task.category || unifiedCategory), productLineId: task.productLineId, revision: task.revision }))} versions={versions.map((version) => ({ value: version.id, label: version.name, productLineId: version.productLineId || productLines.find((line) => line.name === version.productLineName)?.id }))} employees={employeeNameOptions} onCancel={() => setBatchIds([])} onComplete={refreshTaskLists} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1440px] text-left border-collapse text-xs">
              <colgroup>
                <col className="w-[420px]" />
                <col className="w-[150px]" />
                {taskKind === 'design' && <col className="w-[120px]" />}
                <col className="w-[112px]" />
                <col className="w-[220px]" />
                {taskKind === 'delivery' && <col className="w-[150px]" />}
                <col className="w-[210px]" />
                <col className="w-[210px]" />
                <col className="w-[150px]" />
                <col className="w-[88px]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <th className="py-3 px-4"><span className="inline-flex items-center gap-3"><Checkbox aria-label="全选当前页工作项" checked={pagedTasks.length > 0 && pagedTasks.every((task) => batchIds.includes(task.id))} indeterminate={pagedTasks.some((task) => batchIds.includes(task.id)) && !pagedTasks.every((task) => batchIds.includes(task.id))} onChange={(event) => setBatchIds(event.target.checked ? pagedTasks.map((task) => task.id) : [])} />标题</span></th>
                  <th className="whitespace-nowrap py-3 px-4">状态</th>
                  {taskKind === 'design' && <th className="whitespace-nowrap py-3 px-4">任务类型</th>}
                  {(isCommercialTask || listFields.visible('priority')) && <th className="whitespace-nowrap py-3 px-4">优先级</th>}{taskKind === 'ops' && <th className="whitespace-nowrap py-3 px-4">关联项目</th>}
                  {(isCommercialTask || taskKind === 'design' || (taskKind !== 'ops' && listFields.visible('version'))) && <th className="whitespace-nowrap py-3 px-4">{isCommercialTask || taskKind === 'design' ? designOwnershipLabel : '迭代版本'}</th>}
                  {taskKind === 'delivery' && <th className="whitespace-nowrap py-3 px-4">项目阶段</th>}
                  {(isCommercialTask || listFields.visible('assignee')) && <th className="whitespace-nowrap py-3 px-4">负责人</th>}
                  {(isCommercialTask || listFields.visible('creator')) && <th className="whitespace-nowrap py-3 px-4">创建人</th>}
                  {(isCommercialTask || listFields.visible('createdAt')) && <th className="whitespace-nowrap py-3 px-4">创建时间</th>}
                  <th className="whitespace-nowrap py-3 px-4 text-right task-list-action-cell task-list-action-header">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedTasks.map((task) => renderTaskRows(task))}
                {pagedTasks.length === 0 && <tr><td colSpan={taskKind === 'design' || taskKind === 'delivery' ? 9 : 8} className="px-4 py-12 text-center text-[var(--text-muted)]">{isCommercialTask ? <>{commercialTasksQuery.isPending ? '正在加载' + itemLabel + '...' : commercialTasksQuery.isError ? <span role="alert" className="inline-flex items-center gap-2">{itemLabel}加载失败<Button size="small" onClick={() => void commercialTasksQuery.refetch()}>重试</Button></span> : '没有符合当前搜索、过滤或分组条件的' + itemLabel}</> : unifiedCategory && remoteEnabled && unifiedQuery.isPending ? `正在加载${itemLabel}...` : unifiedCategory && remoteEnabled && unifiedQuery.isError ? <span className="inline-flex items-center gap-2">{itemLabel}加载失败<Button size="small" onClick={() => unifiedQuery.refetch()}>重试</Button></span> : serverPageQuery.isPending && remoteEnabled && !unifiedCategory ? `正在加载${itemLabel}...` : serverPageQuery.isError && remoteEnabled && !unifiedCategory ? <span className="inline-flex items-center gap-2">{itemLabel}加载失败<Button size="small" onClick={() => serverPageQuery.refetch()}>重试</Button></span> : `没有符合当前搜索、过滤或分组条件的${itemLabel === '需求任务' ? '需求' : itemLabel}`}</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination total={paginationTotal} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>}
      </div>}

      {productTaskDetail && <RequirementTasksView productLineFilter={productTaskDetail.productLineId} taskKind="requirement" initialDetail={productTaskDetail} onDetailClose={() => { setProductTaskDetail(null); void productTasksQuery.refetch(); }} />}

      {/* Task Detail Drawer */}
      {selectedTask && (
        <WorkItemCreatePanel
          isOpen={!!selectedTask}
          onClose={closeTaskDetail}
          title={<span className="flex min-w-0 items-center gap-2"><WorkItemCategoryIcon category={String(selectedTask.category || taskKind || 'requirement')} className="text-[var(--primary)]" /><span>任务编号</span><span className="truncate font-mono text-xs">{selectedTask.code || selectedTask.id}</span><DetailCopyButton label="复制任务编号" onCopy={() => copyTaskValue(false)} /></span>}
          headerActions={<><DetailCopyButton label="复制详情链接" link onCopy={() => copyTaskValue(true)} /><Dropdown menu={operationMenu(selectedTask)} trigger={['click']}><Button type="text" icon={<MoreOutlined />} aria-label={`操作${selectedTask.title}`} /></Dropdown></>}
          detailHeader={detailVisible('title') ? <WorkItemDetailHeader title={selectedTask.title} titleEditable={detailEditable('title')} creatorName={selectedTask.creatorName || currentUser.name} createdAt={selectedTask.createdAt} updaterName={(selectedTask as RequirementTask & { updaterName?: string }).updaterName || selectedTask.creatorName || currentUser.name} updatedAt={(selectedTask as RequirementTask & { updatedAt?: string }).updatedAt || selectedTask.createdAt} onTitleSave={(title) => { void saveDetailUpdates({ title }).then((saved) => saved && addToast('success', '标题修改成功', '')); }} /> : undefined}
          presentation="drawer"
          showContinueOption={false}
          footer={
            <>
              <button
                type="button"
                onClick={closeTaskDetail}
                className="h-10 rounded-lg border border-[var(--border-main)] px-4 text-xs font-semibold text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]"
              >
                关闭
              </button>
            </>
          }
          properties={<div className="space-y-6 text-xs">
            <Form layout="horizontal" labelCol={{ flex: '112px' }} wrapperCol={{ flex: 1 }} labelAlign="left" className="requirement-create-properties requirement-detail-properties" style={{ display: 'flex', flexDirection: 'column' }}>
              {detailVisible('productLine') && <Form.Item style={{ order: detailFields.order('productLine') }} label="关联产品"><Select disabled={!detailEditable('productLine')} showSearch optionFilterProp="label" value={selectedTask.productLineName || undefined} options={productLines.map((line) => ({ label: line.name, value: line.name }))} onChange={(productLineName) => void saveDetailUpdates({ productLineName, productLineId: productLines.find((line) => line.name === productLineName)?.id, versionName: '' })} placeholder="未设置" /></Form.Item>}
              {detailVisible('status') && <Form.Item style={{ order: detailFields.order('status') }} label="当前状态">{taskStatusControl(selectedTask, true, !detailEditable('status'))}</Form.Item>}
              {detailVisible('taskType') && <Form.Item style={{ order: detailFields.order('taskType') }} label={detailCategory === 'bug' ? '缺陷类型' : '任务类型'}>{detailCategory === 'bug' ? <Select value={['系统缺陷', '样式缺陷', '线上故障', '安全漏洞'].includes(selectedTask.requirementType || '') ? selectedTask.requirementType : '系统缺陷'} options={['系统缺陷', '样式缺陷', '线上故障', '安全漏洞'].map(value => ({ value, label: value }))} onChange={requirementType => void saveDetailUpdates({ requirementType })}/> : <Input value={taskKind === 'design' ? designVariantMeta[detailVariant].label : detailWorkItemTypes.find((item) => item.id === selectedTask.workItemTypeId)?.name || selectedTask.requirementType || '未设置'} readOnly />}</Form.Item>}
              {taskKind === 'requirement' && detailVisible('needsCollaboration') && <Form.Item style={{ order: detailFields.order('needsCollaboration') }} label="需要协同"><Checkbox.Group disabled value={selectedTask.needsCollaboration || []} options={[{ label: '设计', value: 'design' }, { label: '开发', value: 'dev' }, { label: '测试', value: 'test' }]} /></Form.Item>}
              {detailVisible('assignee') && <Form.Item style={{ order: detailFields.order('assignee') }} label="负责人"><Select disabled={!detailEditable('assignee') || (isDeliveryReview && isCompletionPending(selectedTask))} showSearch optionFilterProp="label" value={selectedTask.ownerName || undefined} onChange={(ownerName) => void saveDetailUpdates({ ownerName })} options={employeeNameOptions} placeholder="搜索姓名或职位" /></Form.Item>}
              {taskKind === 'bug' && <Form.Item style={{ order: detailFields.order('verifier') }} label="验证者"><Select showSearch optionFilterProp="label" disabled={!detailEditable('verifier')} value={selectedTask.verifierId || undefined} options={employeeOptions.map(employee => ({ value: employee.id, label: employee.name }))} onChange={verifierId => void saveDetailUpdates({ verifierId, verifierName: employeeOptions.find(employee => employee.id === verifierId)?.name || '' })} placeholder="请选择验证者" /></Form.Item>}
              {detailVisible('priority') && <Form.Item style={{ order: detailFields.order('priority') }} label="优先级"><Select disabled={!detailEditable('priority')} value={normalizePriority(selectedTask.priority)} options={['紧急', '高', '中', '低'].map((value) => ({ label: value, value }))} onChange={(priority) => void saveDetailUpdates({ priority: priority as RequirementTask['priority'] })} /></Form.Item>}
              {detailVisible('plannedStartDate') && <Form.Item style={{ order: detailFields.order('plannedStartDate') }} label="计划开始时间"><DatePicker disabled={!detailEditable('plannedStartDate')} value={selectedTask.plannedStartDate ? dayjs(selectedTask.plannedStartDate) : null} onChange={(date) => void saveDetailUpdates({ plannedStartDate: date ? date.format('YYYY-MM-DD') : '' })} className="w-full" placeholder="请选择日期" /></Form.Item>}
              {detailVisible('dueDate') && <Form.Item style={{ order: detailFields.order('dueDate') }} label="计划完成时间"><DatePicker disabled={!detailEditable('dueDate')} value={selectedTask.dueDate ? dayjs(selectedTask.dueDate) : null} onChange={(date) => void saveDetailUpdates({ dueDate: date ? date.format('YYYY-MM-DD') : '' })} className="w-full" placeholder="请选择日期" /></Form.Item>}
              {detailVisible('expectedCompleteDate') && <Form.Item style={{ order: detailFields.order('expectedCompleteDate') }} label="期望完成时间"><DatePicker disabled={!detailEditable('expectedCompleteDate')} value={selectedTask.expectedCompleteDate ? dayjs(selectedTask.expectedCompleteDate) : null} onChange={(date) => void saveDetailUpdates({ expectedCompleteDate: date ? date.format('YYYY-MM-DD') : '' })} className="w-full" placeholder="请选择日期" /></Form.Item>}
              {detailVisible('version') && <Form.Item style={{ order: detailFields.order('version') }} label="迭代版本"><Select disabled={!detailEditable('version')} showSearch allowClear optionFilterProp="label" value={selectedTask.versionId || undefined} options={taskVersionOptions(versions, productLines.find(line => line.id === selectedTask.productLineId) || productLines.find(line => line.name === selectedTask.productLineName)).map(v => ({ label: v.name, value: v.id }))} onChange={(versionId) => void saveDetailUpdates({ versionName: versions.find(v => v.id === versionId)?.name || '', versionId: versionId || '' })} placeholder="未设置" /></Form.Item>}
              {taskKind === 'presales' && detailVisible('source') && <Form.Item style={{ order: detailFields.order('source') }} label="关联商机/投标项"><span>{businessTaskSource(selectedTask, 'presales', { opportunities, biddings }).ownership}</span></Form.Item>}
              {isCommercialTask && detailVisible('customer') && <Form.Item style={{ order: detailFields.order('customer') }} label="关联客户"><Select disabled={!detailEditable('customer')} showSearch value={selectedTask.customerId || selectedTask.customerName || undefined} options={customers.map((item) => ({ label: item.name, value: item.id }))} onChange={(customerId) => void saveDetailUpdates({ customerId, customerName: customers.find((item) => item.id === customerId)?.name || '' })} placeholder="未关联" /></Form.Item>}
              {taskKind === 'design' && detailVisible('sourceDepartment') && <Form.Item style={{ order: detailFields.order('sourceDepartment') }} label="来源部门"><Select showSearch value={selectedTask.designSourceDepartment || selectedTask.department || undefined} options={Array.from(new Set([...employeeOptions.map((item) => item.department).filter(Boolean), selectedTask.designSourceDepartment || selectedTask.department || ''])).filter(Boolean).map((value) => ({ label: value, value }))} onChange={(designSourceDepartment) => void saveDetailUpdates({ designSourceDepartment })} /></Form.Item>}
              {detailVisible('project') && (taskKind === 'ops' || taskKind === 'delivery' || taskKind === 'design') && <Form.Item style={{ order: detailFields.order('project') }} label="关联项目"><Select disabled={!detailEditable('project')} showSearch allowClear optionFilterProp="label" value={selectedTask.projectId || projectOptions.find((project) => project.name === selectedTask.designProjectName)?.id || undefined} options={projectOptions.map((project) => ({ label: project.name, value: project.id }))} onChange={(projectId) => void saveDetailUpdates({ projectId: projectId || '', projectName: projectOptions.find((project) => project.id === projectId)?.name || '', ...(taskKind === 'design' ? { designProjectName: projectOptions.find((project) => project.id === projectId)?.name || '' } : {}) })} placeholder="未关联" /></Form.Item>}
              {detailVisible('participants') && <Form.Item style={{ order: detailFields.order('participants') }} label="参与人"><Select disabled={!detailEditable('participants')} mode="multiple" showSearch allowClear optionFilterProp="label" value={selectedTask.ccNames || []} options={employeeNameOptions} onChange={(ccNames) => void saveDetailUpdates({ ccNames })} placeholder="搜索姓名或职位" /></Form.Item>}
              {detailVisible('estimatedHours') && <Form.Item style={{ order: detailFields.order('estimatedHours') }} label="预计工时（小时）"><InputNumber disabled={!detailEditable('estimatedHours')} min={0} precision={2} value={detailEstimatedHours} onChange={setDetailEstimatedHours} onBlur={() => { const estimatedHours = detailEstimatedHours ?? 0; if (estimatedHours !== Number(selectedTask.estimatedHours || 0)) void saveDetailUpdates({ estimatedHours }); }} className="requirement-hours-input w-full" /></Form.Item>}
              {detailVisible('actualHours') && <Form.Item style={{ order: detailFields.order('actualHours') }} label="实际工时（小时）"><InputNumber readOnly min={0} precision={2} value={detailActualHours} className="requirement-hours-input w-full" /></Form.Item>}
            </Form>
            <section className="space-y-3 border-t border-[var(--border-main)] pt-4">
              <h3 className="font-semibold text-[var(--text-primary)]">附件</h3>
              {Array.isArray(selectedTask.media) && selectedTask.media.length ? selectedTask.media.map((item) => <a key={item.id} href={item.dataUrl} download={item.name} className="flex items-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2 text-[var(--text-body)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"><FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{item.name}</span></a>) : <p className="rounded-lg border border-dashed border-[var(--border-main)] px-3 py-3 text-center text-[var(--text-muted)]">暂无附件</p>}
            </section>
          </div>}
        >
          <div className="w-full space-y-5 text-xs">
            {renderDetail && taskKind !== 'test' && <section className="test-task-detail-extension">{renderDetail({ task: selectedTask, editing: true, onUpdate: saveDetailUpdates, employeeNames: employees, employeeOptions: resolvedEmployeeOptions, versions, statusControl: taskStatusControl(selectedTask, true) })}</section>}
            <div className="space-y-5">
              <div className="block text-[var(--text-muted)]">
                {detailVisible('description') && <div className="flex items-center justify-between gap-3"><span>任务描述</span>{detailEditable('description') && (detailEditing ? <span className="flex items-center gap-2"><Button size="small" onClick={() => { setDetailDescription(selectedTask.description || ''); setDetailDescriptionHtml(selectedTask.descriptionHtml || ''); setDetailEditing(false); }}>取消</Button><Button size="small" type="primary" onClick={() => void saveDetailUpdates({ description: detailDescription, descriptionHtml: detailDescriptionHtml }).then((saved) => { if (saved) { setDetailEditing(false); addToast('success', '描述修改成功', ''); } })}>保存</Button></span> : <Button size="small" type="text" onClick={() => setDetailEditing(true)}>编辑</Button>)}</div>}
                <div className="mt-1">
                  {detailEditing && detailVisible('description') ? <>
                    <RichTextEditor
                    key={`detail-${selectedTask.id}-${detailEditing ? 'edit' : 'readonly'}`}
                    readOnly={!detailEditing}
                    editor={detailDescriptionEditor}
                    value={detailDescription}
                    htmlValue={detailDescriptionHtml}
                    onInput={(text, html) => {
                      setDetailDescription(text);
                      setDetailDescriptionHtml(html);
                    }}
                    placeholder="详细记录需求背景、业务场景和实现说明..."
                    />
                  </> : detailVisible('description') ? <CollapsibleDescription value={detailDescription} emptyText="未填写任务描述" /> : null}
                </div>
              </div>
            </div>
            <section className="border-t border-[var(--border-main)] pt-4">
              <div className="mb-4 border-b border-[var(--border-main)] px-3 py-2">
                <div className="flex min-w-0 flex-wrap gap-x-6 border-b border-[var(--border-main)]">
                  {[
                    { label: `动态 · ${taskEvents.length}`, value: 'activity' as const },
                    ...relationTabOrder.map((code) => code === 'collaborationItems'
                      ? { label: `协同事项 · ${selectedTask.sourceWorkOrderIds?.length || (selectedTask.sourceType === 'WORK_ORDER' && selectedTask.requirementId ? 1 : 0)}`, value: 'collaborationItems' as const }
                      : code === 'relatedTasks' ? { label: `关联任务 · ${selectedTask.relatedTaskIds?.length || 0}`, value: 'relatedTasks' as const }
                      : code === 'testPlans' ? { label: `测试计划 · ${testTaskPlansQuery.isLoading ? '…' : (testTaskPlansQuery.data || []).length}`, value: 'testPlans' as const }
                      : code === 'support'
                          ? { label: '支撑项 · 0', value: 'support' as const }
                          : { label: '工时', value: 'hours' as const }),
                  ].map((item) => <button key={item.value} type="button" onClick={() => setDetailTab(item.value)} className={`relative min-h-10 px-1 pb-2 text-xs font-medium ${detailTab === item.value ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                    {item.label}
                    {detailTab === item.value && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[var(--primary)]" />}
                  </button>)}
                </div>
              </div>
              {detailTab === 'hours' ? (
                <div className="space-y-4">
                  {(() => {
                    const rows = [selectedTask as unknown as Record<string, unknown>];
                    const totalEstimated = rows.reduce((sum, item) => sum + Number(item.estimatedHours || 0), 0);
                    const totalActual = rows.reduce((sum, item) => sum + Number(item.actualHours ?? item.spentHours ?? 0), 0);
                    const byType = rows.reduce<Record<string, { estimated: number; actual: number }>>((result, item) => {
                      const key = String(item.category || item.type || '当前任务');
                      result[key] ||= { estimated: 0, actual: 0 };
                      result[key].estimated += Number(item.estimatedHours || 0);
                      result[key].actual += Number(item.actualHours ?? item.spentHours ?? 0);
                      return result;
                    }, {});
                    const byPerson = rows.reduce<Record<string, { estimated: number; actual: number }>>((result, item) => {
                      const key = String(item.assigneeName || item.ownerName || item.developer || '未分配');
                      result[key] ||= { estimated: 0, actual: 0 };
                      result[key].estimated += Number(item.estimatedHours || 0);
                      result[key].actual += Number(item.actualHours ?? item.spentHours ?? 0);
                      return result;
                    }, {});
                    return <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><DetailField label="任务数">{rows.length}</DetailField><DetailField label="预计工时">{totalEstimated} 小时</DetailField><DetailField label="实际工时">{totalActual} 小时</DetailField><DetailField label="剩余工时">{Math.max(0, totalEstimated - totalActual)} 小时</DetailField></div>
                      <div className="grid gap-4 md:grid-cols-2"><div><h4 className="mb-2 font-semibold text-[var(--text-primary)]">按类型统计</h4>{Object.entries(byType).map(([name, value]) => <div key={name} className="flex justify-between border-b border-[var(--border-main)] py-2"><span>{name}</span><span>{value.actual} / {value.estimated} 小时</span></div>)}</div><div><h4 className="mb-2 font-semibold text-[var(--text-primary)]">按人员统计</h4>{Object.entries(byPerson).map(([name, value]) => <div key={name} className="flex justify-between border-b border-[var(--border-main)] py-2"><span>{name}</span><span>{value.actual} / {value.estimated} 小时</span></div>)}</div></div>
                    </>;
                  })()}
                </div>
              ) : detailTab === 'relatedTasks' ? (
                <WorkOrderPicker relationMode={['design', 'dev', 'test'].includes(detailCategory) ? 'productTask' : 'workOrder'} disabled={!detailEditable('relatedTasks')} candidates={taskCandidates} selectedIds={selectedTask.relatedTaskIds || []} onChange={(ids) => void saveDetailUpdates({ relatedTaskIds: ids })} onNavigate={navigateWorkOrderCandidate} placeholder="请选择关联任务" />
              ) : detailTab === 'testPlans' && taskKind === 'test' ? (
                <section aria-label="关联测试计划" aria-busy={testTaskPlansQuery.isLoading} className="space-y-3">
                  <div className="flex justify-end">
                    <Button aria-label="新增关联测试计划" type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setSelectedTestPlanIds([]); setTestPlanSearch(''); setTestPlanAssociationError(''); setTestPlanPickerOpen(true); }}>新增</Button>
                  </div>
                  {testTaskPlansQuery.isLoading && <div role="status" className="flex items-center gap-2 py-4 text-xs text-[var(--text-muted)]"><Spin size="small" />测试计划加载中…</div>}
                  {testTaskPlansQuery.isError && <Alert type="error" showIcon title="测试计划加载失败" action={<Button size="small" onClick={() => void testTaskPlansQuery.refetch()}>重试</Button>} />}
                  {!testTaskPlansQuery.isLoading && !testTaskPlansQuery.isError && !testTaskPlansQuery.data?.length && <Empty description="暂无关联测试计划" />}
                  {!testTaskPlansQuery.isLoading && !testTaskPlansQuery.isError && Boolean(testTaskPlansQuery.data?.length) && <div className="space-y-2">{testTaskPlansQuery.data!.map((plan, index) => <article key={String(plan.id || `${selectedTask.id}-${index}`)} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-[var(--text-primary)]">{plan.name || '未命名计划'}</strong><Tag>{plan.cases?.length ? '已配置用例' : '未配置用例'}</Tag></div><div className="mt-2 grid gap-2 text-xs text-[var(--text-muted)] sm:grid-cols-2"><span>测试环境：{plan.environment || '未设置'}</span><span>负责人：{plan.ownerName || '未设置'}</span><span>计划开始：{plan.startDate || '未设置'}</span><span>计划结束：{plan.endDate || '未设置'}</span><span>引用用例：{plan.cases?.length || 0}</span></div></article>)}</div>}
                </section>
              ) : detailTab === 'collaborationItems' ? (
                <div className="space-y-4">
                  {selectedTask.sourceType === 'WORK_ORDER' && selectedTask.requirementId ? (
                    <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <WorkItemCategoryIcon category="assistance" className="shrink-0 text-[var(--primary)]" />
                        <button type="button" className="truncate text-left text-[var(--primary)] hover:text-[var(--primary-hover)]" onClick={() => {
                          openWorkItemDetailLink(selectedTask.requirementId!, 'WORK_ORDER');
                        }}>{selectedTask.requirementTitle || selectedTask.sourceWorkOrderTitles?.[0] || selectedTask.requirementId || '关联协同事项'}</button>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-[var(--text-muted)] sm:grid-cols-2"><span>创建人：{selectedTask.requirementInitiatorName || selectedTask.creatorName || '未知'}</span><span>期望完成时间：{selectedTask.expectedCompleteDate || selectedTask.dueDate || '未设置'}</span></div>
                    </div>
                  ) : <WorkOrderPicker disabled={!detailEditable('collaborationItems')} candidates={collaborationCandidates} selectedIds={selectedTask.sourceWorkOrderIds || []} onChange={updateLinkedWorkOrders} onNavigate={navigateWorkOrderCandidate} placeholder="请选择协同事项" />}
                  {!relatedWorkItems.length && !(selectedTask.sourceWorkOrderIds || []).length && !(selectedTask.sourceType === 'WORK_ORDER' && selectedTask.requirementId) && <p className="rounded-lg border border-dashed border-[var(--border-main)] px-3 py-6 text-center text-[var(--text-muted)]">暂无关联对象</p>}
                </div>
              ) : detailTab === 'support' ? (
                <div className="rounded-lg border border-dashed border-[var(--border-main)] px-3 py-6 text-center text-[var(--text-muted)]">暂无支撑项</div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-4">
                    {activityQuery.isFetching && <p className="text-[var(--text-muted)]">动态加载中…</p>}
                    {activityQuery.isError && <div className="flex items-center gap-2 text-[var(--danger)]"><span>动态加载失败</span><Button size="small" onClick={() => void activityQuery.refetch()}>重试</Button></div>}
                    {taskEvents.length ? [...taskEvents].reverse().map((event) => {
                      const metadata = event.metadata || {};
                      const review = metadata.review as TaskCompletionReview | undefined;
                      return <div key={event.id} className="relative pl-6 text-xs">
                        <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--primary)] ring-4 ring-[var(--primary)]/10" />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 break-words text-[var(--text-muted)]"><span className="font-medium text-[var(--text-primary)]">{event.operatorName}</span><span className="min-w-0 break-all">{eventSummary(event)}</span><span className="font-mono text-[11px]">{formatTaskActivityTime(event.createdAt)}</span></div>
                        {event.eventType === 'WORK_ITEM_REVIEWED' && review && <div className="mt-2 space-y-2 rounded-lg bg-[var(--bg-surface-soft)] px-3 py-2"><p className="whitespace-pre-wrap break-words">{review.content}</p>{review.media?.map((media) => <a key={media.id} href={media.dataUrl} download={media.name} className="block text-[var(--primary)]">{media.name}</a>)}</div>}
                        {['评论', 'WORK_ITEM_COMMENTED'].includes(event.eventType) && <p className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-[var(--bg-surface-soft)] px-3 py-2 leading-5 text-[var(--text-body)]">{String(metadata.content || '')}</p>}
                      </div>;
                    }) : <p className="text-[var(--text-muted)]">暂无动态记录</p>}
                  </div>
                  <div className="border-t border-[var(--border-main)] pt-4">
                    <label className="block text-[var(--text-muted)]"><span>发表评论</span><textarea value={commentDraft} disabled={commentSaving} onChange={(event) => setCommentDraft(event.target.value)} rows={4} placeholder="记录进展、问题或需要协同的事项..." className="mt-2 min-h-24 w-full resize-y rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 leading-6 text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50" /></label>
                    <div className="mt-3 flex justify-end"><button type="button" onClick={() => void submitComment()} disabled={!commentDraft.trim() || commentSaving} className="tech-button-primary inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"><MessageSquare className="h-3.5 w-3.5" />{commentSaving ? '发布中…' : '发布评论'}</button></div>
                  </div>
                </div>
              )}
            </section>
            {taskKind === 'test' && <Modal
              title="选择关联测试计划"
              open={testPlanPickerOpen}
              onCancel={() => { if (!testPlanAssociationSaving) { setTestPlanPickerOpen(false); setSelectedTestPlanIds([]); setTestPlanAssociationError(''); } }}
              onOk={() => {
                if (!selectedTask || !selectedTestPlanIds.length || testPlanAssociationSaving) return;
                setTestPlanAssociationSaving(true);
                setTestPlanAssociationError('');
                void productRepository.associateTestPlans(selectedTask.id, selectedTestPlanIds)
                  .then(async () => {
                    await queryClient.invalidateQueries({ queryKey: ['test-task-plans', selectedTask.id] });
                    await queryClient.invalidateQueries({ queryKey: ['available-test-plans', selectedTask.id] });
                    setTestPlanPickerOpen(false);
                    setSelectedTestPlanIds([]);
                    addToast('success', '测试计划已关联', '');
                  })
                  .catch((error: unknown) => setTestPlanAssociationError(error instanceof Error ? error.message : '关联测试计划失败，请重试'))
                  .finally(() => setTestPlanAssociationSaving(false));
              }}
              okText="关联"
              cancelText="取消"
              confirmLoading={testPlanAssociationSaving}
              okButtonProps={{ disabled: availableTestPlansQuery.isLoading || availableTestPlansQuery.isError || !filteredTestPlanCandidates.length || !selectedTestPlanIds.length }}
              cancelButtonProps={{ disabled: testPlanAssociationSaving }}
              destroyOnHidden
            >
              <div className="space-y-3">
                {availableTestPlansQuery.isLoading && <div role="status" className="flex items-center gap-2 py-4 text-xs text-[var(--text-muted)]"><Spin size="small" />测试计划加载中…</div>}
                {availableTestPlansQuery.isError && <Alert type="error" showIcon title="测试计划加载失败" action={<Button size="small" onClick={() => void availableTestPlansQuery.refetch()}>重试</Button>} />}
                {!availableTestPlansQuery.isLoading && !availableTestPlansQuery.isError && !availableTestPlansQuery.data?.length && <Empty description="当前产品线暂无可关联的测试计划" />}
                {!availableTestPlansQuery.isLoading && !availableTestPlansQuery.isError && Boolean(availableTestPlansQuery.data?.length) && <>
                  <Input.Search allowClear value={testPlanSearch} onChange={(event) => setTestPlanSearch(event.target.value)} placeholder="搜索计划名称或关联测试任务" aria-label="搜索测试计划" />
                  {!filteredTestPlanCandidates.length ? <Empty description="未找到匹配的测试计划" /> : <Table
                    aria-label="可关联测试计划列表"
                    rowKey={(candidate) => String(candidate.plan.id)}
                    size="small"
                    dataSource={filteredTestPlanCandidates}
                    pagination={false}
                    rowSelection={{
                      selectedRowKeys: selectedTestPlanIds,
                      onChange: (keys) => setSelectedTestPlanIds(keys.map(String)),
                    }}
                    columns={[
                      { title: '测试计划', render: (_value, candidate) => <span title={candidate.plan.name || '未命名计划'}>{candidate.plan.name || '未命名计划'}</span> },
                      { title: '关联测试任务', render: (_value, candidate) => <span title={`${candidate.workItemCode} ${candidate.workItemTitle}`}>{candidate.workItemCode} {candidate.workItemTitle}</span> },
                      { title: '负责人', render: (_value, candidate) => candidate.plan.ownerName || '未设置' },
                      { title: '用例数', render: (_value, candidate) => candidate.plan.cases?.length || 0 },
                    ]}
                  />}
                </>}
                {testPlanAssociationError && <Alert type="error" showIcon title="关联测试计划失败" description={testPlanAssociationError} />}
              </div>
            </Modal>}
          </div>
        </WorkItemCreatePanel>
      )}
      <WorkItemCreatePanel
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); creationContext?.onClose?.(); }}
        title={editingTask ? `编辑${itemLabel}` : `新建${itemLabel}`}
        showContinueOption={!editingTask && !creationContext}
        secondaryAction={!editingTask && !creationContext ? <Button loading={taskSaving} onClick={handleSaveAndContinue}>保存并继续</Button> : undefined}
        footer={<><Button onClick={() => { setIsModalOpen(false); creationContext?.onClose?.(); }}>取消</Button><Button type="primary" loading={taskSaving} onClick={() => void handleSaveTask()}>保存</Button></>}
        properties={<Form layout="horizontal" labelCol={{ flex: '112px' }} wrapperCol={{ flex: 1 }} labelAlign="left" className="requirement-create-properties requirement-new-properties flex flex-col" requiredMark>
          {taskKind === 'presales' && <Form.Item style={{ order: createFields.order('source') }} label="关联商机/投标项" required><Select showSearch value={formBusinessSource || undefined} onChange={(value) => { setFormBusinessSource(value); const source = [...opportunities, ...biddings].find((item) => item.id === value); const customerId = (source as { customerId?: string } | undefined)?.customerId; const customerName = (source as { customerName?: string } | undefined)?.customerName; setFormBusinessCustomer(customerId || directoryCustomerOptions.find((customer) => customer.name === customerName)?.id || ''); }} options={[...opportunities.map((item) => ({ label: `商机：${item.name}`, value: item.id })), ...biddings.map((item) => ({ label: `投标：${item.name || item.projectName}`, value: item.id }))]} placeholder="请选择关联商机或投标项" /></Form.Item>}
          {taskKind === 'design' && designVariant === 'project' && <Form.Item style={{ order: createFields.order('project') }} label="关联项目" required><Select showSearch value={formCustomerName || undefined} onChange={setFormCustomerName} options={projectOptions.map((item) => ({ label: item.name, value: item.id }))} placeholder="请选择关联项目" /></Form.Item>}
          {isCommercialTask && <Form.Item style={{ order: createFields.order('customer') }} label="关联客户" required><Select showSearch value={formBusinessCustomer || undefined} onChange={setFormBusinessCustomer} options={directoryCustomerOptions.map((item) => ({ label: item.name, value: item.id }))} placeholder="请选择关联客户" /></Form.Item>}
          {(taskKind === 'ops' || (!isCommercialTask && createFields.visible('productLine'))) && <Form.Item style={{ order: taskKind === 'ops' ? -1 : createFields.order('productLine') }} label="关联产品" required={taskKind !== 'ops' && createFields.required('productLine')}><Select disabled={taskKind === 'ops' && !formCustomerName} showSearch allowClear={!createFields.required('productLine')} optionFilterProp="label" value={formProductLineId || undefined} onChange={(value) => { const line = productLines.find(line => line.id === value); setFormProductLineName(line?.name || '', line?.id); setFormVersionName(''); if (taskKind !== 'design' && taskKind !== 'bug') setFormRequirementType(''); }} options={opsProductOptions.map((line) => ({ label: line.name, value: line.id }))} placeholder="请选择关联产品" /></Form.Item>}
          {(taskKind !== 'ops' && (taskKind === 'design' || createFields.visible('taskType') || (formProductLineName && taskTypeLoadState === 'ready' && !configuredWorkItemTypes.some((item) => item.isDefault)))) && <Form.Item style={{ order: createFields.order('taskType') }} label={taskKind === 'bug' ? '缺陷类型' : '任务类型'} required={Boolean(configuredCategory) || createFields.required('taskType')}><Select showSearch optionFilterProp="label" value={formRequirementType || undefined} onChange={setFormRequirementType} options={taskKind === 'bug' ? ['系统缺陷', '样式缺陷', '线上故障', '安全漏洞'].map(value => ({ label: value, value })) : configuredWorkItemTypes.map((item) => ({ label: item.name, value: item.name }))} disabled={taskKind !== 'bug' && !configuredWorkItemTypes.length} placeholder={configuredWorkItemTypes.length ? `请选择${itemLabel}类型` : '请先在产研模板中启用类型'} /></Form.Item>}
          {createFields.visible('assignee') && <Form.Item style={{ order: createFields.order('assignee') }} label="负责人" required={createFields.required('assignee')}><Select showSearch optionFilterProp="label" value={formOwnerName || undefined} onChange={handleFormOwnerChange} options={employeeNameOptions} placeholder="搜索姓名或职位" /></Form.Item>}
          {taskKind === 'bug' && <Form.Item style={{ order: createFields.order('verifier') }} label="验证者"><Select showSearch optionFilterProp="label" value={formVerifierId || undefined} onChange={setFormVerifierId} options={employeeOptions.map(employee => ({ value: employee.id, label: employee.name }))} placeholder="请选择验证者" /></Form.Item>}
          {createFields.visible('priority') && <Form.Item style={{ order: createFields.order('priority') }} label="优先级" required={createFields.required('priority')}><Select value={formPriority || undefined} onChange={(value) => setFormPriority(value)} options={['紧急', '高', '中', '低'].map((value) => ({ label: value, value }))} placeholder="请选择优先级" /></Form.Item>}
          {createFields.visible('plannedStartDate') && <Form.Item style={{ order: createFields.order('plannedStartDate') }} label="计划开始时间" required={createFields.required('plannedStartDate')}><DatePicker value={formPlannedStartDate ? dayjs(formPlannedStartDate) : null} onChange={(date) => setFormPlannedStartDate(date ? date.format('YYYY-MM-DD') : '')} className="w-full" placeholder="请选择日期" /></Form.Item>}
          {createFields.visible('plannedEndDate') && <Form.Item style={{ order: createFields.order('plannedEndDate') }} label="计划完成时间" required={createFields.required('plannedStartDate')}><DatePicker value={formDueDate ? dayjs(formDueDate) : null} onChange={(date) => setFormDueDate(date ? date.format('YYYY-MM-DD') : '')} className="w-full" placeholder="请选择日期" /></Form.Item>}
          {createFields.visible('expectedCompleteDate') && <Form.Item style={{ order: createFields.order('expectedCompleteDate') }} label="期望完成时间" required={createFields.required('expectedCompleteDate')}><DatePicker value={formExpectedCompleteDate ? dayjs(formExpectedCompleteDate) : null} onChange={(date) => setFormExpectedCompleteDate(date ? date.format('YYYY-MM-DD') : '')} className="w-full" placeholder="请选择日期" /></Form.Item>}
          {taskKind === 'design' && createFields.visible('sourceDepartment') && <Form.Item style={{ order: createFields.order('sourceDepartment') }} label="来源部门" required><Select showSearch value={formSourceDepartment || undefined} onChange={setFormSourceDepartment} options={designSourceOptions} placeholder="请选择来源部门" /></Form.Item>}
          {createFields.visible('version') && <Form.Item style={{ order: createFields.order('version') }} label="迭代版本" required={createFields.required('version')}><Select showSearch allowClear optionFilterProp="label" value={formVersionId || undefined} onChange={(value) => { const version = formVersions.find(version => version.id === value); setFormVersionName(version?.name || '', version?.id); setTaskSaveIssue(null); }} options={formVersions.map((version) => ({ label: version.name, value: version.id }))} placeholder="暂不关联" /></Form.Item>}
          {taskKind !== 'design' && createFields.visible('project') && <Form.Item style={{ order: taskKind === 'ops' ? -2 : createFields.order('project') }} label="关联项目" required={taskKind === 'ops' || createFields.required('project')}><Select showSearch allowClear optionFilterProp="label" value={formCustomerName || undefined} onChange={(value) => { setFormCustomerName(value || ''); const project = projectOptions.find((item) => item.id === value); if (taskKind === 'delivery') setFormBusinessCustomer(project?.customerId || directoryCustomerOptions.find((customer) => customer.name === project?.customerName)?.id || ''); if (taskKind === 'ops') { setFormProductLineName(''); setFormVersionName(''); } }} options={projectOptions.map((project) => ({ label: project.name, value: project.id }))} placeholder="请选择关联项目" /></Form.Item>}
          {taskKind === 'requirement' && createFields.visible('needsCollaboration') && <Form.Item style={{ order: createFields.order('needsCollaboration') }} label="需要协同" required={createFields.required('needsCollaboration')}><Checkbox.Group disabled={Boolean(editingTask)} value={needsCollaboration} options={[{ label: '设计', value: 'design' }, { label: '开发', value: 'dev' }, { label: '测试', value: 'test' }]} onChange={(values) => setNeedsCollaboration(values as Array<'design' | 'dev' | 'test'>)} /></Form.Item>}
          {createFields.visible('cc') && <Form.Item style={{ order: createFields.order('cc') }} label="参与人" required={createFields.required('cc')}><Select mode="multiple" showSearch allowClear optionFilterProp="label" value={formCcNames} onChange={setFormCcNames} options={employeeNameOptions} placeholder="搜索姓名或职位" /></Form.Item>}
          {createFields.visible('estimatedHours') && <Form.Item style={{ order: createFields.order('estimatedHours') }} label="预计工时（小时）" required={createFields.required('estimatedHours')}><InputNumber min={0} precision={2} value={formEstimatedHours === '' ? null : formEstimatedHours} onChange={(value) => setFormEstimatedHours(value ?? '')} className="requirement-hours-input w-full" placeholder="请输入预计工时" /></Form.Item>}
          {createFields.visible('actualHours') && <Form.Item style={{ order: createFields.order('actualHours') }} label="实际工时（小时）" required={createFields.required('actualHours')}><InputNumber readOnly min={0} precision={2} value={formActualHours === '' ? 0 : formActualHours} className="requirement-hours-input w-full" placeholder="请输入实际工时" /></Form.Item>}
          {createFields.visible('attachments') && <Form.Item style={{ order: createFields.order('attachments') }} label="附件">
            <Upload accept=".txt,.doc,.docx,.xls,.xlsx,.pdf" multiple showUploadList={false} beforeUpload={(file) => { appendDocumentMedia([file]); return Upload.LIST_IGNORE; }}><Button block icon={<Paperclip className="h-4 w-4" />}>添加文档附件</Button></Upload>
            {formMedia.map((item) => <div key={item.id} className="mt-2 flex items-center gap-2 text-[var(--text-body)]"><FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{item.name}</span><Button type="text" danger size="small" aria-label={`移除附件${item.name}`} onClick={() => setFormMedia((items) => items.filter((media) => media.id !== item.id))} icon={<X className="h-4 w-4" />} /></div>)}
          </Form.Item>}
        </Form>}
      >
        <Form layout="vertical" className="w-full" data-work-item-form>
          {taskSaveIssue && <Alert className="mb-4" showIcon type={taskSaveIssue.type} title={taskSaveIssue.title} description={taskSaveIssue.description} />}
          {createFields.visible('title') && <Form.Item label="标题" required={createFields.required('title')}><Input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} placeholder="例如：支持达梦DM8数据库读写分离与主备秒级切换" /></Form.Item>}
          {!['requirement','design','dev','test','bug'].includes(taskKind) && createFields.visible('expectedGoal') && <Form.Item label="期望结果" required={createFields.required('expectedGoal')}><Input.TextArea rows={3} value={formTarget} onChange={(event) => setFormTarget(event.target.value)} placeholder="请填写任务完成后的预期结果" /></Form.Item>}
          {createFields.visible('description') && <Form.Item label="任务描述"><RichTextEditor size="work-order" editor={descriptionEditor} value={formDescription} htmlValue={formDescriptionHtml} onInput={(text, html) => { setFormDescription(text); setFormDescriptionHtml(html); }} onBlur={() => { /* auto-save description */ }} placeholder="详细记录需求背景、业务场景和实现说明..." /></Form.Item>}
          <WorkItemRelationTabs items={[
            ...((isCommercialTask || createFields.visible('collaborationItems')) ? [{ key: 'collaborationItems', label: '协同事项', count: selectedWorkOrderIds.length, content: <WorkOrderPicker candidates={collaborationCandidates} selectedIds={selectedWorkOrderIds} onChange={setSelectedWorkOrderIds} onNavigate={navigateWorkOrderCandidate} placeholder="请选择协同事项" /> }] : []),
            ...((taskKind === 'design' || taskKind === 'dev' || taskKind === 'test' || taskKind === 'bug' || isCommercialTask) && (isCommercialTask || createFields.visible('relatedTasks')) ? [{ key: 'relatedTasks', label: '关联任务', count: selectedRequirementTaskIds.length, content: <WorkOrderPicker relationMode={['design', 'dev', 'test', 'bug'].includes(taskKind) ? 'productTask' : 'workOrder'} candidates={creationTaskCandidates.filter((item) => item.id !== editingTask?.id)} selectedIds={selectedRequirementTaskIds} onChange={setSelectedRequirementTaskIds} onNavigate={navigateWorkOrderCandidate} placeholder="请选择关联任务" /> }] : []),
            ...(!isCommercialTask && (taskKind !== 'requirement' || editingTask) && createFields.visible('support') ? [{ key: 'support', label: '支撑项', count: 0, description: '创建后可在详情页关联测试计划等支撑事项。' }] : []),
            ...(!isCommercialTask && (taskKind !== 'requirement' || editingTask) && createFields.visible('hours') ? [{ key: 'hours', label: '工时', count: 0, description: '创建后可在详情页登记工时并查看统计。' }] : []),
          ]} />
        </Form>
      </WorkItemCreatePanel>
    </div>
  );
};
