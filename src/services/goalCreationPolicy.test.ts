import { describe, expect, it } from 'vitest';
import { creationSources, creationPeriodError, unusedDepartmentTemplates, departmentCreationPayloads, challengeReferences } from './goalCreationPolicy';
import { assignedReferences } from './okrThreeLevelRules';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import type { OkrRecord, OkrSettings, OkrPerson, OkrPayload } from './okrRepository';
const people: OkrPerson[] = [{id:'boss',name:'老板',department:'公司',rootFlag:1,supervisorId:null,version:1},{id:'manager',name:'经理',department:'研发',jobTitle:'研发主管',rootFlag:0,supervisorId:'boss',version:1},{id:'staff',name:'员工',department:'研发',rootFlag:0,supervisorId:'manager',version:1}];
const company:OkrRecord={id:'company',kind:'objective',ownerId:'boss',periodKey:'2026-10',status:'active',version:1,payload:{title:'公司O',goalLevel:'company',keyResults:[{id:'ck',title:'公司KR',weight:100,progress:0,assigneeIds:['manager']}]}};
const department:OkrRecord={...company,id:'dept',ownerId:'manager',payload:{title:'部门O',goalLevel:'department',objectiveTitleTemplateId:'t1',keyResults:[{id:'dk',title:'部门KR',weight:100,progress:0,assigneeIds:['staff','manager']}]}};
const settings:OkrSettings={defaultView:'list',timeRules:[],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:[]},templates:[],objectiveTitleTemplates:[1,2,3].map(i=>({id:'t'+i,title:'模板'+i,department:'研发',enabled:true,guidance:'',krTypes:['support']}))};
describe('goal creation policy',()=>{
 it('keeps distinct KR sources across multiple objectives, saves them independently and avoids regenerating accepted sources',()=>{
  const second: OkrRecord = {...company,id:'company2',payload:{...company.payload,keyResults:[{id:'ck2',title:'第二公司KR',weight:100,progress:0,assigneeIds:['manager']}]}};
  const third: OkrRecord = {...company,id:'company3',payload:{...company.payload,keyResults:[{id:'ck3',title:'第三公司KR',weight:100,progress:0,assigneeIds:['manager']}]}};
  const config = {...settings,objectiveTitleTemplates:settings.objectiveTitleTemplates!.slice(0,1)};
  let records = [company, second, third];
  const refs = assignedReferences(records,people[1]);
  const payloads = departmentCreationPayloads(config,records,people[1],'2026-10',people,refs);
  expect(payloads.map(payload=>payload.sourceKrId)).toEqual(['ck','ck2','ck3']);
  expect(payloads.filter(payload=>payload.objectiveTitleTemplateId)).toHaveLength(3);
  for(const [i,payload] of payloads.entries()) records=mutateOkrLifecycle(undefined,{viewerId:'manager',periodKey:'2026-10',submit:false,payload:{...payload,title:payload.title || '独立承接'+i}},records,people,config)!.records;
  expect(records.filter(record=>record.ownerId==='manager').map(record=>record.payload.sourceObjectiveId)).toEqual(['company','company2','company3']);
  expect(departmentCreationPayloads(config,records,people[1],'2026-10',people,refs)).toEqual([]);
 });
 it('creates one承诺型 O for every unused template under every assigned KR',()=>{
  const second: OkrRecord = {...company,id:'company2',payload:{...company.payload,keyResults:[{id:'ck2',title:'第二公司KR',weight:100,progress:0,assigneeIds:['manager']}]}};
  const refs = assignedReferences([company, second], people[1]);
  const payloads = departmentCreationPayloads(settings, [company, second], people[1], '2026-10', people, refs);
  expect(payloads).toHaveLength(6);
  expect(payloads.map(payload => `${payload.sourceKrId}:${payload.objectiveTitleTemplateId}`)).toEqual(['ck:t1','ck:t2','ck:t3','ck2:t1','ck2:t2','ck2:t3']);
  expect(payloads.every(payload => payload.objectiveType === 'target')).toBe(true);
  const partial = payloads.filter(payload => !(['ck:t3','ck2:t2','ck2:t3'] as string[]).includes(`${payload.sourceKrId}:${payload.objectiveTitleTemplateId}`));
  expect(departmentCreationPayloads(settings, partial.map((payload, index) => ({ id:`used-${index}`, kind:'objective' as const, ownerId:'manager', periodKey:'2026-10', status:'draft' as const, version:1, payload })), people[1], '2026-10', people, refs).map(payload => `${payload.sourceKrId}:${payload.objectiveTitleTemplateId}`)).toEqual(['ck:t3','ck2:t2','ck2:t3']);
 });
 it('limits periods to effective upstream goals and uses department goals for manager personal goals',()=>{
  const records=[company,department,{...company,id:'nov',periodKey:'2026-11'},{...department,id:'draft',status:'draft',periodKey:'2026-12'}];
  expect(creationSources(records,people[1],'department',people).map(r=>r.periodKey)).toEqual(['2026-10','2026-11']);
  expect(creationSources(records,people[1],'personal',people).map(r=>r.id)).toEqual(['dept']);
  expect(creationSources(records,people[2],'personal',people).map(r=>r.id)).toEqual(['dept']);
  expect(creationPeriodError(records,people[1],'department',people,'2026-12')).toBe('公司级目标还未提交，暂时无法添加目标');
  expect(creationPeriodError(records,people[2],'personal',people,'2026-11')).toBe('个人月度目标由部门指派，无需自行添加');
 });
 it('reserves templates across KR sources and statuses, releases deleted records and separates periods',()=>{
  const records=[department,{...department,id:'second',status:'draft',payload:{...department.payload,sourceKrId:'another',objectiveTitleTemplateId:'t2'}},{...department,id:'old',status:'deleted',payload:{...department.payload,objectiveTitleTemplateId:'t3'}}];
  expect(unusedDepartmentTemplates(settings,records,people[1],'2026-10',people).map(t=>t.id)).toEqual(['t3']);
  expect(unusedDepartmentTemplates(settings,records,people[1],'2026-11',people)).toHaveLength(3);
  expect(unusedDepartmentTemplates(settings,[...records,{...department,id:'third',status:'submitted',payload:{...department.payload,objectiveTitleTemplateId:'t3'}}],people[1],'2026-10',people)).toEqual([]);
 });
 it('blocks mutation when upstream is not submitted and rechecks template occupancy',()=>{
  const payload:OkrPayload={title:'模板1',goalModelVersion:2,goalLevel:'department',origin:'autonomous',objectiveType:'target',objectiveTitleTemplateId:'t1',keyResults:[]};
  expect(()=>mutateOkrLifecycle(undefined,{viewerId:'manager',periodKey:'2026-10',submit:false,payload},[],people,settings)).toThrow('公司级目标还未提交');
  expect(()=>mutateOkrLifecycle(undefined,{viewerId:'manager',periodKey:'2026-10',submit:false,payload},[company,department],people,settings)).toThrow('O 模板已占用');
 });
 it('allows multiple department challenges without reserving a template',()=>{
  const payload:OkrPayload={title:'挑战目标',goalModelVersion:2,goalLevel:'department',origin:'autonomous',objectiveType:'challenge',sourceObjectiveId:'company',sourceKrId:'ck',sourceVersion:1,keyResults:[]};
  const one=mutateOkrLifecycle(undefined,{viewerId:'manager',periodKey:'2026-10',submit:false,payload},[company],people,settings)!;
  const two=mutateOkrLifecycle(undefined,{viewerId:'manager',periodKey:'2026-10',submit:false,payload:{...payload,title:'第二挑战'}},one.records,people,settings)!;
  expect(two.records.filter(r=>r.ownerId==='manager')).toHaveLength(2);
  expect(unusedDepartmentTemplates(settings,two.records,people[1],'2026-10',people)).toHaveLength(3);
 });
});

it('blocks manager personal creation even with a department source',()=>{
 const payload:OkrPayload={title:'完成个人工作',goalModelVersion:2,goalLevel:'personal',origin:'autonomous',sourceObjectiveId:'dept',sourceKrId:'dk',sourceVersion:1};
 expect(()=>mutateOkrLifecycle(undefined,{viewerId:'manager',periodKey:'2026-10',submit:true,payload},[company,department],people,settings)).toThrow('无需自行添加');
});

it('keeps each assigned KR available for challenges even after draft or submitted goals exist',()=>{
 const source={...company,payload:{...company.payload,keyResults:[company.payload.keyResults![0],{...company.payload.keyResults![0],id:'second',title:'第二指派'},{...company.payload.keyResults![0],id:'other',assigneeIds:['staff']}]}};
 const used={...department,status:'draft' as const,payload:{...department.payload,sourceObjectiveId:'company',sourceKrId:'ck'}};
 const candidates=challengeReferences([source,used],people[1],'department',people,'2026-10',settings);
 expect(candidates.map(row=>row.value)).toEqual(['company:ck','company:second']);
 expect(candidates[1].alignment).toMatchObject({sourceObjectiveId:'company',sourceKrId:'second',sourceVersion:1});
 expect(challengeReferences([source,used],people[1],'department',people,'2026-11',settings)).toEqual([]);
 expect(challengeReferences([department],people[1],'personal',people,'2026-10',settings).map(row=>row.value)).toEqual(['dept:dk']);
});
