// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ReviewTemplateMonthlyLinkage } from './ReviewTemplateMonthlyLinkage';
afterEach(cleanup);
it('shows the employee monthly suggestion source', () => {
  render(<ReviewTemplateMonthlyLinkage audience="employee" reportType="month"/>);
  expect(screen.getByRole('textbox', { name: '员工建议联动预览' })).toBeDisabled();
  expect(screen.getByText(/提交月报后，非空建议进入同部门、同月/)).toBeInTheDocument();
});
it('shows the supervisor monthly judgment columns and scope', () => {
  render(<ReviewTemplateMonthlyLinkage audience="supervisor" reportType="month"/>);
  for (const name of ['员工', '意见和建议', '主管判断']) expect(screen.getByRole('columnheader', { name })).toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: '主管判断联动预览' })).toBeDisabled();
});
it('does not add monthly feedback to weekly templates', () => {
  const { container } = render(<ReviewTemplateMonthlyLinkage audience="employee" reportType="week"/>);
  expect(container).toBeEmptyDOMElement();
});
