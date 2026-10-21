import { useState } from 'react';
import { Alert, Button, Empty, Select, Skeleton, Switch, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { EyeIcon, ShieldCheckIcon } from '@primer/octicons-react';
import { okrRepository } from '../../services/okrRepository';
import { useApp } from '../../context/AppContext';
import { demoPermissions, okrDemoPermissions, type DemoDomain, type DemoIdentity } from './permissionDemoRules';
const domains = [{value:'collaboration',label:'协同事项'},{value:'todo',label:'我的待办'},{value:'feeds',label:'动态与评价'},{value:'delivery',label:'交付完成审核'},{value:'okr',label:'目标总结设置'},{value:'product',label:'产品与工作项设置'}];
const identities = [{value:'creator',label:'创建人 / 消息作者'},{value:'owner',label:'当前负责人'},{value:'audience',label:'指定可见人员'},{value:'other',label:'其他成员'},{value:'admin',label:'系统管理员'}];
const statuses = ['待处理','处理中','待验收','已退回','已完成','已关闭','已取消','待审核'];
export function PermissionDemoView() {
  const {currentUser} = useApp();
  const [domain,setDomain]=useState<DemoDomain>('collaboration');
  const [identity,setIdentity]=useState<DemoIdentity>('owner');
  const [status,setStatus]=useState('待处理');
  const [specified,setSpecified]=useState(false);
  const [sourceMessage,setSourceMessage]=useState(false);
  const [sameOwner,setSameOwner]=useState(false);
  const [viewer,setViewer]=useState(currentUser.id);
  const settings=useQuery({queryKey:['okr','settings'],queryFn:okrRepository.settings,enabled:domain==='okr',retry:false});
  const people=useQuery({queryKey:['okr','people'],queryFn:okrRepository.people,enabled:domain==='okr',retry:false});
  const loading=domain==='okr'&&(settings.isPending||people.isPending);
  const error=domain==='okr'&&(settings.isError||people.isError);
  const rows=domain==='okr'?settings.data&&people.data?okrDemoPermissions(viewer,settings.data,people.data):[]:demoPermissions(domain,identity,status,specified,sourceMessage,sameOwner);
  const missingViewer=domain==='okr'&&people.data&&!people.data.some(person=>person.id===viewer);
  return <div className="space-y-5">
    <header className="space-y-2 border-b border-[var(--border-main)] pb-4"><div className="text-xs text-[var(--primary)]">系统与组织 / 权限演示</div><h1 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheckIcon/>当前业务权限与操作条件</h1><p className="text-sm text-[var(--text-muted)]">按业务对象与记录身份查看操作条件；目标总结设置读取当前人员授权。切换演示不会修改权限或业务数据。</p></header>
    <section className="grid gap-4 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 md:grid-cols-3" aria-label="权限演示条件">
      <label className="grid gap-2 text-sm">业务对象<Select aria-label="权限业务对象" value={domain} options={domains} onChange={value=>{setDomain(value);setStatus(value==='delivery'?'待审核':'待处理');}}/></label>
      {domain==='okr'?<label className="grid gap-2 text-sm">授权人员<Select aria-label="授权人员" value={missingViewer?undefined:viewer} placeholder="请选择人员" loading={loading} disabled={loading||!!error} options={(people.data||[]).map(person=>({value:person.id,label:`${person.name} · ${person.department}`}))} onChange={setViewer}/></label>:domain!=='product'&&<label className="grid gap-2 text-sm">操作身份<Select aria-label="操作身份" value={identity} options={identities} onChange={setIdentity}/></label>}
      {['collaboration','todo','delivery'].includes(domain)&&<label className="grid gap-2 text-sm">记录状态<Select aria-label="权限记录状态" value={status} options={statuses.map(value=>({value,label:value}))} onChange={setStatus}/></label>}
      {domain==='feeds'&&<label className="flex items-center gap-3 text-sm">仅指定人员可见<Switch aria-label="仅指定人员可见" checked={specified} onChange={setSpecified}/></label>}
      {domain==='feeds'&&<label className="flex items-center gap-3 text-sm">来源板块共享信息<Switch aria-label="来源板块共享信息" checked={sourceMessage} onChange={setSourceMessage}/></label>}
      {domain==='delivery'&&<label className="flex items-center gap-3 text-sm">创建人与负责人相同<Switch aria-label="创建人与负责人相同" checked={sameOwner} onChange={setSameOwner}/></label>}
    </section>
    <Alert type="info" showIcon title="演示范围" description={domain==='product'?'产品与工作项模块尚无统一的部门授权矩阵，本页明确现有配置与业务校验范围，不承诺尚未落地的访问拦截。':'操作结果同时受状态、归属、必填项、版本及关联记录约束；允许操作不代表可以绕过业务校验。'}/>
    {loading?<Skeleton active/>:error?<Alert type="error" title="权限资料加载失败" action={<Button onClick={()=>{void settings.refetch();void people.refetch();}}>重试</Button>}/>:missingViewer?<Empty description="请选择有效人员查看当前授权"/>:!rows.length?<Empty description="暂无权限资料"/>:<section aria-label="权限结果" className="overflow-hidden rounded-lg border border-[var(--border-main)]">{rows.map(row=><div key={row.name} className="grid gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface)] p-4 last:border-0 md:grid-cols-[200px_minmax(0,1fr)_120px]"><strong className="text-sm">{row.name}</strong><p className="text-sm text-[var(--text-body)]">{row.reason}</p><span><Tag color={row.allowed===undefined?'default':row.allowed?'success':'default'} icon={<EyeIcon/>}>{row.allowed===undefined?'实现说明':row.allowed?'允许':'不满足条件'}</Tag></span></div>)}</section>}
    {domain==='okr'&&<p className="text-xs text-[var(--text-muted)]">未获编辑授权的设置分区仍可查看。普通个人目标由本人维护，公司级目标按公司目标编辑授权；待确认内容可见性由确认配置及审核身份共同决定。</p>}
  </div>;
}
