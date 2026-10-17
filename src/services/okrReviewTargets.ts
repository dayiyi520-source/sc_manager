import type { OKRItem } from '../types';
import type { OkrPerson, OkrRecord } from './okrRepository';
import { assignedDetailRows } from './okrAssignments';
import { reviewTemplateFor } from './okrReviewTemplates';

const effective = (record: OkrRecord) => ['active', 'reviewed', 'completed', 'archived'].includes(record.status)
  && !record.payload.inherited
  && !(record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved');

/** Use the same persisted monthly records as My Targets, preserving personal A identities. */
export function monthlyReviewTargets(records: OkrRecord[], userId: string, people: OkrPerson[]): OKRItem[] {
  const person = people.find(member => member.id === userId);
  const supervisor = reviewTemplateFor(person, people) === 'supervisor';
  const owned = records.filter(record => record.ownerId === userId && effective(record)
    && (!supervisor || record.kind === 'objective' && record.payload.goalLevel !== 'personal' && record.payload.goalLevel !== 'company' && record.changeRequest?.status !== 'pending'));
  const targets: OKRItem[] = owned.filter(record => record.kind === 'objective').map(record => {
    const personal = record.payload.goalLevel === 'personal';
    const keyResults = (record.payload.keyResults || []).flatMap(kr => {
      const actions = !supervisor && (personal || kr.executionActions !== undefined)
        ? (kr.executionActions || []).filter(action => action.ownerId === userId)
        : [kr];
      const source = records.find(row => row.id === record.payload.sourceObjectiveId);
      const sourceKr = source?.payload.keyResults?.find(row => row.id === record.payload.sourceKrId);
      if (!supervisor && record.payload.sourceObjectiveId && (!source || !effective(source) || !sourceKr || !(sourceKr.details?.length ? assignedDetailRows(sourceKr, userId)?.length : sourceKr.assigneeIds?.includes(userId)))) return [];
      const permittedDetails = assignedDetailRows(sourceKr || kr, userId);
      if (!supervisor && (sourceKr || kr).details?.length && !permittedDetails.length) return [];
      return actions.map(action => ({
        id: action.id, content: action.title, progress: action.progress,
        weight: action.weight ?? 100, deadline: action.deadline || '', assigneeIds: supervisor ? kr.assigneeIds : [userId],
        businessObject: kr.businessObject, version: kr.version, details: supervisor ? kr.details : undefined,
        executionStatus: [...(record.progressHistory || [])].reverse().find(entry => entry.itemId === action.id)?.status,
        parentKeyResultId: supervisor ? undefined : kr.id, parentKeyResultTitle: supervisor ? undefined : kr.title,
        parentKeyResultProgress: supervisor ? undefined : kr.progress, parentKeyResultDetails: supervisor ? undefined : permittedDetails, plannedStartDate: action.actualStartedAt || kr.actualStartedAt,
      }));
    });
    return {
      id: record.id, cycle: record.periodKey, ownerId: userId, ownerName: person?.name || '本人',
      department: person?.department || '', category: 'my', objective: record.payload.title,
      executionStatus: [...(record.progressHistory || [])].reverse().find(entry => entry.itemId === record.id)?.status,
      primaryLabel: personal && record.payload.origin !== 'autonomous' ? 'KR' : 'O',
      weight: record.payload.weight ?? 100, progress: record.payload.progress || 0,
      deadline: record.payload.deadline || '', status: record.status as OKRItem['status'], keyResults,
    };
  });
  const groups = new Map<string, OkrRecord[]>();
  for (const record of owned.filter(record => record.kind === 'action')) {
    const key = `${record.periodKey}:${record.payload.parentObjectiveId || record.id}`;
    groups.set(key, [...(groups.get(key) || []), record]);
  }
  for (const [id, actions] of groups) {
    const first = actions[0];
    const source = records.find(record => record.id === first.payload.parentObjectiveId);
    targets.push({
      id, cycle: first.periodKey, ownerId: userId, ownerName: person?.name || '本人',
      department: person?.department || '', category: 'my', objective: source?.payload.title || '本人月度执行动作',
      primaryLabel: 'O', weight: 100, progress: 0, deadline: first.payload.deadline || '', status: 'active',
      keyResults: actions.flatMap(record => {
        const parentId = record.payload.parentKeyResultId || record.payload.parentActionId;
        const parent = source?.payload.keyResults?.find(kr => kr.id === parentId);
        if (source && (!effective(source) || parent && (parent.details?.length ? !assignedDetailRows(parent, userId)?.length : parent.assigneeIds && !parent.assigneeIds.includes(userId)))) return [];
        return [{
          id: record.id, content: record.payload.title, progress: record.payload.progress || 0,
          weight: record.payload.weight ?? 100, deadline: record.payload.deadline || '', assigneeIds: [userId],
          businessObject: parent?.businessObject, version: parent?.version,
          parentKeyResultId: parent?.id, parentKeyResultTitle: parent?.title,
          parentKeyResultProgress: parent?.progress, parentKeyResultDetails: parent ? assignedDetailRows(parent, userId) : undefined, plannedStartDate: record.payload.actualStartedAt || parent?.actualStartedAt,
        }];
      }),
    });
  }
  return targets;
}
