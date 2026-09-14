import Card from 'antd/es/card/Card';
import { Alert, Button, Flex, Form, Input, InputNumber, Modal, Select, Space, Typography } from 'antd';
import { PlusIcon, TrashIcon } from '@primer/octicons-react';
import { OkrPayload, OkrPerson, OkrRecord } from '../../../services/okrRepository';

export function ObjectiveEditor({record,parents,person,onSave,onClose,busy}: {
 record?: OkrRecord; parents: OkrRecord[]; person?: OkrPerson;
 onSave: (p: OkrPayload) => Promise<void>; onClose: () => void; busy: boolean;
}) {
 const [form]=Form.useForm();const parentId=Form.useWatch('parentObjectiveId',form);
 const parent=parents.find(r=>r.id===parentId);
 return <Modal open width="min(100%, 48rem)" title={record?'修改目标':'新增目标'} onCancel={onClose} footer={null} destroyOnHidden>
  <Form form={form} disabled={busy} layout="vertical" initialValues={record?.payload||{keyResults:[{id:crypto.randomUUID(),title:'',weight:100,progress:0}]}} onFinish={onSave}>
   <Alert className="mb-4" type={person?.rootFlag?'info':parents.length?'info':'warning'} title={person?.rootFlag?'当前为组织根目标负责人':`选择要承接的上级 OKR · ${parents.length} 个可选目标`} description={person?.rootFlag?'组织根目标不需要引用上级。下属创建目标时可以选择承接你的目标或 KR。':'请自主选择同月份直属上级已确认的目标，再选择具体 KR；不选 KR 表示承接整个目标。没有候选时，请先核对月份并联系上级确认目标。'}/>
   <Form.Item name="title" label="目标" rules={[{required:true,whitespace:true}]}><Input maxLength={255}/></Form.Item>
   {!person?.rootFlag&&<Form.Item name="parentObjectiveId" label="承接上级目标" rules={[{required:true,message:'必须引用直属上级目标'}]}>
    <Select allowClear showSearch placeholder="请选择要承接的上级目标" optionFilterProp="label" options={parents.map(p=>({label:p.payload.title,value:p.id}))} onChange={()=>form.setFieldValue('parentKeyResultId',undefined)} notFoundContent="当前月份上级尚无已确认目标"/>
   </Form.Item>}
   {parent&&<><Form.Item name="parentKeyResultId" label="支撑上级 KR"><Select showSearch optionFilterProp="label" allowClear placeholder="可选，留空则承接整个上级目标" options={parent.payload.keyResults?.map(k=>({label:k.title,value:k.id}))}/></Form.Item><Card size="small" className="mb-4" title="已选承接关系"><Typography.Text>{parent.payload.title}</Typography.Text></Card></>}
   <Form.List name="keyResults" rules={[{validator:async(_,rows)=>{if(!rows?.length||rows.reduce((s:number,k:{weight:number})=>s+Number(k.weight||0),0)!==100)throw Error('KR 权重合计必须为 100%');}}]}>
    {(fields,{add,remove},{errors})=><><Flex vertical gap="middle">{fields.map(field=><Card size="small" key={field.key}>
     <Form.Item name={[field.name,'id']} hidden><Input/></Form.Item><Form.Item name={[field.name,'progress']} hidden><InputNumber/></Form.Item>
     <Form.Item name={[field.name,'title']} label={`KR ${field.name+1}`} rules={[{required:true,whitespace:true}]}><Input maxLength={255}/></Form.Item>
     <Space><Form.Item name={[field.name,'weight']} label="权重 %" rules={[{required:true}]}><InputNumber min={1} max={100} precision={0}/></Form.Item>
      <Button aria-label="删除 KR" title="删除 KR" icon={<TrashIcon/>} disabled={fields.length<=1||busy} onClick={()=>remove(field.name)}/></Space>
    </Card>)}</Flex><Form.ErrorList errors={errors}/><Button className="mt-4" icon={<PlusIcon/>} disabled={fields.length>=20||busy} onClick={()=>add({id:crypto.randomUUID(),title:'',weight:0,progress:0})}>添加 KR</Button></>}
   </Form.List>
   <Flex justify="end" gap="small" className="mt-4"><Button onClick={onClose} disabled={busy}>取消</Button><Button htmlType="submit" type="primary" loading={busy}>保存草稿</Button></Flex>
  </Form>
 </Modal>;
}
