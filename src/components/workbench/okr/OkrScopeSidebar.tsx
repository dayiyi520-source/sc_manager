import { otherDepartmentPeople as getOtherDepartmentPeople, departmentName } from './departmentScope';
import { confirmationMembers, confirmationRequests } from './goalConfirmation';
import { hasOkrPermission } from '../../../services/okrSettingsPolicy';
import { goalLevel } from '../../../services/okrGoalRules';
import { ChecklistIcon } from '@primer/octicons-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Button, Dropdown, Input, Tooltip } from 'antd';
import {
  Building,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  User,
} from '@/components/common/octicons-compat';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';

export type OkrScopeKey = 'my' | 'department' | 'company' | 'myDepartment' | 'otherDepartments' | 'confirmation';

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
  { key: 'department', label: '部门目标', icon: <Building /> },
  { key: 'company', label: '公司目标', icon: <Building /> },
  { key: 'otherDepartments', label: '其他部门', icon: <Building /> },
];

export function buildOkrScopeGroups(people: OkrPerson[], currentUserId: string, records: OkrRecord[] = [], settings?: import('../../../services/okrRepository').OkrSettings): OkrScopeGroup[] {
  const current = people.find(person => person.id === currentUserId);
  const otherDepartmentPeople = getOtherDepartmentPeople(people, currentUserId);
  const departmentGroups = Array.from(new Set(otherDepartmentPeople.map(person => departmentName(person.department)))).sort().map(department => ({
    department,
    members: otherDepartmentPeople.filter(person => departmentName(person.department) === department),
  }));
  const membersByScope: Record<OkrScopeKey, OkrPerson[]> = {
    my: [],
    department: [],
    company: [],
    myDepartment: people.filter(person => person.id !== currentUserId && departmentName(person.department) === departmentName(current?.department)),
    otherDepartments: otherDepartmentPeople,
    confirmation: confirmationMembers(people, currentUserId, records, settings),
  };
  const meta = [...groupMeta, ...((goalLevel(current) !== '部门级' && (goalLevel(current) !== '个人级' || (settings?.administratorIds || []).includes(currentUserId) || (settings?.subAdministratorIds || []).includes(currentUserId) || confirmationRequests(records, people, currentUserId, settings).length > 0)) ? [{ key: 'confirmation' as const, label: '目标确认', icon: <ChecklistIcon/> }] : [])];
  return meta.map(group => ({ ...group, members: membersByScope[group.key], ...(group.key === 'otherDepartments' ? { departmentGroups } : {}) }));
}

type Props = {
  people: OkrPerson[];
  records?: OkrRecord[];
  settings?: import('../../../services/okrRepository').OkrSettings;
  currentUserId: string;
  selection: OkrScopeSelection;
  defaultExpandMembers?: boolean;
  onSelect: (selection: OkrScopeSelection) => void;
  onAddTarget: (level?: 'personal' | 'department' | 'company') => void;
  addTargetDisabled?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function OkrScopeSidebar({ people, records = [], settings, currentUserId, selection, defaultExpandMembers = false, onSelect, onAddTarget, addTargetDisabled = false, collapsed = false, onToggleCollapse }: Props) {
  const groups = useMemo(() => buildOkrScopeGroups(people, currentUserId, records, settings), [people, currentUserId, records, settings]);
  const requests = confirmationRequests(records, people, currentUserId, settings);
  const pendingOwnerIds = new Set(requests.map(record => record.ownerId));
  const currentUser = people.find(person => person.id === currentUserId);
  const companyEditor = !!currentUser && hasOkrPermission(currentUser.id,'companyGoalEdit',settings,people);
  const primaryActionLabel = !currentUser ? '组织信息加载中' : currentUser.rootFlag === 1 ? '添加目标' : '拆解目标';
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(defaultExpandMembers ? groups.filter(group => group.members.length).map(group => group.key) : []));
  const groupMembershipKey = groups.map(group => `${group.key}:${group.members.map(member => member.id).sort().join(',')}`).join('|');
  useEffect(() => {
    setExpanded(new Set(defaultExpandMembers ? groups.filter(group => group.members.length).map(group => group.key) : []));
  }, [currentUserId, defaultExpandMembers, groupMembershipKey]);
  const normalizedQuery = query.trim().toLowerCase();

  return <aside className={`okr-scope-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="目标范围导航">
    <div className="okr-scope-search">
      <Input value={query} onChange={event => setQuery(event.target.value)} prefix={<Search />} allowClear placeholder="搜索人名" aria-label="搜索人名" />
      {(goalLevel(currentUser) === '部门级' || companyEditor) && (goalLevel(currentUser) === '部门级' ? <Button type="primary" icon={<Plus/>} aria-label="添加部门目标" disabled={addTargetDisabled} onClick={() => onAddTarget('department')}/> : companyEditor && currentUser?.rootFlag !== 1 ? <Dropdown trigger={['click']} disabled={addTargetDisabled} menu={{items:[...(companyEditor ? [{key:'company',label:'公司目标'}] : []),...(goalLevel(currentUser) === '部门级' ? [{key:'department',label:'部门目标'}] : []),],onClick:({key})=>onAddTarget(key as 'personal'|'department'|'company')}}><Button type="primary" icon={<Plus/>} aria-label="添加目标选项" disabled={addTargetDisabled}/></Dropdown> : <Tooltip title={primaryActionLabel}><Button type="primary" icon={<Plus />} aria-label={primaryActionLabel} disabled={addTargetDisabled || !currentUser} onClick={()=>onAddTarget('company')} /></Tooltip>)}
    </div>
    <nav className="okr-scope-groups">
      {groups.map(group => {
        const filteredMembers = normalizedQuery ? group.members.filter(person => person.name.toLowerCase().includes(normalizedQuery) || group.key === 'otherDepartments' && departmentName(person.department).toLowerCase().includes(normalizedQuery)) : group.members;
        const isExpanded = normalizedQuery ? filteredMembers.length > 0 : expanded.has(group.key);
        const isSelected = selection.scope === group.key && !selection.personId && !selection.department;
        return <section key={group.key} className="okr-scope-group" aria-label={`${group.label}分组`}>
          <div className={`okr-scope-group-row${isSelected ? ' is-selected' : ''}`} onClick={event => { if ((event.target as HTMLElement).closest('button')) return; if (group.members.length > 0) setExpanded(current => {
            const next = new Set(current);
            next.has(group.key) ? next.delete(group.key) : next.add(group.key);
            return next;
          }); }}>
            <button type="button" className="okr-scope-main" aria-label={group.label} aria-pressed={isSelected} onClick={event => { event.stopPropagation(); onSelect({ scope: group.key }); if (group.members.length > 0) setExpanded(current => { const next = new Set(current); next.has(group.key) ? next.delete(group.key) : next.add(group.key); return next; }); }}>
              {group.icon}<span>{group.label}</span>{group.key === 'confirmation' && requests.length > 0 && <Badge className="okr-confirmation-badge" count={requests.length} overflowCount={999} aria-label={`待确认目标 ${requests.length} 项`}/>}
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
            {(group.departmentGroups || []).filter(({ department, members }) => !normalizedQuery || department.toLowerCase().includes(normalizedQuery) || members.some(person => person.name.toLowerCase().includes(normalizedQuery))).map(({ department }) => <section key={department} className="okr-scope-department">
              <button type="button" className="okr-scope-main" aria-label={department} aria-pressed={selection.scope === group.key && selection.department === department} onClick={() => onSelect({ scope: group.key, department })}><Building/><span>{department}</span></button>
            </section>)}
            {normalizedQuery && filteredMembers.length === 0 && <p>未找到匹配人员</p>}
          </div>}
          {isExpanded && group.key !== 'otherDepartments' && <div className="okr-scope-members">
            {filteredMembers.length > 0 ? [...filteredMembers].sort((left, right) => Number(pendingOwnerIds.has(right.id)) - Number(pendingOwnerIds.has(left.id))).map(person => {
              const selected = selection.scope === group.key && selection.personId === person.id;
              return <button key={person.id} type="button" className={selected ? 'is-selected' : ''} aria-label={person.name} aria-pressed={selected} onClick={() => onSelect({ scope: group.key, personId: person.id })}>
                <span className="okr-scope-member-icon" aria-hidden="true"><User /></span><span title={`${person.name} · ${person.department}`}>{person.name}{group.key === 'confirmation' && requests.some(record => record.ownerId === person.id) ? `（${requests.filter(record => record.ownerId === person.id).length}）` : ''}</span></button>;
            }) : <p>未找到匹配人员</p>}
          </div>}
        </section>;
      })}
    </nav>
    <div className="okr-scope-settings">
      {onToggleCollapse && <Tooltip title={collapsed ? '展开左侧导航' : '收起左侧导航'}><Button type="text" icon={collapsed ? <PanelLeftOpen /> : <PanelLeftClose />} aria-label={collapsed ? '展开左侧导航' : '收起左侧导航'} onClick={onToggleCollapse} /></Tooltip>}
    </div>
  </aside>;
}
