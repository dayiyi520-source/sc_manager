// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApiRequest } from './mockApi';
import { defaultConfirmation, normalizedPolicy } from './okrSettingsPolicy';
import type { OkrPerson, OkrRecord, OkrSettings } from './okrRepository';

const people = vi.hoisted((): OkrPerson[] => [
  {id:'admin',name:'管理员',department:'公司',rootFlag:1,supervisorId:null,version:1},
  {id:'manager',name:'主管',department:'研发',rootFlag:0,supervisorId:'admin',version:1},
  {id:'employee',name:'员工',department:'研发',rootFlag:0,supervisorId:'manager',version:1},
]);
vi.mock('../data/mockSnapshot', async original => ({...await original<object>(),MOCK_OKR_PEOPLE:people}));
const prefix='shichuang.frontend.mock.';
const settings=():OkrSettings=>normalizedPolicy({defaultView:'list',timeRules:[],templates:[],dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:[]},validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},administratorIds:['admin'],supervisorIds:['manager'],confirmation:defaultConfirmation()},people);
const pending:OkrRecord={id:'pending',kind:'objective',ownerId:'employee',periodKey:'2026-10',status:'submitted',version:1,payload:{title:'待确认',goalModelVersion:2,goalLevel:'personal',origin:'autonomous',weight:100,keyResults:[{id:'kr',title:'完成交付',weight:100,progress:0,executionActions:[{id:'a',title:'完成交付',ownerId:'employee',progress:0}]}]},changeRequest:{id:'change',status:'pending',purpose:'initial',reason:'提交目标',reviewerId:'manager',requestedAt:'2026-10-01',baseVersion:0,payload:{title:'已确认目标',goalModelVersion:2,goalLevel:'personal',origin:'autonomous',weight:100,keyResults:[{id:'kr',title:'完成交付',weight:100,progress:0,executionActions:[{id:'a',title:'完成交付',ownerId:'employee',progress:0}]}]}}};
const readSettings=()=>mockApiRequest('/api/okr/settings') as Promise<OkrSettings>;
const save=(value:OkrSettings,viewerId='admin')=>mockApiRequest('/api/okr/settings',{method:'PUT',body:JSON.stringify({...value,viewerId})});
beforeEach(()=>{
  localStorage.clear();
  localStorage.setItem(prefix+'okrSettings',JSON.stringify(settings()));
  localStorage.setItem(prefix+'okrPeople',JSON.stringify(people));
  localStorage.setItem(prefix+'okrRecords',JSON.stringify([pending]));
});
describe('OKR permissions through the persisted mock API',()=>{
  it('persists sub-administrator defaults and revocation, and rejects writes beyond grants',async()=>{
    await save({...await readSettings(),subAdministratorIds:['employee']});
    const granted=await readSettings();
    expect(granted.permissionGrants?.employee).toHaveLength(6);
    await save({...granted,permissionGrants:{...granted.permissionGrants,employee:[]}});
    const revoked=await readSettings();
    expect(revoked.permissionGrants?.employee).toEqual([]);
    const before=localStorage.getItem(prefix+'okrSettings');
    await expect(save({...revoked,defaultView:'card'},'employee')).rejects.toThrow('无保存权限');
    expect(localStorage.getItem(prefix+'okrSettings')).toBe(before);
    await expect(save(granted)).rejects.toThrow('配置已更新');
  });
  it('reassigns pending requests on rule changes and rejects the old reviewer',async()=>{
    const config=await readSettings();
    const missing=people.map(person=>person.id==='employee'?{...person,supervisorId:null,version:2}:person);
    localStorage.setItem(prefix+'okrPeople',JSON.stringify(missing));
    await save({...config,confirmation:{...config.confirmation!,visiblePending:false}});
    const stored=JSON.parse(localStorage.getItem(prefix+'okrRecords')!)[0] as OkrRecord;
    expect(stored.changeRequest?.reviewerId).toBe('admin');
    expect(stored.version).toBe(2);
    await expect(mockApiRequest('/api/okr/records/pending',{method:'PATCH',body:JSON.stringify({viewerId:'manager',action:'approve-change',version:1})})).rejects.toThrow('组织关系或确认配置已变化');
  });
  it('persists automatic activation and resolves a pending request only once',async()=>{
    const config=await readSettings();
    await save({...config,confirmation:{...config.confirmation!,enabled:false}});
    const stored=JSON.parse(localStorage.getItem(prefix+'okrRecords')!)[0] as OkrRecord;
    expect(stored).toMatchObject({status:'active',payload:{title:'已确认目标'},changeRequest:{status:'approved',reviewerId:'system'}});
    expect(stored.changeHistory).toHaveLength(1);
    await save(await readSettings());
    expect(JSON.parse(localStorage.getItem(prefix+'okrRecords')!)[0]).toEqual(stored);
  });
});
