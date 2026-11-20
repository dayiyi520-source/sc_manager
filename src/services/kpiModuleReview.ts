import { gradeForScore, isManagerReviewOpen, isAppealPeriodOpen, scoreForEmployee, type KpiEmployee, type KpiPeriod } from './kpiPerformanceDemo';
import { listKpiAppeals } from './kpiPerformancePublication';
import { blankAdjustments, reviewBookFor, validateAdjustments, type ModuleAdjustments, type ReviewActor } from './kpiReviewModel';
export interface ReviewContext { role: '员工' | ReviewActor; name: string; month: string; now?: number }
export function canAdjustModules(period: KpiPeriod, employee: KpiEmployee, context: ReviewContext) {
  if (!period.generated) return false;
  if (employee.performanceKind === 'supervisor') return context.role === '老板' && !period.published;
  if (context.role === '主管') {
    const department = period.supervisors?.find(item => item.name === context.name)?.department;
    return !period.published && (department ? employee.department === department : employee.manager === context.name)
      && ['待主管确认', '草稿'].includes(employee.reviewStatus) && isManagerReviewOpen(period, context.now);
  }
  if (context.role !== 'HR') return false;
  if (!period.published) return true;
  return isAppealPeriodOpen(period, context.now) && listKpiAppeals().some(a => a.month === context.month && a.employeeId === employee.id && a.status === '待处理');
}
export function saveModuleReview(period: KpiPeriod, employeeId: string, context: ReviewContext, values: ModuleAdjustments, action: 'draft' | 'submit' | 'apply', expectedRevision: number, performanceComment = ''): KpiPeriod {
  const employee = [...period.employees, ...(period.supervisors || [])].find(e => e.id === employeeId);
  if (!employee || !canAdjustModules(period, employee, context)) throw new Error('当前角色或时间范围不可修改此绩效');
  if (context.role === '员工') throw new Error('员工不可调分');
  if ((context.role === '主管' && action === 'apply') || (context.role !== '主管' && action === 'submit')) throw new Error('当前角色不可执行此评分操作');
  validateAdjustments(values);
  const normalizedComment = performanceComment.trim();
  if (context.role === '主管' && performanceComment.length > 1000) throw new Error('绩效评语最多 1000 字');
  if (context.role === '主管' && action === 'submit' && !normalizedComment) throw new Error('请填写绩效评语后再提交复审');
  const book = reviewBookFor(employee);
  if (book.revision !== expectedRevision) throw new Error('绩效已被更新，请重新加载后修改');
  const actor = context.role;
  const normalized = structuredClone(values);
  Object.values(normalized).forEach(entry => { entry.note = entry.note.trim(); });
  const current = book.drafts[actor] || book.active[actor] || blankAdjustments();
  if (action === 'apply' && JSON.stringify(book.active[actor]) === JSON.stringify(normalized)) return period;
  const at = new Date(context.now ?? Date.now()).toISOString();
  book.history.push({ id: crypto.randomUUID(), actor, name: context.name, at, action: action === 'draft' ? '保存草稿' : action === 'submit' ? '提交复核' : '评定生效', before: structuredClone(current), after: normalized,
    ...(actor === '主管' ? { comment: normalizedComment } : {}),
    ...(period.published ? { appealId: listKpiAppeals().find(a => a.month === context.month && a.employeeId === employee.id && a.status === '待处理')?.id } : {}) });
  if (action === 'apply') { book.active[actor] = normalized; delete book.drafts[actor]; }
  else book.drafts[actor] = normalized;
  if (actor === '主管') {
    book.commentDrafts = { ...book.commentDrafts, 主管: { text: normalizedComment, name: context.name, at } };
  }
  book.revision += 1;
  const next: KpiEmployee = { ...employee, reviewBook: book, ...(action === 'submit' ? { reviewStatus: '待HR复审' as const } : {}), ...(actor === '老板' && action === 'apply' ? { reviewStatus: '已确认' as const, bossRatedAt: new Date(context.now ?? Date.now()).toISOString() } : {}) };
  if (employee.performanceKind === 'supervisor') return { ...period, supervisors: period.supervisors!.map(e => e.id === employeeId ? next : e) };
  return { ...period, employees: period.employees.map(e => e.id === employeeId ? next : e) };
}
export function approveModuleReview(period: KpiPeriod, employeeId: string, context: ReviewContext, decision: 'approve' | 'return', reason = '') {
  if (context.role !== 'HR' || period.published) throw new Error('仅 HR 可审核未公示的员工绩效');
  const employee = period.employees.find(e => e.id === employeeId);
  if (!employee || employee.reviewStatus !== '待HR复审') throw new Error('当前员工尚未提交审核');
  if (decision === 'return' && !reason.trim()) throw new Error('请填写退回原因');
  const book = reviewBookFor(employee);
  if (decision === 'approve' && book.drafts.主管) {
    book.active.主管 = structuredClone(book.drafts.主管);
    delete book.drafts.主管;
    const submittedComment = book.commentDrafts?.主管;
    if (submittedComment?.text.trim()) book.comments = { ...book.comments, 主管: submittedComment };
    if (book.commentDrafts) delete book.commentDrafts.主管;
  }
  book.history.push({ id: crypto.randomUUID(), actor: 'HR', name: context.name, at: new Date(context.now ?? Date.now()).toISOString(), action: decision === 'approve' ? '审核通过' : `退回：${reason.trim()}`, after: structuredClone(book.active.主管 || blankAdjustments()) });
  book.revision += 1;
  return { ...period, employees: period.employees.map(e => e.id === employeeId ? { ...e, ...(decision === 'approve' ? { managerDraft: undefined } : {}), reviewBook: book, reviewStatus: decision === 'approve' ? '已确认' as const : '待主管确认' as const, hrNote: decision === 'approve' ? 'HR 审核通过' : `HR 退回：${reason.trim()}` } : e) };
}
export const supervisorGrade = (employee: KpiEmployee) => employee.bossRatedAt ? gradeForScore(scoreForEmployee(employee)) : null;
