import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, InputNumber, Modal, Popconfirm, Select, Spin, Tabs } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkItemModuleView } from './WorkItemModuleView';
import { NotificationSettingsPanel } from '../product/NotificationSettingsPanel';
import { AutomationRulesPanel } from '../product/AutomationRulesPanel';
import { WorkItemCategoryPanel } from './WorkItemCategoryPanel';
import { WorkItemFieldConfigurationPanel } from './WorkItemFieldConfigurationPanel';
import { productRepository, type ArchivedProductLine, type ProductRoleTemplate, type ResearchStatusScope, type ResearchStatusTemplate, type WorkItemCategoryDefinition } from '../../services/productRepository';
import { useApp } from '../../context/AppContext';
import { WorkItemStateEditor, validateWorkflowStates, type EditableWorkflowState, type StateGroup } from '../product/WorkItemStateConfigDrawer';

type Section = 'dictionary' | 'work-items' | 'roles' | 'statuses' | 'notifications' | 'automation' | 'archive';
const SECTIONS: Array<{ id: Section; label: string }> = [
  { id: 'dictionary', label: '产研字典' }, { id: 'work-items', label: '工作项模板' },
  { id: 'roles', label: '角色与职责' }, { id: 'notifications', label: '通知与提醒' },
  { id: 'statuses', label: '产品与迭代状态' },
  { id: 'automation', label: '自动化配置' },
  { id: 'archive', label: '归档' }
];

const archiveDate = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
const ArchivePanel = () => {
  const { addToast } = useApp();
  const archivedQuery = useQuery({ queryKey: ['archived-product-lines'], queryFn: productRepository.archivedProductLines, retry: false });
  const [operatingId, setOperatingId] = useState('');
  const restore = async (item: ArchivedProductLine) => {
    setOperatingId(item.id);
    try {
      await productRepository.restoreProductLine(item.id);
      await archivedQuery.refetch();
      addToast('success', '产品已取消归档');
    } catch (error) {
      addToast('error', '取消归档失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setOperatingId('');
    }
  };
  const remove = async (item: ArchivedProductLine) => {
    setOperatingId(item.id);
    try {
      await productRepository.deleteProductLine(item.id);
      await archivedQuery.refetch();
      addToast('success', '归档产品已删除');
    } catch (error) {
      addToast('error', '产品删除失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setOperatingId('');
    }
  };
  const items = archivedQuery.data || [];
  return <div className="mx-auto w-full max-w-5xl space-y-4 text-xs"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">归档产品</h3><p className="mt-1 text-[var(--text-muted)]">统一查看已归档产品，并支持取消归档或删除。</p></div>{archivedQuery.isError && <Alert type="error" showIcon message="归档产品加载失败" description={archivedQuery.error instanceof Error ? archivedQuery.error.message : '请稍后重试。'} action={<Button onClick={() => archivedQuery.refetch()}>重试</Button>} />}{archivedQuery.isLoading ? <div className="flex min-h-40 items-center justify-center"><Spin /></div> : !archivedQuery.isError && <div className="overflow-x-auto rounded-md border border-[var(--border-main)]"><div className="min-w-[860px]"><div className="grid grid-cols-[minmax(160px,1.5fr)_140px_140px_180px_140px_150px] gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-3 text-[var(--text-muted)]"><span>产品名称</span><span>编号</span><span>负责人</span><span>归档时间</span><span>操作人</span><span className="text-right">操作</span></div>{items.map((item) => <div key={item.id} className="grid grid-cols-[minmax(160px,1.5fr)_140px_140px_180px_140px_150px] items-center gap-3 border-b border-[var(--border-main)] px-4 py-3 last:border-0"><span className="truncate font-medium text-[var(--text-primary)]" title={item.name}>{item.name}</span><span className="truncate font-mono text-[var(--text-body)]" title={item.code}>{item.code}</span><span className="truncate text-[var(--text-body)]" title={item.ownerName || '未设置'}>{item.ownerName || '未设置'}</span><span className="text-[var(--text-muted)]">{archiveDate(item.archivedAt)}</span><span className="truncate text-[var(--text-body)]" title={item.archivedByName || '未记录'}>{item.archivedByName || '未记录'}</span><span className="flex justify-end gap-1"><Popconfirm title="取消归档" description={`确定恢复“${item.name}”吗？`} okText="取消归档" cancelText="返回" onConfirm={() => restore(item)}><Button type="link" size="small" loading={operatingId === item.id} icon={<UndoOutlined />}>取消归档</Button></Popconfirm><Popconfirm title="删除归档产品" description={`确定删除“${item.name}”吗？删除后无法从界面恢复。`} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => remove(item)}><Button type="link" danger size="small" loading={operatingId === item.id} icon={<DeleteOutlined />}>删除</Button></Popconfirm></span></div>)}{items.length === 0 && <div className="px-4 py-10 text-center text-[var(--text-muted)]">暂无已归档产品</div>}</div></div>}</div>;
};
const DictionaryPanel = () => {
  const [tab, setTab] = useState<'fields' | 'categories'>('fields');
  const [categories, setCategories] = useState<WorkItemCategoryDefinition[]>([]);
  useEffect(() => { void productRepository.workItemCategories().then(setCategories).catch(() => undefined); }, []);
  return <div className="mx-auto w-full max-w-5xl space-y-5 text-xs">
    <div><h3 className="text-sm font-bold text-[var(--text-primary)]">产研字典</h3><p className="mt-1 text-[var(--text-muted)]">字段结构为只读概览；工作项分类可统一维护显示名称、图标和启用状态。</p></div>
    <Tabs activeKey={tab} onChange={(key) => setTab(key as 'fields' | 'categories')} items={[{ key: 'fields', label: '工作项字段', children: <WorkItemFieldConfigurationPanel categories={categories} /> }, { key: 'categories', label: '工作项分类', children: <WorkItemCategoryPanel /> }]} />
  </div>;
};
const RolesPanel = () => {
  const { addToast } = useApp();
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({ queryKey: ['product-role-templates'], queryFn: productRepository.productRoleTemplates, retry: false });
  const [editing, setEditing] = useState<ProductRoleTemplate | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [responsibility, setResponsibility] = useState('');
  const [sort, setSort] = useState<number | null>(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');

  const openCreate = () => { setEditing(null); setName(''); setResponsibility(''); setSort(0); setModalOpen(true); };
  const openEdit = (role: ProductRoleTemplate) => { setEditing(role); setName(role.name); setResponsibility(role.responsibility); setSort(role.sort); setModalOpen(true); };
  const closeModal = () => { if (!saving) setModalOpen(false); };
  const refreshRoles = async () => { await queryClient.invalidateQueries({ queryKey: ['product-role-templates'] }); };

  const save = async () => {
    if (!name.trim() || !responsibility.trim()) {
      addToast('warning', '请填写角色名称和职责');
      return;
    }
    if (sort === null || !Number.isInteger(sort) || sort < 0 || sort > 999) {
      addToast('warning', '排序请输入0到999的整数');
      return;
    }
    setSaving(true);
    try {
      if (editing) await productRepository.updateProductRoleTemplate(editing.id, { name: name.trim(), responsibility: responsibility.trim(), sort, revision: editing.revision });
      else await productRepository.createProductRoleTemplate({ name: name.trim(), responsibility: responsibility.trim(), sort });
      await refreshRoles();
      setModalOpen(false);
      addToast('success', editing ? '角色已更新' : '角色已创建');
    } catch (error) {
      addToast('error', editing ? '角色更新失败' : '角色创建失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (role: ProductRoleTemplate) => {
    setDeletingId(role.id);
    try {
      await productRepository.deleteProductRoleTemplate(role.id, role.revision);
      await refreshRoles();
      addToast('success', '角色已删除');
    } catch (error) {
      addToast('error', '角色删除失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setDeletingId('');
    }
  };

  return <div className="mx-auto w-full max-w-4xl space-y-4 text-xs">
    <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">角色与职责</h3><p className="mt-1 text-[var(--text-muted)]">统一维护产品成员可选择的角色及职责。</p></div><Button type="primary" className="!h-9" icon={<PlusOutlined />} onClick={openCreate}>新建角色</Button></div>
    {rolesQuery.isError && <Alert type="error" showIcon message="角色加载失败" description="现有角色暂时无法查看，请稍后重试。" action={<Button onClick={() => rolesQuery.refetch()}>重试</Button>} />}
    {rolesQuery.isLoading ? <div className="flex min-h-40 items-center justify-center"><Spin /></div> : !rolesQuery.isError && <div className="overflow-x-auto rounded-md border border-[var(--border-main)]"><div className="min-w-[640px]">
      <div className="grid grid-cols-[minmax(130px,1fr)_minmax(200px,2fr)_72px_120px] gap-4 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-3 text-[var(--text-muted)]"><span>角色</span><span>职责</span><span>排序</span><span className="text-right">操作</span></div>
      {(rolesQuery.data || []).map((role) => <div key={role.id} className="grid grid-cols-[minmax(130px,1fr)_minmax(200px,2fr)_72px_120px] items-center gap-4 border-b border-[var(--border-main)] px-4 py-3 last:border-0"><span className="font-medium text-[var(--text-primary)]">{role.name}</span><span className="min-w-0 break-words text-[var(--text-body)]">{role.responsibility}</span><span>{role.sort}</span><span className="flex justify-end gap-1"><Button type="text" icon={<EditOutlined />} aria-label={`编辑角色 ${role.name}`} title="编辑角色" onClick={() => openEdit(role)} /><Popconfirm title="删除角色" description={`确定删除“${role.name}”吗？`} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => remove(role)}><Button type="text" danger loading={deletingId === role.id} icon={<DeleteOutlined />} aria-label={`删除角色 ${role.name}`} title="删除角色" /></Popconfirm></span></div>)}
      {!rolesQuery.data?.length && <div className="px-4 py-10 text-center text-[var(--text-muted)]">暂无角色，请新建角色</div>}
    </div></div>}
    <Modal open={modalOpen} title={editing ? '编辑角色' : '新建角色'} onCancel={closeModal} onOk={save} okText="保存" cancelText="取消" confirmLoading={saving} destroyOnHidden>
      <div className="space-y-5 pb-8 pt-2 text-xs"><label className="block"><span className="mb-1 block text-[var(--text-body)]">角色名称 *</span><Input value={name} maxLength={32} showCount onChange={(event) => setName(event.target.value)} placeholder="请输入角色名称" /></label><label className="block"><span className="mb-1 block text-[var(--text-body)]">排序 *</span><InputNumber style={{ width: '100%' }} min={0} max={999} precision={0} value={sort} onChange={setSort} placeholder="0 最优先" /></label><label className="block"><span className="mb-1 block text-[var(--text-body)]">角色职责 *</span><Input.TextArea value={responsibility} maxLength={500} showCount rows={4} onChange={(event) => setResponsibility(event.target.value)} placeholder="请输入角色职责" /></label></div>
    </Modal>
  </div>;
};

const PHASE_TO_GROUP: Record<ResearchStatusTemplate['phase'], StateGroup> = { 待开始: 'NOT_STARTED', 处理中: 'IN_PROGRESS', 已完成: 'COMPLETED', 已结束: 'CANCELLED' };
const GROUP_TO_PHASE: Record<StateGroup, ResearchStatusTemplate['phase']> = { NOT_STARTED: '待开始', IN_PROGRESS: '处理中', COMPLETED: '已完成', CANCELLED: '已结束' };
const statusStates = (items: ResearchStatusTemplate[]): EditableWorkflowState[] => items.map((item) => ({ key: item.id, name: item.name, group: PHASE_TO_GROUP[item.phase], initial: item.initial, successful: item.phase === '已完成', enabled: item.enabled, stage: 'product', color: item.color as EditableWorkflowState['color'] }));
const StatusesPanel = () => {
  const { addToast } = useApp();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<ResearchStatusScope>('PRODUCT');
  const statusesQuery = useQuery({ queryKey: ['research-status-templates', scope], queryFn: () => productRepository.researchStatusTemplates(scope), retry: false });
  const [states, setStates] = useState<EditableWorkflowState[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (statusesQuery.data) setStates(statusStates(statusesQuery.data)); }, [statusesQuery.data]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['research-status-templates', scope] });
  const save = async () => {
    const invalid = validateWorkflowStates(states); if (invalid) { addToast('warning', invalid); return; }
    setSaving(true);
    try {
      const originals = statusesQuery.data || [];
      const payload = (state: EditableWorkflowState, index: number) => ({ name: state.name.trim(), phase: GROUP_TO_PHASE[state.group], color: state.color, initial: state.initial, enabled: true, sort: index + 1 });
      const changed = (state: EditableWorkflowState, index: number) => { const old = originals.find((item) => item.id === state.key); const next = payload(state, index); return !old || old.name !== next.name || old.phase !== next.phase || old.color !== next.color || old.initial !== next.initial || old.sort !== next.sort || !old.enabled; };
      for (const [index, state] of states.entries()) if (!state.initial && changed(state, index)) { const old = originals.find((item) => item.id === state.key); if (old) await productRepository.updateResearchStatusTemplate(old.id, { ...payload(state, index), revision: old.revision }); else await productRepository.createResearchStatusTemplate(scope, payload(state, index)); }
      for (const [index, state] of states.entries()) if (state.initial && changed(state, index)) { const old = originals.find((item) => item.id === state.key); if (old) await productRepository.updateResearchStatusTemplate(old.id, { ...payload(state, index), revision: old.revision }); else await productRepository.createResearchStatusTemplate(scope, payload(state, index)); }
      const latest = await productRepository.researchStatusTemplates(scope);
      for (const removed of latest.filter((item) => !states.some((state) => state.key === item.id))) await productRepository.deleteResearchStatusTemplate(removed.id, removed.revision);
      await refresh(); addToast('success', '状态配置已保存');
    } catch (error) { addToast('error', '状态配置保存失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setSaving(false); }
  };
  return <div className="mx-auto w-full max-w-5xl space-y-4 text-xs">
    <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">产品与迭代状态</h3><p className="mt-1 text-[var(--text-muted)]">状态名称可自定义，通用阶段固定为未开始、进行中、已完成和已取消。</p></div><Button type="primary" className="!h-9" loading={saving} onClick={() => void save()}>保存配置</Button></div>
    <Tabs activeKey={scope} onChange={(key) => setScope(key as ResearchStatusScope)} items={[{ key: 'PRODUCT', label: '产品状态' }, { key: 'ITERATION', label: '迭代状态' }]} />
    {statusesQuery.isError && <Alert type="error" showIcon message="状态加载失败" action={<Button onClick={() => statusesQuery.refetch()}>重试</Button>} />}
    {statusesQuery.isLoading ? <div className="flex min-h-40 items-center justify-center"><Spin /></div> : !statusesQuery.isError && <WorkItemStateEditor states={states} category="requirement" onChange={setStates} />}
  </div>;
};

export const ResearchTemplateView: React.FC = () => {
  const [section, setSection] = useState<Section>('work-items');
  return <div className="research-template-view space-y-5 animate-in fade-in duration-200">
    <header className="border-b border-[var(--border-main)] pb-3"><h1 className="text-lg font-bold text-[var(--text-primary)]">产研模板</h1><p className="mt-1 text-xs text-[var(--text-muted)]">预设新产品的工作项、通知和自动化配置。</p></header>
    <div className="grid min-h-[520px] grid-cols-1 border border-[var(--border-main)] bg-[var(--bg-surface)] md:grid-cols-[190px_minmax(0,1fr)]">
      <nav aria-label="产研模板菜单" className="flex gap-1 overflow-x-auto border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3 md:block md:overflow-visible md:border-b-0 md:border-r">
        <div className="mb-4 hidden border-b border-[var(--border-main)] px-3 pb-4 select-none md:block"><h2 className="text-base font-bold text-[var(--text-primary)]">产研模板</h2><p className="mt-2 text-xs text-[var(--text-muted)]">新产品初始配置</p></div>
        {SECTIONS.map((item) => <button key={item.id} type="button" onClick={() => setSection(item.id)} aria-current={section === item.id ? 'page' : undefined} className={`mb-1 flex h-9 shrink-0 items-center rounded-md px-3 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] md:w-full ${section === item.id ? 'bg-[var(--primary)]/12 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}>{item.label}</button>)}
      </nav>
      <section className="min-w-0 p-4 md:p-6" aria-label={SECTIONS.find((item) => item.id === section)?.label}>
        {section === 'dictionary' && <DictionaryPanel />}
        {section === 'work-items' && <WorkItemModuleView />}
        {section === 'roles' && <RolesPanel />}
        {section === 'statuses' && <StatusesPanel />}
        {section === 'notifications' && <NotificationSettingsPanel scope="template" />}
        {section === 'automation' && <AutomationRulesPanel scope="template" />}
        {section === 'archive' && <ArchivePanel />}
      </section>
    </div>
  </div>;
};
