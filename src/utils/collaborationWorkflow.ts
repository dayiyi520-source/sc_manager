import type { EmployeeOption, RequirementEvent, RequirementTask } from '../types';

export function isCollaborationCreator(task: RequirementTask, user: { id?: string; name?: string }) {
  if (task.creatorId && user.id) return task.creatorId === user.id;
  return Boolean(task.creatorName?.trim()) && task.creatorName?.trim() === user.name?.trim();
}
export function isRecordOnlyCollaboration(task: RequirementTask) {
  try {
    const fields = typeof task.specialFields === 'string' ? JSON.parse(task.specialFields) : task.specialFields;
    return task.workOrderType === '客户诉求' && fields?.transferToProduct === '不需要';
  } catch { return false; }
}

function metadata(value: unknown): Record<string, unknown> {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch { return {}; }
}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function lastCollaborationProcessor(task: RequirementTask, people: EmployeeOption[], history: RequirementEvent[] = task.events || []) {
  const event = history.map((item, index) => ({ item, index })).filter(({ item }) => item.eventType === '事项完成' && (!item.fromStatus || item.fromStatus === '处理中')).sort((a, b) => {
    const left = Date.parse(a.item.createdAt || ''); const right = Date.parse(b.item.createdAt || '');
    return Number.isFinite(left) && Number.isFinite(right) && left !== right ? right - left : b.index - a.index;
  })[0]?.item;
  const meta = metadata(event?.metadata);
  const processorId = text(meta.processingAssigneeId) || text(meta.fromAssigneeId);
  const processorName = text(meta.processingAssigneeName) || text(meta.fromAssigneeName) || event?.operatorName?.trim() || '';
  const candidates = processorId ? people.filter(person => person.id === processorId) : processorName ? people.filter(person => person.name.trim() === processorName) : [];
  return { id: candidates.length === 1 ? candidates[0].id : '', name: processorName || candidates[0]?.name || '', resolved: candidates.length === 1 };
}

export function collaborationDesignVariant(task: Pick<RequirementTask, 'workOrderType' | 'taskType' | 'requirementType'>): 'product' | 'project' | 'other' {
  const type = task.workOrderType || task.requirementType || task.taskType || '';
  if (['客户诉求', '产品需求'].includes(type)) return 'product';
  if (['交付支持', '项目交付'].includes(type)) return 'project';
  return 'other';
}
