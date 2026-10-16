// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KrBusinessDetailEditor, replaceKrDetailSelection } from './KrBusinessDetailEditor';
import type { OkrKrDetail } from '../../../services/okrRepository';

const first: OkrKrDetail = { id: 'a', name: '甲', version: 'V1', stage: '设计', plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-10' };
describe('KR parent and multi-child selection', () => {
  it('preserves retained row metadata and other parents while deduplicating selections', () => {
    const other = { ...first, id: 'b', name: '乙' };
    const rows = replaceKrDetailSelection([first, other], '甲', ['V1', 'V2', 'V2']);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(first);
    expect(rows[1]).toMatchObject({ name: '甲', version: 'V2' });
    expect(rows[1].id).not.toBe(first.id);
    expect(rows[2]).toEqual(other);
    expect(replaceKrDetailSelection(rows, '甲', ['V2'])).toEqual([rows[1], other]);
  });
  it.each(['product', 'delivery'] as const)('selects multiple children for one %s parent and keeps unrelated rows', async mode => {
    const onChange = vi.fn();
    render(<KrBusinessDetailEditor mode={mode} rows={[first]} parentOptions={['甲', '乙']} childOptions={{ 甲: ['V1', 'V2'], 乙: ['V1', 'V2'] }} stages={['设计', '验收']} disabled={false} onChange={onChange}/>);
    fireEvent.click(screen.getByRole('button', { name: mode === 'product' ? '添加产品' : '添加项目' }));
    fireEvent.mouseDown(screen.getByLabelText(mode === 'product' ? '关联产品' : '关联项目'));
    fireEvent.click(screen.getByText('乙', { selector: '.ant-select-item-option-content' }));
    fireEvent.mouseDown(screen.getByLabelText(mode === 'product' ? '关联迭代版本' : '关联项目产品'));
    fireEvent.click(screen.getByText('V1', { selector: '.ant-select-item-option-content' }));
    fireEvent.click(screen.getByText('V2', { selector: '.ant-select-item-option-content' }));
    fireEvent.click(screen.getByRole('button', { name: /^确\s*定$/ }));
    await waitFor(() => expect(onChange).toHaveBeenCalledOnce());
    expect(onChange.mock.calls[0][0]).toMatchObject([first, { name: '乙', version: 'V1' }, { name: '乙', version: 'V2' }]);
  });
  it('does not write partial selections or cancelled choices', () => {
    const onChange = vi.fn();
    render(<KrBusinessDetailEditor mode="product" rows={[]} parentOptions={['甲']} childOptions={{ 甲: ['V1'] }} stages={[]} disabled={false} onChange={onChange}/>);
    expect(screen.getAllByText('暂未选择')).toHaveLength(2);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByLabelText('暂未选择 阶段')).toBeDisabled();
    expect(screen.getByLabelText('暂未选择 开始时间')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /移除.*明细/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加产品' }));
    expect(screen.getByRole('button', { name: /^确\s*定$/ })).toBeDisabled();
    fireEvent.mouseDown(screen.getByLabelText('关联产品'));
    fireEvent.click(screen.getByText('甲', { selector: '.ant-select-item-option-content' }));
    expect(screen.getByRole('button', { name: /^确\s*定$/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^取\s*消$/ }));
    expect(onChange).not.toHaveBeenCalled();
  });
  it('clears dependent choices on parent switch and explains missing child data', () => {
    render(<KrBusinessDetailEditor mode="delivery" rows={[first]} parentOptions={['甲', '乙']} childOptions={{ 甲: ['V1'] }} stages={[]} disabled={false} onChange={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: '修改甲明细' }));
    fireEvent.mouseDown(screen.getByLabelText('关联项目'));
    fireEvent.click(screen.getByText('乙', { selector: '.ant-select-item-option-content' }));
    expect(screen.getByLabelText('关联项目产品')).toBeDisabled();
    expect(screen.getByRole('button', { name: /^确\s*定$/ })).toBeDisabled();
    expect(screen.getByText('该项目暂无可选项目产品，请更换项目或先维护对应数据')).toBeInTheDocument();
  });
  it('keeps saved choices absent from the current catalog and disables read-only controls', () => {
    const { rerender } = render(<KrBusinessDetailEditor mode="product" rows={[first]} parentOptions={[]} childOptions={{}} stages={[]} disabled={false} onChange={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: '修改甲明细' }));
    expect(screen.getByRole('button', { name: /^确\s*定$/ })).toBeEnabled();
    rerender(<KrBusinessDetailEditor mode="product" rows={[first]} parentOptions={[]} childOptions={{}} stages={[]} disabled onChange={vi.fn()}/>);
    expect(screen.getByRole('button', { name: '修改甲明细' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '修改甲明细' })).toBeDisabled();
  });
});
