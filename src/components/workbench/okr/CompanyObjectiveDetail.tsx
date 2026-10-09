import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Empty, Progress, Skeleton, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon, HistoryIcon, PencilIcon, GraphIcon, TrashIcon, XIcon } from '@primer/octicons-react';
import { PersonAvatar } from '../../common/PersonIdentity';
import { okrRepository, type OkrPerson, type OkrRecord, type OkrWork } from '../../../services/okrRepository';
import { buildGoalHierarchy, type GoalHierarchyNode } from './GoalHierarchyView';

type Props = { record: OkrRecord; records: OkrRecord[]; people: OkrPerson[]; work: OkrWork[]; workLoading: boolean; workError: Error | null; onRetryWork: () => void; onClose: () => void; onEdit?: () => void; onDelete?: () => void; busy?: boolean };
type ActionSection = 'tasks' | 'projects' | 'products' | 'alignments';
const descendants = (node: GoalHierarchyNode): GoalHierarchyNode[] => [node, ...node.children.flatMap(descendants)];

export function companyActionTasks(node: GoalHierarchyNode, objectiveId: string, work: OkrWork[], records: OkrRecord[]): OkrWork[] {
  const ids = new Set(descendants(node).map(item => item.referenceId));
  const evidence = new Set(records.filter(record => record.kind === 'review' && record.status !== 'draft').flatMap(record => (record.payload.krReviews ?? []).filter(review => review.objectiveId === objectiveId && ids.has(review.keyResultId)).flatMap(review => review.workIds ?? [])));
  return [...new Map(work.filter(item => (item.objectiveId === objectiveId && ids.has(item.keyResultId ?? '')) || evidence.has(item.id)).map(item => [item.id, item])).values()];
}

export function CompanyObjectiveDetail({ record, records, people, work, workLoading, workError, onRetryWork, onClose, onEdit, onDelete, busy = false }: Props) {
  const objective = buildGoalHierarchy(records, record.periodKey, record.ownerId, people).find(item => item.id === record.id);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedSections, setSelectedSections] = useState<Record<string, ActionSection>>({});
  const [events, setEvents] = useState<Array<{action: string; operator: string; createdAt: string}>>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setEventsLoading(true); setEventsError(false); setEvents([]);
    void okrRepository.events(record.id).then(result => { if (active) setEvents(result); }).catch(() => { if (active) setEventsError(true); }).finally(() => { if (active) setEventsLoading(false); });
    return () => { active = false; };
  }, [record.id, record.version, retry]);
  const challenge = record.payload.objectiveType === 'challenge';
  const name = (id: string) => people.find(person => person.id === id)?.name ?? '未知人员';
  const index = records.filter(item => item.kind === 'objective' && item.ownerId === record.ownerId && item.periodKey === record.periodKey).findIndex(item => item.id === record.id) + 1;
  const assignees = [...new Set((record.payload.keyResults || []).flatMap(action => action.assigneeIds || []))];
  const source = record.payload.alignments?.map(alignment => records.find(item => item.id === alignment.parentObjectiveId)?.payload.title).filter(Boolean).join('、') || `${dayjs(record.periodKey).format('YYYY年MM月')}目标`;
  return <Drawer open placement="bottom" size="calc(100dvh - 3rem)" rootClassName="company-objective-drawer company-objective-detail-drawer" closable={false} keyboard={!busy} maskClosable={!busy} extra={
    <div className="company-detail-header-actions" role="group" aria-label="目标操作">
      <Tooltip title={onEdit ? '修改' : '仅制定人可修改'}><span><Button type="text" aria-label="修改目标" disabled={busy || !onEdit} onClick={onEdit} icon={<PencilIcon/>}/></span></Tooltip>
      <Tooltip title={onDelete ? '删除' : '仅制定人可删除'}><span><Button type="text" aria-label="删除目标" disabled={busy || !onDelete} onClick={onDelete} icon={<TrashIcon/>}/></span></Tooltip>
      <Button type="text" aria-label="关闭目标详情" disabled={busy} onClick={onClose} icon={<XIcon/>}/>
    </div>
  } title={
    <div className="company-detail-header">
      <span className="company-detail-header-title">目标详情<span className="company-detail-header-period"> / {dayjs(record.periodKey).format('YYYY年MM月')}</span></span>
    </div>
  } onClose={onClose}>
    <div className="company-detail-layout">
      <main className="company-detail-main" aria-label="目标与动作" tabIndex={0}>
        <section className={`company-detail-overview${challenge ? ' is-challenge' : ''}`}>
          <div className="company-detail-source">{source}</div>
          <div className="company-detail-title"><span className={`company-kind${challenge ? ' is-challenge' : ''}`}>{challenge ? 'TO' : 'CO'}{index || 1}</span><h2>{record.payload.title}</h2></div>
          <div className="company-detail-summary"><div className="company-detail-progress"><Progress type="circle" percent={objective?.progress ?? 0} size="small" showInfo={false}/><span>{objective?.progress ?? 0}%</span></div><span className="company-detail-level">公司级</span><span className="company-detail-owner" aria-label={`制定人：${name(record.ownerId)}`}><PersonAvatar name={name(record.ownerId)}/>{name(record.ownerId)}</span><span className="company-detail-weight">目标权重:{record.payload.weight ?? 100}%</span></div>
          <div className="company-detail-assignees">{assignees.length ? assignees.map(name).join('、') : '未指定承接人员'}</div>
        </section>
        {record.payload.note && <p className="company-detail-note">{record.payload.note}</p>}
        <div className="company-detail-divider" role="separator"/>
        {!objective?.children.length && <Empty description="暂无 A 关键结果"/>}
        {objective?.children.map((action, index) => {
          const tasks = companyActionTasks(action, record.id, work, records);
          const activeSection = selectedSections[action.id];
          const open = !!expanded[action.id];
          const linkedIds = new Set(descendants(action).map(node => node.referenceId));
          const linkedActions = records.filter(item => item.kind === 'action' && linkedIds.has(item.id));
          const projects = [...new Set(linkedActions.filter(item => item.payload.structureType === 'delivery').map(item => item.payload.businessObject?.trim()).filter((value): value is string => !!value))];
          const products = [...new Set(linkedActions.map(item => item.payload.productLine?.trim()).filter((value): value is string => !!value))];
          const selectSection = (section: ActionSection) => { setSelectedSections(current => ({ ...current, [action.id]: section })); setExpanded(current => ({ ...current, [action.id]: activeSection === section ? !current[action.id] : true })); };
          const sections: Array<{key: ActionSection; label: string; count: string | number; aria: string}> = [{key:'tasks',label:'所有任务',count:workLoading ? '加载中' : workError ? '加载失败' : tasks.length,aria:'关联任务'},{key:'projects',label:'项目',count:projects.length,aria:'项目'},{key:'products',label:'产品',count:products.length,aria:'产品'},{key:'alignments',label:'对齐我的',count:action.children.length,aria:'下级对齐'}];
          return <section className="company-action-card" key={action.id}>
            <div className="company-action-content"><div className="company-action-heading"><span className="company-action-number">A{index + 1}</span><div className="company-action-title"><h4>{action.title}</h4><div className="company-action-assignees">{action.assigneeIds.length ? action.assigneeIds.map(id => <span key={id}>@{name(id)}</span>) : <span className="is-empty">未指定承接人员</span>}</div></div></div>
            <div className="company-action-metrics"><div className="company-detail-progress" aria-label={`A${index + 1}进度：${action.progress}%`}><Progress type="circle" percent={action.progress} size="small" showInfo={false}/><span>{action.progress}%</span></div><span aria-label={`A${index + 1}权重：${action.weight}%`}><GraphIcon/>{action.weight}%</span><Tooltip title={action.deadline || '未设置截止日期'}><span aria-label={`A${index + 1}截止日期：${action.deadline || '未设置'}`}><CalendarIcon/>{action.deadline ? dayjs(action.deadline).format('MM-DD') : '未设置'}</span></Tooltip></div></div>
            <div className="company-action-tabs"><Button type="text" className="company-action-toggle" aria-label={`A${index + 1}${open ? '收起' : '展开'}关联内容`} aria-expanded={open} aria-controls={`company-action-panel-${action.id}`} icon={open ? <ChevronDownIcon/> : <ChevronRightIcon/>} onClick={() => { if (!activeSection) setSelectedSections(current => ({...current,[action.id]: 'tasks'})); setExpanded(current => ({...current,[action.id]: !current[action.id]})); }}/>{sections.map(section => <Button key={section.key} type="text" aria-label={`A${index + 1}${section.aria}`} aria-pressed={open && activeSection === section.key} className={open && activeSection === section.key ? 'is-active' : ''} onClick={() => selectSection(section.key)}>{section.label}（{section.count}）</Button>)}</div>
            {open && <div className="company-action-expanded" id={`company-action-panel-${action.id}`}>{activeSection === 'projects' || activeSection === 'products' ? (activeSection === 'projects' ? projects : products).length ? (activeSection === 'projects' ? projects : products).map(value => <div className="company-linked-row" key={value}>{value}</div>) : <p>{activeSection === 'projects' ? '暂无关联项目' : '暂无关联产品'}</p> : activeSection === 'alignments' ? action.children.length ? action.children.map(child => <div className="company-linked-row" key={child.id}><span>{child.title}</span><span>{name(child.ownerId)} · {child.progress}%</span></div>) : <p>暂无下级对齐</p> : workLoading ? <Skeleton active paragraph={{rows: 2}}/> : workError ? <Alert type="error" title="关联任务加载失败" action={<Button onClick={onRetryWork}>重试</Button>}/> : tasks.length ? tasks.map(task => <div className="company-linked-row" key={task.id}><span>{task.title}</span><span>{task.ownerName || '未指定'} · {task.status}</span></div>) : <p>暂无可查看的关联任务</p>}</div>}
          </section>;
        })}
      </main>
      <aside className="company-detail-events" aria-label="动态记录" tabIndex={0}><h3><HistoryIcon/>动态记录</h3>{eventsLoading ? <Skeleton active/> : eventsError ? <Alert type="error" title="动态记录加载失败" action={<Button onClick={() => setRetry(value => value + 1)}>重试</Button>}/> : events.length ? events.map((event, index) => <div className="company-event" key={`${event.createdAt}-${index}`}><strong>{event.operator}</strong><p>{({create:'创建目标',save:'保存目标',submit:'提交目标',update:'更新目标'} as Record<string,string>)[event.action] || event.action}</p><time>{event.createdAt}</time></div>) : <Empty description="暂无动态记录"/>}</aside>
    </div>
  </Drawer>;
}
