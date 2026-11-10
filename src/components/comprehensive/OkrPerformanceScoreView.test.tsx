// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OkrPerformanceScoreView } from './OkrPerformanceScoreView';
import { loadKpiDemo } from '../../services/kpiPerformanceDemo';

vi.mock('../../services/okrRepository', () => ({ okrRepository: {
  people: vi.fn().mockResolvedValue([]),
  records: vi.fn().mockResolvedValue([]),
} }));

describe('原始数据月度目标', () => {
  it.each(['2026-10', '2026-11'])('%s 显示六名演示员工和指定计分字段', async month => {
    const employees = loadKpiDemo().periods[month].employees;
    render(<OkrPerformanceScoreView month={month} employees={employees} />);
    expect(await screen.findByRole('row', { name: /林知夏/ })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(7);
    expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual([
      '员工', '部门', '月度目标完成率', '目标基础分', 'KR 完成率扣分', '刚性红线', '综合基础分', '备注',
    ]);
    const redlineRow = screen.getByRole('row', { name: /许明川/ });
    expect(within(redlineRow).getByText('是')).toBeInTheDocument();
    expect(within(redlineRow).getByText(/完成率低于 80%/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /确认计分|提交审核/ })).not.toBeInTheDocument();
  });
});
