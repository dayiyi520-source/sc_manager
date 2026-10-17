// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import type { OkrPerson, OkrRecord } from './okrRepository';
import { departmentContentSnapshots } from './departmentReviewAggregation';
const recordsKey='shichuang.frontend.mock.okrRecords';
beforeEach(()=>localStorage.clear());
it.each(['week','month'] as const)('persists structured knowledge in %s drafts, submissions and department snapshots',async reviewType=>{
 const people=await mockApiRequest('/api/okr/people') as OkrPerson[];
 const owner=people.find(person=>!person.rootFlag && !people.some(child=>child.supervisorId===person.id) && people.some(manager=>manager.id===person.supervisorId && manager.department===person.department))!;
 expect(owner).toBeDefined();
 localStorage.setItem(recordsKey,'[]');
 const period={startDate:reviewType==='week'?'2020-01-06':'2020-01-01',endDate:reviewType==='week'?'2020-01-12':'2020-01-31'};
 const knowledge={id:'k',category:'应知应会',formatVersion:2,title:'发布回滚经验',scenarioAndPain:'发布后异常',actionsAndConclusion:'回滚后验证并补充检查',reusePlan:'在部门分享',linkUrl:'https://example.com/doc',attachments:[{id:'a',name:'a.txt',size:2*1024*1024,data:'data:text/plain;base64,YQ=='},{id:'b',name:'b.txt',size:3*1024*1024,data:'data:text/plain;base64,YQ=='}]};
 const payload={title:'知识复盘',reviewType,...period,knowledgeEntries:[knowledge]};
 const created=await mockApiRequest('/api/okr/records',{method:'POST',body:JSON.stringify({kind:'review',periodKey:`${period.startDate}/${period.endDate}`,viewerId:owner.id,submit:false,payload})}) as {id:string};
 let rows=await mockApiRequest(`/api/okr/records?viewerId=${owner.id}`) as OkrRecord[];
 expect(rows.find(row=>row.id===created.id)?.payload.knowledgeEntries).toEqual([knowledge]);
 const stored=localStorage.getItem(recordsKey)!;localStorage.clear();localStorage.setItem(recordsKey,stored);
 rows=await mockApiRequest(`/api/okr/records?viewerId=${owner.id}`) as OkrRecord[];
 expect(rows.find(row=>row.id===created.id)?.payload.knowledgeEntries).toEqual([knowledge]);
 await mockApiRequest(`/api/okr/records/${created.id}`,{method:'PATCH',body:JSON.stringify({action:'submit',version:0,viewerId:owner.id})});
 rows=await mockApiRequest(`/api/okr/records?viewerId=${owner.id}`) as OkrRecord[];
 expect(rows.find(row=>row.id===created.id)?.status).toBe('submitted');
 expect(departmentContentSnapshots(rows,people,owner.supervisorId!,period,reviewType)[0].knowledgeEntries).toEqual([knowledge]);
});
it('rejects a malformed new knowledge entry at the save boundary without changing persisted reports',async()=>{
 const people=await mockApiRequest('/api/okr/people') as OkrPerson[];
 const owner=people.find(person=>!person.rootFlag)!;
 localStorage.setItem(recordsKey,'[]');
 await expect(mockApiRequest('/api/okr/records',{method:'POST',body:JSON.stringify({kind:'review',periodKey:'2020-01',viewerId:owner.id,submit:false,payload:{title:'草稿',reviewType:'month',startDate:'2020-01-01',endDate:'2020-01-31',knowledgeEntries:[{id:'bad',category:'应知应会',formatVersion:2,title:'标题',scenarioAndPain:'背景',actionsAndConclusion:' '}]}})})).rejects.toThrow('执行动作与复盘结论');
 expect(localStorage.getItem(recordsKey)).toBe('[]');
});
