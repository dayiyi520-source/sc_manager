// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { appealWindowFor, autoPublishKpiPeriod, isAppealPeriodOpen, isManagerReviewOpen, loadKpiDemo, saveKpiDemo, switchKpiCycle, validateKpiCycleSettings } from './kpiPerformanceDemo';
import { submitKpiAppeal, resolveKpiAppeal } from './kpiPerformancePublication';
import { canAdjustModules } from './kpiModuleReview';
beforeEach(() => localStorage.clear());
const settings = { mode: 'switches' as const, appealWorkingDays: 3, monthlyGoalDeadline: '2026-11-05T10:00:00Z' };
describe('HR开关和工作日申诉期间', () => {
  it('周五公示不计当日，跨周末至第三工作日北京时间23:59:59', () => {
    const p = { ...loadKpiDemo().periods['2026-11'], published: true, publishedAt: '2026-11-13T09:30:00+08:00', cycleSettings: settings };
    const window = appealWindowFor(p)!;
    expect(window.endAt).toBe('2026-11-18T15:59:59.999Z');
    expect(isAppealPeriodOpen(p, Date.parse(window.startAt) - 1)).toBe(false);
    expect(isAppealPeriodOpen(p, Date.parse(window.startAt))).toBe(true);
    expect(isAppealPeriodOpen(p, Date.parse(window.endAt))).toBe(true);
    expect(isAppealPeriodOpen(p, Date.parse(window.endAt) + 1)).toBe(false);
    expect(appealWindowFor({ ...p, publishedAt: '2026-11-13 09:30:00' })?.endAt).toBe(window.endAt);
  });
  it('跨月跨年工作日计算与无效公示日期', () => {
    const p = { ...loadKpiDemo().periods['2026-10'], cycleSettings: { ...settings, appealWorkingDays: 1 }, publishedAt: '2026-12-31T16:30:00Z' };
    expect(appealWindowFor(p)?.endAt).toBe('2027-01-04T15:59:59.999Z');
    expect(appealWindowFor({ ...p, publishedAt: 'invalid' })).toBeNull();
    expect(isAppealPeriodOpen({ ...p, published: false })).toBe(false);
  });
  it('按开关启停主管复核，不依赖旧时间，保存后刷新恢复', () => {
    let p = loadKpiDemo().periods['2026-11'];
    p = switchKpiCycle(p, settings, true, false, 'HR');
    expect(isManagerReviewOpen(p, Date.parse('2030-01-01'))).toBe(true);
    const employee = p.employees[0];
    expect(canAdjustModules(p, employee, { role: '主管', name: employee.manager, month: '2026-11' })).toBe(true);
    p = switchKpiCycle(p, settings, false, false, 'HR');
    expect(isManagerReviewOpen(p)).toBe(false);
    const state = loadKpiDemo(); state.periods['2026-11'] = p; saveKpiDemo(state);
    expect(loadKpiDemo().periods['2026-11'].cycleSettings).toEqual(settings);
    expect(autoPublishKpiPeriod(p, Date.parse('2030-01-01'))).toBe(p);
  });
  it('公示须完成审核和部门确认，公示后锁定，拒绝非HR及非法天数', () => {
    const p = loadKpiDemo().periods['2026-11'];
    expect(() => switchKpiCycle(p, settings, true, true, '主管')).toThrow('仅 HR');
    expect(() => switchKpiCycle(p, settings, true, true, 'HR')).toThrow('审核');
    const reviewed = { ...p, employees: p.employees.map(e => ({ ...e, reviewStatus: '已通过' as const })) };
    expect(() => switchKpiCycle(reviewed, settings, false, true, 'HR')).toThrow('部门系数');
    const ready = { ...reviewed, departmentMetrics: Object.fromEntries(Object.entries(reviewed.departmentMetrics!).map(([name, metric]) => [name, { ...metric, confirmed: true }])) };
    const published = switchKpiCycle(ready, settings, true, true, 'HR');
    expect(published.published).toBe(true); expect(published.reviewEnabled).toBe(false);
    expect(isAppealPeriodOpen(published)).toBe(true);
    expect(() => switchKpiCycle(published, settings, false, false, 'HR')).toThrow('锁定');
    for (const days of [0, -1, 1.5, NaN, Infinity, 61]) expect(validateKpiCycleSettings({ ...settings, appealWorkingDays: days })).not.toBeNull();
  });
  it('申诉期间外阻止提交、HR调分与处理', () => {
    const p = { ...loadKpiDemo().periods['2026-10'], cycleSettings: settings, publishedAt: '2020-01-01T00:00:00Z' };
    const input = { month: '2026-10', employeeId: p.employees[0].id, employeeName: p.employees[0].name, reason: '复核' };
    expect(() => submitKpiAppeal(input, p)).toThrow('申诉期间');
    const appeal = submitKpiAppeal(input);
    expect(canAdjustModules(p, p.employees[0], { role: 'HR', name: 'HR', month: '2026-10' })).toBe(false);
    expect(() => resolveKpiAppeal(p, '2026-10', appeal.id, 'HR', 'reject', '核实')).toThrow('申诉期间');
  });
});
