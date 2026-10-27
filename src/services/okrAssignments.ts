import { ownerGoalLevel } from './okrGoalRules';
import { getOkrWeightPlan } from './okrWeightPlans';
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

export function isAssigneeOnlyDepartmentChange(before: OkrPayload, after: OkrPayload): boolean {
  if (before.goalLevel !== 'department' || after.goalLevel !== 'department') return false;
  const oldGoal = normalizeGoalAssignments(before);
  const newGoal = normalizeGoalAssignments(after);
  const assignees = (goal: OkrPayload) => goal.keyResults?.map(kr => ({
    id: kr.id,
    assigneeIds: [...(kr.assigneeIds || [])].sort(),
    details: kr.details?.map(detail => ({ id: detail.id, assigneeIds: [...(detail.assigneeIds || [])].sort() })),
  }));
  const stable = (value: unknown): string => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  if (stable(assignees(oldGoal)) === stable(assignees(newGoal))) return false;
  const content = (goal: OkrPayload) => ({
    ...goal,
    changeReason: undefined,
    inherited: undefined,
    keyResults: goal.keyResults?.map(kr => ({
      ...kr,
      assigneeIds: undefined,
      details: kr.details?.map(detail => ({ ...detail, assigneeIds: undefined })),
    })),
  });
  return stable(content(oldGoal)) === stable(content(newGoal));
}

/** Display department assignments without creating personal copies. */
export function personalAssignedObjectives(records: OkrRecord[], person: OkrPerson | undefined, people: OkrPerson[]): OkrRecord[] {
  if (!person) return [];
  return records.flatMap(record => {
    const owner = people.find(item => item.id === record.ownerId);
    if (record.kind !== 'objective' || ownerGoalLevel(owner, record.payload) !== '部门级' || !person.department.trim() || owner?.department.trim() !== person.department.trim() || !['active', 'reviewed', 'submitted'].includes(record.status) || record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved') return [];
    const keyResults = (record.payload.keyResults || []).flatMap(kr => {
      const details = assignedDetailRows(kr, person.id);
      const explicitDetailAssignments = kr.details?.some(row => row.assigneeIds !== undefined);
      // Some legacy KR rows keep the assignee on the KR itself while also carrying detail rows.
      // Preserve that direct assignment instead of dropping the KR because no detail row matches.
      if (explicitDetailAssignments ? !details?.length : !kr.assigneeIds?.includes(person.id)) return [];
      const assignedDetails = explicitDetailAssignments ? details : kr.details;
      return [{ ...kr, details: assignedDetails, executionActions: kr.executionActions?.filter(action => action.ownerId === person.id) }];
    });
    return keyResults.length ? [{ ...record, payload: { ...record.payload, keyResults } }] : [];
  });
}

/** Personal display values stay separate from the department's shared KR progress and weights. */
export function personalGoalDisplayRecords(records: OkrRecord[], person: OkrPerson | undefined, people: OkrPerson[]): OkrRecord[] {
  if (!person) return [];
  const assigned = personalAssignedObjectives(records, person, people);
  const owned = records.filter(record => record.kind === 'objective' && record.ownerId === person.id && record.payload.goalLevel === 'personal');
  const displayed = [...assigned, ...owned].filter((record, index, rows) => rows.findIndex(item => item.id === record.id) === index);
  const reports = records.filter(record => record.kind === 'review' && record.ownerId === person.id && ['submitted', 'reviewed', 'active'].includes(record.status) && ['week', 'month'].includes(record.payload.reviewType || ''))
    .sort((a, b) => (a.payload.endDate || '').localeCompare(b.payload.endDate || '') || (a.submittedAt || '').localeCompare(b.submittedAt || '') || a.id.localeCompare(b.id));
  return displayed.map(record => {
    const plan = getOkrWeightPlan(person.id, record.periodKey);
    const approved = plan?.status === 'approved' ? plan : plan?.previousApproved;
    const detailKeys = (record.payload.keyResults || []).flatMap(kr => kr.details?.length ? kr.details.map(detail => detail.id) : [kr.id]);
    const defaultWeight = (index: number) => Math.floor(100 / detailKeys.length) + (index < 100 % detailKeys.length ? 1 : 0);
    const periodObjectives = displayed.filter(item => item.periodKey === record.periodKey);
    const objectiveIndex = periodObjectives.findIndex(item => item.id === record.id);
    const objectiveWeights = approved?.objectiveWeights;
    const useApprovedObjectives = periodObjectives.every(item => Number.isInteger(objectiveWeights?.[item.id]))
      && periodObjectives.reduce((sum, item) => sum + (objectiveWeights?.[item.id] ?? 0), 0) === 100;
    const detailWeights = approved?.keyResultWeights[record.id];
    const useApprovedDetails = detailKeys.every(id => Number.isInteger(detailWeights?.[id]))
      && detailKeys.reduce((sum, id) => sum + (detailWeights?.[id] ?? 0), 0) === 100;
    const ownProgress = (krId: string, detailId: string) => {
      let progress = 0;
      for (const report of reports) {
        if (![report.payload.startDate?.slice(0, 7), report.payload.endDate?.slice(0, 7)].includes(record.periodKey)) continue;
        for (const row of report.payload.krReviews || []) {
          const personalCopy = records.find(item => item.kind === 'objective' && item.ownerId === person.id && item.id === row.objectiveId && item.payload.sourceObjectiveId === record.id && item.payload.sourceKrId === krId);
          if (row.objectiveId === record.id && row.keyResultId === krId || personalCopy) {
            const value = row.detailProgress?.find(detail => detail.id === detailId)?.currentProgress;
            if (value !== undefined) progress = value;
          }
        }
      }
      return progress;
    };
    return {
      ...record,
      payload: {
        ...record.payload,
        weight: useApprovedObjectives ? objectiveWeights![record.id] : Math.floor(100 / periodObjectives.length) + (objectiveIndex < 100 % periodObjectives.length ? 1 : 0),
        keyResults: record.payload.keyResults?.map(kr => ({
          ...kr,
          details: kr.details?.map(detail => {
            const index = detailKeys.indexOf(detail.id);
            return { ...detail, progress: ownProgress(kr.id, detail.id), weight: useApprovedDetails ? detailWeights![detail.id] : defaultWeight(index) };
          }),
        })),
      },
    };
  });
}
