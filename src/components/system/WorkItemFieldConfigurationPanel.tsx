import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Empty, Spin, Table, Tabs, message } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { productRepository, type WorkItemCategoryDefinition, type WorkItemFieldConfiguration, type WorkItemFieldScene } from '../../services/productRepository';

const FIELD_TYPE_LABELS: Record<string, string> = { text: '文本', user: '人员', date: '日期', select: '单选', relation: '关联对象', number: '数字', section: '关系区' };

const SCENES: Array<{ key: WorkItemFieldScene; label: string }> = [
  { key: 'CREATE', label: '新建任务字段' }, { key: 'CREATE_CHILD', label: '新建子任务字段' },
  { key: 'LIST', label: '列表字段' }, { key: 'ITERATION', label: '迭代任务字段' }, { key: 'DETAIL', label: '详情页字段' }
];
const CATEGORY_ORDER = ['requirement', 'design', 'dev', 'test', 'bug'];
const CATEGORY_LABELS: Record<string, string> = { requirement: '产品任务', design: '设计任务', dev: '研发任务', test: '测试任务', bug: '缺陷任务' };

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
  const load = async (code = category) => { setLoading(true); try { const result = await productRepository.workItemFieldConfigurations(code); setFields(result.scenes.find((item) => item.scene === scene)?.fields || []); } catch (error) { message.error(error instanceof Error ? error.message : '字段配置读取失败'); } finally { setLoading(false); } };
  useEffect(() => { if (!enabled.some((item) => item.code === category)) setCategory(enabled[0]?.code || 'requirement'); }, [enabled, category]);
  useEffect(() => { void load(); }, [category, scene]);
  const update = (fieldCode: string, patch: Partial<WorkItemFieldConfiguration>) => setFields((current) => current.map((field) => field.fieldCode === fieldCode ? { ...field, ...patch, ...(patch.visible === false ? { required: false } : {}) } : field));
  const save = async () => { setSaving(true); try { await productRepository.saveWorkItemFieldConfigurations(category, scene, fields); message.success('字段配置已保存'); } catch (error) { message.error(error instanceof Error ? error.message : '字段配置保存失败'); } finally { setSaving(false); } };
  const columns = [
    { title: '字段', dataIndex: 'label', render: (value: string, field: WorkItemFieldConfiguration) => <span className="font-medium">{value}{field.locked && <span className="ml-2 text-[var(--text-muted)]">系统</span>}</span> },
    { title: '类型', dataIndex: 'fieldType', render: (value: string) => FIELD_TYPE_LABELS[value] || value },
    { title: '用途', dataIndex: 'description', render: (value: string) => <span className="text-[var(--text-muted)]">{value || '用于当前详情页展示和编辑'}</span> },
    { title: '显示', dataIndex: 'visible', render: (value: boolean, field: WorkItemFieldConfiguration) => <Checkbox checked={value} disabled={field.locked} onChange={(event) => update(field.fieldCode, { visible: event.target.checked })} /> },
    ...(scene === 'DETAIL' ? [{ title: '可编辑', dataIndex: 'editable', render: (value: boolean, field: WorkItemFieldConfiguration) => <Checkbox checked={value !== false} disabled={field.locked || !field.visible} onChange={(event) => update(field.fieldCode, { editable: event.target.checked })} /> }] : [{ title: '必填', dataIndex: 'required', render: (value: boolean, field: WorkItemFieldConfiguration) => <Checkbox checked={field.locked || value} disabled={field.locked || !field.visible || scene === 'LIST' || scene === 'ITERATION'} onChange={(event) => update(field.fieldCode, { required: event.target.checked })} /> }])
  ];
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-bold text-[var(--text-primary)]">工作项字段</h4><p className="mt-1 text-[var(--text-muted)]">按工作项分类和使用场景配置字段显示；新建场景控制必填，详情页控制是否可编辑。</p></div><div className="flex gap-2"><Button icon={<ReloadOutlined />} onClick={() => void load()} disabled={loading}>刷新</Button><Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void save()}>保存当前场景</Button></div></div><Tabs activeKey={category} onChange={setCategory} items={enabled.map((item) => ({ key: item.code, label: item.displayName }))} /><Tabs activeKey={scene} onChange={(key) => setScene(key as WorkItemFieldScene)} items={SCENES.map((item) => ({ key: item.key, label: item.label }))} />{loading ? <div className="py-12 text-center"><Spin /></div> : fields.length ? <Table rowKey="fieldCode" columns={columns} dataSource={fields} pagination={false} scroll={{ x: 560 }} className="responsive-config-table" /> : <Empty description="暂无字段配置" />}</div>;
};
