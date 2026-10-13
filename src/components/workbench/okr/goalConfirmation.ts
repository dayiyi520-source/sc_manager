import { goalLevel } from '../../../services/okrGoalRules';
import type { OkrPerson, OkrRecord, OkrPayload } from '../../../services/okrRepository';

export function confirmationMembers(people: OkrPerson[], viewerId: string): OkrPerson[] {
  const viewer = people.find(person => person.id === viewerId);
  if (goalLevel(viewer) === '公司级') return people.filter(person => person.id !== viewerId && goalLevel(person) === '主管级');
  if (goalLevel(viewer) === '主管级') return people.filter(person => person.supervisorId === viewerId);
  return [];
}
export function confirmationRequests(records: OkrRecord[], people: OkrPerson[], viewerId: string): OkrRecord[] {
  const members = new Set(confirmationMembers(people, viewerId).map(person => person.id));
  return records.filter(record => record.kind === 'objective' && record.status !== 'deleted' && members.has(record.ownerId)
    && record.changeRequest?.status === 'pending' && record.changeRequest.reviewerId === viewerId);
}
export type GoalDifference = { id: string; label: string; before: string; after: string };
export function goalDifferences(before: OkrPayload, after: OkrPayload, people: OkrPerson[] = []): GoalDifference[] {
  const rows: GoalDifference[] = [];
  const text = (value: unknown) => value === undefined || value === null || value === '' ? '未设置' : String(value);
  const add = (id: string, label: string, left: unknown, right: unknown) => { if (text(left) !== text(right)) rows.push({id,label,before:text(left),after:text(right)}); };
  const names = (ids?: string[]) => (ids || []).map(id => people.find(person => person.id === id)?.name || id).join('、');
  add('title','目标内容',before.title,after.title); add('weight','目标权重',before.weight === undefined ? '100%' : before.weight + '%',after.weight === undefined ? '100%' : after.weight + '%');
  add('deadline','截止日期',before.deadline,after.deadline); add('note','备注',before.note,after.note);
  add('type','目标类型',before.objectiveType === 'challenge' ? '挑战型' : '承诺型',after.objectiveType === 'challenge' ? '挑战型' : '承诺型');
  add('source','对齐来源',before.sourceTitle,after.sourceTitle);
  for (const [index, kr] of (after.keyResults || []).entries()) {
    const old = before.keyResults?.find(item => item.id === kr.id); const prefix = 'KR' + (index + 1);
    if (!old) { add(kr.id,prefix + '新增',undefined,kr.title); }
    else { add(kr.id + ':title',prefix + '内容',old.title,kr.title); add(kr.id + ':weight',prefix + '权重',old.weight + '%',kr.weight + '%'); add(kr.id + ':date',prefix + '截止日期',old.deadline,kr.deadline); add(kr.id + ':people',prefix + '承接人员',names(old.assigneeIds),names(kr.assigneeIds)); }
    for (const detail of kr.details || []) { const prior=old?.details?.find(item=>item.id===detail.id); add(kr.id+':detail:'+detail.id,'业务明细 '+detail.name,prior ? [prior.stage,prior.plannedStartDate,prior.plannedEndDate].map(text).join(' · ') : undefined,[detail.stage,detail.plannedStartDate,detail.plannedEndDate].map(text).join(' · ')); }
    for (const detail of old?.details || []) if(!kr.details?.some(item=>item.id===detail.id)) add(kr.id+':removed:'+detail.id,'移除业务明细',detail.name,undefined);
    for (const [i, action] of (kr.executionActions || []).entries()) { const prior=old?.executionActions?.find(item=>item.id===action.id); const label=prefix+' / A'+(i+1); add(action.id+':title',label+'内容',prior?.title,action.title); add(action.id+':weight',label+'权重',prior?.weight===undefined?undefined:prior.weight+'%',action.weight===undefined?undefined:action.weight+'%'); add(action.id+':date',label+'截止日期',prior?.deadline,action.deadline); }
    for (const action of old?.executionActions || []) if(!kr.executionActions?.some(item=>item.id===action.id)) add(action.id+':removed','移除 A',action.title,undefined);
  }
  for (const kr of before.keyResults || []) if(!after.keyResults?.some(item=>item.id===kr.id)) add(kr.id+':removed','移除 KR',kr.title,undefined);
  return rows;
}
