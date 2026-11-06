// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { departmentCoefficientPreview, gradeForScore, loadKpiDemo, reviewDepartmentSubmission, reviewManagerSubmission, saveKpiDemo, scoreForEmployee, submitDepartmentReview, submitManagerReview, KPI_DEMO_STORAGE_KEY } from './kpiPerformanceDemo';

describe('KPI performance demo rules', () => {
  beforeEach(() => localStorage.clear());

  it('maps score boundaries to the configured demo grades and coefficients', () => {
    expect(gradeForScore(95)).toEqual({ grade: 'A', coefficient: 1.2 });
    expect(gradeForScore(90)).toEqual({ grade: 'B', coefficient: 1.0 });
    expect(gradeForScore(60)).toEqual({ grade: 'E', coefficient: 0 });
  });

  it('saves calculation and review state so the demo resumes after reload', () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-10'];
    period.employees[0].scores.managerAdjustment = 2;
    period.employees[0].reviewStatus = '已通过';
    saveKpiDemo(state);

    const restored = loadKpiDemo().periods['2026-10'].employees[0];
    expect(scoreForEmployee(restored)).toBe(95);
    expect(restored.reviewStatus).toBe('已通过');
    expect(localStorage.getItem(KPI_DEMO_STORAGE_KEY)).not.toBeNull();
  });

  it('starts with a generated manager-review demo month and keeps the published month locked', () => {
    const state = loadKpiDemo();
    const reviewPeriod = state.periods['2026-11'];

    expect(reviewPeriod.generated).toBe(true);
    expect(reviewPeriod.published).toBe(false);
    expect(reviewPeriod.reviewEnabled).toBe(true);
    expect(reviewPeriod.employees.every(employee => employee.reviewStatus === '待主管复核')).toBe(true);
    expect(state.periods['2026-10'].published).toBe(true);
  });

  it('keeps manager changes out of the summary until HR approves', () => {
    const employee = { ...loadKpiDemo().periods['2026-11'].employees[0], reviewStatus: '待主管复核' as const };
    const draft = { ...employee, managerDraft: { attitude: 10, adjustment: -2, reason: '交付延期，复盘材料未按期提交。' } };
    const submitted = submitManagerReview(draft);
    expect(submitted.reviewStatus).toBe('待 HR 审核');
    expect(scoreForEmployee(submitted)).toBe(scoreForEmployee(employee));

    const approved = reviewManagerSubmission(submitted, 'approve');
    expect(approved.reviewStatus).toBe('已通过');
    expect(approved.scores.attitude).toBe(10);
    expect(approved.scores.managerAdjustment).toBe(-2);
    expect(scoreForEmployee(approved)).toBe(scoreForEmployee(employee) - 6);
  });

  it('returns a submission to the manager without applying the proposed score', () => {
    const employee = { ...loadKpiDemo().periods['2026-11'].employees[0], reviewStatus: '待主管复核' as const };
    const submitted = submitManagerReview({ ...employee, managerDraft: { attitude: 12, adjustment: 1, reason: '按期交付并主动协助团队。' } });
    const returned = reviewManagerSubmission(submitted, 'return', '请补充具体项目证据。');

    expect(returned.reviewStatus).toBe('HR 已退回');
    expect(returned.hrNote).toContain('请补充具体项目证据');
    expect(returned.scores).toEqual(employee.scores);
    expect(returned.managerDraft).toEqual(submitted.managerDraft);
  });

  it('submits and reviews a manager department as one group', () => {
    const period = loadKpiDemo().periods['2026-11'];
    const submitted = submitDepartmentReview(period, '陈宇璋', '产品部');
    expect(submitted.employees.filter(employee => employee.department === '产品部').every(employee => employee.reviewStatus === '待 HR 审核')).toBe(true);
    expect(submitted.employees.find(employee => employee.id === 'e-03')?.reviewStatus).toBe('待主管复核');
    expect(() => submitDepartmentReview(submitted, '陈宇璋', '产品部')).toThrow();
    const returned = reviewDepartmentSubmission(submitted, '陈宇璋', '产品部', 'return', '补充依据');
    expect(returned.employees.filter(employee => employee.department === '产品部').every(employee => employee.reviewStatus === 'HR 已退回')).toBe(true);
    const approved = reviewDepartmentSubmission(submitDepartmentReview(returned, '陈宇璋', '产品部'), '陈宇璋', '产品部', 'approve');
    expect(approved.employees.filter(employee => employee.department === '产品部').every(employee => employee.reviewStatus === '已通过')).toBe(true);
  });

  it('previews a department coefficient from completion and confirmed major redlines', () => {
    const period = loadKpiDemo().periods['2026-11'];
    period.employees.filter(employee => employee.department === '产品部').forEach(employee => { employee.source.okrCompletion = 100; });
    expect(departmentCoefficientPreview(period, '产品部').coefficient).toBe(1.1);
    period.departmentMetrics!.产品部.teamCompletion = 90;
    expect(departmentCoefficientPreview(period, '产品部').coefficient).toBe(1);
    period.employees[0].redline = { type: '重大失职', impact: '绩效系数清零', active: true };
    expect(departmentCoefficientPreview(period, '产品部').coefficient).toBe(0.9);
    expect(period.employees.every(employee => !employee.redline || employee.id === 'e-01')).toBe(true);
  });

  it('migrates saved months without department metrics without losing their results', () => {
    const state = loadKpiDemo();
    delete state.periods['2026-10'].departmentMetrics;
    delete state.periods['2026-11'].departmentMetrics;
    saveKpiDemo(state);
    const restored = loadKpiDemo();
    expect(restored.periods['2026-10'].departmentMetrics?.产品部.confirmed).toBe(true);
    expect(restored.periods['2026-11'].departmentMetrics?.产品部.confirmed).toBe(false);
    expect(restored.periods['2026-10'].employees).toHaveLength(state.periods['2026-10'].employees.length);
  });
});
