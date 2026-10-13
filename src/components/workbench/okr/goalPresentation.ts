import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';

export const isPersonalGoal = (record: OkrRecord) => record.payload.goalLevel === 'personal';
export const isAssignedPersonalGoal = (record: OkrRecord) => isPersonalGoal(record) && record.payload.origin !== 'autonomous';

export function goalSourceLabel(record: OkrRecord, records: OkrRecord[], people: OkrPerson[]): string | undefined {
  const links = record.payload.alignments?.length ? record.payload.alignments : record.payload.sourceObjectiveId || record.payload.parentObjectiveId
    ? [{ parentObjectiveId: record.payload.sourceObjectiveId || record.payload.parentObjectiveId || '', parentKeyResultId: record.payload.sourceKrId || record.payload.parentKeyResultId }] : [];
  const labels = links.map(link => {
    const parent = records.find(item => item.id === link.parentObjectiveId);
    const legacy = records.find(item => item.id === link.parentKeyResultId && item.kind === 'action');
    const title = (isAssignedPersonalGoal(record) ? record.payload.keyResults?.[0]?.businessObject : undefined) || parent?.payload.keyResults?.find(kr => kr.id === link.parentKeyResultId)?.title || legacy?.payload.title || (!link.parentKeyResultId ? parent?.payload.title : undefined) || record.payload.sourceTitle;
    const sourceOwner = people.find(person => person.id === (parent?.ownerId || legacy?.ownerId));
    return title ? `${title}——来源于上级${sourceOwner?.name || '未知人员'}` : '上级目标已不可用';
  });
  return labels.length ? [...new Set(labels)].join('、') : undefined;
}

export function hasDownstreamAlignment(child: OkrRecord, parentObjectiveId: string, krId: string, parentOwnerId: string, periodKey: string, people: OkrPerson[]): boolean {
  if (child.periodKey !== periodKey || child.ownerId === parentOwnerId || !['active', 'submitted', 'reviewed'].includes(child.status)
    || (child.changeRequest?.purpose === 'initial' && child.changeRequest.status !== 'approved')
    || people.find(person => person.id === child.ownerId)?.supervisorId !== parentOwnerId) return false;
  if (child.kind === 'objective') return Boolean(child.payload.alignments?.some(link => link.parentObjectiveId === parentObjectiveId && link.parentKeyResultId === krId)
    || (child.payload.sourceObjectiveId === parentObjectiveId && child.payload.sourceKrId === krId));
  return child.kind === 'action' && (child.payload.parentActionId === krId || child.payload.parentKeyResultId === krId)
    && (!child.payload.sourceObjectiveId || child.payload.sourceObjectiveId === parentObjectiveId);
}
