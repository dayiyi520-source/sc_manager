import { canAlignPeriod, periodLabel } from '../../../services/okrPeriods';
import { departmentTemplates } from '../../../services/okrTemplates';
import { KrDetailTable } from './KrDetailTable';
import { krDetails, krDetailContentComplete, krDetailSummary } from '../../../services/okrKrDetails';
import { GoalAlignmentDrawer } from './GoalAlignmentDrawer';
import { goalContentComplete, GOAL_ADDITION_MESSAGE } from './goalAdditionRules';
import { inheritedGoalPayload, validateThreeLevelGoal, upstreamReadiness, sourceKeyResults } from '../../../services/okrThreeLevelRules';
import { GoalExecutionFields } from './GoalExecutionFields';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Avatar, Button, DatePicker, Dropdown, Form, Input, InputNumber, Popconfirm, Select, Segmented, Tooltip, Typography } from 'antd';
import { GrabberIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import type { EmployeeOption, OKRItem } from '../../../types';
import type { OkrKr, OkrPayload, OkrPerson, OkrRecord, OkrSettings } from '../../../services/okrRepository';
import { periodStatusLabel } from './cycleOptions';
import { isSubmissionDeadline, isSubmissionWeight } from './submissionValidation';
import { PersonAvatar } from '../../common/PersonIdentity';

interface Props {
  threeLevel?: boolean; ownerId?: string; planLocked?: boolean;
  cycle: string;
  objectiveIndex?: number;
  ownerName: string;
  ownerAvatar?: string;
  parents: OKRItem[];
  people?: OkrPerson[];
  teamMembers?: EmployeeOption[];
  busy: boolean;
  unavailable: boolean;
  root: boolean;
  onCancel: () => void;
  onRemove?: () => void;
  onSave: (payload: OkrPayload) => Promise<boolean>;
  onSaveDraft?: (payload: OkrPayload) => Promise<boolean>;
  submitLabel?: string;
  onAddAnother?: () => void;
  chrome?: boolean;
  initialPayload?: OkrPayload;
  readOnly?: boolean;
  detailMode?: boolean;
  compactDetail?: boolean;
  allowAddAnotherInDetail?: boolean;
  supervisor?: boolean;
  goalLevel?: string;
  department?: string;
  alignmentActions?: OkrRecord[];
  productLineOptions?: string[];
  productLineVersionOptions?: Record<string, string[]>;
  projectOptions?: string[];
  projectProductOptions?: Record<string, string[]>;
  opportunityOptions?: Array<{ value: string; label: string; products: string[] }>;
  okrRecords?: OkrRecord[];
  settings?: OkrSettings;
}

export interface ObjectiveFormHandle { submit: (weight?: number) => Promise<boolean>; saveDraft: () => Promise<boolean>; snapshot: () => OkrPayload; }
export const calculateKrWeightTotal = (items: Pick<OkrKr, 'weight'>[]) => items.reduce((total, item) => total + item.weight, 0);

export const ObjectiveForm = forwardRef<ObjectiveFormHandle, Props>(function ObjectiveForm({ threeLevel = false, ownerId = '', planLocked = false, cycle, objectiveIndex = 0, ownerName, ownerAvatar, people = [], teamMembers, busy, unavailable, root, onCancel, onRemove, onSave, onSaveDraft, submitLabel, onAddAnother, chrome = true, initialPayload, readOnly = false, detailMode = false, compactDetail = false, allowAddAnotherInDetail = false, supervisor = false, goalLevel: levelLabel, department, alignmentActions: suppliedAlignments = [], productLineOptions = [], productLineVersionOptions = {}, projectOptions = [], projectProductOptions = {}, opportunityOptions = [], okrRecords = [], settings }, ref) {
  const person = people.find(item => item.id === ownerId);
  const assigned = suppliedAlignments.filter(reference => reference.payload.assigneeIds?.includes(ownerId));
  const referenceId = initialPayload?.sourceKrId || initialPayload?.alignments?.[0]?.parentKeyResultId || initialPayload?.parentKeyResultId;
  const autonomous = initialPayload?.origin === 'autonomous';
  const reference = autonomous ? undefined : referenceId ? assigned.find(item => item.id === referenceId) : assigned.filter(reference => !okrRecords.some(record => record.ownerId === ownerId && !record.payload.inherited && record.payload.sourceKrId === reference.id && record.periodKey === cycle))[objectiveIndex];
  const seed = threeLevel && !root && reference && person ? inheritedGoalPayload(reference, person) : undefined;
  const personal = threeLevel && levelLabel === '个人级' && !autonomous;
  const ownPersonal = threeLevel && levelLabel === '个人级' && autonomous;
  const effectiveInitial = initialPayload?.inherited && initialPayload.goalLevel === 'department' ? { ...initialPayload, title: '' } : personal && seed && !initialPayload?.sourceKrId ? seed : initialPayload ? { ...seed, ...initialPayload } : seed;
  const [selectedSource, setSelectedSource] = useState<string>(initialPayload?.sourceObjectiveId ? `${initialPayload.sourceObjectiveId}:${initialPayload.sourceKrId || ''}` : '');
  const availableSources = okrRecords.filter(record => canAlignPeriod(cycle, record.periodKey, settings?.cycles?.crossAlignment) && record.ownerId === person?.supervisorId && ['active','reviewed'].includes(record.status) && ['objective','action'].includes(record.kind) && !(record.changeRequest?.purpose === 'initial' && record.changeRequest.status !== 'approved'));
  const [alignmentOpen, setAlignmentOpen] = useState(false);
  const [changeReason, setChangeReason] = useState(initialPayload?.changeReason || '');
  const [objectiveTiming, setObjectiveTiming] = useState(initialPayload || {} as OkrPayload);
  const [title, setTitle] = useState(effectiveInitial?.title || '');
  const [objectiveWeight, setObjectiveWeight] = useState(initialPayload?.weight ?? 100);
  const [note, setNote] = useState(initialPayload?.note ?? '');
  const [objectiveType, setObjectiveType] = useState<'target' | 'challenge'>(initialPayload?.objectiveType ?? (autonomous ? 'challenge' : supervisor ? (suppliedAlignments.length > 0 && objectiveIndex === 0 ? 'target' : 'challenge') : (objectiveIndex === 0 ? 'target' : 'challenge')));
  const cycleEnd = dayjs(`${cycle}-01`).endOf('month').format('YYYY-MM-DD');
  const initialKrs = (): OkrKr[] => {
    const rows: OkrKr[] = effectiveInitial?.keyResults?.length ? effectiveInitial.keyResults : [{ id: crypto.randomUUID(), title: '', weight: 100, progress: 0 }];
    const normalizedRows = rows.map(kr => ({ ...kr, ...(threeLevel && supervisor && !personal && !ownPersonal && !kr.structureType ? {structureType: departmentTemplates(settings, department || person?.department)[0]?.type as OkrKr['structureType']} : {}), deadline: kr.deadline || reference?.payload.deadline || cycleEnd })).map((kr, index) => threeLevel && supervisor && !personal && !ownPersonal && ['product', 'delivery'].includes(kr.structureType || (departmentTemplates(settings, department || person?.department)[0]?.type)) ? { ...kr, details: krDetails(kr) } : kr);
    return personal || ownPersonal ? normalizedRows.map(kr => ({ ...kr, assigneeIds: [ownerId], executionActions: kr.executionActions?.length ? kr.executionActions.map(action => ({ ...action, weight: 100, deadline: action.deadline || kr.deadline || cycleEnd })) : [{ id: crypto.randomUUID(), ownerId, title: '', weight: 100, progress: 0, deadline: kr.deadline || cycleEnd }] })) : normalizedRows;
  };
  const [krs, setKrs] = useState<OkrKr[]>(initialKrs);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragHandleIndex = useRef<number | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setTitle(effectiveInitial?.title || '');
    setObjectiveWeight(initialPayload?.weight ?? 100);
    setNote(initialPayload?.note ?? '');
    setObjectiveType(initialPayload?.objectiveType ?? (autonomous ? 'challenge' : supervisor ? (suppliedAlignments.length > 0 && objectiveIndex === 0 ? 'target' : 'challenge') : (objectiveIndex === 0 ? 'target' : 'challenge')));
    setKrs(initialKrs());
  }, [initialPayload, threeLevel ? reference?.id : undefined]);
  const alignmentActions = initialPayload?.alignments?.length
    ? suppliedAlignments.filter(action => initialPayload.alignments?.some(alignment => alignment.parentKeyResultId === action.id))
    : suppliedAlignments;
  const hasAssignedActions = suppliedAlignments.length > 0;
  useEffect(() => {
    if (!initialPayload && supervisor && !autonomous) setObjectiveType(objectiveIndex === 0 && hasAssignedActions ? 'target' : 'challenge');
  }, [cycle, hasAssignedActions, objectiveIndex, initialPayload, supervisor]);
  const selectedParent = availableSources.find(item => selectedSource.startsWith(`${item.id}:`));
  const selectedParentKr = selectedParent && sourceKeyResults(selectedParent).find(kr => kr.id === selectedSource.slice(selectedParent.id.length + 1));
  const parentDeadline = (selectedParentKr?.deadline || selectedParent?.payload.deadline) || (threeLevel ? reference ? [reference] : [] : alignmentActions).map(action => action.payload.deadline).filter((value): value is string => Boolean(value)).sort()[0];
  useEffect(() => {
    if (parentDeadline) setKrs(items => items.map(kr => ({ ...kr, deadline: kr.deadline || parentDeadline })));
  }, [parentDeadline]);
  const exceedsParentDeadline = krs.some(kr => kr.deadline && parentDeadline && dayjs(kr.deadline).isAfter(dayjs(parentDeadline), 'day'));
  const krWeightTotal = calculateKrWeightTotal(krs);
  const assigneeOptions = (teamMembers ?? people).map(person => ({ value: person.id, label: `${person.name}${person.department ? ` · ${person.department}` : ''}` }));
  const stageOptions = ['产品设计', 'UI设计', '产品开发', '测试验收', '上线运维'];
  const typeOptions = settings?.dictionaries?.supportTypes ?? ['客户成功', '服务响应', '体验优化'];
  const stageShortLabels: Record<string, string> = {
    产品设计: '产品',
    UI设计: '设计',
    产品开发: '研发',
    测试验收: '测试',
    上线运维: '上线',
  };
  const applicableTemplates = departmentTemplates(settings, department || person?.department);
  const configuredTypes = [...new Set(applicableTemplates.map(template => template.type))];
  const templateMissing = threeLevel && supervisor && !personal && !ownPersonal && !configuredTypes.length;
  const defaultTypes = configuredTypes;
  const templateLabels: Record<string, string> = { product: 'P- KR', delivery: 'S- KR', support: 'G- KR' };
  const renderKrTemplateSelector = (kr: OkrKr, index: number) => {
    const type = actionTypeForIndex(index);
    if (!threeLevel || (!supervisor && !personal)) return null;
    return <Segmented className={`okr-kr-template-switcher is-${type}`} aria-label="KR类型" value={type} disabled={busy || readOnly || personal || configuredTypes.length <= 1} options={configuredTypes.map(value => ({ value, label: templateLabels[value] || value }))} onChange={structureType => changeKr(kr.id, { structureType: structureType as OkrKr['structureType'], businessObject: undefined, version: undefined, stage: undefined, details: structureType === 'product' || structureType === 'delivery' ? [] : undefined, action: undefined, result: undefined })}/>;
  };
  const actionTypeForIndex = (index: number) => threeLevel ? krs[index]?.structureType || defaultTypes[0] || 'support' : index === 0 ? 'support' : index === 1 ? 'product' : index === 2 ? 'presales' : 'delivery';
  const actionTypeForKr = (index: number) => actionTypeForIndex(index);
  const personalKrTitle = (kr: OkrKr) => {
    if (kr.structureType === 'product') return `${(kr.details || []).map(row => row.name).filter(Boolean).join('、') || kr.businessObject || '产品'}完成${(kr.details || []).map(row => row.stage).filter(Boolean).join('、') || '达成阶段'}`;
    if (kr.structureType === 'delivery') return `${(kr.details || []).map(row => row.name).filter(Boolean).join('、') || kr.businessObject || '项目'}达成${(kr.details || []).map(row => row.targetStage).filter(Boolean).join('、') || '目标里程碑'}`;
    return [kr.action, kr.result].filter(value => value?.trim()).join('，');
  };
  const changeKr = (id: string, patch: Partial<OkrKr>) => setKrs(items => items.map(kr => kr.id === id ? { ...kr, ...patch } : kr));
  const distribute = (items: OkrKr[]) => items.map((kr, i) => ({ ...kr, weight: (Math.floor(20 / items.length) + (i < 20 % items.length ? 1 : 0)) * 5 }));
  const isCompanyStyle = root || supervisor;
  const payload = (): OkrPayload => {
    const latestKrDate = krs.map(kr => kr.deadline).filter(Boolean).sort().at(-1) || '';
    return {
      ...effectiveInitial,
      ...(threeLevel ? { ...objectiveTiming, goalModelVersion: 2 as const, goalLevel: root ? 'company' as const : personal || ownPersonal ? 'personal' as const : 'department' as const, inherited: false, changeReason } : {}),
      title: personal ? personalKrTitle(krs[0]) || title.trim() : title.trim() || (!threeLevel && supervisor ? (krs[0]?.result || krs[0]?.action || krs[0]?.businessObject || '主管目标') : ''),
      objectiveType: threeLevel && !root && ((!reference && !autonomous) || personal) ? 'target' : objectiveType,
      alignments: effectiveInitial?.alignments ?? (supervisor ? (threeLevel ? reference ? [reference] : [] : alignmentActions).map(action => ({ parentObjectiveId: String(action.payload.parentObjectiveId || ''), parentKeyResultId: String(action.payload.parentKeyResultId || action.id) })) : []),
      weight: objectiveWeight,
      deadline: planLocked ? initialPayload?.deadline : parentDeadline || (ownPersonal ? krs[0]?.executionActions?.map(action => action.deadline).filter(Boolean).sort().at(-1) : latestKrDate) || undefined,
      note,
      ...(autonomous ? (() => { const source = availableSources.find(item => selectedSource.startsWith(`${item.id}:`)); const krId = source ? selectedSource.slice(source.id.length + 1) : undefined; return { origin: 'autonomous' as const, sourceObjectiveId: source?.id, sourceKrId: krId || undefined, sourceVersion: source?.version, sourceTitle: (source ? sourceKeyResults(source).find(kr => kr.id === krId)?.title : undefined) || source?.payload.title, alignments: source ? [{ parentObjectiveId: source.id, parentKeyResultId: krId || undefined }] : [] }; })() : {}),
      keyResults: ownPersonal ? krs.map(kr => ({ ...kr, title: personalKrTitle(kr) || title.trim(), deadline: planLocked ? kr.deadline : parentDeadline || kr.executionActions?.map(action => action.deadline || cycleEnd).filter(Boolean).sort().at(-1) || cycleEnd, weight: 100, assigneeIds: [ownerId] })) : krs.map((kr, index) => ({ ...kr, ...(threeLevel && supervisor && !personal && !ownPersonal ? { structureType: actionTypeForIndex(index) as 'support' | 'product' | 'delivery' } : {}), title: personal ? personalKrTitle(kr) || kr.title.trim() : threeLevel && supervisor && !personal && !ownPersonal ? [kr.businessObject, kr.details !== undefined ? krDetailSummary(kr) : kr.version, kr.details !== undefined ? undefined : kr.stage, kr.action, kr.result].filter(Boolean).join(' · ') : kr.title.trim() || (supervisor ? (kr.result || kr.action || kr.businessObject || `A${krs.indexOf(kr) + 1}`) : ''), ...(kr.deadline ? { deadline: kr.deadline } : {}) })),
    };
  };
  const submit = async (fromBatch = false, confirmedWeight?: number): Promise<boolean> => {
    const submittedPayload = { ...payload(), ...(confirmedWeight !== undefined ? { weight: confirmedWeight } : {}) };
    if ((!fromBatch && busy) || unavailable || readOnly) return false;
    if (templateMissing && krs.some(kr => !kr.structureType)) { setError('请先为当前部门配置 KR 模板'); return false; }
    if (exceedsParentDeadline) { setError('KR 截止日期不能超过上级截止日期'); return false; }
    if (threeLevel) { const validation = validateThreeLevelGoal(submittedPayload, ownerId); if (validation) { setError(validation); return false; } setError(''); return onSave(submittedPayload); }
    if (supervisor && !alignmentActions.length && !autonomous) { setError('暂无需要承接的动作，无法提交。'); return false; }
    if (exceedsParentDeadline) { setError(`动作截止日期不能超过上级动作截止日期 ${parentDeadline}。`); return false; }
    if ((!supervisor && !title.trim()) || krs.length === 0 || (!supervisor && krs.some(kr => !kr.title.trim()))) { setError('请填写目标名称和每条 KR。'); return false; }
    if (!isSubmissionWeight(objectiveWeight)) { setError('目标权重须为 1-100 的整数。'); return false; }
    if (krs.some(kr => !isSubmissionDeadline(kr.deadline))) { setError('请设置每条 KR的有效截止日期。'); return false; }
    if (supervisor && !initialPayload?.parentObjectiveId && krs.some((kr, index) => actionTypeForKr(index) === 'support' ? !kr.action?.trim() || !kr.result?.trim() : ['product', 'delivery'].includes(actionTypeForKr(index)) ? !krDetailContentComplete(kr) : !kr.businessObject?.trim() || !kr.version?.trim() || !kr.stage?.trim())) { setError('请按每条 KR 的模板填写完整业务字段。'); return false; }
    if (krs.some(kr => !isSubmissionWeight(kr.weight) || kr.weight % 5 !== 0) || !krs.some(kr => kr.weight > 20) || (krWeightTotal !== 100 && !(initialPayload?.parentObjectiveId && krWeightTotal === calculateKrWeightTotal(initialPayload.keyResults || [])))) { setError('KR 权重须为 5% 的倍数，合计为 100%，且至少一条大于 20%。'); return false; }
    setError('');
    return onSave(submittedPayload);
  };
  const saveDraft = async (fromBatch = false): Promise<boolean> => {
    if ((!fromBatch && busy) || unavailable || readOnly) return false;
    if (!onSaveDraft) return false;
    if (templateMissing && krs.some(kr => !kr.structureType)) { setError('请先为当前部门配置 KR 模板'); return false; }
    if (!title.trim() && (!supervisor || threeLevel)) { setError('请先填写目标名称。'); return false; }
    if (!isSubmissionWeight(objectiveWeight)) { setError('目标权重须为 1-100 的整数。'); return false; }
    if (exceedsParentDeadline) { setError(`动作截止日期不能超过上级动作截止日期 ${parentDeadline}。`); return false; }
    if (threeLevel && !root && !reference && !autonomous) { setError('暂无指派给本人的 KR'); return false; }
    return onSaveDraft(payload());
  };
  useImperativeHandle(ref, () => ({
    submit: weight => submit(true, weight),
    saveDraft: () => saveDraft(true),
    snapshot: payload,
  }), [submit, saveDraft]);
  const renderSupervisorFields = (kr: OkrKr, index: number) => {
    const type = actionTypeForIndex(index);
    const renderFields = () => {
    if (type === 'support') return <><Input aria-label={`A${index + 1} KR内容`} placeholder="输入KR内容" value={kr.action} onChange={event => changeKr(kr.id, { action: event.target.value })}/><Input aria-label={`A${index + 1} 期望达成的结果`} placeholder="输入期望达成的结果" value={kr.result} onChange={event => changeKr(kr.id, { result: event.target.value })}/></>;
    if (threeLevel && (type === 'product' || type === 'delivery')) return renderKrDetails(kr, index, type);
    if (type === 'product') return <><Select aria-label={`A${index + 1} 产品`} placeholder="选择产品" value={kr.businessObject} options={productLineOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { businessObject: value, version: undefined })}/><Select aria-label={`A${index + 1} 版本`} placeholder="选择版本" value={kr.version} disabled={!kr.businessObject} options={(productLineVersionOptions[kr.businessObject || ''] || []).map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { version: value })}/><Select aria-label={`A${index + 1} 阶段`} placeholder="选择阶段" value={kr.stage} options={stageOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { stage: value })}/>{renderStageDeadlines(kr)}</>;
    if (type === 'presales') { const products = opportunityOptions.find(item => item.value === kr.businessObject)?.products || []; return <><Select aria-label={`A${index + 1} 商机`} placeholder="选择商机" value={kr.businessObject} options={opportunityOptions.map(item => ({ value: item.value, label: item.label }))} onChange={value => changeKr(kr.id, { businessObject: value, version: undefined })}/><Select aria-label={`A${index + 1} 产品`} placeholder="选择产品" value={kr.version} disabled={!kr.businessObject} options={products.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { version: value })}/><Select aria-label={`A${index + 1} 阶段`} placeholder="选择阶段" value={kr.stage} options={stageOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { stage: value })}/></>; }
    const products = projectProductOptions[kr.businessObject || ''] || productLineOptions;
    return <><Select aria-label={`A${index + 1} 项目`} placeholder="选择项目" value={kr.businessObject} options={projectOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { businessObject: value, version: undefined })}/><Select aria-label={`A${index + 1} 产品`} placeholder="选择产品" value={kr.version} disabled={!kr.businessObject} options={products.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { version: value })}/><Select aria-label={`A${index + 1} 类型`} placeholder="选择类型" value={kr.stage} options={typeOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { stage: value })}/></>;
    };
    return renderFields();
  };
  const renderKrDetails = (kr: OkrKr, index: number, type: 'product' | 'delivery') => {
    const rows = krDetails(kr);
    const isProduct = type === 'product';
    const selectedObjects = (kr.businessObject || '').split(',').map(value => value.trim()).filter(Boolean);
    const choices = isProduct ? selectedObjects.flatMap(product => productLineVersionOptions[product] || []) : [];
    const updateRows = (details: typeof rows) => changeKr(kr.id, { details, version: details[0]?.name, stage: details[0]?.stage, ...(planLocked ? {} : { deadline: parentDeadline || details.map(row => row.plannedEndDate).filter(Boolean).sort().at(-1) }) });
    return <>
      <Select aria-label={`A${index + 1} ${isProduct ? '产品' : '项目'}`} mode="multiple" placeholder={isProduct ? '选择产品' : '选择项目'} value={selectedObjects} options={(isProduct ? productLineOptions : projectOptions).map(value => ({ value, label: value }))} onChange={objects => changeKr(kr.id, { businessObject: objects.join(','), details: objects.map(name => rows.find(row => row.name === name) || { id: crypto.randomUUID(), name }), version: undefined, stage: undefined, ...(planLocked ? {} : { deadline: parentDeadline }) })}/>
      <KrDetailTable rows={rows} label={isProduct ? '产品明细' : '项目明细'} mode={type} productOptions={isProduct ? productLineVersionOptions : projectProductOptions} deadlineLimit={[parentDeadline, kr.deadline].filter(Boolean).sort()[0]} stages={applicableTemplates.find(template => template.type === (isProduct ? 'product' : 'delivery'))?.stages ?? (isProduct ? settings?.dictionaries.productNodes.length ? settings.dictionaries.productNodes : stageOptions : settings?.dictionaries.deliveryNodes.length ? settings.dictionaries.deliveryNodes : ['项目立项', '需求调研', '系统设计', '定制开发', 'UAT验收', '上线交付', '终验维保'])} disabled={busy || readOnly}  onChange={updateRows}/>
    </>;
  };
  const renderStageDeadlines = (kr: OkrKr) => {
    if (!kr.businessObject || !kr.version) return null;
    const rows = [
      ...okrRecords.flatMap(record => record.kind === 'action' ? [record.payload] : (record.payload.keyResults || [])),
      ...krs,
    ].filter(item => {
      const product = item.businessObject || (item as OkrKr & { productLine?: string }).productLine;
      return product === kr.businessObject && item.version === kr.version && item.stage && item.deadline;
    }).map(item => ({ stage: String(item.stage), deadline: dayjs(item.deadline).format('YYYY-MM-DD') }));
    const deadlineByStage = new Map(rows.map(row => [row.stage, row.deadline]));
    const orderedRows = stageOptions.filter(stage => deadlineByStage.has(stage)).map(stage => `${stageShortLabels[stage]}：${deadlineByStage.get(stage)}`);
    return orderedRows.length ? <div className="supervisor-stage-deadlines" aria-label="同产品版本阶段截止时间">{orderedRows.join('；')}</div> : null;
  };
  const canAddContent = () => {
    if (!goalContentComplete(payload())) { setError(GOAL_ADDITION_MESSAGE); return false; }
    setError(''); return true;
  };
  useEffect(() => {
    if (error === GOAL_ADDITION_MESSAGE && goalContentComplete(payload())) setError('');
  }, [error, title, krs]);
  const moveKr = (from: number, to: number) => setKrs(items => { const copy = [...items]; [copy[from], copy[to]] = [copy[to], copy[from]]; return copy; });
  return <Form className={`okr-objective-form${isCompanyStyle || personal || ownPersonal ? ' company-objective-form' : ''}${supervisor ? ' supervisor-objective-form' : ''}`} disabled={busy || readOnly} onFinish={() => void submit()}>
    {chrome && <div className="okr-objective-period">{periodLabel(cycle)}{!compactDetail && <span>{periodStatusLabel(cycle)}</span>}{detailMode && <Button type="text" onClick={onCancel} disabled={busy}>取消</Button>}</div>}
    <div className="okr-objective-body">
      {autonomous && <Alert className="okr-source-readiness" type="info" title={upstreamReadiness(okrRecords, person, cycle)} showIcon/>}
      <div className="okr-objective-columns okr-source-heading">
        <div className={`company-objective-alignment${personal ? ' is-personal-alignment' : ''}`}>
          {autonomous ? <><Typography.Text type="secondary">自主提出 · {selectedSource ? '已选择对齐' : '未对齐'}</Typography.Text><Button type="text" size="small" className="okr-alignment-trigger" icon={<PlusIcon/>} disabled={busy || readOnly} onClick={() => setAlignmentOpen(true)}>选择对齐</Button></> : root ? <span>{periodLabel(cycle)}目标</span> : <div className="supervisor-alignment-actions">{(threeLevel ? reference ? [reference] : [] : alignmentActions).map(action => <div key={action.id} className="supervisor-alignment-action">{`${personal ? (okrRecords.find(record => record.id === action.payload.parentObjectiveId && record.kind === 'objective')?.payload.title || action.payload.title) : action.payload.title}——来源于上级${people.find(person => person.id === action.ownerId)?.name || '未知人员'}`} </div>)}{!alignmentActions.length && <span className="supervisor-alignment-placeholder">暂无需要承接的动作</span>}</div>}
        </div>{personal ? <><span/><span/></> : <><span>权重</span><span>截止日期</span></>}<span/>
      </div>
      <div className="okr-objective-columns">
        <div className="okr-objective-title">
          {personal ? <span className="okr-objective-kind-placeholder" aria-hidden="true" /> : threeLevel && !root && (!reference && !autonomous) ? <span className="okr-objective-kind" aria-label={`目标编号 O${objectiveIndex + 1}`}>O{objectiveIndex + 1}</span> : isCompanyStyle ? <Dropdown disabled={busy || readOnly} menu={{selectedKeys:[objectiveType],items:[{key:'target',label:'CO · 承诺目标'},{key:'challenge',label:'TO · 挑战目标'}],onClick:({key}) => setObjectiveType(key as 'target' | 'challenge')}}><Button className={`okr-objective-kind ${objectiveType === 'challenge' ? 'is-challenge' : ''}`} aria-label={`目标编号 O${objectiveIndex + 1}`}>{objectiveType === 'challenge' ? 'TO' : 'CO'}{objectiveIndex + 1}</Button></Dropdown> : <span className="okr-objective-kind" aria-label={`目标编号 O${objectiveIndex + 1}`}>O{objectiveIndex + 1}</span>}
          {personal ? <Typography.Text>{title || '暂无指派给本人的 KR'}</Typography.Text> : <Input aria-label="目标名称" variant="borderless" maxLength={255} value={title} readOnly={personal} onChange={event => setTitle(event.target.value)} placeholder="输入目标名称：明确你要达成什么，不写含糊概括的目标。"/>}
        </div>
        {personal ? <><span/><span/></> : isCompanyStyle ? <span className="company-objective-weight-summary">{objectiveWeight}%</span> : <InputNumber aria-label="目标权重" min={1} max={100} precision={0} suffix="%" value={objectiveWeight} onChange={value => setObjectiveWeight(value ?? 0)}/>}
        {!personal && <span className="okr-objective-deadline">{payload().deadline || '—'}</span>}
        {onRemove && !readOnly ? <Popconfirm title={`删除目标 O${objectiveIndex + 1}？`} description="将移除该目标及其未保存的动作，其他目标不受影响。" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={onRemove} disabled={busy}><Button type="text" danger aria-label={`删除新增目标 O${objectiveIndex + 1}`} icon={<TrashIcon/>} disabled={busy}/></Popconfirm> : <span/>}
      </div>
      {(root || supervisor) && <div className="company-objective-metadata"><span>{levelLabel || (root ? '公司级' : '主管级')}</span>{supervisor && <span>{department || '—'}</span>}<Tooltip title={ownerName}><span className="company-objective-owner" aria-label={ownerName}>{ownerAvatar ? <Avatar size={24} src={ownerAvatar}>{Array.from(ownerName)[0]}</Avatar> : <PersonAvatar name={ownerName}/>}<span>{Array.from(ownerName).slice(0, 2).join('')}{Array.from(ownerName).length > 2 ? '...' : ''}</span></span></Tooltip>{!personal && <InputNumber aria-label="目标权重" min={1} max={100} precision={0} suffix="%" value={objectiveWeight} onChange={value => setObjectiveWeight(value ?? 0)}/>}</div>}
      <div className="okr-objective-krs">
        {(ownPersonal || personal ? [] : krs).map((kr, index) => <div key={kr.id} draggable={!busy} className={`okr-objective-columns okr-objective-kr${draggingIndex === index ? ' is-dragging' : ''}${dragOverIndex === index && draggingIndex !== index ? ' is-drag-over' : ''}`} onPointerDown={event => { dragHandleIndex.current = (event.target as Element).closest('.okr-kr-drag') ? index : null; }} onDragStart={event => { if (dragHandleIndex.current !== index) { event.preventDefault(); return; } event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setDragImage(event.currentTarget, 24, 20); setDraggingIndex(index); }} onDragEnd={() => { dragHandleIndex.current = null; setDraggingIndex(null); setDragOverIndex(null); }} onDragOver={event => { if (draggingIndex === null) return; event.preventDefault(); if (krs.length > 1) setDragOverIndex(index); }} onDrop={event => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); if (krs.length > 1 && Number.isInteger(from) && from !== index) moveKr(from, index); dragHandleIndex.current = null; setDraggingIndex(null); setDragOverIndex(null); }}>
          <div className="okr-objective-kr-title"><span className="okr-kr-drag" title="拖动调整顺序" aria-label="拖动 KR"><GrabberIcon/></span>{renderKrTemplateSelector(kr, index)}{personal && <Typography.Text>{personalKrTitle(kr) || kr.title}</Typography.Text>}{!supervisor && !personal && <Input aria-label={`A${index + 1} 名称`} variant="borderless" maxLength={2000} value={kr.title} onChange={event => changeKr(kr.id, { title: event.target.value })} placeholder={threeLevel ? '输入关键结果名称' : '输入你计划要做的动作描述'}/>}</div>
          {!personal && <InputNumber aria-label={`A${index + 1} 权重`} min={5} max={100} step={5} precision={0} suffix="%" value={kr.weight} onChange={value => changeKr(kr.id, { weight: value ?? 0 })}/>}
          {!personal && <DatePicker aria-label={`KR${index + 1} 截止日期`} placeholder="截止日期" disabled={planLocked && !!initialPayload?.keyResults?.some(item => item.id === kr.id && !!item.deadline)} disabledDate={date => Boolean((parentDeadline || objectiveTiming.deadline) && date.isAfter(dayjs(parentDeadline || objectiveTiming.deadline), 'day'))} value={kr.deadline ? dayjs(kr.deadline) : null} onChange={value => changeKr(kr.id, { deadline: value?.format('YYYY-MM-DD') })}/>}
          <Tooltip title="删除动作"><Button aria-label={`删除 A${index + 1}`} type="text" icon={<TrashIcon/>} disabled={busy || personal || krs.length === 1} onClick={() => setKrs(items => distribute(items.filter(item => item.id !== kr.id)))}/></Tooltip>
          {supervisor && !personal && !ownPersonal && (!templateMissing || kr.structureType) && <div className="supervisor-action-fields"> {renderSupervisorFields(kr, index)}</div>}
          {!personal && <Select className="okr-action-assignees" aria-label={`A${index + 1} 承接人员`} mode="multiple" allowClear showSearch optionFilterProp="label" maxTagCount="responsive" placeholder="指定承接人员（可选）" value={kr.assigneeIds || []} onChange={assigneeIds => changeKr(kr.id, { assigneeIds })} options={assigneeOptions}/>}
          {threeLevel && !root && (personal || kr.assigneeIds?.includes(ownerId)) && <GoalExecutionFields actions={kr.executionActions || []} ownerId={ownerId} personal={personal} disabled={busy || readOnly} locked={planLocked} deadlineLimit={[kr.deadline, parentDeadline].filter(Boolean).sort()[0]} onChange={executionActions => changeKr(kr.id, { executionActions })}/>}
        </div>)}
      </div>
      {personal && <div className="okr-personal-kr-details">{krs.map(kr => <KrDetailTable key={kr.id} rows={krDetails(kr)} label={kr.structureType === 'delivery' ? '项目产品' : '迭代版本'}/>)}</div>}
      {(ownPersonal || personal) && <GoalExecutionFields ownerId={ownerId} personal actions={krs[0]?.executionActions || []} locked={planLocked} deadlineLimit={parentDeadline || krs[0]?.deadline} disabled={busy || readOnly} onChange={executionActions => setKrs(items => [{ ...(items[0] || { id: crypto.randomUUID(), title: '', weight: 100, progress: 0 }), assigneeIds: [ownerId], executionActions }])}/>}
      <div className="okr-objective-add"><div className="okr-add-operations">{!readOnly && !personal && !ownPersonal && <Button type="text" icon={<PlusIcon/>} disabled={busy || templateMissing || krs.length >= (threeLevel ? settings?.validation.maxActions || 8 : 4)} onClick={() => { if (canAddContent()) setKrs(items => distribute([...items, { id: crypto.randomUUID(), title: '', weight: 0, progress: 0, deadline: parentDeadline, ...(threeLevel && supervisor ? {structureType: defaultTypes[0] as OkrKr['structureType'], ...(['product', 'delivery'].includes(defaultTypes[0]) ? {details: []} : {})} : {}) }])); }}>添加关键结果</Button>}
        </div><span>{ownPersonal || personal ? '动作' : 'KR'} 权重合计 {ownPersonal || personal ? (krs[0]?.executionActions || []).reduce((sum, action) => sum + (action.weight ?? 0), 0) : krWeightTotal}%</span></div>
      {threeLevel && !root && !reference && !autonomous && <Alert type="info" title="暂无指派给本人的 KR，请等待上级指派后填写" showIcon/>}
      {initialPayload?.reviewerSuggestedSource && <Alert type="warning" title="上级要求补充对齐，请在来源区域核对建议目标后重新提交" description={(() => { const suggestion = initialPayload.reviewerSuggestedSource || ''; const source = availableSources.find(item => suggestion.startsWith(`${item.id}:`)); return source ? source.payload.keyResults?.find(kr => `${source.id}:${kr.id}` === suggestion)?.title || source.payload.title : '建议来源已变化，请重新选择本月已生效的上级目标'; })()} showIcon/>}
      {templateMissing && <Alert type="warning" title="请先为当前部门配置 KR 模板" showIcon/>}
      {error && <Alert type="warning" title={error} showIcon/>}
    </div>
    <GoalAlignmentDrawer open={alignmentOpen} records={availableSources} cycle={cycle} value={selectedSource} onCancel={()=>setAlignmentOpen(false)} onConfirm={value=>{setSelectedSource(value);setAlignmentOpen(false);}}/>
    {chrome && <div className="okr-objective-footer">{(!detailMode || allowAddAnotherInDetail) && <Button type="text" onClick={() => { if (canAddContent()) onAddAnother?.(); }} disabled={busy || readOnly}>+ 添加目标</Button>}<span className="okr-objective-footer-spacer"/>{!detailMode && <Button onClick={onCancel} disabled={busy}>返回列表</Button>}{!readOnly && <>{onSaveDraft && <Button onClick={() => void saveDraft()} disabled={busy || unavailable}>存草稿</Button>}<Button type="primary" htmlType="submit" loading={busy} disabled={unavailable || (supervisor && !alignmentActions.length && !autonomous)}>{submitLabel ?? (isCompanyStyle ? '提交目标' : '提交主管确认')}</Button></>}</div>}
  </Form>;
});
