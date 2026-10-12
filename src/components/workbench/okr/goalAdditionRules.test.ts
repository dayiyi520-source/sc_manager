import { describe, expect, it } from 'vitest';
import { goalContentComplete } from './goalAdditionRules';
import type { OkrPayload } from '../../../services/okrRepository';
const company: OkrPayload = { title: '公司目标', keyResults: [{ id:'kr',title:'结果',weight:100,progress:0 }] };
describe('连续添加内容约束',()=>{
 it('requires O and all KR text without prematurely requiring a deadline',()=>{
  expect(goalContentComplete(company)).toBe(true);
  expect(goalContentComplete({...company,title:''})).toBe(false);
  expect(goalContentComplete({...company,keyResults:[...company.keyResults!,{id:'empty',title:'',weight:50,progress:0}]})).toBe(false);
 });
 it('requires all structured department fields and already added A content',()=>{
  const payload:OkrPayload={...company,goalLevel:'department',keyResults:[{id:'kr',title:'',structureType:'product',businessObject:'产品',version:'V1',stage:'测试验收',weight:100,progress:0}]};
  expect(goalContentComplete(payload)).toBe(true);
  expect(goalContentComplete({...payload,keyResults:payload.keyResults!.map(kr=>({...kr,stage:''}))})).toBe(false);
  expect(goalContentComplete({...payload,keyResults:payload.keyResults!.map(kr=>({...kr,executionActions:[{id:'a',ownerId:'me',title:'',progress:0}]}))})).toBe(false);
 });
});
