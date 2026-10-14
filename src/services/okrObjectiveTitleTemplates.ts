import type { OkrObjectiveTitleTemplate, OkrSettings, OkrTemplateKrType } from './okrRepository';
import { departmentTemplates } from './okrTemplates';

export const PRODUCT_KR_STAGES = ['产品设计', 'UI设计', '产品开发', '测试验收', '上线运维'];
export const KR_TEMPLATE_OPTIONS: { value: OkrTemplateKrType; label: string }[] = [
  { value: 'product', label: '产研 KR' }, { value: 'delivery', label: '交付 KR' }, { value: 'support', label: '通用 KR' },
];
export function normalizeObjectiveTitleTemplates(settings: OkrSettings): OkrObjectiveTitleTemplate[] {
  return (settings.objectiveTitleTemplates || []).map(row => ({ ...row, krTypes: row.krTypes ?? [...new Set(departmentTemplates(settings, row.department).map(item => item.type).filter((type): type is OkrTemplateKrType => ['product', 'delivery', 'support'].includes(type)))] }));
}
export function validateObjectiveTitleTemplates(rows: OkrObjectiveTitleTemplate[]): string | undefined {
  const ids = new Set<string>(), titles = new Set<string>();
  for (const row of rows) {
    if (!row.id || ids.has(row.id)) return 'O 标题模板标识不能重复';
    ids.add(row.id);
    if (!row.department?.trim()) return '请选择 O 标题模板的适用部门';
    if (!row.title?.trim() || row.title.trim().length > 255) return 'O 标题须为 1–255 个字符';
    if ((row.guidance || '').length > 500) return 'O 标题填写说明不能超过 500 个字符';
    if (!row.krTypes?.length) return '请至少选择一种支持的 KR 模板';
    if (new Set(row.krTypes).size !== row.krTypes.length || row.krTypes.some(type => !KR_TEMPLATE_OPTIONS.some(option => option.value === type))) return '支持的 KR 模板无效或重复';
    const key = JSON.stringify([row.department.trim(), row.title.trim()]);
    if (titles.has(key)) return '同一部门不能重复配置相同 O 标题';
    titles.add(key);
  }
}
