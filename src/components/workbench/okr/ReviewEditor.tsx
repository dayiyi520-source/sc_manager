import { useState } from 'react';
import { Button, DatePicker, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { OkrPayload,OkrRecord,OkrReviewItem,OkrWork } from '../../../services/okrRepository';
import { periodWork,reviewWork } from './workAggregation';

export function ReviewEditor({record,objectives,work,busy,onSave,onClose}:{record?:OkrRecord;objectives:OkrRecord[];work:OkrWork[];busy:boolean;onSave:(p:OkrPayload)=>Promise<void>;onClose:()=>void}) {
 const [form]=Form.useForm();const [items,setItems]=useState<OkrReviewItem[]>(record?.payload.items||[]);
 const change=(id:string,p:Partial<OkrReviewItem>)=>setItems(rows=>rows.map(r=>r.workId===id?{...r,...p}:r));
 const period=Form.useWatch('period',form);
 const candidates=period?.[1]?periodWork(work,period[0].format('YYYY-MM-DD'),period[1].format('YYYY-MM-DD')):work;
 return <Modal open width="90%" title={record?'修改复盘':'周期复盘'} onCancel={onClose} footer={null} destroyOnHidden>
  <Form form={form} layout="vertical" initialValues={{title:record?.payload.title,summary:record?.payload.summary,period:record?[dayjs(record.payload.startDate),dayjs(record.payload.endDate)]:[dayjs().startOf('month'),dayjs().endOf('month')]}} onFinish={v=>onSave({title:v.title,startDate:v.period[0].format('YYYY-MM-DD'),endDate:v.period[1].format('YYYY-MM-DD'),summary:v.summary||'',items})}>
   <Space wrap align="start"><Form.Item name="title" label="复盘标题" rules={[{required:true,whitespace:true}]}><Input maxLength={255}/></Form.Item><Form.Item name="period" label="复盘区间" rules={[{required:true}]}><DatePicker.RangePicker/></Form.Item></Space>
   <div className="flex flex-wrap justify-between gap-3 mb-4"><span>工作项进展 · {items.length} 项 · 计划外 {items.filter(i=>!i.objectiveId).length} 项</span><Button onClick={()=>setItems(candidates.map(w=>reviewWork(w,items.find(i=>i.workId===w.id))))}>归集本期工作项</Button></div>
   <Select className="w-full mb-4" mode="multiple" showSearch optionFilterProp="label" placeholder="关联任务或工单" value={items.map(i=>i.workId)} options={candidates.map(w=>({value:w.id,label:`${w.title} · ${w.status}`}))} onChange={ids=>setItems(ids.map(id=>reviewWork(work.find(w=>w.id===id)!,items.find(i=>i.workId===id))))}/>
   <Table rowKey="workId" dataSource={items} pagination={{pageSize:5}} scroll={{x:900}} columns={[
    {title:'任务 / 工单',dataIndex:'title',width:220,render:(title,row)=><><div>{title}</div><Tag>{row.status}</Tag></>},
    {title:'支撑目标 / KR',width:240,render:(_,row)=><Space orientation="vertical"><Select className="w-full" allowClear placeholder="计划外工作" value={row.objectiveId} options={objectives.map(o=>({value:o.id,label:o.payload.title}))} onChange={id=>change(row.workId,{objectiveId:id,keyResultId:undefined})}/>{row.objectiveId&&<Select className="w-full" placeholder="选择 KR" value={row.keyResultId} options={objectives.find(o=>o.id===row.objectiveId)?.payload.keyResults?.map(k=>({value:k.id,label:k.title}))} onChange={id=>change(row.workId,{keyResultId:id})}/>}</Space>},
    {title:'本期产出',render:(_,row)=><Input.TextArea aria-label={`${row.title}产出`} rows={2} maxLength={2000} value={row.result} onChange={e=>change(row.workId,{result:e.target.value})}/>},
    {title:'阻塞 / 对 OKR 的影响',render:(_,row)=><Space orientation="vertical" className="w-full"><Select className="w-full" allowClear aria-label={`${row.title}受影响目标`} placeholder="受影响目标" value={row.affectedObjectiveId} options={objectives.map(o=>({value:o.id,label:o.payload.title}))} onChange={id=>change(row.workId,{affectedObjectiveId:id,affectedKeyResultId:undefined})}/>{row.affectedObjectiveId&&<Select className="w-full" aria-label={`${row.title}受影响 KR`} placeholder="受影响 KR" value={row.affectedKeyResultId} options={objectives.find(o=>o.id===row.affectedObjectiveId)?.payload.keyResults?.map(k=>({value:k.id,label:k.title}))} onChange={id=>change(row.workId,{affectedKeyResultId:id})}/>}<Input.TextArea aria-label={`${row.title}影响`} rows={2} maxLength={2000} value={row.impact} onChange={e=>change(row.workId,{impact:e.target.value})}/></Space>},
   ]}/>
   <Form.Item name="summary" label="关键成果与下期安排"><Input.TextArea rows={3} maxLength={2000}/></Form.Item>
   <div className="flex justify-end gap-2"><Button onClick={onClose} disabled={busy}>取消</Button><Button type="primary" htmlType="submit" loading={busy}>保存草稿</Button></div>
  </Form>
 </Modal>;
}
