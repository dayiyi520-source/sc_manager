// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DepartmentFeedbackTable } from './DepartmentFeedbackTable';
describe('部门月报建议列表', () => {
 it('shows real names and suggestions, offers exactly the two judgments and saves selection', () => {
  const row = { employeeId: 'a', employeeName: '员工甲', reviewId: 'r', suggestion: '建议改善协作' };
  const change = vi.fn();
  render(<DepartmentFeedbackTable rows={[row]} disabled={false} onChange={change}/>);
  expect(screen.getByText('员工甲')).toBeInTheDocument();
  expect(screen.getByText('建议改善协作')).toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '员工甲主管判断' }));
  fireEvent.click(screen.getByTitle('需公司解决'));
  expect(change).toHaveBeenCalledWith({ ...row, judgment: '需公司解决' });
 });
 it('shows saved judgments read-only', () => {
  render(<DepartmentFeedbackTable rows={[{ employeeId: 'a', employeeName: '员工甲', reviewId: 'r', suggestion: '建议', judgment: '已内部解决' }]}/>);
  expect(screen.getByRole('combobox', { name: '员工甲主管判断' })).toBeDisabled();
  expect(screen.getByText('已内部解决')).toBeInTheDocument();
 });
});
