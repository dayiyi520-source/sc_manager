// @vitest-environment jsdom
import React from 'react';
import { App as AntApp, Modal } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { KpiPerformanceDemoView } from './KpiPerformanceDemoView';
import { loadKpiDemo, saveKpiDemo, scoreForEmployee, gradeForScore, departmentCoefficientPreview } from '../../services/kpiPerformanceDemo';
vi.mock('../../services/okrRepository', async () => { const seed = await import('../../data/mockOkrState.json'); return { okrRepository: { people: async () => seed.default.okrPeople, records: async () => seed.default.okrRecords } }; });
beforeEach(() => localStorage.clear());
afterEach(() => { Modal.destroyAll(); cleanup(); });
async function role(name: string) { fireEvent.mouseDown(screen.getByLabelText('体验角色')); fireEvent.click(await screen.findByText(`${name}视角`, { selector: '.ant-select-item-option-content' })); }
describe('老板评定与统一员工评分表', () => {
  it('老板10月与11月复核均使用同一主管名单和带边框结果工作区', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await role('老板');

    const assertReviewShell = async () => {
      expect(screen.getByRole('heading', { name: '汇总计算与主管复核' })).toBeInTheDocument();
      const rail = document.querySelector('.kpi-employee-rail');
      expect(rail).not.toBeNull();
      expect(within(rail as HTMLElement).getByText('部门主管')).toBeInTheDocument();
      expect(within(rail as HTMLElement).getByRole('button', { name: /陈宇璋/ })).toBeInTheDocument();
      expect(within(rail as HTMLElement).queryByRole('button', { name: /林知夏/ })).not.toBeInTheDocument();
      const detail = screen.getByRole('region', { name: '主管绩效结果' });
      expect(detail).toHaveClass('kpi-calc-detail');
      expect(detail.querySelector('.kpi-unified-review')).toBeInTheDocument();
    };

    await assertReviewShell();
    fireEvent.mouseDown(screen.getByLabelText('考核月份'));
    fireEvent.click(await screen.findByText('2026年10月', { selector: '.ant-select-item-option-content' }));
    await assertReviewShell();
    expect(screen.queryByRole('button', { name: '确认主管绩效评定' })).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByLabelText('考核月份'));
    fireEvent.click(await screen.findByText('2026年11月', { selector: '.ant-select-item-option-content' }));
    await assertReviewShell();
    expect(screen.getByRole('button', { name: '确认主管绩效评定' })).toBeInTheDocument();
  });

  it('老板月度公示展示部门最终系数及等级，平均值按部门系数计算', async () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-11'];
    const departments = [...new Set(period.employees.map(employee => employee.department))];
    period.published = true;
    period.publishedAt = '2026-11-15T09:00:00+08:00';
    period.departmentCoefficients = Object.fromEntries(departments.map((department, index) => [department, index === 0 ? 1.2 : 1]));
    period.employees = period.employees.map(employee => ({ ...employee, reviewStatus: '已公示' }));
    period.supervisors = period.supervisors?.map(employee => ({ ...employee, bossRatedAt: '2026-11-01T09:30:00+08:00', reviewStatus: '已公示' }));
    saveKpiDemo(state);
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await role('老板');
    fireEvent.click(screen.getByRole('tab', { name: /月度公示/ }));
    expect(screen.getByRole('region', { name: '全公司公示汇总' })).toHaveTextContent('1.05');
    expect(screen.getByRole('region', { name: '产品部绩效公示' })).toHaveTextContent('1.20 · A 级');
    fireEvent.click(screen.getByRole('button', { name: /林知夏/ }));
    expect(screen.getByRole('region', { name: '绩效结果总览' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '绩效结果总览' })).not.toHaveTextContent('部门绩效系数');
  });

  it('老板确认即生效、系数联动，公示后主管可见本人绩效且无部门指标', async () => {
    const view = render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await role('老板');
    expect(screen.queryByRole('tab', { name: '主管绩效' })).not.toBeInTheDocument();
    expect(document.querySelector('.kpi-employee-rail')).toBeInTheDocument();
    expect(screen.getByText('部门主管')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '加分' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'HR加分' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('月度目标老板加分'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('月度目标老板加减分说明'), { target: { value: '老板确认部门交付成果' } });
    fireEvent.click(screen.getByRole('button', { name: '确认主管绩效评定' }));
    await waitFor(() => expect(loadKpiDemo().periods['2026-11'].supervisors![0].bossRatedAt).toBeTruthy());
    const state = loadKpiDemo(), leader = state.periods['2026-11'].supervisors![0];
    expect(departmentCoefficientPreview(state.periods['2026-11'], leader.department).initialCoefficient).toBe(gradeForScore(scoreForEmployee(leader)).coefficient);
    expect(leader.reviewBook?.active.老板?.objective.note).toBe('老板确认部门交付成果');
    view.unmount();
    state.periods['2026-11'].published = true; saveKpiDemo(state);
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await role('主管'); fireEvent.click(screen.getByRole('tab', { name: /月度公示/ }));
    const own = screen.getByRole('region', { name: `${leader.department}绩效公示` });
    expect(own).toHaveTextContent(leader.name);
    fireEvent.click(within(own).getByRole('button', { name: new RegExp(leader.name) }));
    expect(screen.getByRole('region', { name: '绩效结果总览' })).not.toHaveTextContent('部门绩效系数');
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveTextContent('老板确认部门交付成果');
  });
  it('主管与HR分阶段编辑并同时保存两份说明，详情统一且无部门统计', async () => {
    const state = loadKpiDemo(); const now = Date.now();
    state.periods['2026-11'].cycleSettings = { managerReview: { startAt: new Date(now - 60000).toISOString(), endAt: new Date(now + 600000).toISOString() }, finalPublicationAt: new Date(now + 900000).toISOString(), appealConfirmation: { startAt: new Date(now + 900001).toISOString(), endAt: new Date(now + 1800000).toISOString() } }; saveKpiDemo(state);
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await role('主管');
    expect(screen.queryByLabelText('月度目标HR加分')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('月度目标主管加分'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('月度目标主管加减分说明'), { target: { value: '主管成果说明' } });
    fireEvent.click(screen.getByRole('button', { name: '提交当前员工给 HR 复审' }));
    await role('HR');
    expect(screen.queryByLabelText('月度目标主管加分')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('月度目标HR减分'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('月度目标HR加减分说明'), { target: { value: 'HR核实差异' } });
    fireEvent.click(screen.getByRole('button', { name: '保存 HR 调分' }));
    fireEvent.click(screen.getByRole('button', { name: '审核通过' }));
    await waitFor(() => expect(loadKpiDemo().periods['2026-11'].employees[0].reviewStatus).toBe('已确认'));
    const active = loadKpiDemo().periods['2026-11'].employees[0].reviewBook!.active;
    expect(active.主管?.objective.note).toBe('主管成果说明'); expect(active.HR?.objective.note).toBe('HR核实差异');
    const explanation = screen.getByRole('table').querySelector('.example-explanation')!;
    expect(explanation).toHaveTextContent('主管'); expect(explanation).toHaveTextContent('HR');
    expect(screen.queryByText(/本月明细/)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '评分明细' }).querySelector('header')).toHaveTextContent('合计');
  });
});
