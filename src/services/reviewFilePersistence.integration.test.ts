// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOkrFilePersistence } from './okrFilePersistence';
import { saveOkrState, type OkrFileState } from '../../scripts/mock-okr-state-plugin';
import { mockApiRequest } from './mockApi';
import { departmentReviewMembers } from './departmentReviewSubmission';
import type { OkrPayload, OkrPerson, OkrRecord } from './okrRepository';
import seed from '../data/mockOkrState.json';
const key = 'shichuang.frontend.mock.okrRecords';
afterEach(() => { localStorage.clear(); vi.useRealTimers(); });
describe('复盘调整的文件持久化闭环', () => {
 it('persists read receipts, round exclusions and judgments through draft, submit and a clean browser restart', async () => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-31T12:00:00+08:00'));
  const people = await mockApiRequest('/api/okr/people') as OkrPerson[];
  const manager = people.find(person => !person.rootFlag && people.some(child => child.supervisorId === person.id && child.department === person.department))!;
  const members = departmentReviewMembers(people, manager.id);
  const employee = members[0];
  const period = { startDate: '2026-10-01', endDate: '2026-10-31' };
  const employeeReport: OkrRecord = { id: 'employee-month', ownerId: employee.id, kind: 'review', version: 1, status: 'submitted', periodKey: '2026-10', payload: { title: '员工月报', reviewType: 'month', ...period, suggestions: '改善跨部门协作' } };
  const dir = mkdtempSync(join(tmpdir(), 'review-file-roundtrip-'));
  const file = join(dir, 'state.json');
  let rejectSave = false;
  const read = () => JSON.parse(readFileSync(file, 'utf8')) as OkrFileState;
  const request = vi.fn(async (_url, init?: RequestInit) => {
   if (init?.method === 'PUT') {
    if (rejectSave) return new Response(JSON.stringify({ message: '文件保存失败' }), { status: 409 });
    const body = JSON.parse(String(init.body));
    return new Response(JSON.stringify(saveOkrState(file, body.state, body.previousRevision)));
   }
   return new Response(JSON.stringify(read()));
  }) as unknown as typeof fetch;
  const start = () => { localStorage.setItem('shichuang.frontend.mock.okrFileMigration.v1', 'done'); return createOkrFilePersistence(localStorage, request); };
  try {
   writeFileSync(file, JSON.stringify({ ...seed, revision: 0, okrRecords: [employeeReport], okrPeople: people }));
   let persistence = start();
   const call = (path: string, body: object) => persistence.run(() => mockApiRequest(path, { method: path.endsWith('/viewed') || path === '/api/okr/records' ? 'POST' : 'PATCH', body: JSON.stringify(body) }));
   await call('/api/okr/records/employee-month/viewed', { viewerId: manager.id });
   expect(read().okrRecords[0].viewedBy).toEqual([manager.id]);
   const payload: OkrPayload = { title: '部门月报', reviewType: 'month', reviewMode: 'supervisor', ...period,
    departmentReviewExclusions: members.slice(1).map(person => ({ employeeId: person.id, employeeName: person.name, reason: '本轮休假' })),
    departmentFeedbackRows: [{ employeeId: employee.id, employeeName: employee.name, reviewId: employeeReport.id, suggestion: '改善跨部门协作', judgment: '需公司解决' }],
   };
   const created = await call('/api/okr/records', { viewerId: manager.id, kind: 'review', periodKey: `${period.startDate}/${period.endDate}`, payload, submit: false }) as { id: string };
   const storedDraft = read().okrRecords.find(row => row.id === created.id)!;
   expect(storedDraft.payload).toEqual(payload);
   localStorage.clear(); persistence = start();
   await persistence.run(async () => expect(JSON.parse(localStorage.getItem(key)!).find((row: OkrRecord) => row.id === created.id)).toEqual(storedDraft));
   rejectSave = true;
   await expect(call(`/api/okr/records/${created.id}`, { viewerId: manager.id, action: 'submit', version: 0, payload })).rejects.toThrow('文件保存失败');
   expect(read().okrRecords.find(row => row.id === created.id)?.status).toBe('draft');
   expect(JSON.parse(localStorage.getItem(key)!).find((row: OkrRecord) => row.id === created.id).status).toBe('draft');
   rejectSave = false;
   await call(`/api/okr/records/${created.id}`, { viewerId: manager.id, action: 'submit', version: 0, payload });
   const submitted = read().okrRecords.find(row => row.id === created.id)!;
   expect(submitted).toMatchObject({ status: 'submitted', payload: { departmentFeedbackRows: payload.departmentFeedbackRows, departmentReviewExclusions: payload.departmentReviewExclusions } });
   localStorage.clear(); persistence = start();
   await persistence.run(async () => expect(JSON.parse(localStorage.getItem(key)!)).toEqual(read().okrRecords));
  } finally { rmSync(dir, { recursive: true, force: true }); }
 });
});
