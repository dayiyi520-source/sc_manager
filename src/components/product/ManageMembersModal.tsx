import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Input, Select, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Check, Users } from '../common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { teamRepository } from '../../services/teamRepository';
import type { ProductLine, ProductLineMember } from '../../types';
import { employeeJobTitle, PersonIdentity } from '../common/PersonIdentity';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLine: ProductLine;
}

const PRODUCT_LINE_MEMBER_ROLES = ['管理员', '产品', '研发', '设计', '测试', '交付主管', '参与人'];

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({ isOpen, onClose, productLine }) => {
  const { addProductLineMembers, addToast } = useApp();
  const employeesQuery = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, enabled: isOpen, retry: false });
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const existingMembers = useMemo(() => (productLine.members || []).filter((member): member is ProductLineMember => typeof member !== 'string'), [productLine.members]);
  const existingUserIds = useMemo(() => new Set(existingMembers.map((member) => member.userId).filter(Boolean)), [existingMembers]);
  const visibleEmployees = useMemo(() => (employeesQuery.data || []).filter((employee) => {
    const query = keyword.trim().toLowerCase();
    return !query || [employee.name, employee.department || '', employeeJobTitle(employee)].some((value) => value.toLowerCase().includes(query));
  }), [employeesQuery.data, keyword]);

  useEffect(() => {
    if (!isOpen) return;
    setKeyword('');
    setRole('');
    setSelectedUserIds([]);
  }, [isOpen, productLine.id]);

  if (!isOpen) return null;

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role || selectedUserIds.length === 0) {
      addToast('warning', '请选择角色并添加成员');
      return;
    }
    const employeeById = new Map((employeesQuery.data || []).map((employee) => [employee.id, employee]));
    const additions: ProductLineMember[] = selectedUserIds.map((userId, index) => ({
      id: `pending-${Date.now()}-${index}`,
      userId,
      name: employeeById.get(userId)?.name || '',
      role,
    }));
    setSaving(true);
    try {
      await addProductLineMembers(productLine.id, additions);
      addToast('success', '成员添加成功');
      onClose();
    } catch (error) {
      addToast('error', '成员添加失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
    <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-body)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-6 py-4">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]"><Users className="h-5 w-5" /></div><div><h3 className="text-base font-bold text-[var(--text-primary)]">添加成员</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{productLine.name} ({productLine.code})</p></div></div>
        <Button type="text" onClick={onClose} aria-label="关闭成员管理">✕</Button>
      </div>
      <form onSubmit={handleSave} className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
        <label className="block"><span className="mb-1 block text-[var(--text-body)]">成员角色 *</span><Select className="w-full" value={role || undefined} onChange={setRole} placeholder="请选择成员角色" options={PRODUCT_LINE_MEMBER_ROLES.map((item) => ({ label: item, value: item }))} /></label>
        <label className="block"><span className="mb-1 block text-[var(--text-body)]">从团队组织选择 *</span><Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索姓名、部门或职位" allowClear suffix={<SearchOutlined />} /></label>
        {employeesQuery.isError && <Alert type="error" showIcon message="有效员工加载失败" description="请检查团队组织后重试" action={<Button onClick={() => employeesQuery.refetch()}>重试</Button>} />}
        {employeesQuery.isLoading ? <div className="flex min-h-32 items-center justify-center"><Spin /></div> : <div className="max-h-64 space-y-1 overflow-y-auto" aria-label="团队组织成员候选">
          {visibleEmployees.map((employee) => {
            const alreadyMember = existingUserIds.has(employee.id);
            const selected = selectedUserIds.includes(employee.id);
            return <label key={employee.id} className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${alreadyMember ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[var(--bg-elevated)]'}`}>
              <Checkbox disabled={alreadyMember} checked={alreadyMember || selected} onChange={() => setSelectedUserIds((previous) => selected ? previous.filter((id) => id !== employee.id) : [...previous, employee.id])} />
              <PersonIdentity name={employee.name} subtitle={employeeJobTitle(employee) || '未设置职位'} size={32} />
            </label>;
          })}
          {!visibleEmployees.length && !employeesQuery.isError && <div className="py-8 text-center text-[var(--text-muted)]">暂无匹配的有效员工</div>}
        </div>}
        <div className="border-t border-[var(--border-main)] pt-3 text-sm font-semibold text-[var(--primary)]">已选 {selectedUserIds.length} 人</div>
        <div className="flex justify-end gap-2"><Button onClick={onClose} disabled={saving}>取消</Button><Button type="primary" htmlType="submit" loading={saving} disabled={employeesQuery.isError || employeesQuery.isLoading} icon={<Check className="h-3.5 w-3.5" />}>保存</Button></div>
      </form>
    </div>
  </div>;
};
