// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthlyOverview } from './MonthlyOverview';
describe('monthly overview', () => {
  it('preserves loaded department values while refreshing them in the background', () => {
    const { container, rerender } = render(<MonthlyOverview department loading metrics={{ taskCount: 1, collaborationCount: 0, totalHours: 8, departmentTaskCount: 6, departmentCollaborationCount: 2, departmentTotalHours: 40, departmentAverageHours: 10 }}/>);
    expect(screen.getByText('40 小时')).toBeInTheDocument();
    expect(screen.getByText('部门人均 10 小时')).toBeInTheDocument();
    expect(container.querySelector('.ant-skeleton-input')).toBeNull();
    rerender(<MonthlyOverview department error metrics={{ taskCount: 1, collaborationCount: 0, totalHours: 8, departmentTaskCount: 6, departmentTotalHours: 40 }}/>);
    expect(screen.queryByText('40 小时')).not.toBeInTheDocument();
    expect(screen.getByText('月度统计加载失败')).toBeInTheDocument();
  });
  it('renders a compact unlabeled trend and a hollow monthly endpoint with department averages', () => {
    const { container } = render(<MonthlyOverview progress={60} points={[{ id: 'w', date: '2026-10-10', progress: 30 },{ id: 'm', date: '2026-10-31', progress: 60, monthly: true }]} metrics={{ taskCount: 2, collaborationCount: 1, totalHours: 16, departmentAverageHours: 12 }}/>);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('部门人均 12 小时')).toBeInTheDocument();
    expect(screen.queryByText('本月填写')).not.toBeInTheDocument();
    expect(container.querySelectorAll('circle.is-monthly')).toHaveLength(1);
    expect(container.querySelectorAll('line.is-monthly')).toHaveLength(1);
    expect(container.querySelectorAll('.octicon')).toHaveLength(0);
  });
  it('does not convert unavailable overtime or failed statistics into zeros', () => {
    render(<MonthlyOverview error progress={0}/>);
    expect(screen.getByText('月度统计加载失败')).toBeInTheDocument();
    expect(screen.getAllByText('部门人均 —')).toHaveLength(2);
  });
  it.each([false, true])('replaces stale values and trend while employee/department=%s data loads', department => {
    const { container, rerender } = render(<MonthlyOverview department={department} progress={60} points={[{ id: 'month', date: '2026-10-31', progress: 60, monthly: true }]} loading progressLoading/>);
    expect(screen.getByRole('region', { name: '月度概览' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('60%')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: '本月周报与月报进度趋势' })).not.toBeInTheDocument();
    expect(container.querySelectorAll('.ant-skeleton-input')).toHaveLength(8);
    rerender(<MonthlyOverview department={department} progress={60} points={[{ id: 'month', date: '2026-10-31', progress: 60, monthly: true }]} metrics={{ taskCount: 0, collaborationCount: 0, totalHours: 0, departmentTaskCount: 0, departmentCollaborationCount: 0, departmentTotalHours: 0 }}/>);
    expect(screen.getByRole('region', { name: '月度概览' })).toHaveAttribute('aria-busy', 'false');
    expect(container.querySelector('.ant-skeleton-input')).toBeNull();
    expect(container.querySelectorAll('circle')).toHaveLength(1);
    expect(container.querySelector('line')).toBeNull();
    expect(screen.getByText('0 小时')).toBeInTheDocument();
  });
  it('keeps progress available during work loading or failure and retries progress separately', () => {
    const retry = vi.fn();
    const { rerender } = render(<MonthlyOverview progress={60} loading/>);
    expect(screen.getByText('60%')).toBeInTheDocument();
    rerender(<MonthlyOverview progress={60} error/>);
    expect(screen.getByText('60%')).toBeInTheDocument();
    rerender(<MonthlyOverview progress={60} progressError onRetryProgress={retry} metrics={{ taskCount: 2, collaborationCount: 1, totalHours: 16 }}/>);
    expect(screen.queryByText('60%')).not.toBeInTheDocument();
    expect(screen.getByText('16 小时')).toBeInTheDocument();
    expect(screen.getByText('月度进度加载失败')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

it('shows department totals as the main values and per-member hours as comparison', () => {
  render(<MonthlyOverview department progress={50} metrics={{ taskCount: 1, collaborationCount: 0, totalHours: 8, departmentTaskCount: 6, departmentCollaborationCount: 2, departmentTotalHours: 40, departmentAverageHours: 10 }}/>);
  expect(screen.getByText('40 小时')).toBeInTheDocument();
  expect(screen.getByText('部门人均 10 小时')).toBeInTheDocument();
  expect(screen.getByText('6')).toBeInTheDocument();
  expect(screen.queryByText('8 小时')).not.toBeInTheDocument();
});
