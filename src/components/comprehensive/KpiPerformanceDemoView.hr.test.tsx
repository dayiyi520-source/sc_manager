// @vitest-environment jsdom
import React from 'react';
import { App as AntApp } from 'antd';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { KpiPerformanceDemoView } from './KpiPerformanceDemoView';
import { KPI_DEMO_STORAGE_KEY, loadKpiDemo } from '../../services/kpiPerformanceDemo';

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
  it('按部门分组展示全员并保留公示操作', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);

    expect(screen.getByRole('button', { name: /公示绩效结果/ })).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: '产品部绩效公示' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '研发部绩效公示' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '交付部绩效公示' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '运营部绩效公示' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '产品部绩效公示' })).getByRole('button', { name: /林知夏/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /唐以宁/ })).toBeInTheDocument();
  });

  it('HR 汇总复核左侧按部门分组员工', async () => {
    render(<AntApp><KpiPerformanceDemoView /></AntApp>);
    fireEvent.click(screen.getByRole('tab', { name: /汇总复核/ }));

    expect(await screen.findByText('产品部')).toBeInTheDocument();
    expect(screen.getByText('研发部')).toBeInTheDocument();
    expect(screen.getAllByText('林知夏').length).toBeGreaterThan(0);
    expect(screen.getAllByText('周予安').length).toBeGreaterThan(0);
  });
});
