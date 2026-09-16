import React, { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input, Select } from 'antd';
import { Bug, Check, ChevronDown, ChevronRight, Search } from '../common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { productRepository, UnifiedWorkItem } from '../../services/productRepository';
import { WorkItemStatusTag } from './WorkItemStatusTag';

const categoryLabel: Record<string, string> = { test: '测试任务', bug: '缺陷' };

export const TestAndDefectView: React.FC<{ productLineFilter?: string }> = ({ productLineFilter = 'all' }) => {
  const { productLines, addToast } = useApp();
  const [tests, setTests] = useState<UnifiedWorkItem[]>([]);
  const [bugs, setBugs] = useState<UnifiedWorkItem[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [lineFilter, setLineFilter] = useState(productLineFilter);
  const [loading, setLoading] = useState(false);
  useEffect(() => setLineFilter(productLineFilter), [productLineFilter]);
  const lines = useMemo(() => lineFilter === 'all' ? productLines : productLines.filter((line) => line.id === lineFilter), [productLines, lineFilter]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(lines.map(async (line) => {
      const [testResult, bugResult] = await Promise.all([productRepository.workItems(line.id, 'test'), productRepository.workItems(line.id, 'bug')]);
      return { tests: testResult.page?.items || [], bugs: bugResult.page?.items || [] };
    })).then((result) => {
      if (cancelled) return;
      setTests(result.flatMap((item) => item.tests));
      setBugs(result.flatMap((item) => item.bugs));
    }).catch((error) => {
      if (!cancelled) { setTests([]); setBugs([]); addToast('error', '测试与缺陷加载失败', error instanceof Error ? error.message : '请稍后重试'); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lines, addToast]);

  const grouped = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return tests.filter((item) => !term || `${item.title} ${item.code}`.toLowerCase().includes(term)).map((test) => ({ test, bugs: bugs.filter((bug) => bug.parentWorkItemId === test.id || bug.requirementId === test.requirementId).filter((bug) => !term || `${bug.title} ${bug.code}`.toLowerCase().includes(term)) }));
  }, [tests, bugs, keyword]);
  const toggle = (id: string) => setExpanded((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const statusText = (item: UnifiedWorkItem) => item.status?.name || '待处理';

  return <div className="space-y-4 p-6 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-lg font-semibold text-[var(--text-primary)]">测试与缺陷</h1><p className="mt-1 text-[var(--text-muted)]">测试任务作为主任务，测试过程中发现的缺陷在其下展开管理。</p></div><div className="flex items-center gap-2"><Input prefix={<Search className="h-4 w-4" />} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索测试任务或缺陷" className="w-64" /><Select value={lineFilter} onChange={setLineFilter} className="w-44" options={[{ value: 'all', label: '全部产品线' }, ...productLines.map((line) => ({ value: line.id, label: line.name }))]} /></div></div>
    <div className="grid grid-cols-3 gap-3"><div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4"><div className="text-[var(--text-muted)]">测试主任务</div><div className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{tests.length}</div></div><div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4"><div className="text-[var(--text-muted)]">关联缺陷</div><div className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{bugs.length}</div></div><div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4"><div className="text-[var(--text-muted)]">未关闭缺陷</div><div className="mt-2 text-xl font-semibold text-[var(--danger)]">{bugs.filter((item) => !item.status?.successful).length}</div></div></div>
    <div className="overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]"><div className="grid grid-cols-[36px_minmax(260px,1fr)_120px_140px_160px_110px] gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-3 font-medium text-[var(--text-muted)]"><span /><span>测试主任务</span><span>状态</span><span>负责人</span><span>需求</span><span>缺陷</span></div>{loading ? <div className="px-4 py-12 text-center text-[var(--text-muted)]">正在加载测试任务...</div> : grouped.length ? grouped.map(({ test, bugs: childBugs }) => { const isOpen = expanded.includes(test.id); return <React.Fragment key={test.id}><div className="grid grid-cols-[36px_minmax(260px,1fr)_120px_140px_160px_110px] items-center gap-3 border-b border-[var(--border-main)] px-4 py-3 hover:bg-[var(--bg-surface-soft)]"><Button type="text" size="small" aria-label={`${isOpen ? '收起' : '展开'}${test.title}`} icon={isOpen ? <ChevronDown /> : <ChevronRight />} onClick={() => toggle(test.id)} /><div className="min-w-0"><div className="flex items-center gap-2 truncate font-medium text-[var(--text-primary)]"><Check className="h-4 w-4 text-[var(--success)]" />{test.title}</div><div className="mt-1 text-[11px] text-[var(--text-muted)]">{test.code} · 测试主任务</div></div><WorkItemStatusTag name={statusText(test)} color={test.statusColor} /><span className="truncate text-[var(--text-body)]">{test.assigneeName || '未分配'}</span><span className="truncate text-[var(--text-muted)]">{test.requirementId || '未关联'}</span><Badge count={childBugs.length} showZero color="var(--danger)" /></div>{isOpen && childBugs.map((bug) => <div key={bug.id} className="grid grid-cols-[36px_minmax(260px,1fr)_120px_140px_160px_110px] items-center gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-2.5"><span /><div className="flex min-w-0 items-center gap-2 pl-6"><Bug className="h-4 w-4 text-[var(--danger)]" /><span className="truncate text-[var(--text-primary)]">{bug.title}</span><span className="text-[11px] text-[var(--text-muted)]">{bug.code}</span></div><WorkItemStatusTag name={statusText(bug)} color={bug.statusColor} /><span className="truncate text-[var(--text-body)]">{bug.assigneeName || '未分配'}</span><span className="truncate text-[var(--text-muted)]">{bug.priority || '普通'}</span><span className="text-[var(--text-muted)]">缺陷子任务</span></div>)}</React.Fragment>; }) : <div className="px-4 py-12 text-center text-[var(--text-muted)]">暂无测试主任务。需求评审通过并成功下发测试任务后，将在这里显示。</div>}</div>
  </div>;
};
