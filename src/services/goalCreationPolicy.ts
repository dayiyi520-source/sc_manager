import { isOkrAdmin } from './okrSettingsPolicy';
import { canAlignPeriod } from './okrPeriods';
import { goalLevel } from './okrGoalRules';
import { normalizeObjectiveTitleTemplates } from './okrObjectiveTitleTemplates';
import { autonomousGoalPayload, inheritedGoalPayload, sourceKeyResults } from './okrThreeLevelRules';
import type { OkrPerson, OkrRecord, OkrSettings, OkrPayload } from './okrRepository';
export type GoalCreationLevel = 'personal' | 'department';
export function creationSources(records: OkrRecord[], person: OkrPerson, level: GoalCreationLevel, people: OkrPerson[]) {
  return records.filter(record => record.kind === 'objective' && ['active','reviewed'].includes(record.status) && !(record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved') && (level === 'department'
    ? record.ownerId === person.supervisorId && (record.payload.goalLevel === 'company' || goalLevel(people.find(owner => owner.id === record.ownerId)) === '公司级')
    : record.payload.goalLevel !== 'personal' && (record.payload.goalLevel === 'department' || goalLevel(people.find(owner => owner.id === record.ownerId)) === '部门级') && (goalLevel(person) === '部门级' ? record.ownerId === person.id : record.ownerId === person.supervisorId)));
}
export function creationPeriodError(records: OkrRecord[], person: OkrPerson, level: GoalCreationLevel, people: OkrPerson[], period: string, settings?: OkrSettings) {
  if (level === 'personal' && isOkrAdmin(person.id, settings, people)) return '公司级目标管理员无需填写个人目标';
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

export function departmentCreationPayloads(settings: OkrSettings, records: OkrRecord[], person: OkrPerson, period: string, people: OkrPerson[], references: OkrRecord[]): OkrPayload[] {
  const pending = references.filter(reference => !records.some(record => record.kind === 'objective' && record.status !== 'deleted' && record.ownerId === person.id && record.periodKey === period && record.payload.goalLevel !== 'personal' && [record.payload, ...(record.changeRequest?.status === 'pending' ? [record.changeRequest.payload] : [])].some(payload => payload.sourceObjectiveId === reference.payload.sourceObjectiveId && payload.sourceKrId === reference.id)));
  const templates = unusedDepartmentTemplates(settings, records, person, period, people);
  const payloads = templates.map((template, index): OkrPayload => ({
    ...autonomousGoalPayload(person, 'department'), ...(pending.length ? inheritedGoalPayload(pending[index % pending.length], person) : {}),
    inherited: false, goalLevel: 'department', title: template.title, objectiveType: 'target', objectiveTitleTemplateId: template.id, objectiveTemplateKrTypes: template.krTypes, keyResults: [],
  }));
  for (const reference of pending.slice(templates.length)) payloads.push({ ...inheritedGoalPayload(reference, person), inherited: false, objectiveType: 'challenge', objectiveTemplateKrTypes: departmentChallengeTypes(settings, person) });
  return payloads;
}

export function challengeReferences(records: OkrRecord[], person: OkrPerson, level: GoalCreationLevel, people: OkrPerson[], period: string, settings?: OkrSettings) {
  return creationSources(records, person, level, people)
    .filter(source => canAlignPeriod(period, source.periodKey, settings?.cycles?.crossAlignment))
    .flatMap(source => sourceKeyResults(source).filter(kr => kr.assigneeIds?.includes(person.id)).map(kr => ({
      value: `${source.id}:${kr.id}`,
      alignment: { sourceObjectiveId: source.id, sourceKrId: kr.id, sourceVersion: source.version, sourceTitle: kr.title, alignments: [{parentObjectiveId: source.id, parentKeyResultId: kr.id}] } satisfies Partial<OkrPayload>,
    })));
}
