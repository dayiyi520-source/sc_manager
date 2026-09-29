import React, { useEffect, useMemo, useState } from 'react';
import {
  Bug,
  Beaker,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit,
  Filter,
  GitBranch,
  ListTodo,
  Layers,
  MoreHorizontal,
  Plus,
  Play,
  CheckCircle,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  UserRound
} from '@/components/common/octicons-compat';
import { Alert, Button, Dropdown, Input, Modal, Select, message } from 'antd';
import { ApartmentOutlined, CopyOutlined, DeleteOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { useApp } from '../../context/AppContext';
import { StatusTag } from '../common/UIComponents';
import { showDeleteConfirm } from '../common/Feedback';
import { DefectBug, DevTask, ProductLineWorkItemType, RequirementTask, VersionIteration } from '../../types';
import { RequirementTasksView } from './RequirementTasksView';
import { CreateVersionModal } from './CreateVersionModal';
import { VersionTestReportPanel } from './VersionTestReportPanel';
import { PersonIdentity } from '../common/PersonIdentity';
import { productRepository, type UnifiedWorkItem } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';
import { Pagination } from '../common/Pagination';
import { UnifiedWorkItemControls, type UnifiedFilterState } from './UnifiedWorkItemControls';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
import { WorkItemBatchBar } from './WorkItemBatchBar';
import { ProductNavigation } from './ProductNavigation';
import { useQuery } from '@tanstack/react-query';
import { parentWorkItemId, workItemHierarchy, workItemKey } from './workItemHierarchy';

type ViewMode = 'list' | 'planning';
type DetailTab = 'hours' | 'testReports' | 'review';
type DetailSection = 'info' | 'workItems';
type PlanningKind = 'requirement' | 'design' | 'bug' | 'dev' | 'test';
type TaskGroupBy = 'none' | 'priority' | 'status' | 'owner' | 'creator' | 'version' | 'customer' | 'requirementType';
type PlanningItem = {
  id: string;
  kind: PlanningKind;
  title: string;
  ownerName: string;
  creatorName?: string;
  createdAt?: string;
  estimatedHours: number;
  actualHours: number;
  priority: string;
  status: string;
  productLineId?: string;
  versionId?: string;
  versionName?: string;
  source: RequirementTask | DefectBug | DevTask;
};

const planningKindLabel: Record<PlanningKind, string> = { requirement: '需求', design: '设计', bug: '缺陷', dev: '研发', test: '测试' };
const planningKindIcon: Record<PlanningKind, React.ReactNode> = {
  requirement: <ListTodo className="h-4 w-4 text-[var(--primary)]" />,
  design: <Layers className="h-4 w-4 text-[var(--accent-purple)]" />,
  bug: <Bug className="h-4 w-4 text-[var(--danger)]" />,
  dev: <GitBranch className="h-4 w-4 text-[var(--success)]" />,
  test: <Beaker className="h-4 w-4 text-[var(--warning)]" />
};

const normalize = (value?: string) => (value || '').trim().toLowerCase();
const taskGroupValue = (item: PlanningItem, groupBy: TaskGroupBy): string => {
  const source = item.source as unknown as Record<string, unknown>;
  switch (groupBy) {
    case 'priority': return item.priority || '未设置';
    case 'status': return item.status || '未设置';
    case 'owner': return item.ownerName || '未设置';
    case 'creator': return item.creatorName || '未设置';
    case 'version': return item.versionName || '未关联';
    case 'customer': return String(source.customerName || '未关联');
    case 'requirementType': return String(source.requirementType || source.workItemTypeName || '未设置');
    default: return '';
  }
};
const normalizedTaskGroupValue = (item: PlanningItem, groupBy: TaskGroupBy): string => {
  const value = taskGroupValue(item, groupBy);
  return value && value !== '0' ? value : '未设置';
};

const versionMatches = (version: VersionIteration, value?: string) => {
  const source = normalize(value);
  if (!source) return false;
  const candidates = [version.name, version.code, version.name.replace(/\s*\([^)]*\)/g, '')]
    .map(normalize)
    .filter(Boolean);
  return candidates.some((candidate) => candidate.includes(source) || source.includes(candidate));
};

const completedWorkItemStatuses = new Set(['已完成', '已发布', '已验收', '已关闭', '已合并上线']);
const normalizeVersionStatus = (status?: string, phase?: string) => {
  if (phase === '已完成') return '已完成';
  if (phase === '处理中') return '进行中';
  if (phase === '已结束') return '已结束';
  if (phase === '待开始') return '未开始';
  return status || '未配置';
};

const workItemStats = (items: PlanningItem[]) => ({
  completed: items.filter((item) => completedWorkItemStatuses.has(item.status)).length,
  total: items.length
});

const primaryButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]';
const secondaryButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--primary)] hover:text-[var(--active-text)]';

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({
  icon,
  title,
  description
}) => (
  <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-6 text-center">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-surface-soft)] text-[var(--text-muted)]">
      {icon}
    </div>
    <p className="font-semibold text-[var(--text-primary)]">{title}</p>
    <p className="max-w-sm text-xs text-[var(--text-muted)]">{description}</p>
  </div>
);

const Metric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex min-h-16 min-w-24 flex-col justify-between py-2">
    <div className="text-[11px] font-normal text-[var(--text-muted)]">{label}</div>
    <div className="font-bold text-[var(--text-primary)]">{value}</div>
  </div>
);

const RequirementRows: React.FC<{ items: RequirementTask[]; onOpen: (item: RequirementTask) => void }> = ({ items, onOpen }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[760px] text-left">
      <thead className="bg-[var(--bg-surface-soft)] text-[11px] text-[var(--text-muted)]">
        <tr>
          <th className="px-4 py-2.5 font-medium">需求标题</th>
          <th className="px-3 py-2.5 font-medium">状态</th>
          <th className="px-3 py-2.5 font-medium">负责人</th>
          <th className="px-3 py-2.5 font-medium">优先级</th>
          <th className="px-3 py-2.5 font-medium">计划完成</th>
          <th className="px-4 py-2.5 text-right font-medium">操作</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border-main)]">
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--bg-surface-soft)]">
            <td className="max-w-[360px] px-4 py-3">
              <button type="button" onClick={() => onOpen(item)} className="truncate text-left font-medium text-[var(--text-primary)] hover:text-[var(--primary)]">{item.title}</button>
              <div className="mt-1 text-[11px] text-[var(--text-muted)]">{item.code || '需求任务'}</div>
            </td>
            <td className="px-3 py-3">
              <StatusTag status={item.status} />
            </td>
            <td className="px-3 py-3 text-[var(--text-body)]"><PersonIdentity name={item.ownerName} emptyLabel="未分配" variant="list" /></td>
            <td className="px-3 py-3">
              <StatusTag status={item.priority} />
            </td>
            <td className="px-3 py-3 text-[var(--text-muted)]">{item.expectedCompleteDate || item.dueDate || '--'}</td>
            <td className="px-4 py-3 text-right">
              <button type="button" onClick={() => onOpen(item)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)]" title="查看需求">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DevTaskRows: React.FC<{ items: DevTask[]; onOpen: (item: DevTask) => void }> = ({ items, onOpen }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[760px] text-left">
      <thead className="bg-[var(--bg-surface-soft)] text-[11px] text-[var(--text-muted)]">
        <tr>
          <th className="px-4 py-2.5 font-medium">任务标题</th>
          <th className="px-3 py-2.5 font-medium">状态</th>
          <th className="px-3 py-2.5 font-medium">开发者</th>
          <th className="px-3 py-2.5 font-medium">工时</th>
          <th className="px-3 py-2.5 font-medium">截止日期</th>
          <th className="px-4 py-2.5 text-right font-medium">操作</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border-main)]">
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--bg-surface-soft)]">
            <td className="max-w-[360px] px-4 py-3">
              <button type="button" onClick={() => onOpen(item)} className="truncate text-left font-medium text-[var(--text-primary)] hover:text-[var(--primary)]">{item.title}</button>
              <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{item.repo || '研发任务'}</div>
            </td>
            <td className="px-3 py-3">
              <StatusTag status={item.status} />
            </td>
            <td className="px-3 py-3 text-[var(--text-body)]"><PersonIdentity name={item.developer} emptyLabel="未分配" variant="list" /></td>
            <td className="px-3 py-3 text-[var(--text-muted)]">
              {item.spentHours || 0}/{item.estimatedHours || 0}h
            </td>
            <td className="px-3 py-3 text-[var(--text-muted)]">{item.dueDate || '--'}</td>
            <td className="px-4 py-3 text-right">
              <button type="button" onClick={() => onOpen(item)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)]" title="查看任务">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const BugRows: React.FC<{ items: DefectBug[]; onOpen: (item: DefectBug) => void }> = ({ items, onOpen }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[760px] text-left">
      <thead className="bg-[var(--bg-surface-soft)] text-[11px] text-[var(--text-muted)]">
        <tr>
          <th className="px-4 py-2.5 font-medium">缺陷标题</th>
          <th className="px-3 py-2.5 font-medium">状态</th>
          <th className="px-3 py-2.5 font-medium">负责人</th>
          <th className="px-3 py-2.5 font-medium">严重程度</th>
          <th className="px-3 py-2.5 font-medium">创建时间</th>
          <th className="px-4 py-2.5 text-right font-medium">操作</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border-main)]">
        {items.map((item) => (
          <tr key={item.id} className="hover:bg-[var(--bg-surface-soft)]">
            <td className="max-w-[360px] px-4 py-3">
              <button type="button" onClick={() => onOpen(item)} className="truncate text-left font-medium text-[var(--text-primary)] hover:text-[var(--primary)]">{item.title}</button>
              <div className="mt-1 text-[11px] text-[var(--text-muted)]">{item.code || item.type || '缺陷'}</div>
            </td>
            <td className="px-3 py-3">
              <StatusTag status={item.status} />
            </td>
            <td className="px-3 py-3 text-[var(--text-body)]"><PersonIdentity name={item.ownerName || item.assignee} emptyLabel="未分配" variant="list" /></td>
            <td className="px-3 py-3">
              <StatusTag status={item.severity} />
            </td>
            <td className="px-3 py-3 text-[var(--text-muted)]">{item.createdAt || '--'}</td>
            <td className="px-4 py-3 text-right">
              <button type="button" onClick={() => onOpen(item)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)]" title="查看缺陷">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const WorkItemRows: React.FC<{ items: PlanningItem[]; childrenByParent: Map<string, PlanningItem[]>; groupBy: TaskGroupBy; selectedIds: string[]; onSelectionChange: (ids: string[]) => void; onOpen: (item: PlanningItem) => void; onOperation: (key: string, item: PlanningItem) => void; employees: string[]; onUpdated: () => void }> = ({ items, childrenByParent, groupBy, selectedIds, onSelectionChange, onOpen, onOperation, employees, onUpdated }) => {
  const [expanded, setExpanded] = useState<string[]>([]);
  const rows: Array<{ item: PlanningItem; depth: number }> = [];
  const append = (item: PlanningItem, depth = 0) => {
    rows.push({ item, depth });
    if (expanded.includes(workItemKey(item))) (childrenByParent.get(workItemKey(item)) || []).forEach((child) => append(child, depth + 1));
  };
  items.forEach((item) => append(item));
  return (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[1040px] text-left">
      <thead className="bg-[var(--bg-surface-soft)] text-[11px] text-[var(--text-muted)]">
        <tr>
          <th className="px-4 py-2.5 font-medium"><input type="checkbox" aria-label="全选迭代任务" checked={items.length > 0 && items.every((item) => selectedIds.includes(`${item.kind}:${item.id}`))} onChange={(event) => onSelectionChange(event.target.checked ? items.map((item) => `${item.kind}:${item.id}`) : [])} className="h-4 w-4 accent-[var(--primary)]" /></th>
          <th className="px-3 py-2.5 font-medium">标题</th>
          <th className="px-3 py-2.5 font-medium">状态</th>
          <th className="px-3 py-2.5 font-medium">负责人</th>
          <th className="px-3 py-2.5 font-medium">创建人</th>
          <th className="px-3 py-2.5 font-medium">创建时间</th>
          <th className="px-3 py-2.5 font-medium">优先级</th>
          <th className="px-3 py-2.5 font-medium">预计工时</th>
          <th className="px-4 py-2.5 font-medium">实际工时</th>
          <th className="sticky right-0 z-10 min-w-16 border-l border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-2.5 text-right font-medium">操作</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border-main)]">
        {rows.map(({ item, depth }, index) => {
          const group = normalizedTaskGroupValue(item, groupBy);
          const previous = rows.slice(0, index).reverse().find((row) => row.depth === 0)?.item;
          const previousGroup = previous && normalizedTaskGroupValue(previous, groupBy);
          const children = childrenByParent.get(workItemKey(item)) || [];
          const open = expanded.includes(workItemKey(item));
          const operationMenu = { items: [...(item.kind === 'bug' ? [] : [{ key: 'child', icon: <PlusOutlined />, label: '添加子任务' }]), { key: 'copy', icon: <CopyOutlined />, label: '复制任务' }, { key: 'copy-link', icon: <ApartmentOutlined />, label: '复制并关联' }, { type: 'divider' as const }, { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true }], onClick: ({ key }: { key: string }) => onOperation(key, item) };
          return <React.Fragment key={workItemKey(item)}>{depth === 0 && groupBy !== 'none' && (index === 0 || group !== previousGroup) && <tr className="bg-[var(--bg-surface-soft)]"><td colSpan={10} className="px-4 py-2 font-semibold text-[var(--text-body)]">{group} · {items.filter((entry) => normalizedTaskGroupValue(entry, groupBy) === group).length}</td></tr>}
          <tr className="hover:bg-[var(--bg-surface-soft)]">
            <td className="px-4 py-3"><input type="checkbox" aria-label={`选择迭代任务：${item.title}`} checked={selectedIds.includes(`${item.kind}:${item.id}`)} onChange={(event) => onSelectionChange(event.target.checked ? [...selectedIds, `${item.kind}:${item.id}`] : selectedIds.filter((id) => id !== `${item.kind}:${item.id}`))} className="h-4 w-4 accent-[var(--primary)]" /></td>
            <td className="max-w-[360px] px-3 py-3">
              <div className="flex items-center gap-2" style={{ paddingLeft: depth * 24 }}>
                {children.length > 0 ? <button type="button" aria-label={`${open ? '收起' : '展开'}${item.title}`} aria-expanded={open} onClick={() => setExpanded((current) => open ? current.filter((key) => key !== workItemKey(item)) : [...current, workItemKey(item)])} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--primary)]">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : <span className="w-4 shrink-0" />}
                {depth > 0 && <span className="text-[var(--text-muted)]">└─</span>}<span aria-label={planningKindLabel[item.kind]} title={planningKindLabel[item.kind]}>{planningKindIcon[item.kind]}</span><button type="button" onClick={() => onOpen(item)} className="block min-w-0 max-w-full truncate text-left font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]">{item.title}</button>
              </div>
            </td>
            <td className="px-3 py-3"><VersionWorkItemCell item={item} field="status" onUpdated={onUpdated} employees={employees} /></td>
            <td className="px-3 py-3 text-[var(--text-body)]"><VersionWorkItemCell item={item} field="owner" onUpdated={onUpdated} employees={employees} /></td>
            <td className="px-3 py-3 text-[var(--text-body)]"><PersonIdentity name={item.creatorName} emptyLabel="未设置" variant="list" /></td>
            <td className="px-3 py-3 font-mono text-[var(--text-muted)]">{item.createdAt?.slice(0, 10) || '—'}</td>
            <td className="px-3 py-3"><StatusTag status={item.priority} /></td>
            <td className="px-3 py-3 text-[var(--text-muted)]">{item.estimatedHours} 小时</td>
            <td className="px-4 py-3 text-[var(--text-muted)]">{item.actualHours} 小时</td>
            <td className="sticky right-0 z-10 min-w-16 border-l border-[var(--border-main)] bg-[var(--bg-surface)] px-4 py-3 text-right"><Dropdown menu={operationMenu} trigger={['click']}><Button type="text" icon={<MoreOutlined />} aria-label={`操作${item.title}`} /></Dropdown></td>
          </tr></React.Fragment>;
        })}
      </tbody>
    </table>
  </div>
  );
};

const VersionWorkItemCell: React.FC<{ item: PlanningItem; field: 'status' | 'owner'; employees: string[]; onUpdated: () => void }> = ({ item, field, employees, onUpdated }) => {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const source = item.source as RequirementTask;
  const editable = Boolean(item.productLineId && Number.isInteger(source.revision) && !source.hasChildren);
  const open = async () => {
    if (!editable) return;
    if (field === 'owner') { setOptions(employees.map((name) => ({ value: name, label: name }))); setEditing(true); return; }
    setBusy(true);
    try {
      const result = await productRepository.workItemTransitions(item.productLineId!, item.id);
      setOptions(result.statuses.filter((status) => status.allowed && !status.current).map((status) => ({ value: status.key, label: status.name })));
      setEditing(true);
    } catch (error) { messageApi.error(error instanceof Error ? error.message : '状态加载失败'); }
    finally { setBusy(false); }
  };
  const change = async (value: string) => {
    setBusy(true);
    try {
      if (field === 'owner') await productRepository.updateWorkItem(item.productLineId!, item.id, { assigneeName: value, revision: source.revision! });
      else {
        const result = await productRepository.workItemTransitions(item.productLineId!, item.id);
        const action = result.actions.find((entry) => entry.to === value && entry.allowed);
        if (!action) throw new Error('当前状态不可流转到所选状态');
        await productRepository.transitionWorkItem(item.productLineId!, item.id, { edgeKey: action.edgeKey, revision: result.revision });
      }
      setEditing(false);
      onUpdated();
    } catch (error) { messageApi.error(error instanceof Error ? error.message : '修改失败'); }
    finally { setBusy(false); }
  };
  return <>{contextHolder}{editing ? <Select autoFocus showSearch optionFilterProp="label" aria-label={`${item.title}${field === 'status' ? '状态' : '负责人'}`} className="min-w-32" placeholder="请选择" options={options} onChange={(value) => void change(value)} onBlur={() => setEditing(false)} loading={busy} /> : <button type="button" onClick={() => void open()} disabled={!editable || busy} title={editable ? `修改${field === 'status' ? '状态' : '负责人'}` : '当前任务不可编辑'} className="inline-flex min-h-8 items-center text-left disabled:cursor-default">{field === 'status' ? <StatusTag status={item.status} /> : <PersonIdentity name={item.ownerName} emptyLabel="未分配" variant="list" />}</button>}</>;
};

const PlanningTree: React.FC<{ items: PlanningItem[]; matches?: PlanningItem[]; selectedIds?: string[]; onSelect?: (item: PlanningItem) => void; onOpen: (item: PlanningItem) => void; onDrag: (event: React.DragEvent, item: PlanningItem) => void; onDragEnd: () => void; busy?: boolean }> = ({ items, matches, selectedIds, onSelect, onOpen, onDrag, onDragEnd, busy }) => {
  const [expanded, setExpanded] = useState<string[]>([]);
  const tree = workItemHierarchy<PlanningItem>(items, matches);
  const renderItem = (item: PlanningItem, depth = 0): React.ReactNode => {
    const key = workItemKey(item);
    const children = tree.children.get(key) || [];
    const open = expanded.includes(key);
    const plannable = !parentWorkItemId(item);
    return <React.Fragment key={key}>
      <div draggable={plannable && !busy} onDragStart={(event) => onDrag(event, item)} onDragEnd={onDragEnd} aria-label={plannable ? `拖动工作项：${item.title}` : `子任务：${item.title}`} className={`mb-1 border-b border-[var(--border-main)] px-3 py-3 hover:bg-[var(--bg-surface-soft)] ${plannable && !busy ? 'cursor-grab' : ''}`} style={{ paddingLeft: 12 + depth * 24 }}>
        <div className="flex items-center gap-2">
          {onSelect && plannable && <input type="checkbox" aria-label={`选择工作项：${item.title}`} checked={selectedIds?.includes(`${item.kind}:${item.id}`) || false} onChange={() => onSelect(item)} className="h-4 w-4 shrink-0 accent-[var(--primary)]" />}
          {children.length ? <button type="button" aria-label={`${open ? '收起' : '展开'}${item.title}`} aria-expanded={open} onClick={() => setExpanded((current) => open ? current.filter((value) => value !== key) : [...current, key])} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--primary)]">{open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button> : <span className="w-4 shrink-0" />}
          {depth > 0 && <span className="text-[var(--text-muted)]">└─</span>}<span className="shrink-0">{planningKindIcon[item.kind]}</span><button type="button" onClick={() => onOpen(item)} title={item.title} className="min-w-0 flex-1 truncate text-left font-medium text-[var(--text-primary)] hover:text-[var(--primary)]">{item.title}</button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 pl-6 text-[11px] text-[var(--text-muted)]"><PersonIdentity name={item.ownerName} emptyLabel="未分配" variant="list" /><span>{item.estimatedHours}h</span><StatusTag status={item.priority} /><StatusTag status={item.status} /></div>
      </div>
      {open && children.map((child) => renderItem(child, depth + 1))}
    </React.Fragment>;
  };
  return <>{tree.roots.map((item) => renderItem(item))}</>;
};

export const VersionIterationView: React.FC = () => {
  const {
    versions,
    productLines,
    requirementTasks,
    designTasks = [],
    devTasks,
    bugs,
    deleteVersion,
    assignRequirementToVersion,
    assignWorkItemToVersion,
    unassignWorkItemFromVersion,
    updateVersion,
    addToast
  } = useApp();
  const iterationStatusesQuery = useQuery({ queryKey: ['research-status-templates', 'ITERATION'], queryFn: () => productRepository.researchStatusTemplates('ITERATION'), retry: false });
  const [mode, setMode] = useState<ViewMode>('list');
  const [showDetail, setShowDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('hours');
  const [detailSection, setDetailSection] = useState<DetailSection>('workItems');
  const [taskQuery, setTaskQuery] = useState('');
  const [taskSearchDraft, setTaskSearchDraft] = useState('');
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const [taskFilterOpen, setTaskFilterOpen] = useState(false);
  const [taskFilterTarget, setTaskFilterTarget] = useState<HTMLDivElement | null>(null);
  const [taskGroupOpen, setTaskGroupOpen] = useState(false);
  const [taskGroupBy, setTaskGroupBy] = useState<TaskGroupBy>('none');
  const [taskGroupSelection, setTaskGroupSelection] = useState('');
  const [taskGroupQuery, setTaskGroupQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [removedTaskIds, setRemovedTaskIds] = useState<string[]>([]);
  const [directoryCollapsed, setDirectoryCollapsed] = useState(false);
  const [createTaskKind, setCreateTaskKind] = useState<'requirement' | 'design' | 'dev' | 'test' | 'bug' | null>(null);
  const [childParentItem, setChildParentItem] = useState<PlanningItem | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createTypeId, setCreateTypeId] = useState('');
  const [createPriority, setCreatePriority] = useState('P2');
  const [createTypes, setCreateTypes] = useState<ProductLineWorkItemType[]>([]);
  const [createTypesLoading, setCreateTypesLoading] = useState(false);
  const [createTypesError, setCreateTypesError] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [recentItems, setRecentItems] = useState<UnifiedWorkItem[]>([]);
  const [taskKinds, setTaskKinds] = useState<PlanningKind[]>(['requirement', 'design', 'dev', 'test', 'bug']);
  const [testItems, setTestItems] = useState<UnifiedWorkItem[]>([]);
  const [testItemsError, setTestItemsError] = useState(false);
  const [testItemsReloadKey, setTestItemsReloadKey] = useState(0);
  const [workItemsReloadKey, setWorkItemsReloadKey] = useState(0);
  const [taskStatus, setTaskStatus] = useState('all');
  const [taskOwner, setTaskOwner] = useState('all');
  const [taskTitleFilter, setTaskTitleFilter] = useState('');
  const [taskCreatorFilter, setTaskCreatorFilter] = useState('all');
  const [taskVersionFilter, setTaskVersionFilter] = useState('all');
  const [taskOwnerPickerOpen, setTaskOwnerPickerOpen] = useState(false);
  const [taskOwnerNames, setTaskOwnerNames] = useState<string[]>([]);
  const [directoryOwnerNames, setDirectoryOwnerNames] = useState<string[]>([]);
  const [taskFilters, setTaskFilters] = useState<UnifiedFilterState>({ title: '', status: [], owner: [], creator: [], customer: [], version: [], cc: [], createdAt: ['', ''], plannedStartDate: ['', ''] });
  const [taskFilterDraft, setTaskFilterDraft] = useState<UnifiedFilterState>({ title: '', status: [], owner: [], creator: [], customer: [], version: [], cc: [], createdAt: ['', ''], plannedStartDate: ['', ''] });
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(10);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [productLineFilter, setProductLineFilter] = useState('all');
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(versions[0]?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [formProductLineId, setFormProductLineId] = useState('');
  const [dropTargetVersionId, setDropTargetVersionId] = useState<string | null>(null);
  const [assigningRequirementId, setAssigningRequirementId] = useState<string | null>(null);
  const [planningSearchOpen, setPlanningSearchOpen] = useState(false);
  const [planningQuery, setPlanningQuery] = useState('');
  const [planningFilterOpen, setPlanningFilterOpen] = useState(false);
  const [planningKinds, setPlanningKinds] = useState<PlanningKind[]>(['requirement', 'design', 'bug', 'dev', 'test']);
  const [planningStatuses, setPlanningStatuses] = useState<string[]>([]);
  const [planningPriorities, setPlanningPriorities] = useState<string[]>([]);
  const [planningOwners, setPlanningOwners] = useState<string[]>([]);
  const [expandedVersionIds, setExpandedVersionIds] = useState<string[]>([]);
  const [draggedWorkItem, setDraggedWorkItem] = useState<PlanningItem | null>(null);
  const [selectedPlanningItemIds, setSelectedPlanningItemIds] = useState<string[]>([]);
  const [directWorkItem, setDirectWorkItem] = useState<Record<string, unknown> | null>(null);
  const enabledIterationStatuses = (iterationStatusesQuery.data || []).filter((item) => item.enabled);
  const iterationStatusForPhase = (phase: '待开始' | '处理中' | '已完成' | '已结束') => enabledIterationStatuses.find((item) => item.phase === phase)?.name || '';

  useEffect(() => {
    let active = true;
    teamRepository.options().then((members) => {
      if (active) setDirectoryOwnerNames(members.map((member) => member.name).filter(Boolean));
    }).catch(() => { /* Keep work-item assignees available when the directory is unavailable. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId && versions[0]?.id) setSelectedId(versions[0].id);
  }, [selectedId, versions]);

  useEffect(() => {
    const consumeProductLineContext = () => {
      const lineId = sessionStorage.getItem('shichuang.productLineFilter');
      const targetTab = sessionStorage.getItem('shichuang.productLineTargetTab');
      const targetVersionId = sessionStorage.getItem('shichuang.productLineTargetVersionId');
      if (lineId) setProductLineFilter(lineId);
      if (targetVersionId) setSelectedId(targetVersionId);
      if (targetTab === 'detail') {
        setMode('list');
        setShowDetail(true);
      }
      if (lineId || targetTab || targetVersionId) {
        sessionStorage.removeItem('shichuang.productLineFilter');
        sessionStorage.removeItem('shichuang.productLineTargetTab');
        sessionStorage.removeItem('shichuang.productLineTargetVersionId');
      }
    };
    consumeProductLineContext();
    window.addEventListener('shichuang:product-line-context', consumeProductLineContext);
    return () => window.removeEventListener('shichuang:product-line-context', consumeProductLineContext);
  }, []);

  const selectedProductLineName = productLines.find((line) => line.id === productLineFilter)?.name;
  const visibleVersions = useMemo(
    () =>
      productLineFilter === 'all'
        ? versions
        : versions.filter((version) => version.productLineId === productLineFilter || version.productLineName === selectedProductLineName),
    [productLineFilter, selectedProductLineName, versions]
  );

  useEffect(() => {
    if (visibleVersions.length && !visibleVersions.some((version) => version.id === selectedId)) {
      setSelectedId(visibleVersions[0].id);
    }
  }, [selectedId, visibleVersions]);

  useEffect(() => {
    if (!planningSearchOpen && !planningFilterOpen) return;
    const closeSearch = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (planningSearchOpen && !target.closest('[data-planning-search]')) setPlanningSearchOpen(false);
      if (planningFilterOpen && !target.closest('[data-planning-filter]')) setPlanningFilterOpen(false);
    };
    document.addEventListener('click', closeSearch);
    return () => document.removeEventListener('click', closeSearch);
  }, [planningFilterOpen, planningSearchOpen]);

  const filteredVersions = useMemo(
    () =>
      visibleVersions.filter((version) => {
        const matchesQuery = `${version.name} ${version.code || ''}`.toLowerCase().includes(query.toLowerCase());
        return matchesQuery && (status === 'all' || normalizeVersionStatus(version.status, version.statusPhase) === status) && (ownerFilter === 'all' || (version.ownerName || '未分配') === ownerFilter);
      }),
    [ownerFilter, query, status, visibleVersions]
  );
  const pagedVersions = useMemo(
    () => filteredVersions.slice((listPage - 1) * listPageSize, listPage * listPageSize),
    [filteredVersions, listPage, listPageSize]
  );

  useEffect(() => {
    setListPage(1);
  }, [ownerFilter, productLineFilter, query, status]);

  useEffect(() => {
    const pageCount = Math.max(1, Math.ceil(filteredVersions.length / listPageSize));
    if (listPage > pageCount) setListPage(pageCount);
  }, [filteredVersions.length, listPage, listPageSize]);

  const selectedVersion =
    visibleVersions.find((version) => version.id === selectedId) || filteredVersions[0] || visibleVersions[0];
  const selectedVersionProductLineId = selectedVersion?.productLineId
    || productLines.find((line) => line.name === selectedVersion?.productLineName)?.id
    || (productLineFilter !== 'all' ? productLineFilter : '');
  const planningLineIdsKey = (productLineFilter === 'all' ? productLines.map((line) => line.id) : [productLineFilter]).join(',');

  useEffect(() => {
    setTestItems([]);
    setTestItemsError(false);
    if (!showDetail || !selectedVersionProductLineId || !sessionStorage.getItem('shichuang.session.token')) return;
    let active = true;
    const loadTestItems = async () => {
      const pageSize = 100;
      const items: UnifiedWorkItem[] = [];
      let page = 1;
      let total = 0;
      do {
        const result = await productRepository.workItems(selectedVersionProductLineId, 'test', '', { page, pageSize });
        items.push(...result.page.items);
        total = result.page.total;
        page += 1;
        if (!result.page.items.length) break;
      } while (items.length < total && page <= 100);
      if (active) setTestItems(items);
    };
    loadTestItems().catch(() => { if (active) setTestItemsError(true); });
    return () => { active = false; };
  }, [selectedVersionProductLineId, showDetail, testItemsReloadKey]);

  useEffect(() => {
    if ((!showDetail && mode !== 'planning') || !sessionStorage.getItem('shichuang.session.token')) return;
    let active = true;
    const load = async () => {
      const items: UnifiedWorkItem[] = [];
      const lineIds = showDetail ? [selectedVersionProductLineId] : planningLineIdsKey.split(',');
      for (const lineId of lineIds.filter(Boolean)) {
        items.push(...await productRepository.iterationTimeline(lineId));
      }
      if (active) setRecentItems(items);
    };
    load().catch(() => { if (active) addToast('error', '工作项列表刷新失败'); });
    return () => { active = false; };
  }, [showDetail, mode, planningLineIdsKey, selectedVersionProductLineId, workItemsReloadKey]);

  useEffect(() => {
    if (!createTaskKind || !selectedVersionProductLineId) return;
    let active = true;
    setCreateTypesLoading(true);
    setCreateTypesError(false);
    productRepository.workItemTypes(selectedVersionProductLineId, ({ requirement: '需求', dev: '研发', test: '测试', bug: '缺陷' } as const)[createTaskKind])
      .then((items) => { if (active) { const enabled = items.filter((item) => item.enabled); setCreateTypes(enabled); setCreateTypeId(enabled.find((item) => item.isDefault)?.id || ''); } })
      .catch(() => { if (active) setCreateTypesError(true); })
      .finally(() => { if (active) setCreateTypesLoading(false); });
    return () => { active = false; };
  }, [createTaskKind, selectedVersionProductLineId]);

  const selectedRequirements = useMemo(
    () =>
      selectedVersion
        ? requirementTasks.filter(
            (item) =>
              item.versionId === selectedVersion.id ||
              versionMatches(selectedVersion, item.versionName) ||
              selectedVersion.linkedRequirementIds?.includes(item.id)
          )
        : [],
    [requirementTasks, selectedVersion]
  );
  const selectedDevTasks = useMemo(
    () => (selectedVersion ? devTasks.filter((item) => versionMatches(selectedVersion, item.versionName)) : []),
    [devTasks, selectedVersion]
  );
  const selectedBugs = useMemo(
    () => (selectedVersion ? bugs.filter((item) => versionMatches(selectedVersion, item.versionName)) : []),
    [bugs, selectedVersion]
  );
  const planningItems = useMemo<PlanningItem[]>(() => {
    const items: PlanningItem[] = [
    ...recentItems.map((item) => {
      const source = { ...item, workItemTypeId: item.taskTypeId || undefined, status: item.status?.name || '未设置', ownerName: item.assigneeName || '', versionId: item.versionId || '', versionName: selectedVersion?.id === item.versionId ? selectedVersion.name : '', productLineName: selectedVersion?.productLineName || '', description: '', dueDate: item.dueDate || '', estimatedHours: item.estimatedHours || 0 } as RequirementTask;
      return { id: item.id, kind: item.category as PlanningKind, title: item.title, ownerName: source.ownerName, creatorName: item.creatorName, createdAt: item.createdAt, estimatedHours: item.estimatedHours || 0, actualHours: item.actualHours || 0, priority: item.priority || '中', status: source.status, productLineId: item.productLineId, versionId: item.versionId || undefined, versionName: source.versionName, source };
    }),
    ...requirementTasks.map((item) => ({ id: item.id, kind: 'requirement' as const, title: item.title, ownerName: item.ownerName || '', creatorName: item.creatorName, createdAt: item.createdAt, estimatedHours: item.estimatedHours || 0, actualHours: item.actualHours || 0, priority: item.priority || '中', status: item.status, productLineId: item.productLineId, versionId: item.versionId, versionName: item.versionName, source: item })),
    ...designTasks.map((item) => ({ id: item.id, kind: 'design' as const, title: item.title, ownerName: item.ownerName || '', creatorName: item.creatorName, createdAt: item.createdAt, estimatedHours: item.estimatedHours || 0, actualHours: item.actualHours || 0, priority: item.priority || '中', status: item.status, productLineId: item.productLineId, versionId: item.versionId, versionName: item.versionName, source: item })),
    ...bugs.map((item) => ({ id: item.id, kind: 'bug' as const, title: item.title, ownerName: item.ownerName || item.assignee || '', creatorName: item.creatorName || item.creator, createdAt: item.createdAt, estimatedHours: (item as DefectBug & { estimatedHours?: number }).estimatedHours || 0, actualHours: (item as DefectBug & { actualHours?: number }).actualHours || 0, priority: item.priority || '中', status: item.status, productLineId: item.productLineId, versionId: (item as DefectBug & { versionId?: string }).versionId, versionName: item.versionName, source: item })),
    ...devTasks.map((item) => ({ id: item.id, kind: 'dev' as const, title: item.title, ownerName: item.developer || '', creatorName: (item as DevTask & { creatorName?: string }).creatorName, createdAt: (item as DevTask & { createdAt?: string }).createdAt, estimatedHours: item.estimatedHours || 0, actualHours: item.spentHours || 0, priority: item.priority || '中', status: item.status, productLineId: (item as DevTask & { productLineId?: string }).productLineId, versionId: (item as DevTask & { versionId?: string }).versionId, versionName: item.versionName, source: item })),
    ...testItems.map((item) => {
      const source = { ...item, workItemTypeId: item.taskTypeId || undefined, status: item.status?.name || '未设置', ownerName: item.assigneeName || '', versionId: item.versionId || '', versionName: selectedVersion?.id === item.versionId ? selectedVersion.name : '', productLineName: selectedVersion?.productLineName || '', description: '', dueDate: item.dueDate || '', estimatedHours: item.estimatedHours || 0 } as RequirementTask;
      return { id: item.id, kind: item.category as PlanningKind, title: item.title, ownerName: source.ownerName, creatorName: item.creatorName, createdAt: item.createdAt, estimatedHours: item.estimatedHours || 0, actualHours: item.actualHours || 0, priority: item.priority || '中', status: source.status, productLineId: item.productLineId, versionId: item.versionId || undefined, versionName: source.versionName, source };
    })
    ];
    const unique = new Map<string, PlanningItem>();
    for (const item of items) {
      if (!(item.kind in planningKindLabel) || unique.has(workItemKey(item))) continue;
      unique.set(workItemKey(item), item);
    }
    return [...unique.values()];
  }, [bugs, designTasks, devTasks, recentItems, requirementTasks, selectedVersion, testItems]);

  const unplannedWorkItems = useMemo(() => planningItems.filter((item) => {
    const matchesLine = productLineFilter === 'all' || item.productLineId === productLineFilter;
    const matchesText = !planningQuery.trim() || `${item.title} ${item.ownerName}`.toLowerCase().includes(planningQuery.trim().toLowerCase());
    const matchesKind = planningKinds.includes(item.kind);
    const matchesStatus = !planningStatuses.length || planningStatuses.includes(item.status);
    const matchesPriority = !planningPriorities.length || planningPriorities.includes(item.priority);
    const matchesOwner = !planningOwners.length || planningOwners.includes(item.ownerName);
    return !item.versionId && !item.versionName && matchesLine && matchesText && matchesKind && matchesStatus && matchesPriority && matchesOwner;
  }), [planningItems, planningKinds, planningOwners, planningPriorities, planningQuery, planningStatuses, productLineFilter]);
  const unplannedCandidates = planningItems.filter((item) => !item.versionId && !item.versionName && (productLineFilter === 'all' || item.productLineId === productLineFilter));
  const unplannedRoots = workItemHierarchy(unplannedCandidates, unplannedWorkItems).roots;
  const plannableRoots = unplannedRoots.filter((item) => !parentWorkItemId(item));

  const plannedWorkItems = useMemo(() => {
    const result = new Map<string, PlanningItem[]>();
    planningItems.forEach((item) => {
      const key = item.versionId || (item.versionName ? visibleVersions.find((version) => versionMatches(version, item.versionName))?.id : undefined);
      if (key) result.set(key, [...(result.get(key) || []), item]);
    });
    return result;
  }, [planningItems, visibleVersions]);

  const versionStats = useMemo(() => {
    const stats = new Map<string, { completed: number; total: number }>();
    visibleVersions.forEach((version) => stats.set(version.id, workItemStats(plannedWorkItems.get(version.id) || [])));
    return stats;
  }, [plannedWorkItems, visibleVersions]);

  const getVersionStats = (version: VersionIteration) => versionStats.get(version.id) || { completed: 0, total: 0 };

  const filterOptions = useMemo(() => ({
    statuses: Array.from(new Set(planningItems.map((item) => item.status).filter(Boolean))),
    priorities: Array.from(new Set(planningItems.map((item) => item.priority).filter(Boolean))),
    owners: Array.from(new Set(planningItems.map((item) => item.ownerName).filter(Boolean)))
  }), [planningItems]);

  const openDetail = (version: VersionIteration) => {
    setSelectedId(version.id);
    setProductLineFilter(version.productLineId || 'all');
    setMode('list');
    setShowDetail(true);
    setDetailSection('workItems');
    setSelectedTaskIds([]);
  };

  const openCreateVersion = () => {
    setEditingVersionId(null);
    setFormProductLineId('');
    setIsModalOpen(true);
  };

  const openCreateVersionForProductLine = () => {
    setEditingVersionId(null);
    setFormProductLineId(selectedVersion?.productLineId || (productLineFilter !== 'all' ? productLineFilter : ''));
    setIsModalOpen(true);
  };

  const openEditVersion = (version: VersionIteration) => {
    setEditingVersionId(version.id);
    setFormProductLineId(version.productLineId || '');
    setIsModalOpen(true);
  };

  const confirmDeleteVersion = (version: VersionIteration) => {
    showDeleteConfirm({
      title: `确认删除迭代“${version.name}”？`,
      content: '删除后不可恢复，请确认是否继续。',
      onOk: () => {
        deleteVersion(version.id);
        if (selectedId === version.id) setSelectedId('');
      },
    });
  };

  const openWorkItemDetail = (item: PlanningItem) => {
    const fallbackDetail = item.source as unknown as Record<string, unknown>;
    const lineId = item.productLineId || selectedVersion?.productLineId || '';
    if (!lineId || !item.id) { setDirectWorkItem(fallbackDetail); return; }
    const loadDetail = productRepository.workItemDetail;
    if (typeof loadDetail !== 'function') {
      setDirectWorkItem(fallbackDetail);
      return;
    }
    void loadDetail(lineId, item.id)
      .then((detail) => setDirectWorkItem({ ...fallbackDetail, ...(detail as Record<string, unknown>), productLineId: (detail as Record<string, unknown>).productLineId || lineId, __planningKind: item.kind }))
      .catch((error) => addToast('error', '工作项详情加载失败', error instanceof Error ? error.message : '请稍后重试'));
  };
  const openRequirement = (item: RequirementTask) => { const target = planningItems.find((candidate) => candidate.kind === 'requirement' && candidate.id === item.id); if (target) openWorkItemDetail(target); };
  const openDesignTask = (item: RequirementTask) => { const target = planningItems.find((candidate) => candidate.kind === 'design' && candidate.id === item.id); if (target) openWorkItemDetail(target); };
  const openTestTask = (item: RequirementTask) => { const target = planningItems.find((candidate) => candidate.kind === 'test' && candidate.id === item.id); if (target) openWorkItemDetail(target); };
  const openDevTask = (item: DevTask) => { const target = planningItems.find((candidate) => candidate.kind === 'dev' && candidate.id === item.id); if (target) openWorkItemDetail(target); };
  const openBug = (item: DefectBug) => { const target = planningItems.find((candidate) => candidate.kind === 'bug' && candidate.id === item.id); if (target) openWorkItemDetail(target); };

  const changeVersionStatus = async (nextStatus: string) => {
    if (!nextStatus) { addToast('error', '迭代状态未配置', '请先在系统与组织-产研模板中配置对应阶段的启用状态'); return; }
    if (!selectedVersion) return;
    const saved = await updateVersion(selectedVersion.id, { status: nextStatus });
    if (saved) addToast('success', '迭代状态已更新', `${selectedVersion.name}：${nextStatus}`);
  };

  const renderProductNavigation = () => <ProductNavigation productLines={productLines} value={productLineFilter} onChange={setProductLineFilter} />;

  const assignPlanningItem = async (item: PlanningItem, version: VersionIteration) => {
    if (parentWorkItemId(item)) { addToast('warning', '请通过主任务规划子任务'); return; }
    if (assigningRequirementId) return;
    setAssigningRequirementId(item.id);
    const saved = item.kind === 'requirement' && !assignWorkItemToVersion
      ? await assignRequirementToVersion(item.id, version.id)
      : await assignWorkItemToVersion?.(item.kind, item.id, version.id);
    setAssigningRequirementId(null);
    setDraggedWorkItem(null);
    setDropTargetVersionId(null);
    if (saved) { setWorkItemsReloadKey((value) => value + 1); addToast('success', '工作项已加入迭代', `${item.title} → ${version.name}`); }
  };

  const unassignPlanningItem = async (item: PlanningItem, version: VersionIteration) => {
    if (parentWorkItemId(item)) { addToast('warning', '请通过主任务移出子任务'); return; }
    const saved = await unassignWorkItemFromVersion?.(item.kind, item.id, version.id);
    if (saved) { setWorkItemsReloadKey((value) => value + 1); addToast('success', '工作项已移出迭代', item.title); }
  };

  const tabButton = (key: ViewMode, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => { setMode(key); setShowDetail(false); }}
      className={`inline-flex h-11 items-center justify-center gap-2 border-b-2 px-5 text-sm font-semibold transition-all ${
        mode === key
          ? 'border-[var(--primary)] text-[var(--active-text)]'
          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}{label}
    </button>
  );

  const createIterationTask = (kind: 'requirement' | 'design' | 'dev' | 'test' | 'bug', parent?: PlanningItem) => {
    if (!selectedVersion || !selectedVersionProductLineId) return;
    setCreateTitle('');
    setCreateDescription('');
    setCreateTypeId('');
    setCreateTypes([]);
    setCreatePriority('P2');
    setChildParentItem(parent || null);
    setCreateTaskKind(kind);
  };

  const saveIterationTask = async () => {
    if (!createTaskKind || !selectedVersion || !selectedVersionProductLineId || createSaving) return;
    if (!createTitle.trim() || !createTypeId) {
      addToast('error', '请填写任务标题并选择已启用的任务类型');
      return;
    }
    setCreateSaving(true);
    try {
      await productRepository.createWorkItem({
        requestId: `iteration-${createTaskKind}-${crypto.randomUUID()}`,
        productLineId: selectedVersionProductLineId,
        versionId: selectedVersion.id,
        category: createTaskKind,
        taskTypeId: createTypeId,
        title: createTitle.trim(),
        description: createDescription,
        priority: createPriority
        ,parentWorkItemId: childParentItem?.id
      });
      setCreateTaskKind(null);
      setChildParentItem(null);
      addToast('success', '迭代任务已创建');
    } catch (error) {
      addToast('error', '迭代任务保存失败', error instanceof Error ? error.message : '请稍后重试');
      setCreateSaving(false);
      return;
    }
    try {
      const result = await productRepository.workItems(selectedVersionProductLineId, createTaskKind, '', { page: 1, pageSize: 100 });
      const items = [...result.page.items];
      let page = 2;
      while (items.length < result.page.total && page <= 100) {
        const next = await productRepository.workItems(selectedVersionProductLineId, createTaskKind, '', { page, pageSize: 100 });
        if (!next.page.items.length) break;
        items.push(...next.page.items);
        page += 1;
      }
      setRecentItems((current) => [...current.filter((item) => item.category !== createTaskKind || item.productLineId !== selectedVersionProductLineId), ...items.filter((item) => item.versionId === selectedVersion.id)]);
    } catch (error) {
      addToast('error', '任务已创建，但列表刷新失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setCreateSaving(false);
    }
  };

  const operatePlanningItem = async (key: string, item: PlanningItem) => {
    const persisted = recentItems.find((candidate) => candidate.id === item.id && candidate.category === item.kind);
    const source = { ...(item.source as PlanningItem['source'] & Record<string, unknown>), ...(persisted || {}) } as PlanningItem['source'] & Record<string, unknown>;
    const productLineId = item.productLineId || selectedVersionProductLineId;
    if (key === 'child') {
      if (item.kind === 'requirement' || item.kind === 'dev' || item.kind === 'test') createIterationTask(item.kind, item);
      else addToast('warning', '该工作项类型暂不支持直接添加子任务');
      return;
    }
    if (!productLineId) {
      addToast('warning', '工作项缺少产品，无法操作');
      return;
    }
    if (key === 'copy' || key === 'copy-link') {
      const category = item.kind === 'requirement' || item.kind === 'design' || item.kind === 'dev' || item.kind === 'test' || item.kind === 'bug' ? item.kind : undefined;
      const taskTypeId = String(source.workItemTypeId || source.taskTypeId || '');
      if (!category || !taskTypeId) {
        addToast('warning', '该任务尚未绑定工作项类型，无法复制');
        return;
      }
      try {
        const created = await productRepository.createWorkItem({
          requestId: `copy-${item.id}-${Date.now()}`,
          productLineId,
          category,
          taskTypeId,
          title: `${item.title} - 副本`,
          description: String(source.description || ''),
          versionId: item.versionId || selectedVersion?.id || undefined,
          priority: String(source.priority || 'P2')
        });
        if (key === 'copy-link') await productRepository.createWorkItemRelation(productLineId, item.id, String(created.id));
        const createdItem = { ...created, category, productLineId, taskTypeId, versionId: item.versionId || selectedVersion?.id, title: `${item.title} - 副本`, status: created.status || { name: item.status }, priority: item.priority, assigneeName: item.ownerName, creatorName: item.creatorName, estimatedHours: 0, actualHours: 0 } as UnifiedWorkItem;
        setRecentItems((current) => [createdItem, ...current]);
        addToast('success', key === 'copy-link' ? '任务已复制并建立关联' : '任务已复制');
      } catch (error) {
        addToast('error', key === 'copy-link' ? '复制并关联失败' : '复制任务失败', error instanceof Error ? error.message : '请稍后重试');
      }
      return;
    }
    if (key === 'delete') {
      const revision = Number(source.revision);
      if (!Number.isFinite(revision)) {
        addToast('warning', '该任务缺少版本信息，无法删除');
        return;
      }
      Modal.confirm({
        title: `删除任务“${item.title}”？`,
        content: '任务将被软删除；存在子任务时系统会阻止删除。',
        okText: '删除',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await productRepository.deleteWorkItem(productLineId, item.id, revision);
            setRemovedTaskIds((current) => [...current, `${item.kind}:${item.id}`]);
            setSelectedTaskIds((current) => current.filter((id) => id !== `${item.kind}:${item.id}`));
            addToast('success', '任务已删除');
          } catch (error) {
            addToast('error', '任务删除失败', error instanceof Error ? error.message : '请稍后重试');
          }
        }
      });
    }
  };

  const renderList = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-[var(--bg-surface-soft)] text-[11px] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-3 py-3 font-medium">版本号</th>
                <th className="px-3 py-3 font-medium">状态</th>
                <th className="px-3 py-3 font-medium">起止时间</th>
                <th className="px-3 py-3 font-medium">所属产品</th>
                <th className="px-3 py-3 font-medium">负责人</th>
                <th className="px-3 py-3 font-medium">完成度</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {pagedVersions.map((version) => {
                const stats = getVersionStats(version);
                const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
                return (
                  <tr key={version.id} className="hover:bg-[var(--bg-surface-soft)]">
                    <td className="max-w-[320px] px-4 py-3.5">
                      <button type="button" onClick={() => openDetail(version)} className="text-left font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
                        <span className="block truncate">{version.name}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-[var(--text-body)]">{version.code || '--'}</td>
                    <td className="px-3 py-3"><StatusTag status={normalizeVersionStatus(version.status, version.statusPhase)} /></td>
                    <td className="px-3 py-3 text-[var(--text-body)]">{version.startDate || '--'} ~ {version.endDate || version.releaseDate || '--'}</td>
                    <td className="max-w-48 px-3 py-3 text-[var(--text-body)]"><span className="block truncate" title={version.productLineName || '未关联产品'}>{version.productLineName || '未关联产品'}</span></td>
                    <td className="px-3 py-3"><PersonIdentity name={version.ownerName} emptyLabel="未分配" variant="list" /></td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-44 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-main)]">
                          <div className="h-full bg-[var(--primary)]" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)]">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => openEditVersion(version)} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[var(--primary)] hover:bg-[var(--bg-surface-soft)]" title="修改迭代"><Edit className="h-3.5 w-3.5" />修改</button>
                        <button type="button" onClick={() => confirmDeleteVersion(version)} className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[var(--danger)] hover:bg-[var(--bg-surface-soft)]" title="删除迭代"><Trash2 className="h-3.5 w-3.5" />删除</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredVersions.length === 0 && <EmptyState icon={<Search className="h-5 w-5" />} title="暂无匹配迭代" description="请调整搜索关键词或状态筛选条件。" />}
        <Pagination
          total={filteredVersions.length}
          page={listPage}
          pageSize={listPageSize}
          onPageChange={setListPage}
          onPageSizeChange={(size) => { setListPageSize(size); setListPage(1); }}
        />
      </div>
    </div>
  );

  const renderDetail = () => {
    const selectedItems: PlanningItem[] = selectedVersion ? [...new Map<string, PlanningItem>((plannedWorkItems.get(selectedVersion.id) || []).map((item): [string, PlanningItem] => [`${item.kind}:${item.id}`, item])).values()].filter((item) => !removedTaskIds.includes(`${item.kind}:${item.id}`)) : [];
    const selectedStats = workItemStats(selectedItems);
    const estimatedHours = selectedItems.reduce((total, item) => total + item.estimatedHours, 0);
    const actualHours = selectedItems.reduce((total, item) => total + item.actualHours, 0);
    type MemberStat = { name: string; completed: number; total: number; estimated: number; actual: number };
    const memberStatsMap = selectedItems.reduce<Map<string, MemberStat>>((result, item) => {
      const name = item.ownerName || '未分配';
      const current = result.get(name) || { name, completed: 0, total: 0, estimated: 0, actual: 0 };
      current.total += 1;
      current.completed += completedWorkItemStatuses.has(item.status) ? 1 : 0;
      current.estimated += item.estimatedHours;
      current.actual += item.actualHours;
      result.set(name, current);
      return result;
    }, new Map<string, MemberStat>());
    const memberStats = [...memberStatsMap.values()] as MemberStat[];
    memberStats.sort((a, b) => b.total - a.total || b.estimated - a.estimated);
    const typeStats = (['requirement', 'design', 'dev', 'test', 'bug'] as PlanningKind[]).map((kind) => {
      const items = selectedItems.filter((item) => item.kind === kind);
      return { kind, ...workItemStats(items) };
    });
    const typeProgressClasses: Record<PlanningKind, string> = {
      requirement: 'bg-[var(--primary)]',
      design: 'bg-[var(--accent-purple)]',
      dev: 'bg-[var(--success)]',
      test: 'bg-[var(--warning)]',
      bug: 'bg-[var(--danger)]'
    };
    const normalizedStatus = normalizeVersionStatus(selectedVersion?.status, selectedVersion?.statusPhase);
    const isCompleted = normalizedStatus === '已完成';
    const isRunning = normalizedStatus === '进行中';
    const statusAction = isCompleted
      ? { label: '重开迭代', nextStatus: iterationStatusForPhase('处理中'), icon: <RotateCcw className="h-4 w-4" /> }
      : isRunning
        ? { label: '完成迭代', nextStatus: iterationStatusForPhase('已完成'), icon: <CheckCircle className="h-4 w-4" /> }
        : { label: '开启迭代', nextStatus: iterationStatusForPhase('处理中'), icon: <Play className="h-4 w-4" /> };
    const detailTabs: Array<{ key: DetailTab; label: string; icon: React.ReactNode }> = [
      { key: 'hours', label: '迭代工时', icon: <Calendar className="h-4 w-4" /> },
      { key: 'testReports', label: '测试报告', icon: <Beaker className="h-4 w-4" /> },
      { key: 'review', label: '版本评审', icon: <CheckCircle className="h-4 w-4" /> }
    ];
    const filteredItems = selectedItems.filter((item) =>
      taskKinds.includes(item.kind)
      && (taskStatus === 'all' || item.status === taskStatus)
      && (taskOwner === 'all' || item.ownerName === taskOwner)
      && (!taskFilters.title.trim() || item.title.toLowerCase().includes(taskFilters.title.trim().toLowerCase()))
      && (!taskFilters.status.length || ((taskFilters.operators?.status || 'include') === 'exclude' ? !taskFilters.status.includes(item.status) : taskFilters.status.includes(item.status)))
      && (!taskFilters.owner.length || ((taskFilters.operators?.owner || 'include') === 'exclude' ? !taskFilters.owner.includes(item.ownerName) : taskFilters.owner.includes(item.ownerName)))
      && (!taskFilters.creator.length || ((taskFilters.operators?.creator || 'include') === 'exclude' ? !taskFilters.creator.includes(item.creatorName || '') : taskFilters.creator.includes(item.creatorName || '')))
      && (!taskFilters.version.length || ((taskFilters.operators?.version || 'include') === 'exclude' ? !taskFilters.version.includes(item.versionName || '') : taskFilters.version.includes(item.versionName || '')))
      && (!taskFilters.customer.length || ((taskFilters.operators?.customer || 'include') === 'exclude' ? !taskFilters.customer.includes(String((item.source as unknown as Record<string, unknown>).customerName || '')) : taskFilters.customer.includes(String((item.source as unknown as Record<string, unknown>).customerName || ''))))
      && (!taskFilters.cc.length || ((taskFilters.operators?.cc || 'include') === 'exclude' ? !(taskFilters.cc as string[]).some((value) => ((item.source as unknown as Record<string, unknown>).ccNames as string[] || []).includes(value)) : (taskFilters.cc as string[]).some((value) => ((item.source as unknown as Record<string, unknown>).ccNames as string[] || []).includes(value))))
      && (!taskFilters.createdAt[0] || String(item.createdAt || '').slice(0, 10) >= taskFilters.createdAt[0])
      && (!taskFilters.createdAt[1] || String(item.createdAt || '').slice(0, 10) <= taskFilters.createdAt[1])
      && (!taskFilters.plannedStartDate[0] || String((item.source as unknown as Record<string, unknown>).plannedStartDate || '').slice(0, 10) >= taskFilters.plannedStartDate[0])
      && (!taskFilters.plannedStartDate[1] || String((item.source as unknown as Record<string, unknown>).plannedStartDate || '').slice(0, 10) <= taskFilters.plannedStartDate[1])
      && (!taskOwnerNames.length || taskOwnerNames.includes(item.ownerName))
      && `${item.title} ${item.ownerName} ${item.creatorName || ''} ${item.status}`.toLowerCase().includes(taskQuery.trim().toLowerCase())
    ).sort((a, b) => taskGroupBy === 'none' ? 0 : normalizedTaskGroupValue(a, taskGroupBy).localeCompare(normalizedTaskGroupValue(b, taskGroupBy), 'zh-CN'));
    const taskStatuses = [...new Set(selectedItems.map((item) => item.status).filter(Boolean))];
    const taskOwners = [...new Set([...directoryOwnerNames, ...planningItems.flatMap((item) => [item.ownerName, String((item.source as unknown as Record<string, unknown>).assigneeName || ''), String((item.source as unknown as Record<string, unknown>).assignee || ''), String((item.source as unknown as Record<string, unknown>).developer || '')])])].filter(Boolean);
    const taskCreators = [...new Set(selectedItems.map((item) => item.creatorName).filter(Boolean))];
    const taskVersions = [...new Set(selectedItems.map((item) => item.versionName).filter(Boolean))];
    const taskGroupOptions: Array<[TaskGroupBy, string]> = [['priority', '优先级'], ['status', '状态'], ['owner', '负责人'], ['creator', '创建者'], ['version', '迭代版本'], ['customer', '关联客户'], ['requirementType', '需求类型']];
    const taskGroupEntries = taskGroupBy === 'none'
      ? []
      : [...new Set(filteredItems.map((item) => normalizedTaskGroupValue(item, taskGroupBy)))].map((value) => ({ value, count: filteredItems.filter((item) => normalizedTaskGroupValue(item, taskGroupBy) === value).length }));
    const effectiveTaskGroupValue = taskGroupBy === 'none' ? '' : taskGroupEntries.some((entry) => entry.value === taskGroupSelection) ? taskGroupSelection : taskGroupEntries[0]?.value || '';
    const visibleTaskItems = taskGroupBy === 'none' || !effectiveTaskGroupValue ? filteredItems : filteredItems.filter((item) => normalizedTaskGroupValue(item, taskGroupBy) === effectiveTaskGroupValue);
    const taskTree = workItemHierarchy(selectedItems, visibleTaskItems);
    const pagedItems = taskTree.roots.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize);
    const emptyTaskFilters = (): UnifiedFilterState => ({ title: '', status: [], owner: [], creator: [], customer: [], version: [], cc: [], createdAt: ['', ''], plannedStartDate: ['', ''], operators: {}, dateOperators: {} });
    const appliedTaskFilterLabels = [
      taskFilters.title.trim() ? { key: 'title', text: `标题：${taskFilters.title.trim()}` } : null,
      ...(['status', 'owner', 'creator', 'customer', 'cc'] as const).flatMap((key) => taskFilters[key].map((value) => ({ key: `${key}:${value}`, text: `${({ status: '状态', owner: '负责人', creator: '创建人', customer: '关联客户', cc: '参与人' } as const)[key]}：${value}` }))),
      taskFilters.createdAt.some(Boolean) ? { key: 'createdAt', text: `创建时间：${taskFilters.createdAt.filter(Boolean).join(' ~ ')}` } : null,
      taskFilters.plannedStartDate.some(Boolean) ? { key: 'plannedStartDate', text: `计划开始时间：${taskFilters.plannedStartDate.filter(Boolean).join(' ~ ')}` } : null
    ].filter(Boolean) as Array<{ key: string; text: string }>;
    const clearTaskFilter = (key: string) => {
      if (key === 'title') {
        const next = { ...taskFilters, title: '' };
        setTaskFilters(next);
        setTaskFilterDraft(next);
      }
      else if (key === 'createdAt' || key === 'plannedStartDate') {
        const next = { ...taskFilters, [key]: ['', ''] as [string, string] };
        setTaskFilters(next);
        setTaskFilterDraft(next);
      }
      else {
        const [field, value] = key.split(':') as ['status' | 'owner' | 'creator' | 'customer' | 'cc', string];
        const next = { ...taskFilters, [field]: taskFilters[field].filter((item) => item !== value) };
        setTaskFilters(next);
        setTaskFilterDraft(next);
      }
      setTaskPage(1);
    };
    return (
      <div className={`version-detail-layout grid min-h-[620px] ${directoryCollapsed ? 'grid-cols-[128px_minmax(0,1fr)]' : 'grid-cols-[240px_minmax(0,1fr)]'} overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]`}>
        <aside className="flex min-h-0 flex-col border-r border-[var(--border-main)] bg-[var(--bg-surface-soft)]">
          {directoryCollapsed ? <>
          <button type="button" onClick={() => setShowDetail(false)} className={`flex h-10 shrink-0 items-center gap-2 border-b border-[var(--border-main)] text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--active-text)] ${directoryCollapsed ? 'justify-center px-2' : 'px-4'}`} aria-label={directoryCollapsed ? '返回' : '返回迭代列表'}><ChevronLeft className="h-4 w-4" />{directoryCollapsed ? '返回' : '返回迭代列表'}</button>
          <div className={`flex h-12 shrink-0 items-center border-b border-[var(--border-main)] ${directoryCollapsed ? 'justify-center px-2' : 'px-4'}`} title="迭代目录"><span className="font-semibold text-[var(--text-primary)]">{directoryCollapsed ? '目录' : '迭代目录'}</span><span className={directoryCollapsed ? 'ml-1 text-[11px] text-[var(--text-muted)]' : 'ml-3 text-[11px] text-[var(--text-muted)]'}>（{visibleVersions.length}）</span>{!directoryCollapsed && <button type="button" aria-label="新建迭代" onClick={openCreateVersionForProductLine} className="ml-auto rounded bg-[var(--primary)]/10 p-1.5 text-[var(--primary)] hover:bg-[var(--primary)]/15"><Plus className="h-4 w-4" /></button>}</div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            <div className="space-y-2">
              {visibleVersions.map((version) => {
                const active = selectedVersion?.id === version.id;
                return <button
                  type="button"
                  key={version.id}
                  aria-label={version.code || version.name}
                  onClick={() => { setSelectedId(version.id); setDetailSection('workItems'); setTaskQuery(''); setTaskStatus('all'); setTaskOwner('all'); setSelectedTaskIds([]); }}
                  className={`mb-1 flex w-full flex-col items-center gap-1 rounded-md border px-2 py-2 text-center transition ${active ? 'border-[var(--primary)] bg-[var(--bg-surface)] shadow-sm' : 'border-transparent hover:border-[var(--border-main)] hover:bg-[var(--bg-surface)]'}`}
                >
                  <span className="w-full truncate text-xs font-semibold text-[var(--text-primary)]" title={version.code || version.name}>{version.code || version.name}</span>
                  <StatusTag status={normalizeVersionStatus(version.status, version.statusPhase)} />
                </button>;
              })}
            </div>
          </div>
          </> : <>
          <button type="button" onClick={() => setShowDetail(false)} className="flex h-10 items-center gap-2 border-b border-[var(--border-main)] px-4 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--active-text)]"><ChevronLeft className="h-4 w-4" />返回迭代列表</button>
          <div className="flex h-12 items-center border-b border-[var(--border-main)] px-4">
            <span className="font-semibold text-[var(--text-primary)]">迭代目录</span>
            <span className="ml-3 text-[11px] text-[var(--text-muted)]">{visibleVersions.length} 个</span>
            <button type="button" aria-label="新建迭代" onClick={openCreateVersionForProductLine} className="ml-auto rounded bg-[var(--primary)]/10 p-1.5 text-[var(--primary)] hover:bg-[var(--primary)]/15"><Plus className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {visibleVersions.map((version) => {
              const stats = getVersionStats(version);
              const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
              const active = selectedVersion?.id === version.id;
              return (
                <button
                  type="button"
                  key={version.id}
                  onClick={() => { setSelectedId(version.id); setDetailSection('workItems'); setTaskQuery(''); setTaskStatus('all'); setTaskOwner('all'); setSelectedTaskIds([]); }}
                  className={`mb-1 w-full rounded-md border p-3 text-left transition ${active ? 'border-[var(--primary)] bg-[var(--bg-surface)] shadow-sm' : 'border-transparent hover:border-[var(--border-main)] hover:bg-[var(--bg-surface)]'}`}
                >
                  <div className="truncate font-medium text-[var(--text-primary)]">{version.name}</div>
                  <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{version.productLineName || '未关联产品'}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-main)]"><div className="h-full bg-[var(--primary)]" style={{ width: `${progress}%` }} /></div>
                    <span className="text-[10px] text-[var(--text-muted)]">{progress}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between"><StatusTag status={normalizeVersionStatus(version.status, version.statusPhase)} /><span className="text-[10px] text-[var(--text-muted)]">{stats.completed}/{stats.total}</span></div>
                </button>
              );
            })}
          </div>
          </>}
          <button type="button" aria-label={directoryCollapsed ? '展开迭代目录' : '收起迭代目录'} onClick={() => setDirectoryCollapsed((value) => !value)} className="mt-auto flex h-10 shrink-0 items-center justify-center gap-2 border-t border-[var(--border-main)] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--active-text)]">{directoryCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}{!directoryCollapsed && '收起目录'}</button>
        </aside>
        <section className="min-w-0 bg-[var(--bg-surface)]">
          {selectedVersion ? (
            <>
              <div className="border-b border-[var(--border-main)] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-3"><h2 className="max-w-80 truncate text-lg font-bold text-[var(--text-primary)]" title={selectedVersion.name}>{selectedVersion.name}</h2><span className="text-[var(--text-muted)]">|</span><div role="tablist" aria-label="迭代详情分类" className="inline-flex rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-1">{([['info', '迭代信息'], ['workItems', '迭代任务']] as const).map(([key, label]) => <button type="button" role="tab" aria-selected={detailSection === key} key={key} onClick={() => setDetailSection(key)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${detailSection === key ? 'bg-[var(--bg-surface)] text-[var(--active-text)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{label}</button>)}</div><StatusTag status={normalizedStatus} /></div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void changeVersionStatus(statusAction.nextStatus)} className={secondaryButton}>{statusAction.icon}{statusAction.label}</button>
                  </div>
                </div>
              </div>
              {detailSection === 'info' && <><div className="grid gap-3 border-b border-[var(--border-main)] p-5 lg:grid-cols-2">
                <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">基本信息</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Metric label="迭代负责人" value={<span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-[var(--text-muted)]" />{selectedVersion.ownerName || '未分配'}</span>} />
                    <Metric label="所属产品" value={selectedVersion.productLineName || productLines.find((line) => line.id === selectedVersion.productLineId)?.name || '未关联产品'} />
                    <Metric label="迭代状态" value={normalizedStatus} />
                    <Metric label="起止时间" value={<span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />{selectedVersion.startDate || '--'} ~ {selectedVersion.endDate || selectedVersion.releaseDate || '--'}</span>} />
                    <Metric label="完成度" value={`${selectedStats.completed}/${selectedStats.total}`} />
                  </div>
                </section>
                <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4">
                  <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[var(--text-primary)]">工作概况</h3><button type="button" onClick={() => { setMode('planning'); setShowDetail(false); }} className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">进入规划</button></div>
                  <div className="mt-4 space-y-3">
                    {typeStats.map((item) => {
                      const percentage = item.total ? Math.round((item.completed / item.total) * 100) : 0;
                      return <div key={item.kind} className="flex items-center gap-2 text-xs"><span className="w-10 text-[var(--text-muted)]">{planningKindLabel[item.kind]}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border-main)]"><div className={`h-full ${typeProgressClasses[item.kind]}`} style={{ width: `${percentage}%` }} /></div><span className="w-12 text-right text-[var(--text-muted)]">{item.completed}/{item.total}</span></div>;
                    })}
                  </div>
                </section>
              </div>
              <div className="flex items-center gap-1 border-b border-[var(--border-main)] px-5">
                {detailTabs.map((tab) => (
                  <button type="button" key={tab.key} onClick={() => setDetailTab(tab.key)} className={`inline-flex h-11 items-center gap-1.5 border-b-2 px-3 text-xs font-semibold ${detailTab === tab.key ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                    {tab.icon}{tab.label}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {detailTab === 'hours' && <div className="space-y-3"><div className="grid gap-3 lg:grid-cols-2"><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h3 className="text-sm font-semibold text-[var(--text-primary)]">工作项分布</h3><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3"><Metric label="工作项总数" value={`${selectedStats.total} 个`} /><Metric label="工作项完成数" value={`${selectedStats.completed} 个`} /><Metric label="工作项未完成数" value={`${selectedStats.total - selectedStats.completed} 个`} /></div></section><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h3 className="text-sm font-semibold text-[var(--text-primary)]">迭代工时概览</h3><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3"><Metric label="预计工时" value={`${estimatedHours} 小时`} /><Metric label="实际工时" value={`${actualHours} 小时`} /><Metric label="预计偏差" value={`${actualHours - estimatedHours} 小时`} /></div></section></div><div className="grid gap-3 lg:grid-cols-2"><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--text-primary)]">工作项排名</h3><div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--primary)]" />完成</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--active-text)]/40" />总量</span></div></div><div className="mt-5 space-y-4">{memberStats.length ? memberStats.map((member) => <div key={`work-${member.name}`} className="grid grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-2 text-xs"><span className="truncate text-[var(--text-muted)]" title={member.name}>{member.name}</span><div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-[var(--active-text)]/20"><div className="h-full rounded-full bg-[var(--active-text)]/45" style={{ width: `${selectedStats.total ? (member.total / selectedStats.total) * 100 : 0}%` }}><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${member.total ? (member.completed / member.total) * 100 : 0}%` }} /></div></div></div><span className="text-right text-[var(--text-muted)]">{member.completed}/{member.total}</span></div>) : <p className="py-6 text-center text-xs text-[var(--text-muted)]">暂无成员工作项</p>}</div></section><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--text-primary)]">工时排名</h3><div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--primary)]" />实际工时(小时)</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--active-text)]/40" />预计工时(小时)</span></div></div><div className="mt-5 space-y-4">{memberStats.length ? memberStats.map((member) => <div key={`hours-${member.name}`} className="grid grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-2 text-xs"><span className="truncate text-[var(--text-muted)]" title={member.name}>{member.name}</span><div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-[var(--active-text)]/20"><div className="h-full rounded-full bg-[var(--active-text)]/45" style={{ width: `${estimatedHours ? (member.estimated / estimatedHours) * 100 : 0}%` }}><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${estimatedHours ? (member.actual / estimatedHours) * 100 : 0}%` }} /></div></div></div><span className="text-right text-[var(--text-muted)]">{member.actual}/{member.estimated}</span></div>) : <p className="py-6 text-center text-xs text-[var(--text-muted)]">暂无成员工时</p>}</div></section></div></div>}
                {detailTab === 'testReports' && (selectedVersionProductLineId
                  ? <VersionTestReportPanel productLineId={selectedVersionProductLineId} versionId={selectedVersion.id} versionName={selectedVersion.name} />
                  : <Alert type="error" showIcon title="测试报告加载失败" description="当前迭代未关联有效产品，请先修正迭代归属。" />)}
                {detailTab === 'review' && <EmptyState icon={<CheckCircle className="h-5 w-5" />} title="暂无版本评审" description="当前迭代还没有版本评审记录。" />}
              </div>
              </>}
              {detailSection === 'workItems' && <div className="space-y-3 p-5">
                <div className="flex min-w-0 items-center justify-between gap-3"><span className="min-w-0 truncate font-semibold text-[var(--text-primary)]">全部工作项 · {filteredItems.length}</span><div className="flex min-w-0 items-center gap-2"><span className="flex items-center gap-2 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-2 py-1.5">{([['requirement', '产品'], ['design', '设计'], ['dev', '研发'], ['test', '测试'], ['bug', '缺陷']] as const).map(([kind, label]) => <label key={kind} className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-[var(--text-body)]"><input type="checkbox" checked={taskKinds.includes(kind)} onChange={() => setTaskKinds((current) => current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind])} className="h-3.5 w-3.5 accent-[var(--primary)]" />{label}</label>)}</span><UnifiedWorkItemControls searchOpen={taskSearchOpen} searchDraft={taskSearchDraft} ownerPickerOpen={taskOwnerPickerOpen} ownerNames={taskOwnerNames} ownerOptions={taskOwners} filterOpen={taskFilterOpen} filters={taskFilterDraft} groupOpen={taskGroupOpen} groupQuery={taskGroupQuery} groupBy={taskGroupBy} groupOptions={taskGroupOptions} hideVersionFilter filterPanelTarget={taskFilterTarget} filterOptions={{ status: taskStatuses, owner: taskOwners, creator: taskCreators, customer: [...new Set(selectedItems.map((item) => String((item.source as unknown as Record<string, unknown>).customerName || '')).filter(Boolean))], version: taskVersions, cc: [...new Set(selectedItems.flatMap((item) => ((item.source as unknown as Record<string, unknown>).ccNames as string[] || [])))] }} onSearchOpenChange={setTaskSearchOpen} onSearchDraftChange={(value) => { const normalized = value.includes('@') ? value.replaceAll('@', '') : value; setTaskSearchDraft(normalized); setTaskOwnerPickerOpen(value.includes('@')); }} onSearchApply={() => { setTaskQuery(taskSearchDraft.trim()); setTaskSearchOpen(false); setTaskPage(1); }} onOwnerPickerOpenChange={setTaskOwnerPickerOpen} onOwnerNamesChange={(values) => { setTaskOwnerNames(values); setTaskPage(1); }} onFilterOpenChange={(open) => { if (open) setTaskFilterDraft(taskFilters); setTaskFilterOpen(open); }} onFiltersChange={(value) => { setTaskFilterDraft(value); setTaskPage(1); }} onClearFilters={() => { const empty = emptyTaskFilters(); setTaskFilters(empty); setTaskFilterDraft(empty); setTaskOwnerNames([]); setTaskPage(1); }} onApplyFilters={() => { setTaskFilters(taskFilterDraft); setTaskFilterOpen(false); setTaskPage(1); }} onGroupOpenChange={setTaskGroupOpen} onGroupQueryChange={setTaskGroupQuery} onGroupByChange={(value) => { setTaskGroupBy(value as typeof taskGroupBy); setTaskGroupSelection(''); setTaskGroupOpen(false); }} extra={<Dropdown trigger={['click']} menu={{ items: ([['requirement', '产品'], ['design', '设计'], ['dev', '研发'], ['test', '测试'], ['bug', '缺陷']] as const).map(([key, label]) => ({ key, label, onClick: () => createIterationTask(key) })) }} disabled={!selectedVersionProductLineId}><button type="button" className={`${primaryButton} shrink-0 whitespace-nowrap`}><Plus className="h-4 w-4" />新建<ChevronDown className="h-3.5 w-3.5" /></button></Dropdown>} /></div></div>
                {Boolean(taskQuery || taskOwnerNames.length || appliedTaskFilterLabels.length) && <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-main)] py-2 text-[11px]">
                  {taskQuery && <span className="group/tag inline-flex items-center gap-1 rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--active-text)]">搜索：{taskQuery}<button type="button" aria-label="清除搜索" onClick={() => { setTaskQuery(''); setTaskSearchDraft(''); setTaskOwnerNames([]); }} className="opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover/tag:opacity-100"><span aria-hidden="true">×</span></button></span>}
                  {taskOwnerNames.map((name) => <span key={`owner:${name}`} className="group/tag inline-flex items-center gap-1 rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--active-text)]">负责人：{name}<button type="button" aria-label={`删除负责人${name}`} onClick={() => setTaskOwnerNames((current) => current.filter((item) => item !== name))} className="opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover/tag:opacity-100"><span aria-hidden="true">×</span></button></span>)}
                  {appliedTaskFilterLabels.map(({ key, text }) => <span key={key} className="group/tag inline-flex items-center gap-1 rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--active-text)]">{text}<button type="button" aria-label={`删除${text}`} onClick={() => clearTaskFilter(key)} className="opacity-0 transition-opacity hover:text-[var(--text-primary)] group-hover/tag:opacity-100"><span aria-hidden="true">×</span></button></span>)}
                  <button type="button" onClick={() => { const empty = emptyTaskFilters(); setTaskFilters(empty); setTaskFilterDraft(empty); setTaskQuery(''); setTaskSearchDraft(''); setTaskOwnerNames([]); setTaskPage(1); }} className="text-[var(--primary)] hover:text-[var(--primary-hover)]">清空过滤条件</button>
                </div>}
                {taskGroupBy !== 'none' && <div className="flex flex-wrap items-center gap-6 border-b border-[var(--border-main)] py-3 text-[11px]">
                  <span className="font-semibold text-[var(--text-body)]">按{taskGroupOptions.find(([key]) => key === taskGroupBy)?.[1]}分组：</span>
                  {taskGroupEntries.map(({ value, count }) => <button key={value} type="button" onClick={() => { setTaskGroupSelection(value); setTaskPage(1); }} className={`border-b-2 px-1 py-1 transition-colors ${effectiveTaskGroupValue === value ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{value}<span className="ml-1 text-[var(--active-text)]">{count}</span></button>)}
                  <button type="button" aria-label="取消分组" onClick={() => { setTaskGroupBy('none'); setTaskGroupSelection(''); setTaskGroupQuery(''); }} className="text-[var(--primary)]">取消分组</button>
                </div>}
                <div ref={setTaskFilterTarget} className="empty:hidden" />
                {testItemsError && <Alert type="warning" showIcon title="测试任务加载失败，其他任务仍可查看" description="请稍后重试。" action={<Button size="small" onClick={() => setTestItemsReloadKey((value) => value + 1)}>重试</Button>} />}
                <div className="overflow-hidden rounded-lg border border-[var(--border-main)]"><WorkItemBatchBar targets={selectedItems.filter((item) => selectedTaskIds.includes(`${item.kind}:${item.id}`)).map((item) => ({ id: item.id, category: item.kind, productLineId: item.productLineId, revision: (item.source as RequirementTask).revision }))} versions={versions.map((version) => ({ value: version.id, label: version.name, productLineId: version.productLineId }))} employees={directoryOwnerNames.map((name) => ({ value: name, label: name }))} onCancel={() => setSelectedTaskIds([])} onComplete={() => { setWorkItemsReloadKey((value) => value + 1); setTestItemsReloadKey((value) => value + 1); }} />{filteredItems.length ? <WorkItemRows items={pagedItems} childrenByParent={taskTree.children} groupBy={taskGroupBy} selectedIds={selectedTaskIds} onSelectionChange={setSelectedTaskIds} onOperation={(key, item) => void operatePlanningItem(key, item)} onOpen={(item) => item.kind === 'requirement' ? openRequirement(item.source as RequirementTask) : item.kind === 'design' ? openDesignTask(item.source as RequirementTask) : item.kind === 'test' ? openTestTask(item.source as RequirementTask) : item.kind === 'bug' ? openBug(item.source as DefectBug) : openDevTask(item.source as DevTask)} employees={directoryOwnerNames} onUpdated={() => setWorkItemsReloadKey((value) => value + 1)} /> : <EmptyState icon={<ListTodo className="h-5 w-5" />} title="暂无匹配工作项" description="当前迭代无对应任务，请调整筛选条件或新建任务。" />}</div>
                <Pagination total={taskTree.roots.length} page={taskPage} pageSize={taskPageSize} onPageChange={setTaskPage} onPageSizeChange={(size) => { setTaskPageSize(size); setTaskPage(1); }} />
              </div>}
            </>
          ) : <EmptyState icon={<GitBranch className="h-5 w-5" />} title="暂无迭代" description="创建一个迭代后即可查看详情。" />}
        </section>
      </div>
    );
  };

  const renderPlanning = () => (
    <div className="version-planning-layout grid h-full min-h-0 grid-cols-[minmax(360px,1fr)_minmax(420px,1.1fr)] gap-3">
      <section onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={(event) => { event.preventDefault(); const raw = event.dataTransfer.getData('text/plain') || ''; let payload: { id: string; kind: PlanningKind; fromVersionId?: string } | null = null; try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; } const item = payload ? planningItems.find((candidate) => candidate.id === payload?.id && candidate.kind === payload?.kind) : draggedWorkItem; const fromVersion = payload?.fromVersionId ? visibleVersions.find((version) => version.id === payload?.fromVersionId) : item?.versionId ? visibleVersions.find((version) => version.id === item.versionId) : undefined; if (item && fromVersion) void unassignPlanningItem(item, fromVersion); }} className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4">
          <div className="flex h-12 items-center justify-between">
            <label className="inline-flex min-w-0 items-center gap-2 text-[var(--text-primary)]">
              <input
                type="checkbox"
                aria-label="全选待规划工作项"
                checked={plannableRoots.length > 0 && plannableRoots.every((item) => selectedPlanningItemIds.includes(`${item.kind}:${item.id}`))}
                onChange={() => {
                  const visibleIds = plannableRoots.map((item) => `${item.kind}:${item.id}`);
                  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedPlanningItemIds.includes(id));
                  setSelectedPlanningItemIds((current) => allSelected
                    ? current.filter((id) => !visibleIds.includes(id))
                    : Array.from(new Set([...current, ...visibleIds])));
                }}
                className="h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              <span className="truncate font-semibold">待规划工作项 · {unplannedRoots.length}</span>
              <span className="hidden text-[11px] font-normal text-[var(--text-muted)] sm:inline">可拖动到右侧迭代</span>
            </label>
            <div className="flex items-center gap-1.5">
              <div data-planning-search className={`flex items-center overflow-hidden transition-all duration-300 ${planningSearchOpen ? 'w-44 opacity-100' : 'w-0 opacity-0'}`}><input autoFocus={planningSearchOpen} value={planningQuery} onChange={(event) => setPlanningQuery(event.target.value)} placeholder="输入关键词" className="app-control h-8 w-44 px-2 text-xs" /></div>
              <button type="button" aria-label="搜索待规划工作项" onClick={(event) => { event.stopPropagation(); setPlanningSearchOpen(true); }} className={`rounded p-1.5 ${planningQuery.trim() ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary)]'}`}><Search className="h-4 w-4" /></button>
              <div data-planning-filter>
                <button type="button" aria-label="过滤待规划工作项" onClick={() => setPlanningFilterOpen((open) => !open)} className={`rounded p-1.5 ${planningFilterOpen || planningStatuses.length || planningPriorities.length || planningOwners.length || planningKinds.length < 5 ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary)]'}`}><Filter className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          {planningFilterOpen && <div className="space-y-3 border-t border-[var(--border-main)] py-3" data-testid="planning-filter-panel" data-planning-filter>
            <div><div className="mb-2 font-medium text-[var(--text-muted)]">工作项类型</div><div className="flex flex-wrap gap-4">{(Object.keys(planningKindLabel) as PlanningKind[]).map((kind) => <label key={kind} className="inline-flex items-center gap-2 text-[var(--text-body)]"><input type="checkbox" checked={planningKinds.includes(kind)} onChange={() => setPlanningKinds((current) => current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind])} className="h-4 w-4 accent-[var(--primary)]" />{planningKindLabel[kind]}</label>)}</div></div>
            <div className="space-y-3"><label className="block space-y-1"><span className="block text-[var(--text-muted)]">状态</span><Select mode="multiple" showSearch allowClear value={planningStatuses} onChange={setPlanningStatuses} options={filterOptions.statuses.map((value) => ({ value, label: value }))} placeholder="请选择或输入关键词查询" getPopupContainer={(trigger) => trigger.parentElement || document.body} className="w-full" /></label><label className="block space-y-1"><span className="block text-[var(--text-muted)]">优先级</span><Select mode="multiple" showSearch allowClear value={planningPriorities} onChange={setPlanningPriorities} options={filterOptions.priorities.map((value) => ({ value, label: value }))} placeholder="请选择" getPopupContainer={(trigger) => trigger.parentElement || document.body} className="w-full" /></label><label className="block space-y-1"><span className="block text-[var(--text-muted)]">负责人</span><Select mode="multiple" showSearch allowClear value={planningOwners} onChange={setPlanningOwners} options={filterOptions.owners.map((value) => ({ value, label: value }))} placeholder="请选择" getPopupContainer={(trigger) => trigger.parentElement || document.body} className="w-full" /></label></div>
            <button type="button" aria-label="重置过滤器" onClick={() => { setPlanningKinds(['requirement', 'design', 'bug', 'dev', 'test']); setPlanningStatuses([]); setPlanningPriorities([]); setPlanningOwners([]); setPlanningQuery(''); }} className="inline-flex items-center gap-1 text-xs text-[var(--primary)]"><Undo2 className="h-3.5 w-3.5" />重置</button>
          </div>}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <PlanningTree items={unplannedCandidates} matches={unplannedWorkItems} selectedIds={selectedPlanningItemIds} onSelect={(item) => setSelectedPlanningItemIds((current) => current.includes(`${item.kind}:${item.id}`) ? current.filter((value) => value !== `${item.kind}:${item.id}`) : [...current, `${item.kind}:${item.id}`])} onOpen={openWorkItemDetail} busy={Boolean(assigningRequirementId)} onDrag={(event, item) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", JSON.stringify({ id: item.id, kind: item.kind })); setDraggedWorkItem(item); }} onDragEnd={() => { setDraggedWorkItem(null); setDropTargetVersionId(null); }} />
          {unplannedWorkItems.length === 0 && <EmptyState icon={<ListTodo className="h-5 w-5" />} title="暂无待规划工作项" description="所有工作项都已加入迭代。" />}
        </div>
      </section>
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4"><span className="font-semibold text-[var(--text-primary)]">迭代版本</span><button type="button" onClick={openCreateVersion} className="text-[var(--primary)]"><Plus className="mr-1 inline h-4 w-4" />新建迭代</button></div>
        <div className="flex-1 overflow-y-auto p-2">{visibleVersions.map((version) => { const versionItems = plannedWorkItems.get(version.id) || []; const stats = getVersionStats(version); const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0; const expanded = expandedVersionIds.includes(version.id); return <div key={version.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTargetVersionId(version.id); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTargetVersionId(null); }} onDrop={(event) => { event.preventDefault(); const raw = event.dataTransfer.getData('text/plain') || ''; let payload: { id: string; kind: PlanningKind } | null = null; try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw ? { id: raw, kind: 'requirement' } : null; } const item = payload ? planningItems.find((candidate) => candidate.id === payload?.id && candidate.kind === payload?.kind) : draggedWorkItem; if (item) void assignPlanningItem(item, version); }} className={`mb-2 rounded-md border p-3 transition-all ${dropTargetVersionId === version.id ? 'border-[var(--primary)] bg-[var(--bg-surface-soft)] shadow-sm' : selectedVersion?.id === version.id ? 'border-[var(--primary)] bg-[var(--bg-surface-soft)]' : 'border-transparent hover:border-[var(--border-main)]'}`} aria-label={`迭代版本：${version.name}`}>
            <div className="flex items-center gap-3"><button type="button" onClick={() => { setSelectedId(version.id); setExpandedVersionIds((current) => current.includes(version.id) ? current.filter((id) => id !== version.id) : [...current, version.id]); }} className="min-w-0 flex-1 truncate text-left font-semibold text-[var(--text-primary)] hover:text-[var(--primary)]">{version.name.length > 20 ? `${version.name.slice(0, 20)}...` : version.name}</button><span className="text-[var(--text-muted)]">{versionItems.length}</span><button type="button" aria-label={expanded ? `收起${version.name}` : `展开${version.name}`} onClick={() => setExpandedVersionIds((current) => current.includes(version.id) ? current.filter((id) => id !== version.id) : [...current, version.id])} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--primary)]">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button><StatusTag status={normalizeVersionStatus(version.status, version.statusPhase)} /></div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-muted)]"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-main)]"><div className="h-full bg-[var(--primary)]" style={{ width: `${progress}%` }} /></div><span>{stats.completed}/{stats.total}</span></div>
            {expanded && <div className="mt-3 border-t border-[var(--border-main)] pt-2">{versionItems.length ? <PlanningTree items={versionItems} onOpen={openWorkItemDetail} busy={Boolean(assigningRequirementId)} onDrag={(event, item) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", JSON.stringify({ id: item.id, kind: item.kind, fromVersionId: version.id })); setDraggedWorkItem(item); }} onDragEnd={() => { setDraggedWorkItem(null); setDropTargetVersionId(null); }} /> : <div className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">该版本暂无工作项</div>}</div>}
            {dropTargetVersionId === version.id && <div className="mt-2 rounded-md border border-dashed border-[var(--primary)] px-3 py-2 text-center text-[11px] font-semibold text-[var(--primary)]">释放后加入该迭代</div>}
          </div>; })}{visibleVersions.length === 0 && <EmptyState icon={<GitBranch className="h-5 w-5" />} title="暂无可用迭代" description="请先创建迭代，再安排工作项。" />}</div>
      </section>
    </div>
  );

  return (
    <div className="space-y-3 text-xs">
      {!showDetail && <div className="flex min-h-14 items-center border-b border-[var(--border-main)] pb-3"><div className="primary-line-tabs flex items-center gap-3" role="tablist" aria-label="版本迭代视图">{tabButton('list', '迭代列表', <ListTodo className="h-4 w-4" />)}{tabButton('planning', '迭代规划', <GitBranch className="h-4 w-4" />)}</div></div>}
      {mode === 'list' && !showDetail && <div className="grid h-[calc(100vh-190px)] min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3">
        {renderProductNavigation()}
        <section className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="version-toolbar flex w-full flex-nowrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Input aria-label="搜索迭代" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索迭代" prefix={<Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />} className="w-80 max-w-[min(320px,45vw)]" />
              <Select aria-label="状态筛选" value={status} onChange={setStatus} options={[{ value: 'all', label: '全部状态' }, ...enabledIterationStatuses.map((item) => ({ value: item.name, label: item.name }))]} className="w-28" getPopupContainer={(trigger) => trigger.parentElement || document.body} />
              <Select aria-label="负责人筛选" value={ownerFilter} onChange={setOwnerFilter} options={[{ value: 'all', label: '全部负责人' }, ...Array.from(new Set(visibleVersions.map((version) => version.ownerName || '未分配'))).map((owner) => ({ value: owner, label: owner }))]} className="w-32" getPopupContainer={(trigger) => trigger.parentElement || document.body} />
            </div>
            <button type="button" onClick={openCreateVersion} className={`${primaryButton} h-8 shrink-0 whitespace-nowrap`}><Plus className="h-3.5 w-3.5" />新建</button>
          </div>
          <div className="min-h-0 flex-1">{renderList()}</div>
        </section>
      </div>}
      {mode === 'list' && showDetail && renderDetail()}
      {mode === 'planning' && <div className="grid h-[calc(100vh-190px)] min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3">{renderProductNavigation()}<div className="min-h-0 min-w-0">{renderPlanning()}</div></div>}
      {createTaskKind && selectedVersionProductLineId && (
        <RequirementTasksView
          productLineFilter={selectedVersionProductLineId}
          itemLabel={({ requirement: '产品任务', design: '设计任务', dev: '研发任务', test: '测试任务', bug: '缺陷' } as const)[createTaskKind]}
          taskKind={createTaskKind}
          creationContext={{
            productLineId: selectedVersionProductLineId,
            versionId: selectedVersion?.id,
            parent: childParentItem?.source as RequirementTask | undefined,
            onClose: () => { setCreateTaskKind(null); setChildParentItem(null); setCreateSaving(false); },
            onCreated: () => { setTaskPage(1); }
          }}
        />
      )}
      {(() => {
        const modalLine = productLines.find((line) => line.id === formProductLineId);
        const modalVersion = editingVersionId ? versions.find((version) => version.id === editingVersionId) : null;
        return <CreateVersionModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingVersionId(null); }}
          productLine={modalLine}
          editingVersion={modalVersion}
          onSuccess={() => setIsModalOpen(false)}
        />;
      })()}
      {directWorkItem && <RequirementTasksView
        key={`${String(directWorkItem.__planningKind || 'requirement')}-${String(directWorkItem.id || '')}`}
        productLineFilter={String(directWorkItem.productLineId || selectedVersion?.productLineId || 'all')}
        itemLabel={planningKindLabel[String(directWorkItem.__planningKind || 'requirement') as PlanningKind] || '工作项'}
        taskKind={(String(directWorkItem.__planningKind || 'requirement') === 'design' ? 'design' : String(directWorkItem.__planningKind || 'requirement') === 'dev' ? 'dev' : String(directWorkItem.__planningKind || 'requirement') === 'bug' ? 'bug' : String(directWorkItem.__planningKind || 'requirement') === 'test' ? 'test' : 'requirement')}
        initialDetail={directWorkItem as unknown as RequirementTask}
        onDetailClose={() => setDirectWorkItem(null)}
      />}
    </div>
  );
};
