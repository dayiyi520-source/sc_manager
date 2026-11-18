import React from 'react';
import { Input, InputNumber, Tag, Tooltip } from 'antd';
import { REVIEW_MODULES, reviewBookFor, type ModuleAdjustments, type ReviewActor } from '../../services/kpiReviewModel';
import { effectiveKpiSourceData, type KpiEmployee } from '../../services/kpiPerformanceDemo';
import type { DetailGroup, DetailRow } from './KpiPublishedResult';

const goalRules = {
  total: 'OKR 最终总分 = 基础分 + 累计加分\n基础分 = Σ（50 × 权重 × 完成率）\n整体上限 60 分',
  objective: '提前交付 / 交付品质优于 KR 约定标准：每项固定 +1 分',
  kr: '50% ≤ 单个 KR 完成率 < 70%，基础分扣 2 分；单个 KR 完成率 < 50%，基础分扣 4 分；单 KR 最低 0 分',
  challenge: '完成率 ≥ 60% 且交付阶段性成果：+1–2 分；\n完成率 100%，追加 +2–3 分；\n单挑战加分封顶 5 分',
};

/** Fixed row labels and rule copy; employee facts and published scores are never replaced with sample values. */
export function employeeDetailGroups(groups: DetailGroup[], employee: KpiEmployee): DetailGroup[] {
  const source = effectiveKpiSourceData(employee);
  const overtimeParts = [source.companyOvertimeHours, source.homeOvertimeHours, undefined];
  const knownTotal = overtimeParts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const splitConsistent = knownTotal <= source.approvedOvertimeHours && (overtimeParts.some(value => value === undefined) || knownTotal === source.approvedOvertimeHours);
  const hours = (value?: number) => splitConsistent && value !== undefined ? `${value} 小时` : '未记录';
  const extraLeave = Object.entries(source.leaveRecords || {}).filter(([name]) => !['年假', '调休', '事假'].includes(name));
  const fixedRows: Record<string, DetailRow[]> = {
    考勤: [
      { detail: '出勤', source: `${source.attendanceDays} 天`, rule: '累计迟到 ≤ 15 分钟，且事假 0 天：10 分' },
      { detail: '迟到', source: `${source.lateMinutes ?? 0} 分钟`, rule: '15 分钟 < 累计迟到 ≤ 30 分钟，或累计迟到 ≤ 15 分钟且事假 < 1 天：8 分\n累计迟到 > 30 分钟：0 分' },
      { detail: '缺卡', source: `${source.missingPunches} 次`, rule: '超过 3 次：0 分' },
      { detail: '早退', source: `${source.earlyLeaveCount ?? 0} 次`, rule: '有早退：0 分' },
      { detail: '旷工', source: `${source.absenceCount ?? 0} 次`, rule: '有旷工：0 分' },
      { detail: '年假 / 调休', source: `${(source.leaveRecords?.年假 ?? 0) + (source.leaveRecords?.调休 ?? 0)} 天`, rule: '合计超过 3 天：8 分' },
      { detail: '事假', source: `${source.leaveRecords?.事假 ?? 0} 天`, rule: '1 天：8 分\n超过 1 / 2 / 3 天分别：6 / 3 / 0 分' },
      { detail: '其他请假', source: source.leaveRecords ? `${extraLeave.reduce((sum, [, days]) => sum + days, 0)} 天` : '未记录', rule: '无规则判定' },
    ],
    额外投入: [
      { detail: '总加班时长', source: `${source.approvedOvertimeHours} 小时`, rule: '实际加班时长 ÷18×5 分。\n最高封顶 10 分。\n全勤分为0分，则本项封顶5分' },
      { detail: '公司加班', source: hours(source.companyOvertimeHours), rule: '月度审批加班 18 小时 = 5 分' },
      { detail: '居家加班', source: hours(source.homeOvertimeHours), rule: '月度审批加班 18 小时 = 5 分' },
      { detail: '出差地加班', source: hours(undefined), rule: '月度审批加班 18 小时 = 5 分' },
    ],
    工作态度: [
      { detail: '主管评分', source: '—', rule: 'OKR 得分 < 30 分，本项最高 6 分\n基准分 13 分\n主动攻坚、积极协同、主动优化流程：加 1–2 分\n被动应付、沟通消极、缺乏主观能动性：减 1–5 分' },
    ],
    周月报提交: [
      { detail: '周月报应提交', source: '未记录', rule: '基准分：10 分' },
      { detail: '周报迟交', source: `${source.reportLate} 次`, rule: '迟交扣 2 分 / 次\n内容敷衍 / 虚报扣 2 分 / 次' },
      { detail: '月报迟交', source: `${source.monthlyReportLate ?? 0} 次`, rule: '迟交扣 2 分 / 次\n内容敷衍 / 虚报扣 2 分 / 次' },
      { detail: '周报未交', source: `${source.weeklyReportMissing ?? 0} 次`, rule: '累计 3 次：0 分' },
      { detail: '月报未交', source: `${source.reportMissing} 次`, rule: '有未提交：0 分' },
      { detail: '临时任务逾期', source: `${source.tasksOverdue} 项`, rule: '逾期或质量不达标扣 2–4 分 / 次' },
    ],
  };
  return groups.map(group => ({ ...group, rows: group.name === '月度目标'
    ? group.rows.map((row, index) => ({ ...row, rule: index === 0 ? goalRules.total : row.detail.startsWith('KR') ? goalRules.kr : row.detail.startsWith('O') ? row.rule.includes('挑战型') ? goalRules.challenge : goalRules.objective : row.rule }))
    : fixedRows[group.name] || group.rows }));
}

const numberText = (value: number | string | undefined, adjustment = false) => value === undefined ? adjustment ? '0' : '—' : typeof value === 'number' ? String(Number(value.toFixed(2))) : value;

export interface ScoreTableEditor { actor: ReviewActor; values: ModuleAdjustments; onChange: (values: ModuleAdjustments) => void }
export function EmployeePublishedScoreTable({ groups, employee, editor }: { groups: DetailGroup[]; employee?: KpiEmployee; editor?: ScoreTableEditor }) {
  const isSupervisor = employee?.performanceKind === 'supervisor';
  const book = employee ? reviewBookFor(employee) : null;
  const headers = ['模块', '评分明细', '数据来源', '规则判定', '基础分', ...(isSupervisor ? ['加分', '减分'] : ['主管加分', '主管减分', 'HR加分', 'HR减分']), '刚性红线', '本项得分', '加减分说明'];
  return <div className="kpi-published-table-wrap kpi-employee-example-table"><table aria-label="本月绩效评分明细">
    <thead><tr>{headers.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
    {groups.map((group, moduleIndex) => {
      const module = REVIEW_MODULES[moduleIndex];
      const roles: ReviewActor[] = isSupervisor ? ['老板'] : ['主管', 'HR'];
      const entryFor = (actor: ReviewActor) => editor?.actor === actor ? editor.values[module.key] : book?.active[actor]?.[module.key];
      const fallback = (actor: ReviewActor, kind: 'bonus' | 'deduction') => actor === '主管' ? kind === 'bonus' ? group.managerBonus : group.managerDeduction : actor === 'HR' ? kind === 'bonus' ? group.hrBonus : group.hrDeduction : undefined;
      return <tbody key={group.name}>{group.rows.map((row, index) => <tr key={`${index}-${row.detail}`}>
        {index === 0 && <th scope="rowgroup" rowSpan={group.rows.length}><b>{group.name}</b><small>权重 {group.weight}</small></th>}
        <td className="example-detail">{row.detail}</td><td className="example-source">{row.source}</td><td className="example-rule"><Tooltip title={<span style={{ whiteSpace: 'pre-wrap' }}>{row.rule}</span>}><span className="example-rule-text">{row.rule}</span></Tooltip></td>
        {index === 0 && <>
          <td className="example-number" rowSpan={group.rows.length}>{numberText(employee?.reviewBook ? employee.reviewBook.base[module.key] : group.base)}</td>
          {roles.flatMap(actor => (['bonus', 'deduction'] as const).map(kind => <td key={`${actor}-${kind}`} className="example-number" rowSpan={group.rows.length}>
            {editor?.actor === actor ? <InputNumber aria-label={`${group.name}${actor}${kind === 'bonus' ? '加分' : '减分'}`} min={0} precision={2} value={editor.values[module.key][kind]} onChange={value => editor.onChange({ ...editor.values, [module.key]: { ...editor.values[module.key], [kind]: value ?? 0 } })} /> : numberText(entryFor(actor)?.[kind] ?? fallback(actor, kind), true)}
          </td>))}
          <td className="example-redline" rowSpan={group.rows.length}>{group.redline}</td>
          <td className="example-number is-score" rowSpan={group.rows.length}>{numberText(group.score)}</td>
          <td className="example-explanation" rowSpan={group.rows.length}>
            {roles.map(actor => {
              const entry = entryFor(actor);
              return editor?.actor === actor ? <label className="kpi-role-note" key={actor}><Tag>{actor}</Tag><Input.TextArea aria-label={`${group.name}${actor}加减分说明`} maxLength={500} autoSize={{ minRows: 2, maxRows: 5 }} value={editor.values[module.key].note} onChange={event => editor.onChange({ ...editor.values, [module.key]: { ...editor.values[module.key], note: event.target.value } })} /></label>
                : entry?.note ? <div className="kpi-role-note" key={actor}><Tag>{actor}</Tag><span>{entry.note}</span></div> : null;
            })}
            {!employee?.reviewBook && group.explanation !== '—' && <span>{group.explanation}</span>}
            {!editor && !roles.some(actor => entryFor(actor)?.note) && (!employee?.reviewBook && group.explanation === '—' || !!employee?.reviewBook) && '—'}
          </td>
        </>}
      </tr>)}</tbody>;
    })}
  </table></div>;
}
