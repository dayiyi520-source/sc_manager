// @vitest-environment jsdom
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewTemplateFields, ReviewTemplateLayout, ReviewTemplateSection } from './ReviewTemplateFields';
import type { ReviewReportTemplate, ReviewTemplateValues } from '../../../services/reviewTemplateConfiguration';

const block = { id: 'notes', title: '补充总结', guidance: '', fields: [{ id: 'notes-text', type: 'textarea' as const, label: '补充总结', required: true, placeholder: '请输入总结', maxLength: 10000 }] };
const template: ReviewReportTemplate = { id: 't', name: '报告模板', department: '产品部', audience: 'employee', reportType: 'week', version: 1, status: 'published', effectiveFrom: '2026-10-01', blocks: [block] };

describe('configured review text sections', () => {
  it('renders no supplemental container when a fixed section has no fields or guidance', () => {
    const empty = { id: 'goals', title: '目标复盘', guidance: '', fields: [] };
    const view = render(<ReviewTemplateFields block={empty} values={{}} onChange={vi.fn()}/>);
    expect(view.container).toBeEmptyDOMElement();
    view.rerender(<ReviewTemplateSection template={{ ...template, blocks: [empty] }} blockId="goals" values={{}} onChange={vi.fn()}/>);
    expect(view.container).toBeEmptyDOMElement();
  });
  it('places fixed section content immediately after its header without empty spacing wrappers', () => {
    const goals = { id: 'goals', title: '目标复盘', guidance: '', fields: [] };
    const { container } = render(<ReviewTemplateLayout template={{ ...template, blocks: [goals] }} values={{}} onChange={vi.fn()}>
      <section data-review-block="goals" className="okr-weekly-section">
        <div className="okr-weekly-section-header">1. 目标复盘</div>
        <article>目标正文</article>
        <ReviewTemplateSection template={{ ...template, blocks: [goals] }} blockId="goals" values={{}} onChange={vi.fn()}/>
      </section>
    </ReviewTemplateLayout>);
    expect(container.querySelector('.okr-weekly-section')?.children).toHaveLength(2);
    expect(container.querySelector('.okr-weekly-section-header')?.nextElementSibling).toHaveTextContent('目标正文');
  });
  it('retains configured guidance even without supplemental fields', () => {
    render(<ReviewTemplateSection template={{ ...template, blocks: [{ id: 'goals', title: '目标复盘', guidance: '填写说明', fields: [] }] }} blockId="goals" values={{}} onChange={vi.fn()}/>);
    expect(screen.getByText('填写说明')).toBeInTheDocument();
  });

  it.each(['employee', 'supervisor'] as const)('restores %s weekly and monthly section presentation and preserves input', audience => {
    for (const reportType of ['week', 'month'] as const) {
      function Editor() {
        const [values, setValues] = useState<ReviewTemplateValues>({ 'notes-text': '已保存内容' });
        return <ReviewTemplateLayout template={{ ...template, audience, reportType }} values={values} onChange={setValues}>{null}</ReviewTemplateLayout>;
      }
      const view = render(<Editor/>);
      const section = screen.getByRole('region', { name: '补充总结' });
      const heading = within(section).getByRole('heading', { name: '1. 补充总结 必填' });
      expect(heading.querySelector('[aria-hidden="true"]')).toHaveClass('bg-[var(--primary)]');
      expect(within(section).queryByText('补充总结', { selector: 'label span' })).not.toBeInTheDocument();
      const input = within(section).getByRole('textbox', { name: '补充总结' });
      expect(input).toHaveAttribute('rows', '4');
      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('maxlength', '10000');
      expect(input).toHaveAttribute('placeholder', '请输入总结');
      expect(input).toHaveValue('已保存内容');
      expect(section.querySelector('.okr-weekly-plan-input')).toBeInTheDocument();
      expect(section.querySelector('.p-4')).not.toBeInTheDocument();
      fireEvent.change(input, { target: { value: '第一行\n第二行' } });
      expect(input).toHaveValue('第一行\n第二行');
      view.unmount();
    }
  });
  it('uses the same heading and textarea for extension sections in disabled state', () => {
    render(<ReviewTemplateSection template={template} blockId="extensions" values={{}} onChange={vi.fn()} disabled/>);
    expect(screen.getByRole('heading', { name: '1. 补充总结 必填' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '补充总结' })).toBeDisabled();
  });
  it('keeps distinct field labels for a section with multiple fields', () => {
    const multi = { ...block, fields: [...block.fields, { id: 'other', type: 'textarea' as const, label: '问题分析', required: false }] };
    render(<ReviewTemplateLayout template={{ ...template, blocks: [multi] }} values={{}} onChange={vi.fn()}>{null}</ReviewTemplateLayout>);
    expect(screen.getByText('补充总结', { selector: 'label span' })).toBeInTheDocument();
    expect(screen.getByText('问题分析', { selector: 'label span' })).toBeInTheDocument();
  });
});
