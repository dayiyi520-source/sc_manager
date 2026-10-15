import type { OkrKr, OkrPayload } from './okrRepository';
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
