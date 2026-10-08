import React, { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Input, Modal, Select, Switch, Tabs, Tag, message } from 'antd';
import { ApartmentOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { ProductLineWorkItemCategory } from '../../types';
import { productRepository, WorkItemCategoryKey, WorkItemTemplateType, type WorkItemCategoryDefinition } from '../../services/productRepository';
import { CATEGORY_KEYS, buildWorkflowDefinition, createDefaultWorkItemStates, EditableWorkflowState, validateWorkflowStates, WorkItemStateEditor } from '../product/WorkItemStateConfigDrawer';
import { categoryValue, enabledCategoryOptions } from '../../utils/workItemCategories';

const CATEGORY_CODE: Record<ProductLineWorkItemCategory, WorkItemCategoryKey> = { 需求: 'requirement', 设计: 'design', 研发: 'dev', 测试: 'test', 缺陷: 'bug', 用例: 'case' };
const categoryKey = (category: ProductLineWorkItemCategory) => CATEGORY_KEYS[category] || CATEGORY_CODE[category as keyof typeof CATEGORY_CODE] || category;
const normalizeStates = (item: WorkItemTemplateType | null): EditableWorkflowState[] => {
  const states = item?.workflow?.definition?.states;
  if (!states?.length) return createDefaultWorkItemStates(categoryKey(item?.category || '需求'));
  const initial = states.some((state) => state.initial);
  return states.map((state, index) => ({ ...state, key: String(state.key), name: String(state.name || ''), group: state.group as EditableWorkflowState['group'], initial: initial ? Boolean(state.initial) : index === 0, successful: state.group === 'COMPLETED', enabled: state.enabled !== false, stage: String(state.stage || categoryKey(item?.category || '需求')), color: state.color as EditableWorkflowState['color'] }));
};

export const WorkItemModuleView: React.FC = () => {
  const [items, setItems] = useState<WorkItemTemplateType[]>([]);
  const [categories, setCategories] = useState<WorkItemCategoryDefinition[]>([]);
  const [category, setCategory] = useState<ProductLineWorkItemCategory>('需求');
  const [createCategory, setCreateCategory] = useState<ProductLineWorkItemCategory>('需求');
  const [editing, setEditing] = useState<WorkItemTemplateType | null>(null);
  const [stateItem, setStateItem] = useState<WorkItemTemplateType | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [states, setStates] = useState<EditableWorkflowState[]>(createDefaultWorkItemStates('requirement'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const categoryOptions = useMemo(() => categories.slice().sort((a, b) => a.sort - b.sort).map((item) => ({ value: categoryValue(item.code), label: item.displayName, enabled: item.enabled })), [categories]);
  const selectedDefinition = categories.find((item) => item.code === category || item.name === category || item.displayName === category);
  const categoryCode = selectedDefinition?.code || CATEGORY_CODE[category as keyof typeof CATEGORY_CODE] || category;
  const visible = useMemo(() => items.filter((item) => item.category === category || item.category === selectedDefinition?.name || item.category === selectedDefinition?.displayName || item.category === categoryCode), [items, category, selectedDefinition, categoryCode]);
  const load = async () => {
    setLoading(true);
    try { const [nextItems, nextCategories] = await Promise.all([productRepository.workItemTemplate(), productRepository.workItemCategories()]); setItems(nextItems); setCategories(nextCategories); const options = enabledCategoryOptions(nextCategories); if (!options.some((item) => item.value === category)) setCategory(options[0]?.value || '需求'); setLoadError(false); }
    catch (error) { setLoadError(true); message.error(error instanceof Error ? error.message : '工作项模板读取失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const openCreate = () => { const selected = categoryOptions.find((item) => item.value === category)?.enabled ? category : categoryOptions.find((item) => item.enabled)?.value || category; setCreateCategory(selected); setEditing(null); setName(''); setDescription(''); setEnabled(true); setIsDefault(false); setStates(createDefaultWorkItemStates(categoryKey(selected))); setOpen(true); };
  const openEdit = (item: WorkItemTemplateType) => { setEditing(item); setName(item.name); setDescription(item.description || ''); setEnabled(item.enabled !== false); setIsDefault(Boolean(item.isDefault)); setStates(normalizeStates(item)); setOpen(true); };
  const save = async () => {
    if (saving) return;
    if (!name.trim()) { message.warning('请输入类型名称'); return; }
    if (!editing) { const invalid = validateWorkflowStates(states); if (invalid) { message.warning(invalid); return; } }
    setSaving(true);
    try {
      if (editing) await productRepository.updateWorkItemTemplateType(editing.id, { name: name.trim(), description, enabled, isDefault: enabled && isDefault });
      else { const apiCategory = categoryKey(createCategory); const definition = buildWorkflowDefinition(states.map((state) => ({ ...state, name: state.name.trim(), stage: apiCategory }))); await productRepository.createWorkItemTemplateType({ category: createCategory, name: name.trim(), description, enabled, isDefault: enabled && isDefault, workflow: { category: apiCategory, name: `${name.trim()}状态配置`, definition } }); }
      message.success(editing ? '模板已保存' : '类型已创建'); setOpen(false); await load();
    } catch (error) { message.error(error instanceof Error ? error.message : '保存失败'); }
    finally { setSaving(false); }
  };
  const saveStates = async () => {
    if (!stateItem || saving) return;
    const invalid = validateWorkflowStates(states); if (invalid) { message.warning(invalid); return; }
    setSaving(true);
    try { const apiCategory = categoryKey(stateItem.category); const definition = buildWorkflowDefinition(states.map((state) => ({ ...state, name: state.name.trim(), stage: apiCategory }))); await productRepository.updateWorkItemTemplateWorkflow(stateItem.id, { category: apiCategory, name: `${stateItem.name}状态配置`, definition, revision: stateItem.workflow?.revision }); message.success('状态配置已保存'); setStateItem(null); await load(); }
    catch (error) { message.error(error instanceof Error ? error.message : '保存失败'); }
    finally { setSaving(false); }
  };
  const toggle = async (item: WorkItemTemplateType, checked: boolean) => { setSaving(true); try { await productRepository.updateWorkItemTemplateType(item.id, { enabled: checked }); await load(); } catch (error) { message.error(error instanceof Error ? error.message : '状态更新失败'); } finally { setSaving(false); } };
  const remove = (item: WorkItemTemplateType) => Modal.confirm({ title: `删除「${item.name}」？`, content: '删除后新建产品不会再继承该类型，已有产品不受影响。', okButtonProps: { danger: true }, onOk: async () => { try { await productRepository.deleteWorkItemTemplateType(item.id); message.success('类型已删除'); await load(); } catch (error) { message.error(error instanceof Error ? error.message : '删除失败'); throw error; } } });

  return <div className="mx-auto w-full max-w-4xl space-y-4 text-xs">
    <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">工作项设置</h3><p className="mt-1 text-[var(--text-muted)]">按工作项分类维护类型名称、描述和启用状态。</p></div><Button type="primary" icon={<PlusOutlined />} disabled={loading || saving || !categoryOptions.some((item) => item.enabled)} onClick={openCreate}>新增类型</Button></div>
    <Tabs className="work-item-template-tabs" activeKey={category} onChange={(value) => setCategory(value as ProductLineWorkItemCategory)} items={categoryOptions.map((option) => ({ key: option.value, label: <span>{option.label} <span>{items.filter((item) => item.category === option.value || item.category === option.label).length}</span></span> }))} />
    <div className="overflow-x-auto rounded-md border border-[var(--border-main)]" aria-busy={loading}><div className="min-w-[820px]"><div className="grid grid-cols-[minmax(150px,1fr)_minmax(180px,1.6fr)_120px_150px_100px_96px] items-center gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-3 text-[11px] text-[var(--text-muted)]"><span>类型名称</span><span>描述</span><span>添加人</span><span>添加时间</span><span>是否启用</span><span className="text-right">操作</span></div>{loading ? <div className="px-3 py-10 text-center text-[var(--text-muted)]">正在读取...</div> : loadError ? <div className="px-3 py-10 text-center text-[var(--text-muted)]">读取失败 <Button type="link" onClick={() => void load()}>重试</Button></div> : visible.length ? visible.map((item) => <div key={item.id} className="grid grid-cols-[minmax(150px,1fr)_minmax(180px,1.6fr)_120px_150px_100px_96px] items-center gap-3 border-b border-[var(--border-main)] px-3 py-3 last:border-b-0"><span className="flex min-w-0 items-center gap-2 font-medium text-[var(--text-primary)]" title={item.name}><span className="truncate">{item.name}</span>{item.isDefault && <Tag color="blue">默认</Tag>}</span><span className="truncate text-[var(--text-body)]" title={item.description}>{item.description || '暂无描述'}</span><span className="truncate text-[var(--text-body)]">{item.creatorName || '暂无'}</span><span className="text-[var(--text-muted)]">{item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false }) : '暂无'}</span><Switch className="product-line-switch justify-self-start" checked={item.enabled !== false} disabled={saving} onChange={(checked) => void toggle(item, checked)} /><span className="flex justify-end gap-1"><Button type="text" aria-label={`配置${item.name}状态`} title="状态配置" icon={<ApartmentOutlined />} onClick={() => { setStateItem(item); setStates(normalizeStates(item)); }} /><Button type="text" aria-label={`修改${item.name}`} title={`修改${item.name}`} icon={<EditOutlined />} onClick={() => openEdit(item)} /><Button type="text" danger aria-label={`删除${item.name}`} title={`删除${item.name}`} icon={<DeleteOutlined />} onClick={() => remove(item)} /></span></div>) : <div className="px-3 py-10 text-center text-[var(--text-muted)]">暂无{category}工作项类型，点击右上角“新增类型”添加</div>}</div></div>
    <Drawer width={editing ? 560 : 840} open={open} onClose={() => setOpen(false)} title={editing ? '修改工作项类型' : '新增工作项类型'} footer={<div className="flex justify-end gap-2"><Button onClick={() => setOpen(false)}>取消</Button><Button type="primary" loading={saving} onClick={() => void save()}>{editing ? '保存修改' : '创建并发布'}</Button></div>}><div className="space-y-5 text-xs"><section className="space-y-4"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">基本信息</h3><p className="mt-1 text-[var(--text-muted)]">设置子类型的名称、分类和启用状态。</p></div><label className="flex flex-col gap-1 font-medium text-[var(--text-body)]"><span>类型分类</span><Select disabled={Boolean(editing)} value={editing?.category || createCategory} onChange={(value: ProductLineWorkItemCategory) => { setCreateCategory(value); setStates(createDefaultWorkItemStates(categoryKey(value))); }} options={categoryOptions.filter((item) => item.enabled)} /></label><label className="flex flex-col gap-1 font-medium text-[var(--text-body)]"><span>类型名称 *</span><Input maxLength={128} value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入类型名称" /></label><label className="flex flex-col gap-1 font-medium text-[var(--text-body)]"><span>描述</span><Input.TextArea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="请输入类型描述" /></label><div className="flex items-center justify-between"><div><div className="font-medium text-[var(--text-body)]">是否启用</div><p className="mt-1 text-[11px] text-[var(--text-muted)]">停用后不能新建该类型的工作项。</p></div><Switch className="product-line-switch" checked={enabled} onChange={setEnabled} /></div><div className="flex items-center justify-between"><div><div className="font-medium text-[var(--text-body)]">是否默认</div><p className="mt-1 text-[11px] text-[var(--text-muted)]">设为默认后，新建该分类任务时优先选择此类型。</p></div><Switch aria-label="是否默认" className="product-line-switch" checked={isDefault} disabled={!enabled} onChange={setIsDefault} /></div></section>{!editing && <section className="space-y-4 border-t border-[var(--border-main)] pt-5"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">初始化状态</h3><p className="mt-1 text-[var(--text-muted)]">状态名称可自定义，每个状态必须归属未开始、进行中、已完成或已取消。</p></div><WorkItemStateEditor states={states} category={categoryKey(createCategory)} onChange={setStates} /></section>}</div></Drawer>
    <Drawer width={840} open={Boolean(stateItem)} onClose={() => setStateItem(null)} title={stateItem ? `配置「${stateItem.name}」状态` : '状态配置'} footer={<div className="flex justify-end gap-2"><Button onClick={() => setStateItem(null)}>取消</Button><Button type="primary" loading={saving} onClick={() => void saveStates()}>保存配置</Button></div>}><div className="space-y-4 text-xs"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">状态与通用阶段</h3><p className="mt-1 text-[var(--text-muted)]">状态名称可自定义，通用阶段固定为未开始、进行中、已完成和已取消。</p></div><WorkItemStateEditor states={states} category={categoryKey(stateItem?.category || '需求')} onChange={setStates} /></div></Drawer>
  </div>;
};
