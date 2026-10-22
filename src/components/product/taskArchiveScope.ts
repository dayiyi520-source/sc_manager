import type { CurrentUser, EmployeeOption, RequirementTask } from '../../types';

export function isArchivedByUser(task: RequirementTask, user: CurrentUser, employees: EmployeeOption[]) {
  if (!task.archived) return false;
  if (task.archivedById) return task.archivedById === user.id;
  // 旧记录只有姓名时，仅在通讯录能够唯一确认身份时兼容，不能把同名者的任务归为本人。
  const matches = employees.filter(employee => employee.name.trim() === task.operatorName?.trim());
  return matches.length === 1 && matches[0].id === user.id;
}
