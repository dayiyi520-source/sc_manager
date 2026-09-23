import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Button, DatePicker, Form, Input, InputNumber, Tooltip } from 'antd';
import { GrabberIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import type { OKRItem } from '../../../types';
import type { OkrKr, OkrPayload } from '../../../services/okrRepository';

interface Props {
  cycle: string;
  objectiveIndex?: number;
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

export const ObjectiveForm = forwardRef<ObjectiveFormHandle, Props>(function ObjectiveForm({ cycle, objectiveIndex = 0, busy, unavailable, root, onCancel, onSave, onSaveDraft, onAddAnother, chrome = true }, ref) {
  const [title, setTitle] = useState('');
  const [krs, setKrs] = useState<OkrKr[]>(() => [{ id: crypto.randomUUID(), title: '', weight: 100, progress: 0 }]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragHandleIndex = useRef<number | null>(null);
  const [error, setError] = useState('');
  const krWeightTotal = calculateKrWeightTotal(krs);
  const changeKr = (id: string, patch: Partial<OkrKr>) => setKrs(items => items.map(kr => kr.id === id ? { ...kr, ...patch } : kr));
  const distribute = (items: OkrKr[]) => items.map((kr, i) => ({ ...kr, weight: Math.floor(100 / items.length) + (i < 100 % items.length ? 1 : 0) }));
  const payload = (): OkrPayload => {
    const latestKrDate = krs.map(kr => kr.deadline).filter(Boolean).sort().at(-1) || '';
    return {
      title: title.trim(),
      objectiveType: 'target',
      alignments: [],
      weight: krWeightTotal,
      ...(latestKrDate ? { deadline: latestKrDate } : {}),
      note: '',
      keyResults: krs.map(kr => ({ ...kr, title: kr.title.trim(), ...(kr.deadline ? { deadline: kr.deadline } : {}) })),
    };
  };
  const submit = async (fromBatch = false): Promise<boolean> => {
    if ((!fromBatch && busy) || unavailable) return false;
    if (!title.trim() || krs.some(kr => !kr.title.trim())) { setError('请填写目标名称和每条 A 动作。'); return false; }
    if (krs.some(kr => kr.weight <= 0) || krWeightTotal !== 100) { setError('A 权重须大于 0，合计为 100%。'); return false; }
    setError('');
    return onSave(payload());
  };
  const saveDraft = async (fromBatch = false): Promise<boolean> => {
    if (!fromBatch && busy) return false;
    if (!onSaveDraft) return false;
    if (!title.trim()) { setError('请先填写目标名称。'); return false; }
    return onSaveDraft(payload());
  };
  useImperativeHandle(ref, () => ({
    submit: () => submit(true),
    saveDraft: () => saveDraft(true),
  }), [submit, saveDraft]);
  const moveKr = (from: number, to: number) => setKrs(items => { const copy = [...items]; [copy[from], copy[to]] = [copy[to], copy[from]]; return copy; });
  return <Form className="okr-objective-form" disabled={busy} onFinish={() => void submit()}>
    {chrome && <div className="okr-objective-period">{dayjs(cycle).format('YYYY年MM月')}<span>进行中</span></div>}
    <div className="okr-objective-body">
      <div className="okr-objective-columns okr-objective-head">
        <span>目标与动作</span><span>权重</span><span>截止日期</span><span/>
      </div>
      <div className="okr-objective-columns">
        <div className="okr-objective-title">
          <span className="okr-objective-kind" aria-label={`目标编号 O${objectiveIndex + 1}`}>O{objectiveIndex + 1}</span>
          <Input aria-label="目标名称" variant="borderless" maxLength={255} value={title} onChange={event => setTitle(event.target.value)} placeholder="输入目标名称"/>
        </div>
        <span className="okr-objective-weight-readonly" aria-label="目标权重">{krWeightTotal}%</span>
        <span className="okr-objective-deadline">{krs.map(kr => kr.deadline).filter(Boolean).sort().at(-1) || '—'}</span><span/>
      </div>
      <div className="okr-objective-krs">
        {krs.map((kr, index) => <div key={kr.id} draggable={!busy} className={`okr-objective-columns okr-objective-kr${draggingIndex === index ? ' is-dragging' : ''}${dragOverIndex === index && draggingIndex !== index ? ' is-drag-over' : ''}`} onPointerDown={event => { dragHandleIndex.current = (event.target as Element).closest('.okr-kr-drag') ? index : null; }} onDragStart={event => { if (dragHandleIndex.current !== index) { event.preventDefault(); return; } event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setDragImage(event.currentTarget, 24, 20); setDraggingIndex(index); }} onDragEnd={() => { dragHandleIndex.current = null; setDraggingIndex(null); setDragOverIndex(null); }} onDragOver={event => { if (draggingIndex === null) return; event.preventDefault(); if (krs.length > 1) setDragOverIndex(index); }} onDrop={event => { event.preventDefault(); const from = Number(event.dataTransfer.getData('text/plain')); if (krs.length > 1 && Number.isInteger(from) && from !== index) moveKr(from, index); dragHandleIndex.current = null; setDraggingIndex(null); setDragOverIndex(null); }}>
          <div className="okr-objective-kr-title"><span className="okr-kr-drag" title="拖动调整顺序" aria-label={`拖动 A${index + 1}`}><GrabberIcon/></span><span>A{index + 1}</span><Input aria-label={`A${index + 1} 名称`} variant="borderless" maxLength={2000} value={kr.title} onChange={event => changeKr(kr.id, { title: event.target.value })} placeholder="输入动作名称"/></div>
          <InputNumber aria-label={`A${index + 1} 权重`} min={1} max={100} precision={0} suffix="%" value={kr.weight} onChange={value => changeKr(kr.id, { weight: value ?? 0 })}/>
          <DatePicker aria-label={`A${index + 1} 截止日期`} placeholder="截止日期" value={kr.deadline ? dayjs(kr.deadline) : null} onChange={value => changeKr(kr.id, { deadline: value?.format('YYYY-MM-DD') })}/>
          <Tooltip title="删除动作"><Button aria-label={`删除 A${index + 1}`} type="text" icon={<TrashIcon/>} disabled={busy || krs.length === 1} onClick={() => setKrs(items => distribute(items.filter(item => item.id !== kr.id)))}/></Tooltip>
        </div>)}
      </div>
      <div className="okr-objective-add"><Button type="text" icon={<PlusIcon/>} disabled={busy || krs.length >= 20} onClick={() => setKrs(items => distribute([...items, { id: crypto.randomUUID(), title: '', weight: 0, progress: 0 }]))}>继续添加</Button><span>A 权重合计 {krWeightTotal}%</span></div>
      {error && <Alert type="warning" title={error} showIcon/>}
    </div>
    {chrome && <div className="okr-objective-footer"><Button type="text" onClick={onAddAnother} disabled={busy}>+ 添加目标</Button><span className="okr-objective-footer-spacer"/><Button onClick={onCancel} disabled={busy}>取消</Button><Button onClick={() => void saveDraft()} disabled={busy || unavailable}>存草稿</Button><Button type="primary" htmlType="submit" loading={busy} disabled={unavailable}>{root ? '提交目标' : '提交主管确认'}</Button></div>}
  </Form>;
});
