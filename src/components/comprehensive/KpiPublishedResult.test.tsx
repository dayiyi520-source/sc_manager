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
    expect(headers).toEqual(['模块', '评分明细', '数据来源', '规则判定', '基础分', 'HR 加分', 'HR 减分', '主管加分', '主管减分', '本项得分', '加减分说明']);
    expect([...table.querySelectorAll('tbody th small')].map(item => item.textContent)).toEqual(['权重 60%', '权重 10%', '权重 5%', '权重 15%', '权重 10%']);
    expect(table.querySelectorAll('.kpi-module-explanation')).toHaveLength(5);
    expect(screen.queryByRole('region', { name: '人工调分说明' })).not.toBeInTheDocument();
    const sections = [...document.querySelectorAll('.kpi-published-result > section')].map(item => item.getAttribute('aria-label'));
    expect(sections).toEqual(['绩效结果总览', '五项模块得分', '绩效评语', '评分明细']);
    expect(screen.getByRole('region', { name: '绩效评语' })).toHaveTextContent('暂无绩效评语');
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
    expect(screen.getByRole('region', { name: '绩效结果总览' })).toHaveTextContent('93.0');
    cleanup();
    render(<KpiPublishedResult {...props()} month="2025-01" />);
    expect(await screen.findByText('暂无本月 O、KR 明细')).toBeInTheDocument();
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
