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
  it('lists departments without employee entries and selects the department directly', () => {
    const select = vi.fn();
    render(<OkrScopeSidebar people={people} currentUserId="boss" selection={{scope:'my'}} onSelect={select} onAddTarget={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', {name:'其他部门'}));
    fireEvent.click(screen.getByRole('button', {name:'产品部'}));
    expect(select).toHaveBeenLastCalledWith({scope:'otherDepartments',department:'产品部'});
    expect(screen.queryByRole('button', {name:'刘员工'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name:'林主管'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name:'展开产品部'})).not.toBeInTheDocument();
  });
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
    expect(groups.map(group => group.key)).toEqual(['my', 'department', 'company', 'otherDepartments']);
    expect(groups.find(group => group.key === 'department')?.members).toEqual([]);
    expect(groups.find(group => group.key === 'company')?.members).toEqual([]);
    expect(groups.some(group => group.key === 'confirmation')).toBe(false);
  });

  it('selects department and company targets directly', () => {
    const onSelect = vi.fn();
    render(<OkrScopeSidebar people={people} currentUserId="manager" selection={{ scope: 'my' }} onSelect={onSelect} onAddTarget={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '部门目标' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'department' });
    fireEvent.click(screen.getByRole('button', { name: '公司目标' }));
    expect(onSelect).toHaveBeenCalledWith({ scope: 'company' });
    expect(screen.queryByRole('button', { name: '我部门的' })).not.toBeInTheDocument();
    expect(screen.queryByText('直属上级')).not.toBeInTheDocument();
    expect(screen.queryByText('直属下级')).not.toBeInTheDocument();
  });
  it('offers department creation without personal creation', async () => {
    const add=vi.fn();
    render(<OkrScopeSidebar people={people} currentUserId="manager" selection={{scope:'my'}} onSelect={vi.fn()} onAddTarget={add}/>);
    fireEvent.click(screen.getByRole('button',{name:'添加部门目标'}));
    expect(add).toHaveBeenCalledWith('department');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem',{name:'我的目标'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'个人目标'})).not.toBeInTheDocument();
  });
  it('hides confirmation for individual employees but keeps my department', () => {
    const groups = buildOkrScopeGroups(people, 'staff');
    expect(groups.map(group => group.label)).toEqual(['我的目标', '部门目标', '公司目标', '其他部门']);
    for (const person of people) expect(buildOkrScopeGroups(people, person.id).some(group => group.key === 'myDepartment')).toBe(false);
  });
});
