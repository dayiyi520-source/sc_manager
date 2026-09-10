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
  Send,
  ChevronRight,
} from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatCard, StatusTag } from '../common/UIComponents';
import { StatusBadge, FormInput, FormTextarea, message } from '@/components/common';
import { OKRItem } from '../../types';

type MainTabType = 'okrs' | 'reviews';
type OkrCategoryType = 'my' | 'supervisor' | 'subordinate' | 'department' | 'other_dept';
type ReviewSubTabType = 'write' | 'my' | 'received';
type ReviewType = 'week' | 'month';

export const OKRPerformanceView: React.FC = () => {
  const { okrs, addOKR, performances, addPerformanceReview, currentUser } = useApp();

  const [mainTab, setMainTab] = useState<MainTabType>('okrs');
  const [okrCategoryTab, setOkrCategoryTab] = useState<OkrCategoryType>('my');
  const [selectedCycle, setSelectedCycle] = useState('2026-09');
  const [reviewSubTab, setReviewSubTab] = useState<ReviewSubTabType>('write');
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);

  // 新增OKR表单状态
  const [isAddOkrOpen, setIsAddOkrOpen] = useState(false);
  const [newOkrForm, setNewOkrForm] = useState({
    cycle: '2026-09',
    alignTo: '公司年度战略目标:突破智能协同千万级标杆市场',
    objective: '',
    weight: 40,
    deadline: '2026-09-30',
    kr1Content: '',
    kr1Weight: 50,
    kr2Content: '',
    kr2Weight: 50,
  });

  // 复盘总结表单状态
  const [reviewForm, setReviewForm] = useState({
    type: 'month' as ReviewType,
    cycleName: '2026年8月月度复盘总结',
    summary: '',
    uncompleted: '',
    selfScore: 90,
    suggestions: '',
    helpNeeded: '',
    sendTo: '总经办, 部门主管',
  });

  // 筛选OKR
  const matchesCategory = (o: OKRItem) => {
    if (okrCategoryTab === 'my') return o.category === 'my';
    if (okrCategoryTab === 'supervisor') return o.category === 'supervisor' || o.department.includes('总经办');
    if (okrCategoryTab === 'subordinate') return o.category === 'subordinate';
    if (okrCategoryTab === 'department') return o.category === 'department' || o.department === currentUser.department;
    return true;
  };
  const filteredOkrs = okrs.filter((o) => o.cycle === selectedCycle && matchesCategory(o));

  // 统计数据
  const totalOkrs = okrs.length;
  const avgProgress = okrs.length > 0
    ? Math.round(okrs.reduce((sum, o) => sum + o.progress, 0) / okrs.length)
    : 0;
  const completedOkrs = okrs.filter((o) => o.progress >= 100).length;
  const pendingReviews = performances.filter((p) => p.status === '待审阅').length;

  // Tab按钮组件
  const TabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
        active
          ? 'bg-[var(--primary)] text-white shadow-sm'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-soft)]'
      }`}
    >
      {children}
    </button>
  );

  const SmallTabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md font-medium text-xs transition-colors ${
        active
          ? 'bg-[var(--bg-surface)] text-[var(--primary)] shadow-sm'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {children}
    </button>
  );

  // 保存OKR
  const handleSaveOkr = () => {
    if (!newOkrForm.objective.trim()) {
      message.warning('请填写目标(O)内容');
      return;
    }
    addOKR({
      cycle: newOkrForm.cycle,
      objective: newOkrForm.objective,
      weight: newOkrForm.weight,
      deadline: newOkrForm.deadline,
      alignTo: newOkrForm.alignTo,
      keyResults: [
        {
          id: `kr-${Date.now()}-1`,
          content: newOkrForm.kr1Content || '按时按质推进关键业务指标达成',
          progress: 0,
          weight: newOkrForm.kr1Weight,
          deadline: newOkrForm.deadline
        },
        {
          id: `kr-${Date.now()}-2`,
          content: newOkrForm.kr2Content || '保障团队协同与客户满意度不低于90分',
          progress: 0,
          weight: newOkrForm.kr2Weight,
          deadline: newOkrForm.deadline
        }
      ]
    });
    setIsAddOkrOpen(false);
    setNewOkrForm({
      ...newOkrForm,
      objective: '',
      kr1Content: '',
      kr2Content: '',
    });
    message.success('OKR创建成功');
  };

  // 提交复盘总结
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.summary.trim()) {
      message.warning('请填写本期总结核心内容');
      return;
    }
    addPerformanceReview({
      type: reviewForm.type,
      cycleName: reviewForm.cycleName,
      summary: reviewForm.summary,
      uncompletedReason: reviewForm.uncompleted,
      selfScore: reviewForm.selfScore,
      suggestions: reviewForm.suggestions,
      helpNeeded: reviewForm.helpNeeded,
      sendTo: reviewForm.sendTo.split(',').map((s) => s.trim())
    });
    setReviewSubTab('my');
    setIsReviewFormOpen(false);
    message.success('复盘总结提交成功');
  };

  const openReviewForm = (type: ReviewType) => {
    setReviewForm({
      ...reviewForm,
      type,
      cycleName: type === 'week' ? '2026年第36周复盘总结' : '2026年8月月度复盘总结',
    });
    setIsReviewFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 顶部主导航 */}
      <div className="flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-2">
        <TabButton
          active={mainTab === 'okrs'}
          onClick={() => setMainTab('okrs')}
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            OKR目标管理
          </div>
        </TabButton>
        <TabButton
          active={mainTab === 'reviews'}
          onClick={() => setMainTab('reviews')}
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            绩效复盘总结
          </div>
        </TabButton>
      </div>

      {/* OKR目标管理 */}
      {mainTab === 'okrs' && (
        <>
          {/* 核心指标 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="OKR总数"
              value={totalOkrs}
              unit="个"
              icon={<Target className="w-5 h-5" />}
              iconBgColor="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
            />
            <StatCard
              title="平均完成率"
              value={avgProgress}
              unit="%"
              icon={<TrendingUp className="w-5 h-5" />}
              iconBgColor="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
            />
            <StatCard
              title="已达成"
              value={completedOkrs}
              unit="个"
              icon={<CheckCircle2 className="w-5 h-5" />}
              iconBgColor="bg-green-50 text-green-600 dark:bg-green-950/50 dark:text-green-400"
            />
            <StatCard
              title="待审阅总结"
              value={pendingReviews}
              unit="份"
              icon={<FileSpreadsheet className="w-5 h-5" />}
              iconBgColor="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
            />
          </div>

          {/* OKR分类标签 */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">查看范围:</span>
                <div className="flex bg-[var(--bg-surface-soft)] rounded-lg p-0.5 gap-1 flex-wrap">
                  <SmallTabButton
                    active={okrCategoryTab === 'my'}
                    onClick={() => setOkrCategoryTab('my')}
                  >
                    我的OKR
                  </SmallTabButton>
                  <SmallTabButton
                    active={okrCategoryTab === 'supervisor'}
                    onClick={() => setOkrCategoryTab('supervisor')}
                  >
                    直属上级
                  </SmallTabButton>
                  <SmallTabButton
                    active={okrCategoryTab === 'subordinate'}
                    onClick={() => setOkrCategoryTab('subordinate')}
                  >
                    直属下级
                  </SmallTabButton>
                  <SmallTabButton
                    active={okrCategoryTab === 'department'}
                    onClick={() => setOkrCategoryTab('department')}
                  >
                    我部门的
                  </SmallTabButton>
                  <SmallTabButton
                    active={okrCategoryTab === 'other_dept'}
                    onClick={() => setOkrCategoryTab('other_dept')}
                  >
                    其他部门
                  </SmallTabButton>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedCycle}
                  onChange={(e) => setSelectedCycle(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg"
                >
                  <option value="2026-09">2026年9月</option>
                  <option value="2026-08">2026年8月</option>
                  <option value="2026-Q3">2026年Q3</option>
                </select>
                <button
                  onClick={() => setIsAddOkrOpen(true)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新增OKR
                </button>
              </div>
            </div>

            {/* OKR列表 */}
            <div className="space-y-4">
              {filteredOkrs.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <div className="text-sm">该筛选条件下暂无OKR</div>
                </div>
              ) : (
                filteredOkrs.map((okr) => (
                  <div
                    key={okr.id}
                    className="p-5 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-bold text-base text-[var(--text-primary)]">
                            {okr.objective}
                          </span>
                          <StatusBadge status={okr.progress >= 100 ? '已达成' : '进行中'} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] flex-wrap">
                          <span>负责人: {okr.owner}</span>
                          <span>•</span>
                          <span>部门: {okr.department}</span>
                          <span>•</span>
                          <span>周期: {okr.cycle}</span>
                          <span>•</span>
                          <span>截止: {okr.deadline}</span>
                        </div>
                        {okr.alignTo && (
                          <div className="mt-2 text-xs text-[var(--text-body)]">
                            对齐: {okr.alignTo}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-[var(--primary)]">
                          {okr.progress}%
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          权重 {okr.weight}%
                        </div>
                      </div>
                    </div>

                    {/* 关键结果 */}
                    <div className="space-y-3">
                      {okr.keyResults.map((kr, idx) => (
                        <div
                          key={kr.id}
                          className="p-3 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm text-[var(--text-primary)] font-medium">
                              KR{idx + 1}: {kr.content}
                            </span>
                            <span className="font-semibold text-[var(--text-primary)] shrink-0">
                              {kr.progress}%
                            </span>
                          </div>
                          <div className="w-full bg-[var(--bg-main)] rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-[var(--primary)] rounded-full transition-all"
                              style={{ width: `${kr.progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>权重: {kr.weight}%</span>
                            <span>截止: {kr.deadline}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* 绩效复盘总结 */}
      {mainTab === 'reviews' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-main)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex bg-[var(--bg-surface-soft)] rounded-lg p-0.5">
                <SmallTabButton
                  active={reviewSubTab === 'write'}
                  onClick={() => setReviewSubTab('write')}
                >
                  写总结
                </SmallTabButton>
                <SmallTabButton
                  active={reviewSubTab === 'my'}
                  onClick={() => setReviewSubTab('my')}
                >
                  我的总结
                </SmallTabButton>
                <SmallTabButton
                  active={reviewSubTab === 'received'}
                  onClick={() => setReviewSubTab('received')}
                >
                  我收到的
                </SmallTabButton>
              </div>
            </div>

            {reviewSubTab === 'write' && (
              <div className="flex gap-2">
                <button
                  onClick={() => openReviewForm('week')}
                  className="px-4 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  周报复盘
                </button>
                <button
                  onClick={() => openReviewForm('month')}
                  className="px-4 py-1.5 bg-[var(--success)] hover:bg-[var(--success)]/90 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  月度复盘
                </button>
              </div>
            )}
          </div>

          <div className="p-5">
            {/* 写总结表单 */}
            {reviewSubTab === 'write' && isReviewFormOpen && (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <FormInput
                  label="复盘周期名称"
                  value={reviewForm.cycleName}
                  onChange={(e) => setReviewForm({ ...reviewForm, cycleName: e.target.value })}
                  placeholder="例: 2026年8月月度复盘总结"
                  required
                />

                <FormTextarea
                  label="本期总结核心内容"
                  value={reviewForm.summary}
                  onChange={(e) => setReviewForm({ ...reviewForm, summary: e.target.value })}
                  placeholder="回顾本期关键任务完成情况、核心业绩指标、团队协作亮点..."
                  rows={4}
                  required
                />

                <FormTextarea
                  label="未完成事项说明"
                  value={reviewForm.uncompleted}
                  onChange={(e) => setReviewForm({ ...reviewForm, uncompleted: e.target.value })}
                  placeholder="说明未按期完成的事项及原因..."
                  rows={2}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      自评分 (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={reviewForm.selfScore}
                      onChange={(e) => setReviewForm({ ...reviewForm, selfScore: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg"
                    />
                  </div>
                </div>

                <FormTextarea
                  label="改进建议与下期计划"
                  value={reviewForm.suggestions}
                  onChange={(e) => setReviewForm({ ...reviewForm, suggestions: e.target.value })}
                  placeholder="针对本期不足提出改进措施,以及下期工作重点..."
                  rows={3}
                />

                <FormTextarea
                  label="需要协助/协调事项"
                  value={reviewForm.helpNeeded}
                  onChange={(e) => setReviewForm({ ...reviewForm, helpNeeded: e.target.value })}
                  placeholder="需要跨部门支持、预算资源或高管协调事项..."
                  rows={2}
                />

                <FormInput
                  label="发送参与人 (多个逗号隔开)"
                  value={reviewForm.sendTo}
                  onChange={(e) => setReviewForm({ ...reviewForm, sendTo: e.target.value })}
                  placeholder="总经办, 部门主管"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewFormOpen(false)}
                    className="px-5 py-2.5 border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg font-semibold text-sm hover:bg-[var(--bg-surface-soft)] transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-lg font-semibold text-sm transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    提交复盘总结
                  </button>
                </div>
              </form>
            )}

            {reviewSubTab === 'write' && !isReviewFormOpen && (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <div className="text-sm mb-4">选择周报或月度复盘开始填写总结</div>
              </div>
            )}

            {/* 查看总结列表 */}
            {(reviewSubTab === 'my' || reviewSubTab === 'received') && (
              <div className="space-y-4">
                {performances.length === 0 ? (
                  <div className="text-center py-12 text-[var(--text-muted)]">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <div className="text-sm">暂无复盘总结</div>
                  </div>
                ) : (
                  performances.map((perf) => (
                    <div
                      key={perf.id}
                      className="p-5 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-main)] pb-3 gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-base text-[var(--text-primary)]">
                              {perf.cycleName}
                            </span>
                            <StatusBadge status={perf.status} />
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            述职人: {perf.author} ({perf.authorDept}) · 提交时间: {perf.createdAt}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs text-[var(--text-muted)]">自评分</span>
                            <div className="font-bold text-[var(--primary)] text-lg">
                              {perf.selfScore}分
                            </div>
                          </div>
                          {perf.leaderScore && (
                            <div className="text-right border-l border-[var(--border-main)] pl-3">
                              <span className="text-xs text-[var(--text-muted)]">领导考评分</span>
                              <div className="font-bold text-[var(--success)] text-lg">
                                {perf.leaderScore}分
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-semibold text-[var(--text-primary)]">工作成果总结:</span>
                          <p className="text-[var(--text-body)] mt-1 leading-relaxed">
                            {perf.summary}
                          </p>
                        </div>

                        {perf.uncompletedReason && (
                          <div>
                            <span className="font-semibold text-[var(--text-primary)]">未完成事项说明:</span>
                            <p className="text-[var(--text-body)] mt-1">{perf.uncompletedReason}</p>
                          </div>
                        )}

                        {perf.feedback && (
                          <div className="p-3 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg">
                            <span className="font-semibold text-[var(--success)]">主管批复与评价:</span>
                            <p className="text-[var(--text-body)] mt-1">{perf.feedback}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 新增OKR模态框 */}
      {isAddOkrOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between sticky top-0 bg-[var(--bg-surface)] z-10">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">新增OKR</h3>
              <button
                onClick={() => setIsAddOkrOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="周期"
                  value={newOkrForm.cycle}
                  onChange={(e) => setNewOkrForm({ ...newOkrForm, cycle: e.target.value })}
                />
                <FormInput
                  label="截止日期"
                  type="date"
                  value={newOkrForm.deadline}
                  onChange={(e) => setNewOkrForm({ ...newOkrForm, deadline: e.target.value })}
                />
              </div>

              <FormInput
                label="对齐上级目标"
                value={newOkrForm.alignTo}
                onChange={(e) => setNewOkrForm({ ...newOkrForm, alignTo: e.target.value })}
              />

              <FormTextarea
                label="目标(O) *"
                value={newOkrForm.objective}
                onChange={(e) => setNewOkrForm({ ...newOkrForm, objective: e.target.value })}
                placeholder="输入本周期核心目标..."
                rows={2}
                required
              />

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  权重 (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newOkrForm.weight}
                  onChange={(e) => setNewOkrForm({ ...newOkrForm, weight: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg"
                />
              </div>

              <div className="border-t border-[var(--border-main)] pt-4">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  关键结果 (Key Results)
                </h4>

                <div className="space-y-4">
                  <div>
                    <FormInput
                      label="KR1 内容"
                      value={newOkrForm.kr1Content}
                      onChange={(e) => setNewOkrForm({ ...newOkrForm, kr1Content: e.target.value })}
                      placeholder="具体可量化的关键结果..."
                    />
                    <div className="mt-2">
                      <label className="block text-xs text-[var(--text-muted)] mb-1">权重 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newOkrForm.kr1Weight}
                        onChange={(e) => setNewOkrForm({ ...newOkrForm, kr1Weight: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <FormInput
                      label="KR2 内容"
                      value={newOkrForm.kr2Content}
                      onChange={(e) => setNewOkrForm({ ...newOkrForm, kr2Content: e.target.value })}
                      placeholder="具体可量化的关键结果..."
                    />
                    <div className="mt-2">
                      <label className="block text-xs text-[var(--text-muted)] mb-1">权重 (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newOkrForm.kr2Weight}
                        onChange={(e) => setNewOkrForm({ ...newOkrForm, kr2Weight: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-[var(--bg-surface)] pb-2">
                <button
                  type="button"
                  onClick={() => setIsAddOkrOpen(false)}
                  className="px-5 py-2.5 border border-[var(--border-main)] text-[var(--text-primary)] rounded-lg font-semibold text-sm hover:bg-[var(--bg-surface-soft)] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveOkr}
                  className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white rounded-lg font-semibold text-sm transition-colors"
                >
                  保存OKR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
