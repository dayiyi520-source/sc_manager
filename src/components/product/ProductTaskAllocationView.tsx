import React, { useEffect, useMemo, useState } from 'react';
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
      const version = line.versions?.find((item) => item.id === task.versionId);
      return { ...task, productName: line.name, productLineName: line.name, versionName: version?.name || task.versionName || '', versionCode: version?.code || '', allocated: Boolean(allocatedTask), allocatedTask };
    });
  }));
  return results.flat();
};
export type ProductAllocationRow = Awaited<ReturnType<typeof loadProductTaskAllocation>>[number];
export type DesignAllocationExtra = ProductAllocationRow & { designVariant: 'product' | 'project' | 'other'; designStatus?: string; reason?: string; sourceTitle?: string };
export type AllocationRow = ProductAllocationRow | DesignAllocationExtra;
const isDesignExtra = (task: AllocationRow): task is DesignAllocationExtra => 'designVariant' in task;
export const ProductTaskAllocationView: React.FC<{ kind: 'design' | 'dev' | 'test'; items: ProductAllocationRow[]; designExtras?: DesignAllocationExtra[]; productOptions?: Array<{ label: string; value: string }>; loading: boolean; error: boolean; onRetry: () => void; onOpen: (task: AllocationRow) => void; onCreate: (task: AllocationRow) => void }> = ({ kind, items, designExtras = [], productOptions = [], loading, error, onRetry, onOpen, onCreate }) => {
  const [keyword, setKeyword] = useState('');
  const [allocation, setAllocation] = useState<'待分配' | '已分配'>();
  const [productFilter, setProductFilter] = useState<string>();
  const [allocatedIds, setAllocatedIds] = useState<string[]>([]);
  const rows = useMemo<AllocationRow[]>(() => (kind === 'design' ? items : [...items, ...designExtras]).map((task) => allocatedIds.includes(task.id) ? { ...task, allocated: true } : task), [kind, items, designExtras, allocatedIds]);
  useEffect(() => { const onCreated = (event: Event) => { const detail = (event as CustomEvent<{ parentId?: string; source?: string }>).detail || {}; if (detail.parentId) setAllocatedIds((current) => current.includes(detail.parentId as string) ? current : [...current, detail.parentId as string]); if (detail.source === 'product-task') void onRetry(); }; window.addEventListener('product-task-created', onCreated); return () => window.removeEventListener('product-task-created', onCreated); }, [onRetry]);
  const filteredRows = useMemo(() => rows.filter((task) => (!keyword.trim() || task.title.toLowerCase().includes(keyword.trim().toLowerCase())) && (!productFilter || task.productLineName === productFilter || task.productName === productFilter) && (!allocation || (task.allocated ? '已分配' : '待分配') === allocation)), [rows, keyword, productFilter, allocation, kind]);
  return <section className="space-y-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
  <div className="flex justify-between"><h3 className="text-sm font-bold">待分配任务</h3><Tag>{rows.length} 条</Tag></div>
  <div className="allocation-filters flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
    <div className="allocation-keyword">
      <Input allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题" />
    </div>
    <Select allowClear value={productFilter} onChange={setProductFilter} placeholder="所属产品" className="w-40 min-w-40 flex-[0_0]" options={productOptions} />
    <Select allowClear value={allocation} onChange={setAllocation} placeholder="分配状态" className="w-32 min-w-32 flex-[0_0_8rem]" options={[{ label: '待分配', value: '待分配' }, { label: '已分配', value: '已分配' }]} />
  </div>
  {error ? <div role="alert">待分配任务加载失败<Button onClick={onRetry}>重试</Button></div> : <Table rowKey="id" loading={loading} dataSource={filteredRows} size="small" pagination={{ pageSize: 20, hideOnSinglePage: true }} scroll={{ x: true }} locale={{ emptyText: '暂无待分配任务' }} columns={[
    { title: '标题', key: 'title', render: (_: unknown, task: AllocationRow) => <Button type="link" onClick={() => onOpen(task)} className="max-w-full whitespace-normal text-left"><WorkItemCategoryIcon category={kind === 'design' ? 'design' : 'requirement'} className="mr-2" />{task.title}</Button> },
    { title: '所属产品', key: 'product', render: (_: unknown, task: AllocationRow) => <span>{task.productLineName || task.productName || '未设置'}</span> },
    { title: '所属版本', key: 'version', render: (_: unknown, task: AllocationRow) => <span>{task.versionName || task.versionCode || '未设置'}</span> },
    { title: '产品任务状态', key: 'status', render: (_: unknown, task: AllocationRow) => <Tag>{task.status?.name || task.status || '未设置'}</Tag> },
    { title: '分配状态', key: 'allocation', render: (_: unknown, task: AllocationRow) => <Tag>{task.allocated ? '已分配' : '待分配'}</Tag> },
    { title: '操作', key: 'action', render: (_: unknown, task: AllocationRow) => <Button type="link" onClick={() => onCreate(task)}>分配任务</Button> }
  ]} />}
</section>;
};
