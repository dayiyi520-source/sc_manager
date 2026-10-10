import type { RequirementTaskType, RequirementWorkItem } from '../types';
import { productRepository, type UnifiedWorkItem } from './productRepository';

const TASK_TYPES: Record<string, RequirementTaskType> = {
  requirement: '产品需求', design: '设计任务', dev: '研发任务', test: '测试任务',
  bug: '缺陷管理', presales: '售前任务', delivery: '交付任务', ops: '运维任务',
};

export function collaborationRelatedTasks(requirementId: string, direct: RequirementWorkItem[], tasks: UnifiedWorkItem[]) {
  const directIds = new Set(direct.map((item) => item.id));
  tasks.filter((item) => item.requirementId === requirementId || item.sourceWorkOrderIds?.includes(requirementId)).forEach((item) => directIds.add(item.id));
  const productIds = new Set(tasks.filter((item) => directIds.has(item.id) && item.category === 'requirement').map((item) => item.id));
  direct.filter((item) => item.category === 'requirement' || item.taskType === '产品需求' || item.taskType === '数据需求').forEach((item) => productIds.add(item.id));
  const cards = new Map(direct.map((item) => [item.id, item]));
  const indirectIds = new Set<string>();
  for (const item of tasks) {
    if (!TASK_TYPES[item.category]) continue;
    const indirect = !directIds.has(item.id) && ['design', 'dev', 'test'].includes(item.category)
      && (item.relatedTaskIds || []).some((id) => productIds.has(id));
    if (!directIds.has(item.id) && !indirect) continue;
    const previous = cards.get(item.id);
    cards.set(item.id, {
      ...previous, id: item.id, requirementId, category: item.category, productLineId: item.productLineId,
      taskType: TASK_TYPES[item.category], title: item.title, assigneeName: item.assigneeName || '',
      status: item.status?.name || previous?.status || '待处理', dueDate: item.dueDate || undefined,
      // 间接关联只用于追踪，不增加事项的关闭与验收约束。
      blocksClosure: indirect ? false : previous?.blocksClosure,
    });
    if (indirect) indirectIds.add(item.id);
  }
  return { items: [...cards.values()], indirectIds };
}

export async function loadCollaborationRelatedTasks(requirementId: string, direct: RequirementWorkItem[], productLineIds: string[]) {
  const groups = await Promise.all([...new Set(productLineIds)].map(async (id) => {
    const items: UnifiedWorkItem[] = [];
    for (let page = 1; ; page++) {
      const result = await productRepository.workItems(id, '', '', { page });
      items.push(...result.page.items);
      if (!result.page.items.length || items.length >= result.page.total) break;
    }
    return items;
  }));
  return collaborationRelatedTasks(requirementId, direct, groups.flat());
}
