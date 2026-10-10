import React, { useMemo, useState } from 'react';
import { Button, Empty, Input, Modal, Select, message } from 'antd';
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { designGroupOf, designVariantOf } from './designTaskPresentation';
import { Search } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import type { RequirementTask } from '../../types';
import { RequirementTasksView } from './RequirementTasksView';
import type { DesignAllocationExtra } from './ProductTaskAllocationView';

type DesignTasksViewProps = { productLineFilter?: string; productLines?: Array<{ id: string; name: string; code?: string }>; onProductLineChange?: (value: string) => void };
export type DesignTaskVariant = 'product' | 'project' | 'other';
type PoolVariant = DesignTaskVariant | 'all';
type TodoStatus = '待设计' | '设计中' | '已设计' | '已取消';
type TodoDesign = { id: string; title: string; variant: DesignTaskVariant; ownership: string; creator: string; createdAt: string; status: TodoStatus; reason?: string; sourceTitle: string };

const DESIGN_VARIANTS: Array<{ key: DesignTaskVariant; label: string }> = [{ key: 'product', label: '产品设计' }, { key: 'project', label: '项目设计' }, { key: 'other', label: '其他设计' }];
const TODO_VARIANT_LABEL: Record<DesignTaskVariant, string> = { product: '产品设计', project: '项目设计', other: '其他设计' };
const INITIAL_TODOS: TodoDesign[] = [
  { id: 'todo-design-product-demo', title: '会员中心等级权益页视觉优化', variant: 'product', ownership: '客户运营平台 / V2.6', creator: '林晓', createdAt: '2026-09-28', status: '待设计', sourceTitle: '会员等级与权益升级' },
  { id: 'todo-design-project-demo', title: '展厅导视与产品展板设计', variant: 'project', ownership: '华东体验中心建设项目', creator: '周明', createdAt: '2026-09-29', status: '设计中', sourceTitle: '展厅物料设计协助' },
  { id: 'todo-design-other-demo', title: '季度合作伙伴大会主视觉支持', variant: 'other', ownership: '市场部', creator: '陈佳', createdAt: '2026-09-30', status: '待设计', sourceTitle: '大会视觉协同事项' }
];
const variantOf = designVariantOf;
const DesignPoolList: React.FC<{ variant: PoolVariant }> = ({ variant }) => {
  const [todos, setTodos] = useState(INITIAL_TODOS);
  const [keyword, setKeyword] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [status, setStatus] = useState<string>();
  const [taskType, setTaskType] = useState<DesignTaskVariant>();
  const [activeTodo, setActiveTodo] = useState<TodoDesign>();
  const [reason, setReason] = useState<string>();
  const [reasonNote, setReasonNote] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
  const filtered = useMemo(() => todos.filter((item) => (variant === 'all' || item.variant === variant)
    && (!taskType || item.variant === taskType)
    && (!status || item.status === status)
    && (!keyword.trim() || `${item.title} ${item.ownership}`.toLowerCase().includes(keyword.trim().toLowerCase()))), [todos, variant, taskType, status, keyword]);
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
    </div>
    {filtered.length === 0 ? <div className="flex min-h-[360px] items-center justify-center"><Empty description="没有符合条件的待办设计" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left text-xs"><thead><tr className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--text-muted)]"><th className="px-4 py-3">标题</th><th className="px-4 py-3">任务类型</th><th className="px-4 py-3">来源归属</th><th className="px-4 py-3">前置任务状态</th><th className="px-4 py-3">分配状态</th><th className="px-4 py-3">结束原因</th><th className="px-4 py-3">操作</th></tr></thead><tbody className="divide-y divide-[var(--border-main)]">{filtered.map((item) => <tr key={item.id} className="hover:bg-[var(--bg-surface-soft)]"><td className="max-w-[280px] truncate px-4 py-3">{item.title}</td><td className="px-4 py-3">{TODO_VARIANT_LABEL[item.variant]}</td><td className="px-4 py-3">{item.ownership}</td><td className="px-4 py-3">{item.variant === 'product' ? item.status : '—'}</td><td className="px-4 py-3">{item.status === '已设计' ? '已分配' : '待分配'}</td><td className="px-4 py-3">{item.reason || '—'}</td><td className="px-4 py-3"><div className="flex items-center gap-2">{item.status === '待设计' && <><Button size="small" type="link" onClick={() => message.info('请通过转任务创建设计任务')}>转任务</Button><Button size="small" type="link" onClick={() => { setActiveTodo(item); setReasonOpen(true); }}>无需设计</Button></>}{['设计中', '已设计'].includes(item.status) && <Button size="small" type="link">查看设计任务</Button>}</div></td></tr>)}</tbody></table></div>}
    <Modal title="无需设计" open={reasonOpen} okText="确认结束" cancelText="取消" onCancel={() => { setReasonOpen(false); setReason(undefined); setReasonNote(''); }} onOk={completeWithoutDesign} okButtonProps={{ disabled: !reason || (reason === '其他' && !reasonNote.trim()) }}><div className="space-y-3"><p className="text-sm text-[var(--text-muted)]">请选择结束原因，所有来源类型均可使用。</p><Select className="w-full" placeholder="请选择原因" value={reason} onChange={setReason} options={['产品需求不需要设计', '使用现有设计', '由其他任务覆盖', '其他'].map((item) => ({ label: item, value: item }))} />{reason === '其他' && <Input.TextArea rows={3} maxLength={200} showCount placeholder="请补充说明" value={reasonNote} onChange={(event) => setReasonNote(event.target.value)} />}</div></Modal>
  </section>;
};

export const DesignTasksView: React.FC<DesignTasksViewProps> = () => {
  const [designVariant, setDesignVariant] = useState<DesignTaskVariant>('product');
  const [designVariantFilter, setDesignVariantFilter] = useState<DesignTaskVariant | 'all'>('all');
  const { designTasks = [] } = useApp();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [ownershipFilter, setOwnershipFilter] = useState('');
  const designGroups = useMemo(() => Object.fromEntries(DESIGN_VARIANTS.map(({ key }) => {
    const groups = new Map<string, { key: string; name: string; count: number }>();
    designTasks.filter(task => variantOf(task) === key).forEach(task => {
      const group = designGroupOf(task);
      if (!group.key) return;
      groups.set(group.key, { ...group, count: (groups.get(group.key)?.count || 0) + 1 });
    });
    return [key, [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))];
  })), [designTasks]);
  const selectVariant = (variant: DesignTaskVariant | 'all') => {
    setDesignVariantFilter(variant); setOwnershipFilter('');
    if (variant !== 'all') setDesignVariant(variant);
  };
  const toggleVariant = (variant: string) => setExpanded(current => { const next = new Set(current); next.has(variant) ? next.delete(variant) : next.add(variant); return next; });
  const designCounts = useMemo(() => ({ all: designTasks.length, product: designTasks.filter((task) => variantOf(task) === 'product').length, project: designTasks.filter((task) => variantOf(task) === 'project').length, other: designTasks.filter((task) => variantOf(task) === 'other').length }), [designTasks]);
  const designExtras = useMemo<DesignAllocationExtra[]>(() => INITIAL_TODOS.map((item) => ({
    id: item.id,
    code: item.id,
    category: 'requirement',
    title: item.title,
    productLineId: '',
    productName: item.ownership,
    allocated: item.status === '设计中' || item.status === '已设计',
    designVariant: item.variant,
    designStatus: item.variant === 'product' ? item.status : undefined,
    reason: item.reason,
    sourceTitle: item.sourceTitle,
    status: { name: item.status, successful: item.status === '已设计' },
  } as DesignAllocationExtra)), []);
  return <div className="design-tasks-view"><div className="grid min-h-[520px] grid-cols-[auto_minmax(0,1fr)] gap-3"><aside aria-label="设计类型" className="w-60 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-2">
    <div className="px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">设计类型</div>
    <button type="button" aria-pressed={designVariantFilter === 'all'} onClick={() => selectVariant('all')} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${designVariantFilter === 'all' ? 'bg-[var(--primary)]/10 text-[var(--active-text)]' : 'hover:bg-[var(--bg-surface-soft)]'}`}><span>全部</span><span>{designCounts.all}</span></button>
    {DESIGN_VARIANTS.map(({ key, label }) => <section key={key} aria-label={`${label}分组`}>
      <div className="flex items-center">
        <button type="button" aria-label={`${expanded.has(key) ? '收起' : '展开'}${label}`} aria-expanded={expanded.has(key)} onClick={() => toggleVariant(key)} className="rounded p-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]">{expanded.has(key) ? <CaretDownOutlined /> : <CaretRightOutlined />}</button>
        <button type="button" aria-label={label} aria-pressed={designVariantFilter === key && !ownershipFilter} onClick={() => { selectVariant(key); toggleVariant(key); }} className={`flex min-w-0 flex-1 items-center justify-between rounded-md px-3 py-2 text-left text-sm ${designVariantFilter === key && !ownershipFilter ? 'bg-[var(--primary)]/10 text-[var(--active-text)]' : 'hover:bg-[var(--bg-surface-soft)]'}`}><span>{label}</span><span>{designCounts[key]}</span></button>
      </div>
      {expanded.has(key) && <div className="pl-6">{designGroups[key].map(group => <button type="button" key={group.key} aria-label={`${label}：${group.name}`} aria-pressed={designVariantFilter === key && ownershipFilter === group.key} onClick={() => { selectVariant(key); setOwnershipFilter(group.key); }} className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${designVariantFilter === key && ownershipFilter === group.key ? 'bg-[var(--primary)]/10 text-[var(--active-text)]' : 'hover:bg-[var(--bg-surface-soft)]'}`}><span className="truncate" title={group.name}>{group.name}</span><span className="text-xs text-[var(--text-muted)]">{group.count}</span></button>)}{!designGroups[key].length && <p className="px-3 py-2 text-xs text-[var(--text-muted)]">暂无设计任务</p>}</div>}
    </section>)}
  </aside><div className="min-w-0"><RequirementTasksView key={designVariantFilter} productLineFilter="all" itemLabel="设计任务" taskKind="design" designVariant={designVariant} designVariantFilter={designVariantFilter} designOwnershipFilter={ownershipFilter} onDesignVariantChange={setDesignVariant} designExtras={designExtras} /></div></div></div>;
};
export default DesignTasksView;
