// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewTemplateGate } from './ReviewTemplateGate';

describe('separate management review templates', () => {
  it('does not misreport loading or request failure as an unconfirmed employee role and can retry', () => {
    const onRetry = vi.fn();
    const props = { type: 'month' as const, period: { startDate: '2026-10-01', endDate: '2026-10-31' }, onCancel: vi.fn(), onRetry };
    const { rerender } = render(<ReviewTemplateGate {...props} loading/>);
    expect(screen.getByRole('status')).toHaveTextContent('正在加载复盘资料');
    expect(screen.queryByText('人员角色尚未确认')).not.toBeInTheDocument();
    rerender(<ReviewTemplateGate {...props} error={new Error('无法连接')}/>);
    expect(screen.getByText('复盘资料加载失败')).toBeInTheDocument();
    expect(screen.queryByText('人员角色尚未确认')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    expect(onRetry).toHaveBeenCalledOnce();
    rerender(<ReviewTemplateGate {...props}/>);
    expect(screen.getByText('人员角色尚未确认')).toBeInTheDocument();
  });
  it.each([['supervisor', '主管'], ['boss', '老板']] as const)('shows the %s template boundary without employee fields', (template, name) => {
    const onCancel = vi.fn();
    render(<ReviewTemplateGate template={template} type="week" period={{ startDate: '2026-10-12', endDate: '2026-10-18' }} onCancel={onCancel}/>);
    expect(screen.getByRole('region', { name: `${name}周报模板` })).toBeInTheDocument();
    expect(screen.getByText(`${name}周报模板待配置`)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '下周计划' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '提交周报' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /返\s*回/ }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
