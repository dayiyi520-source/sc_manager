import { OkrRoleSettings } from './OkrRoleSettings';
import { Checkbox, Input, InputNumber, Radio, Select, Space, Switch, Typography } from 'antd';
import Card from 'antd/es/card/Card';
import type { OkrPerson, OkrSettings } from '../../../services/okrRepository';
import { cycleTypeLabels } from '../../../services/okrPeriods';

export function OkrPolicySettings({active,draft,people,busy,onChange}:{active:string;draft:OkrSettings;people:OkrPerson[];busy:boolean;onChange:(value:OkrSettings)=>void}) {
  const cycles = draft.cycles!;
  const confirmation = draft.confirmation!;
  const options = people.map(p=>({value:p.id,label:`${p.name} · ${p.department}`}));
  const updateConfirmation = (patch:Partial<typeof confirmation>)=>onChange({...draft,confirmation:{...confirmation,...patch}});
  if (active==='cycles') return <Card className="okr-policy-settings" title="周期设置"><Space orientation="vertical" size="large" style={{width:'100%'}}>
    <label>自动创建周期 <Switch aria-label="自动创建周期" checked={cycles.automatic} disabled={busy} onChange={automatic=>onChange({...draft,cycles:{...cycles,automatic}})}/></label>
    <label>周期类型 <Checkbox.Group aria-label="周期类型" options={Object.entries(cycleTypeLabels).map(([value,label])=>({value,label}))} value={cycles.types} disabled={busy} onChange={types=>onChange({...draft,cycles:{...cycles,types:types as typeof cycles.types}})}/></label>
    {cycles.types.map(type=><div key={type}><strong>{cycleTypeLabels[type]}</strong><Space wrap><span>周期结束前</span><InputNumber aria-label={`${cycleTypeLabels[type]}提前天数`} min={0} max={31} value={cycles.schedules[type].daysBefore} disabled={busy} onChange={value=>onChange({...draft,cycles:{...cycles,schedules:{...cycles.schedules,[type]:{...cycles.schedules[type],daysBefore:value??0}}}})}/><span>天</span><Input aria-label={`${cycleTypeLabels[type]}创建时间`} type="time" value={cycles.schedules[type].time} disabled={busy} onChange={e=>onChange({...draft,cycles:{...cycles,schedules:{...cycles.schedules,[type]:{...cycles.schedules[type],time:e.target.value}}}})}/><span>创建下一周期</span></Space></div>)}
    <label>跨周期对齐 <Switch aria-label="跨周期对齐" checked={cycles.crossAlignment} disabled={busy} onChange={crossAlignment=>onChange({...draft,cycles:{...cycles,crossAlignment}})}/></label>
    <Typography.Paragraph>开启后可对齐包含当前周期的上级周期。例：2020年01月 → 2020年第1季度 → 2020年度；不允许对齐不包含当前周期的目标。</Typography.Paragraph>
    <Typography.Text type="secondary">自动创建会在打开应用时补齐到期周期；当前本地版本不提供关闭应用后的后台定时执行。</Typography.Text>
  </Space></Card>;
  if(active==='administrators') return <OkrRoleSettings draft={draft} people={people} disabled={busy} onChange={onChange}/>;
  if(active==='confirmation') return <Card className="okr-policy-settings" title="目标确认配置"><Space orientation="vertical" size="large" style={{width:'100%'}}>
    <label>目标确认 <Switch aria-label="目标确认" checked={confirmation.enabled} disabled={busy} onChange={enabled=>updateConfirmation({enabled})}/></label>
    <Checkbox disabled={busy || !confirmation.enabled} checked={confirmation.visiblePending} onChange={e=>updateConfirmation({visiblePending:e.target.checked})}>确认中的目标能被他人看到</Checkbox>
    <label>确认内容 <Checkbox.Group value={confirmation.actions} disabled={busy || !confirmation.enabled} options={[{value:'create',label:'制定目标'},{value:'update',label:'修改目标'},{value:'delete',label:'删除目标'}]} onChange={actions=>updateConfirmation({actions:actions as typeof confirmation.actions})}/></label>
    <label>需要确认的目标类型 <Checkbox.Group value={confirmation.types} disabled={busy || !confirmation.enabled} options={[{value:'target',label:'承诺型'},{value:'challenge',label:'挑战型'}]} onChange={types=>updateConfirmation({types:types as typeof confirmation.types})}/></label>
    <label>找不到主管时 <Radio.Group value={confirmation.missingSupervisor} disabled={busy || !confirmation.enabled} options={[{value:'auto',label:'自动通过'},{value:'upper',label:'由上上级主管确认'},{value:'admin',label:'由 OKR 管理员进行确认'}]} onChange={e=>updateConfirmation({missingSupervisor:e.target.value})}/></label>
    <Typography.Text type="secondary">管理员默认免确认；待确认申请会按最新组织关系和配置重新分配。</Typography.Text>
    <label>直属主管是自己时 <Radio.Group value={confirmation.selfSupervisor} disabled={busy || !confirmation.enabled} options={[{value:'auto',label:'自动通过'},{value:'upper',label:'由上上级主管确认'}]} onChange={e=>updateConfirmation({selfSupervisor:e.target.value})}/></label>
    <label>不需要确认的人员 <Select mode="multiple" aria-label="不需要确认的人员" placeholder="请选择人员" style={{minWidth:480}} options={options} value={confirmation.exemptIds} disabled={busy} onChange={exemptIds=>updateConfirmation({exemptIds})}/></label>
  </Space></Card>;
  return null;
}
