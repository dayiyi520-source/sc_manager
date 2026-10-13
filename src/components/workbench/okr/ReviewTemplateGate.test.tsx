// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewTemplateGate } from './ReviewTemplateGate';

describe('separate management review templates', () => {
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
