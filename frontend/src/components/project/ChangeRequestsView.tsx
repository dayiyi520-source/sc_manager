import React, { useState } from 'react';
import {
  Sliders,
  Search,
  Filter,
  Plus,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { ChangeRequest } from '../../types';

export const ChangeRequestsView: React.FC = () => {
  const { changeRequests, addChangeRequest, updateChangeRequest, projects, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formProjectName, setFormProjectName] = useState(projects[0]?.name || '');
  const [formType, setFormType] = useState<'需求范围变更' | '工期进度变更' | '架构与技术栈变更' | '商务预算变更'>('需求范围变更');
  const [formImpact, setFormImpact] = useState('工期后延5个工作日，需增加1名前端工程师');
  const [formReason, setFormReason] = useState('客户在UAT阶段提出需新增实时大屏监控模块');

  const filteredRequests = changeRequests.filter((r) => {
    const matchQ =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.applicant.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchQ && matchType && matchStatus;
  });

  const handleSaveRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', '请填写变更主题');
      return;
    }

    addChangeRequest({
      projectId: `prj-${Date.now()}`,
      projectName: formProjectName,
      title: formTitle,
      type: formType,
      applicant: '项目经理 (王总监)',
      status: '审核中',
      impactAnalysis: formImpact,
      applyDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(false);
  };

  const handleApprove = (r: ChangeRequest) => {
    updateChangeRequest(r.id, { status: '已批准' });
    addToast('success', '变更申请已正式批准', `【${r.title}】变更影响评估已生效，对应排期已更新`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="项目变更申请总数"
          value={changeRequests.length}
          unit="项"
          subText="闭环严格受控"
          icon={<Sliders className="w-5 h-5" />}
        />
        <StatCard
          title="审核中变更评估"
          value={changeRequests.filter((r) => r.status === '审核中').length}
          unit="项"
          change="等待委员会审批"
          isPositive={false}
          subText="涉及范围与工期评估"
          icon={<Clock className="w-5 h-5" />
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50"
        />
        <StatCard
          title="已批准实施变更"
          value={changeRequests.filter((r) => r.status === '已批准').length}
          unit="项"
          change="平稳落地"
          isPositive={true}
          subText="签订补充变更备忘录"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="范围蔓延受控率"
          value="100"
          unit="%"
          subText="无无序蔓延风险"
          icon={<ShieldAlert className="w-5 h-5" />}
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
              placeholder="搜索变更申请 / 项目名称..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有变更类型</option>
            <option value="需求范围变更">需求范围变更</option>
            <option value="工期进度变更">工期进度变更</option>
            <option value="架构与技术栈变更">架构与技术栈变更</option>
          </select>
        </div>

        <button
          id="btn-add-change-request"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          提起项目变更单 (CR)
        </button>
      </div>

      {/* Change Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((r) => (
          <div
            key={r.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{r.title}</span>
                <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 font-medium text-[11px]">
                  {r.type}
                </span>
                <StatusTag status={r.status} />
              </div>

              <div className="text-[11px] text-slate-400">
                所属项目：<span className="font-semibold text-slate-700 dark:text-slate-300">{r.projectName}</span> · 申请人：{r.applicant} · 日期：{r.applyDate}
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">🔍 变更影响与资源成本评估：</span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                {r.impactAnalysis}
              </p>
            </div>

            {r.status === '审核中' && (
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => addToast('info', '已驳回变更', '需补充客户方书面确认签署文件')}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium"
                >
                  驳回补充
                </button>
                <button
                  onClick={() => handleApprove(r)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold shadow-xs"
                >
                  ✓ 批准变更生效
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="提起项目工程变更单 (Change Request)"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveRequest}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              提交变更委员会评估
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveRequest} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              变更主题名称 *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="如：国家电网UAT初验增加实时大屏告警模块"
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
                变更类型 *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="需求范围变更">需求范围变更</option>
                <option value="工期进度变更">工期进度变更</option>
                <option value="架构与技术栈变更">架构与技术栈变更</option>
                <option value="商务预算变更">商务预算变更</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              变更影响评估 (工期、预算、技术风险) *
            </label>
            <textarea
              rows={3}
              required
              value={formImpact}
              onChange={(e) => setFormImpact(e.target.value)}
              placeholder="明确变更对主干里程碑交付时间、人月成本以及架构的影响..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
