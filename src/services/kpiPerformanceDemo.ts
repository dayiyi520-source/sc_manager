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
}

export interface KpiDemoState {
  periods: Record<string, KpiPeriod>;
}

const buildEmployees = (month: string): KpiEmployee[] => {
  const rows: KpiEmployee[] = [
  { id: 'e-01', name: '林知夏', department: '产品部', position: '高级产品经理', manager: '陈宇璋', scores: { objective: 56, attendance: 10, extraWork: 4, attitude: 14, review: 9, managerAdjustment: 0 }, source: { okrCompletion: 93, attendanceDays: 22, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 12, reportLate: 0, reportMissing: 0, tasksOverdue: 0 }, reviewStatus: '已通过' },
  { id: 'e-02', name: '周予安', department: '产品部', position: '产品经理', manager: '陈宇璋', scores: { objective: 53, attendance: 9, extraWork: 3, attitude: 13, review: 9, managerAdjustment: 1 }, source: { okrCompletion: 88, attendanceDays: 22, lateCount: 1, missingPunches: 0, approvedOvertimeHours: 8, reportLate: 0, reportMissing: 0, tasksOverdue: 1 }, reviewStatus: '待 HR 审核', managerDraft: { attitude: 13, adjustment: 1, reason: '按期完成重点版本方案，并主动协调研发风险。' } },
  { id: 'e-03', name: '顾清和', department: '研发部', position: '前端工程师', manager: '陈宇璋', scores: { objective: 50, attendance: 10, extraWork: 5, attitude: 12, review: 8, managerAdjustment: 0 }, source: { okrCompletion: 84, attendanceDays: 22, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 18, reportLate: 1, reportMissing: 0, tasksOverdue: 1 }, reviewStatus: '待主管复核' },
  { id: 'e-04', name: '许明川', department: '研发部', position: '后端工程师', manager: '赵书琳', scores: { objective: 47, attendance: 8, extraWork: 4, attitude: 11, review: 7, managerAdjustment: -1 }, source: { okrCompletion: 78, attendanceDays: 21, lateCount: 2, missingPunches: 1, approvedOvertimeHours: 14, reportLate: 2, reportMissing: 0, tasksOverdue: 2 }, reviewStatus: '待 HR 审核', managerDraft: { attitude: 11, adjustment: -1, reason: '迭代交付存在延迟，复盘材料两次迟交。' } },
  { id: 'e-05', name: '沈嘉禾', department: '交付部', position: '交付顾问', manager: '王佳乐', scores: { objective: 50, attendance: 10, extraWork: 3, attitude: 13, review: 8, managerAdjustment: 0 }, source: { okrCompletion: 84, attendanceDays: 22, lateCount: 0, missingPunches: 0, approvedOvertimeHours: 5, reportLate: 1, reportMissing: 0, tasksOverdue: 2 }, reviewStatus: '已通过', redline: { type: '一般违规', impact: '最高系数限制为 0.8', active: true }, hrNote: '演示规则：一般违规限制最高绩效系数。' },
  { id: 'e-06', name: '唐以宁', department: '运营部', position: '运营专员', manager: '毛景强', scores: { objective: 39, attendance: 7, extraWork: 1, attitude: 10, review: 6, managerAdjustment: -2 }, source: { okrCompletion: 65, attendanceDays: 20, lateCount: 3, missingPunches: 1, approvedOvertimeHours: 2, reportLate: 2, reportMissing: 1, tasksOverdue: 3 }, reviewStatus: '待 HR 审核', redline: { type: '重大失职', impact: '绩效系数清零', active: false }, hrNote: '待 HR 核实事件事实与证据。' },
  ];
  return month === '2026-10' ? rows.map(employee => ({
    ...employee,
    reviewStatus: '已通过',
    redline: employee.redline ? { ...employee.redline, active: true } : undefined,
    hrNote: employee.redline ? `演示红线已处理：${employee.redline.impact}。` : employee.hrNote,
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
    employees: month === '2026-11' ? buildEmployees(month).map(employee => ({ ...employee, reviewStatus: '待主管复核', managerDraft: undefined, hrNote: undefined })) : buildEmployees(month),
    generated: month !== '2026-09',
    published: month === '2026-10',
    reviewEnabled: month !== '2026-09',
    generatedAt: month === '2026-11' ? '2026-11-01 09:30' : month === '2026-10' ? '2026-11-01 09:30' : undefined,
    departmentCoefficients: { 产品部: 1, 研发部: 1, 交付部: 1, 运营部: 1 },
  }])) as KpiDemoState['periods'],
});

export const loadKpiDemo = (): KpiDemoState => {
  try {
    const raw = localStorage.getItem(KPI_DEMO_STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as KpiDemoState;
    if (!parsed.periods || !parsed.periods['2026-10']) return initialState();
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
  generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  employees: period.employees.map(employee => ({
    ...employee,
    reviewStatus: period.reviewEnabled ? '待主管复核' : '待 HR 审核',
    managerDraft: undefined,
    hrNote: undefined,
  })),
});
