// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import { MOCK_USERS } from '../data/mockSnapshot';
import type { OkrPerson, OkrSettings } from './okrRepository';
const settingsKey = 'shichuang.frontend.mock.okrSettings';
const admin = MOCK_USERS.find(user => user.id === 'user-admin')!;
const settings = { version: 1, administratorIds: [admin.id], supervisorIds: [], weeklyReviewCycles: [], defaultView: 'list', templates: [], timeRules: [], validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true }, dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] } } as OkrSettings;
const save = (value: OkrSettings, viewerId = admin.id) => mockApiRequest('/api/okr/settings', { method: 'PUT', body: JSON.stringify({ ...value, viewerId }) });
beforeEach(() => { localStorage.clear(); localStorage.setItem(settingsKey, JSON.stringify(settings)); });
it('checks administrator permission, last administrator, and settings version before saving', async () => {
  await expect(save(settings, 'not-admin')).rejects.toThrow('管理员');
  await expect(save({ ...settings, administratorIds: [] })).rejects.toThrow('管理员');
  await expect(save({ ...settings, version: 0 })).rejects.toThrow('配置已更新');
  expect(JSON.parse(localStorage.getItem(settingsKey)!)).toEqual(settings);
});
it('persists supervisor roles in the organization directory response', async () => {
  const people = await mockApiRequest('/api/okr/people') as OkrPerson[];
  const supervisor = people.find(person => !person.rootFlag)!;
  await save({ ...settings, supervisorIds: [supervisor.id] });
  const updated = await mockApiRequest('/api/okr/people') as OkrPerson[];
  expect(updated.find(person => person.id === supervisor.id)?.goalRole).toBe('supervisor');
  expect(updated.find(person => person.id === admin.id)?.rootFlag).toBe(1);
});
it('rejects modification and deletion of a finished weekly cycle at the save boundary', async () => {
  const cycle = { id: 'old', month: '2020-01', startDate: '2020-01-01', endDate: '2020-01-07', notifyAt: '2020-01-07T09:00', deadline: '2020-01-07T18:00', template: 'byRole' as const, allowBackfill: true };
  localStorage.setItem(settingsKey, JSON.stringify({ ...settings, weeklyReviewCycles: [cycle] }));
  await expect(save(settings)).rejects.toThrow('不能修改或删除');
  await expect(save({ ...settings, weeklyReviewCycles: [{ ...cycle, allowBackfill: false }] })).rejects.toThrow('不能修改或删除');
});

it('persists a cycle title and reloads it while rejecting stale configuration writes', async () => {
  const cycle = { id: 'new', title: '十一月第一期', month: '2099-11', startDate: '2099-11-01', endDate: '2099-11-07', notifyAt: '2099-11-05T09:00', deadline: '2099-11-07T18:00', template: 'byRole' as const, allowBackfill: true };
  await save({ ...settings, weeklyReviewCycles: [cycle] });
  const reloaded = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(reloaded.weeklyReviewCycles).toEqual([cycle]);
  await expect(save({ ...settings, weeklyReviewCycles: [] })).rejects.toThrow('配置已更新');
  expect((await mockApiRequest('/api/okr/settings') as OkrSettings).weeklyReviewCycles).toEqual([cycle]);
});
