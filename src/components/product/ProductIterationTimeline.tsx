import React, { useState } from 'react';
import { Button, Empty, Spin } from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { productRepository, type UnifiedWorkItem } from '../../services/productRepository';
import type { VersionIteration } from '../../types';
import { WorkItemCategoryIcon } from './WorkItemCategoryIcon';
import { DAY, dateLabel, interval, productTaskItems, riskFor, stagesFor, taskPlan, timelineStages, versionGroup, type Interval } from './iterationTimeline';

type Row = {
  id: string; title: string; code?: string; owner?: string; status?: string; plan: Interval | null;
  stages: ReturnType<typeof stagesFor>; risk: ReturnType<typeof riskFor>; versionId: string;
  kind: 'version' | 'group' | 'task'; count?: number; category?: string;
};

export function ProductIterationTimeline({ productLineId, versions, onOpenVersion, onOpenItem }: {
  productLineId: string; versions: VersionIteration[]; onOpenVersion: (id: string) => void; onOpenItem?: (item: UnifiedWorkItem) => void;
}) {
  const [view, setView] = useState<'version' | 'task'>('version');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const query = useQuery({ queryKey: ['product-iteration-timeline', productLineId], queryFn: () => productRepository.iterationTimeline(productLineId), retry: false });
  const localNow = new Date();
  const today = Date.UTC(localNow.getFullYear(), localNow.getMonth(), localNow.getDate());
  const items = query.data || [];
  const roots = items.filter((item) => ['requirement', 'design', 'dev', 'test'].includes(item.category) && !item.parentWorkItemId && item.sourceType !== 'WORK_ORDER');
  const rows: Row[] = [];
  const versionRow = (version: VersionIteration, kind: Row['kind']): Row => {
    const tasks = roots.filter((item) => item.versionId === version.id);
    const linked = new Map<string, UnifiedWorkItem>();
    items.filter((item) => item.versionId === version.id).forEach((item) => linked.set(item.id, item));
    tasks.forEach((root) => productTaskItems(root, items).forEach((item) => linked.set(item.id, item)));
    const stages = stagesFor([...linked.values()]);
    const plan = interval(version.startDate, version.endDate);
    return { id: version.id, title: version.name, code: version.code, status: version.status, plan, stages,
      risk: riskFor(plan, versionGroup(version), version.releaseDate, stages.stages, today), versionId: version.id, kind, count: tasks.length };
  };
  for (const version of versions) {
    rows.push(versionRow(version, view === 'version' ? 'version' : 'group'));
    if (view === 'task' && !collapsed.has(version.id)) {
      for (const task of roots.filter((item) => item.versionId === version.id)) {
        const stages = stagesFor(productTaskItems(task, items));
        const plan = taskPlan(task);
        rows.push({ id: task.id, title: task.title, owner: task.assigneeName || '未分配', status: task.status?.name || '状态未设置', plan,
          stages, risk: riskFor(plan, task.status?.group, task.completedAt, stages.stages, today), versionId: version.id, kind: 'task', category: task.category });
      }
    }
  }
  const bounds = [today, ...rows.flatMap((row) => [row.plan, ...row.stages.stages, row.risk.tail].filter((p): p is Interval => p !== null).flatMap((p) => [p.start, p.end]))];
  const earliest = Math.min(...bounds), latest = Math.max(...bounds);
  const start = earliest - ((new Date(earliest).getUTCDay() + 6) % 7) * DAY;
  const weeks = Math.max(6, Math.ceil((latest - start + DAY) / (7 * DAY)) + 1);
  const span = weeks * 7 * DAY;
  const position = (p: Interval) => ({ left: `${(p.start - start) / span * 100}%`, width: `${(p.end + DAY - p.start) / span * 100}%` });
  const missingWithoutDates = (row: Row) => timelineStages.filter((stage) => !row.stages.stages.some((known) => known.name === stage.name));
  const height = (row: Row) => row.kind === 'group' ? 64 : Math.max(112, (row.stages.lanes + missingWithoutDates(row).length) * 32 + 48);
  const toggle = (id: string) => setCollapsed((old) => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const versionTitle = (row: Row) => `${row.title}：${row.code || '未设置版本号'}`;

  return <section className="iteration-timeline" aria-label="产品迭代甘特图">
    <div className="iteration-view-tabs" role="tablist" aria-label="甘特图视角">
      {(['version', 'task'] as const).map((value) => <button type="button" role="tab" aria-selected={view === value} key={value} onClick={() => setView(value)}>{value === 'version' ? '版本视角' : '任务视角'}</button>)}
    </div>
    {query.isPending ? <div className="iteration-feedback"><Spin size="small" /> 正在加载迭代排期...</div>
      : query.isError ? <div className="iteration-feedback iteration-risk-danger">迭代排期加载失败 <Button size="small" onClick={() => query.refetch()}>重试</Button></div>
      : !versions.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无版本迭代记录" />
      : <>
        <div className="iteration-grid">
          <div className="iteration-labels">
            <div className="iteration-heading">{view === 'version' ? '版本名称：版本号' : '任务 / 所属版本'}</div>
            {rows.map((row) => <div key={row.id} className={`iteration-label iteration-${row.kind}`} style={{ height: height(row) }}>
              <div className="iteration-title-line">
                {row.kind === 'group' && <button type="button" className="iteration-collapse" aria-label={`${collapsed.has(row.id) ? '展开' : '收起'} ${row.code || row.title}`} aria-expanded={!collapsed.has(row.id)} onClick={() => toggle(row.id)}>{collapsed.has(row.id) ? <RightOutlined /> : <DownOutlined />}</button>}
                {row.kind === 'task' ? <button type="button" className="iteration-task-title" onClick={() => { const item = items.find((candidate) => candidate.id === row.id); if (item) onOpenItem?.(item); }} title={row.title}><span aria-hidden="true"><WorkItemCategoryIcon category={row.category || 'requirement'} /></span><span>{row.title}</span></button> : <button type="button" className="iteration-version-link" onClick={() => onOpenVersion(row.versionId)} title={versionTitle(row)}>{versionTitle(row)}</button>}
              </div>
              {row.owner && <div className="iteration-meta">{row.owner}</div>}
              {row.kind !== 'group' && <div className="iteration-meta">计划 {row.plan ? `${dateLabel(row.plan.start)} ～ ${dateLabel(row.plan.end)}` : '未排期'}</div>}
              <div className="iteration-state-line"><span>{row.status}</span><span className={`iteration-risk-${row.risk.tone}`}>{row.risk.text}</span></div>
              {row.kind !== 'group' && row.stages.missing.length > 0 && <div className="iteration-meta" title={`${row.stages.missing.join('、')}未排期或排期不完整`}>排期不完整 · {row.stages.missing.join('、')}</div>}
            </div>)}
          </div>
          <div className="iteration-scroll">
            <div className="iteration-tracks" style={{ width: `max(100%, ${weeks * 112}px)` }}>
              <div className="iteration-heading iteration-axis"><span>时间区间（按周）</span>{Array.from({ length: weeks }, (_, index) => <span key={index} className="iteration-tick" style={{ left: `${index / weeks * 100}%` }}>{dateLabel(start + index * 7 * DAY)}</span>)}<span className="iteration-today-label" style={{ left: `${(today - start) / span * 100}%` }}>今天 {dateLabel(today).slice(5)}</span></div>
              <div className="iteration-body"><div className="iteration-today" style={{ left: `${(today - start) / span * 100}%` }} />
                {rows.map((row) => <div key={row.id} className={`iteration-track iteration-${row.kind}`} style={{ height: height(row) }}>
                  {row.kind === 'group' ? <div className="iteration-group-summary"><span>版本计划 {row.plan ? `${dateLabel(row.plan.start)} ～ ${dateLabel(row.plan.end)}` : '未排期'}</span><span>{row.count} 个任务{!row.count && !collapsed.has(row.id) ? ' · 暂无任务' : ''}</span></div> : <>
                    {row.plan && <span className="iteration-plan" style={position(row.plan)} title={`计划：${dateLabel(row.plan.start)} ～ ${dateLabel(row.plan.end)}`} />}
                    {row.stages.stages.map((stage) => {
                      const incomplete = row.stages.missing.includes(stage.name);
                      return <span key={stage.name} className={`iteration-stage${incomplete ? ' iteration-stage-incomplete' : ''}`} style={{ ...position(stage), top: 32 + stage.lane * 32, backgroundColor: incomplete ? undefined : stage.color }} title={incomplete ? `${stage.name} · 排期不完整；仅显示已排期任务范围：${dateLabel(stage.start)} ～ ${dateLabel(stage.end)}` : `${stage.name}：${dateLabel(stage.start)} ～ ${dateLabel(stage.end)}`}>{incomplete ? `${stage.name} · 排期不完整` : `${stage.name} ${dateLabel(stage.start).slice(5)} ～ ${dateLabel(stage.end).slice(5)}`}</span>;
                    })}
                    {missingWithoutDates(row).map((stage, index) => <span key={stage.name} className="iteration-stage-placeholder iteration-stage-incomplete" style={{ top: 32 + (row.stages.stages.length ? row.stages.lanes : 0) * 32 + index * 32 }} title={`${stage.name} · 排期不完整；占位条不代表实际时间范围`}>{stage.name} · 排期不完整</span>)}
                    {row.risk.tail && <span className="iteration-delay" style={{ ...position(row.risk.tail), top: 16 }} title={row.risk.text} />}
                  </>}
                </div>)}
              </div>
            </div>
          </div>
        </div>
        {view === 'task' && roots.some((item) => !item.versionId) && <div className="iteration-meta">另有 {roots.filter((item) => !item.versionId).length} 个任务未关联版本</div>}
        <div className="iteration-legend"><span><i className="iteration-plan-key" />{view === 'version' ? '版本计划' : '任务计划'}</span>{timelineStages.map((stage) => <span key={stage.name}><i style={{ backgroundColor: stage.color }} />{stage.name}</span>)}<span><i className="iteration-incomplete-key" />排期不完整（无日期条为占位）</span><span><i className="iteration-delay-key" />延期部分</span></div>
      </>}
  </section>;
}
