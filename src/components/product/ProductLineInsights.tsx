import React, { useState } from 'react';
import { Button, Drawer, Table } from 'antd';
import Card from 'antd/es/card/Card';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { productRepository, type UnifiedWorkItem, type WorkItemCategoryKey } from '../../services/productRepository';
import type { VersionIteration } from '../../types';
import { WorkItemCategoryIcon } from './WorkItemCategoryIcon';
import { DAY, taskPlan } from './iterationTimeline';

type BoardCategoryKey = 'assistance' | 'requirement' | 'design' | 'dev' | 'test' | 'bug';
const categories: Array<{ key: BoardCategoryKey; label: string }> = [
  { key: 'assistance', label: '协同事项' },
  { key: 'requirement', label: '产品任务' },
  { key: 'design', label: '设计任务' },
  { key: 'dev', label: '研发任务' },
  { key: 'test', label: '测试任务' },
  { key: 'bug', label: '缺陷任务' }
];
const hoursCategories: Array<{ key: WorkItemCategoryKey; label: string }> = [
  { key: 'requirement', label: '产品任务' },
  { key: 'design', label: '设计任务' },
  { key: 'dev', label: '研发任务' },
  { key: 'test', label: '测试任务' },
  { key: 'bug', label: '缺陷任务' },
  { key: 'case', label: '测试用例' }
];
const statusColumns = [
  { key: 'NOT_STARTED', label: '待处理' },
  { key: 'IN_PROGRESS', label: '处理中' },
  { key: 'COMPLETED', label: '已完成' }
] as const;
const chartColors = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--active-text)', 'var(--text-muted)'];

async function loadAllWorkItems(productLineId: string): Promise<UnifiedWorkItem[]> {
  const first = await productRepository.workItems(productLineId, '', '', { page: 1, pageSize: 100 });
  const pages = Math.ceil(first.page.total / 100);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
    productRepository.workItems(productLineId, '', '', { page: index + 2, pageSize: 100 })));
  return [first, ...rest].flatMap((result) => result.page.items);
}

export function useProductLineWorkItems(productLineId: string) {
  return useQuery({
    queryKey: ['product-line-insights', productLineId],
    queryFn: () => loadAllWorkItems(productLineId),
    enabled: Boolean(productLineId),
    retry: false
  });
}

export const ProductLineBoard: React.FC<{
  items: UnifiedWorkItem[];
  versions?: VersionIteration[];
  onOpenCategory?: (category: Exclude<WorkItemCategoryKey, 'case'>) => void;
  onOpenItem?: (item: UnifiedWorkItem) => void;
}> = ({ items, versions = [], onOpenItem }) => {
  const [category, setCategory] = useState<BoardCategoryKey>('requirement');
  const itemsForCategory = (key: BoardCategoryKey) => items.filter((item) => key === 'assistance'
    ? item.category === 'requirement' && item.sourceType === 'WORK_ORDER'
    : item.category === key && (key !== 'requirement' || item.sourceType !== 'WORK_ORDER'));
  const scoped = itemsForCategory(category);
  const unclassified = scoped.filter((item) => !statusColumns.some((column) => column.key === item.status?.group)).length;
  const versionCode = (versionId?: string | null) => {
    if (!versionId) return '未关联版本';
    const version = versions.find((item) => item.id === versionId);
    return version?.code || '版本已归档';
  };

  return <div className="product-line-board grid h-full min-h-0 min-w-0 gap-4 md:grid-cols-[148px_minmax(0,1fr)]">
    <nav aria-label="工作项类型" className="space-y-1 border-r border-[var(--border-main)] pr-3">
      {categories.map((option) => <button key={option.key} type="button" onClick={() => setCategory(option.key)} aria-current={category === option.key ? 'true' : undefined}
        className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${category === option.key ? 'bg-[var(--primary)]/10 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]'}`}>
        <span>{option.label}</span><span className="font-mono">{itemsForCategory(option.key).length}</span>
      </button>)}
    </nav>
    <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
      {unclassified > 0 && <p className="mb-3 text-xs text-[var(--text-muted)]">另有 {unclassified} 条已取消或状态未归类的工作项，不计入三列。</p>}
      <div className="grid min-h-0 min-w-0 gap-3 lg:grid-cols-3 lg:auto-rows-fr">
        {statusColumns.map((column) => {
          const columnItems = scoped.filter((item) => item.status?.group === column.key);
          return <section key={column.key} aria-label={column.label} className="min-w-0">
            <Card size="small" title={<span className="flex items-center justify-between text-xs font-semibold"><span>{column.label}</span><span className="font-mono text-[var(--active-text)]">{columnItems.length}</span></span>} className="product-line-board-status-card h-full">
              <div className="space-y-2">{columnItems.map((item) => <div key={`${item.category}-${item.id}`} className="border-b border-[var(--border-main)] pb-3 text-xs last:border-b-0 last:pb-0">
                <button type="button" onClick={() => onOpenItem?.(item)} className="flex w-full items-start gap-2 text-left font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]"><span aria-hidden="true" className="mt-0.5 shrink-0"><WorkItemCategoryIcon category={item.sourceType === 'WORK_ORDER' ? 'assistance' : item.category} /></span><span className="break-words">{item.title}</span></button>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
                  <span className="truncate" title={versionCode(item.versionId)}>{versionCode(item.versionId)}</span>
                  <span className="truncate text-right" title={item.status?.name || '状态未设置'}>{item.status?.name || '状态未设置'}</span>
                  <span className="truncate" title={item.assigneeName || '未分配'}>{item.assigneeName || '未分配'}</span>
                  <span className="text-right">{Number(item.estimatedHours || 0)} 小时</span>
                </div>
              </div>)}
                {columnItems.length === 0 && <p className="py-8 text-center text-xs text-[var(--text-muted)]">暂无工作项</p>}
              </div>
            </Card>
          </section>;
        })}
      </div>
    </div>
  </div>;
};

export const ProductLineHours: React.FC<{ items: UnifiedWorkItem[]; memberCount: number }> = ({ items, memberCount }) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const estimated = items.reduce((sum, item) => sum + Number(item.estimatedHours || 0), 0);
  const actual = items.reduce((sum, item) => sum + Number(item.actualHours || 0), 0);
  const recorded = items.filter((item) => Number(item.actualHours || 0) > 0);
  const people = Array.from(recorded.reduce((map, item) => {
    const name = item.assigneeName || '未分配';
    map.set(name, (map.get(name) || 0) + Number(item.actualHours || 0));
    return map;
  }, new Map<string, number>())).map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours);
  const distribution = hoursCategories.map((option, index) => ({
    name: option.label,
    hours: recorded.filter((item) => item.category === option.key).reduce((sum, item) => sum + Number(item.actualHours || 0), 0),
    color: chartColors[index]
  })).filter((item) => item.hours > 0);
  const weeklyPlan = Array.from(items.reduce((weeks, item) => {
    const plan = taskPlan(item);
    const hours = Number(item.estimatedHours || 0);
    if (!plan || hours <= 0) return weeks;
    const dailyHours = hours / ((plan.end - plan.start) / DAY + 1);
    for (let date = plan.start; date <= plan.end; date += DAY) {
      const day = new Date(date).getUTCDay();
      const monday = date - ((day + 6) % 7) * DAY;
      weeks.set(monday, (weeks.get(monday) || 0) + dailyHours);
    }
    return weeks;
  }, new Map<number, number>()).entries()).sort(([a], [b]) => a - b).map(([date, hours]) => ({ date: new Date(date).toISOString().slice(0, 10), hours: Number(hours.toFixed(2)) }));
  const metrics = [
    { label: '预计工时', value: `${estimated} 小时` },
    { label: '实际工时', value: `${actual} 小时` },
    { label: '预计剩余工时', value: `${Math.max(0, estimated - actual)} 小时` },
    { label: '预计偏差', value: `${estimated - actual} 小时` },
    { label: '有工时/成员', value: `${people.filter((person) => person.name !== '未分配').length} / ${memberCount} 人` },
    { label: '有工时/工作项', value: `${recorded.length} / ${items.length} 个` }
  ];

  return <div className="space-y-4">
    <section className="border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
      <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold text-[var(--text-primary)]">工时概览</h3><Button type="link" size="small" onClick={() => setDetailsOpen(true)}>查看明细</Button></div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">{metrics.map((metric) => <div key={metric.label} className="border-l border-[var(--border-main)] pl-3 first:border-l-0 first:pl-0"><div className="text-lg font-bold tabular-nums text-[var(--text-primary)]">{metric.value}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{metric.label}</div></div>)}</div>
      <p className="mt-4 text-[11px] text-[var(--text-muted)]">实际工时按工作项累计值统计；人员归属按当前负责人计算，未分配工作项单列。</p>
    </section>
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="min-w-0 border border-[var(--border-main)] bg-[var(--bg-surface)] p-4"><h3 className="text-sm font-bold text-[var(--text-primary)]">工时投入排名</h3>
        {people.length ? <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={people} layout="vertical" margin={{ left: 8, right: 24 }}><CartesianGrid stroke="var(--border-main)" horizontal={false} /><XAxis type="number" stroke="var(--text-muted)" /><YAxis type="category" dataKey="name" width={72} stroke="var(--text-muted)" /><Tooltip /><Bar dataKey="hours" name="实际工时（小时）" fill="var(--primary)" /></BarChart></ResponsiveContainer></div> : <div className="py-16 text-center text-xs text-[var(--text-muted)]">暂无实际工时</div>}
      </section>
      <section className="min-w-0 border border-[var(--border-main)] bg-[var(--bg-surface)] p-4"><h3 className="text-sm font-bold text-[var(--text-primary)]">工时按类别分布</h3>
        {distribution.length ? <div className="mt-4 flex flex-wrap items-center justify-center gap-4"><div className="h-56 w-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="hours" nameKey="name" innerRadius={62} outerRadius={96} stroke="var(--bg-surface)">{distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="space-y-2 text-xs">{distribution.map((entry) => <div key={entry.name} className="flex items-center gap-2"><span className="h-2 w-2" style={{ backgroundColor: entry.color }} />{entry.name} {entry.hours} 小时 ({Math.round(entry.hours / actual * 100)}%)</div>)}</div></div> : <div className="py-16 text-center text-xs text-[var(--text-muted)]">暂无类别工时</div>}
      </section>
    </div>
    <section className="border border-[var(--border-main)] bg-[var(--bg-surface)] p-4"><h3 className="text-sm font-bold text-[var(--text-primary)]">工时时间分布</h3>
      {weeklyPlan.length ? <div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={weeklyPlan} margin={{ left: 8, right: 16, bottom: 8 }}><CartesianGrid stroke="var(--border-main)" vertical={false} /><XAxis dataKey="date" stroke="var(--text-muted)" tickFormatter={(value: string) => value.slice(5)} /><YAxis stroke="var(--text-muted)" /><Tooltip formatter={(value) => [`${Number(value).toFixed(2)} 小时`, '计划工时']} labelFormatter={(value) => `当周 ${value}`} /><Bar dataKey="hours" name="计划工时" fill="var(--primary)" /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-xs text-[var(--text-muted)]">暂无同时设置计划起止日期和预计工时的工作项</p>}
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">按计划起止日期逐日均摊预计工时，再按周汇总；实际工时仅有累计值，未登记发生日期，不计入此图。</p>
    </section>
    <Drawer title="工作项工时明细" open={detailsOpen} onClose={() => setDetailsOpen(false)} width={720}>
      <Table rowKey={(item) => `${item.category}-${item.id}`} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 620 }} dataSource={items} columns={[
        { title: '工作项', dataIndex: 'title', ellipsis: true },
        { title: '类型', dataIndex: 'category', width: 90, render: (value: WorkItemCategoryKey) => hoursCategories.find((item) => item.key === value)?.label || value },
        { title: '负责人', dataIndex: 'assigneeName', width: 100, render: (value: string) => value || '未分配' },
        { title: '预计', dataIndex: 'estimatedHours', width: 70, render: (value: number) => `${Number(value || 0)}h` },
        { title: '实际', dataIndex: 'actualHours', width: 70, render: (value: number) => `${Number(value || 0)}h` }
      ]} />
    </Drawer>
  </div>;
};
