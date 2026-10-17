import { useState } from 'react';
import { Alert, Avatar, Button, Checkbox, Empty, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { MemberSelectionModal } from '../../common/MemberSelectionModal';
import { SearchIcon, PlusIcon, PencilIcon, PersonIcon } from '@primer/octicons-react';
import { normalizedPolicy, OKR_PERMISSIONS, replaceOkrAdministrator } from '../../../services/okrSettingsPolicy';
import type { OkrPerson, OkrSettings, OkrPermission } from '../../../services/okrRepository';

const permissionLabels: Record<OkrPermission, string> = { okrTemplates:'OKR模板',reviewTemplates:'复盘总结模板',roleSettings:'角色设置',weeklyCycles:'周期配置',confirmationSettings:'目标确认配置',companyGoalEdit:'公司目标编辑' };

export function OkrRoleSettings({ draft, people, disabled, onChange }: { draft: OkrSettings; people: OkrPerson[]; disabled: boolean; onChange: (settings: OkrSettings) => void | Promise<boolean> }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>();
  const [permissionMember, setPermissionMember] = useState<OkrPerson>();
  const [selectedPermissions, setSelectedPermissions] = useState<OkrPermission[]>([]);
  const [replacement, setReplacement] = useState<OkrPerson>();
  const [replacementId, setReplacementId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const policy = normalizedPolicy(draft, people);
  const supervisors = policy.supervisorIds ?? people.filter(person => person.jobTitle?.includes('主管') || people.some(child => child.supervisorId === person.id && child.id !== person.id)).filter(person => !person.rootFlag).map(person => person.id);
  const administrators = policy.administratorIds || [];
  const subAdministrators = policy.subAdministratorIds || [];
  const rows = people.filter(person => (administrators.includes(person.id) || subAdministrators.includes(person.id) || supervisors.includes(person.id) || Boolean(policy.permissionGrants?.[person.id]?.length))
    && (!keyword.trim() || person.name.toLowerCase().includes(keyword.trim().toLowerCase()))
    && (!roleFilter || (roleFilter === 'administrator' ? administrators : roleFilter === 'subAdministrator' ? subAdministrators : supervisors).includes(person.id)));
  const saveModal = async (next: OkrSettings, close: () => void) => {
    if (disabled || saving) return;
    setSaving(true); setModalError('');
    try { if (await onChange(next) === false) setModalError('保存失败，请重试，当前选择已保留'); else close(); }
    catch (cause) { setModalError(cause instanceof Error ? cause.message : '保存失败，请重试，当前选择已保留'); }
    finally { setSaving(false); }
  };
  return <section className="space-y-4" aria-label="角色设置">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Space wrap>
        <Input aria-label="搜索角色成员" placeholder="搜索人员姓名" allowClear prefix={<SearchIcon/>} value={keyword} onChange={event => setKeyword(event.target.value)}/>
        <Select aria-label="筛选成员角色" className="min-w-40" placeholder="全部角色" allowClear value={roleFilter} onChange={setRoleFilter} options={[{ value: 'administrator', label: '管理员' }, { value: 'subAdministrator', label: '子管理员' }, { value: 'supervisor', label: '主管' }]}/>
      </Space>
      <Button aria-label="添加成员" type="primary" icon={<PlusIcon/>} disabled={disabled || saving} onClick={() => setAdding(true)}>添加成员</Button>
    </div>
    <MemberSelectionModal isOpen={adding} onClose={() => setAdding(false)} subtitle="目标总结角色设置" employees={people} disabled={disabled || saving}
      roles={[{ value: 'subAdministrator', label: '子管理员' }, { value: 'supervisor', label: '主管' }]}
      existingUserIds={role => role === 'subAdministrator' ? [...administrators, ...subAdministrators] : supervisors}
      onSave={async (role, ids) => {
        if (!['subAdministrator', 'supervisor'].includes(role) || role === 'subAdministrator' && ids.some(id => administrators.includes(id))) return false;
        return onChange({ ...policy, subAdministratorIds: role === 'subAdministrator' ? [...new Set([...subAdministrators, ...ids])] : subAdministrators, supervisorIds: role === 'supervisor' ? [...new Set([...supervisors, ...ids])] : supervisors,
          permissionGrants: role === 'subAdministrator' ? { ...policy.permissionGrants, ...Object.fromEntries(ids.filter(id => !subAdministrators.includes(id)).map(id => [id, []])) } : policy.permissionGrants });
      }}/>
    {error && <Alert type="error" showIcon title={error}/>}
    <Table tableLayout="fixed" rowKey="id" dataSource={rows} locale={{ emptyText: <Empty description="暂无角色成员"/> }} columns={[
      { title: '员工', width: '16%', render: (_, person) => <Space><Avatar icon={<PersonIcon/>}/>{person.name}</Space> },
      { title: '部门', width: '16%', ellipsis: true, dataIndex: 'department' },
      { title: '角色', width: '14%', render: (_, person) => <Space wrap>{administrators.includes(person.id) && <Tag>管理员</Tag>}{subAdministrators.includes(person.id) && <Tag>子管理员</Tag>}{supervisors.includes(person.id) && <Tag>主管</Tag>}</Space> },
      { title: '功能权限', width: '40%', render: (_, person) => {
        const grants = administrators.includes(person.id) ? OKR_PERMISSIONS : subAdministrators.includes(person.id) ? policy.permissionGrants?.[person.id] || [] : [];
        return <Space wrap>{grants.map(permission => <Tag key={permission}>{permissionLabels[permission]}</Tag>)}{supervisors.includes(person.id) && <Tag>部门目标编辑</Tag>}{!grants.length && !supervisors.includes(person.id) && <span className="text-[var(--text-muted)]">暂无</span>}</Space>;
      } },
      { title: '操作', width: '14%', render: (_, person) => administrators.includes(person.id)
        ? <Button type="link" disabled={disabled || saving} onClick={() => { setReplacement(person); setReplacementId(undefined); setModalError(''); }}>更换</Button>
        : <Space>{subAdministrators.includes(person.id) && <Button type="text" icon={<PencilIcon/>} title="编辑权限" aria-label={`${person.name}编辑权限`} disabled={disabled || saving} onClick={() => { setPermissionMember(person); setSelectedPermissions(policy.permissionGrants?.[person.id] || []); setModalError(''); }}/>}<Button type="link" danger disabled={disabled || saving} onClick={async () => {
          setError(''); setSaving(true);
          try { if (await onChange({ ...policy, subAdministratorIds: subAdministrators.filter(id => id !== person.id), supervisorIds: supervisors.filter(id => id !== person.id), permissionGrants: Object.fromEntries(Object.entries(policy.permissionGrants || {}).filter(([id]) => id !== person.id)) }) === false) setError('保存失败，请重试，原成员已保留'); }
          catch { setError('保存失败，请重试，原成员已保留'); }
          finally { setSaving(false); }
        }}>移除</Button></Space> },
    ]}/>
    <Modal title={permissionMember ? permissionMember.name + ' · 编辑权限' : '编辑权限'} open={!!permissionMember} okText="保存权限" confirmLoading={saving} okButtonProps={{disabled:disabled || !permissionMember || administrators.includes(permissionMember.id)}} cancelButtonProps={{disabled:saving}} closable={!saving} mask={{ closable: !saving }} onCancel={() => { if (!saving) setPermissionMember(undefined); }} onOk={() => {
      if (!permissionMember || !subAdministrators.includes(permissionMember.id) || administrators.includes(permissionMember.id)) return;
      void saveModal({...policy,permissionGrants:{...policy.permissionGrants,[permissionMember.id]:selectedPermissions}}, () => setPermissionMember(undefined));
    }}><Checkbox.Group aria-label="权限项" options={OKR_PERMISSIONS.map(value => ({value,label:permissionLabels[value]}))} value={selectedPermissions} disabled={disabled || saving} onChange={values => setSelectedPermissions(values as OkrPermission[])}/>{permissionMember && modalError && <Alert type="error" showIcon title={modalError}/>}</Modal>
    <Modal title="更换管理员" open={!!replacement} okText="确认更换" confirmLoading={saving} okButtonProps={{disabled:disabled || !replacementId}} cancelButtonProps={{disabled:saving}} closable={!saving} mask={{ closable: !saving }} onCancel={() => { if (!saving) setReplacement(undefined); }} onOk={() => {
      if (!replacement || !replacementId) return;
      try { void saveModal(replaceOkrAdministrator(policy, people, replacement.id, replacementId), () => setReplacement(undefined)); }
      catch (cause) { setModalError(cause instanceof Error ? cause.message : '所选成员不可用'); }
    }}>
      <div className="space-y-4"><p>将 {replacement?.name} 的管理员身份更换给所选成员，新管理员固定拥有全部功能权限。</p><Select aria-label="新管理员" className="w-full" showSearch allowClear optionFilterProp="label" placeholder="请选择成员" value={replacementId} disabled={disabled || saving} onChange={setReplacementId} options={people.filter(person => !administrators.includes(person.id)).map(person => ({value:person.id,label:`${person.name} · ${person.department}`}))}/>{replacement && modalError && <Alert type="error" showIcon title={modalError}/>}</div>
    </Modal>
    <p className="text-xs text-[var(--text-muted)]">管理员固定拥有全部权限，仅支持更换；新子管理员默认无权限。角色调整不删除员工及已有目标、复盘。</p>
  </section>;
}
