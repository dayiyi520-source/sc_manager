import React, { useEffect, useMemo, useState } from 'react';
import {
  Bug,
  Beaker,
  Calendar,
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
import { Input, Select } from 'antd';
import { useApp } from '../../context/AppContext';
import { StatusTag } from '../common/UIComponents';
import { showDeleteConfirm } from '../common/Feedback';
import { DefectBug, DevTask, RequirementTask, VersionIteration } from '../../types';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
import { CreateVersionModal } from './CreateVersionModal';

type ViewMode = 'list' | 'planning';
type DetailTab = 'hours' | 'workItems' | 'testCases';
type SelectedWorkItem =
  | { kind: 'requirement'; item: RequirementTask }
  | { kind: 'design'; item: RequirementTask }
  | { kind: 'task'; item: DevTask }
  | { kind: 'bug'; item: DefectBug };

type PlanningKind = 'requirement' | 'design' | 'bug' | 'dev';
type PlanningItem = {
  id: string;
  kind: PlanningKind;
  title: string;
  ownerName: string;
  estimatedHours: number;
  actualHours: number;
  priority: string;
  status: string;
  productLineId?: string;
  versionId?: string;
  versionName?: string;
  source: RequirementTask | DefectBug | DevTask;
};

const planningKindLabel: Record<PlanningKind, string> = { requirement: '需求', design: '设计', bug: '缺陷', dev: '研发' };
const planningKindIcon: Record<PlanningKind, React.ReactNode> = {
  requirement: <ListTodo className="h-4 w-4 text-[var(--primary)]" />,
  design: <Layers className="h-4 w-4 text-[var(--accent-purple)]" />,
  bug: <Bug className="h-4 w-4 text-[var(--danger)]" />,
  dev: <GitBranch className="h-4 w-4 text-[var(--success)]" />
};

const avatarColors = ['var(--accent-purple)', 'var(--warning)', 'var(--primary)', 'var(--success)'];

const normalize = (value?: string) => (value || '').trim().toLowerCase();

const versionMatches = (version: VersionIteration, value?: string) => {
  const source = normalize(value);
  if (!source) return false;
  const candidates = [version.name, version.code, version.name.replace(/\s*\([^)]*\)/g, '')]
    .map(normalize)
    .filter(Boolean);
  return candidates.some((candidate) => candidate.includes(source) || source.includes(candidate));
};

const completedWorkItemStatuses = new Set(['已完成', '已发布', '已验收', '已关闭', '已合并上线']);

const workItemStats = (items: PlanningItem[]) => ({
  completed: items.filter((item) => completedWorkItemStatuses.has(item.status)).length,
  total: items.length
});

const primaryButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--primary-hover)]';
const secondaryButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 text-xs font-semibold text-[var(--text-body)] transition hover:border-[var(--primary)] hover:text-[var(--active-text)]';

const DetailField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <span className="block text-[var(--text-muted)]">{label}</span>
    <div className="mt-1 min-h-8 break-words rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)]">
      {children}
    </div>
  </div>
);

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
  <div className="min-w-24">
    <div className="text-[11px] text-[var(--text-muted)]">{label}</div>
    <div className="mt-1 font-semibold text-[var(--text-primary)]">{value}</div>
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
        {items.map((item, index) => (
          <tr key={item.id} className="hover:bg-[var(--bg-surface-soft)]">
            <td className="max-w-[360px] px-4 py-3">
              <button type="button" onClick={() => onOpen(item)} className="truncate text-left font-medium text-[var(--text-primary)] hover:text-[var(--primary)]">{item.title}</button>
              <div className="mt-1 text-[11px] text-[var(--text-muted)]">{item.code || '需求任务'}</div>
            </td>
            <td className="px-3 py-3">
              <StatusTag status={item.status} />
            </td>
            <td className="px-3 py-3 text-[var(--text-body)]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white"
                  style={{ background: avatarColors[index % avatarColors.length] }}
                >
                  {(item.ownerName || '未').slice(0, 1)}
                </span>
                {item.ownerName || '未分配'}
              </span>
            </td>
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
            <td className="px-3 py-3 text-[var(--text-body)]">{item.developer || '未分配'}</td>
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
            <td className="px-3 py-3 text-[var(--text-body)]">{item.ownerName || item.assignee || '未分配'}</td>
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

const WorkItemRows: React.FC<{ items: PlanningItem[]; onOpen: (item: PlanningItem) => void }> = ({ items, onOpen }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[860px] text-left">
      <thead className="bg-[var(--bg-surface-soft)] text-[11px] text-[var(--text-muted)]">
        <tr>
          <th className="px-4 py-2.5 font-medium">类型</th>
          <th className="px-3 py-2.5 font-medium">标题</th>
          <th className="px-3 py-2.5 font-medium">状态</th>
          <th className="px-3 py-2.5 font-medium">负责人</th>
          <th className="px-3 py-2.5 font-medium">优先级</th>
          <th className="px-3 py-2.5 font-medium">预计工时</th>
          <th className="px-4 py-2.5 font-medium">实际工时</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border-main)]">
        {items.map((item) => (
          <tr key={`${item.kind}-${item.id}`} className="hover:bg-[var(--bg-surface-soft)]">
            <td className="px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-[var(--text-body)]">{planningKindIcon[item.kind]}{planningKindLabel[item.kind]}</span>
            </td>
            <td className="max-w-[360px] px-3 py-3">
              <button type="button" onClick={() => onOpen(item)} className="block max-w-full truncate text-left font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]">{item.title}</button>
            </td>
            <td className="px-3 py-3"><StatusTag status={item.status} /></td>
            <td className="px-3 py-3 text-[var(--text-body)]">{item.ownerName || '未分配'}</td>
            <td className="px-3 py-3"><StatusTag status={item.priority} /></td>
            <td className="px-3 py-3 text-[var(--text-muted)]">{item.estimatedHours} 小时</td>
            <td className="px-4 py-3 text-[var(--text-muted)]">{item.actualHours} 小时</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

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
  const [mode, setMode] = useState<ViewMode>('list');
  const [showDetail, setShowDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('hours');
  const [selectedWorkItem, setSelectedWorkItem] = useState<SelectedWorkItem | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [productLineFilter, setProductLineFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(versions[0]?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [formProductLineId, setFormProductLineId] = useState('');
  const [dropTargetVersionId, setDropTargetVersionId] = useState<string | null>(null);
  const [assigningRequirementId, setAssigningRequirementId] = useState<string | null>(null);
  const [planningSearchOpen, setPlanningSearchOpen] = useState(false);
  const [planningQuery, setPlanningQuery] = useState('');
  const [planningFilterOpen, setPlanningFilterOpen] = useState(false);
  const [planningKinds, setPlanningKinds] = useState<PlanningKind[]>(['requirement', 'design', 'bug', 'dev']);
  const [planningStatuses, setPlanningStatuses] = useState<string[]>([]);
  const [planningPriorities, setPlanningPriorities] = useState<string[]>([]);
  const [planningOwners, setPlanningOwners] = useState<string[]>([]);
  const [expandedVersionIds, setExpandedVersionIds] = useState<string[]>([]);
  const [draggedWorkItem, setDraggedWorkItem] = useState<PlanningItem | null>(null);
  const [selectedPlanningItemIds, setSelectedPlanningItemIds] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedId && versions[0]?.id) setSelectedId(versions[0].id);
  }, [selectedId, versions]);

  useEffect(() => {
    const consumeProductLineContext = () => {
      const lineId = sessionStorage.getItem('shichuang.productLineFilter');
      const targetTab = sessionStorage.getItem('shichuang.productLineTargetTab');
      if (lineId) setProductLineFilter(lineId);
      if (targetTab === 'detail') {
        setMode('list');
        setShowDetail(true);
      }
      if (lineId || targetTab) {
        sessionStorage.removeItem('shichuang.productLineFilter');
        sessionStorage.removeItem('shichuang.productLineTargetTab');
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
        return matchesQuery && (status === 'all' || version.status === status);
      }),
    [query, status, visibleVersions]
  );

  const selectedVersion =
    visibleVersions.find((version) => version.id === selectedId) || filteredVersions[0] || visibleVersions[0];

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
  const planningItems = useMemo<PlanningItem[]>(() => [
    ...requirementTasks.map((item) => ({ id: item.id, kind: 'requirement' as const, title: item.title, ownerName: item.ownerName || '', estimatedHours: item.estimatedHours || 0, actualHours: item.actualHours || 0, priority: item.priority || '中', status: item.status, productLineId: item.productLineId, versionId: item.versionId, versionName: item.versionName, source: item })),
    ...designTasks.map((item) => ({ id: item.id, kind: 'design' as const, title: item.title, ownerName: item.ownerName || '', estimatedHours: item.estimatedHours || 0, actualHours: item.actualHours || 0, priority: item.priority || '中', status: item.status, productLineId: item.productLineId, versionId: item.versionId, versionName: item.versionName, source: item })),
    ...bugs.map((item) => ({ id: item.id, kind: 'bug' as const, title: item.title, ownerName: item.ownerName || item.assignee || '', estimatedHours: (item as DefectBug & { estimatedHours?: number }).estimatedHours || 0, actualHours: (item as DefectBug & { actualHours?: number }).actualHours || 0, priority: item.priority || '中', status: item.status, productLineId: item.productLineId, versionId: (item as DefectBug & { versionId?: string }).versionId, versionName: item.versionName, source: item })),
    ...devTasks.map((item) => ({ id: item.id, kind: 'dev' as const, title: item.title, ownerName: item.developer || '', estimatedHours: item.estimatedHours || 0, actualHours: item.spentHours || 0, priority: item.priority || '中', status: item.status, productLineId: (item as DevTask & { productLineId?: string }).productLineId, versionId: (item as DevTask & { versionId?: string }).versionId, versionName: item.versionName, source: item }))
  ], [bugs, designTasks, devTasks, requirementTasks]);

  const unplannedWorkItems = useMemo(() => planningItems.filter((item) => {
    const matchesLine = productLineFilter === 'all' || item.productLineId === productLineFilter;
    const matchesText = !planningQuery.trim() || `${item.title} ${item.ownerName}`.toLowerCase().includes(planningQuery.trim().toLowerCase());
    const matchesKind = planningKinds.includes(item.kind);
    const matchesStatus = !planningStatuses.length || planningStatuses.includes(item.status);
    const matchesPriority = !planningPriorities.length || planningPriorities.includes(item.priority);
    const matchesOwner = !planningOwners.length || planningOwners.includes(item.ownerName);
    return !item.versionId && !item.versionName && matchesLine && matchesText && matchesKind && matchesStatus && matchesPriority && matchesOwner;
  }), [planningItems, planningKinds, planningOwners, planningPriorities, planningQuery, planningStatuses, productLineFilter]);

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

  const openRequirement = (item: RequirementTask) => setSelectedWorkItem({ kind: 'requirement', item });
  const openDesignTask = (item: RequirementTask) => setSelectedWorkItem({ kind: 'design', item });
  const openDevTask = (item: DevTask) => setSelectedWorkItem({ kind: 'task', item });
  const openBug = (item: DefectBug) => setSelectedWorkItem({ kind: 'bug', item });

  const changeVersionStatus = async (nextStatus: string) => {
    if (!selectedVersion) return;
    const saved = await updateVersion(selectedVersion.id, { status: nextStatus });
    if (saved) addToast('success', '迭代状态已更新', `${selectedVersion.name}：${nextStatus}`);
  };

  const assignPlanningItem = async (item: PlanningItem, version: VersionIteration) => {
    if (assigningRequirementId) return;
    setAssigningRequirementId(item.id);
    const saved = item.kind === 'requirement'
      ? await assignRequirementToVersion(item.id, version.id)
      : await assignWorkItemToVersion?.(item.kind, item.id, version.id);
    setAssigningRequirementId(null);
    setDraggedWorkItem(null);
    setDropTargetVersionId(null);
    if (saved) addToast('success', '工作项已加入迭代', `${item.title} → ${version.name}`);
  };

  const unassignPlanningItem = async (item: PlanningItem, version: VersionIteration) => {
    const saved = await unassignWorkItemFromVersion?.(item.kind, item.id, version.id);
    if (saved) addToast('success', '工作项已移出迭代', item.title);
  };

  const tabButton = (key: ViewMode, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => { setMode(key); setShowDetail(false); }}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all ${
        mode === key
          ? 'bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)]'
      }`}
    >
      {icon}{label}
    </button>
  );

  const renderList = () => (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-[var(--bg-surface-soft)] text-[11px] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-3 py-3 font-medium">版本号</th>
                <th className="px-3 py-3 font-medium">状态</th>
                <th className="px-3 py-3 font-medium">起止时间</th>
                <th className="px-3 py-3 font-medium">负责人</th>
                <th className="px-3 py-3 font-medium">完成度</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {filteredVersions.map((version, index) => {
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
                    <td className="px-3 py-3"><StatusTag status={version.status} /></td>
                    <td className="px-3 py-3 text-[var(--text-body)]">{version.startDate || '--'} ~ {version.endDate || version.releaseDate || '--'}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-body)]">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-white" style={{ background: avatarColors[index % avatarColors.length] }}>{(version.ownerName || '未').slice(0, 1)}</span>
                        {version.ownerName || '未分配'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-44 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
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
        <div className="flex h-12 items-center justify-end gap-3 border-t border-[var(--border-main)] px-4 text-[var(--text-muted)]">
          共 {filteredVersions.length} 条
          <button type="button" className="p-1.5" title="上一页"><ChevronLeft className="h-4 w-4" /></button>
          <span className="rounded bg-[var(--primary)] px-2 py-1 text-white">1</span>
          <button type="button" className="p-1.5" title="下一页"><ChevronRight className="h-4 w-4" /></button>
          <span>每页显示 25</span>
        </div>
      </div>
    </div>
  );

  const renderDetail = () => {
    const selectedItems = selectedVersion ? plannedWorkItems.get(selectedVersion.id) || [] : [];
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
    const typeStats = (['requirement', 'design', 'dev', 'bug'] as PlanningKind[]).map((kind) => {
      const items = selectedItems.filter((item) => item.kind === kind);
      return { kind, ...workItemStats(items) };
    });
    const typeProgressClasses: Record<PlanningKind, string> = {
      requirement: 'bg-[var(--primary)]',
      design: 'bg-[var(--accent-purple)]',
      dev: 'bg-[var(--success)]',
      bug: 'bg-[var(--danger)]'
    };
    const isCompleted = selectedVersion?.status === '已完成' || selectedVersion?.status === '已发布';
    const isRunning = selectedVersion?.status === '迭代中' || selectedVersion?.status === '封版测试';
    const statusAction = isCompleted
      ? { label: '重开迭代', nextStatus: '迭代中', icon: <RotateCcw className="h-4 w-4" /> }
      : isRunning
        ? { label: '完成迭代', nextStatus: '已完成', icon: <CheckCircle className="h-4 w-4" /> }
        : { label: '开启迭代', nextStatus: '迭代中', icon: <Play className="h-4 w-4" /> };
    const detailTabs: Array<{ key: DetailTab; label: string; count?: number; icon: React.ReactNode }> = [
      { key: 'hours', label: '迭代工时', icon: <Calendar className="h-4 w-4" /> },
      { key: 'workItems', label: '工作项', count: selectedStats.total, icon: <ListTodo className="h-4 w-4" /> },
      { key: 'testCases', label: '测试用例', icon: <Beaker className="h-4 w-4" /> }
    ];
    return (
      <div className="version-detail-layout grid min-h-[620px] grid-cols-[250px_minmax(0,1fr)] overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <aside className="flex min-h-0 flex-col border-r border-[var(--border-main)] bg-[var(--bg-surface-soft)]">
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
                  onClick={() => setSelectedId(version.id)}
                  className={`mb-1 w-full rounded-md border p-3 text-left transition ${active ? 'border-[var(--primary)] bg-[var(--bg-surface)] shadow-sm' : 'border-transparent hover:border-[var(--border-main)] hover:bg-[var(--bg-surface)]'}`}
                >
                  <div className="truncate font-medium text-[var(--text-primary)]">{version.name}</div>
                  <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">{version.productLineName || '未关联产品线'}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-[var(--primary)]" style={{ width: `${progress}%` }} /></div>
                    <span className="text-[10px] text-[var(--text-muted)]">{progress}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between"><StatusTag status={version.status} /><span className="text-[10px] text-[var(--text-muted)]">{version.requirementsCount ?? version.reqCount ?? 0} 项需求</span></div>
                </button>
              );
            })}
          </div>
        </aside>
        <section className="min-w-0 bg-[var(--bg-surface)]">
          {selectedVersion ? (
            <>
              <div className="border-b border-[var(--border-main)] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2"><h2 className="truncate text-lg font-bold text-[var(--text-primary)]">{selectedVersion.name}</h2><StatusTag status={selectedVersion.status} /></div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => void changeVersionStatus(statusAction.nextStatus)} className={secondaryButton}>{statusAction.icon}{statusAction.label}</button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 border-b border-[var(--border-main)] p-5 lg:grid-cols-2">
                <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">基本信息</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Metric label="迭代负责人" value={<span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-[var(--text-muted)]" />{selectedVersion.ownerName || '未分配'}</span>} />
                    <Metric label="所属产品线" value={selectedVersion.productLineName || productLines.find((line) => line.id === selectedVersion.productLineId)?.name || '未关联产品线'} />
                    <Metric label="迭代状态" value={selectedVersion.status || '未设置'} />
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
                    {tab.icon}{tab.label}{tab.count !== undefined && <span className="text-[10px]">· {tab.count}</span>}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {detailTab === 'hours' && <div className="space-y-3"><div className="grid gap-3 lg:grid-cols-2"><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h3 className="text-sm font-semibold text-[var(--text-primary)]">工作项分布</h3><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3"><Metric label="工作项总数" value={`${selectedStats.total} 个`} /><Metric label="工作项完成数" value={`${selectedStats.completed} 个`} /><Metric label="工作项未完成数" value={`${selectedStats.total - selectedStats.completed} 个`} /></div></section><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><h3 className="text-sm font-semibold text-[var(--text-primary)]">迭代工时概览</h3><div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3"><Metric label="预计工时" value={`${estimatedHours} 小时`} /><Metric label="实际工时" value={`${actualHours} 小时`} /><Metric label="预计偏差" value={`${actualHours - estimatedHours} 小时`} /></div></section></div><div className="grid gap-3 lg:grid-cols-2"><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--text-primary)]">工作项排名</h3><div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--primary)]" />完成</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--active-text)]/40" />总量</span></div></div><div className="mt-5 space-y-4">{memberStats.length ? memberStats.map((member) => <div key={`work-${member.name}`} className="grid grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-2 text-xs"><span className="truncate text-[var(--text-muted)]" title={member.name}>{member.name}</span><div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-[var(--active-text)]/20"><div className="h-full rounded-full bg-[var(--active-text)]/45" style={{ width: `${selectedStats.total ? (member.total / selectedStats.total) * 100 : 0}%` }}><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${member.total ? (member.completed / member.total) * 100 : 0}%` }} /></div></div></div><span className="text-right text-[var(--text-muted)]">{member.completed}/{member.total}</span></div>) : <p className="py-6 text-center text-xs text-[var(--text-muted)]">暂无成员工作项</p>}</div></section><section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--text-primary)]">工时排名</h3><div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--primary)]" />实际工时(小时)</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[var(--active-text)]/40" />预计工时(小时)</span></div></div><div className="mt-5 space-y-4">{memberStats.length ? memberStats.map((member) => <div key={`hours-${member.name}`} className="grid grid-cols-[72px_minmax(0,1fr)_52px] items-center gap-2 text-xs"><span className="truncate text-[var(--text-muted)]" title={member.name}>{member.name}</span><div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-[var(--active-text)]/20"><div className="h-full rounded-full bg-[var(--active-text)]/45" style={{ width: `${estimatedHours ? (member.estimated / estimatedHours) * 100 : 0}%` }}><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${estimatedHours ? (member.actual / estimatedHours) * 100 : 0}%` }} /></div></div></div><span className="text-right text-[var(--text-muted)]">{member.actual}/{member.estimated}</span></div>) : <p className="py-6 text-center text-xs text-[var(--text-muted)]">暂无成员工时</p>}</div></section></div></div>}
                {detailTab === 'workItems' && (selectedItems.length ? <WorkItemRows items={selectedItems} onOpen={(item) => item.kind === 'requirement' ? openRequirement(item.source as RequirementTask) : item.kind === 'design' ? openDesignTask(item.source as RequirementTask) : item.kind === 'bug' ? openBug(item.source as DefectBug) : openDevTask(item.source as DevTask)} /> : <EmptyState icon={<ListTodo className="h-5 w-5" />} title="暂无工作项" description="当前迭代还没有关联工作项。" />)}
                {detailTab === 'testCases' && <EmptyState icon={<Beaker className="h-5 w-5" />} title="暂无测试用例" description="当前迭代还没有关联测试用例。" />}
              </div>
            </>
          ) : <EmptyState icon={<GitBranch className="h-5 w-5" />} title="暂无迭代" description="创建一个迭代后即可查看详情。" />}
        </section>
      </div>
    );
  };

  const renderPlanning = () => (
    <div className="version-planning-layout grid min-h-[620px] grid-cols-[minmax(360px,1fr)_minmax(420px,1.1fr)] gap-3">
      <section onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={(event) => { event.preventDefault(); const raw = event.dataTransfer.getData('text/plain') || ''; let payload: { id: string; kind: PlanningKind; fromVersionId?: string } | null = null; try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; } const item = payload ? planningItems.find((candidate) => candidate.id === payload?.id && candidate.kind === payload?.kind) : draggedWorkItem; const fromVersion = payload?.fromVersionId ? visibleVersions.find((version) => version.id === payload?.fromVersionId) : item?.versionId ? visibleVersions.find((version) => version.id === item.versionId) : undefined; if (item && fromVersion) void unassignPlanningItem(item, fromVersion); }} className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4">
          <div className="flex h-12 items-center justify-between">
            <label className="inline-flex min-w-0 items-center gap-2 text-[var(--text-primary)]">
              <input
                type="checkbox"
                aria-label="全选待规划工作项"
                checked={unplannedWorkItems.length > 0 && unplannedWorkItems.every((item) => selectedPlanningItemIds.includes(`${item.kind}:${item.id}`))}
                onChange={() => {
                  const visibleIds = unplannedWorkItems.map((item) => `${item.kind}:${item.id}`);
                  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedPlanningItemIds.includes(id));
                  setSelectedPlanningItemIds((current) => allSelected
                    ? current.filter((id) => !visibleIds.includes(id))
                    : Array.from(new Set([...current, ...visibleIds])));
                }}
                className="h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              <span className="truncate font-semibold">待规划工作项 · {unplannedWorkItems.length}</span>
              <span className="hidden text-[11px] font-normal text-[var(--text-muted)] sm:inline">可拖动到右侧迭代</span>
            </label>
            <div className="flex items-center gap-1.5">
              <div data-planning-search className={`flex items-center overflow-hidden transition-all duration-300 ${planningSearchOpen ? 'w-44 opacity-100' : 'w-0 opacity-0'}`}><input autoFocus={planningSearchOpen} value={planningQuery} onChange={(event) => setPlanningQuery(event.target.value)} placeholder="输入关键词" className="app-control h-8 w-44 px-2 text-xs" /></div>
              <button type="button" aria-label="搜索待规划工作项" onClick={(event) => { event.stopPropagation(); setPlanningSearchOpen(true); }} className={`rounded p-1.5 ${planningQuery.trim() ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary)]'}`}><Search className="h-4 w-4" /></button>
              <div data-planning-filter>
                <button type="button" aria-label="过滤待规划工作项" onClick={() => setPlanningFilterOpen((open) => !open)} className={`rounded p-1.5 ${planningFilterOpen || planningStatuses.length || planningPriorities.length || planningOwners.length || planningKinds.length < 4 ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--primary)]'}`}><Filter className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          {planningFilterOpen && <div className="space-y-3 border-t border-[var(--border-main)] py-3" data-testid="planning-filter-panel" data-planning-filter>
            <div><div className="mb-2 font-medium text-[var(--text-muted)]">工作项类型</div><div className="flex flex-wrap gap-4">{(Object.keys(planningKindLabel) as PlanningKind[]).map((kind) => <label key={kind} className="inline-flex items-center gap-2 text-[var(--text-body)]"><input type="checkbox" checked={planningKinds.includes(kind)} onChange={() => setPlanningKinds((current) => current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind])} className="h-4 w-4 accent-[var(--primary)]" />{planningKindLabel[kind]}</label>)}</div></div>
            <div className="space-y-3"><label className="block space-y-1"><span className="block text-[var(--text-muted)]">状态</span><Select mode="multiple" showSearch allowClear value={planningStatuses} onChange={setPlanningStatuses} options={filterOptions.statuses.map((value) => ({ value, label: value }))} placeholder="请选择或输入关键词查询" getPopupContainer={(trigger) => trigger.parentElement || document.body} className="w-full" /></label><label className="block space-y-1"><span className="block text-[var(--text-muted)]">优先级</span><Select mode="multiple" showSearch allowClear value={planningPriorities} onChange={setPlanningPriorities} options={filterOptions.priorities.map((value) => ({ value, label: value }))} placeholder="请选择" getPopupContainer={(trigger) => trigger.parentElement || document.body} className="w-full" /></label><label className="block space-y-1"><span className="block text-[var(--text-muted)]">负责人</span><Select mode="multiple" showSearch allowClear value={planningOwners} onChange={setPlanningOwners} options={filterOptions.owners.map((value) => ({ value, label: value }))} placeholder="请选择" getPopupContainer={(trigger) => trigger.parentElement || document.body} className="w-full" /></label></div>
            <button type="button" aria-label="重置过滤器" onClick={() => { setPlanningKinds(['requirement', 'design', 'bug', 'dev']); setPlanningStatuses([]); setPlanningPriorities([]); setPlanningOwners([]); setPlanningQuery(''); }} className="inline-flex items-center gap-1 text-xs text-[var(--primary)]"><Undo2 className="h-3.5 w-3.5" />重置</button>
          </div>}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {unplannedWorkItems.slice(0, 100).map((item) => <div key={`${item.kind}-${item.id}`} draggable={!assigningRequirementId} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, kind: item.kind })); setDraggedWorkItem(item); }} onDragEnd={() => { setDraggedWorkItem(null); setDropTargetVersionId(null); }} className={`mb-1 rounded-md border p-3 transition-all ${assigningRequirementId === item.id ? 'cursor-wait border-[var(--primary)] opacity-60' : draggedWorkItem?.id === item.id ? 'cursor-grabbing border-[var(--primary)] bg-[var(--bg-surface-soft)] opacity-70' : 'cursor-grab border-transparent hover:border-[var(--border-main)] hover:bg-[var(--bg-surface-soft)]'}`} aria-label={`拖动工作项：${item.title}`}>
            <div className="flex items-start gap-2"><input type="checkbox" aria-label={`选择工作项：${item.title}`} checked={selectedPlanningItemIds.includes(`${item.kind}:${item.id}`)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" onChange={() => setSelectedPlanningItemIds((current) => current.includes(`${item.kind}:${item.id}`) ? current.filter((value) => value !== `${item.kind}:${item.id}`) : [...current, `${item.kind}:${item.id}`])} onClick={(event) => event.stopPropagation()} /><span className="mt-0.5 shrink-0">{planningKindIcon[item.kind]}</span><button type="button" onClick={() => item.kind === 'requirement' ? openRequirement(item.source as RequirementTask) : item.kind === 'design' ? openDesignTask(item.source as RequirementTask) : item.kind === 'bug' ? openBug(item.source as DefectBug) : openDevTask(item.source as DevTask)} className="min-w-0 truncate text-left font-semibold text-[var(--text-primary)] hover:text-[var(--primary)]">{item.title.length > 30 ? `${item.title.slice(0, 30)}...` : item.title}</button></div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-[11px] text-[var(--text-muted)]"><span>{item.ownerName || '未分配'}</span><span>{item.estimatedHours}h</span><StatusTag status={item.priority} /><StatusTag status={item.status} /></div>
          </div>)}
          {unplannedWorkItems.length === 0 && <EmptyState icon={<ListTodo className="h-5 w-5" />} title="暂无待规划工作项" description="所有工作项都已加入迭代。" />}
        </div>
        <button type="button" onClick={() => addToast('info', '新建工作项', '请在对应工作项页面创建后返回规划')} className="flex h-11 items-center gap-1.5 border-t border-[var(--border-main)] px-4 text-[var(--primary)]"><Plus className="h-4 w-4" />新建工作项</button>
      </section>
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4"><span className="font-semibold text-[var(--text-primary)]">迭代版本</span><button type="button" onClick={openCreateVersion} className="text-[var(--primary)]"><Plus className="mr-1 inline h-4 w-4" />新建迭代</button></div>
        <div className="flex-1 overflow-y-auto p-2">{visibleVersions.map((version) => { const versionItems = plannedWorkItems.get(version.id) || []; const stats = getVersionStats(version); const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0; const expanded = expandedVersionIds.includes(version.id); return <div key={version.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTargetVersionId(version.id); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTargetVersionId(null); }} onDrop={(event) => { event.preventDefault(); const raw = event.dataTransfer.getData('text/plain') || ''; let payload: { id: string; kind: PlanningKind } | null = null; try { payload = raw ? JSON.parse(raw) : null; } catch { payload = raw ? { id: raw, kind: 'requirement' } : null; } const item = payload ? planningItems.find((candidate) => candidate.id === payload?.id && candidate.kind === payload?.kind) : draggedWorkItem; if (item) void assignPlanningItem(item, version); }} className={`mb-2 rounded-md border p-3 transition-all ${dropTargetVersionId === version.id ? 'border-[var(--primary)] bg-[var(--bg-surface-soft)] shadow-sm' : selectedVersion?.id === version.id ? 'border-[var(--primary)] bg-[var(--bg-surface-soft)]' : 'border-transparent hover:border-[var(--border-main)]'}`} aria-label={`迭代版本：${version.name}`}>
            <div className="flex items-center gap-3"><button type="button" onClick={() => { setSelectedId(version.id); setExpandedVersionIds((current) => current.includes(version.id) ? current.filter((id) => id !== version.id) : [...current, version.id]); }} className="min-w-0 flex-1 truncate text-left font-semibold text-[var(--text-primary)] hover:text-[var(--primary)]">{version.name.length > 20 ? `${version.name.slice(0, 20)}...` : version.name}</button><span className="text-[var(--text-muted)]">{versionItems.length}</span><button type="button" aria-label={expanded ? `收起${version.name}` : `展开${version.name}`} onClick={() => setExpandedVersionIds((current) => current.includes(version.id) ? current.filter((id) => id !== version.id) : [...current, version.id])} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--primary)]">{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button><StatusTag status={version.status} /></div>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-muted)]"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-[var(--primary)]" style={{ width: `${progress}%` }} /></div><span>{stats.completed}/{stats.total}</span></div>
            {expanded && <div className="mt-3 space-y-1 border-t border-[var(--border-main)] pt-2">{versionItems.length ? versionItems.map((item) => <div key={`${item.kind}-${item.id}`} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, kind: item.kind, fromVersionId: version.id })); setDraggedWorkItem(item); }} className="rounded-md border border-[var(--border-main)] bg-[var(--bg-surface)] p-2"><div className="flex items-center gap-2"><span>{planningKindIcon[item.kind]}</span><button type="button" onClick={() => item.kind === 'requirement' ? openRequirement(item.source as RequirementTask) : item.kind === 'design' ? openDesignTask(item.source as RequirementTask) : item.kind === 'bug' ? openBug(item.source as DefectBug) : openDevTask(item.source as DevTask)} className="min-w-0 flex-1 truncate text-left font-medium text-[var(--text-primary)] hover:text-[var(--primary)]">{item.title.length > 30 ? `${item.title.slice(0, 30)}...` : item.title}</button></div><div className="mt-1 flex gap-3 pl-6 text-[11px] text-[var(--text-muted)]"><span>{item.ownerName || '未分配'}</span><span>{item.estimatedHours}h</span><StatusTag status={item.priority} /><StatusTag status={item.status} /></div></div>) : <div className="px-2 py-3 text-center text-xs text-[var(--text-muted)]">该版本暂无工作项</div>}</div>}
            {dropTargetVersionId === version.id && <div className="mt-2 rounded-md border border-dashed border-[var(--primary)] px-3 py-2 text-center text-[11px] font-semibold text-[var(--primary)]">释放后加入该迭代</div>}
          </div>; })}{visibleVersions.length === 0 && <EmptyState icon={<GitBranch className="h-5 w-5" />} title="暂无可用迭代" description="请先创建迭代，再安排工作项。" />}</div>
      </section>
    </div>
  );

  return (
    <div className="space-y-3 text-xs">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-main)] pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-3">{tabButton('list', '迭代列表', <ListTodo className="h-4 w-4" />)}{tabButton('planning', '迭代规划', <GitBranch className="h-4 w-4" />)}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="w-40">
            <Select
              aria-label="产品线筛选"
              showSearch
              optionFilterProp="label"
              value={productLineFilter}
              onChange={(value) => setProductLineFilter(value)}
              options={[{ value: 'all', label: '全部产品线' }, ...productLines.map((line) => ({ value: line.id, label: line.name }))]}
              placeholder="全部产品线"
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              className="w-full"
            />
          </div>
        </div>
      </div>
      {mode === 'list' && !showDetail && <div className="version-toolbar flex w-full flex-nowrap items-center justify-between gap-3 pt-3">
          <div className="flex min-w-0 items-center gap-2">
              <Input
                aria-label="搜索迭代"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索迭代"
                prefix={<Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />}
                className="w-80 max-w-[min(320px,45vw)]"
              />
              <Select
                aria-label="状态筛选"
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'all', label: '全部状态' },
                  { value: '规划中', label: '规划中' },
                  { value: '迭代中', label: '迭代中' },
                  { value: '封版测试', label: '封版测试' },
                  { value: '已发布', label: '已发布' }
                ]}
                className="w-28"
                getPopupContainer={(trigger) => trigger.parentElement || document.body}
              />
          </div>
          <button type="button" onClick={openCreateVersion} className={`${primaryButton} h-8 shrink-0 whitespace-nowrap`}>
                <Plus className="h-3.5 w-3.5" />
                新建
          </button>
      </div>}
      {mode === 'list' && (showDetail ? renderDetail() : renderList())}
      {mode === 'planning' && renderPlanning()}
      {selectedWorkItem && (
        <WorkItemCreatePanel
          isOpen
          onClose={() => setSelectedWorkItem(null)}
          title={selectedWorkItem.kind === 'requirement' ? '需求详情' : selectedWorkItem.kind === 'design' ? '设计任务详情' : selectedWorkItem.kind === 'task' ? '研发任务详情' : '缺陷详情'}
          presentation="drawer"
          showContinueOption={false}
          footer={<button type="button" onClick={() => setSelectedWorkItem(null)} className="tech-button-primary h-10 rounded-lg px-4 text-xs font-semibold">关闭</button>}
          properties={
            selectedWorkItem.kind === 'requirement' || selectedWorkItem.kind === 'design' ? (
              <div className="space-y-3 text-xs">
                <h3 className="font-semibold text-[var(--text-primary)]">基础字段</h3>
                <DetailField label="当前状态"><StatusTag status={selectedWorkItem.item.status} /></DetailField>
                <DetailField label={selectedWorkItem.kind === 'design' ? '设计类型' : '需求类型'}>{selectedWorkItem.item.requirementType || '未设置'}</DetailField>
                <DetailField label="负责人">{selectedWorkItem.item.ownerName || '未设置'}</DetailField>
                <DetailField label="优先级"><StatusTag status={selectedWorkItem.item.priority} /></DetailField>
                <DetailField label="所属产品线">{selectedWorkItem.item.productLineName || '未设置'}</DetailField>
                <DetailField label="计划完成时间">{selectedWorkItem.item.dueDate || '未设置'}</DetailField>
                <DetailField label="迭代版本">{selectedWorkItem.item.versionName || '未设置'}</DetailField>
                <DetailField label="关联客户">{selectedWorkItem.item.customerName || '未关联'}</DetailField>
                <DetailField label="预计工时">{selectedWorkItem.item.estimatedHours ?? 0} 小时</DetailField>
              </div>
            ) : selectedWorkItem.kind === 'task' ? (
              <div className="space-y-3 text-xs">
                <h3 className="font-semibold text-[var(--text-primary)]">基础字段</h3>
                <DetailField label="当前状态"><StatusTag status={selectedWorkItem.item.status} /></DetailField>
                <DetailField label="代码仓库">{selectedWorkItem.item.repo || '未设置'}</DetailField>
                <DetailField label="特性分支"><span className="font-mono">{selectedWorkItem.item.branch || '未设置'}</span></DetailField>
                <DetailField label="责任开发者">{selectedWorkItem.item.developer || '未设置'}</DetailField>
                <DetailField label="优先级"><StatusTag status={selectedWorkItem.item.priority} /></DetailField>
                <DetailField label="所属产品线">{selectedWorkItem.item.productLineName || '未设置'}</DetailField>
                <DetailField label="迭代版本">{selectedWorkItem.item.versionName || '未设置'}</DetailField>
                <DetailField label="截止时间"><span className="font-mono">{selectedWorkItem.item.dueDate || '未设置'}</span></DetailField>
                <DetailField label="预计工时">{selectedWorkItem.item.estimatedHours ?? 0} 小时</DetailField>
                <DetailField label="已投入工时">{selectedWorkItem.item.spentHours ?? 0} 小时</DetailField>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <h3 className="font-semibold text-[var(--text-primary)]">基础字段</h3>
                <DetailField label="当前状态"><StatusTag status={selectedWorkItem.item.status} /></DetailField>
                <DetailField label="所属产品线">{selectedWorkItem.item.productLineName || '未设置'}</DetailField>
                <DetailField label="关联版本">{selectedWorkItem.item.versionName || '未设置'}</DetailField>
                <DetailField label="严重程度"><StatusTag status={selectedWorkItem.item.severity} /></DetailField>
                <DetailField label="优先级"><StatusTag status={selectedWorkItem.item.priority || '中'} /></DetailField>
                <DetailField label="缺陷类型">{selectedWorkItem.item.type || '功能缺陷'}</DetailField>
                <DetailField label="责任处理人">{selectedWorkItem.item.assignee || selectedWorkItem.item.ownerName || '未设置'}</DetailField>
                <DetailField label="所属环境">{selectedWorkItem.item.env || '未设置'}</DetailField>
                <DetailField label="提报人">{selectedWorkItem.item.reporter || '未设置'}</DetailField>
                <DetailField label="创建时间"><span className="font-mono">{selectedWorkItem.item.createdAt || '未设置'}</span></DetailField>
              </div>
            )
          }
        >
          {selectedWorkItem.kind === 'requirement' || selectedWorkItem.kind === 'design' ? (
            <div className="w-full space-y-5 text-xs">
              <DetailField label={selectedWorkItem.kind === 'design' ? '设计任务名称' : '需求名称'}><span className="font-medium">{selectedWorkItem.item.title}</span></DetailField>
              <DetailField label="验收标准"><p className="min-h-20 whitespace-pre-wrap break-words leading-6">{selectedWorkItem.item.expectedGoal || '未填写验收标准'}</p></DetailField>
              <DetailField label="任务描述"><p className="min-h-28 whitespace-pre-wrap break-words leading-6">{selectedWorkItem.item.description || '未填写需求描述'}</p></DetailField>
              <section className="border-t border-[var(--border-main)] pt-4">
                <div className="mb-4 flex items-center gap-5 border-b border-[var(--border-main)] pb-2">
                  <span className="border-b-2 border-[var(--primary)] pb-2 text-sm text-[var(--active-text)]">关联工单</span>
                  <span className="text-sm text-[var(--text-muted)]">动态 <span className="ml-1 text-[11px]">{selectedWorkItem.item.events?.length || 0}</span></span>
                </div>
                {selectedWorkItem.item.sourceWorkOrderTitles?.length ? <div className="flex flex-wrap gap-2">{selectedWorkItem.item.sourceWorkOrderTitles.map((title, index) => <span key={`${title}-${index}`} className="max-w-full truncate rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--text-body)]">{title}</span>)}</div> : <p className="text-[var(--text-muted)]">未关联工单</p>}
              </section>
            </div>
          ) : selectedWorkItem.kind === 'task' ? (
            <div className="w-full space-y-5 text-xs">
              <DetailField label="研发任务名称"><span className="font-medium">{selectedWorkItem.item.title}</span></DetailField>
              <DetailField label="任务描述"><p className="min-h-28 whitespace-pre-wrap break-words leading-6">{selectedWorkItem.item.description || '未填写任务描述'}</p></DetailField>
            </div>
          ) : (
            <div className="w-full space-y-5 text-xs">
              <DetailField label="缺陷编号"><span className="font-mono">{selectedWorkItem.item.code || '未设置'}</span></DetailField>
              <DetailField label="缺陷名称"><span className="font-medium">{selectedWorkItem.item.title}</span></DetailField>
              <DetailField label="复现步骤 / 缺陷描述"><p className="min-h-28 whitespace-pre-wrap break-words leading-6">{selectedWorkItem.item.description || '未填写缺陷描述'}</p></DetailField>
              <DetailField label="关联工单">{selectedWorkItem.item.sourceWorkOrderTitles?.length ? <div className="flex flex-wrap gap-2">{selectedWorkItem.item.sourceWorkOrderTitles.map((title, index) => <span key={`${title}-${index}`} className="max-w-full truncate rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--text-body)]">{title}</span>)}</div> : '未关联工单'}</DetailField>
            </div>
          )}
        </WorkItemCreatePanel>
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
    </div>
  );
};
