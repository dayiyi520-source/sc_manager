import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Plus,
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  ShieldCheck,
  Zap
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { RiskItem } from '../../types';

export const RiskTrackingView: React.FC = () => {
  const { risks, addRisk, updateRisk, projects, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formProjectName, setFormProjectName] = useState(projects[0]?.name || '');
  const [formLevel, setFormLevel] = useState<'高危风险' | '中危风险' | '低危风险'>('高危风险');
  const [formMitigation, setFormMitigation] = useState('由技术总监驻场并派驻资深信创工程师联合攻关');
  const [formOwner, setFormOwner] = useState('李工 (技术总监)');

  const filteredRisks = risks.filter((r) => {
    const matchQ =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLevel = levelFilter === 'all' || r.level === levelFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchQ && matchLevel && matchStatus;
  });

  const handleSaveRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', '请填写风险描述');
      return;
    }

    addRisk({
      projectId: `prj-${Date.now()}`,
      projectName: formProjectName,
      title: formTitle,
      level: formLevel,
      status: '跟进中',
      mitigationPlan: formMitigation,
      owner: formOwner,
      createdAt: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(false);
  };

  const handleResolveRisk = (r: RiskItem) => {
    updateRisk(r.id, { status: '已化解' });
    addToast('success', `风险【${r.title}】已成功闭环化解`, '缓解措施已生效，风险降至安全基线');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="活动风险台账"
          value={risks.length}
          unit="项"
          subText="主动前置识别"
          icon={<ShieldAlert className="w-5 h-5" />}
        />
        <StatCard
          title="高危重点关注"
          value={risks.filter((r) => r.level === '高危风险').length}
          unit="项"
          change="每日例会跟进"
          isPositive={false}
          subText="达梦读写分离压测"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50 text-rose-600 dark:bg-rose-950/50"
        />
        <StatCard
          title="已闭环化解风险"
          value={risks.filter((r) => r.status === '已化解').length}
          unit="项"
          change="化解率 75%"
          isPositive={true}
          subText="安全平稳交付"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="交付安全系数"
          value="99.2"
          unit="%"
          subText="红线风险 0 触发"
          icon={<ShieldCheck className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
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
              placeholder="搜索风险描述 / 项目名称 / 责任人..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有风险等级</option>
            <option value="高危风险">高危风险</option>
            <option value="中危风险">中危风险</option>
            <option value="低危风险">低危风险</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有跟踪状态</option>
            <option value="跟进中">跟进中</option>
            <option value="已化解">已化解</option>
          </select>
        </div>

        <button
          id="btn-add-risk"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          识别登记新风险
        </button>
      </div>

      {/* Risks Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <th className="py-3 px-4">风险描述</th>
              <th className="py-3 px-4">等级</th>
              <th className="py-3 px-4">所属项目</th>
              <th className="py-3 px-4">应对预案与缓解策略</th>
              <th className="py-3 px-4">责任人</th>
              <th className="py-3 px-4">状态</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRisks.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{r.title}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <StatusTag status={r.level} />
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{r.projectName}</td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 max-w-xs">{r.mitigationPlan}</td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">{r.owner}</td>
                <td className="py-3.5 px-4">
                  <StatusTag status={r.status} />
                </td>
                <td className="py-3.5 px-4 text-right">
                  {r.status !== '已化解' ? (
                    <button
                      onClick={() => handleResolveRisk(r)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-medium text-xs flex items-center gap-1 ml-auto"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      确认化解闭环
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px]">已闭环</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="识别登记项目风险"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveRisk}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              保存并进入跟踪台账
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveRisk} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              风险核心描述 *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="如：客户机房达梦集群高可用参数未调优，可能影响UAT压测"
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
                风险等级 *
              </label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="高危风险">高危风险 (阻断交付)</option>
                <option value="中危风险">中危风险 (可能导致延期)</option>
                <option value="低危风险">低危风险 (轻微影响)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              应对预案与缓解措施 (Mitigation Plan) *
            </label>
            <textarea
              rows={3}
              required
              value={formMitigation}
              onChange={(e) => setFormMitigation(e.target.value)}
              placeholder="明确具体规避、转移或减轻风险的技术措施与行动清单..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
