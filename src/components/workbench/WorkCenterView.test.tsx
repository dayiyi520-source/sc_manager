// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { WORK_CENTER_TASK_TYPES, WorkCenterView } from './WorkCenterView';

const panels = Object.fromEntries(WORK_CENTER_TASK_TYPES.map(({ key, label }) => [key, <div key={key}>{label}任务列表</div>])) as ComponentProps<typeof WorkCenterView>['taskPanels'];

describe('WorkCenterView', () => {
  it('shows all seven task tabs and defaults to product tasks', () => {
    render(<WorkCenterView taskPanels={panels} />);

    expect(screen.getAllByRole('tab')).toHaveLength(7);
    expect(screen.getByRole('tab', { name: '产品' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('产品任务列表')).toBeTruthy();
    expect(screen.queryByText('设计任务列表')).toBeNull();
  });

  it('switches task lists without loading inactive lists', () => {
    render(<WorkCenterView taskPanels={panels} />);

    fireEvent.click(screen.getByRole('tab', { name: '设计' }));
    expect(screen.getByText('设计任务列表')).toBeTruthy();
    expect(screen.getByRole('tabpanel', { name: '设计' }).hidden).toBe(false);

    fireEvent.click(screen.getByRole('tab', { name: '测试' }));
    expect(screen.queryByText('设计任务列表')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: '设计' }));
    expect(screen.getByText('设计任务列表')).toBeTruthy();
    expect(screen.getByRole('tabpanel', { name: '设计' }).hidden).toBe(false);
  });
});
