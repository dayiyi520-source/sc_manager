// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { CRMDetailLayout } from './CRMDetailLayout';

describe('CRM detail layout contract', () => {
  it('supports shared header, actions, tabs, and content slots', () => {
    const onBack = vi.fn();
    render(<CRMDetailLayout title="客户" subtitle="客户编码：C-1" onBack={onBack} tabs={<div role="tablist">标签</div>} actions={<button type="button">编辑</button>}><div>内容</div></CRMDetailLayout>);
    expect(screen.getByRole('heading', { name: '客户' })).toBeInTheDocument();
    expect(screen.getByText('客户编码：C-1')).toBeInTheDocument();
    expect(screen.getByText('内容')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回列表' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
