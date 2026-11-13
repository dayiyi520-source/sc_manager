// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KpiPublishedResult } from './KpiPublishedResult';
import { loadKpiDemo } from '../../services/kpiPerformanceDemo';
import { summarizeDepartmentPerformance } from '../../services/kpiPerformancePublication';
import { okrRepository } from '../../services/okrRepository';
import seed from '../../data/mockOkrState.json';
vi.mock('../../services/okrRepository', () => ({ okrRepository: { people: vi.fn(), records: vi.fn() } }));
beforeEach(() => {
  localStorage.clear();
  vi.mocked(okrRepository.people).mockResolvedValue(seed.okrPeople as never);
  vi.mocked(okrRepository.records).mockResolvedValue(seed.okrRecords as never);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function props(id = 'e-01', month = '2026-10') {
  const period = loadKpiDemo().periods[month];
  const employee = period.employees.find(item => item.id === id)!;
  return { employee, month, finalCoefficient: 1.2, departmentSummary: summarizeDepartmentPerformance(period.employees, period.departmentCoefficients).find(item => item.department === employee.department)! };
}
describe('已公示评分明细', () => {
  it('显示总完成率、O 和 KR，分开来源与规则并按模块展示权重与说明', async () => {
    render(<KpiPublishedResult {...props()} />);
    expect(await screen.findByText('O1 · 重点版本方案按期交付')).toBeInTheDocument();
    expect(screen.getByText('KR1.1 · 完成重点版本方案并通过评审')).toBeInTheDocument();
    const table = screen.getByRole('table', { name: '本月绩效评分明细' });
    expect(within(table).getByRole('row', { name: /月度目标总完成率/ })).toHaveTextContent('93%');
    expect(within(table).getAllByText('完成率 93%')).toHaveLength(2);
    const headers = within(table).getAllByRole('columnheader').map(item => item.textContent);
    expect(headers).toEqual(['模块', '评分明细', '数据来源', '规则判定', '加分/扣分', '刚性红线', '基础分', '主管加分', '主管减分', 'HR 加分', 'HR 减分', '本项得分', '加减分说明']);
    expect(within(table).getByRole('row', { name: /月度目标总完成率/ })).toHaveTextContent('承诺型 O 至少 2 个');
    expect(within(table).getByRole('row', { name: /出勤情况/ })).toHaveTextContent('迟到累计超过 30 分钟');
    expect(table.querySelectorAll('.kpi-detail-redline')).toHaveLength(5);
    expect([...table.querySelectorAll('.kpi-detail-redline')].map(item => item.textContent)).toEqual(['否', '否', '否', '否', '否']);
    expect(screen.getByRole('row', { name: /总加班时长/ })).toHaveTextContent('4.0————2.0');
    expect(screen.getByRole('row', { name: /公司加班/ })).toHaveTextContent('8 小时月度审批加班 18 小时 = 5 分');
    expect(screen.getByRole('row', { name: /居家加班/ })).toHaveTextContent('4 小时月度审批加班 18 小时 = 5 分');
    expect(screen.getByRole('row', { name: /周月报提交得分/ })).toHaveTextContent('总提交 5 次');
    expect(screen.getByRole('row', { name: /月度目标总完成率/ })).not.toHaveTextContent('公示结果记录；目标及 KR 明细仅供核对');
    expect(screen.getByRole('row', { name: /出勤情况/ })).not.toHaveTextContent('各项规则取最低适用分，不逐行累加');
    expect(table.querySelectorAll('.kpi-detail-rule-text').length).toBeGreaterThan(0);
    fireEvent.mouseEnter(screen.getByRole('row', { name: /月度目标总完成率/ }).querySelector('.kpi-detail-rule-text')!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('承诺型 O 至少 2 个完成率低于 90%');
    expect(screen.queryByText(/计分与历史数据说明/)).not.toBeInTheDocument();
    expect([...table.querySelectorAll('tbody th small')].map(item => item.textContent)).toEqual(['权重 60%', '权重 10%', '权重 5%', '权重 15%', '权重 10%']);
    expect(table.querySelectorAll('.kpi-module-explanation')).toHaveLength(5);
    expect(screen.queryByRole('region', { name: '人工调分说明' })).not.toBeInTheDocument();
    const sections = [...document.querySelectorAll('.kpi-published-result > section')].map(item => item.getAttribute('aria-label'));
    expect(sections).toEqual(['绩效结果总览', '五项模块得分', '绩效评语', '评分明细']);
    expect(screen.getByRole('region', { name: '绩效评语' })).toHaveTextContent('暂无绩效评语');
    expect(screen.getByRole('region', { name: '评分明细' })).toHaveTextContent('56.0 + 10.0 + 2.0 + 14.0 + 9.0');
    expect(screen.getByRole('region', { name: '评分明细' })).toHaveTextContent('91.0 / 100 分');
  });
  it('仅展示已批准的主管评语，不展示后续退回稿，切换员工后更新目标', async () => {
    const input = props();
    const snapshot = { attitude: 14, adjustment: 0, total: 93 };
    input.employee.reviewHistory = [
      { id: 's', action: '提交主管复核', actor: '陈宇璋', at: '2026-11-01', before: snapshot, proposed: snapshot, reason: '按时完成交付，协作积极' },
      { id: 'a', action: 'HR 审核通过', actor: 'HR', at: '2026-11-02', before: snapshot, proposed: snapshot, reason: '确认' },
      { id: 'r', action: '提交主管复核', actor: '陈宇璋', at: '2026-11-03', before: snapshot, proposed: snapshot, reason: '尚未批准的说明' },
    ];
    const view = render(<KpiPublishedResult {...input} />);
    await screen.findByText('O1 · 重点版本方案按期交付');
    expect(screen.getByRole('region', { name: '绩效评语' })).toHaveTextContent('按时完成交付，协作积极');
    expect(screen.queryByText('尚未批准的说明')).not.toBeInTheDocument();
    view.rerender(<KpiPublishedResult {...props('e-02')} />);
    expect(screen.queryByText('O1 · 重点版本方案按期交付')).not.toBeInTheDocument();
    expect(await screen.findByText('O1 · 产品需求方案闭环')).toBeInTheDocument();
  });
  it('目标加载失败可重试，保留公示得分；无对应目标时明确提示', async () => {
    vi.mocked(okrRepository.records).mockRejectedValueOnce(new Error('offline'));
    render(<KpiPublishedResult {...props()} />);
    fireEvent.click(await screen.findByRole('button', { name: '重试加载目标明细' }));
    expect(await screen.findByText('O1 · 重点版本方案按期交付')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '绩效结果总览' })).toHaveTextContent('91.0');
    cleanup();
    render(<KpiPublishedResult {...props()} month="2025-01" />);
    expect(await screen.findByText('暂无本月 O、KR 明细')).toBeInTheDocument();
  });
  it('优先展示已生效的个人刚性红线及影响', async () => {
    const input = props();
    input.employee.redline = { active: true, type: '重大失职', impact: '个人绩效系数按规则下调' };
    render(<KpiPublishedResult {...input} />);
    await screen.findByText('O1 · 重点版本方案按期交付');
    expect(screen.getByRole('region', { name: '评分明细' })).toHaveTextContent('个人红线重大失职：个人绩效系数按规则下调');
    expect(screen.getByRole('row', { name: /月度目标总完成率/ })).not.toHaveTextContent('重大失职');
  });
  it('标明考勤清零及其对额外投入上限的影响', async () => {
    const input = props();
    input.employee.source.lateMinutes = 31;
    input.employee.scores.attendance = 0;
    input.employee.scores.extraWork = 5;
    render(<KpiPublishedResult {...input} />);
    await screen.findByText('O1 · 重点版本方案按期交付');
    expect(screen.getByRole('row', { name: /出勤情况/ })).toHaveTextContent('迟到累计超过 30 分钟');
    expect(screen.getByRole('row', { name: /迟到 31 分钟/ }).querySelector('.kpi-detail-redline')).toBeNull();
    expect(screen.getByRole('row', { name: /迟到 31 分钟/ }).querySelector('.kpi-detail-adjustment')).toHaveTextContent('-10.0 分');
    expect(screen.getByRole('row', { name: /总加班时长/ })).toHaveTextContent('考勤为 0 分：本项封顶 5 分');
  });
  it('标明周月报清零条件，不把工作态度零分误判为红线', async () => {
    const input = props();
    input.employee.source.weeklyReportMissing = 3;
    input.employee.source.reportMissing = 1;
    input.employee.scores.review = 0;
    input.employee.scores.attitude = 0;
    render(<KpiPublishedResult {...input} />);
    await screen.findByText('O1 · 重点版本方案按期交付');
    expect(screen.getByRole('row', { name: /周月报提交得分/ })).toHaveTextContent('周报未交达到 3 次、月报未交至少 1 次');
    expect(screen.getByRole('row', { name: /周报未交 3 次/ }).querySelector('.kpi-detail-redline')).toBeNull();
    expect(screen.getByRole('row', { name: /月报未交 1 次/ }).querySelector('.kpi-detail-redline')).toBeNull();
    expect(screen.getByRole('row', { name: /主管月度综合评分/ }).querySelector('.kpi-detail-redline')).toHaveTextContent('否');
  });
  it('月度目标低于 30 分时工作态度封顶 6 分并计入总分', async () => {
    const input = props();
    input.employee.scores.objective = 29;
    input.employee.scores.attitude = 14;
    render(<KpiPublishedResult {...input} />);
    await screen.findByText('O1 · 重点版本方案按期交付');
    expect(screen.getByRole('row', { name: /主管月度综合评分/ })).toHaveTextContent('月度目标低于 30 分：本项封顶 6 分');
    expect(screen.getByRole('row', { name: /主管月度综合评分/ })).toHaveTextContent('6.0');
    expect(screen.getByRole('region', { name: '五项模块得分' })).toHaveTextContent('6 / 15 分');
    expect(screen.getByRole('region', { name: '绩效结果总览' })).toHaveTextContent('56.0 / 100 分');
  });
  it('主管与 HR 调整只归属模块，基础分和加权后得分分开展示', async () => {
    const input = props();
    input.employee.scores.managerAdjustment = 2;
    input.employee.approvedSourceCorrections = [{ id: 'c', appealId: 'a', source: 'objective', before: { objectiveScore: 56 }, after: { objectiveScore: 57 }, reason: '申诉核实', actor: 'HR', at: '2026-11-01' }];
    render(<KpiPublishedResult {...input} />);
    await screen.findByText('O1 · 重点版本方案按期交付');
    const goalRow = screen.getByRole('row', { name: /月度目标总完成率/ });
    expect([...goalRow.querySelectorAll('.kpi-detail-number')].map(cell => cell.textContent)).toEqual(['56.0', '2.0', '—', '1.0', '—', '59.0']);
    expect(screen.getByRole('row', { name: /O1 · 重点版本方案/ }).querySelectorAll('.kpi-detail-number')).toHaveLength(0);
    expect(screen.getByRole('row', { name: /总加班时长/ }).querySelector('.kpi-detail-number.is-score')).toHaveTextContent('2.0');
  });
  it('将含个人动作的 KR 聚合为 KR 完成率，不将动作误标为多个 KR', async () => {
    const records = structuredClone(seed.okrRecords);
    const goal = records.find(item => item.id === 'kpi-demo-goal-e-01-2026-10')!;
    Object.assign(goal.payload.keyResults![0], { details: [
      { id: 'action-one', name: '动作一', weight: 40, progress: 50 },
      { id: 'action-two', name: '动作二', weight: 60, progress: 100 },
    ] });
    vi.mocked(okrRepository.records).mockResolvedValue(records as never);
    render(<KpiPublishedResult {...props()} />);
    await screen.findByText('KR1.1 · 完成重点版本方案并通过评审');
    // 未确认的动作进度不能替代个人已确认进度。
    expect(screen.getByRole('row', { name: /KR1.1/ })).toHaveTextContent('完成率 0%');
    expect(screen.queryByText(/KR1.2/)).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /月度目标总完成率/ })).toHaveTextContent('93%');
  });

});
