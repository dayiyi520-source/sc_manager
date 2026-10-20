import { lazy, Suspense, useEffect, useState } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { productRepository } from '../../services/productRepository';
import { requirementRepository } from '../../services/requirementRepository';
import type { RequirementTask } from '../../types';

const TaskView = lazy(() => import('../product/RequirementTasksView').then(module => ({ default: module.RequirementTasksView })));
const MatterView = lazy(() => import('./RequirementPoolView').then(module => ({ default: module.RequirementPoolView })));
const pageKinds: Record<string, string> = {
  prod_req_tasks: 'requirement', prod_design_tasks: 'design', prod_rd_tasks: 'dev',
  prod_test_tasks: 'test', prod_bugs: 'bug', crm_presales_tasks: 'presales',
  proj_delivery_tasks: 'delivery', proj_ops_tasks: 'ops', wb_work_order: 'WORK_ORDER',
};
export const isFullPageDetail = (viewId: string, search: string) => {
  const params = new URLSearchParams(search);
  return Boolean(pageKinds[viewId] && params.get('detailId') && params.get('detailView') === 'full');
};

export function FullPageWorkItemDetail({ viewId, search }: { viewId: string; search: string }) {
  const navigate = useNavigate();
  const params = new URLSearchParams(search);
  const id = params.get('detailId') || '';
  const lineId = params.get('productLineId') || '';
  const kind = pageKinds[viewId];
  const [detail, setDetail] = useState<RequirementTask>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setDetail(undefined); setError(undefined);
    const request = kind === 'WORK_ORDER' ? requirementRepository.detail(id)
      : ['presales', 'delivery', 'ops'].includes(kind) ? productRepository.businessTask(kind as 'presales' | 'delivery' | 'ops', id)
      : lineId ? productRepository.workItemDetail(lineId, id) : requirementRepository.detail(id);
    request.then(item => {
      if (active) setDetail({ ...item, id, category: item.category || kind, title: item.title,
        status: item.statusName || (typeof item.status === 'object' ? item.status?.name : item.status) || '未设置',
        ownerName: item.assigneeName || item.ownerName,
        productLineId: item.productLineId || lineId,
        workItemTypeId: item.taskTypeId || item.workItemTypeId,
      } as RequirementTask);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : '详情加载失败'); });
    return () => { active = false; };
  }, [id, kind, lineId, attempt]);
  const back = () => navigate(`/app/${viewId}`);
  return <main className="flex min-h-0 flex-1 flex-col bg-[var(--bg-surface)]">
    <div className="shrink-0 border-b border-[var(--border-main)] px-6 py-3"><Button type="text" icon={<ArrowLeftOutlined />} onClick={back}>返回列表</Button></div>
    <div className="relative min-h-0 flex-1">
      {error ? <div className="p-6"><Alert type="error" showIcon title="详情加载失败" description={error} action={<Button onClick={() => setAttempt(value => value + 1)}>重试</Button>}/></div>
        : !detail ? <div className="p-6"><Skeleton active/></div>
        : <Suspense fallback={<div className="p-6"><Skeleton active/></div>}>
          {kind === 'WORK_ORDER'
            ? <MatterView initialDetail={detail} fullPage onDetailClose={back}/>
            : <TaskView initialDetail={detail} taskKind={kind as 'requirement'} productLineFilter={detail.productLineId} detailPresentation="page" onDetailClose={back}/>}
        </Suspense>}
    </div>
  </main>;
}
