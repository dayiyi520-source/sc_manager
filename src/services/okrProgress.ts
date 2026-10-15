import type { OkrRecord, OkrProgressEntry } from './okrRepository';

export function progressSubject(record: OkrRecord, itemId: string) {
  if (record.kind === 'action' && record.id === itemId) return { ...record.payload, id: record.id, ownerId: record.ownerId, progress: Number(record.payload.progress || 0), isAction: true };
  for (const kr of record.payload.keyResults || []) {
    const action = kr.executionActions?.find(item => item.id === itemId);
    if (action) return { ...action, isAction: true };
    if (kr.id === itemId) return { ...kr, ownerId: record.ownerId, isAction: false };
  }
}
export function hasProgressAlignment(record: OkrRecord, itemId: string, records: OkrRecord[]) {
  return records.some(child => child.id !== record.id && child.status !== 'deleted' && child.status !== 'draft' && !(child.changeRequest?.purpose === 'initial' && child.changeRequest.status !== 'approved') && (child.payload.sourceObjectiveId === record.id && (!child.payload.sourceKrId || child.payload.sourceKrId === itemId) || child.payload.alignments?.some(link => link.parentObjectiveId === record.id && (!link.parentKeyResultId || link.parentKeyResultId === itemId)) || child.payload.parentActionId === itemId || child.payload.parentKeyResultId === itemId));
}
export function canUpdateProgress(record: OkrRecord, itemId: string, viewerId: string, records: OkrRecord[]) {
  void record; void itemId; void viewerId; void records;
  return false;
}
export function applyProgress(record: OkrRecord, entry: OkrProgressEntry): OkrRecord {
  const weighted = (rows: Array<{ progress: number; weight?: number }>) => {
    const weight = rows.reduce((sum, row) => sum + (row.weight ?? 100), 0);
    return weight ? Math.round(rows.reduce((sum, row) => sum + row.progress * (row.weight ?? 100), 0) / weight) : 0;
  };
  const keyResults = record.payload.keyResults?.map(kr => {
    const actions = kr.executionActions?.map(action => action.id === entry.itemId ? { ...action, progress: entry.progress } : action);
    return { ...kr, executionActions: actions, progress: kr.id === entry.itemId ? entry.progress : actions?.some(action => action.id === entry.itemId) ? weighted(actions) : kr.progress };
  });
  return { ...record, version: record.version + 1, progressHistory: [...(record.progressHistory || []), entry], payload: { ...record.payload, keyResults, progress: record.kind === 'action' ? entry.progress : weighted(keyResults || []) } };
}
export function goalChangeInformation(before: OkrRecord['payload'], after: OkrRecord['payload']) {
  const info: string[] = [];
  if (before.title !== after.title) info.push(`目标内容：${before.title} → ${after.title}`);
  if (before.weight !== after.weight) info.push(`目标权重：${before.weight ?? 100}% → ${after.weight ?? 100}%`);
  for (const kr of after.keyResults || []) {
    const old = before.keyResults?.find(item => item.id === kr.id);
    if (!old) { info.push(`新增 KR：${kr.title}`); continue; }
    if (old.title !== kr.title) info.push(`KR 内容：${old.title} → ${kr.title}`);
    if (old.weight !== kr.weight) info.push(`KR 权重：${old.weight}% → ${kr.weight}%`);
    if (old.deadline !== kr.deadline) info.push(`KR 截止日期：${old.deadline || '未设置'} → ${kr.deadline || '未设置'}`);
    if (JSON.stringify(old.assigneeIds) !== JSON.stringify(kr.assigneeIds)) info.push(`KR「${kr.title}」承接人员已调整`);
    for (const row of kr.details || []) {
      const previous = old.details?.find(item => item.id === row.id);
      if (JSON.stringify(previous) !== JSON.stringify(row)) info.push(`${row.name}：${previous ? `${previous.stage || '未设置'}，${previous.plannedStartDate || '未设置'} 至 ${previous.plannedEndDate || '未设置'}` : '新增'} → ${row.stage || '未设置'}，${row.plannedStartDate || '未设置'} 至 ${row.plannedEndDate || '未设置'}`);
    }
    for (const row of old.details || []) if (!kr.details?.some(item => item.id === row.id)) info.push(`移除明细：${row.name}`);
    for (const action of kr.executionActions || []) {
      const previous = old.executionActions?.find(item => item.id === action.id);
      if (JSON.stringify(previous) !== JSON.stringify(action)) info.push(`A：${previous?.title || '新增'} → ${action.title}；截止日期：${previous?.deadline || '未设置'} → ${action.deadline || '未设置'}；权重：${previous?.weight ?? 0}% → ${action.weight ?? 0}%`);
    }
    for (const action of old.executionActions || []) if (!kr.executionActions?.some(item => item.id === action.id)) info.push(`移除 A：${action.title}`);
  }
  for (const kr of before.keyResults || []) if (!after.keyResults?.some(item => item.id === kr.id)) info.push(`移除 KR：${kr.title}`);
  if (JSON.stringify(before.alignments) !== JSON.stringify(after.alignments)) info.push('上级对齐目标已调整');
  if (before.note !== after.note) info.push(`备注：${before.note || '无'} → ${after.note || '无'}`);
  return info.join('\n') || '目标内容无变化';
}
