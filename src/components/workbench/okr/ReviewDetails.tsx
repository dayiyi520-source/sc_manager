import Card from 'antd/es/card/Card';
import {Alert,Flex,Progress,Table,Tag,Typography} from 'antd';
import type {OkrRecord,OkrReviewItem} from '../../../services/okrRepository';
export function ReviewDetails({record,objectives}:{record:OkrRecord;objectives:OkrRecord[]}){
 const data=record.payload;
 const snapshots=data.objectiveSnapshots||objectives.map(o=>({id:o.id,period:o.periodKey,payload:o.payload}));
 const renderItems=(items:OkrReviewItem[]) => <Table rowKey="workId" pagination={false} scroll={{x:700}} dataSource={items} columns={[
  {title:'任务 / 事项',dataIndex:'title'}, {title:'进度状态',dataIndex:'status',render:s=><Tag>{s}</Tag>},
  {title:'本期产出',dataIndex:'result'},{title:'阻塞 / 延期影响',render:(_,item)=>{const affected=snapshots.find(o=>o.id===item.affectedObjectiveId);return <div>{affected&&<div>{affected.payload.title} / {affected.payload.keyResults?.find(k=>k.id===item.affectedKeyResultId)?.title}</div>}{item.impact}</div>;}},
  {title:'贡献确认',render:(_,item)=>item.included===undefined?'待评价':item.included?'计入评价':'保留记录'},
 ]}/>;
 return <Flex vertical gap="large">
  {snapshots.filter(o=>o.period>=(data.startDate||'').slice(0,7)&&o.period<=(data.endDate||'9999-12').slice(0,7)).map(o=><Card key={o.id} title={o.payload.title}>
   <Progress percent={o.payload.progress||0}/>
   {o.payload.keyResults?.map(kr=><div key={kr.id} className="space-y-2"><div className="flex justify-between gap-4"><span>{kr.title}</span><span>{kr.progress}% · 权重 {kr.weight}%</span></div>{renderItems((data.items||[]).filter(i=>i.objectiveId===o.id&&i.keyResultId===kr.id))}</div>)}
  </Card>)}
  <Card title="计划外工作">{renderItems((data.items||[]).filter(i=>!i.objectiveId))}</Card>
  {data.summary&&<Card title="关键成果与下期安排"><Typography.Paragraph>{data.summary}</Typography.Paragraph></Card>}
  {data.feedback&&<Alert title="主管意见" description={data.feedback}/>}
  {data.finalScore!==undefined&&<Typography.Text strong>最终分数：{data.finalScore}</Typography.Text>}
  {data.evaluation&&<Typography.Paragraph>{data.evaluation}</Typography.Paragraph>}
 </Flex>;
}
