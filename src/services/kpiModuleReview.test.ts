import { beforeEach, describe, expect, it } from 'vitest';
import { loadKpiDemo, saveKpiDemo, scoreForEmployee, departmentCoefficientPreview, gradeForScore } from './kpiPerformanceDemo';
import { blankAdjustments } from './kpiReviewModel';
import { approveModuleReview, saveModuleReview } from './kpiModuleReview';
import { submitKpiAppeal, resolveKpiAppeal } from './kpiPerformancePublication';
// @vitest-environment jsdom
beforeEach(() => localStorage.clear());
const now = Date.now();
const context = (role: '主管' | 'HR' | '老板' | '员工', name = role as string) => ({ role, name, month: '2026-11', now });
function period() {
  const p = loadKpiDemo().periods['2026-11'];
  p.cycleSettings = { managerReview: { startAt: new Date(now - 10000).toISOString(), endAt: new Date(now + 10000).toISOString() }, finalPublicationAt: new Date(now + 20000).toISOString(), appealConfirmation: { startAt: new Date(now - 10000).toISOString(), endAt: new Date(now + 30000).toISOString() } };
  return p;
}
describe('统一调分与老板评定', () => {
  it('主管草稿不生效，HR审核通过后生效，两方说明独立持久化', () => {
    let p = period(); const employee = p.employees[0], base = scoreForEmployee(employee);
    const manager = blankAdjustments(); manager.objective = { bonus: 2, deduction: 1, note: '主管目标依据' };
    p = saveModuleReview(p, employee.id, context('主管', employee.manager), manager, 'draft', 0);
    expect(scoreForEmployee(p.employees[0])).toBe(base);
    expect(p.employees[0].reviewBook?.commentDrafts?.主管?.text).toBe('');
    expect(() => saveModuleReview(p, employee.id, context('主管', employee.manager), manager, 'submit', 1)).toThrow('请填写绩效评语');
    p = saveModuleReview(p, employee.id, context('主管', employee.manager), manager, 'submit', 1, '按计划完成重点工作，跨团队协作及时。');
    expect(scoreForEmployee(p.employees[0])).toBe(base);
    expect(p.employees[0].reviewBook?.commentDrafts?.主管?.text).toBe('按计划完成重点工作，跨团队协作及时。');
    const hr = blankAdjustments(); hr.objective = { bonus: 1, deduction: 0, note: 'HR核实补分' };
    p = saveModuleReview(p, employee.id, context('HR'), hr, 'apply', 2);
    p = approveModuleReview(p, employee.id, context('HR'), 'approve');
    expect(p.employees[0].reviewBook?.active.主管?.objective.note).toBe('主管目标依据');
    expect(p.employees[0].reviewBook?.active.HR?.objective.note).toBe('HR核实补分');
    expect(p.employees[0].reviewBook?.comments?.主管?.text).toBe('按计划完成重点工作，跨团队协作及时。');
    expect(scoreForEmployee(p.employees[0])).toBeGreaterThan(base);
    const state = loadKpiDemo(); state.periods['2026-11'] = p; saveKpiDemo(state);
    expect(loadKpiDemo().periods['2026-11'].employees[0].reviewBook).toEqual(p.employees[0].reviewBook);
  });
  it('老板直接评定主管并更新对应部门系数，主管不计入员工汇总', () => {
    let p = period(); const leader = p.supervisors![0]; const employeeCount = p.employees.length;
    expect(departmentCoefficientPreview(p, leader.department).initialCoefficient).toBeNull();
    const values = blankAdjustments(); values.objective = { bonus: 15, deduction: 0, note: '老板确认目标成果' };
    p = saveModuleReview(p, leader.id, context('老板'), values, 'apply', 0);
    expect(p.supervisors![0].reviewStatus).toBe('已确认');
    expect(departmentCoefficientPreview(p, leader.department).initialCoefficient).toBe(gradeForScore(scoreForEmployee(p.supervisors![0])).coefficient);
    expect(p.employees).toHaveLength(employeeCount);
    const state = loadKpiDemo(); state.periods['2026-11'] = p; saveKpiDemo(state);
    expect(loadKpiDemo().periods['2026-11'].supervisors![0].bossRatedAt).toBeTruthy();
  });
  it('校验角色、团队、阶段、负数、说明和版本冲突', () => {
    const p = period(), employee = p.employees[0], values = blankAdjustments();
    for (const ctx of [context('员工'), context('老板'), context('主管', '其他主管')]) expect(() => saveModuleReview(p, employee.id, ctx, values, 'draft', 0)).toThrow();
    expect(() => saveModuleReview({ ...p, published: true }, employee.id, context('主管', employee.manager), values, 'draft', 0)).toThrow();
    expect(() => saveModuleReview({ ...p, cycleSettings: undefined }, employee.id, context('主管', employee.manager), values, 'draft', 0)).toThrow();
    expect(() => saveModuleReview(p, p.supervisors![0].id, context('HR'), values, 'apply', 0)).toThrow();
    values.attitude.bonus = -1; expect(() => saveModuleReview(p, employee.id, context('HR'), values, 'apply', 0)).toThrow();
    values.attitude.bonus = 1; expect(() => saveModuleReview(p, employee.id, context('HR'), values, 'apply', 0)).toThrow('说明');
    values.attitude.note = '核实'; expect(() => saveModuleReview(p, employee.id, context('HR'), values, 'apply', 9)).toThrow('更新');
  });
  it('HR公示后仅在待处理申诉期间调分，完成后恢复只读', () => {
    let p = { ...period(), published: true };
    const employee = p.employees[0], values = blankAdjustments(); values.attitude = { bonus: 2, deduction: 0, note: '申诉核实' };
    expect(() => saveModuleReview(p, employee.id, context('HR'), values, 'apply', 0)).toThrow();
    const appeal = submitKpiAppeal({ month: '2026-11', employeeId: employee.id, employeeName: employee.name, reason: '复核态度分' });
    p = saveModuleReview(p, employee.id, context('HR'), values, 'apply', 0);
    expect(p.employees[0].reviewBook?.history[0].appealId).toBe(appeal.id);
    const rejected = resolveKpiAppeal(p, '2026-11', appeal.id, 'HR', 'reject', '核实后维持原分');
    expect(rejected.period.employees[0].reviewBook?.active.HR?.attitude.bonus).toBe(0);
    expect(() => saveModuleReview(p, employee.id, context('HR'), values, 'apply', 1)).toThrow();
  });
  it('退回保留草稿但不生效，并补齐明确标记的十月主管演示评分', () => {
    let p = period(); const employee = p.employees[0], values = blankAdjustments();
    values.objective = { bonus: 3, deduction: 0, note: '待核实' };
    p = saveModuleReview(p, employee.id, context('主管', employee.manager), values, 'submit', 0, '请补充该员工阶段表现依据。');
    p = approveModuleReview(p, employee.id, context('HR'), 'return', '补充依据');
    expect(p.employees[0].reviewBook?.drafts.主管?.objective.bonus).toBe(3);
    expect(p.employees[0].reviewBook?.active.主管?.objective.bonus).toBe(0);
    expect(p.employees[0].reviewBook?.commentDrafts?.主管?.text).toBe('请补充该员工阶段表现依据。');
    expect(loadKpiDemo().periods['2026-10'].supervisors?.every(item => item.bossRatedAt && item.supervisorDemoRated)).toBe(true);
  });
  it('限制主管评语长度并要求提交时填写非空内容', () => {
    const p = period(), employee = p.employees[0], values = blankAdjustments();
    expect(() => saveModuleReview(p, employee.id, context('主管', employee.manager), values, 'submit', 0, ' '.repeat(1001))).toThrow('绩效评语最多 1000 字');
    expect(() => saveModuleReview(p, employee.id, context('主管', employee.manager), values, 'submit', 0)).toThrow('请填写绩效评语');
  });
});
