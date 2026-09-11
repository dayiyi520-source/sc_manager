import React, { useEffect, useMemo, useState } from 'react';
import { DatePicker, Cascader, Segmented } from "antd";
import {
  Bug,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit,
  Filter,
  GitBranch,
  ListTodo,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserRound
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { Modal, StatusTag } from '../common/UIComponents';
import { DefectBug, DevTask, RequirementTask, VersionIteration } from '../../types';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
import { SearchableSelect } from '../common';

type ViewMode = 'list' | 'detail' | 'planning';
type DetailTab = 'requirements' | 'tasks' | 'bugs';
type SelectedWorkItem =
  | { kind: 'requirement'; item: RequirementTask }
  | { kind: 'task'; item: DevTask }
  | { kind: 'bug'; item: DefectBug };

const avatarColors = ['#C084FC', '#FBBF24', '#60A5FA', '#34D399'];

const normalize = (value?: string) => (value || '').trim().toLowerCase();

const versionMatches = (version: VersionIteration, value?: string) => {
  const source = normalize(value);
  if (!source) return false;
  const candidates = [version.name, version.code, version.name.replace(/\s*\([^)]*\)/g, '')]
    .map(normalize)
    .filter(Boolean);
  return candidates.some((candidate) => candidate.includes(source) || source.includes(candidate));
};

const versionProgress = (version: VersionIteration) =>
  Math.round(
    ((version.completedReqCount ?? version.reqCount ?? 0) /
      Math.max(version.requirementsCount ?? version.reqCount ?? 1, 1)) *
      100
  );

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

export const VersionIterationView: React.FC = () => {
  const {
    versions,
    productLines,
    requirementTasks,
    devTasks,
    bugs,
    setVersions,
    addVersion,
    updateVersion,
    addToast
  } = useApp();
  const [mode, setMode] = useState<ViewMode>('list');
  const [detailTab, setDetailTab] = useState<DetailTab>('requirements');
  const [selectedWorkItem, setSelectedWorkItem] = useState<SelectedWorkItem | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [productLineFilter, setProductLineFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(versions[0]?.id || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formReleaseDate, setFormReleaseDate] = useState('2026-09-08');
  const [formProductLineId, setFormProductLineId] = useState('');

  useEffect(() => {
    if (!selectedId && versions[0]?.id) setSelectedId(versions[0].id);
  }, [selectedId, versions]);

  const visibleVersions = useMemo(
    () =>
      productLineFilter === 'all'
        ? versions
        : versions.filter((version) => version.productLineId === productLineFilter),
    [productLineFilter, versions]
  );

  useEffect(() => {
    if (visibleVersions.length && !visibleVersions.some((version) => version.id === selectedId)) {
      setSelectedId(visibleVersions[0].id);
    }
  }, [selectedId, visibleVersions]);

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
  const unplannedRequirements = useMemo(
    () =>
      requirementTasks.filter(
        (item) =>
          !item.versionId &&
          !item.versionName &&
          (productLineFilter === 'all' || item.productLineId === productLineFilter)
      ),
    [productLineFilter, requirementTasks]
  );

  const openDetail = (version: VersionIteration) => {
    setSelectedId(version.id);
    setMode('detail');
  };

  const openCreateVersion = () => {
    setEditingVersionId(null);
    setFormName('');
    setFormProductLineId('');
    setFormReleaseDate('2026-09-08');
    setIsModalOpen(true);
  };

  const openEditVersion = (version: VersionIteration) => {
    setEditingVersionId(version.id);
    setFormName(version.name);
    setFormProductLineId(version.productLineId || '');
    setFormReleaseDate(version.releaseDate || version.endDate || '');
    setIsModalOpen(true);
  };

  const deleteVersion = (version: VersionIteration) => {
    if (!window.confirm(`确定删除迭代“${version.name}”吗？删除后不可恢复。`)) return;
    setVersions((current) => current.filter((item) => item.id !== version.id));
    if (selectedId === version.id) setSelectedId('');
    addToast('success', '迭代已删除', version.name);
  };

  const openRequirement = (item: RequirementTask) => setSelectedWorkItem({ kind: 'requirement', item });
  const openDevTask = (item: DevTask) => setSelectedWorkItem({ kind: 'task', item });
  const openBug = (item: DefectBug) => setSelectedWorkItem({ kind: 'bug', item });

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formName.trim()) {
      addToast('warning', '请填写迭代名称');
      return;
    }
    const productLine = productLines.find((item) => item.id === formProductLineId);
    if (editingVersionId) {
      updateVersion(editingVersionId, {
        name: formName.trim(),
        productLineId: formProductLineId || undefined,
        productLineName: productLine?.name,
        releaseDate: formReleaseDate || undefined,
        endDate: formReleaseDate || undefined
      });
      setIsModalOpen(false);
      setEditingVersionId(null);
      addToast('success', '迭代已更新', formName.trim());
      return;
    }
    addVersion({
      name: formName.trim(),
      status: '规划中',
      productLineId: formProductLineId || undefined,
      productLineName: productLine?.name,
      releaseDate: formReleaseDate,
      reqCount: 0,
      requirementsCount: 0,
      bugCount: 0,
      changelog: '版本常规升级与体验优化'
    });
    setIsModalOpen(false);
    setFormName('');
    setFormProductLineId('');
    setEditingVersionId(null);
    addToast('success', '迭代创建成功', formName.trim());
  };

  const tabButton = (key: ViewMode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(key)}
      className={`h-9 border-b-2 px-4 text-xs font-semibold transition ${
        mode === key
          ? 'border-[var(--primary)] text-[var(--active-text)]'
          : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  );

  const renderList = () => (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[var(--bg-surface-soft)] text-[11px] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">迭代标题</th>
                <th className="px-3 py-3 font-medium">状态</th>
                <th className="px-3 py-3 font-medium">起止时间</th>
                <th className="px-3 py-3 font-medium">负责人</th>
                <th className="px-3 py-3 font-medium">完成度</th>
                <th className="px-3 py-3 font-medium">工时容量</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {filteredVersions.map((version, index) => {
                const progress = versionProgress(version);
                return (
                  <tr key={version.id} className="hover:bg-[var(--bg-surface-soft)]">
                    <td className="max-w-[320px] px-4 py-3.5">
                      <button type="button" onClick={() => openDetail(version)} className="text-left font-semibold text-[var(--text-primary)] hover:text-[var(--primary)]">
                        <span className="block truncate">{version.name}</span>
                      </button>
                    </td>
                    <td className="px-3 py-3"><StatusTag status={version.status} /></td>
                    <td className="px-3 py-3 text-[var(--text-body)]">{version.startDate || '--'} ~ {version.endDate || version.releaseDate || '--'}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-body)]">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-white" style={{ background: avatarColors[index % avatarColors.length] }}>朱</span>
                        朱成浩
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex min-w-44 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div className="h-full bg-[var(--primary)]" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)]">{version.completedReqCount ?? 0}/{version.requirementsCount ?? version.reqCount ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">{(version.reqCount || version.requirementsCount || 0) * 12}.0/0.0h</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEditVersion(version)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)]" title="编辑迭代"><Edit className="h-4 w-4" /></button>
                      <button type="button" onClick={() => deleteVersion(version)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]" title="删除迭代"><Trash2 className="h-4 w-4" /></button>
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
    const detailTabs: Array<{ key: DetailTab; label: string; count: number; icon: React.ReactNode }> = [
      { key: 'requirements', label: '需求', count: selectedRequirements.length, icon: <ListTodo className="h-4 w-4" /> },
      { key: 'tasks', label: '任务', count: selectedDevTasks.length, icon: <GitBranch className="h-4 w-4" /> },
      { key: 'bugs', label: '缺陷', count: selectedBugs.length, icon: <Bug className="h-4 w-4" /> }
    ];
    return (
      <div className="version-detail-layout grid min-h-[620px] grid-cols-[250px_minmax(0,1fr)] overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <aside className="flex min-h-0 flex-col border-r border-[var(--border-main)] bg-[var(--bg-surface-soft)]">
          <div className="flex h-12 items-center justify-between border-b border-[var(--border-main)] px-4">
            <span className="font-semibold text-[var(--text-primary)]">迭代目录</span>
            <span className="text-[11px] text-[var(--text-muted)]">{visibleVersions.length} 个</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {visibleVersions.map((version) => {
              const progress = versionProgress(version);
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
          <button type="button" onClick={openCreateVersion} className="flex h-11 items-center gap-1.5 border-t border-[var(--border-main)] px-4 text-[var(--primary)] hover:bg-[var(--bg-surface)]"><Plus className="h-4 w-4" />新建迭代</button>
        </aside>
        <section className="min-w-0 bg-[var(--bg-surface)]">
          {selectedVersion ? (
            <>
              <div className="border-b border-[var(--border-main)] px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><h2 className="truncate text-lg font-bold text-[var(--text-primary)]">{selectedVersion.name}</h2><StatusTag status={selectedVersion.status} /></div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{selectedVersion.productLineName || '未关联产品线'}</div>
                  </div>
                  <button type="button" onClick={() => setMode('planning')} className={secondaryButton}><GitBranch className="h-4 w-4" />进入规划</button>
                </div>
                <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
                  <Metric label="负责人" value={<span className="inline-flex items-center gap-1.5"><UserRound className="h-3.5 w-3.5 text-[var(--text-muted)]" />朱成浩</span>} />
                  <Metric label="迭代周期" value={<span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-[var(--text-muted)]" />{selectedVersion.startDate || '--'} ~ {selectedVersion.endDate || selectedVersion.releaseDate || '--'}</span>} />
                  <Metric label="完成度" value={`${selectedVersion.completedReqCount ?? 0}/${selectedVersion.requirementsCount ?? selectedVersion.reqCount ?? 0}`} />
                  <Metric label="关联缺陷" value={selectedBugs.length} />
                </div>
              </div>
              <div className="flex items-center gap-1 border-b border-[var(--border-main)] px-5">
                {detailTabs.map((tab) => (
                  <button type="button" key={tab.key} onClick={() => setDetailTab(tab.key)} className={`inline-flex h-11 items-center gap-1.5 border-b-2 px-3 text-xs font-semibold ${detailTab === tab.key ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                    {tab.icon}{tab.label}<span className="text-[10px]">· {tab.count}</span>
                  </button>
                ))}
              </div>
              <div className="p-5">
                {detailTab === 'requirements' && (selectedRequirements.length ? <RequirementRows items={selectedRequirements} onOpen={openRequirement} /> : <EmptyState icon={<ListTodo className="h-5 w-5" />} title="暂无关联需求" description="可以在需求任务中将工作项关联到当前迭代。" />)}
                {detailTab === 'tasks' && (selectedDevTasks.length ? <DevTaskRows items={selectedDevTasks} onOpen={openDevTask} /> : <EmptyState icon={<GitBranch className="h-5 w-5" />} title="暂无研发任务" description="当前迭代还没有关联研发任务。" />)}
                {detailTab === 'bugs' && (selectedBugs.length ? <BugRows items={selectedBugs} onOpen={openBug} /> : <EmptyState icon={<Bug className="h-5 w-5" />} title="暂无缺陷" description="当前迭代没有需要跟踪的缺陷记录。" />)}
              </div>
            </>
          ) : <EmptyState icon={<GitBranch className="h-5 w-5" />} title="暂无迭代" description="创建一个迭代后即可查看详情。" />}
        </section>
      </div>
    );
  };

  const renderPlanning = () => (
    <div className="version-planning-layout grid min-h-[620px] grid-cols-[minmax(360px,1fr)_minmax(420px,1.1fr)] gap-3">
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4">
          <span className="font-semibold text-[var(--text-primary)]">待规划工作项 · {unplannedRequirements.length}</span>
          <Search className="h-4 w-4 text-[var(--text-muted)]" />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {unplannedRequirements.slice(0, 30).map((item, index) => (
            <div key={item.id} className="mb-1 rounded-md border border-transparent p-3 hover:border-[var(--border-main)] hover:bg-[var(--bg-surface-soft)]">
              <div className="truncate font-medium text-[var(--text-primary)]">{item.title}</div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-muted)]"><span><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: avatarColors[index % avatarColors.length] }} />{item.ownerName || '未分配'}</span><span>{item.estimatedHours || 0}h</span><StatusTag status={item.status} /></div>
            </div>
          ))}
        </div>
        <button type="button" className="flex h-11 items-center gap-1.5 border-t border-[var(--border-main)] px-4 text-[var(--primary)]"><Plus className="h-4 w-4" />新建工作项</button>
      </section>
      <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
        <div className="flex h-12 items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4"><span className="font-semibold text-[var(--text-primary)]">迭代版本</span><button type="button" onClick={openCreateVersion} className="text-[var(--primary)]"><Plus className="mr-1 inline h-4 w-4" />新建迭代</button></div>
        <div className="flex-1 overflow-y-auto p-2">
          {visibleVersions.map((version) => (
            <div key={version.id} className={`mb-1 rounded-md border p-3 transition ${selectedVersion?.id === version.id ? 'border-[var(--primary)] bg-[var(--bg-surface-soft)]' : 'border-transparent hover:border-[var(--border-main)]'}`}>
              <div className="flex items-start justify-between gap-3"><button type="button" onClick={() => setSelectedId(version.id)} className="min-w-0 truncate text-left font-semibold text-[var(--text-primary)] hover:text-[var(--primary)]">{version.name}</button><StatusTag status={version.status} /></div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-muted)]"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-[var(--primary)]" style={{ width: `${versionProgress(version)}%` }} /></div><span>{version.completedReqCount ?? 0}/{version.requirementsCount ?? version.reqCount ?? 0}</span><button type="button" onClick={() => openDetail(version)} className="text-[var(--primary)]">详情</button></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <div className="space-y-3 text-xs">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-main)]">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center">{tabButton('list', '列表')}{tabButton('detail', '详情')}{tabButton('planning', '规划')}</div>
        </div>
        <div className="version-toolbar ml-auto flex flex-wrap items-center justify-end gap-2">
          <div className="w-44">
            <SearchableSelect
              label="产品线"
              hideLabel
              value={productLineFilter === 'all' ? '全部产品线' : productLines.find((line) => line.id === productLineFilter)?.name || ''}
              options={['全部产品线', ...productLines.map((line) => line.name)]}
              onChange={(name) => setProductLineFilter(name === '全部产品线' ? 'all' : productLines.find((line) => line.name === name)?.id || 'all')}
              placeholder="全部产品线"
            />
          </div>
          {mode === 'list' ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索迭代"
                  className="app-control w-44 pl-8 pr-2 text-xs"
                />
              </div>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="app-control w-28 px-2 text-xs">
                <option value="all">全部状态</option>
                <option value="规划中">规划中</option>
                <option value="迭代中">迭代中</option>
                <option value="封版测试">封版测试</option>
                <option value="已发布">已发布</option>
              </select>
              <button type="button" className={`${secondaryButton} h-8 w-8 px-0`} title="筛选">
                <Filter className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={openCreateVersion} className={`${primaryButton} h-8`}>
                <Plus className="h-3.5 w-3.5" />
                新建
              </button>
            </>
          ) : (
            <>
              <span className="hidden max-w-52 truncate text-[11px] text-[var(--text-muted)] md:inline">{selectedVersion?.name || '请选择迭代'}</span>
              <button type="button" onClick={openCreateVersion} className={`${primaryButton} h-8`}>
                <Plus className="h-3.5 w-3.5" />
                新建迭代
              </button>
            </>
          )}
        </div>
      </div>
      {mode === 'list' && renderList()}
      {mode === 'detail' && renderDetail()}
      {mode === 'planning' && renderPlanning()}
      {selectedWorkItem && (
        <WorkItemCreatePanel
          isOpen
          onClose={() => setSelectedWorkItem(null)}
          title={selectedWorkItem.kind === 'requirement' ? '需求详情' : selectedWorkItem.kind === 'task' ? '研发任务详情' : '缺陷详情'}
          presentation="drawer"
          showContinueOption={false}
          footer={<button type="button" onClick={() => setSelectedWorkItem(null)} className="tech-button-primary h-10 rounded-lg px-4 text-xs font-semibold">关闭</button>}
          properties={
            selectedWorkItem.kind === 'requirement' ? (
              <div className="space-y-3 text-xs">
                <h3 className="font-semibold text-[var(--text-primary)]">基础字段</h3>
                <DetailField label="当前状态"><StatusTag status={selectedWorkItem.item.status} /></DetailField>
                <DetailField label="需求类型">{selectedWorkItem.item.requirementType || '未设置'}</DetailField>
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
          {selectedWorkItem.kind === 'requirement' ? (
            <div className="w-full space-y-5 text-xs">
              <DetailField label="需求名称"><span className="font-medium">{selectedWorkItem.item.title}</span></DetailField>
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
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVersionId ? '编辑迭代' : '新建迭代'}
        footer={<><button type="button" onClick={() => setIsModalOpen(false)} className={secondaryButton}>取消</button><button type="button" onClick={(event) => save(event as unknown as React.FormEvent)} className={primaryButton}>{editingVersionId ? '保存修改' : '保存迭代'}</button></>}
      >
        <form onSubmit={save} className="space-y-4">
          <label className="block text-xs font-medium text-[var(--text-body)]">所属产品线<select required value={formProductLineId} onChange={(event) => setFormProductLineId(event.target.value)} className="app-control mt-1 px-3"><option value="">请选择产品线</option>{productLines.map((line) => <option key={line.id} value={line.id}>{line.name}</option>)}</select></label>
          <label className="block text-xs font-medium text-[var(--text-body)]">迭代名称<input required value={formName} onChange={(event) => setFormName(event.target.value)} className="app-control mt-1 px-3" /></label>
          <label className="block text-xs font-medium text-[var(--text-body)]">计划发版日期<input type="date" value={formReleaseDate} onChange={(event) => setFormReleaseDate(event.target.value)} className="app-control mt-1 px-3" /></label>
        </form>
      </Modal>
    </div>
  );
};
