import React, { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Empty, Input, InputNumber, message, Modal, Select, Switch, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { AuditOutlined, CheckOutlined, ClockCircleOutlined, DatabaseOutlined, DownOutlined, FileSearchOutlined, FlagOutlined, LineChartOutlined, LockOutlined, PlusOutlined, RightOutlined, SendOutlined, TrophyOutlined } from '@ant-design/icons';
import {
  confirmAllDepartmentCoefficients, createKpiPeriod, departmentCoefficientPreview, departmentGoalSummary, departmentRedlineChoices, effectiveKpiSourceData, gradeForScore, isMonthlyGoalLate, isWithinKpiWindow, KPI_DIMENSIONS, KPI_MONTHS, loadKpiDemo, publishKpiPeriod, saveKpiDemo, validateKpiCycleSettings,
  reviewEmployeeSubmission, reportScoreFor, scoreForEmployee, kpiDimensionScores, sourceAdjustmentFor, submitEmployeeReview, syncKpiSources, type KpiCycleSettings, type KpiDemoState, type KpiDepartmentMetrics, type KpiEmployee, type KpiPeriod,
} from '../../services/kpiPerformanceDemo';
import { correctionForEmployee, filterPublishedEmployees, listKpiAppeals, resolveKpiAppeal, restoreLegacyAppealCorrections, submitKpiAppeal, summarizeDepartmentPerformance, type KpiAppeal, type KpiAppealCorrection } from '../../services/kpiPerformancePublication';
import './kpi-performance-demo.css';
import { OkrPerformanceScoreView } from './OkrPerformanceScoreView';
import { okrRepository } from '../../services/okrRepository';
import mockOkrState from '../../data/mockOkrState.json';
import type { OkrPerson, OkrRecord } from '../../services/okrRepository';

type ViewKey = 'public' | 'sources' | 'calculation' | 'hr';
type DemoRole = 'HR' | '主管' | '员工';
type SourceDataKey = 'objective' | 'attendance' | 'extraWork' | 'reports';
type ReviewFilterKey = 'all' | 'manager' | 'appeals';

const views: Array<{ key: ViewKey; label: string; icon: React.ReactNode }> = [
  { key: 'public', label: '月度公示', icon: <TrophyOutlined /> },
  { key: 'sources', label: '原始数据', icon: <DatabaseOutlined /> },
  { key: 'calculation', label: '汇总复核', icon: <LineChartOutlined /> },
  { key: 'hr', label: '部门系数与红线', icon: <AuditOutlined /> },
];

const sourceDataTabs: Array<{ key: SourceDataKey; label: string }> = [
  { key: 'objective', label: '月度目标' },
  { key: 'attendance', label: '考勤与请假' },
  { key: 'extraWork', label: '额外工作投入' },
  { key: 'reports', label: '周月报' },
];

const monthLabel = (month: string) => `${month.slice(0, 4)}年${Number(month.slice(5))}月`;
const coefficientText = (value: number) => Number.isInteger(value) ? value.toFixed(1) : value.toFixed(2);
const scoreTone = (score: number) => score > 90 ? 'high' : score > 80 ? 'good' : score > 70 ? 'mid' : 'low';
const appealCorrectionFields: Array<{ key: keyof KpiAppealCorrection; label: string }> = [
  { key: 'okrCompletion', label: '目标完成率' }, { key: 'objectiveScore', label: '目标得分' },
  { key: 'reportLate', label: '周报迟交' }, { key: 'monthlyReportLate', label: '月报迟交' },
  { key: 'weeklyReportMissing', label: '周报未交' }, { key: 'reportMissing', label: '月报未交' },
  { key: 'tasksOverdue', label: '任务逾期' }, { key: 'reviewScore', label: '复盘得分' },
];

export const KpiPerformanceDemoView: React.FC = () => {
  const [messageApi, messageContextHolder] = message.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const [state, setState] = useState<KpiDemoState>(() => restoreLegacyAppealCorrections(loadKpiDemo()));
  const [clock, setClock] = useState(() => Date.now());
  const [month, setMonth] = useState('2026-11');
  const [view, setView] = useState<ViewKey>('public');
  const [role, setRole] = useState<DemoRole>('HR');
  const [supervisor, setSupervisor] = useState('陈宇璋');
  const [selectedId, setSelectedId] = useState('e-01');
  const [department, setDepartment] = useState('全部部门');
  const [query, setQuery] = useState('');
  const [returnTarget, setReturnTarget] = useState<KpiEmployee | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [sourceDataTab, setSourceDataTab] = useState<SourceDataKey>('objective');
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appeals, setAppeals] = useState<KpiAppeal[]>(listKpiAppeals);
  const [reviewAppealId, setReviewAppealId] = useState<string | null>(null);
  const [appealCorrection, setAppealCorrection] = useState<KpiAppealCorrection | null>(null);
  const [appealResolution, setAppealResolution] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [cycleDraft, setCycleDraft] = useState<KpiCycleSettings | null>(null);
  const [cycleSettingsOpen, setCycleSettingsOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<KpiEmployee | null>(null);
  const [redlineEmployeeId, setRedlineEmployeeId] = useState<string | null>(null);
  const [factorDepartment, setFactorDepartment] = useState('');
  const [factorQuery, setFactorQuery] = useState('');
  const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(() => new Set());
  const [collapsedReviewDepartments, setCollapsedReviewDepartments] = useState<Set<string>>(() => new Set());
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterKey>('all');
  const [sourceCorrectionTarget, setSourceCorrectionTarget] = useState<{ employee: KpiEmployee; source: 'objective' | 'reports' } | null>(null);

  useEffect(() => { saveKpiDemo(state); }, [state]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleAutoPublication = (event: Event) => {
      const months = (event as CustomEvent<{ months: string[] }>).detail?.months || [];
      setState(loadKpiDemo());
      if (months.includes(month)) messageApi.success('已到最终公示时间，绩效结果已自动公示');
    };
    window.addEventListener('shichuang:kpi-auto-published', handleAutoPublication);
    return () => window.removeEventListener('shichuang:kpi-auto-published', handleAutoPublication);
  }, [messageApi, month]);

  useEffect(() => {
    if (view !== 'hr') return;
    let active = true;
    void Promise.all([okrRepository.people(), okrRepository.records()]).then(([savedPeople, savedRecords]) => {
      if (!active) return;
      const peopleIds = new Set(savedPeople.map(person => person.id));
      const recordIds = new Set(savedRecords.map(record => record.id));
      const people = [...savedPeople, ...(mockOkrState.okrPeople as OkrPerson[]).filter(person => !peopleIds.has(person.id))];
      const demoRecords = mockOkrState.okrRecords as OkrRecord[];
      const demoById = new Map(demoRecords.map(record => [record.id, record]));
      const records = [...savedRecords.map(record => record.id.startsWith('kpi-demo-goal-') && !record.submittedAt
        ? { ...record, submittedAt: demoById.get(record.id)?.submittedAt } : record),
        ...demoRecords.filter(record => record.id.startsWith('kpi-demo-') && !recordIds.has(record.id))];
      setState(current => {
        const period = current.periods[month];
        if (!period || period.published) return current;
        let changed = false;
        const departmentMetrics = { ...period.departmentMetrics };
        const employees = period.employees.map(employee => {
          const goalLate = isMonthlyGoalLate(records, employee.id, month, period.cycleSettings?.monthlyGoalDeadline);
          if (!!employee.source.goalLate === goalLate) return employee;
          changed = true;
          departmentMetrics[employee.department] = { teamCompletion: 100, ...departmentMetrics[employee.department], confirmed: false };
          return { ...employee, source: { ...employee.source, goalLate } };
        });
        for (const name of new Set<string>(period.employees.map(employee => employee.department))) {
          const goal = departmentGoalSummary(records, people, month, name);
          const previous = departmentMetrics[name];
          if (previous?.goalCompletion === goal.completion && previous.goalBase === goal.base && previous.goalDeduction === goal.deduction && previous.goalScore === goal.total) continue;
          departmentMetrics[name] = { teamCompletion: 100, ...previous, goalCompletion: goal.completion, goalBase: goal.base, goalDeduction: goal.deduction, goalScore: goal.total, confirmed: false };
          changed = true;
        }
        return changed ? { ...current, periods: { ...current.periods, [month]: { ...period, employees, departmentMetrics } } } : current;
      });
    }).catch(() => {});
    return () => { active = false; };
  }, [view, month, state.periods[month]?.cycleSettings?.monthlyGoalDeadline]);

  const period = state.periods[month];
  const employees = period?.employees || [];
  const monthAppeals = appeals.filter(appeal => appeal.month === month);
  const employeeAppeals = (employee: KpiEmployee) => monthAppeals.filter(appeal => appeal.employeeId === employee.id);
  const hasPendingAppeal = (employee: KpiEmployee) => employeeAppeals(employee).some(appeal => appeal.status === '待处理');
  const isManagerReviewPending = (employee: KpiEmployee) => employee.reviewStatus === '待 HR 审核';
  const accessibleEmployees = filterPublishedEmployees(employees, role, supervisor, 'e-01');
  const workflowEmployees = role === '主管' && view === 'calculation' ? employees.filter(employee => employee.manager === supervisor) : accessibleEmployees;
  const employeeDepartment = employees.find(employee => employee.id === 'e-01')?.department || '';
  const departmentEmployees = employees.filter(employee => employee.department === employeeDepartment);
  const publicationEmployees = role === '员工' ? departmentEmployees : accessibleEmployees;
  const departmentSummaries = summarizeDepartmentPerformance(publicationEmployees, period?.departmentCoefficients || {});
  const employeeDepartmentSummary = departmentSummaries.find(item => item.department === employeeDepartment);
  const reviewFilterMatches = (employee: KpiEmployee) => reviewFilter === 'all' || (reviewFilter === 'manager' ? isManagerReviewPending(employee) : hasPendingAppeal(employee));
  const selectedEmployee = role === 'HR' && view === 'calculation' && reviewFilter !== 'all'
    ? workflowEmployees.find(employee => employee.id === selectedId && reviewFilterMatches(employee)) || workflowEmployees.find(reviewFilterMatches)
    : workflowEmployees.find(employee => employee.id === selectedId) || workflowEmployees[0];
  const filteredEmployees = useMemo(() => accessibleEmployees.filter(employee =>
    (department === '全部部门' || employee.department === department)
    && (!query.trim() || employee.name.includes(query.trim()))), [accessibleEmployees, department, query]);
  const sourceDepartments = [...new Set(accessibleEmployees.map(employee => employee.department))];
  const employeeGroups = useMemo(() => [...workflowEmployees.filter(employee => role !== 'HR' || view !== 'calculation' || reviewFilterMatches(employee)).reduce((groups, employee) => {
    const current = groups.get(employee.department) || [];
    groups.set(employee.department, [...current, employee]);
    return groups;
  }, new Map<string, KpiEmployee[]>())], [workflowEmployees, role, view, reviewFilter, monthAppeals]);
  const departments: string[] = [...new Set<string>(employees.map(employee => employee.department))];
  const managerReviewOpen = !!period?.cycleSettings && isWithinKpiWindow(period.cycleSettings.managerReview, clock);
  const confirmedDepartmentCount = departments.filter(name => period.departmentMetrics?.[name]?.confirmed).length;
  const matchingFactorDepartments = departments.filter(name => name.includes(factorQuery.trim()));
  const activeFactorDepartment = matchingFactorDepartments.includes(factorDepartment) ? factorDepartment : matchingFactorDepartments[0];
  const factorRedlineEmployees = employees.filter(employee => employee.department === activeFactorDepartment && employee.redline);
  const availableFactorRedlineEmployees = employees.filter(employee => employee.department === activeFactorDepartment && !employee.redline);
  const currentReviewGroup = selectedEmployee ? workflowEmployees.filter(employee => employee.department === selectedEmployee.department && employee.manager === selectedEmployee.manager) : [];

  const updatePeriod = (updater: (previous: KpiPeriod) => KpiPeriod) => {
    setState(current => ({ ...current, periods: { ...current.periods, [month]: updater(current.periods[month]) } }));
  };
  const openCycleSettings = () => {
    if (!requireHr()) return;
    setCycleDraft(period?.cycleSettings ? structuredClone(period.cycleSettings) : null);
    setCycleSettingsOpen(true);
  };
  const saveCycleSettings = () => {
    if (!requireHr() || !cycleDraft || period?.published) return;
    const error = validateKpiCycleSettings(cycleDraft);
    if (error) { messageApi.error(error); return; }
    updatePeriod(current => ({
      ...current,
      reviewEnabled: true,
      cycleSettings: cycleDraft,
      employees: current.employees.map(employee => {
        const next = !current.reviewEnabled && employee.reviewStatus === '待 HR 审核' && !employee.managerDraft
          ? { ...employee, scores: { ...employee.scores, attitude: 0, managerAdjustment: 0 }, source: { ...employee.source, objectiveAdjustment: 0 }, reviewStatus: '待主管复核' as const, hrNote: undefined }
          : employee;
        return { ...next, source: { ...next.source, goalLate: isMonthlyGoalLate(mockOkrState.okrRecords as OkrRecord[], employee.id, month, cycleDraft.monthlyGoalDeadline) } };
      }),
    }));
    setCycleSettingsOpen(false);
    messageApi.success('本月周期已保存，最终公示将按设置自动执行');
  };
  const updateEmployee = (id: string, updater: (employee: KpiEmployee) => KpiEmployee) => updatePeriod(current => ({ ...current, employees: current.employees.map(employee => employee.id === id ? updater(employee) : employee) }));
  const requireHr = () => {
    if (role === 'HR') return true;
    messageApi.warning('切换到 HR 体验视角后可执行此操作');
    return false;
  };

  const generatePeriod = () => {
    if (!requireHr()) return;
    modal.confirm({
      title: `生成${monthLabel(month)}考核数据？`,
      content: '演示数据会进入主管复核或 HR 审核流程，已保存的本月人工处理状态将重置。',
      okText: '生成考核', cancelText: '取消',
      onOk: () => {
        updatePeriod(current => createKpiPeriod(syncKpiSources(current, month)));
        messageApi.success('考核数据已生成');
      },
    });
  };

  const publishPeriod = () => {
    if (!requireHr()) return;
    const pending = employees.filter(employee => employee.reviewStatus !== '已通过').length;
    if (pending) { messageApi.warning(`还有 ${pending} 位员工未完成 HR 审核`); return; }
    if (departments.some(name => !period?.departmentMetrics?.[name]?.confirmed)) { messageApi.warning('请先确认全部部门系数'); return; }
    modal.confirm({
      title: `公示${monthLabel(month)}最终绩效？`,
      content: '公示后员工可见本月最终得分、等级和绩效系数。',
      okText: '确认公示', cancelText: '返回',
      onOk: () => {
        try {
          const published = publishKpiPeriod(period);
          updatePeriod(() => published);
          messageApi.success('绩效结果已公示');
        } catch (error) { messageApi.error(error instanceof Error ? error.message : '绩效公示失败'); }
      },
    });
  };

  const applyManagerReview = () => {
    if (!selectedEmployee || role !== '主管' || !managerReviewOpen || !period?.generated || period.published) return;
    try {
      const submitted = submitEmployeeReview(period, selectedEmployee.id, supervisor);
      updatePeriod(() => submitted);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '主管复核提交失败');
      return;
    }
    messageApi.success(`${selectedEmployee.name}的复核已提交，等待 HR 审核`);
  };

  const approveEmployee = (employee: KpiEmployee) => {
    if (!requireHr()) return;
    try {
      const approved = reviewEmployeeSubmission(period, employee.id, 'approve');
      updatePeriod(() => approved);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'HR 审核失败');
      return;
    }
    messageApi.success(`${employee.name}的绩效已审核通过`);
  };

  const returnEmployee = () => {
    if (!returnTarget || !requireHr()) return;
    try {
      const returned = reviewEmployeeSubmission(period, returnTarget.id, 'return', returnReason);
      updatePeriod(() => returned);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '退回失败');
      return;
    }
    messageApi.success(`${returnTarget.name}的绩效已退回主管修改`);
    setReturnTarget(null);
    setReturnReason('');
  };

  const handleRoleChange = (nextRole: DemoRole) => {
    setRole(nextRole);
    setQuery('');
    setDepartment('全部部门');
    if (nextRole === '员工') setView('public');
    else if (nextRole === '主管') setView(period?.generated ? 'calculation' : 'public');
    else if (view === 'hr' && !period?.generated) setView('public');
    setSelectedId(nextRole === '主管' ? employees.find(employee => employee.manager === supervisor)?.id || '' : 'e-01');
  };

  const confirmAllFactors = () => {
    if (!requireHr()) return;
    try {
      const confirmed = confirmAllDepartmentCoefficients(period);
      updatePeriod(() => confirmed);
      messageApi.success('本月全部部门系数已确认');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '部门系数确认失败');
    }
  };

  const updateDepartmentMetric = (name: string, field: keyof Omit<KpiDepartmentMetrics, 'confirmed'>, value: number | boolean | string) => {
    if (role !== 'HR' || period?.published) return;
    updatePeriod(current => ({ ...current, departmentMetrics: { ...current.departmentMetrics,
      [name]: { teamCompletion: 100, ...current.departmentMetrics?.[name], [field]: value, confirmed: false },
    } }));
  };

  const updateRedline = (employee: KpiEmployee, type: string, impact: string) => {
    if (period?.published || role !== 'HR') return;
    updatePeriod(current => ({ ...current,
      departmentMetrics: { ...current.departmentMetrics, [employee.department]: { teamCompletion: 100, ...current.departmentMetrics?.[employee.department], confirmed: false } },
      employees: current.employees.map(item => item.id === employee.id ? { ...item,
        redline: type === '无' ? undefined : { type, impact, active: true },
        hrNote: type === '无' ? undefined : `演示红线处理：${type}，${impact}。`,
      } : item),
    }));
    messageApi.success('HR 处理结果已保存');
  };

  const scoreSummary = accessibleEmployees.map(employee => ({ employee, score: scoreForEmployee(employee), grade: gradeForScore(scoreForEmployee(employee)) }));
  const pendingHrEmployees = employees.filter(employee => employee.reviewStatus === '待 HR 审核');
  const pendingAppeals = monthAppeals.filter(appeal => appeal.status === '待处理');
  const publicScoreSummary = publicationEmployees.map(employee => ({ employee, score: scoreForEmployee(employee), grade: gradeForScore(scoreForEmployee(employee)) }));
  const averageScore = publicScoreSummary.length ? publicScoreSummary.reduce((sum, item) => sum + item.score, 0) / publicScoreSummary.length : 0;
  const averageCoefficient = publicScoreSummary.length ? publicScoreSummary.reduce((sum, item) => sum + item.grade.coefficient, 0) / publicScoreSummary.length : 0;
  const gradeCounts = ['S', 'A', 'B', 'C', 'D', 'E'].map(grade => ({ grade, count: publicScoreSummary.filter(item => item.grade.grade === grade).length }));

  const finalCoefficient = (employee: KpiEmployee) => {
    const base = gradeForScore(scoreForEmployee(employee)).coefficient;
    const deptFactor = period?.departmentCoefficients[employee.department] ?? 1;
    const redline = employee.redline?.active ? employee.redline.impact : '';
    if (redline.includes('清零')) return 0;
    if (redline.includes('0.8')) return Math.min(base * deptFactor, 0.8);
    return base * deptFactor;
  };

  const previewManagerEmployee = (employee: KpiEmployee): KpiEmployee => {
    const draft = employee.managerDraft;
    return draft ? { ...employee, scoreAllocationVersion: 2, scores: { ...employee.scores, attitude: draft.attitude, managerAdjustment: draft.adjustment, temporaryTaskDeduction: draft.temporaryTaskDeduction ?? 0 } } : employee;
  };
  const previewManagerScore = (employee: KpiEmployee) => scoreForEmployee(previewManagerEmployee(employee));
  const previewManagerDimensions = (employee: KpiEmployee) => kpiDimensionScores(previewManagerEmployee(employee));

  const handleAppealSubmit = () => {
    const ownEmployee = employees.find(employee => employee.id === 'e-01');
    if (!ownEmployee || !period?.published) return;
    try {
      const appeal = submitKpiAppeal({ month, employeeId: ownEmployee.id, employeeName: ownEmployee.name, reason: appealReason });
      setAppeals(current => [...current, appeal]);
      setAppealReason('');
      setAppealOpen(false);
      messageApi.success('申诉已提交');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '申诉提交失败');
    }
  };

  const syncSources = async () => {
    if (!period || syncing) return;
    if (period.published) { messageApi.warning('本月绩效已公示并锁定，不能同步改写历史原始数据'); return; }
    setSyncing(true);
    try {
      await Promise.resolve();
      const synced = syncKpiSources(period, month);
      updatePeriod(() => synced);
      messageApi.success('四类原始数据已同步');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '数据同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const openAppealReview = (appeal: KpiAppeal) => {
    const employee = employees.find(item => item.id === appeal.employeeId);
    if (role !== 'HR' || !employee || appeal.status !== '待处理') return;
    setReviewAppealId(appeal.id);
    setAppealCorrection(correctionForEmployee(employee));
    setAppealResolution('');
  };

  const closeAppealReview = () => {
    setReviewAppealId(null);
    setAppealCorrection(null);
    setAppealResolution('');
  };

  const handleAppealDecision = (decision: 'correct' | 'reject') => {
    if (role !== 'HR' || !reviewAppealId || !period) return;
    try {
      const result = resolveKpiAppeal(period, month, reviewAppealId, role, decision, appealResolution, appealCorrection || undefined);
      updatePeriod(() => result.period);
      setAppeals(current => current.map(item => item.id === result.appeal.id ? result.appeal : item));
      closeAppealReview();
      messageApi.success(decision === 'correct' ? '申诉修正已保存' : '申诉已驳回');
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '申诉处理失败');
    }
  };
  const activeAppeal = appeals.find(appeal => appeal.id === reviewAppealId);
  const activeAppealEmployee = activeAppeal ? employees.find(employee => employee.id === activeAppeal.employeeId) : undefined;
  const ownPendingAppeal = appeals.some(appeal => appeal.month === month && appeal.employeeId === 'e-01' && appeal.status === '待处理');
  const sourceCorrectionButton = (employee: KpiEmployee, source: 'objective' | 'reports') => {
    const count = employee.approvedSourceCorrections?.filter(record => record.source === source).length || 0;
    return count ? <Button type="link" size="small" onClick={event => { event.stopPropagation(); setSourceCorrectionTarget({ employee, source }); }}>查看 {count} 条</Button> : <span>--</span>;
  };

  const scoreAdjustmentDetails = (employee: KpiEmployee) => {
    const approved = employee.reviewHistory?.filter(record => record.action === 'HR 审核通过') || [];
    const hasAdjustment = employee.scores.managerAdjustment !== 0 || (employee.scores.temporaryTaskDeduction ?? 0) !== 0;
    return <section className="kpi-employee-adjustment" aria-label="人工调分说明">
      <div className="kpi-employee-adjustment-head"><h3>人工调分说明</h3><strong>{hasAdjustment ? '有调整' : '无'}</strong></div>
      {hasAdjustment && (approved.length ? approved.map(record => {
        const index = employee.reviewHistory!.findIndex(item => item.id === record.id);
        const submission = employee.reviewHistory!.slice(0, index).reverse().find(item => item.action === '提交主管复核');
        return <div className="kpi-employee-adjustment-record" key={record.id}>
          {record.before.adjustment !== record.proposed.adjustment && <div><span>{employee.scoreAllocationVersion === 2 ? '月度目标加减分' : '人工加减分'}</span><b>{record.before.adjustment.toFixed(1)} → {record.proposed.adjustment.toFixed(1)} 分</b></div>}
          {record.before.temporaryTaskDeduction !== record.proposed.temporaryTaskDeduction && <div><span>临时任务扣分</span><b>{(record.before.temporaryTaskDeduction ?? 0).toFixed(1)} → {(record.proposed.temporaryTaskDeduction ?? 0).toFixed(1)} 分</b></div>}
          {record.before.objectiveScore !== undefined && record.proposed.objectiveScore !== undefined && record.before.objectiveScore !== record.proposed.objectiveScore && <div><span>月度目标得分</span><b>{record.before.objectiveScore.toFixed(1)} → {record.proposed.objectiveScore.toFixed(1)} 分</b></div>}
          {record.before.reviewScore !== undefined && record.proposed.reviewScore !== undefined && record.before.reviewScore !== record.proposed.reviewScore && <div><span>周月报提交得分</span><b>{record.before.reviewScore.toFixed(1)} → {record.proposed.reviewScore.toFixed(1)} 分</b></div>}
          {record.before.attitude !== record.proposed.attitude && <div><span>工作态度分</span><b>{record.before.attitude.toFixed(1)} → {record.proposed.attitude.toFixed(1)} 分</b></div>}
          <p>调整原因：{submission?.reason.trim() || record.reason.trim() || '未记录原因'}</p>
          <small>主管 {submission?.actor || '未记录'} 提交 · {record.actor} 审核通过 · {dayjs(record.at).format('YYYY-MM-DD HH:mm')}</small>
        </div>;
      }) : <p className="kpi-employee-adjustment-empty">历史评分未记录调整依据</p>)}
    </section>;
  };

  const scoreBreakdown = (employee: KpiEmployee, showAdjustment = false) => <div className="kpi-detail-content">
    {(() => { const source = effectiveKpiSourceData(employee); const { objective: objectiveScore, review: reviewScore } = kpiDimensionScores(employee); return <>
    <div className="kpi-detail-identity"><div className="kpi-avatar">{employee.name.slice(0, 1)}</div><div><b>{employee.name}</b><span>{employee.department} · {employee.position}</span></div><strong>{scoreForEmployee(employee).toFixed(1)} 分</strong></div>
    <div className="kpi-detail-dimensions">{KPI_DIMENSIONS.map(dimension => { const value = dimension.key === 'objective' ? objectiveScore : dimension.key === 'review' ? reviewScore : employee.scores[dimension.key]; const label = showAdjustment && dimension.key === 'attendance' ? '考勤' : showAdjustment && dimension.key === 'review' ? '周月报提交' : dimension.label.replace('（演示）', ''); return <div key={dimension.key}><span>{label}</span><b>{value}<small> / {dimension.max} 分</small></b><div className="kpi-detail-bar"><i style={{ width: `${Math.max(0, Math.min(100, value / dimension.max * 100))}%` }} /></div></div>; })}</div>
    {showAdjustment && scoreAdjustmentDetails(employee)}
    <div className="kpi-detail-sources">
      <div><span>目标完成率（演示）</span><b>{source.okrCompletion}%</b><small>月度目标 {objectiveScore} / 60 分</small></div>
      <div><span>出勤天数</span><b>{source.attendanceDays} 天</b><small>迟到 {source.lateCount} 次 · 缺卡 {source.missingPunches} 次</small></div>
      <div><span>审批加班</span><b>{source.approvedOvertimeHours} 小时</b><small>额外工作 {employee.scores.extraWork.toFixed(2)} / {employee.scores.attendance === 0 ? 5 : 10} 分</small></div>
      <div><span>{showAdjustment ? '周月报提交' : '报告异常'}</span><b>{source.reportLate + (source.monthlyReportLate ?? 0) + (source.weeklyReportMissing ?? 0) + source.reportMissing} 次异常</b><small>迟交 {source.reportLate + (source.monthlyReportLate ?? 0)} · 未交 {(source.weeklyReportMissing ?? 0) + source.reportMissing} · 逾期任务 {source.tasksOverdue}</small></div>
    </div>
    <div className="kpi-detail-total"><span>等级 {gradeForScore(scoreForEmployee(employee)).grade}</span><b>绩效系数 {coefficientText(finalCoefficient(employee))}</b></div>
    </>; })()}
  </div>;

  const showScoreDetail = (employee: KpiEmployee) => {
    setDetailTarget(employee);
  };

  return <section className="kpi-workspace">
    {messageContextHolder}
    {modalContextHolder}
    <header className="kpi-header">
      <div className="kpi-tabs" role="tablist" aria-label="绩效考核页面">
        {views.map(item => { const disabled = role === '员工' && !['public', 'sources'].includes(item.key) || role === '主管' && item.key === 'hr'; return <button key={item.key} role="tab" aria-selected={view === item.key} aria-disabled={disabled} className={`${view === item.key ? 'is-active' : ''}${disabled ? ' is-disabled' : ''}`} onClick={() => { if (!disabled) { setView(item.key); if (role === '员工' && item.key === 'sources') setSourceDataTab('objective'); } }}>{item.icon}<span>{item.label}</span>{item.key === 'hr' && employees.some(employee => employee.reviewStatus === '待 HR 审核') && <i />}</button>; })}
      </div>
      <div className="kpi-header-actions">
        <Tag color="gold">演示数据</Tag>
        <Select aria-label="体验角色" value={role} options={['HR', '主管', '员工'].map(value => ({ value, label: `${value}视角` }))} onChange={handleRoleChange} />
        {role === '主管' && <Select aria-label="当前主管" value={supervisor} options={[...new Set(employees.map(employee => employee.manager))].map(value => ({ value, label: `${value}的团队` }))} onChange={value => { setSupervisor(value); setSelectedId(employees.find(employee => employee.manager === value)?.id || 'e-01'); }} />}
        <Select aria-label="考核月份" disabled={cycleSettingsOpen} value={month} options={KPI_MONTHS.map(value => ({ value, label: monthLabel(value) }))} onChange={value => { setMonth(value); setSelectedId('e-01'); setDepartment('全部部门'); setFactorDepartment(''); setFactorQuery(''); setRedlineEmployeeId(null); }} />
      </div>
    </header>

    {!period?.generated && view !== 'public' && !(view === 'sources' && sourceDataTab === 'objective') && <div className="kpi-inline-notice"><ClockCircleOutlined /> 本月考核尚未生成，原始数据可预览；生成后将进入评分和审核流程。{role === 'HR' && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={generatePeriod}>生成本月考核</Button>}</div>}

    {view === 'public' && <section className="kpi-panel kpi-public-view">
      <div className="kpi-view-title"><div><span className="kpi-eyebrow">FINAL RESULTS</span><h2>{monthLabel(month)}绩效公示</h2>{(period?.published || role === 'HR') && <p>{period?.published ? `公示时间 ${period.publishedAt || period.generatedAt || '未记录'} · ${role === '员工' ? '仅展示本人结果与部门汇总' : role === '主管' ? '展示当前团队最终结果' : '展示全员最终结果'}` : '本月结果尚未公示'}</p>}</div>
        {role === 'HR' && (period?.generated ? period.cycleSettings ? <Tag color="processing">按周期自动公示</Tag> : <Button type="primary" icon={<SendOutlined />} disabled={employees.some(employee => employee.reviewStatus !== '已通过') || departments.some(name => !period.departmentMetrics?.[name]?.confirmed)} onClick={publishPeriod}>公示绩效结果</Button> : <Button type="primary" icon={<PlusOutlined />} onClick={generatePeriod}>生成本月考核</Button>)}
      </div>
      {role === '主管' && period?.generated && !period.published && managerReviewOpen && <div className="kpi-inline-notice"><ClockCircleOutlined />当前团队有 {employees.filter(employee => employee.manager === supervisor && ['待主管复核', 'HR 已退回'].includes(employee.reviewStatus)).length} 位员工待复核。请在汇总复核中完成后提交给 HR。<Button type="primary" onClick={() => setView('calculation')}>进入主管复核</Button></div>}
      {period?.published && role !== '员工' ? <>
        <div className="kpi-public-overview">
          <div className="kpi-overview-score"><span>本月平均绩效</span><strong>{averageScore.toFixed(1)}</strong><small>分 <em>·</em> {publicationEmployees.length} 位员工</small></div>
          <div className="kpi-overview-metric"><span>平均绩效系数</span><b>{averageCoefficient.toFixed(2)}</b><small>部门调节前</small></div>
          <div className="kpi-grade-distribution"><span>等级分布</span><div>{gradeCounts.map(item => <div key={item.grade} className={`kpi-grade-count grade-${item.grade.toLowerCase()}`}><b>{item.grade}</b><small>{item.count}</small></div>)}</div></div>
        </div>
        <div className="kpi-scoreboard-head"><span>员工考核席位</span><span>点击查看最终结果</span></div>
        {role === 'HR' ? departmentSummaries.map(summary => {
          const collapsed = collapsedDepartments.has(summary.department);
          return <section className="kpi-department-public-group" key={summary.department} aria-label={`${summary.department}绩效公示`}>
          <header><button type="button" className="kpi-department-toggle" aria-expanded={!collapsed} onClick={() => setCollapsedDepartments(current => { const next = new Set(current); if (next.has(summary.department)) next.delete(summary.department); else next.add(summary.department); return next; })}><span>{collapsed ? <RightOutlined /> : <DownOutlined />}<span><h3>{summary.department}</h3><span>{summary.employeeCount} 位员工 · 部门系数 {coefficientText(summary.departmentCoefficient)}</span></span></span><strong>平均 {summary.averageScore.toFixed(1)} 分</strong></button></header>
          {!collapsed && <div className="kpi-scoreboard-grid">{publicScoreSummary.filter(item => item.employee.department === summary.department).map(({ employee, score, grade }) => <button type="button" key={employee.id} className="kpi-scoreboard-tile" onClick={() => showScoreDetail(employee)}>
            <div className="kpi-avatar">{employee.name.slice(0, 1)}</div><div className="kpi-tile-person"><b>{employee.name}</b><span>{employee.department} · {employee.position}</span></div><div className={`kpi-tile-score tone-${scoreTone(score)}`}><strong>{score.toFixed(1)}</strong><small>{grade.grade} 级</small></div><div className="kpi-tile-coeff"><span>绩效系数</span><b>{coefficientText(finalCoefficient(employee))}</b></div>
          </button>)}</div>}
        </section>;
        }) : <div className="kpi-scoreboard-grid">{publicScoreSummary.map(({ employee, score, grade }) => <button type="button" key={employee.id} className="kpi-scoreboard-tile" onClick={() => showScoreDetail(employee)}>
          <div className="kpi-avatar">{employee.name.slice(0, 1)}</div><div className="kpi-tile-person"><b>{employee.name}</b><span>{employee.department} · {employee.position}</span></div><div className={`kpi-tile-score tone-${scoreTone(score)}`}><strong>{score.toFixed(1)}</strong><small>{grade.grade} 级</small></div><div className="kpi-tile-coeff"><span>绩效系数</span><b>{coefficientText(finalCoefficient(employee))}</b></div>
        </button>)}</div>}
      </> : period?.published && role === '员工' ? <>
        {employeeDepartmentSummary && <>
          <div className="kpi-public-overview kpi-employee-department-overview">
            <div className="kpi-overview-score"><span>{employeeDepartment}平均绩效</span><strong>{employeeDepartmentSummary.averageScore.toFixed(1)}</strong><small>分 · {employeeDepartmentSummary.employeeCount} 位员工</small></div>
            <div className="kpi-overview-metric"><span>部门考核系数</span><b>{coefficientText(employeeDepartmentSummary.departmentCoefficient)}</b><small>{employeeDepartment}公示结果</small></div>
            <div className="kpi-grade-distribution"><span>部门等级分布</span><div>{['S', 'A', 'B', 'C', 'D', 'E'].map(grade => <div key={grade} className={`kpi-grade-count grade-${grade.toLowerCase()}`}><b>{grade}</b><small>{employeeDepartmentSummary.gradeCounts[grade as keyof typeof employeeDepartmentSummary.gradeCounts]}</small></div>)}</div></div>
          </div>
          {employees.find(employee => employee.id === 'e-01') ? <article className="kpi-employee-result-card">
            {scoreBreakdown(employees.find(employee => employee.id === 'e-01')!, true)}
            <div className="kpi-appeal-actions"><span>{ownPendingAppeal ? '申诉待 HR 处理' : appeals.filter(appeal => appeal.month === month && appeal.employeeId === 'e-01').length ? `已处理 ${appeals.filter(appeal => appeal.month === month && appeal.employeeId === 'e-01').length} 条申诉` : '如对评分有异议，可提交申诉'}</span><Button disabled={ownPendingAppeal} onClick={() => setAppealOpen(true)}>绩效申诉</Button></div>
            {appeals.filter(appeal => appeal.month === month && appeal.employeeId === 'e-01').map(appeal => <div className="kpi-own-appeal" key={appeal.id}><Tag>{appeal.status}</Tag><span>{appeal.resolution || appeal.reason}</span></div>)}
          </article> : <Empty description="暂无本人本月绩效记录" />}
        </>}
      </> : <div className="kpi-empty-state"><div className="kpi-empty-mark"><LockOutlined /></div><h3>{period?.generated && role !== 'HR' ? '本月绩效结果尚未公示' : period?.generated ? 'HR 审核完成后即可公示' : '本月最终绩效尚未生成'}</h3>{(role === 'HR' || !period?.generated) && <p>{period?.generated ? 'HR 完成审核并公示后，员工可查看本人绩效及部门汇总。' : '由 HR 控制考核生成时间。生成后进入汇总复核与审核。'}</p>}{role === 'HR' && !period?.generated && <Button type="primary" icon={<PlusOutlined />} onClick={generatePeriod}>生成本月考核</Button>}</div>}
      <div className="kpi-demo-footnote"><LockOutlined /> 员工仅查看本人明细与部门汇总；主管查看本部门全部成员；HR 查看分部门全员结果。</div>
      <Modal open={appealOpen} title={`${monthLabel(month)}绩效申诉`} okText="提交申诉" cancelText="取消" okButtonProps={{ disabled: !appealReason.trim() }} onOk={handleAppealSubmit} onCancel={() => { setAppealOpen(false); setAppealReason(''); }}>
        <p>请说明对哪些评分项目有异议及原因，申诉记录将保存在本地演示数据中。</p>
        <Input.TextArea aria-label="申诉原因" rows={4} maxLength={500} showCount value={appealReason} placeholder="填写申诉原因" onChange={event => setAppealReason(event.target.value)} />
      </Modal>
      <Modal open={!!detailTarget} title={detailTarget ? `${detailTarget.name} · ${monthLabel(month)}绩效结果` : ''} width={680} footer={<Button onClick={() => setDetailTarget(null)}>关闭</Button>} onCancel={() => setDetailTarget(null)}>
        {detailTarget && scoreBreakdown(detailTarget, role === '主管' && !!period?.published)}
      </Modal>
    </section>}

    {view === 'sources' && <section className="kpi-panel">
      <div className="kpi-view-title"><div><span className="kpi-eyebrow">SOURCE RECORDS</span><h2>考核原始数据</h2><p>按来源查看考核数据</p></div>{role !== '员工' && <div className="kpi-filter-row"><Input allowClear placeholder="搜索员工姓名" value={query} onChange={event => setQuery(event.target.value)} prefix={<FileSearchOutlined />} /><Select aria-label="筛选部门" value={sourceDepartments.includes(department) ? department : '全部部门'} options={['全部部门', ...sourceDepartments].map(value => ({ value, label: value }))} onChange={setDepartment} />{sourceDataTab !== 'objective' && <Button icon={<DatabaseOutlined />} loading={syncing} disabled={!period || period.published} onClick={syncSources}>同步数据</Button>}</div>}</div>
      <div className="kpi-source-tabs" role="tablist" aria-label="原始数据分类">{sourceDataTabs.map(item => <button key={item.key} role="tab" aria-selected={sourceDataTab === item.key} className={sourceDataTab === item.key ? 'is-active' : ''} onClick={() => setSourceDataTab(item.key)}>{item.label}</button>)}</div>
      {sourceDataTab === 'objective' ? <OkrPerformanceScoreView month={month} employees={filteredEmployees} onScoresLoaded={scores => {
        if (month !== '2026-11') return;
        updatePeriod(current => ({ ...current, employees: current.employees.map(employee => scores[employee.id]
          ? { ...employee, scores: { ...employee.scores, objective: scores[employee.id].objective }, source: { ...employee.source, okrCompletion: scores[employee.id].completion, objectiveFromOkr: true } }
          : employee) }));
      }} /> : <>
      <div className="kpi-inline-notice"><DatabaseOutlined /> 数据范围：{monthLabel(month)} · {sourceDataTab !== 'attendance' && <>最后同步 {period?.sourceSyncedAt || '尚未同步'} · </>}{filteredEmployees.length} 位员工</div>
      <div className="kpi-source-table-wrap"><table className="kpi-source-table"><thead><tr><th>员工</th><th>部门</th>{sourceDataTab === 'objective' && <><th>目标完成率</th><th>基础得分</th><th>目标加分</th><th>目标扣分</th><th>数据状态</th><th>绩效修正记录</th></>}{sourceDataTab === 'attendance' && <><th>出勤天数</th><th>累计迟到</th><th>缺卡次数</th><th>早退次数</th><th>旷工次数</th><th>请假天数</th><th>请假记录</th><th>考勤得分</th></>}{sourceDataTab === 'extraWork' && <><th>加班总时长</th><th>折算得分</th><th>月度上限</th><th>额外工作得分</th></>}{sourceDataTab === 'reports' && <><th>周报迟交</th><th>月报迟交</th><th>周报未交</th><th>月报未交</th><th>任务逾期</th><th>复盘得分</th></>}</tr></thead><tbody>{filteredEmployees.map(employee => <tr key={employee.id} className={selectedId === employee.id ? 'is-selected' : ''} onClick={() => setSelectedId(employee.id)}>{<td><b>{employee.name}</b></td>}<td>{employee.department}</td>{sourceDataTab === 'objective' && <><td>{employee.source.okrCompletion}%</td><td>{employee.scores.objective.toFixed(1)}</td><td>{sourceAdjustmentFor(employee) > 0 ? sourceAdjustmentFor(employee).toFixed(1) : '0'}</td><td>{sourceAdjustmentFor(employee) < 0 ? Math.abs(sourceAdjustmentFor(employee)).toFixed(1) : '0'}</td><td><Tag color={employee.source.okrCompletion >= 80 ? 'success' : 'warning'}>{employee.source.okrCompletion >= 80 ? '已核对' : '待核对'}</Tag></td><td>{sourceCorrectionButton(employee, 'objective')}</td></>}{sourceDataTab === 'attendance' && <><td>{employee.source.attendanceDays} 天</td><td>{employee.source.lateMinutes ?? 0} 分钟</td><td>{employee.source.missingPunches}</td><td>{employee.source.earlyLeaveCount ?? 0}</td><td>{employee.source.absenceCount ?? 0}</td><td>{Object.values(employee.source.leaveRecords || {}).reduce<number>((sum, days) => sum + Number(days), 0)} 天</td><td>{Object.entries(employee.source.leaveRecords || {}).filter(([, days]) => Number(days) > 0).map(([type, days]) => `${type} ${days} 天`).join('，') || '无'}</td><td>{employee.scores.attendance.toFixed(1)} 分</td></>}{sourceDataTab === 'extraWork' && <><td>{employee.source.approvedOvertimeHours} 小时</td><td>{(employee.source.approvedOvertimeHours / 18 * 5).toFixed(2)} 分</td><td>{employee.scores.attendance === 0 ? 5 : 10} 分</td><td>{employee.scores.extraWork.toFixed(2)} 分</td></>}{sourceDataTab === 'reports' && <><td>{employee.source.reportLate}</td><td>{employee.source.monthlyReportLate ?? 0}</td><td>{employee.source.weeklyReportMissing ?? 0}</td><td>{employee.source.reportMissing}</td><td>{employee.source.tasksOverdue}</td><td>{employee.scores.review.toFixed(1)}</td></>}</tr>)}</tbody></table></div>
      {filteredEmployees.length === 0 && <Empty description="没有匹配的员工原始数据" />}
      </>}
    </section>}

    {view === 'calculation' && <section className="kpi-panel">
      <div className="kpi-view-title"><div><span className="kpi-eyebrow">CALCULATION & REVIEW</span><h2>汇总计算与主管复核</h2><p>主管仅能在周期设置的复核时间范围内提交，HR 审核通过后计入正式汇总</p></div>{role === 'HR' && <Button disabled={!period?.generated || period.published} onClick={openCycleSettings}>周期设置</Button>}</div>
      {role === 'HR' && period?.cycleSettings && <div className="kpi-inline-notice"><ClockCircleOutlined />{Date.now() < new Date(period.cycleSettings.finalPublicationAt).getTime() ? `计划于 ${dayjs(period.cycleSettings.finalPublicationAt).format('YYYY-MM-DD HH:mm')} 自动公示` : !period.generated ? '已到最终公示时间，考核尚未生成，暂缓公示' : employees.some(employee => employee.reviewStatus !== '已通过') ? `已到自动公示时间，仍有 ${employees.filter(employee => employee.reviewStatus !== '已通过').length} 位员工待 HR 审核` : !departments.length ? '已到自动公示时间，本月暂无部门数据，暂缓公示' : departments.some(name => !period.departmentMetrics?.[name]?.confirmed) ? '已到自动公示时间，仍有部门系数待确认' : period.published ? '本月绩效已自动公示' : '已到自动公示时间，等待自动处理'}</div>}
      {role === '主管' && <div className="kpi-inline-notice"><AuditOutlined />{period?.published ? <>本月结果已公示，评分已锁定。<Button type="primary" size="small" onClick={() => { setMonth('2026-11'); setSelectedId(state.periods['2026-11']?.employees.find(employee => employee.manager === supervisor)?.id || ''); }}>进入 11 月复核演示</Button></> : period?.cycleSettings && !managerReviewOpen ? '当前不在主管复核时间范围内，评分只读且暂不可提交。' : !managerReviewOpen ? '本月尚未配置主管复核时间范围，评分只读。' : <>当前为主管复核时间范围内。选择左侧待复核员工，填写复核说明后提交给 HR 审核。</>}</div>}
      {!period?.generated && <div className="kpi-inline-notice"><ClockCircleOutlined />生成考核后可提交主管复核。以下演示数据可供预览。</div>}
      {role === '主管' && selectedEmployee && <div className="kpi-manager-department-overview"><strong>{selectedEmployee.department}</strong><span>{currentReviewGroup.length} 位员工</span><span>当前平均 {((currentReviewGroup.reduce((sum, employee) => sum + scoreForEmployee(employee), 0)) / currentReviewGroup.length).toFixed(1)} 分</span><span>复核后预览 {((currentReviewGroup.reduce((sum, employee) => sum + previewManagerScore(employee), 0)) / currentReviewGroup.length).toFixed(1)} 分</span></div>}
      <div className={`kpi-calculation-layout${role === 'HR' ? ' is-hr-review' : ''}`}><div className="kpi-employee-rail">
        {role === 'HR' ? <><div className="kpi-rail-heading"><span>复核对象</span><Tag>{reviewFilter === 'all' ? accessibleEmployees.length : employeeGroups.reduce((count, [, members]) => count + members.length, 0)}</Tag></div><Select aria-label="筛选汇总复核事项" value={reviewFilter} options={[{ value: 'all', label: '全部员工' }, { value: 'manager', label: `主管复核待确认 · ${pendingHrEmployees.length}` }, { value: 'appeals', label: `员工申诉 · ${pendingAppeals.length}` }]} onChange={value => { setReviewFilter(value); const next = accessibleEmployees.find(employee => value === 'all' || (value === 'manager' ? isManagerReviewPending(employee) : hasPendingAppeal(employee))); setSelectedId(next?.id || ''); }} />{employeeGroups.map(([departmentName, departmentEmployees]) => {
          const collapsed = collapsedReviewDepartments.has(departmentName);
          return <section className="kpi-team-department" key={departmentName} aria-label={`${departmentName}成员`}>
            <button type="button" className="kpi-review-department-toggle" aria-expanded={!collapsed} aria-label={`${departmentName}，${departmentEmployees.length} 位成员，${collapsed ? '展开' : '收起'}`} onClick={() => setCollapsedReviewDepartments(current => { const next = new Set(current); if (next.has(departmentName)) next.delete(departmentName); else next.add(departmentName); return next; })}>
              <span className="kpi-review-department-name">{departmentName}<span className="kpi-review-department-count">{departmentEmployees.length}</span></span>
              {collapsed ? <RightOutlined /> : <DownOutlined />}
            </button>
            {!collapsed && <div className="kpi-team-members">{departmentEmployees.map(employee => <button type="button" key={employee.id} className={`kpi-team-member${selectedEmployee?.id === employee.id ? ' is-active' : ''}`} aria-pressed={selectedEmployee?.id === employee.id} onClick={() => setSelectedId(employee.id)}><span className="kpi-avatar">{employee.name.slice(0, 1)}</span><span className="kpi-team-member-info"><b>{employee.name}</b><small>{employee.department} · {employee.position} · <span className="kpi-team-member-status">{employee.reviewStatus}</span></small></span><span className="kpi-review-badges">{isManagerReviewPending(employee) && <Tag color="processing">主管复核</Tag>}{hasPendingAppeal(employee) && <Tag color="warning">员工申诉</Tag>}</span><i className={`kpi-status-dot ${employee.reviewStatus === '已通过' ? 'is-done' : employee.reviewStatus === '待 HR 审核' ? 'is-hr' : ''}`} /></button>)}</div>}
          </section>;
        })}{reviewFilter !== 'all' && employeeGroups.length === 0 && <Empty description="暂无待处理事项" />}</> : <><div className="kpi-rail-heading">我的团队 <Tag>{accessibleEmployees.length}</Tag></div>{accessibleEmployees.map(employee => <button type="button" key={employee.id} className={selectedEmployee?.id === employee.id ? 'is-active' : ''} onClick={() => setSelectedId(employee.id)}><span className="kpi-avatar">{employee.name.slice(0, 1)}</span><span><b>{employee.name}</b><small>{employee.department} · {employee.reviewStatus}</small></span><i className={`kpi-status-dot ${employee.reviewStatus === '已通过' ? 'is-done' : employee.reviewStatus === '待 HR 审核' ? 'is-hr' : ''}`} /></button>)}</>}
      </div>
        {selectedEmployee && <div className="kpi-calc-detail"><div className="kpi-calc-person"><div><span className="kpi-eyebrow">EMPLOYEE PERFORMANCE</span><h3>{selectedEmployee.name}<small>{selectedEmployee.department} · {selectedEmployee.position}</small></h3><p>直属主管：{selectedEmployee.manager}</p></div><Tag color={selectedEmployee.reviewStatus === '已通过' ? 'success' : selectedEmployee.reviewStatus === '待 HR 审核' ? 'processing' : selectedEmployee.reviewStatus === 'HR 已退回' ? 'error' : 'warning'}>{selectedEmployee.reviewStatus}</Tag></div>
          <div className="kpi-calc-scoreboard">{KPI_DIMENSIONS.map(dimension => <div key={dimension.key}><span>{dimension.label}<small>{dimension.weight}</small></span><b>{dimension.key === 'objective' ? kpiDimensionScores(selectedEmployee).objective : dimension.key === 'review' ? kpiDimensionScores(selectedEmployee).review : selectedEmployee.scores[dimension.key]}<small> / {dimension.max}</small></b></div>)}<div className="is-adjustment"><span>{selectedEmployee.scoreAllocationVersion === 2 ? '目标加减分（已计入月度目标）' : '人工加减分'}<small>需填写原因</small></span><b className={selectedEmployee.scores.managerAdjustment > 0 ? 'is-positive' : selectedEmployee.scores.managerAdjustment < 0 ? 'is-negative' : ''}>{selectedEmployee.scores.managerAdjustment > 0 ? '+' : ''}{selectedEmployee.scores.managerAdjustment.toFixed(1)}</b></div>{selectedEmployee.scoreAllocationVersion === 2 && <div className="is-adjustment"><span>临时任务扣分（已计入周月报）</span><b className={selectedEmployee.scores.temporaryTaskDeduction ? 'is-negative' : ''}>{(selectedEmployee.scores.temporaryTaskDeduction ?? 0).toFixed(1)}</b></div>}</div>
          <div className="kpi-total-score"><div><span>基础绩效分</span><small>按五项得分合计</small></div><strong>{scoreForEmployee(selectedEmployee).toFixed(1)}<small>分</small></strong><div className={`kpi-grade-stamp grade-${gradeForScore(scoreForEmployee(selectedEmployee)).grade.toLowerCase()}`}><b>{gradeForScore(scoreForEmployee(selectedEmployee)).grade}</b><span>基础系数 {coefficientText(gradeForScore(scoreForEmployee(selectedEmployee)).coefficient)}</span></div></div>
          {selectedEmployee.reviewStatus === '已通过' && selectedEmployee.scoreAllocationVersion === 2 && scoreAdjustmentDetails(selectedEmployee)}
          <div className="kpi-rule-line"><span>数据范围</span><b>全部为演示数据，月度目标暂未关联</b><span>计算版本</span><b>演示规则 V1</b></div>
          {managerReviewOpen && !period.published && ['待主管复核', 'HR 已退回'].includes(selectedEmployee.reviewStatus) && role === '主管' && <div className="kpi-manager-form"><div className="kpi-section-heading"><div><span className="kpi-eyebrow">MANAGER REVIEW</span><h3>{selectedEmployee.department}复核 · {selectedEmployee.reviewStatus === 'HR 已退回' ? '修改并重新提交' : '复核评分'}</h3></div><Tag color={selectedEmployee.reviewStatus === 'HR 已退回' ? 'error' : 'gold'}>{selectedEmployee.reviewStatus === 'HR 已退回' ? 'HR 已退回' : '待提交'}</Tag></div>{selectedEmployee.reviewStatus === 'HR 已退回' && selectedEmployee.hrNote && <div className="kpi-return-note">{selectedEmployee.hrNote}</div>}<div className="kpi-manager-fields"><label>工作态度分<InputNumber min={0} max={15} value={selectedEmployee.managerDraft?.attitude ?? selectedEmployee.scores.attitude} onChange={value => updateEmployee(selectedEmployee.id, employee => ({ ...employee, managerDraft: { attitude: Number(value ?? 0), adjustment: employee.managerDraft?.adjustment ?? employee.scores.managerAdjustment, temporaryTaskDeduction: employee.managerDraft?.temporaryTaskDeduction ?? employee.scores.temporaryTaskDeduction ?? 0, reason: employee.managerDraft?.reason ?? '' } }))} /></label><label>目标加减分<InputNumber value={selectedEmployee.managerDraft?.adjustment ?? selectedEmployee.scores.managerAdjustment} onChange={value => updateEmployee(selectedEmployee.id, employee => ({ ...employee, managerDraft: { attitude: employee.managerDraft?.attitude ?? employee.scores.attitude, adjustment: Number(value ?? 0), temporaryTaskDeduction: employee.managerDraft?.temporaryTaskDeduction ?? employee.scores.temporaryTaskDeduction ?? 0, reason: employee.managerDraft?.reason ?? '' } }))} /></label><label>临时任务扣分<InputNumber max={0} value={selectedEmployee.managerDraft?.temporaryTaskDeduction ?? selectedEmployee.scores.temporaryTaskDeduction ?? 0} onChange={value => updateEmployee(selectedEmployee.id, employee => ({ ...employee, managerDraft: { attitude: employee.managerDraft?.attitude ?? employee.scores.attitude, adjustment: employee.managerDraft?.adjustment ?? employee.scores.managerAdjustment, temporaryTaskDeduction: Math.min(0, Number(value ?? 0)), reason: employee.managerDraft?.reason ?? '' } }))} /></label></div><label className="kpi-reason-label">复核说明<Input.TextArea rows={3} maxLength={200} value={selectedEmployee.managerDraft?.reason || ''} placeholder="填写事实依据，提交后由 HR 审核" onChange={event => updateEmployee(selectedEmployee.id, employee => ({ ...employee, managerDraft: { attitude: employee.managerDraft?.attitude ?? employee.scores.attitude, adjustment: employee.managerDraft?.adjustment ?? employee.scores.managerAdjustment, temporaryTaskDeduction: employee.managerDraft?.temporaryTaskDeduction ?? employee.scores.temporaryTaskDeduction ?? 0, reason: event.target.value } }))} /></label><div className="kpi-manager-preview"><span>提交后的评分预览</span><b>{previewManagerScore(selectedEmployee).toFixed(1)} 分 · {gradeForScore(previewManagerScore(selectedEmployee)).grade} 级</b><small>保存草稿不影响正式分数；提交当前员工后由 HR 审核</small></div><div className="kpi-manager-actions"><Button onClick={() => { saveKpiDemo(state); messageApi.success(`${selectedEmployee.name}复核草稿已保存`); }}>保存草稿</Button><Button type="primary" icon={<SendOutlined />} onClick={applyManagerReview}>提交当前员工给 HR 审核</Button></div></div>}
          {role === 'HR' && !period?.published && selectedEmployee.reviewStatus === '待 HR 审核' && <section className="kpi-department-review" aria-label={`${selectedEmployee.name}主管复核`}>
            <div className="kpi-section-heading"><div><h3>{selectedEmployee.name} · 主管复核</h3><p>HR 通过后，调整分数计入正式汇总。</p></div><Tag color="processing">待审核</Tag></div>
            <div className="kpi-review-values">
              <div><span>工作态度分</span><b>{selectedEmployee.scores.attitude} → {selectedEmployee.managerDraft?.attitude ?? selectedEmployee.scores.attitude} 分</b></div>
              <div><span>月度目标加减分</span><b>{selectedEmployee.scores.managerAdjustment} → {selectedEmployee.managerDraft?.adjustment ?? selectedEmployee.scores.managerAdjustment} 分</b></div>
              <div><span>临时任务扣分</span><b>{selectedEmployee.scores.temporaryTaskDeduction ?? 0} → {selectedEmployee.managerDraft?.temporaryTaskDeduction ?? selectedEmployee.scores.temporaryTaskDeduction ?? 0} 分</b></div>
            </div>
            <div className="kpi-review-impact">
              <span>月度目标 {kpiDimensionScores(selectedEmployee).objective.toFixed(1)} → {previewManagerDimensions(selectedEmployee).objective.toFixed(1)} 分</span>
              <span>周月报提交 {kpiDimensionScores(selectedEmployee).review.toFixed(1)} → {previewManagerDimensions(selectedEmployee).review.toFixed(1)} 分</span>
              <strong>汇总 {scoreForEmployee(selectedEmployee).toFixed(1)} → {previewManagerScore(selectedEmployee).toFixed(1)} 分</strong>
            </div>
            <p className="kpi-review-reason">主管说明：{selectedEmployee.managerDraft?.reason || '未记录说明'}</p>
            <div className="kpi-review-actions"><Button type="primary" icon={<CheckOutlined />} onClick={() => approveEmployee(selectedEmployee)}>审核通过</Button><Button onClick={() => { setReturnTarget(selectedEmployee); setReturnReason(''); }}>退回主管修改</Button></div>
          </section>}
          {role === 'HR' && employeeAppeals(selectedEmployee).length > 0 && <section className="kpi-appeal-queue" aria-label="员工申诉复核"><div className="kpi-section-heading"><h3>员工申诉</h3></div>{employeeAppeals(selectedEmployee).map(appeal => <div className="kpi-appeal-row" key={appeal.id}><div><b>{appeal.employeeName} · {dayjs(appeal.createdAt).format('YYYY-MM-DD HH:mm')}</b><span>{appeal.reason}</span>{appeal.resolution && <small>处理说明：{appeal.resolution}</small>}{appeal.correction && <small>修正记录：{appealCorrectionFields.filter(field => appeal.correction!.before[field.key] !== appeal.correction!.after[field.key]).map(field => `${field.label} ${appeal.correction!.before[field.key]} → ${appeal.correction!.after[field.key]}`).join(' · ')}</small>}</div>{appeal.status === '待处理' ? <Button disabled={!!period?.cycleSettings && !isWithinKpiWindow(period.cycleSettings.appealConfirmation, clock)} onClick={() => openAppealReview(appeal)}>审核申诉</Button> : <Tag color={appeal.status === '已修正' ? 'success' : 'error'}>{appeal.status}</Tag>}</div>)}</section>}
          {role === '主管' && selectedEmployee.reviewStatus === '待 HR 审核' && <div className="kpi-hr-review-strip"><span><ClockCircleOutlined />已提交 HR 审核，评分暂未计入汇总；HR 通过后才会更新。</span></div>}
          {role === '主管' && selectedEmployee.reviewStatus === '已通过' && <div className="kpi-hr-review-strip"><span><CheckOutlined />HR 已审核通过，本员工评分已锁定并计入汇总。</span></div>}
          {!period?.reviewEnabled && selectedEmployee.reviewStatus === '待 HR 审核' && role === 'HR' && <div className="kpi-hr-review-strip"><span><LockOutlined />主管复核已关闭，当前部门按系统分待 HR 确认。</span><Button type="primary" onClick={() => approveEmployee(selectedEmployee)}>确认部门结果</Button></div>}
          {selectedEmployee.hrNote && <div className="kpi-review-note">处理记录：{selectedEmployee.hrNote}</div>}
        </div>}
      </div>
      <Modal open={!!returnTarget} title={`退回${returnTarget?.name || ''}复核`} footer={<><Button onClick={() => { setReturnTarget(null); setReturnReason(''); }}>取消</Button><Button type="primary" disabled={!returnReason.trim()} onClick={returnEmployee}>确认退回</Button></>} onCancel={() => { setReturnTarget(null); setReturnReason(''); }}><Input.TextArea aria-label="退回原因" rows={4} maxLength={200} value={returnReason} placeholder="填写退回原因" onChange={event => setReturnReason(event.target.value)} /></Modal>
    </section>}

    <Modal open={!!activeAppeal && role === 'HR' && view === 'calculation'} title={activeAppeal ? `${activeAppeal.employeeName} · 绩效申诉审核` : '绩效申诉审核'} width={760} className="kpi-appeal-review-modal" onCancel={closeAppealReview} footer={<><Button onClick={closeAppealReview}>取消</Button><Button danger disabled={!appealResolution.trim()} onClick={() => handleAppealDecision('reject')}>驳回申诉</Button><Button type="primary" disabled={!appealResolution.trim() || !appealCorrection} onClick={() => handleAppealDecision('correct')}>确认修正</Button></>}>
      {activeAppealEmployee && <section aria-label="当前绩效结果" className="kpi-appeal-current-result">{scoreBreakdown(activeAppealEmployee, true)}</section>}
      <section className="kpi-appeal-review-context" aria-label="申诉内容"><h3>申诉内容</h3><p>{activeAppeal?.reason}</p></section>
      {appealCorrection && <section className="kpi-appeal-correction" aria-label="修正数据"><h3>修正数据</h3><div className="kpi-appeal-fields"><label>目标完成率 (%)<InputNumber aria-label="申诉目标完成率" min={0} max={200} value={appealCorrection.okrCompletion} onChange={value => setAppealCorrection(current => current && { ...current, okrCompletion: Number(value ?? 0) })} /></label><label>月度目标得分<InputNumber aria-label="申诉月度目标得分" min={0} max={60} value={appealCorrection.objectiveScore} onChange={value => setAppealCorrection(current => current && { ...current, objectiveScore: Number(value ?? 0) })} /></label><label>周报迟交<InputNumber aria-label="申诉周报迟交" min={0} max={31} precision={0} value={appealCorrection.reportLate} onChange={value => setAppealCorrection(current => current && { ...current, reportLate: Number(value ?? 0), reviewScore: reportScoreFor({ ...current, reportLate: Number(value ?? 0) }) })} /></label><label>月报未交<InputNumber aria-label="申诉月报未交" min={0} max={31} precision={0} value={appealCorrection.reportMissing} onChange={value => setAppealCorrection(current => current && { ...current, reportMissing: Number(value ?? 0), reviewScore: reportScoreFor({ ...current, reportMissing: Number(value ?? 0) }) })} /></label><label>任务逾期<InputNumber aria-label="申诉任务逾期" min={0} max={31} precision={0} value={appealCorrection.tasksOverdue} onChange={value => setAppealCorrection(current => current && { ...current, tasksOverdue: Number(value ?? 0) })} /></label><label>周月报提交得分<strong>{appealCorrection.reviewScore} 分</strong></label></div></section>}
      <label className="kpi-appeal-resolution">处理说明<Input.TextArea aria-label="申诉处理说明" rows={3} maxLength={500} showCount value={appealResolution} onChange={event => setAppealResolution(event.target.value)} /></label>
    </Modal>
    <Modal open={!!sourceCorrectionTarget && role === 'HR' && view === 'sources'} title={sourceCorrectionTarget ? `${sourceCorrectionTarget.employee.name} · ${sourceCorrectionTarget.source === 'objective' ? '月度目标' : '周月报'}绩效修正记录` : '绩效修正记录'} width={640} footer={<Button onClick={() => setSourceCorrectionTarget(null)}>关闭</Button>} onCancel={() => setSourceCorrectionTarget(null)}>
      {sourceCorrectionTarget && sourceCorrectionTarget.employee.approvedSourceCorrections?.filter(record => record.source === sourceCorrectionTarget.source).map(record => <div className="kpi-appeal-row" key={record.id}><div><b>{dayjs(record.at).format('YYYY-MM-DD HH:mm')} · {record.actor} · 员工申诉</b>{Object.keys(record.after).map(field => <span key={field}>{({ okrCompletion: '目标完成率', objectiveScore: '目标得分', reportLate: '周报迟交', monthlyReportLate: '月报迟交', weeklyReportMissing: '周报未交', reportMissing: '月报未交', tasksOverdue: '任务逾期', reviewScore: '复盘得分' } as Record<string, string>)[field] || field}：{record.before[field]} → {record.after[field]}</span>)}<small>处理说明：{record.reason}</small><small>申诉记录：{record.appealId}</small></div></div>)}
    </Modal>
    <Modal open={cycleSettingsOpen && role === 'HR'} title={`${monthLabel(month)}周期设置`} width={720} footer={null} onCancel={() => { setCycleSettingsOpen(false); setCycleDraft(null); }}>
      <div className="kpi-cycle-modal-content">
        <p className="kpi-cycle-description">设置月度目标提交、主管复核、员工申诉确认及最终自动公示时间。</p>
        {!period?.generated && <div className="kpi-inline-notice"><ClockCircleOutlined />请先生成本月考核，再设置业务周期。</div>}
        {period?.published && <div className="kpi-inline-notice"><LockOutlined />本月已公示，周期设置已锁定。</div>}
        {cycleDraft && <div className="kpi-cycle-form">
          <label>月度目标最迟提交时间<DatePicker aria-label="月度目标最迟提交时间" showTime format="YYYY-MM-DD HH:mm" value={cycleDraft.monthlyGoalDeadline ? dayjs(cycleDraft.monthlyGoalDeadline) : null} disabled={period?.published} onChange={value => setCycleDraft(current => current && ({ ...current, monthlyGoalDeadline: value?.toISOString() }))} /></label>
          <label>主管复核时间范围<DatePicker.RangePicker showTime format="YYYY-MM-DD HH:mm" value={[dayjs(cycleDraft.managerReview.startAt), dayjs(cycleDraft.managerReview.endAt)]} disabled={period?.published} onChange={values => { if (values?.[0] && values[1]) setCycleDraft(current => current && ({ ...current, managerReview: { startAt: values[0]!.toISOString(), endAt: values[1]!.toISOString() } })); }} /></label>
          <label>最终公示时间<DatePicker showTime format="YYYY-MM-DD HH:mm" value={dayjs(cycleDraft.finalPublicationAt)} disabled={period?.published} onChange={value => { if (value) setCycleDraft(current => current && ({ ...current, finalPublicationAt: value.toISOString() })); }} /></label>
          <label>员工申诉确认时间范围<DatePicker.RangePicker showTime format="YYYY-MM-DD HH:mm" value={[dayjs(cycleDraft.appealConfirmation.startAt), dayjs(cycleDraft.appealConfirmation.endAt)]} disabled={period?.published} onChange={values => { if (values?.[0] && values[1]) setCycleDraft(current => current && ({ ...current, appealConfirmation: { startAt: values[0]!.toISOString(), endAt: values[1]!.toISOString() } })); }} /></label>
          <div className="kpi-cycle-hint">主管复核结束后进入申诉确认阶段。最终公示时间到达后自动检查审核及部门系数；条件未满足时暂缓，条件满足后自动公示。</div>
          <div className="kpi-cycle-actions"><Button onClick={() => { setCycleSettingsOpen(false); setCycleDraft(null); }}>取消</Button><Button type="primary" disabled={!period?.generated || period.published} onClick={saveCycleSettings}>保存周期设置</Button></div>
        </div>}
        {!cycleDraft && period?.generated && !period.published && <div className="kpi-cycle-empty"><p>尚未配置本月周期</p><Button type="primary" onClick={() => { const base = dayjs().add(1, 'day').startOf('day'); setCycleDraft({ monthlyGoalDeadline: dayjs(month).date(5).hour(18).minute(0).second(0).toISOString(), managerReview: { startAt: base.toISOString(), endAt: base.add(3, 'day').toISOString() }, finalPublicationAt: base.add(4, 'day').toISOString(), appealConfirmation: { startAt: base.add(4, 'day').add(1, 'minute').toISOString(), endAt: base.add(8, 'day').toISOString() } }); }}>设置周期</Button></div>}
      </div>
    </Modal>

    {view === 'hr' && <section className="kpi-panel">
      <div className="kpi-view-title"><div><span className="kpi-eyebrow">DEPARTMENT FACTORS</span><h2>部门系数与红线</h2><p>按部门目标得分、成员表现和红线认定预览系数，确认后用于公示</p></div></div>
      <div className="kpi-department-factor-workspace">
        <aside className="kpi-factor-department-rail" aria-label="部门列表">
          <Input aria-label="搜索部门" allowClear placeholder="搜索部门" value={factorQuery} onChange={event => { setFactorQuery(event.target.value); setRedlineEmployeeId(null); }} prefix={<FileSearchOutlined />} />
          <div className="kpi-factor-department-count">部门 <b>{matchingFactorDepartments.length}</b></div>
          <div className="kpi-factor-department-options">
            {matchingFactorDepartments.length ? matchingFactorDepartments.map(name => {
              const confirmed = period.departmentMetrics?.[name]?.confirmed;
              return <button type="button" key={name} className={activeFactorDepartment === name ? 'is-active' : ''} aria-pressed={activeFactorDepartment === name} onClick={() => { setFactorDepartment(name); setRedlineEmployeeId(null); }}>
                <span><b>{name}</b><small>{employees.filter(employee => employee.department === name).length} 位成员 · {confirmed ? `系数 ${coefficientText(period.departmentCoefficients[name] ?? 1)}` : '待确认'}</small></span>
                <i className={`kpi-status-dot ${confirmed ? 'is-done' : ''}`} />
              </button>;
            }) : null}
          </div>
        </aside>
        {activeFactorDepartment ? (() => {
          const name = activeFactorDepartment;
          const preview = departmentCoefficientPreview(period, name);
          const metric = period.departmentMetrics?.[name];
          return <section className="kpi-department-factor-detail" aria-label={`${name}系数详情`}>
            <div className="kpi-section-heading"><div><span className="kpi-eyebrow">DEPARTMENT FACTOR</span><h3>{name}</h3></div><Tag color={metric?.confirmed ? 'success' : 'warning'}>{metric?.confirmed ? '已确认' : '待确认'}</Tag></div>
            <div className="kpi-factor-metrics" role="group" aria-label={`${name}系数指标`}>
              <span>部门目标完成率 <b>{preview.objectiveCompletion.toFixed(1)}%</b></span>
              <span>综合基础分 <b>{preview.baseScore === null ? '待确认' : preview.baseScore.toFixed(2)}</b></span>
              <span>初始系数 <b>{coefficientText(preview.initialCoefficient)}</b></span>
              <span>成员平均完成率 <b>{preview.memberCompletion.toFixed(1)}%</b></span>
              <span>部门员工延迟提交人数 <b>{preview.delayedSubmissionCount} 人</b></span>
              <span>员工重大失职/红线/负面舆情 <b>{preview.touchedRedline ? '是' : '否'}</b></span>
              <span>责任系数 <b>{coefficientText(preview.responsibilityCoefficient)}</b></span>
              <span>部门调节系数 <b>{coefficientText(preview.adjustment)}</b></span>
              <span>最终部门绩效调节系数 <b>{coefficientText(preview.coefficient)}</b></span>
            </div>
            <div className="kpi-factor-criteria" role="group" aria-label={`${name}部门判断项`}>
              <label>是否涉及业务经营要求 <Switch aria-label={`${name}业务经营要求`} checked={!!metric?.businessRequirement} disabled={role !== 'HR' || period.published} onChange={value => updateDepartmentMetric(name, 'businessRequirement', value)} /></label>
              <label>是否涉及管理与技术沉淀 <Switch aria-label={`${name}管理与技术沉淀`} checked={!!metric?.managementContribution} disabled={role !== 'HR' || period.published} onChange={value => updateDepartmentMetric(name, 'managementContribution', value)} /></label>
              <label>是否涉及风险危机处置 <Switch aria-label={`${name}风险危机处置`} checked={!!metric?.riskResponse} disabled={role !== 'HR' || period.published} onChange={value => updateDepartmentMetric(name, 'riskResponse', value)} /></label>
            </div>
            <div className="kpi-factor-context"><label>是否触碰红线 <Select aria-label={`${name}是否触碰红线`} value={preview.redlineChoice} disabled={role !== 'HR' || period.published} onChange={value => updateDepartmentMetric(name, 'redlineChoice', value)} options={departmentRedlineChoices.map(value => ({ value, label: value }))} /></label><span>部门员工绩效等级名额分布 <b>{['S', 'A', 'B', 'C', 'D', 'E'].map(grade => `${grade} ${employees.filter(employee => employee.department === name && gradeForScore(scoreForEmployee(employee)).grade === grade).length}`).join(' · ')}</b></span></div>
            <div className="kpi-factor-redline-section">
              <div className="kpi-section-heading"><h3>本部门员工红线</h3><Button icon={<PlusOutlined />} disabled={role !== 'HR' || period.published || availableFactorRedlineEmployees.length === 0} onClick={() => setRedlineEmployeeId('')}>新增红线员工</Button></div>
              {factorRedlineEmployees.length ? <div className="kpi-factor-redline-list">{factorRedlineEmployees.map(employee => <div key={employee.id} className="kpi-factor-redline-row"><div className="kpi-redline-person"><div className="kpi-avatar">{employee.name.slice(0, 1)}</div><div><b>{employee.name}</b><span>{employee.department}</span></div><Button danger size="small" disabled={role !== 'HR' || period.published} onClick={() => updateRedline(employee, '无', '')}>移除红线</Button></div><div className="kpi-redline-controls"><label>红线类型<Select disabled={role !== 'HR' || period.published} value={employee.redline?.type} onChange={type => updateRedline(employee, type, type === '重大失职' ? '绩效系数清零' : '最高系数限制为 0.8')} options={['一般违规', '重大失职', '负面舆情'].map(value => ({ value, label: value }))} /></label><label>影响方式<Select disabled={role !== 'HR' || period.published} value={employee.redline?.impact} onChange={impact => updateRedline(employee, employee.redline?.type || '一般违规', impact)} options={['仅扣分', '最高系数限制为 0.8', '绩效系数清零', '系数下调一档'].map(value => ({ value, label: value }))} /></label></div></div>)}</div> : <Empty description="本部门无红线员工" />}
            </div>
          </section>;
        })() : <div className="kpi-department-factor-detail"><Empty description={departments.length ? '没有匹配的部门' : '暂无部门数据'} /></div>}
      </div>
      <div className="kpi-factor-actions" role="region" aria-label="本月部门系数统一确认">
        <small>计算规则：员工红线、成员平均完成率低于 80% 或延迟提交人数超过部门人数 30% 时，责任系数为 0.8，否则为 1.0；部门目标完成率为 0 时调节系数为 0，不超过 95% 时为 0.9，超过 95% 时按三项判断的开启数量取 1.0、1.1 或 1.2；最终系数按部门红线选项调整。</small>
        <div><span>{confirmedDepartmentCount}/{departments.length} 个部门已确认</span><Button type="primary" disabled={role !== 'HR' || !period?.generated || period.published || !departments.length || departments.some(name => period.departmentMetrics?.[name]?.goalScore == null) || confirmedDepartmentCount === departments.length} onClick={confirmAllFactors}>确认本月部门系数</Button></div>
      </div>
      <Modal open={redlineEmployeeId !== null && !!activeFactorDepartment} title={`新增${activeFactorDepartment || ''}红线员工`} okText="确认新增" cancelText="取消" onCancel={() => setRedlineEmployeeId(null)} onOk={() => { const employee = availableFactorRedlineEmployees.find(item => item.id === redlineEmployeeId); if (employee) { updateRedline(employee, '一般违规', '最高系数限制为 0.8'); setRedlineEmployeeId(null); } }} okButtonProps={{ disabled: !redlineEmployeeId || !availableFactorRedlineEmployees.some(employee => employee.id === redlineEmployeeId) }}><Select aria-label="选择本部门员工" className="kpi-redline-employee-select" placeholder="选择本部门员工" value={redlineEmployeeId || undefined} onChange={setRedlineEmployeeId} options={availableFactorRedlineEmployees.map(employee => ({ value: employee.id, label: `${employee.name} · ${employee.department}` }))} /></Modal>
    </section>}
  </section>;
};
