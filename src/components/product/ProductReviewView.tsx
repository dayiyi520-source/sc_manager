import React, { useState } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  Rocket,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  BookOpen,
  Boxes
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';

export const ProductReviewView: React.FC = () => {
  const { versions, openPageTab, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [reviews, setReviews] = useState([
    {
      id: 'rev-1',
      versionCode: 'V4.1.0',
      title: 'V4.1.0 信创达梦与人大金仓全栈适配上线复盘',
      date: '2026-06-25',
      team: '架构组 + 核心研发组 (李工、赵工)',
      deliveryScore: 95,
      summary: '全量达梦驱动性能压测表现优异，通过公安部三级等保测试。研发阶段在多数据源切换上耗时超出预期，需强化方言适配自动化用例。',
      actionItems: '1. 沉淀《信创多数据库方言无感转换开发规范》；2. 增加达梦集群自动化夜间压测流水线。'
    },
    {
      id: 'rev-2',
      versionCode: 'V4.0.0',
      title: 'V4.0.0 数字化协同中枢架构大版本重构交付复盘',
      date: '2026-03-30',
      team: '全栈产研团队 (18人)',
      deliveryScore: 92,
      summary: '微服务重构完成，页面渲染速度提升45%，并发承载能力翻倍。老版本数据平滑迁移脚本在测试环境遇到兼容性问题，经过48小时攻坚顺利解决。',
      actionItems: '1. 制定统一数据字典迁移白皮书；2. 建立大客户版本灰度发布演练机制。'
    }
  ]);

  const [formTitle, setFormTitle] = useState('');
  const [formVersion, setFormVersion] = useState('V4.2.0');
  const [formSummary, setFormSummary] = useState('');
  const [formActionItems, setFormActionItems] = useState('');

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      addToast('warning', '请填写复盘标题');
      return;
    }

    setReviews([
      {
        id: `rev-${Date.now()}`,
        versionCode: formVersion,
        title: formTitle,
        date: new Date().toISOString().split('T')[0],
        team: '产研核心小组',
        deliveryScore: 94,
        summary: formSummary || '版本研发进度可控，交付质量达标。',
        actionItems: formActionItems || '1. 持续跟踪线上监控；2. 沉淀研发经验文档。'
      },
      ...reviews
    ]);
    setIsModalOpen(false);
    addToast('success', '版本复盘报告已归档');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="累计产研复盘"
          value={reviews.length}
          unit="期"
          subText="持续精进交付质量"
          icon={<RotateCcw className="w-5 h-5" />}
        />
        <StatCard
          title="版本准时交付率"
          value="93.5"
          unit="%"
          change="+2.4% 环比"
          isPositive={true}
          subText="敏捷迭代节奏稳定"
          icon={<Clock className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="清理技术债务"
          value="16"
          unit="项"
          change="架构演进"
          isPositive={true}
          subText="单测覆盖率 88.5%"
          icon={<Boxes className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
        />
        <StatCard
          title="客户交付满意度"
          value="96.8"
          unit="分"
          subText="大客户现场验收满意"
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索复盘报告 / 版本 / 总结关键词..."
            className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white w-72"
          />
        </div>

        <button
          id="btn-add-product-review"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新增版本交付复盘
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews
          .filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.summary.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs">
                    {r.versionCode}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{r.title}</h4>
                    <span className="text-[11px] text-slate-400">
                      复盘时间：{r.date} · 参会团队：{r.team}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">交付综合评分</span>
                  <span className="font-bold text-emerald-600 text-base">{r.deliveryScore} 分</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">🔍 研发与交付全景复盘总结：</span>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                  {r.summary}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">🎯 后续落地改进清单 (Action Items)：</span>
                <p className="text-blue-800 dark:text-blue-300 mt-1 leading-relaxed bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 p-3 rounded-lg">
                  {r.actionItems}
                </p>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => addToast('success', '已归档至知识库', '全员可在【知识库 - 研发规范】中查阅该复盘成果')}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  沉淀至产研知识库
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新建版本上线交付复盘"
        footer={
          <>
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              onClick={handleSaveReview}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              提交复盘总结
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveReview} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              复盘主题名称 *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="如：V4.2.0 智能协同中枢封版上线交付复盘"
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              对应交付版本 *
            </label>
            <select
              value={formVersion}
              onChange={(e) => setFormVersion(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.code}>
                  {v.code} - {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              研发与交付复盘剖析 *
            </label>
            <textarea
              rows={4}
              required
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              placeholder="总结版本研发按期率、冒烟测试通过情况、架构性能突破与遇到的阻塞问题..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              改进措施与后续行动项 (Action Items)
            </label>
            <textarea
              rows={3}
              value={formActionItems}
              onChange={(e) => setFormActionItems(e.target.value)}
              placeholder="1. 改进点一；2. 改进点二；3. 架构优化清单..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
