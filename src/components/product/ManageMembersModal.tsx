import React, { useEffect, useState } from 'react';
import { Avatar, Button, Checkbox, Input, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import {
  Users,
  Check
} from '../common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { ProductLine, ProductLineMember } from '../../types';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLine: ProductLine;
}

const PRODUCT_LINE_MEMBER_ROLES = ['管理员', '产品', '研发', '设计', '测试', '参与人'];

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  isOpen,
  onClose,
  productLine
}) => {
  const { addProductLineMembers, addToast, currentUser } = useApp();

  const getProductLineMembers = () => {
    const existing = productLine.members || [];
    const configuredLeads = [
      { name: productLine.owner || productLine.ownerName, role: '管理员' },
      { name: productLine.requirementOwner, role: '产品' },
      { name: productLine.techOwner, role: '研发' },
      { name: productLine.testOwner, role: '测试' }
    ].filter((lead): lead is { name: string; role: string } => Boolean(lead.name));
    const normalized: ProductLineMember[] = existing.length > 0 && typeof existing[0] === 'string'
      ? (existing as string[]).map((name, index) => ({ id: `legacy-${index}-${name}`, name, role: '参与人' }))
      : existing.length > 0 ? (existing as ProductLineMember[]) : [
      { id: 'm-1', name: productLine.owner || '张瑞', role: '管理员', email: 'lead@shichuang.com' }
    ];
    const existingNames = new Set(normalized.map((member) => member.name));
    return [...normalized, ...configuredLeads
      .filter((lead) => !existingNames.has(lead.name))
      .map((lead, index) => ({ id: `lead-${index}-${lead.name}`, name: lead.name, role: lead.role }))];
  };
  const [members, setMembers] = useState<ProductLineMember[]>(getProductLineMembers);

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const recommendedMembers = Array.from(new Set([
    currentUser?.name,
    productLine.owner,
    productLine.ownerName,
    '王浩然',
    '陈小敏',
    '张瑞'
  ].filter(Boolean) as string[]));
  const visibleRecommendations = recommendedMembers.filter((name) => name.toLowerCase().includes(newName.toLowerCase()));

  useEffect(() => {
    if (!isOpen) return;
    setMembers(getProductLineMembers());
    setNewName('');
    setNewRole('');
    setSelectedNewMembers([]);
  }, [isOpen, productLine.id]);

  if (!isOpen) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRole || selectedNewMembers.length === 0) {
      addToast('warning', '请选择角色并添加成员');
      return;
    }
    const additions = selectedNewMembers.map((name, index) => ({ id: `mem-${Date.now()}-${index}`, name, role: newRole }));
    try {
      await addProductLineMembers(productLine.id, additions);
      setMembers((previous) => [...previous, ...additions]);
      addToast('success', '成员添加成功');
      setNewName('');
      setNewRole('');
      setSelectedNewMembers([]);
      onClose();
    } catch (error) {
      addToast('error', '成员添加失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] text-[var(--text-body)] border border-[var(--border-main)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-surface-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">添加成员</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                产品线：<span className="text-[var(--active-text)] font-medium">{productLine.name}</span> ({productLine.code})
              </p>
            </div>
          </div>
          <Button
            type="text"
            onClick={onClose}
            aria-label="关闭成员管理"
          >
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="block text-[11px] text-[var(--text-body)] mb-1">选择角色 *</label>
              <Select className="w-full" value={newRole || undefined} onChange={setNewRole} placeholder="请选择成员角色" options={PRODUCT_LINE_MEMBER_ROLES.map((role) => ({ label: role, value: role }))} />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-body)] mb-1">添加成员 *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="请输入关键字"
                allowClear
                suffix={<SearchOutlined />}
              />
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-body)] mb-2">推荐成员</div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {visibleRecommendations.map((name) => {
                  const alreadySelected = members.some((item) => item.name === name);
                  const selected = selectedNewMembers.includes(name);
                  return (
                    <label key={name} className={`flex items-center gap-3 rounded-md px-2 py-2 ${alreadySelected ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-[var(--bg-elevated)]'}`}>
                      <Checkbox disabled={alreadySelected} checked={alreadySelected || selected} onChange={() => setSelectedNewMembers((prev) => selected ? prev.filter((item) => item !== name) : [...prev, name])} />
                      <Avatar size={32}>{name.slice(0, 2)}</Avatar>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-[var(--border-main)] pt-3 text-sm font-semibold text-[var(--primary)]">已选{selectedNewMembers.length}人</div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={onClose}>取消</Button>
              <Button type="primary" htmlType="submit" icon={<Check className="w-3.5 h-3.5" />}>保存</Button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
