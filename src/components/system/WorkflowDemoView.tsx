import { useState } from 'react';
import { Alert, Button, Empty, Select, Skeleton, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, GitBranchIcon, SyncIcon } from '@primer/octicons-react';
import { productRepository } from '../../services/productRepository';
import { workflowDemoScenarios } from './workflowDemoScenarios';
export function WorkflowDemoView() {
 const [scenarioId,setScenarioId]=useState('assistance');
 const [step,setStep]=useState(0);
 const scenario=workflowDemoScenarios.find(item=>item.id===scenarioId)||workflowDemoScenarios[0];
 const current=scenario.steps[step];
 const templates=useQuery({queryKey:['system-demo-work-item-template'],queryFn:productRepository.workItemTemplate,retry:false});
 const [templateId,setTemplateId]=useState<string>();
 const usable=(templates.data||[]).filter(item=>item.enabled&&item.workflow?.definition);
 const selected=usable.find(item=>item.id===templateId)||usable[0];
 const states=selected?.workflow?.definition.states||[];
 const transitions=selected?.workflow?.definition.transitions||[];
 return <div className="space-y-5">
  <header className="space-y-2 border-b border-[var(--border-main)] pb-4"><div className="text-xs text-[var(--primary)]">系统与组织 / 工作流演示</div><h1 className="flex items-center gap-2 text-lg font-semibold"><GitBranchIcon/>当前业务流程与待办去向</h1><p className="text-sm text-[var(--text-muted)]">按当前代码说明事项、八类任务、目标复盘和动态阅读；演示切换不会创建或修改业务记录。</p></header>
  <div className="flex flex-wrap items-end justify-between gap-4"><label className="grid min-w-64 gap-2 text-sm">演示场景<Select aria-label="工作流演示场景" value={scenarioId} options={workflowDemoScenarios.map(item=>({value:item.id,label:item.label}))} onChange={id=>{setScenarioId(id);setStep(0);}}/></label><div className="flex flex-wrap items-center gap-3"><Button disabled={!step} onClick={()=>setStep(value=>value-1)}>上一步</Button><span aria-label="演示步骤" className="text-sm">{step+1} / {scenario.steps.length}</span><Button type="primary" disabled={step===scenario.steps.length-1} onClick={()=>setStep(value=>value+1)}>下一步</Button><Button icon={<SyncIcon/>} disabled={!step} onClick={()=>setStep(0)}>重置</Button></div></div>
  <Alert type="info" showIcon title={scenario.boundary}/>
  <div className="grid gap-3 lg:grid-cols-4" aria-label="流程步骤">{scenario.steps.map((item,index)=><button key={item.title} aria-current={step===index?'step':undefined} className={`rounded-lg border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-80 ${step===index?'border-[var(--primary)] bg-[var(--bg-elevated)]':'border-[var(--border-main)] bg-[var(--bg-surface)] hover:border-[var(--primary)]'}`} onClick={()=>setStep(index)}><span className="text-xs text-[var(--text-muted)]">步骤 {index+1} <ArrowRightIcon/></span><strong className="mt-2 block text-sm">{item.title}</strong><span className="mt-2 block text-xs text-[var(--text-body)]">{item.status}</span></button>)}</div>
  <section aria-live="polite" aria-label="当前流程说明" className="space-y-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4"><h2 className="text-base font-semibold">{current.title}</h2><Tag>操作人：{current.actor}</Tag><Tag color="processing">{current.status}</Tag><p className="text-sm">{current.detail}</p><p className="text-sm text-[var(--text-muted)]">待办与查看：{current.todo}</p></section>
  <section aria-label="当前工作项模板流程" className="space-y-4 rounded-lg border border-[var(--border-main)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold">工作项设置 · 当前配置流程</h2><Button loading={templates.isFetching} onClick={()=>void templates.refetch()}>刷新配置</Button></div><p className="text-sm text-[var(--text-muted)]">读取当前全局模版的状态与允许路径；产品任务实际流转以该任务绑定的已发布流程为准，不使用演示固定状态替代。</p>
  {templates.isPending?<Skeleton active/>:templates.isError?<Alert type="error" title="工作项流程加载失败" action={<Button onClick={()=>void templates.refetch()}>重试</Button>}/>:!usable.length?<Empty description="暂无可展示的工作项流程"/>:<><Select className="w-full" aria-label="工作项模板流程" value={selected?.id} options={usable.map(item=>({value:item.id,label:`${item.category} · ${item.name}`}))} onChange={setTemplateId}/><div className="flex flex-wrap gap-2">{states.map(state=><Tag key={state.key}>{state.name}{state.initial?' · 初始':''}{state.successful?' · 成功结束':''}{state.enabled===false?' · 已停用':''}</Tag>)}</div><Table rowKey="key" pagination={false} scroll={{x:true}} dataSource={transitions.map((transition,index)=>({...transition,key:`${transition.key||transition.name}-${index}`}))} columns={[{title:'从状态',dataIndex:'from',render:key=>states.find(state=>state.key===key)?.name||key},{title:'操作',dataIndex:'name'},{title:'到状态',dataIndex:'to',render:key=>states.find(state=>state.key===key)?.name||key}]} locale={{emptyText:<Empty description="此流程暂未配置允许路径"/>}}/></>}
  </section>
 </div>;
}
