import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { canAlignPeriod, defaultCycles, materializePeriods, periodBounds } from './okrPeriods';
import { canEditOkr, confirmationReviewer, defaultConfirmation, normalizedPolicy, validatePolicy } from './okrSettingsPolicy';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import { departmentTemplates } from './okrTemplates';
import type { OkrPerson, OkrSettings, OkrPayload, OkrRecord } from './okrRepository';
const people: OkrPerson[] = [{id:'admin',name:'管理员',department:'公司',rootFlag:1,supervisorId:null,version:0},{id:'manager',name:'陈宇璋',department:'产品规划部',rootFlag:0,jobTitle:'主管',supervisorId:'admin',version:0},{id:'employee',name:'员工',department:'产品规划部',rootFlag:0,supervisorId:'manager',version:0}];
const settings = (): OkrSettings => normalizedPolicy({ defaultView:'list',timeRules:[],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:['设计'],deliveryNodes:[],presalesNodes:[],supportTypes:[]},templates:[{department:'产研部门',type:'product',fields:[],stages:['设计']}] },people);
const payload: OkrPayload = {goalModelVersion:2,goalLevel:'department',origin:'autonomous',title:'产品目标',deadline:'2026-10-31',keyResults:[{id:'kr',title:'验收交付',weight:100,progress:0,deadline:'2026-10-31',structureType:'support',businessObject:'协作',action:'完成交付',result:'验收通过',assigneeIds:['employee','manager'],executionActions:[{id:'a',ownerId:'manager',title:'落实交付',deadline:'2026-10-31',progress:0}]}]};
const record: OkrRecord = {id:'goal',kind:'objective',ownerId:'manager',periodKey:'2026-10',status:'active',version:1,payload};
describe('OKR周期与确认配置',()=>{
 it('only allows containing periods, including leap-month and half-year boundaries',()=>{
  expect(periodBounds('2024-02')?.end).toBe('2024-02-29');
  expect(canAlignPeriod('2020-01','2020-Q1',true)).toBe(true);
  expect(canAlignPeriod('2020-Q1','2020',true)).toBe(true);
  expect(canAlignPeriod('2020-06','2020-H1',true)).toBe(true);
  expect(canAlignPeriod('2020-07','2020-H1',true)).toBe(false);
  expect(canAlignPeriod('2020-Q1','2020-01',true)).toBe(false);
  expect(canAlignPeriod('2020-01','2020-Q2',true)).toBe(false);
  expect(canAlignPeriod('2020-01','2020-Q1',false)).toBe(false);
  expect(canAlignPeriod('2020-13','2020',true)).toBe(false);
 });
 it('creates next periods at configured local time once and does not create before the threshold',()=>{
  const config={...defaultCycles(),automatic:true,types:['month' as const]};
  expect(materializePeriods(config,dayjs('2026-10-28T08:59')).periods).toEqual(['2026-10']);
  const due=materializePeriods(config,dayjs('2026-10-28T09:00'));
  expect(due.periods).toEqual(['2026-10','2026-11']);
  expect(materializePeriods(due,dayjs('2026-10-28T10:00'))).toEqual(due);
 });
 it('matches the legacy product template to the real department and prioritizes explicit configuration',()=>{
  const config=settings();
  expect(departmentTemplates(config,people[1].department)[0].type).toBe('product');
  expect(departmentTemplates(config,'未知部门')).toEqual([]);
  config.templates.push({department:'产品规划部',type:'support',fields:[],types:['运营']});
  expect(departmentTemplates(config,people[1].department).map(t=>t.type)).toEqual(['support']);
 });
 it('applies action, target type, exemptions and missing/self supervisor fallbacks',()=>{
  const config=settings();
  expect(confirmationReviewer(people[1],'create',payload,config,people)).toBe('admin');
  expect(confirmationReviewer(people[1],'delete',payload,config,people)).toBeUndefined();
  config.confirmation!.types=['challenge'];
  expect(confirmationReviewer(people[1],'create',payload,config,people)).toBeUndefined();
  config.confirmation=defaultConfirmation(); config.confirmation.exemptIds=['manager'];
  expect(confirmationReviewer(people[1],'update',payload,config,people)).toBeUndefined();
  config.confirmation.exemptIds=[];
  expect(confirmationReviewer({...people[1],supervisorId:null},'create',payload,config,people)).toBe('admin');
  expect(confirmationReviewer({...people[1],supervisorId:'manager'},'create',payload,config,people)).toBeUndefined();
  config.confirmation.enabled=false;
  expect(confirmationReviewer(people[1],'update',payload,config,people)).toBeUndefined();
 });
 it('queues a delete without removing the target and deletes only after reviewer approval',()=>{
  const config=settings(); config.confirmation!.actions.push('delete');
  const pending=mutateOkrLifecycle(record.id,{action:'delete',viewerId:'manager',version:1},[record],people,config)!;
  const next=pending.records[0];
  expect(next.status).toBe('active');expect(next.changeRequest?.purpose).toBe('delete');
  expect(()=>mutateOkrLifecycle(next.id,{action:'approve-change',viewerId:'employee',version:next.version},pending.records,people,config)).toThrow();
  const approved=mutateOkrLifecycle(next.id,{action:'approve-change',viewerId:'admin',version:next.version},pending.records,people,config)!;
  expect(approved.records[0].status).toBe('deleted');
  expect(approved.records[0].changeHistory?.[0].status).toBe('approved');
 });
 it('allows an authorized company editor without changing ownership and prevents other access',()=>{
  const config=settings();config.confirmation!.companyEditorIds=['employee'];
  const company={...record,ownerId:'admin',payload:{...payload,goalLevel:'company' as const,keyResults:[{id:'kr',title:'公司目标',weight:100,progress:0,deadline:'2026-10-31',assigneeIds:['manager']}]}};
  expect(canEditOkr(company,'employee',config,people)).toBe(true);
  expect(canEditOkr(record,'employee',config,people)).toBe(false);
  expect(()=>mutateOkrLifecycle(company.id,{action:'save',viewerId:'manager',version:1,payload:company.payload},[company],people,config)).toThrow();
  const saved=mutateOkrLifecycle(company.id,{action:'save',viewerId:'employee',version:1,payload:{...company.payload,title:'授权修改'}},[company],people,config)!;
  expect(saved.records[0].ownerId).toBe('admin');expect(saved.records[0].payload.title).toBe('授权修改');
 });
 it('rejects removing the last administrator and an invalid schedule',()=>{
  const config=settings();config.administratorIds=[];expect(validatePolicy(config,people)).toContain('管理员');
  config.administratorIds=['admin'];config.cycles!.schedules.month.time='25:00';expect(validatePolicy(config,people)).toContain('时间');
 });
 it('enforces cross-period alignment in mutations and blocks same-size mismatched quarters',()=>{
  const source={...record,id:'source',ownerId:'admin',periodKey:'2026-Q4',payload:{title:'季度方向',goalModelVersion:2 as const,goalLevel:'company' as const,deadline:'2026-12-31',keyResults:[]}};
  const config=settings();config.cycles!.crossAlignment=true;config.confirmation!.enabled=false;
  const aligned={...payload,sourceObjectiveId:'source',sourceVersion:1};
  const created=mutateOkrLifecycle(undefined,{kind:'objective',viewerId:'manager',periodKey:'2026-10',payload:aligned},[source],people,config)!;
  expect(created.records.at(-1)?.status).toBe('active');
  config.cycles!.crossAlignment=false;
  expect(()=>mutateOkrLifecycle(undefined,{kind:'objective',viewerId:'manager',periodKey:'2026-10',payload:aligned},[source],people,config)).toThrow('只能对齐');
 });
});
