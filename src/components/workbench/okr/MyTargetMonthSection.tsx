import React from 'react';
import { Empty, Progress, Tag } from 'antd';
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
};

export type MyTargetViewItem = {
  id: string;
  detailId?: string;
  title: string;
  status: string;
  sourceName?: string;
  ownerNames: string[];
  creatorName?: string;
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
};

export const getPeriodCountdown = (periodKey: string) => {
  const today = dayjs().startOf('day');
  const periodEnd = dayjs(`${periodKey}-01`).endOf('month').startOf('day');
  const remaining = periodEnd.diff(today, 'day');
  if (remaining < 0) return '周期已结束';
  if (remaining === 0) return '今天结束';
  return `剩余 ${remaining} 天`;
};

const formatDate = (value?: string) => value ? dayjs(value).format('YYYY-MM-DD') : '暂无时间';
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

export const buildMyTargetViewItems = (
  records: OkrRecord[],
  demoBreakdowns: DemoTargetBreakdown[],
  sourceActions: OkrRecord[],
  people: OkrPerson[],
  currentUserId: string,
): MyTargetViewItem[] => {
  const nameOf = (id?: string) => people.find(person => person.id === id)?.name;
  const namesOf = (ids?: string[]) => (ids || []).map(nameOf).filter((name): name is string => Boolean(name));
  const ownerName = nameOf(currentUserId);
  const ownerNameOf = (id?: string) => nameOf(id) || '未指定';
  const actionView = (record: OkrRecord): MyTargetActionViewItem => ({
    id: record.id,
    title: record.payload.title,
    assigneeNames: namesOf(record.payload.assigneeIds),
    progress: Number(record.payload.progress || 0),
    weight: Number(record.payload.weight || 0),
    deadline: record.payload.deadline || '',
  });
  const objectiveTargets = records.filter(record => record.kind === 'objective').map(record => {
    const actions: MyTargetActionViewItem[] = (record.payload.keyResults || []).map(action => ({
      id: action.id,
      title: action.title,
      assigneeNames: namesOf(action.assigneeIds),
      progress: Number(action.progress || 0),
      weight: Number(action.weight || 0),
      deadline: action.deadline || '',
    }));
    const sourceId = record.payload.parentObjectiveId || record.payload.alignments?.[0]?.parentObjectiveId;
    const source = sourceId ? [...sourceActions, ...records].find(item => item.id === sourceId) : undefined;
    const sourceOwner = source ? nameOf(source.ownerId) : undefined;
    return {
      id: record.id,
      detailId: record.id,
      title: record.payload.title,
      status: record.status,
      sourceName: sourceOwner ? `来源自上级 · ${sourceOwner}` : undefined,
      ownerNames: namesOf((record.payload.keyResults || []).flatMap(action => action.assigneeIds || [])).length ? namesOf((record.payload.keyResults || []).flatMap(action => action.assigneeIds || [])) : namesOf([record.ownerId]),
      creatorName: ownerNameOf(record.ownerId),
      totalWeight: actions.reduce((sum, action) => sum + action.weight, 0),
      maxDeadline: actions.map(action => action.deadline).filter(Boolean).sort().at(-1) || '',
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
    return {
      id: `action-group-${parentId}`,
      detailId: group[0]?.id,
      title: source?.payload.title || group[0]?.payload.title || '来源目标已不可用',
      status: group.some(item => item.status === 'draft') ? 'draft' : 'active',
      sourceName: sourceOwner ? `来源自上级 · ${sourceOwner}` : undefined,
      creatorName: source ? ownerNameOf(source.ownerId) : ownerNameOf(group[0]?.ownerId),
      totalWeight: actions.reduce((sum, action) => sum + action.weight, 0),
      maxDeadline: actions.map(action => action.deadline).filter(Boolean).sort().at(-1) || '',
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
  return <div className={`okr-target-action-row${compact ? ' is-compact' : ''}`}>
    <span className="okr-target-action-index">A{index + 1}</span>
    <strong title={action.title}>{action.title || '未填写行动描述'}{inlineAssignees && action.assigneeNames.length > 0 && <span className="okr-target-action-assignees-inline"> {action.assigneeNames.map(name => `@${name}`).join(' ')}</span>}</strong>
    {!inlineAssignees && <span title={assigneeLabel(action.assigneeNames)}>{assigneeLabel(action.assigneeNames)}</span>}
    {!compact && <>
      <span className="okr-target-action-progress">{submitted ? <><Progress type="circle" percent={action.progress} size={24} showInfo={false}/><b>{action.progress}%</b></> : '--'}</span>
      <span>权重 {action.weight}%</span>
      <time className={overdue ? 'is-overdue' : ''}>{formatDeadline(action.deadline)}</time>
    </>}
  </div>;
};

const ListTarget: React.FC<{ target: MyTargetViewItem; index: number; onOpen: () => void }> = ({ target, index, onOpen }) => {
  const submitted = isSubmitted(target);
  return <article className="okr-target-list-item" role="button" tabIndex={0} aria-label={`目标：${target.title}`} onClick={onOpen} onKeyDown={event => openOnKeyboard(event, onOpen)}>
    <header>
      <div className="okr-target-list-copy">
        <div className={`okr-target-hierarchy${target.sourceName || target.ownerNames.length ? ' has-links' : ''}`}>
          {target.sourceName && <span className="okr-target-hierarchy-source"><span className="okr-target-hierarchy-label">{target.sourceName}</span></span>}
          <div className="okr-target-title-line"><span className="okr-summary-index">O{index + 1}</span><h3>{target.title}</h3>{target.status === 'draft' && <Tag>草稿</Tag>}</div>
          <div className="okr-target-meta-line"><Tag color="blue">公司级</Tag><span className="okr-target-creator">制定者：{target.creatorName || '未指定'}</span><span className="okr-target-weight">目标权重：{target.totalWeight ?? 0}%</span></div>
          <span className="okr-target-hierarchy-owner"><span className="okr-target-hierarchy-label">承接人员：{assigneeLabel(target.ownerNames)}</span></span>
        </div>
      </div>
      <div className="okr-target-list-status">
        {submitted && <><div><span>进度</span><strong>{target.progress}%</strong></div><div><span>权重</span><strong>{target.totalWeight ?? 0}%</strong></div><div><span>截止日期</span><strong>{formatDeadline(target.maxDeadline || '')}</strong></div></>}
      </div>
    </header>
    <div className="okr-target-actions">{target.actions.length
      ? target.actions.map((action, actionIndex) => <ActionRow key={action.id} action={action} index={actionIndex} submitted={submitted} inlineAssignees/>)
      : <p className="okr-target-no-actions">暂无拆解行动</p>}
    </div>
  </article>;
};

const CardTarget: React.FC<{ target: MyTargetViewItem; index: number; onOpen: () => void }> = ({ target, index, onOpen }) => {
  const submitted = isSubmitted(target);
  const visibleActions = target.actions.slice(0, 4);
  const hiddenCount = target.actions.length - visibleActions.length;
  return <article className="okr-target-grid-card" role="button" tabIndex={0} aria-label={`目标卡片：${target.title}`} onClick={onOpen} onKeyDown={event => openOnKeyboard(event, onOpen)}>
    <header>
      <div className="okr-target-card-title"><span className="okr-summary-index">O{index + 1}</span><h3 title={target.title}>{target.title}</h3>{target.status === 'draft' && <Tag>草稿</Tag>}</div>
      {submitted && <strong className="okr-target-card-progress">{target.progress}%</strong>}
    </header>
    {target.sourceName && <span className="okr-target-source">{target.sourceName}</span>}
    <span className="okr-target-owner">承接人员：{assigneeLabel(target.ownerNames)}</span>
    <div className="okr-target-card-meta"><span>{submitted ? '提交时间' : '保存时间'}：{formatDate(target.savedAt)}</span>{submitted && <Progress percent={target.progress} size="small" showInfo={false}/>}</div>
    <div className="okr-target-card-actions">{visibleActions.length
      ? visibleActions.map((action, actionIndex) => <ActionRow key={action.id} action={action} index={actionIndex} submitted={submitted} compact/>)
      : <p className="okr-target-no-actions">暂无拆解行动</p>}
    </div>
    <footer><span>{hiddenCount > 0 ? `另有 ${hiddenCount} 条行动` : `${target.actions.length} 条行动`}</span></footer>
  </article>;
};

export const MyTargetMonthSection: React.FC<Props> = ({ periodKey, targets, viewMode, collapsed, onToggle, onOpenTarget }) => (
  <section className="okr-target-month" aria-label={`${dayjs(periodKey).format('YYYY年MM月')}目标`}>
    <button type="button" className="okr-target-month-head" onClick={onToggle} aria-expanded={!collapsed} aria-label={`${collapsed ? '展开' : '收起'}${dayjs(periodKey).format('YYYY年MM月')}`}>
      {collapsed ? <ChevronRight/> : <ChevronDown/>}
      <strong>{dayjs(periodKey).format('YYYY年MM月')}</strong>
      <span>{getPeriodCountdown(periodKey)}</span>
      <em>{targets.length} 个目标</em>
    </button>
    {!collapsed && (targets.length === 0 ? <div className="okr-target-empty"><Empty description={`${dayjs(periodKey).format('YYYY年MM月')}暂无目标`} /></div> : <div className={viewMode === 'list' ? 'okr-target-list' : 'okr-target-grid'}>
      {targets.map((target, index) => viewMode === 'list'
        ? <ListTarget key={target.id} target={target} index={index} onOpen={() => onOpenTarget(target.id)}/>
        : <CardTarget key={target.id} target={target} index={index} onOpen={() => onOpenTarget(target.id)}/>) }
    </div>)}
  </section>
);
