import { describe, expect, it } from 'vitest';
import { personalAssignedObjectives } from './okrAssignments';
import { canEditOkr } from './okrSettingsPolicy';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import type { OkrPerson, OkrRecord } from './okrRepository';
const people: OkrPerson[] = [
  { id: 'manager', name: '主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, goalRole: 'supervisor', version: 1 },
  { id: 'staff', name: '员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 },
];
const goal: OkrRecord = { id: 'department', kind: 'objective', ownerId: 'manager', periodKey: '2026-10', status: 'active', version: 1, payload: { goalLevel: 'department', title: '部门目标', keyResults: [
  { id: 'kr', title: '共同成果', weight: 50, progress: 40, assigneeIds: ['staff', 'manager'], details: [{ id: 'mine', name: '员工版本', assigneeIds: ['staff'] }, { id: 'other', name: '主管版本', assigneeIds: ['manager'] }] },
  { id: 'direct', title: '主管本人承接', weight: 50, progress: 20, assigneeIds: ['manager'] },
] } };
describe('personal department assignments', () => {
  it('keeps the O and assigned KR/sub-KR without changing source records', () => {
    const result = personalAssignedObjectives([goal], people[1], people);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(goal.id);
    expect(result[0].payload.keyResults?.map(kr => kr.id)).toEqual(['kr']);
    expect(result[0].payload.keyResults?.[0].details?.map(row => row.id)).toEqual(['mine']);
    expect(goal.payload.keyResults?.[0].details).toHaveLength(2);
  });
  it('includes supervisor self assignments and reads current reassignment', () => {
    expect(personalAssignedObjectives([goal], people[0], people)[0].payload.keyResults).toHaveLength(2);
    const removed = { ...goal, payload: { ...goal.payload, keyResults: [] } };
    expect(personalAssignedObjectives([removed], people[1], people)).toEqual([]);
  });
  it('excludes drafts, deleted, company, personal, and other departments', () => {
    const records = [ { ...goal, status: 'draft' }, { ...goal, status: 'deleted' }, { ...goal, payload: { ...goal.payload, goalLevel: 'company' } }, { ...goal, payload: { ...goal.payload, goalLevel: 'personal' } } ] as OkrRecord[];
    expect(personalAssignedObjectives(records, people[1], people)).toEqual([]);
    expect(personalAssignedObjectives([goal], { ...people[1], department: '其他部' }, people)).toEqual([]);
  });
  it('blocks employee edits and withdrawal of historical assigned goals', () => {
    const old = { ...goal, ownerId: 'staff', payload: { ...goal.payload, goalLevel: 'personal' as const, origin: 'assigned' as const } };
    expect(canEditOkr(old, 'staff', undefined, people)).toBe(false);
    expect(canEditOkr(goal, 'staff', undefined, people)).toBe(false);
    expect(canEditOkr(goal, 'manager', undefined, people)).toBe(true);
    expect(() => mutateOkrLifecycle(old.id, { action: 'withdraw-change', viewerId: 'staff', version: 1 }, [old], people)).toThrow('只能修改');
  });
  it('rejects personal creation through the mutation boundary', () => {
    expect(() => mutateOkrLifecycle(undefined, { kind: 'objective', viewerId: 'staff', payload: { title: '新增', goalLevel: 'personal' } }, [], people)).toThrow('无需自行添加');
  });
});
