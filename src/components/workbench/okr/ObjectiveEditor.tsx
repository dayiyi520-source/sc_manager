import { Button, Form, Input, InputNumber, Modal, Select, Space } from 'antd';
import { PlusIcon, TrashIcon } from '@primer/octicons-react';
import { OkrPayload, OkrPerson, OkrRecord } from '../../../services/okrRepository';

export function ObjectiveEditor({record,parents,person,onSave,onClose,busy}: {
 record?: OkrRecord; parents: OkrRecord[]; person?: OkrPerson;
 onSave: (p: OkrPayload) => Promise<void>; onClose: () => void; busy: boolean;
}) {
 const [form]=Form.useForm();const parentId=Form.useWatch('parentObjectiveId',form);
 const parent=parents.find(r=>r.id===parentId);
 return <Modal open title={record?'修改目标':'新增目标'} onCancel={onClose} footer={null} destroyOnHidden>
  <Form form={form} layout="vertical" initialValues={record?.payload||{keyResults:[{id:crypto.randomUUID(),title:'',weight:100,progress:0}]}} onFinish={onSave}>
   <Form.Item name="title" label="目标" rules={[{required:true,whitespace:true}]}><Input maxLength={255}/></Form.Item>
   {!person?.rootFlag&&<Form.Item name="parentObjectiveId" label="承接上级目标" rules={[{required:true,message:'必须引用直属上级目标'}]}>
    <Select showSearch optionFilterProp="label" options={parents.map(p=>({label:p.payload.title,value:p.id}))} onChange={()=>form.setFieldValue('parentKeyResultId',undefined)} notFoundContent="上级尚无已确认目标"/>
   </Form.Item>}
   {parent&&<Form.Item name="parentKeyResultId" label="支撑上级 KR"><Select allowClear options={parent.payload.keyResults?.map(k=>({label:k.title,value:k.id}))}/></Form.Item>}
   <Form.List name="keyResults" rules={[{validator:async(_,rows)=>{if(!rows?.length||rows.reduce((s:number,k:{weight:number})=>s+Number(k.weight||0),0)!==100)throw Error('KR 权重合计必须为 100%');}}]}>
    {(fields,{add,remove},{errors})=><><div className="space-y-3">{fields.map(field=><div key={field.key}>
     <Form.Item name={[field.name,'id']} hidden><Input/></Form.Item><Form.Item name={[field.name,'progress']} hidden><InputNumber/></Form.Item>
     <Form.Item name={[field.name,'title']} label={`KR ${field.name+1}`} rules={[{required:true,whitespace:true}]}><Input maxLength={255}/></Form.Item>
     <Space><Form.Item name={[field.name,'weight']} label="权重 %" rules={[{required:true}]}><InputNumber min={1} max={100} precision={0}/></Form.Item>
      <Button aria-label="删除 KR" title="删除 KR" icon={<TrashIcon/>} disabled={fields.length<=1||busy} onClick={()=>remove(field.name)}/></Space>
    </div>)}</div><Form.ErrorList errors={errors}/><Button icon={<PlusIcon/>} disabled={fields.length>=20||busy} onClick={()=>add({id:crypto.randomUUID(),title:'',weight:0,progress:0})}>添加 KR</Button></>}
   </Form.List>
   <div className="flex justify-end gap-2 mt-4"><Button onClick={onClose} disabled={busy}>取消</Button><Button htmlType="submit" type="primary" loading={busy}>保存草稿</Button></div>
  </Form>
 </Modal>;
}
