import type { OkrPerson, OkrRecord } from './okrRepository';

export const goalLevel = (person?: Pick<OkrPerson, 'name' | 'jobTitle'> & { id?: string; rootFlag?: number }) =>
  person?.rootFlag === 1 || person?.id === 'user-admin' || person?.name === '林志豪' ? '公司级' : person?.jobTitle?.includes('主管') ? '主管级' : '个人级';

export const actionGroupKey = (record: OkrRecord) => record.payload.parentActionId || record.payload.parentKeyResultId || record.payload.parentObjectiveId || record.id;
export const legacyGoalActions = (record: OkrRecord, records: OkrRecord[]) => records.filter(item => item.kind === 'action' && item.status !== 'deleted' && item.ownerId === record.ownerId && item.periodKey === record.periodKey && actionGroupKey(item) === actionGroupKey(record));

export function assignedGoalActions(records: OkrRecord[], person?: OkrPerson): OkrRecord[] {
  if (!person?.supervisorId) return [];
  return records.filter(record => record.ownerId === person.supervisorId && ['active', 'submitted', 'reviewed'].includes(record.status)).flatMap<OkrRecord>(record => {
    if (record.kind === 'objective') return (record.payload.keyResults || []).filter(action => action.assigneeIds?.includes(person.id)).map(action => ({
      ...record, id: action.id, kind: 'action' as const,
      payload: { title: action.title, deadline: action.deadline, weight: action.weight, progress: action.progress, assigneeIds: action.assigneeIds, parentObjectiveId: record.id, parentKeyResultId: action.id, parentActionId: action.id },
    }));
    return record.kind === 'action' && record.payload.assigneeIds?.includes(person.id)
      ? [{ ...record, payload: { ...record.payload, parentObjectiveId: record.id, parentActionId: record.id, parentKeyResultId: record.id } }] : [];
  });
}

export const ownerGoalLevel = (person: OkrPerson | undefined, payload: OkrRecord['payload']) => goalLevel(person) === '主管级' && payload.goalLevel === 'personal' ? '个人级' : goalLevel(person);

export function autonomousAlignmentSource(source: OkrRecord, person: OkrPerson | undefined, personal: boolean, people: OkrPerson[]): boolean {
  if (!person) return false;
  if (personal && goalLevel(person) === '主管级') {
    const owner = people.find(item => item.id === source.ownerId);
    return source.kind === 'objective' && source.payload.goalLevel !== 'personal' && goalLevel(owner) === '主管级' && Boolean(person.department?.trim()) && owner?.department?.trim() === person.department.trim();
  }
  return source.ownerId === person.supervisorId;
}
