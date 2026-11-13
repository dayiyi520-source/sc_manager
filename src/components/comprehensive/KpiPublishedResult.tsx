import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { okrRepository, type OkrPerson, type OkrRecord } from '../../services/okrRepository';
import { scoreObjectivesFor, type ScoreObjective } from '../../services/okrPerformanceScore';
import mockOkrState from '../../data/mockOkrState.json';
import { KPI_DIMENSIONS, effectiveKpiSourceData, gradeForScore, kpiDimensionScores, scoreForEmployee, type KpiEmployee } from '../../services/kpiPerformanceDemo';
import type { KpiDepartmentSummary } from '../../services/kpiPerformancePublication';

type Cell = number | string | undefined;
const factorText = (value: number) => Number.isInteger(value) ? value.toFixed(1) : value.toFixed(2);
const cellText = (value: Cell) => typeof value === 'number' ? value.toFixed(1) : value || '—';

interface DetailRow { detail: string; source: string; rule: string; base?: Cell; hrBonus?: Cell; hrDeduction?: Cell; managerBonus?: Cell; managerDeduction?: Cell; score?: Cell }
interface DetailGroup { name: string; weight: string; score: number; explanation: string; rows: DetailRow[] }

function correctionTotals(employee: KpiEmployee, source: 'objective' | 'reports') {
  const key = source === 'objective' ? 'objectiveScore' : 'reviewScore';
  return (employee.approvedSourceCorrections || []).filter(record => record.source === source).reduce((total, record) => {
    const before = record.before[key], after = record.after[key];
    if (!Number.isFinite(before) || !Number.isFinite(after)) return total;
    const delta = after - before;
    return { bonus: total.bonus + Math.max(0, delta), deduction: total.deduction + Math.max(0, -delta) };
  }, { bonus: 0, deduction: 0 });
}

function approvedComment(employee: KpiEmployee) {
  const history = employee.reviewHistory || [];
  const approved = [...history].reverse().find(record => record.action === 'HR 审核通过');
  const index = approved ? history.indexOf(approved) : -1;
  if (index < 0) return null;
  const submission = history.slice(0, index).reverse().find(record => record.action === '提交主管复核');
  return submission?.reason.trim() ? submission : null;
}

function moduleExplanation(employee: KpiEmployee, name: string) {
  const lines: string[] = [];
  const history = employee.reviewHistory || [];
  history.forEach((record, index) => {
    if (record.action !== 'HR 审核通过') return;
    const { before, proposed } = record;
    const changes: string[] = [];
    if (name === '月度目标') {
      if ((proposed.goalBonus ?? 0) > 0) changes.push(`目标加分 +${proposed.goalBonus!.toFixed(1)} 分`);
      if ((proposed.goalDeduction ?? 0) > 0) changes.push(`目标减分 -${proposed.goalDeduction!.toFixed(1)} 分`);
      if (proposed.goalBonus === undefined && proposed.goalDeduction === undefined && before.adjustment !== proposed.adjustment) changes.push(`目标调整 ${before.adjustment.toFixed(1)} → ${proposed.adjustment.toFixed(1)} 分`);
      if (before.objectiveScore !== undefined && proposed.objectiveScore !== undefined && before.objectiveScore !== proposed.objectiveScore) changes.push(`${before.objectiveScore.toFixed(1)} → ${proposed.objectiveScore.toFixed(1)} 分`);
    }
    if (name === '周月报提交') {
      if ((before.temporaryTaskDeduction ?? 0) !== (proposed.temporaryTaskDeduction ?? 0)) changes.push(`临时任务扣分 ${(before.temporaryTaskDeduction ?? 0).toFixed(1)} → ${(proposed.temporaryTaskDeduction ?? 0).toFixed(1)} 分`);
      if (before.reviewScore !== undefined && proposed.reviewScore !== undefined && before.reviewScore !== proposed.reviewScore) changes.push(`${before.reviewScore.toFixed(1)} → ${proposed.reviewScore.toFixed(1)} 分`);
    }
    if (name === '工作态度' && before.attitude !== proposed.attitude) changes.push(`工作态度 ${before.attitude.toFixed(1)} → ${proposed.attitude.toFixed(1)} 分`);
    if (!changes.length) return;
    const submitted = history.slice(0, index).reverse().find(item => item.action === '提交主管复核');
    lines.push(`${changes.join('；')}。${submitted?.reason.trim() || record.reason.trim() || '未记录原因'}（${submitted?.actor || '主管未记录'}提交，${record.actor}审核通过，${record.at}）`);
  });
  const kind = name === '月度目标' ? 'objective' : name === '周月报提交' ? 'reports' : null;
  employee.approvedSourceCorrections?.filter(record => record.source === kind).forEach(record => lines.push(`HR 修正：${record.reason || '未记录原因'}（${record.actor}，${record.at}）`));
  if (!lines.length && ((name === '月度目标' && employee.scores.managerAdjustment !== 0) || (name === '周月报提交' && employee.scores.temporaryTaskDeduction))) return '历史评分未记录调整依据';
  return lines.join('\n') || '—';
}

function scoreGroups(employee: KpiEmployee, objectives: ScoreObjective[], goalStatus: string): DetailGroup[] {
  const source = effectiveKpiSourceData(employee);
  const dimensions = kpiDimensionScores(employee);
  const approved = [...(employee.reviewHistory || [])].reverse().find(record => record.action === 'HR 审核通过');
  const goalHr = correctionTotals(employee, 'objective');
  const reportHr = correctionTotals(employee, 'reports');
  const groups: Omit<DetailGroup, 'explanation'>[] = [
    { name: '月度目标', weight: '60%', score: dimensions.objective, rows: [
      { detail: '月度目标总完成率', source: `${source.okrCompletion}%`, rule: '公示结果记录；目标及 KR 明细仅供核对，不重算已公示成绩', base: employee.scores.objective, hrBonus: goalHr.bonus || undefined, hrDeduction: goalHr.deduction || undefined, managerBonus: approved?.proposed.goalBonus || undefined, managerDeduction: approved?.proposed.goalDeduction || undefined, score: dimensions.objective },
      ...objectives.flatMap((goal, index): DetailRow[] => [
        { detail: `O${index + 1} · ${goal.title}`, source: `完成率 ${goal.progress}%`, rule: `目标权重 ${goal.weight}% · ${goal.type === 'challenge' ? '挑战型' : '承诺型'}目标` },
        ...goal.krs.map((kr, krIndex) => ({ detail: `KR${index + 1}.${krIndex + 1} · ${kr.title}`, source: `完成率 ${kr.progress}%`, rule: `KR 权重 ${kr.weight}% · 归属 O${index + 1}` })),
      ]),
      ...(goalStatus ? [{ detail: '目标明细状态', source: goalStatus, rule: '保留已公示总完成率和得分' }] : []),
    ] },
    { name: '考勤', weight: '10%', score: employee.scores.attendance, rows: [
      { detail: '出勤情况', source: `${source.attendanceDays} 天`, rule: '各项规则取最低适用分，不逐行累加', base: employee.scores.attendance, score: employee.scores.attendance },
      { detail: '迟到', source: `${source.lateMinutes ?? 0} 分钟`, rule: '累计超过 15 分钟计 8 分，超过 30 分钟计 0 分' },
      { detail: '缺卡', source: `${source.missingPunches} 次`, rule: '超过 3 次计 0 分' },
      { detail: '早退', source: `${source.earlyLeaveCount ?? 0} 次`, rule: '出现早退计 0 分' },
      { detail: '旷工', source: `${source.absenceCount ?? 0} 次`, rule: '出现旷工计 0 分' },
      { detail: '年假 / 调休', source: `${(source.leaveRecords?.年假 ?? 0) + (source.leaveRecords?.调休 ?? 0)} 天`, rule: '合计超过 3 天计 8 分' },
      { detail: '事假', source: `${source.leaveRecords?.事假 ?? 0} 天`, rule: '0–1 天（不含 0）计 8 分；超过 1/2/3 天分别计 6/3/0 分' },
      { detail: '病假', source: `${source.leaveRecords?.病假 ?? 0} 天`, rule: '当前规则不单独计分' },
    ] },
    { name: '额外投入', weight: '5%', score: employee.scores.extraWork, rows: [{ detail: '审批加班时长', source: `${source.approvedOvertimeHours} 小时`, rule: `每 18 小时折算 5 分；上限 ${employee.scores.attendance === 0 ? 5 : 10} 分；公示记录 ${employee.scores.extraWork} 分`, base: employee.scores.extraWork, score: employee.scores.extraWork }] },
    { name: '工作态度', weight: '15%', score: employee.scores.attitude, rows: [{ detail: '主管月度综合评分', source: approved ? '已通过的主管复核记录' : '历史公示记录', rule: '最高 15 分', base: approved?.before.attitude ?? employee.scores.attitude, managerBonus: approved && approved.proposed.attitude > approved.before.attitude ? approved.proposed.attitude - approved.before.attitude : undefined, managerDeduction: approved && approved.before.attitude > approved.proposed.attitude ? approved.before.attitude - approved.proposed.attitude : undefined, score: employee.scores.attitude }] },
    { name: '周月报提交', weight: '10%', score: dimensions.review, rows: [
      { detail: '周月报提交得分', source: `原始记录 ${employee.scores.review} 分`, rule: '最高 10 分；使用已公示结果及已批准修正', base: employee.scores.review, hrBonus: reportHr.bonus || undefined, hrDeduction: reportHr.deduction || undefined, managerDeduction: approved && (approved.proposed.temporaryTaskDeduction ?? 0) < 0 ? -approved.proposed.temporaryTaskDeduction! : undefined, score: dimensions.review },
      { detail: '周报迟交', source: `${source.reportLate} 次`, rule: '每次扣 2 分' }, { detail: '月报迟交', source: `${source.monthlyReportLate ?? 0} 次`, rule: '每次扣 2 分' },
      { detail: '周报未交', source: `${source.weeklyReportMissing ?? 0} 次`, rule: '达到 3 次本模块计 0 分' }, { detail: '月报未交', source: `${source.reportMissing} 次`, rule: '存在未交本模块计 0 分' },
      { detail: '逾期任务', source: `${source.tasksOverdue} 项`, rule: '当前规则不单独扣分' },
    ] },
  ];
  return groups.map(group => ({ ...group, explanation: moduleExplanation(employee, group.name) }));
}

export interface KpiPublishedResultProps { employee: KpiEmployee; departmentSummary: KpiDepartmentSummary; finalCoefficient: number; month: string; actions?: React.ReactNode }

export const KpiPublishedResult: React.FC<KpiPublishedResultProps> = ({ employee, departmentSummary, finalCoefficient, month, actions }) => {
  const score = scoreForEmployee(employee);
  const grade = gradeForScore(score);
  const dimensions = kpiDimensionScores(employee);
  const scores: Record<string, number> = { objective: dimensions.objective, attendance: employee.scores.attendance, extraWork: employee.scores.extraWork, attitude: employee.scores.attitude, review: dimensions.review };
  const [goalData, setGoalData] = useState<{ key: string; goals: ScoreObjective[]; status: 'loading' | 'ready' | 'error' }>({ key: '', goals: [], status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const goalKey = `${employee.id}:${month}`;
  useEffect(() => {
    let active = true;
    setGoalData({ key: goalKey, goals: [], status: 'loading' });
    void Promise.all([okrRepository.people(), okrRepository.records()]).then(([people, records]) => {
      const peopleIds = new Set(people.map(person => person.id));
      const recordIds = new Set(records.map(record => record.id));
      const mergedPeople = [...people, ...(mockOkrState.okrPeople as OkrPerson[]).filter(person => /^e-0[1-6]$/.test(person.id) && !peopleIds.has(person.id))];
      const mergedRecords = [...records, ...(mockOkrState.okrRecords as OkrRecord[]).filter(record => record.id.startsWith('kpi-demo-goal-e-') && !recordIds.has(record.id))];
      const goals = scoreObjectivesFor(mergedRecords, mergedPeople, employee.id, month, 'personal').map(goal => {
        const record = mergedRecords.find(item => item.id === goal.id);
        if (!record?.payload.keyResults?.some(kr => kr.details?.length)) return goal;
        // The scoring helper expands personal action rows; group these back under their KR for the result view.
        const krs = record.payload.keyResults.map(kr => {
          const children = goal.krs.filter(item => kr.details?.some(detail => detail.id === item.id));
          if (!children.length) return goal.krs.find(item => item.id === kr.id);
          const weight = children.reduce((sum, child) => sum + child.weight, 0);
          return { id: kr.id, title: kr.title, weight, progress: weight ? Math.round(children.reduce((sum, child) => sum + child.progress * child.weight, 0) / weight * 100) / 100 : 0 };
        }).filter((kr): kr is ScoreObjective['krs'][number] => !!kr);
        return { ...goal, krs };
      });
      if (active) setGoalData({ key: goalKey, goals, status: 'ready' });
    }).catch(() => { if (active) setGoalData({ key: goalKey, goals: [], status: 'error' }); });
    return () => { active = false; };
  }, [goalKey, employee.id, month, attempt]);
  const currentGoals = goalData.key === goalKey ? goalData : { goals: [], status: 'loading' };
  const goalStatus = currentGoals.status === 'loading' ? '正在加载目标明细' : currentGoals.status === 'error' ? '目标明细加载失败' : currentGoals.goals.length ? '' : '暂无本月 O、KR 明细';
  const groups = scoreGroups(employee, currentGoals.goals, goalStatus);
  const comment = approvedComment(employee);
  return <section className="kpi-published-result" aria-label="绩效结果">
    <header className="kpi-published-heading"><div><h2>月度绩效结果</h2><p>{month.slice(0, 4)}年{Number(month.slice(5))}月 · 查看个人绩效结果、模块得分与评分依据</p></div><span>已公示</span></header>
    <section className="kpi-published-summary" aria-label="绩效结果总览">
      <div className="kpi-published-person"><div className="kpi-avatar">{employee.name.slice(0, 1)}</div><div><b>{employee.name}</b><span>{employee.department} · {employee.position}</span></div></div>
      <div className="kpi-published-metric"><span>绩效总分</span><b>{score.toFixed(1)}<small> / 105 分</small></b></div>
      <div className="kpi-published-metric"><span>绩效等级</span><b className={`grade-${grade.grade.toLowerCase()}`}>{grade.grade}<small> 级</small></b></div>
      <div className="kpi-published-metric is-personal-factor"><span>个人绩效系数</span><b className="is-success">{factorText(finalCoefficient)}</b></div>
      <div className="kpi-published-metric is-department-factor"><span>部门绩效系数</span><b>{factorText(departmentSummary.departmentCoefficient)}</b></div>
      <div className="kpi-published-metric"><span>部门员工平均绩效</span><b>{departmentSummary.averageScore.toFixed(1)}<small> 分</small></b><small>{departmentSummary.employeeCount} 位员工</small></div>
      <div className="kpi-published-distribution"><span>部门员工绩效等级分布</span><div>{(['S', 'A', 'B', 'C', 'D', 'E'] as const).map(item => <div key={item} className={`grade-${item.toLowerCase()}`}><b>{item}</b><small>{departmentSummary.gradeCounts[item]}</small></div>)}</div></div>
    </section>
    <section className="kpi-published-modules" aria-label="五项模块得分">{KPI_DIMENSIONS.map(dimension => {
      const value = scores[dimension.key];
      const label = dimension.key === 'attendance' ? '考勤' : dimension.key === 'review' ? '周月报提交' : dimension.label.replace('（演示）', '');
      return <div key={dimension.key}><span>{label}</span><b>{value}<small> / {dimension.max} 分</small></b><i><em style={{ width: `${Math.max(0, Math.min(100, value / dimension.max * 100))}%` }} /></i></div>;
    })}</section>
    <section className="kpi-published-comment" aria-label="绩效评语"><h3>绩效评语</h3><p>{comment?.reason || '暂无绩效评语'}</p>{comment && <small>{comment.actor} · {comment.at}</small>}</section>
    <section className="kpi-published-breakdown" aria-label="评分明细">
      <header><div><h3>评分明细</h3><p>按计分项展示数据来源、规则判定与分数影响</p></div><span>本月明细 <b>{groups.reduce((sum, group) => sum + group.rows.length, 0)} 项</b></span></header>
      <div className="kpi-published-table-wrap"><table aria-label="本月绩效评分明细"><thead><tr><th>模块</th><th>评分明细</th><th>数据来源</th><th>规则判定</th><th>基础分</th><th>HR 加分</th><th>HR 减分</th><th>主管加分</th><th>主管减分</th><th>本项得分</th><th>加减分说明</th></tr></thead><tbody>
        {groups.flatMap(group => group.rows.map((row, index) => <tr key={`${group.name}-${row.detail}`}>
          {index === 0 && <th scope="rowgroup" rowSpan={group.rows.length}><b>{group.name}</b><small>权重 {group.weight}</small></th>}
          <td className="kpi-detail-name">{row.detail}</td><td className="kpi-detail-source">{row.source}</td><td className="kpi-detail-rule">{row.rule}</td><td className="kpi-detail-number">{cellText(row.base)}</td><td className="kpi-detail-number">{cellText(row.hrBonus)}</td><td className="kpi-detail-number">{cellText(row.hrDeduction)}</td><td className="kpi-detail-number">{cellText(row.managerBonus)}</td><td className="kpi-detail-number">{cellText(row.managerDeduction)}</td><td className="kpi-detail-number is-score">{cellText(row.score)}</td>{index === 0 && <td className="kpi-module-explanation" rowSpan={group.rows.length}>{group.explanation}</td>}
        </tr>))}
      </tbody></table></div>
      {currentGoals.status === 'error' && <div className="kpi-goal-retry" role="alert">目标明细暂不可用，已公示成绩保持不变。<Button onClick={() => setAttempt(value => value + 1)}>重试加载目标明细</Button></div>}
      <footer><span>五项模块得分合计</span><small>{groups.map(group => group.score.toFixed(1)).join(' + ')}</small><b>{score.toFixed(1)} / 105 分</b></footer>
    </section>
    <p className="kpi-published-note">计分与历史数据说明：明细按现有评分来源及已审核记录展示；O、KR 展示所选月份当前可读取的已生效目标明细，不作为公示时点快照，不重算历史成绩；缺少分项审核记录时不推断调整原因。</p>
    {actions}
  </section>;
};
