// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OkrPerson } from '../../../services/okrRepository';
import { buildOkrScopeGroups, OkrScopeSidebar } from './OkrScopeSidebar';

const people: OkrPerson[] = [
  { id: 'boss', name: '陈总', department: '管理层', supervisorId: null, rootFlag: 1, version: 1 },
  { id: 'manager', name: '林主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
  { id: 'staff', name: '刘员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 },
];

describe('OkrScopeSidebar', () => {
  it('provides direct department and company target scopes without member entries', () => {
    const groups = buildOkrScopeGroups(people, 'manager');
    expect(groups.map(group => group.key)).toEqual(['my', 'department', 'company', 'otherDepartments']);
    expect(groups.find(group => group.key === 'department')?.members).toEqual([]);
    expect(groups.find(group => group.key === 'company')?.members).toEqual([]);
  });

  it('selects department and company targets directly', () => {
    const onSelect = vi.fn();
    render(<OkrScopeSidebar people={people} currentUserId="manager" selection={{ scope: 'my' }} onSelect={onSelect} onAddTarget={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '部门目标' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'department' });
    fireEvent.click(screen.getByRole('button', { name: '公司目标' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'company' });
    expect(screen.queryByText('直属上级')).not.toBeInTheDocument();
    expect(screen.queryByText('直属下级')).not.toBeInTheDocument();
  });
});
