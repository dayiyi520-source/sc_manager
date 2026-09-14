import {useState} from 'react';
import {Button,Modal,Select,Table,Tag} from 'antd';
import {okrRepository,OkrRecord,OkrWork} from '../../../services/okrRepository';
export function WorkLinks({work,objectives,run,busy}:{work:OkrWork[];objectives:OkrRecord[];run:(fn:()=>Promise<unknown>)=>Promise<boolean>;busy:boolean}){
 const [selected,setSelected]=useState<OkrWork>();const [objective,setObjective]=useState<string>();const [kr,setKr]=useState<string>();
 return <><Table rowKey="id" dataSource={work} pagination={{pageSize:10}} scroll={{x:800}} columns={[
 {title:'任务 / 工单',dataIndex:'title'}, {title:'状态',dataIndex:'status',render:v=><Tag>{v}</Tag>},
 {title:'预计 / 实际工时',render:(_,w)=>`${w.estimatedHours||0} / ${w.actualHours||0}`},
 {title:'所属目标',render:(_,w)=>objectives.find(o=>o.id===w.objectiveId)?.payload.title||(w.objectiveId?'历史目标':'计划外工作')},
 {title:'操作',render:(_,w)=><Button onClick={()=>{setSelected(w);setObjective(w.objectiveId||undefined);setKr(w.keyResultId||undefined);}}>关联 KR</Button>}
 ]}/><Modal open={!!selected} title={selected?.title} confirmLoading={busy} onCancel={()=>setSelected(undefined)} onOk={async()=>{if(await run(()=>okrRepository.link(selected!,objective,kr)))setSelected(undefined);}}>
 <div className="space-y-4"><Select className="w-full" allowClear placeholder="计划外工作" value={objective} onChange={v=>{setObjective(v);setKr(undefined);}} options={objectives.filter(o=>o.status==='active').map(o=>({value:o.id,label:o.payload.title}))}/>{objective&&<Select className="w-full" placeholder="选择 KR" value={kr} onChange={setKr} options={objectives.find(o=>o.id===objective)?.payload.keyResults?.map(k=>({value:k.id,label:k.title}))}/>}</div>
 </Modal></>;
}
