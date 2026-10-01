import React, { useEffect, useRef, useState } from 'react';
import { Input, Select, Button, Switch, Drawer, Tag, Dropdown, Popconfirm, Spin } from 'antd';
import Card from 'antd/es/card/Card';
import { useQuery } from '@tanstack/react-query';
import { ApartmentOutlined, DeleteOutlined, DownOutlined, EditOutlined, PlusOutlined, UserAddOutlined, UserDeleteOutlined, SettingOutlined, UndoOutlined } from '@ant-design/icons';
import {
  ArrowLeft,
  Boxes,
  Layers,
  Users,
  Plus,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Clock,
  UserCheck,
  Cpu,
  CheckCircle2,
  AlertCircle,
  FileText,
  Bug,
  Code2,
  Edit3,
  Globe,
  Share2,
  Activity,
  Package,
  TrendingUp,
  Sparkles,
  GitBranch
} from '../common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { ProductLine, ProductLineActivity, ProductLineMember, ProductLineWorkItemCategory, ProductLineWorkItemType, RequirementTask, VersionIteration } from '../../types';
import { productRepository, type UnifiedWorkItem } from '../../services/productRepository';
import { StatusTag, Modal } from '../common/UIComponents';
import { CreateVersionModal } from './CreateVersionModal';
import { ManageMembersModal } from './ManageMembersModal';
import {
  buildWorkflowDefinition,
  CATEGORY_KEYS,
  createDefaultWorkItemStates,
  EditableWorkflowState,
  validateWorkflowStates,
  WorkItemStateConfigDrawer,
  WorkItemStateEditor
} from './WorkItemStateConfigDrawer';
import { AutomationRulesPanel } from './AutomationRulesPanel';
import { NotificationSettingsPanel } from './NotificationSettingsPanel';
import { normalizeProductWebsiteUrl } from './productWebsite';
import { teamRepository } from '../../services/teamRepository';
import { employeeJobTitle, employeeSelectOptions, PersonAvatar, PersonIdentity } from '../common/PersonIdentity';
import { ProductLineBoard, ProductLineHours, useProductLineWorkItems } from './ProductLineInsights';
import { ProductLinePerformance } from './ProductLinePerformance';
import { WorkItemCategoryIcon } from './WorkItemCategoryIcon';
import { formatVersionPublishedAt, latestReleasedVersion, productLineDisplayStatus } from './productLinePresentation';
import { RequirementTasksView } from './RequirementTasksView';
import { ProductIterationTimeline } from './ProductIterationTimeline';

interface ProductLineDetailViewProps {
  productLineId: string;
  onBack: () => void;
  initialSettingsSection?: ProductLineSettingsSection;
}

export type ProductLineSettingsSection = 'basic' | 'members' | 'work-items' | 'notifications' | 'automation' | 'other' | 'recycle-bin';

const normalizeProductVisibility = (value?: ProductLine['visibility']): '公开' | '私密' =>
  value === '私密' || value === '部门可见' || value === '保密' || value === '仅创建者可见' ? '私密' : '公开';

const productLineStatCards = [
  { label: '协助事项', category: 'assistance' as const, tone: 'text-purple-400' },
  { label: '产品任务', category: 'requirement' as const, tone: 'text-cyan-400' },
  { label: '设计任务', category: 'design' as const, tone: 'text-pink-400' },
  { label: '研发任务', category: 'dev' as const, tone: 'text-emerald-400' },
  { label: '测试任务', category: 'test' as const, tone: 'text-amber-400' },
  { label: '缺陷任务', category: 'bug' as const, tone: 'text-[var(--danger)]' }
];

const ProductLineSettingsPanel: React.FC<{
  productLine: ProductLine;
  onBack: () => void;
  onProductRemoved: () => void;
  onOpenMembers: () => void;
  initialSection?: ProductLineSettingsSection;
}> = ({ productLine, onBack, onProductRemoved, onOpenMembers, initialSection }) => {
  const { updateProductLine, updateProductLineMember, removeProductLineMember, setProductLines, addToast } = useApp();
  const [section, setSection] = useState<ProductLineSettingsSection>(initialSection || 'basic');
  const [name, setName] = useState(productLine.name);
  const [code, setCode] = useState(productLine.code);
  const [website, setWebsite] = useState(productLine.website || '');
  const [ownerUserId, setOwnerUserId] = useState(productLine.ownerUserId || '');
  const [sort, setSort] = useState(productLine.sort ?? 0);
  const [websiteError, setWebsiteError] = useState('');
  const [isSavingBasic, setIsSavingBasic] = useState(false);
  const [description, setDescription] = useState(productLine.description);
  const [commercialAvailability, setCommercialAvailability] = useState<ProductLine['commercialAvailability']>(productLine.commercialAvailability || '不可商用');
  const [visibility, setVisibility] = useState<'公开' | '私密'>(normalizeProductVisibility(productLine.visibility));
  const [pendingOperation, setPendingOperation] = useState<'activate' | 'disable' | 'archive' | 'delete' | null>(null);
  const [isOperating, setIsOperating] = useState(false);
  const [memberTab, setMemberTab] = useState('全部');
  const [memberToRemove, setMemberToRemove] = useState<ProductLineMember | null>(null);
  const employeesQuery = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, retry: false });
  const roleTemplatesQuery = useQuery({ queryKey: ['product-role-templates'], queryFn: productRepository.productRoleTemplates, retry: false });
  const productStatusesQuery = useQuery({ queryKey: ['research-status-templates', 'PRODUCT'], queryFn: () => productRepository.researchStatusTemplates('PRODUCT'), retry: false });
  const enabledProductStatuses = (productStatusesQuery.data || []).filter((item) => item.enabled);
  const productStatusForPhase = (phase: '待开始' | '处理中' | '已完成' | '已结束') => enabledProductStatuses.find((item) => item.phase === phase)?.name || '';
  const employeesById = new Map((employeesQuery.data || []).map((employee) => [employee.id, employee]));

  useEffect(() => {
    setName(productLine.name);
    setCode(productLine.code);
    setWebsite(productLine.website || '');
    setOwnerUserId(productLine.ownerUserId || '');
    setSort(productLine.sort ?? 0);
    setWebsiteError('');
    setDescription(productLine.description);
    setCommercialAvailability(productLine.commercialAvailability || '不可商用');
    setVisibility(normalizeProductVisibility(productLine.visibility));
  }, [productLine]);

  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  const saveBasicInfo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !productLine.code.trim() || !ownerUserId) {
      addToast('warning', '请填写产品名称并选择负责人');
      return;
    }
    if (!Number.isInteger(sort) || sort < 0 || sort > 999) {
      addToast('warning', '排序必须是 0-999 的整数');
      return;
    }
    const normalizedWebsite = normalizeProductWebsiteUrl(website);
    if (website.trim() && !normalizedWebsite) {
      setWebsiteError('请输入以 http:// 或 https:// 开头的有效网址');
      addToast('warning', '请输入有效的产品网址');
      return;
    }
    setWebsiteError('');
    setIsSavingBasic(true);
    try {
      const nextBasicInfo: Partial<ProductLine> = {
        name: name.trim(),
        description: description.trim() || '该产品还没有任何简介内容。',
        website: normalizedWebsite || '',
        ownerUserId,
        sort,
        visibility,
        commercialAvailability
      };
      await updateProductLine(productLine.id, nextBasicInfo);
    } catch (error) {
      addToast('error', '产品设置保存失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setIsSavingBasic(false);
    }
  };

  const sections: Array<{ id: ProductLineSettingsSection; label: string }> = [
    { id: 'basic', label: '基本信息' },
    { id: 'members', label: '产品成员' },
    { id: 'work-items', label: '工作项设置' },
    { id: 'notifications', label: '通知与提醒' },
    { id: 'automation', label: '自动化规则' },
    { id: 'other', label: '其他' },
    { id: 'recycle-bin', label: '回收站' }
  ];

  const currentStatus = productLine.status || productLine.health || '';
  const disabledStatus = productStatusForPhase('已结束');
  const isEnabled = currentStatus !== disabledStatus;
  const operationCopy = {
    activate: { title: '启用产品', description: '启用后，产品恢复正常维护和新建操作。', confirm: '确认启用' },
    disable: { title: '停用产品', description: '停用后，产品保留历史数据，但不再允许新建业务数据。', confirm: '确认停用' },
    archive: { title: '归档产品', description: '归档后，产品将从产品管理列表移至产研模板的归档列表。', confirm: '确认归档' },
    delete: { title: '删除产品', description: '删除后，产品将不再展示。此操作不可在界面中恢复。', confirm: '确认删除' }
  } as const;
  const executeOperation = async () => {
    if (!pendingOperation) return;
    setIsOperating(true);
    try {
      if (pendingOperation === 'activate') await productRepository.activateProductLine(productLine.id);
      if (pendingOperation === 'disable') await productRepository.disableProductLine(productLine.id);
      if (pendingOperation === 'archive') await productRepository.archiveProductLine(productLine.id);
      if (pendingOperation === 'delete') await productRepository.deleteProductLine(productLine.id);
      const refreshedProductLines = await productRepository.productLines();
      setProductLines(refreshedProductLines);
      if (pendingOperation === 'archive' || pendingOperation === 'delete') {
        addToast('success', pendingOperation === 'archive' ? '产品已归档' : '产品已删除');
        setPendingOperation(null);
        onProductRemoved();
        return;
      }
      addToast('success', pendingOperation === 'activate' ? '产品已启用' : '产品已停用');
      setPendingOperation(null);
    } catch (error) {
      addToast('error', `${operationCopy[pendingOperation].title}失败`, error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setIsOperating(false);
    }
  };

  return (
    <div className="product-line-settings space-y-5 animate-in fade-in duration-200">
      <div className="flex min-w-0 items-center gap-3 border-b border-[var(--border-main)] pb-3">
        <Button type="text" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>返回</Button>
        <span className="text-sm font-medium text-[var(--text-primary)]">产品详情</span>
        <span className="h-4 w-px bg-[var(--border-main)]" aria-hidden="true" />
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--active-text)]" title={`${productLine.name} ${productLine.code}`}>{productLine.name}</span>
        <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{productLine.code}</span>
      </div>

      <div className="grid min-h-[520px] grid-cols-1 border border-[var(--border-main)] bg-[var(--bg-surface)] md:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3 md:border-b-0 md:border-r" aria-label="产品设置菜单">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`mb-1 flex h-9 w-full items-center rounded-md px-3 text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${section === item.id ? 'bg-[var(--primary)]/12 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <section className="min-w-0 p-6">
          {section === 'basic' && (
            <form onSubmit={saveBasicInfo} className="mx-auto w-full max-w-2xl space-y-5 text-xs">
              <div><h3 className="text-sm font-bold text-[var(--text-primary)]">基本信息</h3><p className="mt-1 text-[var(--text-muted)]">维护产品的名称、编码、网址、可见范围和简介。</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>产品名称 *</span><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入产品名称" /></label>
                <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>产品编码</span><Input value={code} disabled readOnly /></label>
              </div>
              <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>产品负责人 *</span><Select showSearch allowClear className="w-full" value={ownerUserId || undefined} onChange={(value) => setOwnerUserId(value || '')} options={(employeesQuery.data || []).map((employee) => ({ value: employee.id, label: `${employee.name} · ${employeeJobTitle(employee) || '未设置职位'}` }))} optionFilterProp="label" placeholder="请选择产品负责人" /></label>
              <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>产品网址</span><Input value={website} status={websiteError ? 'error' : undefined} aria-invalid={Boolean(websiteError)} onChange={(event) => { setWebsite(event.target.value); if (websiteError) setWebsiteError(''); }} placeholder="https://example.com" />{websiteError && <span className="text-[11px] font-normal text-[var(--danger)]">{websiteError}</span>}</label>
              <div>
                <label className="mb-1 block font-medium text-[var(--text-body)]">可见范围 *</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(['公开', '私密'] as const).map((value) => (
                    <button type="button" key={value} onClick={() => setVisibility(value)} className={`rounded-md border p-3 text-left transition-colors ${visibility === value ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border-main)] bg-[var(--bg-surface-soft)] hover:border-[var(--primary)]/60'}`}>
                      <span className="block font-semibold text-[var(--text-body)]">{value}</span>
                      <span className="mt-1 block text-[11px] text-[var(--text-muted)]">{value === '公开' ? '组织全员可访问' : '仅产品成员可见'}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>产品描述</span><Input.TextArea rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="请输入产品描述" /></label>
              <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>是否商用</span><Select value={commercialAvailability} onChange={setCommercialAvailability} options={[{ value: '可商用', label: '可商用' }, { value: '不可商用', label: '不可商用' }]} /></label>
              <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>排序</span><Input type="number" min={0} max={999} step={1} value={sort} onChange={(event) => setSort(Number(event.target.value))} /></label>
              <div className="flex justify-end"><Button type="primary" htmlType="submit" loading={isSavingBasic}>保存基本信息</Button></div>
            </form>
          )}
          {section === 'members' && (
            <div className="mx-auto w-full max-w-5xl space-y-5 px-4 text-xs sm:px-6">
              <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">产品成员</h3><p className="mt-1 text-[var(--text-muted)]">配置产品成员及其角色。</p></div><Button type="primary" onClick={onOpenMembers} icon={<UserAddOutlined />}>添加成员</Button></div>
              {(() => {
                const members: ProductLineMember[] = (productLine.members || []).map((member, index) => typeof member === 'string' ? { id: `legacy-${index}-${member}`, userId: '', name: member, role: '参与人' } : member);
                const configuredRoles = (roleTemplatesQuery.data || []).map((role) => role.name);
                const historicalRoles = members.map((member) => member.role).filter((role) => role && !configuredRoles.includes(role));
                const memberTabs = ['全部', ...configuredRoles, ...historicalRoles];
                const visibleMembers = memberTab === '全部' ? members : members.filter((member) => member.role === memberTab);
                return <>
                  <div className="flex flex-wrap gap-1 border-b border-[var(--border-main)]">{memberTabs.map((tab) => { const count = tab === '全部' ? members.length : members.filter((member) => member.role === tab).length; return <button key={tab} type="button" onClick={() => setMemberTab(tab)} className={`h-10 px-3 text-xs font-normal border-b-2 transition-colors ${memberTab === tab ? 'border-[var(--primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><span>{tab}</span><span className="ml-1 text-xs font-normal text-[var(--primary)]">{count}</span></button>; })}</div>
                  <div className="overflow-x-auto rounded-md border border-[var(--border-main)]"><div className="min-w-[560px]">
                    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(120px,0.8fr)_56px] items-center gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-2 text-[11px] text-[var(--text-muted)]"><span>成员</span><span>角色</span><span className="text-right">操作</span></div>
                    {visibleMembers.length ? visibleMembers.map((member) => { const employee = employeesById.get(member.userId); const roleOptions = [...new Set([...configuredRoles, member.role])].filter(Boolean).map((role) => ({ value: role, label: role })); return <div key={member.id} className="grid grid-cols-[minmax(0,1.4fr)_minmax(120px,0.8fr)_56px] items-center gap-3 border-b border-[var(--border-main)] px-3 py-2 last:border-b-0"><PersonIdentity name={member.name} subtitle={employee ? employeeJobTitle(employee) || '未设置职位' : undefined} size={28} /><Select className="w-full" value={member.role} loading={roleTemplatesQuery.isLoading} disabled={roleTemplatesQuery.isError} options={roleOptions} onChange={async (role) => { try { await updateProductLineMember(productLine.id, member.id, role); addToast('success', '成员角色已更新'); } catch (error) { addToast('error', '成员角色更新失败', error instanceof Error ? error.message : '请稍后重试'); } }} /><div className="text-right"><Button type="text" danger aria-label={`移除成员 ${member.name}`} title={`移除成员 ${member.name}`} icon={<UserDeleteOutlined />} onClick={() => setMemberToRemove(member)} /></div></div>; }) : <div className="px-3 py-8 text-center text-[var(--text-muted)]">暂无成员</div>}
                  </div></div>
                </>;
              })()}
              <Modal isOpen={Boolean(memberToRemove)} onClose={() => setMemberToRemove(null)} title="移除产品成员" footer={<><Button onClick={() => setMemberToRemove(null)}>取消</Button><Button type="primary" danger onClick={async () => { if (!memberToRemove) return; try { await removeProductLineMember(productLine.id, memberToRemove.id); addToast('success', '成员已移除'); setMemberToRemove(null); } catch (error) { addToast('error', '成员移除失败', error instanceof Error ? error.message : '请稍后重试'); } }}>确认移除</Button></>}><p className="text-sm text-[var(--text-body)]">确定将“{memberToRemove?.name}”移除产品吗？</p></Modal>
            </div>
          )}
          {section === 'work-items' && <ProductLineWorkItemSettings productLine={productLine} />}
          {section === 'notifications' && <NotificationSettingsPanel scope="product" productLineId={productLine.id} />}
          {section === 'automation' && <AutomationRulesPanel productLine={productLine} />}
          {section === 'other' && <div className="w-full space-y-5 px-0 text-xs sm:px-2 lg:px-4"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">产品操作</h3><p className="mt-1 text-[var(--text-muted)]">集中管理产品的启停、归档和删除。</p></div><div className="space-y-3"><div className="flex min-h-16 flex-col justify-between gap-4 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4 sm:flex-row sm:items-center"><div><h4 className="text-sm font-semibold text-[var(--text-primary)]">是否启用</h4><p className="mt-1 text-[var(--text-muted)]">停用后保留历史数据，产品内不再支持新建操作。</p></div><Switch className="product-operation-switch" checked={isEnabled} checkedChildren="启用" unCheckedChildren="停用" onChange={(checked) => setPendingOperation(checked ? 'activate' : 'disable')} /></div><div className="flex min-h-16 flex-col justify-between gap-4 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4 sm:flex-row sm:items-center"><div><h4 className="text-sm font-semibold text-[var(--text-primary)]">产品归档</h4><p className="mt-1 text-[var(--text-muted)]">产品完成后可归档，归档产品统一在产研模板中管理。</p></div><Button className="!h-9" type="primary" onClick={() => setPendingOperation('archive')}>归档</Button></div><div className="flex min-h-16 flex-col justify-between gap-4 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4 sm:flex-row sm:items-center"><div><h4 className="text-sm font-semibold text-[var(--text-primary)]">删除产品</h4><p className="mt-1 text-[var(--text-muted)]">删除后产品不再展示，关联历史数据不支持从界面恢复。</p></div><Button className="!h-9" danger onClick={() => setPendingOperation('delete')}>删除</Button></div></div></div>}
          {section === 'recycle-bin' && <ProductRecycleBin productLineId={productLine.id} />}
        </section>
      </div>
      <Modal isOpen={Boolean(pendingOperation)} onClose={() => !isOperating && setPendingOperation(null)} title={pendingOperation ? operationCopy[pendingOperation].title : ''} footer={<><Button disabled={isOperating} onClick={() => setPendingOperation(null)}>取消</Button><Button type="primary" danger={pendingOperation !== 'activate'} loading={isOperating} onClick={() => void executeOperation()}>{pendingOperation ? operationCopy[pendingOperation].confirm : '确认'}</Button></>}><p className="text-sm text-[var(--text-body)]">{pendingOperation ? operationCopy[pendingOperation].description : ''}</p></Modal>
    </div>
  );
};

const ProductRecycleBin: React.FC<{ productLineId: string }> = ({ productLineId }) => {
  const { addToast } = useApp();
  const query = useQuery({ queryKey: ['product-recycle-bin', productLineId], queryFn: () => productRepository.recycleBin(productLineId), retry: false });
  const [operatingId, setOperatingId] = useState('');
  const restore = async (id: string, revision: number) => {
    setOperatingId(id);
    try { await productRepository.restoreRecycleBinItem(productLineId, id, revision); await query.refetch(); addToast('success', '任务已恢复'); }
    catch (error) { addToast('error', '恢复失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setOperatingId(''); }
  };
  const purge = async (id: string, revision: number) => {
    setOperatingId(id);
    try { await productRepository.purgeRecycleBinItem(productLineId, id, revision); await query.refetch(); addToast('success', '任务已彻底删除'); }
    catch (error) { addToast('error', '彻底删除失败', error instanceof Error ? error.message : '请稍后重试'); }
    finally { setOperatingId(''); }
  };
  return <div className="w-full space-y-5 text-xs">
    <div><h3 className="text-sm font-bold text-[var(--text-primary)]">回收站</h3><p className="mt-1 text-[var(--text-muted)]">查看当前产品已删除的产品、设计、研发、测试和缺陷任务。</p></div>
    {query.isLoading ? <div className="flex min-h-40 items-center justify-center"><Spin /></div> : query.isError ? <div role="alert" className="py-8 text-center text-[var(--danger)]">回收站加载失败<Button type="link" onClick={() => query.refetch()}>重试</Button></div> : <div className="overflow-x-auto rounded-md border border-[var(--border-main)]"><div className="min-w-[820px]"><div className="grid grid-cols-[minmax(260px,1.6fr)_160px_130px_180px_150px] gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-4 py-3 text-[var(--text-muted)]"><span>标题</span><span>所属版本</span><span>操作人</span><span>操作时间</span><span className="text-right">操作</span></div>{(query.data || []).map((item) => <div key={item.id} className="grid grid-cols-[minmax(260px,1.6fr)_160px_130px_180px_150px] items-center gap-3 border-b border-[var(--border-main)] px-4 py-3 last:border-b-0"><span className="flex min-w-0 items-center gap-2 font-medium text-[var(--text-primary)]"><WorkItemCategoryIcon category={item.category} className="shrink-0 text-[var(--primary)]" /><span className="truncate" title={item.title}>{item.title}</span></span><span className="truncate text-[var(--text-body)]" title={item.versionName}>{item.versionName}</span><span className="truncate text-[var(--text-body)]">{item.operatorName || '未记录'}</span><span className="text-[var(--text-muted)]">{item.operatedAt ? new Date(item.operatedAt).toLocaleString('zh-CN', { hour12: false }) : '未记录'}</span><span className="flex justify-end gap-1"><Popconfirm title="恢复任务" description={`确定恢复“${item.title}”吗？`} okText="恢复" cancelText="取消" onConfirm={() => restore(item.id, item.revision)}><Button type="link" size="small" loading={operatingId === item.id} icon={<UndoOutlined />}>恢复</Button></Popconfirm><Popconfirm title="彻底删除" description={`确定彻底删除“${item.title}”吗？此操作不可恢复。`} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => purge(item.id, item.revision)}><Button type="link" danger size="small" loading={operatingId === item.id} icon={<DeleteOutlined />}>删除</Button></Popconfirm></span></div>)}{!query.data?.length && <div className="px-4 py-12 text-center text-[var(--text-muted)]">回收站为空</div>}</div></div>}
  </div>;
};

const SettingsPlaceholder: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="max-w-2xl space-y-2 text-xs"><h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3><p className="text-[var(--text-muted)]">{description}</p><div className="mt-5 border border-dashed border-[var(--border-main)] p-5 text-[var(--text-muted)]">暂无可配置项</div></div>
);

const WORK_ITEM_CATEGORIES: ProductLineWorkItemCategory[] = ['需求', '设计', '研发', '测试', '缺陷', '用例'];
const workItemCategoryLabel = (category: ProductLineWorkItemCategory) => ({ 需求: '产品任务', 设计: '设计任务', 研发: '研发任务', 测试: '测试任务', 缺陷: '缺陷任务', 用例: '测试用例' }[category]);

const ProductLineWorkItemSettings: React.FC<{ productLine: ProductLine }> = ({ productLine }) => {
  const { addToast, setProductLines } = useApp();
  const [activeCategory, setActiveCategory] = useState<ProductLineWorkItemCategory>('需求');
  const normalizeItems = (nextItems: ProductLineWorkItemType[]) => nextItems.map((item) => ({ ...item, enabled: Boolean(item.enabled), isDefault: Boolean(item.isDefault) }));
  const [items, setItems] = useState<ProductLineWorkItemType[]>(normalizeItems(productLine.workItemTypes || []));
  const [editingItem, setEditingItem] = useState<ProductLineWorkItemType | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ProductLineWorkItemType | null>(null);
  const [stateConfigItem, setStateConfigItem] = useState<ProductLineWorkItemType | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<{ category: ProductLineWorkItemCategory; name: string; description: string; enabled: boolean; isDefault: boolean }>({ category: '需求', name: '', description: '', enabled: true, isDefault: false });
  const [initialWorkflowStates, setInitialWorkflowStates] = useState<EditableWorkflowState[]>(createDefaultWorkItemStates('requirement'));

  useEffect(() => {
    setItems(normalizeItems(productLine.workItemTypes || []));
  }, [productLine.workItemTypes]);

  const isRemote = () => {
    const token = sessionStorage.getItem('shichuang.session.token');
    return Boolean(token && !token.startsWith('local-dev-'));
  };

  const visibleItems = items.filter((item) => item.category === activeCategory);
  const persistLocalItems = (nextItems: ProductLineWorkItemType[]) => {
    setItems(nextItems);
    setProductLines((previous) => previous.map((line) => line.id === productLine.id ? { ...line, workItemTypes: nextItems } : line));
  };
  const openCreate = () => {
    setEditingItem(null);
    setForm({ category: activeCategory, name: '', description: '', enabled: true, isDefault: false });
    setInitialWorkflowStates(createDefaultWorkItemStates(CATEGORY_KEYS[activeCategory]));
    setIsEditorOpen(true);
  };
  const openEdit = (item: ProductLineWorkItemType) => {
    setEditingItem(item);
    setForm({ category: item.category, name: item.name, description: item.description || '', enabled: item.enabled, isDefault: Boolean(item.isDefault) });
    setIsEditorOpen(true);
  };
  const reloadRemoteItems = async () => {
    if (!isRemote()) return;
    const nextItems = await productRepository.workItemTypes(productLine.id);
    setItems(normalizeItems(nextItems));
  };
  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      addToast('warning', '请输入工作项类型名称');
      return;
    }
    if (!editingItem) {
      const invalid = validateWorkflowStates(initialWorkflowStates);
      if (invalid) {
        addToast('warning', invalid);
        return;
      }
    }
    setIsSaving(true);
    try {
      if (isRemote()) {
        if (editingItem) await productRepository.updateWorkItemType(productLine.id, editingItem.id, { ...form, name, description: form.description.trim() });
        else {
          const category = CATEGORY_KEYS[form.category];
          const states = initialWorkflowStates.map((state) => ({ ...state, name: state.name.trim(), stage: category === 'bug' ? 'dev' : category === 'case' ? 'test' : category }));
          await productRepository.createWorkItemType(productLine.id, {
            ...form,
            name,
            description: form.description.trim(),
            workflow: { category, name: `${name}状态配置`, definition: buildWorkflowDefinition(states) }
          });
        }
        await reloadRemoteItems();
      } else {
        const localItem: ProductLineWorkItemType = editingItem
          ? { ...editingItem, ...form, name, description: form.description.trim() }
          : { id: `work-item-type-${Date.now()}`, ...form, name, description: form.description.trim(), creatorName: '当前用户', createdAt: new Date().toISOString() };
        const baseItems = localItem.isDefault
          ? items.map((item) => item.category === localItem.category ? { ...item, isDefault: false } : item)
          : items;
        const normalizedLocalItem = localItem.enabled ? localItem : { ...localItem, isDefault: false };
        const nextItems = editingItem ? baseItems.map((item) => item.id === editingItem.id ? normalizedLocalItem : item) : [normalizedLocalItem, ...baseItems];
        persistLocalItems(nextItems);
      }
      setIsEditorOpen(false);
      addToast('success', editingItem ? '工作项类型已修改' : '工作项类型已新增');
    } catch (error) {
      addToast('error', editingItem ? '工作项类型修改失败' : '工作项类型新增失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };
  const toggleItem = async (item: ProductLineWorkItemType, enabled: boolean) => {
    try {
      if (isRemote()) {
        await productRepository.updateWorkItemType(productLine.id, item.id, { enabled });
        await reloadRemoteItems();
      } else {
        persistLocalItems(items.map((candidate) => candidate.id === item.id ? { ...candidate, enabled, isDefault: enabled ? candidate.isDefault : false } : candidate));
      }
    } catch (error) {
      addToast('error', '工作项类型状态更新失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };
  const deleteItem = async () => {
    if (!itemToDelete) return;
    try {
      if (isRemote()) {
        await productRepository.deleteWorkItemType(productLine.id, itemToDelete.id);
        await reloadRemoteItems();
      } else {
        persistLocalItems(items.filter((item) => item.id !== itemToDelete.id));
      }
      addToast('success', '工作项类型已删除');
    } catch (error) {
      addToast('error', '工作项类型删除失败', error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 text-xs">
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="text-sm font-bold text-[var(--text-primary)]">工作项设置</h3><p className="mt-1 text-[var(--text-muted)]">按工作项分类维护类型名称、描述和启用状态。</p></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增类型</Button>
      </div>
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-main)]">
        {WORK_ITEM_CATEGORIES.map((category) => {
          const count = items.filter((item) => item.category === category).length;
          return <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`h-10 px-4 text-xs font-normal border-b-2 transition-colors ${activeCategory === category ? 'border-[var(--primary)] text-[var(--text-primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><span>{workItemCategoryLabel(category)}</span><span className="ml-1 font-normal text-[var(--primary)]">{count}</span></button>;
        })}
      </div>
      <div className="overflow-hidden rounded-md border border-[var(--border-main)]">
        <div className="grid grid-cols-[minmax(150px,1fr)_minmax(180px,1.6fr)_120px_150px_100px_96px] items-center gap-3 border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-3 text-[11px] text-[var(--text-muted)]"><span>类型名称</span><span>描述</span><span>添加人</span><span>添加时间</span><span>是否启用</span><span className="text-right">操作</span></div>
        {visibleItems.length ? visibleItems.map((item) => <div key={item.id} className="grid grid-cols-[minmax(150px,1fr)_minmax(180px,1.6fr)_120px_150px_100px_96px] items-center gap-3 border-b border-[var(--border-main)] px-3 py-3 last:border-b-0"><span className="flex min-w-0 items-center gap-2 font-medium text-[var(--text-primary)]" title={item.name}><span className="truncate">{item.name}</span>{item.isDefault && <Tag color="blue">默认</Tag>}</span><span className="truncate text-[var(--text-body)]" title={item.description}>{item.description || '暂无描述'}</span><span className="truncate text-[var(--text-body)]">{item.creatorName || '暂无'}</span><span className="text-[var(--text-muted)]">{item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false }) : '暂无'}</span><Switch className="product-line-switch justify-self-start" checked={item.enabled} onChange={(checked) => void toggleItem(item, checked)} /><span className="flex justify-end gap-1"><Button type="text" aria-label={`配置${item.name}状态`} title="状态配置" icon={<ApartmentOutlined />} onClick={() => setStateConfigItem(item)} /><Button type="text" aria-label={`修改${item.name}`} title={`修改${item.name}`} icon={<EditOutlined />} onClick={() => openEdit(item)} /><Button type="text" danger aria-label={`删除${item.name}`} title={`删除${item.name}`} icon={<DeleteOutlined />} onClick={() => setItemToDelete(item)} /></span></div>) : <div className="px-3 py-10 text-center text-[var(--text-muted)]">暂无{workItemCategoryLabel(activeCategory)}工作项类型，点击右上角“新增类型”添加</div>}
      </div>
      <Drawer
        width={editingItem ? 560 : 840}
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        destroyOnClose={false}
        title={editingItem ? '修改工作项类型' : '新增工作项类型'}
        footer={<div className="flex justify-end gap-2"><Button onClick={() => setIsEditorOpen(false)}>取消</Button><Button type="primary" loading={isSaving} htmlType="submit" form="work-item-type-form">{editingItem ? '保存修改' : '创建并发布'}</Button></div>}
      >
        <form id="work-item-type-form" onSubmit={saveItem} className="space-y-5 text-xs">
          <section className="space-y-4">
            <div><h3 className="text-sm font-bold text-[var(--text-primary)]">基本信息</h3><p className="mt-1 text-[var(--text-muted)]">设置子类型的名称、分类和启用状态。</p></div>
            <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>类型分类</span><Select value={form.category} onChange={(category) => { setForm((previous) => ({ ...previous, category })); if (!editingItem) setInitialWorkflowStates(createDefaultWorkItemStates(CATEGORY_KEYS[category])); }} options={WORK_ITEM_CATEGORIES.map((category) => ({ value: category, label: workItemCategoryLabel(category) }))} /></label>
            <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>类型名称 *</span><Input maxLength={128} value={form.name} onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} placeholder="请输入类型名称" /></label>
            <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>描述</span><Input.TextArea rows={3} value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} placeholder="请输入类型描述" /></label>
            <div className="flex items-center justify-between"><div><div className="font-medium text-[var(--text-body)]">是否启用</div><p className="mt-1 text-[11px] text-[var(--text-muted)]">停用后不能新建该类型的工作项。</p></div><Switch className="product-line-switch" checked={form.enabled} onChange={(enabled) => setForm((previous) => ({ ...previous, enabled }))} /></div>
            <div className="flex items-center justify-between"><div><div className="font-medium text-[var(--text-body)]">是否默认</div><p className="mt-1 text-[11px] text-[var(--text-muted)]">设为默认后，新建该分类任务时优先选择此类型。</p></div><Switch aria-label="是否默认" className="product-line-switch" checked={form.isDefault} disabled={!form.enabled} onChange={(isDefault) => setForm((previous) => ({ ...previous, isDefault }))} /></div>
          </section>
          {!editingItem && <section className="space-y-4 border-t border-[var(--border-main)] pt-5">
            <div><h3 className="text-sm font-bold text-[var(--text-primary)]">初始化状态</h3><p className="mt-1 text-[var(--text-muted)]">状态名称可自定义，每个状态必须归属未开始、进行中、已完成或已取消。</p></div>
            <WorkItemStateEditor states={initialWorkflowStates} category={CATEGORY_KEYS[form.category]} onChange={setInitialWorkflowStates} />
          </section>}
        </form>
      </Drawer>
      <Modal isOpen={Boolean(itemToDelete)} onClose={() => setItemToDelete(null)} title="删除工作项类型" footer={<><Button onClick={() => setItemToDelete(null)}>取消</Button><Button type="primary" danger onClick={() => void deleteItem()}>确认删除</Button></>}><p className="text-sm text-[var(--text-body)]">确定删除“{itemToDelete?.name}”吗？删除后不可恢复。</p></Modal>
      <WorkItemStateConfigDrawer productLine={productLine} item={stateConfigItem} open={Boolean(stateConfigItem)} onClose={() => setStateConfigItem(null)} />
    </div>
  );
};

export const ProductLineDetailView: React.FC<ProductLineDetailViewProps> = ({
  productLineId,
  onBack,
  initialSettingsSection
}) => {
  const {
    productLines,
    updateProductLine,
    versions,
    currentUser,
    addToast,
    openPageTab
  } = useApp();

  const productLine = productLines.find((pl) => pl.id === productLineId);
  const employeesQuery = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, retry: false });
  const roleTemplatesQuery = useQuery({ queryKey: ['product-role-templates'], queryFn: productRepository.productRoleTemplates, retry: false });

  // Modals state
  const [boardCreateKind, setBoardCreateKind] = useState<'requirement' | 'design' | 'dev' | 'test' | 'bug' | null>(null);
  const [detailWorkItem, setDetailWorkItem] = useState<UnifiedWorkItem | null>(null);
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<VersionIteration | null>(null);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(Boolean(initialSettingsSection));
  const [settingsSection, setSettingsSection] = useState<ProductLineSettingsSection>(initialSettingsSection || 'basic');
  const [isEditLeadsOpen, setIsEditLeadsOpen] = useState(false);

  useEffect(() => {
    if (initialSettingsSection) {
      setBoardCreateKind(null);
      setSettingsSection(initialSettingsSection);
      setIsSettingsOpen(true);
    }
  }, [initialSettingsSection]);

  // Tabs state for sub-entities
  const [activeTab, setActiveTab] = useState<'basic' | 'board' | 'versions' | 'hours' | 'performance'>('basic');
  const workItemsQuery = useProductLineWorkItems(productLineId);
  const productInfoRef = useRef<HTMLDivElement>(null);
  const statsPanelRef = useRef<HTMLElement>(null);
  const tabWorkspaceRef = useRef<HTMLDivElement>(null);
  const activityPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const productInfo = productInfoRef.current;
    const statsPanel = statsPanelRef.current;
    if (!productInfo || !statsPanel) return undefined;

    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const syncPanelHeights = () => {
      productInfo.style.minHeight = '';
      statsPanel.style.minHeight = '';
      if (!mediaQuery.matches) return;
      const height = Math.max(productInfo.offsetHeight, statsPanel.offsetHeight);
      productInfo.style.minHeight = `${height}px`;
      statsPanel.style.minHeight = `${height}px`;
    };
    const observer = new ResizeObserver(syncPanelHeights);
    observer.observe(productInfo);
    observer.observe(statsPanel);
    mediaQuery.addEventListener('change', syncPanelHeights);
    syncPanelHeights();
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', syncPanelHeights);
      productInfo.style.minHeight = '';
      statsPanel.style.minHeight = '';
    };
  }, [productLine?.id]);

  useEffect(() => {
    const tabWorkspace = tabWorkspaceRef.current;
    const activityPanel = activityPanelRef.current;
    if (!tabWorkspace || !activityPanel) return undefined;

    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const syncTabWorkspaceHeight = () => {
      tabWorkspace.style.height = '';
      tabWorkspace.style.maxHeight = '';
      tabWorkspace.style.overflowY = '';
      if (!mediaQuery.matches) return;
      const availableHeight = activityPanel.getBoundingClientRect().bottom - tabWorkspace.getBoundingClientRect().top;
      const viewportHeight = window.innerHeight - tabWorkspace.getBoundingClientRect().top - 24;
      const maxHeight = Math.max(320, Math.min(availableHeight, viewportHeight));
      tabWorkspace.style.height = `${maxHeight}px`;
      tabWorkspace.style.maxHeight = `${maxHeight}px`;
      tabWorkspace.style.overflowY = 'auto';
    };
    const observer = new ResizeObserver(syncTabWorkspaceHeight);
    observer.observe(activityPanel);
    window.addEventListener('resize', syncTabWorkspaceHeight);
    mediaQuery.addEventListener('change', syncTabWorkspaceHeight);
    syncTabWorkspaceHeight();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncTabWorkspaceHeight);
      mediaQuery.removeEventListener('change', syncTabWorkspaceHeight);
      tabWorkspace.style.height = '';
      tabWorkspace.style.maxHeight = '';
      tabWorkspace.style.overflowY = '';
    };
  }, [productLine?.id, activeTab, productLine?.activities?.length, versions.length]);

  // Edit Leads Form state
  const [leadReqOwnerUserId, setLeadReqOwnerUserId] = useState(productLine?.requirementOwnerUserId || '');
  const [leadReqOwnerSecondaryUserId, setLeadReqOwnerSecondaryUserId] = useState(productLine?.requirementOwnerSecondaryUserId || '');
  const [leadTechOwnerUserId, setLeadTechOwnerUserId] = useState(productLine?.techOwnerUserId || '');
  const [leadTechOwnerSecondaryUserId, setLeadTechOwnerSecondaryUserId] = useState(productLine?.techOwnerSecondaryUserId || '');
  const [leadTestOwnerUserId, setLeadTestOwnerUserId] = useState(productLine?.testOwnerUserId || '');
  const [leadTestOwnerSecondaryUserId, setLeadTestOwnerSecondaryUserId] = useState(productLine?.testOwnerSecondaryUserId || '');

  if (!productLine) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-[var(--text-body)]">未找到指定产品信息</p>
        <Button type="primary" onClick={onBack}>
          返回产品列表
        </Button>
      </div>
    );
  }

  // Related data
  const lineVersions = versions.filter(
    (v) => v.productLineId === productLine.id || v.productLineName === productLine.name
  );
  const productStatus = productLineDisplayStatus({ ...productLine, versions: lineVersions });
  const onlineVersion = latestReleasedVersion({ versions: lineVersions });
  const onlinePublishedAt = formatVersionPublishedAt(onlineVersion);
  const memberUserIds = new Set((productLine.members || [])
    .filter((member): member is ProductLineMember => typeof member !== 'string' && Boolean(member.userId))
    .map((member) => member.userId));
  const directoryLeadOptions = employeeSelectOptions((employeesQuery.data || []).filter((employee) => memberUserIds.has(employee.id)));
  const directoryLeadIds = new Set(directoryLeadOptions.map((option) => option.value));
  const leadOptions = [
    ...directoryLeadOptions,
    ...(productLine.members || [])
      .filter((member): member is ProductLineMember => typeof member !== 'string' && Boolean(member.userId) && !directoryLeadIds.has(member.userId))
      .map((member) => ({ value: member.userId, label: `${member.name} · 未设置职位` })),
  ];

  const navigateWithLine = (menuId: string, tab?: string, applyFilter = true) => {
    if (applyFilter) sessionStorage.setItem('shichuang.productLineFilter', productLine.id);
    else sessionStorage.removeItem('shichuang.productLineFilter');
    if (tab) sessionStorage.setItem('shichuang.productLineTargetTab', tab);
    window.dispatchEvent(new Event('shichuang:product-line-context'));
    openPageTab(menuId);
  };

  const boardCategoryLabel = (kind: 'requirement' | 'design' | 'dev' | 'test' | 'bug') => ({
    requirement: '产品', design: '设计', dev: '研发', test: '测试', bug: '缺陷'
  } as const)[kind];

  const openBoardTaskCreate = (kind: 'requirement' | 'design' | 'dev' | 'test' | 'bug') => {
    setBoardCreateKind(kind);
  };


  const openVersionDetail = (versionId: string) => {
    sessionStorage.setItem('shichuang.productLineFilter', productLine.id);
    sessionStorage.setItem('shichuang.productLineTargetTab', 'detail');
    sessionStorage.setItem('shichuang.productLineTargetVersionId', versionId);
    window.dispatchEvent(new Event('shichuang:product-line-context'));
    openPageTab('prod_versions');
  };

  const normalizeRole = (role?: string) => {
    if (!role) return '参与人';
    if (role === '管理员' || role.includes('综合负责人')) return '管理员';
    if (role === '产品' || role.includes('需求') || role.includes('产品')) return '产品';
    if (role === '研发' || role.includes('技术') || role.includes('架构') || role.includes('研发')) return '研发';
    if (role === '设计' || role.includes('设计') || role.includes('UI') || role.includes('UX')) return '设计';
    if (role === '测试' || role.includes('测试') || role.includes('QA')) return '测试';
    if (role === '交付主管') return '交付主管';
    return role.trim();
  };
  const baseDetailMembers: ProductLineMember[] = (productLine.members || []).map((member, index) => (
    typeof member === 'string'
      ? { id: `legacy-${index}-${member}`, userId: '', name: member, role: '参与人' }
      : { ...member, role: normalizeRole(member.role) }
  ));
  const detailMembers = baseDetailMembers;
  const memberCount = new Set([
    ...detailMembers.map((member) => member.name),
    productLine.owner,
    productLine.ownerName,
    productLine.requirementOwner,
    productLine.techOwner,
    productLine.testOwner
  ].filter(Boolean)).size;
  const configuredRoleNames = Array.from(
    new Set((roleTemplatesQuery.data || []).map((role) => role.name).filter(Boolean))
  );
  const detailRoleNames = Array.from(
    new Set([
      ...configuredRoleNames,
      ...detailMembers
        .map((member) => normalizeRole(member.role))
        .filter((role) => !configuredRoleNames.includes(role))
    ])
  );
  const memberRoleGroups = detailRoleNames
    .map((label) => ({ label, members: detailMembers.filter((member) => normalizeRole(member.role) === label) }))
    .filter((group) => group.members.length > 0);
  const activityItems: ProductLineActivity[] = productLine.activities?.length
    ? productLine.activities
    : lineVersions.map((version) => ({ id: version.id, action: '创建了版本', detail: version.code || version.name, operatorName: currentUser.name, createdAt: version.createdAt || version.releaseDate || '' }));
  const activityGroups = Object.entries(activityItems.reduce<Record<string, ProductLineActivity[]>>((groups, activity) => {
    const dateKey = activity.createdAt ? activity.createdAt.slice(0, 10) : '暂无日期';
    (groups[dateKey] ||= []).push(activity);
    return groups;
  }, {})).sort(([left], [right]) => right.localeCompare(left));
  const workItems = workItemsQuery.data || [];
  const pendingByCategory = (category: string) => workItems.filter((item) => item.category === category && (item.status?.group === 'NOT_STARTED' || item.status?.group === 'IN_PROGRESS')).length;

  const resetLeadForm = () => {
    setLeadReqOwnerUserId(productLine.requirementOwnerUserId || '');
    setLeadReqOwnerSecondaryUserId(productLine.requirementOwnerSecondaryUserId || '');
    setLeadTechOwnerUserId(productLine.techOwnerUserId || '');
    setLeadTechOwnerSecondaryUserId(productLine.techOwnerSecondaryUserId || '');
    setLeadTestOwnerUserId(productLine.testOwnerUserId || '');
    setLeadTestOwnerSecondaryUserId(productLine.testOwnerSecondaryUserId || '');
  };

  // Handle Save Leads
  const handleSaveLeads = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((leadReqOwnerUserId && leadReqOwnerUserId === leadReqOwnerSecondaryUserId)
      || (leadTechOwnerUserId && leadTechOwnerUserId === leadTechOwnerSecondaryUserId)
      || (leadTestOwnerUserId && leadTestOwnerUserId === leadTestOwnerSecondaryUserId)) {
      addToast('warning', '责任人配置无效', '同一职责的主责任人与次责任人不能选择同一人');
      return;
    }
    try {
      await updateProductLine(productLine.id, {
        requirementOwnerUserId: leadReqOwnerUserId,
        requirementOwnerSecondaryUserId: leadReqOwnerSecondaryUserId,
        techOwnerUserId: leadTechOwnerUserId,
        techOwnerSecondaryUserId: leadTechOwnerSecondaryUserId,
        testOwnerUserId: leadTestOwnerUserId,
        testOwnerSecondaryUserId: leadTestOwnerSecondaryUserId
      });
      setIsEditLeadsOpen(false);
    } catch (error) {
      addToast('error', '负责人配置保存失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  if (isSettingsOpen) {
    return <>
      <ProductLineSettingsPanel productLine={productLine} initialSection={settingsSection} onBack={() => { setBoardCreateKind(null); setIsSettingsOpen(false); }} onProductRemoved={onBack} onOpenMembers={() => setIsManageMembersOpen(true)} />
      <ManageMembersModal isOpen={isManageMembersOpen} onClose={() => setIsManageMembersOpen(false)} productLine={productLine} />
    </>;
  }

  return (
    <div className="product-line-detail space-y-6 px-4 pb-6 animate-in fade-in duration-200 sm:px-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex min-w-0 items-center justify-between gap-4 border-b border-[var(--border-main)] pb-0">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            onClick={onBack}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
            aria-label="返回产品列表"
            title="返回产品列表"
            className="shrink-0"
          />
          <h1 className="shrink-0 text-lg font-bold text-[var(--text-primary)]">产品详情</h1>
          <span className="h-7 w-px shrink-0 bg-[var(--border-main)]" aria-hidden="true" />
          <nav aria-label="产品详情分类" className="flex min-w-0 items-stretch gap-1 overflow-x-auto">
            {([
              ['basic', '基本信息', FileText],
              ['board', '产品看板', Boxes],
              ['versions', '产品迭代', Layers],
              ['hours', '产品工时', Clock],
              ['performance', '产品效能', TrendingUp]
            ] as const).map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setActiveTab(key)} aria-selected={activeTab === key} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-4 text-xs font-bold transition-colors sm:px-4 ${activeTab === key ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
          </nav>
        </div>

      </div>

      {activeTab === 'basic' && <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">基本信息</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">查看产品概况、责任人配置、线上版本和产品动态。</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button className="!h-9" size="small" onClick={() => { resetLeadForm(); setIsEditLeadsOpen(true); }} icon={<Edit3 className="w-3.5 h-3.5" />}>责任人配置</Button>
          <Button className="!h-9" size="small" onClick={() => { setBoardCreateKind(null); setIsSettingsOpen(true); }} icon={<Package className="w-3.5 h-3.5 text-emerald-400" />}>产品设置</Button>
        </div>
      </div>}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,2.35fr)_minmax(300px,0.95fr)]">
      <main className={`min-w-0 space-y-5 ${activeTab !== 'basic' ? 'xl:col-span-2' : ''}`}>
      {/* Hero Overview Banner with Cover */}
      {activeTab === 'basic' && <div ref={productInfoRef} className="product-line-hero relative rounded-2xl border border-[var(--border-main)] overflow-hidden bg-[var(--bg-surface)] shadow-lg">
        {/* Cover Background Graphic */}
        <div className="hidden">
          {productLine.coverImage ? (
            <img
              src={productLine.coverImage}
              alt={productLine.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center filter brightness-60"
            />
          ) : (
            <div className={`w-full h-full bg-linear-to-r ${productLine.coverColor || 'from-blue-600 to-indigo-900'} opacity-80`} />
          )}
          <div className="product-line-hero-overlay absolute inset-0 bg-linear-to-t from-[var(--bg-surface)] via-[var(--bg-surface)]/50 to-transparent" />

          {/* Top badges on cover */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[var(--active-text)] font-mono font-bold text-xs border border-white/10">
              {productLine.code}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[var(--primary)]/80 backdrop-blur-md text-white font-mono font-bold text-xs">
              线上版本 {onlineVersion?.code || onlineVersion?.name || '暂无发布'}
            </span>
          </div>

          {productLine.website && (
            <div className="absolute top-14 right-4">
              <a
                href={productLine.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[var(--text-body)] hover:text-[var(--text-primary)] text-xs font-medium border border-white/10 hover:border-white/30 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>访问官网/体验站</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Banner Content Body */}
      <div className="product-line-hero-body p-6 relative z-10 space-y-4">
          <div className="min-w-0">
              <div className="flex min-w-0 items-start justify-between gap-4">
                <h2 className="min-w-0 truncate text-2xl font-bold text-[var(--text-primary)]">{productLine.name}</h2>
                <StatusTag type={productStatus === '已停用' ? 'default' : 'info'} status={productStatus} />
              </div>
              <div className="mt-1 flex items-start justify-between gap-6">
                <p className="min-w-0 max-w-3xl text-xs leading-relaxed text-[var(--text-body)]">
                  {productLine.description}
                </p>
                <div className="shrink-0 max-w-48 truncate text-right text-xs text-[var(--primary)]" title={productLine.owner || productLine.ownerName || '暂无'}>负责人：{productLine.owner || productLine.ownerName || '暂无'}</div>
              </div>
              <div className="mt-4 flex min-w-0 items-center justify-between gap-4 border-t border-[var(--border-main)] pt-3 text-xs">
                <span className="font-mono font-medium text-[var(--text-body)]">线上版本：{onlineVersion?.code || onlineVersion?.name || '暂无发布'}</span>
                <span className="shrink-0 text-[var(--text-muted)]">发布时间：{onlineVersion ? onlinePublishedAt : '无发布'}</span>
              </div>
          </div>

          {/* Three Key Leads Display Bar (需求负责人、技术负责人、测试负责人) */}
          <div className="pt-2 border-t border-[var(--border-main)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 需求负责人 */}
              <div className="product-line-lead-card p-3 rounded-xl bg-[var(--bg-surface-soft)] border border-[var(--border-main)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">
                  PO
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-[var(--text-muted)]">产品责任人 (Product Owner)</div>
                  <div className="mt-0.5 truncate text-sm font-bold">
                    <span className="text-[var(--primary)]">主：{productLine.requirementOwner || '暂无'}</span>{productLine.requirementOwnerSecondary && <span className="text-[var(--text-body)]"> · 次：{productLine.requirementOwnerSecondary}</span>}
                  </div>
                  <div className="text-[10px] text-purple-400/90 font-medium mt-0.5">
                    负责产品矩阵定位、需求全生命周期规划
                  </div>
                </div>
              </div>

              {/* 技术负责人 */}
              <div className="product-line-lead-card p-3 rounded-xl bg-[var(--bg-surface-soft)] border border-[var(--border-main)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--active-text)] font-bold text-xs">
                  TL
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-[var(--text-muted)]">研发责任人 (Tech Lead)</div>
                  <div className="mt-0.5 truncate text-sm font-bold">
                    <span className="text-[var(--primary)]">主：{productLine.techOwner || '暂无'}</span>{productLine.techOwnerSecondary && <span className="text-[var(--text-body)]"> · 次：{productLine.techOwnerSecondary}</span>}
                  </div>
                  <div className="text-[10px] text-[var(--active-text)]/90 font-medium mt-0.5">
                    把控系统架构演进、技术选型与高可用交付
                  </div>
                </div>
              </div>

              {/* 测试负责人 */}
              <div className="product-line-lead-card p-3 rounded-xl bg-[var(--bg-surface-soft)] border border-[var(--border-main)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  QA
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-[var(--text-muted)]">测试责任人 (QA Lead)</div>
                  <div className="mt-0.5 truncate text-sm font-bold">
                    <span className="text-[var(--primary)]">主：{productLine.testOwner || '暂无'}</span>{productLine.testOwnerSecondary && <span className="text-[var(--text-body)]"> · 次：{productLine.testOwnerSecondary}</span>}
                  </div>
                  <div className="text-[10px] text-emerald-400/90 font-medium mt-0.5">
                    负责封版验收、自动化回归与质量基线
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>}

      {activeTab === 'basic' && <section className="border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">产品动态</h3>
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {activityGroups.map(([date, activities]) => <section key={date} className="space-y-2"><div className="inline-flex rounded-md bg-[var(--bg-surface-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">{date === '暂无日期' ? date : `${date} ${new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { weekday: 'short' })}`}</div><div className="space-y-1">{[...activities].sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || ''))).map((activity) => <div key={activity.id} className="flex min-w-0 items-center gap-3 py-3 text-xs"><PersonAvatar name={activity.operatorName || currentUser.name || '系'} size={32} /><span className="w-16 shrink-0 font-mono text-sm font-semibold text-[var(--text-muted)]">{activity.createdAt ? activity.createdAt.slice(11, 16) : '--:--'}</span><span className="min-w-0 flex-1 break-words text-sm text-[var(--text-body)]">{activity.operatorName || currentUser.name} {activity.action} <span className="text-[var(--active-text)]">{activity.detail || ''}</span></span></div>)}</div></section>)}
            {activityItems.length === 0 && <div className="py-12 text-center text-sm text-[var(--text-muted)]">暂无产品动态</div>}
          </div>
        </div>
      </section>}

      {activeTab !== 'basic' && <div ref={tabWorkspaceRef} className="product-line-tab-workspace min-h-[calc(100vh-180px)]">
      {/* Tabs Navigation */}
      <div className="hidden">
        <button
          onClick={() => setActiveTab('board')}
          aria-selected={activeTab === 'board'}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'board'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>产品看板</span>
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          aria-selected={activeTab === 'versions'}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'versions'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>产品迭代</span>
        </button>
        <button onClick={() => setActiveTab('hours')} aria-selected={activeTab === 'hours'} className={`shrink-0 border-b-2 px-3.5 pb-3 font-bold transition-colors ${activeTab === 'hours' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><Clock className="mr-1 inline h-3.5 w-3.5" />产品工时</button>
        <button onClick={() => setActiveTab('performance')} aria-selected={activeTab === 'performance'} className={`shrink-0 border-b-2 px-3.5 pb-3 font-bold transition-colors ${activeTab === 'performance' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><TrendingUp className="mr-1 inline h-3.5 w-3.5" />产品效能</button>
      </div>

      {activeTab === 'board' && <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-[var(--text-primary)]">产品看板</h2><p className="mt-1 text-xs text-[var(--text-muted)]">按任务类型和处理状态查看当前产品的工作项分布。</p></div><Dropdown menu={{ items: [{ key: 'requirement', label: '产品' }, { key: 'design', label: '设计' }, { key: 'dev', label: '研发' }, { key: 'test', label: '测试' }, { key: 'bug', label: '缺陷' }], onClick: ({ key }) => openBoardTaskCreate(key as 'requirement' | 'design' | 'dev' | 'test' | 'bug') }} trigger={['click']}><Button className="product-board-create-button !h-9" size="small" icon={<Plus className="h-3.5 w-3.5" />}>新建<DownOutlined className="text-[10px]" /></Button></Dropdown></div>}
      {activeTab === 'hours' && <div className="mb-4"><h2 className="text-base font-bold text-[var(--text-primary)]">产品工时</h2><p className="mt-1 text-xs text-[var(--text-muted)]">汇总当前产品工作项的预计工时、实际投入和人员分布。</p></div>}
      {activeTab === 'performance' && <div className="mb-4"><h2 className="text-base font-bold text-[var(--text-primary)]">产品效能</h2><p className="mt-1 text-xs text-[var(--text-muted)]">基于当前产品工作项汇总，帮助快速了解交付和质量状态。</p></div>}

      {(activeTab === 'board' || activeTab === 'hours' || activeTab === 'performance') && (workItemsQuery.isPending
        ? <div className="min-h-[calc(100vh-280px)] py-12 text-center text-xs text-[var(--text-muted)]">正在加载产品工作项...</div>
        : workItemsQuery.isError
          ? <div className="py-12 text-center text-xs text-[var(--danger)]">工作项加载失败 <Button size="small" onClick={() => workItemsQuery.refetch()}>重试</Button></div>
          : activeTab === 'board'
            ? <Card size="small" className="product-line-board-panel flex min-h-[calc(100vh-280px)] h-full flex-col [&>.ant-card-body]:min-h-0 [&>.ant-card-body]:flex-1">
                <ProductLineBoard items={workItems} versions={lineVersions} onOpenItem={setDetailWorkItem} onOpenCategory={(category) => navigateWithLine(({ requirement: 'prod_req_tasks', design: 'prod_design_tasks', dev: 'prod_rd_tasks', test: 'prod_test_tasks', bug: 'prod_bugs' } as const)[category])} />
              </Card>
            : activeTab === 'hours'
              ? <ProductLineHours items={workItems} memberCount={memberCount} />
              : <ProductLinePerformance items={workItems} />)}

      {/* Tab 1: 版本迭代计划 */}
      {activeTab === 'versions' && (
        <div className="space-y-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">产品迭代</h2>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                记录该产品已发布及规划中的各版本周期、阶段排期与关联产品任务。
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button className="product-version-create-button !h-9" size="small" onClick={() => { setEditingVersion(null); setIsCreateVersionOpen(true); }} icon={<Plus className="w-3.5 h-3.5" />}>新建版本</Button>
              <Button className="!h-9" size="small" onClick={() => navigateWithLine('prod_versions', 'detail', true)} icon={<GitBranch className="w-3.5 h-3.5" />}>版本管理</Button>
            </div>
          </div>

          <div className="min-h-[calc(100vh-280px)] rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
            <ProductIterationTimeline productLineId={productLine.id} versions={lineVersions} onOpenVersion={openVersionDetail} onOpenItem={setDetailWorkItem} />
          </div>

        </div>
      )}
      </div>}

      </main>
      {activeTab === 'basic' && <aside className="min-w-0 space-y-5">
        <section ref={statsPanelRef}>
          <Card size="small" title={<span className="text-sm font-bold text-[var(--text-primary)]">统计</span>} className="product-line-stat-panel h-full">
          {workItemsQuery.isError ? <div className="p-2 text-xs text-[var(--danger)]">统计加载失败 <Button size="small" onClick={() => workItemsQuery.refetch()}>重试</Button></div> : <div className="grid grid-cols-2 gap-3">
            {productLineStatCards.map(({ label, category, tone }) => {
              const scoped = category === 'assistance'
                ? workItems.filter((item) => item.category === 'requirement' && item.sourceType === 'WORK_ORDER')
                : workItems.filter((item) => item.category === category && (category !== 'requirement' || item.sourceType !== 'WORK_ORDER'));
              return <div key={category} className="product-line-stat-card flex flex-col items-center justify-center gap-1.5 rounded-lg bg-[var(--bg-surface-soft)] p-3 text-center"><div className="flex items-center justify-center gap-1.5 text-xs font-normal text-[var(--text-primary)]"><WorkItemCategoryIcon category={category} className={`h-3.5 w-3.5 ${tone}`} /><span>{label}</span></div><div className={`text-xl font-bold font-mono tabular-nums ${category === 'bug' ? tone : 'text-[var(--text-primary)]'}`}>{workItemsQuery.isPending ? '--' : scoped.length}</div></div>;
            })}
          </div>}
          </Card>
        </section>
        <section className="border border-[var(--border-main)] bg-[var(--bg-surface)] p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">成员管理</h3>
            <div className="flex items-center gap-1">
              <Button type="text" style={{ color: 'var(--primary)' }} className="hover:text-[var(--active-text)]" aria-label="添加成员" title="添加成员" icon={<UserAddOutlined style={{ color: 'var(--primary)' }} />} onClick={() => setIsManageMembersOpen(true)} />
              <Button type="text" aria-label="成员设置" title="成员设置" icon={<SettingOutlined />} onClick={() => { setSettingsSection('members'); setIsSettingsOpen(true); }} />
            </div>
          </div>

          <div className="divide-y divide-[var(--border-main)]">
          {memberRoleGroups.map((group) => (
            <section key={group.label} className="flex items-center gap-3 py-2 first:pt-1 last:pb-1">
              <span className="w-16 shrink-0 rounded bg-[var(--primary)]/10 px-2 py-1 text-center text-[11px] font-semibold text-[var(--active-text)]">{group.label}</span>
              <div className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-2">
                {group.members.map((member) => (
                  <div key={member.id} className="flex min-w-0 items-center gap-2">
                    <PersonAvatar name={member.name} size={28} />
                    <div className="max-w-24 truncate text-xs text-[var(--text-body)]" title={member.name}>{member.name}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          </div>
          {memberRoleGroups.length === 0 && <div className="py-6 text-center text-xs text-[var(--text-muted)]">暂无成员</div>}
        </div>
        </section>

      </aside>
      }
      </div>

      {/* Modal: Edit Leads Modal */}
      <Modal
        isOpen={isEditLeadsOpen}
        onClose={() => { resetLeadForm(); setIsEditLeadsOpen(false); }}
        title="责任人配置"
        headerIcon={<UserCheck className="w-5 h-5" />}
        subtitle={<span>产品：<span className="font-medium text-[var(--active-text)]">{productLine.name}</span> ({productLine.code})</span>}
        footer={
          <>
            <Button
              onClick={() => { resetLeadForm(); setIsEditLeadsOpen(false); }}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              form="edit-leads-form"
            >
              保存
            </Button>
          </>
        }
      >
        <form id="edit-leads-form" onSubmit={handleSaveLeads} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              产品责任人 (Product Owner / PO) *
            </label>
            <Select
              showSearch
              allowClear
              className="w-full"
              value={leadReqOwnerUserId || undefined}
              onChange={(value) => setLeadReqOwnerUserId(value || '')}
              options={leadOptions}
              placeholder="选择主负责人"
              optionFilterProp="label"
            />
            <Select showSearch allowClear className="w-full mt-2" value={leadReqOwnerSecondaryUserId || undefined} onChange={(value) => setLeadReqOwnerSecondaryUserId(value || '')} options={leadOptions} placeholder="选择次责任人" optionFilterProp="label" />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">负责业务调研、PRD规划评审与需求优先级排序</p>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              研发责任人 (Tech Lead / 架构师) *
            </label>
            <Select
              showSearch
              allowClear
              className="w-full"
              value={leadTechOwnerUserId || undefined}
              onChange={(value) => setLeadTechOwnerUserId(value || '')}
              options={leadOptions}
              placeholder="选择主负责人"
              optionFilterProp="label"
            />
            <Select showSearch allowClear className="w-full mt-2" value={leadTechOwnerSecondaryUserId || undefined} onChange={(value) => setLeadTechOwnerSecondaryUserId(value || '')} options={leadOptions} placeholder="选择次责任人" optionFilterProp="label" />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">负责技术选型、架构高可用审查与研发任务攻坚</p>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              测试责任人 (QA Lead / 质量主管) *
            </label>
            <Select
              showSearch
              allowClear
              className="w-full"
              value={leadTestOwnerUserId || undefined}
              onChange={(value) => setLeadTestOwnerUserId(value || '')}
              options={leadOptions}
              placeholder="选择主负责人"
              optionFilterProp="label"
            />
            <Select showSearch allowClear className="w-full mt-2" value={leadTestOwnerSecondaryUserId || undefined} onChange={(value) => setLeadTestOwnerSecondaryUserId(value || '')} options={leadOptions} placeholder="选择次责任人" optionFilterProp="label" />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">负责版本封版验收、自动化测试回归与缺陷归零把控</p>
          </div>
        </form>
      </Modal>

      {boardCreateKind && activeTab === 'board' && (
        <RequirementTasksView
          productLineFilter={productLine.id}
          itemLabel={
            {
              requirement: '产品任务',
              design: '设计任务',
              dev: '研发任务',
              test: '测试任务',
              bug: '缺陷'
            }[boardCreateKind]
          }
          taskKind={boardCreateKind}
          creationContext={{
            productLineId: productLine.id,
            onClose: () => setBoardCreateKind(null),
            onCreated: () => {
              setBoardCreateKind(null);
              void workItemsQuery.refetch();
            }
          }}
        />
      )}

      {detailWorkItem && <RequirementTasksView
        key={`${detailWorkItem.category}-${detailWorkItem.id}`}
        productLineFilter={productLine.id}
        itemLabel={{ requirement: '产品任务', design: '设计任务', dev: '研发任务', test: '测试任务', bug: '缺陷任务' }[detailWorkItem.category] || '任务'}
        taskKind={detailWorkItem.category as 'requirement' | 'design' | 'dev' | 'test' | 'bug'}
        initialDetail={{ ...detailWorkItem, ownerName: detailWorkItem.assigneeName || '', status: detailWorkItem.status?.name || '未设置', productLineName: productLine.name } as unknown as RequirementTask}
        onDetailClose={() => setDetailWorkItem(null)}
      />}

      {/* Modal 3: Create Version Modal (满足第4点) */}
      <CreateVersionModal
        isOpen={isCreateVersionOpen}
        onClose={() => { setIsCreateVersionOpen(false); setEditingVersion(null); }}
        productLine={productLine}
        editingVersion={editingVersion}
      />

      {/* Modal 4: Manage Members Modal */}
      <ManageMembersModal
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        productLine={productLine}
      />
    </div>
  );
};
