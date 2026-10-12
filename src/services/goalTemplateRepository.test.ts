// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { goalTemplatePayload, goalTemplateRepository, validateGoalTemplate, type GoalTemplateDraft } from './goalTemplateRepository';
import { GOAL_TEMPLATE_STORAGE_KEY } from './mockGoalTemplates';
const draft = (): GoalTemplateDraft => ({ categoryId: 'uncategorized', description: '交付团队使用', title: '提升交付质量', keyResults: [{ id: 'kr-1', title: '验收所有交付项目', confidence: 5, weight: 100, currentValue: 0, targetValue: 100 }] });
beforeEach(() => localStorage.removeItem(GOAL_TEMPLATE_STORAGE_KEY));
describe('目标模板持久化与契约', () => {
  it('persists category, template, use count, edits and deletes without altering imported content', async () => {
    const category = await goalTemplateRepository.addCategory('  交付岗位  ');
    const saved = await goalTemplateRepository.save({ ...draft(), categoryId: category.id }, 'owner');
    const used = await goalTemplateRepository.use(saved);
    const payload = goalTemplatePayload(used);
    expect(payload.keyResults?.[0]).toMatchObject({ title: draft().keyResults[0].title, progress: 0, confidence: 5, currentValue: 0, targetValue: 100 });
    expect(payload.keyResults?.[0].id).not.toBe(saved.keyResults[0].id);
    expect((await goalTemplateRepository.catalog()).templates[0].usageCount).toBe(1);
    const edited = await goalTemplateRepository.save({ ...draft(), categoryId: category.id, title: '新目标名称' }, 'owner', saved);
    expect(edited).toMatchObject({ version: 2, usageCount: 1 });
    await goalTemplateRepository.remove(edited, 'owner');
    expect((await goalTemplateRepository.catalog()).templates).toHaveLength(0);
    expect(payload.title).toBe('提升交付质量');
    expect((await goalTemplateRepository.catalog()).categories).toContainEqual(category);
  });
  it('rejects duplicate or blank categories', async () => {
    await goalTemplateRepository.addCategory('Engineer');
    await expect(goalTemplateRepository.addCategory(' engineer ')).rejects.toThrow('已存在');
    await expect(goalTemplateRepository.addCategory('  ')).rejects.toThrow('1–40');
  });
  it('rejects stale versions, unauthorized writes and removed templates', async () => {
    const saved = await goalTemplateRepository.save(draft(), 'owner');
    await expect(goalTemplateRepository.remove(saved, 'another-user')).rejects.toThrow('无权');
    const edited = await goalTemplateRepository.save({ ...draft(), title: '新版' }, 'owner', saved);
    await expect(goalTemplateRepository.save(draft(), 'owner', saved)).rejects.toThrow('已被更新');
    await expect(goalTemplateRepository.use(saved)).rejects.toThrow('已被更新');
    await goalTemplateRepository.remove(edited, 'owner');
    await expect(goalTemplateRepository.use(edited)).rejects.toThrow('已删除');
  });
  it('enforces required titles, weight totals, confidence, quantity and category existence', async () => {
    expect(validateGoalTemplate({ ...draft(), title: ' ' })).toContain('目标名称');
    expect(validateGoalTemplate({ ...draft(), keyResults: [{ ...draft().keyResults[0], weight: 20 }] })).toContain('100%');
    expect(validateGoalTemplate({ ...draft(), keyResults: [{ ...draft().keyResults[0], confidence: 11 }] })).toContain('信心');
    expect(validateGoalTemplate({ ...draft(), keyResults: [{ ...draft().keyResults[0], currentValue: 110 }] })).toContain('量化');
    await expect(goalTemplateRepository.save({ ...draft(), categoryId: 'missing' }, 'owner')).rejects.toThrow('分类已不存在');
    expect((await goalTemplateRepository.catalog()).templates).toHaveLength(0);
  });
  it('does not report success or overwrite data if persistence fails', async () => {
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('存储空间不足'); });
    await expect(goalTemplateRepository.save(draft(), 'owner')).rejects.toThrow('存储空间不足');
    write.mockRestore();
    expect((await goalTemplateRepository.catalog()).templates).toHaveLength(0);
  });
});
