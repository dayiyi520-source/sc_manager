import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Avatar, Button, Input, Tooltip } from 'antd';
import {
  Building,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  User,
  Users,
} from '@/components/common/octicons-compat';
import type { OkrPerson } from '../../../services/okrRepository';

export type OkrScopeKey = 'my' | 'supervisor' | 'subordinate' | 'department' | 'otherDepartments';

export type OkrScopeSelection = {
  scope: OkrScopeKey;
  personId?: string;
  department?: string;
};

export type OkrScopeGroup = {
  key: OkrScopeKey;
  label: string;
  members: OkrPerson[];
  departmentGroups?: Array<{ department: string; members: OkrPerson[] }>;
  icon: ReactNode;
};

const groupMeta: Array<Pick<OkrScopeGroup, 'key' | 'label' | 'icon'>> = [
  { key: 'my', label: '我的目标', icon: <Target /> },
  { key: 'supervisor', label: '直属上级', icon: <User /> },
  { key: 'subordinate', label: '直属下级', icon: <Users /> },
  { key: 'department', label: '我部门的', icon: <Building /> },
  { key: 'otherDepartments', label: '其他部门', icon: <Building /> },
];

export function buildOkrScopeGroups(people: OkrPerson[], currentUserId: string): OkrScopeGroup[] {
  const current = people.find(person => person.id === currentUserId);
  const otherDepartmentPeople = current ? people.filter(person => person.id !== currentUserId && person.department !== current.department) : [];
  const departmentGroups = Array.from(new Set(otherDepartmentPeople.map(person => person.department))).sort().map(department => ({
    department,
    members: otherDepartmentPeople.filter(person => person.department === department),
  }));
  const membersByScope: Record<OkrScopeKey, OkrPerson[]> = {
    my: [],
    supervisor: current?.supervisorId ? people.filter(person => person.id === current.supervisorId) : [],
    subordinate: people.filter(person => person.supervisorId === currentUserId),
    department: current ? people.filter(person => person.id !== currentUserId && person.department === current.department) : [],
    otherDepartments: otherDepartmentPeople,
  };
  return groupMeta.map(group => ({ ...group, members: membersByScope[group.key], ...(group.key === 'otherDepartments' ? { departmentGroups } : {}) }));
}

type Props = {
  people: OkrPerson[];
  currentUserId: string;
  selection: OkrScopeSelection;
  defaultExpandMembers?: boolean;
  onSelect: (selection: OkrScopeSelection) => void;
  onAddTarget: () => void;
  onOpenSettings: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function OkrScopeSidebar({ people, currentUserId, selection, defaultExpandMembers = false, onSelect, onAddTarget, onOpenSettings, collapsed = false, onToggleCollapse }: Props) {
  const groups = useMemo(() => buildOkrScopeGroups(people, currentUserId), [people, currentUserId]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(defaultExpandMembers ? groups.filter(group => group.members.length).map(group => group.key) : []));
  const normalizedQuery = query.trim().toLowerCase();

  return <aside className={`okr-scope-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="目标范围导航">
    <div className="okr-scope-search">
      <Input value={query} onChange={event => setQuery(event.target.value)} prefix={<Search />} allowClear placeholder="搜索人名" aria-label="搜索人名" />
      <Tooltip title="添加目标"><Button type="primary" icon={<Plus />} aria-label="添加目标" onClick={onAddTarget} /></Tooltip>
    </div>
    <nav className="okr-scope-groups">
      {groups.map(group => {
        const filteredMembers = normalizedQuery ? group.members.filter(person => person.name.toLowerCase().includes(normalizedQuery)) : group.members;
        const isExpanded = normalizedQuery ? filteredMembers.length > 0 : expanded.has(group.key);
        const isSelected = selection.scope === group.key && !selection.personId && !selection.department;
        return <section key={group.key} className="okr-scope-group" aria-label={`${group.label}分组`}>
          <div className={`okr-scope-group-row${isSelected ? ' is-selected' : ''}`} onClick={event => { if ((event.target as HTMLElement).closest('button')) return; if (group.members.length > 0) setExpanded(current => {
            const next = new Set(current);
            next.has(group.key) ? next.delete(group.key) : next.add(group.key);
            return next;
          }); }}>
            <button type="button" className="okr-scope-main" aria-label={group.label} aria-pressed={isSelected} onClick={event => { event.stopPropagation(); onSelect({ scope: group.key }); if (group.members.length > 0) setExpanded(current => { const next = new Set(current); next.has(group.key) ? next.delete(group.key) : next.add(group.key); return next; }); }}>
              {group.icon}<span>{group.label}</span>
            </button>
            {group.members.length > 0 && <button
              type="button"
              className="okr-scope-expand"
              aria-label={`${isExpanded ? '收起' : '展开'}${group.label}成员`}
              aria-expanded={isExpanded}
              onClick={event => { event.stopPropagation(); setExpanded(current => {
                const next = new Set(current);
                next.has(group.key) ? next.delete(group.key) : next.add(group.key);
                return next;
              }); }}
            >{isExpanded ? <ChevronDown /> : <ChevronRight />}</button>}
          </div>
          {isExpanded && group.key === 'otherDepartments' && <div className="okr-scope-departments">
            {(group.departmentGroups || []).map(({ department, members }) => {
              const matches = normalizedQuery ? members.filter(person => person.name.toLowerCase().includes(normalizedQuery)) : members;
              const departmentKey = `${group.key}:${department}`;
              const departmentExpanded = normalizedQuery ? matches.length > 0 : expanded.has(departmentKey);
              const departmentSelected = selection.scope === group.key && selection.department === department && !selection.personId;
              return <section key={department} className="okr-scope-department">
                <div className={`okr-scope-group-row${departmentSelected ? ' is-selected' : ''}`} onClick={() => setExpanded(current => { const next = new Set(current); departmentExpanded ? next.delete(departmentKey) : next.add(departmentKey); return next; })}>
                  <button type="button" className="okr-scope-main" aria-label={department} aria-pressed={departmentSelected} onClick={event => { event.stopPropagation(); onSelect({ scope: group.key, department }); setExpanded(current => { const next = new Set(current); departmentExpanded ? next.delete(departmentKey) : next.add(departmentKey); return next; }); }}><Building/><span>{department}</span></button>
                {members.length > 0 && <button type="button" className="okr-scope-expand" aria-label={`${departmentExpanded ? '收起' : '展开'}${department}`} aria-expanded={departmentExpanded} onClick={event => { event.stopPropagation(); setExpanded(current => { const next = new Set(current); departmentExpanded ? next.delete(departmentKey) : next.add(departmentKey); return next; }); }}>{departmentExpanded ? <ChevronDown/> : <ChevronRight/>}</button>}
                </div>
                {departmentExpanded && <div className="okr-scope-members">{matches.map(person => {
                  const selected = selection.scope === group.key && selection.personId === person.id;
                  return <button key={person.id} type="button" className={selected ? 'is-selected' : ''} aria-label={person.name} aria-pressed={selected} onClick={() => onSelect({ scope: group.key, department, personId: person.id })}><Avatar size={24}>{person.name.slice(0, 1)}</Avatar><span title={`${person.name} · ${person.department}`}>{person.name}</span></button>;
                })}</div>}
              </section>;
            })}
            {normalizedQuery && filteredMembers.length === 0 && <p>未找到匹配人员</p>}
          </div>}
          {isExpanded && group.key !== 'otherDepartments' && <div className="okr-scope-members">
            {filteredMembers.length > 0 ? filteredMembers.map(person => {
              const selected = selection.scope === group.key && selection.personId === person.id;
              return <button key={person.id} type="button" className={selected ? 'is-selected' : ''} aria-label={person.name} aria-pressed={selected} onClick={() => onSelect({ scope: group.key, personId: person.id })}>
                <Avatar size={24}>{person.name.slice(0, 1)}</Avatar><span title={`${person.name} · ${person.department}`}>{person.name}</span>
              </button>;
            }) : <p>未找到匹配人员</p>}
          </div>}
        </section>;
      })}
    </nav>
    <div className="okr-scope-settings">
      <Button type="text" block icon={<Settings />} aria-label="目标设置" onClick={onOpenSettings}>设置</Button>
      {onToggleCollapse && <Tooltip title={collapsed ? '展开左侧导航' : '收起左侧导航'}><Button type="text" icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />} aria-label={collapsed ? '展开左侧导航' : '收起左侧导航'} onClick={onToggleCollapse} /></Tooltip>}
    </div>
  </aside>;
}
