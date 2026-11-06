// @vitest-environment jsdom
import React from 'react';
import { App as AntApp } from 'antd';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { KpiPerformanceDemoView } from './KpiPerformanceDemoView';
import { KPI_DEMO_STORAGE_KEY, loadKpiDemo } from '../../services/kpiPerformanceDemo';

beforeEach(() => {
  localStorage.clear();
  const state = loadKpiDemo();
  const period = state.periods['2026-11'];
  period.generated = true;
  period.published = true;
  period.employees = period.employees.map(employee => ({ ...employee, reviewStatus: '已通过' }));
  localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('HR 绩效公示', () => {
  it('在部门系数页默认无红线并显示待确认计算预览', async () => {
    const state = loadKpiDemo();
    state.periods['2026-11'].published = false;
    state.periods['2026-11'].employees.forEach(employee => { employee.redline = undefined; });
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /部门系数与红线/ }));
    expect(screen.getByText('本部门无红线员工')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新增红线员工/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '确认系数' })).toHaveLength(1);
    expect(screen.getAllByText('部门目标完成率')).toHaveLength(1);
    expect(screen.getByRole('region', { name: '产品部系数详情' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '产品部系数指标' }).children).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: '确认系数' }));
    expect(loadKpiDemo().periods['2026-11'].departmentMetrics?.产品部.confirmed).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /研发部/ }));
    expect(screen.getByRole('region', { name: '研发部系数详情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认系数' })).toBeEnabled();
    fireEvent.change(screen.getByRole('textbox', { name: '搜索部门' }), { target: { value: '不存在' } });
    expect(screen.getAllByText('没有匹配的部门').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox', { name: '搜索部门' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /产品部/ }));
    expect(screen.getByRole('region', { name: '产品部系数详情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认系数' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /新增红线员工/ }));
    expect(document.querySelector('.ant-modal-root')).toBeInTheDocument();
  });

  it('只显示和新增所选部门的红线员工', async () => {
    const state = loadKpiDemo();
    state.periods['2026-11'].published = false;
    state.periods['2026-11'].employees[0].redline = { type: '重大失职', impact: '绩效系数清零', active: true };
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /部门系数与红线/ }));
    const productDetail = screen.getByRole('region', { name: '产品部系数详情' });
    expect(within(productDetail).getByText('林知夏')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /研发部/ }));
    const researchDetail = screen.getByRole('region', { name: '研发部系数详情' });
    expect(within(researchDetail).queryByText('林知夏')).not.toBeInTheDocument();
    expect(within(researchDetail).getByText('本部门无红线员工')).toBeInTheDocument();
    fireEvent.click(within(researchDetail).getByRole('button', { name: /新增红线员工/ }));
    fireEvent.mouseDown(screen.getByLabelText('选择本部门员工'));
    expect(await screen.findByText('顾清和 · 研发部', { selector: '.ant-select-item-option-content' })).toBeInTheDocument();
    expect(screen.queryByText('周予安 · 产品部', { selector: '.ant-select-item-option-content' })).not.toBeInTheDocument();
  });

  it('在汇总复核同页审核主管提交的部门员工', () => {
    const state = loadKpiDemo();
    state.periods['2026-11'].published = false;
    state.periods['2026-11'].employees.filter(employee => employee.department === '产品部').forEach(employee => {
      employee.reviewStatus = '待 HR 审核';
      employee.managerDraft = { attitude: employee.scores.attitude, adjustment: employee.scores.managerAdjustment, reason: '部门复核确认' };
    });
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    expect(screen.getByText('产品部 · 主管 陈宇璋')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /审核通过/ }));
    expect(loadKpiDemo().periods['2026-11'].employees.filter(employee => employee.department === '产品部').every(employee => employee.reviewStatus === '已通过')).toBe(true);
  });
  it('按部门分组展示全员并保留公示操作', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);

    expect(screen.getByRole('button', { name: /公示绩效结果/ })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: '产品部绩效公示' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '研发部绩效公示' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '交付部绩效公示' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '运营部绩效公示' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '产品部绩效公示' })).getByRole('button', { name: /林知夏/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /唐以宁/ })).toBeInTheDocument();
    const productRegion = screen.getByRole('region', { name: '产品部绩效公示' });
    const productToggle = productRegion.querySelector('.kpi-department-toggle') as HTMLButtonElement;
    expect(productToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(productToggle);
    expect(productToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(screen.getByRole('region', { name: '产品部绩效公示' })).queryByRole('button', { name: /林知夏/ })).not.toBeInTheDocument();
  });

  it('HR 汇总复核左侧按部门分组员工', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));

    expect(await screen.findByText('产品部')).toBeInTheDocument();
    expect(screen.getByText('研发部')).toBeInTheDocument();
    expect(screen.getAllByText('林知夏').length).toBeGreaterThan(0);
    expect(screen.getAllByText('周予安').length).toBeGreaterThan(0);
    const departmentSection = screen.getByRole('region', { name: '产品部成员' });
    expect(screen.queryByText('我的团队')).not.toBeInTheDocument();
    expect(within(departmentSection).getByRole('button', { name: /林知夏/ })).toHaveAttribute('aria-pressed', 'true');
    const departmentToggle = within(departmentSection).getByRole('button', { name: /产品部，2 位成员/ });
    expect(departmentToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(departmentToggle);
    expect(departmentToggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(departmentSection).queryByRole('button', { name: /林知夏/ })).not.toBeInTheDocument();
    fireEvent.click(departmentToggle);
    expect(within(departmentSection).getByRole('button', { name: /林知夏/ })).toBeInTheDocument();
  });
});
