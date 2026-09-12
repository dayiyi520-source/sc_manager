import React, { useState } from 'react';
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
import { ProductLine, ProductItemInLine, VersionIteration } from '../../types';
import { StatusTag, Modal } from '../common/UIComponents';
import { CreateVersionModal } from './CreateVersionModal';
import { ManageMembersModal } from './ManageMembersModal';

interface ProductLineDetailViewProps {
  productLineId: string;
  onBack: () => void;
}

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
    requirementTasks,
    currentUser,
    addToast,
    openPageTab
  } = useApp();

  const productLine = productLines.find((pl) => pl.id === productLineId);

  // Modals state
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<VersionIteration | null>(null);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditLeadsOpen, setIsEditLeadsOpen] = useState(false);

  // Tabs state for sub-entities
  const [activeTab, setActiveTab] = useState<'versions' | 'members' | 'activity'>('versions');

  // Add Product Form state
  const [prodName, setProdName] = useState('');
  const [prodCode, setProdCode] = useState('');
  const [prodVersion, setProdVersion] = useState('V1.0.0');
  const [prodStatus, setProdStatus] = useState<'运营中' | '研发中' | '规划中' | '维护期'>('运营中');
  const [prodDesc, setProdDesc] = useState('');

  // Edit Leads Form state
  const [leadReqOwner, setLeadReqOwner] = useState(productLine?.requirementOwner || productLine?.owner || '');
  const [leadTechOwner, setLeadTechOwner] = useState(productLine?.techOwner || '王浩然');
  const [leadTestOwner, setLeadTestOwner] = useState(productLine?.testOwner || '陈小敏');

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
  const latestPublishedVersion = lineVersions
    .filter((version) => version.status === '已发布')
    .sort((a, b) => String(b.releaseDate || b.endDate || '').localeCompare(String(a.releaseDate || a.endDate || '')))[0]?.code
    || productLine.currentVersion
    || 'V1.0.0';
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
  const progressText = `${completedTasksCount}/${totalTasksCount}`;

  const navigateWithLine = (menuId: string, tab?: string) => {
    sessionStorage.setItem('shichuang.productLineFilter', productLine.id);
    if (tab) sessionStorage.setItem('shichuang.productLineTargetTab', tab);
    openPageTab(menuId);
  };

  const currentProducts: ProductItemInLine[] = productLine.products || [];
  const baseDetailMembers: Array<{ id: string; name: string; role: string }> = (productLine.members || []).map((member, index) => (
    typeof member === 'string'
      ? { id: `legacy-${index}-${member}`, name: member, role: '成员' }
      : { id: member.id, name: member.name, role: member.role || '成员' }
  ));
  const configuredLeadMembers = [
    { name: productLine.owner || productLine.ownerName, role: '综合负责人' },
    { name: productLine.requirementOwner, role: '需求负责人 (PO)' },
    { name: productLine.techOwner, role: '技术负责人 (Tech Lead)' },
    { name: productLine.testOwner, role: '测试负责人 (QA Lead)' }
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

  // Handle Add Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      addToast('warning', '请填写产品名称');
      return;
    }

    const newProd: ProductItemInLine = {
      id: `prd-${Date.now()}`,
      name: prodName.trim(),
      code: prodCode.trim() || `${productLine.code}-SUB`,
      version: prodVersion.trim() || 'V1.0.0',
      status: prodStatus,
      description: prodDesc.trim() || '高内聚业务服务与能力扩展模块'
    };

    const updated = [...currentProducts, newProd];
    updateProductLine(productLine.id, { products: updated });
    addToast('success', `产品【${newProd.name}】已添加至产品线`);

    setProdName('');
    setProdCode('');
    setProdVersion('V1.0.0');
    setProdDesc('');
    setIsAddProductOpen(false);
  };

  const handleRemoveProduct = (prodId: string, name: string) => {
    const updated = currentProducts.filter((p) => p.id !== prodId);
    updateProductLine(productLine.id, { products: updated });
    addToast('info', `已移除产品 ${name}`);
  };

  const resetLeadForm = () => {
    setLeadReqOwner(productLine.requirementOwner || productLine.owner || '');
    setLeadTechOwner(productLine.techOwner || '');
    setLeadTestOwner(productLine.testOwner || '');
  };

  // Handle Save Leads
  const handleSaveLeads = (e: React.FormEvent) => {
    e.preventDefault();
    updateProductLine(productLine.id, {
      requirementOwner: leadReqOwner.trim(),
      techOwner: leadTechOwner.trim(),
      testOwner: leadTestOwner.trim()
    });
    setIsEditLeadsOpen(false);
    addToast('success', '产研核心负责人配置已保存');
  };

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
          <Button onClick={() => setIsAddProductOpen(true)} icon={<Package className="w-3.5 h-3.5 text-emerald-400" />}>产品线设置</Button>
          <Button
            type="primary"
            onClick={() => setIsCreateVersionOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            创建版本
          </Button>
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
                调整负责人
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
              <button type="button" className="text-left" onClick={() => navigateWithLine('prod_versions', 'detail')}><span className="text-[var(--text-muted)] text-[11px] block">迭代版本数</span><div className="text-lg font-bold text-[var(--active-text)] mt-1 font-mono">{lineVersions.length || productLine.versionCount || 1} 个</div></button>
            </div>
            <div className="product-line-stat-card p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl">
              <button type="button" className="text-left" onClick={() => navigateWithLine('prod_req_tasks')}><span className="text-[var(--text-muted)] text-[11px] block">待办需求</span><div className="text-lg font-bold text-purple-400 mt-1 font-mono">{pendingReqsCount} 个</div></button>
            </div>
            <div className="product-line-stat-card p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl">
              <button type="button" className="text-left" onClick={() => navigateWithLine('prod_bugs')}><span className="text-[var(--text-muted)] text-[11px] block">待办缺陷</span><div className="text-lg font-bold text-red-400 mt-1 font-mono">{pendingBugsCount} 处</div></button>
            </div>
            <div className="product-line-stat-card p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl">
              <button type="button" className="text-left" onClick={() => navigateWithLine('prod_rd_tasks')}><span className="text-[var(--text-muted)] text-[11px] block">研发任务中</span><div className="text-lg font-bold text-emerald-400 mt-1 font-mono">{pendingTasksCount} 项</div></button>
            </div>
            <div className="product-line-stat-card p-3 bg-[var(--bg-surface-soft)] border border-[var(--border-main)] rounded-xl">
              <span className="text-[var(--text-muted)] text-[11px] block">当前进展</span>
              <div className="text-lg font-bold text-amber-400 mt-1 font-mono">{progressText}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="product-line-tabs border-b border-[var(--border-main)] flex items-center gap-2 overflow-x-auto text-xs">
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
            <Button
              type="primary"
              onClick={() => { setEditingVersion(null); setIsCreateVersionOpen(true); }}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              创建新版本
            </Button>
          </div>

          <div className="space-y-3">
            {lineVersions.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl text-xs text-[var(--text-muted)]">
                暂无版本迭代记录，点击右上角“创建新版本”规划版本交付
              </div>
            ) : (
              lineVersions.map((v) => (
                <div
                  key={v.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-4.5 shadow-xs space-y-3 hover:border-[var(--border-subtle)] transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/15 text-[var(--active-text)] font-mono font-bold text-xs border border-[var(--primary)]/30">
                        {v.code || 'V1.0'}
                      </span>
                      <h4 className="font-bold text-sm text-[var(--text-primary)]">{v.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[var(--text-muted)]">
                        起止周期: {v.startDate || '2026-09-01'} ~ {v.endDate || v.releaseDate || '2026-09-30'}
                      </span>
                      <StatusTag status={v.status === '规划中' ? '待开始' : v.status === '已发布' ? '已结束' : v.status} />
                      <button type="button" onClick={() => { setEditingVersion(v); setIsCreateVersionOpen(true); }} className="px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--active-text)] hover:bg-[var(--bg-elevated)]">编辑</button>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-body)] bg-[var(--bg-surface-soft)] p-3 rounded-lg leading-relaxed">
                    {v.changelog || v.content || '版本常规升级与性能优化，攻关重大业务功能。'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
                    <div className="flex items-center gap-4">
                      <span>包含需求：<strong className="text-[var(--active-text)] font-mono font-semibold">{v.requirementsCount || v.reqCount || 0}</strong> 项</span>
                      <span>关联缺陷：<strong className="text-red-400 font-mono font-semibold">{v.bugCount || 0}</strong> 处</span>
                      {v.linkedRequirementIds && v.linkedRequirementIds.length > 0 && (
                        <span className="text-[11px] text-[var(--primary)]">
                          已关联需求ID: {v.linkedRequirementIds.join(', ')}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px]">
                      交付达成率：<strong className="text-emerald-400 font-mono">100%</strong>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
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
              <Button type="text" aria-label="添加成员" title="添加成员" icon={<UserAddOutlined />} onClick={() => setIsManageMembersOpen(true)} />
              <Button type="text" aria-label="成员设置" title="成员设置" icon={<SettingOutlined />} onClick={() => setIsManageMembersOpen(true)} />
            </div>
          </div>

          {Object.entries(detailMembers.reduce<Record<string, Array<{ id: string; name: string; role: string }>>>((groups, member) => {
            (groups[member.role] ||= []).push(member);
            return groups;
          }, {})).map(([role, group]) => (
            <section key={role}>
              <h4 className="mb-3 text-lg font-medium text-[var(--text-body)]">{role}</h4>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                {group.map((member) => (
                  <div key={member.id} className="w-28 text-center">
                    <Avatar name={member.name} />
                    <div className="mt-2 truncate text-xs text-[var(--text-body)]" title={member.name}>{member.name}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Tab 4: 待办需求池 */}
      {false && activeTab === 'requirements' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">需求表中本产品线关联需求</h3>
            <span className="text-xs text-[var(--text-muted)]">共 {lineReqs.length} 项需求</span>
          </div>

          <div className="space-y-2">
            {lineReqs.length === 0 ? (
              <div className="text-center py-10 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl text-xs text-[var(--text-muted)]">
                暂无关联需求，可在需求池中提报并归属至该产品线
              </div>
            ) : (
              lineReqs.map((r) => (
                <div
                  key={r.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[var(--active-text)]">{r.code || r.id}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--active-text)] text-[10px] font-mono">{lineVersions.find((version) => version.linkedRequirementIds?.includes(r.id))?.code || '未分配版本'}</span>
                      <span className="font-bold text-[var(--text-primary)]">{r.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-950/60 text-red-400 border border-red-800/50">
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-[var(--text-body)] leading-relaxed">{r.description}</p>
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-3">
                      {r.customerName && <span>客户: {r.customerName}</span>}
                      {r.submitter && <span>提报人: {r.submitter}</span>}
                      <span>时间: {r.createdAt}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-elevated)] text-[var(--text-body)] shrink-0">
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: 缺陷管理 */}
      {false && activeTab === 'bugs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">本产品线缺陷清单</h3>
            <span className="text-xs text-[var(--text-muted)]">共 {lineBugs.length} 处缺陷</span>
          </div>

          <div className="space-y-2">
            {lineBugs.length === 0 ? (
              <div className="text-center py-10 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl text-xs text-[var(--text-muted)]">
                目前该产品线架构健康，暂无未关闭缺陷
              </div>
            ) : (
              lineBugs.map((b) => (
                <div
                  key={b.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-red-400">{b.code || b.id}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--active-text)] text-[10px] font-mono">{b.versionName || '未分配版本'}</span>
                      <span className="font-bold text-[var(--text-primary)]">{b.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-950/60 text-red-400">
                        {b.severity}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--bg-elevated)] text-[var(--text-body)]">
                        {b.type || '功能缺陷'}
                      </span>
                    </div>
                    <p className="text-[var(--text-body)] leading-relaxed">{b.description}</p>
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-3">
                      <span>指派人: {b.ownerName || b.assignee || '未指派'}</span>
                      <span>验证人: {b.verifierName || 'QA'}</span>
                      <span>提交于: {b.createdAt}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/60 text-amber-400 shrink-0">
                    {b.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 6: 研发任务 */}
      {false && activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">本产品线活跃研发特性任务</h3>
            <span className="text-xs text-[var(--text-muted)]">共 {lineDevTasks.length} 项特性开发</span>
          </div>

          <div className="space-y-2">
            {lineDevTasks.length === 0 ? (
              <div className="text-center py-10 bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl text-xs text-[var(--text-muted)]">
                暂无研发中特性，可将版本关联需求转入任务排期
              </div>
            ) : (
              lineDevTasks.map((t) => (
                <div
                  key={t.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--active-text)] text-[10px] font-mono">{t.versionName || '未分配版本'}</span>
                      <span className="font-bold text-[var(--text-primary)]">{t.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-950/60 text-purple-400">
                        {t.priority}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-3">
                      <span>开发人: <strong className="text-[var(--text-body)]">{t.developer}</strong></span>
                      {t.repo && <span>仓库: <span className="font-mono text-[var(--active-text)]">{t.repo}</span></span>}
                      {t.branch && <span>分支: <span className="font-mono">{t.branch}</span></span>}
                      <span>预估/已耗工时: {t.estimatedHours}h / {t.spentHours}h</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-950/60 text-blue-400 shrink-0 font-medium">
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)]">产品动态</h3>
          <div className="space-y-3">
            {[...lineVersions].sort((a, b) => String(b.createdAt || b.releaseDate || '').localeCompare(String(a.createdAt || a.releaseDate || ''))).map((version) => (
              <div key={version.id} className="flex items-center gap-3 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-3 text-sm">
                <Avatar size={32}>{(currentUser.name || '系').slice(0, 1)}</Avatar>
                <span className="text-[var(--text-body)]">{currentUser.name} 创建了迭代 <span className="text-[var(--active-text)]">{version.code || version.name}</span></span>
                <span className="ml-auto text-xs text-[var(--text-muted)]">{version.createdAt || version.releaseDate || ''}</span>
              </div>
            ))}
            {lineVersions.length === 0 && <div className="py-12 text-center text-sm text-[var(--text-muted)]">暂无产品动态</div>}
          </div>
        </div>
      )}

      {/* Modal 1: Add Product Modal */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title={`产品线设置 - ${productLine.name}`}
        headerIcon={<Package className="w-5 h-5" />}
        subtitle={`产品线：${productLine.name} (${productLine.code})`}
        footer={
          <>
            <Button
              onClick={() => setIsAddProductOpen(false)}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              form="add-product-form"
            >
              保存产品
            </Button>
          </>
        }
      >
        <form id="add-product-form" onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-body)] mb-1">
              产品规范名称 *
            </label>
            <Input
              type="text"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="例如：桌面多维协同工作台 (Desktop Suite)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[var(--text-body)] mb-1">
                产品编码 (Code)
              </label>
              <Input
                type="text"
                value={prodCode}
                onChange={(e) => setProdCode(e.target.value)}
                placeholder="例如：PRD-OS-DESK"
              />
            </div>
            <div>
              <label className="block font-medium text-[var(--text-body)] mb-1">
                当前版本号
              </label>
              <Input
                type="text"
                value={prodVersion}
                onChange={(e) => setProdVersion(e.target.value)}
                placeholder="例如：V3.5.0"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[var(--text-body)] mb-1">
              运营状态
            </label>
            <Select
              className="w-full"
              value={prodStatus}
              onChange={(value) => setProdStatus(value as any)}
              options={['运营中', '研发中', '规划中', '维护期'].map((value) => ({ value, label: value }))}
            />
          </div>

          <div>
            <label className="block font-medium text-[var(--text-body)] mb-1">
              产品定位与能力描述
            </label>
            <Input.TextArea
              rows={3}
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
              placeholder="明确该产品的关键特性、交付形态与支撑的业务场景..."
            />
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Leads Modal */}
      <Modal
        isOpen={isEditLeadsOpen}
        onClose={() => { resetLeadForm(); setIsEditLeadsOpen(false); }}
        title="负责人配置"
        headerIcon={<UserCheck className="w-5 h-5" />}
        subtitle={`产品线：${productLine.name} (${productLine.code})`}
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
