// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mockApiRequest } from './mockApi';
import { activateReviewTemplate, newReviewTemplate } from './reviewTemplateConfiguration';
import type { OkrPayload, OkrPerson, OkrRecord, OkrSettings } from './okrRepository';
import { saveOkrState, type OkrFileState } from '../../scripts/mock-okr-state-plugin';
import { currentReviewPeriod } from './okrReviewRules';
import dayjs from 'dayjs';
vi.mock('../data/mockSnapshot', async importOriginal => {
  const original = await importOriginal<typeof import('../data/mockSnapshot')>();
  return { ...original, MOCK_OKR_PEOPLE: [...original.MOCK_OKR_PEOPLE,
    { id: 'm', name: '主管', department: '研发', supervisorId: '', goalRole: 'supervisor', rootFlag: 0, version: 0 },
    { id: 'e', name: '员工', department: '研发', supervisorId: 'm', goalRole: 'employee', rootFlag: 0, version: 0 },
  ] };
});
const settingsKey = 'shichuang.frontend.mock.okrSettings';
const recordKey = 'shichuang.frontend.mock.okrRecords';
const settings: OkrSettings = { version: 0, administratorIds: ['user-admin'], supervisorIds: [], defaultView: 'list', templates: [], timeRules: [], validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true }, dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] } };
const template = { ...newReviewTemplate(), id: 'department-week-v1', name: '部门周报', status: 'published' as const, effectiveFrom: '2099-01-01' };
template.blocks[0].fields = [{ id: 'risk', label: '交付风险', type: 'textarea', required: true }];
const saveSettings = (value: OkrSettings, viewerId = 'user-admin') => mockApiRequest('/api/okr/settings', { method: 'PUT', body: JSON.stringify({ ...value, viewerId }) });
beforeEach(() => { localStorage.clear(); localStorage.setItem(settingsKey, JSON.stringify(settings)); localStorage.setItem(recordKey, '[]'); });
afterEach(() => vi.useRealTimers());
it('persists legacy version normalization without changing explicit enable choices', async () => {
  localStorage.setItem(settingsKey, JSON.stringify({ ...settings, reviewReportTemplates: [template, { ...template, id: 'v2', version: 2 }] }));
  const current = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(current.reviewReportTemplates?.[0].enabled).toBe(false);
  expect(current.reviewReportTemplates?.[1].enabled).toBeUndefined();
  await saveSettings({ ...current, reviewReportTemplates: activateReviewTemplate(current.reviewReportTemplates!, template) });
  const saved = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(saved.reviewReportTemplates?.find(row => row.id === template.id)?.enabled).toBe(true);
  expect(saved.reviewReportTemplates?.find(row => row.id === 'v2')?.enabled).toBe(false);
});
it('checks permission, persists published configuration and rejects stale or immutable writes', async () => {
  await expect(saveSettings({ ...settings, reviewReportTemplates: [template] }, 'unknown')).rejects.toThrow('管理员');
  await saveSettings({ ...settings, reviewReportTemplates: [template] });
  const saved = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(saved.reviewReportTemplates).toEqual([template]);
  await expect(saveSettings({ ...settings, reviewReportTemplates: [] })).rejects.toThrow('配置已更新');
  await expect(saveSettings({ ...saved, reviewReportTemplates: [] })).rejects.toThrow('已发布');
  await expect(saveSettings({ ...saved, reviewReportTemplates: [{ ...template, name: '覆盖' }] })).rejects.toThrow('已发布');
  expect((await mockApiRequest('/api/okr/settings') as OkrSettings).reviewReportTemplates).toEqual([template]);
});
it('saves and reloads answers, blocks invalid/unauthorized submissions and preserves snapshots after new publication', async () => {
  await saveSettings({ ...settings, reviewReportTemplates: [template] });
  const people = await mockApiRequest('/api/okr/people') as OkrPerson[];
  const employee = people.find(person => !person.rootFlag)!;
  vi.useFakeTimers(); vi.setSystemTime(new Date('2099-01-15T12:00:00'));
  const period = currentReviewPeriod('week', dayjs());
  const payload: OkrPayload = { title: '周报', reviewType: 'week', ...period, reviewTemplateSnapshot: template, reviewTemplateValues: {} };
  const created = await mockApiRequest('/api/okr/records', { method: 'POST', body: JSON.stringify({ viewerId: employee.id, kind: 'review', periodKey: `${period.startDate}/${period.endDate}`, payload, submit: false }) });
  const patch = (payload: OkrPayload, viewerId = employee.id, version = 0, action = 'submit') => mockApiRequest(`/api/okr/records/${created.id}`, { method: 'PATCH', body: JSON.stringify({ payload, viewerId, version, action }) });
  await expect(patch(payload, 'user-admin')).rejects.toThrow('本人');
  await expect(patch(payload)).rejects.toThrow('交付风险');
  const current = await mockApiRequest('/api/okr/settings') as OkrSettings;
  await saveSettings({ ...current, reviewReportTemplates: activateReviewTemplate([template], { ...template, id: 'v2', version: 2, effectiveFrom: '2099-02-01', name: '下一版本' }) });
  const replaced = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(replaced.reviewReportTemplates?.find(row => row.id === template.id)?.enabled).toBe(false);
  await saveSettings({ ...replaced, reviewReportTemplates: replaced.reviewReportTemplates?.filter(row => row.id !== template.id) });
  expect((await mockApiRequest('/api/okr/settings') as OkrSettings).reviewReportTemplates?.some(row => row.id === template.id)).toBe(false);
  const answer = { ...payload, reviewTemplateSnapshot: null, reviewTemplateValues: { risk: '已安排资源' } };
  await patch(answer);
  const reloaded = (await mockApiRequest(`/api/okr/records?viewerId=${employee.id}`) as OkrRecord[]).find(record => record.id === created.id)!;
  expect(reloaded.status).toBe('submitted');
  expect(reloaded.payload.reviewTemplateSnapshot).toEqual(template);
  expect(reloaded.payload.reviewTemplateValues).toEqual({ risk: '已安排资源' });
  await expect(patch(answer)).rejects.toThrow('已提交');
});
it('persists disable, re-enable and deletion through settings requests', async () => {
  await saveSettings({ ...settings, reviewReportTemplates: [template] });
  let current = await mockApiRequest('/api/okr/settings') as OkrSettings;
  await expect(saveSettings({ ...current, reviewReportTemplates: [] })).rejects.toThrow('先停用');
  await saveSettings({ ...current, reviewReportTemplates: [{ ...template, enabled: false }] });
  current = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(current.reviewReportTemplates?.[0].enabled).toBe(false);
  await saveSettings({ ...current, reviewReportTemplates: activateReviewTemplate(current.reviewReportTemplates!, template) });
  current = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(current.reviewReportTemplates?.[0].enabled).toBe(true);
  await saveSettings({ ...current, reviewReportTemplates: [{ ...template, enabled: false }] });
  current = await mockApiRequest('/api/okr/settings') as OkrSettings;
  await saveSettings({ ...current, reviewReportTemplates: [] });
  expect((await mockApiRequest('/api/okr/settings') as OkrSettings).reviewReportTemplates).toEqual([]);
});

it('round-trips configurable employee linkage and judgment, preserves report snapshots after disabling templates', async () => {
  const people: OkrPerson[] = [
    { id: 'm', name: '主管', department: '研发', supervisorId: '', goalRole: 'supervisor', rootFlag: 0, version: 0 },
    { id: 'e', name: '员工', department: '研发', supervisorId: 'm', goalRole: 'employee', rootFlag: 0, version: 0 },
  ];
  localStorage.setItem('shichuang.frontend.mock.okrPeople', JSON.stringify(people));
  const employeeTemplate = { ...newReviewTemplate(), id: 'employee-link', name: '员工联动周报', department: '研发', status: 'published' as const, effectiveFrom: '2099-01-01' };
  employeeTemplate.blocks.push({ id: 'ideas', title: '流程建议', guidance: '', fields: [{ id: 'idea-text', label: '建议内容', type: 'textarea', required: false }], departmentLink: { reportType: 'week' } });
  const managerTemplate = { ...newReviewTemplate(), id: 'manager-link', name: '部门联动周报', department: '研发', audience: 'supervisor' as const, status: 'published' as const, effectiveFrom: '2099-01-01' };
  managerTemplate.blocks.push({ id: 'summary', title: '员工建议', guidance: '', fields: [], aggregation: { sourceBlockId: 'ideas', sourceReportType: 'week', needsJudgment: true, judgmentLabel: '后续动作', judgmentOptions: ['安排试点', '继续观察'] } });
  await saveSettings({ ...settings, supervisorIds: ['m'], reviewReportTemplates: [employeeTemplate, managerTemplate] });
  vi.useFakeTimers(); vi.setSystemTime(new Date('2099-01-15T12:00:00'));
  const period = currentReviewPeriod('week', dayjs());
  const employeePayload: OkrPayload = { title: '员工周报', reviewType: 'week', ...period, reviewTemplateSnapshot: employeeTemplate, reviewTemplateValues: { 'idea-text': '先做小范围试点' } };
  const employee = await mockApiRequest('/api/okr/records', { method: 'POST', body: JSON.stringify({ viewerId: 'e', kind: 'review', periodKey: period.startDate, payload: employeePayload }) });
  await mockApiRequest(`/api/okr/records/${employee.id}/viewed`, { method: 'POST', body: JSON.stringify({ viewerId: 'm' }) });
  const managerPayload: OkrPayload = { title: '部门周报', reviewType: 'week', reviewMode: 'supervisor', ...period, reviewTemplateSnapshot: managerTemplate };
  const manager = await mockApiRequest('/api/okr/records', { method: 'POST', body: JSON.stringify({ viewerId: 'm', kind: 'review', periodKey: period.startDate, payload: managerPayload, submit: false }) });
  let reloaded = (await mockApiRequest('/api/okr/records?viewerId=m') as OkrRecord[]).find(row => row.id === manager.id)!;
  expect(reloaded.payload.reviewTemplateAggregations?.summary).toEqual([{ employeeId: 'e', employeeName: '员工', reviewId: employee.id, content: '先做小范围试点' }]);
  const patch = (payload: OkrPayload, viewerId = 'm') => mockApiRequest(`/api/okr/records/${manager.id}`, { method: 'PATCH', body: JSON.stringify({ payload, viewerId, version: 0, action: 'submit' }) });
  await expect(patch(reloaded.payload, 'e')).rejects.toThrow('本人');
  await expect(patch(reloaded.payload)).rejects.toThrow('后续动作');
  const current = await mockApiRequest('/api/okr/settings') as OkrSettings;
  await saveSettings({ ...current, reviewReportTemplates: current.reviewReportTemplates!.map(row => ({ ...row, enabled: false })) });
  reloaded.payload.reviewTemplateAggregations!.summary[0].judgment = '安排试点';
  await patch(reloaded.payload);
  reloaded = (await mockApiRequest('/api/okr/records?viewerId=m') as OkrRecord[]).find(row => row.id === manager.id)!;
  expect(reloaded.status).toBe('submitted');
  expect(reloaded.payload.reviewTemplateSnapshot).toEqual(managerTemplate);
  expect(reloaded.payload.reviewTemplateAggregations?.summary[0]).toMatchObject({ content: '先做小范围试点', judgment: '安排试点' });
  expect(reloaded.payload.reviewTemplateSnapshot?.blocks.at(-1)?.aggregation?.judgmentOptions).toEqual(['安排试点', '继续观察']);
});
it('round-trips template configuration and report snapshots through an isolated state file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'review-template-'));
  const file = join(dir, 'state.json');
  const record: OkrRecord = { id: 'review', kind: 'review', ownerId: 'e', periodKey: '2099-01', status: 'draft', version: 0, payload: { title: '周报', reviewTemplateSnapshot: template, reviewTemplateValues: { risk: '交付风险' } } };
  const state: OkrFileState = { revision: 0, okrPeople: [], okrRecords: [], okrSettings: settings };
  try {
    writeFileSync(file, JSON.stringify(state));
    saveOkrState(file, { ...state, okrSettings: { ...settings, reviewReportTemplates: [template] }, okrRecords: [record] }, 0);
    const reloaded = JSON.parse(readFileSync(file, 'utf8')) as OkrFileState;
    expect(reloaded.okrSettings.reviewReportTemplates).toEqual([template]);
    expect(reloaded.okrRecords[0]).toEqual(record);
    expect(() => saveOkrState(file, state, 0)).toThrow('其他页面');
    expect(JSON.parse(readFileSync(file, 'utf8')).okrRecords[0]).toEqual(record);
  } finally { rmSync(dir, { recursive: true }); }
});
