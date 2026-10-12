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
  const department: OkrPayload = {...inheritedGoalPayload(source,people[1]),title:'日新增1万',deadline:'2026-10-25',keyResults:[{id:'kr-department',title:'产品V1达到UI设计',structureType:'product',businessObject:'APP',version:'V1',stage:'UI设计',weight:100,progress:0,deadline:'2026-10-25',assigneeIds:['employee','manager'],executionActions:[{id:'manager-a',ownerId:'manager',title:'设计方案',progress:0,deadline:'2026-10-20'}]}]};
  await okrRepository.create('objective','2026-10',department,true,'manager');
  records = await okrRepository.records('employee');
  const assigned = assignedReferences(records,people[2])[0];
  const inherited = inheritedGoalPayload(assigned,people[2]);
  const personal: OkrPayload = {...inherited,keyResults:inherited.keyResults?.map(kr=>({...kr,executionActions:[{id:'employee-a',ownerId:'employee',title:'完成设计稿',progress:0,deadline:'2026-10-22'}]}))};
  const created = await okrRepository.create('objective','2026-10',personal,true,'employee');
  records = await okrRepository.records('manager');
  const record = records.find(item=>item.id===created.id)!;
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
