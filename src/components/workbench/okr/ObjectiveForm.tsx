import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Avatar, Button, DatePicker, Dropdown, Form, Input, InputNumber, Popconfirm, Select, Tooltip } from 'antd';
import { GrabberIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import type { EmployeeOption, OKRItem } from '../../../types';
import type { OkrKr, OkrPayload, OkrPerson, OkrRecord, OkrSettings } from '../../../services/okrRepository';
import { periodStatusLabel } from './cycleOptions';
import { isSubmissionDeadline, isSubmissionWeight } from './submissionValidation';
import { PersonAvatar } from '../../common/PersonIdentity';

interface Props {
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

export interface ObjectiveFormHandle { submit: () => Promise<boolean>; saveDraft: () => Promise<boolean>; snapshot: () => OkrPayload; }
export const calculateKrWeightTotal = (items: Pick<OkrKr, 'weight'>[]) => items.reduce((total, item) => total + item.weight, 0);

export const ObjectiveForm = forwardRef<ObjectiveFormHandle, Props>(function ObjectiveForm({ cycle, objectiveIndex = 0, ownerName, ownerAvatar, people = [], teamMembers, busy, unavailable, root, onCancel, onRemove, onSave, onSaveDraft, submitLabel, onAddAnother, chrome = true, initialPayload, readOnly = false, detailMode = false, compactDetail = false, allowAddAnotherInDetail = false, supervisor = false, department, alignmentActions = [], productLineOptions = [], productLineVersionOptions = {}, projectOptions = [], projectProductOptions = {}, opportunityOptions = [], okrRecords = [], settings }, ref) {
  const [title, setTitle] = useState(initialPayload?.title || '');
  const [objectiveWeight, setObjectiveWeight] = useState(initialPayload?.weight ?? 100);
  const [note, setNote] = useState(initialPayload?.note ?? '');
  const [objectiveType, setObjectiveType] = useState<'target' | 'challenge'>(initialPayload?.objectiveType ?? (supervisor ? (alignmentActions.length > 0 && objectiveIndex === 0 ? 'target' : 'challenge') : (objectiveIndex === 0 ? 'target' : 'challenge')));
  const [krs, setKrs] = useState<OkrKr[]>(() => initialPayload?.keyResults?.length ? initialPayload.keyResults : [{ id: crypto.randomUUID(), title: '', weight: 100, progress: 0 }]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragHandleIndex = useRef<number | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setTitle(initialPayload?.title || '');
    setObjectiveWeight(initialPayload?.weight ?? 100);
    setNote(initialPayload?.note ?? '');
    setObjectiveType(initialPayload?.objectiveType ?? (supervisor ? (alignmentActions.length > 0 && objectiveIndex === 0 ? 'target' : 'challenge') : (objectiveIndex === 0 ? 'target' : 'challenge')));
    setKrs(initialPayload?.keyResults?.length ? initialPayload.keyResults : [{ id: crypto.randomUUID(), title: '', weight: 100, progress: 0 }]);
  }, [initialPayload]);
  const krWeightTotal = calculateKrWeightTotal(krs);
  const assigneeOptions = (teamMembers ?? people).map(person => ({ value: person.id, label: `${person.name}${person.department ? ` · ${person.department}` : ''}` }));
  const stageOptions = ['产品设计', 'UI设计', '产品开发', '测试验收', '上线运维'];
  const stageDepartments: Record<string, string> = {
    产品设计: '产品规划部',
    UI设计: '交互设计部',
    产品开发: '软件研发部',
    测试验收: '软件研发部测试组',
    上线运维: '软件研发部系统运维组',
  };
  const typeOptions = settings?.dictionaries?.supportTypes || ['客户成功', '服务响应', '体验优化'];
  const actionTypeForIndex = (index: number) => index === 0 ? 'support' : index === 1 ? 'product' : index === 2 ? 'presales' : 'delivery';
  const actionTypeForKr = (index: number) => actionTypeForIndex(index);
  const changeKr = (id: string, patch: Partial<OkrKr>) => setKrs(items => items.map(kr => kr.id === id ? { ...kr, ...patch } : kr));
  const distribute = (items: OkrKr[]) => items.map((kr, i) => ({ ...kr, weight: Math.floor(100 / items.length) + (i < 100 % items.length ? 1 : 0) }));
  const isCompanyStyle = root || supervisor;
  const payload = (): OkrPayload => {
    const latestKrDate = krs.map(kr => kr.deadline).filter(Boolean).sort().at(-1) || '';
    return {
      ...initialPayload,
      title: title.trim() || (supervisor ? (krs[0]?.result || krs[0]?.action || krs[0]?.businessObject || '主管目标') : ''),
      objectiveType,
      alignments: initialPayload?.alignments ?? (supervisor ? alignmentActions.map(action => ({ parentObjectiveId: String(action.payload.parentObjectiveId || ''), parentKeyResultId: String(action.payload.parentKeyResultId || action.id) })) : []),
      weight: objectiveWeight,
      deadline: latestKrDate || undefined,
      note,
      keyResults: krs.map(kr => ({ ...kr, title: kr.title.trim() || (supervisor ? (kr.result || kr.action || kr.businessObject || `A${krs.indexOf(kr) + 1}`) : ''), ...(kr.deadline ? { deadline: kr.deadline } : {}) })),
    };
  };
  const submit = async (fromBatch = false): Promise<boolean> => {
    if ((!fromBatch && busy) || unavailable || readOnly) return false;
    if ((!supervisor && !title.trim()) || krs.length === 0 || (!supervisor && krs.some(kr => !kr.title.trim()))) { setError('请填写目标名称和每条 A 动作。'); return false; }
    if (!isSubmissionWeight(objectiveWeight)) { setError('目标权重须为 1-100 的整数。'); return false; }
    if (krs.some(kr => !isSubmissionDeadline(kr.deadline))) { setError('请设置每条 A 动作的有效截止日期。'); return false; }
    if (supervisor && krs.some((kr, index) => actionTypeForKr(index) === 'support' ? !kr.businessObject?.trim() || !kr.action?.trim() || !kr.result?.trim() : !kr.businessObject?.trim() || !kr.version?.trim() || !kr.stage?.trim())) { setError('请按每条 A 的模板填写完整业务字段。'); return false; }
    if (krs.some(kr => !isSubmissionWeight(kr.weight)) || krWeightTotal !== 100) { setError('A 权重须为 1-100 的整数，合计为 100%。'); return false; }
    setError('');
    return onSave(payload());
  };
  const saveDraft = async (fromBatch = false): Promise<boolean> => {
    if ((!fromBatch && busy) || unavailable || readOnly) return false;
    if (!onSaveDraft) return false;
    if (!title.trim() && !supervisor) { setError('请先填写目标名称。'); return false; }
    if (!isSubmissionWeight(objectiveWeight)) { setError('目标权重须为 1-100 的整数。'); return false; }
    return onSaveDraft(payload());
  };
  useImperativeHandle(ref, () => ({
    submit: () => submit(true),
    saveDraft: () => saveDraft(true),
    snapshot: payload,
  }), [submit, saveDraft]);
  const renderSupervisorFields = (kr: OkrKr, index: number) => {
    const type = actionTypeForIndex(index);
    if (type === 'support') return <><Select aria-label={`A${index + 1} 类型`} placeholder="选择类型" value={kr.businessObject} options={typeOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { businessObject: value })}/><Input aria-label={`A${index + 1} 动作`} placeholder="输入动作" value={kr.action} onChange={event => changeKr(kr.id, { action: event.target.value })}/><Input aria-label={`A${index + 1} 结果`} placeholder="输入结果" value={kr.result} onChange={event => changeKr(kr.id, { result: event.target.value })}/></>;
    if (type === 'product') return <><Select aria-label={`A${index + 1} 产品`} placeholder="选择产品" value={kr.businessObject} options={productLineOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { businessObject: value, version: undefined })}/><Select aria-label={`A${index + 1} 版本`} placeholder="选择版本" value={kr.version} disabled={!kr.businessObject} options={(productLineVersionOptions[kr.businessObject || ''] || []).map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { version: value })}/><Select aria-label={`A${index + 1} 阶段`} placeholder="选择阶段" value={kr.stage} options={stageOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { stage: value })}/>{kr.stage && <span className="supervisor-stage-department">对应部门：{stageDepartments[kr.stage]}</span>}{renderStageDeadlines(kr)}</>;
    if (type === 'presales') { const products = opportunityOptions.find(item => item.value === kr.businessObject)?.products || []; return <><Select aria-label={`A${index + 1} 商机`} placeholder="选择商机" value={kr.businessObject} options={opportunityOptions.map(item => ({ value: item.value, label: item.label }))} onChange={value => changeKr(kr.id, { businessObject: value, version: undefined })}/><Select aria-label={`A${index + 1} 产品`} placeholder="选择产品" value={kr.version} disabled={!kr.businessObject} options={products.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { version: value })}/><Select aria-label={`A${index + 1} 阶段`} placeholder="选择阶段" value={kr.stage} options={stageOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { stage: value })}/></>; }
    const products = projectProductOptions[kr.businessObject || ''] || productLineOptions;
    return <><Select aria-label={`A${index + 1} 项目`} placeholder="选择项目" value={kr.businessObject} options={projectOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { businessObject: value, version: undefined })}/><Select aria-label={`A${index + 1} 产品`} placeholder="选择产品" value={kr.version} disabled={!kr.businessObject} options={products.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { version: value })}/><Select aria-label={`A${index + 1} 类型`} placeholder="选择类型" value={kr.stage} options={typeOptions.map(value => ({ value, label: value }))} onChange={value => changeKr(kr.id, { stage: value })}/></>;
  };
  const renderStageDeadlines = (kr: OkrKr) => {
    if (!kr.businessObject || !kr.version) return null;
    const rows = okrRecords.flatMap(record => record.kind === 'action' ? [record.payload] : (record.payload.keyResults || []))
      .filter(item => item.businessObject === kr.businessObject && item.version === kr.version && item.stage && item.deadline)
      .map(item => ({ stage: String(item.stage), deadline: dayjs(item.deadline).format('YYYY-MM-DD') }));
    const deadlineByStage = new Map(rows.map(row => [row.stage, row.deadline]));
    const orderedRows = stageOptions.filter(stage => deadlineByStage.has(stage)).map(stage => `${stage}：${deadlineByStage.get(stage)}`);
    return orderedRows.length ? <div className="supervisor-stage-deadlines" aria-label="同产品版本阶段截止时间">{orderedRows.join('；')}</div> : null;
  };
  const moveKr = (from: number, to: number) => setKrs(items => { const copy = [...items]; [copy[from], copy[to]] = [copy[to], copy[from]]; return copy; });
  return <Form className={`okr-objective-form${isCompanyStyle ? ' company-objective-form' : ''}${supervisor ? ' supervisor-objective-form' : ''}`} disabled={busy || readOnly} onFinish={() => void submit()}>
    {chrome && <div className="okr-objective-period">{dayjs(cycle).format('YYYY年MM月')}{!compactDetail && <span>{periodStatusLabel(cycle)}</span>}{detailMode && <Button type="text" onClick={onCancel} disabled={busy}>取消</Button>}</div>}
    <div className="okr-objective-body">
      {(root || supervisor) && <div className={`company-objective-alignment${supervisor ? ' is-supervisor-alignment' : ''}`}>{root && <span className="company-alignment-period">{dayjs(cycle).format('YYYY年MM月')}目标</span>}{supervisor && (alignmentActions.length > 0 ? <div className="supervisor-alignment-actions">{alignmentActions.map(action => <div key={action.id} className="supervisor-alignment-action">{action.payload.title}</div>)}</div> : <span className="supervisor-alignment-placeholder">+ 选择对齐</span>)}</div>}
      <div className={`okr-objective-columns okr-objective-head${supervisor ? ' supervisor-objective-head' : ''}`}>
        <span>{supervisor ? '' : '目标与动作'}</span><span>权重</span><span>截止日期</span><span/>
      </div>
      <div className="okr-objective-columns">
        <div className="okr-objective-title">
          {isCompanyStyle ? <Dropdown disabled={busy || readOnly} menu={{selectedKeys:[objectiveType],items:[{key:'target',label:'CO · 承诺目标'},{key:'challenge',label:'TO · 挑战目标'}],onClick:({key}) => setObjectiveType(key as 'target' | 'challenge')}}><Button className={`okr-objective-kind ${objectiveType === 'challenge' ? 'is-challenge' : ''}`} aria-label={`目标编号 O${objectiveIndex + 1}`}>{objectiveType === 'challenge' ? 'TO' : 'CO'}{objectiveIndex + 1}</Button></Dropdown> : <span className="okr-objective-kind" aria-label={`目标编号 O${objectiveIndex + 1}`}>O{objectiveIndex + 1}</span>}
          <Input aria-label="目标名称" variant="borderless" maxLength={255} value={title} onChange={event => setTitle(event.target.value)} placeholder={root ? '输入目标名称：明确你要达成什么，不写含糊概括的目标' : '输入目标名称'}/>
        </div>
        {isCompanyStyle ? <span className="company-objective-weight-summary">{objectiveWeight}%</span> : <InputNumber aria-label="目标权重" min={1} max={100} precision={0} suffix="%" value={objectiveWeight} onChange={value => setObjectiveWeight(value ?? 0)}/>}
        <span className="okr-objective-deadline">{krs.map(kr => kr.deadline).filter(Boolean).sort().at(-1) || '—'}</span>
        {onRemove && !readOnly ? <Popconfirm title={`删除目标 O${objectiveIndex + 1}？`} description="将移除该目标及其未保存的动作，其他目标不受影响。" okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={onRemove} disabled={busy}><Button type="text" danger aria-label={`删除新增目标 O${objectiveIndex + 1}`} icon={<TrashIcon/>} disabled={busy}/></Popconfirm> : <span/>}
      </div>
      {(root || supervisor) && <div className="company-objective-metadata"><span>{root ? '公司级' : '主管级'}</span>{supervisor && <span>{department || '—'}</span>}<Tooltip title={ownerName}><span className="company-objective-owner" aria-label={ownerName}>{ownerAvatar ? <Avatar size={24} src={ownerAvatar}>{Array.from(ownerName)[0]}</Avatar> : <PersonAvatar name={ownerName}/>}<span>{Array.from(ownerName).slice(0, 2).join('')}{Array.from(ownerName).length > 2 ? '...' : ''}</span></span></Tooltip><InputNumber aria-label="目标权重" min={1} max={100} precision={0} suffix="%" value={objectiveWeight} onChange={value => setObjectiveWeight(value ?? 0)}/></div>}
      <div className="okr-objective-krs">
        {krs.map((kr, index) => <div key={kr.id} draggable={!busy} className={`okr-objective-columns okr-objective-kr${draggingIndex === index ? ' is-dragging' : ''}${dragOverIndex === index && draggingIndex !== index ? ' is-drag-over' : ''}`} onPointerDown={event => { dragHandleIndex.current = (event.target as Element).closest('.okr-kr-drag') ? index : null; }} onDragStart={event => { if (dragHandleIndex.current !== index) { event.preventDefault(); return; } event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setDragImage(event.currentTarget, 24, 20); setDraggingIndex(index); }} onDragEnd={() => { dragHandleIndex.current = null; setDraggingIndex(null); setDragOverIndex(null); }} onDragOver={event => { if (draggingIndex === null) return; event.preventDefault(); if (krs.length > 1) setDragOverIndex(index); }} onDrop={event => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); if (krs.length > 1 && Number.isInteger(from) && from !== index) moveKr(from, index); dragHandleIndex.current = null; setDraggingIndex(null); setDragOverIndex(null); }}>
          <div className="okr-objective-kr-title"><span className="okr-kr-drag" title="拖动调整顺序" aria-label={`拖动 A${index + 1}`}><GrabberIcon/></span><span>A{index + 1}</span>{!supervisor && <Input aria-label={`A${index + 1} 名称`} variant="borderless" maxLength={2000} value={kr.title} onChange={event => changeKr(kr.id, { title: event.target.value })} placeholder={root ? '输入动作名称：要写工作结果（做到什么），不能只写动作描述（做什么）' : '输入动作名称'}/>}</div>
          <InputNumber aria-label={`A${index + 1} 权重`} min={1} max={100} precision={0} suffix="%" value={kr.weight} onChange={value => changeKr(kr.id, { weight: value ?? 0 })}/>
          <DatePicker aria-label={`A${index + 1} 截止日期`} placeholder="截止日期" value={kr.deadline ? dayjs(kr.deadline) : null} onChange={value => changeKr(kr.id, { deadline: value?.format('YYYY-MM-DD') })}/>
          <Tooltip title="删除动作"><Button aria-label={`删除 A${index + 1}`} type="text" icon={<TrashIcon/>} disabled={busy || krs.length === 1} onClick={() => setKrs(items => distribute(items.filter(item => item.id !== kr.id)))}/></Tooltip>
          {supervisor && <div className="supervisor-action-fields">{renderSupervisorFields(kr, index)}</div>}
          <Select className="okr-action-assignees" aria-label={`A${index + 1} 承接人员`} mode="multiple" allowClear showSearch optionFilterProp="label" maxTagCount="responsive" placeholder="指定承接人员（可选）" value={kr.assigneeIds || []} onChange={assigneeIds => changeKr(kr.id, { assigneeIds })} options={assigneeOptions}/>
        </div>)}
      </div>
      <div className="okr-objective-add">{!readOnly && <Button type="text" icon={<PlusIcon/>} disabled={busy || krs.length >= 4} onClick={() => setKrs(items => distribute([...items, { id: crypto.randomUUID(), title: '', weight: 0, progress: 0 }]))}>{isCompanyStyle ? '添加动作' : '继续添加'}</Button>}{supervisor && <span className="okr-objective-limit-hint">最多 4 条，按顺序使用四类模板</span>}<span>A 权重合计 {krWeightTotal}%</span></div>
      {error && <Alert type="warning" title={error} showIcon/>}
    </div>
    {chrome && <div className="okr-objective-footer">{(!detailMode || allowAddAnotherInDetail) && <Button type="text" onClick={onAddAnother} disabled={busy || readOnly}>+ 添加目标</Button>}<span className="okr-objective-footer-spacer"/>{!detailMode && <Button onClick={onCancel} disabled={busy}>返回列表</Button>}{!readOnly && <>{onSaveDraft && <Button onClick={() => void saveDraft()} disabled={busy || unavailable}>存草稿</Button>}<Button type="primary" htmlType="submit" loading={busy} disabled={unavailable}>{submitLabel ?? (isCompanyStyle ? '提交目标' : '提交主管确认')}</Button></>}</div>}
  </Form>;
});
