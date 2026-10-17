import { isOkrAdmin } from './okrSettingsPolicy';
import { canAlignPeriod } from './okrPeriods';
import { goalLevel } from './okrGoalRules';
import { normalizeObjectiveTitleTemplates } from './okrObjectiveTitleTemplates';
import { inheritedGoalPayload, sourceKeyResults } from './okrThreeLevelRules';
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

export function departmentTemplateUsageKey(payload: OkrPayload) {
  if (!payload.sourceObjectiveId || !payload.sourceKrId || !payload.objectiveTitleTemplateId) return undefined;
  return `${payload.sourceObjectiveId}:${payload.sourceKrId}:${payload.objectiveTitleTemplateId}`;
}

function departmentUsedTemplateKeys(records: OkrRecord[], person: OkrPerson, period: string, extraPayloads: OkrPayload[] = []) {
  const keys = new Set<string>();
  for (const record of records) {
    if (record.kind !== 'objective' || record.ownerId !== person.id || record.periodKey !== period || record.status === 'deleted' || record.payload.goalLevel !== 'department') continue;
    for (const payload of [record.payload, ...(record.changeRequest?.status === 'pending' ? [record.changeRequest.payload] : [])]) {
      const key = departmentTemplateUsageKey(payload);
      if (key) keys.add(key);
    }
  }
  for (const payload of extraPayloads) {
    const key = departmentTemplateUsageKey(payload);
    if (key) keys.add(key);
  }
  return keys;
}


export function isDepartmentTemplateAvailable(settings: OkrSettings | undefined, records: OkrRecord[], person: OkrPerson, period: string, payload: OkrPayload) {
  const template = (settings ? normalizeObjectiveTitleTemplates(settings) : []).find(row => row.id === payload.objectiveTitleTemplateId && row.enabled && row.department.trim() === person.department.trim());
  const key = departmentTemplateUsageKey(payload);
  return Boolean(template && key && !departmentUsedTemplateKeys(records, person, period).has(key));
}

export function departmentCreationPayloads(settings: OkrSettings, records: OkrRecord[], person: OkrPerson, period: string, people: OkrPerson[], references: OkrRecord[], extraPayloads: OkrPayload[] = []): OkrPayload[] {
  const templates = normalizeObjectiveTitleTemplates(settings).filter(template => template.enabled && template.department.trim() === person.department.trim());
  const usedKeys = departmentUsedTemplateKeys(records, person, period, extraPayloads);
  const payloads: OkrPayload[] = [];
  for (const reference of references) {
    for (const template of templates) {
      const key = `${reference.payload.sourceObjectiveId}:${reference.id}:${template.id}`;
      if (usedKeys.has(key)) continue;
      payloads.push({
        ...inheritedGoalPayload(reference, person),
        inherited: false,
        goalLevel: 'department',
        title: template.title,
        objectiveType: 'target',
        objectiveTitleTemplateId: template.id,
        objectiveTemplateKrTypes: template.krTypes,
        keyResults: [],
      });
      usedKeys.add(key);
    }
  }
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
