export type KpiGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type KpiStatus = '待主管复核' | '待 HR 审核' | 'HR 已退回' | '已通过' | '待生成';

export interface KpiScores {
  objective: number;
  attendance: number;
  extraWork: number;
  attitude: number;
  review: number;
  managerAdjustment: number;
}

export interface KpiSourceData {
  okrCompletion: number;
  attendanceDays: number;
  lateCount: number;
  missingPunches: number;
  approvedOvertimeHours: number;
  reportLate: number;
  reportMissing: number;
  tasksOverdue: number;
  leaveRecords?: Record<string, number>;
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
  managerDraft?: { attitude: number; adjustment: number; reason: string };
  hrNote?: string;
  redline?: { type: string; impact: string; active: boolean };
}

export type KpiReviewDecision = 'approve' | 'return';

export interface KpiPeriod {
  employees: KpiEmployee[];
  generated: boolean;
  published: boolean;
  reviewEnabled: boolean;
  generatedAt?: string;
  departmentCoefficients: Record<string, number>;
  departmentMetrics?: Record<string, { teamCompletion: number; confirmed: boolean }>;
}

export const departmentCoefficientPreview = (period: KpiPeriod, department: string) => {
  const members = period.employees.filter(employee => employee.department === department);
  if (!members.length) return { objectiveCompletion: 0, teamCompletion: 0, majorRedline: false, adjustment: 1, coefficient: 1 };
  const objectiveCompletion = members.reduce((sum, employee) => sum + employee.source.okrCompletion, 0) / members.length;
  const teamCompletion = period.departmentMetrics?.[department]?.teamCompletion ?? 100;
  const majorRedline = members.some(employee => employee.redline?.active && employee.redline.type === '重大失职');
  const adjustment = objectiveCompletion >= 100 && teamCompletion >= 100 ? 1.1 : 1;
  return { objectiveCompletion, teamCompletion, majorRedline, adjustment, coefficient: majorRedline ? 0.9 : adjustment };
};

export const submitDepartmentReview = (period: KpiPeriod, manager: string, department: string): KpiPeriod => {
  if (!period.generated || period.published || !period.reviewEnabled) throw new Error('当前月份不可提交复核');
  const targets = period.employees.filter(employee => employee.manager === manager && employee.department === department);
  if (!targets.length || targets.some(employee => !['待主管复核', 'HR 已退回'].includes(employee.reviewStatus))) throw new Error('该部门存在不可提交的员工');
  return { ...period, employees: period.employees.map(employee => targets.some(target => target.id === employee.id)
    ? submitManagerReview({ ...employee, managerDraft: employee.managerDraft || { attitude: employee.scores.attitude, adjustment: employee.scores.managerAdjustment, reason: '主管确认当前评分' } }) : employee) };
};

export const reviewDepartmentSubmission = (period: KpiPeriod, manager: string, department: string, decision: KpiReviewDecision, reason = ''): KpiPeriod => {
  if (period.published) throw new Error('已公示月份不可审核');
  const targets = period.employees.filter(employee => employee.manager === manager && employee.department === department);
  if (!targets.length || targets.some(employee => employee.reviewStatus !== '待 HR 审核')) throw new Error('该部门尚未全部提交 HR 审核');
  if (decision === 'return' && !reason.trim()) throw new Error('请填写退回原因');
  return { ...period, employees: period.employees.map(employee => targets.some(target => target.id === employee.id)
    ? reviewManagerSubmission(employee, decision, reason) : employee) };
};

export interface KpiDemoState {
  periods: Record<string, KpiPeriod>;
}

const buildEmployees = (month: string): KpiEmployee[] => {
  const rows: KpiEmployee[] = [
  { id: 'e-01', name: '林知夏', department: '产品部', position: '高级产品经理', manager: '陈宇璋', scores: { objective: 56, attendance: 10, extraWork: 4, attitude: 14, review: 9, managerAdjustment: 0 }, source: { okrCompletion: 93, attendanceDays: 22, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 12, reportLate: 0, reportMissing: 0, tasksOverdue: 0, leaveRecords: { '年假': 0, '事假': 0, '病假': 0 } }, reviewStatus: '已通过' },
  { id: 'e-02', name: '周予安', department: '产品部', position: '产品经理', manager: '陈宇璋', scores: { objective: 53, attendance: 9, extraWork: 3, attitude: 13, review: 9, managerAdjustment: 1 }, source: { okrCompletion: 88, attendanceDays: 22, lateCount: 1, missingPunches: 0, approvedOvertimeHours: 8, reportLate: 0, reportMissing: 0, tasksOverdue: 1, leaveRecords: { '年假': 0, '事假': 0, '病假': 0 } }, reviewStatus: '待 HR 审核', managerDraft: { attitude: 13, adjustment: 1, reason: '按期完成重点版本方案，并主动协调研发风险。' } },
  { id: 'e-03', name: '顾清和', department: '研发部', position: '前端工程师', manager: '陈宇璋', scores: { objective: 50, attendance: 10, extraWork: 5, attitude: 12, review: 8, managerAdjustment: 0 }, source: { okrCompletion: 84, attendanceDays: 22, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 18, reportLate: 1, reportMissing: 0, tasksOverdue: 1, leaveRecords: { '年假': 1, '事假': 0, '病假': 0 } }, reviewStatus: '待主管复核' },
  { id: 'e-04', name: '许明川', department: '研发部', position: '后端工程师', manager: '赵书琳', scores: { objective: 47, attendance: 8, extraWork: 4, attitude: 11, review: 7, managerAdjustment: -1 }, source: { okrCompletion: 78, attendanceDays: 21, lateCount: 2, missingPunches: 1, approvedOvertimeHours: 14, reportLate: 2, reportMissing: 0, tasksOverdue: 2, leaveRecords: { '年假': 0, '事假': 1, '病假': 0 } }, reviewStatus: '待 HR 审核', managerDraft: { attitude: 11, adjustment: -1, reason: '迭代交付存在延迟，复盘材料两次迟交。' } },
  { id: 'e-05', name: '沈嘉禾', department: '交付部', position: '交付顾问', manager: '王佳乐', scores: { objective: 50, attendance: 10, extraWork: 3, attitude: 13, review: 8, managerAdjustment: 0 }, source: { okrCompletion: 84, attendanceDays: 22, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 5, reportLate: 1, reportMissing: 0, tasksOverdue: 2, leaveRecords: { '年假': 0, '事假': 0, '病假': 1 } }, reviewStatus: '已通过' },
  { id: 'e-06', name: '唐以宁', department: '运营部', position: '运营专员', manager: '毛景强', scores: { objective: 39, attendance: 7, extraWork: 1, attitude: 10, review: 6, managerAdjustment: -2 }, source: { okrCompletion: 65, attendanceDays: 20, lateCount: 3, missingPunches: 1, approvedOvertimeHours: 2, reportLate: 2, reportMissing: 1, tasksOverdue: 3, leaveRecords: { '年假': 0, '事假': 0, '病假': 2 } }, reviewStatus: '待 HR 审核' },
  ];
  return month === '2026-10' ? rows.map(employee => ({
    ...employee,
    reviewStatus: '已通过',
  })) : rows;
};

export const KPI_DEMO_STORAGE_KEY = 'shichuang.frontend.demo.kpiPerformance.v1';
export const KPI_MONTHS = ['2026-11', '2026-10', '2026-09'];
export const KPI_DIMENSIONS = [
  { key: 'objective', label: '月度目标（演示）', max: 60, weight: '60%' },
  { key: 'attendance', label: '全勤', max: 10, weight: '10%' },
  { key: 'extraWork', label: '额外投入', max: 5, weight: '5%' },
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

export const scoreForEmployee = (employee: KpiEmployee) => Math.max(0, Math.min(100,
  employee.scores.objective + employee.scores.attendance + employee.scores.extraWork + employee.scores.attitude + employee.scores.review + employee.scores.managerAdjustment,
));

export const submitManagerReview = (employee: KpiEmployee): KpiEmployee => {
  const draft = employee.managerDraft;
  if (!draft?.reason.trim()) throw new Error('请填写复核说明');
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
  return {
    ...employee,
    scores: draft ? { ...employee.scores, attitude: draft.attitude, managerAdjustment: draft.adjustment } : employee.scores,
    reviewStatus: '已通过',
    hrNote: draft ? `HR 审核通过：${draft.reason.trim()}` : 'HR 已确认系统计算结果。',
  };
};

const initialState = (): KpiDemoState => ({
  periods: Object.fromEntries(KPI_MONTHS.map((month, index) => [month, {
    employees: month === '2026-11' ? buildEmployees(month).map(employee => ({ ...employee, redline: undefined, reviewStatus: '待主管复核', managerDraft: undefined, hrNote: undefined })) : buildEmployees(month),
    generated: month !== '2026-09',
    published: month === '2026-10',
    reviewEnabled: month !== '2026-09',
    generatedAt: month === '2026-11' ? '2026-11-01 09:30' : month === '2026-10' ? '2026-11-01 09:30' : undefined,
    departmentCoefficients: { 产品部: 1, 研发部: 1, 交付部: 1, 运营部: 1 },
    departmentMetrics: Object.fromEntries(['产品部', '研发部', '交付部', '运营部'].map(name => [name, { teamCompletion: 100, confirmed: month === '2026-10' }])),
  }])) as KpiDemoState['periods'],
});

export const loadKpiDemo = (): KpiDemoState => {
  try {
    const raw = localStorage.getItem(KPI_DEMO_STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as KpiDemoState;
    if (!parsed.periods || !parsed.periods['2026-10']) return initialState();
    Object.values(parsed.periods).forEach(period => {
      period.departmentMetrics ||= Object.fromEntries([...new Set(period.employees.map(employee => employee.department))]
        .map(name => [name, { teamCompletion: 100, confirmed: period.published }]));
    });
    const reviewDemoPeriod = parsed.periods['2026-11'];
    if (reviewDemoPeriod && !reviewDemoPeriod.generated && !reviewDemoPeriod.published) {
      parsed.periods['2026-11'] = {
        ...reviewDemoPeriod,
        generated: true,
        generatedAt: '2026-11-01 09:30',
        reviewEnabled: true,
        employees: reviewDemoPeriod.employees.map(employee => ({ ...employee, reviewStatus: '待主管复核', managerDraft: undefined, hrNote: undefined })),
      };
    }
    return parsed;
  } catch {
    return initialState();
  }
};

export const saveKpiDemo = (state: KpiDemoState) => {
  localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
};

export const createKpiPeriod = (period: KpiPeriod): KpiPeriod => ({
  ...period,
  generated: true,
  published: false,
  departmentMetrics: Object.fromEntries(Object.entries(period.departmentMetrics || {}).map(([name, metric]) => [name, { ...metric, confirmed: false }])),
  generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  employees: period.employees.map(employee => ({
    ...employee,
    reviewStatus: period.reviewEnabled ? '待主管复核' : '待 HR 审核',
    managerDraft: undefined,
    hrNote: undefined,
  })),
});
