import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Modal, Progress, Radio, Tag } from 'antd';
import dayjs from 'dayjs';
import type { OKRItem } from '../../../types';
import type { OkrKrReview, OkrPayload, OkrRecord } from '../../../services/okrRepository';
import { AlertTriangle, ChevronDown, FileText, Save, Send, Target } from '@/components/common/octicons-compat';
import { aggregateKrReview, aggregateMonthlyTasks, eligibleWeeklyReviews, monthPeriod, monthlyEvidenceTimeline, suggestMonthlySummary } from './monthlyReview';
import { restoreReviewDraftTargets, reconcileReviewDraftTargets, detachedReviewDescription } from './reviewDraftTargets';
import { reviewEditorState } from '../../../services/okrReviewTemplates';
import { WorkEvidencePicker } from './WorkEvidencePicker';
import { defaultCollapsedReview } from './evidenceFilters';
import type { EvidenceViewer } from '../../../services/reviewEvidenceRepository';
import type { OkrWork } from '../../../services/okrRepository';
import type { ReviewPeriod } from '../../../services/okrReviewRules';

type Health = OkrKrReview['health'];

interface MonthlyReviewEditorProps {
  key?: React.Key;
  okrs: OKRItem[];
  records: OkrRecord[];
  currentUserId: string;
  busy: boolean;
  onSaveDraft: (payload: OkrPayload) => Promise<boolean>;
  onSubmit: (payload: OkrPayload) => Promise<boolean>;
  onCancel: () => void;
  recordStatus?: string;
  initialPayload?: OkrPayload;
  periodOverride?: ReviewPeriod;
  work?: OkrWork[]; viewer?: EvidenceViewer; workLoading?: boolean; workError?: unknown; onRefreshWork?: () => void;
}

export function MonthlyReviewEditor({ okrs, records, currentUserId, busy, onSaveDraft, onSubmit, onCancel, recordStatus, initialPayload, periodOverride, work = [], viewer, workLoading, workError, onRefreshWork }: MonthlyReviewEditorProps) {
  const month = useMemo(() => dayjs(periodOverride?.startDate).startOf('month'), [periodOverride?.startDate]);
  const monthlyOkrs = useMemo(() => okrs.filter(objective => objective.cycle === month.format('YYYY-MM')), [okrs, month]);
  const weeklyReviews = useMemo(() => eligibleWeeklyReviews(records, currentUserId, month), [records, currentUserId, month]);
  const currentTargets = useMemo(() => monthlyOkrs.flatMap(objective => objective.keyResults.map(keyResult => ({
    ...aggregateKrReview(objective.id, keyResult.id, keyResult.content, keyResult.progress, weeklyReviews),
    currentProgress: keyResult.progress,
    objectiveTitle: objective.objective
  }))), [monthlyOkrs, weeklyReviews]);
  const initialKrs = useMemo(() => restoreReviewDraftTargets(currentTargets, initialPayload), [currentTargets, initialPayload]);
  const [krs, setKrs] = useState(() => initialKrs);
  const editorState = reviewEditorState(recordStatus);
  const lastTargetIds = useRef(new Set(currentTargets.map(row => row.keyResultId)));
  useEffect(() => {
    const added = currentTargets.filter(row => !lastTargetIds.current.has(row.keyResultId)).map(row => row.keyResultId);
    setKrs(previous => reconcileReviewDraftTargets(previous, currentTargets));
    setSelectedKrIds(previous => [...new Set([...previous, ...added])]);
    lastTargetIds.current = new Set(currentTargets.map(row => row.keyResultId));
  }, [currentTargets]);
  const detachedTargets = krs.filter(row => !currentTargets.some(target => target.objectiveId === row.objectiveId && target.keyResultId === row.keyResultId));
  const [selectedKrIds, setSelectedKrIds] = useState(() => initialPayload?.startDate ? initialKrs.filter(item => initialPayload.krReviews?.some(kr => kr.keyResultId === item.keyResultId)).map(item => item.keyResultId) : initialKrs.map(item => item.keyResultId));
  const [activeKrId, setActiveKrId] = useState(() => initialKrs[0]?.keyResultId || '');
  const [summary, setSummary] = useState(() => initialPayload?.summary || suggestMonthlySummary(weeklyReviews));
  const [otherNotes, setOtherNotes] = useState(initialPayload?.otherNotes || '');
  const [nextMonthArrangement, setNextMonthArrangement] = useState(initialPayload?.nextMonthArrangement || '');
  const [syncKrProgress, setSyncKrProgress] = useState(initialPayload?.syncKrProgress ?? true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expandedKrs, setExpandedKrs] = useState<Record<string, boolean>>({});
  const [pickerKrId, setPickerKrId] = useState<string | null>(null);
  const [evidenceItems, setEvidenceItems] = useState(initialPayload?.items || []);

  const selectedKrs = krs.filter(item => selectedKrIds.includes(item.keyResultId) && currentTargets.some(target => target.keyResultId === item.keyResultId && target.objectiveId === item.objectiveId));
  const activeKr = selectedKrs.find(item => item.keyResultId === activeKrId) || selectedKrs[0];
  const activeExpanded = activeKr && (expandedKrs[activeKr.keyResultId] ?? !defaultCollapsedReview(activeKr));
  const pickerKr = krs.find(item => item.keyResultId === pickerKrId);
  const sourceKr = monthlyOkrs.flatMap(objective => objective.keyResults).find(item => item.id === pickerKrId);
  const linkedIds = new Set<string>(krs.flatMap(item => item.workIds));
  const evidenceWeeks = useMemo(() => activeKr ? monthlyEvidenceTimeline(weeklyReviews, activeKr.keyResultId) : [], [weeklyReviews, activeKr]);
  const otherTasks = useMemo(() => aggregateMonthlyTasks(weeklyReviews), [weeklyReviews]);
  const achievedCount = selectedKrs.filter(item => item.currentProgress >= 100).length;
  const riskCount = selectedKrs.filter(item => item.health !== 'normal').length;
  const overallProgress = selectedKrs.length ? Math.round(selectedKrs.reduce((sum, item) => sum + item.currentProgress, 0) / selectedKrs.length) : 0;

  const updateKr = (keyResultId: string, value: Partial<OkrKrReview>) => {
    setKrs(rows => rows.map(row => row.keyResultId === keyResultId ? { ...row, ...value } : row));
  };

  const toggleKr = (keyResultId: string, checked: boolean) => {
    setSelectedKrIds(ids => checked ? Array.from(new Set([...ids, keyResultId])) : ids.filter(id => id !== keyResultId));
    if (checked) setActiveKrId(keyResultId);
    else if (activeKrId === keyResultId) setActiveKrId(selectedKrIds.find(id => id !== keyResultId) || '');
  };

  const payload = (): OkrPayload => ({
    title: `[月报] ${month.format('YYYY年MM月')}复盘`,
    ...monthPeriod(month),
    reviewType: 'month',
    reviewMode: 'monthly',
    selfScore: overallProgress,
    summary: summary.trim(),
    weeklyReviewIds: weeklyReviews.map(record => record.id),
    krReviews: selectedKrs,
    monthlyOtherTasks: otherTasks,
    otherNotes: otherNotes.trim(),
    nextMonthArrangement: nextMonthArrangement.trim(),
    nextMonthPlans: [],
    assistance: initialPayload?.assistance || [],
    helpNeeded: initialPayload?.helpNeeded || '',
    extraWork: initialPayload?.extraWork || { workIds: [], description: '', impact: 'none' },
    syncKrProgress,
    items: evidenceItems
  });

  const requestSubmit = () => {
    const errors: string[] = [];
    if (!summary.trim()) errors.push('请填写本月总结');
    if (selectedKrs.length === 0) errors.push('请至少勾选一个需要复盘的 KR');
    if (selectedKrs.some(item => item.health !== 'normal' && !item.blocker.trim())) errors.push('风险或阻塞 KR 必须填写偏差原因');
    if (!nextMonthArrangement.trim()) errors.push('请填写下个月安排');
    setValidationErrors(errors);
    if (errors.length === 0) setConfirmOpen(true);
  };

  return (
    <div className="okr-monthly-review" aria-label="月复盘编辑器">
      <header className="okr-monthly-toolbar">
        <div>
          <div className="okr-monthly-title-row"><Tag color="blue">月复盘</Tag><h2>{month.format('YYYY年MM月')}工作复盘</h2><Tag color={editorState.color}>{editorState.label}</Tag></div>
          <p>汇总当月工作成果、目标进展和后续安排</p>
        </div>
        <div className="okr-monthly-actions">
          <Button onClick={onCancel}>取消</Button>
          <Button disabled={!editorState.editable || Boolean(detachedTargets.length)} icon={<Save className="h-4 w-4" />} loading={busy} onClick={() => onSaveDraft(payload())}>存草稿</Button>
          <Button disabled={!editorState.editable || Boolean(detachedTargets.length)} type="primary" icon={<Send className="h-4 w-4" />} loading={busy} onClick={requestSubmit}>提交月报</Button>
        </div>
      </header>

      {detachedTargets.length > 0 && <Alert type="warning" showIcon title="月度目标已变化，请确认失效内容" description={<div className="space-y-2"><p>以下已填写内容暂时保留，请复制需要的信息，再确认移除。确认后可继续保存或提交。</p><pre className="whitespace-pre-wrap break-words font-sans">{detachedReviewDescription(detachedTargets)}</pre></div>} action={<Button onClick={() => setKrs(rows => rows.filter(row => currentTargets.some(target => target.keyResultId === row.keyResultId && target.objectiveId === row.objectiveId)))}>移除失效内容</Button>} />}
      {validationErrors.length > 0 && <Alert type="warning" showIcon closable title="提交前请完成以下内容" description={validationErrors.join('；')} onClose={() => setValidationErrors([])} />}

      <section className="okr-monthly-metrics" aria-label="月度概览">
        <div><Progress type="circle" percent={overallProgress} size={52} /><span><strong>整体进度</strong><small>当前月度总体完成度</small></span></div>
        <div><Target /><span><strong>KR 达成</strong><b>{achievedCount}/{krs.length}</b><small>已达成 / 总数</small></span></div>
        <div><AlertTriangle /><span><strong>风险与阻塞</strong><b>{riskCount}</b><small>需要关注的问题</small></span></div>
        <div><FileText /><span><strong>非 OKR 工作</strong><b>{otherTasks.length}</b><small>本月其他工作项</small></span></div>
      </section>

      <section className="okr-monthly-panel">
        <div className="okr-monthly-section-head"><h3>本月总结</h3></div>
        <Input.TextArea value={summary} onChange={event => setSummary(event.target.value)} autoSize={{ minRows: 4 }} placeholder="总结本月核心成果、业务价值、关键变化与主要问题" />
      </section>

      <section className="okr-monthly-kr-layout">
        <aside className="okr-monthly-okr-tree">
          <div className="okr-monthly-list-title"><h3>OKR 列表</h3><span>已选 {selectedKrs.length}/{currentTargets.length}</span></div>
          {monthlyOkrs.length === 0 ? <Empty description="本月暂无 OKR" /> : monthlyOkrs.map((objective, objectiveIndex) => {
            const objectiveKrs = krs.filter(item => item.objectiveId === objective.id && objective.keyResults.some(kr => kr.id === item.keyResultId));
            return <div key={objective.id} className="okr-monthly-tree-objective">
              <div className="okr-monthly-tree-o"><ChevronDown /><b>{objective.primaryLabel || 'O'}{objectiveIndex + 1}</b><span>{objective.objective}</span></div>
              <div className="okr-monthly-tree-krs">
                {objectiveKrs.map((kr, krIndex) => {
                  const checked = selectedKrIds.includes(kr.keyResultId);
                  return <div key={kr.keyResultId} className={`okr-monthly-tree-kr${activeKr?.keyResultId === kr.keyResultId ? ' is-active' : ''}`}>
                    <Checkbox checked={checked} onChange={event => toggleKr(kr.keyResultId, event.target.checked)} aria-label={`选择 KR${krIndex + 1}`} />
                    <button type="button" disabled={!checked} aria-expanded={Boolean(activeKr?.keyResultId === kr.keyResultId && activeExpanded)} onClick={() => { setActiveKrId(kr.keyResultId); setExpandedKrs(current => ({ ...current, [kr.keyResultId]: activeKr?.keyResultId === kr.keyResultId ? !activeExpanded : true })); }}>
                      <span><b>KR{krIndex + 1}</b>{kr.keyResultTitle}</span>
                      <Progress percent={kr.currentProgress} showInfo={false} size="small" />
                      <small>{kr.currentProgress}%</small>
                    </button>
                  </div>;
                })}
              </div>
            </div>;
          })}
        </aside>

        <div className="okr-monthly-kr-detail">
          {!activeKr ? <Empty description="请从左侧勾选一个 KR" /> : !activeExpanded ? <div className="space-y-4"><strong>{activeKr.keyResultTitle}</strong><p>{activeKr.currentProgress >= 100 ? "已完成，默认收起" : "本月无变化，默认收起"}</p><Button onClick={() => setExpandedKrs(current => ({ ...current, [activeKr.keyResultId]: true }))}>展开 A</Button></div> : <>
            <div className="okr-monthly-status-row">
              <div className="okr-monthly-current-progress"><span>本月进度</span><InputNumber min={0} max={100} value={activeKr.currentProgress} suffix="%" onChange={value => updateKr(activeKr.keyResultId, { currentProgress: value ?? 0 })} /></div>
              <span className="okr-monthly-status-divider" aria-hidden="true">|</span>
              <div className="okr-monthly-progress-change"><span>进度:</span><span className="okr-monthly-progress-values">{activeKr.previousProgress}% → <strong>{activeKr.currentProgress}%</strong></span><Progress percent={activeKr.currentProgress} showInfo={false} size="small" /><span className={activeKr.currentProgress >= activeKr.previousProgress ? 'is-positive' : 'is-negative'}>{activeKr.currentProgress >= activeKr.previousProgress ? `+${activeKr.currentProgress - activeKr.previousProgress}%` : `${activeKr.currentProgress - activeKr.previousProgress}%`}</span></div>
              <span className="okr-monthly-status-divider" aria-hidden="true">|</span>
              <div className="okr-monthly-health-control"><span>健康状态:</span><Radio.Group value={activeKr.health} size="small" onChange={event => updateKr(activeKr.keyResultId, { health: event.target.value })}><Radio value="normal"><span className="is-normal">正常</span></Radio><Radio value="risk"><span className="is-risk">有风险</span></Radio><Radio value="blocked"><span className="is-blocked">已阻塞</span></Radio></Radio.Group></div>
            </div>

            {activeKr.health !== 'normal' && <div className="okr-monthly-risk-callout"><AlertTriangle /><div><b>风险原因及所需支持</b><Input.TextArea value={activeKr.blocker} onChange={event => updateKr(activeKr.keyResultId, { blocker: event.target.value })} autoSize={{ minRows: 2 }} placeholder="说明偏差、风险、外部依赖和所需支持" /></div></div>}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3"><h4>本期关联工作证据</h4><Button onClick={() => setPickerKrId(activeKr.keyResultId)}>关联工作证据</Button><Button type="text" onClick={() => setExpandedKrs(current => ({ ...current, [activeKr.keyResultId]: false }))}>收起 A</Button></div>
              {activeKr.workIds.length ? activeKr.workIds.map(id => {
                const item = work.find(row => row.id === id);
                const saved = evidenceItems.find(row => row.workId === id);
                return <div key={id} className="flex items-center justify-between gap-3"><span>{item?.title || saved?.title || '历史工作证据'}</span><Button type="text" danger onClick={() => { updateKr(activeKr.keyResultId, { workIds: activeKr.workIds.filter(value => value !== id) }); setEvidenceItems(rows => rows.filter(row => row.workId !== id)); }}>移除</Button></div>;
              }) : <Empty description="暂无关联工作证据"/>}
            </div>

            <div className="okr-monthly-timeline">
              <h4>证据记录</h4>
              {evidenceWeeks.every(week => week.entries.length === 0) ? <p className="okr-monthly-timeline-empty">当月周复盘中暂无关联工作或非 OKR 任务。</p> : evidenceWeeks.map((week, weekIndex) => <div key={week.reviewId} className="okr-monthly-timeline-week">
                <div className="okr-monthly-timeline-marker"><span />第 {weekIndex + 1} 周<small>{week.startDate.slice(5)} 至 {week.endDate.slice(5)}</small></div>
                <div className="okr-monthly-timeline-items">
                  {week.entries.length === 0 ? <p>本周暂无证据记录</p> : week.entries.map(entry => <div key={entry.id}><strong>{entry.title}</strong><span>{entry.progressChange}</span><small>{entry.summary}</small><Tag color={entry.type === '工单' ? 'purple' : entry.type === '任务' ? 'blue' : 'default'}>{entry.type}</Tag></div>)}
                </div>
              </div>)}
            </div>
          </>}
        </div>
      </section>

      <section className="okr-monthly-bottom-grid">
        <div className="okr-monthly-panel"><div className="okr-monthly-section-head"><h3>其他补充</h3></div><Input.TextArea value={otherNotes} onChange={event => setOtherNotes(event.target.value)} autoSize={{ minRows: 6 }} placeholder="补充本月未在目标或证据中体现的工作、协同与说明" /></div>
        <div className="okr-monthly-panel"><div className="okr-monthly-section-head"><h3>下个月安排</h3></div><Input.TextArea value={nextMonthArrangement} onChange={event => setNextMonthArrangement(event.target.value)} autoSize={{ minRows: 6 }} placeholder="填写下个月的重点安排、预期结果和关键节点" /></div>
      </section>

      {pickerKr && <WorkEvidencePicker work={work} viewer={viewer} product={sourceKr?.businessObject} version={sourceKr?.version} {...monthPeriod(month)} selectedIds={pickerKr.workIds} blockedIds={linkedIds} loading={workLoading} error={workError} onRetry={onRefreshWork} onCancel={() => setPickerKrId(null)} onConfirm={ids => {
        updateKr(pickerKr.keyResultId, { workIds: ids });
        const selectedWork = work.filter(item => ids.includes(item.id));
        setEvidenceItems(rows => [...rows.filter(item => !pickerKr.workIds.includes(item.workId) || ids.includes(item.workId)), ...selectedWork.filter(item => !rows.some(row => row.workId === item.id)).map(item => ({ workId: item.id, title: item.title, status: item.status, objectiveId: pickerKr.objectiveId, keyResultId: pickerKr.keyResultId, result: '', impact: '' }))]);
        setPickerKrId(null);
      }}/>}

      <Modal open={confirmOpen} title="确认提交月复盘" okText="确认提交" cancelText="返回检查" confirmLoading={busy} okButtonProps={{ disabled: !editorState.editable || Boolean(detachedTargets.length) }} onCancel={() => setConfirmOpen(false)} onOk={async () => { if (!editorState.editable || detachedTargets.length) return; if (await onSubmit(payload())) setConfirmOpen(false); }}>
        <p>本次复盘已选择 {selectedKrs.length} 个 KR，并自动汇总 {weeklyReviews.length} 周的证据记录。</p>
        <Checkbox checked={syncKrProgress} onChange={event => setSyncKrProgress(event.target.checked)}>将月复盘确认进度同步至 KR</Checkbox>
      </Modal>
    </div>
  );
}
