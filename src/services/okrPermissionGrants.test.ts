import { describe, expect, it } from 'vitest';
import { replaceOkrAdministrator, OKR_PERMISSIONS, canEditOkr, canUpdateOkrSettings, confirmationReviewer, defaultConfirmation, effectiveReviewer, hasOkrPermission, isOkrAdmin, normalizedPolicy, canViewPending, reconcileConfirmationRequests } from './okrSettingsPolicy';
import { confirmationMembers, confirmationRequests } from '../components/workbench/okr/goalConfirmation';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import { ownerGoalLevel } from './okrGoalRules';
import type { OkrPerson, OkrRecord, OkrSettings } from './okrRepository';
const people: OkrPerson[] = [
 {id:'admin',name:'管理员',department:'公司',rootFlag:1,supervisorId:null,version:1},
 {id:'manager',name:'主管',department:'研发',jobTitle:'主管',goalRole:'supervisor',rootFlag:0,supervisorId:'admin',version:1},
 {id:'employee',name:'员工',department:'研发',goalRole:'employee',rootFlag:0,supervisorId:'manager',version:1},
 {id:'sub',name:'子管理员',department:'研发',goalRole:'employee',rootFlag:0,supervisorId:'manager',version:1},
];
const base = (): OkrSettings => normalizedPolicy({defaultView:'list',timeRules:[],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:[]},templates:[],administratorIds:['admin'],supervisorIds:['manager'],confirmation:defaultConfirmation()},people);
const pending: OkrRecord = {id:'request',kind:'objective',ownerId:'employee',periodKey:'2026-10',status:'active',version:2,payload:{title:'原目标',goalModelVersion:2,goalLevel:'personal',origin:'autonomous',objectiveType:'challenge',weight:100,deadline:'2026-10-31',keyResults:[{id:'kr',title:'KR',weight:100,progress:0,deadline:'2026-10-31',executionActions:[{id:'a',ownerId:'employee',title:'执行动作',progress:0}]}]},changeRequest:{id:'change',status:'pending',purpose:'update',reason:'调整',reviewerId:'manager',payload:{title:'新目标',goalModelVersion:2,goalLevel:'personal',origin:'autonomous',objectiveType:'challenge',weight:100,deadline:'2026-10-31',keyResults:[{id:'kr',title:'KR',weight:100,progress:0,deadline:'2026-10-31',executionActions:[{id:'a',ownerId:'employee',title:'执行动作',progress:0}]}]},baseVersion:1,requestedAt:'2026-10-01'}};
describe('OKR permission grants and effective reviewers',()=>{
 it('fixes administrator grants and defaults new sub-administrators to empty',()=>{
  const config=base();
  config.administratorIds=['admin','employee'];
  config.subAdministratorIds=['sub'];
  const normalized=normalizedPolicy(config,people);
  expect(normalized.permissionGrants?.admin).toHaveLength(6);
  expect(normalized.permissionGrants?.employee).toHaveLength(6);
  expect(normalized.permissionGrants?.sub).toEqual([]);
  normalized.permissionGrants!.employee=normalized.permissionGrants!.employee.filter(p=>p!=='companyGoalEdit');
  expect(hasOkrPermission('employee','companyGoalEdit',normalized,people)).toBe(true);
 });
 it('keeps company edit and personal edit as independent capabilities',()=>{
  const config=normalizedPolicy({...base(),administratorIds:['admin','employee']},people);
  const company:OkrRecord={...pending,id:'company',ownerId:'admin',changeRequest:undefined,payload:{title:'公司目标',goalModelVersion:2,goalLevel:'company'}};
  const own:OkrRecord={...pending,id:'personal',ownerId:'employee',changeRequest:undefined};
  expect(canEditOkr(company,'employee',config,people)).toBe(true);
  expect(canEditOkr(own,'employee',config,people)).toBe(true);
  config.permissionGrants!.employee=config.permissionGrants!.employee.filter(permission=>permission!=='companyGoalEdit');
  expect(canEditOkr(company,'employee',config,people)).toBe(true);
  expect(canEditOkr(own,'employee',config,people)).toBe(true);
  expect(isOkrAdmin('employee',config,people)).toBe(true);
  expect(ownerGoalLevel(people[0],own.payload)).toBe('个人级');
  expect(ownerGoalLevel(people[2],company.payload)).toBe('公司级');
 });
 it('migrates legacy company editors without retaining the old setting',()=>{
  const legacy={...base(),confirmation:{...defaultConfirmation(),companyEditorIds:['employee']}} as OkrSettings;
  const migrated=normalizedPolicy(legacy,people);
  expect(hasOkrPermission('employee','companyGoalEdit',migrated,people)).toBe(true);
  expect(migrated.confirmation?.companyEditorIds).toBeUndefined();
  expect(migrated.administratorIds).not.toContain('employee');
 });
 it('preserves all administrator defaults when a legacy company editor is also an administrator',()=>{
  const migrated=normalizedPolicy({...base(),administratorIds:['admin','employee'],confirmation:{...defaultConfirmation(),companyEditorIds:['employee']}},people);
  expect(migrated.permissionGrants?.employee).toHaveLength(6);
  expect(normalizedPolicy(migrated,people)).toEqual(migrated);
 });
 it('keeps company creation available to administrators and rejects new personal drafts',()=>{
  const config=base();config.permissionGrants!.admin=[];
  expect(()=>mutateOkrLifecycle(undefined,{kind:'objective',viewerId:'admin',periodKey:'2026-10',submit:false,payload:{title:'公司目标',goalModelVersion:2,goalLevel:'company'}},[],people,config)).not.toThrow();
  expect(()=>mutateOkrLifecycle(undefined,{kind:'objective',viewerId:'admin',periodKey:'2026-10',submit:false,payload:{title:'个人目标',goalModelVersion:2,goalLevel:'personal',origin:'autonomous'}},[],people,config)).toThrow('无需自行添加');
 });
 it('replaces an administrator without changing other roles and rejects invalid replacements',()=>{
  const config={...base(),subAdministratorIds:['sub'],permissionGrants:{admin:OKR_PERMISSIONS,sub:['companyGoalEdit' as const]}};
  const next=replaceOkrAdministrator(config,people,'admin','sub');
  expect(next.administratorIds).toEqual(['sub']);expect(next.subAdministratorIds).toEqual([]);
  expect(next.permissionGrants?.sub).toEqual(OKR_PERMISSIONS);expect(next.permissionGrants?.admin).toBeUndefined();
  expect(config.administratorIds).toEqual(['admin']);
  expect(()=>replaceOkrAdministrator(config,people,'admin','admin')).toThrow('其他');
  expect(()=>replaceOkrAdministrator(config,people,'admin','missing')).toThrow('已失效');
 });
 it('uses effective reviewer after supervisor reassignment for lists and visibility',()=>{
  const config=base();config.confirmation!.visiblePending=false;
  const reassigned=people.map(person=>person.id==='employee'?{...person,supervisorId:'admin'}:person);
  expect(effectiveReviewer(pending,config,reassigned)).toBe('admin');
  expect(confirmationRequests([pending],reassigned,'manager',config)).toEqual([]);
  expect(confirmationRequests([pending],reassigned,'admin',config)).toEqual([pending]);
  expect(confirmationMembers(reassigned,'admin',[pending],config).map(person=>person.id)).toEqual(['employee']);
  expect(canViewPending(pending,'manager',config,reassigned)).toBe(false);
  expect(canViewPending(pending,'admin',config,reassigned)).toBe(true);
 });
 it('rejects approval from the old reviewer before checking a stale version',()=>{
  const config=base();
  const reassigned=people.map(person=>person.id==='employee'?{...person,supervisorId:'admin'}:person);
  expect(()=>mutateOkrLifecycle(pending.id,{action:'approve-change',viewerId:'manager',version:1},[pending],reassigned,config)).toThrow('组织关系或确认配置已变化，不能审核');
  expect(()=>mutateOkrLifecycle(pending.id,{action:'return-change',viewerId:'admin',version:2,feedback:'调整后确认'},[pending],reassigned,config)).not.toThrow();
 });
 it('reassigns pending requests after organization changes and auto-resolves newly exempt requests',()=>{
  const config=base();
  const reassignedPeople=people.map(person=>person.id==='employee'?{...person,supervisorId:'admin'}:person);
  const moved=reconcileConfirmationRequests([pending],config,reassignedPeople)[0];
  expect(moved.changeRequest?.reviewerId).toBe('admin');expect(moved.version).toBe(pending.version+1);
  const auto=reconcileConfirmationRequests([pending],{...config,confirmation:{...config.confirmation!,enabled:false}},people)[0];
  expect(auto.changeRequest?.status).toBe('approved');expect(auto.status).toBe('active');
 });
 it('keeps administrator confirmation exemption and blocks settings changes outside grants',()=>{
  const config=base();
  expect(confirmationReviewer(people[0],'create',{title:'公司目标'},config,people)).toBeUndefined();
  const next={...config,weeklyReviewCycles:[{id:'x',month:'2026-10',startDate:'2026-10-01',endDate:'2026-10-31',notifyAt:'',deadline:'',allowBackfill:false}]};
  expect(canUpdateOkrSettings('manager',next,config,people)).toBe(false);
 });
 it('allows a company editor with both grants to create a company goal without removing personal access',()=>{
  const config=normalizedPolicy({...base(),administratorIds:['admin','employee']},people);
  const result=mutateOkrLifecycle(undefined,{kind:'objective',viewerId:'employee',periodKey:'2026-10',payload:{goalModelVersion:2,goalLevel:'company',origin:'autonomous',title:'公司经营目标',weight:100,keyResults:[{id:'c1',title:'收入增长',weight:100,progress:0,deadline:'2026-10-31',assigneeIds:['manager']}] }},[],people,config)!;
  expect(result.records[0].payload.goalLevel).toBe('company');
  expect(canEditOkr(result.records[0],'employee',config,people)).toBe(true);
  expect(canEditOkr({...result.records[0],payload:{...result.records[0].payload,goalLevel:'personal'}},'employee',config,people)).toBe(true);
 });

});
