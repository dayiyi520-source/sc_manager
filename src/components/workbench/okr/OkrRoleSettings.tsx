import { useState } from 'react';
import { Avatar, Button, Empty, Select, Space, Table, Tag } from 'antd';
import { PersonIcon } from '@primer/octicons-react';
import type { OkrPerson, OkrSettings } from '../../../services/okrRepository';

export function OkrRoleSettings({ draft, people, disabled, onChange }: { draft: OkrSettings; people: OkrPerson[]; disabled: boolean; onChange: (settings: OkrSettings) => void }) {
  const [employeeId, setEmployeeId] = useState<string>();
  const [role, setRole] = useState<'administrator' | 'supervisor'>('supervisor');
  const supervisors = draft.supervisorIds ?? people.filter(person => person.jobTitle?.includes('主管') || people.some(child => child.supervisorId === person.id && child.id !== person.id)).filter(person => !person.rootFlag).map(person => person.id);
  const administrators = draft.administratorIds || [];
  const rows = people.filter(person => administrators.includes(person.id) || supervisors.includes(person.id));
  return <section className="space-y-4" aria-label="角色设置">
    <Space wrap><Select aria-label="选择角色员工" placeholder="选择员工" showSearch optionFilterProp="label" className="min-w-60" value={employeeId} disabled={disabled} onChange={setEmployeeId} options={people.map(person => ({ value: person.id, label: `${person.name} · ${person.department}` }))}/><Select aria-label="添加角色" value={role} disabled={disabled} onChange={setRole} options={[{ value: 'administrator', label: '管理员' }, { value: 'supervisor', label: '主管' }]}/><Button disabled={disabled || !employeeId} onClick={() => { if (!employeeId) return; onChange({ ...draft, administratorIds: role === 'administrator' ? [...new Set([...administrators, employeeId])] : administrators, supervisorIds: role === 'supervisor' ? [...new Set([...supervisors, employeeId])] : supervisors }); setEmployeeId(undefined); }}>添加角色</Button></Space>
    <Table rowKey="id" dataSource={rows} locale={{ emptyText: <Empty description="暂无角色成员"/> }} columns={[
      { title: '员工', render: (_, person) => <Space><Avatar icon={<PersonIcon/>}/>{person.name}</Space> },
      { title: '部门', dataIndex: 'department' },
      { title: '角色', render: (_, person) => <Space>{administrators.includes(person.id) && <Tag>管理员</Tag>}{supervisors.includes(person.id) && <Tag>主管</Tag>}</Space> },
      { title: '操作', render: (_, person) => <Button type="link" danger disabled={disabled || administrators.includes(person.id) && administrators.length <= 1} onClick={() => onChange({ ...draft, administratorIds: administrators.filter(id => id !== person.id), supervisorIds: supervisors.filter(id => id !== person.id) })}>移除</Button> },
    ]}/>
    <p className="text-xs text-[var(--text-muted)]">至少保留一名管理员；移除仅取消目标总结角色，不删除团队员工和已有目标、复盘。</p>
  </section>;
}
