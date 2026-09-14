import React, { useState } from 'react';
import { Alert, Button, Empty, Form, Input, InputNumber, Progress, Radio, Cascader, Select, Spin, Tag, Tabs } from 'antd';
import Card from 'antd/es/card/Card';
import dayjs from 'dayjs';
import { useOriginalOkr } from './okr/useOriginalOkr';
import { completedWorkInPeriod, reviewPeriod } from './okr/simpleReview';
import { Target, FileSpreadsheet, Plus, Calendar, Send } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { OkrProvider } from './okr/OkrProvider';
import './okr/originalOkr.css';
import { cycleOptions } from './okr/cycleOptions';
import { OKRItem } from '../../types';
import { ObjectiveForm } from './okr/ObjectiveForm';

export const OKRPerformanceView: React.FC = () => <OkrProvider><OriginalWorkspace/></OkrProvider>;
const OriginalWorkspace: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { records, okrs, performances, people, work, loading, error, workLoading, workError, refresh, refreshWork, saveObjective, saveReview, busy } = useOriginalOkr();

  const [mainTab, setMainTab] = useState<'okrs' | 'reviews'>('okrs');

  // OKR Sub Tabs: 我的OKR、直属上级、直属下级、我部门的、其他部门
  const [okrCategoryTab, setOkrCategoryTab] = useState<
    'my' | 'supervisor' | 'subordinate' | 'department' | 'other_dept'
  >('my');
  const [selectedCycles, setSelectedCycles] = useState<string[]>([dayjs().format('YYYY-MM')]);

  // Review Sub Tabs: 写总结、我的总结、我收到的
  const [reviewSubTab, setReviewSubTab] = useState<'write' | 'my' | 'received'>('write');
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);

  // Add OKR Modal State
  const [isAddOkrOpen, setIsAddOkrOpen] = useState(false);
  const newOkrCycle = dayjs().format('YYYY-MM');

  // Write Review Form State
  const [reviewType, setReviewType] = useState<'week' | 'month'>('month');
  const [reviewCycleName, setReviewCycleName] = useState('2026年8月月度复盘总结');
  const [reviewSummary, setReviewSummary] = useState('');
  const [reviewUncompleted, setReviewUncompleted] = useState('');
  const [reviewSelfScore, setReviewSelfScore] = useState(90);
  const [reviewSuggestions, setReviewSuggestions] = useState('');
  const [reviewHelpNeeded, setReviewHelpNeeded] = useState('');
  const [reviewSendTo, setReviewSendTo] = useState('总经办, 部门主管');

  const [selectedWorkIds, setSelectedWorkIds] = useState<string[]>([]);
  const period = reviewPeriod(reviewType);
  const candidates = completedWorkInPeriod(work, period.startDate, period.endDate);
  const me = people.find(p => p.id === currentUser.id);
  const parents = okrs.filter(o => o.ownerId === me?.supervisorId && o.cycle === newOkrCycle && o.status === 'active');
  const periods = cycleOptions(records, currentUser.id);
  const cyclePaths = periods.flatMap(group=>group.children.filter(c=>selectedCycles.includes(c.value)).map(c=>[group.value,c.value]));
  const cycleLabel = selectedCycles.length === 1 ? `周期：${dayjs(selectedCycles[0]).format('YYYY年MM月')}` : `周期：${selectedCycles.length}个周期`;

  const matchesCategory = (o: OKRItem) => {
    if (okrCategoryTab === 'my') return o.category === 'my';
    if (okrCategoryTab === 'supervisor') return o.category === 'supervisor';
    if (okrCategoryTab === 'subordinate') return o.category === 'subordinate';
    if (okrCategoryTab === 'department') return o.category === 'department' || o.department === currentUser.department;
    return o.department !== currentUser.department;
  };
  const filteredOkrs = okrs.filter((o) => selectedCycles.includes(o.cycle) && matchesCategory(o));

  const handleSaveOkr = async (payload: Parameters<typeof saveObjective>[1]) => {
    if (await saveObjective(newOkrCycle, payload)) {
      setSelectedCycles([newOkrCycle]); setIsAddOkrOpen(false);
      return true;
    }
    return false;
  };

  const handleSubmitReview = async () => {
    if (busy || loading || error) return;
    if (!reviewCycleName.trim()) { addToast('warning', '请填写总结周期名称'); return; }
    if (!reviewSummary.trim()) { addToast('warning', '请填写本期总结核心内容'); return; }
    const selected = candidates.filter(w => selectedWorkIds.includes(w.id));
    if (selected.length !== selectedWorkIds.length) {
      addToast('warning', '所选工作项状态已变化，请重新选择'); return;
    }
    if (await saveReview({
      title:reviewCycleName, ...period, reviewType, reviewMode:'completed', summary:reviewSummary,
      selfScore:reviewSelfScore, uncompletedReason:reviewUncompleted, suggestions:reviewSuggestions,
      helpNeeded:reviewHelpNeeded, sendTo:reviewSendTo.split(',').map(s=>s.trim()).filter(Boolean),
      items:selected.map(w=>({workId:w.id,title:w.title,status:w.status,result:'',impact:''})),
    })) {setReviewSubTab('my'); setIsReviewFormOpen(false); setSelectedWorkIds([]);}
  };

  const openReviewForm = (type: 'week' | 'month') => {
    setReviewType(type);
    const dates = reviewPeriod(type);
    setReviewCycleName(type === 'week' ? `${dates.startDate} 至 ${dates.endDate} 周复盘总结` : `${dayjs().format('YYYY年M月')}月度复盘总结`);
    setSelectedWorkIds([]); setIsReviewFormOpen(true);
  };

  return (
    <div className="original-okr space-y-6 animate-in fade-in duration-150">
      {loading && <div role="status"><Spin size="small"/> 正在加载目标与绩效…</div>}
      {error && <Alert type="error" title="目标与绩效加载失败" description="服务暂不可用，请重试。已填写的内容仍保留。" action={<Button onClick={refresh}>重试</Button>}/>}
      {/* Top Main Navigation Tabs */}
      <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Button id="tab-okrs" type={mainTab === 'okrs' ? 'primary' : 'text'} icon={<Target/>} onClick={()=>setMainTab('okrs')}>目标 OKRs</Button>
          <Button id="tab-reviews" type={mainTab === 'reviews' ? 'primary' : 'text'} icon={<FileSpreadsheet/>} onClick={()=>{setMainTab('reviews');setIsReviewFormOpen(false);}}>复盘总结</Button>
        </div>

        {mainTab === 'okrs' && (
          <div className="flex items-center gap-3">
            <Cascader aria-label="周期筛选" className="okr-cycle-filter" multiple options={periods} value={cyclePaths} showCheckedStrategy={Cascader.SHOW_CHILD} allowClear={false}
              onChange={paths=>setSelectedCycles(paths.map(path=>String(path[path.length-1])))}
              maxTagCount={0} maxTagPlaceholder={()=>cycleLabel} placeholder="周期：请选择"
              tagRender={()=> <span>{cycleLabel}</span>} />

            <Button type="primary"
              id="btn-add-okr"
              disabled={busy}
              onClick={() => {setOkrCategoryTab('my'); setIsAddOkrOpen(true);}}

            >
              <Plus className="w-3.5 h-3.5" />
              添加目标
            </Button>
          </div>
        )}
      </div>

      {/* Main Tab 1: OKRs */}
      {mainTab === 'okrs' && (
        <div className="space-y-6">
          {/* Sub Navigation */}
          <Tabs
            activeKey={okrCategoryTab}
            onChange={(value) => setOkrCategoryTab(value as typeof okrCategoryTab)}
            items={[
              { label: '我的 OKR', key: 'my' },
              { label: '直属上级 OKR', key: 'supervisor' },
              { label: '直属下级 OKR', key: 'subordinate' },
              { label: '我部门的 OKR', key: 'department' },
              { label: '跨部门协同 OKR', key: 'other_dept' },
            ]}
          />

          {okrCategoryTab === 'my' && isAddOkrOpen && (
            <ObjectiveForm cycle={newOkrCycle} ownerName={currentUser.name} parents={parents} busy={busy} unavailable={loading || !!error}
              root={!!me?.rootFlag} onCancel={() => setIsAddOkrOpen(false)} onSave={handleSaveOkr}/>
          )}

          {/* OKR Cards List */}
          <div className="space-y-4">
            {filteredOkrs.length === 0 && !loading && !error ? (
              <div className="review-empty-state flex flex-col items-center justify-center rounded-xl border border-dashed p-10 sm:p-14 text-center">
                <Empty description="本月暂无目标"/>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">当前月份还没有填写 OKR，点击右上角“添加目标”开始设定。</p>
              </div>
            ) : filteredOkrs.map((okr, oIdx) => (
              <Card key={okr.id}>
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
                <Progress percent={okr.progress} showInfo={false}/>

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
                        <Progress percent={kr.progress} size="small" showInfo={false}/>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                          <span>权重: {kr.weight}%</span>
                          <span>截止: {kr.deadline}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Tab 2: 目标复盘总结 */}
      {mainTab === 'reviews' && (
        <div className="space-y-6">
          <Tabs activeKey={reviewSubTab} onChange={v=>{setReviewSubTab(v as typeof reviewSubTab);if(v==='write')setIsReviewFormOpen(false);}} items={[
            {key:'write',label:'写复盘总结'},
            {key:'my',label:`我的复盘列表 (${performances.filter(p=>p.authorId===currentUser.id).length})`},
            {key:'received',label:`我收到的复盘 (${performances.filter(p=>p.authorId!==currentUser.id).length})`},
          ]}/>

          {/* Subtab: 写总结 */}
          {reviewSubTab === 'write' && !isReviewFormOpen && (
            <div className="review-empty-state flex flex-col items-center justify-center rounded-xl border border-dashed p-10 sm:p-14 text-center">
              <Empty description="暂无需要填写的总结"/>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                选择复盘周期后开始记录本阶段的工作成果与改进计划
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button

                  onClick={() => openReviewForm('week')}

                >
                  <Calendar className="h-3.5 w-3.5" />
                  周复盘
                </Button>
                <Button

                  onClick={() => openReviewForm('month')}

                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  月度复盘
                </Button>
              </div>
            </div>
          )}

          {reviewSubTab === 'write' && isReviewFormOpen && (
            <Form disabled={busy}
              onFinish={handleSubmitReview}
              className="okr-review-form bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5 text-xs max-w-4xl"
            >
              <fieldset disabled={busy} className="space-y-5">
              <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  填写周期复盘与述职报告
                </h3>
                <div className="flex items-center gap-3">
                  <Radio.Group value={reviewType} onChange={e=>openReviewForm(e.target.value)} options={[{label:'周工作总结',value:'week'},{label:'月度复盘述职',value:'month'}]}/>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    总结周期名称 *
                  </label>
                  <Input maxLength={255} aria-label="总结周期名称" value={reviewCycleName}
                    onChange={(e) => setReviewCycleName(e.target.value)}
                    className="w-full"/>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    个人绩效自评得分 (0-100分) *
                  </label>
                  <InputNumber precision={0} min={0}
                    max={100}
                    aria-label="个人绩效自评得分" value={reviewSelfScore}
                    onChange={value => setReviewSelfScore(value ?? 0)}
                    className="w-full"/>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="review-completed-work">
                  关联{reviewType === 'week' ? '本周' : '本月'}完成的任务 / 工单
                </label>
                <Select id="review-completed-work" className="w-full" mode="multiple" showSearch optionFilterProp="label" allowClear
                  placeholder="选择已完成的任务或工单，可多选" value={selectedWorkIds} onChange={setSelectedWorkIds}
                  loading={workLoading} disabled={busy || workLoading || !!workError}
                  options={candidates.map(w=>({value:w.id,label:`${w.title} · ${w.status}`}))}
                  notFoundContent={workLoading ? '正在加载…' : '本期没有已完成的任务或工单'}/>
                {workError && <Alert type="error" title="任务与工单加载失败" action={<Button onClick={refreshWork}>重试</Button>}/>}
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  本月 / 本周核心工作总结 *
                </label>
                <Input.TextArea maxLength={2000} rows={4}
                  required
                  aria-label="核心工作总结" value={reviewSummary}
                  onChange={(e) => setReviewSummary(e.target.value)}
                  placeholder="详细列举本周期主导完成的重点事项、突破成果及交付里程碑..."
                  className="w-full"/>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  本月 / 本周未完成任务说明及原因归因分析
                </label>
                <Input.TextArea maxLength={2000} rows={2}
                  aria-label="未完成任务说明" value={reviewUncompleted}
                  onChange={(e) => setReviewUncompleted(e.target.value)}
                  placeholder="未达标事项、滞后原因分析与下阶段补救措施..."
                  className="w-full"/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    对公司管理意见或建议
                  </label>
                  <Input.TextArea maxLength={2000} rows={2}
                    aria-label="管理意见或建议" value={reviewSuggestions}
                    onChange={(e) => setReviewSuggestions(e.target.value)}
                    placeholder="业务协同、流程机制或研发支持建议..."
                    className="w-full"/>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    需要协助 / 协调事项
                  </label>
                  <Input.TextArea maxLength={2000} rows={2}
                    aria-label="需要协助事项" value={reviewHelpNeeded}
                    onChange={(e) => setReviewHelpNeeded(e.target.value)}
                    placeholder="需要跨部门支持、预算资源或高管协调事项..."
                    className="w-full"/>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  发送参与人 (多个逗号隔开)
                </label>
                <Input maxLength={255} aria-label="发送参与人" value={reviewSendTo}
                  onChange={(e) => setReviewSendTo(e.target.value)}
                  className="w-full"/>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  htmlType="submit" type="primary" loading={busy} disabled={loading || !!error}

                >
                  <Send className="w-4 h-4" />
                  {busy ? '正在提交…' : '提交复盘总结'}
                </Button>
              </div>
              </fieldset>
            </Form>
          )}

          {/* Subtab: 看总结 */}
          {(reviewSubTab === 'my' || reviewSubTab === 'received') && (
            <div className="space-y-4">
              {performances.filter(p => reviewSubTab === 'my' ? p.authorId === currentUser.id : p.authorId !== currentUser.id).map((perf) => (
                <Card key={perf.id}>
                  <div className="flex flex-wrap gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {perf.cycleName}
                        </span>
                        <Tag>{{draft:'草稿',submitted:'已提交',reviewed:'已评价'}[perf.status] || perf.status}</Tag>
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
                      {perf.leaderScore != null && (
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

                    {!!perf.linkedWorkItems?.length && <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">关联任务 / 工单：</span>
                      <ul className="mt-2 space-y-2 text-slate-600 dark:text-slate-300">{perf.linkedWorkItems.map(item=><li key={item.id}>{item.title} · {item.status}</li>)}</ul>
                    </div>}

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
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
