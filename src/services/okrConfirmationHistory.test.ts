import {describe,it,expect} from 'vitest';
import {restoreReturnedInitialDraft} from './okrSubmissionState';
import {mutateOkrLifecycle} from './mockOkrLifecycle';
import type {OkrPerson,OkrRecord} from './okrRepository';
const people:OkrPerson[]=[{id:'boss',name:'管理员',rootFlag:1,department:'管理部',supervisorId:null,version:1},{id:'manager',name:'主管甲',jobTitle:'产品主管',rootFlag:0,department:'产品部',supervisorId:'boss',version:1}];
const record:OkrRecord={id:'goal',kind:'objective',ownerId:'manager',periodKey:'2026-10',status:'active',version:2,payload:{title:'原目标',weight:40},changeRequest:{id:'c',purpose:'update',status:'pending',reviewerId:'boss',baseVersion:1,requestedAt:'2026-10-12',reason:'调整指标',payload:{title:'修改目标',weight:60}}};
describe('approval history snapshots',()=>{
 it('rejects then edits and resubmits exactly one initial draft without touching its sibling',()=>{
 const payload={title:'主管目标',goalModelVersion:2 as const,goalLevel:'department' as const,origin:'autonomous' as const,weight:50,deadline:'2026-10-31',keyResults:[{id:'k',title:'服务响应',structureType:'support' as const,businessObject:'服务',action:'响应',result:'完成',weight:100,progress:0,deadline:'2026-10-31'}]};
 const first={...record,status:'submitted',payload,changeRequest:{...record.changeRequest!,purpose:'initial' as const,payload}};const sibling={...record,id:'sibling',status:'draft',payload:{...payload,title:'另一个草稿'},changeRequest:undefined};
 const rejected=mutateOkrLifecycle(first.id,{viewerId:'boss',action:'return-change',version:2,feedback:'补充指标'},[first,sibling],people)!;
 const draft=rejected.records[0];expect(draft.status).toBe('draft');
 const saved=mutateOkrLifecycle(first.id,{viewerId:'manager',action:'save',version:draft.version,payload:{...payload,title:'补全后的主管目标'}},rejected.records,people)!;
 expect(saved.records[0].payload.title).toBe('补全后的主管目标');expect(saved.records[0].status).toBe('draft');
 const resubmitted=mutateOkrLifecycle(first.id,{viewerId:'manager',action:'submit',version:saved.records[0].version,payload:saved.records[0].payload},saved.records,people)!;
 expect(resubmitted.records[0]).toMatchObject({status:'submitted',changeRequest:{status:'pending',purpose:'initial'},payload:{title:'补全后的主管目标'}});expect(resubmitted.records[0].changeHistory![0].feedback).toBe('补充指标');expect(resubmitted.records[1]).toEqual(sibling);
 });
 it('restores initial rejection to an editable draft and retains audit history',()=>{
 const initial={...record,status:'submitted',changeRequest:{...record.changeRequest!,purpose:'initial' as const,payload:{...record.changeRequest!.payload,origin:'autonomous' as const}}};
 const returned=mutateOkrLifecycle('goal',{viewerId:'boss',action:'return-change',version:2,feedback:'补全动作'},[initial],people)!.records[0];
 expect(returned.status).toBe('draft');expect(returned.payload.title).toBe('修改目标');expect(returned.changeHistory![0].status).toBe('returned');expect(returned.changeRequest!.payload.title).toBe('修改目标');
 expect(restoreReturnedInitialDraft({...returned,status:'submitted'})).toMatchObject({status:'draft',payload:{title:'修改目标'}});
 expect(restoreReturnedInitialDraft({...record,changeRequest:{...record.changeRequest!,status:'returned'}}).status).toBe('active');
 });
 it('persists approval, feedback and the previous payload without changing original snapshot',()=>{
 const result=mutateOkrLifecycle('goal',{viewerId:'boss',action:'approve-change',version:2,feedback:'确认执行'},[record],people)!;
 expect(result.records[0].payload.title).toBe('修改目标');expect(result.records[0].changeHistory).toHaveLength(1);expect(result.records[0].changeHistory![0]).toMatchObject({status:'approved',feedback:'确认执行',previousPayload:{title:'原目标',weight:40},payload:{title:'修改目标',weight:60}});expect(record.payload.title).toBe('原目标');
 });
 it('returns with suggestion and preserves effective content and complete history',()=>{
 const result=mutateOkrLifecycle('goal',{viewerId:'boss',action:'return-change',version:2,feedback:'补充目标指标'},[record],people)!;expect(result.records[0].payload).toEqual(record.payload);expect(result.records[0].changeHistory![0]).toMatchObject({status:'returned',feedback:'补充目标指标',previousPayload:record.payload});
 });
 it('rejects stale and unauthorized decisions before writing history',()=>{
 expect(()=>mutateOkrLifecycle('goal',{viewerId:'boss',action:'approve-change',version:1},[record],people)).toThrow('目标已被更新');expect(()=>mutateOkrLifecycle('goal',{viewerId:'manager',action:'approve-change',version:2},[record],people)).toThrow('无权审核');expect(record.changeHistory).toBeUndefined();
 });
});
