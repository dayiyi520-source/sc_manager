import React, { useState } from 'react';
import { Button, Empty, Segmented, Tag } from 'antd';
import { sourceKeyResults } from '../../../services/okrThreeLevelRules';
import { challengeReferences } from '../../../services/goalCreationPolicy';
import { ownerGoalLevel } from '../../../services/okrGoalRules';
import { canAlignPeriod, periodLabel } from '../../../services/okrPeriods';
import type { OkrPayload, OkrPerson, OkrRecord, OkrSettings } from '../../../services/okrRepository';

interface Props {
  key?: string;
  records: OkrRecord[];
  people: OkrPerson[];
  person: OkrPerson;
  level: 'department' | 'personal';
  cycle: string;
  settings: OkrSettings;
  entries: Array<{ id: string; payload: OkrPayload }>;
  editing?: boolean;
  onLocate: (id: string) => void;
}

export function GoalCreationReference({ records, people, person, level, cycle, settings, entries, onLocate, editing = false }: Props) {
  const [view, setView] = useState<'mine' | 'all'>('mine');
  const [expanded, setExpanded] = useState(true);
  const references = challengeReferences(records, person, level, people, cycle, settings);
  const links = (payload: OkrPayload) => payload.alignments?.length ? payload.alignments : [{ parentObjectiveId: payload.sourceObjectiveId || payload.parentObjectiveId || '', parentKeyResultId: payload.sourceKrId || payload.parentKeyResultId }];
  const selected = new Map<string, Set<string>>();
  const include = (id: string, krId?: string, visited = new Set<string>()) => {
    if (!id || visited.has(id)) return;
    const record = records.find(row => row.id === id && row.status !== 'deleted');
    if (!record) return;
    const krs = selected.get(id) || new Set<string>();
    if (krId) krs.add(krId);
    selected.set(id, krs);
    links(record.payload).forEach(link => include(link.parentObjectiveId, link.parentKeyResultId, new Set([...visited, id])));
  };
  references.forEach(reference => reference.alignment.alignments.forEach(link => include(link.parentObjectiveId, link.parentKeyResultId)));
  entries.forEach(entry => links(entry.payload).forEach(link => include(link.parentObjectiveId, link.parentKeyResultId)));
  const visible = records.filter(record => {
    if (!['objective', 'action'].includes(record.kind) || !['active', 'submitted', 'reviewed'].includes(record.status) || record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved' || !canAlignPeriod(cycle, record.periodKey, settings.cycles?.crossAlignment)) return false;
    const owner = people.find(row => row.id === record.ownerId);
    const sourceLevel = ownerGoalLevel(owner, record.payload);
    const allowed = sourceLevel === '公司级' || level === 'personal' && sourceLevel === '部门级' && Boolean(person.department.trim()) && owner?.department.trim() === person.department.trim();
    return allowed && (view === 'all' || selected.has(record.id));
  });
  const childrenOf = (record: OkrRecord, krId?: string) => visible.filter(child => child.id !== record.id && links(child.payload).some(link => link.parentObjectiveId === record.id && (krId ? link.parentKeyResultId === krId : !link.parentKeyResultId)));
  const renderRecord = (record: OkrRecord, visited = new Set<string>()): React.ReactNode => {
    if (visited.has(record.id)) return null;
    const next = new Set([...visited, record.id]);
    const owner = people.find(row => row.id === record.ownerId);
    const sourceLevel = ownerGoalLevel(owner, record.payload);
    const peers = records.filter(row => row.kind === record.kind && row.ownerId === record.ownerId && row.periodKey === record.periodKey && row.status !== 'deleted');
    return <div className="goal-source-node" key={record.id}>
      <div className="goal-source-period"><span>{sourceLevel === '公司级' ? `${periodLabel(record.periodKey)}目标` : owner?.department || '未设置部门'}</span><Tag>{sourceLevel}</Tag><span>{owner?.name || '人员信息缺失'}</span></div>
      <div className="goal-source-title"><Tag>O{peers.findIndex(row => row.id === record.id) + 1}</Tag><span>{record.payload.title}</span></div>
      {sourceKeyResults(record).map((kr, index) => {
        if (view === 'mine' && !selected.get(record.id)?.has(kr.id)) return null;
        const forms = entries.filter(entry => links(entry.payload).some(link => link.parentObjectiveId === record.id && link.parentKeyResultId === kr.id));
        const existing = records.filter(row => row.kind === 'objective' && row.ownerId === person.id && row.periodKey === cycle && row.status !== 'deleted' && ownerGoalLevel(person, row.payload) === (level === 'department' ? '部门级' : '个人级') && [row.payload, ...(row.changeRequest?.status === 'pending' ? [row.changeRequest.payload] : [])].some(payload => links(payload).some(link => link.parentObjectiveId === record.id && link.parentKeyResultId === kr.id)));
        const mine = kr.assigneeIds?.includes(person.id) && sourceLevel === (level === 'department' ? '公司级' : '部门级');
        return <div className={`goal-source-kr${mine ? ' is-assigned' : ''}`} key={kr.id}>
          <Tag>KR{index + 1}</Tag><div className="goal-reference-kr-content"><div>{kr.title}</div><div className="goal-source-metrics"><span>承接人：{kr.assigneeIds?.map(id => people.find(row => row.id === id)?.name || '人员信息缺失').join('、') || '未指定'}</span><span>进度 {kr.progress ?? 0}%</span>{mine && <Tag color="blue">{level === 'department' ? '本部门承接' : '本人承接'}</Tag>}{[...new Set(existing.map(row => row.status === 'draft' ? '已生成草稿' : '已提交目标'))].map(status => <span className={status === '已生成草稿' ? 'goal-reference-status is-draft' : 'goal-reference-status is-submitted'} key={status}>{status}</span>)}{!editing && existing.length === 0 && forms.length > 0 && <Button size="small" type="link" onClick={() => onLocate(forms[0].id)}>定位填写</Button>}</div>
          {childrenOf(record, kr.id).map(child => <div className="goal-source-branch" key={child.id}>{renderRecord(child, next)}</div>)}
          </div>
        </div>;
      })}
      {childrenOf(record).map(child => <div className="goal-source-branch" key={child.id}>{renderRecord(child, next)}</div>)}
    </div>;
  };
  const roots = visible.filter(record => !links(record.payload).some(link => visible.some(parent => parent.id === link.parentObjectiveId && parent.id !== record.id && (!link.parentKeyResultId || sourceKeyResults(parent).some(kr => kr.id === link.parentKeyResultId)))));
  return <section className="goal-source-tree goal-creation-reference" aria-label="目标承接链路">
    <div className="goal-reference-toolbar"><Segmented aria-label="上级目标参考范围" options={[{label:'我的承接',value:'mine'},{label:'全部目标',value:'all'}]} value={view} onChange={value => setView(value)}/><Button type="text" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '收起' : '展开'}</Button></div>
    <div hidden={!expanded}>{roots.length ? roots.map(record => renderRecord(record)) : <Empty description={view === 'mine' ? '暂无本人承接目标' : '暂无上级目标'}/>}</div>
  </section>;
}
