import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Empty,
  Input,
  InputNumber,
  Modal,
  Progress,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag
} from 'antd';
import dayjs from 'dayjs';
import type { OKRItem } from '../../../types';
import type { OkrPayload, OkrWork } from '../../../services/okrRepository';
import { Plus, Save, Search, Send, Trash2 } from '@/components/common/octicons-compat';
import { periodWork } from './workAggregation';
import { reviewPeriod } from './simpleReview';

type Health = 'normal' | 'risk' | 'blocked';
type PickerSource = 'task' | 'ticket';
type PickerState = { target: string; source: PickerSource; selection: string[]; keyword: string; status: string } | null;
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
}

const terminalStatuses = new Set(['已完成', '已发布', '已验收', '已关闭']);
const statusColor = (status: string) =>
  terminalStatuses.has(status)
    ? 'success'
    : status.includes('阻塞') || status.includes('驳回')
    ? 'error'
    : 'processing';

const workSource = (item: OkrWork): PickerSource => {
  const kind = item.kind.toLowerCase();
  return kind.includes('work_order') || kind.includes('ticket') ? 'ticket' : 'task';
};

interface StructuredReviewEditorProps {
  key?: React.Key;
  type: 'week' | 'month';
  okrs: OKRItem[];
  work: OkrWork[];
  busy: boolean;
  workLoading: boolean;
  workError?: unknown;
  onRefreshWork: () => void;
  onSaveDraft: (payload: OkrPayload) => Promise<boolean>;
  onSubmit: (payload: OkrPayload) => Promise<boolean>;
  onCancel: () => void;
  onAddObjective?: () => void;
}

export function StructuredReviewEditor({
  type,
  okrs,
  work,
  busy,
  workLoading,
  workError,
  onRefreshWork,
  onSaveDraft,
  onSubmit,
  onCancel,
  onAddObjective
}: StructuredReviewEditorProps) {
  const period = useMemo(() => reviewPeriod(type), [type]);
  const start = dayjs(period.startDate);
  const end = dayjs(period.endDate);

  // Week number calculation (standard 7-day offset or ISO week)
  const weekNumber = useMemo(() => {
    const diffDays = start.diff(start.startOf('year'), 'day');
    return Math.floor(diffDays / 7) + 1;
  }, [start]);

  const cycleTitle = useMemo(() => {
    if (type === 'week') {
      return `${start.year()}年第 ${weekNumber} 周 (${start.format('MM.DD')} - ${end.format('MM.DD')})`;
    }
    return `${start.year()}年${start.format('MM')}月 (${start.format('MM.DD')} - ${end.format('MM.DD')})`;
  }, [type, start, end, weekNumber]);

  const reviewTitle = `[${type === 'week' ? '周报' : '月报'}] ${cycleTitle}`;

  const [selfScore] = useState<number>(90);
  const [sync, setSync] = useState<boolean>(true);
  const [submitModalOpen, setSubmitModalOpen] = useState<boolean>(false);
  const [collapsedObjectives, setCollapsedObjectives] = useState<Record<string, boolean>>({});
  const [picker, setPicker] = useState<PickerState>(null);
  const toolbarSentinelRef = useRef<HTMLDivElement>(null);
  const [toolbarStuck, setToolbarStuck] = useState(false);
  const selectedObjectiveIds = useMemo(() => okrs.map(o => o.id), [okrs]);
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
    return okrs.flatMap(o =>
      (o.keyResults || []).filter(k => k.progress < 100).map((k, kIdx) => ({
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
  });

  const [workNotes, setWorkNotes] = useState<Record<string, string>>({});

  // Section 3: Extra work
  const [extra, setExtra] = useState<{
    workIds: string[];
    description: string;
    impact: string;
    notes: Record<string, string>;
  }>({
    workIds: [],
    description: '',
    impact: '无明显影响',
    notes: {}
  });

  const [manualWorks, setManualWorks] = useState<ManualWork[]>([]);

  const [helpNeeded, setHelpNeeded] = useState<string>('');

  const candidates = useMemo(
    () => periodWork(work, period.startDate, period.endDate),
    [work, period.startDate, period.endDate]
  );
  const workById = useMemo(() => new Map(candidates.map(item => [item.id, item])), [candidates]);

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
    if (selectedKrs.some(kr => !kr.achievement.trim())) {
      errors.push('请补充所有已选 KR 的本期成果');
    }
    if (selectedKrs.some(kr => !kr.nextPlan.trim())) {
      errors.push('请补充所有已选 KR 的下一步计划');
    }
    if (selectedKrs.some(kr => kr.health !== 'normal' && !kr.blocker.trim())) {
      errors.push('风险或阻塞状态的 KR 必须填写原因');
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
    return changes.map(c => `KR${c.krIndex} ${c.previousProgress}% -> ${c.currentProgress}%`).join('，');
  }, [krs]);

  const payload = (): OkrPayload => ({
    title: reviewTitle,
    startDate: period.startDate,
    endDate: period.endDate,
    reviewType: type,
    reviewMode: 'structured',
    selfScore,
    summary: '',
    helpNeeded,
    syncKrProgress: sync,
    krReviews: selectedKrs.map(kr => ({
      ...kr,
      evidenceNote: Object.entries(workNotes)
        .filter(([wid]) => kr.workIds.includes(wid))
        .map(([_, note]) => note)
        .join('；') || kr.evidenceNote
    })),
    assistance: helpNeeded.trim() ? [{ subject: '需要协助与反馈', result: helpNeeded.trim() }] : [],
    extraWork: {
      ...extra,
      description: manualWorks.length ? JSON.stringify(manualWorks) : extra.description
    },
    items: selectedWorks.map(item => ({
      workId: item.id,
      title: item.title,
      status: item.status,
      result: workNotes[item.id] || '',
      impact: ''
    }))
  });

  const openPicker = (target: string, source: PickerSource = 'task') => {
    const kr = krs.find(item => item.keyResultId === target);
    setPicker({
      target,
      source,
      selection: target === 'extra' ? [...extra.workIds] : [...(kr?.workIds || [])],
      keyword: '',
      status: 'all'
    });
  };

  const pickerCandidates = useMemo(() => {
    if (!picker) return [];
    return candidates
      .filter(item => picker.source === workSource(item))
      .filter(
        item =>
          !terminalStatuses.has(item.status) ||
          (!dayjs(item.updatedAt).isBefore(period.startDate, 'day') &&
            !dayjs(item.updatedAt).isAfter(period.endDate, 'day'))
      )
      .filter(
        item =>
          !picker.keyword.trim() ||
          `${item.title} ${item.sourceId || ''} ${item.id}`.toLowerCase().includes(picker.keyword.trim().toLowerCase())
      )
      .filter(item => picker.status === 'all' || item.status === picker.status);
  }, [candidates, picker, period.startDate, period.endDate]);

  const pickerStatusOptions = useMemo(() => {
    if (!picker) return [{ value: 'all', label: '全部状态' }];
    const statuses = candidates
      .filter(item => picker.source === workSource(item))
      .map(item => item.status)
      .filter(Boolean);
    return [
      { value: 'all', label: '全部状态' },
      ...Array.from(new Set(statuses)).map(status => ({ value: status, label: status }))
    ];
  }, [candidates, picker]);

  const pickerKr = picker?.target !== 'extra'
    ? krs.find(kr => kr.keyResultId === picker?.target)
    : undefined;
  const pickerKrIndex = pickerKr
    ? krs.filter(kr => kr.objectiveId === pickerKr.objectiveId)
      .findIndex(kr => kr.keyResultId === pickerKr.keyResultId) + 1
    : 0;

  const confirmPicker = () => {
    if (!picker) return;
    if (picker.target === 'extra') {
      setExtra(value => ({ ...value, workIds: picker.selection }));
    } else {
      update(picker.target, { workIds: picker.selection });
    }
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
        source: workSource(item) === 'ticket' ? '工单' : '任务',
        status: item.status,
        hours: item.actualHours ? `${item.actualHours} 小时` : '',
        impact: extra.impact || '无明显影响',
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
            <Tag color={type === 'week' ? 'blue' : 'purple'} className="px-2 py-0.5 text-xs font-semibold rounded m-0 border-0">
              {type === 'week' ? '周报' : '月报'}
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
              提交{type === 'week' ? '周报' : '月报'}
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

      {/* ▌ 1. OKR 目标复盘 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>1. OKR 目标复盘</span>
          </div>
          {onAddObjective && (
            <Button size="small" icon={<Plus className="h-3.5 w-3.5" />} onClick={onAddObjective}>
              添加目标
            </Button>
          )}
        </div>

        {objectiveGroups.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-8 text-center shadow-sm">
            <Empty description="暂无可复盘的 OKR 目标" />
          </div>
        ) : (
          objectiveGroups.map(({ objective, krs: objectiveKrs }, oIdx) => (
            <Collapse
              key={objective.id}
              className="okr-review-objective-collapse"
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
                <div className="p-5 space-y-6">
                  {objectiveKrs.map((kr, krIdx) => {
                  const evidence = kr.workIds
                    .map(id => workById.get(id))
                    .filter((item): item is OkrWork => !!item);

                  return (
                    <div
                      key={kr.keyResultId}
                      className="bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-lg p-5 space-y-4"
                    >
                      {/* KR Header */}
                      <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-main)] pb-3">
                        <span className="text-[var(--primary)] font-bold">KR{krIdx + 1}</span>
                        <span>关键结果 (KR{krIdx + 1})：{kr.keyResultTitle}</span>
                      </div>

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

                      {/* Evidence Section */}
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[var(--text-body)] flex items-center gap-1.5">
                            <span className="text-[var(--primary)]">▶</span> 本期关联工作证据
                          </span>
                          <Button
                            size="small"
                            icon={<Plus className="h-3.5 w-3.5" />}
                            onClick={() => openPicker(kr.keyResultId, 'task')}
                          >
                            关联任务或工单
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
                                      {workSource(item) === 'ticket' ? '工单' : '任务'}
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

                      {/* Narrative Fields */}
                      <div className="space-y-3 pt-2">
                        <div>
                          <div className="text-xs font-semibold text-[var(--text-body)] mb-1.5 flex items-center gap-1">
                            <span className="text-[var(--danger)]">*</span> 本期成果 (成果/结果导向，非任务流水账)
                          </div>
                          <Input.TextArea
                            autoSize={{ minRows: 3 }}
                            value={kr.achievement}
                            onChange={e => update(kr.keyResultId, { achievement: e.target.value })}
                            placeholder="填写本期交付结果、数据变化和已完成的里程碑"
                          />
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-[var(--text-body)] mb-1.5 flex items-center gap-1">
                            <span className="text-[var(--danger)]">*</span> 阻塞与风险 (支持为空/写无)
                          </div>
                          <Input.TextArea
                            autoSize={{ minRows: 3 }}
                            value={kr.blocker}
                            onChange={e => update(kr.keyResultId, { blocker: e.target.value })}
                            placeholder="填写风险、依赖和需要协调的事项；没有可填写“无”"
                          />
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-[var(--text-body)] mb-1.5 flex items-center gap-1">
                            <span className="text-[var(--danger)]">*</span> 下一步计划 (下周动作)
                          </div>
                          <Input.TextArea
                            autoSize={{ minRows: 3 }}
                            value={kr.nextPlan}
                            onChange={e => update(kr.keyResultId, { nextPlan: e.target.value })}
                            placeholder="填写下一周期的行动、负责人和预期结果"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
                )
              }]}
            />
          ))
        )}
      </section>

      {/* ▌ 2. 非 OKR 额外工作 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
            <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
            <span>2. 非 OKR 额外工作</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="small"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => openPicker('extra', 'task')}
            >
              关联任务或工单
            </Button>
            <Button
              size="small"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() =>
                setManualWorks(prev => [
                  ...prev,
                  {
                    id: `manual-${Date.now()}`,
                    content: '',
                    source: '手工记录',
                    status: '处理中',
                    hours: '',
                    impact: '无明显影响',
                    note: ''
                  }
                ])
              }
            >
              临时任务
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
                    title: '对 OKR 的影响',
                    width: 170,
                    render: (_, row) => (
                      <Select
                        size="small"
                        value={row.impact || '无明显影响'}
                        style={{ width: 160 }}
                        options={[
                          { value: '无明显影响', label: '无明显影响' },
                          { value: '挤占 KR 投入', label: '挤占 KR 投入' },
                          { value: '支持 KR', label: '支持 KR' }
                        ]}
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
              (暂无非 OKR 额外工作)
            </div>
          )}
        </div>
      </section>

      {/* ▌ 3. 需要协助与反馈的事项说明 */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--text-primary)]">
          <span className="w-1.5 h-4 bg-[var(--primary)] rounded-full inline-block" />
          <span>3. 需要协助与反馈的事项说明</span>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg p-4 shadow-sm">
          <Input.TextArea
            autoSize={{ minRows: 3 }}
            value={helpNeeded}
            onChange={e => setHelpNeeded(e.target.value)}
            placeholder="如需其他部门或主管协助，请在此说明协助事项、所需资源及期望交付节点..."
          />
        </div>
      </section>

      {picker && (
        <Modal
          className="okr-work-association-modal"
          open
          title="关联任务或工单"
          width={1120}
          destroyOnHidden
          onCancel={() => setPicker(null)}
          footer={[
            <span key="count" className="okr-work-association-count">
              已选 <strong>{picker.selection.length}</strong> 项任务或工单
            </span>,
            <Button key="cancel" onClick={() => setPicker(null)}>取消</Button>,
            <Button key="confirm" type="primary" onClick={confirmPicker}>确认关联</Button>
          ]}
        >
          <div className="okr-work-association-body">
            <p className="okr-work-association-context">
              {picker.target === 'extra' ? (
                <>为 <strong>非 OKR 工作</strong> 选择任务或工单</>
              ) : (
                <>为 <strong>{pickerKr ? `KR${pickerKrIndex}：${pickerKr.keyResultTitle}` : '当前 KR'}</strong> 选择工作证据</>
              )}
            </p>
            <Tabs
              className="okr-work-association-tabs"
              activeKey={picker.source}
              items={[
                { key: 'task', label: '我的任务' },
                { key: 'ticket', label: '我的工单' }
              ]}
              onChange={source => setPicker(value => value && {
                ...value,
                source: source as PickerSource,
                status: 'all'
              })}
            />
            <div className="okr-work-association-filters">
              <Input
                allowClear
                prefix={<Search className="h-4 w-4 text-[var(--text-muted)]" />}
                value={picker.keyword}
                onChange={event => setPicker(value => value && { ...value, keyword: event.target.value })}
                placeholder={`搜索${picker.source === 'ticket' ? '工单' : '任务'}名称或编号`}
              />
              <Select
                value={picker.status}
                style={{ width: 140 }}
                onChange={status => setPicker(value => value && { ...value, status })}
                options={pickerStatusOptions}
              />
            </div>
            <div className="okr-work-association-results">
              {workError && (
                <Alert
                  type="error"
                  title="工作项加载失败"
                  className="mb-3"
                  action={<Button onClick={onRefreshWork}>重试</Button>}
                />
              )}
              <Table<OkrWork>
                rowKey="id"
                loading={workLoading}
                pagination={false}
                scroll={{ x: 760, y: 420 }}
                dataSource={pickerCandidates}
                locale={{
                  emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前条件下暂无可关联工作" />
                }}
                rowSelection={{
                  selectedRowKeys: picker.selection,
                  onChange: keys => setPicker(value => value && { ...value, selection: keys as string[] }),
                  getCheckboxProps: item => ({
                    disabled: linkedIds.has(item.id) && !picker.selection.includes(item.id)
                  })
                }}
                columns={[
                  {
                    title: '来源',
                    width: 80,
                    render: (_, item) => (
                      <Tag color={workSource(item) === 'ticket' ? 'purple' : 'blue'}>
                        {workSource(item) === 'ticket' ? '工单' : '任务'}
                      </Tag>
                    )
                  },
                  {
                    title: '编号 / 名称',
                    ellipsis: true,
                    render: (_, item) => (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-mono text-[var(--text-muted)] font-medium">#{item.sourceId || item.id}</span>
                        <span className="text-[var(--text-primary)]">{item.title}</span>
                      </div>
                    )
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 100,
                    render: (status: string) => <Tag color={statusColor(status)}>{status}</Tag>
                  },
                  {
                    title: '创建者',
                    dataIndex: 'creatorName',
                    width: 120,
                    render: (value: string) => value || '未知'
                  },
                  {
                    title: '更新时间',
                    dataIndex: 'updatedAt',
                    width: 120,
                    render: (value: string) => value?.slice(0, 10) || '-'
                  },
                  {
                    title: '操作',
                    width: 90,
                    render: (_, item) => (
                      <Button
                        type="link"
                        size="small"
                        disabled={linkedIds.has(item.id) && !picker.selection.includes(item.id)}
                        onClick={() =>
                          setPicker(value =>
                            value && {
                              ...value,
                              selection: value.selection.includes(item.id)
                                ? value.selection.filter(id => id !== item.id)
                                : [...value.selection, item.id]
                            }
                          )
                        }
                      >
                        {picker.selection.includes(item.id) ? '取消选择' : '选择'}
                      </Button>
                    )
                  }
                ]}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 提交确认弹窗 (带中文界面及OKR系统进度同步勾选) */}
      <Modal
        open={submitModalOpen}
        title={`确认提交${type === 'week' ? '周报' : '月报'}`}
        onCancel={() => setSubmitModalOpen(false)}
        onOk={async () => {
          setSubmitModalOpen(false);
          await onSubmit(payload());
        }}
        okText="确认提交"
        cancelText="取消"
        width={600}
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-[var(--text-body)]">
            您即将提交本期{type === 'week' ? '周报' : '月报'}，以下是您的关键结果进度更新汇总：
          </p>
          <div className="okr-review-submit-summary">
            {objectiveGroups.length ? objectiveGroups.map(({ objective, krs: objectiveKrs }, objectiveIndex) => (
              <section key={objective.id} className="okr-review-submit-objective">
                <h4>目标{objectiveIndex + 1}：{objective.objective}</h4>
                {objectiveKrs.map((kr, krIndex) => (
                  <div key={kr.keyResultId} className="okr-review-submit-kr">
                    <span>KR{krIndex + 1}：{kr.keyResultTitle}</span>
                    <span className="font-mono">{kr.previousProgress}% → <strong>{kr.currentProgress}%</strong></span>
                  </div>
                ))}
              </section>
            )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有需要提交的未完成 KR" />}
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
