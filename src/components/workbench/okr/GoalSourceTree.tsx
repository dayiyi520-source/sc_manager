import { useId, useState, type ReactNode } from 'react';
import { Alert, Button, Tag } from 'antd';
import { ChevronDownIcon, ChevronUpIcon } from '@primer/octicons-react';
import { periodLabel } from '../../../services/okrPeriods';
import { goalLevel } from '../../../services/okrGoalRules';
import { sourceKeyResults } from '../../../services/okrThreeLevelRules';
import type { OkrPayload, OkrPerson, OkrRecord, OkrKr } from '../../../services/okrRepository';

export interface GoalSourceNode { record: OkrRecord; kr?: OkrKr; children: GoalSourceNode[]; missing: boolean }
export function goalSourceTree(payload: OkrPayload, records: OkrRecord[], visited = new Set<string>()): GoalSourceNode[] {
  const links = payload.alignments?.length ? payload.alignments : [{ parentObjectiveId: payload.sourceObjectiveId || payload.parentObjectiveId || '', parentKeyResultId: payload.sourceKrId || payload.parentKeyResultId }];
  const unique = new Set<string>();
  return links.flatMap(link => {
    const id = link.parentObjectiveId, key = id + ':' + (link.parentKeyResultId || '');
    if (!id || unique.has(key)) return [];
    unique.add(key);
    const record = records.find(row => row.id === id && row.kind !== 'review' && row.status !== 'deleted');
    if (!record || visited.has(id)) return [];
    const kr = link.parentKeyResultId ? sourceKeyResults(record).find(row => row.id === link.parentKeyResultId) : undefined;
    const children = goalSourceTree(record.payload, records, new Set([...visited, id]));
    const hasParent = Boolean(record.payload.sourceObjectiveId || record.payload.parentObjectiveId || record.payload.alignments?.some(item => item.parentObjectiveId));
    return [{ record, kr, children, missing: Boolean(link.parentKeyResultId && !kr) || hasParent && !children.length }];
  });
}
export function GoalSourceTree({ payload, records, people, cycle }: { payload: OkrPayload; records: OkrRecord[]; people: OkrPerson[]; cycle: string }) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();
  const nodes = goalSourceTree(payload, records);
  const hasSource = Boolean(payload.sourceObjectiveId || payload.parentObjectiveId || payload.alignments?.some(link => link.parentObjectiveId));
  if (!nodes.length) return hasSource ? <Alert showIcon type="warning" title="上级目标来源已不可用，请核对承接关系"/> : null;
  const name = (id: string) => people.find(person => person.id === id)?.name || '人员信息缺失';
  const renderNode = (node: GoalSourceNode, descendant?: ReactNode): ReactNode => {
    const { record, kr } = node;
    const level = record.payload.goalLevel === 'company' ? '公司级' : record.payload.goalLevel === 'department' ? '部门级' : goalLevel(people.find(person => person.id === record.ownerId));
    const content = <div className="goal-source-node">
      <div className="goal-source-period"><span>{level === '公司级' ? `${periodLabel(record.periodKey || cycle)}目标` : people.find(person => person.id === record.ownerId)?.department?.trim() || '未设置部门'}</span><Tag>{level}</Tag><Tag>进度 {record.payload.progress ?? 0}%</Tag></div>
      <div className="goal-source-title"><Tag>O{Math.max(1, records.filter(row => row.kind === 'objective' && row.ownerId === record.ownerId && row.periodKey === record.periodKey && row.status !== 'deleted').findIndex(row => row.id === record.id) + 1)}</Tag><span>{record.payload.title}</span></div>
      {kr && <div className="goal-source-kr"><Tag>KR{sourceKeyResults(record).findIndex(row => row.id === kr.id) + 1}</Tag><div><div>{kr.title}</div><div className="goal-source-metrics"><span>承接人：{kr.assigneeIds?.map(name).join('、') || '未指定'}</span><span>进度 {kr.progress ?? 0}%</span><span>权重 {kr.weight}%</span><span>截止日期 {kr.deadline || '未设置'}</span></div></div></div>}
      {descendant && <div className="goal-source-branch">{descendant}</div>}
      {node.missing && <Alert type="warning" showIcon title={kr ? "更上级的目标来源缺失，请核对承接关系" : "原指派 KR 已不可用，请核对承接关系"}/>}
    </div>;
    return node.children.length ? <>{node.children.map(parent => <div key={parent.record.id}>{renderNode(parent, content)}</div>)}</> : content;
  };
  const roots = (node: GoalSourceNode): GoalSourceNode[] => node.children.length ? node.children.flatMap(roots) : [node];
  return <section className="goal-source-tree" aria-label="目标承接链路">
    <Button className="goal-source-toggle" type="text" aria-expanded={expanded} aria-controls={contentId} icon={expanded ? <ChevronUpIcon/> : <ChevronDownIcon/>} onClick={() => setExpanded(value => !value)}>{expanded ? '收起' : '展开'}</Button>
    {!expanded && <div className="goal-source-collapsed-summary">{nodes.flatMap(roots).map(node => <div className="goal-source-period" key={node.record.id}><span>{periodLabel(node.record.periodKey || cycle)}目标</span><Tag>{node.record.payload.goalLevel === 'company' || goalLevel(people.find(person => person.id === node.record.ownerId)) === '公司级' ? '公司级' : '部门级'}</Tag><Tag>进度 {node.record.payload.progress ?? 0}%</Tag></div>)}</div>}
    <div id={contentId} hidden={!expanded}>{nodes.map(node => <div key={node.record.id + ':' + (node.kr?.id || '')}>{renderNode(node)}</div>)}</div>
  </section>;
}
