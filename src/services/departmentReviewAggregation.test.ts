// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { OkrPerson, OkrRecord, OkrKrReview } from './okrRepository';
import { mockApiRequest } from './mockApi';
import { monthlyReviewTargets } from './okrReviewTargets';
import { departmentKrAggregation, submitDepartmentReview } from './departmentReviewAggregation';
const people = vi.hoisted(() => ([{ id: 'm', name: '主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 }, ...['a','b'].map(id => ({ id, name: id, department: '产品部', supervisorId: 'm', rootFlag: 0, version: 1 }))] as OkrPerson[]));
vi.mock('../data/mockSnapshot', async importOriginal => ({ ...await importOriginal<object>(), MOCK_OKR_PEOPLE: people }));
const period = { startDate: '2026-10-12', endDate: '2026-10-18' };
const target: OkrKrReview = { objectiveId: 'o', objectiveTitle: '部门目标', keyResultId: 'kr', keyResultTitle: 'KR', previousProgress: 0, currentProgress: 0, health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: [] };
const department: OkrRecord = { id: 'o', ownerId: 'm', kind: 'objective', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '部门目标', goalLevel: 'department', keyResults: [{ id: 'kr', title: 'KR', progress: 0, weight: 25, assigneeIds: ['a','b'], details: [{ id: 'd1', name: '产品', version: 'V1', assigneeIds: ['a', 'b'] }, { id: 'd2', name: '产品', version: 'V2', assigneeIds: ['a', 'b'] }] }, { id: 'other', title: '其他', progress: 80, weight: 75 }] } };
const goal = (id: string): OkrRecord => ({ id: `goal-${id}`, ownerId: id, kind: 'objective', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '个人承接', sourceObjectiveId: 'o', sourceKrId: 'kr', keyResults: [{ id: 'kr', title: 'KR', progress: 0, weight: 100, details: department.payload.keyResults![0].details, executionActions: [{ id: `action-${id}`, ownerId: id, title: '动作', progress: 99 }] }] } });
const report = (id: string, values: number[], old = false): OkrRecord => ({ id: `${old ? 'old' : 'new'}-${id}`, kind: 'review', ownerId: id, periodKey: '', viewedBy: ['m'], status: 'submitted', version: 1, payload: { title: '员工周报', reviewType: 'week', startDate: old ? '2026-10-05' : period.startDate, endDate: old ? '2026-10-11' : period.endDate, krReviews: [{ ...target, objectiveId: `goal-${id}`, keyResultId: `action-${id}`, detailProgress: values.map((value,index) => ({ id: `d${index+1}`, previousProgress: 0, currentProgress: value })) }] } });
describe('department review authoritative aggregation', () => {
  it('keeps a submitted employee update visible when another execution action has no current update', () => {
    const personal = goal('a');
    personal.payload.keyResults![0].executionActions!.push({ id: 'second-action', ownerId: 'a', title: '另一动作', progress: 0 });
    const records = [department, personal, report('a', [40, 80])];
    const result = departmentKrAggregation(monthlyReviewTargets(records, 'm', people)[0], target, records, people, 'm', period);
    expect(result.contributors?.filter(row => row.authorId === 'a').map(row => ({ progress: row.currentProgress, submitted: row.submitted }))).toEqual([
      { progress: 20, submitted: true }, { progress: 40, submitted: true },
    ]);
  });
  it('averages employees per detail, details per KR, and weights KRs per objective', () => {
    const records = [department,goal('a'),goal('b'),report('a',[40,80]),report('b',[60,80])];
    const objective = monthlyReviewTargets(records,'m',people)[0];
    const result = departmentKrAggregation(objective,target,records,people,'m',period);
    expect(result.detailProgress?.map(row => row.currentProgress)).toEqual([50,80]);
    expect(result.currentProgress).toBe(65);
    const committed = submitDepartmentReview({ title:'部门周报',reviewType:'week',reviewMode:'supervisor',...period,krReviews:[target] },'m',records,people);
    expect(committed.records).toEqual(records);
    expect(committed.payload.krReviews?.[0].currentProgress).toBe(65);
    expect(committed.payload.krReviews?.[0].detailProgress?.[0].currentProgress).toBe(50);
    expect(department.payload.keyResults?.[0].progress).toBe(0);
  });
  it('carries the previous report for an unsubmitted employee and never uses live shared progress', () => {
    const records = [department,goal('a'),goal('b'),report('a',[40,80]),report('b',[60,20],true)];
    const result = departmentKrAggregation(monthlyReviewTargets(records,'m',people)[0],target,records,people,'m',period);
    expect(result.currentProgress).toBe(50);
    expect(result.contributors?.filter(row => row.authorId === 'b').every(row => !row.submitted)).toBe(true);
    expect(result.contributors?.find(row => row.authorId === 'b')?.currentProgress).toBe(60);
  });
  it('isolates monthly support, carries prior monthly values and synchronizes the monthly aggregation', () => {
    const month = { startDate:'2026-10-01', endDate:'2026-10-31' };
    const a = report('a',[40,80]);
    const b = report('b',[60,20],true);
    const records = [department,goal('a'),goal('b'),{...a,payload:{...a.payload,...month,reviewType:'month' as const}},{...b,payload:{...b.payload,reviewType:'month' as const,startDate:'2026-09-01',endDate:'2026-09-30'}},report('b',[100,100])];
    const result=submitDepartmentReview({title:'部门月报',reviewType:'month',reviewMode:'supervisor',...month,departmentReviewExclusions:[{employeeId:'b',reason:'本轮请假'}],krReviews:[target]},'m',records,people);
    expect(result.payload.krReviews?.[0].currentProgress).toBe(50);
    expect(result.payload.departmentContentSnapshots).toHaveLength(1);
    expect(result.records[0].payload.keyResults?.[0].progress).toBe(0);
  });
  it('rejects stale objective versions and unauthorized ownership', () => {
    const records = [department,goal('a'),report('a',[40,80]),report('b',[0,0])];
    expect(() => submitDepartmentReview({title:'周报',reviewType:'week',reviewMode:'supervisor',...period,krReviews:[target],departmentObjectiveVersions:{o:0}},'m',records,people)).toThrow('部门目标已被更新');
    expect(() => submitDepartmentReview({title:'周报',reviewType:'week',reviewMode:'supervisor',...period,krReviews:[target]},'a',records,people)).toThrow('无部门周报');
  });
});

describe('department review submission storage', () => {
  it('keeps a draft isolated then synchronizes shared progress atomically on submission', async () => {
    const records = [department,goal('a'),goal('b'),report('a',[40,80]),report('b',[60,80])];
    localStorage.setItem('shichuang.frontend.mock.okrPeople',JSON.stringify(people));
    localStorage.setItem('shichuang.frontend.mock.okrRecords',JSON.stringify(records));
    const payload = { title:'部门周报',reviewType:'week',reviewMode:'supervisor',...period,krReviews:[target],departmentObjectiveVersions:{o:1} };
    const created = await mockApiRequest('/api/okr/records',{method:'POST',body:JSON.stringify({kind:'review',viewerId:'m',periodKey:'2026-10-12/2026-10-18',payload,submit:false})}) as {id:string};
    expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.okrRecords')!).find((row: OkrRecord) => row.id === 'o').payload.keyResults[0].progress).toBe(0);
    await mockApiRequest(`/api/okr/records/${created.id}`,{method:'PATCH',body:JSON.stringify({action:'submit',viewerId:'m',version:0,payload})});
    const saved: OkrRecord[] = JSON.parse(localStorage.getItem('shichuang.frontend.mock.okrRecords')!);
    expect(saved.find(row => row.id === 'o')?.payload.progress).toBe(76.3);
    expect(saved.find(row => row.id === created.id)?.payload.krReviews?.[0].currentProgress).toBe(65);
    expect(saved.find(row => row.id === 'o')?.progressHistory?.length).toBeGreaterThan(1);
  });
});

describe('主管本人承接进度', () => {
  it.each(['week', 'month'] as const)('persists own contribution and objective snapshot on %s submission', reviewType => {
    const assigned = { ...department, payload: { ...department.payload, keyResults: department.payload.keyResults!.map(kr => kr.id === 'kr' ? { ...kr, assigneeIds: ['m'], details: kr.details?.map(row => ({ ...row, assigneeIds: ['m'] })) } : kr) } };
    const edited = { ...target, supervisorProgress: [{ id: 'd1', currentProgress: 40 }, { id: 'd2', currentProgress: 80 }], workIds: ['owner-evidence'] };
    const result = submitDepartmentReview({ title: '部门复盘', reviewMode: 'supervisor', reviewType, ...period, departmentReviewExclusions: [{employeeId:'a',reason:'本轮请假'},{employeeId:'b',reason:'本轮请假'}], krReviews: [edited] }, 'm', [assigned], people);
    expect(result.payload.krReviews![0]).toMatchObject({ currentProgress: 60, workIds: ['owner-evidence'], supervisorProgress: edited.supervisorProgress });
    expect(result.records[0]).toEqual(assigned);
    expect(result.payload.objectiveSnapshots![0].payload).toEqual(assigned.payload);
  });
  it('averages self and employee contributions without duplicating the owner', () => {
    const assigned = { ...department, payload: { ...department.payload, keyResults: department.payload.keyResults!.map(kr => kr.id === 'kr' ? { ...kr, assigneeIds: ['m', 'a'], details: kr.details?.map(row => ({ ...row, assigneeIds: ['m', 'a'] })) } : kr) } };
    const records = [assigned, goal('a'), report('a', [40, 80])];
    const result = departmentKrAggregation(monthlyReviewTargets(records, 'm', people)[0], { ...target, supervisorProgress: [{ id: 'd1', currentProgress: 100 }, { id: 'd2', currentProgress: 100 }] }, records, people, 'm', period);
    expect(result.detailProgress?.map(row => row.currentProgress)).toEqual([70, 90]);
  });
  it('rejects owner edits after the assignment is withdrawn', () => {
    expect(() => submitDepartmentReview({ title: '部门复盘', reviewMode: 'supervisor', reviewType: 'week', ...period, departmentReviewExclusions: [{employeeId:'a',reason:'本轮请假'},{employeeId:'b',reason:'本轮请假'}], krReviews: [{ ...target, supervisorProgress: [{ id: 'd1', currentProgress: 100 }] }] }, 'm', [department], people)).toThrow('未指派');
  });
});
