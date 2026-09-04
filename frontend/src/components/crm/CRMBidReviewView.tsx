import React, { useState } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sliders,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag, Modal } from '../common/UIComponents';
import { BidReview } from '../../types';

export const CRMBidReviewView: React.FC = () => {
  const { bidReviews, addBidReview, biddingProjects, openPageTab, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'win' | 'lost'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formProjectName, setFormProjectName] = useState(biddingProjects[0]?.projectName || '');
  const [formCustomerName, setFormCustomerName] = useState('国家电网华东分部');
  const [formResult, setFormResult] = useState<'中标' | '未中标' | '流标'>('中标');
  const [formBidAmount, setFormBidAmount] = useState(4800000);
  const [formWinningAmount, setFormWinningAmount] = useState(4800000);
  const [formWinner, setFormWinner] = useState('我司 (师创科技)');
  const [formTechScore, setFormTechScore] = useState(58.5);
  const [formCommScore, setFormCommScore] = useState(28.0);
  const [formReason, setFormReason] = useState('信创适配资质完备，现场技术述标演示直观清晰，获得专家一致高分');
  const [formSuggestions, setFormSuggestions] = useState('后续类似电力项目应保持方案深度，并提前两周锁定专家答辩团队');

  const filteredReviews = bidReviews.filter((r) => {
    const matchQ =
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reasonAnalysis.toLowerCase().includes(searchQuery.toLowerCase());
    const matchResult =
      activeTab === 'all' ||
      (activeTab === 'win' && r.result === '中标') ||
      (activeTab === 'lost' && r.result !== '中标');
    return matchQ && matchResult;
  });

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    addBidReview({
      biddingProjectId: `bid-${Date.now()}`,
      projectName: formProjectName,
      customerName: formCustomerName,
      result: formResult,
      bidAmount: Number(formBidAmount),
      winningAmount: Number(formWinningAmount),
      winner: formWinner,
      techScore: Number(formTechScore),
      commercialScore: Number(formCommScore),
      totalScore: Number(formTechScore) + Number(formCommScore) + 9.5,
      reasonAnalysis: formReason,
      suggestions: formSuggestions,
      createdAt: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 4 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="累计招投标复盘"
          value={bidReviews.length}
          unit="篇"
          subText="沉淀实战控标打法"
          icon={<RotateCcw className="w-5 h-5" />}
        />
        <StatCard
          title="中标经典案例"
          value={bidReviews.filter((r) => r.result === '中标').length}
          unit="标"
          change="标杆示范"
          isPositive={true}
          subText="平均技术得分 58/60"
          icon={<Award className="w-5 h-5" />}
          iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50"
        />
        <StatCard
          title="失标归因复盘"
          value={bidReviews.filter((r) => r.result !== '中标').length}
          unit="标"
          subText="价格/商务条款整改"
          icon={<AlertCircle className="w-5 h-5" />}
          iconBgColor="bg-rose-50 text-rose-600 dark:bg-rose-950/50"
        />
        <StatCard
          title="沉淀至知识库"
          value="12"
          unit="份"
          change="+3篇本月"
          isPositive={true}
          subText="全员协同借力"
          icon={<BookOpen className="w-5 h-5" />}
          iconBgColor="bg-purple-50 text-purple-600 dark:bg-purple-950/50"
          onClick={() => openPageTab('wb_knowledge')}
        />
      </div>

      {/* Toolbar & Subtabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              全部复盘 ({bidReviews.length})
            </button>
            <button
              onClick={() => setActiveTab('win')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'win'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              🏆 中标经验库
            </button>
            <button
              onClick={() => setActiveTab('lost')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                activeTab === 'lost'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              ⚠️ 丢标与教训复盘
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索复盘归因 / 客户 / 项目..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <button
          id="btn-add-bid-review"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          新增招投标复盘报告
        </button>
      </div>

      {/* Reviews Cards List */}
      <div className="space-y-4">
        {filteredReviews.map((r) => (
          <div
            key={r.id}
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4 text-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {r.projectName}
                  </span>
                  <StatusTag status={r.result} />
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  招标客户：{r.customerName} · 中标方：<strong>{r.winner}</strong> · 复盘归档：{r.createdAt}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400">我司报价 / 中标价</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    ¥{(r.bidAmount / 10000).toFixed(0)}万 / ¥{(r.winningAmount / 10000).toFixed(0)}万
                  </div>
                </div>
                <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-4">
                  <span className="text-[11px] text-slate-400">综合专家打分</span>
                  <div className="font-bold text-blue-600 text-base">{r.totalScore} 分</div>
                </div>
              </div>
            </div>

            {/* Score Breakdowns */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
              <div>
                <span className="text-slate-400 block text-[11px]">技术标得分 (满分60分)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{r.techScore} 分</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">商务标得分 (满分30分)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{r.commercialScore} 分</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">资信与案例分 (满分10分)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">9.5 分</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {r.result === '中标' ? '🏆 中标核心成功要素分析：' : '⚠️ 丢标主要原因归因分析：'}
                </span>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{r.reasonAnalysis}</p>
              </div>

              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 rounded-lg text-blue-800 dark:text-blue-300">
                <span className="font-semibold">面向后续类似项目的策略改进建议：</span>
                <p className="mt-0.5 leading-relaxed">{r.suggestions}</p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => addToast('success', '已成功将复盘报告推送到全员知识库', '全员可在【知识库 - 销售话术】中查阅借力')}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold text-xs"
              >
                <BookOpen className="w-3.5 h-3.5" />
                沉淀至公司招投标知识库
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Review Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新建招投标复盘总结"
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
              提交复盘归档
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveReview} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              复盘招标项目全称 *
            </label>
            <input
              type="text"
              required
              value={formProjectName}
              onChange={(e) => setFormProjectName(e.target.value)}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                招标客户主体
              </label>
              <input
                type="text"
                value={formCustomerName}
                onChange={(e) => setFormCustomerName(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                开标结果 *
              </label>
              <select
                value={formResult}
                onChange={(e) => setFormResult(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="中标">中标 (赢标)</option>
                <option value="未中标">未中标 (丢标)</option>
                <option value="流标">流标</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              核心归因与经验/教训深度剖析 *
            </label>
            <textarea
              rows={4}
              required
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="从技术方案偏离、参数控标有效性、价格竞争力及答辩现场表现等方面复盘..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              改进措施与建议
            </label>
            <textarea
              rows={2}
              value={formSuggestions}
              onChange={(e) => setFormSuggestions(e.target.value)}
              placeholder="对后续同类型项目的指导意义与避坑指南..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
