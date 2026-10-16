// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DepartmentReviewSettings } from './DepartmentReviewSettings';
import { okrRepository } from '../../../services/okrRepository';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';
const people: OkrPerson[] = [{ id: 'm', name: '主管', department: '产品', supervisorId: null, rootFlag: 0, version: 0 }, { id: 'a', name: '员工甲', department: '产品', supervisorId: 'm', rootFlag: 0, version: 0 }];
const payload = { title: '部门周报', reviewType: 'week' as const, startDate: '2026-10-12', endDate: '2026-10-18' };
const props = { payload, people, ownerId: 'm', records: [], disabled: false, loading: false, onChange: vi.fn() };
describe('本轮提交设置', () => {
 it('requires reasons, applies valid exclusions and cancels unapplied changes', async () => {
  const onChange = vi.fn();
  render(<DepartmentReviewSettings {...props} onChange={onChange}/>);
  fireEvent.click(screen.getByRole('button', { name: '本轮提交设置' }));
  fireEvent.click(screen.getByRole('checkbox', { name: '排除员工甲' }));
  fireEvent.click(screen.getByRole('button', { name: '应用设置' }));
  expect(screen.getByText('请为每位排除员工填写原因')).toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: '员工甲排除原因' }), { target: { value: '  本轮休假  ' } });
  fireEvent.click(screen.getByRole('button', { name: '应用设置' }));
  expect(onChange).toHaveBeenCalledWith([{ employeeId: 'a', employeeName: '员工甲', reason: '本轮休假' }]);
 });
 it('views the full report before explicitly marking it read, preserving failures for retry', async () => {
  const record: OkrRecord = { id: 'r', kind: 'review', ownerId: 'a', periodKey: '', version: 1, status: 'submitted', payload: { ...payload, title: '员工甲周报', nextWeekPlan: '下轮计划' } };
  const mark = vi.spyOn(okrRepository, 'markViewed').mockRejectedValueOnce(new Error('网络中断')).mockResolvedValueOnce(undefined);
  const refresh = vi.fn();
  render(<DepartmentReviewSettings {...props} records={[record]} onRefresh={refresh}/>);
  fireEvent.click(screen.getByRole('button', { name: '本轮提交设置' }));
  fireEvent.click(screen.getByRole('button', { name: '查看复盘' }));
  expect(screen.getByText('下轮计划')).toBeInTheDocument();
  expect(mark).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '确认已读' }));
  await waitFor(() => expect(screen.getAllByText('网络中断').length).toBeGreaterThan(0));
  fireEvent.click(await screen.findByRole('button', { name: /确.*认.*已.*读/ }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(mark).toHaveBeenCalledWith('r', 'm');
  mark.mockRestore();
 });
 it('disables settings until data is ready', () => {
  render(<DepartmentReviewSettings {...props} loading/>);
  expect(screen.getByRole('button', { name: '本轮提交设置' })).toBeDisabled();
 });
});

it.each(['week', 'month'] as const)('keeps %s exclusions on submission failure and allows retry', async reviewType => {
 const onSubmit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
 const onCloseSubmit = vi.fn();
 render(<DepartmentReviewSettings {...props} payload={{...payload, reviewType}} submitOpen onSubmit={onSubmit} onCloseSubmit={onCloseSubmit}/>);
 fireEvent.click(screen.getByRole('button', {name: /^提\s*交$/}));
 expect(screen.getByText(/未提交：员工甲/)).toBeInTheDocument();
 expect(onSubmit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('checkbox', {name:'排除员工甲'}));
 fireEvent.click(screen.getByRole('button', {name: /^提\s*交$/}));
 expect(screen.getByText('请为每位排除员工填写原因')).toBeInTheDocument();
 fireEvent.change(screen.getByRole('textbox',{name:'员工甲排除原因'}),{target:{value:'  本轮休假  '}});
 fireEvent.click(screen.getByRole('button', {name: /^提\s*交$/}));
 await screen.findByText(/提交未成功/);
 expect(onCloseSubmit).not.toHaveBeenCalled();
 expect(screen.getByRole('checkbox', {name:'排除员工甲'})).toBeChecked();
 expect(screen.getByRole('textbox',{name:'员工甲排除原因'})).toHaveValue('  本轮休假  ');
 await waitFor(() => expect(screen.getByRole('button', {name: /提\s*交$/})).toBeEnabled());
 fireEvent.click(screen.getByRole('button', {name: /提\s*交$/}));
 await waitFor(()=>expect(onCloseSubmit).toHaveBeenCalledOnce());
 expect(onSubmit).toHaveBeenLastCalledWith([{employeeId:'a', employeeName:'员工甲', reason:'本轮休假'}]);
});
