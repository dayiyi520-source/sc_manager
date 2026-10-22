import { isArchivedByUser } from './taskArchiveScope';
import type { CurrentUser, Customer, EmployeeOption, Opportunity, ProjectRecord, RequirementTask, TenderBidding } from '../../types';

export type BusinessTaskScope = 'my_owned' | 'my_created' | 'my_department' | 'all' | 'my_archived';
export const BUSINESS_TASK_SCOPES = [
  ['my_owned', '我负责的'], ['my_created', '我创建的'], ['my_department', '我部门的'], ['all', '全公司的'], ['my_archived', '我归档的'],
] as const;

export function matchesBusinessTaskScope(task: RequirementTask, scope: BusinessTaskScope, user: CurrentUser, employees: EmployeeOption[]) {
  if (scope === 'my_archived') return isArchivedByUser(task, user, employees);
  if (scope === 'all') return true;
  if (scope === 'my_owned') return task.assigneeId ? task.assigneeId === user.id : task.ownerName?.trim() === user.name.trim();
  if (scope === 'my_created') return task.creatorId ? task.creatorId === user.id : task.creatorName?.trim() === user.name.trim();
  if (!user.department?.trim()) return false;
  const owners = employees.filter(employee => task.assigneeId ? employee.id === task.assigneeId : employee.name.trim() === task.ownerName?.trim());
  const department = task.department?.trim() || (owners.length === 1 ? owners[0].department?.trim() : '');
  return Boolean(department) && department === user.department.trim();
}

function sourceFields(task: RequirementTask): Record<string, unknown> {
  let fields: Record<string, unknown> = {};
  try {
    const value = typeof task.specialFields === 'string' ? JSON.parse(task.specialFields) : task.specialFields;
    if (value && typeof value === 'object' && !Array.isArray(value)) fields = value;
  } catch { /* 历史归属数据无效时保留任务和明确的空值展示。 */ }
  return { ...fields, ...Object.fromEntries(Object.entries(task).filter(([, value]) => value !== undefined && value !== null && value !== '')) };
}
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function businessTaskSource(task: RequirementTask, kind: 'presales' | 'delivery', references: { projects?: ProjectRecord[]; opportunities?: Opportunity[]; biddings?: TenderBidding[]; customers?: Customer[] } = {}) {
  const fields = sourceFields(task);
  const project = references.projects?.find(item => item.id === (task.projectId || text(fields.projectId)));
  const customer = references.customers?.find(item => item.id === (task.customerId || text(fields.customerId) || project?.customerId));
  const projectName = task.projectName?.trim() || project?.name || text(fields.projectName);
  if (kind === 'delivery') {
    const customerName = task.customerName?.trim() || project?.customerName || text(fields.customerName) || customer?.name;
    return { ownership: [projectName || '未关联项目', customerName || '未关联客户院校'].join(' / '), stage: text(fields.projectStage) || text(fields['项目阶段']) || project?.stage || '未设置' };
  }
  const bidding = references.biddings?.find(item => item.id === text(fields.biddingId));
  const opportunity = references.opportunities?.find(item => item.id === text(fields.opportunityId));
  const biddingName = text(fields.biddingName) || bidding?.name || bidding?.projectName;
  const opportunityName = text(fields.opportunityName) || opportunity?.name;
  const source = biddingName ? '招投标：' + biddingName : opportunityName ? '商机：' + opportunityName : '未关联商机或招投标';
  return { ownership: [source, projectName || bidding?.projectName].filter(Boolean).join(' / '), stage: '' };
}
