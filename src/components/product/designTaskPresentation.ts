import type { ProductLine, RequirementTask } from '../../types';

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

/** Keep product associations current without rewriting task content or project/department names. */
export function syncDesignProductNames(tasks: RequirementTask[], products: Pick<ProductLine, 'id' | 'name' | 'nameAliases'>[]): RequirementTask[] {
  const byId = new Map(products.map(product => [product.id, product]));
  const byName = new Map<string, typeof products>();
  for (const product of products) {
    for (const name of new Set([product.name, ...(product.nameAliases || [])])) {
      const key = name.trim();
      if (key) byName.set(key, [...(byName.get(key) || []), product]);
    }
  }
  return tasks.map(task => {
    if (designVariantOf(task) !== 'product') return task;
    const matches = byName.get(task.productLineName?.trim() || '') || [];
    const product = task.productLineId ? byId.get(task.productLineId) : matches.length === 1 ? matches[0] : undefined;
    return product && (task.productLineId !== product.id || task.productLineName !== product.name)
      ? { ...task, productLineId: product.id, productLineName: product.name }
      : task;
  });
}
