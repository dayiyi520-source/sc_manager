import { describe, expect, it } from 'vitest';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import type { OkrPerson, OkrRecord } from './okrRepository';
const people: OkrPerson[] = [{id:'owner',name:'主管',department:'研发',supervisorId:'boss',rootFlag:0,version:1},{id:'boss',name:'管理员',department:'公司',supervisorId:null,rootFlag:1,version:1}];
const record: OkrRecord = {id:'goal',kind:'objective',ownerId:'owner',periodKey:'2026-10',status:'active',version:2,payload:{title:'生效内容'},changeRequest:{id:'change',purpose:'update',status:'pending',payload:{title:'提交内容'},reason:'调整',reviewerId:'boss',baseVersion:1,requestedAt:'2026-10-12'}};
describe('撤回目标确认', () => {
  it('restores an initial submission to draft and retains the submitted content', () => {
    const pending: OkrRecord = {...record,status:'submitted',changeRequest:{...record.changeRequest!,purpose:'initial'}};
    const result = mutateOkrLifecycle('goal',{action:'withdraw-change',viewerId:'owner',version:2},[pending],people)!;
    expect(result.records[0]).toMatchObject({status:'draft',payload:{title:'提交内容'},version:3});
    expect(result.records[0].changeRequest).toBeUndefined();
    expect(result.records[0].changeHistory?.[0].feedback).toBe('申请人撤回');
  });
  it.each(['update','delete'] as const)('keeps effective content when withdrawing %s', purpose => {
    const pending = {...record,changeRequest:{...record.changeRequest!,purpose}};
    const result = mutateOkrLifecycle('goal',{action:'withdraw-change',viewerId:'owner',version:2},[pending],people)!;
    expect(result.records[0]).toMatchObject({status:'active',payload:{title:'生效内容'},version:3});
    expect(result.records[0].changeRequest).toBeUndefined();
  });
  it('rejects other users, stale versions and duplicate withdrawal', () => {
    expect(()=>mutateOkrLifecycle('goal',{action:'withdraw-change',viewerId:'boss',version:2},[record],people)).toThrow();
    expect(()=>mutateOkrLifecycle('goal',{action:'withdraw-change',viewerId:'owner',version:1},[record],people)).toThrow();
    expect(()=>mutateOkrLifecycle('goal',{action:'withdraw-change',viewerId:'owner',version:2},[{...record,changeRequest:undefined}],people)).toThrow('没有待审核申请');
  });
});
