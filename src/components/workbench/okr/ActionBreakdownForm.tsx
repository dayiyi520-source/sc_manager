import { Button, DatePicker, Empty, Flex, Form, Input, InputNumber, Select, Typography } from 'antd';
import Card from 'antd/es/card/Card';
import { GitBranchIcon, GrabberIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState, type Key } from 'react';
import type { OkrPerson, OkrRecord } from '../../../services/okrRepository';

export type ActionValues = {
  recordId?: string;
  version?: number;
  title?: string;
  businessObject?: string;
  milestone?: string;
  measurableResult?: string;
  deadline?: dayjs.Dayjs;
  weight?: number;
  assigneeIds?: string[];
  objectiveType?: 'target' | 'challenge';
};

export type ActionGroupValues = { parent: OkrRecord; commitmentWeight: number; actions: ActionValues[] };

type BreakdownFormValues = {
  groups?: Record<string, { commitmentWeight?: number; actions?: ActionValues[] }>;
};

type ParentFieldConfig = {
  relationLabel: string;
  relationPlaceholder: string;
  relationOptions: string[];
  resultLabel: string;
  resultPlaceholder: string;
  resultOptions?: string[];
};

const MAX_ACTIONS_PER_OBJECTIVE = 8;
const MILESTONES = ['方案确认', '阶段评审', '上线验收'];
const CUSTOMER_CATEGORIES = ['客户成功', '服务响应', '体验优化'];

const fieldConfig = (index: number, productLineOptions: string[], projectOptions: string[]): ParentFieldConfig => {
  if (index === 0) return { relationLabel: '关联产品线', relationPlaceholder: '选择产品线', relationOptions: productLineOptions, resultLabel: '选择节点', resultPlaceholder: '选择节点', resultOptions: MILESTONES };
  if (index === 1) return { relationLabel: '关联项目', relationPlaceholder: '选择项目', relationOptions: projectOptions, resultLabel: '选择节点', resultPlaceholder: '选择节点', resultOptions: MILESTONES };
  return { relationLabel: '选择分类', relationPlaceholder: '选择分类', relationOptions: CUSTOMER_CATEGORIES, resultLabel: '可衡量结果', resultPlaceholder: '填写可验证的结果' };
};

const monthOptions = () => {
  const current = dayjs().startOf('month');
  return [current.add(1, 'month'), current, current.subtract(1, 'month')].map(month => ({ value: month.format('YYYY-MM'), label: month.format('YYYY年MM月') }));
};

const emptyAction = (): ActionValues => ({ objectiveType: 'target' });
const balanceWeights = (actions: ActionValues[]) => {
  if (actions.length === 0) return actions;
  const base = Math.floor(100 / actions.length);
  const remainder = 100 - base * actions.length;
  return actions.map((action, index) => ({ ...action, weight: base + (index < remainder ? 1 : 0) }));
};
const balanceCommitmentWeights = (parents: OkrRecord[]) => {
  if (parents.length === 0) return {};
  const base = Math.floor(100 / parents.length);
  const remainder = 100 - base * parents.length;
  return Object.fromEntries(parents.map((parent, index) => [parent.id, { commitmentWeight: base + (index < remainder ? 1 : 0), actions: [] }]));
};
const defaultCommitmentWeight = (parents: OkrRecord[], index: number) => {
  const base = Math.floor(100 / Math.max(parents.length, 1));
  const remainder = 100 - base * Math.max(parents.length, 1);
  return base + (index < remainder ? 1 : 0);
};

export function ActionBreakdownForm({ open, cycle, parents, actions, people, productLineOptions, projectOptions, businessOptionsLoading = false, businessOptionsError, busy, onClose, onSave, initialActionId }: {
  key?: Key;
  open: boolean;
  cycle: string;
  person?: OkrPerson;
  parents: OkrRecord[];
  actions: OkrRecord[];
  people: OkrPerson[];
  productLineOptions: string[];
  projectOptions: string[];
  businessOptionsLoading?: boolean;
  businessOptionsError?: string;
  busy: boolean;
  onClose: () => void;
  onSave: (periodKey: string, groups: ActionGroupValues[], mode: 'draft' | 'submit') => Promise<boolean>;
  initialActionId?: string;
}) {
  const [form] = Form.useForm<BreakdownFormValues>();
  const [periodKey, setPeriodKey] = useState(cycle);
  const [editingParentIds, setEditingParentIds] = useState<Set<string>>(() => new Set());
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(() => new Set());
  const [actionTypeOverrides, setActionTypeOverrides] = useState<Record<string, 'target' | 'challenge'>>({});
  const [draggingAction, setDraggingAction] = useState<{ parentId: string; index: number } | null>(null);
  const [dragOverAction, setDragOverAction] = useState<{ parentId: string; index: number } | null>(null);
  const dragHandleRef = useRef<{ parentId: string; index: number } | null>(null);
  const [savingMode, setSavingMode] = useState<'draft' | 'submit'>('submit');
  const groupsValue = Form.useWatch('groups', form) || form.getFieldValue('groups') || {};
  const periods = useMemo(monthOptions, []);

  const draftAction = initialActionId ? actions.find(item => item.id === initialActionId) : undefined;
  const draftParent = draftAction ? parents.find(item => item.id === draftAction.payload.parentActionId && item.payload.parentObjectiveId === draftAction.payload.parentObjectiveId) : undefined;
  const periodParents = parents.filter(parent => parent.periodKey === periodKey);
  const visibleParents = draftParent ? [draftParent] : periodParents.slice(0, 3);
  const actionCount = visibleParents.reduce((total, parent) => total + (groupsValue?.[parent.id]?.actions?.length || 0), 0);
  const invalidWeightParentIds = new Set(visibleParents.filter(parent => {
    const parentActions = groupsValue?.[parent.id]?.actions || [];
    return parentActions.length > 0 && parentActions.reduce((sum, action) => sum + Number(action.weight || 0), 0) !== 100;
  }).map(parent => parent.id));
  const weightsValid = Boolean(initialActionId) || invalidWeightParentIds.size === 0;
  const commitmentWeightFor = (parent: OkrRecord, index: number) => Number(groupsValue?.[parent.id]?.commitmentWeight ?? defaultCommitmentWeight(visibleParents, index));
  const commitmentWeightTotal = visibleParents.reduce((sum, parent, index) => sum + commitmentWeightFor(parent, index), 0);
  const commitmentWeightsValid = Boolean(initialActionId) || (visibleParents.length > 0 && visibleParents.every(parent => {
    const weight = commitmentWeightFor(parent, visibleParents.indexOf(parent));
    return Number.isInteger(weight) && Number(weight) >= 1 && Number(weight) <= 100;
  }) && commitmentWeightTotal === 100);

  useEffect(() => {
    if (!open) return;
    setPeriodKey(initialActionId && draftAction ? draftAction.periodKey : cycle);
    if (draftAction && draftParent) {
      setActionTypeOverrides({ [draftAction.id]: draftAction.payload.objectiveType || 'target' });
      form.setFieldsValue({ groups: { [draftParent.id]: { commitmentWeight: draftAction.payload.commitmentWeight ?? 100, actions: [{
        recordId: draftAction.id,
        version: draftAction.version,
        title: draftAction.payload.title,
        businessObject: draftAction.payload.businessObject || draftAction.payload.productLine || draftAction.payload.acceptanceStandard,
        milestone: draftAction.payload.milestone,
        measurableResult: draftAction.payload.acceptanceStandard,
        deadline: draftAction.payload.deadline ? dayjs(draftAction.payload.deadline) : undefined,
        weight: draftAction.payload.weight,
        objectiveType: draftAction.payload.objectiveType || 'target',
        assigneeIds: draftAction.payload.assigneeIds || [],
      }] } } });
      setEditingParentIds(new Set([draftParent.id]));
      return;
    }
    form.resetFields();
    setActionTypeOverrides({});
    const cycleParents = parents.filter(parent => parent.periodKey === cycle).slice(0, 3);
    form.setFieldsValue({ groups: balanceCommitmentWeights(cycleParents) });
    setEditingParentIds(new Set());
    setCollapsedParents(new Set());
  }, [open, cycle, initialActionId, draftAction, draftParent, form]);

  if (!open) return null;

  const getParentActions = (parentId: string): ActionValues[] => form.getFieldValue(['groups', parentId, 'actions']) || [];
  const setParentActions = (parentId: string, values: ActionValues[]) => form.setFieldValue(['groups', parentId, 'actions'], values);
  const toggleActionType = (parentId: string, actionIndex: number) => {
    const currentActions = getParentActions(parentId);
    const action = currentActions[actionIndex];
    const nextType = action?.objectiveType === 'challenge' ? 'target' : 'challenge';
    setActionTypeOverrides(current => ({ ...current, [`${parentId}:${actionIndex}`]: nextType }));
    setParentActions(parentId, currentActions.map((action, index) => index === actionIndex
      ? { ...action, objectiveType: nextType }
      : action));
  };
  const moveAction = (parentId: string, from: number, to: number) => {
    const currentActions = getParentActions(parentId);
    if (from === to || from < 0 || to < 0 || from >= currentActions.length || to >= currentActions.length) return;
    const next = [...currentActions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setParentActions(parentId, next);
  };
  const openEditor = (parentId: string) => {
    setEditingParentIds(current => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId);
      else {
        next.add(parentId);
        const currentActions = getParentActions(parentId);
        if (currentActions.length === 0) setParentActions(parentId, balanceWeights([emptyAction()]));
      }
      return next;
    });
  };
  const changePeriod = (value: string) => {
    setPeriodKey(value);
    form.resetFields();
    form.setFieldsValue({ groups: balanceCommitmentWeights(parents.filter(parent => parent.periodKey === value).slice(0, 3)) });
    setEditingParentIds(new Set());
    setCollapsedParents(new Set());
  };
  const submit = async (mode: 'draft' | 'submit') => {
    setSavingMode(mode);
    try {
      const values = await form.validateFields();
      const groups = visibleParents.map((parent, index) => ({ parent, commitmentWeight: Number(values.groups?.[parent.id]?.commitmentWeight ?? defaultCommitmentWeight(visibleParents, index)), actions: values.groups?.[parent.id]?.actions || [] })).filter(group => group.actions.length > 0);
      if (groups.length > 0) await onSave(periodKey, groups, mode);
    } catch {
      // Ant Design keeps validation feedback next to the affected field.
    }
  };

  return <Card className="okr-action-breakdown-card"><div className="okr-action-breakdown-page" aria-label={initialActionId ? '拆解目标草稿编辑' : '拆解目标'}>
    <div className="okr-action-period">
      <div className="okr-action-period-control"><Typography.Text>目标归属周期</Typography.Text><Select aria-label="目标归属周期" value={periodKey} options={periods} onChange={changePeriod} disabled={busy || Boolean(initialActionId)} /></div>
      <Flex className="okr-action-period-actions" gap="small" align="center"><Button onClick={onClose} disabled={busy}>取消</Button><Button onClick={() => void submit('draft')} loading={busy && savingMode === 'draft'} disabled={busy || actionCount === 0 || !weightsValid || !commitmentWeightsValid}>存草稿</Button><Button type="primary" onClick={() => void submit('submit')} loading={busy && savingMode === 'submit'} disabled={busy || actionCount === 0 || !weightsValid || !commitmentWeightsValid}>提交</Button></Flex>
    </div>
    {visibleParents.length > 1 && <div className={`okr-action-commitment-summary ${commitmentWeightsValid ? 'is-valid' : 'is-error'}`}>来源承接权重合计 {commitmentWeightTotal}%{commitmentWeightsValid ? '' : '，需为 100%'}</div>}
    {businessOptionsError && <Typography.Text type="danger">{businessOptionsError}</Typography.Text>}
    {visibleParents.length === 0 ? <Card><Empty description="暂无指定给你的承接目标" /></Card> : <Form form={form} component={false} disabled={busy}><Flex vertical gap="middle">{visibleParents.map((parent, parentIndex) => {
      const config = fieldConfig(parentIndex, productLineOptions, projectOptions);
      const isEditing = editingParentIds.has(parent.id);
      const isCollapsed = collapsedParents.has(parent.id);
      const parentActions = groupsValue?.[parent.id]?.actions || [];
      const parentWeight = parentActions.reduce((sum, action) => sum + Number(action.weight || 0), 0);
      const invalidWeight = !initialActionId && invalidWeightParentIds.has(parent.id);
      const sourceName = people.find(person => person.id === parent.ownerId)?.name || '直属上级';
      return <Card key={parent.id} className="okr-action-parent-tree-card"><div className="okr-action-parent-tree-head"><div className="okr-action-o-title"><span className="okr-summary-index">O{parentIndex + 1}</span><Typography.Text strong>{parent.payload.title}</Typography.Text><Typography.Text className="okr-action-source">来源自上级 · {sourceName}</Typography.Text></div><Flex className="okr-action-parent-controls" gap="small" align="center"><Form.Item name={['groups', parent.id, 'commitmentWeight']} rules={[{ required: true, type: 'number', min: 1, max: 100, message: '请输入 1-100 的承接权重' }]}><InputNumber aria-label={`O${parentIndex + 1} 来源承接权重`} min={1} max={100} precision={0} suffix="%" /></Form.Item><Button type="text" onClick={() => setCollapsedParents(current => { const next = new Set(current); next.has(parent.id) ? next.delete(parent.id) : next.add(parent.id); return next; })}>{isCollapsed ? '展开' : '收起'}</Button><Button type="text" aria-label={isEditing ? `收起 O${parentIndex + 1} 拆解` : `拆解 O${parentIndex + 1}`} title={isEditing ? '收起拆解' : '拆解目标'} icon={<GitBranchIcon size={16} />} onClick={() => openEditor(parent.id)} /></Flex></div>
        {!isCollapsed && <>
          {!isEditing && parentActions.length === 0 && <Typography.Paragraph type="secondary" className="okr-action-empty-child">暂无行动，点击右侧图标开始拆解</Typography.Paragraph>}
          {isEditing && <div className="okr-action-table-wrap"><Form.List name={['groups', parent.id, 'actions']}>{fields => <>
            <div className="okr-action-table-toolbar">
              <div><strong>行动拆解</strong><span>{fields.length}/{MAX_ACTIONS_PER_OBJECTIVE}</span><span className={invalidWeight ? 'is-error' : 'is-valid'}>{invalidWeight ? `权重合计 ${parentWeight}%，需为 100%` : '权重合计 100%'}</span></div>
              <Button type="text" icon={<PlusIcon />} disabled={fields.length >= MAX_ACTIONS_PER_OBJECTIVE} onClick={() => setParentActions(parent.id, balanceWeights([...getParentActions(parent.id), emptyAction()]))}>添加行动</Button>
            </div>
            <div className="okr-action-table" role="table" aria-label={`O${parentIndex + 1} 行动列表`}>
              <div className="okr-action-table-head" role="row"><span>序号</span><span>{config.relationLabel}</span><span>动作描述</span><span>{config.resultLabel}</span><span>指定承接人</span><span>完成时间</span><span>权重</span><span>操作</span></div>
              {fields.map((field, actionIndex) => {
                const actionType = actionTypeOverrides[`${parent.id}:${actionIndex}`] || parentActions[actionIndex]?.objectiveType || 'target';
                const isDragging = draggingAction?.parentId === parent.id && draggingAction.index === actionIndex;
                const isDragOver = dragOverAction?.parentId === parent.id && dragOverAction.index === actionIndex && !isDragging;
                return <div key={field.key} draggable={!busy} className={`okr-action-table-row is-${actionType}${isDragging ? ' is-dragging' : ''}${isDragOver ? ' is-drag-over' : ''}`} role="row"
                  onPointerDown={event => { dragHandleRef.current = (event.target as Element).closest('.okr-action-drag') ? { parentId: parent.id, index: actionIndex } : null; }}
                  onDragStart={event => { if (!dragHandleRef.current || dragHandleRef.current.parentId !== parent.id || dragHandleRef.current.index !== actionIndex) { event.preventDefault(); return; } event.dataTransfer.setData('text/plain', JSON.stringify(dragHandleRef.current)); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setDragImage(event.currentTarget, 24, 20); setDraggingAction(dragHandleRef.current); }}
                  onDragEnd={() => { dragHandleRef.current = null; setDraggingAction(null); setDragOverAction(null); }}
                  onDragOver={event => { if (!draggingAction || draggingAction.parentId !== parent.id) return; event.preventDefault(); setDragOverAction({ parentId: parent.id, index: actionIndex }); }}
                  onDrop={event => { event.preventDefault(); const raw = event.dataTransfer.getData('text/plain'); try { const from = JSON.parse(raw) as { parentId: string; index: number }; if (from.parentId === parent.id) moveAction(parent.id, from.index, actionIndex); } catch { /* Ignore malformed drag payloads. */ } dragHandleRef.current = null; setDraggingAction(null); setDragOverAction(null); }}>
                <div className="okr-action-index-cell"><span className="okr-action-drag" title="拖动调整顺序" aria-label={`拖动 A${actionIndex + 1}`}><GrabberIcon /></span><button type="button" className={`okr-action-code okr-action-type-${actionType}`} aria-label={`A${actionIndex + 1}${actionType === 'challenge' ? '挑战动作' : '目标动作'}`} title="点击切换目标动作/挑战动作" onClick={() => toggleActionType(parent.id, actionIndex)}>A{actionIndex + 1}</button></div>
                <Form.Item name={[field.name, 'objectiveType']} hidden><Input /></Form.Item>
                <Form.Item name={[field.name, 'businessObject']} rules={[{ required: true, message: `请选择${config.relationLabel.replace('选择', '')}` }]}><Select aria-label={`A${actionIndex + 1} ${config.relationLabel}`} placeholder={config.relationPlaceholder} loading={businessOptionsLoading && parentIndex < 2} notFoundContent={businessOptionsLoading && parentIndex < 2 ? '正在加载业务数据' : '暂无可选业务数据'} options={config.relationOptions.map(value => ({ value, label: value }))} /></Form.Item>
                <Form.Item name={[field.name, 'title']} rules={[{ required: true, whitespace: true, message: '请输入动作描述' }]}><Input.TextArea aria-label={`A${actionIndex + 1} 动作描述`} placeholder="输入具体行动" autoSize={{ minRows: 2, maxRows: 4 }} maxLength={2000} /></Form.Item>
                {config.resultOptions ? <Form.Item name={[field.name, 'milestone']} rules={[{ required: true, message: '请选择节点' }]}><Select aria-label={`A${actionIndex + 1} ${config.resultLabel}`} placeholder={config.resultPlaceholder} options={config.resultOptions.map(value => ({ value, label: value }))} /></Form.Item> : <Form.Item name={[field.name, 'measurableResult']} rules={[{ required: true, whitespace: true, message: '请输入可衡量结果' }]}><Input.TextArea aria-label={`A${actionIndex + 1} 可衡量结果`} placeholder={config.resultPlaceholder} autoSize={{ minRows: 2, maxRows: 4 }} maxLength={1000} /></Form.Item>}
                <Form.Item name={[field.name, 'assigneeIds']}><Select aria-label={`A${actionIndex + 1} 指定承接人`} mode="multiple" allowClear showSearch optionFilterProp="label" placeholder="选择承接人" maxTagCount="responsive" options={people.map(person => ({ value: person.id, label: `${person.name} · ${person.department}` }))} /></Form.Item>
                <Form.Item name={[field.name, 'deadline']} rules={[{ required: true, message: '请选择完成时间' }]}><DatePicker aria-label={`A${actionIndex + 1} 完成时间`} className="w-full" /></Form.Item>
                <Form.Item name={[field.name, 'weight']} rules={[{ required: true, type: 'number', min: 1, max: 100, message: '请输入 1-100 的权重' }]}><InputNumber aria-label={`A${actionIndex + 1} 权重`} min={1} max={100} precision={0} suffix="%" /></Form.Item>
                <Button danger type="text" aria-label={`删除 A${actionIndex + 1}`} title="删除行动" icon={<TrashIcon />} onClick={() => setParentActions(parent.id, balanceWeights(getParentActions(parent.id).filter((_, index) => index !== actionIndex)))} />
              </div>;
              })}
              {fields.length === 0 && <div className="okr-action-table-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未添加行动" /></div>}
            </div>
          </>}</Form.List></div>}
        </>}
      </Card>;
    })}</Flex></Form>}
  </div></Card>;
}
