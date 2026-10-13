import { describe, expect, it } from 'vitest';
import { departmentTemplates, templateValues, migrateTemplateDepartments } from './okrTemplates';
import type { OkrSettings } from './okrRepository';
const settings: OkrSettings = {defaultView:'list',timeRules:[],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:['旧阶段'],deliveryNodes:[],presalesNodes:[],supportTypes:['旧类型']},templates:[{department:'研发',departments:['研发','设计'],type:'product',fields:[],stages:['设计','开发']},{department:'交付',departments:['交付'],type:'delivery',fields:[],stages:['上线']},{department:'支撑',departments:['支撑'],type:'support',fields:[],types:['客服']}]};
describe('部门 KR 模板', () => {
 it('permits several types for one department and combines legacy assignment by type',()=>{
 const multiple={...settings,templates:[...settings.templates,{department:'研发',type:'support',fields:[],types:['支持']},{department:'产研部门',type:'delivery',fields:[],stages:['交付']}]};
 expect(departmentTemplates(multiple,'研发').map(t=>t.type)).toEqual(['product','support']);
 const migrated=migrateTemplateDepartments([{department:'产品规划部',type:'support',fields:[],types:['支持']},{department:'产研部门',type:'product',fields:[],stages:['设计']}],['产品规划部']);
 expect(departmentTemplates({...settings,templates:migrated},'产品规划部').map(t=>t.type)).toEqual(['support','product']);
 });
  it('applies one configuration to multiple departments without leaking to other departments', () => {
    expect(departmentTemplates(settings,'研发')).toEqual(departmentTemplates(settings,'设计'));
    expect(departmentTemplates(settings,'交付').map(item=>item.type)).toEqual(['delivery']);
    expect(departmentTemplates(settings,'其他')).toEqual([]);
    expect(templateValues(departmentTemplates(settings,'研发')[0],settings)).toEqual(['设计','开发']);
    expect(templateValues(departmentTemplates(settings,'支撑')[0],settings)).toEqual(['客服']);
  });
  it('preserves saved legacy values when the department directory is incomplete',()=>{
 const rows=migrateTemplateDepartments([{department:'产研部门',type:'product',fields:[],stages:['已保存的完成阶段']},{department:'项目交付部门',type:'delivery',fields:[],stages:['已保存的推进阶段']},{department:'其他支撑部门',type:'support',fields:[],types:['已保存的类型']}],['临时部门']);
 expect(rows).toHaveLength(3);expect(rows.map(row=>row.stages||row.types)).toEqual([['已保存的完成阶段'],['已保存的推进阶段'],['已保存的类型']]);
 });
  it('preserves legacy dictionary fallback and empty values for validation', () => {
    expect(templateValues({department:'研发',type:'product',fields:[]},settings)).toEqual(['旧阶段']);
    expect(templateValues({department:'支撑',type:'support',fields:[],types:[]},settings)).toEqual([]);
  });
});
