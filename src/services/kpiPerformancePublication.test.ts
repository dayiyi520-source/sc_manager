// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { KpiEmployee } from './kpiPerformanceDemo';
import { loadKpiDemo, saveKpiDemo, syncKpiSources } from './kpiPerformanceDemo';
import { correctionForEmployee, filterPublishedEmployees, listKpiAppeals, resolveKpiAppeal, restoreLegacyAppealCorrections, submitKpiAppeal, summarizeDepartmentPerformance } from './kpiPerformancePublication';

const employee = (id: string, department: string, manager: string, score: number): KpiEmployee => ({
  id, name: id, department, position: '专员', manager,
  scores: { objective: score, attendance: 0, extraWork: 0, attitude: 0, review: 0, managerAdjustment: 0 },
  source: { okrCompletion: 0, attendanceDays: 0, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 0, reportLate: 0, reportMissing: 0, tasksOverdue: 0 },
  reviewStatus: '已通过',
});

const employees = [employee('a', '产品部', '主管甲', 94), employee('b', '产品部', '主管甲', 86), employee('c', '研发部', '主管乙', 75)];

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('绩效公示数据范围', () => {
  it('员工只取得本人记录', () => {
    expect(filterPublishedEmployees(employees, '员工', '', 'b').map(item => item.id)).toEqual(['b']);
  });

  it('主管公示取得负责部门的全部成员，而非仅直接汇报员工', () => {
    const sameDepartment = employee('d', '产品部', '主管乙', 80);
    expect(filterPublishedEmployees([...employees, sameDepartment], '主管', '主管甲', '').map(item => item.id)).toEqual(['a', 'b', 'd']);
  });

  it('HR 取得全部员工记录', () => {
    expect(filterPublishedEmployees(employees, 'HR', '', '').map(item => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('部门汇总只返回匿名聚合指标及完整等级计数', () => {
    const [summary] = summarizeDepartmentPerformance(employees.slice(0, 2), 1.1);
    expect(summary).toMatchObject({ department: '产品部', employeeCount: 2, averageScore: 90, departmentCoefficient: 1.1 });
    expect(summary.gradeCounts).toEqual({ S: 0, A: 1, B: 1, C: 0, D: 0, E: 0 });
    expect(JSON.stringify(summary)).not.toMatch(/"name"|"id"/);
  });
});

describe('绩效申诉 Mock 持久化', () => {
  it('保存并重新读取员工申诉', () => {
    const appeal = submitKpiAppeal({ month: '2026-10', employeeId: 'a', employeeName: '员工甲', reason: '请复核月度目标得分' });
    expect(appeal.status).toBe('待处理');
    expect(listKpiAppeals()).toEqual([appeal]);
  });

  it('拒绝空白或超长申诉原因', () => {
    expect(() => submitKpiAppeal({ month: '2026-10', employeeId: 'a', employeeName: '员工甲', reason: '  ' })).toThrow('请填写申诉原因');
    expect(() => submitKpiAppeal({ month: '2026-10', employeeId: 'a', employeeName: '员工甲', reason: 'x'.repeat(501) })).toThrow('不能超过 500 字');
    expect(listKpiAppeals()).toEqual([]);
  });

  it('HR 修正已公示目标与周月报后保留审计、结果和同步幂等性', () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-10'];
    const original = period.employees[0];
    const appeal = submitKpiAppeal({ month: '2026-10', employeeId: original.id, employeeName: original.name, reason: '目标和周报分数有误' });
    expect(() => submitKpiAppeal({ month: '2026-10', employeeId: original.id, employeeName: original.name, reason: '重复申诉' })).toThrow('已有待处理申诉');
    const correction = { ...correctionForEmployee(original), okrCompletion: 105, objectiveScore: 60, reportLate: 1, reviewScore: 8 };
    expect(() => resolveKpiAppeal(period, '2026-10', appeal.id, '员工', 'correct', '核实', correction)).toThrow('仅 HR');
    expect(() => resolveKpiAppeal(period, '2026-11', appeal.id, 'HR', 'correct', '核实', correction)).toThrow('月份不匹配');
    expect(() => resolveKpiAppeal(period, '2026-10', appeal.id, 'HR', 'correct', '核实', { ...correction, objectiveScore: 61 })).toThrow('超出允许范围');
    const resolved = resolveKpiAppeal(period, '2026-10', appeal.id, 'HR', 'correct', '已核对来源', correction);
    expect(resolved.appeal).toMatchObject({ status: '已修正', correction: { before: { okrCompletion: original.source.okrCompletion }, after: { okrCompletion: 105 } } });
    const correctedEmployee = resolved.period.employees[0];
    expect(correctedEmployee.source).toMatchObject({ okrCompletion: original.source.okrCompletion, reportLate: original.source.reportLate });
    expect(correctedEmployee.scores).toMatchObject({ objective: original.scores.objective, review: original.scores.review });
    expect(correctedEmployee.approvedSourceCorrections?.map(record => record.source)).toEqual(['objective', 'reports']);
    expect(correctedEmployee.approvedSourceCorrections?.[0]).toMatchObject({ before: { okrCompletion: original.source.okrCompletion, objectiveScore: original.scores.objective }, after: { okrCompletion: 105, objectiveScore: 60 } });
    expect(correctedEmployee.approvedSourceCorrections?.[1]).toMatchObject({ before: { reviewScore: original.scores.review }, after: { reviewScore: 8 } });
    expect(correctionForEmployee(resolved.period.employees[0])).toMatchObject({ okrCompletion: 105, objectiveScore: 60, reportLate: 1, reviewScore: 8 });
    expect(resolved.period.departmentCoefficients.产品部).toBeDefined();
    expect(syncKpiSources(resolved.period, '2026-10').employees[0].source.okrCompletion).toBe(original.source.okrCompletion);
    state.periods['2026-10'] = resolved.period;
    saveKpiDemo(state);
    expect(loadKpiDemo().periods['2026-10'].employees[0].scores.objective).toBe(original.scores.objective);
    expect(loadKpiDemo().periods['2026-10'].employees[0].approvedSourceCorrections).toHaveLength(2);
    expect(listKpiAppeals()[0].status).toBe('已修正');
    expect(() => resolveKpiAppeal(period, '2026-10', appeal.id, 'HR', 'reject', '重复处理')).toThrow('已处理');
  });

  it('HR 修正周报未交次数后按清零规则保存复盘分', () => {
    const period = loadKpiDemo().periods['2026-10'];
    const original = period.employees[0];
    const appeal = submitKpiAppeal({ month: '2026-10', employeeId: original.id, employeeName: original.name, reason: '周报未交次数有误' });
    const correction = { ...correctionForEmployee(original), weeklyReportMissing: 3, reviewScore: 0 };
    expect(() => resolveKpiAppeal(period, '2026-10', appeal.id, 'HR', 'correct', '错误得分', { ...correction, reviewScore: 8 })).toThrow('须按迟交和未交次数自动计算');
    const resolved = resolveKpiAppeal(period, '2026-10', appeal.id, 'HR', 'correct', '核实周报记录', correction);
    expect(correctionForEmployee(resolved.period.employees[0])).toMatchObject({ weeklyReportMissing: 3, reviewScore: 0 });
    expect(resolved.period.employees[0].source.weeklyReportMissing ?? 0).toBe(0);
    expect(resolved.period.employees[0].approvedSourceCorrections?.[0]).toMatchObject({ source: 'reports', after: { weeklyReportMissing: 3, reviewScore: 0 } });
  });

  it('驳回不修改成绩，并校验处理说明与员工存在性', () => {
    const period = loadKpiDemo().periods['2026-10'];
    const appeal = submitKpiAppeal({ month: '2026-10', employeeId: period.employees[0].id, employeeName: period.employees[0].name, reason: '请复核' });
    expect(() => resolveKpiAppeal(period, '2026-10', appeal.id, 'HR', 'reject', ' ')).toThrow('处理说明');
    const resolved = resolveKpiAppeal(period, '2026-10', appeal.id, 'HR', 'reject', '数据无误');
    expect(resolved.period).toBe(period);
    expect(resolved.appeal).toMatchObject({ status: '已驳回', resolution: '数据无误' });
  });

  it('把旧版已覆盖来源值的申诉数据迁移为独立修正记录', () => {
    const period = loadKpiDemo().periods['2026-10'];
    const original = period.employees[0];
    const appeal = submitKpiAppeal({ month: '2026-10', employeeId: original.id, employeeName: original.name, reason: '目标和周报分数有误' });
    const correction = { ...correctionForEmployee(original), okrCompletion: 105, objectiveScore: 60, reportLate: 1, reviewScore: 8 };
    const resolved = resolveKpiAppeal(period, '2026-10', appeal.id, 'HR', 'correct', '已核对来源', correction);
    const legacyEmployee = { ...resolved.period.employees[0], source: { ...original.source, okrCompletion: 105, reportLate: 1 }, scores: { ...original.scores, objective: 60, review: 8 }, sourceCorrection: { objective: true, reports: true }, approvedSourceCorrections: undefined };
    const migrated = restoreLegacyAppealCorrections({ periods: { ...loadKpiDemo().periods, '2026-10': { ...resolved.period, employees: [legacyEmployee, ...resolved.period.employees.slice(1)] } } });
    expect(migrated.periods['2026-10'].employees[0]).toMatchObject({ source: { okrCompletion: original.source.okrCompletion, reportLate: original.source.reportLate }, scores: { objective: original.scores.objective, review: original.scores.review }, approvedSourceCorrections: expect.any(Array) });
    expect(migrated.periods['2026-10'].employees[0].approvedSourceCorrections).toHaveLength(2);
  });
});
