import React, { useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Modal, Progress, Radio, Select, Slider, Table, Tabs, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { OKRItem } from '../../../types';
import type { OkrPayload, OkrWork } from '../../../services/okrRepository';
import { AlertTriangle, CheckCircle, ChevronDown, Link, Plus, Save, Search, Send, Trash2 } from '@/components/common/octicons-compat';
import { periodWork } from './workAggregation';
import { reviewPeriod } from './simpleReview';

type Health = 'normal' | 'risk' | 'blocked';
type PickerSource = 'task' | 'ticket';
type PickerState = { target: string; source: PickerSource; selection:string[]; keyword:string; status:string } | null;
type ManualWork = { id:string; content:string; source:string; status:string; hours:string; impact:string; note:string };
export interface KrReviewDraft { objectiveId: string; objectiveTitle: string; keyResultId: string; keyResultTitle: string; previousProgress: number; currentProgress: number; health: Health; achievement: string; blocker: string; nextPlan: string; evidenceNote?:string; workIds: string[] }
export interface AssistanceDraft { subject: string; result: string }

const terminalStatuses = new Set(['已完成', '已发布', '已验收', '已关闭']);
const statusColor = (status: string) => terminalStatuses.has(status) ? 'success' : status.includes('阻塞') || status.includes('驳回') ? 'error' : 'processing';
const taskKinds = new Set(['product_requirement', 'product_design_task', 'product_dev_task', 'product_bug']);
const workSource = (item: OkrWork): PickerSource => taskKinds.has(item.kind) ? 'task' : 'ticket';

export function StructuredReviewEditor({ type, okrs, work, busy, workLoading, workError, onRefreshWork, onSaveDraft, onSubmit, onCancel, onAddObjective }: { key?: React.Key; type: 'week'|'month'; okrs: OKRItem[]; work: OkrWork[]; busy: boolean; workLoading: boolean; workError?: unknown; onRefreshWork: ()=>void; onSaveDraft:(payload:OkrPayload)=>Promise<boolean>; onSubmit:(payload:OkrPayload)=>Promise<boolean>; onCancel:()=>void; onAddObjective?:()=>void }) {
 const initialPeriod = useMemo(()=>reviewPeriod(type),[type]);
 const period = initialPeriod;
 const reviewTitle = type === 'week' ? `${dayjs(period.startDate).year()}年第${dayjs(period.startDate).diff(dayjs(period.startDate).startOf('year'), 'week') + 1}周 周报复盘` : `${dayjs(period.startDate).format('YYYY年M月')} 月报复盘`;
 const [selfScore,setSelfScore]=useState(90);
 const [sync,setSync]=useState(true);
 const [picker,setPicker]=useState<PickerState>(null);
 const [expandedObjectives,setExpandedObjectives]=useState<string[]>(()=>okrs.map(o=>o.id));
 const [selectedObjectiveIds,setSelectedObjectiveIds]=useState<string[]>(()=>okrs.map(o=>o.id));
 const [objectivePickerId,setObjectivePickerId]=useState<string|null>(null);
 const [krs,setKrs]=useState<KrReviewDraft[]>(okrs.flatMap(o=>(o.keyResults||[]).filter(k=>k.progress<100).map(k=>({objectiveId:o.id,objectiveTitle:o.objective,keyResultId:k.id,keyResultTitle:k.content,previousProgress:k.progress,currentProgress:k.progress,health:'normal' as Health,achievement:'',blocker:'',nextPlan:'',workIds:[]}))));
 const [extra,setExtra]=useState<{workIds:string[];description:string;impact:string;notes:Record<string,string>}>({workIds:[],description:'',impact:'none',notes:{}});
 const [manualWorks,setManualWorks]=useState<ManualWork[]>([]);
 const [assistance,setAssistance]=useState<AssistanceDraft[]>([{subject:'',result:''}]);
 const candidates=useMemo(()=>periodWork(work,period.startDate,period.endDate),[work,period.startDate,period.endDate]);
 const workById=useMemo(()=>new Map(candidates.map(item=>[item.id,item])),[candidates]);
 const update=(id:string,p:Partial<KrReviewDraft>)=>setKrs(rows=>rows.map(row=>row.keyResultId===id?{...row,...p}:row));
 const linkedIds=new Set(krs.flatMap(kr=>kr.workIds).concat(extra.workIds));
 const selectedKrs=krs.filter(kr=>selectedObjectiveIds.includes(kr.objectiveId));
const objectiveGroups=okrs.filter(objective=>selectedObjectiveIds.includes(objective.id)).map(objective=>({objective,krs:krs.filter(kr=>kr.objectiveId===objective.id)})).filter(group=>group.krs.length);
 const currentAverage=krs.length?Math.round(krs.reduce((sum,kr)=>sum+kr.currentProgress,0)/krs.length):0;
 const previousAverage=krs.length?Math.round(krs.reduce((sum,kr)=>sum+kr.previousProgress,0)/krs.length):0;
 const blockedCount=krs.filter(kr=>kr.health==='blocked'||kr.blocker.trim()).length;
 const selectedWorks=[...linkedIds].map(id=>workById.get(id)).filter((item):item is OkrWork=>!!item);
 const missingKrs=krs.filter(kr=>!kr.achievement.trim()||!kr.nextPlan.trim());
 const checks=[
  {label:'KR 进度已填写',ok:selectedKrs.every(kr=>Number.isFinite(kr.currentProgress))},
  {label:'工作证据已关联',ok:selectedKrs.length===0||selectedKrs.every(kr=>kr.workIds.length>0)},
  {label:'阻塞原因已填写',ok:selectedKrs.filter(kr=>kr.health!=='normal').every(kr=>kr.blocker.trim())},
  {label:'协助事项已说明',ok:assistance.every(item=>(!item.subject.trim()&&!item.result.trim())||Boolean(item.subject.trim()&&item.result.trim()))},
 ];
 const payload=():OkrPayload=>({title:reviewTitle,startDate:period.startDate,endDate:period.endDate,reviewType:type,reviewMode:'structured',selfScore,syncKrProgress:sync,krReviews:selectedKrs,assistance:assistance.filter(item=>item.subject.trim()||item.result.trim()),extraWork:{...extra,description:manualWorks.length?JSON.stringify(manualWorks):extra.description},items:selectedWorks.map(item=>({workId:item.id,title:item.title,status:item.status,result:'',impact:''}))});
 const changeObjectives=(ids:string[])=>setSelectedObjectiveIds(ids);
 const openPicker=(target:string,source:PickerSource='task')=>{const kr=krs.find(item=>item.keyResultId===target);setPicker({target,source,selection:target==='extra'?[...extra.workIds]:[...(kr?.workIds||[])],keyword:'',status:'all'});};
 const pickerCandidates=candidates.filter(item=>picker?.source===workSource(item)).filter(item=>['待处理','处理中','已完成'].includes(item.status)).filter(item=>item.status!=='已完成'||(!dayjs(item.updatedAt).isBefore(period.startDate,'day')&&!dayjs(item.updatedAt).isAfter(period.endDate,'day'))).filter(item=>!picker?.keyword.trim()||`${item.title} ${item.id}`.toLowerCase().includes(picker.keyword.trim().toLowerCase())).filter(item=>picker?.status==='all'||item.status===picker.status);
 const changeType=(item:OkrWork)=>item.createdAt>=period.startDate&&item.createdAt<=period.endDate?'本期新建':item.status==='已完成'?'本期完成':'本期进行中';
 const confirmPicker=()=>{if(!picker)return;if(picker.target==='extra')setExtra(value=>({...value,workIds:picker.selection}));else update(picker.target,{workIds:picker.selection});setPicker(null);};
 const removeWork=(target:string,id:string)=>target==='extra'?setExtra(value=>({...value,workIds:value.workIds.filter(workId=>workId!==id)})):update(target,{workIds:krs.find(kr=>kr.keyResultId===target)?.workIds.filter(workId=>workId!==id)||[]});
 const evidenceColumns=(target:string)=>[
  {title:'来源',width:96,render:(_:unknown,item:OkrWork)=><span>{workSource(item)==='ticket'?'工单':'周报'}</span>},
  {title:'标题',dataIndex:'title',ellipsis:true},
  {title:'状态',width:96,render:(_:unknown,item:OkrWork)=><Tag color={statusColor(item.status)}>{item.status}</Tag>},
  {title:'更新时间',dataIndex:'updatedAt',width:128,render:(value:string)=>value?.slice(0,10)||'-'},
  {title:'关联 KR',width:180,render:()=>{const kr=krs.find(item=>item.keyResultId===target);return kr?kr.keyResultTitle:'非 OKR 工作';}},
  {title:'进度说明',width:180,render:()=>krs.find(item=>item.keyResultId===target)?.evidenceNote||'-'},
  {title:'',width:48,render:(_:unknown,item:OkrWork)=><Tooltip title="移除关联"><Button type="text" danger icon={<Trash2/>} onClick={()=>removeWork(target,item.id)}/></Tooltip>},
 ];

 return <div className="okr-objective-form">
  <div className="okr-objective-period">
    <div style={{flex:1}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h3 style={{margin:0,fontSize:'18px',fontWeight:700}}>{reviewTitle}</h3>
      </div>
    </div>
  </div>
  
  <div className="okr-objective-body">
    <section className="okr-review-stats" aria-label="复盘统计"><div><span className="okr-review-stat-icon is-primary"><CheckCircle/></span><p>进行中的 KR<strong>{krs.length}<small>个</small></strong></p></div><div><span className="okr-review-stat-icon is-success"><Link/></span><p>关联工作<strong>{linkedIds.size}<small>项</small></strong></p></div><div><span className="okr-review-stat-icon is-danger"><AlertTriangle/></span><p>阻塞<strong>{blockedCount}<small>项</small></strong></p></div></section>

    <div className="okr-review-layout"><main className="okr-review-main">
     <div className="okr-review-category"><div className="okr-review-category-head"><h2>1. OKR 目标复盘</h2><Button type="primary" icon={<Plus/>} onClick={onAddObjective}>添加目标</Button></div>{!objectiveGroups.length&&<div className="okr-review-empty"><Empty description="本周期没有未完成的 KR"/><p>可继续添加目标或填写非 OKR 额外工作</p></div>}{objectiveGroups.map(({objective, krs:objectiveKrs})=>{const expanded=expandedObjectives.includes(objective.id);const objectiveNumber=okrs.findIndex(item=>item.id===objective.id)+1;return <div className="okr-review-objective-wrap" key={objective.id}><div className="okr-review-objective-title"><span><b>O{objectiveNumber}</b>{objective.objective}</span><div className="okr-review-objective-actions"><Button type="text" aria-label="关联 OKR" icon={<Link/>} onClick={()=>setObjectivePickerId(value=>value===objective.id?null:objective.id)}/><Button type="text" aria-label={expanded?'收起 OKR':'展开 OKR'} icon={<ChevronDown className={expanded?'is-expanded':''}/>} onClick={()=>setExpandedObjectives(ids=>expanded?ids.filter(id=>id!==objective.id):[...ids,objective.id])}/></div></div>{objectivePickerId===objective.id&&<div className="okr-review-objective-picker"><Select mode="multiple" className="w-full" value={selectedObjectiveIds} onChange={changeObjectives} placeholder="选择需要复盘的 O" optionFilterProp="label" options={okrs.map((item,index)=>({value:item.id,label:`O${index+1} ${item.objective}`}))}/></div>}<section className="okr-review-objective">{expanded&&objectiveKrs.map((kr,krIndex)=>{const evidence=kr.workIds.map(id=>workById.get(id)).filter((item):item is OkrWork=>!!item);return <article className="okr-review-kr" key={kr.keyResultId}><div className="okr-review-kr-head"><div><span>KR{krIndex+1}</span><strong>{kr.keyResultTitle}</strong></div><Radio.Group value={kr.health} onChange={event=>update(kr.keyResultId,{health:event.target.value})} options={[{value:'normal',label:'正常'},{value:'risk',label:'有风险'},{value:'blocked',label:'已阻塞'}]}/></div><div className="okr-review-progress"><span>{kr.previousProgress}%</span><Slider min={0} max={100} value={kr.currentProgress} onChange={value=>update(kr.keyResultId,{currentProgress:value})}/><InputNumber aria-label={`${kr.keyResultTitle}确认进度`} min={0} max={100} value={kr.currentProgress} onChange={value=>update(kr.keyResultId,{currentProgress:value||0})} addonAfter="%"/></div><div className="okr-review-evidence-divider"/><div className="okr-review-evidence-head"><strong>本期关联工作证据</strong><div><Button icon={<Link/>} onClick={()=>openPicker(kr.keyResultId)}>关联任务或工单</Button></div></div>{evidence.length?<Table<OkrWork> size="small" rowKey="id" pagination={false} dataSource={evidence} columns={evidenceColumns(kr.keyResultId)}/>:<div className="okr-review-inline-empty">暂无关联工作证据</div>}<div className="okr-review-narratives"><label><span><i>*</i> 本期成果</span><Input.TextArea rows={4} maxLength={500} showCount value={kr.achievement} onChange={event=>update(kr.keyResultId,{achievement:event.target.value})} placeholder="填写交付结果、数据变化和里程碑"/></label><label><span><i>*</i> 阻塞与风险</span><Input.TextArea rows={4} maxLength={500} showCount value={kr.blocker} onChange={event=>update(kr.keyResultId,{blocker:event.target.value})} placeholder="填写风险、依赖和需要协调的事项"/></label><label><span><i>*</i> 下一步计划</span><Input.TextArea rows={4} maxLength={500} showCount value={kr.nextPlan} onChange={event=>update(kr.keyResultId,{nextPlan:event.target.value})} placeholder="填写下一周期的行动和预期结果"/></label></div></article>})}</section></div>})}</div>

     <section className="okr-review-section"><div className="okr-review-section-head"><div><h3>2. 非 OKR 额外工作</h3></div><div><Button icon={<Link/>} onClick={()=>openPicker('extra')}>关联任务或工单</Button><Button icon={<Plus/>} onClick={()=>setManualWorks(rows=>[...rows,{id:`manual-${Date.now()}`,content:'',source:'手工记录',status:'进行中',hours:'',impact:'无明显影响',note:''}])}>手工记一项</Button></div></div>{extra.workIds.length?<Table<OkrWork> size="small" rowKey="id" pagination={false} dataSource={extra.workIds.map(id=>workById.get(id)).filter((item):item is OkrWork=>!!item)} columns={[...evidenceColumns('extra').slice(0,3),{title:'工作说明',render:(_:unknown,item:OkrWork)=><Input maxLength={200} value={extra.notes[item.id]||''} onChange={event=>setExtra(value=>({...value,notes:{...value.notes,[item.id]:event.target.value}}))} placeholder="填写该项工作的结果"/>},evidenceColumns('extra')[6]]}/>:null}{manualWorks.length?<Table<ManualWork> size="small" rowKey="id" pagination={false} dataSource={manualWorks} columns={[{title:'工作内容',render:(_:unknown,row:ManualWork)=><Input value={row.content} onChange={e=>setManualWorks(rows=>rows.map(item=>item.id===row.id?{...item,content:e.target.value}:item))} placeholder="填写工作内容"/>},{title:'来源',dataIndex:'source',width:100},{title:'状态',render:(_:unknown,row:ManualWork)=><Select value={row.status} onChange={status=>setManualWorks(rows=>rows.map(item=>item.id===row.id?{...item,status}:item))} options={['进行中','已完成','已阻塞'].map(value=>({value,label:value}))}/>},{title:'占用时间',render:(_:unknown,row:ManualWork)=><Input value={row.hours} onChange={e=>setManualWorks(rows=>rows.map(item=>item.id===row.id?{...item,hours:e.target.value}:item))} placeholder="小时"/>},{title:'对 OKR 影响',render:(_:unknown,row:ManualWork)=><Select value={row.impact} onChange={impact=>setManualWorks(rows=>rows.map(item=>item.id===row.id?{...item,impact}:item))} options={['无明显影响','挤占 KR 投入','支持 KR'].map(value=>({value,label:value}))}/>},{title:'备注',render:(_:unknown,row:ManualWork)=><Input value={row.note} onChange={e=>setManualWorks(rows=>rows.map(item=>item.id===row.id?{...item,note:e.target.value}:item))}/>},{title:'',width:48,render:(_:unknown,row:ManualWork)=><Button type="text" danger icon={<Trash2/>} onClick={()=>setManualWorks(rows=>rows.filter(item=>item.id!==row.id))}/>}]}/>:!extra.workIds.length&&<div className="okr-review-inline-empty">暂无非 OKR 额外工作</div>}</section>

     <section className="okr-review-section"><div className="okr-review-section-head"><div><h3>3. 需要协助或反馈的事项说明</h3></div></div><Input.TextArea className="okr-review-assistance-input" rows={10} maxLength={2000} showCount value={assistance[0]?.result || ''} onChange={event=>setAssistance(items=>[{subject:'',result:event.target.value},...items.slice(1)])} placeholder="请输入需要协助、协调或反馈的事项"/></section>
    </main>

     <aside className="okr-review-aside"><section><header>复盘进度概览</header><div className="okr-review-stat-row"><label>平均进度变化</label><Progress percent={currentAverage} strokeColor={currentAverage>=previousAverage?'var(--success)':'var(--warning)'} trailColor="var(--bg-surface-soft)" format={()=>`${previousAverage}% → ${currentAverage}%`}/></div><div className="okr-review-stat-row"><label>已阻塞 KR</label><span style={{color:blockedCount?'var(--danger)':'var(--text-muted)'}}>{blockedCount} / {krs.length}</span></div><div className="okr-review-stat-row"><label>同步 KR 进度</label><Checkbox checked={sync} onChange={e=>setSync(e.target.checked)}>提交后更新目标进度</Checkbox></div></section><section><header>提交前检查</header><ul className="okr-review-checks">{checks.map((check,index)=><li key={index} className={check.ok?'is-done':''}><CheckCircle/>{check.label}</li>)}</ul>{missingKrs.length>0&&<Alert type="warning" title={`还有 ${missingKrs.length} 条 KR 未完整填写`} description="本期成果和下一步计划为必填项"/>}</section><section><Button block type="primary" icon={<Send/>} loading={busy} onClick={()=>onSubmit(payload())}>提交{type==='week'?'周报':'月报'}</Button><Button block icon={<Save/>} loading={busy} onClick={()=>onSaveDraft(payload())}>保存草稿</Button><Button block onClick={onCancel}>退出编辑</Button></section></aside></div>
  </div>

  <Modal
   className="okr-work-picker-shell"
   open={!!picker}
   title="关联我的工作数据"
   width={1120}
   onCancel={()=>setPicker(null)}
   footer={[<span key="count" className="okr-work-picker-footer-count">已选择 <b>{picker?.selection.length||0}</b> 项任务或工单</span>,<Button key="cancel" size="large" onClick={()=>setPicker(null)}>取消</Button>,<Button key="confirm" size="large" type="primary" onClick={confirmPicker}>确认关联（{picker?.selection.length||0}）</Button>]}
  >
   {picker&&<div className="okr-work-picker">
    <Tabs
     className="okr-work-picker-tabs"
     activeKey={picker.source}
     onChange={source=>setPicker(value=>value&&({...value,source:source as PickerSource,status:'all'}))}
     items={[{key:'task',label:'我的任务'},{key:'ticket',label:'我的工单'}]}
    />
    <div className="okr-work-picker-filter-row">
     <Input size="large" allowClear prefix={<Search/>} value={picker.keyword} onChange={event=>setPicker(value=>value&&({...value,keyword:event.target.value}))} placeholder="搜索任务名称或编号"/>
     <Select size="large" value={picker.status} onChange={status=>setPicker(value=>value&&({...value,status}))} options={[{value:'all',label:'全部状态'},{value:'待处理',label:'待处理'},{value:'处理中',label:'处理中'},{value:'已完成',label:'已完成'}]}/>
    </div>
    <main className="okr-work-picker-main">{workError&&<Alert type="error" title="工作项加载失败" action={<Button onClick={onRefreshWork}>重试</Button>}/>}<Table<OkrWork> rowKey="id" loading={workLoading} pagination={false} dataSource={pickerCandidates} locale={{emptyText:<Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前条件下暂无可关联工作"/>}} rowSelection={{selectedRowKeys:picker.selection,onChange:keys=>setPicker(value=>value&&({...value,selection:keys as string[]})),getCheckboxProps:item=>({disabled:linkedIds.has(item.id)&&!picker.selection.includes(item.id)})}} columns={[{title:'标题',dataIndex:'title',ellipsis:true},{title:'当前状态',dataIndex:'status',width:120,render:(status:string)=><Tag color={statusColor(status)}>{status}</Tag>},{title:'本期变化类型',width:140,render:(_:unknown,item:OkrWork)=><span>{changeType(item)}</span>},{title:'更新时间',dataIndex:'updatedAt',width:140,render:(value:string)=>value?.slice(0,16).replace('T',' ')||'-'},{title:'选择操作',width:100,render:(_:unknown,item:OkrWork)=><Button type="link" disabled={linkedIds.has(item.id)&&!picker.selection.includes(item.id)} onClick={()=>setPicker(value=>value&&({...value,selection:value.selection.includes(item.id)?value.selection.filter(id=>id!==item.id):[...value.selection,item.id]}))}>{picker.selection.includes(item.id)?'取消选择':'选择'}</Button>}]}/></main>
   </div>}
  </Modal>
 </div>;
}
