import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, Modal, Select, Tooltip } from 'antd';
import { DeleteOutlined, HolderOutlined, PlusOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { ProductLine, ProductLineWorkItemCategory, ProductLineWorkItemType } from '../../types';
import { productRepository, WorkItemCategoryKey, WorkItemWorkflow } from '../../services/productRepository';
import { useApp } from '../../context/AppContext';

export type StateGroup = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type StateTagColor = 'neutral' | 'blue' | 'cyan' | 'green' | 'yellow' | 'red' | 'purple';
export type EditableWorkflowState = { key: string; name: string; group: StateGroup; initial: boolean; successful: boolean; enabled: boolean; stage: string; color: StateTagColor };

export const CATEGORY_KEYS: Record<ProductLineWorkItemCategory, WorkItemCategoryKey> = { 需求: 'requirement', 设计: 'design', 研发: 'dev', 测试: 'test', 缺陷: 'bug' };
const GROUP_OPTIONS: Array<{ value: StateGroup; label: string }> = [
  { value: 'NOT_STARTED', label: '未开始' },
  { value: 'IN_PROGRESS', label: '进行中' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '已取消' }
];
const TAG_COLOR_OPTIONS: Array<{ value: StateTagColor; label: string; token: string }> = [
  { value: 'neutral', label: '中性灰', token: 'var(--text-muted)' },
  { value: 'blue', label: '品牌蓝', token: 'var(--primary)' },
  { value: 'cyan', label: '青色', token: 'var(--cam-cyan)' },
  { value: 'green', label: '成功绿', token: 'var(--success)' },
  { value: 'yellow', label: '警告黄', token: 'var(--warning)' },
  { value: 'red', label: '危险红', token: 'var(--danger)' },
  { value: 'purple', label: '强调紫', token: 'var(--accent-purple)' }
];
const TAG_COLOR_VALUES = new Set(TAG_COLOR_OPTIONS.map((option) => option.value));

const stateStage = (category: WorkItemCategoryKey) => category === 'bug' ? 'dev' : category;
const createKey = () => `status_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
export const createDefaultWorkItemStates = (category: WorkItemCategoryKey): EditableWorkflowState[] => [
  { key: 'status_pending', name: '待处理', group: 'NOT_STARTED', initial: true, successful: false, enabled: true, stage: stateStage(category), color: 'neutral' },
  { key: 'status_in_progress', name: '处理中', group: 'IN_PROGRESS', initial: false, successful: false, enabled: true, stage: stateStage(category), color: 'blue' },
  { key: 'status_completed', name: '已完成', group: 'COMPLETED', initial: false, successful: true, enabled: true, stage: stateStage(category), color: 'green' }
];
const normalizeStates = (workflow: WorkItemWorkflow | undefined, category: WorkItemCategoryKey): EditableWorkflowState[] => {
  const source = workflow?.definition.states;
  if (!source?.length) return createDefaultWorkItemStates(category);
  const hasInitial = source.some((state) => Boolean(state.initial));
  return source.map((state, index) => ({
    key: String(state.key || createKey()), name: String(state.name || ''),
    group: (state.group || 'NOT_STARTED') as StateGroup, initial: hasInitial ? Boolean(state.initial) : index === 0,
    successful: state.group === 'COMPLETED', enabled: state.enabled !== false,
    stage: String(state.stage || stateStage(category)),
    color: TAG_COLOR_VALUES.has(state.color as StateTagColor) ? state.color as StateTagColor : 'neutral'
  }));
};
export const buildWorkflowDefinition = (states: EditableWorkflowState[]) => {
  const derivedStates = states.map((state) => ({ ...state, successful: state.group === 'COMPLETED' }));
  const initial = derivedStates.find((state) => state.initial)!;
  const active = [initial, ...derivedStates.filter((state) => !state.initial && state.group !== 'COMPLETED' && state.group !== 'CANCELLED')];
  const terminal = derivedStates.filter((state) => state.group === 'COMPLETED' || state.group === 'CANCELLED');
  const transitions = active.slice(0, -1).map((state, index) => ({
    key: `move_${state.key}_${active[index + 1].key}`.slice(0, 64), from: state.key, to: active[index + 1].key,
    name: `进入${active[index + 1].name}`, roles: ['admin', 'product_manager', 'tech_lead'], requiredFields: []
  }));
  const terminalSource = active[active.length - 1];
  terminal.forEach((state) => transitions.push({ key: `move_${terminalSource.key}_${state.key}`.slice(0, 64), from: terminalSource.key, to: state.key, name: `进入${state.name}`, roles: ['admin', 'product_manager', 'tech_lead'], requiredFields: [] }));
  return { states: derivedStates, transitions };
};

export const validateWorkflowStates = (states: EditableWorkflowState[]) => {
  if (states.length < 2) return '每个工作项类型至少保留两个状态';
  if (states.some((state) => !state.name.trim())) return '请填写所有状态名称';
  if (new Set(states.map((state) => state.name.trim())).size !== states.length) return '状态名称不能重复';
  if (!states.some((state) => state.group === 'NOT_STARTED') || !states.some((state) => state.group === 'COMPLETED')) return '状态流转必须包含至少一个‘未开始’和一个‘已完成’阶段的状态。';
  if (states.filter((state) => state.initial).length !== 1) return '必须设置且只能设置一个默认状态';
  if (states.some((state) => state.initial && state.group !== 'NOT_STARTED')) return '默认状态必须归属‘未开始’阶段';
  return '';
};

export const reorderWorkflowStates = (states: EditableWorkflowState[], sourceKey: string, targetKey: string) => {
  const sourceIndex = states.findIndex((state) => state.key === sourceKey);
  const targetIndex = states.findIndex((state) => state.key === targetKey);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return states;
  const next = [...states];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
};

export const setDefaultWorkflowState = (states: EditableWorkflowState[], key: string) => states.map((state) => ({ ...state, initial: state.key === key }));

export const WorkItemStateEditor: React.FC<{
  states: EditableWorkflowState[];
  category: WorkItemCategoryKey;
  onChange: (states: EditableWorkflowState[]) => void;
}> = ({ states, category, onChange }) => {
  const { addToast } = useApp();
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [pendingDefaultKey, setPendingDefaultKey] = useState<string | null>(null);
  const updateState = (key: string, patch: Partial<EditableWorkflowState>) => onChange(states.map((state) => state.key === key ? { ...state, ...patch } : state));
  const chooseDefault = (key: string) => {
    const selected = states.find((state) => state.key === key);
    if (!selected || selected.initial || selected.group !== 'NOT_STARTED') return;
    if (states.some((state) => state.initial)) setPendingDefaultKey(key);
    else onChange(setDefaultWorkflowState(states, key));
  };
  const remove = (key: string) => {
    if (states.length <= 2) { addToast('warning', '每个工作项类型至少保留两个状态'); return; }
    const removed = states.find((state) => state.key === key);
    const next = states.filter((state) => state.key !== key);
    if (removed?.initial) {
      const replacement = next.find((state) => state.group === 'NOT_STARTED');
      onChange(replacement ? setDefaultWorkflowState(next, replacement.key) : next);
      return;
    }
    onChange(next);
  };

  return <div className="space-y-3">
    <div className="grid grid-cols-[40px_minmax(180px,1fr)_140px_140px_88px] items-center gap-2 px-2 text-[11px] text-[var(--text-muted)]"><span>排序</span><span>状态名称</span><span>通用阶段</span><span>Tag 颜色</span><span className="text-right">操作</span></div>
    <div className="space-y-2">{states.map((state) => <div key={state.key} onDragEnter={(event) => { event.preventDefault(); if (draggingKey && draggingKey !== state.key) { onChange(reorderWorkflowStates(states, draggingKey, state.key)); setDragOverKey(state.key); } }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={(event) => { event.preventDefault(); setDraggingKey(null); setDragOverKey(null); }} className={`grid grid-cols-[40px_minmax(180px,1fr)_140px_140px_88px] items-center gap-2 rounded-md border bg-[var(--bg-surface-soft)] p-2 transition-[transform,opacity,border-color,background-color] duration-150 ${draggingKey === state.key ? 'scale-[0.99] border-[var(--primary)] opacity-55' : dragOverKey === state.key ? 'border-[var(--primary)] bg-[var(--bg-elevated)]' : 'border-[var(--border-main)]'}`}>
      <button type="button" draggable aria-label={`拖拽排序：${state.name || '未命名状态'}`} title="拖拽排序" onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', state.key); setDraggingKey(state.key); setDragOverKey(null); }} onDragEnd={() => { setDraggingKey(null); setDragOverKey(null); }} className="flex h-9 w-9 cursor-grab items-center justify-center rounded-md text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] active:cursor-grabbing"><HolderOutlined /></button>
      <Input maxLength={128} value={state.name} onChange={(event) => updateState(state.key, { name: event.target.value })} placeholder="请输入状态名称" />
      <Select value={state.group} options={GROUP_OPTIONS.map((option) => ({ ...option, disabled: state.initial && option.value !== 'NOT_STARTED' }))} onChange={(group: StateGroup) => updateState(state.key, { group })} />
      <Select value={state.color} onChange={(color: StateTagColor) => updateState(state.key, { color })} options={TAG_COLOR_OPTIONS.map((option) => ({ value: option.value, label: <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: option.token }} />{option.label}</span> }))} />
      <div className="flex justify-end gap-1"><Tooltip title={state.initial ? '当前默认状态' : state.group === 'NOT_STARTED' ? '设为默认状态' : '仅“未开始”阶段可设为默认状态'}><Button type="text" disabled={!state.initial && state.group !== 'NOT_STARTED'} icon={state.initial ? <StarFilled className="text-[var(--warning)]" /> : <StarOutlined />} aria-label={state.initial ? `默认状态：${state.name}` : `设${state.name}为默认状态`} onClick={() => chooseDefault(state.key)} /></Tooltip><Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除状态：${state.name}`} onClick={() => remove(state.key)} /></div>
    </div>)}</div>
    <Button icon={<PlusOutlined />} onClick={() => onChange([...states, { key: createKey(), name: '', group: 'IN_PROGRESS', initial: false, successful: false, enabled: true, stage: stateStage(category), color: 'neutral' }])}>添加状态</Button>
    <Modal open={Boolean(pendingDefaultKey)} title="修改默认状态" okText="确认修改" cancelText="取消" onCancel={() => setPendingDefaultKey(null)} onOk={() => { if (pendingDefaultKey) onChange(setDefaultWorkflowState(states, pendingDefaultKey)); setPendingDefaultKey(null); }}><p className="text-sm text-[var(--text-body)]">确定将默认状态从“{states.find((state) => state.initial)?.name}”修改为“{states.find((state) => state.key === pendingDefaultKey)?.name}”吗？新建工作项将使用新的默认状态。</p></Modal>
  </div>;
};

export const WorkItemStateConfigDrawer: React.FC<{
  productLine: ProductLine; item: ProductLineWorkItemType | null; open: boolean; onClose: () => void;
}> = ({ productLine, item, open, onClose }) => {
  const { addToast } = useApp();
  const category = item ? CATEGORY_KEYS[item.category] : 'requirement';
  const [workflows, setWorkflows] = useState<WorkItemWorkflow[]>([]);
  const [states, setStates] = useState<EditableWorkflowState[]>(createDefaultWorkItemStates(category));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const current = useMemo(() => workflows.find((workflow) => workflow.status === 'DRAFT') || workflows[0], [workflows]);

  const load = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const next = await productRepository.typeWorkflows(productLine.id, item.id);
      setWorkflows(next);
      setStates(normalizeStates(next.find((workflow) => workflow.status === 'DRAFT') || next[0], category));
    } catch (error) {
      addToast('error', '状态配置读取失败', error instanceof Error ? error.message : '请稍后重试');
    } finally { setLoading(false); }
  };
  useEffect(() => { if (open) void load(); }, [open, item?.id]);

  const save = async () => {
    if (!item) return;
    const invalid = validateWorkflowStates(states); if (invalid) { addToast('warning', invalid); return; }
    setSaving(true);
    try {
      const definition = buildWorkflowDefinition(states.map((state) => ({ ...state, name: state.name.trim(), stage: stateStage(category) })));
      if (current?.status === 'DRAFT') await productRepository.updateTypeWorkflow(productLine.id, item.id, current.id, { category, name: `${item.name}状态配置`, definition, revision: current.revision });
      else await productRepository.createTypeWorkflow(productLine.id, item.id, { category, name: `${item.name}状态配置`, definition });
      addToast('success', '状态配置草稿已保存'); await load();
    } catch (error) { addToast('error', '状态配置保存失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setSaving(false); }
  };
  const publish = async () => {
    if (!current || current.status !== 'DRAFT') return;
    setSaving(true);
    try { await productRepository.publishWorkflow(productLine.id, current.id, current.revision); addToast('success', '状态配置已发布'); await load(); }
    catch (error) { addToast('error', '状态配置发布失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setSaving(false); }
  };

  return <Drawer width={840} open={open} onClose={onClose} destroyOnClose title={item ? `配置「${item.name}」状态` : '状态配置'}
    footer={<div className="flex justify-end gap-2"><Button onClick={onClose}>取消</Button><Button loading={saving} onClick={() => void save()}>保存草稿</Button><Button type="primary" loading={saving} disabled={current?.status !== 'DRAFT'} onClick={() => void publish()}>发布配置</Button></div>}>
    <div className="space-y-4 text-xs">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border-main)] pb-4"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">状态与通用阶段</h3><p className="mt-1 text-[var(--text-muted)]">状态名称可自定义，通用阶段固定为未开始、进行中、已完成和已取消。</p></div><span className="whitespace-nowrap text-[var(--text-muted)]">{loading ? '正在读取...' : current ? `V${current.workflowVersion} · ${current.status === 'PUBLISHED' ? '已发布' : '草稿'}` : '尚未配置'}</span></div>
      <WorkItemStateEditor states={states} category={category} onChange={setStates} />
    </div>
  </Drawer>;
};
