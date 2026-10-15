// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { OkrRoleSettings } from './OkrRoleSettings';
import type { OkrSettings } from '../../../services/okrRepository';
afterEach(cleanup);
const people = [{ id: 'a', name: '管理员甲', department: '公司', rootFlag: 1, supervisorId: null, version: 0 }, { id: 's', name: '主管乙', department: '团队最新部门', rootFlag: 0, supervisorId: 'a', version: 0 }];
const draft = { administratorIds: ['a'], supervisorIds: ['s'] } as OkrSettings;
it('shows employees, current departments, roles and protects the last administrator', () => {
  const onChange = vi.fn();
  render(<OkrRoleSettings draft={draft} people={people} disabled={false} onChange={onChange}/>);
  expect(screen.getByText('员工')).toBeVisible();
  expect(screen.getByText('团队最新部门')).toBeVisible();
  expect(within(screen.getByText('管理员甲').closest('tr')!).getByRole('button', { name: '移除' })).toBeDisabled();
  fireEvent.click(within(screen.getByText('主管乙').closest('tr')!).getByRole('button', { name: '移除' }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ administratorIds: ['a'], supervisorIds: [] }));
});
it('disables role modifications for read-only or loading settings', () => {
  render(<OkrRoleSettings draft={draft} people={people} disabled onChange={vi.fn()}/>);
  for (const button of screen.getAllByRole('button', { name: '移除' })) expect(button).toBeDisabled();
  expect(screen.getByRole('button', { name: '添加成员' })).toBeDisabled();
});

it('reuses the member picker, disables assigned roles and preserves failed selections', async () => {
  const onChange = vi.fn(async () => false);
  render(<OkrRoleSettings draft={draft} people={people} disabled={false} onChange={onChange}/>);
  fireEvent.click(screen.getByRole('button', { name: '添加成员' }));
  fireEvent.mouseDown(within(screen.getByRole('dialog', { name: '添加成员' })).getByRole('combobox'));
  fireEvent.click(screen.getByText('主管', { selector: '.ant-select-item-option-content' }));
  expect(screen.getByRole('checkbox', { name: '选择主管乙' })).toBeDisabled();
  fireEvent.change(screen.getByPlaceholderText('搜索姓名、部门或职位'), { target: { value: '公司' } });
  fireEvent.click(screen.getByRole('checkbox', { name: '选择管理员甲' }));
  fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
  await vi.waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ administratorIds: ['a'], supervisorIds: ['s', 'a'] })));
  await vi.waitFor(() => expect(screen.getByText('保存失败，请重试，当前选择已保留')).toBeVisible());
  expect(screen.getByRole('checkbox', { name: '选择管理员甲' })).toBeChecked();
});

it('combines name and role filters, includes dual roles and supports clearing search', () => {
  const onChange = vi.fn();
  render(<OkrRoleSettings draft={{ ...draft, supervisorIds: ['a', 's'] }} people={people} disabled onChange={onChange}/>);
  const search = screen.getByRole('textbox', { name: '搜索角色成员' });
  fireEvent.change(search, { target: { value: '  管理员甲  ' } });
  expect(screen.getByText('管理员甲')).toBeVisible();
  expect(screen.queryByText('主管乙')).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '筛选成员角色' }));
  fireEvent.click(screen.getByText('主管', { selector: '.ant-select-item-option-content' }));
  expect(screen.getByText('管理员甲')).toBeVisible();
  fireEvent.change(search, { target: { value: '不存在' } });
  expect(screen.getByText('暂无角色成员')).toBeVisible();
  fireEvent.change(search, { target: { value: '' } });
  expect(screen.getByText('主管乙')).toBeVisible();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '筛选成员角色' }));
  fireEvent.click(screen.getByText('管理员', { selector: '.ant-select-item-option-content' }));
  expect(screen.getByText('管理员甲')).toBeVisible();
  expect(screen.queryByText('主管乙')).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});
