import { ownerGoalLevel } from './okrGoalRules';
import type { OkrPerson, OkrRecord, OkrKr, OkrPayload } from './okrRepository';
/** Sub KR permissions require explicit row assignments, including for legacy rows. */
export function assignedDetailRows(kr: OkrKr, userId: string) {
  return kr.details?.filter(row => (row.assigneeIds ?? []).includes(userId));
}
export function normalizeGoalAssignments(payload: OkrPayload): OkrPayload {
  if (payload.goalLevel !== 'department') return payload;
  return { ...payload, keyResults: payload.keyResults?.map(kr => {
    if (!kr.details?.length) return kr;
    const details = kr.details.map(row => ({ ...row, assigneeIds: [...new Set(row.assigneeIds ?? [])] }));
    return { ...kr, details, assigneeIds: [...new Set(details.flatMap(row => row.assigneeIds))] };
  }) };
}

/** Display department assignments without creating personal copies. */
export function personalAssignedObjectives(records: OkrRecord[], person: OkrPerson | undefined, people: OkrPerson[]): OkrRecord[] {
  if (!person) return [];
  return records.flatMap(record => {
    const owner = people.find(item => item.id === record.ownerId);
    if (record.kind !== 'objective' || ownerGoalLevel(owner, record.payload) !== '部门级' || !person.department.trim() || owner?.department.trim() !== person.department.trim() || !['active', 'reviewed', 'submitted'].includes(record.status) || record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved') return [];
    const keyResults = (record.payload.keyResults || []).flatMap(kr => {
      const details = assignedDetailRows(kr, person.id);
      if (!(kr.details?.length ? details?.length : kr.assigneeIds?.includes(person.id))) return [];
      return [{ ...kr, details, executionActions: kr.executionActions?.filter(action => action.ownerId === person.id) }];
    });
    return keyResults.length ? [{ ...record, payload: { ...record.payload, keyResults } }] : [];
  });
}
