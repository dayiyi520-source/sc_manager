// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonthlyOverview } from './MonthlyOverview';
describe('monthly overview', () => {
  it('renders a compact unlabeled trend and a hollow monthly endpoint with department averages', () => {
    const { container } = render(<MonthlyOverview progress={60} points={[{ id: 'w', date: '2026-10-10', progress: 30 },{ id: 'm', date: '2026-10-31', progress: 60, monthly: true }]} metrics={{ taskCount: 2, collaborationCount: 1, totalHours: 16, departmentAverageHours: 12 }}/>);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('部门人均 12 小时')).toBeInTheDocument();
    expect(screen.queryByText('本月填写')).not.toBeInTheDocument();
    expect(container.querySelectorAll('circle.is-monthly')).toHaveLength(1);
    expect(container.querySelectorAll('line.is-monthly')).toHaveLength(1);
  });
  it('does not convert unavailable overtime or failed statistics into zeros', () => {
    render(<MonthlyOverview error progress={0}/>);
    expect(screen.getByText('月度统计加载失败')).toBeInTheDocument();
    expect(screen.getAllByText('部门人均 —')).toHaveLength(2);
  });
});

it('shows department totals as the main values and per-member hours as comparison', () => {
  render(<MonthlyOverview department progress={50} metrics={{ taskCount: 1, collaborationCount: 0, totalHours: 8, departmentTaskCount: 6, departmentCollaborationCount: 2, departmentTotalHours: 40, departmentAverageHours: 10 }}/>);
  expect(screen.getByText('40 小时')).toBeInTheDocument();
  expect(screen.getByText('部门人均 10 小时')).toBeInTheDocument();
  expect(screen.getByText('6')).toBeInTheDocument();
  expect(screen.queryByText('8 小时')).not.toBeInTheDocument();
});
