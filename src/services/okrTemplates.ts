import type { OkrSettings, OkrTemplate } from './okrRepository';

export const templateDepartments = (template: OkrTemplate) => template.departments || [template.department].filter(Boolean);
export const legacyTemplateDepartments: Record<string, string[]> = { '产研部门': ['产品规划部','交互设计部','软件研发部','研发一组','数据应用部'], '项目交付部门':['师生服务交付中心'], '售前支持部门':['售前方案部'], '其他支撑部门':['人力行政部','市场运营部','专家顾问部'] };
export const departmentTemplates = (settings: OkrSettings | undefined, department?: string) => {
  const templates = (settings?.templates || []).filter(template => ['product', 'delivery', 'support'].includes(template.type));
  const assigned = templates.filter(template => templateDepartments(template).includes(department || ''));
  if (assigned.length) return assigned;
  return templates.filter(template => templateDepartments(template).some(value => legacyTemplateDepartments[value]?.includes(department || '')));
};
export const templateValues = (template: OkrTemplate, settings: OkrSettings) => template.type === 'support'
  ? template.types ?? settings.dictionaries.supportTypes
  : template.stages ?? (template.type === 'product' ? settings.dictionaries.productNodes : settings.dictionaries.deliveryNodes);

export function migrateTemplateDepartments(templates: OkrTemplate[], departments: string[]) {
  const explicit = new Set(templates.flatMap(templateDepartments).filter(value=>!legacyTemplateDepartments[value]));
  return templates.map(template=>{
    const values = [...new Set(templateDepartments(template).flatMap(value=>legacyTemplateDepartments[value] ? legacyTemplateDepartments[value].filter(item=>departments.includes(item) && !explicit.has(item)) : [value]))];
    return {...template,department:values[0] || '',departments:values};
  }).filter(template=>template.departments.length);
}
