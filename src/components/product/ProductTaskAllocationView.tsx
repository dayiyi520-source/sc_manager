import React, { useMemo, useState } from 'react';
import { Button, Input, Select, Table, Tag } from 'antd';
import type { ProductLine } from '../../types';
import { productRepository, type UnifiedWorkItem } from '../../services/productRepository';
import { WorkItemCategoryIcon } from './WorkItemCategoryIcon';

export const loadProductTaskAllocation = async (lines: ProductLine[], kind: 'design' | 'dev' | 'test') => {
  const load = async (id: string, category: string) => {
    const items: UnifiedWorkItem[] = [];
    for (let page = 1; ; page++) {
      const result = await productRepository.workItems(id, category, '', { page });
      items.push(...result.page.items);
      if (!result.page.items.length || items.length >= result.page.total) return items;
    }
  };
  const results = await Promise.all(lines.map(async (line) => {
    const [requirements, downstream] = await Promise.all([load(line.id, 'requirement'), load(line.id, kind)]);
    return requirements.filter((task) => !task.parentWorkItemId && (task.needsCollaboration ?? ['dev', 'test']).includes(kind)).map((task) => {
      const allocatedTask = downstream.find((child) => child.requirementId === task.id || child.parentWorkItemId === task.id);
      const versionCode = line.versions?.find((version) => version.id === task.versionId)?.code || '';
      return { ...task, productName: [line.name, versionCode].filter(Boolean).join(' / '), allocated: Boolean(allocatedTask), allocatedTask };
    });
  }));
  return results.flat();
};
export type ProductAllocationRow = Awaited<ReturnType<typeof loadProductTaskAllocation>>[number];
export type DesignAllocationExtra = ProductAllocationRow & { designVariant: 'product' | 'project' | 'other'; designStatus?: string; reason?: string; sourceTitle?: string };
export type AllocationRow = ProductAllocationRow | DesignAllocationExtra;
const isDesignExtra = (task: AllocationRow): task is DesignAllocationExtra => 'designVariant' in task;
export const ProductTaskAllocationView: React.FC<{ kind: 'design' | 'dev' | 'test'; items: ProductAllocationRow[]; designExtras?: DesignAllocationExtra[]; loading: boolean; error: boolean; onRetry: () => void; onOpen: (task: AllocationRow) => void; onCreate: (task: AllocationRow) => void; onOpenAllocated: (task: AllocationRow) => void; onNoDesign?: (task: AllocationRow) => void }> = ({ kind, items, designExtras = [], loading, error, onRetry, onOpen, onCreate, onOpenAllocated, onNoDesign }) => {
  const [keyword, setKeyword] = useState('');
  const [allocation, setAllocation] = useState<'待分配' | '已分配'>();
  const [designType, setDesignType] = useState<string>();
  const rows = useMemo<AllocationRow[]>(() => [...items, ...designExtras], [items, designExtras]);
  const filteredRows = useMemo(() => rows.filter((task) => (!keyword.trim() || task.title.toLowerCase().includes(keyword.trim().toLowerCase())) && (!allocation || (task.allocated ? '已分配' : '待分配') === allocation) && (!designType || !isDesignExtra(task) || task.designVariant === designType)), [rows, keyword, allocation, designType]);
  return <section className="space-y-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
  <div className="flex justify-between"><h3 className="text-sm font-bold">待分配任务</h3><Tag>{rows.length} 条</Tag></div>
  <div className="allocation-filters flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
    <div className="allocation-keyword">
      <Input allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题" />
    </div>
    {kind === 'design' && <Select allowClear value={designType} onChange={setDesignType} placeholder="任务类型" className="w-32 min-w-32 flex-[0_0_8rem]" options={[{ label: '产品设计', value: 'product' }, { label: '物料设计', value: 'project' }, { label: '其他设计', value: 'other' }]} />}
    <Select allowClear value={allocation} onChange={setAllocation} placeholder="分配状态" className="w-32 min-w-32 flex-[0_0_8rem]" options={[{ label: '待分配', value: '待分配' }, { label: '已分配', value: '已分配' }]} />
  </div>
  {error ? <div role="alert">待分配任务加载失败<Button onClick={onRetry}>重试</Button></div> : <Table rowKey="id" loading={loading} dataSource={filteredRows} size="small" pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: true }} locale={{ emptyText: '暂无待分配任务' }} columns={[
    { title: '标题', key: 'title', render: (_: unknown, task: AllocationRow) => <Button type="link" onClick={() => onOpen(task)} className="max-w-full whitespace-normal text-left"><WorkItemCategoryIcon category={kind === 'design' ? 'design' : 'requirement'} className="mr-2" />{task.title}</Button> },
    ...(kind === 'design' ? [{ title: '任务类型', key: 'type', render: (_: unknown, task: AllocationRow) => <span>{isDesignExtra(task) ? ({ product: '产品设计', project: '物料设计', other: '其他设计' }[task.designVariant]) : '产品设计'}</span> }] : []),
    { title: '来源归属', dataIndex: 'productName' },
    { title: '前置任务状态', key: 'status', render: (_: unknown, task: AllocationRow) => <Tag>{isDesignExtra(task) ? (task.designVariant === 'product' ? (task.designStatus || '未设置') : '—') : (task.status?.name || '未设置')}</Tag> },
    { title: '分配状态', key: 'allocation', render: (_: unknown, task: AllocationRow) => <Tag>{task.allocated ? '已分配' : '待分配'}</Tag> },
    ...(kind === 'design' ? [{ title: '结束原因', key: 'reason', render: (_: unknown, task: AllocationRow) => isDesignExtra(task) ? (task.reason || '—') : '—' }] : []),
    { title: '操作', key: 'action', render: (_: unknown, task: AllocationRow) => {
      if (task.allocated) return <Button type="link" onClick={() => onOpenAllocated(task)}>查看{kind === 'dev' ? '研发' : kind === 'test' ? '测试' : '设计'}任务</Button>;
      const complete = isDesignExtra(task) ? task.designVariant !== 'product' || task.designStatus === '已完成' : Boolean(task.status?.successful) || task.status?.name === '已完成';
      if (kind !== 'design' && !complete) return '—';
      if (kind === 'design' && !complete) return <span>—</span>;
      return <>{<Button type="link" onClick={() => onCreate(task)}>转任务</Button>}{kind === 'design' && <Button type="link" onClick={() => onNoDesign?.(task)}>无需设计</Button>}</>;
    } }
  ]} />}
</section>;
};
