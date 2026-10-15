import dayjs from 'dayjs';
import type { OkrPayload, OkrPerson, OkrSettings } from './okrRepository';
import { reviewTemplateFor } from './okrReviewTemplates';

export const FIXED_REVIEW_BLOCKS = [
  { id: 'goals', title: '目标复盘' }, { id: 'extra', title: '插播任务' },
  { id: 'assistance', title: '需要协同事项' }, { id: 'knowledge', title: '知识沉淀' },
] as const;
export const REVIEW_FIELD_TYPES = { text: '单行文本', textarea: '多行文本', number: '数值', percentage: '百分比', date: '日期', select: '单选', multiselect: '多选', boolean: '是 / 否', person: '人员', department: '部门', link: '链接', table: '明细表格' } as const;
export type ReviewFieldType = keyof typeof REVIEW_FIELD_TYPES;
export interface ReviewTemplateField { id: string; label: string; type: ReviewFieldType; required: boolean; options?: string[]; columns?: string[]; placeholder?: string; maxLength?: number }
export interface ReviewTemplateBlock { id: string; title: string; guidance: string; fields: ReviewTemplateField[] }
export interface ReviewReportTemplate {
  id: string; name: string; department: string; audience: 'employee' | 'supervisor'; reportType: 'week' | 'month';
  version: number; status: 'draft' | 'published'; enabled?: boolean; effectiveFrom: string; blocks: ReviewTemplateBlock[];
}
export type ReviewTemplateValues = Record<string, unknown>;
export const reviewTemplateEnabled = (row: ReviewReportTemplate) => row.status === 'published' && row.enabled !== false;
const sameScope = (a: ReviewReportTemplate, b: ReviewReportTemplate) => a.department === b.department && a.audience === b.audience && a.reportType === b.reportType;
export function normalizeLegacyReviewTemplates(rows: ReviewReportTemplate[]): ReviewReportTemplate[] {
  return rows.map(row => {
    if (row.status !== 'published' || row.enabled !== undefined) return row;
    const candidates = rows.filter(other => sameScope(row, other) && reviewTemplateEnabled(other));
    const selected = candidates.find(other => other.enabled === true) || candidates.reduce((latest, other) => other.version > latest.version ? other : latest, row);
    return selected.id === row.id ? row : { ...row, enabled: false };
  });
}
export function activateReviewTemplate(rows: ReviewReportTemplate[], target: ReviewReportTemplate): ReviewReportTemplate[] {
  const next = { ...target, status: 'published' as const, enabled: true };
  return [...rows.filter(row => row.id !== target.id).map(row => sameScope(row, target) && reviewTemplateEnabled(row) ? { ...row, enabled: false } : row), next];
}
export function newReviewTemplate(): ReviewReportTemplate {
  return { id: crypto.randomUUID(), name: '', department: '*', audience: 'employee', reportType: 'week', version: 1, status: 'draft', effectiveFrom: dayjs().add(1, 'day').format('YYYY-MM-DD'), blocks: FIXED_REVIEW_BLOCKS.map(block => ({ ...block, guidance: '', fields: [] })) };
}
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).isValid() && dayjs(value).format('YYYY-MM-DD') === value;
export function validateReviewTemplates(rows: ReviewReportTemplate[], previous: ReviewReportTemplate[] = [], today = dayjs().format('YYYY-MM-DD')): string | undefined {
  if (rows.length > 200 || new Set(rows.map(row => row.id)).size !== rows.length) return '模板数量超限或编号重复';
  for (const old of previous.filter(row => row.status === 'published')) {
    const next = rows.find(row => row.id === old.id);
    if (!next) { if (reviewTemplateEnabled(old)) return '进行中的已发布模板须先停用再删除'; continue; }
    const { enabled: oldEnabled, ...oldContent } = old;
    const { enabled: nextEnabled, ...nextContent } = next;
    if (JSON.stringify(nextContent) !== JSON.stringify(oldContent)) return '已发布模板内容不能修改，请复制新版本';
  }
  for (const row of rows) {
    if (!row.id || !row.name.trim() || row.name.length > 100 || !row.department.trim()) return '请填写模板名称和适用部门';
    if (!['employee', 'supervisor'].includes(row.audience) || !['week', 'month'].includes(row.reportType) || !['draft', 'published'].includes(row.status) || !Number.isInteger(row.version) || row.version < 1) return '模板身份、报告类型或版本无效';
    if (row.enabled !== undefined && typeof row.enabled !== 'boolean') return '模板启用状态无效';
    if (!validDate(row.effectiveFrom) || row.reportType === 'month' && !row.effectiveFrom.endsWith('-01')) return '请选择有效生效日期，月报须为每月1日';
    if (row.status === 'published' && !previous.some(old => old.id === row.id && old.status === 'published') && row.effectiveFrom < today) return '发布生效日期不能早于今天';
    if (row.blocks.length < 4 || row.blocks.length > 20 || new Set(row.blocks.map(block => block.id)).size !== row.blocks.length || row.blocks[0]?.id !== 'goals' || FIXED_REVIEW_BLOCKS.some(fixed => !row.blocks.some(block => block.id === fixed.id))) return '四个固定板块不可删除，目标板块必须在第一位';
    const ids = new Set<string>();
    for (const block of row.blocks) {
      if (!block.title.trim() || block.title.length > 100 || block.fields.length > 30) return '板块名称必填，每个板块最多30个字段';
      for (const field of block.fields) {
        if (!field.id || ids.has(field.id) || !field.label.trim() || field.label.length > 100 || !Object.hasOwn(REVIEW_FIELD_TYPES, field.type) || typeof field.required !== 'boolean') return '字段名称、类型无效或编号重复';
        ids.add(field.id);
        if (field.maxLength !== undefined && (!Number.isInteger(field.maxLength) || field.maxLength < 1 || field.maxLength > 10000)) return '最大字数须为1至10000的整数';
        if (field.placeholder !== undefined && (typeof field.placeholder !== 'string' || field.placeholder.length > 500)) return '输入框提示最多500字';
        if (['select', 'multiselect'].includes(field.type) && (!field.options?.length || field.options.some(option => !option.trim()) || new Set(field.options).size !== field.options.length)) return '选择字段需配置不重复的选项';
        if (field.type === 'table' && (!field.columns?.length || field.columns.length > 10 || field.columns.some(column => !column.trim()) || new Set(field.columns).size !== field.columns.length)) return '明细表需配置1至10个不重复的文本列';
      }
    }
    if (rows.some(other => other.id !== row.id && sameScope(other, row) && other.version === row.version)) return '同部门、身份、报告类型的版本重复';
    if (reviewTemplateEnabled(row) && rows.some(other => other.id !== row.id && sameScope(other, row) && reviewTemplateEnabled(other))) return '同部门、身份、报告类型只能启用一个模板';
  }
}
export function matchReviewTemplate(settings: OkrSettings | undefined, department: string, audience: 'employee' | 'supervisor', type: 'week' | 'month', startDate: string) {
  return settings?.reviewReportTemplates?.filter(row => reviewTemplateEnabled(row) && (row.department === department || row.department === '*') && row.audience === audience && row.reportType === type && row.effectiveFrom <= startDate).sort((a, b) => Number(b.department === department) - Number(a.department === department) || b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
export function reviewTemplateErrors(template: ReviewReportTemplate | null | undefined, values: ReviewTemplateValues = {}, required = true): string[] {
  const errors: string[] = [];
  for (const field of template?.blocks.flatMap(block => block.fields) || []) {
    const value = values[field.id];
    const empty = value == null || typeof value === 'string' && !value.trim() || Array.isArray(value) && !value.length;
    if (empty) { if (required && field.required) errors.push(`请填写${field.label}`); continue; }
    let valid = true;
    switch (field.type) {
      case 'number': case 'percentage': valid = typeof value === 'number' && Number.isFinite(value) && (field.type !== 'percentage' || value >= 0 && value <= 100); break;
      case 'boolean': valid = typeof value === 'boolean'; break;
      case 'select': valid = typeof value === 'string' && !!field.options?.includes(value); break;
      case 'multiselect': valid = Array.isArray(value) && value.every(item => typeof item === 'string' && field.options?.includes(item)); break;
      case 'table': valid = Array.isArray(value) && value.length <= 100 && value.every(row => row && typeof row === 'object' && field.columns?.every(column => typeof row[column] === 'string') && (!required || !field.required || field.columns.every(column => row[column].trim()))); break;
      case 'date': valid = typeof value === 'string' && validDate(value); break;
      case 'link': try { valid = ['https:', 'http:'].includes(new URL(String(value)).protocol); } catch { valid = false; } break;
      default: valid = typeof value === 'string' && value.length <= (field.maxLength || 10000);
    }
    if (!valid) errors.push(`${field.label}格式无效`);
  }
  return errors;
}
/** Binding is enforced at the persistence boundary; existing reports keep their original snapshot. */
export function bindReviewTemplate(payload: OkrPayload, settings: OkrSettings, owner: OkrPerson, people: OkrPerson[], submit: boolean, previous?: OkrPayload): OkrPayload {
  const audience = reviewTemplateFor(owner, people) === 'supervisor' ? 'supervisor' : 'employee';
  const template = previous ? previous.reviewTemplateSnapshot || null : matchReviewTemplate(settings, owner.department, audience, payload.reviewType || 'week', payload.startDate || '') || null;
  if (!previous && JSON.stringify(payload.reviewTemplateSnapshot || null) !== JSON.stringify(template)) throw new Error('适用模板已变化，请重新打开填写页面');
  const values = template ? Object.fromEntries(template.blocks.flatMap(block => block.fields).map(field => [field.id, payload.reviewTemplateValues?.[field.id]]).filter(([, value]) => value !== undefined)) : {};
  const errors = reviewTemplateErrors(template, values, submit);
  if (errors.length) throw new Error(errors.join('；'));
  return { ...payload, reviewTemplateSnapshot: template ? structuredClone(template) : null, reviewTemplateValues: values };
}

export function moveReviewBlock(blocks: ReviewTemplateBlock[], sourceId: string, targetId: string, after = false): ReviewTemplateBlock[] {
  if (sourceId === 'goals' || targetId === 'goals' || sourceId === targetId) return blocks;
  const source = blocks.find(block => block.id === sourceId);
  if (!source || !blocks.some(block => block.id === targetId)) return blocks;
  const next = blocks.filter(block => block.id !== sourceId);
  next.splice(next.findIndex(block => block.id === targetId) + Number(after), 0, source);
  return next;
}
