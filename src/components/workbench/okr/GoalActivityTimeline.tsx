import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Select, Skeleton, Tag } from 'antd';
import { ArrowRightIcon, ArrowUpIcon, ArrowDownIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { PersonAvatar } from '../../common/PersonIdentity';
import { okrRepository, type OkrPerson, type OkrRecord } from '../../../services/okrRepository';
import { goalDifferences, type GoalDifference } from './goalConfirmation';
import { progressSubject } from '../../../services/okrProgress';

type ActivityKind = 'confirmation' | 'change' | 'progress' | 'event';
type Activity = { id: string; kind: ActivityKind; operator: string; department?: string; time: string; title: string; subject?: string; note?: string; differences?: GoalDifference[]; status?: string };
const statuses: Record<string,string> = {normal:'正常',risk:'有风险',overdue:'逾期',ahead:'超预期'};
export function goalActivities(record: OkrRecord, people: OkrPerson[], events: Array<{action:string;operator:string;createdAt:string}> = []): Activity[] {
  const person = (id:string) => people.find(item=>item.id===id);
  const history = [...new Map([...(record.changeHistory||[]),...(record.changeRequest && record.changeRequest.status!=='pending' ? [record.changeRequest] : [])].map(change=>[change.id,change])).values()];
  const rows: Activity[] = history.map(change=>{
    const reviewer=person(change.reviewerId); const approved=change.status==='approved'; const withdrawn=change.feedback==='申请人撤回';
    return {id:'change:'+change.id,kind:change.purpose==='initial'?'confirmation':'change',operator:withdrawn?person(record.ownerId)?.name||'申请人':reviewer?.name||'审核人',department:withdrawn?person(record.ownerId)?.department:reviewer?.department,time:change.reviewedAt||change.requestedAt,title:withdrawn?'撤回确认':approved?change.purpose==='initial'?'目标确认通过':change.purpose==='delete'?'删除确认通过':change.reviewerId===record.ownerId?'修改目标':'修改确认通过':'建议修改',subject:change.payload.title,status:approved?'approved':'returned',note:[change.reason,change.feedback].filter(Boolean).join('；'),differences:change.previousPayload ? goalDifferences(change.previousPayload,change.payload,people) : change.purpose==='initial'?undefined:[{id:'missing',label:'修改内容',before:'历史原内容未记录',after:change.payload.title}]};
  });
  const progress=record.progressHistory||[];
  progress.forEach((entry,index)=>{
    const author=person(entry.operatorId); const prior=progress.slice(0,index).filter(item=>item.itemId===entry.itemId).at(-1);
    rows.push({id:'progress:'+entry.id,kind:'progress',operator:author?.name||'未知人员',department:author?.department,time:entry.createdAt,title:'更新进度',subject:progressSubject(record,entry.itemId)?.title||'历史目标项',note:entry.note,differences:[{id:'status',label:'状态',before:prior?statuses[prior.status]:'未记录',after:statuses[entry.status]||entry.status},{id:'progress',label:'进度',before:entry.previousProgress+'%',after:entry.progress+'%'}]});
  });
  events.forEach((event,index)=>{if(history.some(change=>(change.reviewedAt||change.requestedAt)===event.createdAt))return;rows.push({id:'event:'+index,kind:'event',operator:event.operator,time:event.createdAt,title:({create:'新建目标',save:'保存目标',submit:'提交目标',update:'修改目标'} as Record<string,string>)[event.action]||event.action});});
  const earliest = [...history].sort((a,b)=>a.requestedAt.localeCompare(b.requestedAt))[0];
  const createdTitle = earliest?.previousPayload?.title || (earliest?.purpose === 'initial' ? earliest.payload.title : !history.length ? record.payload.title : undefined);
  if(record.createdAt&&!rows.some(row=>row.time===record.createdAt&&row.title==='新建目标'))rows.push({id:'created',kind:'event',operator:person(record.ownerId)?.name||'制定人',department:person(record.ownerId)?.department,time:record.createdAt,title:'新建目标',subject:createdTitle});
  return rows.sort((a,b)=>b.time.localeCompare(a.time));
}
export function GoalActivityTimeline({record,people}:{record:OkrRecord;people:OkrPerson[]}) {
  const [events,setEvents]=useState<Array<{action:string;operator:string;createdAt:string}>>([]);
  const [loading,setLoading]=useState(true);const [error,setError]=useState(false);const [retry,setRetry]=useState(0);
  const [filter,setFilter]=useState<'all'|ActivityKind>('all');
  useEffect(()=>{let active=true;setEvents([]);setLoading(true);setError(false);void okrRepository.events(record.id).then(value=>{if(active)setEvents(value);}).catch(()=>{if(active)setError(true);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[record.id,record.version,retry]);
  const all=goalActivities(record,people,events);const rows=all.filter(row=>filter==='all'||row.kind===filter);
  return <aside className="company-detail-events okr-activity-timeline" aria-label="所有记录" tabIndex={0}>
    <header><Select aria-label="记录类型" value={filter} onChange={setFilter} options={[{value:'all',label:'所有记录（'+all.length+'）'},{value:'confirmation',label:'确认记录'},{value:'change',label:'修改记录'},{value:'progress',label:'进度记录'}]}/></header>
    {loading && <Skeleton active paragraph={{rows:2}}/>}
    {error && <Alert type="error" title="动态记录加载失败" action={<Button onClick={()=>setRetry(value=>value+1)}>重试</Button>}/>}
    {!loading&&!rows.length&&!error && <Empty description="暂无动态记录"/>}
    {rows.map(row=><article className={`okr-activity-entry${row.kind === 'event' ? ' is-simple' : ''}`} key={row.id} tabIndex={0}>
      <header><PersonAvatar name={row.operator}/><div><strong>{row.operator}</strong>{row.department&&<span>{row.department}</span>}</div><time title={row.time}>{dayjs(row.time).isValid()?dayjs(row.time).format('MM-DD HH:mm'):row.time}</time></header>
      <div className="okr-activity-card"><div className="okr-activity-card-heading"><strong>{row.title}</strong>{row.status&&<Tag color={row.status==='approved'?'success':'warning'}>{row.status==='approved'?'已通过':'已退回'}</Tag>}</div>{row.subject&&<blockquote>{row.subject}</blockquote>}
        {row.differences?.map(change=><div className="okr-activity-difference" key={change.id}><span>{change.label}</span><div><span className={`is-before${change.id === 'status' ? ' is-status' : ''}`}><span className={`okr-activity-status-dot is-${Object.keys(statuses).find(key=>statuses[key]===change.before) || 'unknown'}`}/>{change.before}</span><ArrowRightIcon/><span className={`is-after${change.id === 'status' ? ' is-status' : ''}`}><span className={`okr-activity-status-dot is-${Object.keys(statuses).find(key=>statuses[key]===change.after) || 'unknown'}`}/>{change.after}</span>{change.id === 'progress' && Number.parseFloat(change.after) !== Number.parseFloat(change.before) && <span className="okr-activity-progress-delta">{Number.parseFloat(change.after)-Number.parseFloat(change.before)>0?<ArrowUpIcon/>:<ArrowDownIcon/>} {Math.abs(Number.parseFloat(change.after)-Number.parseFloat(change.before))}%</span>}</div></div>)}
        {row.note&&<div className="okr-activity-note"><span>说明</span><p>{row.note}</p></div>}
      </div>
    </article>)}
  </aside>;
}
