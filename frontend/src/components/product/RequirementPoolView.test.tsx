// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { RequirementActionButtons } from './RequirementActionButtons';

describe('RequirementPoolView action interactions', () => {
  it('renders allowed actions by status and invokes callbacks', () => {
    const onWork = vi.fn();
    const onHold = vi.fn();
    const onReject = vi.fn();
    const { rerender } = render(<RequirementActionButtons status="待处理" hasWorkItem={false} onWork={onWork} onHold={onHold} onReject={onReject} />);
    fireEvent.click(screen.getByRole('button', { name: '转任务' }));
    fireEvent.click(screen.getByRole('button', { name: '需求搁置' }));
    fireEvent.click(screen.getByRole('button', { name: '需求驳回' }));
    expect(onWork).toHaveBeenCalledOnce();
    expect(onHold).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();

    rerender(<RequirementActionButtons status="已搁置" hasWorkItem={false} onWork={onWork} onHold={onHold} onReject={onReject} />);
    expect(screen.getByRole('button', { name: '转任务' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '需求驳回' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '需求搁置' })).not.toBeInTheDocument();

    rerender(<RequirementActionButtons status="处理中" hasWorkItem onWork={onWork} onHold={onHold} onReject={onReject} />);
    expect(screen.queryByRole('button', { name: '转任务' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '需求驳回' })).not.toBeInTheDocument();
  });
});
