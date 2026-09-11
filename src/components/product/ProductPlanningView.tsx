import React, { useState } from 'react';
import {
  Compass,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  ChevronRight,
  Plus,
  Boxes,
  Cpu,
  Bug,
  AlertTriangle,
  ArrowRight,
  User,
  Building,
  ExternalLink,
  ShieldAlert
} from '@/components/common/octicons-compat';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';

export const ProductPlanningView: React.FC = () => {
  const { productLines, versions, requirementTasks, bugs, openPageTab, addToast } = useApp();

  const [selectedProductLineId, setSelectedProductLineId] = useState<string>(productLines[0]?.id || 'pl-1');

  // Bug Severity Distribution Data
  const bugSeverityData = [
    { name: '致命阻断', value: 1, color: 'var(--danger)' },
    { name: '严重缺陷', value: 3, color: 'var(--warning)' },
    { name: '一般问题', value: 6, color: 'var(--primary)' },
    { name: '轻微优化', value: 4, color: 'var(--success)' }
  ];

  // Bug Status Distribution
  const bugStatusData = [
    { name: '待修复', count: 4, color: 'var(--warning)' },
    { name: '修复中', count: 5, color: 'var(--primary)' },
    { name: '待验证', count: 3, color: 'var(--accent-purple)' },
    { name: '已关闭', count: 18, color: 'var(--success)' }
  ];

  // Requirements metrics for active version
  const totalReqs = requirementTasks.length;
  const inProgressReqs = requirementTasks.filter((t) => t.status === '研发中' || t.status === '设计中' || t.status === '测试中').length;
  const designingReqs = requirementTasks.filter((t) => t.status === '设计中').length;
  const developingReqs = requirementTasks.filter((t) => t.status === '研发中').length;
  const testingReqs = requirementTasks.filter((t) => t.status === '测试中').length;
  const releasedReqs = requirementTasks.filter((t) => t.status === '已发布').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top 6 Metrics (根据进行中的迭代版本): 需求数、进行中需求、设计中、研发中、测试中、已发布 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-slate-400 text-xs block">迭代需求总数</span>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 font-mono">{totalReqs} 个</div>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-slate-400 text-xs block">进行中需求</span>
          <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">{inProgressReqs} 个</div>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-slate-400 text-xs block">设计中 (UI/UE)</span>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 font-mono">{designingReqs} 个</div>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-slate-400 text-xs block">研发中 (前后端)</span>
          <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 font-mono">{developingReqs} 个</div>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-slate-400 text-xs block">测试中 (QA验收)</span>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 font-mono">{testingReqs} 个</div>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs">
          <span className="text-slate-400 text-xs block">已发布上线</span>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{releasedReqs} 个</div>
        </div>
      </div>

      {/* 1. 产品线卡片 (名称、版本号、需求数、进行中需求、迭代进度、负责人) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600" />
            核心产品线迭代概览
          </h3>
          <button
            onClick={() => openPageTab('prod_lines')}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            产品线管理 &gt;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {productLines.map((line) => (
            <div
              key={line.id}
              onClick={() => setSelectedProductLineId(line.id)}
              className={`p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer space-y-3 ${
                selectedProductLineId === line.id
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{line.name}</h4>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-medium">主干 V4.2.0</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[11px]">
                  {line.ownerName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>总需求数: <strong className="text-slate-800 dark:text-slate-200">{line.activeTasksCount + 4}</strong></div>
                <div>进行中: <strong className="text-blue-600">{line.activeTasksCount}</strong></div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">迭代交付进度</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{line.progress || 85}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${line.progress || 85}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. 产研线各阶段进度甘特矩阵 (产品、版本、进度: 需求、设计、研发、测试) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-600" />
            产研线全生命周期交付进度看板 (需求 → 设计 → 研发 → 测试)
          </h3>
          <button
            onClick={() => openPageTab('prod_versions')}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            版本详情 &gt;
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {productLines.map((line) => (
            <div
              key={line.id}
              className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="min-w-[200px]">
                <div className="font-bold text-slate-900 dark:text-white text-sm">{line.name}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">主干版本: V4.2.0 · 负责人: {line.ownerName}</div>
              </div>

              {/* 4 Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">1. 需求分析</span>
                    <span className="font-bold text-emerald-600">100%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-full" />
                  </div>
                </div>

                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">2. 交互与设计</span>
                    <span className="font-bold text-emerald-600">100%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-full" />
                  </div>
                </div>

                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">3. 核心研发</span>
                    <span className="font-bold text-blue-600">90%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full w-[90%]" />
                  </div>
                </div>

                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-500">4. QA测试验收</span>
                    <span className="font-bold text-amber-600">75%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full w-[75%]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 & 4. 2-Columns: 需求管理卡片 + Bug分布概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 需求管理 (卡片) - 信息: 需求名称、需求来源、负责人、关联客户、关联产品、当前进度、优先级 */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              当前活跃敏捷需求任务列表
            </h3>
            <button
              onClick={() => openPageTab('prod_requirements')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              查看全部需求 &gt;
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {requirementTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                onClick={() => openPageTab('prod_requirements')}
                className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-lg hover:border-blue-400 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusTag status={task.priority} />
                    <span className="font-bold text-slate-900 dark:text-white hover:text-blue-600">
                      {task.title}
                    </span>
                  </div>
                  <StatusTag status={task.status} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-500">
                  <div>关联产品: <span className="text-slate-700 dark:text-slate-300 font-medium">{task.productLineName}</span></div>
                  <div>关联客户: <span className="text-slate-700 dark:text-slate-300">{task.customerName || '国家电网华东分部'}</span></div>
                  <div>负责人: <span className="text-slate-700 dark:text-slate-300">{task.ownerName}</span></div>
                  <div>需求来源: 客户现场提报</div>
                  <div>截止日期: {task.dueDate}</div>
                  <div>工时评估: {task.estimatedHours}h</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Bug分布概览 (Bug数、进行中、已修复；严重程度分布、需求分布、状态分布) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Bug className="w-4 h-4 text-rose-500" />
              缺陷 Bug 质量与分布概览
            </h3>
            <button
              onClick={() => openPageTab('prod_bugs')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              缺陷列表 &gt;
            </button>
          </div>

          {/* Bug 3 Core Stats: Bug数、进行中、已修复 */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-center">
              <span className="text-slate-400 text-[11px]">Bug总数</span>
              <div className="font-bold text-slate-900 dark:text-white text-base mt-0.5 font-mono">
                {bugs.length + 16} 个
              </div>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-center">
              <span className="text-rose-600 dark:text-rose-400 text-[11px]">进行中待修</span>
              <div className="font-bold text-rose-600 dark:text-rose-400 text-base mt-0.5 font-mono">
                {bugs.filter((b) => b.status !== '已关闭').length} 个
              </div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-center">
              <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">已修复关闭</span>
              <div className="font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5 font-mono">
                18 个
              </div>
            </div>
          </div>

          {/* 严重程度分布 (Pie Chart) */}
          <div className="pt-2">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block mb-2">
              Bug 严重程度分布
            </span>
            <div className="flex items-center justify-between gap-2">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bugSeverityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={48}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {bugSeverityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 text-xs flex-1">
                {bugSeverityData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{item.value} 个</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 缺陷状态分布 */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
              缺陷处理状态流水线
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {bugStatusData.map((item) => (
                <div key={item.name} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <span className="text-slate-400 text-[10px] block">{item.name}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
