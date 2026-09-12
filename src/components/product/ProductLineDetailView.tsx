import React, { useEffect, useState } from 'react';
import { Avatar, Input, Select, Button, Switch } from 'antd';
import { UserAddOutlined, SettingOutlined } from '@ant-design/icons';
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
  Trash2,
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
import { ProductLine, ProductLineActivity, ProductLineMember, VersionIteration } from '../../types';
import { StatusTag, Modal } from '../common/UIComponents';
import { CreateVersionModal } from './CreateVersionModal';
import { ManageMembersModal } from './ManageMembersModal';

interface ProductLineDetailViewProps {
  productLineId: string;
  onBack: () => void;
}

type ProductLineSettingsSection = 'basic' | 'members' | 'work-items' | 'notifications' | 'automation';

const ProductLineSettingsPanel: React.FC<{
  productLine: ProductLine;
  onBack: () => void;
  onOpenMembers: () => void;
}> = ({ productLine, onBack, onOpenMembers }) => {
  const { updateProductLine, addToast } = useApp();
  const [section, setSection] = useState<ProductLineSettingsSection>('basic');
  const [name, setName] = useState(productLine.name);
  const [code, setCode] = useState(productLine.code);
  const [description, setDescription] = useState(productLine.description);
  const [visibility, setVisibility] = useState<ProductLine['visibility']>(productLine.visibility || '公开');

  useEffect(() => {
    setName(productLine.name);
    setCode(productLine.code);
    setDescription(productLine.description);
    setVisibility(productLine.visibility || '公开');
  }, [productLine]);

  const saveBasicInfo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !code.trim()) {
      addToast('warning', '请填写产品线名称和编码');
      return;
    }
    try {
      await updateProductLine(productLine.id, {
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || '该产品线还没有任何简介内容。',
        visibility
      });
    } catch (error) {
      addToast('error', '产品线设置保存失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  const sections: Array<{ id: ProductLineSettingsSection; label: string }> = [
    { id: 'basic', label: '基本信息' },
    { id: 'members', label: '项目成员' },
    { id: 'work-items', label: '工作项设置' },
    { id: 'notifications', label: '通知' },
    { id: 'automation', label: '自动化规则' }
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 border-b border-[var(--border-main)] pb-3">
        <Button onClick={onBack} icon={<ArrowLeft className="w-3.5 h-3.5" />}>返回产品线详情</Button>
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">产品线设置</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]"><span className="font-medium text-[var(--active-text)]">{productLine.name}</span> ({productLine.code})</p>
        </div>
      </div>

      <div className="grid min-h-[520px] grid-cols-1 border border-[var(--border-main)] bg-[var(--bg-surface)] md:grid-cols-[190px_minmax(0,1fr)]">
        <nav className="border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3 md:border-b-0 md:border-r" aria-label="产品线设置菜单">
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
            <form onSubmit={saveBasicInfo} className="max-w-2xl space-y-5 text-xs">
              <div><h3 className="text-sm font-bold text-[var(--text-primary)]">基本信息</h3><p className="mt-1 text-[var(--text-muted)]">维护产品线的名称、编码、可见范围和简介。</p></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block font-medium text-[var(--text-body)]">产品线名称 *<Input className="mt-1.5" value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入产品线名称" /></label>
                <label className="block font-medium text-[var(--text-body)]">产品线编码 *<Input className="mt-1.5" value={code} onChange={(event) => setCode(event.target.value)} placeholder="请输入产品线编码" /></label>
              </div>
              <label className="block font-medium text-[var(--text-body)]">可见范围<Select className="mt-1.5 w-full" value={visibility} onChange={setVisibility} options={['公开', '部门可见', '保密'].map((value) => ({ value, label: value }))} /></label>
              <label className="block font-medium text-[var(--text-body)]">产品线简介<Input.TextArea className="mt-1.5" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="请输入产品线简介" /></label>
              <div className="flex justify-end"><Button type="primary" htmlType="submit">保存基本信息</Button></div>
            </form>
          )}
          {section === 'members' && (
            <div className="max-w-2xl space-y-5 text-xs"><div><h3 className="text-sm font-bold text-[var(--text-primary)]">项目成员</h3><p className="mt-1 text-[var(--text-muted)]">配置产品线成员及其角色。</p></div><div className="rounded-md border border-[var(--border-main)] divide-y divide-[var(--border-main)]">{(productLine.members || []).length ? (productLine.members || []).map((member, index) => { const item = typeof member === 'string' ? { name: member, role: '参与人' } : member; return <div key={`${item.name}-${index}`} className="flex items-center gap-3 p-3"><Avatar size={28}>{item.name.slice(0, 1)}</Avatar><span className="font-medium text-[var(--text-primary)]">{item.name}</span><span className="ml-auto text-[var(--text-muted)]">{item.role}</span></div>; }) : <div className="p-4 text-[var(--text-muted)]">暂无成员</div>}</div><Button type="primary" onClick={onOpenMembers} icon={<UserAddOutlined style={{ color: 'var(--primary)' }} />}>管理项目成员</Button></div>
          )}
          {section === 'work-items' && <SettingsPlaceholder title="工作项设置" description="需求、缺陷和研发任务沿用当前产品线的工作流与字段规则。" />}
          {section === 'notifications' && <SettingsPlaceholder title="通知" description="产品线成员、负责人和版本变更通知将在此统一配置。" />}
          {section === 'automation' && <SettingsPlaceholder title="自动化规则" description="自动化规则将在配置完成后按产品线范围执行。" />}
        </section>
      </div>
    </div>
  );
};

const SettingsPlaceholder: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="max-w-2xl space-y-2 text-xs"><h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3><p className="text-[var(--text-muted)]">{description}</p><div className="mt-5 border border-dashed border-[var(--border-main)] p-5 text-[var(--text-muted)]">暂无可配置项</div></div>
);

export const ProductLineDetailView: React.FC<ProductLineDetailViewProps> = ({
  productLineId,
  onBack
}) => {
  const {
    productLines,
    updateProductLine,
    versions,
    requirementPool,
    bugs,
    devTasks,
    currentUser,
    addToast,
    openPageTab
  } = useApp();

  const productLine = productLines.find((pl) => pl.id === productLineId);

  // Modals state
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<VersionIteration | null>(null);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditLeadsOpen, setIsEditLeadsOpen] = useState(false);

  // Tabs state for sub-entities
  const [activeTab, setActiveTab] = useState<'versions' | 'members' | 'activity'>('activity');

  // Edit Leads Form state
  const [leadReqOwner, setLeadReqOwner] = useState(productLine?.requirementOwner || '');
  const [leadTechOwner, setLeadTechOwner] = useState(productLine?.techOwner || '');
  const [leadTestOwner, setLeadTestOwner] = useState(productLine?.testOwner || '');

  if (!productLine) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm text-[var(--text-body)]">未找到指定产品线信息</p>
        <Button type="primary" onClick={onBack}>
          返回产品线列表
        </Button>
      </div>
    );
  }

  // Related data
  const lineVersions = versions.filter(
    (v) => v.productLineId === productLine.id || v.productLineName === productLine.name
  );
  const latestCreatedVersion = [...lineVersions].sort((a, b) => String(b.createdAt || b.releaseDate || b.endDate || '').localeCompare(String(a.createdAt || a.releaseDate || a.endDate || '')))[0]?.code || 'V1.0.0';
  const linkedRequirementIds = new Set(
    lineVersions.flatMap((version) => version.linkedRequirementIds || [])
  );
  const lineReqs = requirementPool.filter(
    (r) => r.productLineName === productLine.name || linkedRequirementIds.has(r.id)
  );
  const lineBugs = bugs.filter(
    (b) => b.productLineId === productLine.id || b.productLineName === productLine.name
  );
  const lineDevTasks = devTasks.filter(
    (t) => t.productLineName === productLine.name
  );
  const leadOptions = Array.from(new Set([
    currentUser?.name,
    ...productLines.flatMap((line) => [line.owner, line.ownerName, line.requirementOwner, line.techOwner, line.testOwner]),
    ...productLine.members?.map((member) => typeof member === 'string' ? member : member.name) || [],
    ...requirementPool.flatMap((task) => [task.ownerName, task.creatorName]),
    ...devTasks.map((task) => task.developer),
    ...bugs.map((bug) => bug.assignee),
    '王浩然',
    '陈小敏',
    '张瑞',
    '林志豪'
  ].filter(Boolean) as string[]));

  const pendingReqsCount = lineReqs.filter((r) => r.status !== '已转任务' && r.status !== '已转版本' && r.status !== '已拒绝').length;
  const pendingBugsCount = lineBugs.filter((b) => b.status !== '已关闭' && b.status !== '已拒绝').length;
  const pendingTasksCount = lineDevTasks.filter((t) => t.status !== '已合并上线').length;
  const totalTasksCount = lineDevTasks.length;
  const completedTasksCount = lineDevTasks.filter((t) => ['已完成', '已合并上线'].includes(t.status)).length;
  const progressText = `${totalTasksCount ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0}%`;

  const navigateWithLine = (menuId: string, tab?: string, applyFilter = true) => {
    if (applyFilter) sessionStorage.setItem('shichuang.productLineFilter', productLine.id);
    else sessionStorage.removeItem('shichuang.productLineFilter');
    if (tab) sessionStorage.setItem('shichuang.productLineTargetTab', tab);
    window.dispatchEvent(new Event('shichuang:product-line-context'));
    openPageTab(menuId);
  };

  const normalizeRole = (role?: string) => {
    if (!role) return '参与人';
    if (role === '管理员' || role.includes('综合负责人')) return '管理员';
    if (role === '产品' || role.includes('需求') || role.includes('产品')) return '产品';
    if (role === '研发' || role.includes('技术') || role.includes('架构') || role.includes('研发')) return '研发';
    if (role === '设计' || role.includes('设计') || role.includes('UI') || role.includes('UX')) return '设计';
    if (role === '测试' || role.includes('测试') || role.includes('QA')) return '测试';
    return '参与人';
  };
  const baseDetailMembers: ProductLineMember[] = (productLine.members || []).map((member, index) => (
    typeof member === 'string'
      ? { id: `legacy-${index}-${member}`, name: member, role: '参与人' }
      : { ...member, role: normalizeRole(member.role) }
  ));
  const configuredLeadMembers = [
    { name: productLine.owner || productLine.ownerName, role: '管理员' },
    { name: productLine.requirementOwner, role: '产品' },
    { name: productLine.techOwner, role: '研发' },
    { name: productLine.testOwner, role: '测试' }
  ].filter((lead): lead is { name: string; role: string } => Boolean(lead.name));
  const detailMemberNames = new Set(baseDetailMembers.map((member) => member.name));
  const detailMembers = [...baseDetailMembers, ...configuredLeadMembers
    .filter((lead) => !detailMemberNames.has(lead.name))
    .map((lead, index) => ({ id: `lead-${index}-${lead.name}`, name: lead.name, role: lead.role }))];
  const memberCount = new Set([
    ...detailMembers.map((member) => member.name),
    productLine.owner,
    productLine.ownerName,
    productLine.requirementOwner,
    productLine.techOwner,
    productLine.testOwner
  ].filter(Boolean)).size;
  const memberRoleGroups = ['管理员', '产品', '研发', '设计', '测试', '参与人']
    .map((label) => ({ label, members: detailMembers.filter((member) => normalizeRole(member.role) === label) }))
    .filter((group) => group.members.length > 0);
  const activityItems: ProductLineActivity[] = productLine.activities?.length
    ? productLine.activities
    : lineVersions.map((version) => ({ id: version.id, action: '创建了版本', detail: version.code || version.name, operatorName: currentUser.name, createdAt: version.createdAt || version.releaseDate || '' }));

  const resetLeadForm = () => {
    setLeadReqOwner(productLine.requirementOwner || '');
    setLeadTechOwner(productLine.techOwner || '');
    setLeadTestOwner(productLine.testOwner || '');
  };

  // Handle Save Leads
  const handleSaveLeads = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProductLine(productLine.id, {
        requirementOwner: leadReqOwner.trim(),
        techOwner: leadTechOwner.trim(),
        testOwner: leadTestOwner.trim()
      });
      setIsEditLeadsOpen(false);
    } catch (error) {
      addToast('error', '负责人配置保存失败', error instanceof Error ? error.message : '请稍后重试');
    }
  };

  if (isSettingsOpen) {
    return <ProductLineSettingsPanel productLine={productLine} onBack={() => setIsSettingsOpen(false)} onOpenMembers={() => { setIsSettingsOpen(false); setIsManageMembersOpen(true); }} />;
  }

  return (
    <div className="product-line-detail space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={onBack}
            icon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            返回产品线矩阵
          </Button>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsSettingsOpen(true)} icon={<Package className="w-3.5 h-3.5 text-emerald-400" />}>产品线设置</Button>
        </div>
      </div>

      {/* Hero Overview Banner with Cover */}
      <div className="product-line-hero relative rounded-2xl border border-[var(--border-main)] overflow-hidden bg-[var(--bg-surface)] shadow-lg">
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
              当前版本 {productLine.currentVersion || '1.0.0'}
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
          <Button
            onClick={() => updateProductLine(productLine.id, { health: productLine.health === '已停用' ? '启用中' : '已停用' })}
            type={productLine.health === '已停用' ? 'default' : 'primary'}
          >
            <span>{productLine.health === '已停用' ? '已停用' : '启用中'}</span>
          </Button>
        </div>

        {/* Banner Content Body */}
        <div className="product-line-hero-body p-6 relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">{productLine.name}</h2>
              </div>
              <p className="text-xs text-[var(--text-body)] max-w-3xl mt-2 leading-relaxed">
                {productLine.description}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2 text-xs text-[var(--text-muted)]">
              <Switch
                checked={productLine.health !== '已停用'}
                onChange={(checked) => updateProductLine(productLine.id, { health: checked ? '启用中' : '已停用' })}
                checkedChildren="启用中"
                unCheckedChildren="已停用"
              />
              <div>综合负责人：<span className="text-[var(--active-text)] font-medium">{productLine.owner || productLine.ownerName || '暂无'}</span></div>
            </div>
          </div>

          {/* Three Key Leads Display Bar (需求负责人、技术负责人、测试负责人) */}
          <div className="pt-2 border-t border-[var(--border-main)]">
            <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>产研核心指挥体系 (三大关键责任人)</span>
              <Button
                type="link"
                onClick={() => { resetLeadForm(); setIsEditLeadsOpen(true); }}
                icon={<Edit3 className="w-3 h-3" />}
              >
                负责人配置
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 需求负责人 */}
              <div className="product-line-lead-card p-3 rounded-xl bg-[var(--bg-surface-soft)] border border-[var(--border-main)] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">
                  PO
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-[var(--text-muted)]">需求负责人 (Product Owner)</div>
                  <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 truncate">
                    {productLine.requirementOwner || '暂无'}
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
                  <div className="text-[11px] text-[var(--text-muted)]">技术负责人 (Tech Lead)</div>
                  <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 truncate">
                    {productLine.techOwner || '暂无'}
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
                  <div className="text-[11px] text-[var(--text-muted)]">测试负责人 (QA Lead)</div>
                  <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 truncate">
                    {productLine.testOwner || '暂无'}
                  </div>
                  <div className="text-[10px] text-emerald-400/90 font-medium mt-0.5">
                    负责封版验收、自动化回归与质量基线
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6 Key Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
            <div className="product-line-stat-card p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl">
              <span className="text-[var(--text-muted)] text-[11px] block">当前版本号</span>
              <div className="text-lg font-bold text-[var(--text-primary)] mt-1 font-mono">{latestCreatedVersion}</div>
            </div>
            <div className="product-line-stat-card p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl">
              <span className="text-[var(--text-muted)] text-[11px] block">当前进展</span>
              <div className="text-lg font-bold text-amber-400 mt-1 font-mono">{progressText}</div>
            </div>
            <button type="button" className="product-line-stat-card cursor-pointer p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl text-left transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" onClick={() => navigateWithLine('prod_versions', 'detail', true)}>
              <span className="text-[var(--text-muted)] text-[11px] block">迭代版本数</span><div className="text-lg font-bold text-[var(--active-text)] mt-1 font-mono">{lineVersions.length || productLine.versionCount || 0} 个</div>
            </button>
            <button type="button" className="product-line-stat-card cursor-pointer p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl text-left transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" onClick={() => navigateWithLine('prod_req_tasks')}>
              <span className="text-[var(--text-muted)] text-[11px] block">待办需求</span><div className="text-lg font-bold text-purple-400 mt-1 font-mono">{pendingReqsCount} 个</div>
            </button>
            <button type="button" className="product-line-stat-card cursor-pointer p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl text-left transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" onClick={() => navigateWithLine('prod_bugs')}>
              <span className="text-[var(--text-muted)] text-[11px] block">待办缺陷</span><div className="text-lg font-bold text-red-400 mt-1 font-mono">{pendingBugsCount} 处</div>
            </button>
            <button type="button" className="product-line-stat-card cursor-pointer p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl text-left transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]" onClick={() => navigateWithLine('prod_rd_tasks')}>
              <span className="text-[var(--text-muted)] text-[11px] block">研发任务中</span><div className="text-lg font-bold text-emerald-400 mt-1 font-mono">{pendingTasksCount} 项</div>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="product-line-tabs border-b border-[var(--border-main)] flex items-center gap-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'activity'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>产品动态</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'members'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>成员管理 ({memberCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'versions'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>版本甘特图 ({lineVersions.length})</span>
        </button>
      </div>

      {/* Tab 1: 版本迭代计划 */}
      {activeTab === 'versions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">版本迭代演进路线</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                记录该产品线已发布及规划中的各版本周期、关键更新与关联需求
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="text" style={{ color: 'var(--primary)' }} className="hover:text-[var(--active-text)]" aria-label="创建新版本" title="创建新版本" onClick={() => { setEditingVersion(null); setIsCreateVersionOpen(true); }} icon={<Plus className="w-4 h-4 text-[var(--primary)]" />} />
              <Button type="text" className="text-[var(--primary)] hover:text-[var(--active-text)]" aria-label="管理版本" title="管理版本" onClick={() => navigateWithLine('prod_versions', 'detail', true)} icon={<GitBranch className="w-4 h-4" />} />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4">
            <div className="mb-3 grid grid-cols-[minmax(180px,0.8fr)_minmax(0,3fr)] gap-3 text-[11px] text-[var(--text-muted)]"><span>版本名称 / 版本号</span><span>时间区间</span></div>
            <div className="space-y-3">
              {lineVersions.map((version) => {
                const start = new Date(version.startDate || version.releaseDate || Date.now()).getTime();
                const end = new Date(version.endDate || version.releaseDate || start).getTime();
                const timelineStart = Math.min(...lineVersions.map((item) => new Date(item.startDate || item.releaseDate || Date.now()).getTime()));
                const timelineEnd = Math.max(...lineVersions.map((item) => new Date(item.endDate || item.releaseDate || Date.now()).getTime()), timelineStart + 86400000);
                const left = ((start - timelineStart) / (timelineEnd - timelineStart)) * 100;
                const width = Math.max(5, ((Math.max(end, start + 86400000) - start) / (timelineEnd - timelineStart)) * 100);
                const interval = `${version.startDate || '--'} ~ ${version.endDate || version.releaseDate || '--'}`;
                return <div key={`gantt-${version.id}`} className="grid grid-cols-[minmax(180px,0.8fr)_minmax(0,3fr)] items-center gap-3"><div className="min-w-0"><div className="truncate text-xs font-semibold text-[var(--text-primary)]">{version.name}</div><div className="mt-0.5 truncate font-mono text-[11px] text-[var(--active-text)]">{version.code || '未设置版本号'}</div></div><div className="relative h-8 rounded bg-[var(--bg-surface-soft)]"><span className="absolute top-1.5 h-5 min-w-max rounded bg-[var(--primary)]/80 px-2 pt-0.5 text-[10px] text-white" style={{ left: `${left}%`, width: `${width}%` }} title={interval}>{interval}</span></div></div>;
              })}
            </div>
          </div>

          {lineVersions.length === 0 && <div className="text-center py-12 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl text-xs text-[var(--text-muted)]">暂无版本迭代记录，点击右上角“创建新版本”规划版本交付</div>}
        </div>
      )}

      {/* Tab 3: 成员管理 */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">成员管理</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                支持配置产品线需求、架构、研发、测试与运维人员权限与职责
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="text" style={{ color: 'var(--primary)' }} className="hover:text-[var(--active-text)]" aria-label="添加成员" title="添加成员" icon={<UserAddOutlined style={{ color: 'var(--primary)' }} />} onClick={() => setIsManageMembersOpen(true)} />
              <Button type="text" aria-label="成员设置" title="成员设置" icon={<SettingOutlined />} onClick={() => setIsManageMembersOpen(true)} />
            </div>
          </div>

          {memberRoleGroups.map((group) => (
            <section key={group.label}>
              <h4 className="mb-3 text-sm font-medium text-[var(--text-body)]">{group.label}</h4>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                {group.members.map((member) => (
                  <div key={member.id} className="w-28 text-center">
                    <Avatar size={32}>{member.name.slice(0, 1)}</Avatar>
                    <div className="mt-1 text-[10px] text-[var(--text-muted)]">{normalizeRole(member.role)}</div>
                    <div className="mt-2 truncate text-xs text-[var(--text-body)]" title={member.name}>{member.name}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">产品动态</h3>
          <div className="space-y-3">
            {activityItems.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-3 text-sm">
                <Avatar size={32}>{(activity.operatorName || currentUser.name || '系').slice(0, 1)}</Avatar>
                <span className="text-[var(--text-body)]">{activity.operatorName || currentUser.name} {activity.action} <span className="text-[var(--active-text)]">{activity.detail || ''}</span></span>
                <span className="ml-auto text-xs text-[var(--text-muted)]">{activity.createdAt}</span>
              </div>
            ))}
            {activityItems.length === 0 && <div className="py-12 text-center text-sm text-[var(--text-muted)]">暂无产品动态</div>}
          </div>
        </div>
      )}

      {/* Modal: Edit Leads Modal */}
      <Modal
        isOpen={isEditLeadsOpen}
        onClose={() => { resetLeadForm(); setIsEditLeadsOpen(false); }}
        title="负责人配置"
        headerIcon={<UserCheck className="w-5 h-5" />}
        subtitle={<span>产品线：<span className="font-medium text-[var(--active-text)]">{productLine.name}</span> ({productLine.code})</span>}
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
              需求负责人 (Product Owner / PO) *
            </label>
            <Select
              showSearch
              allowClear
              className="w-full"
              value={leadReqOwner || undefined}
              onChange={(value) => setLeadReqOwner(value || '')}
              options={Array.from(new Set([...leadOptions, leadReqOwner].filter(Boolean))).map((value) => ({ value, label: value }))}
              placeholder="搜索并选择负责人"
              optionFilterProp="label"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">负责业务调研、PRD规划评审与需求优先级排序</p>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              技术负责人 (Tech Lead / 架构师) *
            </label>
            <Select
              showSearch
              allowClear
              className="w-full"
              value={leadTechOwner || undefined}
              onChange={(value) => setLeadTechOwner(value || '')}
              options={Array.from(new Set([...leadOptions, leadTechOwner].filter(Boolean))).map((value) => ({ value, label: value }))}
              placeholder="搜索并选择负责人"
              optionFilterProp="label"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">负责技术选型、架构高可用审查与研发任务攻坚</p>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              测试负责人 (QA Lead / 质量主管) *
            </label>
            <Select
              showSearch
              allowClear
              className="w-full"
              value={leadTestOwner || undefined}
              onChange={(value) => setLeadTestOwner(value || '')}
              options={Array.from(new Set([...leadOptions, leadTestOwner].filter(Boolean))).map((value) => ({ value, label: value }))}
              placeholder="搜索并选择负责人"
              optionFilterProp="label"
            />
            <p className="text-[11px] text-[var(--text-muted)] mt-1">负责版本封版验收、自动化测试回归与缺陷归零把控</p>
          </div>
        </form>
      </Modal>

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
