import { goalSourceLabel, hasDownstreamAlignment, isPersonalGoal, isAssignedPersonalGoal } from './goalPresentation';
import { krDetails } from '../../../services/okrKrDetails';
import { canEditOkr } from '../../../services/okrSettingsPolicy';
import { periodLabel, periodBounds } from '../../../services/okrPeriods';
import type { OkrSettings } from '../../../services/okrRepository';
import { KrDetailTable } from './KrDetailTable';
import './goalTemplates.css';
import { goalLevel } from '../../../services/okrGoalRules';
import React from 'react';
import { Alert, Button, Dropdown, Empty, Progress, Tag, Tooltip, Popover } from 'antd';
import { PencilIcon, KebabHorizontalIcon, GitBranchIcon, PlusIcon, CopyIcon, RepoTemplateIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { ChevronDown, ChevronRight } from '@/components/common/octicons-compat';
import type { OkrPerson, OkrRecord, OkrKrDetail } from '../../../services/okrRepository';
import type { ActionGroupValues } from './ActionBreakdownForm';

export type MyTargetViewMode = 'list' | 'card';

export type MyTargetActionViewItem = {
  details?: OkrKrDetail[]; detailLabel?: string;
  label?: string; executionActions?: Array<{ id: string; title: string; progress: number; weight?: number; deadline?: string }>;
  id: string;
  title: string;
  assigneeNames: string[];
  progress: number;
  weight: number;
  deadline: string;
  alignments?: Array<{ id: string; title: string; ownerName: string; levelLabel: string; progress: number; actions: Array<{ id: string; title: string; linked: boolean }> }>;
};

export type MyTargetViewItem = {
  id: string;
  primaryLabel?: 'KR';
  primaryDetails?: OkrKrDetail[];
  primaryDetailLabel?: string;
  detailId?: string;
  title: string;
  status: string;
  sourceName?: string;
  alignmentLabel?: string;
  editable?: boolean;
  deletable?: boolean;
  ownerNames: string[];
  creatorName?: string;
  levelLabel?: string;
  metaOwnerId?: string;
  totalWeight?: number;
  maxDeadline?: string;
  progress: number;
  objectiveWeight?: number; initialPending?: boolean; savedAt?: string; awaitingApproval?: boolean; changePurpose?: string; autonomous?: boolean;
  actions: MyTargetActionViewItem[];
};

export type DemoTargetBreakdown = {
  id: string;
  periodKey: string;
  mode: 'draft' | 'submit';
  groups: ActionGroupValues[];
  savedAt: string;
};

type Props = {
  periodKey: string;
  targets: MyTargetViewItem[];
  viewMode: MyTargetViewMode;
  collapsed: boolean;
  onToggle: () => void;
  onOpenTarget: (targetId: string) => void;
  onProgress?: (recordId: string, itemId: string) => void;
  onEditTarget?: (targetId: string) => void;
  onDeleteTarget?: (targetId: string) => void;
  busy?: boolean;
  draftCount?: number; onSubmitDrafts?: () => Promise<void>;
  onAddGoal?: () => void;
  onCopyGoal?: () => void;
  onGoalTemplates?: () => void;
};

export const getPeriodCountdown = (periodKey: string) => {
  const today = dayjs().startOf('day');
  const bounds = periodBounds(periodKey);
  if (!bounds) return '周期无效';
  const periodEnd = dayjs(bounds.end).startOf('day');
  const remaining = periodEnd.diff(today, 'day');
  if (remaining < 0) return '周期已结束';
  if (remaining === 0) return '今天结束';
  return `剩余 ${remaining} 天`;
};

const formatDeadline = (value: string) => value ? dayjs(value).format('MM-DD') : '未设置';
const assigneeLabel = (names: string[]) => names.length ? names.join('、') : '未指定承接人';
const isSubmitted = (target: MyTargetViewItem) => target.status !== 'draft';

const openOnKeyboard = (event: React.KeyboardEvent<HTMLElement>, onOpen: () => void) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onOpen();
  }
};

const weightedProgress = (actions: MyTargetActionViewItem[]) => {
  const totalWeight = actions.reduce((total, action) => total + action.weight, 0);
  if (!totalWeight) return 0;
  return Math.round(actions.reduce((total, action) => total + action.progress * action.weight, 0) / totalWeight);
};

const latestDeadline = (values: string[]) => values.filter(Boolean).sort().at(-1) || '';

export const buildMyTargetViewItems = (
  records: OkrRecord[],
  demoBreakdowns: DemoTargetBreakdown[],
  sourceActions: OkrRecord[],
  people: OkrPerson[],
  currentUserId: string,
  settings?: OkrSettings,
): MyTargetViewItem[] => {
  const nameOf = (id?: string) => people.find(person => person.id === id)?.name;
  const namesOf = (ids?: string[] | string) => {
    const normalized = Array.isArray(ids) ? ids : ids ? [ids] : [];
    return [...new Set(normalized.map(nameOf).filter((name): name is string => Boolean(name)))];
  };
  const ownerName = nameOf(currentUserId);
  const ownerNameOf = (id?: string) => nameOf(id) || '未指定';
  const allRecords = [...new Map([...sourceActions, ...records].map(record => [record.id, record])).values()];
  const alignmentsFor = (actionId: string, periodKey: string, ownerId: string, objectiveId: string) => {
    const active = allRecords.filter(record => hasDownstreamAlignment(record, objectiveId, actionId, ownerId, periodKey, people));
    const objectives = active.filter(record => record.kind === 'objective');
    const children = active.filter(record => record.kind === 'action');
    const groups = new Map<string, OkrRecord[]>();
    children.forEach(record => {
      const key = `${record.ownerId}:${record.payload.parentObjectiveId}`;
      groups.set(key, active.filter(item => item.kind === 'action' && item.ownerId === record.ownerId && item.payload.parentObjectiveId === record.payload.parentObjectiveId));
    });
    const levelOf = (ownerId: string) => {
      const person = people.find(item => item.id === ownerId);
      return goalLevel(person);
    };
    return [
      ...objectives.map(record => ({ id: record.id, title: record.payload.title, ownerName: ownerNameOf(record.ownerId), levelLabel: levelOf(record.ownerId), progress: Number(record.payload.progress || 0), actions: (record.payload.keyResults || []).map(item => ({ id: item.id, title: item.title, linked: true })) })),
      ...Array.from(groups.entries()).map(([id, group]) => ({ id, title: `${ownerNameOf(group[0].ownerId)}的拆解目标`, ownerName: ownerNameOf(group[0].ownerId), levelLabel: levelOf(group[0].ownerId), progress: weightedProgress(group.map(item => ({ id: item.id, title: item.payload.title, assigneeNames: [], progress: Number(item.payload.progress || 0), weight: Number(item.payload.weight || 0), deadline: item.payload.deadline || '' }))), actions: group.map(item => ({ id: item.id, title: item.payload.title, linked: item.payload.parentActionId === actionId })) })),
    ];
  };
  const actionView = (record: OkrRecord): MyTargetActionViewItem => ({
    id: record.id,
    title: record.payload.title,
    assigneeNames: namesOf(record.payload.assigneeIds),
    progress: Number(record.payload.progress || 0),
    weight: Number(record.payload.weight || 0),
    deadline: record.payload.deadline || '',
    alignments: alignmentsFor(record.id, record.periodKey, record.ownerId, record.payload.parentObjectiveId || record.id),
  });
  const objectiveTargets = records.filter(record => record.kind === 'objective').map(record => {
    const ownPersonal = isPersonalGoal(record);
    const assignedPersonal = isAssignedPersonalGoal(record);
    const displayActions = ownPersonal ? (record.payload.keyResults || []).flatMap(kr => (kr.executionActions || []).filter(action => action.ownerId === record.ownerId)) : record.payload.keyResults || [];
    const actions: MyTargetActionViewItem[] = displayActions.map(action => ({
      details: 'details' in action ? action.details : undefined, detailLabel: 'structureType' in action && action.structureType === 'delivery' ? '项目产品' : '迭代版本',
      label: ownPersonal ? 'A' : 'KR', executionActions: 'executionActions' in action ? action.executionActions?.filter(item => item.ownerId === record.ownerId) : undefined,
      id: action.id,
      title: action.title,
      assigneeNames: namesOf('assigneeIds' in action ? action.assigneeIds : []),
      progress: Number(action.progress || 0),
      weight: Number(action.weight || 0),
      deadline: action.deadline || '',
      alignments: ownPersonal ? [] : alignmentsFor(action.id, record.periodKey, record.ownerId, record.id),
    }));
    const sourceId = record.payload.parentObjectiveId || record.payload.alignments?.[0]?.parentObjectiveId;
    const recordOwner = people.find(person => person.id === record.ownerId);
    const source = sourceId ? [...sourceActions, ...records].find(item => item.id === sourceId) : undefined;
    const sourceOwner = nameOf(source?.ownerId || recordOwner?.supervisorId);
    return {
      id: record.id,
      primaryLabel: assignedPersonal ? 'KR' as const : undefined,
      primaryDetails: assignedPersonal ? krDetails(record.payload.keyResults?.[0] || { id: '', title: '', weight: 100, progress: 0 }) : undefined,
      primaryDetailLabel: record.payload.keyResults?.[0]?.structureType === 'delivery' ? '项目产品' : '迭代版本',
      objectiveWeight: record.payload.weight ?? 100, initialPending: record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved',
      detailId: record.id,
      alignmentLabel: goalSourceLabel(record, allRecords, people) || `${periodLabel(record.periodKey)}目标`,
      editable: canEditOkr(record,currentUserId,settings,people) && record.changeRequest?.status !== 'pending',
      deletable: record.changeRequest?.status === 'pending' ? record.ownerId === currentUserId : canEditOkr(record,currentUserId,settings,people) && !record.payload.inherited,
      title: record.payload.title,
      status: record.status, awaitingApproval: record.changeRequest?.status === 'pending', changePurpose: record.changeRequest?.purpose, autonomous: record.payload.origin === 'autonomous',
      sourceName: sourceOwner ? `来源自上级 · ${sourceOwner}` : undefined,
      ownerNames: namesOf((record.payload.keyResults || []).flatMap(action => action.assigneeIds || [])).length ? namesOf((record.payload.keyResults || []).flatMap(action => action.assigneeIds || [])) : namesOf([record.ownerId]),
      creatorName: ownerNameOf(record.ownerId),
      levelLabel: goalLevel(recordOwner),
      metaOwnerId: source?.ownerId || recordOwner?.supervisorId || record.ownerId,
      totalWeight: record.payload.weight ?? 100,
      maxDeadline: record.payload.deadline || latestDeadline(actions.map(action => action.deadline)),
      progress: weightedProgress(actions),
      savedAt: record.createdAt,
      actions,
    };
  });

  const actionGroups = new Map<string, OkrRecord[]>();
  records.filter(record => record.kind === 'action').forEach(record => {
    const parentId = record.payload.parentActionId || record.payload.parentKeyResultId || record.payload.parentObjectiveId || record.id;
    actionGroups.set(parentId, [...(actionGroups.get(parentId) || []), record]);
  });
  const actionTargets = Array.from(actionGroups.entries()).map(([parentId, group]) => {
    const source = [...sourceActions, ...records].find(item => item.id === parentId);
    const actions = group.map(actionView);
    const sourceOwner = source ? nameOf(source.ownerId) : undefined;
    const groupOwner = people.find(person => person.id === group[0]?.ownerId);
    return {
      id: `action-group-${parentId}`,
      alignmentLabel: source?.payload.title || '来源目标已不可用',
      editable: group.every(item => item.ownerId === currentUserId),
      deletable: group.every(item => item.ownerId === currentUserId),
      detailId: group.find(item => item.status === 'draft')?.id || group[0]?.id,
      title: source?.payload.title || group[0]?.payload.title || '来源目标已不可用',
      status: group.some(item => item.status === 'draft') ? (group.some(item => item.status !== 'draft') ? 'partial-draft' : 'draft') : 'active',
      sourceName: sourceOwner ? `来源自上级 · ${sourceOwner}` : undefined,
      creatorName: ownerNameOf(group[0]?.ownerId),
      levelLabel: goalLevel(groupOwner),
      metaOwnerId: source?.ownerId || groupOwner?.supervisorId || group[0]?.ownerId,
      totalWeight: actions.reduce((sum, action) => sum + action.weight, 0),
      maxDeadline: source?.payload.deadline || latestDeadline(actions.map(action => action.deadline)),
      ownerNames: (() => {
        const assigneeNames = namesOf(group.flatMap(item => item.payload.assigneeIds || []));
        return assigneeNames.length ? assigneeNames : (ownerName ? [ownerName] : []);
      })(),
      progress: weightedProgress(actions),
      savedAt: group.map(item => item.createdAt).filter((value): value is string => Boolean(value)).sort().at(-1),
      actions,
    };
  });

  const demoTargets = demoBreakdowns.flatMap(breakdown => breakdown.groups.map(group => {
    const actions: MyTargetActionViewItem[] = group.actions.map((action, index) => ({
      id: `${breakdown.id}-${group.parent.id}-${index}`,
      title: action.title || '',
      assigneeNames: namesOf('assigneeIds' in action ? action.assigneeIds : []),
      progress: 0,
      weight: Number(action.weight || 0),
      deadline: action.deadline?.format('YYYY-MM-DD') || '',
    }));
    const sourceOwner = nameOf(group.parent.ownerId);
    return {
      id: `demo-${breakdown.id}-${group.parent.id}`,
      title: group.parent.payload.title,
      status: breakdown.mode === 'draft' ? 'draft' : 'active',
      sourceName: sourceOwner ? `来源自上级 · ${sourceOwner}` : undefined,
      ownerNames: ownerName ? [ownerName] : [],
      progress: weightedProgress(actions),
      savedAt: breakdown.savedAt,
      actions,
    };
  }));

  return [...objectiveTargets, ...actionTargets, ...demoTargets];
};

const ActionRow: React.FC<{ action: MyTargetActionViewItem; index: number; submitted: boolean; compact?: boolean; inlineAssignees?: boolean; onProgress?: (id: string) => void }> = ({ action, index, submitted, compact, inlineAssignees = false, onProgress }) => {
  const overdue = Boolean(action.deadline) && dayjs(action.deadline).endOf('day').isBefore(dayjs()) && action.progress < 100;
  return <div className={`okr-target-action-row${compact ? ' is-compact' : ''}${inlineAssignees ? ' has-inline-assignees' : ''}`}>
    <span className="okr-target-action-index">{action.label || 'A'}{index + 1}</span>
    <div className="okr-target-action-content"><strong title={action.title}>{action.title || '未填写行动描述'}{inlineAssignees && action.assigneeNames.length > 0 && <span className="okr-target-action-assignees-inline"> {action.assigneeNames.map(name => `@${name}`).join(' ')}</span>}</strong>
      {!compact && !!action.alignments?.length && <Popover trigger={['hover', 'focus']} placement="bottomRight" title="对齐我的" content={<div className="okr-target-alignment-preview" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>{action.alignments.map(target => <section key={target.id}><h4 title={target.title}>{target.title}</h4><div className="okr-target-alignment-meta"><Progress type="circle" percent={target.progress} size={24} showInfo={false}/><span>{target.progress}%</span><Tag color="green">{target.levelLabel}</Tag><span>{target.ownerName}</span></div>{target.actions.map((item, i) => <div key={item.id} className={`okr-target-alignment-action${item.linked ? ' is-linked' : ''}`}><span>A{i + 1}</span><span title={item.title}>{item.title}</span>{item.linked && <GitBranchIcon size={14}/>}</div>)}</section>)}</div>}><Button className="okr-target-action-alignment" type="text" aria-label={`${action.label || 'A'}${index + 1}下级对齐`} icon={<GitBranchIcon size={16}/>} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}/></Popover>}
    </div>
    {!inlineAssignees && <span title={assigneeLabel(action.assigneeNames)}>{assigneeLabel(action.assigneeNames)}</span>}
    {!compact && <>
      <span className="okr-target-action-progress">{submitted ? <Button type="text" aria-label={`查看${action.label || 'A'}${index + 1}进度`} onClick={event => { event.stopPropagation(); onProgress?.(action.id); }} onKeyDown={event => event.stopPropagation()}><Progress type="circle" percent={action.progress} size={24} showInfo={false}/><b>{action.progress}%</b></Button> : '--'}</span>
      <span>{action.weight}%</span>
      <time className={overdue ? 'is-overdue' : ''}>{formatDeadline(action.deadline)}</time>
    </>}
    {!compact && !!action.details?.length && <KrDetailTable rows={action.details} label={action.detailLabel || '迭代版本'}/>}
    {!compact && !!action.executionActions?.length && <div className="okr-target-execution-actions">{action.executionActions.map((item, i) => <ActionRow key={item.id} action={{ ...item, weight: item.weight ?? 0, deadline: item.deadline || '', assigneeNames: [], label: 'A' }} index={i} submitted={submitted} inlineAssignees onProgress={onProgress}/>)}</div>}
  </div>;
};

const TargetToolbar: React.FC<{ target: MyTargetViewItem; onEdit?: () => void; onDelete?: () => void; busy?: boolean }> = ({ target, onEdit, onDelete, busy }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return <div className={`okr-target-list-toolbar okr-target-toolbar${menuOpen ? ' is-open' : ''}`} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    {!target.awaitingApproval && <Tooltip title={target.editable ? '编辑目标' : '仅制定人可编辑'}><Button type="text" aria-label={`编辑目标：${target.title}`} icon={<PencilIcon/>} disabled={busy || !target.editable || !onEdit} onClick={onEdit}/></Tooltip>}
    <Dropdown disabled={busy || !target.deletable || !onDelete} onOpenChange={setMenuOpen} menu={{ items: [{ key: 'delete', label: target.awaitingApproval ? '撤回' : '删除', danger: !target.awaitingApproval }], onClick: ({ domEvent }) => { domEvent.stopPropagation(); setMenuOpen(false); onDelete?.(); } }} trigger={['click']}><Button type="text" aria-label={`更多操作：${target.title}`} icon={<KebabHorizontalIcon/>} disabled={busy || !target.deletable || !onDelete}/></Dropdown>
  </div>;
};

const ListTarget: React.FC<{ target: MyTargetViewItem; index: number; onOpen: () => void; onEdit?: () => void; onDelete?: () => void; onProgress?: (id: string) => void; busy?: boolean }> = ({ target, index, onOpen, onEdit, onDelete, onProgress, busy }) => {
  const submitted = isSubmitted(target);
  return <article className="okr-target-list-item" role="button" tabIndex={0} aria-label={`目标：${target.title}`} onClick={onOpen} onKeyDown={event => { if (event.target === event.currentTarget) openOnKeyboard(event, onOpen); }}>
    <header>
      <div className="okr-target-list-copy">
        {target.autonomous && <Tag>自主提出</Tag>}{target.status === 'draft' && <Tag className="okr-target-list-draft">草稿</Tag>}{target.status === 'partial-draft' && <Tag className="okr-target-list-draft">部分草稿</Tag>}
        <div className={`okr-target-hierarchy${target.alignmentLabel || target.sourceName || target.ownerNames.length ? ' has-links' : ''}`}>
          <span className="okr-target-hierarchy-source"><span className="okr-target-hierarchy-label">{target.alignmentLabel || target.sourceName || '未设置对齐'}</span></span>
          <div className="okr-target-title-line"><span className="okr-summary-index">{target.primaryLabel || 'O'}{index + 1}</span><h3>{target.title}</h3></div>
          <div className="okr-target-meta-line"><Tag color="blue">{target.levelLabel || '公司级'}</Tag><span className="okr-target-creator">{target.creatorName || '未指定'}</span><span className="okr-target-weight">{target.totalWeight ?? 0}%</span></div>
          <span className="okr-target-hierarchy-owner"><span className="okr-target-hierarchy-label">承接人员：{assigneeLabel(target.ownerNames)}</span></span>
        </div>
      </div>
      <div className="okr-target-list-right">
        <TargetToolbar target={target} onEdit={onEdit} onDelete={onDelete} busy={busy}/>
        <div className="okr-target-list-status"><div><span>进度</span><strong>{target.progress}%</strong></div><div><span>权重</span><strong>{target.totalWeight ?? 0}%</strong></div><div><span>截止日期</span><strong>{formatDeadline(target.maxDeadline || '')}</strong></div></div>
      </div>
    </header>
    <div className="okr-target-actions">{!!target.primaryDetails?.length && <KrDetailTable rows={target.primaryDetails} label={target.primaryDetailLabel || '迭代版本'}/>} {target.actions.length
      ? target.actions.map((action, actionIndex) => <ActionRow key={action.id} action={action} index={actionIndex} submitted={submitted} inlineAssignees onProgress={onProgress}/>)
      : <p className="okr-target-no-actions">暂无拆解行动</p>}
    </div>
  </article>;
};

const CardTarget: React.FC<{ target: MyTargetViewItem; index: number; onOpen: () => void; onEdit?: () => void; onDelete?: () => void; onProgress?: (id: string) => void; busy?: boolean }> = ({ target, index, onOpen, onEdit, onDelete, onProgress, busy }) => {
  const submitted = isSubmitted(target);
  const visibleActions = target.actions.filter(action => action.label !== 'A');
  return <article className="okr-target-grid-card" role="button" tabIndex={0} aria-label={`目标卡片：${target.title}`} onClick={onOpen} onKeyDown={event => { if (event.target === event.currentTarget) openOnKeyboard(event, onOpen); }}>
    <header>
      <div className="okr-target-card-title"><span className="okr-summary-index">{target.primaryLabel || 'O'}{index + 1}</span><h3 title={target.title}>{target.title}</h3></div>
      <div className="okr-target-card-head-right">{target.awaitingApproval && <Tag color="processing">待上级审核</Tag>}{target.autonomous && <Tag>自主提出</Tag>}{target.status === 'draft' && <Tag>草稿</Tag>}{target.status === 'partial-draft' && <Tag>部分草稿</Tag>}<TargetToolbar target={target} onEdit={onEdit} onDelete={onDelete} busy={busy}/></div>
    </header>
    <div className="okr-target-meta-line"><Tag color="blue">{target.levelLabel || '公司级'}</Tag><span className="okr-target-creator">{target.creatorName || '未指定'}</span><span className="okr-target-weight">{target.totalWeight ?? 0}%</span></div>
    <div className="okr-target-card-meta"><span>当前进度：<strong className="okr-target-card-progress">{target.progress}%</strong></span><time>截止日期：{formatDeadline(target.maxDeadline || '')}</time></div>
    <div className="okr-target-card-actions">{visibleActions.length
      ? visibleActions.map((action, actionIndex) => <ActionRow key={action.id} action={action} index={actionIndex} submitted={submitted} compact inlineAssignees/>)
      : <p className="okr-target-no-actions">暂无拆解行动</p>}
    </div>
  </article>;
};

export const MyTargetMonthSection: React.FC<Props> = ({ periodKey, targets, viewMode, collapsed, onToggle, onOpenTarget, onEditTarget, onDeleteTarget, onProgress, busy, onAddGoal, onCopyGoal, onGoalTemplates, draftCount = 0, onSubmitDrafts }) => {
  const [submitting, setSubmitting] = React.useState(false);
  const submitLock = React.useRef(false);
  const [submitError, setSubmitError] = React.useState('');
  const submitDrafts = async () => { if (submitLock.current || busy || !onSubmitDrafts) return; submitLock.current = true; setSubmitting(true); setSubmitError(''); try { await onSubmitDrafts(); } catch (reason) { setSubmitError(reason instanceof Error ? reason.message : '草稿提交失败，请重试'); } finally { submitLock.current = false; setSubmitting(false); } };
  const [dismissed, setDismissed] = React.useState(false);
  React.useEffect(() => setDismissed(false), [draftCount]);
  const activeTargets = targets.filter(target => !['draft', 'submitted'].includes(target.status) && !target.initialPending);
  const totalWeight = activeTargets.reduce((sum, target) => sum + (target.objectiveWeight ?? 100), 0);
  const overallProgress = totalWeight ? Math.round(activeTargets.reduce((sum, target) => sum + target.progress * (target.objectiveWeight ?? 100), 0) / totalWeight * 10) / 10 : 0;
  return (
  <section className="okr-target-month" aria-label={`${periodLabel(periodKey)}目标`}>
    <button type="button" className="okr-target-month-head" onClick={onToggle} aria-expanded={!collapsed} aria-label={`${collapsed ? '展开' : '收起'}${periodLabel(periodKey)}`}>
      {collapsed ? <ChevronRight/> : <ChevronDown/>}
      <strong>{periodLabel(periodKey)}</strong>
      <span>{getPeriodCountdown(periodKey)}</span>
      <em>{targets.length} 个目标</em><span className="okr-period-progress" aria-label={`本周期整体进度：${overallProgress}%`}><Progress percent={overallProgress} showInfo={false}/><span>{overallProgress}%</span></span>
    </button>
    {!collapsed && submitError && <Alert type="error" title={submitError} showIcon/>}
    {!collapsed && draftCount > 0 && !dismissed && <Alert className="okr-month-draft-notice" type="info" showIcon title={`你有 ${draftCount} 个草稿未提交确认`} closable afterClose={() => setDismissed(true)} action={<Button type="primary" size="small" disabled={busy} loading={submitting} onClick={() => void submitDrafts()}>提交</Button>}/>}
    {!collapsed && (targets.length === 0 ? <div className="okr-target-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${periodLabel(periodKey)}暂无目标`} />{onAddGoal && <div className="okr-target-empty-actions"><Button type="primary" icon={<PlusIcon/>} disabled={busy} onClick={onAddGoal}>添加目标</Button><Button icon={<CopyIcon/>} disabled={busy} onClick={onCopyGoal}>复制目标</Button><Button icon={<RepoTemplateIcon/>} disabled={busy} onClick={onGoalTemplates}>目标模板</Button></div>}</div> : <div className={viewMode === 'list' ? 'okr-target-list' : 'okr-target-grid'}>
      {targets.map((target, index) => viewMode === 'list'
        ? <ListTarget key={target.id} target={target} index={index} onOpen={() => onOpenTarget(target.id)} onEdit={onEditTarget ? () => onEditTarget(target.id) : undefined} onDelete={onDeleteTarget ? () => onDeleteTarget(target.id) : undefined} onProgress={itemId => onProgress?.(target.detailId || target.id, itemId)} busy={busy}/>
        : <CardTarget key={target.id} target={target} index={index} onOpen={() => onOpenTarget(target.id)} onEdit={onEditTarget ? () => onEditTarget(target.id) : undefined} onDelete={onDeleteTarget ? () => onDeleteTarget(target.id) : undefined} busy={busy}/>) }
      {viewMode === 'card' && onAddGoal && <div className="okr-month-create-actions is-card"><Button icon={<PlusIcon/>} disabled={busy} onClick={onAddGoal}>添加目标</Button><Button icon={<CopyIcon/>} disabled={busy} onClick={onCopyGoal}>复制目标</Button></div>}
    </div>)}
    {!collapsed && viewMode === 'list' && targets.length > 0 && onAddGoal && <div className={`okr-month-create-actions is-${viewMode}`}><Button icon={<PlusIcon/>} disabled={busy} onClick={onAddGoal}>添加目标</Button><Button icon={<CopyIcon/>} disabled={busy} onClick={onCopyGoal}>复制目标</Button></div>}
  </section>
);
};
