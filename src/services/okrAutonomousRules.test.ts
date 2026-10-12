import { describe, expect, it } from 'vitest';
import { assignedReferences, autonomousGoalPayload, inheritedGoalPayload, goalsWithAssignments, upstreamReadiness } from './okrThreeLevelRules';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import { MOCK_OKR_PEOPLE, MOCK_OKR_RECORDS } from '../data/mockSnapshot';
import type { OkrPerson, OkrRecord, OkrPayload } from './okrRepository';
const people:OkrPerson[]=[{id:'user-admin',name:'林志豪',rootFlag:1,department:'公司',supervisorId:null,version:0},{id:'manager',name:'主管',jobTitle:'产品主管',rootFlag:0,department:'研发',supervisorId:'user-admin',version:0},{id:'employee',name:'员工',department:'研发',rootFlag:0,supervisorId:'manager',version:0}];
const own = (level:'department'|'personal'):OkrPayload=>({...autonomousGoalPayload(people[level==='department'?1:2]),title:'本月工作目标',deadline:'2026-09-30',keyResults:[{id:'kr-own',title:'本月工作结果',structureType:'support',businessObject:'服务响应',action:'支持',result:'完成',weight:100,progress:0,deadline:'2026-09-30',assigneeIds:[level==='department'?'manager':'employee'],executionActions:[{id:'a',ownerId:level==='department'?'manager':'employee',title:'完成本月工作',weight:100,progress:0,deadline:'2026-09-25'}]}]});
const company:OkrRecord={id:'company',kind:'objective',ownerId:'user-admin',periodKey:'2026-09',status:'active',version:1,payload:{title:'公司方向',deadline:'2026-09-30',keyResults:[{id:'kr1',title:'方向一',deadline:'2026-09-30',weight:50,progress:0,assigneeIds:['manager']},{id:'kr2',title:'方向二',deadline:'2026-09-30',weight:50,progress:0,assigneeIds:['manager']}]}};
describe('自主目标与历史承接规则',()=>{
 it('allows no-assignment independent goals but does not activate them before approval',()=>{
  const created=mutateOkrLifecycle(undefined,{kind:'objective',periodKey:'2026-09',viewerId:'manager',payload:own('department'),submit:true},[],people)!;
  const record=created.records[0];expect(record.status).toBe('submitted');expect(record.changeRequest).toMatchObject({purpose:'initial',reviewerId:'user-admin',status:'pending'});
  const departmentWithAssignment={...record,payload:{...record.payload,keyResults:record.payload.keyResults?.map(kr=>({...kr,assigneeIds:['employee']}))}};
  expect(assignedReferences([departmentWithAssignment],people[2])).toEqual([]);
  const approved=mutateOkrLifecycle(record.id,{viewerId:'user-admin',action:'approve-change',version:record.version},created.records,people)!;
  expect(approved.records[0].status).toBe('active');expect(approved.records[0].payload.plannedDeadline).toBe('2026-09-30');
 });
 it('supports employee autonomous O/A with approval by manager and later update review',()=>{
  const created=mutateOkrLifecycle(undefined,{kind:'objective',periodKey:'2026-09',viewerId:'employee',payload:own('personal'),submit:true},[],people)!;
  const record=created.records[0];expect(record.changeRequest?.reviewerId).toBe('manager');
  const approved=mutateOkrLifecycle(record.id,{viewerId:'manager',action:'approve-change',version:record.version},created.records,people)!;
  const live=approved.records[0];const changed=mutateOkrLifecycle(live.id,{viewerId:'employee',action:'save',version:live.version,payload:{...live.payload,title:'修改目标',changeReason:'范围调整'}},approved.records,people)!;
  expect(changed.records[0].status).toBe('active');expect(changed.records[0].payload.title).toBe('本月工作目标');expect(changed.records[0].changeRequest?.purpose).toBe('update');
 });
 it('lists all pending assigned KR and keeps a saved acceptance out of pending placeholders',()=>{
  const all=goalsWithAssignments([company],people[1]);expect(all.filter(r=>r.payload.inherited)).toHaveLength(2);
  const ref=assignedReferences([company],people[1])[0];const accepted:OkrRecord={id:'saved',kind:'objective',ownerId:'manager',periodKey:'2026-09',status:'draft',version:0,payload:{...inheritedGoalPayload(ref,people[1]),inherited:false,title:'部门指标'}};
  expect(goalsWithAssignments([company,accepted],people[1]).filter(r=>r.payload.inherited)).toHaveLength(1);
 });
 it('resolves actual September Chen to Mao assignments from legacy action records',()=>{
  const person=MOCK_OKR_PEOPLE.find(p=>p.name==='毛景强'&&p.id!=='user-product-member')!;
  const refs=assignedReferences(MOCK_OKR_RECORDS as OkrRecord[],person).filter(r=>r.periodKey==='2026-09');
  expect(refs.length).toBeGreaterThan(0);expect(refs.every(r=>r.ownerId==='user-product')).toBe(true);
  expect(inheritedGoalPayload(refs[0],person).title).toBe('测试2');
 });
 it('distinguishes upstream draft, active but unassigned, and assigned without exposing draft content',()=>{
  expect(upstreamReadiness([{...company,status:'draft'}],people[1],'2026-09')).toContain('尚未生效');
  expect(upstreamReadiness([{...company,payload:{...company.payload,keyResults:[]}}],people[1],'2026-09')).toContain('当前没有指派');
  expect(upstreamReadiness([company],people[1],'2026-09')).toContain('已有指派');
 });
 it('requires explicit active manual alignment and can reject a request with a suggested source',()=>{
  const created=mutateOkrLifecycle(undefined,{kind:'objective',periodKey:'2026-09',viewerId:'manager',payload:own('department'),submit:true},[company],people)!;const record=created.records.at(-1)!;
  const returned=mutateOkrLifecycle(record.id,{viewerId:'user-admin',action:'return-change',version:record.version,feedback:'补充对齐',suggestedSource:'company:kr1'},created.records,people)!;
  expect(returned.records.at(-1)?.changeRequest?.payload.reviewerSuggestedSource).toBe('company:kr1');
  expect(()=>mutateOkrLifecycle(undefined,{kind:'objective',periodKey:'2026-09',viewerId:'manager',payload:{...own('department'),sourceObjectiveId:'company',sourceVersion:0},submit:true},[company],people)).toThrow('来源已更新');
 });
 it('adding alignment to an approved autonomous goal keeps actions and plan until approval',()=>{
  const created=mutateOkrLifecycle(undefined,{kind:'objective',periodKey:'2026-09',viewerId:'manager',payload:own('department'),submit:true},[company],people)!;const record=created.records.at(-1)!;
  const approved=mutateOkrLifecycle(record.id,{viewerId:'user-admin',action:'approve-change',version:record.version},created.records,people)!;const live=approved.records.at(-1)!;
  const linked=mutateOkrLifecycle(live.id,{viewerId:'manager',action:'save',version:live.version,payload:{...live.payload,sourceObjectiveId:'company',sourceKrId:'kr1',sourceVersion:1,sourceTitle:'方向一',changeReason:'后补关联'}},approved.records,people)!;
  expect(linked.records.at(-1)?.changeRequest?.purpose).toBe('alignment');expect(linked.records.at(-1)?.payload.sourceKrId).toBeUndefined();
  const final=mutateOkrLifecycle(live.id,{viewerId:'user-admin',action:'approve-change',version:linked.records.at(-1)!.version},linked.records,people)!;
  expect(final.records.at(-1)?.payload.keyResults).toEqual(live.payload.keyResults);expect(final.records.at(-1)?.payload.sourceKrId).toBe('kr1');
 });
 it('rejects another acceptance while an existing autonomous goal is awaiting association confirmation',()=>{
  const created=mutateOkrLifecycle(undefined,{kind:'objective',periodKey:'2026-09',viewerId:'manager',payload:own('department'),submit:true},[company],people)!;
  const initial=created.records.at(-1)!;
  const approved=mutateOkrLifecycle(initial.id,{viewerId:'user-admin',action:'approve-change',version:initial.version},created.records,people)!;
  const live=approved.records.at(-1)!;
  const linked=mutateOkrLifecycle(live.id,{viewerId:'manager',action:'save',version:live.version,payload:{...live.payload,sourceObjectiveId:'company',sourceKrId:'kr1',sourceVersion:1,changeReason:'关联本人指派'}},approved.records,people)!;
  expect(goalsWithAssignments(linked.records,people[1]).filter(record=>record.payload.inherited && record.payload.sourceKrId==='kr1')).toHaveLength(0);
  expect(()=>mutateOkrLifecycle(undefined,{kind:'objective',periodKey:'2026-09',viewerId:'manager',payload:{...own('department'),sourceObjectiveId:'company',sourceKrId:'kr1',sourceVersion:1},submit:false},linked.records,people)).toThrow('正在关联确认');
 });

 it('source sync keeps the employee baseline and actions, and rejects a source from a different supervisor',()=>{
  const upstream:OkrRecord={...company,id:'department',ownerId:'manager',payload:{title:'部门目标',keyResults:[{id:'dept-kr',title:'更新的部门结果',deadline:'2026-09-30',weight:100,progress:50,assigneeIds:['employee']}]},version:2};
  const assigned=inheritedGoalPayload(assignedReferences([upstream],people[2])[0],people[2]);
  const record:OkrRecord={id:'personal',kind:'objective',ownerId:'employee',periodKey:'2026-09',status:'active',version:1,payload:{...assigned,inherited:false,title:'之前结果',sourceVersion:1,deadline:'2026-09-25',plannedDeadline:'2026-09-25',keyResults:[{...assigned.keyResults![0],title:'之前结果',deadline:'2026-09-25',plannedDeadline:'2026-09-25',executionActions:[{id:'a',ownerId:'employee',title:'保留动作',weight:100,progress:20,deadline:'2026-09-24'}]}]}};
  const synced=mutateOkrLifecycle(record.id,{viewerId:'employee',action:'acknowledge-source',version:1},[upstream,record],people)!.records.at(-1)!;
  expect(synced.payload).toMatchObject({title:'更新的部门结果',plannedDeadline:'2026-09-25'});
  expect(synced.payload.keyResults![0]).toMatchObject({deadline:'2026-09-25',plannedDeadline:'2026-09-25',weight:100,progress:0,executionActions:record.payload.keyResults![0].executionActions});
  expect(()=>mutateOkrLifecycle(record.id,{viewerId:'employee',action:'acknowledge-source',version:1},[{...upstream,ownerId:'user-admin'},record],people)).toThrow('不再指派');
 });

});
