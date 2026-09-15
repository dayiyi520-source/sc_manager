import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Button, DatePicker, Form, Input, InputNumber, Tooltip } from 'antd';
import { GoalIcon, RocketIcon, PlusIcon, TrashIcon, GrabberIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import type { OKRItem } from '../../../types';
import type { OkrKr, OkrPayload } from '../../../services/okrRepository';
import { decodeAlignment, ObjectiveAlignmentModal, type AlignmentCategory } from './ObjectiveAlignmentModal';

interface Props {
  cycle: string;
  ownerName: string;
  parents: OKRItem[];
  busy: boolean;
  unavailable: boolean;
  root: boolean;
  onCancel: () => void;
  onSave: (payload: OkrPayload) => Promise<boolean>;
  onSaveDraft?: (payload: OkrPayload) => Promise<boolean>;
  onAddAnother?: () => void;
  chrome?: boolean;
}

export interface ObjectiveFormHandle { submit: () => Promise<boolean>; saveDraft: () => Promise<boolean>; }
export const calculateKrWeightTotal = (items: Pick<OkrKr, 'weight'>[]) => items.reduce((total, item) => total + item.weight, 0);

export const ObjectiveForm = forwardRef<ObjectiveFormHandle, Props>(function ObjectiveForm({ cycle, ownerName, parents, busy, unavailable, root, onCancel, onSave, onSaveDraft, onAddAnother, chrome = true }, ref) {
  const [title, setTitle] = useState('');
  const [objectiveType, setObjectiveType] = useState<'target' | 'challenge'>('target');
  const [alignments, setAlignments] = useState<string[]>([]);
  const [alignmentModalOpen, setAlignmentModalOpen] = useState(false);
  const [draftAlignments, setDraftAlignments] = useState<string[]>([]);
  const [alignmentSearch, setAlignmentSearch] = useState('');
  const [alignmentCategory, setAlignmentCategory] = useState<AlignmentCategory>('supervisor');
  const [note, setNote] = useState('');
  const [krs, setKrs] = useState<OkrKr[]>(() => [{ id: crypto.randomUUID(), title: '', weight: 100, progress: 0 }]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragHandleIndex = useRef<number | null>(null);
  const [error, setError] = useState('');
  const choices = parents.flatMap(parent => [
    { value: JSON.stringify([parent.id]), label: `O · ${parent.objective}`, parent },
    ...parent.keyResults.map((kr, i) => ({ value: JSON.stringify([parent.id, kr.id]), label: `KR${i + 1} · ${kr.content}（${parent.objective}）`, parent })),
  ]);
  const selected = choices.find(option => option.value === alignments[0]);
  const krWeightTotal = calculateKrWeightTotal(krs);
  const changeKr = (id: string, patch: Partial<OkrKr>) => setKrs(items => items.map(kr => kr.id === id ? { ...kr, ...patch } : kr));
  const distribute = (items: OkrKr[]) => items.map((kr, i) => ({ ...kr, weight: Math.floor(100 / items.length) + (i < 100 % items.length ? 1 : 0) }));
  const submit = async (): Promise<boolean> => {
    if (busy || unavailable) return false;
    if (!title.trim() || krs.some(kr => !kr.title.trim())) { setError('请填写目标名称和每条关键结果。'); return false; }
    if (krs.some(kr => kr.weight <= 0) || krWeightTotal !== 100) { setError('KR 权重须大于 0，合计为 100%。'); return false; }
    const latestKrDate = krs.map(kr => kr.deadline).filter(Boolean).sort().at(-1) || '';
    const selectedAlignments = alignments.map(decodeAlignment);
    if (selectedAlignments.some(item => !choices.some(option => option.value === JSON.stringify(item.parentKeyResultId ? [item.parentObjectiveId, item.parentKeyResultId] : [item.parentObjectiveId])))) { setError('对齐目标已变化，请重新选择或清除对齐。'); return false; }
    const [{ parentObjectiveId, parentKeyResultId } = {}] = selectedAlignments;
    setError('');
    return onSave({ title: title.trim(), objectiveType, parentObjectiveId, parentKeyResultId, alignments: selectedAlignments, weight: krWeightTotal, ...(latestKrDate ? {deadline: latestKrDate} : {}), note: note.trim(),
      keyResults: krs.map(kr => ({ ...kr, title: kr.title.trim(), ...(kr.deadline ? {deadline: kr.deadline} : {}) })) });
  };
  const saveDraft = async (): Promise<boolean> => {
    if (!onSaveDraft) return false;
    if (!title.trim()) { setError('请先填写目标名称。'); return false; }
    const latestKrDate = krs.map(kr => kr.deadline).filter(Boolean).sort().at(-1) || '';
    const selectedAlignments = alignments.map(decodeAlignment);
    const [{ parentObjectiveId, parentKeyResultId } = {}] = selectedAlignments;
    return onSaveDraft({ title: title.trim(), objectiveType, parentObjectiveId, parentKeyResultId, alignments: selectedAlignments, weight: krWeightTotal, ...(latestKrDate ? {deadline: latestKrDate} : {}), note: note.trim(), keyResults: krs.map(kr => ({...kr, title: kr.title.trim(), ...(kr.deadline ? {deadline: kr.deadline} : {})})) });
  };
  useImperativeHandle(ref, () => ({ submit, saveDraft }), [submit, saveDraft]);
  const openAlignment = () => { setDraftAlignments(alignments); setAlignmentSearch(''); setAlignmentCategory('supervisor'); setAlignmentModalOpen(true); };
  const commitAlignment = () => {
    setAlignments(draftAlignments);
    const option = choices.find(item => item.value === draftAlignments[0]);
    if (option && decodeAlignment(draftAlignments[0]).parentKeyResultId) setTitle(option.parent.objective);
    setAlignmentModalOpen(false);
  };
  const moveKr = (from: number, to: number) => setKrs(items => { const copy = [...items]; [copy[from], copy[to]] = [copy[to], copy[from]]; return copy; });
  return <Form className="okr-objective-form" disabled={busy} onFinish={submit}>
    {chrome && <div className="okr-objective-period">{dayjs(cycle).format('YYYY年MM月')}<span>进行中</span></div>}
    <div className="okr-objective-body">
      <div className="okr-objective-columns okr-objective-head">
        <Button className="okr-align-trigger" type="text" aria-label="对齐目标" disabled={busy || unavailable} onClick={openAlignment}>
          {alignments.length > 1 ? `已对齐 ${alignments.length} 个目标` : selected ? `对齐目标：${selected.label}` : '对齐目标'}
        </Button>
        <span>权重</span><span>截止日期</span><span/>
      </div>
      <div className="okr-objective-columns">
        <div className="okr-objective-title">
          <Tooltip title={objectiveType === 'target' ? '目标型，点击切换为挑战型' : '挑战型，点击切换为目标型'}>
            <Button className={`okr-objective-kind ${objectiveType}`} aria-label={`目标类型：${objectiveType === 'target' ? '目标型' : '挑战型'}`}
              aria-pressed={objectiveType === 'challenge'} onClick={() => setObjectiveType(value => value === 'target' ? 'challenge' : 'target')}
              icon={objectiveType === 'target' ? <GoalIcon/> : <RocketIcon/>}>O1</Button>
          </Tooltip>
          <Input aria-label="目标名称" variant="borderless" maxLength={255} value={title} onChange={e => setTitle(e.target.value)} placeholder="输入目标名称"/>
        </div>
        <span className="okr-objective-weight-readonly" aria-label="目标权重">{krWeightTotal}%</span>
        <span className="okr-objective-deadline">{krs.map(kr => kr.deadline).filter(Boolean).sort().at(-1) || '—'}</span><span/>
      </div>
      <div className="okr-objective-meta"><span>个人级</span><span>{ownerName}</span><span>{objectiveType === 'target' ? '目标型' : '挑战型'}</span></div>
      <Input.TextArea aria-label="目标备注" maxLength={2000} autoSize={{ minRows: 2, maxRows: 5 }} value={note} onChange={e => setNote(e.target.value)} placeholder="填写备注"/>
      <div className="okr-objective-krs">
        {krs.map((kr, index) => <div key={kr.id} draggable={!busy} className={`okr-objective-columns okr-objective-kr${draggingIndex === index ? ' is-dragging' : ''}${dragOverIndex === index && draggingIndex !== index ? ' is-drag-over' : ''}`} onPointerDown={event => { dragHandleIndex.current = (event.target as Element).closest('.okr-kr-drag') ? index : null; }} onDragStart={event => { if (dragHandleIndex.current !== index) { event.preventDefault(); return; } event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setDragImage(event.currentTarget, 24, 20); setDraggingIndex(index); }} onDragEnd={() => { dragHandleIndex.current = null; setDraggingIndex(null); setDragOverIndex(null); }} onDragOver={event => { if (draggingIndex === null) return; event.preventDefault(); if (krs.length > 1) setDragOverIndex(index); }} onDrop={event => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); if (krs.length > 1 && Number.isInteger(from) && from !== index) moveKr(from, index); dragHandleIndex.current = null; setDraggingIndex(null); setDragOverIndex(null); }}>
          <div className="okr-objective-kr-title"><span className="okr-kr-drag" title="拖动调整顺序" aria-label={`拖动 KR${index + 1}`}><GrabberIcon/></span><span>KR{index + 1}</span><Input aria-label={`KR${index + 1} 名称`} variant="borderless" maxLength={2000} value={kr.title} onChange={e => changeKr(kr.id, { title: e.target.value })} placeholder="输入关键结果名称"/></div>
          <InputNumber aria-label={`KR${index + 1} 权重`} min={1} max={100} precision={0} suffix="%" value={kr.weight} onChange={value => changeKr(kr.id, { weight: value ?? 0 })}/>
          <DatePicker aria-label={`KR${index + 1} 截止日期`} placeholder="截止日期" value={kr.deadline ? dayjs(kr.deadline) : null} onChange={value => changeKr(kr.id, { deadline: value?.format('YYYY-MM-DD') })}/>
          <Tooltip title="删除关键结果"><Button aria-label={`删除 KR${index + 1}`} type="text" icon={<TrashIcon/>} disabled={busy || krs.length === 1} onClick={() => setKrs(items => distribute(items.filter(item => item.id !== kr.id)))}/></Tooltip>
        </div>)}
      </div>
      <div className="okr-objective-add"><Button type="text" icon={<PlusIcon/>} disabled={busy || krs.length >= 20} onClick={() => setKrs(items => distribute([...items, { id: crypto.randomUUID(), title: '', weight: 0, progress: 0 }]))}>添加关键结果</Button><span>KR 权重合计 {krWeightTotal}%</span></div>
      {error && <Alert type="warning" title={error} showIcon/>}
    </div>
    {chrome && <div className="okr-objective-footer"><Button type="text" onClick={onAddAnother} disabled={busy}>+ 添加 O</Button><span className="okr-objective-footer-spacer"/><Button onClick={onCancel} disabled={busy}>取消</Button><Button onClick={saveDraft} disabled={busy || unavailable}>存草稿</Button><Button type="primary" htmlType="submit" loading={busy} disabled={unavailable}>{root ? '提交目标' : '提交主管确认'}</Button></div>}
    <ObjectiveAlignmentModal open={alignmentModalOpen} parents={parents} selectedValues={draftAlignments} search={alignmentSearch} category={alignmentCategory} onSearchChange={setAlignmentSearch} onCategoryChange={setAlignmentCategory} onSelectionChange={setDraftAlignments} onCancel={() => setAlignmentModalOpen(false)} onConfirm={commitAlignment}/>
  </Form>;
});
