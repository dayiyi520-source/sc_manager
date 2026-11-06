// @vitest-environment jsdom
import React from 'react';
import { App as AntApp, Modal } from 'antd';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KpiPerformanceDemoView } from './KpiPerformanceDemoView';
import { KPI_DEMO_STORAGE_KEY, loadKpiDemo } from '../../services/kpiPerformanceDemo';
import { listKpiAppeals } from '../../services/kpiPerformancePublication';

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
    expect(screen.getByRole('tab', { name: /HR 处理/ })).toBeInTheDocument();
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
    expect(screen.getByText('工作态度')).toBeInTheDocument();
    expect(screen.getByText('复盘总结')).toBeInTheDocument();
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
    expect(screen.getByText('报告异常')).toBeInTheDocument();
    view.unmount();
    document.querySelectorAll('.ant-modal-root').forEach(node => node.remove());
  });

  it('原始数据按来源分类展示列表并包含部门字段', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /原始数据/ }));

    expect(await screen.findByRole('tab', { name: '月度目标' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '部门' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '目标完成率' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '考勤与请假' }));
    expect(screen.getByRole('columnheader', { name: '出勤天数' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '请假天数' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '请假记录' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '额外工作投入' }));
    expect(screen.getByRole('columnheader', { name: '加班总时长' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '折算得分' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '月度上限' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '额外工作得分' })).toBeInTheDocument();
  });

});
