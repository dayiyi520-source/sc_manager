import React, { useRef } from 'react';
import { Button, Input, Select, Space } from 'antd';
import type { OkrSettings, OkrTemplate } from '../../../services/okrRepository';
import { templateDepartments, templateValues } from '../../../services/okrTemplates';
export const KR_TEMPLATE_LABELS: Record<string,string> = { product:'产研模板',delivery:'交付模板',support:'通用模板' };
export function groupKrTemplates(templates: OkrTemplate[]) {
  const groups: Array<{ departments: string[]; templates: OkrTemplate[] }> = [];
  for (const template of templates) {
    const departments = [...new Set(templateDepartments(template))];
    const key = [...departments].sort().join('\u0000');
    const group = groups.find(item => [...item.departments].sort().join('\u0000') === key);
    if (group) group.templates.push(template); else groups.push({departments,templates:[template]});
  }
  return groups;
}
export function KrTemplateConfiguration({settings,departments,busy,onChange}:{settings:OkrSettings;departments:string[];busy?:boolean;onChange:(templates:OkrTemplate[])=>void}) {
  const groups=groupKrTemplates(settings.templates);
  const cached = useRef(new Map<string,OkrTemplate>());
  const cacheKey = (departments:string[],type:string) => [...departments].sort().join('|') + ':' + type;
  groups.forEach(group=>group.templates.forEach(template=>cached.current.set(cacheKey(group.departments,template.type),template)));
  const update=(index:number,group:typeof groups[number])=>onChange(groups.flatMap((item,i)=>i===index?group.templates:item.templates));
  return <Space orientation="vertical" size="middle" className="okr-kr-config-list">{groups.map((group,index)=>{
    const selected=[...new Set(group.templates.map(template=>template.type).filter(Boolean))];
    return <section className="okr-settings-template" key={index} aria-label={'部门KR配置'+(index+1)}>
      <div className="okr-kr-config-controls"><Select mode="multiple" className="okr-template-departments" showSearch optionFilterProp="label" value={group.departments} aria-label={'KR模板'+(index+1)+'部门'} disabled={busy} placeholder="请选择部门" options={[...new Set([...departments,...groups.flatMap(item=>item.departments)])].map(value=>({value,label:value}))} onChange={values=>update(index,{departments:values,templates:group.templates.map(template=>({...template,department:values[0]||'',departments:values}))})}/>
      <Select mode="multiple" className="okr-template-kind" placeholder="请选择kr模板" value={selected} aria-label={'KR模板'+(index+1)+'模板'} disabled={busy} options={Object.entries(KR_TEMPLATE_LABELS).map(([value,label])=>({value,label}))} onChange={values=>{
        const templates=values.length?values.map(type=>group.templates.find(template=>template.type===type)||cached.current.get(cacheKey(group.departments,type))||{department:group.departments[0]||'',departments:group.departments,type,fields:[],...(type==='support'?{types:[]}:{stages:[]})}):[{department:group.departments[0]||'',departments:group.departments,type:'',fields:[]}];
        update(index,{...group,templates});
      }}/><Button danger disabled={busy} onClick={()=>onChange(groups.flatMap((item,i)=>i===index?[]:item.templates))}>移除配置</Button></div>
      <div className="okr-kr-config-values">{group.templates.filter(template=>template.type).map((template,typeIndex)=>{
        const label=selected.length===1?'KR模板'+(index+1)+(template.type==='support'?'类型':'阶段'):'KR模板'+(index+1)+KR_TEMPLATE_LABELS[template.type]+(template.type==='support'?'类型':'阶段');
        return <label key={template.type+':'+typeIndex}><span>{KR_TEMPLATE_LABELS[template.type]} · {template.type==='support'?'可选类型':template.type==='delivery'?'推进阶段':'完成阶段'} <span className="okr-required-marker">*</span></span><Input aria-label={label} value={templateValues(template,settings).join(',')} disabled={busy} placeholder="多个值使用英文逗号隔开" onChange={event=>{
          const values=event.target.value.split(',');const replacement={...template,...(template.type==='support'?{types:values}:{stages:values})};
          update(index,{...group,templates:group.templates.map(item=>item===template?replacement:item)});
        }}/></label>;
      })}</div><small>模板支持多选；每种模板的阶段或类型独立保存。</small>
    </section>;
  })}<Button disabled={busy} onClick={()=>onChange([...settings.templates,{department:'',departments:[],type:'',fields:[]}])}>添加 KR 模板配置</Button></Space>;
}
