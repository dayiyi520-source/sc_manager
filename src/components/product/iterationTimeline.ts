import type { UnifiedWorkItem } from '../../services/productRepository';
import type { VersionIteration } from '../../types';

export const DAY = 86400000;
export const timelineStages = [
  { category: 'requirement', name: '产品设计', color: 'var(--primary)' },
  { category: 'design', name: 'UI设计', color: 'var(--accent-purple)' },
  { category: 'dev', name: '产品开发', color: 'var(--cam-cyan)' },
  { category: 'test', name: '测试验收', color: 'var(--warning)' }
] as const;
export type Interval = { start: number; end: number };
export type StageInterval = Interval & { name: string; color: string; lane: number };
export function dateTime(value?: string | null): number | null {
  if (!value) return null;
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? time : null;
}
export function interval(start?: string | null, end?: string | null): Interval | null {
  const a = dateTime(start), b = dateTime(end);
  return a !== null && b !== null && b >= a ? { start: a, end: b } : null;
}
export const dateLabel = (time: number) => new Date(time).toISOString().slice(0, 10);
export const taskPlan = (task: UnifiedWorkItem) => interval(task.plannedStartDate, task.plannedEndDate);
export function stagesFor(items: UnifiedWorkItem[]) {
  const eligible = items.filter((item) => item.status?.group !== 'CANCELLED');
  const missing: string[] = [];
  const stages: StageInterval[] = [];
  for (const stage of timelineStages) {
    const tasks = eligible.filter((item) => item.category === stage.category);
    const plans = tasks.map(taskPlan).filter((plan): plan is Interval => plan !== null);
    if (!tasks.length || plans.length !== tasks.length) missing.push(stage.name);
    if (plans.length) stages.push({ ...stage, start: Math.min(...plans.map((p) => p.start)), end: Math.max(...plans.map((p) => p.end)), lane: 0 });
  }
  // Inclusive day ranges that overlap share a version row but use separate lanes.
  const ends: number[] = [];
  for (const stage of [...stages].sort((a, b) => a.start - b.start || a.end - b.end)) {
    let lane = ends.findIndex((end) => end < stage.start);
    if (lane < 0) lane = ends.length;
    ends[lane] = stage.end;
    stage.lane = lane;
  }
  return { stages, missing, lanes: Math.max(1, ends.length) };
}
export function riskFor(plan: Interval | null, group: string | undefined, completedAt: string | null | undefined, stages: StageInterval[], today: number) {
  if (group === 'CANCELLED') return { text: '已取消', tone: 'muted', tail: null };
  if (!plan) return { text: '未排期', tone: 'muted', tail: null };
  if (group === 'COMPLETED') {
    const completed = dateTime(completedAt);
    if (completed === null) return { text: '完成日期未记录', tone: 'muted', tail: null };
    if (completed > plan.end) return { text: `延期完成 ${(completed - plan.end) / DAY} 天`, tone: 'danger', tail: { start: plan.end + DAY, end: completed } };
    return { text: '按期完成', tone: 'success', tail: null };
  }
  if (today > plan.end) return { text: `已延期 ${(today - plan.end) / DAY} 天`, tone: 'danger', tail: { start: plan.end + DAY, end: today } };
  const end = Math.max(plan.end, ...stages.map((stage) => stage.end));
  if (end > plan.end) return { text: `预计延期 ${(end - plan.end) / DAY} 天`, tone: 'warning', tail: { start: plan.end + DAY, end } };
  return { text: '正常', tone: 'success', tail: null };
}
export const versionGroup = (version: VersionIteration) => ({ '待开始': 'NOT_STARTED', '处理中': 'IN_PROGRESS', '已完成': 'COMPLETED', '已结束': 'CANCELLED' }[version.statusPhase || ''] || ({ '未开始': 'NOT_STARTED', '进行中': 'IN_PROGRESS', '已完成': 'COMPLETED' }[version.status]));

export function productTaskItems(root: UnifiedWorkItem, items: UnifiedWorkItem[]): UnifiedWorkItem[] {
  const selected = new Set([root.id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      // An explicit version on a descendant always wins over its parent's version.
      if (item.versionId && item.versionId !== root.versionId) continue;
      if (!selected.has(item.id) && ((item.parentWorkItemId && selected.has(item.parentWorkItemId)) || item.requirementId === root.id)) {
        selected.add(item.id);
        changed = true;
      }
    }
  }
  return items.filter((item) => selected.has(item.id));
}
