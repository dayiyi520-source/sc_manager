import type { KpiEmployee } from './kpiPerformanceDemo';
export const REVIEW_MODULES = [
  { key: 'objective', label: '月度目标', max: 60 }, { key: 'attendance', label: '考勤', max: 10 },
  { key: 'extraWork', label: '额外投入', max: 10 }, { key: 'attitude', label: '工作态度', max: 15 }, { key: 'review', label: '周月报提交', max: 10 },
] as const;
export type ReviewModule = typeof REVIEW_MODULES[number]['key'];
export type ReviewActor = '主管' | 'HR' | '老板';
export interface ModuleAdjustment { bonus: number; deduction: number; note: string }
export type ModuleAdjustments = Record<ReviewModule, ModuleAdjustment>;
export interface ReviewComment { text: string; name: string; at: string }
export interface ReviewBook {
  base: Record<ReviewModule, number>;
  active: Partial<Record<ReviewActor, ModuleAdjustments>>;
  drafts: Partial<Record<ReviewActor, ModuleAdjustments>>;
  comments?: Partial<Record<ReviewActor, ReviewComment>>;
  commentDrafts?: Partial<Record<ReviewActor, ReviewComment>>;
  history: Array<{ id: string; actor: ReviewActor; name: string; at: string; action: string; before?: ModuleAdjustments; after: ModuleAdjustments; comment?: string; appealId?: string }>;
  revision: number;
}
export const blankAdjustments = (): ModuleAdjustments => Object.fromEntries(REVIEW_MODULES.map(m => [m.key, { bonus: 0, deduction: 0, note: '' }])) as ModuleAdjustments;
export function reviewBookFor(employee: KpiEmployee): ReviewBook {
  if (employee.reviewBook) return structuredClone(employee.reviewBook);
  const manager = blankAdjustments();
  const approved = [...(employee.reviewHistory || [])].reverse().find(r => r.action === 'HR 审核通过');
  manager.objective = { bonus: approved?.proposed.goalBonus ?? Math.max(0, employee.scores.managerAdjustment), deduction: approved?.proposed.goalDeduction ?? Math.max(0, -employee.scores.managerAdjustment), note: approved?.reason || '' };
  const attitudeBase = approved?.before.attitude ?? employee.scores.attitude;
  manager.attitude = { bonus: Math.max(0, employee.scores.attitude - attitudeBase), deduction: Math.max(0, attitudeBase - employee.scores.attitude), note: approved?.reason || '' };
  manager.review = { bonus: 0, deduction: employee.scoreAllocationVersion === 2 ? Math.max(0, -(employee.scores.temporaryTaskDeduction ?? 0)) : 0, note: approved?.reason || '' };
  const base = { objective: employee.approvedSourceCorrections?.filter(r => r.source === 'objective').at(-1)?.after.objectiveScore ?? employee.scores.objective,
    attendance: employee.scores.attendance, extraWork: employee.scores.extraWork, attitude: attitudeBase,
    review: employee.approvedSourceCorrections?.filter(r => r.source === 'reports').at(-1)?.after.reviewScore ?? employee.scores.review };
  const drafts: ReviewBook['drafts'] = {};
  if (employee.managerDraft) {
    const draft = structuredClone(manager);
    draft.objective = { bonus: employee.managerDraft.goalBonus ?? Math.max(0, employee.managerDraft.adjustment), deduction: employee.managerDraft.goalDeduction ?? Math.max(0, -employee.managerDraft.adjustment), note: employee.managerDraft.reason };
    draft.attitude = { bonus: Math.max(0, employee.managerDraft.attitude - attitudeBase), deduction: Math.max(0, attitudeBase - employee.managerDraft.attitude), note: employee.managerDraft.reason };
    draft.review = { bonus: 0, deduction: Math.max(0, -(employee.managerDraft.temporaryTaskDeduction ?? 0)), note: employee.managerDraft.reason };
    drafts.主管 = draft;
  }
  return { base, active: employee.performanceKind === 'supervisor' ? {} : { 主管: manager }, drafts, comments: {}, commentDrafts: {}, history: [], revision: 0 };
}
export function reviewRawScores(book: ReviewBook) {
  return Object.fromEntries(REVIEW_MODULES.map(m => {
    const delta = Object.values(book.active).reduce((sum, values) => sum + (values?.[m.key]?.bonus ?? 0) - (values?.[m.key]?.deduction ?? 0), 0);
    return [m.key, Math.min(m.max, Math.max(0, book.base[m.key] + delta))];
  })) as Record<ReviewModule, number>;
}
export function validateAdjustments(values: ModuleAdjustments) {
  for (const m of REVIEW_MODULES) {
    const entry = values[m.key];
    if (!entry || !Number.isFinite(entry.bonus) || !Number.isFinite(entry.deduction) || entry.bonus < 0 || entry.deduction < 0) throw new Error(`${m.label}加分和减分须为非负有限数字`);
    if (typeof entry.note !== 'string' || entry.note.trim().length > 500) throw new Error(`${m.label}说明最多 500 字`);
    if ((entry.bonus || entry.deduction) && !entry.note.trim()) throw new Error(`请填写${m.label}加减分说明`);
  }
}
