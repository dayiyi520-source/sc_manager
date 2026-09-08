// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Drawer } from './UIComponents';

afterEach(cleanup);

describe('Drawer backdrop', () => {
  it('uses the overlay token and closes on backdrop click', () => {
    const onClose = vi.fn();
    const { container } = render(<Drawer isOpen onClose={onClose} title="工单详情">工单内容</Drawer>);
    const backdrop = container.querySelector('.drawer-backdrop');
    expect(backdrop?.className).toContain('bg-[var(--bg-overlay)]');
    fireEvent.click(screen.getByText('工单内容'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders neither panel nor backdrop when closed', () => {
    const { container } = render(<Drawer isOpen={false} onClose={vi.fn()} title="工单详情">工单内容</Drawer>);
    expect(container.innerHTML).toBe('');
  });
});
