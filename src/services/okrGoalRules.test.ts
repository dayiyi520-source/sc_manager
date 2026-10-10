// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { assignedGoalActions, goalLevel } from './okrGoalRules';
import { mockApiRequest } from './mockApi';
import type { OkrPerson, OkrRecord } from './okrRepository';
const person: OkrPerson = { id:'staff', name:'毛景强', jobTitle:'产品经理', department:'产品部', supervisorId:'manager', rootFlag:0, version:0 };
const records: OkrRecord[] = [
  {id:'parent',kind:'objective',ownerId:'boss',periodKey:'2026-09',status:'active',version:0,payload:{title:'公司目标',keyResults:[{id:'parent-a',title:'产研动作',weight:100,progress:0,assigneeIds:['manager']}]}},
  ...['a1','a2'].map(id => ({id,kind:'action' as const,ownerId:'manager',periodKey:'2026-09',status:'active',version:0,payload:{title:id,parentObjectiveId:'parent',parentActionId:'parent-a',weight:50,deadline:'2026-09-25',assigneeIds:['staff']}})),
  {id:'another',kind:'objective',ownerId:'manager',periodKey:'2026-09',status:'active',version:0,payload:{title:'其他目标'}},
];
const patch = (id:string, data:object) => mockApiRequest(`/api/okr/records/${id}`, {method:'PATCH',body:JSON.stringify({viewerId:'manager',version:0,...data})});
describe('goal role and mock persistence', () => {
  beforeEach(()=>{localStorage.clear();localStorage.setItem('shichuang.frontend.mock.okrRecords',JSON.stringify(records));});
  it('identifies positions rather than reporting relationships',()=>{
    expect(goalLevel(person)).toBe('个人级');
    expect(goalLevel({...person,jobTitle:'产品主管'})).toBe('主管级');
    expect(goalLevel({...person,name:'林志豪'})).toBe('公司级');
    expect(assignedGoalActions(records,person).map(row=>row.id)).toEqual(['a1','a2']);
    expect(assignedGoalActions(records.map(row=>({...row,status:'draft'})),person)).toEqual([]);
  });
  it('uses saved team names and positions in every member lookup without changing identities',async()=>{
    const members=await mockApiRequest('/api/team-members') as Array<{id:string;name:string;department:string;jobTitle:string;version:number}>;
    const member=members.find(row=>row.id==='user-product')!;
    await mockApiRequest(`/api/team-members/${member.id}`,{method:'PUT',body:JSON.stringify({...member,name:'改名后的主管',jobTitle:'产品主管'})});
    const options=await mockApiRequest('/api/team-members/options') as Array<{id:string;name:string;jobTitle:string}>;
    const people=await mockApiRequest('/api/okr/people') as OkrPerson[];
    expect(options.find(row=>row.id===member.id)).toMatchObject({name:'改名后的主管',jobTitle:'产品主管'});
    expect(people.find(row=>row.id===member.id)).toMatchObject({name:'改名后的主管',jobTitle:'产品主管'});
    expect(goalLevel(people.find(row=>row.id===member.id))).toBe('主管级');
    expect(goalLevel({id:'user-admin',name:'改名后的公司负责人'})).toBe('公司级');
  });
  it('saves a legacy group once and preserves lower-level action references',async()=>{
    const child:OkrRecord={id:'child',kind:'action',ownerId:'staff',periodKey:'2026-09',status:'active',version:0,payload:{title:'员工动作',parentObjectiveId:'parent',parentActionId:'a2'}};
    localStorage.setItem('shichuang.frontend.mock.okrRecords',JSON.stringify([...records,child]));
    await patch('a1',{action:'save',payload:{title:'修改后的目标',keyResults:[{id:'a1',title:'动作1',weight:50},{id:'a2',title:'动作2',weight:50}]}});
    const saved=await mockApiRequest('/api/okr/records?viewerId=manager') as OkrRecord[];
    expect(saved.find(row=>row.id==='a1')).toMatchObject({kind:'objective',payload:{title:'修改后的目标'}});
    expect(saved.some(row=>row.id==='a2')).toBe(false);
    expect(saved.find(row=>row.id==='child')?.payload).toMatchObject({parentObjectiveId:'a1',parentActionId:'a2'});
    expect(assignedGoalActions(saved,person).map(row=>row.id)).toEqual([]); // edited example has no assignees
    expect(saved.find(row=>row.id==='another')?.payload.title).toBe('其他目标');
  });
  it('deletes only the selected legacy group and rejects other owners',async()=>{
    await expect(mockApiRequest('/api/okr/records/a1',{method:'PATCH',body:JSON.stringify({viewerId:'staff',action:'delete',version:0})})).rejects.toThrow('本人');
    await patch('a1',{action:'delete'});
    const saved=await mockApiRequest('/api/okr/records') as OkrRecord[];
    expect(saved.map(row=>row.id)).toEqual(['parent','another']);
  });
  it('blocks deleting a group with a lower-level alignment',async()=>{
    localStorage.setItem('shichuang.frontend.mock.okrRecords',JSON.stringify([...records,{id:'child',kind:'objective',ownerId:'staff',periodKey:'2026-09',status:'active',version:0,payload:{title:'个人目标',alignments:[{parentObjectiveId:'a2',parentKeyResultId:'a2'}]}}]));
    await expect(patch('a1',{action:'delete'})).rejects.toThrow('下级对齐');
  });
});
