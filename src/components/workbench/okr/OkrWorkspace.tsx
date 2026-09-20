import Card from 'antd/es/card/Card';
import { useState } from 'react';
import { Alert, App, Button, DatePicker, Descriptions, Drawer, Empty, Flex, Form, Input, InputNumber, Modal, Progress, Segmented, Select, Space, Spin, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import { PlusIcon, SyncIcon } from '@primer/octicons-react';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useApp } from '../../../context/AppContext';
import { okrRepository,OkrPayload,OkrPerson,OkrRecord } from '../../../services/okrRepository';
import { ObjectiveEditor } from './ObjectiveEditor';
import { ReviewEditor } from './ReviewEditor';
import { WorkLinks } from './WorkLinks';
import { ReviewDetails } from './ReviewDetails';
import { OkrProvider } from './OkrProvider';
import './okr.css';

const statusNames:Record<string,string>={draft:'草稿',pending_review:'待主管确认',active:'执行中',returned:'已退回',submitted:'待评价',reviewed:'已确认',completed:'已完成',archived:'已归档'};
export function OkrWorkspace(){
 return <OkrProvider><WorkspaceContent/></OkrProvider>;
}
function WorkspaceContent(){
 const {currentUser}=useApp();const {message}=App.useApp();const client=useQueryClient();const [cycle,setCycle]=useState(dayjs().format('YYYY-MM'));
 const [tab,setTab]=useState('objective');const [scope,setScope]=useState('my');const [detailId,setDetailId]=useState<string>();
 const [editing,setEditing]=useState<OkrRecord|'new'>();const [busy,setBusy]=useState(false);const [evaluation,setEvaluation]=useState<OkrRecord>();
 const [evalForm]=Form.useForm();const [orgPerson,setOrgPerson]=useState<OkrPerson>();const [supervisor,setSupervisor]=useState<string>();
 const people=useQuery({queryKey:['okr',currentUser.id,'people'],queryFn:okrRepository.people});
 const records=useQuery({queryKey:['okr',currentUser.id,'records'],queryFn:okrRepository.records});
 const work=useQuery({queryKey:['okr',currentUser.id,'work'],queryFn:()=>okrRepository.work(currentUser.id)});
 const events=useQuery({queryKey:['okr',currentUser.id,'events',detailId],queryFn:()=>okrRepository.events(detailId!),enabled:!!detailId});
 const all=records.data||[],me=people.data?.find(p=>p.id===currentUser.id),detail=all.find(r=>r.id===detailId);
 const objectives=all.filter(r=>r.kind==='objective'&&r.ownerId===currentUser.id&&r.periodKey===cycle);
 const parents=all.filter(r=>r.kind==='objective'&&r.ownerId===me?.supervisorId&&r.periodKey===cycle&&r.status==='active');
 const visible=all.filter(r=>r.kind===tab&&(r.kind==='review'||r.periodKey===cycle)&&(scope==='my'?r.ownerId===currentUser.id:scope==='supervisor'?r.ownerId===me?.supervisorId:r.ownerId!==currentUser.id&&r.ownerId!==me?.supervisorId));
 const refresh=()=>client.invalidateQueries({queryKey:['okr',currentUser.id]});
 const run=async(action:()=>Promise<unknown>)=>{setBusy(true);try{await action();await refresh();message.success('保存成功');return true;}catch(e){message.error(e instanceof Error?e.message:'保存失败');return false;}finally{setBusy(false);}};
 const save=async(p:OkrPayload)=>{if(await run(()=>editing==='new'?okrRepository.create(tab,tab==='objective'?cycle:`${p.startDate}/${p.endDate}`,p):okrRepository.update(editing!,'save',{payload:p})))setEditing(undefined);};
 const transition=(r:OkrRecord,action:string)=>run(()=>okrRepository.update(r,action));
 const isOwner=(r:OkrRecord)=>r.ownerId===currentUser.id;
 const isReviewer=(r:OkrRecord)=>!isOwner(r)&&people.data?.find(p=>p.id===r.ownerId)?.supervisorId===currentUser.id;
 const actions=(r:OkrRecord)=><Space wrap>
  {isOwner(r)&&['draft','returned'].includes(r.status)&&<><Button size="small" disabled={busy} onClick={()=>{setTab(r.kind);setEditing(r);}}>修改</Button><Button size="small" loading={busy} onClick={()=>transition(r,'submit')}>提交</Button></>}
  {isReviewer(r)&&['submitted','pending_review'].includes(r.status)&&<Button size="small" onClick={()=>{evalForm.resetFields();setEvaluation(r);}}>{r.kind==='review'?'评价':'确认目标'}</Button>}
  {isOwner(r)&&r.status==='active'&&<Button size="small" onClick={()=>transition(r,'complete')}>完成目标</Button>}
  {isOwner(r)&&['reviewed','completed'].includes(r.status)&&<Button size="small" onClick={()=>transition(r,'archive')}>归档</Button>}
 </Space>;
 if(people.isPending||records.isPending)return <Spin tip="加载目标与绩效"><div className="p-8"/></Spin>;
 const error=people.error||records.error;
 if(error)return <Alert type="error" title="目标与绩效加载失败" description={error.message} action={<Button onClick={()=>refresh()}>重试</Button>}/>;
 return <div className="okr-workspace space-y-4 text-[var(--text-primary)]">
  <Card><Flex wrap justify="space-between" align="center" gap="middle"><Typography.Title level={4}>目标与绩效</Typography.Title><Space wrap><DatePicker aria-label="目标月份" picker="month" value={dayjs(cycle)} allowClear={false} onChange={v=>{if(v)setCycle(v.format('YYYY-MM'));}}/><Button icon={<SyncIcon/>} title="刷新" aria-label="刷新" loading={records.isFetching} onClick={()=>refresh()}/><Button disabled={busy} onClick={()=>{setTab('work');setEditing(undefined);}}>关联任务 / 事项</Button>{['objective','review'].includes(tab)&&<Button icon={<PlusIcon/>} type="primary" disabled={busy} onClick={()=>setEditing('new')}>{tab==='review'?'新建复盘':'新增目标'}</Button>}</Space></Flex></Card>
  {!me?.supervisorId&&!me?.rootFlag&&<Alert type="warning" title="尚未配置直属上级" description="请由管理员在组织关系中配置承接关系。"/>}
  <Tabs activeKey={tab} onChange={v=>{setTab(v);setScope('my');setEditing(undefined);}} items={[{key:'objective',label:'目标 OKR'},{key:'work',label:'任务与事项'},{key:'review',label:'周期复盘'},...(currentUser.role==='admin'?[{key:'organization',label:'组织关系'}]:[])]}/>
  {tab==='work'?work.isError?<Alert type="error" title="工作项加载失败" description={work.error.message} action={<Button onClick={()=>work.refetch()}>重试</Button>}/>:<WorkLinks work={work.data||[]} objectives={objectives} run={run} busy={busy} loading={work.isPending} onCreateObjective={()=>{setTab('objective');setEditing('new');}}/>:tab==='organization'?<Card title="组织承接关系"><Table rowKey="id" dataSource={people.data} columns={[{title:'成员',dataIndex:'name'},{title:'部门',dataIndex:'department'},{title:'直属上级',render:(_,p:OkrPerson)=>p.rootFlag?'组织根目标负责人':people.data?.find(x=>x.id===p.supervisorId)?.name||'未配置'},{title:'操作',render:(_,p:OkrPerson)=><Button onClick={()=>{setOrgPerson(p);setSupervisor(p.rootFlag?'root':p.supervisorId||undefined);}}>配置</Button>}]}/></Card>:<Card>
   <Flex wrap justify="space-between" align="center" gap="middle" className="mb-4"><Segmented value={scope} onChange={setScope} options={[{value:'my',label:tab==='review'?'我的复盘':'我的目标'},...(tab==='objective'?[{value:'supervisor',label:'上级目标'}]:[]),{value:'received',label:tab==='review'?'待我评价 / 下属复盘':'下属目标'}]}/><Typography.Text type="secondary">{visible.length} 项</Typography.Text></Flex>
   {tab==='objective'&&<Alert className="mb-4" type="info" title={me?.rootFlag?'你是组织根目标负责人，可创建供下属承接的目标':`直属上级：${people.data?.find(p=>p.id===me?.supervisorId)?.name||'未配置'}`} description={me?.rootFlag?'下属在新增目标时自主选择你的已确认目标或 KR。':'点击“新增目标”，自主选择本月上级已确认的 OKR；目标执行后，通过“关联任务 / 事项”维护工作支撑关系。'}/>}
   <Table rowKey="id" dataSource={visible} pagination={{pageSize:10}} scroll={{x:800}} locale={{emptyText:<Empty description="暂无记录"/>}} columns={[
    {title:tab==='review'?'复盘':'目标',render:(_,r:OkrRecord)=><Button type="link" className="whitespace-normal text-left" onClick={()=>setDetailId(r.id)}>{r.payload.title}</Button>},
    {title:'负责人',render:(_,r:OkrRecord)=>people.data?.find(p=>p.id===r.ownerId)?.name||'人员已停用'},
    {title:'周期',dataIndex:'periodKey'}, {title:'状态',render:(_,r:OkrRecord)=><Tag>{statusNames[r.status]||r.status}</Tag>},
    {title:tab==='objective'?'进度':'最终评分',render:(_,r:OkrRecord)=>r.kind==='objective'?<Progress percent={r.payload.progress||0} size="small"/>:r.payload.finalScore??'未评价'},
    {title:'操作',render:(_,r:OkrRecord)=>actions(r)},
   ]}/>
  </Card>}
  {editing&&tab==='objective'&&<ObjectiveEditor record={editing==='new'?undefined:editing} parents={parents} person={me} busy={busy} onClose={()=>setEditing(undefined)} onSave={save}/>}
  {editing&&tab==='review'&&(work.isError?<Alert type="error" title="工作项加载失败" description={work.error.message} action={<Button onClick={()=>work.refetch()}>重试</Button>}/>:work.isPending?<Spin/>:<ReviewEditor record={editing==='new'?undefined:editing} objectives={objectives} work={work.data||[]} busy={busy} onSave={save} onClose={()=>setEditing(undefined)}/>)}
  <Drawer open={!!detail} width="80%" title={detail?.payload.title} onClose={()=>setDetailId(undefined)} extra={detail&&actions(detail)}>
   {detail&&<div className="space-y-4"><Descriptions items={[{key:'state',label:'状态',children:statusNames[detail.status]},{key:'period',label:'周期',children:detail.periodKey},{key:'parent',label:'承接目标',children:all.find(r=>r.id===detail.payload.parentObjectiveId)?.payload.title||'组织根目标 / 无关联'}]}/>
    {detail.kind==='objective'?<><Table rowKey="id" pagination={false} dataSource={detail.payload.keyResults} columns={[{title:'关键结果',dataIndex:'title'},{title:'权重',dataIndex:'weight',render:v=>`${v}%`},{title:'进度',render:(_,kr)=><InputNumber key={`${kr.id}-${detail.version}`} aria-label={`${kr.title}进度`} min={0} max={100} precision={0} defaultValue={kr.progress} disabled={!isOwner(detail)||detail.status!=='active'||busy} onBlur={e=>{const v=Number(e.target.value);if(e.target.value!==''&&Number.isInteger(v)&&v>=0&&v<=100&&v!==kr.progress)run(()=>okrRepository.update(detail,'progress',{keyResults:detail.payload.keyResults?.map(k=>k.id===kr.id?{...k,progress:v}:k)}));}}/>}]}/>
     {isOwner(detail)&&<Button onClick={()=>{setDetailId(undefined);setTab('work');setCycle(detail.periodKey);}}>关联任务 / 事项</Button>}
     <Typography.Title level={5}>下级承接</Typography.Title>{all.filter(r=>r.payload.parentObjectiveId===detail.id).map(r=><Typography.Paragraph key={r.id}>{r.payload.title}</Typography.Paragraph>)}</>:<>
     <ReviewDetails record={detail} objectives={all.filter(o=>o.kind==='objective'&&o.ownerId===detail.ownerId)}/>
    </>}
    <Typography.Title level={5}>动态记录</Typography.Title>{events.isError?<Alert type="error" title="动态加载失败" action={<Button onClick={()=>events.refetch()}>重试</Button>}/>:<Spin spinning={events.isPending}><Timeline items={events.data?.map((e,i)=>({key:i,content:`${e.createdAt} · ${e.operator} · ${e.action}`}))}/></Spin>}
   </div>}
  </Drawer>
  <Modal open={!!evaluation} title={evaluation?.kind==='review'?'主管评价':'目标确认'} footer={null} onCancel={()=>setEvaluation(undefined)}>
   <Form form={evalForm} layout="vertical" onFinish={async v=>{if(await run(()=>okrRepository.update(evaluation!,'approve',v)))setEvaluation(undefined);}}>
    {evaluation?.kind==='review'&&<><Form.Item label="最终分数" name="finalScore" rules={[{required:true}]}><InputNumber min={0} max={100} precision={0}/></Form.Item><Form.Item label="计入评价的计划外贡献" name="includedWorkIds"><Select mode="multiple" options={evaluation.payload.items?.filter(i=>!i.objectiveId).map(i=>({value:i.workId,label:i.title}))}/></Form.Item><Form.Item label="OKR 结果、交付质量与计划外贡献评价" name="evaluation" rules={[{required:true,whitespace:true}]}><Input.TextArea maxLength={2000}/></Form.Item></>}
    <Form.Item label="评价 / 退回原因" name="feedback" rules={[{required:true,whitespace:true}]}><Input.TextArea maxLength={2000}/></Form.Item><Space><Button danger disabled={busy} onClick={async()=>{try{const v=await evalForm.validateFields(['feedback']);if(await run(()=>okrRepository.update(evaluation!,'return',v)))setEvaluation(undefined);}catch{}}}>退回修改</Button><Button type="primary" htmlType="submit" loading={busy}>确认</Button></Space>
   </Form>
  </Modal>
  <Modal open={!!orgPerson} title={`${orgPerson?.name||''} · 组织关系`} onCancel={()=>setOrgPerson(undefined)} confirmLoading={busy} onOk={async()=>{if(supervisor&&await run(()=>okrRepository.reporting(orgPerson!,supervisor==='root'?null:supervisor,supervisor==='root')))setOrgPerson(undefined);}}>
   <Select className="w-full" showSearch optionFilterProp="label" value={supervisor} onChange={setSupervisor} options={[{value:'root',label:'组织根目标负责人'},...(people.data||[]).filter(p=>p.id!==orgPerson?.id).map(p=>({value:p.id,label:p.name}))]}/>
  </Modal>
 </div>;
}
