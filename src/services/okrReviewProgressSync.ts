import type { OkrPayload, OkrPerson, OkrRecord } from './okrRepository';
import { monthlyReviewTargets } from './okrReviewTargets';
import { saveKnowledgeValidation } from './knowledgeAttachments';
import { reviewTemplateFor } from './okrReviewTemplates';

const mean = (values: number[]) => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10 : 0;
const weighted = (rows: Array<{ progress: number; weight?: number }>) => {
  const total = rows.reduce((sum, row) => sum + (row.weight ?? 100), 0);
  return total ? Math.round(rows.reduce((sum, row) => sum + row.progress * (row.weight ?? 100), 0) / total * 10) / 10 : 0;
};
const valid = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;
const effective = (record: OkrRecord) => ['active', 'reviewed', 'completed', 'archived'].includes(record.status) && !record.payload.inherited && !(record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved');

/** Validate draft and submit through the same authoritative target/assignment query. */
export function validateReviewProgress(payload: OkrPayload, ownerId: string, records: OkrRecord[], people: OkrPerson[]) {
  if (!['week', 'month'].includes(payload.reviewType || '')) return;
  for (const entry of payload.knowledgeEntries || []) saveKnowledgeValidation(entry.attachments || []);
  const targets = monthlyReviewTargets(records, ownerId, people);
  const supervisor = reviewTemplateFor(people.find(person => person.id === ownerId), people) === 'supervisor';
  const ids = new Set<string>();
  for (const row of payload.krReviews || []) {
    const key = `${row.objectiveId}:${row.keyResultId}`;
    if (ids.has(key)) throw new Error('复盘目标不能重复');
    ids.add(key);
    const objective = targets.find(target => target.id === row.objectiveId);
    const target = objective?.keyResults.find(target => target.id === row.keyResultId);
    if (!target || !payload.startDate || !payload.endDate || ![payload.startDate.slice(0, 7), payload.endDate.slice(0, 7)].includes(objective!.cycle)) throw new Error('复盘目标不属于本人或当前周期，请刷新');
    if (!valid(row.currentProgress)) throw new Error('复盘进度必须在 0 到 100 之间');
    const details = supervisor ? target.details : target.parentKeyResultDetails;
    if (!supervisor && row.supervisorProgress?.length) throw new Error('无权更改此子 KR 进度');
    const detailIds = new Set<string>();
    for (const detail of row.detailProgress || []) {
      if (detailIds.has(detail.id) || !details?.some(item => item.id === detail.id) || !valid(detail.currentProgress)) throw new Error('子 KR 已取消指派或进度无效，请刷新');
      detailIds.add(detail.id);
    }
    row.detailRows = details;
    if (!supervisor && details?.length) row.currentProgress = mean(details.map(detail => row.detailProgress?.find(item => item.id === detail.id)?.currentProgress ?? 0));
    const ownIds = new Set<string>();
    for (const detail of row.supervisorProgress || []) {
      if (!supervisor || ownIds.has(detail.id) || !valid(detail.currentProgress) || !(details?.length ? details.some(item => item.id === detail.id && (item.assigneeIds ?? []).includes(ownerId)) : detail.id === target.id && target.assigneeIds?.includes(ownerId))) throw new Error('无权更改此子 KR 进度');
      ownIds.add(detail.id);
    }
  }
}

/** Absolute snapshots, ordered by business period then submission time: week/month never add. */
export function syncSubmittedReviewProgress(records: OkrRecord[], trigger: OkrRecord, people: OkrPerson[]): OkrRecord[] {
  if (trigger.kind !== 'review' || !['submitted', 'reviewed', 'active'].includes(trigger.status) || !['week', 'month'].includes(trigger.payload.reviewType || '')) return records;
  const reports = records.filter(record => record.kind === 'review' && ['submitted', 'reviewed', 'active'].includes(record.status) && ['week', 'month'].includes(record.payload.reviewType || ''))
    .sort((a, b) => (a.payload.endDate || '').localeCompare(b.payload.endDate || '') || (a.submittedAt || '').localeCompare(b.submittedAt || '') || a.id.localeCompare(b.id));
  let next: OkrRecord[] = records.map(record => ({ ...record, payload: { ...record.payload, keyResults: record.payload.keyResults?.map(kr => ({ ...kr, details: kr.details?.map(row => ({ ...row })), executionActions: kr.executionActions?.map(action => ({ ...action })) })) } }));
  // Only authoritative, still-assigned snapshots participate. Old snapshots remain readable.
  const snapshots = reports.flatMap(report => {
    const targets = monthlyReviewTargets(records, report.ownerId, people);
    return (report.payload.krReviews || []).flatMap(row => {
      const objective = targets.find(target => target.id === row.objectiveId);
      const target = objective?.keyResults.find(target => target.id === row.keyResultId);
      if (!target || ![report.payload.startDate?.slice(0, 7), report.payload.endDate?.slice(0, 7)].includes(objective?.cycle)) return [];
      return [{ report, row, target }];
    });
  });
  const affected = new Set((trigger.payload.krReviews || []).map(row => row.objectiveId));
  for (const row of trigger.payload.krReviews || []) {
    const legacy = records.find(record => record.kind === 'action' && record.id === row.keyResultId);
    if (legacy?.payload.parentObjectiveId) affected.add(legacy.payload.parentObjectiveId);
  }
  for (const record of records) if (affected.has(record.id)) {
    const parentId = record.payload.sourceObjectiveId || record.payload.parentObjectiveId;
    if (parentId) affected.add(parentId);
  }
  const touched = new Set<string>();
  for (const record of next.filter(record => record.kind !== 'review' && effective(record) && (affected.has(record.id) || record.kind === 'action' && (trigger.payload.krReviews || []).some(row => row.keyResultId === record.id)))) {
    for (const kr of record.payload.keyResults || []) {
      if (record.payload.goalLevel === 'department') {
        const detailIds = kr.details?.length ? kr.details.map(row => row.id) : [kr.id];
        let contributed = false;
        const values = detailIds.map(detailId => {
          const detail = kr.details?.find(row => row.id === detailId);
          const assigned = detail ? detail.assigneeIds ?? [] : kr.assigneeIds ?? [];
          const actionContributions = new Map<string, { ownerId: string; value: number }>();
          for (const snapshot of snapshots) {
            if (!assigned.includes(snapshot.report.ownerId)) continue;
            const personal = records.find(row => row.id === snapshot.row.objectiveId || row.kind === 'action' && row.id === snapshot.row.keyResultId);
            const aligns = personal && (personal.payload.sourceObjectiveId || personal.payload.parentObjectiveId) === record.id && (personal.payload.sourceKrId || personal.payload.parentKeyResultId || personal.payload.parentActionId) === kr.id;
            if (aligns) {
              const permitted = snapshot.target.parentKeyResultDetails;
              const progress = kr.details?.length ? permitted?.some(row => row.id === detailId) ? snapshot.row.detailProgress?.find(row => row.id === detailId)?.currentProgress : undefined : snapshot.row.currentProgress;
              if (progress !== undefined) actionContributions.set(`${snapshot.report.ownerId}:${snapshot.row.objectiveId}:${snapshot.row.keyResultId}`, { ownerId: snapshot.report.ownerId, value: progress });
            }
            if (snapshot.report.ownerId === record.ownerId && snapshot.row.objectiveId === record.id && snapshot.row.keyResultId === kr.id) {
              const progress = snapshot.row.supervisorProgress?.find(row => row.id === detailId)?.currentProgress;
              if (progress !== undefined) actionContributions.set(record.ownerId, { ownerId: record.ownerId, value: progress });
            }
          }
          const contributions = new Map(assigned.map(ownerId => [ownerId, mean([...actionContributions.values()].filter(row => row.ownerId === ownerId).map(row => row.value))]));
          if (!actionContributions.size) return detail?.progress ?? kr.progress;
          contributed = true;
          touched.add(record.id);
          // Retain the existing equal-contributor mean, including assigned people without updates.
          return mean(assigned.map(id => contributions.get(id) ?? 0));
        });
        if (!contributed) continue;
        if (kr.details?.length) kr.details = kr.details.map((row, index) => ({ ...row, progress: values[index] }));
        kr.progress = mean(values);
      } else {
        for (const snapshot of snapshots.filter(snapshot => snapshot.row.objectiveId === record.id)) {
          const action = kr.executionActions?.find(action => action.id === snapshot.row.keyResultId && action.ownerId === snapshot.report.ownerId);
          if (action) { touched.add(record.id); action.progress = snapshot.row.detailProgress?.length ? mean((snapshot.target.parentKeyResultDetails || []).map(detail => snapshot.row.detailProgress?.find(row => row.id === detail.id)?.currentProgress ?? 0)) : snapshot.row.currentProgress; }
          else if (kr.id === snapshot.row.keyResultId && record.ownerId === snapshot.report.ownerId) { touched.add(record.id); kr.progress = snapshot.row.currentProgress; }
        }
        if (touched.has(record.id) && kr.executionActions?.length) kr.progress = weighted(kr.executionActions);
      }
    }
    if (record.kind === 'action') {
      const last = snapshots.filter(snapshot => snapshot.row.keyResultId === record.id && snapshot.report.ownerId === record.ownerId).at(-1);
      if (last) { touched.add(record.id); record.payload.progress = last.row.currentProgress; }
    } else if (touched.has(record.id)) record.payload.progress = weighted(record.payload.keyResults || []);
  }
  // Recompute ancestors in dependency order; bounded passes also tolerate historical cycles.
  for (let pass = 0; pass < next.length; pass++) {
    let changed = false;
    for (const parent of next.filter(record => record.kind === 'objective' && record.payload.goalLevel === 'company' && effective(record))) {
      for (const kr of parent.payload.keyResults || []) {
        const children = next.filter(child => child.kind !== 'review' && effective(child) && child.id !== parent.id && (child.payload.sourceObjectiveId === parent.id && child.payload.sourceKrId === kr.id || child.payload.alignments?.some(link => link.parentObjectiveId === parent.id && link.parentKeyResultId === kr.id)));
        if (!children.length || !children.some(child => touched.has(child.id))) continue;
        touched.add(parent.id);
        const value = weighted(children.map(child => ({ progress: child.payload.progress || 0, weight: child.payload.weight })));
        if (kr.progress !== value) { kr.progress = value; changed = true; }
      }
      if (touched.has(parent.id)) parent.payload.progress = weighted(parent.payload.keyResults || []);
    }
    if (!changed) break;
  }
  next = next.map(record => {
    const old = records.find(row => row.id === record.id)!;
    if (record.kind === 'review' || JSON.stringify(record.payload) === JSON.stringify(old.payload)) return old;
    const changes = (record.payload.keyResults || []).filter(kr => JSON.stringify(kr) !== JSON.stringify(old.payload.keyResults?.find(row => row.id === kr.id)));
    const entries = changes.map(kr => ({ itemId: kr.id, previousProgress: old.payload.keyResults?.find(row => row.id === kr.id)?.progress || 0, progress: kr.progress }));
    for (const kr of record.payload.keyResults || []) for (const detail of kr.details || []) {
      const previous = old.payload.keyResults?.find(row => row.id === kr.id)?.details?.find(row => row.id === detail.id)?.progress;
      if (previous !== detail.progress && detail.progress !== undefined) entries.push({ itemId: detail.id, previousProgress: previous ?? 0, progress: detail.progress });
    }
    for (const kr of record.payload.keyResults || []) for (const action of kr.executionActions || []) {
      const previous = old.payload.keyResults?.find(row => row.id === kr.id)?.executionActions?.find(row => row.id === action.id)?.progress || 0;
      if (previous !== action.progress) entries.push({ itemId: action.id, previousProgress: previous, progress: action.progress });
    }
    entries.push({ itemId: record.id, previousProgress: old.payload.progress || 0, progress: record.payload.progress || 0 });
    return { ...record, version: old.version + 1, progressHistory: [...(old.progressHistory || []), ...entries.map(entry => ({ ...entry, id: crypto.randomUUID(), operatorId: trigger.ownerId, createdAt: trigger.submittedAt || new Date().toISOString(), status: 'normal' as const, note: `${trigger.payload.reviewType === 'month' ? '月报' : '周报'} ${trigger.payload.startDate} 至 ${trigger.payload.endDate} 提交同步（${trigger.id}）`, attachments: [] }))] };
  });
  return next;
}
