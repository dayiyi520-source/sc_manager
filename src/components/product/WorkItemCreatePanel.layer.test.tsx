// @vitest-environment jsdom
import React from 'react';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkItemCreatePanel } from './WorkItemCreatePanel';
it('portals task creation above an existing collaboration detail and retains keyboard cancellation', () => {
  const close = vi.fn();
  const { container } = render(<div className="fixed z-50" data-testid="collaboration-detail"><WorkItemCreatePanel isOpen onClose={close} title="新建任务">可操作的新建表单</WorkItemCreatePanel></div>);
  const dialog = screen.getByRole('dialog', { name: '新建任务' });
  expect(dialog.parentElement).toBe(document.body);
  expect(dialog).toHaveClass('z-[60]');
  expect(container).not.toContainElement(dialog);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(close).toHaveBeenCalledTimes(1);
});
