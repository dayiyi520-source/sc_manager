// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DepartmentFeedbackTable } from './DepartmentFeedbackTable';
describe('部门月报建议列表', () => {
 it('shows failure and retry instead of an empty state when reading employee feedback fails', () => {
  const retry = vi.fn();
  render(<DepartmentFeedbackTable rows={[]} error onRetry={retry}/>);
  expect(screen.getByText('员工反馈加载失败')).toBeInTheDocument();
  expect(screen.queryByText('本轮暂无员工意见和建议')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
  expect(retry).toHaveBeenCalledOnce();
 });
 it('uses a shared background card for populated feedback', () => {
  const { container } = render(<DepartmentFeedbackTable rows={[{ employeeId: 'a', employeeName: '员工甲', reviewId: 'r', suggestion: '建议改善协作' }]}/>);
  expect(container.querySelector('.okr-weekly-list-panel .ant-table')).toBeInTheDocument();
 });
 it('shows the default empty state without table headers or judgment inputs when nobody submitted feedback', () => {
  const { container } = render(<DepartmentFeedbackTable rows={[]}/>);
  expect(screen.getByText('本轮暂无员工意见和建议')).toBeInTheDocument();
  expect(container.querySelector('.okr-weekly-empty-panel .ant-empty')).toBeInTheDocument();
  expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
 });
 it('does not claim empty feedback while records are still loading', () => {
  render(<DepartmentFeedbackTable rows={[]} loading/>);
  expect(screen.queryByText('本轮暂无员工意见和建议')).not.toBeInTheDocument();
 });
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
