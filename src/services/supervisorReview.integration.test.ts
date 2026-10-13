// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import type { OkrPerson, OkrRecord } from './okrRepository';
const key = 'shichuang.frontend.mock.okrRecords';
describe('supervisor review record visibility', () => {
  beforeEach(() => localStorage.clear());
  it('reads owned and submitted direct-report reviews through the existing endpoint while excluding foreign/draft records', async () => {
    const people = await mockApiRequest('/api/okr/people') as OkrPerson[];
    const manager = people.find(person => person.rootFlag === 0 && people.some(child => child.supervisorId === person.id))!;
    expect(manager).toBeDefined();
    const employee = people.find(person => person.supervisorId === manager.id)!;
    const other = people.find(person => person.rootFlag === 1)!;
    const base: OkrRecord = { id: 'own', kind: 'review', ownerId: manager.id, status: 'draft', version: 0, periodKey: '2026-10-12/2026-10-18', payload: { title: '周报' } };
    localStorage.setItem(key, JSON.stringify([base, { ...base, id: 'direct', ownerId: employee.id, status: 'submitted' }, { ...base, id: 'private-draft', ownerId: employee.id }, { ...base, id: 'private-returned', ownerId: employee.id, status: 'returned' }, { ...base, id: 'foreign', ownerId: other.id, status: 'submitted' }]));
    const rows = await mockApiRequest(`/api/okr/records?viewerId=${manager.id}`) as OkrRecord[];
    expect(rows.map(row => row.id)).toEqual(['own', 'direct']);
    const personal = await mockApiRequest(`/api/okr/records?viewerId=${employee.id}`) as OkrRecord[];
    expect(personal.map(row => row.id)).toEqual(['direct', 'private-draft', 'private-returned']);
  });
  it('persists judgment and employee support snapshots when saving and re-reading a draft', async () => {
    localStorage.setItem(key, '[]');
    const payload = { title: '主管周报', reviewType: 'week', reviewMode: 'supervisor', startDate: '2026-10-12', endDate: '2026-10-18', krReviews: [{ objectiveId: 'o', objectiveTitle: '目标', keyResultId: 'kr', keyResultTitle: 'KR', previousProgress: 20, currentProgress: 40, health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: [], supervisorJudgment: '优先协调资源', employeeReviewSnapshots: [{ id: 'employee-review', authorName: '员工', title: '员工周报', startDate: '2026-10-12', endDate: '2026-10-18', status: 'submitted', krReviews: [], assistance: [], items: [] }] }] };
    const created = await mockApiRequest('/api/okr/records', { method: 'POST', body: JSON.stringify({ kind: 'review', viewerId: 'manager', periodKey: '2026-10-12/2026-10-18', payload, submit: false }) }) as { id: string };
    await mockApiRequest(`/api/okr/records/${created.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'save', viewerId: 'manager', version: 0, payload: { ...payload, krReviews: [{ ...payload.krReviews[0], supervisorJudgment: '调整后的判断' }] } }) });
    const rows = await mockApiRequest('/api/okr/records?viewerId=manager') as OkrRecord[];
    expect(rows[0]).toMatchObject({ status: 'draft', payload: { reviewMode: 'supervisor', krReviews: [{ supervisorJudgment: '调整后的判断', employeeReviewSnapshots: [{ authorName: '员工' }] }] } });
  });
});
