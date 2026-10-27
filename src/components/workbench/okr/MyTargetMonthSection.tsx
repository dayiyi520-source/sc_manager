import { goalSourceLabel, hasDownstreamAlignment, isPersonalGoal, isAssignedPersonalGoal } from './goalPresentation';
import { krDetails, supervisorKrTitle } from '../../../services/okrKrDetails';
import { canEditOkr } from '../../../services/okrSettingsPolicy';
import { periodLabel, periodBounds } from '../../../services/okrPeriods';
import type { OkrKr, OkrSettings } from '../../../services/okrRepository';
import { KrDetailTable } from './KrDetailTable';
import { goalLevel, ownerGoalLevel } from '../../../services/okrGoalRules';
import React from 'react';
import { Alert, Button, Dropdown, Empty, Progress, Tag, Tooltip, Popover } from 'antd';
import { PencilIcon, KebabHorizontalIcon, GitBranchIcon, PlusIcon, GoalIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { ChevronDown, ChevronRight } from '@/components/common/octicons-compat';
import type { OkrPerson, OkrRecord, OkrKrDetail } from '../../../services/okrRepository';
import type { ActionGroupValues } from './ActionBreakdownForm';

export type MyTargetViewMode = 'list' | 'card';

export type MyTargetActionViewItem = {
  assigneeOptions?: Array<{ value: string; label: string }>;
  details?: OkrKrDetail[]; detailLabel?: string;
  label?: string; executionActions?: Array<{ id: string; title: string; progress: number; weight?: number; deadline?: string }>;
  id: string;
  title: string;
  assigneeNames: string[];
  progress: number;
  weight: number;
  deadline: string;
  alignments?: Array<{ id: string; title: string; ownerName: string; levelLabel: string; progress: number; actions: Array<{ id: string; title: string; linked: boolean; progress?: number; ownerName?: string; targetId?: string; number?: number }> }>;
};

export type MyTargetViewItem = {
  id: string;
  primaryLabel?: 'KR';
  assigneeOptions?: Array<{ value: string; label: string }>;
  primaryDetails?: OkrKrDetail[];
  primaryDetailLabel?: string;
  personalMetrics?: boolean;
  detailId?: string;
  title: string;
  status: string;
  sourceName?: string;
  alignmentLabel?: string;
  readOnly?: boolean;
  editable?: boolean;
  deletable?: boolean;
  ownerNames: string[];
  creatorName?: string;
  department?: string;
  levelLabel?: string;
  metaOwnerId?: string;
  totalWeight?: number;
  personalWeight?: number;
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
  onOpenAlignment?: (targetId: string) => void;
  onProgress?: (recordId: string, itemId: string) => void;
  onEditTarget?: (targetId: string) => void;
  onDeleteTarget?: (targetId: string) => void;
  busy?: boolean;
  draftCount?: number; onSubmitDrafts?: () => Promise<void>; onSetWeights?: () => void; weightPlanStatus?: 'submitted' | 'approved' | 'returned';
  onAddGoal?: () => void;
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
  personalScope = false,
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
      ...objectives.map(record => ({ id: record.id, title: record.payload.title, ownerName: ownerNameOf(record.ownerId), levelLabel: levelOf(record.ownerId), progress: Number(record.payload.progress || 0), actions: (record.payload.keyResults || []).flatMap<{ id: string; title: string; linked: boolean; progress?: number; ownerName?: string; targetId?: string; number?: number }>((kr, index) => record.payload.goalLevel === 'personal' && kr.executionActions?.length ? kr.executionActions.filter(action => action.ownerId === record.ownerId).map(action => ({ id: action.id, title: action.title, linked: true, progress: action.progress, ownerName: ownerNameOf(record.ownerId), targetId: record.id })) : [{ id: kr.id, title: kr.title, linked: true, targetId: record.id, number: index + 1 }]) })),
      ...Array.from(groups.entries()).map(([id, group]) => ({ id, title: `${ownerNameOf(group[0].ownerId)}的拆解目标`, ownerName: ownerNameOf(group[0].ownerId), levelLabel: levelOf(group[0].ownerId), progress: weightedProgress(group.map(item => ({ id: item.id, title: item.payload.title, assigneeNames: [], progress: Number(item.payload.progress || 0), weight: Number(item.payload.weight || 0), deadline: item.payload.deadline || '' }))), actions: group.map(item => ({ id: item.id, title: item.payload.title, linked: item.payload.parentActionId === actionId, progress: Number(item.payload.progress || 0), ownerName: ownerNameOf(item.ownerId), targetId: item.id })) })),
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
    const personalAssignment = record.payload.goalLevel === 'department' && (record.ownerId !== currentUserId || personalScope) && (record.payload.keyResults || []).length > 0;
    const departmentRecord = sourceActions.find(source => source.id === record.id);
    const displayActions = ownPersonal ? (record.payload.keyResults || []).flatMap(kr => (kr.executionActions || []).filter(action => action.ownerId === record.ownerId)) : record.payload.keyResults || [];
    const actions: MyTargetActionViewItem[] = displayActions.map(action => ({
      assigneeOptions: people.map(person => ({ value: person.id, label: person.name })),
      details: 'details' in action ? action.details : undefined, detailLabel: 'structureType' in action && action.structureType === 'delivery' ? '项目产品' : '迭代版本',
      label: ownPersonal ? 'A' : 'KR', executionActions: 'executionActions' in action ? action.executionActions?.filter(item => item.ownerId === record.ownerId) : undefined,
      id: action.id,
      title: 'structureType' in action && record.payload.goalLevel === 'department' ? supervisorKrTitle(action as OkrKr) : action.title,
      assigneeNames: namesOf('assigneeIds' in action ? action.assigneeIds : []),
      progress: Number(action.progress || 0),
      weight: Number(action.weight || 0),
      deadline: action.deadline || '',
      alignments: ownPersonal ? [] : alignmentsFor(action.id, record.periodKey, record.ownerId, record.id),
    }));
    const sourceId = record.payload.sourceObjectiveId || record.payload.parentObjectiveId || record.payload.alignments?.[0]?.parentObjectiveId;
    const recordOwner = people.find(person => person.id === record.ownerId);
    const source = sourceId ? [...sourceActions, ...records].find(item => item.id === sourceId) : undefined;
    const sourceKr = source?.payload.keyResults?.find(kr => kr.id === record.payload.sourceKrId);
    const primaryKr = sourceKr || record.payload.keyResults?.[0];
    const personalPrimaryKr = personalScope && ownPersonal ? record.payload.keyResults?.[0] : primaryKr;
    const sourceAssignees = sourceKr ? sourceKr.details?.some(row => row.assigneeIds !== undefined) ? sourceKr.details.flatMap(row => row.assigneeIds || []) : sourceKr.assigneeIds : undefined;
    const sourceOwner = nameOf(source?.ownerId || recordOwner?.supervisorId);
    return {
      id: record.id,
      primaryLabel: assignedPersonal ? 'KR' as const : undefined,
      assigneeOptions: people.map(person => ({ value: person.id, label: person.name })),
      primaryDetails: assignedPersonal || personalScope && ownPersonal && personalPrimaryKr?.details?.length ? krDetails(personalPrimaryKr || { id: '', title: '', weight: 100, progress: 0 }) : undefined,
      primaryDetailLabel: primaryKr?.structureType === 'delivery' ? '项目产品' : '迭代版本',
      personalMetrics: personalAssignment || personalScope && ownPersonal,
      objectiveWeight: record.payload.weight ?? 100, initialPending: record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved',
      detailId: record.id,
      alignmentLabel: goalSourceLabel(record, allRecords, people) || `${periodLabel(record.periodKey)}目标`,
      editable: canEditOkr(record,currentUserId,settings,people) && record.changeRequest?.status !== 'pending',
      deletable: record.changeRequest?.status === 'pending' ? record.ownerId === currentUserId : canEditOkr(record,currentUserId,settings,people) && !record.payload.inherited,
      title: record.payload.title,
      status: record.status, awaitingApproval: record.changeRequest?.status === 'pending', changePurpose: record.changeRequest?.purpose, autonomous: record.payload.origin === 'autonomous',
      sourceName: sourceOwner ? `来源自上级 · ${sourceOwner}` : undefined,
      ownerNames: assignedPersonal && sourceKr ? namesOf(sourceAssignees) : namesOf((record.payload.keyResults || []).flatMap(action => action.assigneeIds || [])).length ? namesOf((record.payload.keyResults || []).flatMap(action => action.assigneeIds || [])) : namesOf([record.ownerId]),
      creatorName: ownerNameOf(record.ownerId),
      department: recordOwner?.department,
      levelLabel: ownerGoalLevel(recordOwner, record.payload),
      metaOwnerId: source?.ownerId || recordOwner?.supervisorId || record.ownerId,
      totalWeight: personalAssignment ? departmentRecord?.payload.weight ?? 100 : personalScope && ownPersonal && source?.payload.goalLevel === 'department' ? source.payload.weight ?? 100 : record.payload.weight ?? 100,
      personalWeight: personalAssignment || personalScope && ownPersonal && source?.payload.goalLevel === 'department' ? record.payload.weight ?? 100 : undefined,
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
      department: groupOwner?.department,
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

const AlignmentPopover: React.FC<{ alignments: NonNullable<MyTargetActionViewItem['alignments']>; label: string; onOpenAlignment?: (id: string) => void }> = ({ alignments, label, onOpenAlignment }) => <Popover trigger="click" placement="bottomRight" title={<div className="okr-target-alignment-title">对齐我的</div>} content={<div className="okr-target-alignment-preview" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>{alignments.map(target => <section key={target.id} className={target.levelLabel === '个人级' ? 'is-personal' : ''}>{target.levelLabel === '个人级' ? target.actions.map(item => <button type="button" key={item.id} className="okr-target-alignment-entry" onClick={() => onOpenAlignment?.(item.targetId || target.id)}><span title={item.title}>{item.title}</span><small>{item.progress ?? target.progress}% · {item.ownerName || target.ownerName}</small></button>) : <><div className="okr-target-alignment-objective"><GitBranchIcon size={14}/><button type="button" className="okr-target-alignment-heading" onClick={() => onOpenAlignment?.(target.id)} title={target.title}>{target.title}</button></div><div className="okr-target-alignment-meta"><Progress type="circle" percent={target.progress} size={24} showInfo={false}/><span>{target.progress}%</span><Tag color="green">{target.levelLabel}</Tag><span>{target.ownerName}</span></div>{target.actions.map(item => <button type="button" key={item.id} className={`okr-target-alignment-action${item.linked ? ' is-linked' : ''}`} onClick={() => onOpenAlignment?.(item.targetId || target.id)}>{item.number && <span className="okr-target-alignment-index">KR{item.number}</span>}<span title={item.title}>{item.title}</span></button>)}</>}</section>)}</div>}><Button className="okr-target-action-alignment" type="text" aria-label={label} icon={<GitBranchIcon size={16}/>} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}/></Popover>;

const ActionRow: React.FC<{ action: MyTargetActionViewItem; index: number; submitted: boolean; compact?: boolean; inlineAssignees?: boolean; personalMetrics?: boolean; onProgress?: (id: string) => void; onOpenAlignment?: (id: string) => void; showExecutionActions?: boolean; showAlignment?: boolean }> = ({ action, index, submitted, compact, inlineAssignees = false, personalMetrics = false, onProgress, onOpenAlignment, showExecutionActions = true, showAlignment = true }) => {
  const overdue = Boolean(action.deadline) && dayjs(action.deadline).endOf('day').isBefore(dayjs()) && action.progress < 100;
  return <div className={`okr-target-action-row${compact ? ' is-compact' : ''}${inlineAssignees ? ' has-inline-assignees' : ''}${action.label !== 'KR' ? ' is-unnumbered' : ''}`}>
    {action.label === 'KR' && <span className="okr-target-action-index">KR{index + 1}</span>}
    <div className="okr-target-action-content"><strong title={action.title}>{action.title || '未填写行动描述'}{inlineAssignees && action.assigneeNames.length > 0 && <span className="okr-target-action-assignees-inline"> {action.assigneeNames.map(name => `@${name}`).join(' ')}</span>}</strong>
      {!compact && showAlignment && !!action.alignments?.length && <AlignmentPopover alignments={action.alignments} label={`${action.label || 'A'}${index + 1}下级对齐`} onOpenAlignment={onOpenAlignment}/>}
    </div>
    {!inlineAssignees && <span title={assigneeLabel(action.assigneeNames)}>{assigneeLabel(action.assigneeNames)}</span>}
    {!compact && <>
      <span className="okr-target-action-progress">{submitted ? <Button type="text" aria-label={`查看${action.label || 'A'}${index + 1}进度`} onClick={event => { event.stopPropagation(); onProgress?.(action.id); }} onKeyDown={event => event.stopPropagation()}><Progress type="circle" percent={action.progress} size={24} showInfo={false}/><b>{action.progress}%</b></Button> : '--'}</span>
      <span>{action.weight}%</span>
      <time className={overdue ? 'is-overdue' : ''}>{formatDeadline(action.deadline)}</time>
    </>}
    {!compact && !!action.details?.length && <KrDetailTable assigneeOptions={action.assigneeOptions} personalMetrics={personalMetrics} rows={action.details} label={action.detailLabel || '迭代版本'} mode={action.detailLabel === '项目产品' ? 'delivery' : 'product'}/>}
    {!compact && showExecutionActions && !!action.executionActions?.length && <div className="okr-target-execution-actions">{action.executionActions.map((item, i) => <ActionRow key={item.id} action={{ ...item, weight: item.weight ?? 0, deadline: item.deadline || '', assigneeNames: [], label: 'A' }} index={i} submitted={submitted} inlineAssignees onProgress={onProgress}/>)}</div>}
  </div>;
};

const TargetToolbar: React.FC<{ target: MyTargetViewItem; onEdit?: () => void; onDelete?: () => void; onOpen: () => void; busy?: boolean }> = ({ target, onEdit, onDelete, onOpen, busy }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  if (target.readOnly) return null;
  return <div className={`okr-target-list-toolbar okr-target-toolbar${menuOpen ? ' is-open' : ''}`} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    {!target.awaitingApproval && <Tooltip title={target.editable ? '编辑目标' : '仅制定人可编辑'}><Button type="text" aria-label={`编辑目标：${target.title}`} icon={<PencilIcon/>} disabled={busy || !target.editable || !onEdit} onClick={onEdit}/></Tooltip>}
    <Dropdown disabled={busy} onOpenChange={setMenuOpen} menu={{ items: [{ key: 'detail', label: '查看详情' }, ...(target.deletable && onDelete ? [{ key: 'delete', label: target.awaitingApproval ? '撤回' : '删除', danger: !target.awaitingApproval }] : [])], onClick: ({ key, domEvent }) => { domEvent.stopPropagation(); setMenuOpen(false); if (key === 'detail') onOpen(); else onDelete?.(); } }} trigger={['click']}><Button type="text" aria-label={`更多操作：${target.title}`} icon={<KebabHorizontalIcon/>} disabled={busy}/></Dropdown>
  </div>;
};

const ListTarget: React.FC<{ target: MyTargetViewItem; index: number; onOpen: () => void; onEdit?: () => void; onDelete?: () => void; onProgress?: (id: string) => void; onOpenAlignment?: (id: string) => void; busy?: boolean }> = ({ target, index, onOpen, onEdit, onDelete, onProgress, onOpenAlignment, busy }) => {
  const submitted = isSubmitted(target);
  return <article className="okr-target-list-item" aria-label={`目标：${target.title}`}>
    <header>
      <div className="okr-target-list-copy">
        {target.awaitingApproval && <Tag color="processing">待上级审核</Tag>}{target.autonomous && <Tag>自主提出</Tag>}{target.status === 'draft' && <Tag className="okr-target-list-draft">草稿</Tag>}{target.status === 'partial-draft' && <Tag className="okr-target-list-draft">部分草稿</Tag>}
        <div className={`okr-target-hierarchy${target.alignmentLabel || target.sourceName || target.ownerNames.length ? ' has-links' : ''}`}>
          <span className="okr-target-hierarchy-source"><span className="okr-target-hierarchy-label">{target.alignmentLabel || target.sourceName || '未设置对齐'}</span></span>
          <div className="okr-target-title-line"><span className="okr-summary-index">{target.primaryLabel || 'O'}{index + 1}</span><h3>{target.title}</h3></div>
          <div className="okr-target-meta-line"><Tag color="blue">{target.levelLabel || '公司级'}</Tag>{target.levelLabel !== '公司级' && <Tag>{target.department || '未设置部门'}</Tag>}<span className="okr-target-creator">{target.creatorName || '未指定'}</span><span className="okr-target-weight">{target.totalWeight ?? 0}%</span></div>
          <span className="okr-target-hierarchy-owner"><span className="okr-target-hierarchy-label">承接人员：{assigneeLabel(target.ownerNames)}</span></span>
        </div>
      </div>
      <div className="okr-target-list-right">
        <TargetToolbar target={target} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} busy={busy}/>
        <div className="okr-target-list-status"><div><span>进度</span><Button type="text" className="okr-target-progress-button" aria-label={`查看目标进度历史：${target.title}`} disabled={!submitted || !onProgress || busy} onClick={event => { event.stopPropagation(); onProgress?.(target.primaryLabel === 'KR' ? target.actions[0]?.id || target.id : target.id); }}>{target.progress}%</Button></div><div><span>权重</span><strong>{target.personalWeight ?? target.totalWeight ?? 0}%</strong></div><div><span>截止日期</span><strong>{formatDeadline(target.maxDeadline || '')}</strong></div></div>
      </div>
    </header>
    <div className="okr-target-actions">{!!target.primaryDetails?.length && <KrDetailTable assigneeOptions={target.assigneeOptions} personalMetrics={target.personalMetrics} rows={target.primaryDetails} label={target.primaryDetailLabel || '迭代版本'} mode={target.primaryDetailLabel === '项目产品' ? 'delivery' : 'product'}/>} {target.actions.length
      ? target.actions.map((action, actionIndex) => <ActionRow key={action.id} action={action} index={actionIndex} submitted={submitted} inlineAssignees onProgress={onProgress} onOpenAlignment={onOpenAlignment} showExecutionActions={target.levelLabel !== '部门级'} personalMetrics={target.personalMetrics} />)
      : <p className="okr-target-no-actions">暂无拆解行动</p>}
    </div>
  </article>;
};

const CardTarget: React.FC<{ target: MyTargetViewItem; index: number; onOpen: () => void; onEdit?: () => void; onDelete?: () => void; onProgress?: (id: string) => void; busy?: boolean }> = ({ target, index, onOpen, onEdit, onDelete, onProgress, busy }) => {
  const submitted = isSubmitted(target);
  const visibleActions = target.levelLabel === '个人级' ? target.actions : target.actions.filter(action => action.label !== 'A');
  return <article className="okr-target-grid-card" aria-label={`目标卡片：${target.title}`}>
    <header>
      <div className="okr-target-card-title"><span className="okr-summary-index">{target.primaryLabel || 'O'}{index + 1}</span><h3 title={target.title}>{target.title}</h3></div>
      <div className="okr-target-card-head-right">{target.awaitingApproval && <Tag color="processing">待上级审核</Tag>}{target.autonomous && <Tag>自主提出</Tag>}{target.status === 'draft' && <Tag>草稿</Tag>}{target.status === 'partial-draft' && <Tag>部分草稿</Tag>}<TargetToolbar target={target} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} busy={busy}/></div>
    </header>
    <div className="okr-target-meta-line"><Tag color="blue">{target.levelLabel || '公司级'}</Tag>{target.levelLabel !== '公司级' && <Tag>{target.department || '未设置部门'}</Tag>}<span className="okr-target-creator">{target.creatorName || '未指定'}</span><span className="okr-target-weight">{target.totalWeight ?? 0}%</span></div>
    <div className="okr-target-card-meta"><span>当前进度：<strong className="okr-target-card-progress">{target.progress}%</strong></span><time>截止日期：{formatDeadline(target.maxDeadline || '')}</time></div>
    <div className="okr-target-card-actions">{visibleActions.length
      ? visibleActions.map((action, actionIndex) => <ActionRow key={action.id} action={action} index={actionIndex} submitted={submitted} compact inlineAssignees/>)
      : <p className="okr-target-no-actions">暂无拆解行动</p>}
    </div>
  </article>;
};

export const MyTargetMonthSection: React.FC<Props> = ({ periodKey, targets, viewMode, collapsed, onToggle, onOpenTarget, onOpenAlignment, onEditTarget, onDeleteTarget, onProgress, busy, onAddGoal, draftCount = 0, onSubmitDrafts, onSetWeights, weightPlanStatus }) => {
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
    <div className="okr-target-month-head">
      <button type="button" className="okr-target-month-toggle" onClick={onToggle} aria-expanded={!collapsed} aria-label={`${collapsed ? '展开' : '收起'}${periodLabel(periodKey)}`}>
        {collapsed ? <ChevronRight/> : <ChevronDown/>}
      </button>
      <strong>{periodLabel(periodKey)}</strong>
      <span>{getPeriodCountdown(periodKey)}</span>
      <div className="okr-month-head-right">
        {onSetWeights && <Tooltip title="设置权重"><Button className="okr-month-weight-button" type="text" icon={<GoalIcon/>} aria-label={`设置权重：${periodLabel(periodKey)}`} disabled={busy || submitting} onClick={onSetWeights}/></Tooltip>}
        <span className="okr-month-target-count">{targets.length} 个目标</span>
        {weightPlanStatus === 'submitted' && <Tag color="processing">权重待审核</Tag>}{weightPlanStatus === 'returned' && <Tag color="warning">权重待修改</Tag>}
        <span className="okr-period-progress" aria-label={`本周期整体进度：${overallProgress}%`}><Progress percent={overallProgress} showInfo={false}/><span>{overallProgress}%</span></span>
      </div>
    </div>
    {!collapsed && submitError && <Alert type="error" title={submitError} showIcon/>}
    {!collapsed && draftCount > 0 && !dismissed && <Alert className="okr-month-draft-notice" type="info" showIcon title={`你有 ${draftCount} 个草稿未提交确认`} closable afterClose={() => setDismissed(true)} action={<Button type="primary" size="small" disabled={busy} loading={submitting} onClick={() => void submitDrafts()}>提交</Button>}/>}
    {!collapsed && (targets.length === 0 ? <div className="okr-target-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`${periodLabel(periodKey)}暂无目标`} />{onAddGoal && <div className="okr-target-empty-actions"><Button type="primary" icon={<PlusIcon/>} disabled={busy} onClick={onAddGoal}>添加目标</Button></div>}</div> : <div className={viewMode === 'list' ? 'okr-target-list' : `okr-target-grid${onAddGoal ? ' has-add-goal' : ''}`}>
      {targets.map((target, index) => viewMode === 'list'
        ? <ListTarget key={target.id} target={target} index={index} onOpen={() => onOpenTarget(target.id)} onEdit={onEditTarget ? () => onEditTarget(target.id) : undefined} onDelete={onDeleteTarget ? () => onDeleteTarget(target.id) : undefined} onProgress={itemId => onProgress?.(target.detailId || target.id, itemId)} onOpenAlignment={onOpenAlignment} busy={busy}/>
        : <CardTarget key={target.id} target={target} index={index} onOpen={() => onOpenTarget(target.id)} onEdit={onEditTarget ? () => onEditTarget(target.id) : undefined} onDelete={onDeleteTarget ? () => onDeleteTarget(target.id) : undefined} busy={busy}/>) }
      {viewMode === 'card' && onAddGoal && <div className="okr-month-create-actions is-card"><Button icon={<PlusIcon/>} disabled={busy} onClick={onAddGoal}>添加目标</Button></div>}
    </div>)}
    {!collapsed && viewMode === 'list' && targets.length > 0 && onAddGoal && <div className={`okr-month-create-actions is-${viewMode}`}><Button icon={<PlusIcon/>} disabled={busy} onClick={onAddGoal}>添加目标</Button></div>}
  </section>
);
};
