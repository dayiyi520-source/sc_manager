import { apiRequest } from './apiClient';
import type { OkrPayload } from './okrRepository';

export interface GoalTemplateCategory { id: string; name: string }
export interface GoalTemplateKr { id: string; title: string; confidence: number; weight: number; currentValue: number; targetValue: number }
export interface GoalTemplate {
  id: string; categoryId: string; description: string; title: string;
  keyResults: GoalTemplateKr[]; source: 'enterprise' | 'recommended';
  creatorId: string; usageCount: number; version: number;
}
export type GoalTemplateDraft = Pick<GoalTemplate, 'categoryId' | 'description' | 'title' | 'keyResults'>;
export interface GoalTemplateCatalog { categories: GoalTemplateCategory[]; templates: GoalTemplate[] }
export const validateGoalTemplate = (draft: GoalTemplateDraft): string | undefined => {
  if (!draft.categoryId) return '请选择岗位/分类';
  if (!draft.title.trim() || draft.title.trim().length > 200) return '目标名称须为 1–200 个字符';
  if (draft.description.length > 500) return '使用说明不能超过 500 个字符';
  if (!draft.keyResults.length || draft.keyResults.length > 20) return '请填写 1–20 条关键结果';
  if (draft.keyResults.some(kr => !kr.title.trim() || kr.title.trim().length > 300)) return '每条关键结果名称须为 1–300 个字符';
  if (draft.keyResults.some(kr => !Number.isInteger(kr.weight) || kr.weight < 1 || kr.weight > 100) || draft.keyResults.reduce((sum, kr) => sum + kr.weight, 0) !== 100) return '关键结果权重须为 1–100 的整数，合计为 100%';
  if (draft.keyResults.some(kr => !Number.isInteger(kr.confidence) || kr.confidence < 1 || kr.confidence > 10)) return '信心须为 1–10 的整数';
  if (draft.keyResults.some(kr => !Number.isFinite(kr.currentValue) || !Number.isFinite(kr.targetValue) || kr.currentValue < 0 || kr.targetValue <= 0 || kr.currentValue > kr.targetValue)) return '量化结果须满足 0 ≤ 当前值 ≤ 目标值，目标值大于 0';
};
export const goalTemplatePayload = (template: GoalTemplate): OkrPayload => ({
  title: template.title, note: template.description, objectiveType: 'challenge', weight: 100,
  keyResults: template.keyResults.map(kr => ({ ...kr, id: crypto.randomUUID(), progress: 0 })),
});
const base = '/api/okr/goal-templates';
export const goalTemplateRepository = {
  catalog: () => apiRequest<GoalTemplateCatalog>(base),
  save: (draft: GoalTemplateDraft, viewerId: string, existing?: GoalTemplate) => apiRequest<GoalTemplate>(existing ? `${base}/${existing.id}` : base, {
    method: existing ? 'PUT' : 'POST', body: JSON.stringify({ ...draft, viewerId, version: existing?.version }),
  }),
  remove: (template: GoalTemplate, viewerId: string) => apiRequest<void>(`${base}/${template.id}`, { method: 'DELETE', body: JSON.stringify({ viewerId, version: template.version }) }),
  use: (template: GoalTemplate) => apiRequest<GoalTemplate>(`${base}/${template.id}/use`, { method: 'POST', body: JSON.stringify({ version: template.version }) }),
  addCategory: (name: string) => apiRequest<GoalTemplateCategory>(`${base}/categories`, { method: 'POST', body: JSON.stringify({ name }) }),
};
