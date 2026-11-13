import { departmentCoefficientPreview, effectiveKpiSourceData, gradeForScore, isWithinKpiWindow, reportScoreFor, scoreForEmployee, type KpiDemoState, type KpiEmployee, type KpiPeriod } from './kpiPerformanceDemo';

export type KpiPublicationRole = 'HR' | '主管' | '员工';

export interface KpiDepartmentSummary {
  department: string;
  employeeCount: number;
  averageScore: number;
  averageCoefficient: number;
  departmentCoefficient: number;
  gradeCounts: Record<'S' | 'A' | 'B' | 'C' | 'D' | 'E', number>;
}

export interface KpiAppeal {
  id: string;
  month: string;
  employeeId: string;
  employeeName: string;
  reason: string;
  createdAt: string;
  status: '待处理' | '已修正' | '已驳回';
  resolvedAt?: string;
  resolution?: string;
  correction?: { before: KpiAppealCorrection; after: KpiAppealCorrection };
}

export interface KpiAppealCorrection {
  okrCompletion: number;
  objectiveScore: number;
  reportLate: number;
  monthlyReportLate: number;
  weeklyReportMissing: number;
  reportMissing: number;
  tasksOverdue: number;
  reviewScore: number;
}

const APPEALS_STORAGE_KEY = 'shichuang.frontend.demo.kpiPerformanceAppeals.v1';
const GRADES = ['S', 'A', 'B', 'C', 'D', 'E'] as const;

export function filterPublishedEmployees(
  employees: KpiEmployee[],
  role: KpiPublicationRole,
  supervisor: string,
  employeeId: string,
): KpiEmployee[] {
  if (role === '员工') return employees.filter(employee => employee.id === employeeId);
  if (role === '主管') {
    const managedDepartments = new Set(employees.filter(employee => employee.manager === supervisor).map(employee => employee.department));
    return employees.filter(employee => managedDepartments.has(employee.department));
  }
  return employees;
}

export function summarizeDepartmentPerformance(
  employees: KpiEmployee[],
  departmentCoefficients: number | Record<string, number>,
): KpiDepartmentSummary[] {
  const grouped = new Map<string, KpiEmployee[]>();
  employees.forEach(employee => grouped.set(employee.department, [...(grouped.get(employee.department) || []), employee]));

  return [...grouped.entries()].map(([department, members]) => {
    const gradeCounts = Object.fromEntries(GRADES.map(grade => [grade, 0])) as KpiDepartmentSummary['gradeCounts'];
    const scores = members.map(scoreForEmployee);
    scores.forEach(score => { gradeCounts[gradeForScore(score).grade] += 1; });

    return {
      department,
      employeeCount: members.length,
      averageScore: scores.reduce((sum, score) => sum + score, 0) / members.length,
      averageCoefficient: scores.reduce((sum, score) => sum + gradeForScore(score).coefficient, 0) / members.length,
      departmentCoefficient: typeof departmentCoefficients === 'number' ? departmentCoefficients : departmentCoefficients[department] ?? 1,
      gradeCounts,
    };
  });
}

export function listKpiAppeals(): KpiAppeal[] {
  try {
    const value = JSON.parse(localStorage.getItem(APPEALS_STORAGE_KEY) || '[]') as unknown;
    return Array.isArray(value) ? value as KpiAppeal[] : [];
  } catch {
    return [];
  }
}

export function submitKpiAppeal(input: Pick<KpiAppeal, 'month' | 'employeeId' | 'employeeName' | 'reason'>): KpiAppeal {
  const reason = input.reason.trim();
  if (!reason) throw new Error('请填写申诉原因');
  if (reason.length > 500) throw new Error('申诉原因不能超过 500 字');
  if (listKpiAppeals().some(appeal => appeal.month === input.month && appeal.employeeId === input.employeeId && appeal.status === '待处理')) throw new Error('本月已有待处理申诉');

  const appeal: KpiAppeal = {
    ...input,
    reason,
    id: `kpi-appeal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: '待处理',
  };
  localStorage.setItem(APPEALS_STORAGE_KEY, JSON.stringify([...listKpiAppeals(), appeal]));
  return appeal;
}

export const correctionForEmployee = (employee: KpiEmployee): KpiAppealCorrection => {
  const source = effectiveKpiSourceData(employee);
  return {
    okrCompletion: source.okrCompletion,
    objectiveScore: employee.approvedSourceCorrections?.filter(record => record.source === 'objective').at(-1)?.after.objectiveScore ?? employee.scores.objective,
    reportLate: source.reportLate,
    monthlyReportLate: source.monthlyReportLate ?? 0,
    weeklyReportMissing: source.weeklyReportMissing ?? 0,
    reportMissing: source.reportMissing,
    tasksOverdue: source.tasksOverdue,
    reviewScore: employee.approvedSourceCorrections?.filter(record => record.source === 'reports').at(-1)?.after.reviewScore ?? employee.scores.review,
  };
};

export function restoreLegacyAppealCorrections(state: KpiDemoState, appeals = listKpiAppeals()): KpiDemoState {
  return {
    ...state,
    periods: Object.fromEntries(Object.entries(state.periods).map(([month, period]) => [month, {
      ...period,
      employees: period.employees.map(employee => {
        if (employee.approvedSourceCorrections?.length) return employee;
        const history = appeals.filter(appeal => appeal.month === month && appeal.employeeId === employee.id && appeal.status === '已修正' && appeal.correction)
          .sort((left, right) => (left.resolvedAt || left.createdAt).localeCompare(right.resolvedAt || right.createdAt));
        if (!history.length) return employee;
        const corrections = history.flatMap(appeal => {
          const { before, after } = appeal.correction!;
          const changedObjective = before.okrCompletion !== after.okrCompletion || before.objectiveScore !== after.objectiveScore;
          const changedReports = before.reportLate !== after.reportLate || before.monthlyReportLate !== after.monthlyReportLate || before.weeklyReportMissing !== after.weeklyReportMissing || before.reportMissing !== after.reportMissing || before.tasksOverdue !== after.tasksOverdue || before.reviewScore !== after.reviewScore;
          const at = appeal.resolvedAt || appeal.createdAt;
          return [
            ...(changedObjective ? [{ id: `${appeal.id}-objective`, appealId: appeal.id, source: 'objective' as const, before: { okrCompletion: before.okrCompletion, objectiveScore: before.objectiveScore }, after: { okrCompletion: after.okrCompletion, objectiveScore: after.objectiveScore }, reason: appeal.resolution || '', actor: 'HR', at }] : []),
            ...(changedReports ? [{ id: `${appeal.id}-reports`, appealId: appeal.id, source: 'reports' as const, before: { reportLate: before.reportLate, monthlyReportLate: before.monthlyReportLate ?? 0, weeklyReportMissing: before.weeklyReportMissing ?? 0, reportMissing: before.reportMissing, tasksOverdue: before.tasksOverdue, reviewScore: before.reviewScore }, after: { reportLate: after.reportLate, monthlyReportLate: after.monthlyReportLate ?? 0, weeklyReportMissing: after.weeklyReportMissing ?? 0, reportMissing: after.reportMissing, tasksOverdue: after.tasksOverdue, reviewScore: after.reviewScore }, reason: appeal.resolution || '', actor: 'HR', at }] : []),
          ];
        });
        const firstCorrection = history[0].correction!;
        return {
          ...employee,
          source: { ...employee.source, okrCompletion: firstCorrection.before.okrCompletion, reportLate: firstCorrection.before.reportLate, reportMissing: firstCorrection.before.reportMissing, tasksOverdue: firstCorrection.before.tasksOverdue },
          scores: { ...employee.scores, objective: firstCorrection.before.objectiveScore, review: firstCorrection.before.reviewScore },
          approvedSourceCorrections: corrections,
          sourceCorrection: employee.sourceCorrection?.attendance || employee.sourceCorrection?.extraWork
            ? { attendance: employee.sourceCorrection.attendance, extraWork: employee.sourceCorrection.extraWork }
            : undefined,
        };
      }),
    }])) as KpiDemoState['periods'],
  };
}

export function resolveKpiAppeal(
  period: KpiPeriod,
  month: string,
  appealId: string,
  role: KpiPublicationRole,
  decision: 'correct' | 'reject',
  resolution: string,
  correction?: KpiAppealCorrection,
): { period: KpiPeriod; appeal: KpiAppeal } {
  const appeal = listKpiAppeals().find(item => item.id === appealId);
  if (!appeal || appeal.status !== '待处理') throw new Error('申诉不存在或已处理');
  if (role !== 'HR') throw new Error('仅 HR 可处理绩效申诉');
  if (appeal.month !== month) throw new Error('申诉月份不匹配');
  if (!period.published) throw new Error('仅可处理已公示月份的申诉');
  if (period.cycleSettings && !isWithinKpiWindow(period.cycleSettings.appealConfirmation)) throw new Error('当前不在员工申诉确认时间范围内');
  const employee = period.employees.find(item => item.id === appeal.employeeId);
  if (!employee) throw new Error('申诉员工不存在');
  const note = resolution.trim();
  if (!note) throw new Error('请填写处理说明');
  if (note.length > 500) throw new Error('处理说明不能超过 500 字');

  const before = correctionForEmployee(employee);
  if (decision === 'correct') {
    if (!correction) throw new Error('请填写修正数据');
    for (const [key, max] of Object.entries({ okrCompletion: 200, objectiveScore: 60, reportLate: 31, monthlyReportLate: 31, weeklyReportMissing: 31, reportMissing: 31, tasksOverdue: 31, reviewScore: 10 })) {
      const value = correction[key as keyof KpiAppealCorrection];
      if (!Number.isFinite(value) || value < 0 || value > max || (key !== 'okrCompletion' && key !== 'objectiveScore' && key !== 'reviewScore' && !Number.isInteger(value))) throw new Error('修正数据超出允许范围');
    }
    if ((before.reportLate !== correction.reportLate || before.monthlyReportLate !== correction.monthlyReportLate || before.weeklyReportMissing !== correction.weeklyReportMissing || before.reportMissing !== correction.reportMissing)
      && correction.reviewScore !== reportScoreFor(correction)) throw new Error('周月报得分须按迟交和未交次数自动计算');
    if (Object.keys(before).every(key => before[key as keyof KpiAppealCorrection] === correction[key as keyof KpiAppealCorrection])) throw new Error('请至少修改一项数据');
  }
  const resolvedAppeal: KpiAppeal = {
    ...appeal,
    status: decision === 'correct' ? '已修正' : '已驳回',
    resolvedAt: new Date().toISOString(),
    resolution: note,
    ...(decision === 'correct' && correction ? { correction: { before, after: correction } } : {}),
  };
  let updatedPeriod = period;
  if (decision === 'correct' && correction) {
    const objectiveChanged = before.okrCompletion !== correction.okrCompletion || before.objectiveScore !== correction.objectiveScore;
    const reportsChanged = before.reportLate !== correction.reportLate || before.monthlyReportLate !== correction.monthlyReportLate || before.weeklyReportMissing !== correction.weeklyReportMissing || before.reportMissing !== correction.reportMissing || before.tasksOverdue !== correction.tasksOverdue || before.reviewScore !== correction.reviewScore;
    const at = new Date().toISOString();
    const sourceCorrections = [
      ...(objectiveChanged ? [{
        id: `${appeal.id}-objective`, appealId: appeal.id, source: 'objective' as const,
        before: { okrCompletion: before.okrCompletion, objectiveScore: before.objectiveScore },
        after: { okrCompletion: correction.okrCompletion, objectiveScore: correction.objectiveScore },
        reason: note, actor: 'HR', at,
      }] : []),
      ...(reportsChanged ? [{
        id: `${appeal.id}-reports`, appealId: appeal.id, source: 'reports' as const,
        before: { reportLate: before.reportLate, monthlyReportLate: before.monthlyReportLate, weeklyReportMissing: before.weeklyReportMissing, reportMissing: before.reportMissing, tasksOverdue: before.tasksOverdue, reviewScore: before.reviewScore },
        after: { reportLate: correction.reportLate, monthlyReportLate: correction.monthlyReportLate, weeklyReportMissing: correction.weeklyReportMissing, reportMissing: correction.reportMissing, tasksOverdue: correction.tasksOverdue, reviewScore: correction.reviewScore },
        reason: note, actor: 'HR', at,
      }] : []),
    ];
    updatedPeriod = {
      ...period,
      employees: period.employees.map(item => item.id === employee.id ? {
        ...item,
        approvedSourceCorrections: [...(item.approvedSourceCorrections || []), ...sourceCorrections],
      } : item),
    };
    if (before.okrCompletion !== correction.okrCompletion) {
      updatedPeriod.departmentCoefficients = { ...period.departmentCoefficients, [employee.department]: departmentCoefficientPreview(updatedPeriod, employee.department).coefficient };
    }
  }
  localStorage.setItem(APPEALS_STORAGE_KEY, JSON.stringify(listKpiAppeals().map(item => item.id === appealId ? resolvedAppeal : item)));
  return { period: updatedPeriod, appeal: resolvedAppeal };
}
