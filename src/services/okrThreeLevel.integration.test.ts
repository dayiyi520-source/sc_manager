// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { okrRepository, type OkrPerson, type OkrPayload } from './okrRepository';
import { assignedReferences, inheritedGoalPayload } from './okrThreeLevelRules';
const people = vi.hoisted(() => ([{ id:'user-admin',name:'林志豪',rootFlag:1,department:'公司',supervisorId:null,version:0 },{ id:'manager',name:'部门主管',jobTitle:'产品主管',rootFlag:0,department:'研发',supervisorId:'user-admin',version:0 },{ id:'employee',name:'员工',rootFlag:0,department:'研发',supervisorId:'manager',version:0 }] as OkrPerson[]));
vi.mock('../data/mockSnapshot', async importOriginal => ({ ...await importOriginal<object>(), MOCK_OKR_PEOPLE: people }));
beforeEach(() => { localStorage.setItem('shichuang.frontend.mock.okrPeople', JSON.stringify(people)); localStorage.setItem('shichuang.frontend.mock.okrRecords','[]'); });
describe('三级目标 API 层持久化', () => {
 it('supports company assignment, department acceptance, employee actions and two-step approval', async () => {
  const companyPayload: OkrPayload = { goalModelVersion:2,goalLevel:'company',title:'公司增长',deadline:'2026-10-31',keyResults:[{id:'kr-company',title:'用户增长',weight:100,progress:0,deadline:'2026-10-31',assigneeIds:['manager']}] };
  await okrRepository.create('objective','2026-10',companyPayload,true,'user-admin');
  let records = await okrRepository.records('manager');
  const source = assignedReferences(records, people[1])[0];
  const department: OkrPayload = {...inheritedGoalPayload(source,people[1]),title:'日新增1万',deadline:'2026-10-25',keyResults:[{id:'kr-department',title:'产品V1达到UI设计',structureType:'product',businessObject:'APP',version:'V1',stage:'UI设计',details:[{id:'v1',name:'V1',stage:'UI设计',plannedStartDate:'2026-10-01',plannedEndDate:'2026-10-10'},{id:'v2',name:'V2',stage:'开发',plannedStartDate:'2026-10-11',plannedEndDate:'2026-10-25'}],weight:100,progress:0,deadline:'2026-10-25',assigneeIds:['employee','manager'],executionActions:[{id:'manager-a',ownerId:'manager',title:'设计方案',progress:0,deadline:'2026-10-20'}]}]};
  await okrRepository.create('objective','2026-10',department,true,'manager');
  records = await okrRepository.records('employee');
  expect(records.filter(item=>item.ownerId==='employee')).toHaveLength(0);
  let assigned = assignedReferences(records,people[2])[0];
  expect(assigned.payload.sourceKrData?.details).toHaveLength(2);
  const ownDepartment = records.find(item=>item.ownerId==='manager' && item.kind==='objective')!;
  const revisedPlan = {...ownDepartment.payload, changeReason:'调整交付安排', keyResults:ownDepartment.payload.keyResults?.map(kr=>({...kr,details:kr.details?.map(row=>row.id==='v1'?{...row,plannedStartDate:'2026-10-02',plannedEndDate:'2026-10-12'}:row),executionActions:kr.executionActions?.map(action=>({...action,deadline:'2026-10-23'}))}))};
  await okrRepository.update(ownDepartment,'save',{payload:revisedPlan},'manager');
  const requestedPlan=(await okrRepository.records('user-admin')).find(item=>item.id===ownDepartment.id)!;
  expect(requestedPlan.changeRequest?.reviewerId).toBe('user-admin');
  expect(requestedPlan.payload.keyResults?.[0].details?.[0].plannedEndDate).toBe('2026-10-10');
  await okrRepository.update(requestedPlan,'approve-change',{},'user-admin');
  const approvedPlan=(await okrRepository.records('manager')).find(item=>item.id===ownDepartment.id)!;
  expect(approvedPlan.payload.keyResults?.[0].details?.[0].plannedEndDate).toBe('2026-10-12');
  expect(approvedPlan.payload.keyResults?.[0].executionActions?.[0].deadline).toBe('2026-10-23');
  await okrRepository.update(approvedPlan,'update-progress',{itemId:'manager-a',progress:45,progressStatus:'normal',note:'完成设计核验',attachments:[]},'manager');
  const afterProgress=(await okrRepository.records('manager')).find(item=>item.id===ownDepartment.id)!;
  expect(afterProgress.progressHistory?.[0].note).toBe('完成设计核验');
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.okrRecords')!).find((item:{id:string})=>item.id===ownDepartment.id).progressHistory[0].progress).toBe(45);
  // Restore original plan through the same review workflow before testing new employee acceptance.
  await okrRepository.update(afterProgress,'save',{payload:{...ownDepartment.payload,changeReason:'恢复验收基线'}},'manager');
  const restoration=(await okrRepository.records('user-admin')).find(item=>item.id===ownDepartment.id)!;
  await okrRepository.update(restoration,'approve-change',{},'user-admin');
  assigned = assignedReferences(await okrRepository.records('employee'),people[2])[0];
  const inherited = inheritedGoalPayload(assigned,people[2]);
  const personal: OkrPayload = {...inherited,keyResults:inherited.keyResults?.map(kr=>({...kr,executionActions:[{id:'employee-a',ownerId:'employee',title:'完成设计稿',progress:0,deadline:'2026-10-22'}]}))};
  const tampered = {...personal,keyResults:personal.keyResults?.map(kr=>({...kr,details:kr.details?.map(row=>({...row,stage:'擅自修改'}))}))};
  await expect(okrRepository.create('objective','2026-10',tampered,true,'employee')).rejects.toThrow();
  const created = await okrRepository.create('objective','2026-10',personal,true,'employee');
  records = await okrRepository.records('manager');
  const record = records.find(item=>item.id===created.id)!;
  expect(record.payload.keyResults?.[0].details).toEqual(department.keyResults?.[0].details);
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.okrRecords')!).find((item: {id:string})=>item.id===created.id).payload.keyResults[0].details).toHaveLength(2);
  const change = {...record.payload,changeReason:'外部依赖延期',keyResults:record.payload.keyResults?.map(kr=>({...kr,executionActions:kr.executionActions?.map(action=>({...action,forecastDeadline:'2026-10-26',delayReason:'接口延期'}))}))};
  await okrRepository.update(record,'save',{payload:change},'employee');
  records = await okrRepository.records('manager');
  const pending = records.find(item=>item.id===created.id)!;
  expect(pending.changeRequest?.reviewerId).toBe('manager');
  expect(pending.payload.keyResults?.[0].executionActions?.[0].forecastDeadline).toBeUndefined();
  await okrRepository.update(pending,'approve-change',{},'manager');
  records = await okrRepository.records('employee');
  expect(records.find(item=>item.id===created.id)?.payload.keyResults?.[0].executionActions?.[0]).toMatchObject({plannedDeadline:'2026-10-22',deadline:'2026-10-22',forecastDeadline:'2026-10-26'});
 });
});

it('deletes a saved draft and excludes it on subsequent reads', async () => {
  const draft = await okrRepository.create('objective', '2026-10', {goalModelVersion:2,goalLevel:'company',title:'待删除草稿',keyResults:[]}, false, 'user-admin');
  const record = (await okrRepository.records('user-admin')).find(item => item.id === draft.id)!;
  expect(record.status).toBe('draft');
  await okrRepository.update(record, 'delete', {}, 'user-admin');
  expect((await okrRepository.records('user-admin')).some(item => item.id === draft.id)).toBe(false);
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.okrRecords')!).find((item: {id:string}) => item.id === draft.id).status).toBe('deleted');
});

it('persists department template selections, stages and optional types', async () => {
  const previous = await okrRepository.settings();
  try {
    const templates = [
      {department:'研发',departments:['研发','产品'],type:'product' as const,fields:[],stages:['设计','开发','验收']},
      {department:'交付',departments:['交付'],type:'delivery' as const,fields:[],stages:['启动','交付']},
      {department:'支持',departments:['支持'],type:'support' as const,fields:[],types:[]},
    ];
    await okrRepository.saveSettings({...previous,templates},'user-admin');
    expect((await okrRepository.settings()).templates).toEqual(templates);
  } finally {
    await okrRepository.saveSettings({...previous,version:(await okrRepository.settings()).version},'user-admin');
  }
});
