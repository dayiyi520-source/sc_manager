// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
describe('custom category field persistence', () => {
  it('initializes common scenes and preserves independent edits across reads', async () => {
    await mockApiRequest('/api/work-item-categories', { method: 'POST', body: JSON.stringify({ code: 'custom_ops', name: '运维', displayName: '运维任务', iconKey: 'dev', capabilityType: 'STANDARD', sort: 1, enabled: true }) });
    const result = await mockApiRequest('/api/work-item-field-configurations?categoryCode=custom_ops');
    expect(result.scenes.map((scene: any) => scene.scene)).toEqual(expect.arrayContaining(['CREATE', 'CREATE_CHILD', 'LIST', 'ITERATION', 'DETAIL']));
    const fields = result.scenes.find((scene: any) => scene.scene === 'CREATE').fields;
    expect(fields.some((field: any) => field.fieldCode === 'title')).toBe(true);
    await mockApiRequest('/api/work-item-field-configurations/custom_ops/CREATE', { method: 'PUT', body: JSON.stringify({ fields: fields.map((field: any) => field.fieldCode === 'description' ? { ...field, defaultValue: '独立默认值' } : field) }) });
    const refreshed = await mockApiRequest('/api/work-item-field-configurations?categoryCode=custom_ops');
    expect(refreshed.scenes.find((scene: any) => scene.scene === 'CREATE').fields.find((field: any) => field.fieldCode === 'description').defaultValue).toBe('独立默认值');
    const original = await mockApiRequest('/api/work-item-field-configurations?categoryCode=requirement');
    expect(original.scenes.find((scene: any) => scene.scene === 'CREATE').fields.find((field: any) => field.fieldCode === 'description').defaultValue).not.toBe('独立默认值');
  });
});
