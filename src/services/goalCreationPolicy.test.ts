import { describe, expect, it } from 'vitest';
import { creationSources, creationPeriodError, unusedDepartmentTemplates } from './goalCreationPolicy';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import type { OkrRecord, OkrSettings, OkrPerson, OkrPayload } from './okrRepository';
const people: OkrPerson[] = [{id:'boss',name:'老板',department:'公司',rootFlag:1,supervisorId:null,version:1},{id:'manager',name:'经理',department:'研发',jobTitle:'研发主管',rootFlag:0,supervisorId:'boss',version:1},{id:'staff',name:'员工',department:'研发',rootFlag:0,supervisorId:'manager',version:1}];
const company:OkrRecord={id:'company',kind:'objective',ownerId:'boss',periodKey:'2026-10',status:'active',version:1,payload:{title:'公司O',goalLevel:'company',keyResults:[{id:'ck',title:'公司KR',weight:100,progress:0,assigneeIds:['manager']}]}};
const department:OkrRecord={...company,id:'dept',ownerId:'manager',payload:{title:'部门O',goalLevel:'department',objectiveTitleTemplateId:'t1',keyResults:[{id:'dk',title:'部门KR',weight:100,progress:0,assigneeIds:['staff','manager']}]}};
const settings:OkrSettings={defaultView:'list',timeRules:[],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:[]},templates:[],objectiveTitleTemplates:[1,2,3].map(i=>({id:'t'+i,title:'模板'+i,department:'研发',enabled:true,guidance:'',krTypes:['support']}))};
describe('goal creation policy',()=>{
 it('limits periods to effective upstream goals and uses department goals for manager personal goals',()=>{
  const records=[company,department,{...company,id:'nov',periodKey:'2026-11'},{...department,id:'draft',status:'draft',periodKey:'2026-12'}];
  expect(creationSources(records,people[1],'department',people).map(r=>r.periodKey)).toEqual(['2026-10','2026-11']);
  expect(creationSources(records,people[1],'personal',people).map(r=>r.id)).toEqual(['dept']);
  expect(creationSources(records,people[2],'personal',people).map(r=>r.id)).toEqual(['dept']);
  expect(creationPeriodError(records,people[1],'department',people,'2026-12')).toBe('公司级目标还未提交，暂时无法添加目标');
  expect(creationPeriodError(records,people[2],'personal',people,'2026-11')).toBe('部门级目标还未提交，暂时无法添加目标');
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

it('approves a manager personal goal aligned to the department without losing the action',()=>{
 const payload:OkrPayload={title:'完成个人工作',goalModelVersion:2,goalLevel:'personal',origin:'autonomous',sourceObjectiveId:'dept',sourceKrId:'dk',sourceVersion:1,weight:100,deadline:'2026-10-31',keyResults:[{id:'mine',title:'完成个人工作',weight:100,progress:0,deadline:'2026-10-31',assigneeIds:['manager'],executionActions:[{id:'a',ownerId:'manager',title:'完成个人工作',weight:100,progress:0,deadline:'2026-10-31'}]}]};
 const created=mutateOkrLifecycle(undefined,{viewerId:'manager',periodKey:'2026-10',submit:true,payload},[company,department],people,settings)!;
 const pending=created.records.at(-1)!;
 const approved=mutateOkrLifecycle(pending.id,{viewerId:'boss',version:pending.version,action:'approve-change'},created.records,people,settings)!;
 expect(approved.records.at(-1)?.status).toBe('active');
 expect(approved.records.at(-1)?.payload.keyResults?.[0].executionActions?.[0].title).toBe('完成个人工作');
});
