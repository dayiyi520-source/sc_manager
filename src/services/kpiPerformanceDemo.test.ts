// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { attendanceScoreFor, autoPublishKpiPeriod, confirmAllDepartmentCoefficients, createKpiPeriod, departmentCoefficientPreview, departmentGoalSummary, extraWorkScoreFor, gradeForScore, isMonthlyGoalLate, loadKpiDemo, publishKpiPeriod, reportScoreFor, reviewDepartmentSubmission, reviewManagerSubmission, saveKpiDemo, scoreForEmployee, sourceAdjustmentFor, submitDepartmentReview, submitManagerReview, syncKpiSources, validateKpiCycleSettings, KPI_DEMO_STORAGE_KEY, type KpiPeriod } from './kpiPerformanceDemo';
import mockOkrState from '../data/mockOkrState.json';
import type { OkrPerson, OkrRecord } from './okrRepository';

describe('KPI performance demo rules', () => {
  beforeEach(() => localStorage.clear());

const withOpenManagerWindow = (period: KpiPeriod): KpiPeriod => {
  const now = Date.now();
  return { ...period, cycleSettings: {
    managerReview: { startAt: new Date(now - 60_000).toISOString(), endAt: new Date(now + 86_400_000).toISOString() },
    finalPublicationAt: new Date(now + 172_800_000).toISOString(),
    appealConfirmation: { startAt: new Date(now + 172_860_000).toISOString(), endAt: new Date(now + 259_200_000).toISOString() },
  } };
};

  it('maps score boundaries to the configured demo grades and coefficients', () => {
    expect(gradeForScore(96)).toEqual({ grade: 'S', coefficient: 1.5 });
    expect(gradeForScore(95)).toEqual({ grade: 'A', coefficient: 1.2 });
    expect(gradeForScore(90)).toEqual({ grade: 'B', coefficient: 1.0 });
    expect(gradeForScore(80)).toEqual({ grade: 'C', coefficient: 0.8 });
    expect(gradeForScore(70)).toEqual({ grade: 'D', coefficient: 0.5 });
    expect(gradeForScore(60)).toEqual({ grade: 'E', coefficient: 0 });
  });

  it('scores weekly and monthly reports with late deductions and missing-report zero rules', () => {
    const source = loadKpiDemo().periods['2026-11'].employees[0].source;
    expect(reportScoreFor(source)).toBe(10);
    expect(reportScoreFor({ ...source, reportLate: 1, monthlyReportLate: 1 })).toBe(6);
    expect(reportScoreFor({ ...source, reportLate: 6 })).toBe(0);
    expect(reportScoreFor({ ...source, weeklyReportMissing: 2 })).toBe(10);
    expect(reportScoreFor({ ...source, weeklyReportMissing: 3 })).toBe(0);
    expect(reportScoreFor({ ...source, reportMissing: 1 })).toBe(0);
    const state = loadKpiDemo();
    saveKpiDemo(state);
    expect(loadKpiDemo().periods['2026-11'].employees[0].scores.review).toBe(10);
    expect(loadKpiDemo().periods['2026-10'].employees[0].scores.review).toBe(9);
  });

  it('scores verified attendance by the lowest applicable tier and paid-leave cap', () => {
    const source = loadKpiDemo().periods['2026-11'].employees[0].source;
    expect(attendanceScoreFor(source)).toBe(10);
    expect(attendanceScoreFor({ ...source, lateMinutes: 15, leaveRecords: { 事假: 1 } })).toBe(8);
    expect(attendanceScoreFor({ ...source, lateMinutes: 30 })).toBe(8);
    expect(attendanceScoreFor({ ...source, lateMinutes: 16, leaveRecords: { 事假: 2 } })).toBe(6);
    expect(attendanceScoreFor({ ...source, leaveRecords: { 事假: 3 } })).toBe(3);
    expect(attendanceScoreFor({ ...source, leaveRecords: { 年假: 2, 调休: 1.5 } })).toBe(8);
    expect(attendanceScoreFor({ ...source, lateMinutes: 31 })).toBe(0);
    expect(attendanceScoreFor({ ...source, missingPunches: 4 })).toBe(0);
    expect(attendanceScoreFor({ ...source, earlyLeaveCount: 1 })).toBe(0);
    expect(attendanceScoreFor({ ...source, absenceCount: 1 })).toBe(0);
    expect(attendanceScoreFor({ ...source, leaveRecords: { 事假: 3.5 } })).toBe(0);
  });

  it('uses the actual objective submission time and counts only submitted goals after the deadline', () => {
    const records = mockOkrState.okrRecords as OkrRecord[];
    const deadline = '2026-11-05T18:00:00+08:00';
    expect(isMonthlyGoalLate(records, 'e-01', '2026-11', deadline)).toBe(false);
    expect(isMonthlyGoalLate(records, 'e-02', '2026-11', deadline)).toBe(true);
    expect(isMonthlyGoalLate(records, 'e-04', '2026-11', deadline)).toBe(true);
    expect(isMonthlyGoalLate(records, 'e-02', '2026-11')).toBe(false);
    expect(isMonthlyGoalLate([{ ...records.find(row => row.id === 'kpi-demo-goal-e-02-2026-11')!, submittedAt: deadline }], 'e-02', '2026-11', deadline)).toBe(false);
  });

  it('converts approved overtime at 18 hours per five points and applies both caps', () => {
    expect(extraWorkScoreFor(18, 10)).toBe(5);
    expect(extraWorkScoreFor(36, 10)).toBe(10);
    expect(extraWorkScoreFor(36, 0)).toBe(5);
    expect(extraWorkScoreFor(12, 10)).toBe(3.33);
    const employee = loadKpiDemo().periods['2026-11'].employees[0];
    expect(scoreForEmployee({ ...employee, scores: { ...employee.scores, objective: 50, attendance: 10, extraWork: 10, attitude: 15, review: 10 } })).toBe(90);
    expect(scoreForEmployee({ ...employee, scores: { ...employee.scores, objective: 50.01, attendance: 10, extraWork: 10, attitude: 15, review: 10 } })).toBe(95.01);
  });

  it('recalculates attendance on source sync and keeps published results unchanged', () => {
    const period = loadKpiDemo().periods['2026-11'];
    expect(period.employees[1].source).toMatchObject({ missingPunches: 0, leaveRecords: { 年假: 1 } });
    period.employees[1].scores.attendance = 10;
    const synced = syncKpiSources(period, '2026-11');
    expect(synced.employees[1].scores.attendance).toBe(8);
    expect(scoreForEmployee(synced.employees[1])).toBe(scoreForEmployee(period.employees[1]) - 2);
    const published = loadKpiDemo().periods['2026-10'];
    const before = published.employees[1].scores.attendance;
    expect(before).toBe(9);
    expect(syncKpiSources(published, '2026-10').employees[1].scores.attendance).toBe(before);
  });

  it('calculates department goals with the same OKR base and redline rules', () => {
    const records = mockOkrState.okrRecords as OkrRecord[];
    const people = mockOkrState.okrPeople as OkrPerson[];
    expect(departmentGoalSummary(records, people, '2026-11', '产品部')).toEqual({ completion: 91, base: 45.5, deduction: 0, total: 45.5 });
    expect(departmentGoalSummary(records, people, '2026-11', '运营部')).toEqual({ completion: 76, base: 38, deduction: 0, total: 30 });
    expect(loadKpiDemo().periods['2026-11'].departmentMetrics?.产品部.goalScore).toBe(45.5);
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
    expect(reviewPeriod.employees.every(employee => employee.scores.attitude === 0 && employee.scores.managerAdjustment === 0)).toBe(true);
    expect(createKpiPeriod(reviewPeriod).employees.every(employee => employee.scores.attitude === 0 && employee.scores.managerAdjustment === 0)).toBe(true);
    expect(state.periods['2026-10'].published).toBe(true);
  });

  it('validates ordered cycle settings and automatically publishes when all prerequisites are met', () => {
    const cycleSettings = {
      managerReview: { startAt: '2026-11-01T00:00:00.000Z', endAt: '2026-11-03T00:00:00.000Z' },
      finalPublicationAt: '2026-11-04T00:00:00.000Z',
      appealConfirmation: { startAt: '2026-11-04T00:01:00.000Z', endAt: '2026-11-08T00:00:00.000Z' },
    };
    expect(validateKpiCycleSettings(cycleSettings)).toBeNull();
    expect(validateKpiCycleSettings({ ...cycleSettings, appealConfirmation: { ...cycleSettings.appealConfirmation, startAt: '2026-11-02T00:00:00.000Z' } })).toContain('主管复核结束后');
    const period = loadKpiDemo().periods['2026-11'];
    const ready = { ...period, cycleSettings, employees: period.employees.map(employee => ({ ...employee, reviewStatus: '已通过' as const })), departmentMetrics: Object.fromEntries(Object.entries(period.departmentMetrics || {}).map(([name, metrics]) => [name, { ...metrics, confirmed: true }])) };
    expect(() => publishKpiPeriod(ready)).toThrow('自动公示');
    expect(() => submitDepartmentReview({ ...period, cycleSettings }, '陈宇璋', '产品部')).toThrow('主管复核时间范围');
    expect(autoPublishKpiPeriod(ready, Date.parse('2026-11-03T23:59:59.000Z')).published).toBe(false);
    const published = autoPublishKpiPeriod(ready, Date.parse('2026-11-04T00:00:01.000Z'));
    expect(published.published).toBe(true);
    expect(new Date(published.publishedAt!).getTime()).toBe(Date.parse('2026-11-04T00:00:01.000Z'));
    expect(autoPublishKpiPeriod({ ...ready, employees: period.employees }, Date.parse('2026-11-05T00:00:00.000Z')).published).toBe(false);
    expect(autoPublishKpiPeriod({ ...ready, departmentMetrics: {} }, Date.parse('2026-11-05T00:00:00.000Z')).published).toBe(false);
  });

  it('keeps objective adjustment at zero until HR approves the manager draft', () => {
    let period = withOpenManagerWindow(loadKpiDemo().periods['2026-11']);
    expect(sourceAdjustmentFor(period.employees[0])).toBe(0);
    period.employees[0].managerDraft = { attitude: 10, adjustment: -2, reason: '复核目标' };
    period = submitDepartmentReview(period, '陈宇璋', '产品部');
    expect(sourceAdjustmentFor(period.employees[0])).toBe(0);
    expect(period.employees[0].source.objectiveAdjustment).toBe(0);
    period = reviewDepartmentSubmission(period, '陈宇璋', '产品部', 'approve');
    expect(sourceAdjustmentFor(period.employees[0])).toBe(-2);
    expect(period.employees[0].source.objectiveAdjustment).toBe(-2);
  });

  it('syncs four mock source categories without resetting review or approved corrections', () => {
    const period = withOpenManagerWindow(loadKpiDemo().periods['2026-11']);
    period.employees[0].managerDraft = { attitude: 10, adjustment: 3, reason: '主管草稿' };
    period.employees[0].sourceCorrection = { objective: true, reports: true };
    period.employees[0].source.okrCompletion = 101;
    period.employees[0].source.reportLate = 2;
    period.employees[0].scores.objective = 58;
    period.employees[0].scores.review = 7;
    period.employees[0].source.attendanceDays = 0;
    period.employees[0].source.approvedOvertimeHours = 0;
    const synced = syncKpiSources(period, '2026-11');
    expect(synced.sourceSyncedAt).toBeTruthy();
    expect(synced.employees[0]).toMatchObject({ managerDraft: { adjustment: 3 }, source: { okrCompletion: 101, reportLate: 2, attendanceDays: 22, approvedOvertimeHours: 12 }, scores: { objective: 58, review: 7, managerAdjustment: 0 } });
    expect(period.employees[0].source.attendanceDays).toBe(0);
    expect(syncKpiSources(synced, '2026-11').employees[0]).toEqual(synced.employees[0]);
  });

  it('merges effective attendance approvals into KPI source data and excludes pending or locked changes', () => {
    const period = loadKpiDemo().periods['2026-11'];
    const synced = syncKpiSources(period, '2026-11');
    const zhou = synced.employees.find(employee => employee.name === '周予安')!;
    const gu = synced.employees.find(employee => employee.name === '顾清和')!;
    const tang = synced.employees.find(employee => employee.name === '唐以宁')!;

    expect(zhou.source.missingPunches).toBe(0);
    expect(zhou.source.leaveRecords).toMatchObject({ 年假: 1 });
    expect(zhou.source.attendanceApprovalSummary?.some(item => item.includes('AP-ATT-2026-1104'))).toBe(true);
    expect(gu.source.leaveRecords).toMatchObject({ 年假: 2 });
    expect(tang.source.leaveRecords).toMatchObject({ 病假: 1 });
    expect(tang.source.lateCount).toBe(2);
    expect(tang.source.attendanceApprovalSummary?.some(item => item.includes('AP-ATT-2026-1028'))).toBe(false);
  });

  it('invalidates unpublished factor confirmation when source objectives change', () => {
    const period = withOpenManagerWindow(loadKpiDemo().periods['2026-11']);
    period.departmentMetrics!.产品部.confirmed = true;
    period.departmentMetrics!.研发部.confirmed = true;
    period.employees[0].source.okrCompletion = 150;
    const synced = syncKpiSources(period, '2026-11');
    expect(synced.departmentMetrics?.产品部.confirmed).toBe(false);
    expect(synced.departmentMetrics?.研发部.confirmed).toBe(true);
    expect(synced.employees[0].source.okrCompletion).toBe(93);
  });

  it('migrates only untouched pending reviews to zero without clearing submitted or approved scores', () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-11'];
    delete period.reviewScoresInitialized;
    period.employees[0].scores.attitude = 14;
    period.employees[1].scores.attitude = 13;
    period.employees[1].reviewStatus = '待 HR 审核';
    period.employees[1].managerDraft = { attitude: 13, adjustment: 1, reason: '已提交' };
    period.employees[2].scores.attitude = 12;
    period.employees[2].reviewStatus = '已通过';
    saveKpiDemo(state);
    const restored = loadKpiDemo().periods['2026-11'];
    expect(restored.employees[0].scores.attitude).toBe(0);
    expect(restored.employees[1].scores.attitude).toBe(13);
    expect(restored.employees[1].managerDraft?.reason).toBe('已提交');
    expect(restored.employees[2].scores.attitude).toBe(12);
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
    expect(scoreForEmployee(approved)).toBe(scoreForEmployee(employee) + 8);
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
    const period = withOpenManagerWindow(loadKpiDemo().periods['2026-11']);
    const submitted = submitDepartmentReview(period, '陈宇璋', '产品部');
    expect(submitted.employees.filter(employee => employee.department === '产品部').every(employee => employee.reviewStatus === '待 HR 审核')).toBe(true);
    expect(submitted.employees.find(employee => employee.id === 'e-03')?.reviewStatus).toBe('待主管复核');
    expect(() => submitDepartmentReview(submitted, '陈宇璋', '产品部')).toThrow();
    const returned = reviewDepartmentSubmission(submitted, '陈宇璋', '产品部', 'return', '补充依据');
    expect(returned.employees.filter(employee => employee.department === '产品部').every(employee => employee.reviewStatus === 'HR 已退回')).toBe(true);
    const approved = reviewDepartmentSubmission(submitDepartmentReview(returned, '陈宇璋', '产品部'), '陈宇璋', '产品部', 'approve');
    expect(approved.employees.filter(employee => employee.department === '产品部').every(employee => employee.reviewStatus === '已通过')).toBe(true);
  });

  it('calculates responsibility separately from the final department coefficient', () => {
    const period = loadKpiDemo().periods['2026-11'];
    period.employees.filter(employee => employee.department === '产品部').forEach(employee => { employee.source.okrCompletion = 80; });
    period.departmentMetrics!.产品部.goalCompletion = 95;
    expect(departmentCoefficientPreview(period, '产品部')).toMatchObject({ responsibilityCoefficient: 1, adjustment: 0.9, coefficient: 0.9 });
    period.employees[0].source.okrCompletion = 79;
    expect(departmentCoefficientPreview(period, '产品部')).toMatchObject({ responsibilityCoefficient: 0.8, coefficient: 0.9 });
    period.employees[0].source.okrCompletion = 80;
    period.employees[0].source.goalLate = true;
    expect(departmentCoefficientPreview(period, '产品部')).toMatchObject({ delayedSubmissionCount: 1, responsibilityCoefficient: 0.8 });
    period.employees[0].source.goalLate = false;
    period.employees[0].redline = { type: '重大失职', impact: '绩效系数清零', active: true };
    expect(departmentCoefficientPreview(period, '产品部')).toMatchObject({ responsibilityCoefficient: 0.8, coefficient: 0.9 });
    expect(period.employees.every(employee => !employee.redline || employee.id === 'e-01')).toBe(true);
  });

  it('records submitted, returned and approved changes, writing only approved adjustment to source', () => {
    const period = withOpenManagerWindow(loadKpiDemo().periods['2026-11']);
    const original = period.employees[0];
    const changed = { ...original, managerDraft: { attitude: 10, adjustment: -2, reason: '目标延期并补充复盘' } };
    const submitted = submitDepartmentReview({ ...period, employees: [changed, ...period.employees.slice(1)] }, '陈宇璋', '产品部');
    expect(submitted.employees[0].scores).toEqual(original.scores);
    expect(submitted.employees[0].reviewHistory?.[0]).toMatchObject({ action: '提交主管复核', actor: '陈宇璋', before: { attitude: 0, adjustment: 0, total: 79.33 }, proposed: { attitude: 10, adjustment: -2, total: 87.33 } });
    const returned = reviewDepartmentSubmission(submitted, '陈宇璋', '产品部', 'return', '请补充依据');
    expect(returned.employees[0].scores).toEqual(original.scores);
    expect(returned.employees[0].reviewHistory?.[1]).toMatchObject({ action: 'HR 退回', reason: '请补充依据' });
    const resubmitted = submitDepartmentReview(returned, '陈宇璋', '产品部');
    const approved = reviewDepartmentSubmission(resubmitted, '陈宇璋', '产品部', 'approve');
    expect(approved.employees[0].scores.attitude).toBe(10);
    expect(approved.employees[0].scores.managerAdjustment).toBe(-2);
    expect(approved.employees[0].source).toEqual({ ...original.source, objectiveAdjustment: -2 });
    expect(approved.employees[0].reviewHistory?.map(item => item.action)).toEqual(['提交主管复核', 'HR 退回', '提交主管复核', 'HR 审核通过']);
    expect(() => publishKpiPeriod({ ...approved, cycleSettings: undefined })).toThrow('仍有员工未完成 HR 审核');
    const ready = { ...approved, cycleSettings: undefined, employees: approved.employees.map(employee => ({ ...employee, reviewStatus: '已通过' as const })), departmentMetrics: Object.fromEntries(Object.entries(approved.departmentMetrics || {}).map(([name, metric]) => [name, { ...metric, confirmed: true }])) };
    const published = publishKpiPeriod(ready);
    expect(published.published).toBe(true);
    expect(published.publishedAt).toBeTruthy();
    expect(() => submitDepartmentReview(published, '陈宇璋', '产品部')).toThrow();
    saveKpiDemo({ periods: { ...loadKpiDemo().periods, '2026-11': published } });
    expect(loadKpiDemo().periods['2026-11'].employees[0].reviewHistory).toHaveLength(4);
  });

  it('applies completion thresholds, enabled criteria and department redline formulas', () => {
    const period = loadKpiDemo().periods['2026-11'];
    period.departmentMetrics!.产品部 = { ...period.departmentMetrics!.产品部, goalCompletion: 0, confirmed: false };
    expect(departmentCoefficientPreview(period, '产品部')).toMatchObject({ adjustment: 0, coefficient: 0 });
    period.departmentMetrics!.产品部.goalCompletion = 95;
    expect(departmentCoefficientPreview(period, '产品部').adjustment).toBe(0.9);
    period.departmentMetrics!.产品部.goalCompletion = 95.01;
    expect(departmentCoefficientPreview(period, '产品部').adjustment).toBe(1);
    period.departmentMetrics!.产品部.businessRequirement = true;
    expect(departmentCoefficientPreview(period, '产品部').adjustment).toBe(1.1);
    period.departmentMetrics!.产品部.managementContribution = true;
    expect(departmentCoefficientPreview(period, '产品部').adjustment).toBe(1.2);
    period.departmentMetrics!.产品部.riskResponse = true;
    expect(departmentCoefficientPreview(period, '产品部').adjustment).toBe(1.2);
    period.departmentMetrics!.产品部.redlineChoice = '质量返工管理问题系数下调一档';
    expect(departmentCoefficientPreview(period, '产品部').coefficient).toBe(1.1);
    period.departmentMetrics!.产品部.redlineChoice = '质量返工管理问题系数下调二档';
    expect(departmentCoefficientPreview(period, '产品部').coefficient).toBe(1);
    period.departmentMetrics!.产品部.redlineChoice = '承诺型目标完成率碰触红线';
    expect(departmentCoefficientPreview(period, '产品部').coefficient).toBe(0.9);
    period.departmentMetrics!.产品部.redlineChoice = '输出成果造假';
    expect(departmentCoefficientPreview(period, '产品部').coefficient).toBe(0);
    period.departmentMetrics!.产品部.redlineChoice = '无';
    expect(departmentCoefficientPreview(period, '产品部').coefficient).toBe(1.2);
    period.departmentMetrics!.产品部.goalCompletion = 91;
    period.departmentMetrics!.产品部.redlineChoice = '质量返工管理问题系数下调二档';
    expect(departmentCoefficientPreview(period, '产品部').coefficient).toBe(0.8);
  });

  it('confirms all departments atomically and rejects published or empty periods', () => {
    const period = loadKpiDemo().periods['2026-11'];
    period.departmentMetrics!.产品部.businessRequirement = true;
    period.employees[0].redline = { type: '重大失职', impact: '绩效系数清零', active: true };
    const confirmed = confirmAllDepartmentCoefficients(period);
    expect(Object.values(confirmed.departmentMetrics || {}).every(metric => metric.confirmed)).toBe(true);
    expect(confirmed.departmentCoefficients.产品部).toBe(0.9);
    expect(period.departmentMetrics!.产品部.confirmed).toBe(false);
    expect(() => confirmAllDepartmentCoefficients({ ...confirmed, published: true })).toThrow('不可确认');
    expect(() => confirmAllDepartmentCoefficients({ ...period, employees: [] })).toThrow('没有可确认的部门');
  });

  it('completes all department reviews and restores the published employee result', () => {
    const state = loadKpiDemo();
    let period = withOpenManagerWindow(state.periods['2026-11']);
    period.reviewEnabled = true;
    period.employees[0].managerDraft = { attitude: 10, adjustment: -2, reason: '完成情况经主管复核' };
    const groups = [...new Set(period.employees.map(employee => `${employee.manager}|${employee.department}`))];
    for (const group of groups) {
      const [manager, department] = group.split('|');
      period = reviewDepartmentSubmission(submitDepartmentReview(period, manager, department), manager, department, 'approve');
    }
    expect(period.employees.every(employee => employee.reviewStatus === '已通过')).toBe(true);
    expect(period.employees[0].reviewHistory?.map(record => record.action)).toEqual(['提交主管复核', 'HR 审核通过']);
    expect(period.employees[0].scores.attitude).toBe(10);
    expect(period.employees[0].source.okrCompletion).toBe(93);
    expect(() => publishKpiPeriod({ ...period, cycleSettings: undefined })).toThrow('请先确认全部部门系数');
    period = { ...period, departmentMetrics: Object.fromEntries(Object.entries(period.departmentMetrics || {}).map(([name, metric]) => [name, { ...metric, confirmed: true }])), departmentCoefficients: Object.fromEntries([...new Set(period.employees.map(employee => employee.department))].map(name => [name, departmentCoefficientPreview(period, name).coefficient])) };
    state.periods['2026-11'] = publishKpiPeriod({ ...period, cycleSettings: undefined });
    saveKpiDemo(state);
    const restored = loadKpiDemo().periods['2026-11'];
    expect(restored.published).toBe(true);
    expect(scoreForEmployee(restored.employees[0])).toBe(87.33);
    expect(restored.employees[0].reviewHistory).toHaveLength(2);
    expect(() => reviewDepartmentSubmission(restored, '陈宇璋', '产品部', 'approve')).toThrow('已公示');
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
