import React, { useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Modal, Progress, Radio, Select, Slider, Table, Tag, Tooltip } from 'antd';
import type { OKRItem } from '../../../types';
import type { OkrPayload, OkrWork } from '../../../services/okrRepository';
import { AlertTriangle, Calendar, CheckCircle, ChevronDown, Info, Link, Play, Plus, Save, Search, Send, Trash2, XCircle } from '@/components/common/octicons-compat';
import { periodWork } from './workAggregation';
import { reviewPeriod } from './simpleReview';

type Health = 'normal' | 'risk' | 'blocked';
type PickerSource = 'task' | 'ticket';
type PickerState = { target: string; source: PickerSource; selection:string[]; keyword:string; status:string; updated:string; note:string } | null;
export interface KrReviewDraft { objectiveId: string; objectiveTitle: string; keyResultId: string; keyResultTitle: string; previousProgress: number; currentProgress: number; health: Health; achievement: string; blocker: string; nextPlan: string; evidenceNote?:string; workIds: string[] }
export interface AssistanceDraft { subject: string; result: string }

const terminalStatuses = new Set(['已完成', '已发布', '已验收', '已关闭']);
const statusColor = (status: string) => terminalStatuses.has(status) ? 'success' : status.includes('阻塞') || status.includes('驳回') ? 'error' : 'processing';
const workSource = (item: OkrWork): PickerSource => item.kind === 'product_requirement' ? 'ticket' : 'task';

export function StructuredReviewEditor({ type, okrs, work, busy, workLoading, workError, onRefreshWork, onTypeChange, onSaveDraft, onSubmit, onCancel }: { key?: React.Key; type: 'week'|'month'; okrs: OKRItem[]; work: OkrWork[]; busy: boolean; workLoading: boolean; workError?: unknown; onRefreshWork: ()=>void; onTypeChange:(type:'week'|'month')=>void; onSaveDraft:(payload:OkrPayload)=>Promise<boolean>; onSubmit:(payload:OkrPayload)=>Promise<boolean>; onCancel:()=>void }) {
 const period = useMemo(()=>reviewPeriod(type),[type]);
 const [title,setTitle]=useState(type==='week'?`${period.startDate} 至 ${period.endDate} 周复盘`:`${period.startDate.slice(0,7)} 月度复盘`);
 const [selfScore,setSelfScore]=useState(90);
 const [sync,setSync]=useState(true);
 const [picker,setPicker]=useState<PickerState>(null);
 const [expandedObjectives,setExpandedObjectives]=useState<string[]>(()=>okrs.map(o=>o.id));
 const [krs,setKrs]=useState<KrReviewDraft[]>(okrs.flatMap(o=>(o.keyResults||[]).filter(k=>k.progress<100).map(k=>({objectiveId:o.id,objectiveTitle:o.objective,keyResultId:k.id,keyResultTitle:k.content,previousProgress:k.progress,currentProgress:k.progress,health:'normal' as Health,achievement:'',blocker:'',nextPlan:'',workIds:[]}))));
 const [extra,setExtra]=useState<{workIds:string[];description:string;impact:string;notes:Record<string,string>}>({workIds:[],description:'',impact:'none',notes:{}});
 const [assistance,setAssistance]=useState<AssistanceDraft[]>([{subject:'',result:''}]);
 const candidates=useMemo(()=>periodWork(work,period.startDate,period.endDate),[work,period]);
 const workById=useMemo(()=>new Map(candidates.map(item=>[item.id,item])),[candidates]);
 const update=(id:string,p:Partial<KrReviewDraft>)=>setKrs(rows=>rows.map(row=>row.keyResultId===id?{...row,...p}:row));
 const linkedIds=new Set(krs.flatMap(kr=>kr.workIds).concat(extra.workIds));
 const objectiveGroups=okrs.map(objective=>({objective,krs:krs.filter(kr=>kr.objectiveId===objective.id)})).filter(group=>group.krs.length);
 const currentAverage=krs.length?Math.round(krs.reduce((sum,kr)=>sum+kr.currentProgress,0)/krs.length):0;
 const previousAverage=krs.length?Math.round(krs.reduce((sum,kr)=>sum+kr.previousProgress,0)/krs.length):0;
 const blockedCount=krs.filter(kr=>kr.health==='blocked'||kr.blocker.trim()).length;
 const selectedWorks=[...linkedIds].map(id=>workById.get(id)).filter((item):item is OkrWork=>!!item);
 const missingKrs=krs.filter(kr=>!kr.achievement.trim()||!kr.nextPlan.trim());
 const checks=[
  {label:'KR 进度已填写',ok:krs.every(kr=>Number.isFinite(kr.currentProgress))},
  {label:'工作证据已关联',ok:krs.length===0||krs.every(kr=>kr.workIds.length>0)},
  {label:'阻塞原因已填写',ok:krs.filter(kr=>kr.health!=='normal').every(kr=>kr.blocker.trim())},
  {label:'协助事项已说明',ok:assistance.every(item=>(!item.subject.trim()&&!item.result.trim())||Boolean(item.subject.trim()&&item.result.trim()))},
 ];
 const payload=():OkrPayload=>({title,startDate:period.startDate,endDate:period.endDate,reviewType:type,reviewMode:'structured',selfScore,syncKrProgress:sync,krReviews:krs,assistance:assistance.filter(item=>item.subject.trim()||item.result.trim()),extraWork:extra,items:selectedWorks.map(item=>({workId:item.id,title:item.title,status:item.status,result:'',impact:''}))});
 const openPicker=(target:string,source:PickerSource)=>{const kr=krs.find(item=>item.keyResultId===target);setPicker({target,source,selection:target==='extra'?[...extra.workIds]:[...(kr?.workIds||[])],keyword:'',status:'all',updated:'all',note:kr?.evidenceNote||''});};
 const pickerCandidates=candidates.filter(item=>picker?.source===workSource(item)).filter(item=>!picker?.keyword.trim()||`${item.title} ${item.id}`.toLowerCase().includes(picker.keyword.trim().toLowerCase())).filter(item=>picker?.status==='all'||(picker?.status==='active'&&!terminalStatuses.has(item.status)&&!item.status.includes('阻塞'))||(picker?.status==='done'&&terminalStatuses.has(item.status))||(picker?.status==='blocked'&&item.status.includes('阻塞'))).filter(item=>{if(!picker||picker.updated==='all')return true;const days=picker.updated==='week'?7:30;return Date.now()-new Date(item.updatedAt).getTime()<=days*86400000;});
 const confirmPicker=()=>{if(!picker)return;if(picker.target==='extra')setExtra(value=>({...value,workIds:picker.selection}));else update(picker.target,{workIds:picker.selection,evidenceNote:picker.note});setPicker(null);};
 const removeWork=(target:string,id:string)=>target==='extra'?setExtra(value=>({...value,workIds:value.workIds.filter(workId=>workId!==id)})):update(target,{workIds:krs.find(kr=>kr.keyResultId===target)?.workIds.filter(workId=>workId!==id)||[]});
 const evidenceColumns=(target:string)=>[
  {title:'类型',width:96,render:(_:unknown,item:OkrWork)=><span>{workSource(item)==='ticket'?'我的工单':'需求任务'}</span>},
  {title:'任务 / 工单',dataIndex:'title',ellipsis:true},
  {title:'状态',width:96,render:(_:unknown,item:OkrWork)=><Tag color={statusColor(item.status)}>{item.status}</Tag>},
  {title:'更新时间',dataIndex:'updatedAt',width:128,render:(value:string)=>value?.slice(0,10)||'-'},
  {title:'负责人',dataIndex:'ownerName',width:96,render:(value:string)=>value||'-'},
  {title:'',width:48,render:(_:unknown,item:OkrWork)=><Tooltip title="移除关联"><Button type="text" danger icon={<Trash2/>} onClick={()=>removeWork(target,item.id)}/></Tooltip>},
 ];

 return <div className="okr-objective-form">
  <div className="okr-objective-period">
    <div style={{flex:1}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h3 style={{margin:0,fontSize:'18px',fontWeight:700}}>{type==='week'?'周复盘':'月复盘'}</h3>
        <div style={{display:'flex',alignItems:'center',gap:'8px',color:'var(--text-muted)',fontSize:'14px'}}>
          <Calendar style={{width:16,height:16}}/>
          <span>{type==='week'?`${period.startDate} 至 ${period.endDate}`:period.startDate.slice(0,7)}</span>
        </div>
      </div>
      <p style={{margin:'4px 0 0',fontSize:'14px',color:'var(--text-muted)',fontWeight:500}}>{type==='week'?'回顾本周目标进展，总结成果与问题，规划下一步行动':'回顾本月目标进展，总结成果与问题，规划下一步行动'}</p>
    </div>
  </div>
  
  <div className="okr-objective-body">
    <section className="okr-review-stats" aria-label="复盘统计"><div><span className="okr-review-stat-icon is-primary"><CheckCircle/></span><p>进行中的 KR<strong>{krs.length}<small>个</small></strong></p></div><div><span className="okr-review-stat-icon is-success"><Link/></span><p>关联工作<strong>{linkedIds.size}<small>项</small></strong></p></div><div><span className="okr-review-stat-icon is-danger"><AlertTriangle/></span><p>阻塞<strong>{blockedCount}<small>项</small></strong></p></div></section>

    <div className="okr-review-layout"><main className="okr-review-main">
     {!objectiveGroups.length&&<div className="okr-review-empty"><Empty description="本周期没有未完成的 KR"/><p>可继续填写非 OKR 额外工作和协助事项</p></div>}
     {objectiveGroups.map(({objective,krs:objectiveKrs},objectiveIndex)=>{const expanded=expandedObjectives.includes(objective.id);return <section className="okr-review-objective" key={objective.id}><button type="button" className="okr-review-objective-head" onClick={()=>setExpandedObjectives(ids=>expanded?ids.filter(id=>id!==objective.id):[...ids,objective.id])}><span><b>O{objectiveIndex+1}</b>{objective.objective}</span><ChevronDown className={expanded?'is-expanded':''}/></button>{expanded&&objectiveKrs.map((kr,krIndex)=>{const evidence=kr.workIds.map(id=>workById.get(id)).filter((item):item is OkrWork=>!!item);return <article className="okr-review-kr" key={kr.keyResultId}><div className="okr-review-kr-head"><div><span>KR{krIndex+1}</span><strong>{kr.keyResultTitle}</strong></div><Radio.Group value={kr.health} onChange={event=>update(kr.keyResultId,{health:event.target.value})} options={[{value:'normal',label:'正常'},{value:'risk',label:'有风险'},{value:'blocked',label:'已阻塞'}]}/></div><div className="okr-review-progress"><span>{kr.previousProgress}%</span><Slider min={0} max={100} value={kr.currentProgress} onChange={value=>update(kr.keyResultId,{currentProgress:value})}/><InputNumber aria-label={`${kr.keyResultTitle}确认进度`} min={0} max={100} value={kr.currentProgress} onChange={value=>update(kr.keyResultId,{currentProgress:value||0})} addonAfter="%"/></div><div className="okr-review-evidence-head"><strong>工作证据</strong><div><Button icon={<Link/>} onClick={()=>openPicker(kr.keyResultId,'task')}>关联任务或工单</Button></div></div>{evidence.length?<Table<OkrWork> size="small" rowKey="id" pagination={false} dataSource={evidence} columns={evidenceColumns(kr.keyResultId)}/>:<div className="okr-review-inline-empty">尚未关联工作证据</div>}<div className="okr-review-narratives"><label><span><i>*</i> 本期成果</span><Input.TextArea rows={4} maxLength={500} showCount value={kr.achievement} onChange={event=>update(kr.keyResultId,{achievement:event.target.value})} placeholder="填写交付结果、数据变化和里程碑"/></label><label><span><i>*</i> 阻塞与风险</span><Input.TextArea rows={4} maxLength={500} showCount value={kr.blocker} onChange={event=>update(kr.keyResultId,{blocker:event.target.value})} placeholder="填写风险、依赖和需要协调的事项"/></label><label><span><i>*</i> 下一步计划</span><Input.TextArea rows={4} maxLength={500} showCount value={kr.nextPlan} onChange={event=>update(kr.keyResultId,{nextPlan:event.target.value})} placeholder="填写下一周期的行动和预期结果"/></label></div></article>})}</section>})}

     <section className="okr-review-section"><div className="okr-review-section-head"><div><h3>非 OKR 额外工作 <Tooltip title="记录未直接支撑 KR 的任务、工单和临时事项"><Info/></Tooltip></h3><p>这些工作不需要隶属于已有 KR。</p></div><div><Button icon={<Link/>} onClick={()=>openPicker('extra','task')}>关联任务或工单</Button></div></div>{extra.workIds.length?<Table<OkrWork> size="small" rowKey="id" pagination={false} dataSource={extra.workIds.map(id=>workById.get(id)).filter((item):item is OkrWork=>!!item)} columns={[...evidenceColumns('extra').slice(0,3),{title:'工作说明',render:(_:unknown,item:OkrWork)=><Input maxLength={200} showCount value={extra.notes[item.id]||''} onChange={event=>setExtra(value=>({...value,notes:{...value.notes,[item.id]:event.target.value}}))} placeholder="填写该项工作的结果"/>},evidenceColumns('extra')[5]]}/>:<div className="okr-review-inline-empty">暂无额外工作，可关联任务或工单</div>}<div className="okr-review-impact"><span><i>*</i> 对 OKR 的影响</span><Radio.Group value={extra.impact} onChange={event=>setExtra(value=>({...value,impact:event.target.value}))} options={[{value:'none',label:'无明显影响'},{value:'support',label:'挤占 KR 投入'},{value:'block',label:'关联 KR'}]}/></div></section>

     <section className="okr-review-section"><div className="okr-review-section-head"><div><h3>协助与协同事项 <Tooltip title="记录没有对应任务或工单的支持工作"><Info/></Tooltip></h3><p>此部分用于没有对应任务或工单的支持工作。</p></div><Button icon={<Plus/>} onClick={()=>setAssistance(items=>[...items,{subject:'',result:''}])}>新增事项</Button></div>{assistance.map((item,index)=><div className="okr-review-assistance" key={index}><label><span>{index===0&&<i>*</i>} 协助对象与事项</span><Input.TextArea rows={3} maxLength={500} showCount value={item.subject} onChange={event=>setAssistance(items=>items.map((row,rowIndex)=>rowIndex===index?{...row,subject:event.target.value}:row))}/></label><label><span>协助结果</span><Input.TextArea rows={3} maxLength={500} showCount value={item.result} onChange={event=>setAssistance(items=>items.map((row,rowIndex)=>rowIndex===index?{...row,result:event.target.value}:row))}/></label>{assistance.length>1&&<Button type="text" danger icon={<Trash2/>} onClick={()=>setAssistance(items=>items.filter((_,rowIndex)=>rowIndex!==index))}/>}</div>)}</section>
    </main>

    <aside className="okr-review-aside"><section><header>复盘进度概览</header><div className="okr-review-stat-row"><label>平均进度变化</label><Progress percent={currentAverage} strokeColor={currentAverage>=previousAverage?'var(--success)':'var(--warning)'} trailColor="var(--bg-surface-soft)" format={()=>`${previousAverage}% → ${currentAverage}%`}/></div><div className="okr-review-stat-row"><label>已阻塞 KR</label><span style={{color:blockedCount?'var(--danger)':'var(--text-muted)'}}>{blockedCount} / {krs.length}</span></div><div className="okr-review-stat-row"><label>同步 KR 进度</label><Checkbox checked={sync} onChange={e=>setSync(e.target.checked)}>提交后更新目标进度</Checkbox></div></section><section><header>提交前检查</header><ul className="okr-review-checks">{checks.map((check,index)=><li key={index} className={check.ok?'is-done':''}><CheckCircle/>{check.label}</li>)}</ul>{missingKrs.length>0&&<Alert type="warning" title={`还有 ${missingKrs.length} 条 KR 未完整填写`} description="本期成果和下一步计划为必填项"/>}</section><section><Button block type="primary" icon={<Send/>} loading={busy} disabled={!title.trim()} onClick={()=>onSubmit(payload())}>提交{type==='week'?'周报':'月报'}</Button><Button block icon={<Save/>} loading={busy} onClick={()=>onSaveDraft(payload())}>保存草稿</Button><Button block onClick={onCancel}>退出编辑</Button></section></aside></div>
  </div>

  <Modal className="okr-work-picker-shell" open={!!picker} title="关联任务或工单" width={1120} onCancel={()=>setPicker(null)} footer={[<Button key="cancel" onClick={()=>setPicker(null)}>取消</Button>,<Button key="confirm" type="primary" onClick={confirmPicker}>确认关联 ({picker?.selection.length||0})</Button>]}>
   {picker&&<div className="okr-work-picker">
    <aside className="okr-work-picker-nav"><div className="okr-work-picker-tabs"><button type="button" className={picker.source==='task'?'is-active':''} onClick={()=>setPicker(value=>value&&({...value,source:'task'}))}>我的任务</button><button type="button" className={picker.source==='ticket'?'is-active':''} onClick={()=>setPicker(value=>value&&({...value,source:'ticket'}))}>我的工单</button></div><nav><button type="button" className={picker.status==='all'?'is-active':''} onClick={()=>setPicker(value=>value&&({...value,status:'all'}))}><CheckCircle/>本期有进展 <b>{candidates.filter(item=>workSource(item)===picker.source).length}</b></button><button type="button" className={picker.status==='active'?'is-active':''} onClick={()=>setPicker(value=>value&&({...value,status:'active'}))}><Play/>进行中 <b>{candidates.filter(item=>workSource(item)===picker.source&&!terminalStatuses.has(item.status)&&!item.status.includes('阻塞')).length}</b></button><button type="button" className={picker.status==='done'?'is-active':''} onClick={()=>setPicker(value=>value&&({...value,status:'done'}))}><CheckCircle/>已完成 <b>{candidates.filter(item=>workSource(item)===picker.source&&terminalStatuses.has(item.status)).length}</b></button><button type="button" className={picker.status==='blocked'?'is-active':''} onClick={()=>setPicker(value=>value&&({...value,status:'blocked'}))}><XCircle/>已阻塞 <b>{candidates.filter(item=>workSource(item)===picker.source&&item.status.includes('阻塞')).length}</b></button></nav></aside>
    <main className="okr-work-picker-main"><div className="okr-work-picker-filters"><Input allowClear prefix={<Search/>} value={picker.keyword} onChange={event=>setPicker(value=>value&&({...value,keyword:event.target.value}))} placeholder="搜索任务名称或编号"/><Select value={picker.status} onChange={status=>setPicker(value=>value&&({...value,status}))} options={[{value:'all',label:'全部状态'},{value:'active',label:'进行中'},{value:'done',label:'已完成'},{value:'blocked',label:'已阻塞'}]}/><Select value={picker.updated} onChange={updated=>setPicker(value=>value&&({...value,updated}))} options={[{value:'all',label:'全部时间'},{value:'week',label:'近 7 天'},{value:'month',label:'近 30 天'}]}/></div>{workError&&<Alert type="error" title="工作项加载失败" action={<Button onClick={onRefreshWork}>重试</Button>}/>}<Table<OkrWork> size="small" rowKey="id" loading={workLoading} pagination={false} dataSource={pickerCandidates} rowSelection={{selectedRowKeys:picker.selection,onChange:keys=>setPicker(value=>value&&({...value,selection:keys as string[]})),getCheckboxProps:item=>({disabled:linkedIds.has(item.id)&&!picker.selection.includes(item.id)})}} columns={[{title:'类型',width:64,render:()=>picker.source==='ticket'?'工单':'任务'},{title:'任务编号',dataIndex:'sourceId',width:128,ellipsis:true},{title:'任务标题',dataIndex:'title',ellipsis:true},{title:'状态',dataIndex:'status',width:88,render:(status:string)=><Tag color={statusColor(status)}>{status}</Tag>},{title:'更新时间',dataIndex:'updatedAt',width:112,render:(value:string)=>value?.slice(0,10)||'-'},{title:'负责人',dataIndex:'ownerName',width:80,render:(value:string)=>value||'-'}]}/>{!workLoading&&!pickerCandidates.length&&<Empty description="当前条件下暂无可关联工作"/>}</main>
    <aside className="okr-work-picker-selected"><h3>已选择 {picker.selection.length}</h3><div className="okr-work-picker-selected-list">{picker.selection.map(id=>{const item=workById.get(id);return item&&<div key={id}><span><b>{item.sourceId||item.id}</b><small>{item.title}</small></span><Button type="text" icon={<Trash2/>} onClick={()=>setPicker(value=>value&&({...value,selection:value.selection.filter(workId=>workId!==id)}))}/></div>})}</div><label>支撑 KR<Select disabled={picker.target==='extra'} value={picker.target==='extra'?undefined:picker.target} options={krs.map((kr,index)=>({value:kr.keyResultId,label:`KR${index+1} ${kr.keyResultTitle}`}))}/></label><label>本期进展备注<Input.TextArea rows={6} maxLength={500} showCount value={picker.note} onChange={event=>setPicker(value=>value&&({...value,note:event.target.value}))} placeholder="请输入本期进展备注"/></label><p><Info/> 所选工作仅作为本次复盘证据，不修改原任务与工单。</p></aside>
   </div>}
  </Modal>
 </div>;
}




