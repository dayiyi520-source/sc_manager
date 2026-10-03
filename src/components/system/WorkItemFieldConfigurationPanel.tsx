import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, DatePicker, Empty, Input, InputNumber, Rate, Select, Spin, Table, Tabs, message } from 'antd';
import { HolderOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { productRepository, type WorkItemCategoryDefinition, type WorkItemFieldConfiguration, type WorkItemFieldScene } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';

const FIELD_TYPE_LABELS: Record<string, string> = { text: '文本', user: '单选用户', multiUser: '多选用户', date: '日期', select: '单选列表', relation: '单选列表', number: '数值', star: '星标', autoNumber: '自动数值', section: '关系区' };
const FIELD_TYPE_OVERRIDES: Record<string, string> = {
  status: '单选列表', taskType: '单选列表', priority: '单选列表', severity: '单选列表', type: '单选列表', env: '单选列表',
  assignee: '单选用户', creator: '单选用户', owner: '单选用户', productLine: '单选列表',
  participants: '多选用户', cc: '多选用户', value: '星标', workload: '星标', effort: '星标', actualHours: '自动数值',
};
const FIELD_CONTROL_TYPES: Record<string, string> = {
  status: 'select', taskType: 'select', priority: 'select', severity: 'select', type: 'select', env: 'select', productLine: 'relation',
  assignee: 'user', creator: 'user', owner: 'user', participants: 'multiUser', cc: 'multiUser',
  plannedStartDate: 'date', plannedEndDate: 'date', expectedCompleteDate: 'date', createdAt: 'date', updatedAt: 'date',
  estimatedHours: 'number', actualHours: 'number', value: 'star', workload: 'star', effort: 'star',
};
const DEFAULT_SELECT_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  status: ['未设置', '待处理', '处理中', '已完成'].map((value) => ({ value, label: value })),
  priority: ['低', '中', '高', '紧急'].map((value) => ({ value, label: value })),
  severity: ['低', '中', '高'].map((value) => ({ value, label: value })),
  type: ['功能问题', '数据问题', '性能问题', '其他'].map((value) => ({ value, label: value })),
  env: ['开发环境', '测试环境', '预发布环境', '生产环境'].map((value) => ({ value, label: value })),
  taskType: ['产品任务', '设计任务', '研发任务', '测试任务'].map((value) => ({ value, label: value })),
};

const SCENES: Array<{ key: WorkItemFieldScene; label: string }> = [
  { key: 'CREATE', label: '新建任务字段' }, { key: 'CREATE_CHILD', label: '新建子任务字段' },
  { key: 'LIST', label: '列表字段' }, { key: 'ITERATION', label: '迭代任务字段' }, { key: 'DETAIL', label: '详情页字段' }
];
const CATEGORY_ORDER = ['requirement', 'design', 'dev', 'test', 'bug'];
const CATEGORY_LABELS: Record<string, string> = { requirement: '产品任务', design: '设计任务', dev: '研发任务', test: '测试任务', bug: '缺陷任务' };
const LEFT_FIXED_FIELDS = new Set(['title', 'creator', 'createdAt', 'updater', 'updatedAt', 'expectedGoal', 'description']);
const LEFT_RELATION_FIELDS = new Set(['relations', 'children', 'support', 'hours']);
const LEGACY_FIELD_CODES = new Set(['requirement']);

export const WorkItemFieldConfigurationPanel: React.FC<{ categories: WorkItemCategoryDefinition[] }> = ({ categories }) => {
  const enabled = useMemo(() => CATEGORY_ORDER
    .map((code) => categories.find((item) => item.code === code))
    .filter((item): item is WorkItemCategoryDefinition => Boolean(item?.enabled))
    .map((item) => ({ ...item, displayName: CATEGORY_LABELS[item.code] || item.displayName })), [categories]);
  const [category, setCategory] = useState(enabled[0]?.code || 'requirement');
  const [scene, setScene] = useState<WorkItemFieldScene>('CREATE');
  const [fields, setFields] = useState<WorkItemFieldConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggingCode, setDraggingCode] = useState<string | null>(null);
  const [dragOverCode, setDragOverCode] = useState<string | null>(null);
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ value: string; label: string }>>([]);
  const load = async (code = category) => { setLoading(true); try { const result = await productRepository.workItemFieldConfigurations(code); setFields([...(result.scenes.find((item) => item.scene === scene)?.fields || [])].filter((field) => !LEGACY_FIELD_CODES.has(field.fieldCode)).sort((a, b) => a.sort - b.sort)); } catch (error) { message.error(error instanceof Error ? error.message : '字段配置读取失败'); } finally { setLoading(false); } };
  useEffect(() => { if (!enabled.some((item) => item.code === category)) setCategory(enabled[0]?.code || 'requirement'); }, [enabled, category]);
  useEffect(() => { void teamRepository.options().then((items) => setEmployeeOptions(items.map((item) => ({ value: item.name, label: item.name })))).catch(() => setEmployeeOptions([])); }, []);
  useEffect(() => { void load(); }, [category, scene]);
  const update = (fieldCode: string, patch: Partial<WorkItemFieldConfiguration>) => setFields((current) => current.map((field) => field.fieldCode === fieldCode ? { ...field, ...patch, ...(patch.visible === false ? { required: false } : {}) } : field));
  const groupOf = (field: WorkItemFieldConfiguration) => LEFT_FIXED_FIELDS.has(field.fieldCode) ? 'left-fixed' : LEFT_RELATION_FIELDS.has(field.fieldCode) ? 'left-relations' : 'right';
  const groupedFields = useMemo(() => ({
    leftFixed: fields.filter((field) => groupOf(field) === 'left-fixed').sort((a, b) => a.sort - b.sort),
    leftRelations: fields.filter((field) => groupOf(field) === 'left-relations').sort((a, b) => a.sort - b.sort),
    right: fields.filter((field) => groupOf(field) === 'right').sort((a, b) => a.sort - b.sort),
  }), [fields]);
  const reorder = (sourceCode: string, targetCode: string) => setFields((current) => {
    const source = current.find((field) => field.fieldCode === sourceCode);
    const target = current.find((field) => field.fieldCode === targetCode);
    if (!source || !target || groupOf(source) !== groupOf(target)) return current;
    const group = current.filter((field) => groupOf(field) === groupOf(source)).sort((a, b) => a.sort - b.sort);
    const sourceIndex = group.findIndex((field) => field.fieldCode === sourceCode);
    const targetIndex = group.findIndex((field) => field.fieldCode === targetCode);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
    const [moved] = group.splice(sourceIndex, 1);
    group.splice(targetIndex, 0, moved);
    const order = new Map(group.map((field, index) => [field.fieldCode, index + 1]));
    return current.map((field) => order.has(field.fieldCode) ? { ...field, sort: order.get(field.fieldCode)! } : field);
  });
  const save = async () => { setSaving(true); try {
    const ordered = [...groupedFields.leftFixed, ...groupedFields.leftRelations, ...groupedFields.right].map((field, index) => ({ ...field, sort: index + 1 }));
    await productRepository.saveWorkItemFieldConfigurations(category, scene, ordered);
    setFields(ordered);
    message.success('字段配置已保存');
  } catch (error) { message.error(error instanceof Error ? error.message : '字段配置保存失败'); } finally { setSaving(false); } };
  const fieldTypeLabel = (field: WorkItemFieldConfiguration) => FIELD_TYPE_OVERRIDES[field.fieldCode] || FIELD_TYPE_LABELS[field.fieldType] || field.fieldType;
  const fieldControlType = (field: WorkItemFieldConfiguration) => FIELD_CONTROL_TYPES[field.fieldCode] || field.fieldType;
  const defaultValue = (field: WorkItemFieldConfiguration) => {
    if (scene === 'DETAIL' || field.locked || field.editable === false) return <span className="text-[var(--text-muted)]">--</span>;
    const value = field.defaultValue == null ? undefined : field.defaultValue;
    switch (fieldControlType(field)) {
      case 'select':
      case 'relation':
        return <Select size="small" className="w-36" allowClear value={typeof value === 'string' ? value : undefined} options={DEFAULT_SELECT_OPTIONS[field.fieldCode] || []} onChange={(next) => update(field.fieldCode, { defaultValue: next ?? null })} placeholder="请选择" />;
      case 'user':
        return <Select size="small" className="w-36" allowClear showSearch optionFilterProp="label" value={typeof value === 'string' ? value : undefined} options={employeeOptions} onChange={(next) => update(field.fieldCode, { defaultValue: next ?? null })} placeholder="请选择人员" />;
      case 'multiUser':
        return <Select size="small" className="w-36" mode="multiple" allowClear showSearch optionFilterProp="label" value={Array.isArray(value) ? value : []} options={employeeOptions} onChange={(next) => update(field.fieldCode, { defaultValue: next.length ? next : null })} placeholder="请选择人员" />;
      case 'date':
        return <DatePicker size="small" className="w-36" value={typeof value === 'string' && value ? dayjs(value) : null} onChange={(_, dateString) => update(field.fieldCode, { defaultValue: dateString || null })} placeholder="请选择日期" />;
      case 'number':
        return <InputNumber size="small" className="w-28" value={typeof value === 'number' ? value : undefined} onChange={(next) => update(field.fieldCode, { defaultValue: next ?? null })} placeholder="请输入数值" />;
      case 'star':
        return <Rate className="text-sm" count={5} value={typeof value === 'number' ? value : 0} onChange={(next) => update(field.fieldCode, { defaultValue: next || null })} />;
      default:
        return <Input size="small" className="w-36" value={value == null ? '' : String(value)} onChange={(event) => update(field.fieldCode, { defaultValue: event.target.value || null })} placeholder="请输入默认值" />;
    }
  };
  const columns = (draggable: boolean) => [
    { title: '排序', key: 'sort', width: 56, render: (_: unknown, field: WorkItemFieldConfiguration) => draggable ? <button type="button" draggable aria-label={`拖动调整${field.label}顺序`} title="拖动调整顺序" className="inline-flex h-8 w-8 cursor-grab items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] active:cursor-grabbing" onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDraggingCode(field.fieldCode); }} onDragEnd={() => { setDraggingCode(null); setDragOverCode(null); }}><HolderOutlined /></button> : <span className="text-[var(--text-muted)]">—</span> },
    { title: '字段', dataIndex: 'label', render: (value: string, field: WorkItemFieldConfiguration) => <span className="font-medium">{value}{field.locked && <span className="ml-2 text-[var(--text-muted)]">系统</span>}</span> },
    { title: '类型', dataIndex: 'fieldType', render: (_: string, field: WorkItemFieldConfiguration) => fieldTypeLabel(field) },
    { title: '用途', dataIndex: 'description', render: (value: string) => <span className="text-[var(--text-muted)]">{value || '用于当前详情页展示和编辑'}</span> },
    { title: '默认值', key: 'defaultValue', render: (_: unknown, field: WorkItemFieldConfiguration) => defaultValue(field) },
    { title: '显示', dataIndex: 'visible', render: (value: boolean, field: WorkItemFieldConfiguration) => <Checkbox checked={value} disabled={field.locked} onChange={(event) => update(field.fieldCode, { visible: event.target.checked })} /> },
    ...(scene === 'DETAIL' ? [{ title: '可编辑', dataIndex: 'editable', render: (value: boolean, field: WorkItemFieldConfiguration) => <Checkbox checked={value !== false} disabled={field.locked || !field.visible} onChange={(event) => update(field.fieldCode, { editable: event.target.checked })} /> }] : [{ title: '必填', dataIndex: 'required', render: (value: boolean, field: WorkItemFieldConfiguration) => <Checkbox checked={field.locked || value} disabled={field.locked || !field.visible || scene === 'LIST' || scene === 'ITERATION'} onChange={(event) => update(field.fieldCode, { required: event.target.checked })} /> }])
  ];
  const table = (title: string, rows: WorkItemFieldConfiguration[], draggable: boolean) => rows.length ? <section className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-3"><div className="mb-2 flex items-center justify-between"><h5 className="font-semibold text-[var(--text-primary)]">{title}</h5><span className="text-xs text-[var(--text-muted)]">{draggable ? '仅支持本组内排序' : '固定顺序'}</span></div><Table rowKey="fieldCode" columns={columns(draggable)} dataSource={rows} pagination={false} scroll={{ x: 980 }} className="responsive-config-table" onRow={(field) => ({ onDragOver: (event) => { event.preventDefault(); if (draggable && draggingCode && draggingCode !== field.fieldCode && groupOf(fields.find((item) => item.fieldCode === draggingCode) || field) === groupOf(field)) setDragOverCode(field.fieldCode); }, onDragLeave: () => setDragOverCode((current) => current === field.fieldCode ? null : current), onDrop: () => { if (draggable && draggingCode) reorder(draggingCode, field.fieldCode); setDraggingCode(null); setDragOverCode(null); }, className: dragOverCode === field.fieldCode ? 'bg-[var(--surface-hover)]' : undefined })} /></section> : null;
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-bold text-[var(--text-primary)]">工作项字段</h4><p className="mt-1 text-[var(--text-muted)]">左侧固定内容、左侧关联项、右侧基础字段分组管理；排序只在同一分组内生效。</p></div><div className="flex gap-2"><Button icon={<ReloadOutlined />} onClick={() => void load()} disabled={loading}>刷新</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void save()}>保存当前场景</Button></div></div><Tabs activeKey={category} onChange={setCategory} items={enabled.map((item) => ({ key: item.code, label: item.displayName }))} /><Tabs activeKey={scene} onChange={(key) => setScene(key as WorkItemFieldScene)} items={SCENES.map((item) => ({ key: item.key, label: item.label }))} />{loading ? <div className="py-12 text-center"><Spin /></div> : fields.length ? <div className="space-y-4">{table('左侧内容字段', groupedFields.leftFixed, false)}{table('左侧关联项', groupedFields.leftRelations, true)}{table('右侧基础字段', groupedFields.right, true)}</div> : <Empty description="暂无字段配置" />}</div>;
};
