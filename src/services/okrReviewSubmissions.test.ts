// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApiRequest } from './mockApi';
import type { OkrPayload, OkrRecord, OkrSettings, OkrPerson } from './okrRepository';

const recordsKey = 'shichuang.frontend.mock.okrRecords';
const settingsKey = 'shichuang.frontend.mock.okrSettings';
const payload: OkrPayload = { title: '历史周报', reviewType: 'week', startDate: '2026-09-07', endDate: '2026-09-13' };
const settings: OkrSettings = { defaultView: 'list', timeRules: [{ key: 'weeklyReview', label: '周报', startDay: 5, endDay: 7, allowBackfill: true }], templates: [], dictionaries: { productNodes: [], deliveryNodes: [], presalesNodes: [], supportTypes: [] }, validation: { actionWeightTotal: 100, maxActions: 8, assigneeMultiple: true, keyNodeMultiple: true, resultRequired: true } };
const draft: OkrRecord = { id: 'draft', kind: 'review', ownerId: 'me', periodKey: '2026-09-07/2026-09-13', status: 'draft', version: 1, createdAt: '2026-09-10T12:00:00', payload };
const create = (value = payload, submit = true) => mockApiRequest('/api/okr/records', { method: 'POST', body: JSON.stringify({ kind: 'review', periodKey: `${value.startDate}/${value.endDate}`, payload: value, submit, viewerId: 'me' }) });
const update = (extra = {}) => mockApiRequest('/api/okr/records/draft', { method: 'PATCH', body: JSON.stringify({ action: 'submit', version: 1, viewerId: 'me', ...extra }) });
const rows = () => JSON.parse(localStorage.getItem(recordsKey)!) as OkrRecord[];

describe('persistent review submission rules', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem(recordsKey, '[]'); localStorage.setItem(settingsKey, JSON.stringify(settings)); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-12T12:00:00')); });
  afterEach(() => vi.useRealTimers());
  it('persists backfill submission status and submission time across reads', async () => {
    await create();
    expect(rows()[0]).toMatchObject({ status: 'submitted', payload, submittedAt: new Date().toISOString() });
    const saved = await mockApiRequest('/api/okr/records?viewerId=me') as OkrRecord[];
    expect(saved[0]).toMatchObject(rows()[0]);
    await expect(create()).rejects.toThrow('已有复盘');
    expect(rows()).toHaveLength(1);
  });
  it('updates the original draft without adding a second period record', async () => {
    localStorage.setItem(recordsKey, JSON.stringify([draft]));
    await update({ payload: { ...payload, summary: '补交内容' } });
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toMatchObject({ id: 'draft', status: 'submitted', version: 2, createdAt: draft.createdAt, submittedAt: new Date().toISOString(), payload: { summary: '补交内容' } });
    await expect(update({ version: 2 })).rejects.toThrow('已提交');
  });
  it('preserves knowledge across draft reads, deletion, submission and reopening', async () => {
    const first = { id: 'knowledge-1', title: '排查经验', category: '产研规范', content: '检查告警及日志' };
    const second = { id: 'knowledge-2', title: '交付经验', category: '项目沉淀', content: '确认验收范围' };
    const created = await create({ ...payload, knowledgeEntries: [first, second] }, false) as { id: string };
    const read = async () => (await mockApiRequest('/api/okr/records?viewerId=me') as OkrRecord[]).find(row => row.id === created.id)!;
    expect((await read()).payload.knowledgeEntries).toEqual([first, second]);
    await mockApiRequest(`/api/okr/records/${created.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'save', version: 0, viewerId: 'me', payload: { ...payload, knowledgeEntries: [second] } }) });
    expect((await read()).payload.knowledgeEntries).toEqual([second]);
    await mockApiRequest(`/api/okr/records/${created.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'submit', version: 1, viewerId: 'me' }) });
    expect(await read()).toMatchObject({ status: 'submitted', payload: { knowledgeEntries: [second] } });
  });
  it('preserves monthly suggestions, metric snapshot and associations across draft and submission reads', async () => {
    const value: OkrPayload = { title: '月报', reviewType: 'month', startDate: '2026-09-01', endDate: '2026-09-30', suggestions: '问题\n建议', monthlyMetrics: { taskCount: 2, collaborationCount: 1, totalHours: 6.5 }, knowledgeEntries: [{ id: 'k', title: '月报经验', category: '产研规范', content: '经验正文' }], assistance: [{ workId: 'c', subject: '需要协调', result: '协调资源' }] };
    const saved = await create(value, false) as { id: string };
    const read = async () => (await mockApiRequest('/api/okr/records?viewerId=me') as OkrRecord[]).find(row => row.id === saved.id)!;
    expect((await read()).payload).toEqual(value);
    await mockApiRequest(`/api/okr/records/${saved.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'submit', version: 0, viewerId: 'me' }) });
    expect(await read()).toMatchObject({ status: 'submitted', payload: value });
  });
  it('blocks closed current dates and disabled backfill without writing', async () => {
    await expect(create({ title: '', reviewType: 'week', startDate: '2026-10-12', endDate: '2026-10-18' })).rejects.toThrow('当前不可填写');
    localStorage.setItem(settingsKey, JSON.stringify({ ...settings, timeRules: [{ ...settings.timeRules[0], allowBackfill: false }] }));
    await expect(create()).rejects.toThrow('不允许补交');
    expect(rows()).toEqual([]);
  });
  it('rejects foreign ownership, stale versions and changed periods', async () => {
    localStorage.setItem(recordsKey, JSON.stringify([draft]));
    await expect(update({ viewerId: 'other' })).rejects.toThrow('本人');
    await expect(update({ version: 0 })).rejects.toThrow('刷新');
    await expect(update({ payload: { ...payload, startDate: '2026-09-14', endDate: '2026-09-20' } })).rejects.toThrow('周期');
    expect(rows()[0]).toEqual(draft);
  });
});

 describe('review endpoints shared across roles', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem(recordsKey, '[]'); localStorage.setItem(settingsKey, JSON.stringify(settings)); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-13T12:00:00')); });
  afterEach(() => vi.useRealTimers());
  it.each(['employee', 'supervisor', 'boss'])('creates and submits backfill through the same record operations for %s', async role => {
    const people = await mockApiRequest('/api/okr/people') as OkrPerson[];
    const person = people.find(member => role === 'boss' ? member.rootFlag === 1 : role === 'supervisor' ? member.rootFlag === 0 && member.jobTitle?.includes('主管') : member.rootFlag === 0 && !member.jobTitle?.includes('主管') && !people.some(child => child.supervisorId === member.id));
    expect(person).toBeDefined();
    const viewerId = person!.id;
    const created = await mockApiRequest('/api/okr/records', { method: 'POST', body: JSON.stringify({ kind: 'review', periodKey: `${payload.startDate}/${payload.endDate}`, payload, submit: false, viewerId }) }) as { id: string };
    expect(rows()[0]).toMatchObject({ ownerId: viewerId, status: 'draft' });
    await mockApiRequest(`/api/okr/records/${created.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'submit', version: 0, viewerId }) });
    expect(rows()[0]).toMatchObject({ ownerId: viewerId, status: 'submitted' });
    await expect(mockApiRequest(`/api/okr/records/${created.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'submit', version: 1, viewerId }) })).rejects.toThrow('已提交');
  });
});
