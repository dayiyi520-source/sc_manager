// @vitest-environment jsdom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowAssigneeSelect } from './WorkflowAssigneeSelect';

const options = ['陈雅婷', '王浩然', '林志豪'];
const showPopover = vi.fn(function (this: HTMLElement) { this.style.display = 'block'; });
const hidePopover = vi.fn(function (this: HTMLElement) { this.style.display = 'none'; });
const originalShow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover');
const originalHide = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover');

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState('');
  return <div data-testid="clipping-parent" style={{ overflow: 'hidden' }}>
    <WorkflowAssigneeSelect label="任务负责人" value={value} onChange={setValue} options={options} disabled={disabled} />
    <button type="button">外部按钮</button>
  </div>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('CSS', { supports: () => true });
  Object.defineProperty(HTMLElement.prototype, 'showPopover', { configurable: true, value: showPopover });
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', { configurable: true, value: hidePopover });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalShow) Object.defineProperty(HTMLElement.prototype, 'showPopover', originalShow);
  else delete (HTMLElement.prototype as Partial<HTMLElement>).showPopover;
  if (originalHide) Object.defineProperty(HTMLElement.prototype, 'hidePopover', originalHide);
  else delete (HTMLElement.prototype as Partial<HTMLElement>).hidePopover;
});

describe('workflow assignee overlay', () => {
  it('portals outside the clipping parent and opens in the browser top layer', () => {
    render(<Harness />);
    fireEvent.focus(screen.getByRole('combobox'));
    const menu = screen.getByRole('listbox');
    expect(menu.parentElement).toBe(document.body);
    expect(screen.getByTestId('clipping-parent')).not.toContainElement(menu);
    expect(menu).toHaveAttribute('popover', 'manual');
    expect(showPopover).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });
  it('selects a visible option and closes without losing the selected value', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '陈' } });
    const option = screen.getByRole('option', { name: '陈雅婷' });
    fireEvent.mouseDown(option);
    fireEvent.click(option);
    expect(input).toHaveValue('陈雅婷');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(option.isConnected).toBe(false);
  });
  it('closes on outside click, Escape and input blur', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.pointerDown(screen.getByRole('button', { name: '外部按钮' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(input);
    fireEvent.blur(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
  it('supports keyboard selection and shows a nonselectable empty state', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('陈雅婷');
    fireEvent.change(input, { target: { value: '不存在的员工' } });
    expect(screen.getByRole('status')).toHaveTextContent('暂无匹配负责人');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
  it('removes the overlay when the field unmounts or becomes disabled', () => {
    const { rerender, unmount } = render(<Harness />);
    fireEvent.focus(screen.getByRole('combobox'));
    rerender(<Harness disabled />);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeDisabled();
    unmount();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
  it('provides a native select fallback if anchor positioning is unsupported', () => {
    vi.stubGlobal('CSS', { supports: () => false });
    render(<Harness />);
    expect(screen.getByRole('combobox').tagName).toBe('SELECT');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '王浩然' } });
    expect(screen.getByRole('combobox')).toHaveValue('王浩然');
    expect(showPopover).not.toHaveBeenCalled();
  });
});
