import React, { useState } from 'react';
import {
  FolderKanban,
  Search,
  Filter,
  Plus,
  Building,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { ProjectRecord } from '../../types';

export const ProjectManagementView: React.FC = () => {
  const {
    projects,
    addProject,
    updateProject,
    advanceProjectStage,
    customers,
    selectedProjectIdForDetail,
    setSelectedProjectIdForDetail,
    openPageTab,
    addToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [healthFilter, setHealthFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCustomerName, setFormCustomerName] = useState(customers[0]?.name || '');
  const [formPmName, setFormPmName] = useState('王总监 (PMP)');
  const [formBudget, setFormBudget] = useState(4800000);
  const [formStartDate, setFormStartDate] = useState('2026-06-01');
  const [formEndDate, setFormEndDate] = useState('2026-12-31');

  const STAGES: ProjectRecord['stage'][] = [
    '项目立项',
    '需求调研',
    '系统开发',
    'UAT验收',
    '割接上线',
    '终验维保'
  ];

  const activeProject = projects.find((p) => p.id === selectedProjectIdForDetail) || null;

  const filteredProjects = projects.filter((p) => {
    const matchQ =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pmName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStage = stageFilter === 'all' || p.stage === stageFilter;
    const matchHealth = healthFilter === 'all' || p.health === healthFilter;
    return matchQ && matchStage && matchHealth;
  });

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      addToast('warning', '请填写项目全称');
      return;
    }

    addProject({
      code: `SC-PRJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      name: formName,
      customerName: formCustomerName,
      stage: '项目立项',
      health: '正常',
      progress: 10,
      pmName: formPmName,
      budget: Number(formBudget),
      spentBudget: Math.round(Number(formBudget) * 0.1),
      startDate: formStartDate,
      endDate: formEndDate,
      membersCount: 8
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="在建交付项目大盘"
          value={projects.length}
          unit="个"
          change="进行中交付"
          isPositive={true}
          subText="总预算规模 ¥1,620万"
          icon={<FolderKanban className="w-5 h-5" />}
        />
        <StatCard
          title="UAT与割接关键节点"
          value={projects.filter((p) => p.stage === 'UAT验收' || p.stage === '割接上线').length}
          unit="个"
          change="重点保交付"
          isPositive={true}
          subText="国家电网 & 招商局"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="风险与延期预警"
          value={projects.filter((p) => p.health !== '正常').length}
          unit="个"
          change="需高层介入"
          isPositive={false}
          subText="智行新能源定制化"
          icon={<AlertTriangle className="w-5 h-5" />}
          iconBgColor="bg-rose-50 text-rose-600 dark:bg-rose-950/50"
          onClick={() => openPageTab('ops_risks')}
        />
        <StatCard
          title="交付工时与人效达成"
          value="98.2"
          unit="%"
          subText="PMP 标准化项目管理"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索项目全称 / 客户主体 / 项目经理..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有交付阶段</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有健康度</option>
            <option value="正常">健康正常</option>
            <option value="预警">进度预警</option>
            <option value="延期">已延期</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openPageTab('ops_milestones')}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
          >
            <Calendar className="w-3.5 h-3.5" />
            查看里程碑甘特
          </button>
          <button
            id="btn-add-project"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            新建项目立项
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <th className="py-3 px-4">项目全称</th>
              <th className="py-3 px-4">项目编号</th>
              <th className="py-3 px-4">客户主体</th>
              <th className="py-3 px-4">当前阶段</th>
              <th className="py-3 px-4">整体进度</th>
              <th className="py-3 px-4">健康度</th>
              <th className="py-3 px-4">项目经理 (PM)</th>
              <th className="py-3 px-4">预算规模</th>
              <th className="py-3 px-4">周期</th>
              <th className="py-3 px-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredProjects.map((proj) => (
              <tr
                key={proj.id}
                onClick={() => setSelectedProjectIdForDetail(proj.id)}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="hover:text-blue-600">{proj.name}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-500">{proj.code}</td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{proj.customerName}</td>
                <td className="py-3.5 px-4">
                  <StatusTag status={proj.stage} />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${proj.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500">{proj.progress}%</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <StatusTag status={proj.health} />
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{proj.pmName}</td>
                <td className="py-3.5 px-4 font-bold text-emerald-600">
                  ¥{(proj.budget / 10000).toFixed(0)}万
                </td>
                <td className="py-3.5 px-4 text-slate-500">
                  {proj.startDate} ~ {proj.endDate}
                </td>
                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {proj.stage !== '终验维保' && (
                      <button
                        onClick={() => advanceProjectStage(proj.id)}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 rounded font-medium text-xs"
                      >
                        推进阶段
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedProjectIdForDetail(proj.id)}
                      className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)] text-xs"
                    >
                      详情 <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Project Detail Drawer */}
      {activeProject && (
        <Drawer
          isOpen={!!activeProject}
          onClose={() => setSelectedProjectIdForDetail(null)}
          title={activeProject.name}
          subtitle={`项目编号: ${activeProject.code} · 所属客户: ${activeProject.customerName} · 负责人: ${activeProject.pmName}`}
          width="max-w-2xl"
          footer={
            <>
              <button
                onClick={() => {
                  setSelectedProjectIdForDetail(null);
                  openPageTab('ops_deliverables');
                }}
                className="px-3 py-2 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <FileCheck className="w-3.5 h-3.5" />
                交付物归档清单
              </button>
              {activeProject.stage !== '终验维保' && (
                <button
                  onClick={() => advanceProjectStage(activeProject.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  推进项目到下一里程碑
                </button>
              )}
            </>
          }
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block">当前交付阶段</span>
                <div className="mt-1">
                  <StatusTag status={activeProject.stage} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">项目健康状态</span>
                <div className="mt-1">
                  <StatusTag status={activeProject.health} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">项目总预算</span>
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  ¥{(activeProject.budget / 10000).toFixed(0)} 万元
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">已发生支出成本</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
                  ¥{(activeProject.spentBudget / 10000).toFixed(0)} 万元
                </span>
              </div>
            </div>

            {/* Stages Stepper */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">标准化 PMP 交付里程碑演进</h4>
              <div className="space-y-2">
                {STAGES.map((s, idx) => {
                  const currentIdx = STAGES.indexOf(activeProject.stage);
                  const isDone = idx < currentIdx;
                  const isCurrent = idx === currentIdx;

                  return (
                    <div
                      key={s}
                      className={`p-3 rounded-lg flex items-center justify-between border ${
                        isCurrent
                          ? 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800'
                          : isDone
                          ? 'bg-slate-50/80 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800'
                          : 'bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                            isDone
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </div>
                        <span
                          className={`font-semibold ${
                            isCurrent ? 'text-blue-600 font-bold' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {s}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">
                        {isDone ? '已完成验收' : isCurrent ? '当前执行中' : '尚未开始'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新建项目立项评审"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveProject}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              提交项目立项
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              项目规范全称 *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="如：国家电网华东分部智能协同调度中枢项目"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                委托客户主体 *
              </label>
              <select
                value={formCustomerName}
                onChange={(e) => setFormCustomerName(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                项目经理 (PM) *
              </label>
              <input
                type="text"
                required
                value={formPmName}
                onChange={(e) => setFormPmName(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                项目总预算 (元) *
              </label>
              <input
                type="number"
                required
                value={formBudget}
                onChange={(e) => setFormBudget(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                计划开始日
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                计划终验日
              </label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
