// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

const readCreate = async () => {
  const result = await mockApiRequest('/api/work-item-field-configurations?categoryCode=bug');
  return result.scenes.find((scene: any) => scene.scene === 'CREATE').fields as Array<Record<string, any>>;
};
const commonCodes = ['title', 'expectedGoal', 'description', 'productLine', 'taskType', 'assignee', 'priority', 'plannedStartDate', 'plannedEndDate', 'version', 'project', 'cc', 'estimatedHours', 'actualHours', 'attachments', 'collaborationItems', 'relatedTasks'];

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
describe('defect create field controls', () => {
  it('migrates legacy relations independently and avoids duplicate project controls', async () => {
    localStorage.setItem('shichuang.frontend.mock.researchFields', JSON.stringify([
      { categoryCode: 'bug', scene: 'CREATE', fieldCode: 'relations', visible: false, required: false, editable: false, sort: 20 },
      { categoryCode: 'bug', scene: 'CREATE', fieldCode: 'relatedTasks', visible: true, required: true, sort: 21 },
      { categoryCode: 'bug', scene: 'CREATE', fieldCode: 'project', visible: false, sort: 8 },
      { categoryCode: 'bug', scene: 'CREATE', fieldCode: 'customer', visible: true, sort: 9 }
    ]));
    const fields = await readCreate();
    expect(fields.filter((field) => field.fieldCode === 'project')).toHaveLength(1);
    expect(fields.find((field) => field.fieldCode === 'project')?.visible).toBe(false);
    expect(fields.find((field) => field.fieldCode === 'collaborationItems')).toMatchObject({ visible: false, editable: false });
    expect(fields.find((field) => field.fieldCode === 'relatedTasks')).toMatchObject({ visible: true, required: true });
  });
  it('provides both content and basic controls from the snapshot', async () => {
    const fields = await readCreate();
    expect(fields.map((field) => field.fieldCode)).toEqual(expect.arrayContaining(commonCodes));
    expect(new Set(fields.map((field) => field.fieldCode)).size).toBe(fields.length);
  });

  it('repairs sparse historical scenes without resetting overrides or inheriting another category', async () => {
    localStorage.setItem('shichuang.frontend.mock.researchFields', JSON.stringify([
      { categoryCode: 'bug', scene: 'CREATE', fieldCode: 'severity', visible: true, required: true, sort: 7, defaultValue: '高' },
      { categoryCode: 'bug', scene: 'CREATE', fieldCode: 'description', visible: false, required: false, sort: 2, defaultValue: '原描述' },
      { categoryCode: 'requirement', scene: 'CREATE', fieldCode: 'priority', visible: false, required: false, sort: 1, defaultValue: '紧急' },
    ]));
    const fields = await readCreate();
    expect(fields.map((field) => field.fieldCode)).toEqual(expect.arrayContaining(commonCodes));
    expect(fields.find((field) => field.fieldCode === 'severity')).toMatchObject({ required: true, sort: 7, defaultValue: '高' });
    expect(fields.find((field) => field.fieldCode === 'description')).toMatchObject({ visible: false, sort: 2, defaultValue: '原描述' });
    expect(fields.find((field) => field.fieldCode === 'priority')).toMatchObject({ visible: true, defaultValue: '中' });
    const saved = fields.map((field) => field.fieldCode === 'project' ? { ...field, visible: false, required: false } : field.fieldCode === 'expectedGoal' ? { ...field, required: true } : field);
    await mockApiRequest('/api/work-item-field-configurations/bug/CREATE', { method: 'PUT', body: JSON.stringify({ fields: saved }) });
    const refreshed = await readCreate();
    expect(refreshed.find((field) => field.fieldCode === 'project')?.visible).toBe(false);
    expect(refreshed.find((field) => field.fieldCode === 'expectedGoal')?.required).toBe(true);
    expect(refreshed.map((field) => field.fieldCode)).toEqual(saved.map((field) => field.fieldCode));
    expect(await readCreate()).toEqual(refreshed);
  });
});
