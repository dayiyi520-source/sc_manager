import React, { useMemo, useState } from 'react';
import { Button, Empty, Input, Modal, Select, Tabs, message } from 'antd';
import { Layers, ListTodo, Search } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import type { RequirementTask } from '../../types';
import { RequirementTasksView } from './RequirementTasksView';

type DesignTasksViewProps = { productLineFilter?: string; productLines?: Array<{ id: string; name: string; code?: string }>; onProductLineChange?: (value: string) => void };
export type DesignTaskVariant = 'product' | 'project' | 'other';
type PoolVariant = DesignTaskVariant | 'all';
type TodoStatus = '待设计' | '设计中' | '已设计' | '已取消';
type TodoDesign = { id: string; title: string; variant: DesignTaskVariant; ownership: string; creator: string; createdAt: string; status: TodoStatus; reason?: string; sourceTitle: string };

const DESIGN_VARIANTS: Array<{ key: DesignTaskVariant; label: string }> = [{ key: 'product', label: '产品设计' }, { key: 'project', label: '物料设计' }, { key: 'other', label: '其他设计' }];
const TODO_VARIANT_LABEL: Record<DesignTaskVariant, string> = { product: '产品设计', project: '物料设计', other: '其他设计' };
const INITIAL_TODOS: TodoDesign[] = [
  { id: 'todo-design-product-demo', title: '会员中心等级权益页视觉优化', variant: 'product', ownership: '客户运营平台 / V2.6', creator: '林晓', createdAt: '2026-09-28', status: '待设计', sourceTitle: '会员等级与权益升级' },
  { id: 'todo-design-project-demo', title: '展厅导视与产品展板设计', variant: 'project', ownership: '华东体验中心建设项目', creator: '周明', createdAt: '2026-09-29', status: '设计中', sourceTitle: '展厅物料设计协助' },
  { id: 'todo-design-other-demo', title: '季度合作伙伴大会主视觉支持', variant: 'other', ownership: '市场部', creator: '陈佳', createdAt: '2026-09-30', status: '待设计', sourceTitle: '大会视觉协助事项' }
];
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
  const [todos, setTodos] = useState(INITIAL_TODOS);
  const [keyword, setKeyword] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [status, setStatus] = useState<string>();
  const [creator, setCreator] = useState<string>();
  const [taskType, setTaskType] = useState<DesignTaskVariant>();
  const [activeTodo, setActiveTodo] = useState<TodoDesign>();
  const [reason, setReason] = useState<string>();
  const [reasonNote, setReasonNote] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
  const creators = useMemo(() => Array.from(new Set(todos.map((item) => item.creator))), [todos]);
  const filtered = useMemo(() => todos.filter((item) => (variant === 'all' || item.variant === variant)
    && (!taskType || item.variant === taskType)
    && (!status || item.status === status) && (!creator || item.creator === creator)
    && (!keyword.trim() || `${item.title} ${item.ownership}`.toLowerCase().includes(keyword.trim().toLowerCase()))), [todos, variant, taskType, status, creator, keyword]);
  const completeWithoutDesign = () => {
    if (!activeTodo || !reason || (reason === '其他' && !reasonNote.trim())) return;
    setTodos((items) => items.map((item) => item.id === activeTodo.id ? { ...item, status: '已取消', reason: reason === '其他' ? `其他：${reasonNote.trim()}` : reason } : item));
    setReasonOpen(false);
    setActiveTodo(undefined);
    setReason(undefined);
    setReasonNote('');
    message.success('已将待办设计标记为无需设计');
  };
  const statusColor: Record<TodoStatus, string> = { 待设计: 'text-[var(--warning)]', 设计中: 'text-[var(--primary)]', 已设计: 'text-[var(--success)]', 已取消: 'text-[var(--text-muted)]' };
  return <section className="min-h-[520px] overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-main)] px-4 py-3"><div><h2 className="text-sm font-semibold text-[var(--text-primary)]">待办设计</h2><p className="mt-1 text-xs text-[var(--text-muted)]">当前展示三类来源的关联示例</p></div><span className="font-mono text-xs text-[var(--text-muted)]">共 {filtered.length} 条</span></div>
    <div className="design-pool-filters flex min-w-0 flex-nowrap items-center gap-3 border-b border-[var(--border-main)] px-4 py-3">
      <div className={`design-pool-search ${searchOpen ? 'is-open' : ''}`}>
        {searchOpen && <Input autoFocus allowClear aria-label="搜索标题或来源归属" placeholder="搜索标题 / 来源归属" value={keyword} onChange={(event) => setKeyword(event.target.value)} prefix={<Search className="h-4 w-4 text-[var(--text-muted)]" />} />}
        <Button type="text" aria-label="搜索" aria-pressed={searchOpen} icon={<Search className="h-4 w-4" />} onClick={() => setSearchOpen((value) => !value)} />
      </div>
      <Select allowClear aria-label="任务类型筛选" placeholder="全部任务类型" value={taskType} onChange={setTaskType} style={{ width: 128, flex: '0 0 128px' }} options={(Object.entries(TODO_VARIANT_LABEL) as Array<[DesignTaskVariant, string]>).map(([value, label]) => ({ label, value }))} />
      <Select allowClear aria-label="状态筛选" placeholder="全部状态" value={status} onChange={setStatus} style={{ width: 112, flex: '0 0 112px' }} options={['待设计', '设计中', '已设计', '已取消'].map((item) => ({ label: item, value: item }))} />
      <Select allowClear aria-label="创建人筛选" placeholder="全部创建人" value={creator} onChange={setCreator} style={{ width: 128, flex: '0 0 128px' }} options={creators.map((item) => ({ label: item, value: item }))} />
    </div>
    {filtered.length === 0 ? <div className="flex min-h-[360px] items-center justify-center"><Empty description="没有符合条件的待办设计" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-xs"><thead><tr className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--text-muted)]"><th className="px-4 py-3">标题</th><th className="px-4 py-3">任务类型</th><th className="px-4 py-3">来源归属</th><th className="px-4 py-3">状态</th><th className="px-4 py-3">创建人</th><th className="px-4 py-3">创建时间</th><th className="px-4 py-3">结束原因</th><th className="px-4 py-3">操作</th></tr></thead><tbody className="divide-y divide-[var(--border-main)]">{filtered.map((item) => <tr key={item.id} className="hover:bg-[var(--bg-surface-soft)]"><td className="max-w-[280px] truncate px-4 py-3"><button type="button" className="block max-w-full truncate text-left font-medium text-[var(--primary)] hover:underline" title={`${item.title} · 来源：${item.sourceTitle}`} onClick={() => message.warning('来源任务已删除或暂无查看权限')}>{item.title}</button></td><td className="px-4 py-3 text-[var(--text-body)]">{TODO_VARIANT_LABEL[item.variant]}</td><td className="px-4 py-3 text-[var(--text-body)]">{item.ownership}</td><td className={`px-4 py-3 ${statusColor[item.status]}`}>{item.status}</td><td className="px-4 py-3 text-[var(--text-muted)]">{item.creator}</td><td className="px-4 py-3 font-mono text-[var(--text-muted)]">{item.createdAt}</td><td className="max-w-[180px] truncate px-4 py-3 text-[var(--text-muted)]" title={item.reason}>{item.reason || '—'}</td><td className="px-4 py-3"><div className="flex items-center gap-2">{item.status === '待设计' && <><Button size="small" type="link" onClick={() => message.info('关联设计任务创建流程尚未接入待办设计数据')}>转任务</Button><Button size="small" type="link" onClick={() => { setActiveTodo(item); setReasonOpen(true); }}>无需设计</Button></>}{['设计中', '已设计'].includes(item.status) && <Button size="small" type="link" onClick={() => message.info('此示例尚未关联已保存的设计任务')}>查看设计任务</Button>}</div></td></tr>)}</tbody></table></div>}
    <Modal title="无需设计" open={reasonOpen} okText="确认结束" cancelText="取消" onCancel={() => { setReasonOpen(false); setReason(undefined); setReasonNote(''); }} onOk={completeWithoutDesign} okButtonProps={{ disabled: !reason || (reason === '其他' && !reasonNote.trim()) }}><div className="space-y-3"><p className="text-sm text-[var(--text-muted)]">请选择结束原因，所有来源类型均可使用。</p><Select className="w-full" placeholder="请选择原因" value={reason} onChange={setReason} options={['产品需求不需要设计', '使用现有设计', '由其他任务覆盖', '其他'].map((item) => ({ label: item, value: item }))} />{reason === '其他' && <Input.TextArea rows={3} maxLength={200} showCount placeholder="请补充说明" value={reasonNote} onChange={(event) => setReasonNote(event.target.value)} />}</div></Modal>
  </section>;
};

export const DesignTasksView: React.FC<DesignTasksViewProps> = () => {
  const [activeTab, setActiveTab] = useState('design');
  const [designVariant, setDesignVariant] = useState<DesignTaskVariant>('product');
  const [designVariantFilter, setDesignVariantFilter] = useState<DesignTaskVariant | 'all'>('all');
  const [poolVariant, setPoolVariant] = useState<PoolVariant>('all');
  const { designTasks = [] } = useApp();
  const designCounts = useMemo(() => ({ all: designTasks.length, product: designTasks.filter((task) => variantOf(task) === 'product').length, project: designTasks.filter((task) => variantOf(task) === 'project').length, other: designTasks.filter((task) => variantOf(task) === 'other').length }), [designTasks]);
  const poolCounts = useMemo(() => ({ all: INITIAL_TODOS.length, product: INITIAL_TODOS.filter((item) => item.variant === 'product').length, project: INITIAL_TODOS.filter((item) => item.variant === 'project').length, other: INITIAL_TODOS.filter((item) => item.variant === 'other').length }), []);
  return <div className="design-tasks-view"><Tabs className="test-and-defect-tabs" activeKey={activeTab} onChange={setActiveTab} items={[
    { key: 'design', label: <span className="inline-flex items-center gap-2"><Layers size={16} />设计任务</span>, children: <div className="grid min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3"><Navigation title="设计类型" value={designVariantFilter} items={[[ 'all', '全部'], ...DESIGN_VARIANTS.map(({ key, label }) => [key, label] as [string, string])]} counts={designCounts} onChange={(value) => { const next = value as DesignTaskVariant | 'all'; setDesignVariantFilter(next); if (next !== 'all') setDesignVariant(next); }} /><div className="min-w-0"><RequirementTasksView key={designVariantFilter} productLineFilter="all" itemLabel="设计任务" taskKind="design" designVariant={designVariant} designVariantFilter={designVariantFilter} onDesignVariantChange={setDesignVariant} /></div></div> },
    { key: 'todo-design', label: <span className="inline-flex items-center gap-2"><ListTodo size={16} />待办设计</span>, children: <div className="grid min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3"><Navigation title="任务类型" value={poolVariant} items={[[ 'all', '全部'], ['product', '产品设计'], ['project', '物料设计'], ['other', '其他设计']]} counts={poolCounts} onChange={(value) => setPoolVariant(value as PoolVariant)} /><DesignPoolList variant={poolVariant} /></div> }
  ]} /></div>;
};
export default DesignTasksView;
