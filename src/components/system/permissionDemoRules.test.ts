import { describe, expect, it } from 'vitest';
import { demoPermissions, okrDemoPermissions } from './permissionDemoRules';
import type { OkrSettings } from '../../services/okrRepository';
const allowed=(domain:Parameters<typeof demoPermissions>[0],identity:Parameters<typeof demoPermissions>[1],status:string,name:string,specified=false)=>demoPermissions(domain,identity,status,specified).find(row=>row.name===name)?.allowed;
describe('permission demo uses current business predicates',()=>{
 it('restricts collaboration receipt, acceptance and closing to current actors and statuses',()=>{
  expect(allowed('collaboration','owner','待处理','接收 / 发起转派')).toBe(true);
  expect(allowed('collaboration','other','待处理','接收 / 发起转派')).toBe(false);
  expect(allowed('collaboration','creator','待验收','验收通过 / 建议返工')).toBe(true);
  expect(allowed('collaboration','admin','待验收','验收通过 / 建议返工')).toBe(false);
  expect(allowed('collaboration','creator','已退回','关闭已退回事项')).toBe(true);
  expect(allowed('collaboration','creator','已完成','关闭已退回事项')).toBe(false);
 });
 it('does not grant another person todo progress rights to an administrator',()=>{
  expect(allowed('todo','admin','处理中','修改当前进度')).toBe(false);
  expect(allowed('todo','owner','处理中','修改当前进度')).toBe(true);
  expect(allowed('todo','owner','已完成','修改当前进度')).toBe(false);
 });
 it('respects specified audiences and source-message editing restrictions',()=>{
  expect(allowed('feeds','admin','','查看工作台消息',true)).toBe(false);
  expect(allowed('feeds','audience','','查看工作台消息',true)).toBe(true);
  expect(allowed('feeds','creator','','编辑 / 删除工作台新建信息')).toBe(true);
  expect(demoPermissions('feeds','creator','',true,true).find(row=>row.name==='编辑 / 删除工作台新建信息')?.allowed).toBe(false);
 });
 it('shows delivery completion review permissions and the same-owner exemption',()=>{
  expect(allowed('delivery','admin','待审核','审核完成申请')).toBe(true);
  expect(allowed('delivery','owner','待审核','审核完成申请')).toBe(false);
  expect(demoPermissions('delivery','creator','处理中',false,false,true).find(row=>row.name==='完成是否需要审核')?.allowed).toBe(false);
 });
 it('calculates real OKR grants with the shared policy and never invents department product rights',()=>{
  const settings:OkrSettings={administratorIds:['admin'],subAdministratorIds:['sub'],permissionGrants:{sub:['reviewTemplates']},defaultView:'list',timeRules:[],templates:[],dictionaries:{productNodes:[],deliveryNodes:[],presalesNodes:[],supportTypes:[]},validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:false,resultRequired:true}};
  expect(okrDemoPermissions('admin',settings,[]).every(row=>row.allowed)).toBe(true);
  expect(okrDemoPermissions('sub',settings,[]).filter(row=>row.allowed).map(row=>row.name)).toEqual(['复盘总结模板']);
  expect(okrDemoPermissions('other',settings,[]).every(row=>!row.allowed)).toBe(true);
  expect(demoPermissions('product','admin','',false).every(row=>row.allowed===undefined)).toBe(true);
 });
});
