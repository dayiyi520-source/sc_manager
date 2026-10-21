import { reviewEvidenceMetadata } from '../../../services/reviewEvidenceSnapshot';
import { ReviewKnowledgeContent } from './ReviewKnowledgeContent';
import { ReviewKnowledgeTable } from './ReviewKnowledgeTable';
import { ReviewTemplateLayout, reviewBlockTitle, ReviewTemplateSection, useReviewTemplateFields } from './ReviewTemplateFields';
import type { OkrSettings } from '../../../services/okrRepository';
import { departmentSubmissionErrors, departmentMonthlyFeedback } from '../../../services/departmentReviewSubmission';
import { DepartmentReviewSettings } from './DepartmentReviewSettings';
import { DepartmentFeedbackTable } from './DepartmentFeedbackTable';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Collapse,
  Empty,
  Dropdown,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag
} from 'antd';
import dayjs from 'dayjs';
import { PeopleIcon } from '@primer/octicons-react';
import { SupervisorReviewMetrics } from './SupervisorReviewMetrics';
import { departmentKrAggregation, departmentContentSnapshots } from '../../../services/departmentReviewAggregation';
import { employeeEvidenceForKr } from '../../../services/supervisorSupportPanels';
import type { EmployeeOption, OKRItem, WorkOrderType } from '../../../types';
import type { OkrKrReview, OkrPayload, OkrWork, OkrRecord, OkrPerson, OkrWeeklyReviewSnapshot } from '../../../services/okrRepository';
import { Plus, Save, Send, Trash2 } from '@/components/common/octicons-compat';
import { workSource } from './workAggregation';
import { reviewPeriod } from './simpleReview';
import { reviewDraftTargets, restoreReviewDraftTargets, reconcileReviewDraftTargets, detachedReviewDescription, employeeReviewBaseline } from './reviewDraftTargets';
import { reviewEditorState } from '../../../services/okrReviewTemplates';
import { WorkEvidencePicker } from './WorkEvidencePicker';
import { RequirementPoolView } from '../RequirementPoolView';
import { ReviewKnowledgeModal } from './ReviewKnowledgeModal';
import type { OkrReviewKnowledge } from '../../../services/okrRepository';
import { workOrderDisplayName } from '../../../utils/workOrderDisplay';
import { SupervisorObjectiveHeader } from './SupervisorObjectiveHeader';
import { ReviewRiskCallout } from './ReviewRiskCallout';
import { EmployeeReviewDetailTable } from './EmployeeReviewDetailTable';
import { completedActualHours } from './reviewActualHours';
import { employeeActionsForKr } from '../../../services/supervisorSupportPanels';
import { SupervisorKrReviewCard } from './SupervisorKrReviewCard';
import { EmployeeReviewSupportDialog } from './EmployeeReviewSupportDialog';
import { employeeSupportsForKr, employeeSupportSnapshots } from '../../../services/supervisorReview';
import { defaultCollapsedReview } from './evidenceFilters';
import { employeeReviewHealth } from './employeeReviewHealth';
import type { EvidenceViewer } from '../../../services/reviewEvidenceRepository';
import type { ReviewPeriod } from '../../../services/okrReviewRules';
import './weeklyReviewEditor.css';

type Health = 'normal' | 'risk' | 'blocked';
type PickerState = { target: string; selection: string[] } | null;
type ManualWork = { id: string; content: string; source: string; status: string; hours: string; impact: string; note: string };

export interface KrReviewDraft {
  objectiveId: string;
  objectiveTitle: string;
  keyResultId: string;
  keyResultTitle: string;
  previousProgress: number;
  currentProgress: number;
  supervisorProgress?: Array<{ id: string; currentProgress: number }>;
  detailProgress?: Array<{ id: string; previousProgress: number; currentProgress: number }>;
  health: Health;
  achievement: string;
  blocker: string;
  nextPlan: string;
  evidenceNote?: string;
  supervisorJudgment?: string;
  employeeReviewSnapshots?: OkrWeeklyReviewSnapshot[];
  viewedEmployeeReviewIds?: string[];
  workIds: string[];
}

export interface AssistanceDraft {
  rowId?: string;
  workId?: string;
  status?: string;
  subject: string;
  result: string;
  assistanceType: string;
  expectedAssignee: string;
  content: string;
  expectedDueDate: string;
}

const assistanceTypes: WorkOrderType[] = ['客户诉求', '线上问题', '售前支持', '交付支持', '其他问题'];

const terminalStatuses = new Set(['已完成', '已发布', '已验收', '已关闭']);
const statusColor = (status: string) =>
  terminalStatuses.has(status)
    ? 'success'
    : status.includes('阻塞') || status.includes('驳回')
    ? 'error'
    : 'processing';

const NO_RECORDS: OkrRecord[] = [];
const NO_PEOPLE: OkrPerson[] = [];

interface WeeklyReviewEditorProps {
  reviewSettings?: OkrSettings;
  template?: 'employee' | 'supervisor';
  reviewType?: 'week' | 'month';
  overview?: React.ReactNode | ((reviews: OkrKrReview[]) => React.ReactNode);
  records?: OkrRecord[];
  people?: OkrPerson[];
  recordsLoading?: boolean;
  recordsError?: unknown;
  onRefreshRecords?: () => void;
  key?: React.Key;
  okrs: OKRItem[];
  work: OkrWork[];
  busy: boolean;
  workLoading: boolean;
  workError?: unknown;
  onRefreshWork: () => void;
  onSaveDraft: (payload: OkrPayload) => Promise<boolean>;
  onSubmit: (payload: OkrPayload) => Promise<boolean>;
  onCancel: () => void;
  onCopy?: () => void;
  viewer?: EvidenceViewer;
  reviewerName?: string;
  teamMembers?: EmployeeOption[];
  directSubmit?: boolean;
  recordStatus?: string;
  initialPayload?: OkrPayload;
  periodOverride?: ReviewPeriod;
}

export function WeeklyReviewEditor({
  reviewSettings, reviewType = 'week', overview, template = 'employee', records = NO_RECORDS, people = NO_PEOPLE, recordsLoading = false, recordsError, onRefreshRecords,
  okrs,
  work,
  busy,
  workLoading,
  workError,
  onRefreshWork,
  onSaveDraft,
  onSubmit,
  onCancel, onCopy,
  viewer,
  reviewerName,
  teamMembers = [],
  directSubmit = false,
  recordStatus,
  initialPayload,
  periodOverride
}: WeeklyReviewEditorProps) {
  const monthly = reviewType === 'month';
  const period = useMemo(() => periodOverride || reviewPeriod('week'), [periodOverride]);
  const editorState = reviewEditorState(recordStatus);
  const readOnly = !editorState.editable;
  const reportTemplate = useReviewTemplateFields(reviewSettings, initialPayload, viewer?.department || '', template, reviewType, period.startDate);
  const periodOkrs = useMemo(() => {
    if (!readOnly) return okrs.filter(objective => objective.cycle === period.startDate.slice(0, 7) || objective.cycle === period.endDate.slice(0, 7));
    const snapshots: OKRItem[] = [];
    for (const row of initialPayload?.krReviews || []) {
      let objective = snapshots.find(item => item.id === row.objectiveId);
      if (!objective) {
        objective = { id: row.objectiveId, cycle: period.startDate.slice(0, 7), ownerId: viewer?.id || '',
          ownerName: viewer?.name || '', department: viewer?.department || '', category: 'my', primaryLabel: template === 'supervisor' ? 'O' : 'KR',
          objective: row.objectiveTitle, progress: 0, weight: 100, deadline: period.endDate, keyResults: [] };
        snapshots.push(objective);
      }
      objective.keyResults.push({ id: row.keyResultId, content: row.keyResultTitle, progress: row.currentProgress,
        weight: 100, deadline: objective.deadline, parentKeyResultDetails: row.detailRows });
    }
    return snapshots;
  }, [okrs, period.startDate, period.endDate, readOnly, template, initialPayload?.krReviews, viewer?.id, viewer?.name, viewer?.department]);
  const supervisor = template === 'supervisor';
  const rowLabel = supervisor ? 'KR' : 'A';
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [viewingKnowledge, setViewingKnowledge] = useState<OkrReviewKnowledge | null>(null);
  const [knowledgeEntries, setKnowledgeEntries] = useState<OkrReviewKnowledge[]>(initialPayload?.knowledgeEntries || []);
  const [creationType, setCreationType] = useState<WorkOrderType | null>(null);
  const [supportTargetId, setSupportTargetId] = useState<string | null>(null);
  const [supportAuthorId, setSupportAuthorId] = useState<string | null>(null);
  const start = dayjs(period.startDate);
  const end = dayjs(period.endDate);

  // Week number calculation (standard 7-day offset or ISO week)
  const weekNumber = useMemo(() => {
    const diffDays = start.diff(start.startOf('year'), 'day');
    return Math.floor(diffDays / 7) + 1;
  }, [start]);

  const cycleTitle = useMemo(
    () => `${start.year()}年第 ${weekNumber} 周 (${start.format('MM.DD')} - ${end.format('MM.DD')})`,
    [start, end, weekNumber]
  );

  const reviewTitle = `[周报] ${cycleTitle}`;

  const [selfScore] = useState<number>(initialPayload?.selfScore ?? 90);
  const [submitModalOpen, setSubmitModalOpen] = useState<boolean>(false);
  const [collapsedObjectives, setCollapsedObjectives] = useState<Record<string, boolean>>({});
  const [collapsedKrs, setCollapsedKrs] = useState<Record<string, boolean>>({});
  const [departmentSummary, setDepartmentSummary] = useState(initialPayload?.summary || '');
  const [exclusions, setExclusions] = useState(initialPayload?.departmentReviewExclusions || []);
  const [feedbackJudgments, setFeedbackJudgments] = useState(initialPayload?.departmentFeedbackRows || []);
  const feedbackRows = readOnly ? initialPayload?.departmentFeedbackRows || [] : departmentMonthlyFeedback({ reviewType, ...period, title: '', departmentFeedbackRows: feedbackJudgments }, records, people, viewer?.id || '');
  const [nextWeekPlan, setNextWeekPlan] = useState(initialPayload?.nextWeekPlan || '');
  const [picker, setPicker] = useState<PickerState>(null);
  const toolbarSentinelRef = useRef<HTMLDivElement>(null);
  const [toolbarStuck, setToolbarStuck] = useState(false);
  const selectedObjectiveIds = useMemo(() => periodOkrs.map(o => o.id), [periodOkrs]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    const sentinel = toolbarSentinelRef.current;
    if (!sentinel) return;
    const root = sentinel.closest('.tech-main');
    const observer = new IntersectionObserver(
      ([entry]) => setToolbarStuck(!entry.isIntersecting),
      { root, threshold: 1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const currentTargets = useMemo(() => {
    if (readOnly) return initialPayload?.krReviews || [];
    const targets = reviewDraftTargets(periodOkrs);
    return supervisor ? targets.map(target => departmentKrAggregation(periodOkrs.find(objective => objective.id === target.objectiveId)!, target, records, people, viewer?.id || '', period, reviewType)) : employeeReviewBaseline(targets, records, viewer?.id || '', period.startDate);
  }, [periodOkrs, supervisor, records, people, viewer?.id, period, reviewType, readOnly, initialPayload?.krReviews]);
  const priorTargets = useRef(currentTargets);
  const [krs, setKrs] = useState<KrReviewDraft[]>(() => readOnly ? currentTargets : restoreReviewDraftTargets(currentTargets, initialPayload));
  useEffect(() => {
    if (readOnly) return;
    const previousTargets = priorTargets.current;
    setKrs(previous => reconcileReviewDraftTargets(previous, currentTargets, previousTargets));
    priorTargets.current = currentTargets;
  }, [currentTargets, readOnly]);
  const detachedTargets = krs.filter(row => !currentTargets.some(target => target.objectiveId === row.objectiveId && target.keyResultId === row.keyResultId));

  const [workNotes, setWorkNotes] = useState<Record<string, string>>(() => Object.fromEntries((initialPayload?.items || []).map(item => [item.workId, item.result || ''])));

  // Section 3: Extra work
  const [extra, setExtra] = useState<{
    workIds: string[];
    description: string;
    impact: string;
    notes: Record<string, string>;
  }>({
    workIds: initialPayload?.extraWork?.workIds || [],
    description: initialPayload?.extraWork?.description || '',
    impact: initialPayload?.extraWork?.impact || 'none',
    notes: initialPayload?.extraWork?.notes || {}
  });

  const [manualWorks, setManualWorks] = useState<ManualWork[]>(() => {
    const description = initialPayload?.extraWork?.description;
    if (!description?.startsWith('[')) return [];
    try {
      const parsed: unknown = JSON.parse(description);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is ManualWork => typeof item === 'object' && item !== null)
        : [];
    } catch {
      return [];
    }
  });

  const [assistance, setAssistance] = useState<AssistanceDraft[]>(() => {
    const rows = initialPayload?.assistance || [];
    if (!rows.length && initialPayload?.helpNeeded) return [{ rowId: crypto.randomUUID(), subject: '需要协同事项', result: initialPayload.helpNeeded, assistanceType: '', expectedAssignee: '', content: initialPayload.helpNeeded, expectedDueDate: '' }];
    return rows.map(row => ({
      ...row,
      rowId: row.workId || crypto.randomUUID(),
      subject: row.subject || '需要协同事项',
      result: row.result || row.content || '',
      assistanceType: row.assistanceType || '',
      expectedAssignee: row.expectedAssignee || '',
      content: row.content || row.result || '',
      expectedDueDate: row.expectedDueDate || ''
    }));
  });

  const liveDepartmentContent = useMemo(() => supervisor && !readOnly ? departmentContentSnapshots(records, people, viewer?.id || '', period, reviewType) : [], [supervisor, readOnly, records, people, viewer?.id, period, reviewType]);
  const departmentContent = liveDepartmentContent.concat((initialPayload?.departmentContentSnapshots || []).filter(snapshot => !liveDepartmentContent.some(row => row.id === snapshot.id)));
  const displayedAssistance = [...new Map(assistance.concat(departmentContent.flatMap(snapshot => snapshot.assistance.map((row, index) => ({ ...row, rowId: `employee:${snapshot.id}:${index}`, content: row.content || row.result, subject: row.subject, sourceEmployee: snapshot.authorName })))).map(row => [row.workId || row.rowId!, row])).values()];
  const displayedKnowledge = knowledgeEntries.concat(departmentContent.flatMap(snapshot => (snapshot.knowledgeEntries || []).map(row => ({ ...row, id: `employee:${snapshot.id}:${row.id}`, sourceReviewId: snapshot.id, sourceEmployee: snapshot.authorName }))));
  const workById = useMemo(() => new Map(work.map(item => [item.id, item])), [work]);

  const update = (id: string, p: Partial<KrReviewDraft>) =>
    setKrs(rows => rows.map(row => {
      if (row.keyResultId !== id) return row;
      const next = { ...row, ...p };
      const objective = periodOkrs.find(item => item.id === row.objectiveId);
      return supervisor && objective && p.supervisorProgress ? departmentKrAggregation(objective, next, records, people, viewer?.id || '', period, reviewType) : next;
    }));

  const updateWorkNote = (_krId: string, workId: string, note: string) => {
    setWorkNotes(prev => ({ ...prev, [workId]: note }));
  };

  const linkedIds = useMemo(
    () => new Set(krs.flatMap(kr => kr.workIds).concat(extra.workIds)),
    [krs, extra.workIds]
  );

  const selectedKrs = useMemo(
    () => krs.filter(kr => currentTargets.some(target => target.keyResultId === kr.keyResultId && target.objectiveId === kr.objectiveId)).map(kr => { if (!supervisor || readOnly) return kr; const objective = periodOkrs.find(row => row.id === kr.objectiveId); return objective ? departmentKrAggregation(objective, kr, records, people, viewer?.id || '', period, reviewType) : kr; }),
    [krs, currentTargets, supervisor, readOnly, periodOkrs, records, people, viewer?.id, period, reviewType]
  );

  const metricRecords = useMemo(() => {
    if (!readOnly) return records;
    const snapshots = selectedKrs.flatMap(kr => kr.employeeReviewSnapshots || []).concat(initialPayload?.departmentContentSnapshots || []);
    const savedRecords = new Map<string, OkrRecord>();
    for (const snapshot of snapshots) {
      savedRecords.set(snapshot.id, { id: snapshot.id, kind: 'review', ownerId: snapshot.authorId || snapshot.id,
        status: snapshot.status, version: 0, periodKey: snapshot.startDate,
        payload: { ...snapshot, title: snapshot.title, reviewType } });
    }
    return [...savedRecords.values()];
  }, [readOnly, records, selectedKrs, initialPayload?.departmentContentSnapshots, reviewType]);

  const objectiveGroups = useMemo(() => {
    const list = periodOkrs.filter(o => selectedObjectiveIds.includes(o.id));

    return list
      .map(objective => ({
        objective,
        krs: selectedKrs.filter(kr => kr.objectiveId === objective.id && objective.keyResults.some(target => target.id === kr.keyResultId))
      }))
      .filter(group => group.krs.length > 0);
  }, [periodOkrs, selectedObjectiveIds, selectedKrs]);

  const supportsByKr = useMemo(() => new Map(selectedKrs.map(kr => [kr.keyResultId,
    supervisor && !readOnly ? employeeSupportsForKr(records, people, viewer?.id || '', kr, period, reviewType) : []
  ])), [selectedKrs, supervisor, readOnly, records, people, viewer?.id, period, reviewType]);
  const supportTarget = krs.find(kr => kr.keyResultId === supportTargetId);

  const selectedWorks = useMemo(
    () => [...linkedIds].map(id => workById.get(id)).filter((item): item is OkrWork => !!item),
    [linkedIds, workById]
  );

  const requestSubmit = () => {
    if (supervisor) { setValidationErrors([]); setSubmitModalOpen(true); return; }
    const errors: string[] = reportTemplate.errors();
    if (!directSubmit && !reviewerName) {
      errors.push('尚未配置直属上级，无法确定审批人');
    }
    setValidationErrors(errors);
    if (errors.length === 0) setSubmitModalOpen(true);
  };

  const payload = (): OkrPayload => ({
    ...reportTemplate.payload,
    title: monthly ? `${start.year()}年第${start.month() + 1}月 部门月报-${viewer?.department || '部门未设置'}` : supervisor ? `${cycleTitle}—${viewer?.department || '部门未设置'}` : reviewTitle,
    startDate: period.startDate,
    endDate: period.endDate,
    reviewType,
    reviewMode: supervisor ? 'supervisor' : 'structured',
    selfScore,
    summary: supervisor ? reportTemplate.textValue('departmentSummary', departmentSummary).trim() : initialPayload?.summary || '',
    nextWeekPlan: monthly ? undefined : reportTemplate.textValue('nextWeekPlan', nextWeekPlan).trim(),
    suggestions: initialPayload?.suggestions,
    ...(supervisor ? { departmentReviewExclusions: exclusions, ...(monthly ? { departmentFeedbackRows: feedbackRows } : {}) } : {}),
    syncKrProgress: supervisor,
    krReviews: selectedKrs.map(kr => ({
      ...kr,
      ...(!supervisor ? (() => {
        const objective = periodOkrs.find(row => row.id === kr.objectiveId);
        const action = objective?.keyResults.find(row => row.id === kr.keyResultId);
        const details = action?.parentKeyResultDetails || [];
        const currentProgress = details.length ? Math.round(details.reduce((sum, detail) => sum + (kr.detailProgress?.find(row => row.id === detail.id)?.currentProgress ?? 0), 0) / details.length) : kr.currentProgress;
        const asOf = dayjs(period.endDate).isBefore(dayjs(), 'day') ? period.endDate : dayjs().format('YYYY-MM-DD');
        const health = employeeReviewHealth(currentProgress, action?.plannedStartDate || `${objective?.cycle}-01`, action?.deadline || dayjs(objective?.cycle).endOf('month').format('YYYY-MM-DD'), asOf);
        return { executionHealth: health || undefined, detailRows: details, currentProgress, health: health === '逾期' ? 'blocked' as const : health === '风险' ? 'risk' as const : 'normal' as const };
      })() : {}),
      ...(supervisor ? {
        supervisorJudgment: (kr.supervisorJudgment || '').trim(),
        employeeReviewSnapshots: (() => {
          const live = employeeSupportSnapshots(supportsByKr.get(kr.keyResultId) || []);
          return live.concat((kr.employeeReviewSnapshots || []).filter(snapshot => !live.some(row => row.id === snapshot.id)));
        })(),
      } : {}),
      evidenceNote: Object.entries(workNotes)
        .filter(([wid]) => kr.workIds.includes(wid))
        .map(([_, note]) => note)
        .join('；') || kr.evidenceNote
    })),
    departmentObjectiveVersions: supervisor ? Object.fromEntries(periodOkrs.map(objective => [objective.id, records.find(row => row.id === objective.id)?.version ?? 0])) : undefined,
    departmentContentSnapshots: supervisor ? departmentContent : undefined,
    objectiveSnapshots: periodOkrs.map(objective => ({ id: objective.id, period: objective.cycle, payload: {
      title: objective.objective, weight: objective.weight, keyResults: objective.keyResults.map(kr => ({ id: kr.id, title: kr.content, weight: kr.weight, progress: (() => { const row = selectedKrs.find(row => row.objectiveId === objective.id && row.keyResultId === kr.id); if (!row) return kr.progress; const details = !supervisor ? kr.parentKeyResultDetails || [] : []; return details.length ? Math.round(details.reduce((sum, detail) => sum + (row.detailProgress?.find(item => item.id === detail.id)?.currentProgress ?? 0), 0) / details.length) : row.currentProgress; })() }))
    } })),
    knowledgeEntries,
    helpNeeded: assistance.map(row => row.content.trim()).filter(Boolean).join('；'),
    assistance: assistance.filter(row => row.workId || row.content.trim()).map(({ rowId: _rowId, ...row }) => ({ ...row, result: row.content.trim() })),
    extraWork: {
      ...extra,
      impact: 'none',
      description: manualWorks.length ? JSON.stringify(manualWorks) : extra.description
    },
    items: [
      ...selectedWorks.map(item => ({
        workId: item.id,
        ...reviewEvidenceMetadata(item),
        title: item.title,
        status: item.status,
        workType: workSource(item),
        sourceLabel: [item.productLineName, item.versionName].filter(Boolean).join(' / ') || '—',
        actualHours: completedActualHours(item),
        result: workNotes[item.id] || '',
        impact: ''
      })),
      ...(initialPayload?.items || []).filter(item => linkedIds.has(item.workId) && !workById.has(item.workId))
        .map(item => ({ ...item, actualHours: completedActualHours(item), result: workNotes[item.workId] ?? item.result }))
    ]
  });

  const openPicker = (target: string) => {
    const kr = krs.find(item => item.keyResultId === target);
    setPicker({ target, selection: target === 'extra' ? [...extra.workIds] : [...(kr?.workIds || [])] });
  };
  const pickerSourceKr = picker?.target === 'extra' ? undefined : periodOkrs.flatMap(objective => objective.keyResults).find(item => item.id === picker?.target);
  const confirmPicker = (ids: string[]) => {
    if (!picker) return;
    if (picker.target === 'extra') setExtra(value => ({ ...value, workIds: ids }));
    else update(picker.target, { workIds: ids });
    setPicker(null);
  };

  const removeWork = (target: string, id: string) => {
    if (target === 'extra') {
      setExtra(value => ({ ...value, workIds: value.workIds.filter(workId => workId !== id) }));
    } else {
      update(target, {
        workIds: krs.find(kr => kr.keyResultId === target)?.workIds.filter(workId => workId !== id) || []
      });
    }
  };

  // Merged extra work items table data
  const allExtraRows = useMemo(() => {
    const linkedExtra = extra.workIds
      .map(id => {
        const live = readOnly ? undefined : workById.get(id);
        if (live) return live;
        const saved = initialPayload?.items?.find(item => item.workId === id);
        return saved ? { id, title: saved.title, status: saved.status, actualHours: saved.actualHours, productLineName: saved.sourceLabel } as OkrWork : undefined;
      })
      .filter((item): item is OkrWork => !!item)
      .map(item => ({
        id: item.id,
        content: item.title,
        source: [item.productLineName, item.versionName].filter(Boolean).join(' / ') || '—',
        status: item.status,
        hours: completedActualHours(item) == null ? '—' : `${completedActualHours(item)} 小时`,
        impact: extra.impact || 'none',
        isManual: false
      }));

    const manualRows = manualWorks.map(m => ({
      ...m,
      isManual: true
    }));

    const employeeRows = departmentContent.flatMap(snapshot => (snapshot.extraWork?.workIds || []).map(id => {
      const item = snapshot.items.find(row => row.workId === id);
      return { id, content: item?.title || '已失效的工作任务', source: item?.sourceLabel || '—', status: item?.status || '无法读取', hours: item && completedActualHours(item) != null ? `${completedActualHours(item)} 小时` : '—', impact: '', isManual: false, sourceEmployee: snapshot.authorName || '人员已停用' };
    }));
    const employeeManualRows = departmentContent.flatMap(snapshot => {
      const description = snapshot.extraWork?.description;
      if (!description) return [];
      let rows: Array<{ id?: string; content?: string; source?: string; status?: string; hours?: string }>;
      try {
        const parsed: unknown = JSON.parse(description);
        rows = Array.isArray(parsed) ? parsed.filter(row => row && typeof row === 'object') : [{ content: description }];
      } catch { rows = [{ content: description }]; }
      return rows.map((row, index) => ({ id: `employee:${snapshot.authorId}:${row.id || index}`, content: row.content || '历史补充工作', source: row.source || '手工记录', status: row.status || '未填写', hours: row.hours || '—', impact: '', isManual: false, sourceEmployee: snapshot.authorName || '人员已停用' }));
    });
    return [...new Map([...employeeRows, ...employeeManualRows, ...linkedExtra, ...manualRows].map(row => [row.id, row])).values()];
  }, [extra, workById, manualWorks, initialPayload?.items, departmentContent, readOnly]);

  return (
    <div className="review-document-container okr-weekly-editor max-w-6xl mx-auto space-y-5 text-[var(--text-primary)] pb-10">
      <div ref={toolbarSentinelRef} className="okr-review-toolbar-sentinel" aria-hidden="true" />
      {/* 顶部吸顶操作卡 */}
      <div className={`okr-review-sticky-toolbar${toolbarStuck ? ' is-stuck' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Tag color="blue" className="px-2 py-0.5 text-xs font-semibold rounded m-0 border-0">
              {supervisor ? <span className="flex items-center gap-2"><PeopleIcon/>{monthly ? '部门月报' : '部门周报'}</span> : '周报'}
            </Tag>
            <h2 className="text-base font-bold text-[var(--text-primary)] m-0">
              {monthly ? `${start.year()}年第${start.month() + 1}月 部门月报` : cycleTitle}{supervisor ? `—${viewer?.department || '部门未设置'}` : ''}
            </h2>
            <Tag color={editorState.color} className="text-xs rounded m-0">
              {editorState.label}
            </Tag>
          </div>
          <div className="flex items-center gap-2.5">
            {supervisor && <DepartmentReviewSettings payload={{ ...period, title: '', reviewType, departmentReviewExclusions: exclusions }} records={records} people={people} ownerId={viewer?.id || ''} disabled={busy || readOnly} loading={recordsLoading} error={recordsError} onRefresh={onRefreshRecords} onChange={rows => { setExclusions(rows); setValidationErrors([]); }} submitOpen={submitModalOpen} onCloseSubmit={() => setSubmitModalOpen(false)} onSubmit={async (rows, latestRecords) => {
              if (!editorState.editable || detachedTargets.length || recordsLoading || recordsError) return ['当前报告暂不可提交，请检查目标及员工复盘加载状态'];
              const nextPayload = {...payload(),departmentReviewExclusions:rows};
              const errors = reportTemplate.errors();
              if (!directSubmit && !reviewerName) errors.push('尚未配置直属上级，无法确定审批人');
              errors.push(...departmentSubmissionErrors(nextPayload,latestRecords,people,viewer?.id || ''));
              setValidationErrors(errors);
              if (errors.length) return errors;
              setExclusions(rows);
              return onSubmit(nextPayload);
            }}/>}
            <Button onClick={onCancel}>
              取消
            </Button>
            {readOnly ? onCopy && <Button type="primary" onClick={onCopy}>复制为本期</Button> : <>
            <Button
              icon={<Save className="h-4 w-4" />}
              disabled={!editorState.editable || Boolean(detachedTargets.length) || (supervisor && (recordsLoading || Boolean(recordsError)))}
              loading={busy}
              onClick={() => onSaveDraft(payload())}
            >
              存草稿
            </Button>
            <Button
              type="primary"
              icon={<Send className="h-4 w-4" />}
              disabled={!editorState.editable || Boolean(detachedTargets.length) || (supervisor && (recordsLoading || Boolean(recordsError)))}
              loading={busy}
              onClick={requestSubmit}
            >
              {monthly ? '提交月报' : '提交周报'}
            </Button></>}
          </div>
        </div>
      </div>

      {(typeof overview === 'function' ? overview(selectedKrs) : overview) || (supervisor && <SupervisorReviewMetrics objectives={periodOkrs} reviews={selectedKrs} records={metricRecords} people={people} supervisorId={viewer?.id || ''} period={period} loading={recordsLoading} error={recordsError}/>)}

      {supervisor && recordsError ? <Alert type="error" showIcon title="员工复盘加载失败，已保留填写内容" action={<Button onClick={onRefreshRecords}>重试</Button>}/> : null}
      {detachedTargets.length > 0 && <Alert type="warning" showIcon title="月度目标已变化，请确认失效内容" description={<div className="space-y-2"><p>以下已填写内容暂时保留，请复制需要的信息，再确认移除。确认后可继续保存或提交。</p><pre className="whitespace-pre-wrap break-words font-sans">{detachedReviewDescription(detachedTargets)}</pre></div>} action={<Button onClick={() => setKrs(rows => rows.filter(row => currentTargets.some(target => target.keyResultId === row.keyResultId && target.objectiveId === row.objectiveId)))}>移除失效内容</Button>} />}
      {supervisor && exclusions.length > 0 && <Alert type="info" showIcon title="本轮排除员工及原因" description={<div className="space-y-2">{exclusions.map(row => <p key={row.employeeId} className="whitespace-pre-wrap break-words">{people.find(person => person.id === row.employeeId)?.name || row.employeeName || '人员已停用'}：{row.reason}</p>)}</div>}/>}
      {validationErrors.length > 0 && (
        <Alert
          type="warning"
          showIcon
          closable
          title="提交前请完成以下内容"
          description={validationErrors.join('；')}
          onClose={() => setValidationErrors([])}
        />
      )}

      {/* ▌ 1. 本月目标复盘 */}
      <ReviewTemplateLayout template={reportTemplate.snapshot} values={reportTemplate.values} onChange={reportTemplate.setValues} people={people} disabled={busy || readOnly}>
      <section data-review-block="goals" className="okr-weekly-section">
        <div className="okr-weekly-section-header">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>{reviewBlockTitle(reportTemplate.snapshot, 'goals', supervisor ? '1. 部门月目标复盘' : '1. 本月目标复盘')}</span>
          </div>

        </div>

        {objectiveGroups.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-8 text-center shadow-sm">
            <Empty description="暂无可复盘的本月目标" />
          </div>
        ) : (
          objectiveGroups.map(({ objective, krs: objectiveKrs }, oIdx) => (
            <Collapse
              key={objective.id}
              className="okr-review-objective-collapse"
              classNames={{ body: 'okr-review-objective-body' }}
              activeKey={collapsedObjectives[objective.id] ? [] : [objective.id]}
              expandIconPosition="end"
              onChange={keys => {
                const expanded = Array.isArray(keys) ? keys.includes(objective.id) : keys === objective.id;
                setCollapsedObjectives(prev => ({ ...prev, [objective.id]: !expanded }));
              }}
              items={[{
                key: objective.id,
                label: supervisor ? <SupervisorObjectiveHeader objective={objective} reviews={objectiveKrs} index={oIdx}/> : (
                  <div className="flex items-center gap-2.5">
                    <Tag color="blue" className="m-0">{objective.primaryLabel || 'O'}{oIdx + 1}</Tag>
                    <span className="font-semibold text-[var(--text-primary)] text-sm">
                      {supervisor || objective.primaryLabel !== 'KR' ? `目标${oIdx + 1}：` : ''}{objective.objective}
                    </span>
                    {!supervisor && objective.primaryLabel === 'KR' && !readOnly && <Tag className="m-0">{objective.keyResults[0]?.parentKeyResultProgress ?? objective.progress}%</Tag>}
                  </div>
                ),
                children: (
                <div className="okr-review-a-list grid gap-4 p-4">
                  {objectiveKrs.map((kr, krIdx) => {
                  const evidence = kr.workIds
                    .map(id => {
        const live = readOnly ? undefined : workById.get(id);
        if (live) return live;
        const saved = initialPayload?.items?.find(item => item.workId === id);
        return saved ? { id, title: saved.title, status: saved.status, actualHours: saved.actualHours, productLineName: saved.sourceLabel } as OkrWork : undefined;
      })
                    .filter((item): item is OkrWork => !!item);

                  const action = objective.keyResults.find(target => target.id === kr.keyResultId);
                  const details = !supervisor ? action?.parentKeyResultDetails || [] : [];
                  const personalProgress = readOnly ? kr.currentProgress : details.length ? Math.round(details.reduce((total, detail) => total + (kr.detailProgress?.find(row => row.id === detail.id)?.currentProgress ?? 0), 0) / details.length) : kr.currentProgress;
                  const asOf = dayjs(period.endDate).isBefore(dayjs(), 'day') ? period.endDate : dayjs().format('YYYY-MM-DD');
                  const health = !supervisor && readOnly ? initialPayload?.krReviews?.find(row => row.keyResultId === kr.keyResultId)?.executionHealth || (kr.health === 'risk' ? '风险' : kr.health === 'blocked' ? '逾期' : '正常') : !supervisor ? employeeReviewHealth(personalProgress, action?.plannedStartDate || `${objective.cycle}-01`, action?.deadline || dayjs(objective.cycle).endOf('month').format('YYYY-MM-DD'), asOf) : null;
                  const collapsed = collapsedKrs[kr.keyResultId] ?? (supervisor ? true : defaultCollapsedReview(kr));
                  return (
                    <Collapse key={kr.keyResultId} className="okr-review-a-collapse" activeKey={collapsed ? [] : [kr.keyResultId]} expandIconPosition="end" onChange={keys => setCollapsedKrs(current => ({ ...current, [kr.keyResultId]: !keys.length }))} items={[{
                      key: kr.keyResultId,
                      label: supervisor ? <div className="min-w-0 space-y-2 w-full"><strong className="block truncate" title={kr.keyResultTitle}>KR{krIdx + 1}：{kr.keyResultTitle}</strong><div className="flex items-center gap-3"><Progress percent={kr.currentProgress} showInfo={false} size="small"/><span>{kr.currentProgress}%</span></div><div className="text-xs text-[var(--text-muted)]">员工支撑 {new Set(kr.contributors?.map(row => row.authorId)).size} 人 · 工作任务 {employeeEvidenceForKr(supportsByKr.get(kr.keyResultId) || [], kr.employeeReviewSnapshots || []).length} 项</div></div> : <div className="flex flex-wrap items-center gap-3"><strong>{supervisor ? `KR${krIdx + 1}：` : '我的计划：'}{kr.keyResultTitle}</strong><Tag>{supervisor ? `${kr.previousProgress}% → ${kr.currentProgress}%` : `${personalProgress}%`}</Tag>{!supervisor && <Tag color={health === '超预期' ? 'success' : health === '风险' ? 'warning' : health === '逾期' ? 'error' : undefined}>{health || '暂无预期'}</Tag>}{defaultCollapsedReview(kr) && kr.currentProgress < 100 ? <Tag>本周无变化</Tag> : null}</div>,
                      children: supervisor ? <SupervisorKrReviewCard review={kr} employeeActions={readOnly ? [] : employeeActionsForKr(records, people, viewer?.id || '', kr, period)} supports={supportsByKr.get(kr.keyResultId) || []}
                        viewerId={viewer?.id} viewerName={viewer?.name} selfAssigned={Boolean(records.find(row => row.id === kr.objectiveId)?.payload.keyResults?.find(row => row.id === kr.keyResultId)?.assigneeIds?.includes(viewer?.id || ''))}
                        ownEvidence={evidence} onAddEvidence={() => openPicker(kr.keyResultId)} onRemoveEvidence={id => removeWork(kr.keyResultId, id)}
                        busy={busy} editable={editorState.editable} supportLoading={recordsLoading} supportError={recordsError} onRetry={onRefreshRecords}
                        onUpdate={patch => update(kr.keyResultId, patch)} onEmployeeSupport={(authorId, reportIds) => {
                          setSupportTargetId(kr.keyResultId); setSupportAuthorId(authorId);
                          if (!readOnly) update(kr.keyResultId, { viewedEmployeeReviewIds: [...new Set([...(kr.viewedEmployeeReviewIds || []), ...reportIds])] });
                        }}/> : <div className="space-y-4">
                      {details.length ? <EmployeeReviewDetailTable rows={details} productName={action?.businessObject} progress={kr.detailProgress || []} disabled={busy || !editorState.editable}
                        onChange={detailProgress => update(kr.keyResultId, { detailProgress })}/> : <div className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] p-3 text-xs text-[var(--text-body)]">
                        <span>复盘前进度: {kr.previousProgress}% → 本期更新进度:</span>
                        <InputNumber aria-label="本期更新进度" min={0} max={100} precision={0} suffix="%" size="small" disabled={busy || !editorState.editable} value={kr.currentProgress} onChange={value => update(kr.keyResultId, { currentProgress: value ?? 0 })}/>
                        <span>进度: {kr.previousProgress}% → {kr.currentProgress}%</span><Progress percent={kr.currentProgress} showInfo={false} size="small" className="okr-review-progress-compact"/>
                      </div>}

                      {(health === '风险' || health === '逾期') && <ReviewRiskCallout value={kr.blocker} onChange={value => update(kr.keyResultId, { blocker: value })}
                        disabled={busy || !editorState.editable} label={`${kr.keyResultTitle}风险原因及所需支持`}/>}

                      {/* Evidence Section */}
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[var(--text-body)] flex items-center gap-1.5">
                            <span className="text-[var(--primary)]">▶</span> 本期关联工作任务
                          </span>
                          <Button
                            size="middle"
                            icon={<Plus className="h-3.5 w-3.5" />}
                            disabled={busy || readOnly}
                            onClick={() => openPicker(kr.keyResultId)}
                          >
                            关联工作任务
                          </Button>
                        </div>

                        {evidence.length > 0 ? (
                          <div className="border border-[var(--border-main)] rounded overflow-hidden bg-[var(--bg-card)]">
                            <Table<OkrWork>
                              size="small"
                              rowKey="id"
                              pagination={false}
                              dataSource={evidence}
                              columns={[
                                { title: '标题', dataIndex: 'title', ellipsis: true },
                                { title: '来源归属', render: (_, item) => [item.productLineName, item.versionName].filter(Boolean).join(' / ') || '—', ellipsis: true },
                                { title: '状态', dataIndex: 'status', width: 105 },
                                { title: '任务工时', render: (_, item) => completedActualHours(item) == null ? '—' : `${completedActualHours(item)} 小时`, width: 100 },
                                { title: '操作', hidden: readOnly, width: 90, render: (_, item) => <Button type="text" danger size="small" icon={<Trash2 className="h-3.5 w-3.5"/>} disabled={busy || !editorState.editable} aria-label="移除关联工作" onClick={() => removeWork(kr.keyResultId, item.id)}/> },
                              ]}
                            />
                          </div>
                        ) : (
                          <div className="p-3 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-main)] rounded bg-[var(--bg-card)]">
                            (暂未关联本期工作任务)
                          </div>
                        )}
                      </div>


                    </div>
                    }]}/>
                  );
                })}
                </div>
                )
              }]}
            />
          ))
        )}
      <ReviewTemplateSection template={reportTemplate.snapshot} blockId="goals" values={reportTemplate.values} onChange={reportTemplate.setValues} people={people} disabled={busy || readOnly}/>
      </section>

      {/* ▌ 2. 插播任务 */}
      <section data-review-block="extra" className="okr-weekly-section">
        <div className="okr-weekly-section-header">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>{reviewBlockTitle(reportTemplate.snapshot, 'extra', '2. 插播任务')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="middle"
              icon={<Plus className="h-3.5 w-3.5" />}
              disabled={busy || !editorState.editable}
              onClick={() => openPicker('extra')}
            >
              关联工作任务
            </Button>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-4 shadow-sm">
          {allExtraRows.length > 0 ? (
            <div className="border border-[var(--border-main)] rounded overflow-hidden">
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={allExtraRows}
                columns={[
                  { title: '标题', dataIndex: 'content', ellipsis: true },
                  { title: '来源归属', dataIndex: 'source', ellipsis: true },
                  { title: '状态', dataIndex: 'status', width: 105 },
                  { title: '任务工时', dataIndex: 'hours', width: 100 },
                  {
                    title: '操作', hidden: readOnly,
                    width: 90,
                    render: (_, row) => (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        disabled={busy || !editorState.editable}
                        aria-label="移除额外工作"
                        title="移除"
                        onClick={() => {
                          if (row.isManual) {
                            setManualWorks(rows => rows.filter(item => item.id !== row.id));
                          } else {
                            setExtra(prev => ({ ...prev, workIds: prev.workIds.filter(wid => wid !== row.id) }));
                          }
                        }}
                      />
                    )
                  },
                  ...(supervisor ? [{ title: '来源员工', render: (_: unknown, row: { sourceEmployee?: string }) => row.sourceEmployee || viewer?.name || '主管本人' }] : []),
                ].filter(column => !supervisor || column.title !== '操作')}
              />
            </div>
          ) : (
            <Empty description="暂无插播任务" />
          )}
        </div>
      <ReviewTemplateSection template={reportTemplate.snapshot} blockId="extra" values={reportTemplate.values} onChange={reportTemplate.setValues} people={people} disabled={busy || readOnly}/>
      </section>

      {supervisor && !reportTemplate.hasBlock('departmentSummary') && <section className="okr-weekly-section" aria-label={monthly ? '本月部门补充总结' : '部门补充总结'}>
        <div className="okr-weekly-section-header okr-weekly-section-header-title text-sm font-semibold text-[var(--text-primary)]"><span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" aria-hidden="true"/><span>{monthly ? '3. 本月部门补充总结' : '3. 部门补充总结'}</span></div>
        <Input.TextArea className="okr-weekly-plan-input" aria-label={monthly ? '本月部门补充总结' : '部门补充总结'} value={departmentSummary} onChange={event => setDepartmentSummary(event.target.value)} rows={4} maxLength={10000} showCount placeholder={monthly ? '补充部门本月整体成果、问题与经验' : '补充部门本周整体成果、问题与经验'} disabled={busy || !editorState.editable}/>
      </section>}

      {(monthly || !reportTemplate.hasBlock('nextWeekPlan')) && <section className="okr-weekly-section" aria-label={monthly ? '部门反馈问题梳理与分析' : supervisor ? '部门下周计划' : '下周计划'}>
        <div className="okr-weekly-section-header okr-weekly-section-header-title text-sm font-semibold text-[var(--text-primary)]"><span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" aria-hidden="true"/><span>{monthly ? '4. 部门反馈问题梳理与分析' : supervisor ? '4. 部门下周计划' : '3. 下周计划'}</span></div>
        {monthly ? <><DepartmentFeedbackTable rows={feedbackRows} disabled={busy || readOnly || recordsLoading || Boolean(recordsError)} loading={!readOnly && recordsLoading} error={!readOnly && Boolean(recordsError)} onRetry={onRefreshRecords} onChange={row => setFeedbackJudgments(current => [...current.filter(item => item.reviewId !== row.reviewId), row])}/>{readOnly && !feedbackRows.length && initialPayload?.suggestions && <p className="whitespace-pre-wrap break-words">{initialPayload.suggestions}</p>}</> : <Input.TextArea className="okr-weekly-plan-input" aria-label={supervisor ? '部门下周计划' : '下周计划'} value={nextWeekPlan} onChange={event => setNextWeekPlan(event.target.value)} rows={4} maxLength={10000} showCount placeholder="填写下周重点工作、预期结果与关键节点" disabled={busy || !editorState.editable}/>}
      </section>}

      <section data-review-block="assistance" className="okr-weekly-section" aria-label="需要协助事项">
        <div className="okr-weekly-section-header">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>{reviewBlockTitle(reportTemplate.snapshot, 'assistance', supervisor ? '5. 需要协助的事项' : '4. 需要协助事项')}</span>
          </div>
          <Dropdown trigger={['click']} disabled={busy || !editorState.editable} menu={{
            items: assistanceTypes.map(type => ({ key: type, label: workOrderDisplayName(type) })),
            onClick: ({ key }) => setCreationType(key as WorkOrderType),
          }}><Button icon={<Plus className="h-3.5 w-3.5" />} disabled={busy || !editorState.editable}>发起协同</Button></Dropdown>
        </div>
        <div className={displayedAssistance.length ? 'okr-weekly-list-panel' : 'okr-weekly-empty-panel'}>
        {displayedAssistance.length > 0 ? <Table size="small" rowKey={row => row.workId || row.rowId!} pagination={false} dataSource={displayedAssistance}
          locale={{ emptyText: <Empty description="暂无需要协助事项" /> }} columns={[
            { title: '标题', dataIndex: 'subject', ellipsis: true },
            { title: '事项类型', render: (_, row) => workOrderDisplayName(row.assistanceType) || '—' },
            { title: '负责人', dataIndex: 'expectedAssignee' },
            { title: '状态', render: (_, row) => row.status || '未发起' },
            { title: '删除操作', hidden: readOnly, render: (_, row, index) => <Button type="text" danger disabled={busy || !editorState.editable} aria-label={`移除协同事项${row.subject}`} onClick={() => setAssistance(rows => rows.filter((_, rowIndex) => rowIndex !== index))}>删除</Button> },
            ...(supervisor ? [{ title: '来源员工', render: (_: unknown, row: { sourceEmployee?: string }) => row.sourceEmployee || viewer?.name || '主管本人' }] : []),
          ].filter(column => !supervisor || column.title !== '删除操作')}/> : <Empty description="暂无需要协助事项"/>}
        </div>
      <ReviewTemplateSection template={reportTemplate.snapshot} blockId="assistance" values={reportTemplate.values} onChange={reportTemplate.setValues} people={people} disabled={busy || readOnly}/>
      </section>

      <section data-review-block="knowledge" className="okr-weekly-section" aria-label="知识沉淀">
        <div className="okr-weekly-section-header">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>{reviewBlockTitle(reportTemplate.snapshot, 'knowledge', supervisor ? '6. 知识沉淀' : '5. 知识沉淀')}</span>
          </div>
          <Button disabled={busy || !editorState.editable} icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setKnowledgeOpen(true)}>新建知识沉淀</Button>
        </div>
        <div className={displayedKnowledge.length ? 'okr-weekly-list-panel' : 'okr-weekly-empty-panel'}>
        <ReviewKnowledgeTable entries={displayedKnowledge} department={supervisor} viewerName={viewer?.name} readOnly={readOnly} disabled={busy || !editorState.editable} onView={setViewingKnowledge} onDelete={id => setKnowledgeEntries(rows => rows.filter(item => item.id !== id))}/>
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

      {supportTarget && <EmployeeReviewSupportDialog target={supportTarget} supports={(supportsByKr.get(supportTarget.keyResultId) || []).filter(support => !supportAuthorId || support.record.ownerId === supportAuthorId)} savedSnapshots={(supportTarget.employeeReviewSnapshots || []).filter(snapshot => !supportAuthorId || (snapshot.authorId || snapshot.authorName || snapshot.id) === supportAuthorId)} loading={recordsLoading} error={recordsError} onRetry={onRefreshRecords} onClose={() => { setSupportTargetId(null); setSupportAuthorId(null); }}/>}
      {picker && <WorkEvidencePicker includePending={supervisor} requireProduct={!supervisor && picker.target !== 'extra'} work={work} viewer={viewer} product={supervisor ? undefined : pickerSourceKr?.businessObject} startDate={period.startDate} endDate={period.endDate} selectedIds={picker.selection} blockedIds={linkedIds} loading={workLoading} error={workError} onRetry={onRefreshWork} onCancel={() => setPicker(null)} onConfirm={confirmPicker}/>}

      {/* 提交确认弹窗 (带中文界面及OKR系统进度同步勾选) */}
      <Modal
        open={submitModalOpen && !supervisor}
        title={monthly ? '确认提交部门月报' : '确认提交周报'}
        onCancel={() => setSubmitModalOpen(false)}
        okButtonProps={{ disabled: !editorState.editable || Boolean(detachedTargets.length) || (supervisor && (recordsLoading || Boolean(recordsError))) }}
        onOk={async () => {
          if (!editorState.editable || detachedTargets.length || (supervisor && (recordsLoading || recordsError))) return;
          const errors = supervisor ? departmentSubmissionErrors(payload(), records, people, viewer?.id || '') : [];
          if (errors.length) { setValidationErrors(errors); setSubmitModalOpen(false); return; }
          if (await onSubmit(payload())) setSubmitModalOpen(false);
        }}
        confirmLoading={busy}
        okText="确认提交"
        cancelText="取消"
        width={600}
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-[var(--text-body)]">
            {monthly ? '确认提交本期部门月报及目标汇总进度。' : '您即将提交本期周报，以下是您的个人计划进度更新汇总：'}
          </p>
          <div className="rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-2 text-sm text-[var(--text-body)]">
            审批人：<strong className="text-[var(--text-primary)]">{directSubmit ? '组织根负责人直接提交' : reviewerName}</strong>
            {!directSubmit && <span className="ml-2 text-xs text-[var(--text-muted)]">直属上级（系统自动设置）</span>}
          </div>
          <div className="okr-review-submit-summary">
            {objectiveGroups.length ? objectiveGroups.map(({ objective, krs: objectiveKrs }, objectiveIndex) => (
              <section key={objective.id} className="okr-review-submit-objective">
                <h4>{supervisor || objective.primaryLabel !== 'KR' ? `目标${objectiveIndex + 1}：` : ''}{objective.objective}</h4>
                {objectiveKrs.map((kr, krIndex) => (
                  <div key={kr.keyResultId} className="okr-review-submit-kr">
                    <span>{supervisor ? `KR${krIndex + 1}：` : '我的计划：'}{kr.keyResultTitle}</span>
                    <span className="font-mono">{kr.previousProgress}% → <strong>{kr.currentProgress}%</strong></span>
                  </div>
                ))}
              </section>
            )) : <Empty description={`没有需要提交的${rowLabel}`} />}
          </div>
          {supervisor && <div className="pt-2 border-t border-[var(--border-main)]">
            <p className="text-xs text-[var(--text-primary)]">确认提交后，根据员工支撑进度同步更新部门子表、KR 与 O。</p>
          </div>}
        </div>
      </Modal>
    </div>
  );
}
