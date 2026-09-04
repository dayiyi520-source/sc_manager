import React, { useState } from 'react';
import {
  Bug,
  Search,
  Filter,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ExternalLink,
  ChevronRight,
  Edit,
  ShieldAlert,
  Paperclip,
  GitBranch,
  Layers,
  Sparkles,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Drawer, Modal } from '../common/UIComponents';
import { BugItem } from '../../types';

export const BugManagementView: React.FC = () => {
  const { bugs, addBug, updateBug, productLines, versions, currentUser, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [envFilter, setEnvFilter] = useState<string>('all');

  const [selectedBug, setSelectedBug] = useState<BugItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<BugItem | null>(null);

  // Form Fields: 缺陷名称、所属产品线、关联版本、缺陷类型、严重程度、处理人、抄送人、预计解决时间、所属环境、缺陷描述、复现步骤
  const [formTitle, setFormTitle] = useState('');
  const [formProductLine, setFormProductLine] = useState(productLines[0]?.name || '数字化协同管理中枢');
  const [formVersion, setFormVersion] = useState('V4.2.0');
  const [formType, setFormType] = useState('功能缺陷');
  const [formSeverity, setFormSeverity] = useState<BugItem['severity']>('严重缺陷');
  const [formAssignee, setFormAssignee] = useState('李工 (后端开发)');
  const [formCc, setFormCc] = useState('张测试, 赵架构');
  const [formDueDate, setFormDueDate] = useState('2026-09-10');
  const [formEnv, setFormEnv] = useState('测试集成环境 (K8s QA)');
  const [formDescription, setFormDescription] = useState('');
  const [formSteps, setFormSteps] = useState('1. 登录系统\n2. 点击大并发数据同步\n3. 查看控制台错误');
  const [formStatus, setFormStatus] = useState<BugItem['status']>('待修复');

  const openAddModal = () => {
    setEditingBug(null);
    setFormTitle('');
    setFormProductLine(productLines[0]?.name || '数字化协同管理中枢');
    setFormVersion('V4.2.0');
    setFormType('功能缺陷');
    setFormSeverity('严重缺陷');
    setFormAssignee('李工 (后端开发)');
    setFormCc('张测试, 赵架构');
    setFormDueDate('2026-09-10');
    setFormEnv('测试集成环境 (K8s QA)');
    setFormDescription('');
    setFormSteps('1. 进入数据导入模块\n2. 上传超大Excel文件\n3. 内存溢出并抛出500');
    setFormStatus('待修复');
    setIsModalOpen(true);
  };

  const openEditModal = (bug: BugItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingBug(bug);
    setFormTitle(bug.title);
    setFormProductLine(bug.productLineName);
    setFormVersion(bug.versionName);
    setFormType(bug.type || '功能缺陷');
    setFormSeverity(bug.severity);
    setFormAssignee(bug.assignee);
    setFormDueDate('2026-09-10');
    setFormEnv(bug.env || '测试集成环境 (K8s QA)');
    setFormDescription(bug.description || '');
    setFormSteps('1. 登录管理端\n2. 触发对应操作\n3. 观察返回异常');
    setFormStatus(bug.status);
    setIsModalOpen(true);
  };

  const handleSaveBug = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', '请填写缺陷 Bug 标题');
      return;
    }

    if (editingBug) {
      updateBug(editingBug.id, {
        title: formTitle,
        productLineName: formProductLine,
        versionName: formVersion,
        type: formType,
        severity: formSeverity,
        assignee: formAssignee,
        status: formStatus,
        env: formEnv,
        description: formDescription
      });
      addToast('success', '缺陷记录已更新');
    } else {
      addBug({
        code: `BUG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: formTitle,
        productLineName: formProductLine,
        versionName: formVersion,
        type: formType,
        severity: formSeverity,
        status: formStatus,
        reporter: currentUser.name,
        assignee: formAssignee,
        env: formEnv,
        createdAt: new Date().toISOString().split('T')[0],
        description: formDescription
      });
    }
    setIsModalOpen(false);
  };

  const handleQuickClose = (bug: BugItem, e: React.MouseEvent) => {
    e.stopPropagation();
    updateBug(bug.id, { status: '已关闭' });
    addToast('success', '缺陷已完成QA验证并关闭');
  };

  const filteredBugs = bugs.filter((b) => {
    const matchQ =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.productLineName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSev = severityFilter === 'all' || b.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchEnv = envFilter === 'all' || (b.env && b.env.includes(envFilter));
    return matchQ && matchSev && matchStatus && matchEnv;
  });

  // 6 Top Metrics: 缺陷总数、待修复、待验证、本月缺陷、缺陷解决率、缺陷平均修复时长
  const totalBugs = bugs.length + 16;
  const pendingFixBugs = bugs.filter((b) => b.status === '待修复' || b.status === '修复中').length;
  const pendingVerifyBugs = bugs.filter((b) => b.status === '待验证').length;
  const thisMonthBugs = 20;
  const fixRate = 88;
  const avgFixTime = '4.2h';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 6 Stats: 缺陷总数、待修复、待验证、本月缺陷、缺陷解决率、缺陷平均修复时长 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          id="stat-bug-total"
          title="缺陷总数"
          value={totalBugs}
          unit="个"
          subText="全生命周期缺陷"
          icon={<Bug className="w-4 h-4" />}
        />
        <StatCard
          id="stat-bug-pending-fix"
          title="待修复缺陷"
          value={pendingFixBugs}
          unit="个"
          change="急需攻坚"
          isPositive={false}
          subText="阻断/严重优先"
          icon={<AlertTriangle className="w-4 h-4" />}
          iconBgColor="bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
        />
        <StatCard
          id="stat-bug-verify"
          title="待验证闭环"
          value={pendingVerifyBugs}
          unit="个"
          change="测试验收中"
          isPositive={true}
          subText="已提测版本"
          icon={<Clock className="w-4 h-4" />}
          iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
        />
        <StatCard
          id="stat-bug-month"
          title="本月新增缺陷"
          value={thisMonthBugs}
          unit="个"
          change="-18% 环比"
          isPositive={true}
          subText="质量稳步提升"
          icon={<Layers className="w-4 h-4" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
        />
        <StatCard
          id="stat-bug-rate"
          title="缺陷解决率"
          value={`${fixRate}%`}
          change="达标优秀"
          isPositive={true}
          subText="SLA响应达成"
          icon={<CheckCircle2 className="w-4 h-4" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <StatCard
          id="stat-bug-time"
          title="平均修复时长"
          value={avgFixTime}
          change="优于标准6h"
          isPositive={true}
          subText="敏捷快速响应"
          icon={<Clock className="w-4 h-4" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
        />
      </div>

      {/* Filter and Action Bar (筛选项: 编号/名称、所属产品线、所属版本、状态、优先级、环境) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索编号、缺陷名称、处理人..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有严重程度</option>
            <option value="致命阻断">致命阻断</option>
            <option value="严重缺陷">严重缺陷</option>
            <option value="一般问题">一般问题</option>
            <option value="轻微优化">轻微优化</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有状态</option>
            <option value="待修复">待修复</option>
            <option value="修复中">修复中</option>
            <option value="待验证">待验证</option>
            <option value="已关闭">已关闭</option>
          </select>

          <select
            value={envFilter}
            onChange={(e) => setEnvFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">所有环境</option>
            <option value="开发环境">开发环境</option>
            <option value="测试">测试环境</option>
            <option value="预发布">预发布环境</option>
            <option value="生产">生产环境</option>
          </select>
        </div>

        <button
          id="btn-add-bug"
          onClick={openAddModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          提报缺陷 Bug
        </button>
      </div>

      {/* Bug List Table (列表字段: 缺陷名称、缺陷类型、严重程度、所属产品、版本、环境、提出人、处理人、预计解决时间、状态、操作) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="py-3 px-4">缺陷编号与标题</th>
                <th className="py-3 px-4">缺陷类型</th>
                <th className="py-3 px-4">严重程度</th>
                <th className="py-3 px-4">所属产品 / 版本</th>
                <th className="py-3 px-4">所属环境</th>
                <th className="py-3 px-4">提出人</th>
                <th className="py-3 px-4">处理人</th>
                <th className="py-3 px-4">状态</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBugs.map((bug) => (
                <tr
                  key={bug.id}
                  onClick={() => setSelectedBug(bug)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-slate-400">{bug.code || `BUG-${bug.id}`}</span>
                      <span className="hover:text-blue-600">{bug.title}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {bug.type || '功能缺陷'}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={bug.severity} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    {bug.productLineName} · <span className="font-mono text-blue-600">{bug.versionName}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {bug.env || '测试环境'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {bug.reporter}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {bug.assignee}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusTag status={bug.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedBug(bug)}
                        className="inline-flex items-center gap-1 text-[var(--active-text)] hover:text-[var(--primary-hover)]"
                      >
                        详情 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => openEditModal(bug, e)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {bug.status !== '已关闭' && (
                        <button
                          onClick={(e) => handleQuickClose(bug, e)}
                          className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 rounded font-medium"
                          title="验证并关闭"
                        >
                          关闭
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bug Detail Drawer (详情页: 缺陷基本信息、生命周期追踪、复现步骤、关联代码提交/分支) */}
      {selectedBug && (
        <Drawer
          isOpen={!!selectedBug}
          onClose={() => setSelectedBug(null)}
          title={selectedBug.title}
          subtitle={`编号: ${selectedBug.code || 'BUG-001'} · 提报人: ${selectedBug.reporter} · 责任人: ${selectedBug.assignee}`}
          width="max-w-2xl"
          footer={
            <button
              onClick={() => setSelectedBug(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              关闭
            </button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 block">严重程度</span>
                <div className="mt-0.5">
                  <StatusTag status={selectedBug.severity} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">当前状态</span>
                <div className="mt-0.5">
                  <StatusTag status={selectedBug.status} />
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">所属产品线 / 版本</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedBug.productLineName} · {selectedBug.versionName}
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">出现运行环境</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedBug.env || '测试集成环境 (K8s QA)'}
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">缺陷复现步骤</span>
                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 mt-1 font-mono text-[11px] whitespace-pre-wrap">
                  1. 进入数字化协同管理中枢大屏；
                  2. 连续触发10次批量导出异步任务；
                  3. Redis 哨兵集群触发连接句柄耗尽告警，前端弹窗提示 Network Timeout。
                </div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block">关联修复 Git 分支与 Commit</span>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                    <span>fix/bug-redis-connection-leak-v4.2</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Drawer>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBug ? '编辑缺陷记录' : '提报新缺陷 Bug'}
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveBug}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              提交缺陷
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveBug} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                缺陷 Bug 名称 *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="例如：高并发导入数据导致连接池耗尽抛出500"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                所属产品线 *
              </label>
              <select
                value={formProductLine}
                onChange={(e) => setFormProductLine(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {productLines.map((pl) => (
                  <option key={pl.id} value={pl.name}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                关联版本 *
              </label>
              <select
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                严重程度 *
              </label>
              <select
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="致命阻断">致命阻断</option>
                <option value="严重缺陷">严重缺陷</option>
                <option value="一般问题">一般问题</option>
                <option value="轻微优化">轻微优化</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                缺陷类型
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="功能缺陷">功能缺陷</option>
                <option value="性能缺陷">性能缺陷</option>
                <option value="UI交互">UI交互</option>
                <option value="安全漏洞">安全漏洞</option>
                <option value="环境配置">环境配置</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                责任处理人 *
              </label>
              <input
                type="text"
                value={formAssignee}
                onChange={(e) => setFormAssignee(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                所属环境
              </label>
              <input
                type="text"
                value={formEnv}
                onChange={(e) => setFormEnv(e.target.value)}
                placeholder="例如：测试集成环境 (K8s QA)"
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="col-span-2">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                复现步骤
              </label>
              <textarea
                rows={3}
                value={formSteps}
                onChange={(e) => setFormSteps(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
