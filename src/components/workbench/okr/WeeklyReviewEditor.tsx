import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Modal,
  Progress,
  Radio,
  Select,
  Space,
  Table,
  Tag
} from 'antd';
import dayjs from 'dayjs';
import type { EmployeeOption, OKRItem, WorkOrderType } from '../../../types';
import type { OkrPayload, OkrWork } from '../../../services/okrRepository';
import { AlertTriangle, Plus, Save, Send, Trash2 } from '@/components/common/octicons-compat';
import { workSource } from './workAggregation';
import { reviewPeriod } from './simpleReview';
import { mergeCopiedKrReviews } from './reviewCopy';
import { WorkEvidencePicker } from './WorkEvidencePicker';
import { defaultCollapsedReview } from './evidenceFilters';
import type { EvidenceViewer } from '../../../services/reviewEvidenceRepository';
import type { ReviewPeriod } from '../../../services/okrReviewRules';

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
  health: Health;
  achievement: string;
  blocker: string;
  nextPlan: string;
  evidenceNote?: string;
  workIds: string[];
}

export interface AssistanceDraft {
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

const impactOptions = [
  { value: 'none', label: '无明显影响' },
  { value: 'block', label: '挤占 A 投入' },
  { value: 'support', label: '支持 A' }
];

interface WeeklyReviewEditorProps {
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
  viewer?: EvidenceViewer;
  reviewerName?: string;
  teamMembers?: EmployeeOption[];
  directSubmit?: boolean;
  initialPayload?: OkrPayload;
  periodOverride?: ReviewPeriod;
}

export function WeeklyReviewEditor({
  okrs,
  work,
  busy,
  workLoading,
  workError,
  onRefreshWork,
  onSaveDraft,
  onSubmit,
  onCancel,
  viewer,
  reviewerName,
  teamMembers = [],
  directSubmit = false,
  initialPayload,
  periodOverride
}: WeeklyReviewEditorProps) {
  const period = useMemo(() => periodOverride || reviewPeriod('week'), [periodOverride]);
  const periodOkrs = okrs.filter(objective => objective.cycle === period.startDate.slice(0, 7) || objective.cycle === period.endDate.slice(0, 7));
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
  const [sync, setSync] = useState<boolean>(initialPayload?.syncKrProgress ?? true);
  const [submitModalOpen, setSubmitModalOpen] = useState<boolean>(false);
  const [collapsedObjectives, setCollapsedObjectives] = useState<Record<string, boolean>>({});
  const [collapsedKrs, setCollapsedKrs] = useState<Record<string, boolean>>({});
  const [nextWeekPlan, setNextWeekPlan] = useState(initialPayload?.nextWeekPlan || '');
  const [picker, setPicker] = useState<PickerState>(null);
  const toolbarSentinelRef = useRef<HTMLDivElement>(null);
  const [toolbarStuck, setToolbarStuck] = useState(false);
  const selectedObjectiveIds = useMemo(() => periodOkrs.map(o => o.id), [okrs, period.startDate, period.endDate]);
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

  const [krs, setKrs] = useState<KrReviewDraft[]>(() => {
    const currentKrs = periodOkrs.flatMap(o =>
      (o.keyResults || []).map((k, kIdx) => ({
          objectiveId: o.id,
          objectiveTitle: o.objective,
          keyResultId: k.id,
          keyResultTitle: k.content || (k as { title?: string }).title || `关键结果 ${kIdx + 1}`,
          previousProgress: k.progress,
          currentProgress: k.progress,
          health: 'normal' as Health,
          achievement: '',
          blocker: '',
          nextPlan: '',
          workIds: []
        }))
    );
    return initialPayload?.startDate ? currentKrs.map(kr => ({ ...kr, ...initialPayload.krReviews?.find(item => item.keyResultId === kr.keyResultId) })) : mergeCopiedKrReviews(currentKrs, initialPayload?.krReviews || []);
  });

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
    if (!rows.length && initialPayload?.helpNeeded) return [{ subject: '需要协同事项', result: initialPayload.helpNeeded, assistanceType: '', expectedAssignee: '', content: initialPayload.helpNeeded, expectedDueDate: '' }];
    return rows.map(row => ({
      subject: row.subject || '需要协同事项',
      result: row.result || row.content || '',
      assistanceType: row.assistanceType || '',
      expectedAssignee: row.expectedAssignee || '',
      content: row.content || row.result || '',
      expectedDueDate: row.expectedDueDate || ''
    }));
  });

  const workById = useMemo(() => new Map(work.map(item => [item.id, item])), [work]);

  const update = (id: string, p: Partial<KrReviewDraft>) =>
    setKrs(rows => rows.map(row => (row.keyResultId === id ? { ...row, ...p } : row)));

  const updateWorkNote = (_krId: string, workId: string, note: string) => {
    setWorkNotes(prev => ({ ...prev, [workId]: note }));
  };

  const linkedIds = useMemo(
    () => new Set(krs.flatMap(kr => kr.workIds).concat(extra.workIds)),
    [krs, extra.workIds]
  );

  const selectedKrs = useMemo(
    () => (selectedObjectiveIds.length ? krs.filter(kr => selectedObjectiveIds.includes(kr.objectiveId)) : krs),
    [krs, selectedObjectiveIds]
  );

  const objectiveGroups = useMemo(() => {
    const list = okrs.filter(o => selectedObjectiveIds.includes(o.id));

    return list
      .map(objective => ({
        objective,
        krs: krs.filter(kr => kr.objectiveId === objective.id)
      }))
      .filter(group => group.krs.length > 0);
  }, [okrs, selectedObjectiveIds, krs]);

  const selectedWorks = useMemo(
    () => [...linkedIds].map(id => workById.get(id)).filter((item): item is OkrWork => !!item),
    [linkedIds, workById]
  );

  const requestSubmit = () => {
    const errors: string[] = [];
    if (!directSubmit && !reviewerName) {
      errors.push('尚未配置直属上级，无法确定审批人');
    }
    if (selectedKrs.some(kr => kr.health !== 'normal' && !kr.blocker.trim())) {
      errors.push('风险或阻塞状态的 A 必须填写原因');
    }
    setValidationErrors(errors);
    if (errors.length === 0) setSubmitModalOpen(true);
  };

  // Sync summary calculations
  const syncChangesText = useMemo(() => {
    const changes = krs
      .map((kr, idx) => ({ ...kr, krIndex: idx + 1 }))
      .filter(kr => kr.currentProgress !== kr.previousProgress);
    if (changes.length === 0) return '暂无进度变动';
    return changes.map(c => `A${c.krIndex} ${c.previousProgress}% -> ${c.currentProgress}%`).join('，');
  }, [krs]);

  const payload = (): OkrPayload => ({
    title: reviewTitle,
    startDate: period.startDate,
    endDate: period.endDate,
    reviewType: 'week',
    reviewMode: 'structured',
    selfScore,
    summary: initialPayload?.summary || '',
    nextWeekPlan: nextWeekPlan.trim(),
    syncKrProgress: sync,
    krReviews: selectedKrs.map(kr => ({
      ...kr,
      evidenceNote: Object.entries(workNotes)
        .filter(([wid]) => kr.workIds.includes(wid))
        .map(([_, note]) => note)
        .join('；') || kr.evidenceNote
    })),
    helpNeeded: assistance.map(row => row.content.trim()).filter(Boolean).join('；'),
    assistance: assistance.filter(row => row.content.trim()).map(row => ({ ...row, subject: '需要协同事项', result: row.content.trim() })),
    extraWork: {
      ...extra,
      description: manualWorks.length ? JSON.stringify(manualWorks) : extra.description
    },
    items: [
      ...selectedWorks.map(item => ({
        workId: item.id,
        title: item.title,
        status: item.status,
        workType: workSource(item),
        result: workNotes[item.id] || '',
        impact: ''
      })),
      ...(initialPayload?.items || []).filter(item => linkedIds.has(item.workId) && !workById.has(item.workId))
        .map(item => ({ ...item, result: workNotes[item.workId] ?? item.result }))
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
      .map(id => workById.get(id))
      .filter((item): item is OkrWork => !!item)
      .map(item => ({
        id: item.id,
        content: item.title,
        source: workSource(item) === 'ticket' ? '协同事项' : '任务',
        status: item.status,
        hours: item.actualHours ? `${item.actualHours} 小时` : '',
        impact: extra.impact || 'none',
        isManual: false
      }));

    const manualRows = manualWorks.map(m => ({
      ...m,
      isManual: true
    }));

    return [...linkedExtra, ...manualRows];
  }, [extra, workById, manualWorks]);

  return (
    <div className="review-document-container max-w-6xl mx-auto space-y-5 text-[var(--text-primary)] pb-10">
      <div ref={toolbarSentinelRef} className="okr-review-toolbar-sentinel" aria-hidden="true" />
      {/* 顶部吸顶操作卡 */}
      <div className={`okr-review-sticky-toolbar${toolbarStuck ? ' is-stuck' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Tag color="blue" className="px-2 py-0.5 text-xs font-semibold rounded m-0 border-0">
              周报
            </Tag>
            <h2 className="text-base font-bold text-[var(--text-primary)] m-0">
              {cycleTitle}
            </h2>
            <Tag color="warning" className="text-xs rounded m-0">
              草稿状态
            </Tag>
            <span className="text-[11px] text-[var(--text-muted)] font-mono hidden lg:inline">
              ({syncChangesText})
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Button onClick={onCancel}>
              取消
            </Button>
            <Button
              icon={<Save className="h-4 w-4" />}
              loading={busy}
              onClick={() => onSaveDraft(payload())}
            >
              存草稿
            </Button>
            <Button
              type="primary"
              icon={<Send className="h-4 w-4" />}
              loading={busy}
              onClick={requestSubmit}
            >
              提交周报
            </Button>
          </div>
        </div>
      </div>

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
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>1. 本月目标复盘</span>
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
                label: (
                  <div className="flex items-center gap-2.5">
                    <Tag color="blue" className="m-0">O{oIdx + 1}</Tag>
                    <span className="font-semibold text-[var(--text-primary)] text-sm">
                      目标{oIdx + 1}：{objective.objective}
                    </span>
                  </div>
                ),
                children: (
                <div className="okr-review-a-list grid gap-4 p-4">
                  {objectiveKrs.map((kr, krIdx) => {
                  const evidence = kr.workIds
                    .map(id => workById.get(id))
                    .filter((item): item is OkrWork => !!item);

                  const collapsed = collapsedKrs[kr.keyResultId] ?? defaultCollapsedReview(kr);
                  return (
                    <Collapse key={kr.keyResultId} className="okr-review-a-collapse" activeKey={collapsed ? [] : [kr.keyResultId]} expandIconPosition="end" onChange={keys => setCollapsedKrs(current => ({ ...current, [kr.keyResultId]: !keys.length }))} items={[{
                      key: kr.keyResultId,
                      label: <div className="flex flex-wrap items-center gap-3"><strong>A{krIdx + 1}：{kr.keyResultTitle}</strong><Tag>{kr.currentProgress}%</Tag>{defaultCollapsedReview(kr) && kr.currentProgress < 100 ? <Tag>本周无变化</Tag> : null}</div>,
                      children: <div className="space-y-4">


                      {/* Progress & Health */}
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-2.5 px-3.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-md text-xs text-[var(--text-body)]">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)]">复盘前进度:</span>
                          <span className="font-semibold text-[var(--text-primary)]">{kr.previousProgress}%</span>
                          <span className="text-[var(--text-muted)] font-mono">--&gt;</span>
                          <span className="text-[var(--text-muted)]">本期更新进度:</span>
                          <Space.Compact>
                            <InputNumber
                              min={0}
                              max={100}
                              value={kr.currentProgress}
                              onChange={val => update(kr.keyResultId, { currentProgress: val ?? 0 })}
                              suffix="%"
                              size="small"
                              style={{ width: 85 }}
                            />
                          </Space.Compact>
                        </div>

                        <span className="text-[var(--text-muted)] hidden sm:inline">|</span>

                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)]">健康状态:</span>
                          <Radio.Group
                            size="small"
                            value={kr.health}
                            onChange={e => update(kr.keyResultId, { health: e.target.value })}
                          >
                            <Radio value="normal">
                              <span className="text-[var(--success)] font-medium">正常</span>
                            </Radio>
                            <Radio value="risk">
                              <span className="text-[var(--warning)] font-medium">有风险</span>
                            </Radio>
                            <Radio value="blocked">
                              <span className="text-[var(--danger)] font-medium">已阻塞</span>
                            </Radio>
                          </Radio.Group>
                        </div>

                        <span className="text-[var(--text-muted)] hidden lg:inline">|</span>

                        {/* 进度变化条 (放在健康状态后面，紧凑显示) */}
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)]">进度:</span>
                          <span className="font-mono text-[11px] text-[var(--text-body)]">
                            {kr.previousProgress}% → <strong className="text-[var(--primary)]">{kr.currentProgress}%</strong>
                          </span>
                          <Progress
                            className="okr-review-progress-compact"
                            percent={kr.currentProgress}
                            showInfo={false}
                            size="small"
                          />
                          <span className={`text-[11px] font-semibold ${kr.currentProgress >= kr.previousProgress ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                            {kr.currentProgress >= kr.previousProgress ? `+${kr.currentProgress - kr.previousProgress}%` : `${kr.currentProgress - kr.previousProgress}%`}
                          </span>
                        </div>
                      </div>

                      {kr.health !== 'normal' && (
                        <div className="okr-review-risk-callout">
                          <AlertTriangle />
                          <div>
                            <b>风险原因及所需支持</b>
                            <Input.TextArea
                              value={kr.blocker}
                              onChange={e => update(kr.keyResultId, { blocker: e.target.value })}
                              autoSize={{ minRows: 2, maxRows: 5 }}
                              placeholder="说明风险或阻塞原因、外部依赖和所需支持"
                            />
                          </div>
                        </div>
                      )}

                      {/* Evidence Section */}
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[var(--text-body)] flex items-center gap-1.5">
                            <span className="text-[var(--primary)]">▶</span> 本期关联工作证据
                          </span>
                          <Button
                            size="small"
                            icon={<Plus className="h-3.5 w-3.5" />}
                            onClick={() => openPicker(kr.keyResultId)}
                          >
                            关联工作证据
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
                                {
                                  title: '来源',
                                  width: 80,
                                  render: (_, item) => (
                                    <Tag color={workSource(item) === 'ticket' ? 'purple' : 'blue'}>
                                      {workSource(item) === 'ticket' ? '协同事项' : '任务'}
                                    </Tag>
                                  )
                                },
                                {
                                  title: '标题',
                                  ellipsis: true,
                                  render: (_, item) => (
                                    <span className="text-xs text-[var(--text-primary)] font-medium">
                                      {item.title}
                                    </span>
                                  )
                                },
                                {
                                  title: '状态',
                                  width: 90,
                                  render: (_, item) => (
                                    <Tag color={statusColor(item.status)}>{item.status}</Tag>
                                  )
                                },
                                {
                                  title: '创建者',
                                  width: 110,
                                  render: (_, item) => (
                                    <span className="text-xs text-[var(--text-body)]">
                                      {item.creatorName || item.ownerName || '-'}
                                    </span>
                                  )
                                },
                                {
                                  title: '进展说明',
                                  render: (_, item) => (
                                    <Input
                                      size="small"
                                      placeholder="填写进展说明"
                                      value={workNotes[item.id] ?? ''}
                                      onChange={e => updateWorkNote(kr.keyResultId, item.id, e.target.value)}
                                    />
                                  )
                                },
                                {
                                  title: '操作',
                                  width: 60,
                                  render: (_, item) => (
                                    <Button
                                      type="text"
                                      danger
                                      size="small"
                                      icon={<Trash2 className="h-3.5 w-3.5" />}
                                      aria-label="移除关联工作"
                                      title="移除"
                                      onClick={() => removeWork(kr.keyResultId, item.id)}
                                    />
                                  )
                                }
                              ]}
                            />
                          </div>
                        ) : (
                          <div className="p-3 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-main)] rounded bg-[var(--bg-card)]">
                            (暂未关联本期工作证据)
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
      </section>

      {/* ▌ 2. 非本月目标任务 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>2. 非本月目标任务</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => openPicker('extra')}
            >
              关联工作证据
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
                  {
                    title: '工作内容',
                    ellipsis: true,
                    render: (_, row) =>
                      row.isManual ? (
                        <Input
                          size="small"
                          value={row.content}
                          onChange={e =>
                            setManualWorks(rows =>
                              rows.map(item => (item.id === row.id ? { ...item, content: e.target.value } : item))
                            )
                          }
                          placeholder="填写临时工作内容"
                        />
                      ) : (
                        <span className="text-xs text-[var(--text-primary)]">{row.content}</span>
                      )
                  },
                  {
                    title: '来源',
                    width: 90,
                    render: (_, row) => (
                      <Tag color={row.source === '工单' ? 'purple' : row.source === '任务' ? 'blue' : 'default'}>
                        {row.source}
                      </Tag>
                    )
                  },
                  {
                    title: '当前状态',
                    width: 105,
                    render: (_, row) => (
                      <Select
                        size="small"
                        value={row.status}
                        disabled={!row.isManual}
                        style={{ width: 95 }}
                        options={['待处理', '处理中', '已完成', '已阻塞'].map(s => ({ value: s, label: s }))}
                        onChange={status => {
                          if (row.isManual) {
                            setManualWorks(rows =>
                              rows.map(item => (item.id === row.id ? { ...item, status } : item))
                            );
                          }
                        }}
                      />
                    )
                  },
                  {
                    title: '占用时间',
                    width: 100,
                    render: (_, row) => (
                      <Input
                        size="small"
                        value={row.hours}
                        disabled={!row.isManual}
                        onChange={e => {
                          if (row.isManual) {
                            setManualWorks(rows =>
                              rows.map(item => (item.id === row.id ? { ...item, hours: e.target.value } : item))
                            );
                          }
                        }}
                        placeholder="如 1.5 天"
                      />
                    )
                  },
                  {
                    title: '对本月目标的影响',
                    width: 170,
                    render: (_, row) => (
                      <Select
                        size="small"
                        value={row.impact || 'none'}
                        style={{ width: 160 }}
                        options={impactOptions}
                        onChange={impact => {
                          if (row.isManual) {
                            setManualWorks(rows =>
                              rows.map(item => (item.id === row.id ? { ...item, impact } : item))
                            );
                          } else {
                            setExtra(prev => ({ ...prev, impact }));
                          }
                        }}
                      />
                    )
                  },
                  {
                    title: '操作',
                    width: 60,
                    render: (_, row) => (
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
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
                  }
                ]}
              />
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-main)] rounded bg-[var(--bg-surface-soft)]">
              暂无非本月目标工作
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2" aria-label="下周计划">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]"><span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" aria-hidden="true"/><span>3. 下周计划</span></div>
        <Input.TextArea aria-label="下周计划" value={nextWeekPlan} onChange={event => setNextWeekPlan(event.target.value)} autoSize={{ minRows: 3, maxRows: 8 }} maxLength={10000} showCount placeholder="填写下周重点工作、预期结果与关键节点" disabled={busy}/>
      </section>

      {/* ▌ 4. 需要协助事项 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
          <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
          <span>4. 需要协助事项</span>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-4 shadow-sm">
          <div className="space-y-3">
            {assistance.map((row, index) => (
              <div key={`assistance-${index}`} className="grid grid-cols-1 gap-2 rounded border border-[var(--border-main)] p-3 md:grid-cols-[160px_180px_160px_1fr_auto]">
                <Select value={row.assistanceType || undefined} placeholder="请选择协助类型" options={assistanceTypes.map(value => ({ value, label: value === '客户诉求' ? '产品需求' : value }))} onChange={value => setAssistance(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, assistanceType: value } : item))} />
                <Select showSearch allowClear optionFilterProp="label" value={row.expectedAssignee || undefined} placeholder="请选择期望协助人" options={teamMembers.map(member => ({ value: member.name, label: `${member.name} · ${member.jobTitle || member.roleTitle || '未设置职位'}` }))} onChange={value => setAssistance(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, expectedAssignee: value || '' } : item))} />
                <DatePicker value={row.expectedDueDate ? dayjs(row.expectedDueDate) : null} onChange={value => setAssistance(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, expectedDueDate: value?.format('YYYY-MM-DD') || '' } : item))} placeholder="期望完成日期" />
                <Input value={row.content} onChange={event => setAssistance(rows => rows.map((item, rowIndex) => rowIndex === index ? { ...item, content: event.target.value, result: event.target.value } : item))} placeholder="说明需要的协助、资源和反馈" />
                <Button type="text" danger aria-label="移除协同事项" onClick={() => setAssistance(rows => rows.filter((_, rowIndex) => rowIndex !== index))}>移除</Button>
              </div>
            ))}
            <Button icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAssistance(rows => [...rows, { subject: '需要协同事项', result: '', assistanceType: '', expectedAssignee: '', content: '', expectedDueDate: '' }])}>添加协同事项</Button>
          </div>
        </div>
      </section>

      {picker && <WorkEvidencePicker work={work} viewer={viewer} product={pickerSourceKr?.businessObject} version={pickerSourceKr?.version} startDate={period.startDate} endDate={period.endDate} selectedIds={picker.selection} blockedIds={linkedIds} loading={workLoading} error={workError} onRetry={onRefreshWork} onCancel={() => setPicker(null)} onConfirm={confirmPicker}/>}

      {/* 提交确认弹窗 (带中文界面及OKR系统进度同步勾选) */}
      <Modal
        open={submitModalOpen}
        title="确认提交周报"
        onCancel={() => setSubmitModalOpen(false)}
        onOk={async () => {
          if (await onSubmit(payload())) setSubmitModalOpen(false);
        }}
        confirmLoading={busy}
        okText="确认提交"
        cancelText="取消"
        width={600}
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-[var(--text-body)]">
            您即将提交本期周报，以下是您的关键结果进度更新汇总：
          </p>
          <div className="rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-2 text-sm text-[var(--text-body)]">
            审批人：<strong className="text-[var(--text-primary)]">{directSubmit ? '组织根负责人直接提交' : reviewerName}</strong>
            {!directSubmit && <span className="ml-2 text-xs text-[var(--text-muted)]">直属上级（系统自动设置）</span>}
          </div>
          <div className="okr-review-submit-summary">
            {objectiveGroups.length ? objectiveGroups.map(({ objective, krs: objectiveKrs }, objectiveIndex) => (
              <section key={objective.id} className="okr-review-submit-objective">
                <h4>目标{objectiveIndex + 1}：{objective.objective}</h4>
                {objectiveKrs.map((kr, krIndex) => (
                  <div key={kr.keyResultId} className="okr-review-submit-kr">
                    <span>A{krIndex + 1}：{kr.keyResultTitle}</span>
                    <span className="font-mono">{kr.previousProgress}% → <strong>{kr.currentProgress}%</strong></span>
                  </div>
                ))}
              </section>
            )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有需要提交的未完成 A" />}
          </div>
          <div className="pt-2 border-t border-[var(--border-main)]">
            <Checkbox checked={sync} onChange={e => setSync(e.target.checked)}>
              <span className="text-xs text-[var(--text-primary)] font-medium">
                将确认后的进度同步更新至对应 OKR 系统
              </span>
            </Checkbox>
          </div>
        </div>
      </Modal>
    </div>
  );
}
