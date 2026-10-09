/** @vitest-environment jsdom */

import { describe, expect, it, beforeEach } from 'vitest';
import { mockApiRequest } from './mockApi';

const fieldsFor = async (categoryCode: string, scene: 'CREATE' | 'DETAIL') => {
  const result = await mockApiRequest(`/api/work-item-field-configurations?categoryCode=${categoryCode}`) as { scenes: Array<{ scene: string; fields: Array<{ fieldCode: string; visible: boolean }> }> };
  return result.scenes.find((item) => item.scene === scene)?.fields || [];
};

describe('工作项字段默认显隐', () => {
  beforeEach(() => localStorage.clear());

  it('新建任务默认隐藏指定字段', async () => {
    const fields = await fieldsFor('requirement', 'CREATE');
    const hidden = new Set(['expectedGoal', 'hours', 'collaborationItems', 'children', 'cc']);
    hidden.forEach((fieldCode) => expect(fields.find((field) => field.fieldCode === fieldCode)?.visible).toBe(false));
  });

  it('任务详情默认隐藏支撑项、参与人和任务类型', async () => {
    const fields = await fieldsFor('requirement', 'DETAIL');
    ['support', 'participants', 'taskType'].forEach((fieldCode) => expect(fields.find((field) => field.fieldCode === fieldCode)?.visible).toBe(false));
  });

  it('管理员保存的字段显隐优先于默认值', async () => {
    const fields = await fieldsFor('requirement', 'CREATE');
    const expectedGoal = fields.find((field) => field.fieldCode === 'expectedGoal');
    await mockApiRequest('/api/work-item-field-configurations/requirement/CREATE', { method: 'PUT', body: JSON.stringify({ fields: fields.map((field) => field.fieldCode === 'expectedGoal' ? { ...field, visible: true } : field) }) });
    const updated = await fieldsFor('requirement', 'CREATE');
    expect(expectedGoal?.visible).toBe(false);
    expect(updated.find((field) => field.fieldCode === 'expectedGoal')?.visible).toBe(true);
  });
});
