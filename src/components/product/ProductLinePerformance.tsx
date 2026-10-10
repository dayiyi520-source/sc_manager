import React, { useMemo, useState } from 'react';
import { Select } from 'antd';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { UnifiedWorkItem } from '../../services/productRepository';

const TASK_CATEGORIES = ['requirement', 'design', 'dev', 'test'] as const;
type TaskCategory = typeof TASK_CATEGORIES[number];
type DefectDimension = 'status' | 'priority';
const categoryLabels: Record<TaskCategory | 'bug', string> = { requirement: '产品', design: '设计', dev: '研发', test: '测试', bug: '缺陷' };
const chartColors = { new: 'var(--primary)', done: 'var(--success)', stock: 'var(--warning)', inProgress: 'var(--active-text)', overdue: 'var(--danger)' };
const isTerminal = (item: UnifiedWorkItem) => item.status?.group === 'COMPLETED' || item.status?.group === 'CANCELLED';
const isCompleted = (item: UnifiedWorkItem) => Boolean(item.status?.successful || item.status?.group === 'COMPLETED');
const isTask = (item: UnifiedWorkItem): item is UnifiedWorkItem & { category: TaskCategory } => TASK_CATEGORIES.includes(item.category as TaskCategory) && item.sourceType !== 'WORK_ORDER' && !item.parentWorkItemId;
const isDefect = (item: UnifiedWorkItem) => item.category === 'bug' && !item.parentWorkItemId;
const isStock = (item: UnifiedWorkItem) => !isTerminal(item);
const dateKey = (value?: string | null) => value ? value.slice(0, 10) : '';
const parseDate = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T00:00:00`) : null;
const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const daysBetween = (from: Date, to: Date) => Math.max(0, Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000));
const formatDay = (value: Date) => `${value.getMonth() + 1}/${value.getDate()}`;

const StatCard: React.FC<{ label: string; value: React.ReactNode; tone?: string }> = ({ label, value, tone = 'text-[var(--text-primary)]' }) => <div className="border border-[var(--border-main)] bg-[var(--bg-surface)] p-3"><div className={`text-xl font-bold tabular-nums ${tone}`}>{value}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{label}</div></div>;
const ChartPanel: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => <section className="min-w-0 border border-[var(--border-main)] bg-[var(--bg-surface)] p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>{action}</div><div className="mt-3 h-64">{children}</div></section>;

export const ProductLinePerformance: React.FC<{ items: UnifiedWorkItem[]; dateRange?: [string, string] | null }> = ({ items, dateRange }) => {
  const [selectedTaskCategory, setSelectedTaskCategory] = useState<TaskCategory | 'all'>('all');
  const [trendTaskCategory, setTrendTaskCategory] = useState<TaskCategory | 'all'>('all');
  const [defectDimension, setDefectDimension] = useState<DefectDimension>('status');
  const taskItems = useMemo(() => items.filter(isTask), [items]);
  const defectItems = useMemo(() => items.filter(isDefect), [items]);
  const stockTasks = taskItems.filter(isStock);
  const stockDefects = defectItems.filter(isStock);
  const overdue = (item: UnifiedWorkItem) => { const due = parseDate(item.expectedCompleteDate || item.dueDate); return Boolean(due && due < startOfDay(new Date()) && isStock(item)); };
  const completionRate = taskItems.length ? Math.round(taskItems.filter(isCompleted).length / taskItems.length * 100) : 0;
  const trendTasks = trendTaskCategory === 'all' ? taskItems : taskItems.filter((item) => item.category === trendTaskCategory);
  const metrics = [
    { label: '任务总数', value: taskItems.length, tone: 'text-[var(--active-text)]' },
    { label: '存量任务', value: stockTasks.length, tone: 'text-[var(--warning)]' },
    { label: '逾期任务', value: stockTasks.filter(overdue).length, tone: 'text-[var(--danger)]' },
    { label: '缺陷总数', value: defectItems.length, tone: 'text-[var(--danger)]' },
    { label: '存量缺陷', value: stockDefects.length, tone: 'text-[var(--warning)]' },
    { label: '逾期缺陷', value: stockDefects.filter(overdue).length, tone: 'text-[var(--danger)]' },
    { label: '完成率', value: `${completionRate}%`, tone: 'text-[var(--success)]' }
  ];
  const taskStockByCategory = TASK_CATEGORIES.map((category) => ({ name: categoryLabels[category], value: stockTasks.filter((item) => item.category === category).length, category }));
  const selectedStockTasks = selectedTaskCategory === 'all' ? stockTasks : stockTasks.filter((item) => item.category === selectedTaskCategory);
  const statusData = [{ name: '待处理', value: selectedStockTasks.filter((item) => item.status?.group === 'NOT_STARTED').length }, { name: '处理中', value: selectedStockTasks.filter((item) => item.status?.group === 'IN_PROGRESS').length }];
  const defectDistribution = useMemo(() => {
    const getValue = (item: UnifiedWorkItem) => defectDimension === 'status' ? (item.status?.name || '未设置') : (item.priority || '未设置');
    const counts = new Map<string, number>();
    stockDefects.forEach((item) => { const value = getValue(item); counts.set(value, (counts.get(value) || 0) + 1); });
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [defectDimension, stockDefects]);
  const trendData = useMemo(() => {
    const today = startOfDay(new Date());
    const end = dateRange ? parseDate(dateRange[1])! : today;
    const start = dateRange ? parseDate(dateRange[0])! : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    const length = daysBetween(start, end) + 1;
    return Array.from({ length }, (_, index) => {
      const day = new Date(start); day.setDate(start.getDate() + index);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const stockAt = (scope: UnifiedWorkItem[]) => scope.filter((item) => { const created = parseDate(item.createdAt); const completedAt = parseDate(item.completedAt); return Boolean(created && created <= day && (!completedAt || completedAt > day) && item.status?.group !== 'CANCELLED'); }).length;
      return { day: formatDay(day), newItems: trendTasks.filter((item) => dateKey(item.createdAt) === key).length, completed: trendTasks.filter((item) => dateKey(item.completedAt) === key && isCompleted(item)).length, stock: stockAt(trendTasks), defectsNew: defectItems.filter((item) => dateKey(item.createdAt) === key).length, defectsFixed: defectItems.filter((item) => dateKey(item.completedAt) === key && isCompleted(item)).length, defectsStock: stockAt(defectItems) };
    });
  }, [defectItems, trendTasks, dateRange]);
  const speedData = useMemo(() => {
    const buckets = [{ name: '1周内', min: 0, max: 7 }, { name: '1-2周', min: 7, max: 14 }, { name: '2-4周', min: 14, max: 28 }, { name: '4周以上', min: 28, max: Infinity }];
    const count = (scope: UnifiedWorkItem[]) => buckets.map(({ name, min, max }) => ({ name, value: scope.filter((item) => { const created = parseDate(item.createdAt); const completed = parseDate(item.completedAt); return isCompleted(item) && created && completed && daysBetween(created, completed) >= min && daysBetween(created, completed) < max; }).length }));
    return { tasks: count(taskItems), defects: count(defectItems) };
  }, [defectItems, taskItems]);
  const trendAction = <Select size="small" value={trendTaskCategory} onChange={setTrendTaskCategory} options={[{ value: 'all', label: '全部任务' }, ...TASK_CATEGORIES.map((category) => ({ value: category, label: categoryLabels[category] }))]} />;
  const distributionAction = <Select size="small" value={defectDimension} onChange={setDefectDimension} options={[{ value: 'status', label: '按状态' }, { value: 'priority', label: '按优先级' }]} />;
  const selectTaskCategory = (entry: { category?: TaskCategory; payload?: { category?: TaskCategory } } | null | undefined, index?: number) => {
    const category = entry?.category || entry?.payload?.category || (typeof index === 'number' ? taskStockByCategory[index]?.category : undefined);
    if (category) setSelectedTaskCategory(category);
  };
  return <div className="space-y-4">
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{metrics.map((metric) => <StatCard key={metric.label} {...metric} />)}</section>
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="存量任务概述"><div className="grid h-full gap-4 md:grid-cols-2"><div><div className="mb-2 text-xs text-[var(--text-muted)]">点击类型查看右侧状态</div><ResponsiveContainer width="100%" height="88%"><PieChart><Pie data={taskStockByCategory} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius="68%" onClick={selectTaskCategory} cursor="pointer"><Cell key="requirement" fill="var(--active-text)" /><Cell key="design" fill="var(--primary)" /><Cell key="dev" fill="var(--warning)" /><Cell key="test" fill="var(--success)" /></Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div><div><div className="mb-2 text-xs text-[var(--text-muted)]">{selectedTaskCategory === 'all' ? '全部任务' : categoryLabels[selectedTaskCategory]}：待处理 / 处理中</div><ResponsiveContainer width="100%" height="88%"><BarChart data={statusData}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="name" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Bar dataKey="value" name="数量" fill={chartColors.inProgress} /></BarChart></ResponsiveContainer></div></div></ChartPanel>
      <ChartPanel title="存量缺陷分布" action={distributionAction}><ResponsiveContainer width="100%" height="100%"><BarChart data={defectDistribution}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="name" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Bar dataKey="value" name="存量缺陷" fill={chartColors.overdue} /></BarChart></ResponsiveContainer></ChartPanel>
      <ChartPanel title="任务趋势" action={trendAction}><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Legend /><Line type="monotone" dataKey="newItems" name="新增" stroke={chartColors.new} strokeWidth={2} /><Line type="monotone" dataKey="completed" name="完成" stroke={chartColors.done} strokeWidth={2} /><Line type="monotone" dataKey="stock" name="存量" stroke={chartColors.stock} strokeWidth={2} /></LineChart></ResponsiveContainer></ChartPanel>
      <ChartPanel title="缺陷趋势"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Legend /><Line type="monotone" dataKey="defectsNew" name="新增" stroke={chartColors.overdue} strokeWidth={2} /><Line type="monotone" dataKey="defectsFixed" name="修复" stroke={chartColors.done} strokeWidth={2} /><Line type="monotone" dataKey="defectsStock" name="存量" stroke={chartColors.stock} strokeWidth={2} /></LineChart></ResponsiveContainer></ChartPanel>
      <ChartPanel title="任务交付速率"><div className="mb-2 text-xs text-[var(--text-muted)]">已完成任务按创建到完成的周期统计</div><ResponsiveContainer width="100%" height="88%"><BarChart data={speedData.tasks}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="name" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Bar dataKey="value" name="数量" fill={chartColors.new} /></BarChart></ResponsiveContainer></ChartPanel>
      <ChartPanel title="缺陷修复速率"><div className="mb-2 text-xs text-[var(--text-muted)]">已修复缺陷按创建到完成的周期统计</div><ResponsiveContainer width="100%" height="88%"><BarChart data={speedData.defects}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="name" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Bar dataKey="value" name="数量" fill={chartColors.overdue} /></BarChart></ResponsiveContainer></ChartPanel>
    </div>
  </div>;
};
