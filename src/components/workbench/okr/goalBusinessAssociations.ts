import type { OkrKr, OkrRecord, OkrWork } from '../../../services/okrRepository';

export function goalBusinessAssociations(record: OkrRecord, itemId: string, records: OkrRecord[], work: OkrWork[] = []) {
  const context = record.payload.keyResults?.find(kr => kr.id === itemId || kr.executionActions?.some(action => action.id === itemId));
  const contexts: Array<{ structureType?: string; businessObject?: string; productLine?: string; version?: string | number; details?: OkrKr['details'] }> = context ? [context] : [];
  const seen = new Set<string>();
  const follow = (objectiveId?: string, krId?: string) => {
    const key = objectiveId + ':' + krId;
    if (!objectiveId || seen.has(key)) return;
    seen.add(key);
    const parent = records.find(item => item.id === objectiveId);
    if (!parent) return;
    const kr = parent.payload.keyResults?.find(item => item.id === krId);
    if (kr) contexts.push(kr);
    else if (parent.kind === 'action') contexts.push(parent.payload);
    if (parent.payload.sourceObjectiveId) follow(parent.payload.sourceObjectiveId, parent.payload.sourceKrId);
  };
  if (record.payload.goalLevel === 'personal' && record.payload.origin !== 'autonomous') {
    follow(record.payload.sourceObjectiveId || record.payload.alignments?.[0]?.parentObjectiveId, record.payload.sourceKrId || record.payload.alignments?.[0]?.parentKeyResultId);
  }
  if (record.kind === 'action') contexts.push(record.payload);
  const linked = records.filter(item => item.kind === 'action' && item.status !== 'deleted' && (item.payload.parentActionId === itemId || item.payload.parentKeyResultId === itemId) && (!item.payload.parentObjectiveId || item.payload.parentObjectiveId === record.id || record.kind === 'action'));
  contexts.push(...linked.map(item => item.payload));
  const unique = (values: Array<string | undefined>) => [...new Set(values.map(value=>value?.trim()).filter((value): value is string=>!!value))];
  return {
    projects: unique(contexts.filter(item=>item.structureType==='delivery').map(item=>item.businessObject)),
    products: unique([...contexts.flatMap(item=>item.structureType==='product' ? [item.businessObject,item.productLine] : item.structureType==='delivery' ? [item.productLine,...(item.details||[]).map(row=>row.name),item.details?.length ? undefined : typeof item.version === 'string' ? item.version : undefined] : [item.productLine]), ...work.map(item=>item.productLineName)]),
  };
}
