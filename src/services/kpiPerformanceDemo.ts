import { attendanceKpiAdjustments, type AttendanceKpiAdjustment } from './attendanceDemo';
import { KPI_DEMO_STORAGE_KEY } from './performanceMonthLock';
import { calculateOkrScore, scoreObjectivesFor } from './okrPerformanceScore';
import type { OkrPerson, OkrRecord } from './okrRepository';
import mockOkrState from '../data/mockOkrState.json';
export { KPI_DEMO_STORAGE_KEY } from './performanceMonthLock';

export type KpiGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type KpiStatus = '待主管复核' | '待 HR 审核' | 'HR 已退回' | '已通过' | '待生成';

export interface KpiScores {
  objective: number;
  attendance: number;
  extraWork: number;
  attitude: number;
  review: number;
  managerAdjustment: number;
  temporaryTaskDeduction?: number;
}

export interface KpiSourceData {
  okrCompletion: number;
  objectiveFromOkr?: boolean;
  okrWeight?: number;
  objectiveAdjustment?: number;
  attendanceDays: number;
  lateCount: number;
  lateMinutes?: number;
  missingPunches: number;
  earlyLeaveCount?: number;
  absenceCount?: number;
  approvedOvertimeHours: number;
  reportLate: number;
  monthlyReportLate?: number;
  weeklyReportMissing?: number;
  goalLate?: boolean;
  reportMissing: number;
  tasksOverdue: number;
  leaveRecords?: Record<string, number>;
  attendanceApprovalSummary?: string[];
}

export interface KpiReviewRecord {
  id: string;
  action: '提交主管复核' | 'HR 退回' | 'HR 审核通过';
  actor: string;
  at: string;
  before: { attitude: number; adjustment: number; total: number; goalBonus?: number; goalDeduction?: number; temporaryTaskDeduction?: number; objectiveScore?: number; reviewScore?: number };
  proposed: { attitude: number; adjustment: number; total: number; goalBonus?: number; goalDeduction?: number; temporaryTaskDeduction?: number; objectiveScore?: number; reviewScore?: number };
  reason: string;
}

export interface KpiSourceCorrectionRecord {
  id: string;
  appealId: string;
  source: 'objective' | 'reports';
  before: Record<string, number>;
  after: Record<string, number>;
  reason: string;
  actor: string;
  at: string;
}

export interface KpiEmployee {
  id: string;
  name: string;
  department: string;
  position: string;
  manager: string;
  scores: KpiScores;
  source: KpiSourceData;
  reviewStatus: KpiStatus;
  managerDraft?: { attitude: number; adjustment: number; goalBonus?: number; goalDeduction?: number; temporaryTaskDeduction?: number; reason: string };
  scoreAllocationVersion?: 2;
  reviewHistory?: KpiReviewRecord[];
  approvedSourceCorrections?: KpiSourceCorrectionRecord[];
  hrNote?: string;
  redline?: { type: string; impact: string; active: boolean };
  sourceCorrection?: { objective?: boolean; reports?: boolean };
}

export type KpiReviewDecision = 'approve' | 'return';

export interface KpiPeriod {
  employees: KpiEmployee[];
  generated: boolean;
  published: boolean;
  reviewEnabled: boolean;
  reviewScoresInitialized?: boolean;
  generatedAt?: string;
  publishedAt?: string;
  sourceSyncedAt?: string;
  cycleSettings?: KpiCycleSettings;
  departmentCoefficients: Record<string, number>;
  departmentMetrics?: Record<string, KpiDepartmentMetrics>;
}

export interface KpiCycleSettings {
  monthlyGoalDeadline?: string;
  managerReview: { startAt: string; endAt: string };
  appealConfirmation: { startAt: string; endAt: string };
  finalPublicationAt: string;
}

export function validateKpiCycleSettings(settings: KpiCycleSettings): string | null {
  if (settings.monthlyGoalDeadline && !Number.isFinite(new Date(settings.monthlyGoalDeadline).getTime())) return '请设置有效的月度目标最迟提交时间';
  const dates = [settings.managerReview.startAt, settings.managerReview.endAt, settings.appealConfirmation.startAt, settings.appealConfirmation.endAt, settings.finalPublicationAt].map(value => new Date(value).getTime());
  if (dates.some(value => !Number.isFinite(value))) return '请完整设置三个周期时间';
  const [reviewStart, reviewEnd, appealStart, appealEnd, publicationAt] = dates;
  if (reviewEnd <= reviewStart) return '主管复核结束时间必须晚于开始时间';
  if (appealEnd <= appealStart) return '申诉确认结束时间必须晚于开始时间';
  if (appealStart < reviewEnd) return '申诉确认时间须在主管复核结束后开始';
  if (publicationAt <= reviewEnd) return '最终公示时间须晚于主管复核结束时间';
  if (appealEnd < publicationAt) return '申诉确认结束时间须晚于最终公示时间';
  return null;
}

export const isWithinKpiWindow = (window: { startAt: string; endAt: string } | undefined, now = Date.now()) =>
  !!window && now >= new Date(window.startAt).getTime() && now <= new Date(window.endAt).getTime();

export const effectiveKpiSourceData = (employee: KpiEmployee): KpiSourceData => employee.approvedSourceCorrections?.reduce((source, record) => ({ ...source, ...record.after }), employee.source) || employee.source;

export const isMonthlyGoalLate = (records: OkrRecord[], ownerId: string, month: string, deadline?: string): boolean => {
  if (!deadline) return false;
  const limit = new Date(deadline).getTime();
  if (!Number.isFinite(limit)) return false;
  return records.some(record => record.kind === 'objective' && record.ownerId === ownerId && record.periodKey === month
    && record.payload.goalLevel === 'personal' && record.status !== 'draft'
    && Number.isFinite(new Date(record.submittedAt || (record.changeRequest?.purpose === 'initial' ? record.changeRequest.requestedAt : '') || '').getTime())
    && new Date(record.submittedAt || (record.changeRequest?.purpose === 'initial' ? record.changeRequest.requestedAt : '') || '').getTime() > limit);
};

export const attendanceScoreFor = (source: KpiSourceData): number => {
  const lateMinutes = source.lateMinutes ?? 0;
  const personalLeave = source.leaveRecords?.事假 ?? 0;
  if (lateMinutes > 30 || source.missingPunches > 3 || (source.earlyLeaveCount ?? 0) > 0 || personalLeave > 3 || (source.absenceCount ?? 0) > 0) return 0;
  const lateScore = lateMinutes > 15 ? 8 : 10;
  const leaveScore = personalLeave > 2 ? 3 : personalLeave > 1 ? 6 : personalLeave > 0 ? 8 : 10;
  const paidLeave = (source.leaveRecords?.年假 ?? 0) + (source.leaveRecords?.调休 ?? 0);
  return Math.min(lateScore, leaveScore, paidLeave > 3 ? 8 : 10);
};

export const autoPublishKpiPeriod = (period: KpiPeriod, now = Date.now()): KpiPeriod => {
  if (!period.cycleSettings || period.published || now < new Date(period.cycleSettings.finalPublicationAt).getTime()) return period;
  if (!period.generated || period.employees.some(employee => employee.reviewStatus !== '已通过')) return period;
  const departments = [...new Set(period.employees.map(employee => employee.department))];
  if (!departments.length || departments.some(name => !period.departmentMetrics?.[name]?.confirmed)) return period;
  return { ...period, published: true, publishedAt: new Date(now).toLocaleString('zh-CN', { hour12: false }) };
};

export interface KpiDepartmentMetrics {
  teamCompletion: number;
  goalCompletion?: number;
  goalBase?: number;
  goalDeduction?: number;
  goalScore?: number | null;
  redlineChoice?: DepartmentRedlineChoice;
  businessRequirement?: boolean;
  managementContribution?: boolean;
  riskResponse?: boolean;
  teamDeliveryMiss?: boolean;
  confirmed: boolean;
}

export type DepartmentRedlineChoice = '无' | '输出成果造假' | '承诺型目标完成率碰触红线' | '质量返工管理问题系数下调二档' | '质量返工管理问题系数下调一档';
export const departmentRedlineChoices: DepartmentRedlineChoice[] = ['无', '输出成果造假', '承诺型目标完成率碰触红线', '质量返工管理问题系数下调二档', '质量返工管理问题系数下调一档'];

export const departmentGoalSummary = (records: OkrRecord[], people: OkrPerson[], month: string, department: string) => {
  const owner = people.find(person => person.id.startsWith('kpi-manager-') && person.department === department);
  const goals = owner ? scoreObjectivesFor(records, people, owner.id, month, 'department') : [];
  const score = calculateOkrScore(goals, []);
  return {
    completion: goals.filter(goal => goal.type === 'target').reduce((sum, goal) => sum + goal.weight * goal.progress / 100, 0),
    base: score.base,
    deduction: score.automaticDeduction,
    total: score.total,
  };
};

const demoDepartmentGoal = (month: string, department: string) => departmentGoalSummary(
  mockOkrState.okrRecords as OkrRecord[], mockOkrState.okrPeople as OkrPerson[], month, department,
);

const roundFactor = (value: number) => Math.round(value * 100) / 100;

export const departmentCoefficientPreview = (period: KpiPeriod, department: string) => {
  const members = period.employees.filter(employee => employee.department === department);
  const metrics = period.departmentMetrics?.[department];
  const objectiveCompletion = metrics?.goalCompletion ?? 0;
  const baseScore = metrics?.goalScore ?? null;
  const initialCoefficient = 1;
  const memberCompletion = members.length ? members.reduce((sum, employee) => sum + effectiveKpiSourceData(employee).okrCompletion, 0) / members.length : 0;
  const delayedSubmissionCount = members.filter(employee => employee.source.goalLate).length;
  const touchedRedline = members.some(employee => employee.redline?.active);
  const majorRedline = members.some(employee => employee.redline?.active && employee.redline.type === '重大失职');
  const redlineChoice = metrics?.redlineChoice ?? '无';
  const responsibilityCoefficient = touchedRedline || memberCompletion < 80 || delayedSubmissionCount > members.length * 0.3 ? 0.8 : initialCoefficient;
  const enabledCriteria = [metrics?.businessRequirement, metrics?.managementContribution, metrics?.riskResponse].filter(Boolean).length;
  const adjustment = objectiveCompletion === 0 ? 0 : objectiveCompletion <= 95 ? 0.9 : enabledCriteria >= 2 ? 1.2 : enabledCriteria === 1 ? 1.1 : 1;
  const coefficient = redlineChoice === '输出成果造假' ? 0
    : redlineChoice === '承诺型目标完成率碰触红线' ? Math.min(0.9, adjustment)
    : redlineChoice === '质量返工管理问题系数下调二档' ? roundFactor(Math.max(0.8, adjustment - 0.2))
    : redlineChoice === '质量返工管理问题系数下调一档' ? roundFactor(Math.max(0.8, adjustment - 0.1)) : adjustment;
  return { objectiveCompletion, baseScore, initialCoefficient, memberCompletion, delayedSubmissionCount, touchedRedline, majorRedline, responsibilityCoefficient, adjustment, coefficient, redlineChoice };
};

const recordReview = (employee: KpiEmployee, action: KpiReviewRecord['action'], actor: string, reason: string): KpiEmployee => {
  const draft = employee.managerDraft;
  const proposedScores = draft ? { ...employee.scores, attitude: draft.attitude, managerAdjustment: draft.adjustment, temporaryTaskDeduction: draft.temporaryTaskDeduction ?? 0 } : employee.scores;
  const proposed = draft ? { ...employee, scores: proposedScores, scoreAllocationVersion: 2 as const } : employee;
  const beforeDimensions = kpiDimensionScores(employee);
  const proposedDimensions = kpiDimensionScores(proposed);
  const record: KpiReviewRecord = {
    id: `${employee.id}-${Date.now()}-${employee.reviewHistory?.length ?? 0}`, action, actor, at: new Date().toISOString(),
    before: { attitude: employee.scores.attitude, adjustment: employee.scores.managerAdjustment, goalBonus: Math.max(0, employee.scores.managerAdjustment), goalDeduction: Math.max(0, -employee.scores.managerAdjustment), temporaryTaskDeduction: employee.scores.temporaryTaskDeduction ?? 0, objectiveScore: beforeDimensions.objective, reviewScore: beforeDimensions.review, total: scoreForEmployee(employee) },
    proposed: { attitude: proposedScores.attitude, adjustment: proposedScores.managerAdjustment, ...(draft && (draft.goalBonus !== undefined || draft.goalDeduction !== undefined) ? { goalBonus: draft.goalBonus ?? Math.max(0, draft.adjustment), goalDeduction: draft.goalDeduction ?? Math.max(0, -draft.adjustment) } : {}), temporaryTaskDeduction: proposedScores.temporaryTaskDeduction ?? 0, objectiveScore: proposedDimensions.objective, reviewScore: proposedDimensions.review, total: scoreForEmployee(proposed) },
    reason,
  };
  return { ...employee, reviewHistory: [...(employee.reviewHistory ?? []), record] };
};

export const submitDepartmentReview = (period: KpiPeriod, manager: string, department: string): KpiPeriod => {
  if (!period.generated || period.published) throw new Error('当前月份不可提交复核');
  if (!period.cycleSettings) throw new Error('请先设置主管复核时间范围');
  if (!isWithinKpiWindow(period.cycleSettings.managerReview)) throw new Error('当前不在主管复核时间范围内');
  const targets = period.employees.filter(employee => employee.manager === manager && employee.department === department);
  if (!targets.length || targets.some(employee => !['待主管复核', 'HR 已退回'].includes(employee.reviewStatus))) throw new Error('该部门存在不可提交的员工');
  return { ...period, employees: period.employees.map(employee => targets.some(target => target.id === employee.id)
    ? submitManagerReview(recordReview({ ...employee, managerDraft: employee.managerDraft || { attitude: employee.scores.attitude, adjustment: employee.scores.managerAdjustment, temporaryTaskDeduction: employee.scores.temporaryTaskDeduction ?? 0, reason: '主管确认当前评分' } }, '提交主管复核', manager, employee.managerDraft?.reason || '主管确认当前评分')) : employee) };
};

export const submitEmployeeReview = (period: KpiPeriod, employeeId: string, manager: string): KpiPeriod => {
  if (!period.generated || period.published) throw new Error('当前月份不可提交复核');
  if (!period.cycleSettings || !isWithinKpiWindow(period.cycleSettings.managerReview)) throw new Error('当前不在主管复核时间范围内');
  const employee = period.employees.find(item => item.id === employeeId && item.manager === manager);
  if (!employee) throw new Error('只能提交本人负责的员工');
  const submitted = submitManagerReview(recordReview(employee, '提交主管复核', manager, employee.managerDraft?.reason || ''));
  return { ...period, employees: period.employees.map(item => item.id === employeeId ? submitted : item) };
};

export const reviewDepartmentSubmission = (period: KpiPeriod, manager: string, department: string, decision: KpiReviewDecision, reason = ''): KpiPeriod => {
  if (period.published) throw new Error('已公示月份不可审核');
  const targets = period.employees.filter(employee => employee.manager === manager && employee.department === department);
  if (!targets.length || targets.some(employee => employee.reviewStatus !== '待 HR 审核')) throw new Error('该部门尚未全部提交 HR 审核');
  if (decision === 'return' && !reason.trim()) throw new Error('请填写退回原因');
  return { ...period, employees: period.employees.map(employee => targets.some(target => target.id === employee.id)
    ? reviewManagerSubmission(recordReview(employee, decision === 'approve' ? 'HR 审核通过' : 'HR 退回', 'HR', decision === 'approve' ? employee.managerDraft?.reason || '确认当前评分' : reason.trim()), decision, reason) : employee) };
};

export const reviewEmployeeSubmission = (period: KpiPeriod, employeeId: string, decision: KpiReviewDecision, reason = ''): KpiPeriod => {
  if (period.published) throw new Error('已公示月份不可审核');
  const employee = period.employees.find(item => item.id === employeeId);
  if (!employee) throw new Error('未找到待审核员工');
  if (employee.reviewStatus !== '待 HR 审核') throw new Error('当前员工尚未提交 HR 审核');
  const reviewed = reviewManagerSubmission(recordReview(employee, decision === 'approve' ? 'HR 审核通过' : 'HR 退回', 'HR', decision === 'approve' ? employee.managerDraft?.reason || '确认当前评分' : reason.trim()), decision, reason);
  return { ...period, employees: period.employees.map(item => item.id === employeeId ? reviewed : item) };
};

export const publishKpiPeriod = (period: KpiPeriod): KpiPeriod => {
  if (!period.generated || period.published) throw new Error('当前月份不可公示');
  if (period.cycleSettings) throw new Error('已设置自动公示周期，请等待最终公示时间');
  if (period.employees.some(employee => employee.reviewStatus !== '已通过')) throw new Error('仍有员工未完成 HR 审核');
  if ([...new Set(period.employees.map(employee => employee.department))].some(name => !period.departmentMetrics?.[name]?.confirmed)) throw new Error('请先确认全部部门系数');
  return { ...period, published: true, publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }) };
};

export const confirmAllDepartmentCoefficients = (period: KpiPeriod): KpiPeriod => {
  if (!period.generated || period.published) throw new Error('当前月份不可确认部门系数');
  const departments = [...new Set(period.employees.map(employee => employee.department))];
  if (!departments.length) throw new Error('本月没有可确认的部门');
  if (departments.some(name => period.departmentMetrics?.[name]?.goalScore == null)) throw new Error('请先确认全部部门目标权重');
  return {
    ...period,
    departmentCoefficients: Object.fromEntries(departments.map(name => [name, departmentCoefficientPreview(period, name).coefficient])),
    departmentMetrics: Object.fromEntries(departments.map(name => [name, {
      teamCompletion: 100,
      ...period.departmentMetrics?.[name],
      confirmed: true,
    }])),
  };
};

export interface KpiDemoState {
  periods: Record<string, KpiPeriod>;
}

const buildEmployees = (month: string): KpiEmployee[] => {
  const rows: KpiEmployee[] = [
  { id: 'e-01', name: '林知夏', department: '产品部', position: '高级产品经理', manager: '陈宇璋', scores: { objective: 56, attendance: 10, extraWork: 4, attitude: 14, review: 9, managerAdjustment: 0 }, source: { okrCompletion: 93, attendanceDays: 22, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 12, reportLate: 0, reportMissing: 0, tasksOverdue: 0, leaveRecords: { '年假': 0, '事假': 0, '病假': 0 } }, reviewStatus: '已通过' },
  { id: 'e-02', name: '周予安', department: '产品部', position: '产品经理', manager: '陈宇璋', scores: { objective: 53, attendance: 9, extraWork: 3, attitude: 13, review: 9, managerAdjustment: 1 }, source: { okrCompletion: 88, attendanceDays: 22, lateCount: 1, missingPunches: 1, approvedOvertimeHours: 8, reportLate: 0, reportMissing: 0, tasksOverdue: 1, leaveRecords: { '年假': 0, '事假': 0, '病假': 0 } }, reviewStatus: '待 HR 审核', managerDraft: { attitude: 13, adjustment: 1, reason: '按期完成重点版本方案，并主动协调研发风险。' } },
  { id: 'e-03', name: '顾清和', department: '研发部', position: '前端工程师', manager: '陈宇璋', scores: { objective: 50, attendance: 10, extraWork: 5, attitude: 12, review: 8, managerAdjustment: 0 }, source: { okrCompletion: 84, attendanceDays: 22, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 18, reportLate: 1, reportMissing: 0, tasksOverdue: 1, leaveRecords: { '年假': 1, '事假': 0, '病假': 0 } }, reviewStatus: '待主管复核' },
  { id: 'e-04', name: '许明川', department: '研发部', position: '后端工程师', manager: '赵书琳', scores: { objective: 47, attendance: 8, extraWork: 4, attitude: 11, review: 7, managerAdjustment: -1 }, source: { okrCompletion: 78, attendanceDays: 21, lateCount: 2, missingPunches: 1, approvedOvertimeHours: 14, reportLate: 2, reportMissing: 0, tasksOverdue: 2, leaveRecords: { '年假': 0, '事假': 1, '病假': 0 } }, reviewStatus: '待 HR 审核', managerDraft: { attitude: 11, adjustment: -1, reason: '迭代交付存在延迟，复盘材料两次迟交。' } },
  { id: 'e-05', name: '沈嘉禾', department: '交付部', position: '交付顾问', manager: '王佳乐', scores: { objective: 50, attendance: 10, extraWork: 3, attitude: 13, review: 8, managerAdjustment: 0 }, source: { okrCompletion: 84, attendanceDays: 22, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 5, reportLate: 1, reportMissing: 0, tasksOverdue: 2, leaveRecords: { '年假': 0, '事假': 0, '病假': 1 } }, reviewStatus: '已通过' },
  { id: 'e-06', name: '唐以宁', department: '运营部', position: '运营专员', manager: '毛景强', scores: { objective: 39, attendance: 7, extraWork: 1, attitude: 10, review: 6, managerAdjustment: -2 }, source: { okrCompletion: 65, attendanceDays: 20, lateCount: 3, missingPunches: 1, approvedOvertimeHours: 2, reportLate: 2, reportMissing: 1, tasksOverdue: 3, leaveRecords: { '年假': 0, '事假': 0, '病假': 2 } }, reviewStatus: '待 HR 审核' },
  ];
  const attendanceFacts: Record<string, Pick<KpiSourceData, 'lateMinutes' | 'earlyLeaveCount' | 'absenceCount'>> = {
    'e-01': { lateMinutes: 0, earlyLeaveCount: 0, absenceCount: 0 },
    'e-02': { lateMinutes: 18, earlyLeaveCount: 0, absenceCount: 0 },
    'e-03': { lateMinutes: 12, earlyLeaveCount: 0, absenceCount: 0 },
    'e-04': { lateMinutes: 25, earlyLeaveCount: 2, absenceCount: 0 },
    'e-05': { lateMinutes: 0, earlyLeaveCount: 0, absenceCount: 0 },
    'e-06': { lateMinutes: 35, earlyLeaveCount: 0, absenceCount: 0 },
  };
  const seeded = rows.map(employee => {
    const source = { ...employee.source, ...attendanceFacts[employee.id], objectiveAdjustment: employee.scores.managerAdjustment };
    const attendance = attendanceScoreFor(source);
    return { ...employee, source, scores: { ...employee.scores, attendance, extraWork: extraWorkScoreFor(source.approvedOvertimeHours, attendance) } };
  });
  return month === '2026-10' ? seeded.map(employee => ({
    ...employee,
    scores: { ...employee.scores, attendance: rows.find(row => row.id === employee.id)!.scores.attendance, extraWork: rows.find(row => row.id === employee.id)!.scores.extraWork },
    reviewStatus: '已通过',
  })) : seeded;
};

export const KPI_MONTHS = ['2026-11', '2026-10', '2026-09'];
export const KPI_DIMENSIONS = [
  { key: 'objective', label: '月度目标（演示）', max: 60, weight: '60%' },
  { key: 'attendance', label: '全勤', max: 10, weight: '10%' },
  { key: 'extraWork', label: '额外投入', max: 10, weight: '最高10分' },
  { key: 'attitude', label: '工作态度', max: 15, weight: '15%' },
  { key: 'review', label: '复盘总结', max: 10, weight: '10%' },
] as const;

export const gradeForScore = (score: number): { grade: KpiGrade; coefficient: number } => {
  if (score > 95) return { grade: 'S', coefficient: 1.5 };
  if (score > 90) return { grade: 'A', coefficient: 1.2 };
  if (score > 80) return { grade: 'B', coefficient: 1.0 };
  if (score > 70) return { grade: 'C', coefficient: 0.8 };
  if (score > 60) return { grade: 'D', coefficient: 0.5 };
  return { grade: 'E', coefficient: 0 };
};

export const extraWorkScoreFor = (hours: number, attendanceScore: number) => Math.round(Math.min(attendanceScore === 0 ? 5 : 10, Math.max(0, hours) / 18 * 5) * 100) / 100;

export const reportScoreFor = (source: Pick<KpiSourceData, 'reportLate' | 'monthlyReportLate' | 'weeklyReportMissing' | 'reportMissing'>) =>
  (source.weeklyReportMissing ?? 0) >= 3 || source.reportMissing >= 1
    ? 0
    : Math.max(0, 10 - 2 * (source.reportLate + (source.monthlyReportLate ?? 0)));

export const scoreForEmployee = (employee: KpiEmployee) => {
  const { objective, review } = kpiDimensionScores(employee);
  return Math.round(Math.max(0, Math.min(objective <= 50 ? 90 : 100,
  objective + employee.scores.attendance + employee.scores.extraWork + employee.scores.attitude
  + review + (employee.scoreAllocationVersion === 2 ? 0 : employee.scores.managerAdjustment),
  )) * 100) / 100;
};

export const kpiDimensionScores = (employee: KpiEmployee) => {
  const objectiveBase = employee.approvedSourceCorrections?.filter(record => record.source === 'objective').at(-1)?.after.objectiveScore ?? employee.scores.objective;
  const reviewBase = employee.approvedSourceCorrections?.filter(record => record.source === 'reports').at(-1)?.after.reviewScore ?? employee.scores.review;
  return employee.scoreAllocationVersion === 2
    ? { objective: Math.min(60, Math.max(0, objectiveBase + employee.scores.managerAdjustment)), review: Math.min(10, Math.max(0, reviewBase + (employee.scores.temporaryTaskDeduction ?? 0))) }
    : { objective: objectiveBase, review: reviewBase };
};

export const sourceAdjustmentFor = (employee: KpiEmployee) => employee.scores.managerAdjustment;

export const goalAdjustmentDraft = (employee: KpiEmployee) => ({
  bonus: employee.managerDraft?.goalBonus ?? Math.max(0, employee.managerDraft?.adjustment ?? employee.scores.managerAdjustment),
  deduction: employee.managerDraft?.goalDeduction ?? Math.max(0, -(employee.managerDraft?.adjustment ?? employee.scores.managerAdjustment)),
});

const validManagerDraft = (draft: NonNullable<KpiEmployee['managerDraft']>) =>
  Number.isFinite(draft.attitude) && draft.attitude >= 0 && draft.attitude <= 15
  && Number.isFinite(draft.adjustment)
  && Number.isFinite(draft.temporaryTaskDeduction ?? 0) && (draft.temporaryTaskDeduction ?? 0) <= 0
  && (draft.goalBonus === undefined || Number.isFinite(draft.goalBonus) && draft.goalBonus >= 0)
  && (draft.goalDeduction === undefined || Number.isFinite(draft.goalDeduction) && draft.goalDeduction >= 0)
  && (draft.goalBonus === undefined && draft.goalDeduction === undefined
    || draft.adjustment === (draft.goalBonus ?? Math.max(0, draft.adjustment)) - (draft.goalDeduction ?? Math.max(0, -draft.adjustment)));

const verifiedAttendance = (employee: KpiEmployee, baseline: KpiEmployee, adjustment?: AttendanceKpiAdjustment) => {
  const source = {
    attendanceDays: baseline.source.attendanceDays,
    lateCount: Math.max(0, baseline.source.lateCount + (adjustment?.lateCountDelta || 0)),
    lateMinutes: baseline.source.lateMinutes,
    missingPunches: Math.max(0, baseline.source.missingPunches + (adjustment?.missingPunchDelta || 0)),
    earlyLeaveCount: baseline.source.earlyLeaveCount,
    absenceCount: baseline.source.absenceCount,
    leaveRecords: adjustment?.hasLeaveApplications ? adjustment.leaveRecords : baseline.source.leaveRecords,
    attendanceApprovalSummary: adjustment?.approvalSummary || [],
  };
  return { source, score: attendanceScoreFor({ ...employee.source, ...source }) };
};

export const syncKpiSources = (period: KpiPeriod, month: string): KpiPeriod => {
  if (period.published) return period;
  const baseline = new Map(buildEmployees(month).map(employee => [employee.id, employee]));
  const attendanceAdjustments = attendanceKpiAdjustments(month);
  const changedDepartments = new Set<string>();
  const synced: KpiPeriod = {
    ...period,
    sourceSyncedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    employees: period.employees.map(employee => {
      const source = baseline.get(employee.id);
      if (!source) return employee;
      const attendanceAdjustment = attendanceAdjustments[employee.name];
      if (!employee.sourceCorrection?.objective && !employee.source.objectiveFromOkr && employee.source.okrCompletion !== source.source.okrCompletion) changedDepartments.add(employee.department);
      const attendance = verifiedAttendance(employee, source, attendanceAdjustment);
      return {
        ...employee,
        source: {
          ...employee.source,
          ...(!employee.sourceCorrection?.objective && !employee.source.objectiveFromOkr && { okrCompletion: source.source.okrCompletion }),
          ...attendance.source,
          approvedOvertimeHours: source.source.approvedOvertimeHours,
          ...(!employee.sourceCorrection?.reports && {
            reportLate: source.source.reportLate,
            monthlyReportLate: source.source.monthlyReportLate ?? 0,
            weeklyReportMissing: source.source.weeklyReportMissing ?? 0,
            reportMissing: source.source.reportMissing,
            tasksOverdue: source.source.tasksOverdue,
          }),
        },
        scores: {
          ...employee.scores,
          ...(!employee.sourceCorrection?.objective && !employee.source.objectiveFromOkr && { objective: source.scores.objective }),
          attendance: attendance.score,
          extraWork: extraWorkScoreFor(source.source.approvedOvertimeHours, attendance.score),
          ...(!employee.sourceCorrection?.reports && { review: reportScoreFor(source.source) }),
        },
      };
    }),
  };
  if (changedDepartments.size) {
    synced.departmentMetrics = { ...period.departmentMetrics, ...Object.fromEntries([...changedDepartments].map(name => [name, { teamCompletion: 100, ...period.departmentMetrics?.[name], confirmed: false }])) };
  }
  return synced;
};

export const submitManagerReview = (employee: KpiEmployee): KpiEmployee => {
  const draft = employee.managerDraft;
  if (!draft?.reason.trim()) throw new Error('请填写复核说明');
  if (!validManagerDraft(draft)) throw new Error('请核对评分：目标加分和减分不得为负，临时任务只允许扣分');
  if (!['待主管复核', 'HR 已退回'].includes(employee.reviewStatus)) throw new Error('当前状态不可提交主管复核');
  return { ...employee, reviewStatus: '待 HR 审核', hrNote: `主管已提交：${draft.reason.trim()}` };
};

export const reviewManagerSubmission = (employee: KpiEmployee, decision: KpiReviewDecision, reason = ''): KpiEmployee => {
  if (employee.reviewStatus !== '待 HR 审核') throw new Error('当前状态没有待审核的绩效');
  if (decision === 'return' && !reason.trim()) throw new Error('请填写退回原因');
  if (decision === 'return') {
    return { ...employee, reviewStatus: 'HR 已退回', hrNote: `HR 退回：${reason.trim()}` };
  }
  const draft = employee.managerDraft;
  if (draft && !validManagerDraft(draft)) throw new Error('请核对评分：目标加分和减分不得为负，临时任务只允许扣分');
  return {
    ...employee,
    scores: draft ? { ...employee.scores, attitude: draft.attitude, managerAdjustment: draft.adjustment, temporaryTaskDeduction: draft.temporaryTaskDeduction ?? 0 } : employee.scores,
    scoreAllocationVersion: draft ? 2 : employee.scoreAllocationVersion,
    source: draft ? { ...employee.source, objectiveAdjustment: draft.adjustment } : employee.source,
    reviewStatus: '已通过',
    hrNote: draft ? `HR 审核通过：${draft.reason.trim()}` : 'HR 已确认系统计算结果。',
  };
};

const initialState = (): KpiDemoState => ({
  periods: Object.fromEntries(KPI_MONTHS.map((month, index) => [month, {
    employees: month === '2026-11' ? buildEmployees(month).map(employee => ({ ...employee, scores: { ...employee.scores, attitude: 0, managerAdjustment: 0 }, source: { ...employee.source, objectiveAdjustment: 0 }, redline: undefined, reviewStatus: '待主管复核', managerDraft: undefined, hrNote: undefined })) : buildEmployees(month),
    generated: month !== '2026-09',
    published: month === '2026-10',
    reviewEnabled: month !== '2026-09',
    reviewScoresInitialized: true,
    generatedAt: month === '2026-11' ? '2026-11-01 09:30' : month === '2026-10' ? '2026-11-01 09:30' : undefined,
    publishedAt: month === '2026-10' ? '2026-11-01 09:30' : undefined,
    departmentCoefficients: { 产品部: 1, 研发部: 1, 交付部: 1, 运营部: 1 },
    departmentMetrics: Object.fromEntries(['产品部', '研发部', '交付部', '运营部'].map(name => {
      const goal = demoDepartmentGoal(month, name);
      return [name, { teamCompletion: 100, goalCompletion: goal.completion, goalBase: goal.base, goalDeduction: goal.deduction, goalScore: goal.total, redlineChoice: '无', confirmed: month === '2026-10' }];
    })),
  }])) as KpiDemoState['periods'],
});

const withVerifiedAttendance = (state: KpiDemoState): KpiDemoState => {
  for (const [month, period] of Object.entries(state.periods)) {
    if (period.published) continue;
    const baseline = new Map(buildEmployees(month).map(employee => [employee.id, employee]));
    const adjustments = attendanceKpiAdjustments(month);
    period.employees = period.employees.map(employee => {
      const source = baseline.get(employee.id);
      if (!source) return employee;
      const attendance = verifiedAttendance(employee, source, adjustments[employee.name]);
      const goalLate = period.cycleSettings?.monthlyGoalDeadline && employee.source.goalLate === undefined
        ? isMonthlyGoalLate(mockOkrState.okrRecords as OkrRecord[], employee.id, month, period.cycleSettings.monthlyGoalDeadline)
        : employee.source.goalLate;
      const reportSource = { ...employee.source, monthlyReportLate: employee.source.monthlyReportLate ?? 0, weeklyReportMissing: employee.source.weeklyReportMissing ?? 0 };
      return { ...employee, source: { ...reportSource, ...attendance.source, goalLate }, scores: { ...employee.scores, attendance: attendance.score, extraWork: extraWorkScoreFor(employee.source.approvedOvertimeHours, attendance.score), ...(!employee.sourceCorrection?.reports && { review: reportScoreFor(reportSource) }) } };
    });
  }
  return state;
};

export const loadKpiDemo = (): KpiDemoState => {
  try {
    const raw = localStorage.getItem(KPI_DEMO_STORAGE_KEY);
    if (!raw) return withVerifiedAttendance(initialState());
    const parsed = JSON.parse(raw) as KpiDemoState;
    if (!parsed.periods || !parsed.periods['2026-10']) return withVerifiedAttendance(initialState());
    Object.entries(parsed.periods).forEach(([month, period]) => {
      period.departmentMetrics ||= Object.fromEntries([...new Set(period.employees.map(employee => employee.department))]
        .map(name => [name, { teamCompletion: 100, confirmed: period.published }]));
      for (const [name, metric] of Object.entries(period.departmentMetrics)) {
        if (metric.goalScore !== undefined) continue;
        const goal = demoDepartmentGoal(month, name);
        period.departmentMetrics[name] = { ...metric, goalCompletion: goal.completion, goalBase: goal.base, goalDeduction: goal.deduction, goalScore: goal.total, redlineChoice: '无', confirmed: period.published && metric.confirmed };
      }
      period.employees.forEach(employee => {
        employee.source.objectiveAdjustment = employee.scores.managerAdjustment;
      });
      if (!period.reviewScoresInitialized && !period.published && period.reviewEnabled) {
        period.employees = period.employees.map(employee => employee.reviewStatus === '待主管复核' && !employee.reviewHistory?.length
          ? { ...employee, scores: { ...employee.scores, attitude: 0, managerAdjustment: 0 }, source: { ...employee.source, objectiveAdjustment: 0 } } : employee);
      }
      period.reviewScoresInitialized = true;
    });
    const reviewDemoPeriod = parsed.periods['2026-11'];
    if (reviewDemoPeriod && !reviewDemoPeriod.generated && !reviewDemoPeriod.published) {
      parsed.periods['2026-11'] = {
        ...reviewDemoPeriod,
        generated: true,
        generatedAt: '2026-11-01 09:30',
        reviewEnabled: true,
        employees: reviewDemoPeriod.employees.map(employee => ({ ...employee, scores: { ...employee.scores, attitude: 0, managerAdjustment: 0 }, source: { ...employee.source, objectiveAdjustment: 0 }, reviewStatus: '待主管复核', managerDraft: undefined, hrNote: undefined })),
      };
    }
    return withVerifiedAttendance(parsed);
  } catch {
    return withVerifiedAttendance(initialState());
  }
};

export const saveKpiDemo = (state: KpiDemoState) => {
  localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
};

export const createKpiPeriod = (period: KpiPeriod): KpiPeriod => ({
  ...period,
  generated: true,
  published: false,
  publishedAt: undefined,
  reviewScoresInitialized: true,
  departmentMetrics: Object.fromEntries(Object.entries(period.departmentMetrics || {}).map(([name, metric]) => [name, { ...metric, confirmed: false }])),
  generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  employees: period.employees.map(employee => ({
    ...employee,
    scores: period.reviewEnabled ? { ...employee.scores, attitude: 0, managerAdjustment: 0, temporaryTaskDeduction: 0 } : employee.scores,
    scoreAllocationVersion: period.reviewEnabled ? undefined : employee.scoreAllocationVersion,
    source: period.reviewEnabled ? { ...employee.source, objectiveAdjustment: 0 } : employee.source,
    reviewStatus: period.reviewEnabled ? '待主管复核' : '待 HR 审核',
    managerDraft: undefined,
    reviewHistory: [],
    hrNote: undefined,
  })),
});
