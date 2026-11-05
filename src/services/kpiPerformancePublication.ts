import { gradeForScore, scoreForEmployee, type KpiEmployee } from './kpiPerformanceDemo';

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
  status: '待处理';
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
  if (role === '主管') return employees.filter(employee => employee.manager === supervisor);
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

export function submitKpiAppeal(input: Omit<KpiAppeal, 'id' | 'createdAt' | 'status'>): KpiAppeal {
  const reason = input.reason.trim();
  if (!reason) throw new Error('请填写申诉原因');
  if (reason.length > 500) throw new Error('申诉原因不能超过 500 字');

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
