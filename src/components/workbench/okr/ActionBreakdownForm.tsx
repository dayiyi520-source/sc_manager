import { Button, DatePicker, Empty, Flex, Form, Input, InputNumber, Select, Typography } from 'antd';
import Card from 'antd/es/card/Card';
import { GitBranchIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState, type Key } from 'react';
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
};

export type ActionGroupValues = { parent: OkrRecord; actions: ActionValues[] };

type BreakdownFormValues = {
  groups?: Record<string, { actions?: ActionValues[] }>;
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
const PRODUCT_LINES = ['师创智联协同OS', '智慧数智分析引擎', '移动端协同App'];
const PROJECTS = ['重点客户交付项目', '管理平台升级项目', '移动协同建设项目'];
const MILESTONES = ['方案确认', '阶段评审', '上线验收'];
const CUSTOMER_CATEGORIES = ['客户成功', '服务响应', '体验优化'];

const fieldConfig = (index: number): ParentFieldConfig => {
  if (index === 0) return { relationLabel: '关联产品线', relationPlaceholder: '选择产品线', relationOptions: PRODUCT_LINES, resultLabel: '选择节点', resultPlaceholder: '选择节点', resultOptions: MILESTONES };
  if (index === 1) return { relationLabel: '关联项目', relationPlaceholder: '选择项目', relationOptions: PROJECTS, resultLabel: '选择节点', resultPlaceholder: '选择节点', resultOptions: MILESTONES };
  return { relationLabel: '选择分类', relationPlaceholder: '选择分类', relationOptions: CUSTOMER_CATEGORIES, resultLabel: '可衡量结果', resultPlaceholder: '填写可验证的结果' };
};

const monthOptions = () => {
  const current = dayjs().startOf('month');
  return [current.add(1, 'month'), current, current.subtract(1, 'month')].map(month => ({ value: month.format('YYYY-MM'), label: month.format('YYYY年MM月') }));
};

const emptyAction = (): ActionValues => ({ weight: undefined });

export function ActionBreakdownForm({ open, cycle, parents, actions, people, busy, onClose, onSave, initialActionId }: {
  key?: Key;
  open: boolean;
  cycle: string;
  person?: OkrPerson;
  parents: OkrRecord[];
  actions: OkrRecord[];
  people: OkrPerson[];
  busy: boolean;
  onClose: () => void;
  onSave: (periodKey: string, groups: ActionGroupValues[], mode: 'draft' | 'submit') => Promise<boolean>;
  initialActionId?: string;
}) {
  const [form] = Form.useForm<BreakdownFormValues>();
  const [periodKey, setPeriodKey] = useState(cycle);
  const [editingParentIds, setEditingParentIds] = useState<Set<string>>(() => new Set());
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(() => new Set());
  const [savingMode, setSavingMode] = useState<'draft' | 'submit'>('submit');
  const groupsValue = Form.useWatch('groups', form);
  const periods = useMemo(monthOptions, []);

  const draftAction = initialActionId ? actions.find(item => item.id === initialActionId) : undefined;
  const draftParent = draftAction ? parents.find(item => item.id === draftAction.payload.parentActionId && item.payload.parentObjectiveId === draftAction.payload.parentObjectiveId) : undefined;
  const visibleParents = draftParent ? [draftParent] : parents.slice(0, 3);
  const actionCount = visibleParents.reduce((total, parent) => total + (groupsValue?.[parent.id]?.actions?.length || 0), 0);

  useEffect(() => {
    if (!open) return;
    setPeriodKey(initialActionId && draftAction ? draftAction.periodKey : cycle);
    if (draftAction && draftParent) {
      form.setFieldsValue({ groups: { [draftParent.id]: { actions: [{
        recordId: draftAction.id,
        version: draftAction.version,
        title: draftAction.payload.title,
        businessObject: draftAction.payload.businessObject || draftAction.payload.productLine || draftAction.payload.acceptanceStandard,
        milestone: draftAction.payload.milestone,
        measurableResult: draftAction.payload.acceptanceStandard,
        deadline: draftAction.payload.deadline ? dayjs(draftAction.payload.deadline) : undefined,
        weight: draftAction.payload.weight,
      }] } } });
      setEditingParentIds(new Set([draftParent.id]));
      return;
    }
    form.resetFields();
    setEditingParentIds(new Set());
    setCollapsedParents(new Set());
  }, [open, initialActionId]);

  if (!open) return null;

  const setParentActions = (parentId: string, values: ActionValues[]) => form.setFieldValue(['groups', parentId, 'actions'], values);
  const openEditor = (parentId: string) => {
    setEditingParentIds(current => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId);
      else {
        next.add(parentId);
        const currentActions = form.getFieldValue(['groups', parentId, 'actions']) || [];
        if (currentActions.length === 0) setParentActions(parentId, [emptyAction()]);
      }
      return next;
    });
  };
  const changePeriod = (value: string) => {
    setPeriodKey(value);
    form.resetFields();
    setEditingParentIds(new Set());
    setCollapsedParents(new Set());
  };
  const submit = async (mode: 'draft' | 'submit') => {
    setSavingMode(mode);
    try {
      const values = await form.validateFields();
      const groups = visibleParents.map(parent => ({ parent, actions: values.groups?.[parent.id]?.actions || [] })).filter(group => group.actions.length > 0);
      if (groups.length > 0) await onSave(periodKey, groups, mode);
    } catch {
      // Ant Design keeps validation feedback next to the affected field.
    }
  };

  return <Card className="okr-action-breakdown-card"><div className="okr-action-breakdown-page" aria-label={initialActionId ? '拆解目标草稿编辑' : '拆解目标'}>
    <div className="okr-action-period">
      <div className="okr-action-period-control"><Typography.Text>目标归属周期</Typography.Text><Select aria-label="目标归属周期" value={periodKey} options={periods} onChange={changePeriod} disabled={busy || Boolean(initialActionId)} /></div>
      <Flex className="okr-action-period-actions" gap="small" align="center"><Button onClick={onClose} disabled={busy}>取消</Button><Button onClick={() => void submit('draft')} loading={busy && savingMode === 'draft'} disabled={busy || actionCount === 0}>存草稿</Button><Button type="primary" onClick={() => void submit('submit')} loading={busy && savingMode === 'submit'} disabled={busy || actionCount === 0}>提交</Button></Flex>
    </div>
    {visibleParents.length === 0 ? <Card><Empty description="暂无指定给你的承接目标" /></Card> : <Form form={form} component={false} disabled={busy}><Flex vertical gap="middle">{visibleParents.map((parent, parentIndex) => {
      const config = fieldConfig(parentIndex);
      const isEditing = editingParentIds.has(parent.id);
      const isCollapsed = collapsedParents.has(parent.id);
      const parentActions = groupsValue?.[parent.id]?.actions || [];
      const sourceName = people.find(person => person.id === parent.ownerId)?.name || '直属上级';
      return <Card key={parent.id} className="okr-action-parent-tree-card"><div className="okr-action-parent-tree-head"><div className="okr-action-o-title"><span className="okr-summary-index">O{parentIndex + 1}</span><Typography.Text strong>{parent.payload.title}</Typography.Text><Typography.Text className="okr-action-source">来源自上级 · {sourceName}</Typography.Text></div><Flex gap="small" align="center"><Button type="text" onClick={() => setCollapsedParents(current => { const next = new Set(current); next.has(parent.id) ? next.delete(parent.id) : next.add(parent.id); return next; })}>{isCollapsed ? '展开' : '收起'}</Button><Button type="text" aria-label={isEditing ? `收起 O${parentIndex + 1} 拆解` : `拆解 O${parentIndex + 1}`} title={isEditing ? '收起拆解' : '拆解目标'} icon={<GitBranchIcon size={16} />} onClick={() => openEditor(parent.id)} /></Flex></div>
        {!isCollapsed && <>{!isEditing && parentActions.length === 0 && <Typography.Paragraph type="secondary" className="okr-action-empty-child">暂无行动，点击右侧图标开始拆解</Typography.Paragraph>}{isEditing && <div className="okr-action-table-wrap"><Form.List name={['groups', parent.id, 'actions']}>{(fields, { add, remove }) => <><div className="okr-action-table-toolbar"><div><strong>行动拆解</strong><span>{fields.length}/{MAX_ACTIONS_PER_OBJECTIVE}</span></div><Button type="text" icon={<PlusIcon />} disabled={fields.length >= MAX_ACTIONS_PER_OBJECTIVE} onClick={() => add(emptyAction())}>添加行动</Button></div><div className="okr-action-table" role="table" aria-label={`O${parentIndex + 1} 行动列表`}><div className="okr-action-table-head" role="row"><span>序号</span><span>{config.relationLabel}</span><span>动作描述</span><span>{config.resultLabel}</span><span>完成时间</span><span>权重</span><span>操作</span></div>{fields.map((field, actionIndex) => <div key={field.key} className="okr-action-table-row" role="row"><strong className="okr-action-code">A{actionIndex + 1}</strong><Form.Item name={[field.name, 'businessObject']} rules={[{ required: true, message: `请选择${config.relationLabel.replace('选择', '')}` }]}><Select aria-label={`A${actionIndex + 1} ${config.relationLabel}`} placeholder={config.relationPlaceholder} options={config.relationOptions.map(value => ({ value, label: value }))} /></Form.Item><Form.Item name={[field.name, 'title']} rules={[{ required: true, whitespace: true, message: '请输入动作描述' }]}><Input.TextArea aria-label={`A${actionIndex + 1} 动作描述`} placeholder="输入具体行动" autoSize={{ minRows: 2, maxRows: 4 }} maxLength={2000} /></Form.Item>{config.resultOptions ? <Form.Item name={[field.name, 'milestone']} rules={[{ required: true, message: '请选择节点' }]}><Select aria-label={`A${actionIndex + 1} ${config.resultLabel}`} placeholder={config.resultPlaceholder} options={config.resultOptions.map(value => ({ value, label: value }))} /></Form.Item> : <Form.Item name={[field.name, 'measurableResult']} rules={[{ required: true, whitespace: true, message: '请输入可衡量结果' }]}><Input.TextArea aria-label={`A${actionIndex + 1} 可衡量结果`} placeholder={config.resultPlaceholder} autoSize={{ minRows: 2, maxRows: 4 }} maxLength={1000} /></Form.Item>}<Form.Item name={[field.name, 'deadline']} rules={[{ required: true, message: '请选择完成时间' }]}><DatePicker aria-label={`A${actionIndex + 1} 完成时间`} className="w-full" /></Form.Item><Form.Item name={[field.name, 'weight']} rules={[{ required: true, type: 'number', min: 1, max: 100, message: '请输入 1-100 的权重' }]}><InputNumber aria-label={`A${actionIndex + 1} 权重`} min={1} max={100} precision={0} suffix="%" /></Form.Item><Button danger type="text" aria-label={`删除 A${actionIndex + 1}`} title="删除行动" icon={<TrashIcon />} onClick={() => remove(field.name)} /></div>)}{fields.length === 0 && <div className="okr-action-table-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未添加行动" /></div>}</div></>}</Form.List></div>}</>}
      </Card>;
    })}</Flex></Form>}
  </div></Card>;
}
