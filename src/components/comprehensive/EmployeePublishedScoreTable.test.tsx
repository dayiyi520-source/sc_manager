// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KpiPublishedResult } from './KpiPublishedResult';
import { loadKpiDemo } from '../../services/kpiPerformanceDemo';
import { summarizeDepartmentPerformance } from '../../services/kpiPerformancePublication';
import seed from '../../data/mockOkrState.json';
vi.mock('../../services/okrRepository', () => ({ okrRepository: { people: async () => seed.okrPeople, records: async () => seed.okrRecords } }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);
function props() {
  const period = loadKpiDemo().periods['2026-10'];
  return { employee: period.employees[0], month: '2026-10', finalCoefficient: 1.2, departmentSummary: summarizeDepartmentPerformance(period.employees, period.departmentCoefficients)[0] };
}
describe('员工公示示例表格', () => {
  it('使用示例列序和固定行，动态读取目标并合并模块分值', async () => {
    render(<KpiPublishedResult {...props()} detailLayout="employee-example" />);
    await screen.findByText('O1 · 重点版本方案按期交付');
    expect(screen.getByText('KR1.1 · 完成重点版本方案并通过评审')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /总加班时长/ })).toHaveTextContent(/实际加班时长 ÷18×5 分。\s*最高封顶 10 分。\s*全勤分为0分，则本项封顶5分/);
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['模块', '评分明细', '数据来源', '规则判定', '基础分', '主管加分', '主管减分', 'HR加分', 'HR减分', '刚性红线', '本项得分', '加减分说明']);
    const groups = [...table.querySelectorAll('tbody')];
    expect(groups).toHaveLength(5);
    expect(groups.map(group => group.rows.length)).toEqual([3, 8, 4, 1, 6]);
    for (const group of groups) {
      expect(group.querySelectorAll('[rowspan]')).toHaveLength(9);
      expect([...group.querySelectorAll('[rowspan]')].every(cell => cell.getAttribute('rowspan') === String(group.rows.length))).toBe(true);
    }
    expect(screen.getByRole('row', { name: /出差地加班/ })).toHaveTextContent('未记录');
    expect(screen.getByRole('row', { name: /周月报应提交/ })).toHaveTextContent('未记录');
    expect(screen.getByRole('row', { name: /主管评分/ })).toHaveTextContent('基准分 13 分');
    expect(screen.getByRole('row', { name: /临时任务逾期/ })).toHaveTextContent('逾期或质量不达标扣 2–4 分 / 次');
    expect(table.querySelectorAll('.example-rule-text').length).toBeGreaterThan(0);
    fireEvent.mouseEnter(screen.getByRole('row', { name: /总加班时长/ }).querySelector('.example-rule-text')!);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('实际加班时长 ÷18×5 分。');
  });
  it('只改变员工版明细，不覆盖公示分数和其他角色详情布局', async () => {
    const input = props();
    const original = JSON.stringify(input.employee);
    const view = render(<KpiPublishedResult {...input} detailLayout="employee-example" />);
    await screen.findByText('O1 · 重点版本方案按期交付');
    expect(screen.getByRole('row', { name: /主管评分/ }).querySelector('.example-number')).toHaveTextContent(String(input.employee.scores.attitude));
    expect(JSON.stringify(input.employee)).toBe(original);
    view.rerender(<KpiPublishedResult {...input} detailLayout="standard" />);
    expect(screen.getByRole('columnheader', { name: '加分/扣分' })).toBeInTheDocument();
    expect(screen.queryByText('出差地加班')).not.toBeInTheDocument();
  });
});
