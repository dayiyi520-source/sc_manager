// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import dayjs from 'dayjs';
import { filterInsightItems, initialInsightFilter, ProductInsightFilter } from './ProductInsightFilter';

const tasks = [{ id: 'start', versionId: 'v1', createdAt: '2026-10-04T00:00:00' }, { id: 'end', versionId: 'v2', createdAt: '2026-10-10T23:59:59' }, { id: 'outside', versionId: 'v2', createdAt: '2026-10-03' }, { id: 'missing' }];
it('filters by iteration without dropping tasks outside iterations in the all scope', () => {
  expect(filterInsightItems(tasks, initialInsightFilter)).toHaveLength(4);
  expect(filterInsightItems(tasks, { ...initialInsightFilter, versionId: 'v1' }).map((item) => item.id)).toEqual(['start']);
});
it('includes both calendar date boundaries and excludes undated tasks', () => {
  expect(filterInsightItems(tasks, { ...initialInsightFilter, mode: 'time', period: 7 }, dayjs('2026-10-10')).map((item) => item.id)).toEqual(['start', 'end']);
  expect(filterInsightItems(tasks, { ...initialInsightFilter, mode: 'time', period: 'custom', range: ['2026-10-03', '2026-10-04'] }).map((item) => item.id)).toEqual(['start', 'outside']);
  expect(filterInsightItems(tasks, { ...initialInsightFilter, mode: 'time', period: 'custom' })).toEqual([]);
});
it('switches modes and exposes custom range inputs', () => {
  const onChange = vi.fn();
  const view = render(<ProductInsightFilter value={initialInsightFilter} onChange={onChange} versions={[{ id: 'v1', name: '验收迭代' }]} />);
  fireEvent.click(screen.getByText('按时间'));
  expect(onChange).toHaveBeenCalledWith({ ...initialInsightFilter, mode: 'time' });
  view.rerender(<ProductInsightFilter value={{ ...initialInsightFilter, mode: 'time', period: 'custom' }} onChange={onChange} versions={[]} />);
  expect(screen.getByPlaceholderText('开始日期')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('结束日期')).toBeInTheDocument();
});
