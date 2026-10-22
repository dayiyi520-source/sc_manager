// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ReviewTemplateLinkControls } from './ReviewTemplateLinkControls';
import { newReviewTemplate, type ReviewTemplateBlock } from '../../../services/reviewTemplateConfiguration';

afterEach(cleanup);
it('keeps commas while editing and stores trimmed judgment choices', () => {
  function Harness() {
    const [block, setBlock] = useState<ReviewTemplateBlock>({ id: 'summary', title: '建议汇总', guidance: '', fields: [], aggregation: { sourceBlockId: 'ideas', sourceReportType: 'week', needsJudgment: true, judgmentLabel: '处理方式', judgmentOptions: [] } });
    return <><ReviewTemplateLinkControls template={{ ...newReviewTemplate(), audience: 'supervisor' }} templates={[]} block={block} onChange={changes => setBlock(current => ({ ...current, ...changes }))}/><output>{JSON.stringify(block.aggregation?.judgmentOptions)}</output></>;
  }
  render(<Harness/>);
  const input = screen.getByRole('textbox', { name: '建议汇总判断选项' });
  fireEvent.change(input, { target: { value: '已采纳，' } });
  expect(input).toHaveValue('已采纳，');
  fireEvent.change(input, { target: { value: ' 已采纳， 待评估, 不采纳，，' } });
  expect(screen.getByRole('status')).toHaveTextContent('["已采纳","待评估","不采纳"]');
  fireEvent.click(screen.getByRole('switch', { name: '建议汇总需要判断' }));
  expect(screen.queryByRole('textbox', { name: '建议汇总判断选项' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('switch', { name: '建议汇总需要判断' }));
  expect(screen.getByRole('textbox', { name: '建议汇总判断选项' })).toHaveValue(' 已采纳， 待评估, 不采纳，，');
});

it('configures same-type department linkage for employee modules', () => {
  function Harness() {
    const [block, setBlock] = useState<ReviewTemplateBlock>({ id: 'ideas', title: '意见建议', guidance: '', fields: [] });
    return <><ReviewTemplateLinkControls template={{ ...newReviewTemplate(), reportType: 'month' }} templates={[]} block={block} onChange={changes => setBlock(current => ({ ...current, ...changes }))}/><output>{block.departmentLink?.reportType || '关闭'}</output></>;
  }
  render(<Harness/>);
  fireEvent.click(screen.getByRole('switch', { name: '意见建议联动到部门报告' }));
  expect(screen.getByRole('status')).toHaveTextContent('month');
  fireEvent.click(screen.getByRole('switch', { name: '意见建议联动到部门报告' }));
  expect(screen.getByRole('status')).toHaveTextContent('关闭');
});
