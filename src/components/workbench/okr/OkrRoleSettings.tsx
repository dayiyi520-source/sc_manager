import { useState } from 'react';
import { Alert, Avatar, Button, Checkbox, Empty, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { MemberSelectionModal } from '../../common/MemberSelectionModal';
import { SearchOutlined, UserAddOutlined } from '@ant-design/icons';
import { GearIcon, PersonIcon } from '@primer/octicons-react';
import { OKR_PERMISSIONS } from '../../../services/okrSettingsPolicy';
import type { OkrPerson, OkrSettings, OkrPermission } from '../../../services/okrRepository';

export function OkrRoleSettings({ draft, people, disabled, onChange }: { draft: OkrSettings; people: OkrPerson[]; disabled: boolean; onChange: (settings: OkrSettings) => void | Promise<boolean> }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>();
  const [permissionMember, setPermissionMember] = useState<OkrPerson>();
  const [selectedPermissions, setSelectedPermissions] = useState<OkrPermission[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const permissionLabels: Record<OkrPermission, string> = { okrTemplates:'OKR模板',reviewTemplates:'复盘总结模板',roleSettings:'角色设置',weeklyCycles:'周期配置',confirmationSettings:'目标确认配置',companyGoalEdit:'公司目标编辑' };
  const supervisors = draft.supervisorIds ?? people.filter(person => person.jobTitle?.includes('主管') || people.some(child => child.supervisorId === person.id && child.id !== person.id)).filter(person => !person.rootFlag).map(person => person.id);
  const administrators = draft.administratorIds || [];
  const subAdministrators = draft.subAdministratorIds || [];
  const rows = people.filter(person => (administrators.includes(person.id) || subAdministrators.includes(person.id) || supervisors.includes(person.id) || Boolean(draft.permissionGrants?.[person.id]?.length))
    && (!keyword.trim() || person.name.toLowerCase().includes(keyword.trim().toLowerCase()))
    && (!roleFilter || (roleFilter === 'administrator' ? administrators : roleFilter === 'subAdministrator' ? subAdministrators : supervisors).includes(person.id)));
  return <section className="space-y-4" aria-label="角色设置">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Space wrap>
        <Input aria-label="搜索角色成员" placeholder="搜索人员姓名" allowClear prefix={<SearchOutlined/>} value={keyword} onChange={event => setKeyword(event.target.value)}/>
        <Select aria-label="筛选成员角色" className="min-w-40" placeholder="全部角色" allowClear value={roleFilter} onChange={setRoleFilter} options={[{ value: 'administrator', label: '管理员' }, { value: 'subAdministrator', label: '子管理员' }, { value: 'supervisor', label: '主管' }]}/>
      </Space>
      <Button aria-label="添加成员" type="primary" icon={<UserAddOutlined/>} disabled={disabled} onClick={() => setAdding(true)}>添加成员</Button>
    </div>
    <MemberSelectionModal isOpen={adding} onClose={() => setAdding(false)} subtitle="目标总结角色设置" employees={people} disabled={disabled}
      roles={[{ value: 'administrator', label: '管理员' }, { value: 'subAdministrator', label: '子管理员' }, { value: 'supervisor', label: '主管' }]}
      existingUserIds={role => role === 'administrator' ? administrators : role === 'subAdministrator' ? subAdministrators : role === 'supervisor' ? supervisors : []}
      onSave={async (role, ids) => onChange({ ...draft, administratorIds: role === 'administrator' ? [...new Set([...administrators, ...ids])] : administrators.filter(id => role !== 'subAdministrator' || !ids.includes(id)), subAdministratorIds: role === 'subAdministrator' ? [...new Set([...subAdministrators, ...ids])] : subAdministrators.filter(id => role !== 'administrator' || !ids.includes(id)), supervisorIds: role === 'supervisor' ? [...new Set([...supervisors, ...ids])] : supervisors, permissionGrants: { ...draft.permissionGrants, ...Object.fromEntries(ids.filter(id => role !== 'supervisor').map(id => [id, [...OKR_PERMISSIONS]])) } })}/>
    {error && <Alert type="error" showIcon title={error}/>}
    <Table rowKey="id" dataSource={rows} locale={{ emptyText: <Empty description="暂无角色成员"/> }} columns={[
      { title: '员工', render: (_, person) => <Space><Avatar icon={<PersonIcon/>}/>{person.name}</Space> },
      { title: '部门', dataIndex: 'department' },
      { title: '角色', render: (_, person) => <Space>{administrators.includes(person.id) && <Tag>管理员</Tag>}{subAdministrators.includes(person.id) && <Tag>子管理员</Tag>}{!administrators.includes(person.id) && !subAdministrators.includes(person.id) && draft.permissionGrants?.[person.id]?.includes('companyGoalEdit') && <Tag>公司目标编辑</Tag>}{supervisors.includes(person.id) && <Tag>主管</Tag>}</Space> },
      { title: '操作', render: (_, person) => <Space><Button type="text" icon={<GearIcon/>} title="权限管理" aria-label={`${person.name}权限管理`} disabled={disabled || !administrators.includes(person.id) && !subAdministrators.includes(person.id) && !draft.permissionGrants?.[person.id]?.length} onClick={() => { setPermissionMember(person); setSelectedPermissions(draft.permissionGrants?.[person.id] || []); setError(''); }}/><Button type="link" danger disabled={disabled || administrators.includes(person.id) && administrators.length <= 1} onClick={async () => { setError(''); try { if (await onChange({ ...draft, administratorIds: administrators.filter(id => id !== person.id), subAdministratorIds: subAdministrators.filter(id => id !== person.id), supervisorIds: supervisors.filter(id => id !== person.id), permissionGrants: Object.fromEntries(Object.entries(draft.permissionGrants || {}).filter(([id]) => id !== person.id)) }) === false) setError('保存失败，请重试，原成员已保留'); } catch { setError('保存失败，请重试，原成员已保留'); } }}>移除</Button></Space> },
    ]}/>
    <Modal title={permissionMember ? permissionMember.name + ' · 权限管理' : '权限管理'} open={!!permissionMember} okText="保存权限" confirmLoading={savingPermissions} okButtonProps={{disabled:disabled || !(administrators.some(id => id !== permissionMember?.id && draft.permissionGrants?.[id]?.includes('roleSettings')) || subAdministrators.some(id => id !== permissionMember?.id && draft.permissionGrants?.[id]?.includes('roleSettings')) || selectedPermissions.includes('roleSettings'))}} onCancel={() => { if (!savingPermissions) setPermissionMember(undefined); }} onOk={async () => { if (!permissionMember) return; setSavingPermissions(true); setError(''); try { const saved = await onChange({...draft,permissionGrants:{...draft.permissionGrants,[permissionMember.id]:selectedPermissions}}); if (saved !== false) setPermissionMember(undefined); else setError('权限保存失败，请重试'); } catch { setError('权限保存失败，请重试'); } finally { setSavingPermissions(false); } }}><Checkbox.Group aria-label="权限项" options={OKR_PERMISSIONS.map(value => ({value,label:permissionLabels[value]}))} value={selectedPermissions} disabled={disabled || savingPermissions} onChange={values => setSelectedPermissions(values as OkrPermission[])}/>{error && <Alert type="error" showIcon title={error}/>}</Modal>
    <p className="text-xs text-[var(--text-muted)]">至少保留一名管理员；移除仅取消目标总结角色，不删除团队员工和已有目标、复盘。</p>
  </section>;
}
