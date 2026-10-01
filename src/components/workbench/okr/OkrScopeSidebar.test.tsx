// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OkrPerson } from '../../../services/okrRepository';
import { buildOkrScopeGroups, OkrScopeSidebar } from './OkrScopeSidebar';

const people: OkrPerson[] = [
  { id: 'boss', name: '陈总', department: '管理层', supervisorId: null, rootFlag: 1, version: 1 },
  { id: 'manager', name: '林主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
  { id: 'staff', name: '刘员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 },
  { id: 'colleague', name: '周同事', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
];

describe('OkrScopeSidebar', () => {
  it('derives supervisor, subordinate, and department members from organization data', () => {
    const groups = buildOkrScopeGroups(people, 'manager');
    expect(groups.find(group => group.key === 'supervisor')?.members.map(person => person.id)).toEqual(['boss']);
    expect(groups.find(group => group.key === 'subordinate')?.members.map(person => person.id)).toEqual(['staff']);
    expect(groups.find(group => group.key === 'department')?.members.map(person => person.id)).toEqual(['staff', 'colleague']);
    expect(groups.find(group => group.key === 'otherDepartments')?.departmentGroups?.map(group => group.department)).toEqual(['管理层']);
  });

  it('shows expand controls only for populated groups and filters members by name', () => {
    render(<OkrScopeSidebar people={people} currentUserId="manager" selection={{ scope: 'my' }} onSelect={vi.fn()} onAddTarget={vi.fn()} onOpenSettings={vi.fn()} defaultExpandMembers />);

    expect(screen.getByRole('button', { name: '收起直属上级成员' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /其他部门成员/ })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('搜索人名'), { target: { value: '周' } });
    expect(screen.getByText('周同事')).toBeInTheDocument();
    expect(screen.queryByText('刘员工')).not.toBeInTheDocument();
  });

  it('delegates group, person, add-target, and settings actions', () => {
    const onSelect = vi.fn();
    const onAddTarget = vi.fn();
    const onOpenSettings = vi.fn();
    render(<OkrScopeSidebar people={people} currentUserId="manager" selection={{ scope: 'my' }} onSelect={onSelect} onAddTarget={onAddTarget} onOpenSettings={onOpenSettings} />);

    fireEvent.click(screen.getByRole('button', { name: '直属下级' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'subordinate' });
    const subordinateGroup = screen.getByLabelText('直属下级分组');
    fireEvent.click(within(subordinateGroup).getByRole('button', { name: '刘员工' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'subordinate', personId: 'staff' });
    fireEvent.click(screen.getByRole('button', { name: '拆解目标' }));
    fireEvent.click(screen.getByRole('button', { name: '目标设置' }));
    expect(onAddTarget).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('provides a side navigation collapse control beside settings', () => {
    const onToggleCollapse = vi.fn();
    const { rerender } = render(<OkrScopeSidebar people={people} currentUserId="manager" selection={{ scope: 'my' }} onSelect={vi.fn()} onAddTarget={vi.fn()} onOpenSettings={vi.fn()} onToggleCollapse={onToggleCollapse} />);

    fireEvent.click(screen.getByRole('button', { name: '收起左侧导航' }));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
    rerender(<OkrScopeSidebar people={people} currentUserId="manager" selection={{ scope: 'my' }} onSelect={vi.fn()} onAddTarget={vi.fn()} onOpenSettings={vi.fn()} onToggleCollapse={onToggleCollapse} collapsed />);
    expect(screen.getByRole('button', { name: '展开左侧导航' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '目标范围导航' })).toHaveClass('is-collapsed');
  });

  it('opens members when the group label is clicked and toggles them from the row or arrow', () => {
    const onSelect = vi.fn();
    render(<OkrScopeSidebar people={people} currentUserId="manager" selection={{ scope: 'my' }} onSelect={onSelect} onAddTarget={vi.fn()} onOpenSettings={vi.fn()} />);

    const subordinateGroup = screen.getByLabelText('直属下级分组');
    expect(within(subordinateGroup).queryByRole('button', { name: '刘员工' })).not.toBeInTheDocument();
    fireEvent.click(within(subordinateGroup).getByRole('button', { name: '直属下级' }));
    expect(within(subordinateGroup).getByRole('button', { name: '刘员工' })).toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledWith({ scope: 'subordinate' });
    fireEvent.click(within(subordinateGroup).getByRole('button', { name: '直属下级' }));
    expect(within(subordinateGroup).queryByRole('button', { name: '刘员工' })).not.toBeInTheDocument();
    fireEvent.click(within(subordinateGroup).getByRole('button', { name: '直属下级' }));
    expect(within(subordinateGroup).getByRole('button', { name: '刘员工' })).toBeInTheDocument();

    fireEvent.click(within(subordinateGroup).getByRole('button', { name: '收起直属下级成员' }));
    expect(within(subordinateGroup).queryByRole('button', { name: '刘员工' })).not.toBeInTheDocument();
    fireEvent.click(within(subordinateGroup).getByRole('button', { name: '直属下级' }).parentElement as HTMLElement);
    expect(within(subordinateGroup).getByRole('button', { name: '刘员工' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '其他部门' }));
    fireEvent.click(screen.getByRole('button', { name: '管理层' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'otherDepartments', department: '管理层' });
    expect(screen.getByRole('button', { name: '陈总' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '陈总' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'otherDepartments', department: '管理层', personId: 'boss' });
  });

  it('clears the previous role expansion when the current user changes', () => {
    const props = {
      people,
      selection: { scope: 'supervisor' as const },
      onSelect: vi.fn(),
      onAddTarget: vi.fn(),
      onOpenSettings: vi.fn(),
    };
    const view = render(<OkrScopeSidebar {...props} currentUserId="manager" />);
    fireEvent.click(screen.getByRole('button', { name: '直属上级' }));
    expect(screen.getByRole('button', { name: '收起直属上级成员' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '陈总' })).toBeInTheDocument();

    view.rerender(<OkrScopeSidebar {...props} currentUserId="boss" />);

    expect(screen.queryByRole('button', { name: /直属上级成员/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '陈总' })).not.toBeInTheDocument();
  });
});
