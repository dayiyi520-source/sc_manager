// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import { backfillReviews, reviewSubmissionAccess } from './okrReviewRules';
import dayjs from 'dayjs';
import { MOCK_USERS } from '../data/mockSnapshot';
import type { OkrPerson, OkrRecord, OkrSettings } from './okrRepository';
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
it('allows modification but rejects deletion of a finished weekly cycle at the save boundary', async () => {
  const cycle = { id: 'old', month: '2020-01', startDate: '2020-01-01', endDate: '2020-01-07', notifyAt: '2020-01-07T09:00', deadline: '2020-01-07T18:00', template: 'byRole' as const, allowBackfill: true };
  localStorage.setItem(settingsKey, JSON.stringify({ ...settings, weeklyReviewCycles: [cycle] }));
  await expect(save(settings)).rejects.toThrow('不能删除');
  await save({ ...settings, weeklyReviewCycles: [{ ...cycle, allowBackfill: false }] });
  expect((await mockApiRequest('/api/okr/settings') as OkrSettings).weeklyReviewCycles).toEqual([{ ...cycle, allowBackfill: false }]);
});

it('persists a cycle title and reloads it while rejecting stale configuration writes', async () => {
  const cycle = { id: 'new', title: '十一月第一期', month: '2099-11', startDate: '2099-11-01', endDate: '2099-11-07', notifyAt: '2099-11-05T09:00', deadline: '2099-11-07T18:00', template: 'byRole' as const, allowBackfill: true };
  await save({ ...settings, weeklyReviewCycles: [cycle] });
  const reloaded = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(reloaded.weeklyReviewCycles).toEqual([cycle]);
  await expect(save({ ...settings, weeklyReviewCycles: [] })).rejects.toThrow('配置已更新');
  expect((await mockApiRequest('/api/okr/settings') as OkrSettings).weeklyReviewCycles).toEqual([cycle]);
});

it('reloads a newly configured past cycle and exposes employee backfill according to its saved rules', async () => {
  const cycle = { id: 'past', title: '补建历史周报', month: '2020-01', startDate: '2020-01-01', endDate: '2020-01-07', notifyAt: '2020-01-05T09:00', deadline: '2020-01-07T18:00', allowBackfill: true };
  await save({ ...settings, weeklyReviewCycles: [cycle] });
  const reloaded = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(reloaded.weeklyReviewCycles).toEqual([cycle]);
  const now = dayjs('2026-10-17T12:00');
  const payload = { title: '历史周报', reviewType: 'week' as const, startDate: cycle.startDate, endDate: cycle.endDate };
  expect(reviewSubmissionAccess(reloaded, payload, now).allowed).toBe(true);
  expect(backfillReviews([], [], 'employee', reloaded, now)).toContainEqual(expect.objectContaining({ type: 'week', startDate: cycle.startDate, endDate: cycle.endDate }));
  await save({ ...reloaded, weeklyReviewCycles: [{ ...cycle, allowBackfill: false }] });
  const closed = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(reviewSubmissionAccess(closed, payload, now)).toEqual({ allowed: false, reason: '该周报周期已截止，不允许补录' });
  expect(backfillReviews([], [], 'employee', closed, now)).toEqual([]);
  await save({ ...closed, weeklyReviewCycles: [{ ...cycle, deadline: '2099-01-01T18:00', allowBackfill: false }] });
  const reopened = await mockApiRequest('/api/okr/settings') as OkrSettings;
  expect(reviewSubmissionAccess(reopened, payload, now).allowed).toBe(true);
  expect(backfillReviews([], [], 'employee', reopened, now)).toHaveLength(1);
});

it('rejects overlapping historical cycles without changing persisted settings', async () => {
  const cycle = { id: 'past', month: '2020-01', startDate: '2020-01-01', endDate: '2020-01-07', notifyAt: '2020-01-05T09:00', deadline: '2020-01-07T18:00', allowBackfill: true };
  await expect(save({ ...settings, weeklyReviewCycles: [cycle, { ...cycle, id: 'overlap' }] })).rejects.toThrow('不能重叠');
  expect((await mockApiRequest('/api/okr/settings') as OkrSettings).weeklyReviewCycles).toEqual([]);
});

it('allows an employee to save and submit a report for a newly added historical cycle', async () => {
  const cycle = { id: 'past-submit', title: '历史周报补写', month: '2020-01', startDate: '2020-01-01', endDate: '2020-01-07', notifyAt: '2020-01-05T09:00', deadline: '2020-01-07T18:00', allowBackfill: true };
  await save({ ...settings, weeklyReviewCycles: [cycle] });
  const people = await mockApiRequest('/api/okr/people') as OkrPerson[];
  const employee = people.find(person => !person.rootFlag && !people.some(child => child.supervisorId === person.id))!;
  expect(employee).toBeDefined();
  localStorage.setItem('shichuang.frontend.mock.okrRecords', '[]');
  const payload = { title: '补写历史周报', reviewType: 'week', startDate: cycle.startDate, endDate: cycle.endDate, summary: '补充本周期工作总结' };
  const created = await mockApiRequest('/api/okr/records', { method: 'POST', body: JSON.stringify({ kind: 'review', periodKey: `${cycle.startDate}/${cycle.endDate}`, payload, submit: false, viewerId: employee.id }) }) as { id: string };
  const drafts = await mockApiRequest(`/api/okr/records?viewerId=${employee.id}`) as OkrRecord[];
  expect(drafts.find(record => record.id === created.id)).toMatchObject({ status: 'draft', ownerId: employee.id, payload });
  await mockApiRequest(`/api/okr/records/${created.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'submit', version: 0, viewerId: employee.id }) });
  const reports = await mockApiRequest(`/api/okr/records?viewerId=${employee.id}`) as OkrRecord[];
  expect(reports.find(record => record.id === created.id)).toMatchObject({ status: 'submitted', ownerId: employee.id, payload });
  expect(backfillReviews(reports, [], employee.id, await mockApiRequest('/api/okr/settings') as OkrSettings).some(period => period.type === 'week' && period.startDate === cycle.startDate)).toBe(false);
});
