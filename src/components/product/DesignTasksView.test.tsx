// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DesignTasksView } from './DesignTasksView';
const catalog = vi.hoisted(() => ({ products: [] as Array<{ id: string; name: string }> }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ productLines: catalog.products, designTasks: [
  { id: '1', designVariant: 'product', productLineId: 'p1', productLineName: '产品甲' },
  { id: '2', designVariant: 'product', productLineId: 'p1', productLineName: '产品甲' },
  { id: '3', requirementType: '物料设计', designProjectName: '项目甲' },
  { id: '4', designVariant: 'other', designSourceDepartment: '设计部' },
] }) }));
vi.mock('./RequirementTasksView', () => ({ RequirementTasksView: (props: any) => <output data-testid="filter">{props.designVariantFilter}:{props.designOwnershipFilter}</output> }));
it('expands every design type and filters by its product, project or department', () => {
  render(<DesignTasksView />);
  expect(screen.queryByText('物料设计')).not.toBeInTheDocument();
  for (const [type, name, key] of [['产品设计', '产品甲', 'product:p1'], ['项目设计', '项目甲', 'project:项目甲'], ['其他设计', '设计部', 'other:设计部']]) {
    fireEvent.click(screen.getByRole('button', { name: type }));
    const child = screen.getByRole('button', { name: `${type}：${name}` });
    fireEvent.click(child);
    expect(screen.getByTestId('filter')).toHaveTextContent(key);
  }
  fireEvent.click(screen.getByRole('button', { name: /全部/ }));
  expect(screen.getByTestId('filter')).toHaveTextContent('all:');
});

it('keeps the selected product category and count when its name changes', () => {
  catalog.products = [{ id: 'p1', name: '产品甲' }];
  const { rerender } = render(<DesignTasksView />);
  fireEvent.click(screen.getByRole('button', { name: '产品设计' }));
  fireEvent.click(screen.getByRole('button', { name: '产品设计：产品甲' }));
  catalog.products = [{ id: 'p1', name: '最新产品名' }];
  rerender(<DesignTasksView />);
  const category = screen.getByRole('button', { name: '产品设计：最新产品名' });
  expect(category).toHaveAttribute('aria-pressed', 'true');
  expect(category).toHaveTextContent('2');
  expect(screen.queryByRole('button', { name: '产品设计：产品甲' })).not.toBeInTheDocument();
  expect(screen.getByTestId('filter')).toHaveTextContent('product:p1');
});
