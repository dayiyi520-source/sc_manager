import React, { useState } from 'react';
import {
  Target,
  FileSpreadsheet,
  Plus,
  TrendingUp,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Send,
  Sliders,
  ChevronRight,
  Filter
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';
import { OKRItem, PerformanceReview } from '../../types';

export const OKRPerformanceView: React.FC = () => {
  const { okrs, addOKR, performances, addPerformanceReview, currentUser, addToast } = useApp();

  const [mainTab, setMainTab] = useState<'okrs' | 'reviews'>('okrs');

  // OKR Sub Tabs: 我的OKR、直属上级、直属下级、我部门的、其他部门
  const [okrCategoryTab, setOkrCategoryTab] = useState<
    'my' | 'supervisor' | 'subordinate' | 'department' | 'other_dept'
  >('my');
  const [selectedCycle, setSelectedCycle] = useState('2026-09');

  // Review Sub Tabs: 写总结、我的总结、我收到的
  const [reviewSubTab, setReviewSubTab] = useState<'write' | 'my' | 'received'>('write');
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);

  // Add OKR Modal State
  const [isAddOkrOpen, setIsAddOkrOpen] = useState(false);
  const [newOkrCycle, setNewOkrCycle] = useState('2026-09');
  const [newOkrAlignTo, setNewOkrAlignTo] = useState('公司年度战略目标：突破智能协同千万级标杆市场');
  const [newOkrObjective, setNewOkrObjective] = useState('');
  const [newOkrWeight, setNewOkrWeight] = useState(40);
  const [newOkrDeadline, setNewOkrDeadline] = useState('2026-09-30');
  const [newKr1Content, setNewKr1Content] = useState('');
  const [newKr1Weight, setNewKr1Weight] = useState(50);
  const [newKr2Content, setNewKr2Content] = useState('');
  const [newKr2Weight, setNewKr2Weight] = useState(50);

  // Write Review Form State
  const [reviewType, setReviewType] = useState<'week' | 'month'>('month');
  const [reviewCycleName, setReviewCycleName] = useState('2026年8月月度复盘总结');
  const [reviewSummary, setReviewSummary] = useState('');
  const [reviewUncompleted, setReviewUncompleted] = useState('');
  const [reviewSelfScore, setReviewSelfScore] = useState(90);
  const [reviewSuggestions, setReviewSuggestions] = useState('');
  const [reviewHelpNeeded, setReviewHelpNeeded] = useState('');
  const [reviewSendTo, setReviewSendTo] = useState('总经办, 部门主管');

  const matchesCategory = (o: OKRItem) => {
    if (okrCategoryTab === 'my') return o.category === 'my';
    if (okrCategoryTab === 'supervisor') return o.category === 'supervisor' || o.department.includes('总经办');
    if (okrCategoryTab === 'subordinate') return o.category === 'subordinate';
    if (okrCategoryTab === 'department') return o.category === 'department' || o.department === currentUser.department;
    return true;
  };
  const filteredOkrs = okrs.filter((o) => o.cycle === selectedCycle && matchesCategory(o));

  const handleSaveOkr = () => {
    if (!newOkrObjective.trim()) {
      addToast('warning', '请填写目标(O)内容');
      return;
    }
    addOKR({
      cycle: newOkrCycle,
      objective: newOkrObjective,
      weight: Number(newOkrWeight),
      deadline: newOkrDeadline,
      alignTo: newOkrAlignTo,
      keyResults: [
        {
          id: `kr-${Date.now()}-1`,
          content: newKr1Content || '按时按质推进关键业务指标达成',
          progress: 0,
          weight: Number(newKr1Weight),
          deadline: newOkrDeadline
        },
        {
          id: `kr-${Date.now()}-2`,
          content: newKr2Content || '保障团队协同与客户满意度不低于90分',
          progress: 0,
          weight: Number(newKr2Weight),
          deadline: newOkrDeadline
        }
      ]
    });
    setIsAddOkrOpen(false);
    setNewOkrObjective('');
    setNewKr1Content('');
    setNewKr2Content('');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewSummary.trim()) {
      addToast('warning', '请填写本期总结核心内容');
      return;
    }
    addPerformanceReview({
      type: reviewType,
      cycleName: reviewCycleName,
      summary: reviewSummary,
      uncompletedReason: reviewUncompleted,
      selfScore: Number(reviewSelfScore),
      suggestions: reviewSuggestions,
      helpNeeded: reviewHelpNeeded,
      sendTo: reviewSendTo.split(',').map((s) => s.trim())
    });
    setReviewSubTab('my');
    setIsReviewFormOpen(false);
  };

  const openReviewForm = (type: 'week' | 'month') => {
    setReviewType(type);
    setReviewCycleName(type === 'week' ? '2026年第36周复盘总结' : '2026年8月月度复盘总结');
    setIsReviewFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Main Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            id="tab-okrs"
            onClick={() => setMainTab('okrs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mainTab === 'okrs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            目标 OKRs
          </button>
          <button
            id="tab-reviews"
            onClick={() => {
              setMainTab('reviews');
              setIsReviewFormOpen(false);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mainTab === 'reviews'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            复盘总结
          </button>
        </div>

        {mainTab === 'okrs' && (
          <div className="flex items-center gap-3">
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="2026-09">2026年09月（当前月份）</option>
              <option value="2026-08">2026年08月（上月）</option>
              <option value="2026-07">2026年07月（已归档）</option>
              <option value="2026-06">2026年06月（已归档）</option>
            </select>

            <button
              id="btn-add-okr"
              onClick={() => setIsAddOkrOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加目标
            </button>
          </div>
        )}
      </div>

      {/* Main Tab 1: OKRs */}
      {mainTab === 'okrs' && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setOkrCategoryTab('my')}
              className={`pb-2.5 px-3 font-medium transition-colors border-b-2 ${
                okrCategoryTab === 'my'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              我的 OKR
            </button>
            <button
              onClick={() => setOkrCategoryTab('supervisor')}
              className={`pb-2.5 px-3 font-medium transition-colors border-b-2 ${
                okrCategoryTab === 'supervisor'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              直属上级 OKR
            </button>
            <button
              onClick={() => setOkrCategoryTab('subordinate')}
              className={`pb-2.5 px-3 font-medium transition-colors border-b-2 ${
                okrCategoryTab === 'subordinate'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              直属下级 OKR
            </button>
            <button
              onClick={() => setOkrCategoryTab('department')}
              className={`pb-2.5 px-3 font-medium transition-colors border-b-2 ${
                okrCategoryTab === 'department'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              我部门的 OKR
            </button>
            <button
              onClick={() => setOkrCategoryTab('other_dept')}
              className={`pb-2.5 px-3 font-medium transition-colors border-b-2 ${
                okrCategoryTab === 'other_dept'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              跨部门协同 OKR
            </button>
          </div>

          {okrCategoryTab === 'my' && isAddOkrOpen && (
            <form
              onSubmit={(event) => { event.preventDefault(); handleSaveOkr(); }}
              className="rounded-xl border border-blue-500 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800/60 text-xs">
                <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">O1</span><span className="font-semibold text-slate-800 dark:text-slate-200">添加目标</span><span className="text-slate-400">{newOkrCycle.replace('-', '年')}月</span></div>
                <span className="text-slate-400">填写完成后提交主管确认</span>
              </div>
              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px] gap-3">
                  <input type="text" required value={newOkrObjective} onChange={(e) => setNewOkrObjective(e.target.value)} placeholder="输入目标名称：明确你想要达成什么，不写含糊概括的目标" className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                  <select value={newOkrCycle} onChange={(e) => setNewOkrCycle(e.target.value)} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"><option value="2026-09">2026年09月</option><option value="2026-08">2026年08月</option><option value="2026-07">2026年07月</option></select>
                  <input type="number" value={newOkrWeight} onChange={(e) => setNewOkrWeight(Number(e.target.value))} min="0" max="100" placeholder="权重 %" className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                </div>
                <input type="text" value={newOkrAlignTo} onChange={(e) => setNewOkrAlignTo(e.target.value)} placeholder="+ 选择对齐目标" className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                <textarea rows={2} value={newKr1Content} onChange={(e) => setNewKr1Content(e.target.value)} placeholder="KR1 关键结果：遵循 SMART 原则，具体、可衡量、可达成、相关性、时效性" className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                <input type="date" value={newOkrDeadline} onChange={(e) => setNewOkrDeadline(e.target.value)} className="w-full md:w-56 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"><button type="button" onClick={() => setIsAddOkrOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">取消</button><button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">提交主管确认</button></div>
              </div>
            </form>
          )}

          {/* OKR Cards List */}
          <div className="space-y-4">
            {filteredOkrs.length === 0 ? (
              <div className="review-empty-state flex flex-col items-center justify-center rounded-xl border border-dashed p-10 sm:p-14 text-center">
                <div className="review-empty-icon mb-4 flex items-center justify-center"><Target className="h-9 w-9 text-blue-600 dark:text-blue-400" /></div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">本月暂无目标</h3>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">当前月份还没有填写 OKR，点击右上角“添加目标”开始设定。</p>
              </div>
            ) : filteredOkrs.map((okr, oIdx) => (
              <div
                key={okr.id}
                className="tech-list-item bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4"
              >
                {/* Header of OKR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-bold">
                        O{oIdx + 1}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {okr.objective}
                      </h3>
                    </div>
                    {okr.alignTo && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">
                          对齐目标
                        </span>
                        <span>{okr.alignTo}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">综合进度</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{okr.progress}%</div>
                    </div>
                    <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-4">
                      <div className="text-xs text-slate-400">责任人 / 周期</div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {okr.ownerName} ({okr.cycle})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${okr.progress}%` }}
                  />
                </div>

                {/* Key Results list */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    支撑关键成果 (Key Results)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {okr.keyResults.map((kr, idx) => (
                      <div
                        key={kr.id}
                        className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            KR{idx + 1}: {kr.content}
                          </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">
                            {kr.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${kr.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>权重: {kr.weight}%</span>
                          <span>截止: {kr.deadline}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Tab 2: 目标复盘总结 */}
      {mainTab === 'reviews' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setReviewSubTab('write');
                  setIsReviewFormOpen(false);
                }}
                className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
                  reviewSubTab === 'write'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                写复盘总结
              </button>
              <button
                onClick={() => setReviewSubTab('my')}
                className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
                  reviewSubTab === 'my'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                我的复盘列表 ({performances.filter((p) => p.author === currentUser.name).length})
              </button>
              <button
                onClick={() => setReviewSubTab('received')}
                className={`pb-2.5 px-3 font-semibold transition-colors border-b-2 ${
                  reviewSubTab === 'received'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                我收到的复盘 ({performances.length})
              </button>
            </div>
          </div>

          {/* Subtab: 写总结 */}
          {reviewSubTab === 'write' && !isReviewFormOpen && (
            <div className="review-empty-state flex flex-col items-center justify-center rounded-xl border border-dashed p-10 sm:p-14 text-center">
              <div className="review-empty-icon mb-4 flex items-center justify-center">
                <FileSpreadsheet className="h-9 w-9 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">暂无需要填写的总结</h3>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                选择复盘周期后开始记录本阶段的工作成果与改进计划
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => openReviewForm('week')}
                  className="tech-button-secondary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  周复盘
                </button>
                <button
                  type="button"
                  onClick={() => openReviewForm('month')}
                  className="tech-button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  月度复盘
                </button>
              </div>
            </div>
          )}

          {reviewSubTab === 'write' && isReviewFormOpen && (
            <form
              onSubmit={handleSubmitReview}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5 text-xs max-w-4xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  填写周期复盘与述职报告
                </h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="rtype"
                      checked={reviewType === 'week'}
                      onChange={() => {
                        setReviewType('week');
                        setReviewCycleName('2026年第36周复盘总结');
                      }}
                      className="text-blue-600"
                    />
                    <span>周工作总结</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="rtype"
                      checked={reviewType === 'month'}
                      onChange={() => {
                        setReviewType('month');
                        setReviewCycleName('2026年8月月度复盘总结');
                      }}
                      className="text-blue-600"
                    />
                    <span>月度复盘述职</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    总结周期名称 *
                  </label>
                  <input
                    type="text"
                    value={reviewCycleName}
                    onChange={(e) => setReviewCycleName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    个人绩效自评得分 (0-100分) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={reviewSelfScore}
                    onChange={(e) => setReviewSelfScore(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  本月 / 本周核心工作总结 *
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewSummary}
                  onChange={(e) => setReviewSummary(e.target.value)}
                  placeholder="详细列举本周期主导完成的重点事项、突破成果及交付里程碑..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  本月 / 本周未完成任务说明及原因归因分析
                </label>
                <textarea
                  rows={2}
                  value={reviewUncompleted}
                  onChange={(e) => setReviewUncompleted(e.target.value)}
                  placeholder="未达标事项、滞后原因分析与下阶段补救措施..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    对公司管理意见或建议
                  </label>
                  <textarea
                    rows={2}
                    value={reviewSuggestions}
                    onChange={(e) => setReviewSuggestions(e.target.value)}
                    placeholder="业务协同、流程机制或研发支持建议..."
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    需要协助 / 协调事项
                  </label>
                  <textarea
                    rows={2}
                    value={reviewHelpNeeded}
                    onChange={(e) => setReviewHelpNeeded(e.target.value)}
                    placeholder="需要跨部门支持、预算资源或高管协调事项..."
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  发送参与人 (多个逗号隔开)
                </label>
                <input
                  type="text"
                  value={reviewSendTo}
                  onChange={(e) => setReviewSendTo(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                  提交复盘总结
                </button>
              </div>
            </form>
          )}

          {/* Subtab: 看总结 */}
          {(reviewSubTab === 'my' || reviewSubTab === 'received') && (
            <div className="space-y-4">
              {performances.map((perf) => (
                <div
                  key={perf.id}
                  className="tech-list-item bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {perf.cycleName}
                        </span>
                        <StatusTag status={perf.status} />
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        述职人：{perf.author} ({perf.authorDept}) · 提交时间：{perf.createdAt}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-slate-400 text-[11px]">自评分</span>
                        <div className="font-bold text-blue-600 text-sm">{perf.selfScore}分</div>
                      </div>
                      {perf.leaderScore && (
                        <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-3">
                          <span className="text-slate-400 text-[11px]">领导考评分</span>
                          <div className="font-bold text-emerald-600 text-sm">{perf.leaderScore}分</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">工作成果总结：</span>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{perf.summary}</p>
                    </div>

                    {perf.uncompletedReason && (
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">未完成事项说明：</span>
                        <p className="text-slate-600 dark:text-slate-300 mt-0.5">{perf.uncompletedReason}</p>
                      </div>
                    )}

                    {perf.feedback && (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-emerald-800 dark:text-emerald-300">
                        <span className="font-semibold">主管批复与评价：</span>
                        <p className="mt-0.5">{perf.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
