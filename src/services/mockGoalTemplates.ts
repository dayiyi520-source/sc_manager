import { validateGoalTemplate, type GoalTemplate, type GoalTemplateCatalog, type GoalTemplateDraft } from './goalTemplateRepository';

export const GOAL_TEMPLATE_STORAGE_KEY = 'shichuang.frontend.mock.goalTemplates';
const initialCatalog = (): GoalTemplateCatalog => ({ categories: [{ id: 'uncategorized', name: '未分类' }, { id: 'company', name: '公司层面' }], templates: [] });
const readCatalog = (): GoalTemplateCatalog => {
  const raw = localStorage.getItem(GOAL_TEMPLATE_STORAGE_KEY);
  if (!raw) return initialCatalog();
  const value = JSON.parse(raw) as GoalTemplateCatalog;
  if (!Array.isArray(value.categories) || !Array.isArray(value.templates)) throw new Error('模板数据读取失败，请联系管理员');
  return value;
};
const writeCatalog = (catalog: GoalTemplateCatalog) => localStorage.setItem(GOAL_TEMPLATE_STORAGE_KEY, JSON.stringify(catalog));

export function handleMockGoalTemplates(path: string, method: string, body: Record<string, unknown>, adminId?: string): unknown {
  const catalog = readCatalog();
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 3 && method === 'GET') return catalog;
  if (parts[3] === 'categories' && method === 'POST') {
    const name = String(body.name || '').trim();
    if (!name || name.length > 40) throw new Error('分类名称须为 1–40 个字符');
    if (catalog.categories.some(category => category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('岗位/分类已存在');
    const category = { id: crypto.randomUUID(), name };
    writeCatalog({ ...catalog, categories: [...catalog.categories, category] });
    return category;
  }
  const existing = catalog.templates.find(template => template.id === parts[3]);
  if (parts.length > 3 && !existing) throw new Error('模板已删除或不存在，请刷新后重试');
  if (existing && existing.version !== body.version) throw new Error('模板已被更新，请刷新后重试');
  if (existing && parts[4] === 'use' && method === 'POST') {
    const updated = { ...existing, usageCount: existing.usageCount + 1 };
    writeCatalog({ ...catalog, templates: catalog.templates.map(template => template.id === updated.id ? updated : template) });
    return updated;
  }
  if (!body.viewerId) throw new Error('请登录后操作');
  if (existing && (existing.source !== 'enterprise' || (existing.creatorId !== body.viewerId && body.viewerId !== adminId))) throw new Error('无权修改此模板');
  if (method === 'DELETE' && existing) {
    writeCatalog({ ...catalog, templates: catalog.templates.filter(template => template.id !== existing.id) });
    return null;
  }
  if ((method === 'POST' && parts.length === 3) || (method === 'PUT' && existing)) {
    const draft = body as unknown as GoalTemplateDraft;
    if (!Array.isArray(draft.keyResults)) throw new Error('请填写关键结果');
    const error = validateGoalTemplate(draft);
    if (error) throw new Error(error);
    if (!catalog.categories.some(category => category.id === draft.categoryId)) throw new Error('岗位/分类已不存在，请重新选择');
    const updated: GoalTemplate = {
      id: existing?.id || crypto.randomUUID(), categoryId: draft.categoryId,
      title: draft.title.trim(), description: draft.description.trim(),
      keyResults: draft.keyResults.map(kr => ({ ...kr, title: kr.title.trim() })),
      source: 'enterprise', creatorId: existing?.creatorId || String(body.viewerId),
      usageCount: existing?.usageCount || 0, version: (existing?.version || 0) + 1,
    };
    writeCatalog({ ...catalog, templates: existing ? catalog.templates.map(template => template.id === updated.id ? updated : template) : [...catalog.templates, updated] });
    return updated;
  }
  throw new Error('不支持的模板操作');
}
