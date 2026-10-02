import React, { useMemo, useState } from 'react';
import { Empty, Tabs } from 'antd';
import { Layers, ListTodo } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import type { RequirementTask } from '../../types';
import { RequirementTasksView } from './RequirementTasksView';

type DesignTasksViewProps = { productLineFilter?: string; productLines?: Array<{ id: string; name: string; code?: string }>; onProductLineChange?: (value: string) => void };
export type DesignTaskVariant = 'product' | 'project' | 'other';
type PoolVariant = DesignTaskVariant | 'all';
const DESIGN_VARIANTS: Array<{ key: DesignTaskVariant; label: string }> = [{ key: 'product', label: '产品设计' }, { key: 'project', label: '项目设计' }, { key: 'other', label: '其他设计' }];
const variantOf = (task: RequirementTask): DesignTaskVariant => {
  if (task.designVariant) return task.designVariant;
  const typeName = task.requirementType || '';
  if (typeName.includes('其他')) return 'other';
  if (typeName.includes('物料') || typeName.includes('项目')) return 'project';
  return 'product';
};
const ownershipOf = (task: RequirementTask, variant: DesignTaskVariant) => {
  if (variant === 'product') return [task.productLineName, task.versionName || '未关联'].filter(Boolean).join(' / ') || '未设置';
  if (variant === 'project') return task.designProjectName || (task as RequirementTask & { projectName?: string }).projectName || task.productLineName || '未设置';
  return task.designSourceDepartment || task.department || '未设置';
};
const Navigation: React.FC<{ title: string; value: string; items: Array<[string, string]>; counts: Record<string, number>; onChange: (value: string) => void }> = ({ title, value, items, counts, onChange }) => <aside className="min-w-[176px] rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2"><div className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">{title}</div>{items.map(([key, label]) => <button key={key} type="button" onClick={() => onChange(key)} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${value === key ? 'bg-[var(--primary)]/10 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]'}`}><span>{label}</span><span className="font-mono text-xs text-[var(--text-muted)]">{counts[key] || 0}</span></button>)}</aside>;
const DesignPoolList: React.FC<{ variant: PoolVariant }> = ({ variant }) => {
  const { designTasks = [] } = useApp();
  const tasks = useMemo(() => designTasks.filter((task) => variant === 'all' || variantOf(task) === variant), [designTasks, variant]);
  return <section className="min-h-[520px] overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]"><div className="flex items-center justify-between border-b border-[var(--border-main)] px-4 py-3"><div><h2 className="text-sm font-semibold text-[var(--text-primary)]">待办设计</h2><p className="mt-1 text-xs text-[var(--text-muted)]">已有设计需求按来源分类展示</p></div><span className="font-mono text-xs text-[var(--text-muted)]">共 {tasks.length} 条</span></div>{tasks.length === 0 ? <div className="flex min-h-[420px] items-center justify-center"><Empty description="暂无待办设计" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--text-muted)]"><th className="px-4 py-3">标题</th><th className="px-4 py-3">设计类型</th><th className="px-4 py-3">设计归属</th><th className="px-4 py-3">负责人</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">创建时间</th></tr></thead><tbody className="divide-y divide-[var(--border-main)]">{tasks.map((task) => { const taskVariant = variantOf(task); return <tr key={task.id} className="hover:bg-[var(--bg-surface-soft)]"><td className="max-w-[360px] truncate px-4 py-3 font-medium text-[var(--primary)]" title={task.title}>{task.title}</td><td className="px-4 py-3 text-[var(--text-body)]">{DESIGN_VARIANTS.find((item) => item.key === taskVariant)?.label}</td><td className="px-4 py-3 text-[var(--text-body)]">{ownershipOf(task, taskVariant)}</td><td className="px-4 py-3 text-[var(--text-muted)]">{task.ownerName || '未设置'}</td><td className="px-4 py-3 text-[var(--text-muted)]">{task.status || '未设置'}</td><td className="px-4 py-3 font-mono text-[var(--text-muted)]">{task.createdAt || '—'}</td></tr>; })}</tbody></table></div>}</section>;
};
export const DesignTasksView: React.FC<DesignTasksViewProps> = () => {
  const [activeTab, setActiveTab] = useState('design'); const [designVariant, setDesignVariant] = useState<DesignTaskVariant>('product'); const [poolVariant, setPoolVariant] = useState<PoolVariant>('all'); const { designTasks = [] } = useApp();
  const designCounts = useMemo(() => ({ product: designTasks.filter((task) => variantOf(task) === 'product').length, project: designTasks.filter((task) => variantOf(task) === 'project').length, other: designTasks.filter((task) => variantOf(task) === 'other').length }), [designTasks]);
  const poolCounts = { all: designTasks.length, ...designCounts };
  return <div className="design-tasks-view"><Tabs className="test-and-defect-tabs" activeKey={activeTab} onChange={setActiveTab} items={[{ key: 'design', label: <span className="inline-flex items-center gap-2"><Layers size={16} />设计任务</span>, children: <div className="grid min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3"><Navigation title="设计类型" value={designVariant} items={DESIGN_VARIANTS.map(({ key, label }) => [key, label])} counts={designCounts} onChange={(value) => setDesignVariant(value as DesignTaskVariant)} /><div className="min-w-0"><RequirementTasksView key={designVariant} productLineFilter="all" itemLabel="设计任务" taskKind="design" designVariant={designVariant} onDesignVariantChange={setDesignVariant} /></div></div> }, { key: 'todo-design', label: <span className="inline-flex items-center gap-2"><ListTodo size={16} />待办设计</span>, children: <div className="grid min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3"><Navigation title="设计来源" value={poolVariant} items={[['all', '全部'], ['product', '产品'], ['project', '项目'], ['other', '其他']]} counts={poolCounts} onChange={(value) => setPoolVariant(value as PoolVariant)} /><DesignPoolList variant={poolVariant} /></div> }]} /></div>;
};
export default DesignTasksView;
