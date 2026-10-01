// This suite is intentionally DOM-based; the repository's default tests run in node.
// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductLineBoard, ProductLineHours } from './ProductLineInsights';
import type { UnifiedWorkItem } from '../../services/productRepository';

const item = (id: string, category: UnifiedWorkItem['category'], group: string): UnifiedWorkItem => ({
  id, code: id, title: `工作项 ${id}`, category, productLineId: 'line-1', status: { name: group, group }
});

describe('product line board', () => {
  it('shows only the three shared status groups and keeps cancelled items outside the columns', () => {
    render(<ProductLineBoard items={[
      item('1', 'requirement', 'NOT_STARTED'),
      item('2', 'requirement', 'IN_PROGRESS'),
      item('3', 'requirement', 'COMPLETED'),
      item('4', 'requirement', 'CANCELLED'),
      item('5', 'dev', 'NOT_STARTED')
    ]} onOpenCategory={vi.fn()} />);

    expect(screen.getByText(/另有 1 条已取消/)).toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(3);
    expect(within(screen.getAllByRole('region')[0]).getByText('工作项 1')).toBeInTheDocument();
    expect(within(screen.getAllByRole('region')[1]).getByText('工作项 2')).toBeInTheDocument();
    expect(within(screen.getAllByRole('region')[2]).getByText('工作项 3')).toBeInTheDocument();
    expect(screen.queryByText('工作项 4')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /研发任务/ }));
    expect(screen.getByText('工作项 5')).toBeInTheDocument();
  });

  it('uses assistance as a board view and does not offer a standalone test-case list', () => {
    render(<ProductLineBoard items={[]} onOpenCategory={vi.fn()} />);
    expect(screen.getByRole('button', { name: /协助事项/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /测试用例/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '查看全部' })).not.toBeInTheDocument();
  });

  it('opens the selected board task through its icon and blue title', () => {
    const onOpenItem = vi.fn();
    const task = item('one', 'requirement', 'NOT_STARTED');
    render(<ProductLineBoard items={[task]} onOpenItem={onOpenItem} />);
    const title = screen.getByRole('button', { name: '工作项 one' });
    expect(title.querySelector('svg')).toBeInTheDocument();
    expect(title.className).toContain('text-[var(--primary)]');
    fireEvent.click(title);
    expect(onOpenItem).toHaveBeenCalledWith(task);
  });

  it('groups dated estimated hours by week without presenting cumulative actual hours as a trend', () => {
    render(<ProductLineHours items={[{ ...item('plan', 'dev', 'IN_PROGRESS'), plannedStartDate: '2026-09-07', plannedEndDate: '2026-09-13', estimatedHours: 14, actualHours: 6 }]} memberCount={1} />);
    expect(screen.getByText('工时时间分布')).toBeInTheDocument();
    expect(screen.getByText(/按计划起止日期逐日均摊预计工时/)).toBeInTheDocument();
    expect(screen.queryByText('暂无同时设置计划起止日期和预计工时的工作项')).not.toBeInTheDocument();
  });
});
