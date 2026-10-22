import { EmployeeObjectiveHeader } from './EmployeeObjectiveHeader';
import { reviewEvidenceMetadata } from '../../../services/reviewEvidenceSnapshot';
import { ReviewKnowledgeContent } from './ReviewKnowledgeContent';
import { ReviewKnowledgeTable } from './ReviewKnowledgeTable';
import { ReviewTemplateLayout, reviewBlockTitle, ReviewTemplateSection, useReviewTemplateFields } from './ReviewTemplateFields';
import type { OkrSettings } from '../../../services/okrRepository';
import { departmentKrAggregation } from '../../../services/departmentReviewAggregation';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Modal, Progress, Tag, Dropdown, Table, Collapse } from 'antd';
import dayjs from 'dayjs';
import type { OKRItem, WorkOrderType } from '../../../types';
import type { OkrKrReview, OkrPayload, OkrRecord, OkrPerson } from '../../../services/okrRepository';
import { Save, Send, Plus } from '@/components/common/octicons-compat';
import { aggregateKrReview, aggregateMonthlyTasks, eligibleWeeklyReviews, monthPeriod } from './monthlyReview';
import { restoreReviewDraftTargets, reconcileReviewDraftTargets, detachedReviewDescription } from './reviewDraftTargets';
import { reviewEditorState } from '../../../services/okrReviewTemplates';
import { WorkEvidencePicker } from './WorkEvidencePicker';
import { defaultCollapsedReview } from './evidenceFilters';
import { EmployeeReviewDetailTable } from './EmployeeReviewDetailTable';
import { ReviewRiskCallout } from './ReviewRiskCallout';
import { employeeReviewHealth } from './employeeReviewHealth';
import type { EvidenceViewer } from '../../../services/reviewEvidenceRepository';
import type { OkrWork } from '../../../services/okrRepository';
import type { ReviewPeriod } from '../../../services/okrReviewRules';
import type { OkrReviewAssistance, OkrReviewKnowledge } from '../../../services/okrRepository';
import { ReviewKnowledgeModal } from './ReviewKnowledgeModal';
import { RequirementPoolView } from '../RequirementPoolView';
import { workOrderDisplayName } from '../../../utils/workOrderDisplay';
import { loadMonthlyReviewMetrics, loadDepartmentMonthlyComparison, type MonthlyReviewMetrics } from '../../../services/monthlyReviewMetrics';
import './weeklyReviewEditor.css';
import { MonthlyOverview } from './MonthlyOverview';
import { monthlyOverallProgress, monthlyProgressTrend, savedReviewProgress } from '../../../services/monthlyProgress';

const assistanceTypes: WorkOrderType[] = ['客户诉求', '线上问题', '售前支持', '交付支持', '其他问题'];
const EMPTY_WORK: OkrWork[] = [];
const EMPTY_PEOPLE: OkrPerson[] = [];
const historicalExtraDescription = (description: string) => {
  if (!description.startsWith('[')) return description;
  try {
    const rows: unknown = JSON.parse(description);
    return Array.isArray(rows) ? rows.filter(row => row && typeof row === 'object').map(row => [row.content || '历史工作', row.source, row.status, row.hours ? `${row.hours} 小时` : ''].filter(Boolean).join(' · ')).join('\n') : description;
  } catch { return description; }
};


interface MonthlyReviewEditorProps {
  reviewSettings?: OkrSettings;
  key?: React.Key;
  template?: 'employee' | 'supervisor';
  people?: OkrPerson[];
  recordsLoading?: boolean;
  recordsError?: unknown;
  onRefreshRecords?: () => void;
  okrs: OKRItem[];
  records: OkrRecord[];
  currentUserId: string;
  busy: boolean;
  onSaveDraft: (payload: OkrPayload) => Promise<boolean>;
  onSubmit: (payload: OkrPayload) => Promise<boolean>;
  onCancel: () => void;
  recordStatus?: string;
  onCopy?: () => void;
  initialPayload?: OkrPayload;
  periodOverride?: ReviewPeriod;
  work?: OkrWork[]; viewer?: EvidenceViewer; workLoading?: boolean; workError?: unknown; onRefreshWork?: () => void;
}

export function MonthlyReviewEditor({ reviewSettings, template = 'employee', people = EMPTY_PEOPLE, recordsLoading = false, recordsError, onRefreshRecords, okrs, records, currentUserId, busy, onSaveDraft, onSubmit, onCancel, onCopy, recordStatus, initialPayload, periodOverride, work = EMPTY_WORK, viewer, workLoading, workError, onRefreshWork }: MonthlyReviewEditorProps) {
  const editorState = reviewEditorState(recordStatus);
  const readOnly = !editorState.editable;
  const month = useMemo(() => dayjs(periodOverride?.startDate || initialPayload?.startDate).startOf('month'), [periodOverride?.startDate, initialPayload?.startDate]);
  const monthlyOkrs = useMemo(() => {
    if (!readOnly) return okrs.filter(objective => objective.cycle === month.format('YYYY-MM'));
    // Submitted reports show their saved plans, including goals that were later removed.
    const snapshots: OKRItem[] = [];
    for (const row of initialPayload?.krReviews || []) {
      let objective = snapshots.find(item => item.id === row.objectiveId);
      if (!objective) {
        objective = { id: row.objectiveId, cycle: month.format('YYYY-MM'), ownerId: currentUserId,
          ownerName: viewer?.name || '', department: viewer?.department || '', category: 'my', primaryLabel: 'KR',
          objective: row.objectiveTitle, progress: 0, weight: 100, deadline: month.endOf('month').format('YYYY-MM-DD'), keyResults: [] };
        snapshots.push(objective);
      }
      objective.keyResults.push({ id: row.keyResultId, content: row.keyResultTitle, progress: row.currentProgress,
        weight: 100, deadline: objective.deadline, parentKeyResultDetails: row.detailRows });
    }
    return snapshots;
  }, [okrs, month, readOnly, template, initialPayload?.krReviews, currentUserId, viewer?.name, viewer?.department]);
  const weeklyReviews = useMemo(() => eligibleWeeklyReviews(records, currentUserId, month), [records, currentUserId, month]);
  const currentTargets = useMemo(() => monthlyOkrs.flatMap(objective => objective.keyResults.map(keyResult => {
    if (readOnly) return initialPayload!.krReviews!.find(row => row.objectiveId === objective.id && row.keyResultId === keyResult.id)!;
    const latest = [...weeklyReviews].reverse().flatMap(record => record.payload.krReviews || [])
      .find(row => row.objectiveId === objective.id && row.keyResultId === keyResult.id);
    const target = aggregateKrReview(objective.id, keyResult.id, keyResult.content, 0, weeklyReviews);
    if (template === 'supervisor') {
      const supervisorProgress = target.supervisorProgress?.filter(row => keyResult.details?.length
        ? keyResult.details.some(detail => detail.id === row.id && detail.assigneeIds?.includes(currentUserId))
        : row.id === keyResult.id && keyResult.assigneeIds?.includes(currentUserId));
      return departmentKrAggregation(objective, { ...target, supervisorProgress }, records, people, currentUserId, monthPeriod(month), 'month');
    }
    return { ...target, detailRows: keyResult.parentKeyResultDetails,
      detailProgress: latest?.detailProgress?.filter(row => keyResult.parentKeyResultDetails?.some(detail => detail.id === row.id)).map(row => ({ ...row, previousProgress: row.currentProgress })),
      objectiveTitle: objective.objective };
  })), [monthlyOkrs, weeklyReviews, template, records, people, currentUserId, month, readOnly, initialPayload]);
  const initialKrs = useMemo(() => readOnly ? currentTargets : restoreReviewDraftTargets(currentTargets, initialPayload), [currentTargets, initialPayload, readOnly]);
  const [krs, setKrs] = useState(() => initialKrs);
  const lastTargetIds = useRef(new Set(currentTargets.map(row => row.keyResultId)));
  useEffect(() => {
    if (readOnly) return;
    const added = currentTargets.filter(row => !lastTargetIds.current.has(row.keyResultId)).map(row => row.keyResultId);
    setKrs(previous => reconcileReviewDraftTargets(previous, currentTargets));
    setSelectedKrIds(previous => [...new Set([...previous, ...added])]);
    lastTargetIds.current = new Set(currentTargets.map(row => row.keyResultId));
  }, [currentTargets, readOnly]);
  const detachedTargets = initialPayload?.reviewTemplateSnapshot?.blocks.some(block => block.id === 'goals' && block.visible === false) ? [] : krs.filter(row => !currentTargets.some(target => target.objectiveId === row.objectiveId && target.keyResultId === row.keyResultId));
  const [selectedKrIds, setSelectedKrIds] = useState(() => initialPayload?.startDate ? initialKrs.filter(item => initialPayload.krReviews?.some(kr => kr.keyResultId === item.keyResultId)).map(item => item.keyResultId) : initialKrs.map(item => item.keyResultId));
  const [suggestions, setSuggestions] = useState(initialPayload?.suggestions || initialPayload?.otherNotes || '');
  const [extraWork, setExtraWork] = useState(initialPayload?.extraWork || { workIds: [], description: '', impact: 'none' });
  const [assistance, setAssistance] = useState<OkrReviewAssistance[]>(initialPayload?.assistance || []);
  const [knowledgeEntries, setKnowledgeEntries] = useState<OkrReviewKnowledge[]>(initialPayload?.knowledgeEntries || []);
  const [creationType, setCreationType] = useState<WorkOrderType | null>(null);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [viewingKnowledge, setViewingKnowledge] = useState<OkrReviewKnowledge | null>(null);
  const [metrics, setMetrics] = useState<MonthlyReviewMetrics>();
  const [metricsError, setMetricsError] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsRevision, setMetricsRevision] = useState(0);
  const period = useMemo(() => monthPeriod(month), [month]);
  const metricsScope = `${currentUserId}:${viewer?.department || ''}:${period.startDate}:${period.endDate}:${template}:${readOnly}`;
  const lastMetricsScope = useRef(metricsScope);
  const reportTemplate = useReviewTemplateFields(reviewSettings, initialPayload, viewer?.department || '', template, 'month', period.startDate);
  useEffect(() => {
    if (readOnly) {
      setMetrics(initialPayload?.monthlyMetrics);
      setMetricsLoading(false);
      setMetricsError(false);
      return;
    }
    let active = true;
    if (lastMetricsScope.current !== metricsScope) {
      setMetrics(undefined);
      lastMetricsScope.current = metricsScope;
    }
    setMetricsLoading(true);
    setMetricsError(false);
    if (workLoading || workError) {
      setMetricsLoading(Boolean(workLoading));
      setMetricsError(Boolean(workError));
      return () => { active = false; };
    }
    const metricViewer = { id: currentUserId, name: viewer?.name || '', department: viewer?.department };
    Promise.all([loadMonthlyReviewMetrics(work, period, metricViewer), loadDepartmentMonthlyComparison(work, period, metricViewer, people)])
      .then(([value, comparison]) => { if (active) setMetrics({ ...value, ...comparison }); })
      .catch(() => { if (active) setMetricsError(true); })
      .finally(() => { if (active) setMetricsLoading(false); });
    return () => { active = false; };
  }, [work, workLoading, workError, period, currentUserId, viewer?.name, viewer?.department, people, metricsRevision, readOnly, template, initialPayload?.monthlyMetrics, metricsScope]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [expandedKrs, setExpandedKrs] = useState<Record<string, boolean>>({});
  const [pickerKrId, setPickerKrId] = useState<string | null>(null);
  const [evidenceItems, setEvidenceItems] = useState(initialPayload?.items || []);

  const selectedKrs = krs.filter(item => selectedKrIds.includes(item.keyResultId) && currentTargets.some(target => target.keyResultId === item.keyResultId && target.objectiveId === item.objectiveId));
  const pickerKr = pickerKrId === 'extra' ? { ...extraWork, objectiveId: undefined, keyResultId: undefined } : krs.find(item => item.keyResultId === pickerKrId);
  const sourceKr = monthlyOkrs.flatMap(objective => objective.keyResults).find(item => item.id === pickerKrId);
  const linkedIds = new Set<string>(krs.flatMap(item => item.workIds).concat(extraWork.workIds));
  const otherTasks = useMemo(() => aggregateMonthlyTasks(weeklyReviews), [weeklyReviews]);
  const planProgress = (row: OkrKrReview) => {
    if (readOnly) return row.currentProgress;
    const action = monthlyOkrs.find(objective => objective.id === row.objectiveId)?.keyResults.find(kr => kr.id === row.keyResultId);
    const details = action?.parentKeyResultDetails || [];
    return details.length ? Math.round(details.reduce((sum, detail) => sum + (row.detailProgress?.find(item => item.id === detail.id)?.currentProgress ?? 0), 0) / details.length) : row.currentProgress;
  };
  const planHealth = (row: OkrKrReview) => {
    if (readOnly) return row.executionHealth || (row.health === 'risk' ? '风险' : row.health === 'blocked' ? '逾期' : '正常');
    const objective = monthlyOkrs.find(item => item.id === row.objectiveId);
    const action = objective?.keyResults.find(item => item.id === row.keyResultId);
    const today = dayjs().isBefore(month.endOf('month'), 'day') ? dayjs() : month.endOf('month');
    return employeeReviewHealth(planProgress(row), action?.plannedStartDate || month.startOf('month').format('YYYY-MM-DD'), action?.deadline || month.endOf('month').format('YYYY-MM-DD'), today.format('YYYY-MM-DD'));
  };
  const overallProgress = readOnly ? savedReviewProgress(initialPayload || { title: '' }) : monthlyOverallProgress(monthlyOkrs, selectedKrs.map(row => ({ ...row, currentProgress: planProgress(row) })));
  const progressTrend = readOnly ? initialPayload?.monthlyMetrics?.progressTrend || [] : monthlyProgressTrend(weeklyReviews, overallProgress ?? 0, period.endDate, template === 'supervisor');
  const savedMetrics = (rows: OkrKrReview[] = selectedKrs.map(row => ({ ...row, currentProgress: planProgress(row) }))) => {
    if (readOnly) return initialPayload?.monthlyMetrics;
    const progress = monthlyOverallProgress(monthlyOkrs, rows);
    return { ...(metricsError || metricsLoading ? initialPayload?.monthlyMetrics : metrics), overallProgress: progress, progressTrend: monthlyProgressTrend(weeklyReviews, progress, period.endDate, template === 'supervisor') } as MonthlyReviewMetrics;
  };

  const updateKr = (keyResultId: string, value: Partial<OkrKrReview>) => {
    setKrs(rows => rows.map(row => row.keyResultId === keyResultId ? { ...row, ...value } : row));
  };

  const toggleKr = (keyResultId: string, checked: boolean) => {
    setSelectedKrIds(ids => checked ? Array.from(new Set([...ids, keyResultId])) : ids.filter(id => id !== keyResultId));
  };

  const payload = (): OkrPayload => ({
    ...reportTemplate.payload,
    title: `[月报] ${month.format('YYYY年MM月')}复盘`,
    ...monthPeriod(month),
    reviewType: 'month',
    reviewMode: 'monthly',
    selfScore: overallProgress,
    objectiveSnapshots: monthlyOkrs.map(objective => ({ id: objective.id, period: objective.cycle, payload: { title: objective.objective, weight: objective.weight, keyResults: objective.keyResults.map(kr => ({ id: kr.id, title: kr.content, weight: kr.weight, progress: selectedKrs.find(row => row.objectiveId === objective.id && row.keyResultId === kr.id)?.currentProgress ?? kr.progress })) } })),
    summary: initialPayload?.summary || '',
    weeklyReviewIds: weeklyReviews.map(record => record.id),
    krReviews: selectedKrs.map(row => ({ ...row, executionHealth: planHealth(row) || undefined, detailRows: monthlyOkrs.find(objective => objective.id === row.objectiveId)?.keyResults.find(kr => kr.id === row.keyResultId)?.parentKeyResultDetails, currentProgress: planProgress(row), health: planHealth(row) === '风险' ? 'risk' as const : planHealth(row) === '逾期' ? 'blocked' as const : 'normal' as const })),
    monthlyOtherTasks: otherTasks,
    otherNotes: initialPayload?.otherNotes || '',
    nextMonthArrangement: initialPayload?.nextMonthArrangement || '',
    suggestions: reportTemplate.textValue('suggestions', suggestions).trim(),
    knowledgeEntries,
    monthlyMetrics: savedMetrics(),
    nextMonthPlans: [],
    assistance,
    helpNeeded: assistance.map(row => row.content || row.result).filter(Boolean).join('；') || initialPayload?.helpNeeded || '',
    extraWork: { ...extraWork, impact: 'none' },
    syncKrProgress: false,
    items: evidenceItems.map(item => { const current = work.find(row => row.id === item.workId); return current ? { ...item, ...reviewEvidenceMetadata(current) } : item; })
  });

  const requestSubmit = () => {
    const errors: string[] = reportTemplate.errors();
    setValidationErrors(errors);
    if (errors.length === 0) setConfirmOpen(true);
  };

  const renderOverview = (rows?: OkrKrReview[]) => {
    const progress = rows && !readOnly ? monthlyOverallProgress(monthlyOkrs, rows) : overallProgress;
    const points = rows && !readOnly ? monthlyProgressTrend(weeklyReviews, progress ?? 0, period.endDate, template === 'supervisor') : progressTrend;
    return <MonthlyOverview progress={progress} points={points} metrics={metrics} loading={metricsLoading} error={metricsError} progressLoading={!readOnly && recordsLoading} progressError={!readOnly && Boolean(recordsError)} onRetryProgress={onRefreshRecords} department={template === 'supervisor'} onRetry={() => { onRefreshWork?.(); setMetricsRevision(value => value + 1); }}/>;
  };
  const monthlyOverview = renderOverview();
  if (template === 'supervisor') return <WeeklyReviewEditor reviewSettings={reviewSettings} template="supervisor" reviewType="month" overview={rows => renderOverview(rows)} records={records} people={people} recordsLoading={recordsLoading} recordsError={recordsError} onRefreshRecords={onRefreshRecords}
    periodOverride={period} initialPayload={initialPayload} recordStatus={recordStatus} okrs={okrs} work={work} viewer={viewer} busy={busy} workLoading={Boolean(workLoading)} workError={workError} onRefreshWork={onRefreshWork || (() => {})} onCancel={onCancel} onCopy={onCopy} directSubmit
    onSaveDraft={payload => onSaveDraft({ ...payload, monthlyMetrics: savedMetrics(payload.krReviews) })}
    onSubmit={payload => onSubmit({ ...payload, monthlyMetrics: savedMetrics(payload.krReviews) })}/>;
  return (
    <div className="okr-monthly-review okr-weekly-editor" aria-label="月复盘编辑器">
      <header className="okr-monthly-toolbar">
        <div>
          <div className="okr-monthly-title-row"><Tag color="blue">月报</Tag><h2>{month.year()}年第{month.month() + 1}月 月报-{viewer?.department?.trim() || '部门未设置'}</h2><Tag color={editorState.color}>{editorState.label}</Tag></div>
        </div>
        <div className="okr-monthly-actions">
          <Button onClick={onCancel}>取消</Button>
          {readOnly ? onCopy && <Button type="primary" onClick={onCopy}>复制为本期</Button> : <>
            <Button disabled={Boolean(detachedTargets.length)} icon={<Save className="h-4 w-4" />} loading={busy} onClick={() => onSaveDraft(payload())}>存草稿</Button>
            <Button disabled={Boolean(detachedTargets.length)} type="primary" icon={<Send className="h-4 w-4" />} loading={busy} onClick={requestSubmit}>提交月报</Button>
          </>}
        </div>
      </header>

      {detachedTargets.length > 0 && <Alert type="warning" showIcon title="月度目标已变化，请确认失效内容" description={<div className="space-y-2"><p>以下已填写内容暂时保留，请复制需要的信息，再确认移除。确认后可继续保存或提交。</p><pre className="whitespace-pre-wrap break-words font-sans">{detachedReviewDescription(detachedTargets)}</pre></div>} action={<Button onClick={() => setKrs(rows => rows.filter(row => currentTargets.some(target => target.keyResultId === row.keyResultId && target.objectiveId === row.objectiveId)))}>移除失效内容</Button>} />}
      {validationErrors.length > 0 && <Alert type="warning" showIcon closable title="提交前请完成以下内容" description={validationErrors.join('；')} onClose={() => setValidationErrors([])} />}

      {monthlyOverview}

      <ReviewTemplateLayout template={reportTemplate.snapshot} values={reportTemplate.values} onChange={reportTemplate.setValues} people={people} disabled={busy || readOnly}>
      <section data-review-block="goals" className="okr-weekly-section" aria-label="本月目标复盘">
        <div className="okr-weekly-section-header"><h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><span aria-hidden="true" className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />{reviewBlockTitle(reportTemplate.snapshot, 'goals', '1. 本月目标复盘')}</h3></div>
      {monthlyOkrs.length === 0 ? <Empty description="本月暂无 OKR" /> : monthlyOkrs.map((objective, objectiveIndex) => <Collapse key={objective.id} className="okr-review-objective-collapse" defaultActiveKey={[objective.id]} expandIconPosition="end" items={[{
        key: objective.id,
        label: <EmployeeObjectiveHeader objective={objective} records={records} index={objectiveIndex} startDate={period.startDate} endDate={period.endDate} reviewType="month"/>,         children: <div className="okr-review-a-list grid gap-4 p-4">{krs.filter(kr => kr.objectiveId === objective.id && objective.keyResults.some(target => target.id === kr.keyResultId)).map((kr, index) => {
          const expanded = expandedKrs[kr.keyResultId] ?? !defaultCollapsedReview(kr);
          const selected = selectedKrIds.includes(kr.keyResultId);
          const action = objective.keyResults.find(item => item.id === kr.keyResultId);
          const details = action?.parentKeyResultDetails || [];
          const health = planHealth(kr);
          const progress = planProgress(kr);
          return <Collapse key={kr.keyResultId} className="okr-review-a-collapse" activeKey={expanded && selected ? [kr.keyResultId] : []} expandIconPosition="end" onChange={keys => setExpandedKrs(rows => ({ ...rows, [kr.keyResultId]: Boolean(keys.length) }))} items={[{
            key: kr.keyResultId,
            label: <div className="min-w-0 space-y-2 w-full"><div className="flex flex-wrap items-center gap-3"><span onClick={event => event.stopPropagation()}><Checkbox checked={selected} disabled={busy || !editorState.editable} aria-label={`选择 KR${index + 1}`} onChange={event => toggleKr(kr.keyResultId, event.target.checked)}/></span><strong>我负责的部门KR：{kr.keyResultTitle}</strong><Tag>{progress}%</Tag><Tag color={health === '超预期' ? 'success' : health === '风险' ? 'warning' : health === '逾期' ? 'error' : undefined}>{health || '暂无预期'}</Tag></div><div className="flex items-center gap-3" aria-label="部门KR进度"><Progress percent={action?.parentKeyResultProgress ?? action?.progress ?? 0} showInfo={false} size="small"/><span>{action?.parentKeyResultProgress ?? action?.progress ?? 0}%</span></div></div>,
            children: <div className="space-y-4">
              {details.length ? <EmployeeReviewDetailTable rows={details} productName={action?.businessObject} progress={kr.detailProgress || []}
                disabled={busy || !editorState.editable} onChange={detailProgress => updateKr(kr.keyResultId, { detailProgress })}/>
                : <div className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-body)]">
                  <span>复盘前进度: {kr.previousProgress}% → 本期更新进度:</span>
                  <InputNumber aria-label="本期更新进度" min={0} max={100} precision={0} suffix="%" size="small" disabled={busy || !editorState.editable} value={kr.currentProgress} onChange={value => updateKr(kr.keyResultId, { currentProgress: value ?? 0 })}/>
                  <span>进度: {kr.previousProgress}% → {kr.currentProgress}%</span><Progress percent={kr.currentProgress} showInfo={false} size="small" className="okr-review-progress-compact"/>
                </div>}
              {(health === '风险' || health === '逾期') && <ReviewRiskCallout value={kr.blocker} onChange={value => updateKr(kr.keyResultId, { blocker: value })} disabled={busy || !editorState.editable} label={`${kr.keyResultTitle}风险原因及所需支持`}/>}
              <div className="okr-weekly-section-header"><h4>本期关联工作任务</h4><Button disabled={busy || !editorState.editable} icon={<Plus className="h-3.5 w-3.5"/>} onClick={() => setPickerKrId(kr.keyResultId)}>关联工作任务</Button></div>
              {kr.workIds.length > 0 ? <div className="border border-[var(--border-main)] rounded overflow-hidden bg-[var(--bg-card)]"><Table size="small" rowKey="workId" pagination={false} dataSource={kr.workIds.map(id => {
                const live = readOnly ? undefined : work.find(item => item.id === id);
                const saved = evidenceItems.find(item => item.workId === id);
                return { workId: id, title: live?.title || saved?.title || '历史工作任务', sourceLabel: live ? [live.productLineName, live.versionName].filter(Boolean).join(' / ') : saved?.sourceLabel, status: live?.status || saved?.status, actualHours: live?.actualHours ?? saved?.actualHours };
              })} locale={{ emptyText: <Empty description="暂无关联工作任务"/> }} columns={[
                { title: '标题', dataIndex: 'title', ellipsis: true }, { title: '来源归属', render: (_, row) => row.sourceLabel || '—' }, { title: '状态', dataIndex: 'status' },
                { title: '任务工时', render: (_, row) => row.actualHours == null ? '—' : `${row.actualHours} 小时` },
                { title: '删除操作', hidden: readOnly, render: (_, row) => <Button type="text" danger disabled={busy || !editorState.editable} onClick={() => { updateKr(kr.keyResultId, { workIds: kr.workIds.filter(id => id !== row.workId) }); setEvidenceItems(rows => rows.filter(item => item.workId !== row.workId)); }}>删除</Button> },
              ]}/></div> : <div className="p-3 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-main)] rounded bg-[var(--bg-card)]">(暂未关联本期工作任务)</div>}

            </div>,
          }]}/>;
        })}</div>,
      }]}/>)}
      <ReviewTemplateSection template={reportTemplate.snapshot} blockId="goals" values={reportTemplate.values} onChange={reportTemplate.setValues} people={people} disabled={busy || readOnly}/>
      </section>
      <section data-review-block="extra" className="okr-weekly-section" aria-label="插播任务">
        <div className="okr-weekly-section-header"><h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><span aria-hidden="true" className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />{reviewBlockTitle(reportTemplate.snapshot, 'extra', '2. 插播任务')}</h3><Button icon={<Plus className="h-3.5 w-3.5" />} disabled={busy || !editorState.editable} onClick={() => setPickerKrId('extra')}>关联工作任务</Button></div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-4 shadow-sm">
        {extraWork.workIds.length > 0 ? <div className="border border-[var(--border-main)] rounded overflow-hidden"><Table size="small" rowKey="workId" pagination={false} dataSource={extraWork.workIds.map(id => {
          const live = readOnly ? undefined : work.find(item => item.id === id);
          const saved = evidenceItems.find(item => item.workId === id);
          return { workId: id, title: live?.title || saved?.title || '历史工作任务', sourceLabel: live ? [live.productLineName, live.versionName].filter(Boolean).join(' / ') : saved?.sourceLabel, status: live?.status || saved?.status, actualHours: live?.actualHours ?? saved?.actualHours };
        })} locale={{ emptyText: <Empty description="暂无插播任务" /> }} columns={[
          { title: '标题', dataIndex: 'title', ellipsis: true },
          { title: '来源归属', render: (_, row) => row.sourceLabel || '—' },
          { title: '状态', dataIndex: 'status' },
          { title: '任务工时', render: (_, row) => row.actualHours == null ? '—' : `${row.actualHours} 小时` },
          { title: '删除操作', hidden: readOnly, render: (_, row) => <Button type="text" danger disabled={busy || !editorState.editable} onClick={() => { setExtraWork(value => ({ ...value, workIds: value.workIds.filter(id => id !== row.workId) })); setEvidenceItems(rows => rows.filter(item => item.workId !== row.workId)); }}>删除</Button> },
        ]}/></div> : <Empty description="暂无插播任务" />}
        {extraWork.description && <div className="okr-monthly-panel"><p className="whitespace-pre-wrap">{historicalExtraDescription(extraWork.description)}</p><Button type="text" danger disabled={busy || !editorState.editable} onClick={() => setExtraWork(value => ({ ...value, description: '' }))}>删除历史补充</Button></div>}
        </div>
      <ReviewTemplateSection template={reportTemplate.snapshot} blockId="extra" values={reportTemplate.values} onChange={reportTemplate.setValues} people={people} disabled={busy || readOnly}/>
      </section>
      {reportTemplate.snapshot?.configurationVersion !== 2 && !reportTemplate.hasBlock('suggestions') && <section className="okr-weekly-section" aria-label="对公司或部门发展有帮助的意见和建议">
        <div className="okr-weekly-section-header"><h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><span aria-hidden="true" className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />3. 对公司或部门发展有帮助的意见和建议</h3></div>
        <Input.TextArea className="okr-weekly-plan-input" aria-label="对公司或部门发展有帮助的意见和建议" rows={4} maxLength={10000} showCount value={suggestions} onChange={event => setSuggestions(event.target.value)} disabled={busy || !editorState.editable} placeholder="填写对公司或部门发展有帮助的意见和建议" />
      </section>}
      <section data-review-block="assistance" className="okr-weekly-section" aria-label="需要协助事项">
        <div className="okr-weekly-section-header">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>{reviewBlockTitle(reportTemplate.snapshot, 'assistance', '4. 需要协助事项')}</span>
          </div>
          <Dropdown trigger={['click']} disabled={busy || !editorState.editable} menu={{
            items: assistanceTypes.map(type => ({ key: type, label: workOrderDisplayName(type) })),
            onClick: ({ key }) => setCreationType(key as WorkOrderType),
          }}><Button icon={<Plus className="h-3.5 w-3.5" />} disabled={busy || !editorState.editable}>发起协同</Button></Dropdown>
        </div>
        <div className={assistance.length ? 'okr-weekly-list-panel' : 'okr-weekly-empty-panel'}>
        {assistance.length > 0 ? <Table size="small" rowKey={row => row.workId || row.subject} pagination={false} dataSource={assistance}
          locale={{ emptyText: <Empty description="暂无需要协助事项" /> }} columns={[
            { title: '标题', dataIndex: 'subject', ellipsis: true },
            { title: '事项类型', render: (_, row) => workOrderDisplayName(row.assistanceType) || '—' },
            { title: '负责人', dataIndex: 'expectedAssignee' },
            { title: '状态', render: (_, row) => row.status || '未发起' },
            { title: '删除操作', hidden: readOnly, render: (_, row, index) => <Button type="text" danger disabled={busy || !editorState.editable} aria-label={`移除协同事项${row.subject}`} onClick={() => setAssistance(rows => rows.filter((_, rowIndex) => rowIndex !== index))}>删除</Button> },
          ]}/> : <Empty description="暂无需要协助事项" />}
        </div>
      <ReviewTemplateSection template={reportTemplate.snapshot} blockId="assistance" values={reportTemplate.values} onChange={reportTemplate.setValues} people={people} disabled={busy || readOnly}/>
      </section>

      <section data-review-block="knowledge" className="okr-weekly-section" aria-label="知识沉淀">
        <div className="okr-weekly-section-header">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>{reviewBlockTitle(reportTemplate.snapshot, 'knowledge', '5. 知识沉淀')}</span>
          </div>
          <Button disabled={busy || !editorState.editable} icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setKnowledgeOpen(true)}>新建知识沉淀</Button>
        </div>
        <div className={knowledgeEntries.length ? 'okr-weekly-list-panel' : 'okr-weekly-empty-panel'}>
        <ReviewKnowledgeTable entries={knowledgeEntries} readOnly={readOnly} disabled={busy || !editorState.editable} onView={setViewingKnowledge} onDelete={id => setKnowledgeEntries(rows => rows.filter(item => item.id !== id))}/>
        </div>
      <ReviewTemplateSection template={reportTemplate.snapshot} blockId="knowledge" values={reportTemplate.values} onChange={reportTemplate.setValues} people={people} disabled={busy || readOnly}/>
      </section>
      </ReviewTemplateLayout>
      {viewingKnowledge && <Modal open title={viewingKnowledge.title} onCancel={() => setViewingKnowledge(null)} footer={<Button aria-label="关闭知识详情" onClick={() => setViewingKnowledge(null)}>关闭</Button>}>
        <ReviewKnowledgeContent entry={viewingKnowledge}/>
      </Modal>}
      {knowledgeOpen && <ReviewKnowledgeModal onClose={() => setKnowledgeOpen(false)} onSubmit={doc => {
        setKnowledgeEntries(rows => [...rows, { ...doc, id: crypto.randomUUID(), title: doc.title || '', category: '应知应会' }]);
      }}/>}

      {creationType && <Modal open title={`新建${workOrderDisplayName(creationType)}`} width={1120} footer={null} closable={false} mask={{ closable: false }} keyboard={false}>
        <RequirementPoolView creationType={creationType} onCancelCreation={() => setCreationType(null)} onCreated={task => {
          setAssistance(rows => [...rows, { workId: task.id, subject: task.title, assistanceType: task.workOrderType || creationType,
            expectedAssignee: task.ownerName || '', status: task.status, expectedDueDate: task.expectedCompleteDate || '',
            content: task.description || task.title, result: task.description || task.title }]);
          setCreationType(null);
        }}/>
      </Modal>}

      {pickerKr && <WorkEvidencePicker requireProduct={pickerKrId !== 'extra'} work={work} viewer={viewer} product={sourceKr?.businessObject} version={sourceKr?.version} {...monthPeriod(month)} selectedIds={pickerKr.workIds} blockedIds={linkedIds} loading={workLoading} error={workError} onRetry={onRefreshWork} onCancel={() => setPickerKrId(null)} onConfirm={ids => {
        if (pickerKrId === 'extra') setExtraWork(value => ({ ...value, workIds: ids }));
        else if (pickerKr.keyResultId) updateKr(pickerKr.keyResultId, { workIds: ids });
        const selectedWork = work.filter(item => ids.includes(item.id));
        setEvidenceItems(rows => [...rows.filter(item => !pickerKr.workIds.includes(item.workId) || ids.includes(item.workId)), ...selectedWork.filter(item => !rows.some(row => row.workId === item.id)).map(item => ({ workId: item.id, ...reviewEvidenceMetadata(item), title: item.title, status: item.status, workType: 'task' as const, sourceLabel: [item.productLineName, item.versionName].filter(Boolean).join(' / '), actualHours: item.actualHours, objectiveId: pickerKr.objectiveId, keyResultId: pickerKr.keyResultId, result: '', impact: '' }))]);
        setPickerKrId(null);
      }}/>}

      <Modal open={confirmOpen} title="提交月报确认" okText="确认提交" cancelText="返回检查" confirmLoading={busy} okButtonProps={{ disabled: !editorState.editable || Boolean(detachedTargets.length) }} onCancel={() => setConfirmOpen(false)} onOk={async () => { if (!editorState.editable || detachedTargets.length) return; if (await onSubmit(payload())) setConfirmOpen(false); }}>
        <p>确认提交 {month.year()} 年 {month.month() + 1} 月的个人月报吗？</p>
        <p>提交后将进入主管评价流程，本份月报不可直接修改。需要调整内容，请返回检查。</p>
      </Modal>
    </div>
  );
}
