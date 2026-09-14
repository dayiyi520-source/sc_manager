import React, { useState } from 'react';
import { Alert, Button, DatePicker, Empty, Form, Input, InputNumber, Progress, Radio, Segmented, Select, Spin, Tag, Tabs } from 'antd';
import Card from 'antd/es/card/Card';
import dayjs from 'dayjs';
import { useOriginalOkr } from './okr/useOriginalOkr';
import { completedWorkInPeriod, reviewPeriod } from './okr/simpleReview';
import { Target, FileSpreadsheet, Plus, Calendar, Send } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { OkrProvider } from './okr/OkrProvider';
import './okr/originalOkr.css';
import { OKRItem } from '../../types';

export const OKRPerformanceView: React.FC = () => <OkrProvider><OriginalWorkspace/></OkrProvider>;
const OriginalWorkspace: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { okrs, performances, people, work, loading, error, workLoading, workError, refresh, refreshWork, saveObjective, saveReview, busy } = useOriginalOkr();

  const [mainTab, setMainTab] = useState<'okrs' | 'reviews'>('okrs');

  // OKR Sub Tabs: 我的OKR、直属上级、直属下级、我部门的、其他部门
  const [okrCategoryTab, setOkrCategoryTab] = useState<
    'my' | 'supervisor' | 'subordinate' | 'department' | 'other_dept'
  >('my');
  const [selectedCycle, setSelectedCycle] = useState(dayjs().format('YYYY-MM'));

  // Review Sub Tabs: 写总结、我的总结、我收到的
  const [reviewSubTab, setReviewSubTab] = useState<'write' | 'my' | 'received'>('write');
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);

  // Add OKR Modal State
  const [isAddOkrOpen, setIsAddOkrOpen] = useState(false);
  const [newOkrCycle, setNewOkrCycle] = useState(dayjs().format('YYYY-MM'));
  const [newOkrParentId, setNewOkrParentId] = useState<string>();
  const [newOkrObjective, setNewOkrObjective] = useState('');
  const [newOkrWeight, setNewOkrWeight] = useState(40);
  const [newOkrDeadline, setNewOkrDeadline] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [newKr1Content, setNewKr1Content] = useState('');

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
  const months = Array.from({length:12}, (_, i) => dayjs().subtract(i, 'month').format('YYYY-MM'));

  const matchesCategory = (o: OKRItem) => {
    if (okrCategoryTab === 'my') return o.category === 'my';
    if (okrCategoryTab === 'supervisor') return o.category === 'supervisor';
    if (okrCategoryTab === 'subordinate') return o.category === 'subordinate';
    if (okrCategoryTab === 'department') return o.category === 'department' || o.department === currentUser.department;
    return o.department !== currentUser.department;
  };
  const filteredOkrs = okrs.filter((o) => o.cycle === selectedCycle && matchesCategory(o));

  const handleSaveOkr = async () => {
    if (busy || loading || error) return;
    if (!newOkrObjective.trim() || !newKr1Content.trim()) {
      addToast('warning', '请填写目标和关键结果'); return;
    }
    if (!me?.rootFlag && !parents.some(p => p.id === newOkrParentId)) {
      addToast('warning', '请选择直属上级的 OKR'); return;
    }
    if (await saveObjective(newOkrCycle, {
      title: newOkrObjective.trim(), parentObjectiveId: newOkrParentId,
      weight: newOkrWeight, deadline: newOkrDeadline,
      keyResults: [{id:crypto.randomUUID(), title:newKr1Content.trim(), weight:100, progress:0}],
    })) {
      setSelectedCycle(newOkrCycle); setIsAddOkrOpen(false);
      setNewOkrObjective(''); setNewKr1Content(''); setNewOkrParentId(undefined);
    }
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
          <Button type={mainTab === 'okrs' ? 'primary' : 'text'}
            id="tab-okrs"
            onClick={() => setMainTab('okrs')}

          >
            <Target  />
            目标 OKRs
          </Button>
          <Button type={mainTab === 'reviews' ? 'primary' : 'text'}
            id="tab-reviews"
            onClick={() => {
              setMainTab('reviews');
              setIsReviewFormOpen(false);
            }}

          >
            <FileSpreadsheet  />
            复盘总结
          </Button>
        </div>

        {mainTab === 'okrs' && (
          <div className="flex items-center gap-3">
            <Select aria-label="目标月份" value={selectedCycle} onChange={setSelectedCycle} options={months.map(month=>({value:month,label:dayjs(month).format('YYYY年MM月')}))}/>

            <Button type="primary"
              id="btn-add-okr"
              disabled={busy}
              onClick={() => {setOkrCategoryTab('my'); setNewOkrCycle(selectedCycle); setNewOkrParentId(undefined); setIsAddOkrOpen(true);}}

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
          <Segmented
            value={okrCategoryTab}
            onChange={(value) => setOkrCategoryTab(value as typeof okrCategoryTab)}
            options={[
              { label: '我的 OKR', value: 'my' },
              { label: '直属上级 OKR', value: 'supervisor' },
              { label: '直属下级 OKR', value: 'subordinate' },
              { label: '我部门的 OKR', value: 'department' },
              { label: '跨部门协同 OKR', value: 'other_dept' },
            ]}
          />

          {okrCategoryTab === 'my' && isAddOkrOpen && (
            <Form disabled={busy}
              onFinish={handleSaveOkr}
              className="rounded-xl border border-blue-500 bg-white dark:bg-slate-900 shadow-xs overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800/60 text-xs">
                <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">O1</span><span className="font-semibold text-slate-800 dark:text-slate-200">添加目标</span><span className="text-slate-400">{newOkrCycle.replace('-', '年')}月</span></div>
                <span className="text-slate-400">填写完成后提交主管确认</span>
              </div>
              <fieldset disabled={busy} className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px] gap-3">
                  <Input maxLength={255} required aria-label="目标名称" value={newOkrObjective} onChange={(e) => setNewOkrObjective(e.target.value)} placeholder="输入目标名称：明确你想要达成什么，不写含糊概括的目标" className="w-full"/>
                  <Select aria-label="目标周期" value={newOkrCycle} onChange={value=>{setNewOkrCycle(value);setNewOkrParentId(undefined);setNewOkrDeadline(dayjs(value).endOf('month').format('YYYY-MM-DD'));}} options={months.map(month=>({value:month,label:dayjs(month).format('YYYY年MM月')}))}/>
                  <InputNumber precision={0} aria-label="目标权重" value={newOkrWeight} onChange={value => setNewOkrWeight(value ?? 0)} min={0} max={100} placeholder="权重 %" className="w-full"/>
                </div>
                {!me?.rootFlag && <div>
                  <Select className="w-full" aria-label="关联上级 OKR" placeholder="+ 选择上级 OKR" showSearch optionFilterProp="label" allowClear
                    value={newOkrParentId} disabled={busy || loading} loading={loading}
                    options={parents.map(o=>({value:o.id,label:`${o.ownerName} · ${o.objective}`}))}
                    onChange={setNewOkrParentId} notFoundContent="本月暂无可关联的直属上级 OKR"/>
                  {!parents.length && <p className="mt-2 text-slate-500">请联系直属上级确认本月 OKR 后再选择。</p>}
                </div>}
                <Input.TextArea maxLength={2000} rows={2} aria-label="KR1 关键结果" value={newKr1Content} onChange={(e) => setNewKr1Content(e.target.value)} placeholder="KR1 关键结果：遵循 SMART 原则，具体、可衡量、可达成、相关性、时效性" className="w-full"/>
                <DatePicker aria-label="截止日期" allowClear={false} value={dayjs(newOkrDeadline)} onChange={v=>v&&setNewOkrDeadline(v.format('YYYY-MM-DD'))}/>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800"><Button  onClick={() => setIsAddOkrOpen(false)} >取消</Button><Button htmlType="submit" type="primary" loading={busy} disabled={loading || !!error} >提交主管确认</Button></div>
              </fieldset>
            </Form>
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
