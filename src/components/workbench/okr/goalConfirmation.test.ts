import {describe,it,expect} from 'vitest';
import {confirmationMembers,confirmationRequests,goalDifferences} from './goalConfirmation';
import type {OkrPerson,OkrRecord} from '../../../services/okrRepository';
const people:OkrPerson[]=[{id:'boss',name:'管理员',rootFlag:1,department:'管理部',supervisorId:null,version:1},{id:'manager',name:'主管甲',jobTitle:'产品主管',rootFlag:0,department:'产品部',supervisorId:'boss',version:1},{id:'manager2',name:'主管乙',jobTitle:'交付主管',rootFlag:0,department:'交付部',supervisorId:'boss',version:1},{id:'staff',name:'员工甲',rootFlag:0,department:'产品部',supervisorId:'manager',version:1}];
const record:OkrRecord={id:'o',kind:'objective',ownerId:'staff',periodKey:'2026-10',status:'active',version:1,payload:{title:'原目标'},changeRequest:{id:'c',status:'pending',purpose:'update',reason:'指标变化',reviewerId:'manager',baseVersion:1,requestedAt:'2026-10-13',payload:{title:'调整目标'}}};
describe('confirmation queue',()=>{
 it('uses direct reports for managers, all supervisors for administrators, and hides personal access',()=>{
 expect(confirmationMembers(people,'manager').map(p=>p.id)).toEqual(['staff']);expect(confirmationMembers(people,'boss').map(p=>p.id)).toEqual(['manager','manager2']);expect(confirmationMembers(people,'staff')).toEqual([]);
 });
 it('counts only pending requests owned by the allowed member and assigned to the viewer',()=>{
 expect(confirmationRequests([record,{...record,id:'wrong',ownerId:'manager2'},{...record,id:'done',changeRequest:{...record.changeRequest!,status:'approved'}},{...record,id:'deleted',status:'deleted'}],people,'manager').map(r=>r.id)).toEqual(['o']);expect(confirmationRequests([record],people,'boss')).toEqual([]);
 });
 it('includes removed and added KR and A content with before and after values',()=>{
 const result=goalDifferences({title:'旧',weight:30,keyResults:[{id:'kr',title:'原KR',weight:100,progress:0,executionActions:[{id:'a',ownerId:'staff',title:'原动作',progress:0,weight:100}]}]},{title:'新',weight:70,keyResults:[{id:'kr',title:'新KR',weight:100,progress:0,executionActions:[]},{id:'added',title:'新增KR',weight:0,progress:0}]});
 expect(result).toEqual(expect.arrayContaining([expect.objectContaining({label:'目标内容',before:'旧',after:'新'}),expect.objectContaining({label:'目标权重',before:'30%',after:'70%'}),expect.objectContaining({label:'移除 A',before:'原动作'}),expect.objectContaining({label:'KR2新增',after:'新增KR'})]));
 });
});
