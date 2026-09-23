import React, { useRef, useState } from 'react';
import { Alert, Button, Empty, Input, Modal, Progress, Cascader, Spin, Tag, Tabs } from 'antd';
import Card from 'antd/es/card/Card';
import dayjs from 'dayjs';
import { useOriginalOkr } from './okr/useOriginalOkr';
import { Target, FileSpreadsheet, Plus, Calendar, ChevronDown, ChevronRight, Search, CheckCircle, AlertTriangle, FileText } from '@/components/common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { OkrProvider } from './okr/OkrProvider';
import './okr/originalOkr.css';
import { cycleOptions } from './okr/cycleOptions';
import { OKRItem } from '../../types';
import { ObjectiveForm, type ObjectiveFormHandle } from './okr/ObjectiveForm';
import { WeeklyReviewEditor } from './okr/WeeklyReviewEditor';
import { MonthlyReviewEditor } from './okr/MonthlyReviewEditor';
import { runObjectiveBatch } from './okr/objectiveBatch';
import { filterReviewsByMonth, toggleReviewMonth } from './okr/reviewMonthFilter';
import { ReviewReadOnlyView } from './okr/ReviewReadOnlyView';
import { createReviewCopyDraft } from './okr/reviewCopy';

export const OKRPerformanceView: React.FC = () => <OkrProvider><OriginalWorkspace/></OkrProvider>;

type StoredExtraWork = {
  source?: string;
  content?: string;
  hours?: string;
  status?: string;
  impact?: string;
};

const parseStoredExtraWork = (description?: string): StoredExtraWork[] => {
  if (!description?.startsWith('[')) return [];
  try {
    const value: unknown = JSON.parse(description);
    return Array.isArray(value)
      ? value.filter((item): item is StoredExtraWork => typeof item === 'object' && item !== null)
      : [];
  } catch {
    return [];
  }
};

const impactLabel = (value?: string) => ({
  none: '无明显影响',
  block: '挤占 KR 投入',
  support: '支持 KR',
}[value || ''] || value || '无明显影响');

const OriginalWorkspace: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const { records, okrs, performances, people, work, loading, error, workLoading, workError, refresh, refreshWork, saveObjective, saveObjectiveDraft, saveReview, saveReviewDraft, submitReviewDraft, busy } = useOriginalOkr();

  const [mainTab, setMainTab] = useState<'okrs' | 'reviews'>('okrs');

  // OKR Sub Tabs: 我的OKR、直属上级、直属下级、我部门的、其他部门
  const [okrCategoryTab, setOkrCategoryTab] = useState<
    'my' | 'supervisor' | 'subordinate' | 'department' | 'other_dept'
  >('my');
  const [selectedCycles, setSelectedCycles] = useState<string[]>([dayjs().format('YYYY-MM')]);

  // Review Sub Tabs: 写总结、我的总结、我收到的
  const [reviewSubTab, setReviewSubTab] = useState<'write' | 'my' | 'received'>('write');
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewDetailId, setReviewDetailId] = useState<string | null>(null);
  const [copiedReviewId, setCopiedReviewId] = useState<string | null>(null);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(() => new Set());
  const [draftToSubmit, setDraftToSubmit] = useState<string | null>(null);
  const [receivedSearch, setReceivedSearch] = useState('');
  const [receivedFilter, setReceivedFilter] = useState<'pending'|'reviewed'|'all'>('pending');
  const [selectedReceivedId, setSelectedReceivedId] = useState<string | null>(null);
  const [myReviewFilter, setMyReviewFilter] = useState<'all'|'week'|'month'>('all');
  const [myYear, setMyYear] = useState(dayjs().format('YYYY'));
  const [selectedReviewMonth, setSelectedReviewMonth] = useState<string | null>(null);

  // Add OKR Modal State
  const [objectiveForms, setObjectiveForms] = useState<string[]>([]);
  const [objectiveBatchAction, setObjectiveBatchAction] = useState<'draft' | 'submit' | null>(null);
  const objectiveRefs = useRef<Record<string, ObjectiveFormHandle | null>>({});
  const newOkrCycle = dayjs().format('YYYY-MM');

  // Write Review Form State
  const [reviewType, setReviewType] = useState<'week' | 'month'>('month');
  const me = people.find(p => p.id === currentUser.id);
  const reviewerName = me?.supervisorId ? people.find(person => person.id === me.supervisorId)?.name : undefined;
  const directReviewSubmit = Boolean(me?.rootFlag);
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
  const receivedPerformances = performances.filter(performance => performance.authorId !== currentUser.id);
  const receivedFiltered = receivedPerformances.filter(performance => {
    const matchesSearch = !receivedSearch || `${performance.author}${performance.cycleName}${performance.summary}`.toLowerCase().includes(receivedSearch.toLowerCase());
    const matchesStatus = receivedFilter === 'all' || (receivedFilter === 'pending' ? performance.status === 'submitted' : performance.status === 'reviewed');
    return matchesSearch && matchesStatus;
  });
  const selectedReceived = receivedFiltered.find(performance => performance.id === selectedReceivedId) || receivedFiltered[0];
  const myYearPerformances = performances.filter(performance => performance.authorId === currentUser.id && (myReviewFilter === 'all' || performance.type === myReviewFilter) && performance.createdAt.startsWith(myYear));
  const myPerformances = filterReviewsByMonth(myYearPerformances, selectedReviewMonth);
  const detailReview = performances.find(performance => performance.id === reviewDetailId && performance.authorId === currentUser.id);
  const copiedReview = records.find(record => record.id === copiedReviewId && record.kind === 'review');
  const copiedInitialPayload = copiedReview ? createReviewCopyDraft(copiedReview.payload) : undefined;

  const handleSaveOkr = async (payload: Parameters<typeof saveObjective>[1]) => {
    if (await saveObjective(newOkrCycle, payload)) {
      setSelectedCycles([newOkrCycle]);
      return true;
    }
    return false;
  };

  const openReviewForm = (type: 'week' | 'month') => {
    setCopiedReviewId(null);
    setReviewType(type);
    setReviewSubTab('write');
    setIsReviewFormOpen(true);
  };

  const openCopiedReview = (reviewId: string, type: 'week' | 'month') => {
    const source = records.find(record => record.id === reviewId && record.kind === 'review' && record.ownerId === currentUser.id);
    if (!source) {
      addToast('error', '复盘原始记录不存在或已刷新');
      return;
    }
    setCopiedReviewId(reviewId);
    setReviewDetailId(null);
    setReviewType(type);
    setReviewSubTab('write');
    setIsReviewFormOpen(true);
  };

  const handleObjectiveBatch = async (action: 'draft' | 'submit') => {
    const formIds = [...objectiveForms];
    setObjectiveBatchAction(action);
    try {
      const result = await runObjectiveBatch(
        formIds,
        objectiveRefs.current,
        action === 'draft' ? 'saveDraft' : 'submit',
      );
      if (!result.failedId) {
        setObjectiveForms([]);
        return;
      }
      if (result.completedIds.length > 0) {
        addToast(
          'warning',
          action === 'draft' ? '部分目标已存为草稿' : '部分目标已提交',
          `已完成 ${result.completedIds.length}/${formIds.length} 个，请修正当前目标后继续。`,
        );
      }
    } finally {
      setObjectiveBatchAction(null);
    }
  };

  return (
    <div className="original-okr space-y-6 animate-in fade-in duration-150">
      {loading && <div className="okr-loading-state" role="status" aria-live="polite"><Spin size="small"/> 正在加载目标与绩效…</div>}
      {error && <Alert type="error" title="目标与绩效加载失败" description="服务暂不可用，请重试。已填写的内容仍保留。" action={<Button onClick={refresh}>重试</Button>}/>}
      {/* Top Main Navigation Tabs */}
      <div className="okr-page-toolbar">
        <div className="okr-primary-tabs primary-line-tabs" role="tablist" aria-label="目标与绩效视图">
          <Button id="tab-okrs" role="tab" aria-selected={mainTab === 'okrs'} type="text" icon={<Target/>} onClick={()=>setMainTab('okrs')}>我的目标</Button>
          <Button id="tab-reviews" role="tab" aria-selected={mainTab === 'reviews'} type="text" icon={<FileSpreadsheet/>} onClick={()=>{setMainTab('reviews');setIsReviewFormOpen(false);}}>复盘总结</Button>
        </div>

        {mainTab === 'okrs' && (
          <div className="okr-page-actions">
            <div className="okr-cycle-control">
              <Cascader aria-label="周期筛选" className="okr-cycle-filter" multiple options={periods} value={cyclePaths} showCheckedStrategy={Cascader.SHOW_CHILD} allowClear={false}
                onChange={paths=>setSelectedCycles(paths.map(path=>String(path[path.length-1])))}
                maxTagCount={0} maxTagPlaceholder={()=>cycleLabel} placeholder="周期：请选择" />
              <span className="okr-cycle-label" aria-hidden="true">{cycleLabel}</span>
            </div>

            <Button type="primary"
              id="btn-add-okr"
              disabled={busy || objectiveBatchAction !== null}
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
              { label: '我的目标', key: 'my' },
              { label: '直属上级目标', key: 'supervisor' },
              { label: '直属下级目标', key: 'subordinate' },
              { label: '我部门的目标', key: 'department' },
              { label: '跨部门协同目标', key: 'other_dept' },
            ]}
          />

          {okrCategoryTab === 'my' && objectiveForms.length > 0 && (
            <div className={`okr-objective-form-stack${objectiveBatchAction ? ' is-batching' : ''}`} aria-busy={objectiveBatchAction !== null}>
            <div className="okr-objective-period">{dayjs(newOkrCycle).format('YYYY年MM月')}<span>进行中</span></div>
            {objectiveForms.map((formId, formIndex) => (
            <div key={formId} className="okr-objective-form-item"><ObjectiveForm ref={ref => { objectiveRefs.current[formId] = ref; }} chrome={false} cycle={newOkrCycle} objectiveIndex={formIndex} ownerName={currentUser.name} parents={parents} busy={busy} unavailable={loading || !!error}
              root={!!me?.rootFlag}
              onCancel={() => setObjectiveForms(forms => forms.filter(id => id !== formId))}
              onSave={async payload => { const ok = await handleSaveOkr(payload); if (ok) setObjectiveForms(forms => forms.filter(id => id !== formId)); return ok; }}
              onSaveDraft={async payload => { const ok = await saveObjectiveDraft(newOkrCycle, payload); if (ok) setObjectiveForms(forms => forms.filter(id => id !== formId)); return ok; }}
              onAddAnother={() => setObjectiveForms(forms => [...forms, crypto.randomUUID()])}/></div>
            ))}
            <div className="okr-objective-footer"><Button type="text" onClick={() => setObjectiveForms(forms => [...forms, crypto.randomUUID()])} disabled={busy || objectiveBatchAction !== null}>+ 添加目标</Button><span className="okr-objective-footer-spacer"/><Button onClick={() => setObjectiveForms([])} disabled={busy || objectiveBatchAction !== null}>取消</Button><Button onClick={() => void handleObjectiveBatch('draft')} loading={objectiveBatchAction === 'draft'} disabled={busy || loading || !!error || objectiveBatchAction !== null}>存草稿</Button><Button type="primary" onClick={() => void handleObjectiveBatch('submit')} loading={objectiveBatchAction === 'submit'} disabled={loading || !!error || objectiveBatchAction !== null}>{me?.rootFlag ? '提交目标' : '提交主管确认'}</Button></div>
            </div>
          )}

          {/* OKR Cards List */}
          <div className="space-y-4">
            {filteredOkrs.length === 0 && objectiveForms.length === 0 && !loading && !error ? (
              <div className="review-empty-state flex flex-col items-center justify-center rounded-xl border border-dashed p-10 sm:p-14 text-center">
                <Empty description="本月暂无目标"/>
                <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">当前月份还没有填写 OKR，点击右上角“添加目标”开始设定。</p>
              </div>
            ) : filteredOkrs.map((okr, oIdx) => (
              <Card key={okr.id} className="okr-summary-card">
                {/* Header of OKR */}
                <div className="okr-summary-head">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="okr-summary-index">
                        O{oIdx + 1}
                      </span>
                      <h3 className="okr-summary-title">
                        {okr.objective}
                      </h3>
                    </div>
                  </div>

                  <div className="okr-summary-meta">
                    <div className="text-right">
                      <div className="okr-summary-meta-label">综合进度</div>
                      <div className="okr-summary-progress-value">{okr.progress}%</div>
                    </div>
                    <div className="okr-summary-owner">
                      <div className="okr-summary-meta-label">责任人 / 周期</div>
                      <div className="okr-summary-owner-value">
                        {okr.ownerName} ({okr.cycle})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <Progress percent={okr.progress} showInfo={false}/>

                {/* Key Results list */}
                <div className="space-y-2 pt-2">
                  <h4 className="okr-summary-section-title">
                    A 动作
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {okr.keyResults.map((kr, idx) => (
                      <div
                        key={kr.id}
                        className="okr-summary-kr"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="okr-summary-kr-title">
                            A{idx + 1}: {kr.content}
                          </span>
                          <span className="okr-summary-kr-progress">
                            {kr.progress}%
                          </span>
                        </div>
                        <Progress percent={kr.progress} size="small" showInfo={false}/>
                        <div className="okr-summary-kr-meta">
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
        <div className={reviewSubTab === 'write' && isReviewFormOpen ? "space-y-0" : "space-y-6"}>
          <Tabs
            className={reviewSubTab === 'write' && isReviewFormOpen ? "!mb-0" : ""}
            activeKey={reviewSubTab}
            onChange={v=>{setReviewSubTab(v as typeof reviewSubTab);setIsReviewFormOpen(false);setCopiedReviewId(null);setReviewDetailId(null);}}
            items={[
              {key:'write',label:'写复盘总结'},
              {key:'my',label:`我的复盘列表 (${performances.filter(p=>p.authorId===currentUser.id).length})`},
              {key:'received',label:`我收到的复盘 (${performances.filter(p=>p.authorId!==currentUser.id).length})`},
            ]}
          />

          {/* Subtab: 写总结 */}
          {reviewSubTab === 'write' && !isReviewFormOpen && (
            <div className="review-empty-state flex flex-col items-center justify-center rounded-xl border border-dashed p-10 sm:p-14 text-center">
              <Empty description="选择复盘周期开始撰写"/>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
                记录本阶段的工作成果、OKR进度与改进计划
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  type="primary"
                  onClick={() => openReviewForm('week')}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  写周报
                </Button>
                <Button
                  onClick={() => openReviewForm('month')}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  写月报
                </Button>
              </div>
            </div>
          )}

          {reviewSubTab === 'write' && isReviewFormOpen && (
            reviewType === 'week' ? (
              <WeeklyReviewEditor key={`weekly-review-${copiedReviewId || 'new'}`} initialPayload={copiedInitialPayload} okrs={okrs.filter(o=>o.ownerId===currentUser.id)} work={work} busy={busy} workLoading={workLoading} workError={workError} onRefreshWork={refreshWork} onCancel={()=>{setIsReviewFormOpen(false);setCopiedReviewId(null);}} onAddObjective={()=>{setReviewSubTab('okrs' as typeof reviewSubTab);setMainTab('okrs');setOkrCategoryTab('my');setObjectiveForms(forms=>[...forms,crypto.randomUUID()]);}} onSaveDraft={async payload=>{const saved=await saveReviewDraft(payload);if(saved){setReviewSubTab('my');setIsReviewFormOpen(false);setCopiedReviewId(null);}return saved;}} onSubmit={async payload=>{const saved=await saveReview(payload);if(saved){setReviewSubTab('my');setIsReviewFormOpen(false);setCopiedReviewId(null);}return saved;}} reviewerName={reviewerName} directSubmit={directReviewSubmit}/>
            ) : (
              <MonthlyReviewEditor key={`monthly-review-${copiedReviewId || 'new'}`} initialPayload={copiedInitialPayload} okrs={okrs.filter(o=>o.ownerId===currentUser.id)} records={records} currentUserId={currentUser.id} busy={busy} onCancel={()=>{setIsReviewFormOpen(false);setCopiedReviewId(null);}} onSaveDraft={async payload=>{const saved=await saveReviewDraft(payload);if(saved){setReviewSubTab('my');setIsReviewFormOpen(false);setCopiedReviewId(null);}return saved;}} onSubmit={async payload=>{const saved=await saveReview(payload);if(saved){setReviewSubTab('my');setIsReviewFormOpen(false);setCopiedReviewId(null);}return saved;}}/>
            )
          )}

          {reviewSubTab === 'my' && (
            detailReview ? <ReviewReadOnlyView review={detailReview} onBack={() => setReviewDetailId(null)} onCopy={() => openCopiedReview(detailReview.id, detailReview.type)} /> :
            <div className="okr-my-reviews space-y-5">
              <div className="okr-review-filter-tabs">
                {(['all','week','month'] as const).map(filter => <button key={filter} className={myReviewFilter === filter ? 'is-active' : ''} onClick={() => setMyReviewFilter(filter)}>{filter === 'all' ? '全部' : filter === 'week' ? '周报' : '月报'}</button>)}
              </div>
              <div className="okr-review-month-rail" aria-label="复盘月份">
                {Array.from({length: 12}, (_, index) => {
                  const month = `${myYear}-${String(index + 1).padStart(2, '0')}`;
                  const count = myYearPerformances.filter(performance => performance.createdAt.startsWith(month)).length;
                  const selected = selectedReviewMonth === month;
                  return (
                    <button
                      type="button"
                      key={month}
                      className={`${count ? 'has-review' : ''}${selected ? ' is-selected' : ''}`}
                      aria-label={`${index + 1}月，${count ? `${count}条复盘` : '暂无复盘'}${selected ? '，已选中' : ''}`}
                      aria-pressed={selected}
                      disabled={loading || !!error}
                      onClick={() => setSelectedReviewMonth(current => toggleReviewMonth(current, month))}
                    >
                      <span>{index + 1}月</span>
                      <i aria-hidden="true">{count ? '●' : '○'}</i>
                    </button>
                  );
                })}
              </div>
              {myPerformances.length === 0 ? <div className="review-empty-state okr-review-empty"><Empty description={selectedReviewMonth ? `${Number(selectedReviewMonth.slice(5))}月暂无复盘` : '暂无历史复盘'} /></div> : <div className="okr-my-review-grid">
                {myPerformances.map(perf => { const krReviews = perf.krReviews || []; const average = krReviews.length ? Math.round(krReviews.reduce((sum, kr) => sum + kr.currentProgress, 0) / krReviews.length) : perf.selfScore; const health = {normal: 0, risk: 0, blocked: 0}; krReviews.forEach(kr => { health[kr.health] += 1; }); return <Card key={perf.id} className="okr-my-review-card">
                  <div className="okr-my-review-card-head"><div><Tag color={perf.type === 'week' ? 'blue' : 'purple'}>{perf.type === 'week' ? '周报' : '月报'}</Tag><h3>{perf.cycleName || `${myYear}年复盘`}</h3><span>{perf.createdAt.slice(0, 10)} · 自评 {perf.selfScore} 分</span></div><Tag color={perf.status === 'reviewed' ? 'success' : perf.status === 'submitted' ? 'processing' : 'default'}>{perf.status === 'reviewed' ? '已评价' : perf.status === 'submitted' ? '已提交' : '草稿'}</Tag></div>
                  <div className="okr-my-review-score"><Progress type="circle" percent={average} size={68} /><div><b>KR 平均进度</b><strong>{average}%</strong></div></div>
                  <div className="okr-my-review-metrics"><span><Target />{krReviews.length} 个 KR</span><span><FileText />{perf.extraWork?.workIds?.length || 0} 项任务</span><span><FileSpreadsheet />{perf.linkedWorkItems?.length || 0} 个事项</span></div>
                  <div className="okr-my-review-summary"><b>本期摘要</b><p>{perf.summary || '暂无摘要内容，点击查看详情继续补充。'}</p><div><span className="is-normal">● 正常 {health.normal}</span><span className="is-risk">● 风险 {health.risk}</span><span className="is-blocked">● 阻塞 {health.blocked}</span></div></div>
                  <div className="okr-my-review-actions">{perf.status === 'draft' && <Button type="primary" onClick={() => setDraftToSubmit(perf.id)}>提交</Button>}<Button onClick={() => setReviewDetailId(perf.id)}>查看详情</Button><Button onClick={() => openCopiedReview(perf.id, perf.type)}>复制为本期</Button></div>
                </Card>; })}
              </div>}
            </div>
          )}

          {reviewSubTab === 'received' && (
            <div className="okr-received-reviews">
              <div className="okr-received-layout">
                <aside className="okr-received-list">
                  <div className="okr-received-list-tools"><Input prefix={<Search />} placeholder="搜索成员或周期" value={receivedSearch} onChange={event => setReceivedSearch(event.target.value)} /><div>{(['pending','reviewed','all'] as const).map(filter => <button key={filter} className={receivedFilter === filter ? 'is-active' : ''} onClick={() => setReceivedFilter(filter)}>{filter === 'pending' ? '待我查看' : filter === 'reviewed' ? '已查看' : '全部'}</button>)}</div></div>
                  {receivedFiltered.length === 0 ? <div className="okr-received-list-empty"><Empty description="暂无收到的复盘" /></div> : receivedFiltered.map(perf => <button type="button" key={perf.id} className={`okr-received-list-item${selectedReceived?.id === perf.id ? ' is-active' : ''}`} onClick={() => setSelectedReceivedId(perf.id)}><span className="okr-avatar">{perf.author.slice(0, 1)}</span><span><b>{perf.author}</b><small>{perf.authorDept} · {perf.cycleName}</small><em>{perf.summary || '暂无摘要'}</em></span><Tag color={perf.status === 'reviewed' ? 'success' : 'warning'}>{perf.status === 'reviewed' ? '已查看' : '待查看'}</Tag></button>)}
                </aside>
                <section className="okr-received-detail">
                  {!selectedReceived ? <div className="okr-received-detail-empty"><Empty description="请选择一份复盘" /></div> : <>
                    <div className="okr-received-detail-head"><div><Tag color={selectedReceived.type === 'week' ? 'blue' : 'purple'}>{selectedReceived.type === 'week' ? '周报复盘' : '月报复盘'}</Tag><h2>{selectedReceived.cycleName}</h2><p>提交时间：{selectedReceived.createdAt}　|　复盘人：{selectedReceived.author}　|　{selectedReceived.authorDept}</p></div><Button type="link">打开完整复盘 ↗</Button></div>
                    <div className="okr-received-summary-row">{(selectedReceived.krReviews || []).slice(0, 3).map(kr => <div key={kr.keyResultId}><span>复盘前</span><Progress percent={kr.previousProgress} showInfo={false} /><b>{kr.previousProgress}%</b><span>本期</span><Progress percent={kr.currentProgress} showInfo={false} status={kr.health === 'blocked' ? 'exception' : undefined} /><b>{kr.currentProgress}%</b><Tag color={kr.health === 'normal' ? 'success' : kr.health === 'risk' ? 'warning' : 'error'}>{kr.health === 'normal' ? '正常' : kr.health === 'risk' ? '有风险' : '已阻塞'}</Tag></div>)}</div>
                    {(selectedReceived.krReviews || []).map((kr, index) => <div className="okr-received-section" key={kr.keyResultId}><div className="okr-received-section-title"><CheckCircle /><h3>本期成果</h3><strong>KR{index + 1} {kr.keyResultTitle}</strong></div><p>{kr.achievement || '暂无成果说明'}</p>{kr.blocker && <div className="okr-received-risk"><AlertTriangle /><span>{kr.blocker}</span></div>}<div className="okr-received-next"><b>下一步计划</b><span>{kr.nextPlan || '暂无计划'}</span></div></div>)}
                    <div className="okr-received-two-col"><div className="okr-received-section"><div className="okr-received-section-title"><FileText /><h3>非 OKR 额外工作</h3></div><p>{selectedReceived.extraWork?.description || '暂无额外工作记录'}</p></div><div className="okr-received-section"><div className="okr-received-section-title"><Target /><h3>协助与协同事项</h3></div>{selectedReceived.assistance?.length ? selectedReceived.assistance.map(item => <p key={item.subject}>{item.subject}：{item.result}</p>) : <p>暂无协同事项</p>}</div></div>
                    <div className="okr-received-feedback"><Input placeholder="写下反馈或建议（可选）" /><Button>保存备注</Button><Button type="primary">标记已查看</Button></div>
                  </>}
                </section>
              </div>
            </div>
          )}

          {/* Legacy compact detail is kept for compatibility but replaced by the two review workspaces above. */}
          {false && (reviewSubTab === 'my' || reviewSubTab === 'received') && (
            <div className="space-y-4">
              {visiblePerformances.length > 0 && <div className="okr-overview-stats">
                <div><span>复盘总数</span><strong>{visiblePerformances.length}</strong></div>
                <div><span>本月复盘</span><strong>{visiblePerformances.filter(p=>p.type==='month').length}</strong></div>
                <div><span>平均自评</span><strong>{Math.round(visiblePerformances.reduce((s,p)=>s+p.selfScore,0)/visiblePerformances.length)}</strong></div>
              </div>}
              {visiblePerformances.length === 0 ? (
                <div className="review-empty-state flex flex-col items-center justify-center rounded-xl border border-dashed p-10 sm:p-14 text-center">
                  <Empty description={reviewSubTab === 'my' ? '暂无我的复盘' : '暂无收到的复盘'}/>
                  <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
                    {reviewSubTab === 'my' ? '完成并提交复盘总结后将在这里展示' : '其他成员发送给你的复盘将在这里展示'}
                  </p>
                </div>
              ) : visiblePerformances.map((perf) => {
                const expanded = expandedReviewIds.has(perf.id);
                return (
                <Card key={perf.id} className="border border-[var(--border-main)] bg-[var(--bg-card)]">
                  <div className={`flex flex-wrap gap-3 items-center justify-between${expanded ? ' border-b border-[var(--border-main)] pb-3' : ''}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <Tag color={perf.type === 'week' ? 'blue' : 'purple'}>{perf.type === 'week' ? '周报' : '月报'}</Tag>
                        <span className="font-bold text-sm text-[var(--text-primary)]">
                          {perf.cycleName}
                        </span>
                        <Tag color={perf.status === 'submitted' ? 'processing' : perf.status === 'reviewed' ? 'success' : 'default'}>
                          {{draft:'草稿状态',submitted:'已提交',reviewed:'已评价'}[perf.status] || perf.status}
                        </Tag>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1">
                        述职人：{perf.author} ({perf.authorDept}) · 提交时间：{perf.createdAt}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[var(--text-muted)] text-[11px]">自评分</span>
                        <div className="font-bold text-[var(--primary)] text-sm">{perf.selfScore}分</div>
                      </div>
                      {perf.leaderScore != null && (
                        <div className="text-right border-l border-[var(--border-main)] pl-3">
                          <span className="text-[var(--text-muted)] text-[11px]">领导考评分</span>
                          <div className="font-bold text-[var(--success)] text-sm">{perf.leaderScore}分</div>
                        </div>
                      )}
                      {perf.status === 'draft' && perf.authorId === currentUser.id && (
                        <Button type="primary" size="small" disabled={busy} onClick={()=>setDraftToSubmit(perf.id)}>提交</Button>
                      )}
                      <Button
                        type="text"
                        size="small"
                        aria-label={expanded ? `收起${perf.cycleName}` : `展开${perf.cycleName}`}
                        icon={expanded ? <ChevronDown /> : <ChevronRight />}
                        onClick={()=>setExpandedReviewIds(current=>{
                          const next=new Set(current);
                          if(next.has(perf.id))next.delete(perf.id);else next.add(perf.id);
                          return next;
                        })}
                      >{expanded ? '收起' : '展开'}</Button>
                    </div>
                  </div>

                  {expanded && <div className="space-y-4 pt-3">
                    {/* ▌ 1. 整体工作摘要 */}
                    {perf.summary && (
                      <div className="bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg p-3.5">
                        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--text-primary)]">
                          <span className="okr-document-section-index">1</span>
                          <span>1. 整体工作摘要 (Overall Summary)</span>
                        </div>
                        <p className="text-xs text-[var(--text-body)] leading-relaxed m-0">{perf.summary}</p>
                      </div>
                    )}

                    {/* ▌ 2. OKR 目标复盘 */}
                    {!!perf.krReviews?.length && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                          <span className="okr-document-section-index">2</span>
                          <span>2. OKR 目标复盘</span>
                        </div>
                        {perf.krReviews.map((kr, index) => (
                          <div key={kr.keyResultId || index} className="bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg p-3.5 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-main)] pb-2">
                              <span className="font-semibold text-xs text-[var(--text-primary)]">
                                <span className="text-[var(--primary)] font-bold mr-1.5">KR{index + 1}</span>
                                {kr.keyResultTitle}
                              </span>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-[var(--text-muted)]">复盘前: {kr.previousProgress}% → 本期: <strong className="text-[var(--primary)]">{kr.currentProgress}%</strong></span>
                                <Tag color={kr.health === 'normal' ? 'success' : kr.health === 'risk' ? 'warning' : 'error'}>
                                  {kr.health === 'normal' ? '正常' : kr.health === 'risk' ? '有风险' : '已阻塞'}
                                </Tag>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="bg-[var(--bg-card)] p-2.5 rounded border border-[var(--border-main)]">
                                <span className="text-[var(--text-muted)] font-medium block mb-1">本期成果:</span>
                                <p className="text-[var(--text-primary)] m-0 leading-relaxed">{kr.achievement || '未填写'}</p>
                              </div>
                              <div className="bg-[var(--bg-card)] p-2.5 rounded border border-[var(--border-main)]">
                                <span className="text-[var(--text-muted)] font-medium block mb-1">阻塞与风险:</span>
                                <p className="text-[var(--text-primary)] m-0 leading-relaxed">{kr.blocker || '无'}</p>
                              </div>
                              <div className="bg-[var(--bg-card)] p-2.5 rounded border border-[var(--border-main)]">
                                <span className="text-[var(--text-muted)] font-medium block mb-1">下一步计划:</span>
                                <p className="text-[var(--text-primary)] m-0 leading-relaxed">{kr.nextPlan || '未填写'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ▌ 3. 非 OKR 额外工作 */}
                    {(perf.extraWork?.description || perf.extraWork?.impact) && (
                      <div className="bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                          <span className="okr-document-section-index">3</span>
                          <span>3. 非 OKR 额外工作</span>
                        </div>
                        {(() => {
                          const rows = parseStoredExtraWork(perf.extraWork.description);
                          if (rows.length > 0) {
                            return (
                              <div className="space-y-1.5">
                                {rows.map((r, i) => (
                                  <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded text-xs">
                                    <div className="flex items-center gap-2">
                                      <Tag color={r.source === '工单' ? 'purple' : 'blue'}>{r.source === '工单' ? '事项' : r.source}</Tag>
                                      <span className="text-[var(--text-primary)]">{r.content}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[var(--text-muted)]">
                                      <span>耗时: {r.hours || '-'}</span>
                                      <span>状态: <Tag color="success">{r.status || '已完成'}</Tag></span>
                                      <span className="text-[var(--warning)]">{impactLabel(r.impact)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <div className="text-xs text-[var(--text-body)] space-y-1">
                              <div><span className="text-[var(--text-muted)]">工作内容：</span>{perf.extraWork.description}</div>
                              {perf.extraWork.impact && <div><span className="text-[var(--text-muted)]">对 OKR 的影响：</span>{impactLabel(perf.extraWork.impact)}</div>}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {perf.type === 'month' && perf.otherNotes && (
                      <div className="bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                          <span className="okr-document-section-index">4</span>
                          <span>4. 其他补充</span>
                        </div>
                        <p className="text-xs text-[var(--text-body)] leading-relaxed m-0 whitespace-pre-wrap">{perf.otherNotes}</p>
                      </div>
                    )}

                    {perf.type === 'month' && perf.nextMonthArrangement && (
                      <div className="bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                          <span className="okr-document-section-index">5</span>
                          <span>5. 下个月安排</span>
                        </div>
                        <p className="text-xs text-[var(--text-body)] leading-relaxed m-0 whitespace-pre-wrap">{perf.nextMonthArrangement}</p>
                      </div>
                    )}

                    {/* ▌ 4. 协助与协同事项 */}
                    {!!perf.assistance?.length && (
                      <div className="bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                          <span className="okr-document-section-index">{perf.type === 'month' ? '6' : '4'}</span>
                          <span>{perf.type === 'month' ? '6' : '4'}. 协助与协同事项 (跨团队/跨部门支持)</span>
                        </div>
                        <div className="space-y-1.5">
                          {perf.assistance.map((item, index) => (
                            <div key={index} className="text-xs bg-[var(--bg-card)] border border-[var(--border-main)] p-2.5 rounded space-y-1">
                              <div className="text-[var(--text-muted)]">协助对象：<span className="text-[var(--text-primary)] font-medium">{item.subject}</span></div>
                              <div className="text-[var(--text-muted)]">结果：<span className="text-[var(--text-primary)]">{item.result}</span></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {perf.uncompletedReason && (
                      <div>
                        <span className="font-semibold text-[var(--text-primary)] text-xs">未完成事项说明：</span>
                        <p className="text-[var(--text-body)] mt-0.5 text-xs">{perf.uncompletedReason}</p>
                      </div>
                    )}

                    {perf.feedback && (
                      <div className="p-3 bg-[var(--bg-surface-soft)] border border-[var(--success)] rounded-lg text-[var(--success)] text-xs">
                        <span className="font-semibold">主管批复与评价：</span>
                        <p className="mt-0.5">{perf.feedback}</p>
                      </div>
                    )}
                  </div>}
                </Card>
              );})}
            </div>
          )}
        </div>
      )}

      <Modal
        title="确认提交复盘"
        open={draftToSubmit !== null}
        okText="确认提交"
        cancelText="取消"
        confirmLoading={busy}
        okButtonProps={{ disabled: !directReviewSubmit && !reviewerName }}
        onCancel={()=>setDraftToSubmit(null)}
        onOk={async()=>{
          if(draftToSubmit && await submitReviewDraft(draftToSubmit))setDraftToSubmit(null);
        }}
      >
        <p className="m-0 text-sm text-[var(--text-body)]">提交后复盘将进入主管评价流程，确认提交当前草稿吗？</p>
        <p className="mb-0 mt-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-2 text-sm text-[var(--text-body)]">
          审批人：<strong className="text-[var(--text-primary)]">{directReviewSubmit ? '组织根负责人直接提交' : reviewerName || '未配置直属上级'}</strong>
          {!directReviewSubmit && reviewerName && <span className="ml-2 text-xs text-[var(--text-muted)]">直属上级（系统自动设置）</span>}
        </p>
      </Modal>

    </div>
  );
};
