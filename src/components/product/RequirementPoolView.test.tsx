// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { RequirementActionButtons } from './RequirementActionButtons';
import { isWorkOrderInScope } from './RequirementPoolView';

describe('RequirementPoolView action interactions', () => {
  it('renders work-order actions and invokes callbacks', () => {
    const onWork = vi.fn();
    const onHold = vi.fn();
    const onReject = vi.fn();
    const { rerender } = render(<RequirementActionButtons status="待处理" hasWorkItem={false} onWork={onWork} onHold={onHold} onReject={onReject} />);
    fireEvent.click(screen.getByRole('button', { name: '工单流转' }));
    fireEvent.click(screen.getByRole('button', { name: '工单搁置' }));
    fireEvent.click(screen.getByRole('button', { name: '工单驳回' }));
    expect(onWork).toHaveBeenCalledOnce();
    expect(onHold).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();

    rerender(<RequirementActionButtons status="已搁置" hasWorkItem={false} onWork={onWork} onHold={onHold} onReject={onReject} />);
    expect(screen.getByRole('button', { name: '工单流转' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '工单驳回' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '工单搁置' })).not.toBeInTheDocument();

    rerender(<RequirementActionButtons status="处理中" hasWorkItem onWork={onWork} onHold={onHold} onReject={onReject} />);
    expect(screen.queryByRole('button', { name: '工单流转' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '工单驳回' })).not.toBeInTheDocument();
  });

  it('keeps mine-all as a base filter and matches names robustly', () => {
    const user = '林志豪';
    expect(isWorkOrderInScope({ ownerName: '王浩然', creatorName: ' 林志豪 ' }, 'all', user)).toBe(true);
    expect(isWorkOrderInScope({ ownerName: '王浩然', creatorName: '陈雅婷' }, 'all', user)).toBe(false);
    expect(isWorkOrderInScope({ ownerName: ' 林志豪 ', creatorName: '陈雅婷' }, 'mine_owned', user)).toBe(true);
    expect(isWorkOrderInScope({ ownerName: '林志豪', creatorName: '陈雅婷' }, 'mine_created', user)).toBe(false);
  });
});
