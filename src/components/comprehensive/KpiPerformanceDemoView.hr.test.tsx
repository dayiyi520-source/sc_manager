// @vitest-environment jsdom
import React from 'react';
import { App as AntApp } from 'antd';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { KpiPerformanceDemoView } from './KpiPerformanceDemoView';
import { KPI_DEMO_STORAGE_KEY, loadKpiDemo, reviewDepartmentSubmission, scoreForEmployee, submitDepartmentReview } from '../../services/kpiPerformanceDemo';

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
  it('HR 设置主管复核周期后，待审系统分转为待主管复核', async () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-11'];
    period.published = false;
    period.reviewEnabled = false;
    period.employees = period.employees.map(employee => ({ ...employee, reviewStatus: '待 HR 审核', managerDraft: undefined }));
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    fireEvent.click(screen.getByRole('button', { name: '周期设置' }));
    fireEvent.click(await screen.findByRole('button', { name: '设置周期' }));
    fireEvent.click(screen.getByRole('button', { name: '保存周期设置' }));
    expect(loadKpiDemo().periods['2026-11'].reviewEnabled).toBe(true);
    expect(loadKpiDemo().periods['2026-11'].employees.every(employee => employee.reviewStatus === '待主管复核')).toBe(true);
    expect(loadKpiDemo().periods['2026-11'].employees.every(employee => employee.scores.attitude === 0 && employee.scores.managerAdjustment === 0)).toBe(true);
  });
  it('按月度目标截止时间统计部门迟交员工', async () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-11'];
    period.published = false;
    period.cycleSettings = {
      monthlyGoalDeadline: '2026-11-05T18:00:00+08:00',
      managerReview: { startAt: '2026-11-06T00:00:00+08:00', endAt: '2026-11-10T00:00:00+08:00' },
      appealConfirmation: { startAt: '2026-11-11T00:00:00+08:00', endAt: '2026-11-15T00:00:00+08:00' },
      finalPublicationAt: '2026-11-12T00:00:00+08:00',
    };
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    fireEvent.click(screen.getByRole('button', { name: '周期设置' }));
    expect(screen.getByLabelText('月度目标最迟提交时间')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /部门系数与红线/ }));
    await waitFor(() => expect(within(screen.getByRole('group', { name: '产品部系数指标' })).getByText('1 人')).toBeInTheDocument());
    expect(loadKpiDemo().periods['2026-11'].employees.find(employee => employee.id === 'e-02')?.source.goalLate).toBe(true);
  });
  it('在部门系数页默认无红线并显示待确认计算预览', async () => {
    const state = loadKpiDemo();
    state.periods['2026-11'].published = false;
    state.periods['2026-11'].employees.forEach(employee => { employee.redline = undefined; });
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /部门系数与红线/ }));
    expect(screen.getByText('本部门无红线员工')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新增红线员工/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '确认本月部门系数' })).toHaveLength(1);
    expect(screen.getByRole('region', { name: '本月部门系数统一确认' })).toBeInTheDocument();
    expect(screen.getAllByText('部门目标完成率')).toHaveLength(1);
    expect(screen.getByRole('region', { name: '产品部系数详情' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '产品部系数指标' }).children).toHaveLength(9);
    expect(screen.getByText('综合基础分')).toBeInTheDocument();
    expect(screen.getByText('部门员工绩效等级名额分布')).toBeInTheDocument();
    expect(screen.queryByText('适用场景')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: '产品部团队交付未达标' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认本月部门系数' }));
    expect(loadKpiDemo().periods['2026-11'].departmentMetrics?.产品部.confirmed).toBe(true);
    expect(Object.values(loadKpiDemo().periods['2026-11'].departmentMetrics || {}).every(metric => metric.confirmed)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /研发部/ }));
    expect(screen.getByRole('region', { name: '研发部系数详情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认本月部门系数' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: '搜索部门' }), { target: { value: '不存在' } });
    expect(screen.getAllByText('没有匹配的部门').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole('textbox', { name: '搜索部门' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /产品部/ }));
    expect(screen.getByRole('region', { name: '产品部系数详情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认本月部门系数' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /新增红线员工/ }));
    expect(document.querySelector('.ant-modal-root')).toBeInTheDocument();
  });

  it('红线变更后统一确认重新可用', () => {
    const state = loadKpiDemo();
    state.periods['2026-11'].published = false;
    state.periods['2026-11'].employees[0].redline = { type: '一般违规', impact: '最高系数限制为 0.8', active: true };
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /部门系数与红线/ }));
    fireEvent.click(screen.getByRole('button', { name: '确认本月部门系数' }));
    expect(screen.getByRole('button', { name: '确认本月部门系数' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '移除红线' }));
    expect(loadKpiDemo().periods['2026-11'].departmentMetrics?.产品部.confirmed).toBe(false);
    expect(loadKpiDemo().periods['2026-11'].departmentMetrics?.研发部.confirmed).toBe(true);
    expect(screen.getByRole('button', { name: '确认本月部门系数' })).toBeEnabled();
  });

  it('主管复核可填写无幅度限制的目标加减分和仅扣分的临时任务', async () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-11'];
    const now = Date.now();
    period.published = false;
    period.cycleSettings = { managerReview: { startAt: new Date(now - 60_000).toISOString(), endAt: new Date(now + 86_400_000).toISOString() }, finalPublicationAt: new Date(now + 172_800_000).toISOString(), appealConfirmation: { startAt: new Date(now + 172_860_000).toISOString(), endAt: new Date(now + 259_200_000).toISOString() } };
    period.employees.forEach(employee => { employee.reviewStatus = '待主管复核'; });
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.mouseDown(screen.getByLabelText('体验角色'));
    fireEvent.click(await screen.findByText('主管视角', { selector: '.ant-select-item-option-content' }));
    expect(screen.getByText('目标加减分')).toBeInTheDocument();
    expect(screen.getByText('临时任务扣分')).toBeInTheDocument();
    const goal = screen.getByText('目标加减分').closest('label')!.querySelector('input')!;
    const temporary = screen.getByText('临时任务扣分').closest('label')!.querySelector('input')!;
    expect(goal).not.toHaveAttribute('max');
    fireEvent.change(goal, { target: { value: '12' } });
    fireEvent.change(temporary, { target: { value: '-4' } });
    expect(goal).toHaveValue('12');
    expect(temporary).toHaveValue('-4');
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    expect(loadKpiDemo().periods['2026-11'].employees[0]).toMatchObject({ reviewStatus: '待主管复核', managerDraft: { adjustment: 12, temporaryTaskDeduction: -4 } });
    expect(loadKpiDemo().periods['2026-11'].employees[1].managerDraft).toBeUndefined();
  });

  it('HR 退回选中员工时不改变同部门未提交员工', async () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-11'];
    period.published = false;
    period.employees[0].reviewStatus = '待 HR 审核';
    period.employees[0].managerDraft = { attitude: 10, adjustment: -2, reason: '目标延期' };
    period.employees[1].reviewStatus = '待主管复核';
    period.employees[1].managerDraft = undefined;
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    expect(screen.getByRole('region', { name: '林知夏主管复核' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '退回主管修改' }));
    fireEvent.change(screen.getByLabelText('退回原因'), { target: { value: '请补充依据' } });
    fireEvent.click(screen.getByRole('button', { name: '确认退回' }));
    const saved = loadKpiDemo().periods['2026-11'].employees;
    expect(saved[0].reviewStatus).toBe('HR 已退回');
    expect(saved[0].hrNote).toContain('请补充依据');
    expect(saved[1].reviewStatus).toBe('待主管复核');
    expect(saved[1].hrNote).toBeUndefined();
    fireEvent.mouseDown(screen.getByLabelText('体验角色'));
    fireEvent.click(await screen.findByText('主管视角', { selector: '.ant-select-item-option-content' }));
    fireEvent.click(within(screen.getByText('我的团队').closest('.kpi-employee-rail')!).getByRole('button', { name: /周予安/ }));
    expect(screen.queryByText('HR 退回：请补充依据')).not.toBeInTheDocument();
  });

  it('HR 逐员工查看提交的两个分数，审核后加减分带正负语义', () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-11'];
    period.published = false;
    period.employees.filter(employee => employee.department === '产品部').forEach(employee => { employee.reviewStatus = '待 HR 审核'; });
    period.employees[0].managerDraft = { attitude: 10, adjustment: -2, reason: '目标延期' };
    period.employees[1].managerDraft = { attitude: 12, adjustment: 2, reason: '额外贡献' };
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    const { container } = render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    const review = screen.getByRole('region', { name: '林知夏主管复核' });
    expect(review).toHaveTextContent('工作态度分');
    expect(review).toHaveTextContent('0 → 10 分');
    expect(review).toHaveTextContent('0 → -2 分');
    expect(review).not.toHaveTextContent('额外贡献');
    const beforeScore = container.querySelector('.kpi-total-score > strong')?.textContent || '';
    fireEvent.click(screen.getByRole('button', { name: /审核通过/ }));
    const approvedScore = loadKpiDemo().periods['2026-11'].employees[0];
    expect(container.querySelector('.kpi-total-score > strong')).not.toHaveTextContent(beforeScore);
    expect(container.querySelector('.kpi-total-score > strong')).toHaveTextContent(scoreForEmployee(approvedScore).toFixed(1));
    expect(container.querySelector('.kpi-calc-scoreboard .is-adjustment > b.is-negative')).toHaveTextContent('-2.0');
    expect(screen.getByRole('region', { name: '人工调分说明' })).toHaveTextContent('目标延期');
    expect(loadKpiDemo().periods['2026-11'].employees[1].reviewStatus).toBe('待 HR 审核');
    fireEvent.click(within(screen.getByRole('region', { name: '产品部成员' })).getByRole('button', { name: /周予安/ }));
    expect(screen.getByRole('region', { name: '周予安主管复核' })).toHaveTextContent('0 → 2 分');
    fireEvent.click(screen.getByRole('button', { name: /审核通过/ }));
    expect(container.querySelector('.kpi-calc-scoreboard .is-adjustment > b.is-positive')).toHaveTextContent('+2.0');
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

  it('判断项与部门红线更新预览并使已确认部门重新待确认', async () => {
    const state = loadKpiDemo();
    state.periods['2026-11'].published = false;
    state.periods['2026-11'].departmentMetrics!.产品部.confirmed = true;
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /部门系数与红线/ }));
    fireEvent.click(screen.getByRole('switch', { name: '产品部业务经营要求' }));
    expect(loadKpiDemo().periods['2026-11'].departmentMetrics?.产品部).toMatchObject({ businessRequirement: true, confirmed: false });
    expect(within(screen.getByRole('group', { name: '产品部系数指标' })).getAllByText('0.90')).toHaveLength(2);
    fireEvent.mouseDown(screen.getByLabelText('产品部是否触碰红线'));
    fireEvent.click(await screen.findByText('质量返工管理问题系数下调二档', { selector: '.ant-select-item-option-content' }));
    expect(within(screen.getByRole('group', { name: '产品部系数指标' })).getAllByText('0.80')).toHaveLength(1);
    expect(loadKpiDemo().periods['2026-11'].departmentMetrics?.产品部).toMatchObject({ redlineChoice: '质量返工管理问题系数下调二档', confirmed: false });
  });

  it('月度目标使用 OKR 原始数据，不混入主管复核调整', async () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-11'];
    period.published = false;
    const now = Date.now();
    period.cycleSettings = { managerReview: { startAt: new Date(now - 60_000).toISOString(), endAt: new Date(now + 86_400_000).toISOString() }, finalPublicationAt: new Date(now + 172_800_000).toISOString(), appealConfirmation: { startAt: new Date(now + 172_860_000).toISOString(), endAt: new Date(now + 259_200_000).toISOString() } };
    period.employees.filter(employee => employee.department === '产品部').forEach(employee => { employee.reviewStatus = '待主管复核'; });
    period.employees[0].managerDraft = { attitude: 10, adjustment: -2, reason: '交付延期' };
    state.periods['2026-11'] = reviewDepartmentSubmission(submitDepartmentReview(period, '陈宇璋', '产品部'), '陈宇璋', '产品部', 'approve');
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /原始数据/ }));
    expect(await screen.findByRole('row', { name: /林知夏/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '综合基础分' })).toBeInTheDocument();
    expect(screen.queryByText('交付延期')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /复核修改记录/ })).not.toBeInTheDocument();
  });

  it('在汇总复核中逐员工审核而不连带同部门其他员工', () => {
    const state = loadKpiDemo();
    state.periods['2026-11'].published = false;
    state.periods['2026-11'].employees.filter(employee => employee.department === '产品部').forEach(employee => {
      employee.reviewStatus = '待 HR 审核';
      employee.managerDraft = { attitude: employee.scores.attitude, adjustment: employee.scores.managerAdjustment, reason: '部门复核确认' };
    });
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    expect(screen.getByRole('region', { name: '林知夏主管复核' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /审核通过/ }));
    expect(loadKpiDemo().periods['2026-11'].employees[0].reviewStatus).toBe('已通过');
    expect(loadKpiDemo().periods['2026-11'].employees[1].reviewStatus).toBe('待 HR 审核');
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
