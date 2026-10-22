import { describe, expect, it } from 'vitest';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import type { OkrPerson, OkrRecord } from './okrRepository';
const people: OkrPerson[] = [{id:'owner',name:'主管',department:'研发',supervisorId:'boss',rootFlag:0,version:1},{id:'boss',name:'管理员',department:'公司',supervisorId:null,rootFlag:1,version:1}];
const record: OkrRecord = {id:'goal',kind:'objective',ownerId:'owner',periodKey:'2026-10',status:'active',version:2,payload:{title:'生效内容'},changeRequest:{id:'change',purpose:'update',status:'pending',payload:{title:'提交内容'},reason:'调整',reviewerId:'boss',baseVersion:1,requestedAt:'2026-10-12'}};
describe('撤回目标确认', () => {
  it('allows the owner to sync a read-only assignment while preserving their existing plan', () => {
    const source: OkrRecord = { ...record, id: 'source', ownerId: 'boss', version: 3, changeRequest: undefined, payload: { title: '上级目标', deadline: '2026-10-15', keyResults: [{ id: 'kr', title: '更新后的结果', weight: 100, progress: 0, deadline: '2026-10-15', assigneeIds: ['owner'] }] } };
    const assigned: OkrRecord = { ...record, changeRequest: undefined, payload: { title: '原结果', goalModelVersion: 2, goalLevel: 'personal', origin: 'assigned', sourceObjectiveId: 'source', sourceKrId: 'kr', sourceVersion: 1, deadline: '2026-10-31', keyResults: [{ id: 'kr', title: '原结果', weight: 100, progress: 0, deadline: '2026-10-31', executionActions: [{ id: 'a', title: '已有计划', ownerId: 'owner', progress: 0, deadline: '2026-10-30' }] }] } };
    const result = mutateOkrLifecycle(assigned.id, { action: 'acknowledge-source', viewerId: 'owner', version: assigned.version }, [source, assigned], people)!;
    const saved = JSON.parse(JSON.stringify(result.records)) as OkrRecord[];
    expect(saved[1].payload).toMatchObject({ title: '更新后的结果', sourceVersion: 3, sourceKrData: { title: '更新后的结果' }, deadline: '2026-10-31' });
    expect(saved[1].payload.keyResults?.[0].executionActions).toEqual(assigned.payload.keyResults?.[0].executionActions);
    expect(() => mutateOkrLifecycle(assigned.id, { action: 'acknowledge-source', viewerId: 'boss', version: assigned.version }, [source, assigned], people)).toThrow('只能修改');
    expect(() => mutateOkrLifecycle(assigned.id, { action: 'acknowledge-source', viewerId: 'owner', version: 0 }, [source, assigned], people)).toThrow('已被更新');
  });
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
  it('rejects employee changes to historical assignments without rewriting the source', () => {
    const assigned: OkrRecord = { id: 'assigned', kind: 'objective', ownerId: 'owner', periodKey: '2026-10', status: 'active', version: 4, payload: { title: '个人目标', sourceObjectiveId: 'missing-source', sourceKrId: 'missing-kr', sourceVersion: 2, sourceTitle: '已撤回 KR', goalLevel: 'personal', origin: 'assigned' } };
    const synced = mutateOkrLifecycle('assigned', { action: 'acknowledge-source', viewerId: 'owner', version: 4 }, [assigned], people)!;
    expect(synced.records[0].payload.sourceWithdrawalAcknowledged).toBe(true);
    expect(() => mutateOkrLifecycle('assigned', { action: 'save', viewerId: 'owner', version: 4, payload: { ...assigned.payload, goalModelVersion: 2 } }, [assigned], people)).toThrow('只能修改');
    expect(assigned.version).toBe(4);
    expect(assigned.payload.sourceObjectiveId).toBe('missing-source');
  });
  it('rejects other users, stale versions and duplicate withdrawal', () => {
    expect(()=>mutateOkrLifecycle('goal',{action:'withdraw-change',viewerId:'boss',version:2},[record],people)).toThrow();
    expect(()=>mutateOkrLifecycle('goal',{action:'withdraw-change',viewerId:'owner',version:1},[record],people)).toThrow();
    expect(()=>mutateOkrLifecycle('goal',{action:'withdraw-change',viewerId:'owner',version:2},[{...record,changeRequest:undefined}],people)).toThrow('没有待审核申请');
  });
});
