import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Button, Checkbox, Empty, Input, Select, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Check, Users } from './octicons-compat';
import { employeeJobTitle, PersonIdentity } from './PersonIdentity';

type Member = { id: string; name: string; department?: string; jobTitle?: string; roleTitle?: string };
type Props = {
  isOpen: boolean; onClose: () => void; subtitle: ReactNode; subtitleSuffix?: ReactNode;
  employees: Member[]; roles: { label: string; value: string }[];
  existingUserIds: string[] | ((role: string) => string[]); disabled?: boolean;
  employeesLoading?: boolean; rolesLoading?: boolean; employeesError?: boolean; rolesError?: boolean;
  onRetryEmployees?: () => void; onRetryRoles?: () => void;
  onSave: (role: string, ids: string[]) => Promise<boolean | void>;
};

export function MemberSelectionModal({ isOpen, onClose, subtitle, subtitleSuffix, employees, roles, existingUserIds: existing, disabled = false, employeesLoading = false, rolesLoading = false, employeesError = false, rolesError = false, onRetryEmployees, onRetryRoles, onSave }: Props) {
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const saving = pending || disabled;
  const existingUserIds = typeof existing === 'function' ? existing(role) : existing;
  const visibleEmployees = employees.filter(employee => !keyword.trim() || [employee.name, employee.department || '', employeeJobTitle(employee)].some(value => value.toLowerCase().includes(keyword.trim().toLowerCase())));
  useEffect(() => { if (isOpen) { setKeyword(''); setRole(''); setSelectedUserIds([]); setError(''); } }, [isOpen]);
  const setMemberRole = (value: string) => { setRole(value); setSelectedUserIds([]); setError(''); };
  const save = async () => {
    if (saving || locked.current || employeesLoading || rolesLoading || employeesError || rolesError) return;
    if (!role || !selectedUserIds.length) { setError('请选择角色并添加成员'); return; }
    locked.current = true; setPending(true); setError('');
    try {
      if (await onSave(role, selectedUserIds) === false) setError('保存失败，请重试，当前选择已保留');
      else onClose();
    } catch (error) { setError(error instanceof Error ? error.message : '保存失败，请重试，当前选择已保留'); }
    finally { locked.current = false; setPending(false); }
  };
  if (!isOpen) return null;
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
    <div role="dialog" aria-modal="true" aria-label="添加成员" className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-body)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-6 py-4">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]"><Users className="h-5 w-5" /></div><div><h3 className="text-base font-bold text-[var(--text-primary)]">添加成员</h3><p className="mt-1 text-xs text-[var(--text-muted)]"><span className="font-medium text-[var(--primary)]">{subtitle}</span> {subtitleSuffix}</p></div></div>
        <Button type="text" disabled={saving} onClick={onClose} aria-label="关闭成员管理">✕</Button>
      </div>
      <form onSubmit={event => { event.preventDefault(); void save(); }} className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
        <label className="block"><span className="mb-1 block text-[var(--text-body)]">成员角色 *</span><Select className="w-full" value={role || undefined} onChange={setMemberRole} placeholder="请选择成员角色" disabled={saving} loading={rolesLoading} options={roles} /></label>
        {rolesError && <Alert type="error" showIcon message="成员角色加载失败" description="请重试后再添加成员" action={<Button onClick={() => onRetryRoles?.()}>重试</Button>} />}
        <label className="block"><span className="mb-1 block text-[var(--text-body)]">从团队组织选择 *</span><Input disabled={saving} value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名、部门或职位" allowClear suffix={<SearchOutlined />} /></label>
        {employeesError && <Alert type="error" showIcon message="有效员工加载失败" description="请检查团队组织后重试" action={<Button onClick={() => onRetryEmployees?.()}>重试</Button>} />}
        {employeesLoading ? <div className="flex min-h-32 items-center justify-center"><Spin /></div> : <div className="max-h-64 space-y-1 overflow-y-auto" aria-label="团队组织成员候选">
          {visibleEmployees.map((employee) => {
            const alreadyMember = existingUserIds.includes(employee.id);
            const selected = selectedUserIds.includes(employee.id);
            return <div key={employee.id} className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${alreadyMember ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[var(--bg-elevated)]'}`}>
              <Checkbox id={`member-option-${employee.id}`} aria-label={`选择${employee.name}`} disabled={saving || alreadyMember} checked={alreadyMember || selected} onChange={() => setSelectedUserIds((previous) => selected ? previous.filter((id) => id !== employee.id) : [...previous, employee.id])} />
              <label htmlFor={`member-option-${employee.id}`} className="min-w-0 flex-1 cursor-[inherit]"><PersonIdentity name={employee.name} subtitle={employeeJobTitle(employee) || '未设置职位'} size={32} /></label>
            </div>;
          })}
          {!visibleEmployees.length && !employeesError && <Empty description="暂无匹配的有效员工"/>}
        </div>}
        {error && <Alert type="error" showIcon title={error}/> }
        <div className="border-t border-[var(--border-main)] pt-3 text-sm font-semibold text-[var(--primary)]">已选 {selectedUserIds.length} 人</div>
        <div className="flex justify-end gap-2"><Button onClick={onClose} disabled={saving}>取消</Button><Button type="primary" htmlType="submit" loading={saving} disabled={employeesError || employeesLoading || rolesError || rolesLoading} icon={<Check className="h-3.5 w-3.5" />}>保存</Button></div>
      </form>
    </div>
  </div>, document.body);
}
