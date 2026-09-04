import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  Phone,
  Building,
  Shield,
  CheckCircle2,
  UserCheck,
  Briefcase
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';

export const TeamOrgView: React.FC = () => {
  const { addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [members, setMembers] = useState([
    {
      id: 'm-1',
      name: '陈志远',
      title: '华东区商务总经理',
      dept: '商务大区与市场部',
      phone: '138-0011-8899',
      email: 'chenzy@shichuang.com',
      role: '大区销售总监',
      status: '在职',
      projectsCount: 4
    },
    {
      id: 'm-2',
      name: '李天成',
      title: '首席信创架构师',
      dept: '产研技术中台',
      phone: '139-2233-4455',
      email: 'litc@shichuang.com',
      role: '技术总监/架构师',
      status: '在职',
      projectsCount: 6
    },
    {
      id: 'm-3',
      name: '王雪琴',
      title: '交付副总监 (PMP)',
      dept: '工程交付与运营中心',
      phone: '137-5566-7788',
      email: 'wangxq@shichuang.com',
      role: '高级项目总监',
      status: '在职',
      projectsCount: 5
    },
    {
      id: 'm-4',
      name: '赵敏',
      title: 'QA测试主管',
      dept: '质量保障与测试部',
      phone: '136-7788-9900',
      email: 'zhaomin@shichuang.com',
      role: '测试架构师',
      status: '在职',
      projectsCount: 3
    }
  ]);

  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('商务大区与市场部');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const filteredMembers = members.filter((m) => {
    const matchQ =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = deptFilter === 'all' || m.dept === deptFilter;
    return matchQ && matchDept;
  });

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('warning', '请填写员工姓名');
      return;
    }

    setMembers([
      {
        id: `m-${Date.now()}`,
        name: formName,
        title: formTitle || '专业工程师',
        dept: formDept,
        phone: formPhone || '138-0000-0000',
        email: formEmail || `${formName.toLowerCase()}@shichuang.com`,
        role: '业务专员',
        status: '在职',
        projectsCount: 1
      },
      ...members
    ]);
    setIsModalOpen(false);
    addToast('success', '已成功录入员工组织信息');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="公司在职团队规模"
          value={members.length + 38}
          unit="人"
          subText="全职研发与交付专家"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="核心信创研发专家"
          value="24"
          unit="人"
          change="技术占比 57%"
          isPositive={true}
          subText="达梦/统信内核调优"
          icon={<Briefcase className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
        <StatCard
          title="持有 PMP 认证项目经理"
          value="8"
          unit="人"
          change="标准化管控"
          isPositive={true}
          subText="国家电网交付保障"
          icon={<Shield className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="商务大区与方案总监"
          value="10"
          unit="人"
          subText="覆盖华东、华北、华南"
          icon={<UserCheck className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索员工姓名 / 职位 / 邮箱..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-64"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有部门</option>
            <option value="商务大区与市场部">商务大区与市场部</option>
            <option value="产研技术中台">产研技术中台</option>
            <option value="工程交付与运营中心">工程交付与运营中心</option>
            <option value="质量保障与测试部">质量保障与测试部</option>
          </select>
        </div>

        <button
          id="btn-add-team-member"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          录入组织员工
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMembers.map((m) => (
          <div
            key={m.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 text-xs"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {m.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{m.name}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-medium text-[11px]">
                      {m.role}
                    </span>
                  </div>
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    {m.title} · {m.dept}
                  </span>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 text-[11px] font-medium">
                {m.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{m.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{m.email}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <span>当前负责关联项目：{m.projectsCount} 个</span>
              <button
                onClick={() => addToast('info', '权限已配置', `已核验 ${m.name} 的RBAC系统访问凭证`)}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                配置角色与权限 &gt;
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="录入新员工组织档案"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveMember}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存员工
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                员工姓名 *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="如：张立强"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                职位职级 *
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="如：资深信创研发工程师"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              所属部门 *
            </label>
            <select
              value={formDept}
              onChange={(e) => setFormDept(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="商务大区与市场部">商务大区与市场部</option>
              <option value="产研技术中台">产研技术中台</option>
              <option value="工程交付与运营中心">工程交付与运营中心</option>
              <option value="质量保障与测试部">质量保障与测试部</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                联系手机
              </label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="138-xxxx-xxxx"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                企业邮箱
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="xxx@shichuang.com"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
