// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Drawer, Modal } from './UIComponents';

afterEach(cleanup);

describe('Drawer backdrop', () => {
  it('places an action modal above the detail drawer outside the page container', () => {
    const onClose = vi.fn();
    const { container } = render(<div style={{ transform: 'translateY(0)' }}><Drawer isOpen onClose={onClose} title="详情">详情内容</Drawer><Modal isOpen onClose={vi.fn()} title="重新开启事项"><button>确认重开</button></Modal></div>);
    const modal = screen.getByRole('button', { name: '确认重开' }).closest('.fixed.inset-0');
    expect(modal?.parentElement).toBe(document.body);
    expect(modal?.className).toContain('z-[60]');
    expect(container).not.toContainElement(modal as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: '确认重开' }));
    expect(onClose).not.toHaveBeenCalled();
  });
  it('uses the overlay token and closes on backdrop click', () => {
    const onClose = vi.fn();
    const { container } = render(<Drawer isOpen onClose={onClose} title="工单详情">工单内容</Drawer>);
    expect(container.querySelector('.drawer-backdrop')).toBeNull();
    const backdrop = document.body.querySelector('.drawer-backdrop');
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
