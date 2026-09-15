import React, { useRef, useState } from 'react';
import { Alert, Button, Empty, Progress, Cascader, Spin, Tag, Tabs, Collapse } from 'antd';
import Card from 'antd/es/card/Card';
import dayjs from 'dayjs';
import { useOriginalOkr } from './okr/useOriginalOkr';
import { Target, FileSpreadsheet, Plus, Calendar } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { OkrProvider } from './okr/OkrProvider';
import './okr/originalOkr.css';
import { cycleOptions } from './okr/cycleOptions';
import { OKRItem } from '../../types';
import { ObjectiveForm, type ObjectiveFormHandle } from './okr/ObjectiveForm';
import { StructuredReviewEditor } from './okr/StructuredReviewEditor';

export const OKRPerformanceView: React.FC = () => <OkrProvider><OriginalWorkspace/></OkrProvider>;
const OriginalWorkspace: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { records, okrs, performances, people, work, loading, error, workLoading, workError, refresh, refreshWork, saveObjective, saveObjectiveDraft, saveReview, saveReviewDraft, busy } = useOriginalOkr();

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
  const [objectiveForms, setObjectiveForms] = useState<string[]>([]);
  const objectiveRefs = useRef<Record<string, ObjectiveFormHandle | null>>({});
  const newOkrCycle = dayjs().format('YYYY-MM');

  // Write Review Form State
  const [reviewType, setReviewType] = useState<'week' | 'month'>('month');
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
  const visiblePerformances = performances.filter(performance => (
    reviewSubTab === 'my'
      ? performance.authorId === currentUser.id
      : performance.authorId !== currentUser.id
  ));

  const handleSaveOkr = async (payload: Parameters<typeof saveObjective>[1]) => {
    if (await saveObjective(newOkrCycle, payload)) {
      setSelectedCycles([newOkrCycle]);
      return true;
    }
    return false;
  };

  const openReviewForm = (type: 'week' | 'month') => {
    setReviewType(type);
    setIsReviewFormOpen(true);
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
            <div className="okr-cycle-control">
              <Cascader aria-label="周期筛选" className="okr-cycle-filter" multiple options={periods} value={cyclePaths} showCheckedStrategy={Cascader.SHOW_CHILD} allowClear={false}
                onChange={paths=>setSelectedCycles(paths.map(path=>String(path[path.length-1])))}
                maxTagCount={0} maxTagPlaceholder={()=>cycleLabel} placeholder="周期：请选择" />
              <span className="okr-cycle-label" aria-hidden="true">{cycleLabel}</span>
            </div>

            <Button type="primary"
              id="btn-add-okr"
              disabled={busy}
              onClick={() => {setOkrCategoryTab('my'); setObjectiveForms(forms => [...forms, crypto.randomUUID()]);}}

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

          {okrCategoryTab === 'my' && objectiveForms.length > 0 && (
            <div className="okr-objective-form-stack">
            <div className="okr-objective-period">{dayjs(newOkrCycle).format('YYYY年MM月')}<span>进行中</span></div>
            {objectiveForms.map(formId => (
            <div key={formId} className="okr-objective-form-item"><ObjectiveForm ref={ref => { objectiveRefs.current[formId] = ref; }} chrome={false} cycle={newOkrCycle} ownerName={currentUser.name} parents={parents} busy={busy} unavailable={loading || !!error}
              root={!!me?.rootFlag}
              onCancel={() => setObjectiveForms(forms => forms.filter(id => id !== formId))}
              onSave={async payload => { const ok = await handleSaveOkr(payload); if (ok) setObjectiveForms(forms => forms.filter(id => id !== formId)); return ok; }}
              onSaveDraft={async payload => { const ok = await saveObjectiveDraft(newOkrCycle, payload); if (ok) setObjectiveForms(forms => forms.filter(id => id !== formId)); return ok; }}
              onAddAnother={() => setObjectiveForms(forms => [...forms, crypto.randomUUID()])}/></div>
            ))}
            <div className="okr-objective-footer"><Button type="text" onClick={() => setObjectiveForms(forms => [...forms, crypto.randomUUID()])} disabled={busy}>+ 添加 O</Button><span className="okr-objective-footer-spacer"/><Button onClick={() => setObjectiveForms([])} disabled={busy}>取消</Button><Button onClick={async () => { const results = await Promise.all(objectiveForms.map(id => objectiveRefs.current[id]?.saveDraft() ?? false)); if (results.every(Boolean)) setObjectiveForms([]); }} disabled={busy || loading || !!error}>存草稿</Button><Button type="primary" onClick={async () => { const results = await Promise.all(objectiveForms.map(id => objectiveRefs.current[id]?.submit() ?? false)); if (results.every(Boolean)) setObjectiveForms([]); }} loading={busy} disabled={loading || !!error}>{me?.rootFlag ? '提交目标' : '提交主管确认'}</Button></div>
            </div>
          )}

          {/* OKR Cards List */}
          <div className="space-y-4">
            {filteredOkrs.length === 0 && objectiveForms.length === 0 && !loading && !error ? (
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
            <StructuredReviewEditor key={reviewType} type={reviewType} okrs={okrs.filter(o=>o.ownerId===currentUser.id&&o.status==='active')} work={work} busy={busy} workLoading={workLoading} workError={workError} onRefreshWork={refreshWork} onTypeChange={openReviewForm} onCancel={()=>setIsReviewFormOpen(false)} onSaveDraft={saveReviewDraft} onSubmit={async payload=>{const saved=await saveReview(payload);if(saved){setReviewSubTab('my');setIsReviewFormOpen(false);}return saved;}}/>
          )}

          {/* Subtab: 看总结 */}
          {(reviewSubTab === 'my' || reviewSubTab === 'received') && (
            <div className="space-y-4">
              {visiblePerformances.length > 0 && <div className="grid grid-cols-3 gap-4">
                <Card size="small"><div className="text-xs text-slate-500">复盘总数</div><div className="text-xl font-semibold">{visiblePerformances.length}</div></Card>
                <Card size="small"><div className="text-xs text-slate-500">本月复盘</div><div className="text-xl font-semibold">{visiblePerformances.filter(p=>p.type==='month').length}</div></Card>
                <Card size="small"><div className="text-xs text-slate-500">平均自评</div><div className="text-xl font-semibold">{Math.round(visiblePerformances.reduce((s,p)=>s+p.selfScore,0)/visiblePerformances.length)}</div></Card>
              </div>}
              {visiblePerformances.length === 0 ? (
                <div className="review-empty-state flex flex-col items-center justify-center rounded-xl border border-dashed p-10 sm:p-14 text-center">
                  <Empty description={reviewSubTab === 'my' ? '暂无我的复盘' : '暂无收到的复盘'}/>
                  <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {reviewSubTab === 'my' ? '完成并提交复盘总结后将在这里展示' : '其他成员发送给你的复盘将在这里展示'}
                  </p>
                </div>
              ) : visiblePerformances.map((perf) => (
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
                    {!!perf.krReviews?.length && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-3">
                      <div><span className="text-xs text-slate-500">KR 数量</span><div className="font-semibold">{perf.krReviews.length}</div></div>
                      <div><span className="text-xs text-slate-500">确认进度</span><Progress percent={Math.round(perf.krReviews.reduce((s,k)=>s+k.currentProgress,0)/perf.krReviews.length)} size="small"/></div>
                      <div><span className="text-xs text-slate-500">健康状态</span><div className="mt-1"><Tag color={perf.krReviews.some(k=>k.health==='blocked')?'red':perf.krReviews.some(k=>k.health==='risk')?'orange':'green'}>{perf.krReviews.some(k=>k.health==='blocked')?'存在阻塞':perf.krReviews.some(k=>k.health==='risk')?'存在风险':'正常'}</Tag></div></div>
                    </div>}
                    {!!perf.krReviews?.length && <Collapse ghost items={perf.krReviews.map((kr,index)=>({key:kr.keyResultId,label:`KR${index+1} · ${kr.keyResultTitle}`,children:<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs"><div><strong>本期成果</strong><p className="mt-1 text-slate-600 dark:text-slate-300">{kr.achievement||'未填写'}</p></div><div><strong>阻塞与风险</strong><p className="mt-1 text-slate-600 dark:text-slate-300">{kr.blocker||'无'}</p></div><div><strong>下一步计划</strong><p className="mt-1 text-slate-600 dark:text-slate-300">{kr.nextPlan||'未填写'}</p></div></div>}))}/>}
                    {(perf.extraWork?.description||perf.extraWork?.impact)&&<div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-3 text-xs"><div><strong>非 OKR 额外工作</strong><p className="mt-1">{perf.extraWork.description}</p></div><div><strong>对 OKR 的影响</strong><p className="mt-1">{perf.extraWork.impact||'无'}</p></div></div>}
                    {!!perf.assistance?.length&&<div className="text-xs"><strong>协助与协同事项</strong><ul className="mt-2 space-y-1">{perf.assistance.map((item,index)=><li key={index}>{item.subject} · {item.result}</li>)}</ul></div>}
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
