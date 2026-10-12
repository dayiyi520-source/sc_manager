import { describe, expect, it } from 'vitest';
import { assignedReferences, goalsWithAssignments, inheritedGoalPayload, timingError } from './okrThreeLevelRules';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import type { OkrPayload, OkrPerson, OkrRecord } from './okrRepository';
const people: OkrPerson[] = [{ id: 'user-admin', name: '林志豪', department: '公司', supervisorId: null, rootFlag: 1, version: 0 }, { id: 'manager', name: '主管', jobTitle: '产品主管', department: '研发', supervisorId: 'user-admin', rootFlag: 0, version: 0 }, { id: 'employee', name: '员工', jobTitle: '设计师', department: '研发', supervisorId: 'manager', rootFlag: 0, version: 0 }];
const company: OkrRecord = { id: 'company', kind: 'objective', ownerId: 'user-admin', periodKey: '2026-10', status: 'active', version: 1, payload: { goalModelVersion: 2, goalLevel: 'company', title: '提高增长', deadline: '2026-10-31', keyResults: [{ id: 'company-kr', title: '提升用户规模', weight: 100, progress: 0, deadline: '2026-10-31', assigneeIds: ['manager'] }, { id: 'unrelated', title: '其他工作', weight: 0, progress: 0, assigneeIds: ['another'] }] } };
const department = (): OkrPayload => ({ goalModelVersion: 2, goalLevel: 'department', title: 'APP日新增提高至1万', deadline: '2026-10-25', sourceObjectiveId: 'company', sourceKrId: 'company-kr', sourceVersion: 1, keyResults: [{ id: 'department-kr', title: 'APP V1达到UI设计阶段', structureType: 'product', businessObject: 'APP', version: 'V1', stage: 'UI设计', weight: 100, progress: 0, deadline: '2026-10-25', assigneeIds: ['employee', 'manager'], executionActions: [{ id: 'manager-a', ownerId: 'manager', title: '完成方案设计', progress: 0, deadline: '2026-10-20' }] }] });
function createDepartment() { return mutateOkrLifecycle(undefined, { kind: 'objective', viewerId: 'manager', periodKey: '2026-10', payload: department(), submit: true }, [company], people)!; }
describe('三级目标承接与本人执行', () => {
  it('only auto-aligns assigned references and deduplicates an accepted source', () => {
    const refs = assignedReferences([company], people[1]);
    expect(refs.map(item => item.id)).toEqual(['company-kr']);
    const targets = goalsWithAssignments([company], people[1]);
    expect(targets.filter(item => item.ownerId === 'manager')).toHaveLength(1);
    expect(targets.at(-1)?.payload).toMatchObject({ inherited: true, sourceKrId: 'company-kr' });
    const saved = createDepartment();
    expect(goalsWithAssignments(saved.records, people[1]).filter(item => item.ownerId === 'manager')).toHaveLength(1);
    expect(() => mutateOkrLifecycle(undefined, { kind: 'objective', viewerId: 'manager', periodKey: '2026-10', payload: department(), submit: true }, saved.records, people)).toThrow('已承接');
  });
  it('an employee inherits only the assigned department KR and fills own actions', () => {
    const saved = createDepartment();
    const reference = assignedReferences(saved.records, people[2])[0];
    const inherited = inheritedGoalPayload(reference, people[2]);
    expect(inherited.title).toBe('APP V1达到UI设计阶段');
    expect(inherited.keyResults?.[0].executionActions).toEqual([]);
    const payload = { ...inherited, keyResults: inherited.keyResults?.map(kr => ({ ...kr, executionActions: [{ id: 'a', ownerId: 'employee', title: '制作设计稿', progress: 0, deadline: '2026-10-22' }] })) };
    const result = mutateOkrLifecycle(undefined, { kind: 'objective', viewerId: 'employee', periodKey: '2026-10', payload, submit: true }, saved.records, people)!;
    expect(result.records.at(-1)?.payload).toMatchObject({ goalLevel: 'personal', title: reference.payload.title, inherited: false });
    expect(() => mutateOkrLifecycle(undefined, { kind: 'objective', viewerId: 'employee', periodKey: '2026-10', payload: { ...payload, title: '自己改O' }, submit: true }, saved.records, people)).toThrow('只能填写本人 A');
  });
  it('persists incomplete drafts without validating them as submitted goals', () => {
    const payload = { ...department(), keyResults: [{ ...department().keyResults![0], title: '', businessObject: '' }] };
    const result = mutateOkrLifecycle(undefined, { kind: 'objective', viewerId: 'manager', periodKey: '2026-10', payload, submit: false }, [company], people)!;
    expect(result.records.at(-1)?.status).toBe('draft');
    expect(() => mutateOkrLifecycle(result.records.at(-1)!.id, { action: 'submit', viewerId: 'manager', version: 0 }, result.records, people)).toThrow('关键结果名称');
  });
});
describe('目标修改审核和原计划锁定', () => {
  it('keeps the active payload until company approval and rejects unauthorized review', () => {
    const original = createDepartment().records;
    const record = original.at(-1)!;
    const changed = { ...record.payload, title: 'APP日新增提高至1.2万', changeReason: '目标调整' };
    const requested = mutateOkrLifecycle(record.id, { viewerId: 'manager', version: record.version, action: 'save', payload: changed }, original, people)!;
    const pending = requested.records.at(-1)!;
    expect(pending.payload.title).toBe(record.payload.title);
    expect(pending.changeRequest?.reviewerId).toBe('user-admin');
    expect(() => mutateOkrLifecycle(record.id, { action: 'approve-change', viewerId: 'employee', version: pending.version }, requested.records, people)).toThrow('无权审核');
    const approved = mutateOkrLifecycle(record.id, { action: 'approve-change', viewerId: 'user-admin', version: pending.version }, requested.records, people)!;
    expect(approved.records.at(-1)?.payload.title).toBe(changed.title);
    expect(approved.records.at(-1)?.changeHistory).toHaveLength(1);
  });
  it('rejects rewriting original dates, requires delay reason and rejects future actual time', () => {
    const original = createDepartment().records;
    const record = original.at(-1)!;
    expect(() => mutateOkrLifecycle(record.id, { viewerId: 'manager', version: record.version, action: 'save', payload: { ...record.payload, deadline: '2026-10-30', changeReason: '延期' } }, original, people)).toThrow('原计划日期');
    expect(timingError({ deadline: '2026-10-20', forecastDeadline: '2026-10-25' })).toContain('延期原因');
    expect(timingError({ actualCompletedAt: '2099-01-01' })).toContain('未来');
    expect(timingError({ deadline: '2026-10-20', forecastDeadline: '2026-10-25', delayReason: '外部接口延期' })).toBeUndefined();
  });
  it('company changes require source confirmation and do not overwrite subordinate contents', () => {
    const original = createDepartment().records;
    const updated = mutateOkrLifecycle('company', { viewerId: 'user-admin', action: 'save', version: 1, payload: { ...company.payload, keyResults: [{ ...company.payload.keyResults![0], title: '新的增长方向' }] } }, original, people)!;
    const manager = updated.records.at(-1)!;
    expect(manager.payload.title).toBe(department().title);
    expect(manager.payload.sourceVersion).toBe(1);
    const synced = mutateOkrLifecycle(manager.id, { viewerId: 'manager', action: 'acknowledge-source', version: manager.version }, updated.records, people)!;
    expect(synced.records.at(-1)?.payload).toMatchObject({ title: department().title, sourceVersion: 2, sourceTitle: '新的增长方向' });
  });
  it('returning changes preserves the request and blocks approval after upstream changes', () => {
    const original = createDepartment().records; const record = original.at(-1)!;
    const requested = mutateOkrLifecycle(record.id, { action: 'save', version: record.version, viewerId: 'manager', payload: { ...record.payload, title: '调整目标', changeReason: '调整指标' } }, original, people)!;
    const pending = requested.records.at(-1)!;
    const returned = mutateOkrLifecycle(record.id, { action: 'return-change', viewerId: 'user-admin', version: pending.version, feedback: '指标需明确' }, requested.records, people)!;
    expect(returned.records.at(-1)?.payload.title).toBe(record.payload.title);
    expect(returned.records.at(-1)?.changeRequest).toMatchObject({ status: 'returned', feedback: '指标需明确', payload: { title: '调整目标' } });
    const changedUpstream = requested.records.map(item => item.id === 'company' ? { ...item, version: 2 } : item);
    expect(() => mutateOkrLifecycle(record.id, { action: 'approve-change', viewerId: 'user-admin', version: pending.version }, changedUpstream, people)).toThrow('确认同步');
  });
});
