import { describe, expect, it } from 'vitest';
import { departmentTemplates, templateValues } from './okrTemplates';
import type { OkrSettings } from './okrRepository';
const settings: OkrSettings = {defaultView:'list',timeRules:[],validation:{actionWeightTotal:100,maxActions:8,assigneeMultiple:true,keyNodeMultiple:true,resultRequired:true},dictionaries:{productNodes:['旧阶段'],deliveryNodes:[],presalesNodes:[],supportTypes:['旧类型']},templates:[{department:'研发',departments:['研发','设计'],type:'product',fields:[],stages:['设计','开发']},{department:'交付',departments:['交付'],type:'delivery',fields:[],stages:['上线']},{department:'支撑',departments:['支撑'],type:'support',fields:[],types:['客服']}]};
describe('部门 KR 模板', () => {
  it('applies one configuration to multiple departments without leaking to other departments', () => {
    expect(departmentTemplates(settings,'研发')).toEqual(departmentTemplates(settings,'设计'));
    expect(departmentTemplates(settings,'交付').map(item=>item.type)).toEqual(['delivery']);
    expect(departmentTemplates(settings,'其他')).toEqual([]);
    expect(templateValues(departmentTemplates(settings,'研发')[0],settings)).toEqual(['设计','开发']);
    expect(templateValues(departmentTemplates(settings,'支撑')[0],settings)).toEqual(['客服']);
  });
  it('preserves legacy dictionary fallback and empty values for validation', () => {
    expect(templateValues({department:'研发',type:'product',fields:[]},settings)).toEqual(['旧阶段']);
    expect(templateValues({department:'支撑',type:'support',fields:[],types:[]},settings)).toEqual([]);
  });
});
