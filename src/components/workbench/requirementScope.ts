import type { EmployeeOption, RequirementTask } from '../../types';

export type RequirementScope = 'mine_created' | 'mine_owned' | 'mine_participating' | 'department' | 'all';
export const REQUIREMENT_SCOPES = [['mine_created', '我创建的'], ['mine_owned', '我负责的'], ['mine_participating', '我参与的'], ['department', '我部门的'], ['all', '全公司的']] as const;
type Viewer = { id?: string; name: string; department?: string };
const matches = (id: string | undefined, name: string | undefined, viewer: Viewer) =>
  id && viewer.id ? id === viewer.id : Boolean(name?.trim()) && name?.trim() === viewer.name.trim();

export function ownerDepartment(item: RequirementTask, employees: EmployeeOption[]) {
  // 历史重名且没有人员标识时，不猜测部门归属。
  const candidates = employees.filter((person) => item.assigneeId ? person.id === item.assigneeId : person.name === item.ownerName);
  return candidates.length === 1 ? candidates[0].department || '' : '';
}

export function isWorkOrderInScope(item: RequirementTask, scope: RequirementScope, viewer: Viewer, employees: EmployeeOption[] = [], transferredIds: ReadonlySet<string> = new Set()) {
  if (scope === 'all') return true;
  const owned = matches(item.assigneeId, item.ownerName, viewer);
  if (scope === 'mine_created') return matches(item.creatorId, item.creatorName, viewer);
  if (scope === 'mine_owned') return owned;
  if (scope === 'department') return Boolean(viewer.department) && ownerDepartment(item, employees) === viewer.department;
  return !owned && (transferredIds.has(item.id) || Boolean(item.events?.some((event) =>
    ['转派待受理', '事项转交', '转派给他人'].includes(event.eventType) && matches(undefined, event.operatorName, viewer))));
}
