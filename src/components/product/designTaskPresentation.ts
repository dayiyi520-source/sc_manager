import type { RequirementTask } from '../../types';

export type DesignVariant = 'product' | 'project' | 'other';
export const designVariantOf = (task: RequirementTask): DesignVariant => {
  if (task.designVariant) return task.designVariant;
  if (task.requirementType?.includes('其他')) return 'other';
  if (/物料|项目/.test(task.requirementType || '')) return 'project';
  return 'product';
};
export const designTypeLabel = (name: string) => name.replace(/物料设计/g, '项目设计');
export const designGroupOf = (task: RequirementTask) => {
  const variant = designVariantOf(task);
  const name = variant === 'product' ? task.productLineName : variant === 'project'
    ? task.designProjectName || (task as RequirementTask & { projectName?: string }).projectName
    : task.designSourceDepartment || task.department;
  return { key: variant === 'product' ? task.productLineId || name || '' : name || '', name: name || '未设置' };
};
