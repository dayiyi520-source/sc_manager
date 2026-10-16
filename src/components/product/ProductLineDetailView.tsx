import { ProductInsightFilter, filterInsightItems, initialInsightFilter, insightDateRange } from './ProductInsightFilter';
import React, { useEffect, useState } from 'react';
import { Input, Select, Button, Dropdown } from 'antd';
import Card from 'antd/es/card/Card';
import { DownOutlined, SettingOutlined } from '@ant-design/icons';
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
  Globe,
  Share2,
  Activity,
  Package,
  TrendingUp,
  Sparkles,
  GitBranch
} from '../common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { ProductLine, ProductLineActivity, RequirementTask, VersionIteration } from '../../types';
import { normalizeResponsibilityNames } from './productResponsibilityPresentation';
import { productRepository, type UnifiedWorkItem } from '../../services/productRepository';
import { StatusTag, Modal } from '../common/UIComponents';
import { CreateVersionModal } from './CreateVersionModal';
import { normalizeProductWebsiteUrl } from './productWebsite';
import { PersonAvatar } from '../common/PersonIdentity';
import { ProductLineBoard, ProductLineHours, useProductLineWorkItems } from './ProductLineInsights';
import { ProductLinePerformance } from './ProductLinePerformance';
import { WorkItemCategoryIcon } from './WorkItemCategoryIcon';
import { formatVersionPublishedAt, latestReleasedVersion, productLineDisplayStatus } from './productLinePresentation';
import { RequirementTasksView } from './RequirementTasksView';
import { ProductResponsibilitiesSettings } from './ProductResponsibilitiesSettings';
import { ProductDocumentsPanel } from './ProductDocumentsPanel';
import { ProductIterationTimeline } from './ProductIterationTimeline';

interface ProductLineDetailViewProps {
  productLineId: string;
  onBack: () => void;
  initialSettingsSection?: ProductLineSettingsSection;
}

export type ProductLineSettingsSection = 'basic' | 'responsibilities' | 'other';

const normalizeProductVisibility = (value?: ProductLine['visibility']): '公开' | '私密' =>
  value === '私密' || value === '部门可见' || value === '保密' || value === '仅创建者可见' ? '私密' : '公开';

const productLineStatCards = [
  { label: '协同事项', category: 'assistance' as const, tone: 'text-purple-400' },
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
  initialSection?: ProductLineSettingsSection;
  embedded?: boolean;
}> = ({ productLine, onBack, onProductRemoved, initialSection, embedded }) => {
  const { updateProductLine, setProductLines, addToast } = useApp();
  const [section, setSection] = useState<ProductLineSettingsSection>(initialSection || 'basic');
  const [name, setName] = useState(productLine.name);
  const [code, setCode] = useState(productLine.code);
  const [website, setWebsite] = useState(productLine.website || '');
  const [sort, setSort] = useState(productLine.sort ?? 0);
  const [websiteError, setWebsiteError] = useState('');
  const [isSavingBasic, setIsSavingBasic] = useState(false);
  const [description, setDescription] = useState(productLine.description);
  const [commercialAvailability, setCommercialAvailability] = useState<ProductLine['commercialAvailability']>(productLine.commercialAvailability === '可商用' ? '可销售' : productLine.commercialAvailability === '不可商用' ? '不可销售' : productLine.commercialAvailability || '不可销售');
  const [visibility, setVisibility] = useState<'公开' | '私密'>(normalizeProductVisibility(productLine.visibility));
  const [pendingOperation, setPendingOperation] = useState<'archive' | null>(null);
  const [isOperating, setIsOperating] = useState(false);

  useEffect(() => {
    setName(productLine.name);
    setCode(productLine.code);
    setWebsite(productLine.website || '');
    setSort(productLine.sort ?? 0);
    setWebsiteError('');
    setDescription(productLine.description);
    setCommercialAvailability(productLine.commercialAvailability === '可商用' ? '可销售' : productLine.commercialAvailability === '不可商用' ? '不可销售' : productLine.commercialAvailability || '不可销售');
    setVisibility(normalizeProductVisibility(productLine.visibility));
  }, [productLine]);

  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  const saveBasicInfo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !productLine.code.trim()) {
      addToast('warning', '请填写产品名称');
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
    { id: 'responsibilities', label: '责任人配置' },
    { id: 'other', label: '其他' },
  ];

  const operationCopy = {
    archive: { title: '归档产品', description: '归档后，产品将从产品管理列表移至产研模板的归档列表。', confirm: '确认归档' }
  } as const;
  const executeOperation = async () => {
    if (!pendingOperation) return;
    setIsOperating(true);
    try {
      if (pendingOperation === 'archive') await productRepository.archiveProductLine(productLine.id);
      const refreshedProductLines = await productRepository.productLines();
      setProductLines(refreshedProductLines);
      if (pendingOperation === 'archive') {
        addToast('success', '产品已归档');
        setPendingOperation(null);
        onProductRemoved();
        return;
      }
    } catch (error) {
      addToast('error', `${operationCopy[pendingOperation].title}失败`, error instanceof Error ? error.message : '请稍后重试');
    } finally {
      setIsOperating(false);
    }
  };

  return (
    <div className="product-line-settings space-y-5 animate-in fade-in duration-200">
      {!embedded && <div className="flex min-w-0 items-center gap-3 border-b border-[var(--border-main)] pb-3">
        <Button type="text" onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>返回</Button>
        <span className="text-sm font-medium text-[var(--text-primary)]">产品详情</span>
        <span className="h-4 w-px bg-[var(--border-main)]" aria-hidden="true" />
        <span className="min-w-0 truncate text-sm font-semibold text-[var(--active-text)]" title={`${productLine.name} ${productLine.code}`}>{productLine.name}</span>
        <span className="shrink-0 font-mono text-xs text-[var(--text-muted)]">{productLine.code}</span>
      </div>}

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
          {section === 'responsibilities' && <ProductResponsibilitiesSettings key={productLine.id} productLine={productLine} />}
          {section === 'basic' && (
            <form onSubmit={saveBasicInfo} className="mx-auto w-full max-w-2xl space-y-5 text-xs">
              <div><h3 className="text-sm font-bold text-[var(--text-primary)]">基本信息</h3><p className="mt-1 text-[var(--text-muted)]">维护产品的名称、编码、网址、可见范围和简介。</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>产品名称 *</span><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入产品名称" /></label>
                <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>产品编码</span><Input value={code} disabled readOnly /></label>
              </div>
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
              <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>是否销售</span><Select value={commercialAvailability} onChange={setCommercialAvailability} options={[{ value: '可销售', label: '可销售' }, { value: '不可销售', label: '不可销售' }]} /></label>
              <label className="flex flex-col gap-[5px] font-medium text-[var(--text-body)]"><span>排序</span><Input type="number" min={0} max={999} step={1} value={sort} onChange={(event) => setSort(Number(event.target.value))} /></label>
              <div className="flex justify-end"><Button type="primary" htmlType="submit" loading={isSavingBasic}>保存基本信息</Button></div>
            </form>
          )}
          {section === 'other' && <div className="w-full space-y-5 px-0 text-xs sm:px-2 lg:px-4"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">产品操作</h3><p className="mt-1 text-[var(--text-muted)]">管理产品归档。</p></div><div className="space-y-3"><div className="flex min-h-16 flex-col justify-between gap-4 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4 sm:flex-row sm:items-center"><div><h4 className="text-sm font-semibold text-[var(--text-primary)]">产品归档</h4><p className="mt-1 text-[var(--text-muted)]">产品完成后可归档，归档产品统一在产研模板中管理。</p></div><Button className="!h-9" type="primary" onClick={() => setPendingOperation('archive')}>归档</Button></div></div></div>}
        </section>
      </div>
      <Modal isOpen={Boolean(pendingOperation)} onClose={() => !isOperating && setPendingOperation(null)} title={pendingOperation ? operationCopy[pendingOperation].title : ''} footer={<><Button disabled={isOperating} onClick={() => setPendingOperation(null)}>取消</Button><Button type="primary" danger loading={isOperating} onClick={() => void executeOperation()}>{pendingOperation ? operationCopy[pendingOperation].confirm : '确认'}</Button></>}><p className="text-sm text-[var(--text-body)]">{pendingOperation ? operationCopy[pendingOperation].description : ''}</p></Modal>
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
    versions,
    currentUser,
    addToast,
    openPageTab
  } = useApp();

  const productLine = productLines.find((pl) => pl.id === productLineId);

  // Modals state
  const [boardCreateKind, setBoardCreateKind] = useState<'requirement' | 'design' | 'dev' | 'test' | 'bug' | null>(null);
  const [detailWorkItem, setDetailWorkItem] = useState<UnifiedWorkItem | null>(null);
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<VersionIteration | null>(null);
  const [settingsSection, setSettingsSection] = useState<ProductLineSettingsSection>(initialSettingsSection || 'basic');

  useEffect(() => {
    if (initialSettingsSection) {
      setBoardCreateKind(null);
      setSettingsSection(initialSettingsSection);
      setActiveTab('settings');
    }
  }, [initialSettingsSection]);

  // Tabs state for sub-entities
  const [activeTab, setActiveTab] = useState<'basic' | 'board' | 'versions' | 'documents' | 'hours' | 'performance' | 'settings'>(initialSettingsSection ? 'settings' : 'basic');
  const [insightFilter, setInsightFilter] = useState(initialInsightFilter);
  useEffect(() => setInsightFilter(initialInsightFilter), [productLineId]);
  const workItemsQuery = useProductLineWorkItems(productLineId);
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

  const memberCount = new Set([...(productLine.members || []).map((member) => typeof member === 'string' ? member : member.name), productLine.owner, productLine.ownerName, productLine.requirementOwner, productLine.techOwner, productLine.testOwner, productLine.deliveryOwner].filter(Boolean)).size;
  const activityItems: ProductLineActivity[] = productLine.activities?.length
    ? productLine.activities
    : lineVersions.map((version) => ({ id: version.id, action: '创建了版本', detail: version.code || version.name, operatorName: currentUser.name, createdAt: version.createdAt || version.releaseDate || '' }));
  const activityTimestamp = (activity: ProductLineActivity) => activity.createdAt || activity.timestamp || activity.createdTime || activity.updatedAt || '';
  const activityGroups = Object.entries(activityItems.reduce<Record<string, ProductLineActivity[]>>((groups, activity) => {
    const timestamp = activityTimestamp(activity);
    const dateKey = timestamp ? timestamp.slice(0, 10) : '暂无日期';
    (groups[dateKey] ||= []).push(activity);
    return groups;
  }, {})).sort(([left], [right]) => right.localeCompare(left));
  const workItems = workItemsQuery.data || [];
  const insightItems = filterInsightItems(workItems, insightFilter);
  const pendingByCategory = (category: string) => workItems.filter((item) => item.category === category && (item.status?.group === 'NOT_STARTED' || item.status?.group === 'IN_PROGRESS')).length;

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
              ['documents', '产品文档', FileText],
              ['hours', '产品工时', Clock],
              ['performance', '产品效能', TrendingUp],
              ['settings', '产品设置', Package]
            ] as const).map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setActiveTab(key)} aria-selected={activeTab === key} className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-4 text-xs font-bold transition-colors sm:px-4 ${activeTab === key ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}><Icon className="h-3.5 w-3.5" />{label}</button>)}
          </nav>
        </div>

      </div>

      {activeTab === 'basic' && <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">基本信息</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">查看产品概况、责任人配置、最新发布版本和产品动态。</p>
        </div>
      </div>}

      {activeTab === 'settings' && <ProductLineSettingsPanel embedded productLine={productLine} initialSection={settingsSection} onBack={() => setActiveTab('basic')} onProductRemoved={onBack} />}
      {activeTab === 'documents' && <ProductDocumentsPanel key={productLine.id} productLine={productLine} />}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,1fr)]">
      <main className={`min-w-0 space-y-5 ${activeTab !== 'basic' ? 'xl:col-span-2' : ''}`}>
      {/* Hero Overview Banner with Cover */}
      {activeTab === 'basic' && <div className="product-line-hero relative rounded-md border border-[var(--border-main)] overflow-hidden bg-[var(--bg-surface)]">
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
              最新发布版本 {onlineVersion?.code || onlineVersion?.name || '暂无发布'}
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
                <StatusTag type={productStatus === '空闲中' ? 'default' : 'info'} status={productStatus} />
              </div>
              <div className="mt-1 flex items-start justify-between gap-6">
                <p className="min-w-0 max-w-3xl text-xs leading-relaxed text-[var(--text-body)]">
                  {productLine.description}
                </p>
              </div>
              <div className="mt-4 flex min-w-0 items-center justify-between gap-4 border-t border-[var(--border-main)] pt-3 text-xs">
                <span className="font-mono font-medium text-[var(--text-body)]">最新发布版本：{onlineVersion?.code || onlineVersion?.name || '暂无发布'}</span>
                <span className="shrink-0 text-[var(--text-muted)]">发布时间：{onlineVersion ? onlinePublishedAt : '无发布'}</span>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[var(--border-main)] pt-4 sm:grid-cols-3">
            {workItemsQuery.isError ? <div role="alert" className="col-span-full text-xs text-[var(--danger)]">统计加载失败 <Button size="small" onClick={() => workItemsQuery.refetch()}>重试</Button></div> : productLineStatCards.map(({ label, category, tone }) => {
              const scoped = category === 'assistance'
                ? workItems.filter((item) => item.category === 'requirement' && item.sourceType === 'WORK_ORDER')
                : workItems.filter((item) => item.category === category && (category !== 'requirement' || item.sourceType !== 'WORK_ORDER'));
              return <div key={category} className="product-line-stat-card flex min-h-16 flex-col items-center justify-center gap-1 rounded-md bg-[var(--bg-surface-soft)] p-2 text-center"><div className="flex items-center gap-1.5 text-xs text-[var(--text-primary)]"><WorkItemCategoryIcon category={category} className={`h-3.5 w-3.5 ${tone}`} />{label}</div><span className={`font-mono text-xl font-bold ${category === 'bug' ? tone : 'text-[var(--text-primary)]'}`}>{workItemsQuery.isPending ? '--' : scoped.length}</span></div>;
            })}
          </div>

        </div>
      </div>}

      {activeTab === 'basic' && <section className="border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-[var(--text-primary)]">责任人管理</h3><Button type="text" aria-label="责任人配置" title="责任人配置" icon={<SettingOutlined />} onClick={() => { setSettingsSection('responsibilities'); setActiveTab('settings'); }} /></div>
        <div className="divide-y divide-[var(--border-main)]">
          {([
            ['产品', productLine.requirementOwner, productLine.requirementOwnerSecondary],
            ['研发', productLine.techOwner, productLine.techOwnerSecondary],
            ['测试', productLine.testOwner, productLine.testOwnerSecondary],
            ['交付', productLine.deliveryOwner, productLine.deliveryOwnerSecondary]
          ] as const).map(([role, primary, secondary]) => <div key={role} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0"><span className="w-16 shrink-0 rounded bg-[var(--primary)]/10 px-2 py-1 text-center text-[11px] font-semibold text-[var(--active-text)]">{role}</span><div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2"><span className="inline-flex min-w-0 items-center gap-2 text-xs text-[var(--primary)]" title={`${role}主责任人：${primary || '未设置'}`}><PersonAvatar name={primary} size={24} /><span className="break-words font-semibold">{primary || '未设置'}</span></span>{(normalizeResponsibilityNames(secondary).length ? normalizeResponsibilityNames(secondary) : ['未设置']).map((name, index) => <span key={`${name}-${index}`} className="inline-flex min-w-0 items-center gap-2 text-xs text-[var(--text-muted)]" title={`${role}次责任人：${name}`}><PersonAvatar name={name} size={24} /><span className="break-words">{name}</span></span>)}</div></div>)}
        </div>
      </section>}

      {activeTab !== 'basic' && activeTab !== 'settings' && activeTab !== 'documents' && <div className="product-line-tab-workspace min-h-[calc(100vh-180px)]">
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
      {activeTab === 'hours' && <div className="mb-4 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-base font-bold text-[var(--text-primary)]">产品工时</h2><p className="mt-1 text-xs text-[var(--text-muted)]">汇总当前产品工作项的预计工时、实际投入和人员分布。</p></div><ProductInsightFilter value={insightFilter} onChange={setInsightFilter} versions={lineVersions} /></div>}
      {activeTab === 'performance' && <div className="mb-4 flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-base font-bold text-[var(--text-primary)]">产品效能</h2><p className="mt-1 text-xs text-[var(--text-muted)]">基于当前产品工作项汇总，帮助快速了解交付和质量状态。</p></div><ProductInsightFilter value={insightFilter} onChange={setInsightFilter} versions={lineVersions} /></div>}

      {(activeTab === 'hours' || activeTab === 'performance') && insightFilter.mode === 'time' && <p className="mb-4 text-xs text-[var(--text-muted)]">按工作项创建时间筛选，工时为所选工作项的累计值。{insightFilter.period === 'custom' && !insightFilter.range ? '请选择时间范围。' : ''}</p>}
      {(activeTab === 'board' || activeTab === 'hours' || activeTab === 'performance') && (workItemsQuery.isPending
        ? <div className="min-h-[calc(100vh-280px)] py-12 text-center text-xs text-[var(--text-muted)]">正在加载产品工作项...</div>
        : workItemsQuery.isError
          ? <div className="py-12 text-center text-xs text-[var(--danger)]">工作项加载失败 <Button size="small" onClick={() => workItemsQuery.refetch()}>重试</Button></div>
          : activeTab === 'board'
            ? <Card size="small" className="product-line-board-panel flex min-h-[calc(100vh-280px)] h-full flex-col [&>.ant-card-body]:min-h-0 [&>.ant-card-body]:flex-1">
                <ProductLineBoard items={workItems} versions={lineVersions} onOpenItem={setDetailWorkItem} onOpenCategory={(category) => navigateWithLine(({ requirement: 'prod_req_tasks', design: 'prod_design_tasks', dev: 'prod_rd_tasks', test: 'prod_test_tasks', bug: 'prod_bugs' } as const)[category])} />
              </Card>
            : activeTab === 'hours'
              ? <ProductLineHours items={insightItems} memberCount={memberCount} />
              : <ProductLinePerformance items={insightItems} dateRange={insightDateRange(insightFilter)} />)}

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
      {activeTab === 'basic' && <aside className="min-w-0 xl:self-stretch">
        <section className="border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
        <div className="space-y-4 xl:flex xl:min-h-0 xl:flex-1 xl:flex-col">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">产品动态</h3>
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1 xl:max-h-none xl:min-h-0 xl:flex-1">
            {activityGroups.map(([date, activities]) => <section key={date} className="space-y-2"><div className="inline-flex rounded-md bg-[var(--bg-surface-soft)] px-3 py-2 text-xs text-[var(--text-muted)]">{date === '暂无日期' ? date : `${date} ${new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { weekday: 'short' })}`}</div><div className="space-y-1">{[...activities].sort((left, right) => activityTimestamp(right).localeCompare(activityTimestamp(left))).map((activity) => { const timestamp = activityTimestamp(activity); return <div key={activity.id} className="flex min-w-0 items-center gap-3 py-3 text-xs"><PersonAvatar name={activity.operatorName || currentUser.name || '系'} size={32} /><span className="w-16 shrink-0 font-mono text-sm font-semibold text-[var(--text-muted)]">{timestamp ? timestamp.slice(11, 16) : '--:--'}</span><span className="min-w-0 flex-1 break-words text-sm text-[var(--text-body)]">{activity.operatorName || currentUser.name} {activity.action} <span className="text-[var(--active-text)]">{activity.detail || ''}</span></span></div>; })}</div></section>)}
            {activityItems.length === 0 && <div className="py-12 text-center text-sm text-[var(--text-muted)]">暂无产品动态</div>}
          </div>
        </div>
      </section>
      </aside>}
      </div>

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

    </div>
  );
};
