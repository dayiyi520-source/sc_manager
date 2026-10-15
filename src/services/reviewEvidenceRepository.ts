import { okrRepository, type OkrWork } from './okrRepository';
import { productRepository, type UnifiedWorkItem } from './productRepository';
import { requirementRepository } from './requirementRepository';
import type { RequirementTask } from '../types';

export type EvidenceViewer = { id: string; name: string; department?: string };
const strings = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [value]; } catch { return [value]; }
};
const belongsTo = (id: string | undefined, name: string | undefined, viewer: EvidenceViewer) => id ? id === viewer.id : Boolean(name && name === viewer.name);

export function collaborationEvidence(task: RequirementTask, viewer: EvidenceViewer): OkrWork | undefined {
  const participants = (task.events || []).filter(event => ['转派待受理', '事项转交', '转派给他人'].includes(event.eventType)).map(event => event.operatorName);
  const participantNames = [...new Set([...participants, ...(task.ccNames || [])])];
  if (!belongsTo(task.assigneeId, task.ownerName, viewer) && !belongsTo(task.creatorId, task.creatorName, viewer) && !participantNames.includes(viewer.name)) return;
  const events = task.events || [];
  const completion = [...events].reverse().find(event => event.toStatus === '已完成' || ['事项关闭', '任务完成'].includes(event.eventType));
  return {
    id: `collaboration:${task.id}`, sourceId: task.id, kind: 'collaboration', title: task.title,
    status: task.status === '已驳回' ? '已退回' : task.status, ownerName: task.ownerName,
    assigneeId: task.assigneeId, creatorId: task.creatorId, creatorName: task.creatorName, participantNames,
    productLineId: task.productLineId, productLineName: task.productLineName,
    versionId: task.versionId, versionName: task.versionName,
    createdAt: task.createdAt || '', updatedAt: events.at(-1)?.createdAt || task.createdAt || '', completedAt: completion?.createdAt,
    actualHours: task.actualHours || 0, estimatedHours: task.estimatedHours || 0,
    dueDate: task.dueDate || '', sourceWorkOrderIds: '[]', linkVersion: task.revision || 0,
  };
}

export function taskEvidence(task: UnifiedWorkItem, productName: string, viewer: EvidenceViewer): OkrWork | undefined {
  const assigneeId = task.assigneeId;
  if (!belongsTo(assigneeId, task.assigneeName, viewer) || task.sourceType === 'COLLABORATION' || task.sourceType === 'collaboration') return;
  return {
    id: `task:${task.id}`, sourceId: task.id, kind: 'task', title: task.title,
    status: task.status?.name || '', statusGroup: task.status?.group,
    ownerName: task.assigneeName || viewer.name, assigneeId: assigneeId || viewer.id, creatorName: task.creatorName,
    productLineId: task.productLineId, productLineName: productName, versionId: task.versionId || undefined, versionName: task.versionName,
    participantNames: strings(task.ccNames), createdAt: task.createdAt || '', updatedAt: task.createdAt || '', completedAt: task.completedAt || undefined,
    dueDate: task.dueDate || '', actualHours: task.actualHours || 0, estimatedHours: task.estimatedHours || 0,
    sourceWorkOrderIds: JSON.stringify(task.sourceWorkOrderIds || []), linkVersion: task.revision || 0,
  };
}

export async function loadReviewEvidence(viewer: EvidenceViewer): Promise<OkrWork[]> {
  const [legacy, products, collaborations, transferredIds] = await Promise.all([okrRepository.work(viewer.id), productRepository.productLines(), requirementRepository.allForScope(), requirementRepository.transferredBy(viewer.name)]);
  const collaborationIds = new Set(collaborations.map(task => task.id));
  const tasks = (await Promise.all(products.map(async product => {
    const rows: UnifiedWorkItem[] = [];
    for (let page = 1; ; page++) {
      const result = (await productRepository.workItems(product.id, '', '', { page, pageSize: 100 })).page;
      rows.push(...result.items);
      if (!result.items.length || rows.length >= result.total) break;
    }
    return rows.filter(task => !collaborationIds.has(task.id)).flatMap(task => {
      const value = taskEvidence(task, product.name, viewer);
      if (value?.versionId && !value.versionName) {
        const version = product.versions?.find(item => item.id === value.versionId);
        value.versionName = version?.code || version?.name;
      }
      return value ? [value] : [];
    });
  }))).flat();
  const related = collaborations.flatMap(task => {
    const scoped = transferredIds.has(task.id) ? { ...task, ccNames: [...(task.ccNames || []), viewer.name] } : task;
    const value = collaborationEvidence(scoped, viewer); return value ? [value] : [];
  });
  // Retain legacy IDs so saved evidence links remain valid; richer metadata replaces sparse rows.
  const values = new Map<string, OkrWork>();
  for (const work of [...legacy, ...tasks, ...related]) {
    const type = work.kind === 'collaboration' || /ticket|work_order|requirement_work_item|product_requirement/.test(work.kind) ? 'ticket' : 'task';
    const key = `${type}:${work.sourceId || work.id}`;
    const previous = values.get(key);
    values.set(key, previous ? { ...previous, ...work, id: previous.id, objectiveId: previous.objectiveId, keyResultId: previous.keyResultId } : work);
  }
  return [...values.values()];
}
