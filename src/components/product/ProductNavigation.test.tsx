/* @vitest-environment jsdom */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductNavigation } from './ProductNavigation';

describe('ProductNavigation', () => {
  it('filters, selects and collapses products', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ProductNavigation productLines={[{ id: 'one', name: '产品甲', code: 'A1' }, { id: 'two', name: '产品乙', code: 'B2' }]} value="all" onChange={onChange} />);
    expect(screen.getByRole('button', { name: '全部产品' })).toHaveAttribute('aria-current', 'page');
    fireEvent.change(screen.getByRole('textbox', { name: '搜索产品' }), { target: { value: 'B2' } });
    expect(screen.queryByRole('button', { name: '产品：产品甲' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '产品：产品乙' }));
    expect(onChange).toHaveBeenCalledWith('two');
    rerender(<ProductNavigation productLines={[{ id: 'one', name: '产品甲', code: 'A1' }, { id: 'two', name: '产品乙', code: 'B2' }]} value="two" onChange={onChange} />);
    expect(screen.getByRole('button', { name: '产品：产品乙' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: '收起产品导航栏' }));
    expect(screen.queryByRole('textbox', { name: '搜索产品' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '展开产品导航栏' }));
    expect(screen.getByRole('textbox', { name: '搜索产品' })).toHaveValue('B2');
  });
});
