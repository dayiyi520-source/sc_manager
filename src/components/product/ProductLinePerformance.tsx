import React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { UnifiedWorkItem } from '../../services/productRepository';

const palette = ['var(--primary)', 'var(--active-text)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--text-muted)'];
const labelFor = (category: string) => ({ requirement: '产品任务', design: '设计任务', dev: '研发任务', test: '测试任务', bug: '缺陷任务' }[category] || category);

const monthLabel = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? '未知' : `${date.getMonth() + 1}月`;
};

export const ProductLinePerformance: React.FC<{ items: UnifiedWorkItem[] }> = ({ items }) => {
  const completed = items.filter((item) => item.status?.successful || item.status?.group === 'COMPLETED');
  const bugs = items.filter((item) => item.category === 'bug');
  const requirements = items.filter((item) => item.category === 'requirement' && item.sourceType !== 'WORK_ORDER');
  const activeBugs = bugs.filter((item) => !(item.status?.successful || item.status?.group === 'COMPLETED'));
  const monthKeys = Array.from(new Set(items.map((item) => monthLabel(item.createdAt)))).filter((month) => month !== '未知').slice(-6);
  const trendData = (monthKeys.length ? monthKeys : ['本期']).map((month) => {
    const monthItems = items.filter((item) => monthLabel(item.createdAt) === month);
    return { month, requirements: monthItems.filter((item) => item.category === 'requirement' && item.sourceType !== 'WORK_ORDER').length, bugs: monthItems.filter((item) => item.category === 'bug').length, completed: monthItems.filter((item) => item.status?.successful || item.status?.group === 'COMPLETED').length };
  });
  const distribution = ['requirement', 'design', 'dev', 'test', 'bug'].map((category, index) => ({ name: labelFor(category), value: items.filter((item) => item.category === category).length, color: palette[index] })).filter((item) => item.value > 0);
  const flowData = trendData.map((point, index) => ({ ...point, backlog: Math.max(0, requirements.length - trendData.slice(index + 1).reduce((sum, item) => sum + item.completed, 0)) }));
  const metrics = [
    { label: '任务总量', value: requirements.length, tone: 'text-[var(--active-text)]' },
    { label: '已交付任务', value: requirements.filter((item) => item.status?.successful || item.status?.group === 'COMPLETED').length, tone: 'text-[var(--success)]' },
    { label: '缺陷总量', value: bugs.length, tone: 'text-[var(--danger)]' },
    { label: '存量缺陷', value: activeBugs.length, tone: 'text-[var(--warning)]' },
    { label: '工作项总量', value: items.length, tone: 'text-[var(--text-primary)]' },
    { label: '完成率', value: `${items.length ? Math.round(completed.length / items.length * 100) : 0}%`, tone: 'text-[var(--success)]' }
  ];
  const chart = (title: string, body: React.ReactNode) => <section className="min-w-0 border border-[var(--border-main)] bg-[var(--bg-surface)] p-4"><h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3><div className="mt-3 h-52">{body}</div></section>;
  return <div className="space-y-4">
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{metrics.map((metric) => <div key={metric.label} className="border border-[var(--border-main)] bg-[var(--bg-surface)] p-3"><div className={`text-xl font-bold tabular-nums ${metric.tone}`}>{metric.value}</div><div className="mt-2 text-xs text-[var(--text-muted)]">{metric.label}</div></div>)}</section>
    <div className="grid gap-4 xl:grid-cols-2">
      {chart('任务现状概览', <div className="flex h-full items-center justify-center gap-10"><div className="text-center"><div className="text-4xl font-bold text-[var(--active-text)]">{requirements.length}</div><div className="mt-2 text-xs text-[var(--text-muted)]">任务总数</div></div><div className="space-y-2 text-xs text-[var(--text-body)]"><div>已交付 <b className="text-[var(--success)]">{metrics[1].value}</b></div><div>进行中 <b className="text-[var(--warning)]">{Math.max(0, requirements.length - Number(metrics[1].value))}</b></div></div></div>)}
      {chart('缺陷现状概览', <div className="flex h-full items-center justify-center gap-8"><div className="text-center"><div className="text-4xl font-bold text-[var(--danger)]">{bugs.length}</div><div className="mt-2 text-xs text-[var(--text-muted)]">缺陷总数</div></div><div className="space-y-2 text-xs text-[var(--text-body)]"><div>存量缺陷 <b className="text-[var(--warning)]">{activeBugs.length}</b></div><div>已修复 <b className="text-[var(--success)]">{bugs.length - activeBugs.length}</b></div></div></div>)}
      {chart('任务趋势', <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Area type="monotone" dataKey="requirements" name="新增任务" stroke="var(--active-text)" fill="var(--active-text)" fillOpacity={0.15} /></AreaChart></ResponsiveContainer>)}
      {chart('缺陷趋势', <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Area type="monotone" dataKey="bugs" name="新增缺陷" stroke="var(--danger)" fill="var(--danger)" fillOpacity={0.15} /></AreaChart></ResponsiveContainer>)}
      {chart('工作项累积流图', <ResponsiveContainer width="100%" height="100%"><AreaChart data={flowData}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Area type="monotone" dataKey="backlog" name="待完成存量" stroke="var(--warning)" fill="var(--warning)" fillOpacity={0.18} /></AreaChart></ResponsiveContainer>)}
      {chart('存量缺陷占比', distribution.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[{ name: '存量缺陷', value: activeBugs.length, color: 'var(--danger)' }, { name: '已修复', value: Math.max(0, bugs.length - activeBugs.length), color: 'var(--success)' }]} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} stroke="var(--bg-surface)">{[{ color: 'var(--danger)' }, { color: 'var(--success)' }].map((item, index) => <Cell key={index} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">暂无缺陷数据</div>)}
      {chart('任务交付分布', <ResponsiveContainer width="100%" height="100%"><BarChart data={trendData}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Bar dataKey="completed" name="已完成工作项" fill="var(--success)" /></BarChart></ResponsiveContainer>)}
      {chart('缺陷修复分布', <ResponsiveContainer width="100%" height="100%"><BarChart data={trendData}><CartesianGrid stroke="var(--border-main)" strokeDasharray="3 3" /><XAxis dataKey="month" stroke="var(--text-muted)" /><YAxis allowDecimals={false} stroke="var(--text-muted)" /><Tooltip /><Bar dataKey="bugs" name="缺陷工作项" fill="var(--danger)" /></BarChart></ResponsiveContainer>)}
      {chart('任务交付速率', <div className="flex h-full items-center justify-center"><div className="text-center"><div className="text-4xl font-bold text-[var(--success)]">{requirements.length ? `${Math.round(metrics[1].value as number / Math.max(1, trendData.length))}/期` : '0/期'}</div><div className="mt-2 text-xs text-[var(--text-muted)]">平均交付速率</div></div></div>)}
      {chart('缺陷修复速率', <div className="flex h-full items-center justify-center"><div className="text-center"><div className="text-4xl font-bold text-[var(--danger)]">{bugs.length ? `${Math.round((bugs.length - activeBugs.length) / Math.max(1, trendData.length))}/期` : '0/期'}</div><div className="mt-2 text-xs text-[var(--text-muted)]">平均修复速率</div></div></div>)}
    </div>
  </div>;
};
