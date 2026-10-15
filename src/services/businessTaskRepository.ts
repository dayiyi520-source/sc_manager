import { productRepository } from './productRepository';
import { normalizeDeliveryTask } from '../utils/businessTaskWorkflow';
import type { RequirementTask } from '../types';

// 现有接口没有范围统计字段，完整读取可访问集合以保持三个标签和列表口径一致。
export async function loadBusinessTasks(kind: 'presales' | 'delivery'): Promise<RequirementTask[]> {
  const tasks = new Map<string, RequirementTask>();
  const pageSize = 200;
  for (let page = 1; ; page += 1) {
    const result = await productRepository.businessTasks(kind, { page, pageSize });
    const previousSize = tasks.size;
    for (const item of result.items) tasks.set(item.id, kind === 'delivery' ? normalizeDeliveryTask(item) : item);
    if (tasks.size >= result.total) return [...tasks.values()];
    if (!result.items.length || tasks.size === previousSize) throw new Error('任务分页数据不完整，请重试');
  }
}
