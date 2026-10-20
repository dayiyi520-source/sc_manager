import { lazy, Suspense, useEffect, useState } from 'react';
import { Alert, Button, Drawer } from 'antd';
import { requirementRepository } from '../../services/requirementRepository';
import { productRepository } from '../../services/productRepository';
import type { RequirementTask } from '../../types';

const loadTaskView = () => import('../product/RequirementTasksView').then(module => ({ default: module.RequirementTasksView }));
const loadMatterView = () => import('./RequirementPoolView').then(module => ({ default: module.RequirementPoolView }));
const TaskView = lazy(loadTaskView);
const MatterView = lazy(loadMatterView);
export type TodoRecord = Awaited<ReturnType<typeof requirementRepository.myTasks>>[number];
const taskKinds = ['requirement', 'design', 'dev', 'test', 'bug', 'presales', 'delivery', 'ops'] as const;

export function TodoDetail({ task, onClose }: { task: TodoRecord; onClose: () => void }) {
  const [detail, setDetail] = useState<RequirementTask>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const kind = taskKinds.find(kind => kind === task.type) || 'requirement';
  useEffect(() => {
    let active = true;
    setDetail(undefined); setError(undefined);
    const request = task.taskGroup === 'assist' ? requirementRepository.detail(task.sourceId)
      : kind === 'presales' || kind === 'delivery' || kind === 'ops' ? productRepository.businessTask(kind, task.sourceId)
      : task.productLineId ? productRepository.workItemDetail(task.productLineId, task.sourceId) : requirementRepository.detail(task.sourceId);
    Promise.all([request, task.taskGroup === 'assist' ? loadMatterView() : loadTaskView()]).then(([item]) => {
      if (!active) return;
      const source = item as RequirementTask & { statusName?: string; assigneeName?: string; taskTypeId?: string; plannedEndDate?: string };
      const status = (item as { status?: string | { name?: string } | null }).status;
      setDetail({ ...source, id: task.sourceId, title: source.title, category: source.category || kind,
        status: source.statusName || (typeof status === 'string' ? status : status?.name) || task.status,
        ownerName: source.assigneeName || source.ownerName || task.assigneeName,
        productLineId: source.productLineId || task.productLineId,
        workItemTypeId: source.taskTypeId || source.workItemTypeId,
        dueDate: source.plannedEndDate || source.dueDate,
      } as RequirementTask);
    }).catch(error => { if (active) setError(error instanceof Error ? error.message : '详情加载失败'); });
    return () => { active = false; };
  }, [task.sourceId, task.productLineId, task.taskGroup, kind, attempt]);
  if (!detail) return error ? <Drawer open onClose={onClose} title={task.title} size={960}><Alert type="error" showIcon title={error} action={<Button onClick={() => setAttempt(value => value + 1)}>重试</Button>}/></Drawer> : null;
  return <Suspense fallback={null}>{task.taskGroup === 'assist'
    ? <MatterView initialDetail={detail} onDetailClose={onClose}/>
    : <TaskView initialDetail={detail} productLineFilter={detail.productLineId} taskKind={kind} onDetailClose={onClose}/>}</Suspense>;
}
