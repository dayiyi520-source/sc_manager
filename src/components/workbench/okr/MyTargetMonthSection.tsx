import React from 'react';
import { Button, Dropdown, Empty, Progress, Tag, Tooltip, Popover } from 'antd';
import { PencilIcon, KebabHorizontalIcon, GitBranchIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { ChevronDown, ChevronRight } from '@/components/common/octicons-compat';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';
import type { ActionGroupValues } from './ActionBreakdownForm';

export type MyTargetViewMode = 'list' | 'card';

export type MyTargetActionViewItem = {
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
  savedAt?: string;
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
  onEditTarget?: (targetId: string) => void;
  onDeleteTarget?: (targetId: string) => void;
  busy?: boolean;
};

export const getPeriodCountdown = (periodKey: string) => {
  const today = dayjs().startOf('day');
  const periodEnd = dayjs(`${periodKey}-01`).endOf('month').startOf('day');
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
): MyTargetViewItem[] => {
  const nameOf = (id?: string) => people.find(person => person.id === id)?.name;
  const namesOf = (ids?: string[] | string) => {
    const normalized = Array.isArray(ids) ? ids : ids ? [ids] : [];
    return [...new Set(normalized.map(nameOf).filter((name): name is string => Boolean(name)))];
  };
  const ownerName = nameOf(currentUserId);
  const ownerNameOf = (id?: string) => nameOf(id) || '未指定';
  const allRecords = [...new Map([...sourceActions, ...records].map(record => [record.id, record])).values()];
  const alignmentsFor = (actionId: string, periodKey: string) => {
    const active = allRecords.filter(record => record.periodKey === periodKey && record.status !== 'draft');
    const objectives = active.filter(record => record.kind === 'objective' && record.payload.alignments?.some(alignment => alignment.parentKeyResultId === actionId));
    const children = active.filter(record => record.kind === 'action' && record.payload.parentActionId === actionId);
    const groups = new Map<string, OkrRecord[]>();
    children.forEach(record => {
      const key = `${record.ownerId}:${record.payload.parentObjectiveId}`;
      groups.set(key, active.filter(item => item.kind === 'action' && item.ownerId === record.ownerId && item.payload.parentObjectiveId === record.payload.parentObjectiveId));
    });
    const levelOf = (ownerId: string) => {
      const person = people.find(item => item.id === ownerId);
      return person?.rootFlag === 1 ? '公司级' : person?.supervisorId ? '主管级' : '个人级';
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
    alignments: alignmentsFor(record.id, record.periodKey),
  });
  const objectiveTargets = records.filter(record => record.kind === 'objective').map(record => {
    const actions: MyTargetActionViewItem[] = (record.payload.keyResults || []).map(action => ({
      id: action.id,
      title: action.title,
      assigneeNames: namesOf(action.assigneeIds),
      progress: Number(action.progress || 0),
      weight: Number(action.weight || 0),
      deadline: action.deadline || '',
      alignments: alignmentsFor(action.id, record.periodKey),
    }));
    const sourceId = record.payload.parentObjectiveId || record.payload.alignments?.[0]?.parentObjectiveId;
    const recordOwner = people.find(person => person.id === record.ownerId);
    const source = sourceId ? [...sourceActions, ...records].find(item => item.id === sourceId) : undefined;
    const sourceOwner = nameOf(source?.ownerId || recordOwner?.supervisorId);
    return {
      id: record.id,
      detailId: record.id,
      alignmentLabel: record.payload.alignments?.map(alignment => [...sourceActions, ...records].find(item => item.id === alignment.parentObjectiveId)?.payload.title).filter(Boolean).join('、') || `${dayjs(record.periodKey).format('YYYY年MM月')}目标`,
      editable: record.ownerId === currentUserId,
      deletable: record.ownerId === currentUserId,
      title: record.payload.title,
      status: record.status,
      sourceName: sourceOwner ? `来源自上级 · ${sourceOwner}` : undefined,
      ownerNames: namesOf((record.payload.keyResults || []).flatMap(action => action.assigneeIds || [])).length ? namesOf((record.payload.keyResults || []).flatMap(action => action.assigneeIds || [])) : namesOf([record.ownerId]),
      creatorName: sourceOwner || ownerNameOf(record.ownerId),
      levelLabel: recordOwner?.rootFlag === 1 ? '公司级' : recordOwner?.supervisorId ? '主管级' : '个人级',
      metaOwnerId: source?.ownerId || recordOwner?.supervisorId || record.ownerId,
      totalWeight: actions.reduce((sum, action) => sum + action.weight, 0),
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
      detailId: group.find(item => item.status === 'draft')?.id || group[0]?.id,
      title: source?.payload.title || group[0]?.payload.title || '来源目标已不可用',
      status: group.some(item => item.status === 'draft') ? (group.some(item => item.status !== 'draft') ? 'partial-draft' : 'draft') : 'active',
      sourceName: sourceOwner ? `来源自上级 · ${sourceOwner}` : undefined,
      creatorName: ownerNameOf(group[0]?.ownerId),
      levelLabel: groupOwner?.rootFlag === 1 ? '公司级' : groupOwner?.supervisorId ? '主管级' : '个人级',
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
      assigneeNames: namesOf(action.assigneeIds),
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

const ActionRow: React.FC<{ action: MyTargetActionViewItem; index: number; submitted: boolean; compact?: boolean; inlineAssignees?: boolean }> = ({ action, index, submitted, compact, inlineAssignees = false }) => {
  const overdue = Boolean(action.deadline) && dayjs(action.deadline).endOf('day').isBefore(dayjs()) && action.progress < 100;
  return <div className={`okr-target-action-row${compact ? ' is-compact' : ''}${inlineAssignees ? ' has-inline-assignees' : ''}`}>
    <span className="okr-target-action-index">A{index + 1}</span>
    <div className="okr-target-action-content"><strong title={action.title}>{action.title || '未填写行动描述'}{inlineAssignees && action.assigneeNames.length > 0 && <span className="okr-target-action-assignees-inline"> {action.assigneeNames.map(name => `@${name}`).join(' ')}</span>}</strong>
      {!compact && !!action.alignments?.length && <Popover trigger={['hover', 'focus']} placement="bottomRight" title="对齐我的" content={<div className="okr-target-alignment-preview" onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>{action.alignments.map(target => <section key={target.id}><h4 title={target.title}>{target.title}</h4><div className="okr-target-alignment-meta"><Progress type="circle" percent={target.progress} size={24} showInfo={false}/><span>{target.progress}%</span><Tag color="green">{target.levelLabel}</Tag><span>{target.ownerName}</span></div>{target.actions.map((item, i) => <div key={item.id} className={`okr-target-alignment-action${item.linked ? ' is-linked' : ''}`}><span>A{i + 1}</span><span title={item.title}>{item.title}</span>{item.linked && <GitBranchIcon size={14}/>}</div>)}</section>)}</div>}><Button className="okr-target-action-alignment" type="text" aria-label={`A${index + 1}下级对齐`} icon={<GitBranchIcon size={16}/>} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}/></Popover>}
    </div>
    {!inlineAssignees && <span title={assigneeLabel(action.assigneeNames)}>{assigneeLabel(action.assigneeNames)}</span>}
    {!compact && <>
      <span className="okr-target-action-progress">{submitted ? <><Progress type="circle" percent={action.progress} size={24} showInfo={false}/><b>{action.progress}%</b></> : '--'}</span>
      <span>{action.weight}%</span>
      <time className={overdue ? 'is-overdue' : ''}>{formatDeadline(action.deadline)}</time>
    </>}
  </div>;
};

const TargetToolbar: React.FC<{ target: MyTargetViewItem; onEdit?: () => void; onDelete?: () => void; busy?: boolean }> = ({ target, onEdit, onDelete, busy }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  return <div className={`okr-target-list-toolbar okr-target-toolbar${menuOpen ? ' is-open' : ''}`} onClick={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
    <Tooltip title={target.editable ? '编辑目标' : '仅制定人可编辑'}><Button type="text" aria-label={`编辑目标：${target.title}`} icon={<PencilIcon/>} disabled={busy || !target.editable || !onEdit} onClick={onEdit}/></Tooltip>
    <Dropdown disabled={busy || !target.deletable || !onDelete} onOpenChange={setMenuOpen} menu={{ items: [{ key: 'delete', label: '删除', danger: true }], onClick: () => onDelete?.() }} trigger={['click']}><Button type="text" aria-label={`更多操作：${target.title}`} icon={<KebabHorizontalIcon/>} disabled={busy || !target.deletable || !onDelete}/></Dropdown>
  </div>;
};

const ListTarget: React.FC<{ target: MyTargetViewItem; index: number; onOpen: () => void; onEdit?: () => void; onDelete?: () => void; busy?: boolean }> = ({ target, index, onOpen, onEdit, onDelete, busy }) => {
  const submitted = isSubmitted(target);
  return <article className="okr-target-list-item" role="button" tabIndex={0} aria-label={`目标：${target.title}`} onClick={onOpen} onKeyDown={event => { if (event.target === event.currentTarget) openOnKeyboard(event, onOpen); }}>
    <header>
      <div className="okr-target-list-copy">
        {target.status === 'draft' && <Tag className="okr-target-list-draft">草稿</Tag>}{target.status === 'partial-draft' && <Tag className="okr-target-list-draft">部分草稿</Tag>}
        <div className={`okr-target-hierarchy${target.alignmentLabel || target.sourceName || target.ownerNames.length ? ' has-links' : ''}`}>
          <span className="okr-target-hierarchy-source"><span className="okr-target-hierarchy-label">{target.alignmentLabel || target.sourceName || '未设置对齐'}</span></span>
          <div className="okr-target-title-line"><span className="okr-summary-index">O{index + 1}</span><h3>{target.title}</h3></div>
          <div className="okr-target-meta-line"><Tag color="blue">{target.levelLabel || '公司级'}</Tag><span className="okr-target-creator">{target.creatorName || '未指定'}</span><span className="okr-target-weight">{target.totalWeight ?? 0}%</span></div>
          <span className="okr-target-hierarchy-owner"><span className="okr-target-hierarchy-label">承接人员：{assigneeLabel(target.ownerNames)}</span></span>
        </div>
      </div>
      <div className="okr-target-list-right">
        <TargetToolbar target={target} onEdit={onEdit} onDelete={onDelete} busy={busy}/>
        <div className="okr-target-list-status"><div><span>进度</span><strong>{target.progress}%</strong></div><div><span>权重</span><strong>{target.totalWeight ?? 0}%</strong></div><div><span>截止日期</span><strong>{formatDeadline(target.maxDeadline || '')}</strong></div></div>
      </div>
    </header>
    <div className="okr-target-actions">{target.actions.length
      ? target.actions.map((action, actionIndex) => <ActionRow key={action.id} action={action} index={actionIndex} submitted={submitted} inlineAssignees/>)
      : <p className="okr-target-no-actions">暂无拆解行动</p>}
    </div>
  </article>;
};

const CardTarget: React.FC<{ target: MyTargetViewItem; index: number; onOpen: () => void; onEdit?: () => void; onDelete?: () => void; busy?: boolean }> = ({ target, index, onOpen, onEdit, onDelete, busy }) => {
  const submitted = isSubmitted(target);
  const visibleActions = target.actions.slice(0, 4);
  return <article className="okr-target-grid-card" role="button" tabIndex={0} aria-label={`目标卡片：${target.title}`} onClick={onOpen} onKeyDown={event => { if (event.target === event.currentTarget) openOnKeyboard(event, onOpen); }}>
    <header>
      <div className="okr-target-card-title"><span className="okr-summary-index">O{index + 1}</span><h3 title={target.title}>{target.title}</h3></div>
      <div className="okr-target-card-head-right">{target.status === 'draft' && <Tag>草稿</Tag>}{target.status === 'partial-draft' && <Tag>部分草稿</Tag>}<TargetToolbar target={target} onEdit={onEdit} onDelete={onDelete} busy={busy}/></div>
    </header>
    <div className="okr-target-meta-line"><Tag color="blue">{target.levelLabel || '公司级'}</Tag><span className="okr-target-creator">{target.creatorName || '未指定'}</span><span className="okr-target-weight">{target.totalWeight ?? 0}%</span></div>
    <div className="okr-target-card-meta"><span>当前进度：<strong className="okr-target-card-progress">{target.progress}%</strong></span><time>截止日期：{formatDeadline(target.maxDeadline || '')}</time></div>
    <div className="okr-target-card-actions">{visibleActions.length
      ? visibleActions.map((action, actionIndex) => <ActionRow key={action.id} action={action} index={actionIndex} submitted={submitted} compact inlineAssignees/>)
      : <p className="okr-target-no-actions">暂无拆解行动</p>}
    </div>
  </article>;
};

export const MyTargetMonthSection: React.FC<Props> = ({ periodKey, targets, viewMode, collapsed, onToggle, onOpenTarget, onEditTarget, onDeleteTarget, busy }) => (
  <section className="okr-target-month" aria-label={`${dayjs(periodKey).format('YYYY年MM月')}目标`}>
    <button type="button" className="okr-target-month-head" onClick={onToggle} aria-expanded={!collapsed} aria-label={`${collapsed ? '展开' : '收起'}${dayjs(periodKey).format('YYYY年MM月')}`}>
      {collapsed ? <ChevronRight/> : <ChevronDown/>}
      <strong>{dayjs(periodKey).format('YYYY年MM月')}</strong>
      <span>{getPeriodCountdown(periodKey)}</span>
      <em>{targets.length} 个目标</em>
    </button>
    {!collapsed && (targets.length === 0 ? <div className="okr-target-empty"><Empty description={`${dayjs(periodKey).format('YYYY年MM月')}暂无目标`} /></div> : <div className={viewMode === 'list' ? 'okr-target-list' : 'okr-target-grid'}>
      {targets.map((target, index) => viewMode === 'list'
        ? <ListTarget key={target.id} target={target} index={index} onOpen={() => onOpenTarget(target.id)} onEdit={onEditTarget ? () => onEditTarget(target.id) : undefined} onDelete={onDeleteTarget ? () => onDeleteTarget(target.id) : undefined} busy={busy}/>
        : <CardTarget key={target.id} target={target} index={index} onOpen={() => onOpenTarget(target.id)} onEdit={onEditTarget ? () => onEditTarget(target.id) : undefined} onDelete={onDeleteTarget ? () => onDeleteTarget(target.id) : undefined} busy={busy}/>) }
    </div>)}
  </section>
);
