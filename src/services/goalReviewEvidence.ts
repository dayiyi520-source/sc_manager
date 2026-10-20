import type { OkrPerson, OkrRecord, OkrReviewItem, OkrWeeklyReviewSnapshot, OkrWork } from './okrRepository';

export type GoalEvidenceTask = OkrWork & { sourceEmployees: string[]; savedHours?: number; snapshotOnly?: boolean };
const submitted = new Set(['submitted', 'reviewed', 'completed', 'archived', 'active']);
const names: Record<string, string> = { requirement: '产品任务', design: '设计任务', dev: '研发任务', test: '测试任务', bug: '缺陷任务', presales: '售前任务', delivery: '交付任务', ops: '运维任务', collaboration: '协同事项', ticket: '工单', task: '任务' };
export const evidenceTypeLabel = (task: Pick<OkrWork, 'taskType' | 'kind'>) => names[task.taskType || task.kind] || task.taskType || task.kind;
export const evidenceCompleted = (task: Pick<OkrWork, 'status' | 'statusGroup'>) => task.status === '已完成' || task.status === '已关闭' || task.statusGroup === 'DONE';
const pair = (objective: string, kr: string) => JSON.stringify([objective, kr]);

/** Resolve exact goal/action lineage, then collect published review evidence and embedded snapshots. */
export function goalReviewEvidence(record: OkrRecord, itemId: string, records: OkrRecord[], work: OkrWork[], people: OkrPerson[] = []): GoalEvidenceTask[] {
  const pairs = new Set<string>();
  const queue: Array<[string, string]> = [[record.id, itemId]];
  const legacy = records.find(row => row.kind === 'action' && row.id === itemId);
  if (legacy) queue.push([legacy.payload.parentObjectiveId || legacy.id, itemId], [legacy.id, itemId]);
  const allGoals = [...records.filter(row => row.id !== record.id), record].filter(row => row.kind !== 'review' && row.status !== 'deleted');
  const add = (objective: string, kr: string) => { if (!pairs.has(pair(objective, kr))) { pairs.add(pair(objective, kr)); queue.push([objective, kr]); } };
  while (queue.length) {
    const [objectiveId, krId] = queue.shift()!;
    pairs.add(pair(objectiveId, krId));
    const current = allGoals.find(row => row.id === objectiveId);
    const kr = current?.payload.keyResults?.find(row => row.id === krId);
    for (const action of kr?.executionActions || []) if (action.ownerId === current?.ownerId) add(objectiveId, action.id);
    for (const child of allGoals) {
      if (child.id === objectiveId) continue;
      const payload = child.payload;
      const linked = payload.sourceObjectiveId === objectiveId && payload.sourceKrId === krId
        || payload.parentObjectiveId === objectiveId && (payload.parentActionId === krId || payload.parentKeyResultId === krId)
        || payload.alignments?.some(link => link.parentObjectiveId === objectiveId && link.parentKeyResultId === krId);
      if (!linked) continue;
      if (child.kind === 'action') { add(objectiveId, child.id); add(child.id, child.id); }
      else for (const target of payload.keyResults || []) {
        if (target.id === krId || payload.sourceKrId === krId || payload.keyResults?.length === 1) add(child.id, target.id);
      }
    }
  }
  const result = new Map<string, GoalEvidenceTask>();
  const canonical = (id: string, source?: string, kind = 'task') => `${/collaboration|ticket|work_order|requirement_work_item|product_requirement/.test(kind) ? 'collaboration' : 'task'}:${source || id.replace(/^(task|collaboration|ticket)[:-]/, '')}`;
  const addTask = (id: string, snapshot: OkrReviewItem | undefined, author: string) => {
    const live = work.find(row => row.id === id || snapshot?.sourceId && row.sourceId === snapshot.sourceId || row.sourceId === id.replace(/^(task|collaboration|ticket)[:-]/, ''));
    if (!live && !snapshot) return;
    const [savedProduct, savedVersion] = (snapshot?.sourceLabel || '').split(' / ');
    const kind = live?.kind || (snapshot?.workType === 'ticket' ? 'collaboration' : 'task');
    const row: GoalEvidenceTask = {
      id, sourceId: snapshot?.sourceId || id.replace(/^(task|collaboration|ticket)[:-]/, ''), kind,
      title: snapshot?.title || '已失效任务', status: snapshot?.status || '无法读取', actualHours: snapshot?.actualHours ?? 0,
      estimatedHours: 0, dueDate: '', createdAt: '', updatedAt: '', sourceWorkOrderIds: '[]', linkVersion: 0,
      taskType: snapshot?.taskType, productLineId: snapshot?.productLineId,
      productLineName: snapshot?.productLineName || (savedProduct && savedProduct !== '—' ? savedProduct : undefined),
      versionId: snapshot?.versionId, versionName: snapshot?.versionName || savedVersion,
      projectId: snapshot?.projectId, projectName: snapshot?.projectName,
      ...Object.fromEntries(Object.entries(live || {}).filter(([, value]) => value !== undefined)), sourceEmployees: [], savedHours: snapshot?.actualHours, snapshotOnly: !live,
    };
    const key = canonical(id, row.sourceId, kind);
    const previous = result.get(key);
    result.set(key, { ...row, ...previous, ...Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)), actualHours: live?.actualHours ?? snapshot?.actualHours ?? previous?.actualHours ?? 0, savedHours: snapshot?.actualHours ?? previous?.savedHours, sourceEmployees: [...new Set([...(previous?.sourceEmployees || []), ...(author ? [author] : [])])] });
  };
  for (const item of work) if (item.objectiveId && item.keyResultId && pairs.has(pair(item.objectiveId, item.keyResultId))) addTask(item.id, undefined, item.ownerName || '');
  const visited = new Set<string>();
  const visit = (report: OkrWeeklyReviewSnapshot, force = false) => {
    if (!submitted.has(report.status)) return;
    const key = report.id + ':' + force;
    if (visited.has(key)) return; visited.add(key);
    const author = report.authorName || people.find(person => person.id === report.authorId)?.name || '人员已停用';
    const matching = (report.krReviews || []).filter(row => force || pairs.has(pair(row.objectiveId, row.keyResultId)));
    for (const item of report.items || []) if (item.objectiveId && item.keyResultId && pairs.has(pair(item.objectiveId, item.keyResultId))) addTask(item.workId, item, author);
    for (const contribution of matching) {
      for (const id of contribution.workIds || []) addTask(id, report.items?.find(item => item.workId === id), author);
      for (const snapshot of contribution.employeeReviewSnapshots || []) visit(snapshot, true);
    }
  };
  const reviews = records.filter(row => row.kind === 'review' && submitted.has(row.status)).sort((a, b) => (a.submittedAt || a.payload.endDate || a.createdAt || '').localeCompare(b.submittedAt || b.payload.endDate || b.createdAt || ''));
  for (const review of reviews) {
    visit({ id: review.id, title: review.payload.title, status: review.status, authorId: review.ownerId, startDate: review.payload.startDate || '', endDate: review.payload.endDate || '', krReviews: review.payload.krReviews || [], items: review.payload.items || [], assistance: [] });
    for (const snapshot of [...(review.payload.weeklyReviewSnapshots || []), ...(review.payload.departmentContentSnapshots || [])]) visit(snapshot);
  }
  return [...result.values()];
}

export function goalEvidenceProducts(tasks: GoalEvidenceTask[], fallback: string[] = []) {
  const rows = new Map<string, { key: string; name: string; version: string; tasks: GoalEvidenceTask[] }>();
  for (const task of tasks) {
    if (!task.productLineName) continue;
    const knownProducts = [...new Set(tasks.filter(row => row.productLineName === task.productLineName).map(row => row.productLineId).filter(Boolean))];
    const product = task.productLineId || (knownProducts.length === 1 ? knownProducts[0] : task.productLineName);
    const knownVersions = [...new Set(tasks.filter(row => row.productLineName === task.productLineName && row.versionName === task.versionName).map(row => row.versionId).filter(Boolean))];
    const version = task.versionId || (knownVersions.length === 1 ? knownVersions[0] : task.versionName || '');
    const key = JSON.stringify([product, version]);
    const value = rows.get(key) || { key, name: task.productLineName, version: task.versionName || '未记录版本', tasks: [] };
    value.tasks.push(task); rows.set(key, value);
  }
  for (const name of fallback) if (![...rows.values()].some(row => row.name === name)) rows.set(name, { key: name, name, version: '未记录版本', tasks: [] });
  return [...rows.values()].map(row => { const total = row.tasks.length, done = row.tasks.filter(evidenceCompleted).length; return { ...row, total, done, progress: total ? Math.round(done / total * 100) : 0 }; });
}
export function goalEvidenceProjects(tasks: GoalEvidenceTask[], fallback: string[] = []) {
  const names = [...new Set([...tasks.map(row => row.projectName).filter((name): name is string => Boolean(name)), ...fallback])];
  return names.map(name => { const linked = tasks.filter(row => row.projectName === name); return { name, taskCount: linked.length, productCount: new Set(linked.map(row => { const ids = [...new Set(linked.filter(item => item.productLineName === row.productLineName).map(item => item.productLineId).filter(Boolean))]; return row.productLineId || (ids.length === 1 ? ids[0] : row.productLineName); }).filter(Boolean)).size }; });
}
