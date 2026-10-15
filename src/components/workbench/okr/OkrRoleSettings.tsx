import { useState } from 'react';
import { Alert, Avatar, Button, Empty, Input, Select, Space, Table, Tag } from 'antd';
import { MemberSelectionModal } from '../../common/MemberSelectionModal';
import { SearchOutlined, UserAddOutlined } from '@ant-design/icons';
import { PersonIcon } from '@primer/octicons-react';
import type { OkrPerson, OkrSettings } from '../../../services/okrRepository';

export function OkrRoleSettings({ draft, people, disabled, onChange }: { draft: OkrSettings; people: OkrPerson[]; disabled: boolean; onChange: (settings: OkrSettings) => void | Promise<boolean> }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>();
  const supervisors = draft.supervisorIds ?? people.filter(person => person.jobTitle?.includes('主管') || people.some(child => child.supervisorId === person.id && child.id !== person.id)).filter(person => !person.rootFlag).map(person => person.id);
  const administrators = draft.administratorIds || [];
  const rows = people.filter(person => (administrators.includes(person.id) || supervisors.includes(person.id))
    && (!keyword.trim() || person.name.toLowerCase().includes(keyword.trim().toLowerCase()))
    && (!roleFilter || (roleFilter === 'administrator' ? administrators : supervisors).includes(person.id)));
  return <section className="space-y-4" aria-label="角色设置">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Space wrap>
        <Input aria-label="搜索角色成员" placeholder="搜索人员姓名" allowClear prefix={<SearchOutlined/>} value={keyword} onChange={event => setKeyword(event.target.value)}/>
        <Select aria-label="筛选成员角色" className="min-w-40" placeholder="全部角色" allowClear value={roleFilter} onChange={setRoleFilter} options={[{ value: 'administrator', label: '管理员' }, { value: 'supervisor', label: '主管' }]}/>
      </Space>
      <Button aria-label="添加成员" type="primary" icon={<UserAddOutlined/>} disabled={disabled} onClick={() => setAdding(true)}>添加成员</Button>
    </div>
    <MemberSelectionModal isOpen={adding} onClose={() => setAdding(false)} subtitle="目标总结角色设置" employees={people} disabled={disabled}
      roles={[{ value: 'administrator', label: '管理员' }, { value: 'supervisor', label: '主管' }]}
      existingUserIds={role => role === 'administrator' ? administrators : role === 'supervisor' ? supervisors : []}
      onSave={async (role, ids) => onChange({ ...draft, administratorIds: role === 'administrator' ? [...new Set([...administrators, ...ids])] : administrators, supervisorIds: role === 'supervisor' ? [...new Set([...supervisors, ...ids])] : supervisors })}/>
    {error && <Alert type="error" showIcon title={error}/>}
    <Table rowKey="id" dataSource={rows} locale={{ emptyText: <Empty description="暂无角色成员"/> }} columns={[
      { title: '员工', render: (_, person) => <Space><Avatar icon={<PersonIcon/>}/>{person.name}</Space> },
      { title: '部门', dataIndex: 'department' },
      { title: '角色', render: (_, person) => <Space>{administrators.includes(person.id) && <Tag>管理员</Tag>}{supervisors.includes(person.id) && <Tag>主管</Tag>}</Space> },
      { title: '操作', render: (_, person) => <Button type="link" danger disabled={disabled || administrators.includes(person.id) && administrators.length <= 1} onClick={async () => { setError(''); try { if (await onChange({ ...draft, administratorIds: administrators.filter(id => id !== person.id), supervisorIds: supervisors.filter(id => id !== person.id) }) === false) setError('保存失败，请重试，原成员已保留'); } catch { setError('保存失败，请重试，原成员已保留'); } }}>移除</Button> },
    ]}/>
    <p className="text-xs text-[var(--text-muted)]">至少保留一名管理员；移除仅取消目标总结角色，不删除团队员工和已有目标、复盘。</p>
  </section>;
}
