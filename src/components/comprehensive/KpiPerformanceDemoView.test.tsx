// @vitest-environment jsdom
import React from 'react';
import { App as AntApp, Modal } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { KpiPerformanceDemoView } from './KpiPerformanceDemoView';
import { departmentCoefficientPreview, KPI_DEMO_STORAGE_KEY, loadKpiDemo, publishKpiPeriod, reviewDepartmentSubmission, saveKpiDemo, scoreForEmployee, submitDepartmentReview } from '../../services/kpiPerformanceDemo';
import { listKpiAppeals, submitKpiAppeal } from '../../services/kpiPerformancePublication';

vi.mock('../../services/okrRepository', async () => {
  const seed = await import('../../data/mockOkrState.json');
  return { okrRepository: { people: async () => seed.default.okrPeople, records: async () => seed.default.okrRecords } };
});

beforeEach(() => { localStorage.clear(); });
afterEach(() => {
  Modal.destroyAll();
  cleanup();
  document.querySelectorAll('.ant-modal-root').forEach(node => node.remove());
});

async function chooseRole(role: 'HR' | '主管' | '员工') {
  fireEvent.mouseDown(screen.getByLabelText('体验角色'));
  fireEvent.click(await screen.findByText(`${role}视角`, { selector: '.ant-select-item-option-content' }));
}

async function seedPublishedPeriod() {
  const state = loadKpiDemo();
  const period = state.periods['2026-11'];
  period.generated = true;
  period.published = true;
  period.employees = period.employees.map(employee => ({ ...employee, reviewStatus: '已通过' }));
  localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
}

describe('绩效考核公示', () => {
  it.each(['员工', '主管'] as const)('%s视角未公示时仅显示统一状态文案', async role => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole(role);
    fireEvent.click(screen.getByRole('tab', { name: /月度公示/ }));

    expect(screen.getByRole('heading', { name: '2026年11月绩效公示' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '本月绩效结果尚未公示' })).toBeInTheDocument();
    expect(screen.queryByText('本月结果尚未公示')).not.toBeInTheDocument();
    expect(screen.queryByText('HR 审核完成后即可公示')).not.toBeInTheDocument();
    expect(screen.queryByText('HR 完成审核并公示后，员工可查看本人绩效及部门汇总。')).not.toBeInTheDocument();
  });

  it('HR 未公示提示及未生成月份说明保持不变', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    expect(screen.getByText('本月结果尚未公示')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'HR 审核完成后即可公示' })).toBeInTheDocument();

    await chooseRole('员工');
    fireEvent.mouseDown(screen.getByLabelText('考核月份'));
    fireEvent.click(await screen.findByText('2026年9月', { selector: '.ant-select-item-option-content' }));
    expect(screen.getByRole('heading', { name: '本月最终绩效尚未生成' })).toBeInTheDocument();
    expect(screen.getByText('由 HR 控制考核生成时间。生成后进入汇总复核与审核。')).toBeInTheDocument();
  });

  it('复审和系数确认后公示，员工仅看到审核后的本人结果', async () => {
    const state = loadKpiDemo();
    let period = state.periods['2026-11'];
    const now = Date.now();
    period.cycleSettings = { managerReview: { startAt: new Date(now - 60_000).toISOString(), endAt: new Date(now + 86_400_000).toISOString() }, finalPublicationAt: new Date(now + 172_800_000).toISOString(), appealConfirmation: { startAt: new Date(now + 172_860_000).toISOString(), endAt: new Date(now + 259_200_000).toISOString() } };
    period.employees[0].managerDraft = { attitude: 10, adjustment: -2, reason: '主管复核调整' };
    for (const group of [...new Set(period.employees.map(employee => `${employee.manager}|${employee.department}`))]) {
      const [manager, department] = group.split('|');
      period = reviewDepartmentSubmission(submitDepartmentReview(period, manager, department), manager, department, 'approve');
    }
    period = { ...period, departmentMetrics: Object.fromEntries(Object.entries(period.departmentMetrics || {}).map(([name, metric]) => [name, { ...metric, confirmed: true }])), departmentCoefficients: Object.fromEntries([...new Set(period.employees.map(employee => employee.department))].map(name => [name, departmentCoefficientPreview(period, name).coefficient])) };
    state.periods['2026-11'] = publishKpiPeriod({ ...period, cycleSettings: undefined });
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('员工');
    expect(screen.getByText('87.3 分')).toBeInTheDocument();
    expect(screen.getAllByText('工作态度').length).toBeGreaterThan(0);
    expect(screen.queryByText('周予安')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /公示绩效结果/ })).not.toBeInTheDocument();
  });
  it('移除重复标题区并保留筛选项和四个视图标签', () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);

    expect(screen.queryByText('PEOPLE · PERFORMANCE')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'KPI 考核' })).not.toBeInTheDocument();
    expect(screen.getByText('演示数据')).toBeInTheDocument();
    expect(screen.getByLabelText('体验角色')).toBeInTheDocument();
    expect(screen.getByLabelText('考核月份')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /月度公示/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /原始数据/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /汇总复核/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /部门系数与红线/ })).toBeInTheDocument();
  });

  it('员工只看到部门汇总和本人明细，可提交本地申诉且没有公示操作', async () => {
    await seedPublishedPeriod();
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('员工');

    expect(await screen.findByText('产品部平均绩效')).toBeInTheDocument();
    expect(screen.getByText('部门等级分布')).toBeInTheDocument();
    expect(screen.getByText('林知夏')).toBeInTheDocument();
    expect(screen.queryByText('周予安')).not.toBeInTheDocument();
    expect(screen.getByText('月度目标 56 / 60 分')).toBeInTheDocument();
    expect(screen.getByText('出勤天数')).toBeInTheDocument();
    expect(screen.getAllByText('工作态度').length).toBeGreaterThan(0);
    expect(screen.getAllByText('周月报提交')).toHaveLength(2);
    expect(screen.getByText('考勤')).toBeInTheDocument();
    expect(screen.queryByText('全勤')).not.toBeInTheDocument();
    expect(screen.queryByText('报告异常')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '绩效申诉' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '公示绩效结果' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '绩效申诉' }));
    fireEvent.change(screen.getByLabelText('申诉原因'), { target: { value: '请复核目标完成率得分' } });
    fireEvent.click(screen.getByRole('button', { name: '提交申诉' }));
    await waitFor(() => expect(listKpiAppeals()).toHaveLength(1));
    expect(listKpiAppeals()[0]).toMatchObject({ employeeId: 'e-01', reason: '请复核目标完成率得分', status: '待处理' });
  });

  it('主管保留当前团队席位，点击员工显示五项评分与来源统计', async () => {
    await seedPublishedPeriod();
    const view = render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('主管');
    fireEvent.click(screen.getByRole('tab', { name: /月度公示/ }));

    expect(await screen.findByText('员工考核席位')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /周予安/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '公示绩效结果' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /周予安/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('月度目标')).toBeInTheDocument();
    expect(screen.getByText('工作态度')).toBeInTheDocument();
    expect(screen.getByText('审批加班')).toBeInTheDocument();
    expect(screen.getAllByText('周月报提交')).toHaveLength(2);
    expect(screen.getByText('考勤')).toBeInTheDocument();
    expect(screen.queryByText('全勤')).not.toBeInTheDocument();
    expect(screen.queryByText('报告异常')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '人工调分说明' })).toHaveTextContent('无');
    view.unmount();
    document.querySelectorAll('.ant-modal-root').forEach(node => node.remove());
  });

  it('主管已公示详情展示分项封顶和经 HR 通过的目标及临时任务调整', async () => {
    await seedPublishedPeriod();
    const state = loadKpiDemo();
    const employee = state.periods['2026-11'].employees[0];
    employee.scoreAllocationVersion = 2;
    employee.scores = { ...employee.scores, objective: 50, review: 10, managerAdjustment: 12, temporaryTaskDeduction: -4 };
    employee.reviewHistory = [
      { id: 'manager', action: '提交主管复核', actor: '陈宇璋', at: '2026-11-01T08:00:00Z', before: { attitude: 14, adjustment: 0, temporaryTaskDeduction: 0, objectiveScore: 50, reviewScore: 10, total: 88 }, proposed: { attitude: 14, adjustment: 12, temporaryTaskDeduction: -4, objectiveScore: 60, reviewScore: 6, total: 94 }, reason: '挑战目标完成，临时任务超期' },
      { id: 'hr', action: 'HR 审核通过', actor: 'HR', at: '2026-11-02T08:00:00Z', before: { attitude: 14, adjustment: 0, temporaryTaskDeduction: 0, objectiveScore: 50, reviewScore: 10, total: 88 }, proposed: { attitude: 14, adjustment: 12, temporaryTaskDeduction: -4, objectiveScore: 60, reviewScore: 6, total: 94 }, reason: '已核实' },
    ];
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('主管');
    fireEvent.click(screen.getByRole('tab', { name: /月度公示/ }));
    fireEvent.click(screen.getByRole('button', { name: /林知夏/ }));
    const dialog = await screen.findByRole('dialog');
    const adjustment = within(dialog).getByRole('region', { name: '人工调分说明' });
    expect(within(dialog).getByText('考勤')).toBeInTheDocument();
    expect(within(dialog).getAllByText('周月报提交')).toHaveLength(2);
    expect(adjustment).toHaveTextContent('月度目标加减分');
    expect(adjustment).toHaveTextContent('0.0 → 12.0 分');
    expect(adjustment).toHaveTextContent('临时任务扣分');
    expect(adjustment).toHaveTextContent('0.0 → -4.0 分');
    expect(adjustment).toHaveTextContent('50.0 → 60.0 分');
    expect(adjustment).toHaveTextContent('10.0 → 6.0 分');
    expect(adjustment).toHaveTextContent('挑战目标完成，临时任务超期');
  });

  it('主管复核时间范围外，月度公示不显示待复核入口', async () => {
    const state = loadKpiDemo();
    const period = state.periods['2026-11'];
    period.generated = true;
    period.cycleSettings = {
      managerReview: { startAt: '2026-10-01T00:00:00.000Z', endAt: '2026-10-02T00:00:00.000Z' },
      appealConfirmation: { startAt: '2026-10-03T00:00:00.000Z', endAt: '2026-11-30T00:00:00.000Z' },
      finalPublicationAt: '2026-11-01T00:00:00.000Z',
    };
    saveKpiDemo(state);
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('主管');
    expect(screen.queryByText(/当前团队有 .* 位员工待复核/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '进入主管复核' })).not.toBeInTheDocument();
  });

  it('原始数据按来源分类展示列表并包含部门字段', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /原始数据/ }));

    expect(await screen.findByRole('tab', { name: '月度目标' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '部门' })).toBeInTheDocument();
    expect(await screen.findByRole('columnheader', { name: '月度目标完成率' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /林知夏/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '考勤与请假' }));
    expect(screen.getByRole('columnheader', { name: '出勤天数' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '请假天数' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '请假记录' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '累计迟到' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '早退次数' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '旷工次数' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '考勤得分' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '数据状态' })).not.toBeInTheDocument();
    expect(screen.queryByText(/审批\/人工更正：/)).not.toBeInTheDocument();
    expect(screen.getByRole('row', { name: /周予安/ })).toHaveTextContent('年假 1 天');
    fireEvent.click(screen.getByRole('tab', { name: '额外工作投入' }));
    expect(screen.getByRole('columnheader', { name: '加班总时长' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '折算得分' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '月度上限' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '额外工作得分' })).toBeInTheDocument();
  });

  it('原始数据按姓名与部门联合筛选，同步四类来源并保留刷新状态', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /原始数据/ }));
    expect(screen.queryByText('复核修改记录')).not.toBeInTheDocument();
    fireEvent.mouseDown(await screen.findByLabelText('筛选部门'));
    fireEvent.click(await screen.findByText('产品部', { selector: '.ant-select-item-option-content' }));
    fireEvent.change(screen.getByPlaceholderText('搜索员工姓名'), { target: { value: '林知夏' } });
    expect(screen.getByRole('row', { name: /林知夏/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /周予安/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /顾清和/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '考勤与请假' }));
    fireEvent.click(screen.getByRole('button', { name: /同步数据/ }));
    await waitFor(() => expect(loadKpiDemo().periods['2026-11'].sourceSyncedAt).toBeTruthy());
    for (const name of ['月度目标', '考勤与请假', '额外工作投入', '周月报']) {
      fireEvent.click(screen.getByRole('tab', { name }));
      if (name === '月度目标') expect(await screen.findByRole('row', { name: /林知夏/ })).toBeInTheDocument();
      else expect(screen.getByRole('row', { name: /林知夏/ })).toBeInTheDocument();
    }
  });

  it('员工原始数据四类均仅展示本人且不可同步，周月报不显示状态和修正入口', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('员工');
    fireEvent.click(screen.getByRole('tab', { name: /原始数据/ }));

    expect(screen.queryByPlaceholderText('搜索员工姓名')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('筛选部门')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /同步数据/ })).not.toBeInTheDocument();
    for (const name of ['月度目标', '考勤与请假', '额外工作投入', '周月报']) {
      fireEvent.click(screen.getByRole('tab', { name }));
      expect(await screen.findByRole('row', { name: /林知夏/ })).toBeInTheDocument();
      expect(screen.queryByRole('row', { name: /周予安/ })).not.toBeInTheDocument();
      if (name === '周月报') {
        expect(screen.queryByRole('columnheader', { name: '数据状态' })).not.toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: '绩效修正记录' })).not.toBeInTheDocument();
      }
    }
  });

  it('员工公示仅解释 HR 已通过的主管调分，历史缺失说明不伪造原因', async () => {
    await seedPublishedPeriod();
    const state = loadKpiDemo();
    const employee = state.periods['2026-11'].employees[0];
    employee.scores.managerAdjustment = -2;
    employee.reviewHistory = [
      { id: 'submitted', action: '提交主管复核', actor: '陈宇璋', at: '2026-11-01T08:00:00Z', before: { attitude: 0, adjustment: 0, total: 80 }, proposed: { attitude: 10, adjustment: -2, total: 88 }, reason: '目标延期' },
      { id: 'approved', action: 'HR 审核通过', actor: 'HR', at: '2026-11-02T08:00:00Z', before: { attitude: 0, adjustment: 0, total: 80 }, proposed: { attitude: 10, adjustment: -2, total: 88 }, reason: '目标延期' },
      { id: 'draft', action: '提交主管复核', actor: '陈宇璋', at: '2026-11-03T08:00:00Z', before: { attitude: 10, adjustment: -2, total: 88 }, proposed: { attitude: 10, adjustment: -5, total: 85 }, reason: '不应显示的草稿' },
    ];
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    const view = render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('员工');
    const adjustment = screen.getByRole('region', { name: '人工调分说明' });
    expect(adjustment).toHaveTextContent('有调整');
    expect(adjustment).toHaveTextContent('0.0 → -2.0 分');
    expect(adjustment).toHaveTextContent('目标延期');
    expect(adjustment).toHaveTextContent('陈宇璋');
    expect(adjustment).toHaveTextContent('HR 审核通过');
    expect(adjustment).not.toHaveTextContent('不应显示的草稿');

    view.unmount();
    employee.reviewHistory = [];
    localStorage.setItem(KPI_DEMO_STORAGE_KEY, JSON.stringify(state));
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('员工');
    expect(screen.getByRole('region', { name: '人工调分说明' })).toHaveTextContent('历史评分未记录调整依据');
  });

  it('HR 在汇总复核中处理申诉，原始来源不变且修正记录关联可追溯', async () => {
    await seedPublishedPeriod();
    const appeal = submitKpiAppeal({ month: '2026-11', employeeId: 'e-01', employeeName: '林知夏', reason: '目标得分有误' });
    const view = render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    expect(screen.queryByRole('button', { name: '审核申诉' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    fireEvent.mouseDown(screen.getByLabelText('筛选汇总复核事项'));
    fireEvent.click(await screen.findByText('员工申诉 · 1', { selector: '.ant-select-item-option-content' }));
    expect(screen.getAllByText('员工申诉').length).toBeGreaterThan(1);
    expect(screen.getByText('目标得分有误')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '审核申诉' }));
    expect(await screen.findByLabelText('申诉月度目标得分')).toBeInTheDocument();
    expect(screen.queryByLabelText('申诉出勤天数')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('申诉月度目标得分'), { target: { value: '58' } });
    fireEvent.change(screen.getByLabelText('申诉处理说明'), { target: { value: '核实目标完成情况' } });
    fireEvent.click(screen.getByRole('button', { name: '确认修正' }));
    await waitFor(() => expect(listKpiAppeals().find(item => item.id === appeal.id)?.status).toBe('已修正'));
    const correctedState = loadKpiDemo().periods['2026-11'];
    expect(correctedState.employees[0].source.okrCompletion).toBe(93);
    expect(correctedState.employees[0].scores.objective).toBe(56);
    expect(scoreForEmployee(correctedState.employees[0])).toBe(81.33);
    expect(correctedState.employees[0].approvedSourceCorrections).toHaveLength(1);
    view.unmount();
    const refreshedView = render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    expect(screen.getByText('已修正')).toBeInTheDocument();
    expect(screen.getByText(/处理说明：核实目标完成情况/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /原始数据/ }));
    expect(await screen.findByRole('columnheader', { name: '综合基础分' })).toBeInTheDocument();
    expect(correctedState.employees[0].approvedSourceCorrections?.[0].after.objectiveScore).toBe(58);
    refreshedView.unmount();
    document.querySelectorAll('.ant-modal-root').forEach(node => node.remove());
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('员工');
    expect(screen.getByText('核实目标完成情况')).toBeInTheDocument();
    expect(screen.getByText('月度目标 58 / 60 分')).toBeInTheDocument();
  });

  it('HR 可进入周期设置并按月保存自动公示安排', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    fireEvent.click(screen.getByRole('button', { name: '周期设置' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('2026年11月周期设置')).toBeInTheDocument();
    expect(screen.queryByText('允许主管复核修改')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '设置周期' }));
    expect(screen.getByText('主管复核时间范围')).toBeInTheDocument();
    expect(screen.getByText('员工申诉确认时间范围')).toBeInTheDocument();
    expect(screen.getByText('最终公示时间')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '保存周期设置' }));
    await waitFor(() => expect(loadKpiDemo().periods['2026-11']).toMatchObject({ reviewEnabled: true, cycleSettings: { finalPublicationAt: expect.any(String) } }));
    expect(screen.getByRole('button', { name: '周期设置' })).toBeInTheDocument();
  });

  it('周期设置仅供 HR 使用，汇总复核不再显示独立复核开关', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('主管');
    expect(screen.queryByRole('button', { name: '周期设置' })).not.toBeInTheDocument();
    expect(screen.queryByText('允许主管复核修改')).not.toBeInTheDocument();
    await chooseRole('HR');
    expect(screen.getByRole('button', { name: '周期设置' })).toBeInTheDocument();
    expect(screen.queryByText('允许主管复核修改')).not.toBeInTheDocument();
  });

});
