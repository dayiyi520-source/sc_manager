// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OkrPerson, OkrSettings } from '../../../services/okrRepository';
import { buildOkrScopeGroups, OkrScopeSidebar } from './OkrScopeSidebar';

const people: OkrPerson[] = [
  { id: 'boss', name: '陈总', department: '管理层', supervisorId: null, rootFlag: 1, version: 1 },
  { id: 'manager', name: '林主管', jobTitle: '产品主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 },
  { id: 'staff', name: '刘员工', department: '产品部', supervisorId: 'manager', rootFlag: 0, version: 1 },
];

describe('OkrScopeSidebar', () => {
  it('only offers company creation for administrators', () => {
    const add=vi.fn();
    render(<OkrScopeSidebar people={people} currentUserId="boss" selection={{scope:'my'}} onSelect={vi.fn()} onAddTarget={add}/>);
    expect(screen.queryByRole('button',{name:'添加我的目标'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'添加目标'}));
    expect(add).toHaveBeenLastCalledWith('company');
  });
  it('restores fixed administrator company permissions despite empty stored grants', () => {
    const add=vi.fn();
    const settings={administratorIds:['boss'],permissionGrants:{boss:[]}} as unknown as OkrSettings;
    render(<OkrScopeSidebar settings={settings} people={people} currentUserId="boss" selection={{scope:'my'}} onSelect={vi.fn()} onAddTarget={add}/>);
    fireEvent.click(screen.getByRole('button',{name:'添加目标'}));
    expect(add).toHaveBeenCalledWith('company');
  });
  it('provides direct department and company target scopes without member entries', () => {
    const groups = buildOkrScopeGroups(people, 'manager');
    expect(groups.map(group => group.key)).toEqual(['my', 'department', 'company', 'myDepartment', 'otherDepartments', 'confirmation']);
    expect(groups.find(group => group.key === 'department')?.members).toEqual([]);
    expect(groups.find(group => group.key === 'company')?.members).toEqual([]);
    expect(groups.find(group => group.key === 'myDepartment')?.members.map(person => person.id)).toEqual(['staff']);
  });

  it('selects department and company targets directly', () => {
    const onSelect = vi.fn();
    render(<OkrScopeSidebar people={people} currentUserId="manager" selection={{ scope: 'my' }} onSelect={onSelect} onAddTarget={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '部门目标' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'department' });
    fireEvent.click(screen.getByRole('button', { name: '公司目标' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'company' });
    fireEvent.click(screen.getByRole('button', { name: '我部门的' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'myDepartment' });
    expect(screen.queryByText('直属上级')).not.toBeInTheDocument();
    expect(screen.queryByText('直属下级')).not.toBeInTheDocument();
  });
  it('offers manager department and own-personal creation without a new navigation group', async () => {
    const add=vi.fn();
    render(<OkrScopeSidebar people={people} currentUserId="manager" selection={{scope:'my'}} onSelect={vi.fn()} onAddTarget={add}/>);
    fireEvent.click(screen.getByRole('button',{name:'添加目标选项'}));
    fireEvent.click(await screen.findByRole('menuitem',{name:'部门目标'}));
    expect(add).toHaveBeenCalledWith('department');
    fireEvent.click(screen.getByRole('button',{name:'添加目标选项'}));
    fireEvent.click(await screen.findByRole('menuitem',{name:'我的目标'}));
    expect(add).toHaveBeenCalledWith('personal');
    expect(screen.queryByRole('button',{name:'个人目标'})).not.toBeInTheDocument();
  });
  it('hides confirmation for individual employees but keeps my department', () => {
    const groups = buildOkrScopeGroups(people, 'staff');
    expect(groups.map(group => group.label)).toEqual(['我的目标', '部门目标', '公司目标', '我部门的', '其他部门']);
    expect(groups.find(group => group.key === 'myDepartment')?.members.map(person => person.id)).toEqual(['manager']);
  });
});
