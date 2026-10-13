import {describe,it,expect} from 'vitest';
import {goalBusinessAssociations} from './goalBusinessAssociations';
import type {OkrRecord} from '../../../services/okrRepository';
const record:OkrRecord={id:'o',kind:'objective',ownerId:'staff',periodKey:'2026-10',status:'active',version:1,payload:{title:'目标',goalLevel:'personal',origin:'assigned',keyResults:[{id:'kr',title:'产品计划',structureType:'product',businessObject:'省级项目管理平台',weight:100,progress:0,executionActions:[{id:'a',ownerId:'staff',title:'完成原型',progress:0}]}]}};
describe('business associations',()=>{
 it('counts the product on both containing KR and its execution A without other records',()=>{
 expect(goalBusinessAssociations(record,'kr',[record]).products).toEqual(['省级项目管理平台']);expect(goalBusinessAssociations(record,'a',[record]).products).toEqual(['省级项目管理平台']);
 });
 it('counts delivery project and deduplicated detail products for own A',()=>{
 const delivery={...record,payload:{...record.payload,keyResults:[{...record.payload.keyResults![0],structureType:'delivery' as const,businessObject:'智慧校园项目',details:[{id:'d1',name:'产品甲'},{id:'d2',name:'产品甲'},{id:'d3',name:'产品乙'}]}]}};
 expect(goalBusinessAssociations(delivery,'a',[delivery])).toEqual({projects:['智慧校园项目'],products:['产品甲','产品乙']});
 });
 it('inherits missing context from the exact upstream KR, not another product',()=>{
 const parent={...record,id:'parent',ownerId:'manager',payload:{title:'上级',keyResults:[record.payload.keyResults![0],{id:'other',title:'另一条',structureType:'product' as const,businessObject:'其他产品',weight:0,progress:0}]}};
 const personal={...record,payload:{...record.payload,sourceObjectiveId:'parent',sourceKrId:'kr',keyResults:[{...record.payload.keyResults![0],structureType:undefined,businessObject:undefined}]}};
 expect(goalBusinessAssociations(personal,'a',[parent,personal]).products).toEqual(['省级项目管理平台']);
 });
});
