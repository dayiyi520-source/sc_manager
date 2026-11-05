// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { KpiEmployee } from './kpiPerformanceDemo';
import { filterPublishedEmployees, listKpiAppeals, submitKpiAppeal, summarizeDepartmentPerformance } from './kpiPerformancePublication';

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

  it('主管只取得当前主管团队记录', () => {
    expect(filterPublishedEmployees(employees, '主管', '主管甲', '').map(item => item.id)).toEqual(['a', 'b']);
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
});
