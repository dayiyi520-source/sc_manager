import Card from 'antd/es/card/Card';
import { useState } from 'react';
import { Alert, Button, Empty, Flex, Form, Modal, Select, Table, Tag, Typography } from 'antd';
import { okrRepository, OkrRecord, OkrWork } from '../../../services/okrRepository';

export function WorkLinks({work,objectives,run,busy,loading=false,onCreateObjective}: {
  work: OkrWork[]; objectives: OkrRecord[]; busy: boolean; loading?: boolean;
  run: (fn:()=>Promise<unknown>)=>Promise<boolean>; onCreateObjective:()=>void;
}) {
  const [selected,setSelected]=useState<OkrWork>();
  const [form]=Form.useForm();
  const objectiveId=Form.useWatch('objectiveId',form);
  const available=objectives.filter(o=>o.status==='active');
  const objective=objectives.find(o=>o.id===objectiveId);
  return <Flex vertical gap="middle">
    <Alert type="info" title="将已有任务或工单关联到 KR" description="在下方找到本人负责的工作项，点击“关联 KR”。保存后，周期复盘归集会自动带入目标关系；未关联的工作保留为计划外工作。"/>
    {!loading&&!available.length&&<Alert type="warning" title="当前月份没有执行中的个人目标" description="请先创建目标并完成主管确认，再关联任务。" action={<Button onClick={onCreateObjective}>创建目标</Button>}/>}
    <Card title="本人任务与工单" extra={<Typography.Text type="secondary">{work.length} 项</Typography.Text>}>
      <Table<OkrWork> rowKey="id" loading={loading} dataSource={work} pagination={{pageSize:10}} scroll={{x:960}}
        locale={{emptyText:<Empty description="暂无本人负责的任务或工单"/>}} columns={[
          {title:'任务 / 工单',dataIndex:'title',width:320},
          {title:'状态',dataIndex:'status',render:v=><Tag>{v}</Tag>},
          {title:'预计 / 实际工时',render:(_,w)=>`${w.estimatedHours||0} / ${w.actualHours||0}`},
          {title:'支撑目标 / KR',render:(_,w)=>{
            const target=objectives.find(o=>o.id===w.objectiveId);
            return target?<Flex vertical gap="small"><Typography.Text>{target.payload.title}</Typography.Text><Typography.Text type="secondary">{target.payload.keyResults?.find(k=>k.id===w.keyResultId)?.title}</Typography.Text></Flex>:<Tag>{w.objectiveId?'历史目标':'计划外工作'}</Tag>;
          }},
          {title:'操作',fixed:'right',render:(_,w)=><Button disabled={busy} onClick={()=>{
            setSelected(w);form.setFieldsValue({objectiveId:w.objectiveId||undefined,keyResultId:w.keyResultId||undefined});
          }}>关联 KR</Button>},
        ]}/>
    </Card>
    <Modal open={!!selected} title="关联任务 / 工单" onCancel={()=>setSelected(undefined)} footer={null} destroyOnHidden>
      <Form form={form} layout="vertical" disabled={busy} onFinish={async values=>{
        if(selected&&await run(()=>okrRepository.link(selected,values.objectiveId,values.keyResultId)))setSelected(undefined);
      }}>
        <Typography.Paragraph strong>{selected?.title}</Typography.Paragraph>
        <Form.Item name="objectiveId" label="支撑目标" extra="清空目标后，此工作项作为计划外工作保留。">
          <Select allowClear showSearch optionFilterProp="label" placeholder="计划外工作" onChange={()=>form.setFieldValue('keyResultId',undefined)} options={available.map(o=>({value:o.id,label:o.payload.title}))}/>
        </Form.Item>
        {objectiveId&&<Form.Item name="keyResultId" label="支撑 KR" rules={[{required:true,message:'请选择目标下的 KR'}]}>
          <Select showSearch optionFilterProp="label" placeholder="选择 KR" options={objective?.payload.keyResults?.map(k=>({value:k.id,label:k.title}))}/>
        </Form.Item>}
        <Flex justify="end" gap="small"><Button onClick={()=>setSelected(undefined)}>取消</Button><Button htmlType="submit" type="primary" loading={busy}>保存关联</Button></Flex>
      </Form>
    </Modal>
  </Flex>;
}
