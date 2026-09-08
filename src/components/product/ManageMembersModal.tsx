import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  Shield,
  Check,
  Search,
  UserCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProductLine, ProductLineMember } from '../../types';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLine: ProductLine;
}

const COMMON_ROLES = [
  '需求负责人 (PO)',
  '技术负责人 (Tech Lead)',
  '测试负责人 (QA Lead)',
  '核心前端架构师',
  '后端高并发研发',
  '系统架构师',
  '数字孪生算法专家',
  '信创运维与交付专家',
  '产品经理 (PM)',
  '交互与视觉设计 (UI/UX)'
];

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  isOpen,
  onClose,
  productLine
}) => {
  const { updateProductLine, addToast } = useApp();

  const [members, setMembers] = useState<ProductLineMember[]>(() => {
    const existing = productLine.members || [];
    if (existing.length > 0 && typeof existing[0] === 'string') {
      return (existing as string[]).map((name, index) => ({ id: `legacy-${index}-${name}`, name, role: '产品线成员' }));
    }
    return existing.length > 0 ? (existing as ProductLineMember[]) : [
      { id: 'm-1', name: productLine.owner || '张瑞', role: '产品线负责人 / PO', email: 'lead@shichuang.com' }
    ];
  });

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState(COMMON_ROLES[3]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      addToast('warning', '请填写成员姓名');
      return;
    }

    const member: ProductLineMember = {
      id: `mem-${Date.now()}`,
      name: newName.trim(),
      role: newRole,
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined
    };

    const updated = [...members, member];
    setMembers(updated);
    updateProductLine(productLine.id, { members: updated });
    addToast('success', `已添加成员 ${member.name}`, `角色：${member.role}`);

    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setIsAdding(false);
  };

  const handleRemoveMember = (id: string, name: string) => {
    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    updateProductLine(productLine.id, { members: updated });
    addToast('info', `已移除成员 ${name}`);
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
              <h3 className="text-base font-bold text-[var(--text-primary)]">成员配置与管理</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                产品线：<span className="text-[var(--active-text)] font-medium">{productLine.name}</span> ({productLine.code})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Top summary & Add button */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#A5ADBA]">
              共配置 <span className="text-[#F8FAFC] font-bold font-mono">{members.length}</span> 位产研成员
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2F66F6] hover:bg-[#3B73FF] text-[#F8FAFC] rounded-lg text-xs font-semibold transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isAdding ? '取消添加' : '新增成员'}
            </button>
          </div>

          {/* Add member form block */}
          {isAdding && (
            <form
              onSubmit={handleAddMember}
              className="p-4 rounded-xl border border-[#2F66F6]/30 bg-[#2F66F6]/5 space-y-3 animate-in fade-in duration-150"
            >
              <h4 className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#2F66F6]" />
                录入新产品线成员
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#A5ADBA] mb-1">
                    成员姓名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="如：王浩然"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#2C3440] bg-[#121923] text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#A5ADBA] mb-1">
                    团队角色 / 岗位 *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#2C3440] bg-[#121923] text-[#F8FAFC]"
                  >
                    {COMMON_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#A5ADBA] mb-1">
                    企业邮箱
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@shichuang.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#2C3440] bg-[#121923] text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#A5ADBA] mb-1">
                    联系电话
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="13800000000"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#2C3440] bg-[#121923] text-[#F8FAFC]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#18212C] text-[#A5ADBA] hover:text-[#F8FAFC]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#2F66F6] text-[#F8FAFC] font-semibold hover:bg-[#3B73FF]"
                >
                  <Check className="w-3.5 h-3.5" />
                  确认加入
                </button>
              </div>
            </form>
          )}

          {/* Members List */}
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-[#2C3440] bg-[#151A22] flex items-center justify-between gap-3 hover:border-[#3A4655] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-[#2F66F6]/30 to-indigo-600/30 border border-[#2F66F6]/40 flex items-center justify-center font-bold text-[#6EA0FF] text-xs shrink-0">
                    {m.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F8FAFC] text-xs">{m.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#18212C] text-[#6EA0FF] font-medium text-[10px] border border-[#2C3440]">
                        {m.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#7C8796] mt-1">
                      {m.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {m.email}
                        </span>
                      )}
                      {m.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {m.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveMember(m.id, m.name)}
                  title="移除成员"
                  className="p-1.5 text-[#7C8796] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#2C3440] flex justify-end bg-[#151A22]/80">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#2F66F6] hover:bg-[#3B73FF] text-[#F8FAFC] rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
