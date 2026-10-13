import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Input, InputNumber, Modal, Progress, Radio, Tag, Dropdown, Table, Collapse } from 'antd';
import dayjs from 'dayjs';
import type { OKRItem, WorkOrderType } from '../../../types';
import type { OkrKrReview, OkrPayload, OkrRecord } from '../../../services/okrRepository';
import { FileText, Save, Send, Target, Plus } from '@/components/common/octicons-compat';
import { aggregateKrReview, aggregateMonthlyTasks, eligibleWeeklyReviews, monthPeriod, monthlyEvidenceTimeline, suggestMonthlySummary } from './monthlyReview';
import { restoreReviewDraftTargets, reconcileReviewDraftTargets, detachedReviewDescription } from './reviewDraftTargets';
import { reviewEditorState } from '../../../services/okrReviewTemplates';
import { WorkEvidencePicker } from './WorkEvidencePicker';
import { defaultCollapsedReview } from './evidenceFilters';
import type { EvidenceViewer } from '../../../services/reviewEvidenceRepository';
import type { OkrWork } from '../../../services/okrRepository';
import type { ReviewPeriod } from '../../../services/okrReviewRules';
import type { OkrReviewAssistance, OkrReviewKnowledge } from '../../../services/okrRepository';
import { KnowledgeUploadModal } from '../KnowledgeUploadModal';
import { RequirementPoolView } from '../RequirementPoolView';
import { workOrderDisplayName } from '../../../utils/workOrderDisplay';
import { loadMonthlyReviewMetrics, type MonthlyReviewMetrics } from '../../../services/monthlyReviewMetrics';
import './weeklyReviewEditor.css';

const assistanceTypes: WorkOrderType[] = ['客户诉求', '线上问题', '售前支持', '交付支持', '其他问题'];
const EMPTY_WORK: OkrWork[] = [];
const historicalExtraDescription = (description: string) => {
  if (!description.startsWith('[')) return description;
  try {
    const rows: unknown = JSON.parse(description);
    return Array.isArray(rows) ? rows.filter(row => row && typeof row === 'object').map(row => [row.content || '历史工作', row.source, row.status, row.hours ? `${row.hours} 小时` : ''].filter(Boolean).join(' · ')).join('\n') : description;
  } catch { return description; }
};


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

export function MonthlyReviewEditor({ okrs, records, currentUserId, busy, onSaveDraft, onSubmit, onCancel, recordStatus, initialPayload, periodOverride, work = EMPTY_WORK, viewer, workLoading, workError, onRefreshWork }: MonthlyReviewEditorProps) {
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
  const [summary, setSummary] = useState(() => initialPayload?.summary || suggestMonthlySummary(weeklyReviews));
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
  useEffect(() => {
    let active = true;
    setMetricsLoading(true);
    setMetricsError(false);
    if (workLoading || workError) {
      setMetricsLoading(Boolean(workLoading));
      setMetricsError(Boolean(workError));
      return () => { active = false; };
    }
    loadMonthlyReviewMetrics(work, period, { id: currentUserId, name: viewer?.name || '' })
      .then(value => { if (active) setMetrics(value); })
      .catch(() => { if (active) setMetricsError(true); })
      .finally(() => { if (active) setMetricsLoading(false); });
    return () => { active = false; };
  }, [work, workLoading, workError, period, currentUserId, viewer?.name, metricsRevision]);
  const [syncKrProgress, setSyncKrProgress] = useState(initialPayload?.syncKrProgress ?? true);
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
  const metricValue = (value?: number) => metricsLoading ? '加载中' : metricsError || value == null ? '—' : value;
  const overallProgress = selectedKrs.length ? Math.round(selectedKrs.reduce((sum, item) => sum + item.currentProgress, 0) / selectedKrs.length) : 0;

  const updateKr = (keyResultId: string, value: Partial<OkrKrReview>) => {
    setKrs(rows => rows.map(row => row.keyResultId === keyResultId ? { ...row, ...value } : row));
  };

  const toggleKr = (keyResultId: string, checked: boolean) => {
    setSelectedKrIds(ids => checked ? Array.from(new Set([...ids, keyResultId])) : ids.filter(id => id !== keyResultId));
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
    otherNotes: initialPayload?.otherNotes || '',
    nextMonthArrangement: initialPayload?.nextMonthArrangement || '',
    suggestions: suggestions.trim(),
    knowledgeEntries,
    monthlyMetrics: !metricsLoading && !metricsError ? metrics : initialPayload?.monthlyMetrics,
    nextMonthPlans: [],
    assistance,
    helpNeeded: assistance.map(row => row.content || row.result).filter(Boolean).join('；') || initialPayload?.helpNeeded || '',
    extraWork: { ...extraWork, impact: 'none' },
    syncKrProgress,
    items: evidenceItems
  });

  const requestSubmit = () => {
    const errors: string[] = [];
    if (selectedKrs.some(item => item.health !== 'normal' && !item.blocker.trim())) errors.push('风险或阻塞 KR 必须填写偏差原因');
    setValidationErrors(errors);
    if (errors.length === 0) setConfirmOpen(true);
  };

  return (
    <div className="okr-monthly-review okr-weekly-editor" aria-label="月复盘编辑器">
      <header className="okr-monthly-toolbar">
        <div>
          <div className="okr-monthly-title-row"><Tag color="blue">月复盘</Tag><h2>{month.format('YYYY年MM月')}工作复盘</h2><Tag color={editorState.color}>{editorState.label}</Tag></div>
          <p>复盘本月目标、工作证据、问题建议与协助事项</p>
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
        <div><Progress type="circle" percent={overallProgress} size={52} /><span><strong>本月整体进度</strong></span></div>
        <div><Target /><span><strong>本月任务</strong><b>{metricValue(metrics?.taskCount)}</b></span></div>
        <div><FileText /><span><strong>协同事项</strong><b>{metricValue(metrics?.collaborationCount)}</b></span></div>
        <div><FileText /><span><strong>总工时</strong><b>{metricValue(metrics?.totalHours)}</b></span></div>
        <div><FileText /><span><strong>加班时长</strong><b>—</b></span></div>
      </section>

      {metricsError && <Alert type="error" showIcon title="月度统计加载失败" description="未能读取完整状态变化记录，请重试。" action={<Button onClick={() => { onRefreshWork?.(); setMetricsRevision(value => value + 1); }}>重试</Button>} />}
      <section className="okr-weekly-section" aria-label="本月目标复盘">
        <div className="okr-weekly-section-header"><h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><span aria-hidden="true" className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />1. 本月目标复盘</h3></div>
        <div className="okr-monthly-panel">
        <div className="okr-monthly-section-head"><h4>本月总结</h4></div>
        <Input.TextArea disabled={busy || !editorState.editable} value={summary} onChange={event => setSummary(event.target.value)} autoSize={{ minRows: 4 }} placeholder="总结本月核心成果、业务价值、关键变化与主要问题" />
      </div>

      {monthlyOkrs.length === 0 ? <Empty description="本月暂无 OKR" /> : monthlyOkrs.map((objective, objectiveIndex) => <Collapse key={objective.id} className="okr-review-objective-collapse" defaultActiveKey={[objective.id]} expandIconPosition="end" items={[{
        key: objective.id,
        label: <div className="flex items-center gap-2"><Tag color="blue">{objective.primaryLabel || 'O'}{objectiveIndex + 1}</Tag><strong>目标{objectiveIndex + 1}：{objective.objective}</strong></div>,
        children: <div className="okr-review-a-list grid gap-4 p-4">{krs.filter(kr => kr.objectiveId === objective.id && objective.keyResults.some(target => target.id === kr.keyResultId)).map((kr, index) => {
          const expanded = expandedKrs[kr.keyResultId] ?? !defaultCollapsedReview(kr);
          const selected = selectedKrIds.includes(kr.keyResultId);
          return <Collapse key={kr.keyResultId} className="okr-review-a-collapse" activeKey={expanded && selected ? [kr.keyResultId] : []} expandIconPosition="end" onChange={keys => setExpandedKrs(rows => ({ ...rows, [kr.keyResultId]: Boolean(keys.length) }))} items={[{
            key: kr.keyResultId,
            label: <div className="flex items-center gap-3"><span onClick={event => event.stopPropagation()}><Checkbox checked={selected} disabled={busy || !editorState.editable} aria-label={`选择 KR${index + 1}`} onChange={event => toggleKr(kr.keyResultId, event.target.checked)}/></span><strong>A{index + 1}：{kr.keyResultTitle}</strong><Tag>{kr.currentProgress}%</Tag></div>,
            children: <div className="space-y-4">
              <div className="okr-monthly-status-row">
                <div className="okr-monthly-current-progress"><span>本月进度</span><InputNumber min={0} max={100} value={kr.currentProgress} suffix="%" disabled={busy || !editorState.editable} onChange={value => updateKr(kr.keyResultId, { currentProgress: value ?? 0 })}/></div>
                <div className="okr-monthly-progress-change"><span>进度:</span><span>{kr.previousProgress}% → <strong>{kr.currentProgress}%</strong></span><Progress percent={kr.currentProgress} showInfo={false} size="small"/></div>
                <div className="okr-monthly-health-control"><span>健康状态:</span><Radio.Group size="small" value={kr.health} disabled={busy || !editorState.editable} onChange={event => updateKr(kr.keyResultId, { health: event.target.value })}><Radio value="normal">正常</Radio><Radio value="risk">有风险</Radio><Radio value="blocked">已阻塞</Radio></Radio.Group></div>
              </div>
              {kr.health !== 'normal' && <Input.TextArea aria-label="风险原因及所需支持" rows={2} value={kr.blocker} disabled={busy || !editorState.editable} onChange={event => updateKr(kr.keyResultId, { blocker: event.target.value })} placeholder="说明偏差、风险、外部依赖和所需支持"/>}
              <div className="okr-weekly-section-header"><h4>本期关联工作证据</h4><Button disabled={busy || !editorState.editable} icon={<Plus className="h-3.5 w-3.5"/>} onClick={() => setPickerKrId(kr.keyResultId)}>关联工作证据</Button></div>
              <Table size="small" rowKey="workId" pagination={false} dataSource={kr.workIds.map(id => {
                const live = work.find(item => item.id === id);
                const saved = evidenceItems.find(item => item.workId === id);
                return { workId: id, title: live?.title || saved?.title || '历史工作证据', sourceLabel: live ? [live.productLineName, live.versionName].filter(Boolean).join(' / ') : saved?.sourceLabel, status: live?.status || saved?.status, actualHours: live?.actualHours ?? saved?.actualHours };
              })} locale={{ emptyText: <Empty description="暂无关联工作证据"/> }} columns={[
                { title: '标题', dataIndex: 'title', ellipsis: true }, { title: '来源归属', render: (_, row) => row.sourceLabel || '—' }, { title: '状态', dataIndex: 'status' },
                { title: '任务工时', render: (_, row) => row.actualHours == null ? '—' : `${row.actualHours} 小时` },
                { title: '删除操作', render: (_, row) => <Button type="text" danger disabled={busy || !editorState.editable} onClick={() => { updateKr(kr.keyResultId, { workIds: kr.workIds.filter(id => id !== row.workId) }); setEvidenceItems(rows => rows.filter(item => item.workId !== row.workId)); }}>删除</Button> },
              ]}/>
              <div className="okr-monthly-timeline"><h4>周报证据记录</h4>{monthlyEvidenceTimeline(weeklyReviews, kr.keyResultId).map((week, weekIndex) => <div key={week.reviewId} className="okr-monthly-timeline-week"><div className="okr-monthly-timeline-marker">第 {weekIndex + 1} 周<small>{week.startDate.slice(5)} 至 {week.endDate.slice(5)}</small></div><div className="okr-monthly-timeline-items">{week.entries.length ? week.entries.map(entry => <div key={entry.id}><strong>{entry.title}</strong><span>{entry.progressChange}</span><small>{entry.summary}</small><Tag>{entry.type}</Tag></div>) : <p>本周暂无证据记录</p>}</div></div>)}</div>
            </div>,
          }]}/>;
        })}</div>,
      }]}/>)}
      </section>
      <section className="okr-weekly-section" aria-label="插播任务">
        <div className="okr-weekly-section-header"><h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><span aria-hidden="true" className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />2. 插播任务</h3><Button icon={<Plus className="h-3.5 w-3.5" />} disabled={busy || !editorState.editable} onClick={() => setPickerKrId('extra')}>关联工作证据</Button></div>
        <Table size="small" rowKey="workId" pagination={false} dataSource={extraWork.workIds.map(id => {
          const live = work.find(item => item.id === id);
          const saved = evidenceItems.find(item => item.workId === id);
          return { workId: id, title: live?.title || saved?.title || '历史工作证据', sourceLabel: live ? [live.productLineName, live.versionName].filter(Boolean).join(' / ') : saved?.sourceLabel, status: live?.status || saved?.status, actualHours: live?.actualHours ?? saved?.actualHours };
        })} locale={{ emptyText: <Empty description="暂无插播任务" /> }} columns={[
          { title: '标题', dataIndex: 'title', ellipsis: true },
          { title: '来源归属', render: (_, row) => row.sourceLabel || '—' },
          { title: '状态', dataIndex: 'status' },
          { title: '任务工时', render: (_, row) => row.actualHours == null ? '—' : `${row.actualHours} 小时` },
          { title: '删除操作', render: (_, row) => <Button type="text" danger disabled={busy || !editorState.editable} onClick={() => { setExtraWork(value => ({ ...value, workIds: value.workIds.filter(id => id !== row.workId) })); setEvidenceItems(rows => rows.filter(item => item.workId !== row.workId)); }}>删除</Button> },
        ]}/>
        {extraWork.description && <div className="okr-monthly-panel"><p className="whitespace-pre-wrap">{historicalExtraDescription(extraWork.description)}</p><Button type="text" danger disabled={busy || !editorState.editable} onClick={() => setExtraWork(value => ({ ...value, description: '' }))}>删除历史补充</Button></div>}
      </section>
      <section className="okr-weekly-section" aria-label="遇到的问题或者建议">
        <div className="okr-weekly-section-header"><h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]"><span aria-hidden="true" className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />3. 遇到的问题或者建议</h3></div>
        <Input.TextArea className="okr-weekly-plan-input" aria-label="遇到的问题或者建议" rows={4} maxLength={10000} showCount value={suggestions} onChange={event => setSuggestions(event.target.value)} disabled={busy || !editorState.editable} placeholder="填写本月遇到的问题或者建议" />
      </section>
      <section className="okr-weekly-section" aria-label="需要协助事项">
        <div className="okr-weekly-section-header">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>4. 需要协助事项</span>
          </div>
          <Dropdown trigger={['click']} disabled={busy || !editorState.editable} menu={{
            items: assistanceTypes.map(type => ({ key: type, label: workOrderDisplayName(type) })),
            onClick: ({ key }) => setCreationType(key as WorkOrderType),
          }}><Button icon={<Plus className="h-3.5 w-3.5" />} disabled={busy || !editorState.editable}>发起协同</Button></Dropdown>
        </div>
        <Table size="small" rowKey={row => row.workId || row.subject} pagination={false} dataSource={assistance}
          locale={{ emptyText: <Empty description="暂无需要协助事项" /> }} columns={[
            { title: '标题', dataIndex: 'subject', ellipsis: true },
            { title: '事项类型', render: (_, row) => workOrderDisplayName(row.assistanceType) || '—' },
            { title: '负责人', dataIndex: 'expectedAssignee' },
            { title: '状态', render: (_, row) => row.status || '未发起' },
            { title: '删除操作', render: (_, row, index) => <Button type="text" danger disabled={busy || !editorState.editable} aria-label={`移除协同事项${row.subject}`} onClick={() => setAssistance(rows => rows.filter((_, rowIndex) => rowIndex !== index))}>删除</Button> },
          ]}/>
      </section>

      <section className="okr-weekly-section" aria-label="知识沉淀">
        <div className="okr-weekly-section-header">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>5. 知识沉淀</span>
          </div>
          <Button disabled={busy || !editorState.editable} icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setKnowledgeOpen(true)}>新建知识沉淀</Button>
        </div>
        <Table size="small" rowKey="id" pagination={false} dataSource={knowledgeEntries}
          locale={{ emptyText: <Empty description="暂无知识沉淀" /> }} columns={[
            { title: '标题', ellipsis: true, render: (_, row) => <Button type="link" onClick={() => setViewingKnowledge(row)}>{row.title}</Button> },
            { title: '分类', dataIndex: 'category' },
            { title: '内容摘要', dataIndex: 'summary', ellipsis: true },
            { title: '删除操作', render: (_, row) => <Button type="text" danger disabled={busy || !editorState.editable} aria-label={`删除知识沉淀${row.title}`} onClick={() => setKnowledgeEntries(rows => rows.filter(item => item.id !== row.id))}>删除</Button> },
          ]}/>
      </section>
      {viewingKnowledge && <Modal open title={viewingKnowledge.title} onCancel={() => setViewingKnowledge(null)} footer={<Button aria-label="关闭知识详情" onClick={() => setViewingKnowledge(null)}>关闭</Button>}>
        <p>{viewingKnowledge.category} · {viewingKnowledge.subCategory} · {viewingKnowledge.version}</p>
        <p className="whitespace-pre-wrap break-words">{viewingKnowledge.summary}</p>
        <p className="whitespace-pre-wrap break-words">{viewingKnowledge.content || '暂无正文'}</p>
        <p className="break-words">{viewingKnowledge.tags?.join('、')}</p>
        {viewingKnowledge.linkUrl && <p className="break-words">链接地址：{viewingKnowledge.linkUrl}</p>}
        {viewingKnowledge.dingtalkUrl && <p className="break-words">钉钉文档：{viewingKnowledge.dingtalkUrl}</p>}
        {viewingKnowledge.wecomUrl && <p className="break-words">企微文档：{viewingKnowledge.wecomUrl}</p>}
      </Modal>}
      {knowledgeOpen && <KnowledgeUploadModal mode="review" isOpen onClose={() => setKnowledgeOpen(false)} onSubmit={doc => {
        setKnowledgeEntries(rows => [...rows, { ...doc, id: crypto.randomUUID(), title: doc.title || '', category: doc.category || '应知应会' }]);
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
        setEvidenceItems(rows => [...rows.filter(item => !pickerKr.workIds.includes(item.workId) || ids.includes(item.workId)), ...selectedWork.filter(item => !rows.some(row => row.workId === item.id)).map(item => ({ workId: item.id, title: item.title, status: item.status, workType: 'task' as const, sourceLabel: [item.productLineName, item.versionName].filter(Boolean).join(' / '), actualHours: item.actualHours, objectiveId: pickerKr.objectiveId, keyResultId: pickerKr.keyResultId, result: '', impact: '' }))]);
        setPickerKrId(null);
      }}/>}

      <Modal open={confirmOpen} title="确认提交月复盘" okText="确认提交" cancelText="返回检查" confirmLoading={busy} okButtonProps={{ disabled: !editorState.editable || Boolean(detachedTargets.length) }} onCancel={() => setConfirmOpen(false)} onOk={async () => { if (!editorState.editable || detachedTargets.length) return; if (await onSubmit(payload())) setConfirmOpen(false); }}>
        <p>本次复盘已选择 {selectedKrs.length} 个 KR，并自动汇总 {weeklyReviews.length} 周的证据记录。</p>
        <Checkbox checked={syncKrProgress} onChange={event => setSyncKrProgress(event.target.checked)}>将月复盘确认进度同步至 KR</Checkbox>
      </Modal>
    </div>
  );
}
