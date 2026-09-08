import React, { useState } from 'react';
import {
  Calendar,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  DollarSign,
  ChevronRight,
  TrendingUp,
  Sliders
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { Milestone } from '../../types';

export const MilestoneScheduleView: React.FC = () => {
  const { milestones, addMilestone, updateMilestone, projects, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formProjectName, setFormProjectName] = useState(projects[0]?.name || '');
  const [formDueDate, setFormDueDate] = useState('2026-09-30');
  const [formPaymentTrigger, setFormPaymentTrigger] = useState('触发 50% 上线验收结算款 (¥240万)');
  const [formOwner, setFormOwner] = useState('李工 (技术总监)');

  const filteredMilestones = milestones.filter((m) => {
    const matchQ =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchQ && matchStatus;
  });

  const handleSaveMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('warning', '请填写里程碑节点名称');
      return;
    }

    addMilestone({
      projectId: `prj-${Date.now()}`,
      projectName: formProjectName,
      name: formName,
      dueDate: formDueDate,
      status: '进行中',
      paymentTrigger: formPaymentTrigger,
      owner: formOwner
    });
    setIsModalOpen(false);
  };

  const handleCompleteMilestone = (m: Milestone) => {
    updateMilestone(m.id, { status: '已完成' });
    addToast('success', `里程碑【${m.name}】已通过验收`, `已达成关键节点：${m.paymentTrigger || '交付物确认签字'}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="关键里程碑总数"
          value={milestones.length}
          unit="个"
          subText="PMP 标准节点管理"
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          title="已完成验收节点"
          value={milestones.filter((m) => m.status === '已完成').length}
          unit="个"
          change="按期达成"
          isPositive={true}
          subText="触发回款 ¥720万"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="进行中冲刺节点"
          value={milestones.filter((m) => m.status === '进行中').length}
          unit="个"
          change="本月关键验收"
          isPositive={false}
          subText="UAT测试与割接"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
        <StatCard
          title="风险预警里程碑"
          value={milestones.filter((m) => m.status === '延期风险').length}
          unit="个"
          change="需重点关注"
          isPositive={false}
          subText="智行新能源定制化"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
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
              placeholder="搜索里程碑名称 / 项目名称 / 负责人..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有状态</option>
            <option value="已完成">已完成</option>
            <option value="进行中">进行中</option>
            <option value="延期风险">延期风险</option>
            <option value="未开始">未开始</option>
          </select>
        </div>

        <button
          id="btn-add-milestone"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          规划里程碑节点
        </button>
      </div>

      {/* Milestone Cards Matrix */}
      <div className="space-y-4">
        {filteredMilestones.map((m) => (
          <div
            key={m.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{m.name}</span>
                    <StatusTag status={m.status} />
                  </div>
                  <span className="text-[11px] text-slate-400">所属项目：{m.projectName}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-slate-400 block text-[11px]">交付节点期限</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{m.dueDate}</span>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                  <span className="text-slate-400 block text-[11px]">责任人</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{m.owner}</span>
                </div>
                {m.status !== '已完成' && (
                  <button
                    onClick={() => handleCompleteMilestone(m)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs shadow-xs ml-2"
                  >
                    ✓ 确认验收通过
                  </button>
                )}
              </div>
            </div>

            {m.paymentTrigger && (
              <div className="p-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>商务款项联动：{m.paymentTrigger}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="规划项目关键里程碑节点"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveMilestone}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存里程碑
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveMilestone} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              里程碑节点名称 *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：国家电网UAT系统初验与压测达标"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                所属项目 *
              </label>
              <select
                value={formProjectName}
                onChange={(e) => setFormProjectName(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                要求完成日期 *
              </label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                技术/业务责任人 *
              </label>
              <input
                type="text"
                value={formOwner}
                onChange={(e) => setFormOwner(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                款项结算触发条件
              </label>
              <input
                type="text"
                value={formPaymentTrigger}
                onChange={(e) => setFormPaymentTrigger(e.target.value)}
                placeholder="如：触发50%上线款"
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
