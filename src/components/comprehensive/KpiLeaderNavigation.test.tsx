// @vitest-environment jsdom
import React from 'react';
import { App as AntApp, Modal } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { KpiPerformanceDemoView } from './KpiPerformanceDemoView';
import { loadKpiDemo, saveKpiDemo } from '../../services/kpiPerformanceDemo';
import { saveModuleReview } from '../../services/kpiModuleReview';
import { blankAdjustments } from '../../services/kpiReviewModel';
vi.mock('../../services/okrRepository', async () => { const seed = await import('../../data/mockOkrState.json'); return { okrRepository: { people: async () => seed.default.okrPeople, records: async () => seed.default.okrRecords } }; });
beforeEach(() => localStorage.clear());
afterEach(() => { Modal.destroyAll(); cleanup(); });
async function chooseRole(name: string) { fireEvent.mouseDown(screen.getByLabelText('体验角色')); fireEvent.click(await screen.findByText(`${name}视角`, { selector: '.ant-select-item-option-content' })); }
function published() {
  const state = loadKpiDemo(); let period = state.periods['2026-11'];
  for (const leader of period.supervisors!) period = saveModuleReview(period, leader.id, { role: '老板', name: '老板', month: '2026-11' }, blankAdjustments(), 'apply', 0);
  period.published = true;
  state.periods['2026-11'] = period; saveKpiDemo(state); return period;
}
describe('主管成员合并与老板侧栏', () => {
  it.each(['HR', '主管'])('%s公示列表主管排第一，详情同员工且只读', async role => {
    const period = published(); const leader = period.supervisors![0];
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    if (role === '主管') { await chooseRole(role); fireEvent.click(screen.getByRole('tab', { name: /月度公示/ })); }
    expect(screen.queryByRole('tab', { name: '主管绩效' })).not.toBeInTheDocument();
    const department = screen.getByRole('region', { name: `${leader.department}绩效公示` });
    const cards = department.querySelectorAll('.kpi-scoreboard-tile');
    expect(cards[0]).toHaveTextContent(leader.name);
    expect(cards[1]).toHaveTextContent(period.employees[0].name);
    expect(department).toHaveTextContent('2 位员工');
    fireEvent.click(cards[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('region', { name: '绩效结果总览' })).toHaveTextContent(leader.name);
    expect(within(dialog).getByRole('table')).toBeInTheDocument();
    expect(within(dialog).queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: '确认主管绩效评定' })).not.toBeInTheDocument();
  });
  it.each(['HR', '主管'])('%s复核部门成员首项为主管，可切换到只读绩效', async role => {
    const period = published(), leader = period.supervisors![0];
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    if (role === '主管') await chooseRole(role);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));
    const section = screen.getByRole('region', { name: `${leader.department}成员` });
    const first = within(section).getAllByRole('button').find(button => button.textContent?.includes(leader.name))!;
    const named = within(section).getAllByRole('button').filter(button => button.getAttribute('aria-pressed') !== null);
    expect(named[0]).toBe(first);
    fireEvent.click(first);
    expect(screen.getByRole('region', { name: '主管绩效结果' })).toHaveTextContent(leader.name);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
  it('老板侧栏切换主管，仅保存选中的主管，返回第一人不串分', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>); await chooseRole('老板');
    expect(screen.queryByRole('tab', { name: '主管绩效' })).not.toBeInTheDocument();
    const options = screen.getByRole('complementary', { name: '主管选项' });
    const buttons = within(options).getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(buttons[1]);
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('月度目标老板加分'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('月度目标老板加减分说明'), { target: { value: '第二名主管评定' } });
    fireEvent.click(screen.getByRole('button', { name: '确认主管绩效评定' }));
    await waitFor(() => expect(loadKpiDemo().periods['2026-11'].supervisors![1].bossRatedAt).toBeTruthy());
    expect(loadKpiDemo().periods['2026-11'].supervisors![0].bossRatedAt).toBeUndefined();
    fireEvent.click(buttons[0]);
    expect(screen.getByLabelText('月度目标老板加分')).toHaveValue('0.00');
    expect(screen.getByLabelText('月度目标老板加减分说明')).toHaveValue('');
  });
  it('历史月份无主管记录显示空状态，不补造主管结果', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>); await chooseRole('老板');
    fireEvent.mouseDown(screen.getByLabelText('考核月份'));
    fireEvent.click(await screen.findByText('2026年10月', { selector: '.ant-select-item-option-content' }));
    expect(screen.getByRole('region', { name: '主管绩效信息' })).toHaveTextContent('本月暂无主管绩效记录');
    expect(screen.queryByRole('button', { name: '确认主管绩效评定' })).not.toBeInTheDocument();
  });
  it('历史主管公示只显示组织所属部门，主管身份卡置顶且不伪造历史分数', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    await chooseRole('主管');
    fireEvent.mouseDown(screen.getByLabelText('考核月份'));
    fireEvent.click(await screen.findByText('2026年10月', { selector: '.ant-select-item-option-content' }));
    fireEvent.click(screen.getByRole('tab', { name: /月度公示/ }));
    expect(screen.queryByRole('region', { name: '研发部绩效公示' })).not.toBeInTheDocument();
    const product = screen.getByRole('region', { name: '产品部绩效公示' });
    const first = product.querySelector('.kpi-scoreboard-tile')!;
    expect(first).toHaveTextContent('陈宇璋');
    expect(first).toHaveTextContent('主管');
    expect(first).toHaveTextContent('暂无本月绩效记录');
    fireEvent.click(first);
    expect(await screen.findByRole('dialog')).toHaveTextContent('暂无本月主管绩效记录');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(loadKpiDemo().periods['2026-10'].supervisors).toEqual([]);
  });

});
