import type { CurrentUser, RequirementTask } from '../types';

export const BUSINESS_TASK_STATUSES = ['待处理', '处理中', '已完成'];

export function isCompletionPending(task: RequirementTask) {
  return task.completionApproval === 'pending' || task.status === '待审核';
}

export function normalizeDeliveryTask(task: RequirementTask): RequirementTask {
  return task.status === '待审核' ? { ...task, status: '处理中', completionApproval: 'pending' } : task;
}

export function needsCompletionApproval(task: RequirementTask) {
  if (task.creatorId && task.assigneeId) return task.creatorId !== task.assigneeId;
  return Boolean(task.creatorName?.trim() && task.ownerName?.trim() && task.creatorName.trim() !== task.ownerName.trim());
}

export function canReviewCompletion(task: RequirementTask, user: Pick<CurrentUser, 'id' | 'name' | 'role'>) {
  return user.role === 'admin' || (task.creatorId ? task.creatorId === user.id : Boolean(task.creatorName?.trim()) && task.creatorName?.trim() === user.name.trim());
}

export function isTaskOwner(task: RequirementTask, user: Pick<CurrentUser, 'id' | 'name'>) {
  return task.assigneeId ? task.assigneeId === user.id : Boolean(task.ownerName?.trim()) && task.ownerName.trim() === user.name.trim();
}
