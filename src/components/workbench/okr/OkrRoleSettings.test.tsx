// @vitest-environment jsdom
import { cleanup, fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ConfigProvider } from 'antd';
import type { ReactNode } from 'react';
import { OkrRoleSettings } from './OkrRoleSettings';
import type { OkrSettings } from '../../../services/okrRepository';
const render = (ui: ReactNode) => rtlRender(<ConfigProvider theme={{ token: { motion: false } }}>{ui}</ConfigProvider>);
afterEach(cleanup);
const people = [{ id: 'a', name: '管理员甲', department: '公司', rootFlag: 1, supervisorId: null, version: 0 }, { id: 's', name: '主管乙', department: '团队最新部门', rootFlag: 0, supervisorId: 'a', version: 0 }];
const draft = { administratorIds: ['a'], supervisorIds: ['s'] } as OkrSettings;
it('shows functional grants and administrator replacement instead of removal', () => {
  const onChange = vi.fn();
  render(<OkrRoleSettings draft={draft} people={people} disabled={false} onChange={onChange}/>);
  expect(screen.getByText('员工')).toBeVisible();
  expect(screen.getByText('团队最新部门')).toBeVisible();
  expect(screen.getByText('功能权限')).toBeVisible();
  expect(within(screen.getByText('管理员甲').closest('tr')!).getByRole('button', { name: '更换' })).toBeEnabled();
  expect(within(screen.getByText('管理员甲').closest('tr')!).queryByRole('button', { name: '移除' })).toBeNull();
  expect(within(screen.getByText('主管乙').closest('tr')!).getByText('部门目标编辑')).toBeVisible();
  expect(within(screen.getByText('主管乙').closest('tr')!).queryByRole('button', { name: '主管乙编辑权限' })).toBeNull();
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

it('adds the sub-administrator role and opens the six-grant editor',async()=>{
 const onChange=vi.fn(async()=>true);
 const full={...draft,subAdministratorIds:['s'],permissionGrants:{a:['okrTemplates','reviewTemplates','roleSettings','weeklyCycles','confirmationSettings','companyGoalEdit'],s:['okrTemplates','reviewTemplates','roleSettings','weeklyCycles','confirmationSettings','companyGoalEdit']}} as OkrSettings;
 render(<OkrRoleSettings draft={full} people={people} disabled={false} onChange={onChange}/>);
 fireEvent.click(screen.getByRole('button',{name:'主管乙编辑权限'}));
 await screen.findByRole('checkbox',{name:'公司目标编辑'});
 expect(screen.getByLabelText('公司目标编辑')).toBeChecked();
 fireEvent.click(screen.getByLabelText('公司目标编辑'));
 fireEvent.click(screen.getByRole('button',{name:'保存权限'}));
 await waitFor(()=>expect(screen.getByRole('dialog')).not.toBeVisible());
 expect(onChange).toHaveBeenCalledWith(expect.objectContaining({permissionGrants:expect.objectContaining({s:expect.not.arrayContaining(['companyGoalEdit'])})}));
});


it('only offers sub-administrator and supervisor when adding and starts sub-administrators with no grants', async () => {
  const onChange = vi.fn(async () => true);
  render(<OkrRoleSettings draft={draft} people={[...people, { id:'new', name:'新员工', department:'研发', rootFlag:0, supervisorId:'a', version:0 }]} disabled={false} onChange={onChange}/>);
  fireEvent.click(screen.getByRole('button',{name:'添加成员'}));
  const dialog = screen.getByRole('dialog',{name:'添加成员'});
  fireEvent.mouseDown(within(dialog).getByRole('combobox'));
  expect(screen.queryByText('管理员',{selector:'.ant-select-item-option-content'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('子管理员',{selector:'.ant-select-item-option-content'}));
  fireEvent.click(screen.getByRole('checkbox',{name:'选择新员工'}));
  fireEvent.click(within(dialog).getByRole('button',{name:/保\s*存/}));
  await waitFor(()=>expect(onChange).toHaveBeenCalledWith(expect.objectContaining({subAdministratorIds:['new'],permissionGrants:expect.objectContaining({new:[]})})));
});

it('replaces an administrator in one save and preserves selections on failure', async () => {
  const onChange=vi.fn(async()=>false);
  render(<OkrRoleSettings draft={draft} people={people} disabled={false} onChange={onChange}/>);
  fireEvent.click(screen.getByRole('button',{name:'更换'}));
  fireEvent.mouseDown(screen.getByRole('combobox',{name:'新管理员'}));
  fireEvent.click(screen.getByText('主管乙 · 团队最新部门',{selector:'.ant-select-item-option-content'}));
  fireEvent.click(screen.getByRole('button',{name:'确认更换'}));
  await waitFor(()=>expect(onChange).toHaveBeenCalledWith(expect.objectContaining({administratorIds:['s'],permissionGrants:expect.objectContaining({s:expect.arrayContaining(['roleSettings','companyGoalEdit'])})})));
  await waitFor(() => expect(screen.getByText('保存失败，请重试，当前选择已保留')).toBeVisible());
  // Ant Design uses a shared test title id; locate the active dialog through its failure feedback.
  const dialog = screen.getByText('保存失败，请重试，当前选择已保留').closest('[role=dialog]')!;
  expect(dialog).toBeVisible();
  expect(within(dialog as HTMLElement).getByText('主管乙 · 团队最新部门')).toBeVisible();
});
