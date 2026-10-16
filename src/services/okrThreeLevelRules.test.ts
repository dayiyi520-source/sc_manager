import { describe, expect, it } from 'vitest';
import { assignedReferences, goalsWithAssignments, inheritedGoalPayload, timingError, validateThreeLevelGoal } from './okrThreeLevelRules';
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
    expect(targets.filter(item => item.ownerId === 'manager')).toHaveLength(0);
    expect(targets).toEqual([company]);
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
  it('submits a personal action change for review without changing the inherited KR', () => {
    const saved=createDepartment();
    const reference=assignedReferences(saved.records,people[2])[0];
    const inherited=inheritedGoalPayload(reference,people[2]);
    const initial={...inherited,keyResults:inherited.keyResults?.map(kr=>({...kr,executionActions:[{id:'a',ownerId:'employee',title:'原计划',progress:0,deadline:'2026-10-22'}]}))};
    const created=mutateOkrLifecycle(undefined,{kind:'objective',viewerId:'employee',periodKey:'2026-10',payload:initial,submit:true},saved.records,people)!;
    const original=created.records.at(-1)!;
    const modified={...original.payload,changeReason:'本月计划调整',keyResults:original.payload.keyResults?.map(kr=>({...kr,executionActions:kr.executionActions?.map(action=>({...action,title:'调整后的计划'}))}))};
    const result=mutateOkrLifecycle(original.id,{action:'save',viewerId:'employee',version:original.version,payload:modified},created.records,people)!;
    expect(result.records.at(-1)?.changeRequest?.status).toBe('pending');
    expect(result.records.at(-1)?.changeRequest?.payload.keyResults?.[0].title).toBe(original.payload.keyResults?.[0].title);
    expect(result.records.at(-1)?.changeRequest?.payload.keyResults?.[0].executionActions?.[0].title).toBe('调整后的计划');
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

describe('KR 权重与上级日期约束', () => {
  it('requires five-percent increments and at least one KR above twenty percent', () => {
    const goal: OkrPayload = { goalLevel: 'company', title: '测试权重', deadline: '2026-10-31', keyResults: [33, 67].map((weight, i) => ({ id: String(i), title: '结果', weight, progress: 0, deadline: '2026-10-31' })) };
    expect(validateThreeLevelGoal(goal, 'user-admin')).toContain('5%');
    goal.keyResults = [20, 20, 20, 20, 20].map((weight, i) => ({ id: String(i), title: '结果', weight, progress: 0, deadline: '2026-10-31' }));
    expect(validateThreeLevelGoal(goal, 'user-admin')).toContain('大于 20%');
    goal.keyResults = [35, 35, 30].map((weight, i) => ({ id: String(i), title: '结果', weight, progress: 0, deadline: '2026-10-31' }));
    expect(validateThreeLevelGoal(goal, 'user-admin')).toBeUndefined();
  });
  it.each([false, true])('rejects deadlines beyond the assigned source even for submit=%s', submit => {
    const goal = department();
    goal.deadline = '2026-11-01';
    expect(() => mutateOkrLifecycle(undefined, { kind: 'objective', viewerId: 'manager', periodKey: '2026-10', payload: goal, submit }, [company], people)).toThrow('截止');
    goal.deadline = '2026-10-31';
    goal.keyResults![0].executionActions![0].deadline = '2026-11-01';
    expect(() => mutateOkrLifecycle(undefined, { kind: 'objective', viewerId: 'manager', periodKey: '2026-10', payload: goal, submit }, [company], people)).toThrow('截止');
  });
});

it('submits a generic department KR with content and result without a business object or details', () => {
  const payload = { ...department(), keyResults: [{ ...department().keyResults![0], title: '完成内部协作并通过验收', structureType: 'support' as const, businessObject: undefined, version: undefined, stage: undefined, details: undefined, action: '完成内部协作', result: '通过验收' }] };
  expect(validateThreeLevelGoal(payload, 'manager')).toBeUndefined();
  const result = mutateOkrLifecycle(undefined, { kind: 'objective', viewerId: 'manager', periodKey: '2026-10', payload, submit: true }, [company], people)!;
  expect(result.records.at(-1)?.payload.keyResults?.[0]).toMatchObject({ structureType: 'support', action: '完成内部协作', result: '通过验收' });
  expect(result.records.at(-1)?.payload.keyResults?.[0].details).toBeUndefined();
  expect(validateThreeLevelGoal({ ...payload, keyResults: [{ ...payload.keyResults[0], result: '  ' }] }, 'manager')).toContain('完整 KR');
});

it('lets a supervisor create only their own autonomous personal goal and preserves department validation', () => {
 const personal:OkrPayload={goalModelVersion:2,goalLevel:'personal',origin:'autonomous',title:'本人本月工作',weight:100,deadline:'2026-10-25',keyResults:[{id:'mine',title:'本人本月工作',weight:100,progress:0,deadline:'2026-10-25',assigneeIds:['manager'],executionActions:[{id:'a',ownerId:'manager',title:'完成个人计划',weight:100,progress:0,deadline:'2026-10-25'}]}]};
 const upstream:OkrRecord={...company,id:'dept-upstream',ownerId:'manager',payload:department()};
 const created=mutateOkrLifecycle(undefined,{kind:'objective',viewerId:'manager',periodKey:'2026-10',payload:personal,submit:true},[company,upstream],people)!;
 expect(created.records.at(-1)?.ownerId).toBe('manager');
 expect(created.records.at(-1)?.payload.goalLevel).toBe('personal');
 expect(()=>mutateOkrLifecycle(undefined,{kind:'objective',viewerId:'employee',periodKey:'2026-10',payload:{...personal,goalLevel:'department'},submit:true},[company,upstream],people)).toThrow('公司级目标还未提交');
 expect(()=>mutateOkrLifecycle(undefined,{kind:'objective',viewerId:'manager',periodKey:'2026-10',payload:{...personal,keyResults:personal.keyResults?.map(kr=>({...kr,assigneeIds:['employee'],executionActions:kr.executionActions?.map(a=>({...a,ownerId:'employee'}))}))},submit:true},[company,upstream],people)).toThrow('只能填写');
});

it('aligns supervisor personal goals to their department and rejects company/other-department sources',()=>{
 const dept={...company,id:'dept',ownerId:'manager',payload:{...department(),origin:'autonomous' as const,sourceObjectiveId:undefined,sourceKrId:undefined,sourceVersion:undefined}};
 const personal:OkrPayload={goalModelVersion:2,goalLevel:'personal',origin:'autonomous',title:'个人执行',weight:100,deadline:'2026-10-20',sourceObjectiveId:'dept',sourceKrId:'department-kr',sourceVersion:1,keyResults:[{id:'mine',title:'个人执行',weight:100,progress:0,deadline:'2026-10-20',assigneeIds:['manager'],executionActions:[{id:'a',ownerId:'manager',title:'执行动作',weight:100,progress:0,deadline:'2026-10-20'}]}]};
 expect(mutateOkrLifecycle(undefined,{viewerId:'manager',kind:'objective',periodKey:'2026-10',payload:personal,submit:true},[company,dept],people)?.records.at(-1)?.payload.sourceObjectiveId).toBe('dept');
 expect(()=>mutateOkrLifecycle(undefined,{viewerId:'manager',kind:'objective',periodKey:'2026-10',payload:{...personal,sourceObjectiveId:'company',sourceKrId:'company-kr'},submit:true},[company,dept],people)).toThrow('本部门');
 const other={...dept,ownerId:'other'};const directory=[...people,{...people[1],id:'other',department:'其他部门'}];
 expect(()=>mutateOkrLifecycle(undefined,{viewerId:'manager',kind:'objective',periodKey:'2026-10',payload:personal,submit:true},[other,{...dept,id:'valid-dept'}],directory)).toThrow('本部门');
});
