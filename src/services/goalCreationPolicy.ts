import { canAlignPeriod } from './okrPeriods';
import { goalLevel } from './okrGoalRules';
import { normalizeObjectiveTitleTemplates } from './okrObjectiveTitleTemplates';
import type { OkrPerson, OkrRecord, OkrSettings, OkrPayload } from './okrRepository';
export type GoalCreationLevel = 'personal' | 'department';
export function creationSources(records: OkrRecord[], person: OkrPerson, level: GoalCreationLevel, people: OkrPerson[]) {
  return records.filter(record => record.kind === 'objective' && ['active','reviewed'].includes(record.status) && !(record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved') && (level === 'department'
    ? record.ownerId === person.supervisorId && (record.payload.goalLevel === 'company' || goalLevel(people.find(owner => owner.id === record.ownerId)) === '公司级')
    : record.payload.goalLevel !== 'personal' && (record.payload.goalLevel === 'department' || goalLevel(people.find(owner => owner.id === record.ownerId)) === '部门级') && (goalLevel(person) === '部门级' ? record.ownerId === person.id : record.ownerId === person.supervisorId)));
}
export function creationPeriodError(records: OkrRecord[], person: OkrPerson, level: GoalCreationLevel, people: OkrPerson[], period: string, settings?: OkrSettings) {
  if (goalLevel(person) === '公司级') return undefined;
  return creationSources(records,person,level,people).some(source => canAlignPeriod(period,source.periodKey,settings?.cycles?.crossAlignment)) ? undefined : level === 'department' ? '公司级目标还未提交，暂时无法添加目标' : '部门级目标还未提交，暂时无法添加目标';
}
export function unusedDepartmentTemplates(settings: OkrSettings | undefined, records: OkrRecord[], person: OkrPerson, period: string, people: OkrPerson[] = []) {
  const occupied = new Set(records.filter(record => record.kind === 'objective' && record.status !== 'deleted' && record.periodKey === period && record.payload.goalLevel !== 'personal' && (record.ownerId === person.id || people.some(owner => owner.id === record.ownerId && owner.department.trim() === person.department.trim()))).flatMap(record => [record.payload.objectiveTitleTemplateId, ...(record.changeRequest?.status === 'pending' ? [record.changeRequest.payload.objectiveTitleTemplateId] : [])]).filter(Boolean));
  return (settings ? normalizeObjectiveTitleTemplates(settings) : []).filter(template => template.enabled && template.department.trim() === person.department.trim() && !occupied.has(template.id));
}
export function sourceAlignment(source: OkrRecord, personId: string): Partial<OkrPayload> {
  const kr = source.payload.keyResults?.find(item => item.assigneeIds?.includes(personId));
  return { sourceObjectiveId: source.id, sourceKrId: kr?.id, sourceVersion: source.version, sourceTitle: kr?.title || source.payload.title, alignments: [{parentObjectiveId: source.id,parentKeyResultId:kr?.id}] };
}

export function departmentChallengeTypes(settings: OkrSettings | undefined, person: OkrPerson) {
  const types = [...new Set((settings ? normalizeObjectiveTitleTemplates(settings) : []).filter(template => template.enabled && template.department.trim() === person.department.trim()).flatMap(template => template.krTypes || []))];
  return types.length ? types : ['support' as const];
}
