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
  expect(screen.getByRole('button', { name: '添加角色' })).toBeDisabled();
});
