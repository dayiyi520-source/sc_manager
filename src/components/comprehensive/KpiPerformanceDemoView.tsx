import React, { useEffect, useMemo, useState } from 'react';
import { App as AntApp, Button, Empty, Input, InputNumber, Modal, Select, Switch, Tag } from 'antd';
import { AuditOutlined, CheckOutlined, ClockCircleOutlined, DatabaseOutlined, FileSearchOutlined, FlagOutlined, LineChartOutlined, LockOutlined, PlusOutlined, SendOutlined, TrophyOutlined } from '@ant-design/icons';
import {
  createKpiPeriod, gradeForScore, KPI_DIMENSIONS, KPI_MONTHS, loadKpiDemo, saveKpiDemo,
  reviewManagerSubmission, scoreForEmployee, submitManagerReview, type KpiDemoState, type KpiEmployee, type KpiPeriod,
} from '../../services/kpiPerformanceDemo';
import { filterPublishedEmployees, listKpiAppeals, submitKpiAppeal, summarizeDepartmentPerformance, type KpiAppeal } from '../../services/kpiPerformancePublication';
import './kpi-performance-demo.css';

type ViewKey = 'public' | 'sources' | 'calculation' | 'hr';
type DemoRole = 'HR' | '主管' | '员工';
type SourceDataKey = 'objective' | 'attendance' | 'extraWork' | 'reports';

const views: Array<{ key: ViewKey; label: string; icon: React.ReactNode }> = [
  { key: 'public', label: '月度公示', icon: <TrophyOutlined /> },
  { key: 'sources', label: '原始数据', icon: <DatabaseOutlined /> },
  { key: 'calculation', label: '汇总复核', icon: <LineChartOutlined /> },
  { key: 'hr', label: 'HR 处理', icon: <AuditOutlined /> },
];

const sourceDataTabs: Array<{ key: SourceDataKey; label: string }> = [
  { key: 'objective', label: '月度目标原始数据' },
  { key: 'attendance', label: '考勤与请假数据' },
  { key: 'extraWork', label: '额外工作投入数据' },
  { key: 'reports', label: '周月报数据' },
];

const monthLabel = (month: string) => `${month.slice(0, 4)}年${Number(month.slice(5))}月`;
const coefficientText = (value: number) => Number.isInteger(value) ? value.toFixed(1) : value.toFixed(2);
const scoreTone = (score: number) => score > 90 ? 'high' : score > 80 ? 'good' : score > 70 ? 'mid' : 'low';

export const KpiPerformanceDemoView: React.FC = () => {
  const { message } = AntApp.useApp();
  const [state, setState] = useState<KpiDemoState>(loadKpiDemo);
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
  const [detailTarget, setDetailTarget] = useState<KpiEmployee | null>(null);

  useEffect(() => { saveKpiDemo(state); }, [state]);

  const period = state.periods[month];
  const employees = period?.employees || [];
  const accessibleEmployees = filterPublishedEmployees(employees, role, supervisor, 'e-01');
  const employeeDepartment = employees.find(employee => employee.id === 'e-01')?.department || '';
  const departmentEmployees = employees.filter(employee => employee.department === employeeDepartment);
  const publicationEmployees = role === '员工' ? departmentEmployees : accessibleEmployees;
  const departmentSummaries = summarizeDepartmentPerformance(publicationEmployees, period?.departmentCoefficients || {});
  const employeeDepartmentSummary = departmentSummaries.find(item => item.department === employeeDepartment);
  const selectedEmployee = accessibleEmployees.find(employee => employee.id === selectedId) || accessibleEmployees[0];
  const filteredEmployees = useMemo(() => accessibleEmployees.filter(employee =>
    (department === '全部部门' || employee.department === department)
    && (!query.trim() || `${employee.name}${employee.department}${employee.position}`.includes(query.trim()))), [accessibleEmployees, department, query]);
  const employeeGroups = useMemo(() => [...accessibleEmployees.reduce((groups, employee) => {
    const current = groups.get(employee.department) || [];
    groups.set(employee.department, [...current, employee]);
    return groups;
  }, new Map<string, KpiEmployee[]>())], [accessibleEmployees]);

  const updatePeriod = (updater: (previous: KpiPeriod) => KpiPeriod) => {
    setState(current => ({ ...current, periods: { ...current.periods, [month]: updater(current.periods[month]) } }));
  };
  const updateEmployee = (id: string, updater: (employee: KpiEmployee) => KpiEmployee) => updatePeriod(current => ({ ...current, employees: current.employees.map(employee => employee.id === id ? updater(employee) : employee) }));
  const requireHr = () => {
    if (role === 'HR') return true;
    message.warning('切换到 HR 体验视角后可执行此操作');
    return false;
  };

  const generatePeriod = () => {
    if (!requireHr()) return;
    Modal.confirm({
      title: `生成${monthLabel(month)}考核数据？`,
      content: '演示数据会进入主管复核或 HR 审核流程，已保存的本月人工处理状态将重置。',
      okText: '生成考核', cancelText: '取消',
      onOk: () => {
        updatePeriod(current => createKpiPeriod(current));
        message.success('考核数据已生成');
      },
    });
  };

  const publishPeriod = () => {
    if (!requireHr()) return;
    const pending = employees.filter(employee => employee.reviewStatus !== '已通过').length;
    if (pending) { message.warning(`还有 ${pending} 位员工未完成 HR 审核`); return; }
    Modal.confirm({
      title: `公示${monthLabel(month)}最终绩效？`,
      content: '公示后员工可见本月最终得分、等级和绩效系数。',
      okText: '确认公示', cancelText: '返回',
      onOk: () => { updatePeriod(current => ({ ...current, published: true })); message.success('绩效结果已公示'); },
    });
  };

  const applyManagerReview = () => {
    if (!selectedEmployee || role !== '主管' || !period?.reviewEnabled || !period.generated) return;
    try {
      updateEmployee(selectedEmployee.id, employee => submitManagerReview(employee));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '主管复核提交失败');
      return;
    }
    message.success('主管复核已提交，等待 HR 审核');
  };

  const approveEmployee = (employee: KpiEmployee) => {
    if (!requireHr()) return;
    try {
      updateEmployee(employee.id, current => reviewManagerSubmission(current, 'approve'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'HR 审核失败');
      return;
    }
    message.success(`${employee.name} 的绩效已审核通过`);
  };

  const returnEmployee = () => {
    if (!returnTarget || !requireHr()) return;
    try {
      updateEmployee(returnTarget.id, current => reviewManagerSubmission(current, 'return', returnReason));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '退回失败');
      return;
    }
    message.success(`${returnTarget.name} 的绩效已退回主管修改`);
    setReturnTarget(null);
    setReturnReason('');
  };

  const handleRoleChange = (nextRole: DemoRole) => {
    setRole(nextRole);
    if (nextRole === '员工') setView('public');
    else if (nextRole === '主管') setView(period?.generated ? 'calculation' : 'public');
    else if (view === 'hr' && !period?.generated) setView('public');
    setSelectedId(nextRole === '主管' ? employees.find(employee => employee.manager === supervisor)?.id || '' : 'e-01');
  };

  const setReviewMode = (enabled: boolean) => {
    if (!requireHr()) return;
    updatePeriod(current => ({
      ...current,
      reviewEnabled: enabled,
      employees: current.employees.map(employee => {
        if (enabled && employee.reviewStatus === '待 HR 审核' && !employee.managerDraft) {
          return { ...employee, reviewStatus: '待主管复核', hrNote: undefined };
        }
        if (!enabled && ['待主管复核', 'HR 已退回'].includes(employee.reviewStatus)) {
          return { ...employee, reviewStatus: '待 HR 审核', managerDraft: undefined, hrNote: '主管复核已关闭，等待 HR 确认系统计算结果。' };
        }
        return employee;
      }),
    }));
    message.success(`已${enabled ? '开启' : '关闭'}主管复核`);
  };

  const updateRedline = (employee: KpiEmployee, type: string, impact: string) => {
    updateEmployee(employee.id, current => ({
      ...current,
      redline: type === '无' ? undefined : { type, impact, active: true },
      hrNote: type === '无' ? 'HR 已确认本月无红线事项。' : `演示红线处理：${type}，${impact}。`,
    }));
    message.success('HR 处理结果已保存');
  };

  const scoreSummary = accessibleEmployees.map(employee => ({ employee, score: scoreForEmployee(employee), grade: gradeForScore(scoreForEmployee(employee)) }));
  const pendingManagerCount = employees.filter(employee => role === '主管' && employee.manager === supervisor && ['待主管复核', 'HR 已退回'].includes(employee.reviewStatus)).length;
  const pendingHrEmployees = employees.filter(employee => employee.reviewStatus === '待 HR 审核');
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

  const previewManagerScore = (employee: KpiEmployee) => {
    const draft = employee.managerDraft;
    return draft ? scoreForEmployee({ ...employee, scores: { ...employee.scores, attitude: draft.attitude, managerAdjustment: draft.adjustment } }) : scoreForEmployee(employee);
  };

  const handleAppealSubmit = () => {
    const ownEmployee = employees.find(employee => employee.id === 'e-01');
    if (!ownEmployee || !period?.published) return;
    try {
      const appeal = submitKpiAppeal({ month, employeeId: ownEmployee.id, employeeName: ownEmployee.name, reason: appealReason });
      setAppeals(current => [...current, appeal]);
      setAppealReason('');
      setAppealOpen(false);
      message.success('申诉已提交');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '申诉提交失败');
    }
  };

  const scoreBreakdown = (employee: KpiEmployee) => <div className="kpi-detail-content">
    <div className="kpi-detail-identity"><div className="kpi-avatar">{employee.name.slice(0, 1)}</div><div><b>{employee.name}</b><span>{employee.department} · {employee.position}</span></div><strong>{scoreForEmployee(employee).toFixed(1)} 分</strong></div>
    <div className="kpi-detail-dimensions">{KPI_DIMENSIONS.map(dimension => <div key={dimension.key}><span>{dimension.label.replace('（演示）', '')}</span><b>{employee.scores[dimension.key]}<small> / {dimension.max} 分</small></b><div className="kpi-detail-bar"><i style={{ width: `${Math.max(0, Math.min(100, employee.scores[dimension.key] / dimension.max * 100))}%` }} /></div></div>)}</div>
    <div className="kpi-detail-sources">
      <div><span>目标完成率（演示）</span><b>{employee.source.okrCompletion}%</b><small>月度目标 {employee.scores.objective} / 60 分</small></div>
      <div><span>出勤天数</span><b>{employee.source.attendanceDays} 天</b><small>迟到 {employee.source.lateCount} 次 · 缺卡 {employee.source.missingPunches} 次</small></div>
      <div><span>审批加班</span><b>{employee.source.approvedOvertimeHours} 小时</b><small>额外工作 {employee.scores.extraWork} / 5 分</small></div>
      <div><span>报告异常</span><b>{employee.source.reportLate + employee.source.reportMissing} 次</b><small>迟交 {employee.source.reportLate} · 未交 {employee.source.reportMissing} · 逾期任务 {employee.source.tasksOverdue}</small></div>
    </div>
    <div className="kpi-detail-total"><span>等级 {gradeForScore(scoreForEmployee(employee)).grade}</span><b>绩效系数 {coefficientText(finalCoefficient(employee))}</b></div>
  </div>;

  const showScoreDetail = (employee: KpiEmployee) => {
    setDetailTarget(employee);
  };

  return <section className="kpi-workspace">
    <header className="kpi-header">
      <div className="kpi-tabs" role="tablist" aria-label="绩效考核页面">
        {views.map(item => { const disabled = role === '员工' && item.key !== 'public' || role === '主管' && item.key === 'hr'; return <button key={item.key} role="tab" aria-selected={view === item.key} aria-disabled={disabled} className={`${view === item.key ? 'is-active' : ''}${disabled ? ' is-disabled' : ''}`} onClick={() => { if (!disabled) setView(item.key); }}>{item.icon}<span>{item.label}</span>{item.key === 'hr' && employees.some(employee => employee.reviewStatus === '待 HR 审核') && <i />}</button>; })}
      </div>
      <div className="kpi-header-actions">
        <Tag color="gold">演示数据</Tag>
        <Select aria-label="体验角色" value={role} options={['HR', '主管', '员工'].map(value => ({ value, label: `${value}视角` }))} onChange={handleRoleChange} />
        {role === '主管' && <Select aria-label="当前主管" value={supervisor} options={[...new Set(employees.map(employee => employee.manager))].map(value => ({ value, label: `${value}的团队` }))} onChange={value => { setSupervisor(value); setSelectedId(employees.find(employee => employee.manager === value)?.id || 'e-01'); }} />}
        <Select aria-label="考核月份" value={month} options={KPI_MONTHS.map(value => ({ value, label: monthLabel(value) }))} onChange={value => { setMonth(value); setSelectedId('e-01'); setDepartment('全部部门'); }} />
      </div>
    </header>

    {!period?.generated && view !== 'public' && <div className="kpi-inline-notice"><ClockCircleOutlined /> 本月考核尚未生成，原始数据可预览；生成后将进入评分和审核流程。{role === 'HR' && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={generatePeriod}>生成本月考核</Button>}</div>}

    {view === 'public' && <section className="kpi-panel kpi-public-view">
      <div className="kpi-view-title"><div><span className="kpi-eyebrow">FINAL RESULTS</span><h2>{monthLabel(month)}绩效公示</h2><p>{period?.published ? `公示时间 ${period.generatedAt || '2026-11-01'} · ${role === '员工' ? '仅展示本人结果与部门汇总' : role === '主管' ? '展示当前团队最终结果' : '展示全员最终结果'}` : '本月结果尚未公示'}</p></div>
        {role === 'HR' && (period?.generated ? <Button type="primary" icon={<SendOutlined />} disabled={employees.some(employee => employee.reviewStatus !== '已通过')} onClick={publishPeriod}>公示绩效结果</Button> : <Button type="primary" icon={<PlusOutlined />} onClick={generatePeriod}>生成本月考核</Button>)}
      </div>
      {role === '主管' && period?.generated && !period.published && <div className="kpi-inline-notice"><ClockCircleOutlined />当前团队有 {pendingManagerCount} 位员工待复核。请先在汇总复核中调整评分并提交，HR 通过后才会计入汇总。<Button type="primary" onClick={() => setView('calculation')}>进入主管复核</Button></div>}
      {role === 'HR' && period?.generated && pendingHrEmployees.length > 0 && <div className="kpi-inline-notice"><AuditOutlined />有 {pendingHrEmployees.length} 项主管评分待审核。<Button type="primary" onClick={() => setView('hr')}>进入 HR 审核</Button></div>}
      {period?.published && role !== '员工' ? <>
        <div className="kpi-public-overview">
          <div className="kpi-overview-score"><span>本月平均绩效</span><strong>{averageScore.toFixed(1)}</strong><small>分 <em>·</em> {publicationEmployees.length} 位员工</small></div>
          <div className="kpi-overview-metric"><span>平均绩效系数</span><b>{averageCoefficient.toFixed(2)}</b><small>部门调节前</small></div>
          <div className="kpi-grade-distribution"><span>等级分布</span><div>{gradeCounts.map(item => <div key={item.grade} className={`kpi-grade-count grade-${item.grade.toLowerCase()}`}><b>{item.grade}</b><small>{item.count}</small></div>)}</div></div>
        </div>
        <div className="kpi-scoreboard-head"><span>员工考核席位</span><span>点击查看最终结果</span></div>
        {role === 'HR' ? departmentSummaries.map(summary => <section className="kpi-department-public-group" key={summary.department} aria-label={`${summary.department}绩效公示`}>
          <header><div><h3>{summary.department}</h3><span>{summary.employeeCount} 位员工 · 部门系数 {coefficientText(summary.departmentCoefficient)}</span></div><strong>平均 {summary.averageScore.toFixed(1)} 分</strong></header>
          <div className="kpi-scoreboard-grid">{publicScoreSummary.filter(item => item.employee.department === summary.department).map(({ employee, score, grade }) => <button type="button" key={employee.id} className="kpi-scoreboard-tile" onClick={() => showScoreDetail(employee)}>
            <div className="kpi-avatar">{employee.name.slice(0, 1)}</div><div className="kpi-tile-person"><b>{employee.name}</b><span>{employee.department} · {employee.position}</span></div><div className={`kpi-tile-score tone-${scoreTone(score)}`}><strong>{score.toFixed(1)}</strong><small>{grade.grade} 级</small></div><div className="kpi-tile-coeff"><span>绩效系数</span><b>{coefficientText(finalCoefficient(employee))}</b></div>
          </button>)}</div>
        </section>) : <div className="kpi-scoreboard-grid">{publicScoreSummary.map(({ employee, score, grade }) => <button type="button" key={employee.id} className="kpi-scoreboard-tile" onClick={() => showScoreDetail(employee)}>
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
            {scoreBreakdown(employees.find(employee => employee.id === 'e-01')!)}
            <div className="kpi-appeal-actions"><span>{appeals.filter(appeal => appeal.month === month && appeal.employeeId === 'e-01').length ? `已提交 ${appeals.filter(appeal => appeal.month === month && appeal.employeeId === 'e-01').length} 条申诉` : '如对评分有异议，可提交申诉'}</span><Button onClick={() => setAppealOpen(true)}>绩效申诉</Button></div>
          </article> : <Empty description="暂无本人本月绩效记录" />}
        </>}
      </> : <div className="kpi-empty-state"><div className="kpi-empty-mark"><LockOutlined /></div><h3>{period?.generated ? 'HR 审核完成后即可公示' : '本月最终绩效尚未生成'}</h3><p>{period?.generated ? 'HR 完成审核并公示后，员工可查看本人绩效及部门汇总。' : '由 HR 控制考核生成时间。生成后进入汇总复核与审核。'}</p>{role === 'HR' && !period?.generated && <Button type="primary" icon={<PlusOutlined />} onClick={generatePeriod}>生成本月考核</Button>}</div>}
      <div className="kpi-demo-footnote"><LockOutlined /> 员工仅查看本人明细与部门汇总；主管仅查看当前团队，HR 查看分部门全员结果。</div>
      <Modal open={appealOpen} title={`${monthLabel(month)}绩效申诉`} okText="提交申诉" cancelText="取消" okButtonProps={{ disabled: !appealReason.trim() }} onOk={handleAppealSubmit} onCancel={() => { setAppealOpen(false); setAppealReason(''); }}>
        <p>请说明对哪些评分项目有异议及原因，申诉记录将保存在本地演示数据中。</p>
        <Input.TextArea aria-label="申诉原因" rows={4} maxLength={500} showCount value={appealReason} placeholder="填写申诉原因" onChange={event => setAppealReason(event.target.value)} />
      </Modal>
      <Modal open={!!detailTarget} title={detailTarget ? `${detailTarget.name} · ${monthLabel(month)}绩效结果` : ''} width={680} footer={<Button onClick={() => setDetailTarget(null)}>关闭</Button>} onCancel={() => setDetailTarget(null)}>
        {detailTarget && scoreBreakdown(detailTarget)}
      </Modal>
    </section>}

    {view === 'sources' && <section className="kpi-panel">
      <div className="kpi-view-title"><div><span className="kpi-eyebrow">SOURCE RECORDS</span><h2>考核原始数据</h2><p>按来源查看考核数据，演示数据用于说明字段与校对方式</p></div><div className="kpi-filter-row"><Input allowClear placeholder="搜索员工姓名" value={query} onChange={event => setQuery(event.target.value)} prefix={<FileSearchOutlined />} /><Button icon={<DatabaseOutlined />}>重新同步</Button></div></div>
      <div className="kpi-source-tabs" role="tablist" aria-label="原始数据分类">{sourceDataTabs.map(item => <button key={item.key} role="tab" aria-selected={sourceDataTab === item.key} className={sourceDataTab === item.key ? 'is-active' : ''} onClick={() => setSourceDataTab(item.key)}>{item.label}</button>)}</div>
      <div className="kpi-inline-notice"><DatabaseOutlined /> 数据范围：{monthLabel(month)} · 最后同步 2026-11-01 08:45 · {filteredEmployees.length} 项待校对</div>
      <div className="kpi-source-table-wrap"><table className="kpi-source-table"><thead><tr><th>员工</th><th>部门</th>{sourceDataTab === 'objective' && <><th>目标完成率</th><th>基础得分</th><th>目标加分</th><th>目标扣分</th><th>数据状态</th></>}{sourceDataTab === 'attendance' && <><th>出勤天数</th><th>迟到次数</th><th>缺卡次数</th><th>请假天数</th><th>数据状态</th></>}{sourceDataTab === 'extraWork' && <><th>审批加班</th><th>额外工作得分</th><th>佐证状态</th><th>取数时间</th></>}{sourceDataTab === 'reports' && <><th>周报迟交</th><th>月报未交</th><th>任务逾期</th><th>复盘得分</th><th>数据状态</th></>}</tr></thead><tbody>{filteredEmployees.map(employee => <tr key={employee.id} className={selectedId === employee.id ? 'is-selected' : ''} onClick={() => setSelectedId(employee.id)}>{<td><b>{employee.name}</b></td>}<td>{employee.department}</td>{sourceDataTab === 'objective' && <><td>{employee.source.okrCompletion}%</td><td>{employee.scores.objective.toFixed(1)}</td><td>{employee.scores.managerAdjustment > 0 ? employee.scores.managerAdjustment.toFixed(1) : '0'}</td><td>{employee.scores.managerAdjustment < 0 ? Math.abs(employee.scores.managerAdjustment).toFixed(1) : '0'}</td><td><Tag color={employee.source.okrCompletion >= 80 ? 'success' : 'warning'}>{employee.source.okrCompletion >= 80 ? '已核对' : '待核对'}</Tag></td></>}{sourceDataTab === 'attendance' && <><td>{employee.source.attendanceDays} 天</td><td>{employee.source.lateCount}</td><td>{employee.source.missingPunches}</td><td>0 天</td><td><Tag color="success">已核对</Tag></td></>}{sourceDataTab === 'extraWork' && <><td>{employee.source.approvedOvertimeHours} 小时</td><td>{employee.scores.extraWork.toFixed(1)}</td><td><Tag color="success">已核对</Tag></td><td>11-01 08:45</td></>}{sourceDataTab === 'reports' && <><td>{employee.source.reportLate}</td><td>{employee.source.reportMissing}</td><td>{employee.source.tasksOverdue}</td><td>{employee.scores.review.toFixed(1)}</td><td><Tag color={employee.source.reportLate + employee.source.reportMissing === 0 ? 'success' : 'warning'}>{employee.source.reportLate + employee.source.reportMissing === 0 ? '已核对' : '待核对'}</Tag></td></>}</tr>)}</tbody></table></div>
      {filteredEmployees.length === 0 && <Empty description="没有匹配的员工原始数据" />}
    </section>}

    {view === 'calculation' && <section className="kpi-panel">
      <div className="kpi-view-title"><div><span className="kpi-eyebrow">CALCULATION & REVIEW</span><h2>汇总计算与主管复核</h2><p>系统自动计算基础分；主管修改只有 HR 审核通过后才计入汇总</p></div>{role === 'HR' && <div className="kpi-review-switch"><div><b>允许主管复核修改</b><span>{period?.reviewEnabled ? '主管提交后进入 HR 待审队列' : '关闭后所有未提交修改转由 HR 确认系统分'}</span></div><Switch checked={period?.reviewEnabled} onChange={setReviewMode} /></div>}</div>
      {role === '主管' && <div className="kpi-inline-notice"><AuditOutlined />{period?.published ? <>本月结果已公示，评分已锁定。<Button type="primary" size="small" onClick={() => { setMonth('2026-11'); setSelectedId(state.periods['2026-11']?.employees.find(employee => employee.manager === supervisor)?.id || ''); }}>进入 11 月复核演示</Button></> : period?.reviewEnabled ? <>当前为主管复核工作区。选择左侧待复核员工，在下方修改工作态度分和目标加减分，填写复核说明后点击“提交给 HR 审核”。</> : 'HR 尚未开启主管复核，当前评分为只读。'}</div>}
      {!period?.generated && <div className="kpi-inline-notice"><ClockCircleOutlined />生成考核后可提交主管复核。以下演示数据可供预览。</div>}
      <div className="kpi-calculation-layout"><div className="kpi-employee-rail"><div className="kpi-rail-heading">我的团队 <Tag>{accessibleEmployees.length}</Tag></div>{role === 'HR' ? employeeGroups.map(([departmentName, departmentEmployees]) => <section className="kpi-team-department" key={departmentName}><h4>{departmentName}<Tag>{departmentEmployees.length}</Tag></h4>{departmentEmployees.map(employee => <button key={employee.id} className={selectedEmployee?.id === employee.id ? 'is-active' : ''} onClick={() => setSelectedId(employee.id)}><span className="kpi-avatar">{employee.name.slice(0, 1)}</span><span><b>{employee.name}</b><small>{employee.position} · {employee.reviewStatus}</small></span><i className={`kpi-status-dot ${employee.reviewStatus === '已通过' ? 'is-done' : employee.reviewStatus === '待 HR 审核' ? 'is-hr' : ''}`} /></button>)}</section>) : accessibleEmployees.map(employee => <button key={employee.id} className={selectedEmployee?.id === employee.id ? 'is-active' : ''} onClick={() => setSelectedId(employee.id)}><span className="kpi-avatar">{employee.name.slice(0, 1)}</span><span><b>{employee.name}</b><small>{employee.department} · {employee.reviewStatus}</small></span><i className={`kpi-status-dot ${employee.reviewStatus === '已通过' ? 'is-done' : employee.reviewStatus === '待 HR 审核' ? 'is-hr' : ''}`} /></button>)}</div>
        {selectedEmployee && <div className="kpi-calc-detail"><div className="kpi-calc-person"><div><span className="kpi-eyebrow">EMPLOYEE PERFORMANCE</span><h3>{selectedEmployee.name}<small>{selectedEmployee.department} · {selectedEmployee.position}</small></h3><p>直属主管：{selectedEmployee.manager}</p></div><Tag color={selectedEmployee.reviewStatus === '已通过' ? 'success' : selectedEmployee.reviewStatus === '待 HR 审核' ? 'processing' : selectedEmployee.reviewStatus === 'HR 已退回' ? 'error' : 'warning'}>{selectedEmployee.reviewStatus}</Tag></div>
          <div className="kpi-calc-scoreboard">{KPI_DIMENSIONS.map(dimension => <div key={dimension.key}><span>{dimension.label}<small>{dimension.weight}</small></span><b>{selectedEmployee.scores[dimension.key]}<small> / {dimension.max}</small></b></div>)}<div className="is-adjustment"><span>人工加减分<small>需填写原因</small></span><b>{selectedEmployee.scores.managerAdjustment > 0 ? '+' : ''}{selectedEmployee.scores.managerAdjustment.toFixed(1)}</b></div></div>
          <div className="kpi-total-score"><div><span>基础绩效分</span><small>按五个评分维度与主管调整合计</small></div><strong>{scoreForEmployee(selectedEmployee).toFixed(1)}<small>分</small></strong><div className={`kpi-grade-stamp grade-${gradeForScore(scoreForEmployee(selectedEmployee)).grade.toLowerCase()}`}><b>{gradeForScore(scoreForEmployee(selectedEmployee)).grade}</b><span>基础系数 {coefficientText(gradeForScore(scoreForEmployee(selectedEmployee)).coefficient)}</span></div></div>
          <div className="kpi-rule-line"><span>数据范围</span><b>全部为演示数据，月度目标暂未关联</b><span>计算版本</span><b>演示规则 V1</b></div>
          {period?.reviewEnabled && ['待主管复核', 'HR 已退回'].includes(selectedEmployee.reviewStatus) && role === '主管' && <div className="kpi-manager-form"><div className="kpi-section-heading"><div><span className="kpi-eyebrow">MANAGER REVIEW</span><h3>{selectedEmployee.reviewStatus === 'HR 已退回' ? '修改并重新提交' : '复核评分'}</h3></div><Tag color={selectedEmployee.reviewStatus === 'HR 已退回' ? 'error' : 'gold'}>{selectedEmployee.reviewStatus === 'HR 已退回' ? 'HR 已退回' : '待提交'}</Tag></div>{selectedEmployee.reviewStatus === 'HR 已退回' && selectedEmployee.hrNote && <div className="kpi-return-note">{selectedEmployee.hrNote}</div>}<div className="kpi-manager-fields"><label>工作态度分<InputNumber min={0} max={15} value={selectedEmployee.managerDraft?.attitude ?? selectedEmployee.scores.attitude} onChange={value => updateEmployee(selectedEmployee.id, employee => ({ ...employee, managerDraft: { attitude: Number(value ?? 0), adjustment: employee.managerDraft?.adjustment ?? employee.scores.managerAdjustment, reason: employee.managerDraft?.reason ?? '' } }))} /></label><label>目标加减分<InputNumber min={-5} max={5} value={selectedEmployee.managerDraft?.adjustment ?? selectedEmployee.scores.managerAdjustment} onChange={value => updateEmployee(selectedEmployee.id, employee => ({ ...employee, managerDraft: { attitude: employee.managerDraft?.attitude ?? employee.scores.attitude, adjustment: Number(value ?? 0), reason: employee.managerDraft?.reason ?? '' } }))} /></label></div><label className="kpi-reason-label">复核说明<Input.TextArea rows={3} maxLength={200} value={selectedEmployee.managerDraft?.reason || ''} placeholder="填写事实依据，提交后由 HR 审核" onChange={event => updateEmployee(selectedEmployee.id, employee => ({ ...employee, managerDraft: { attitude: employee.managerDraft?.attitude ?? employee.scores.attitude, adjustment: employee.managerDraft?.adjustment ?? employee.scores.managerAdjustment, reason: event.target.value } }))} /></label><div className="kpi-manager-preview"><span>提交后的评分预览</span><b>{previewManagerScore(selectedEmployee).toFixed(1)} 分 · {gradeForScore(previewManagerScore(selectedEmployee)).grade} 级</b><small>HR 审核通过后才更新正式汇总；退回后可继续修改</small></div><Button type="primary" icon={<SendOutlined />} onClick={applyManagerReview}>提交给 HR 审核</Button></div>}
          {role === 'HR' && selectedEmployee.reviewStatus === '待 HR 审核' && <div className="kpi-hr-review-strip"><span><ClockCircleOutlined />主管已提交修改。请在“HR 处理”页核对后通过或退回。</span><Button type="primary" onClick={() => setView('hr')}>进入 HR 审核</Button></div>}
          {role === '主管' && selectedEmployee.reviewStatus === '待 HR 审核' && <div className="kpi-hr-review-strip"><span><ClockCircleOutlined />已提交 HR 审核，评分暂未计入汇总；HR 通过后才会更新。</span></div>}
          {role === '主管' && selectedEmployee.reviewStatus === '已通过' && <div className="kpi-hr-review-strip"><span><CheckOutlined />HR 已审核通过，本员工评分已锁定并计入汇总。</span></div>}
          {!period?.reviewEnabled && selectedEmployee.reviewStatus === '待 HR 审核' && role === 'HR' && <div className="kpi-hr-review-strip"><span><LockOutlined />主管复核已关闭，本员工按系统计算结果待 HR 确认。</span><Button type="primary" onClick={() => setView('hr')}>进入 HR 审核</Button></div>}
          {selectedEmployee.hrNote && <div className="kpi-review-note">处理记录：{selectedEmployee.hrNote}</div>}
        </div>}
      </div>
    </section>}

    {view === 'hr' && <section className="kpi-panel">
      <div className="kpi-view-title"><div><span className="kpi-eyebrow">HR CONTROL CENTER</span><h2>HR 复核与部门调节</h2><p>先处理主管提交的评分，再维护红线和部门系数；全部通过后公示</p></div>{role === 'HR' && <Button type="primary" icon={<SendOutlined />} disabled={!period?.generated || employees.some(employee => employee.reviewStatus !== '已通过')} onClick={publishPeriod}>公示最终结果</Button>}</div>
      {role !== 'HR' && <div className="kpi-inline-notice"><LockOutlined />当前为{role}视角。HR处理操作仅可由 HR 体验角色执行。</div>}
      <div className="kpi-hr-summary"><div><span>待 HR 审核</span><b>{pendingHrEmployees.length}</b><small>主管已提交的评分调整</small></div><div><span>待处理红线</span><b>{employees.filter(employee => employee.redline && employee.reviewStatus !== '已通过').length}</b><small>需要 HR 核实事件与影响方式</small></div><div><span>部门调节</span><b>{Object.keys(period?.departmentCoefficients || {}).length}</b><small>演示系数按部门应用</small></div></div>
      <section className="kpi-review-queue"><div className="kpi-section-heading"><div><span className="kpi-eyebrow">PENDING HR REVIEWS</span><h3>员工绩效待审核</h3></div><Tag color={pendingHrEmployees.length ? 'processing' : 'default'}>{pendingHrEmployees.length} 项待处理</Tag></div>{pendingHrEmployees.length ? <div className="kpi-review-queue-list">{pendingHrEmployees.map(employee => <article key={employee.id} className="kpi-review-queue-item"><div className="kpi-review-queue-person"><div className="kpi-avatar">{employee.name.slice(0, 1)}</div><div><b>{employee.name}</b><span>{employee.department} · 主管 {employee.manager}</span></div></div><div className="kpi-review-queue-score"><span>当前汇总</span><b>{scoreForEmployee(employee).toFixed(1)} 分</b></div><div className="kpi-review-queue-score"><span>审核后预览</span><b>{previewManagerScore(employee).toFixed(1)} 分</b></div><p>{employee.managerDraft?.reason || '未启用主管复核，等待 HR 确认系统计算结果。'}</p><div className="kpi-review-queue-actions"><Button type="primary" icon={<CheckOutlined />} onClick={() => approveEmployee(employee)}>审核通过并更新汇总</Button><Button onClick={() => { setReturnTarget(employee); setReturnReason(''); }}>退回主管修改</Button></div></article>)}</div> : <Empty description={period?.generated ? '暂无待审核绩效' : '生成考核后，待审核结果会显示在这里'} />}</section>
      <div className="kpi-section-heading kpi-section-heading-spaced"><div><span className="kpi-eyebrow">DEPARTMENT FACTOR</span><h3>部门绩效系数</h3></div><Tag color="gold">演示口径 · 影响最终系数</Tag></div>
      <div className="kpi-department-factors">{Object.entries(period?.departmentCoefficients || {}).map(([name, coefficient]) => <label key={name}><span><b>{name}</b><small>{employees.filter(employee => employee.department === name).length} 位员工</small></span><InputNumber min={0} max={1.5} step={0.05} precision={2} disabled={role !== 'HR'} value={coefficient} onChange={value => { if (requireHr()) updatePeriod(current => ({ ...current, departmentCoefficients: { ...current.departmentCoefficients, [name]: Number(value ?? 1) } })); }} /><small>×</small></label>)}</div>
      <div className="kpi-section-heading kpi-section-heading-spaced"><div><span className="kpi-eyebrow">REDLINE REVIEW</span><h3>员工红线处理</h3></div><span className="kpi-muted-count">{employees.filter(employee => employee.redline).length} 条演示记录</span></div>
      <div className="kpi-redline-grid">{employees.map(employee => <article key={employee.id} className="kpi-redline-card"><div className="kpi-redline-person"><div className="kpi-avatar">{employee.name.slice(0, 1)}</div><div><b>{employee.name}</b><span>{employee.department}</span></div><Tag color={employee.reviewStatus === '已通过' ? 'success' : employee.reviewStatus === '待 HR 审核' ? 'processing' : employee.reviewStatus === 'HR 已退回' ? 'error' : 'warning'}>{employee.reviewStatus}</Tag></div><div className="kpi-redline-controls"><label>红线类型<Select disabled={role !== 'HR'} value={employee.redline?.type || '无'} onChange={type => updateRedline(employee, type, type === '重大失职' ? '绩效系数清零' : '最高系数限制为 0.8')} options={['无', '一般违规', '重大失职', '负面舆情'].map(value => ({ value, label: value }))} /></label><label>影响方式<Select disabled={role !== 'HR' || !employee.redline} value={employee.redline?.impact || undefined} placeholder="选择影响方式" onChange={impact => updateRedline(employee, employee.redline?.type || '一般违规', impact)} options={['仅扣分', '最高系数限制为 0.8', '绩效系数清零', '系数下调一档'].map(value => ({ value, label: value }))} /></label></div>{employee.redline && <div className="kpi-redline-result"><FlagOutlined /><span>{employee.redline.impact}</span><b>最终系数 {coefficientText(finalCoefficient(employee))}</b></div>}<div className="kpi-redline-note">{employee.hrNote || '未填写 HR 处理记录'}</div></article>)}</div>
      <div className="kpi-policy-note"><FlagOutlined /><div><b>红线按独立规则处理</b><span>绩效总分和等级按分数区间计算；红线及部门系数在最终绩效系数上处理。本演示的部门系数与红线影响口径仅用于展示，实际制度待确认。</span></div></div>
      <Modal open={!!returnTarget} title={`退回 ${returnTarget?.name || ''} 的主管复核`} footer={<><Button onClick={() => { setReturnTarget(null); setReturnReason(''); }}>取消</Button><Button type="primary" disabled={!returnReason.trim()} onClick={returnEmployee}>确认退回</Button></>} onCancel={() => { setReturnTarget(null); setReturnReason(''); }}><p className="kpi-return-modal-copy">退回后原汇总分保持不变，主管补充修改后可以重新提交。</p><Input.TextArea rows={4} maxLength={200} value={returnReason} placeholder="填写退回原因" onChange={event => setReturnReason(event.target.value)} /></Modal>
    </section>}
  </section>;
};
