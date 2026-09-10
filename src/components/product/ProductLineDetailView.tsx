import React, { useState } from 'react';
import { DatePicker, Cascader, Segmented } from "antd";
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
} from 'lucide-react';
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
    addToast
  } = useApp();

  const productLine = productLines.find((pl) => pl.id === productLineId);

  // Modals state
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<VersionIteration | null>(null);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditLeadsOpen, setIsEditLeadsOpen] = useState(false);

  // Tabs state for sub-entities
  const [activeTab, setActiveTab] = useState<'products' | 'versions' | 'members' | 'requirements' | 'bugs' | 'tasks'>('products');

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
        <p className="text-sm text-[#A5ADBA]">未找到指定产品线信息</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#2F66F6] text-[#F8FAFC] rounded-lg text-xs font-semibold"
        >
          返回产品线列表
        </button>
      </div>
    );
  }

  // Related data
  const lineVersions = versions.filter(
    (v) => v.productLineId === productLine.id || v.productLineName === productLine.name
  );
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

  const pendingReqsCount = lineReqs.filter((r) => r.status !== '已转任务' && r.status !== '已转版本' && r.status !== '已拒绝').length;
  const pendingBugsCount = lineBugs.filter((b) => b.status !== '已关闭' && b.status !== '已拒绝').length;
  const pendingTasksCount = lineDevTasks.filter((t) => t.status !== '已合并上线').length;

  const currentProducts: ProductItemInLine[] = productLine.products || [];

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
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121923] hover:bg-[#18212C] text-[#A5ADBA] hover:text-[#F8FAFC] rounded-lg text-xs font-semibold border border-[#2C3440] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回产品线矩阵
          </button>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { resetLeadForm(); setIsEditLeadsOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18212C] hover:bg-[#202936] text-[#A5ADBA] hover:text-[#F8FAFC] rounded-lg text-xs font-semibold border border-[#2C3440] transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#6EA0FF]" />
            负责人配置
          </button>
          <button
            type="button"
            onClick={() => setIsManageMembersOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18212C] hover:bg-[#202936] text-[#A5ADBA] hover:text-[#F8FAFC] rounded-lg text-xs font-semibold border border-[#2C3440] transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            管理成员
          </button>
          <button
            type="button"
            onClick={() => setIsAddProductOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18212C] hover:bg-[#202936] text-[#A5ADBA] hover:text-[#F8FAFC] rounded-lg text-xs font-semibold border border-[#2C3440] transition-colors"
          >
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            添加包含产品
          </button>
          <button
            type="button"
            onClick={() => setIsCreateVersionOpen(true)}
            className="product-line-primary-action flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2F66F6] hover:bg-[#3B73FF] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            创建版本
          </button>
        </div>
      </div>

      {/* Hero Overview Banner with Cover */}
      <div className="product-line-hero relative rounded-2xl border border-[#2C3440] overflow-hidden bg-[#121923] shadow-lg">
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
          <div className="product-line-hero-overlay absolute inset-0 bg-linear-to-t from-[#121923] via-[#121923]/50 to-transparent" />

          {/* Top badges on cover */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[#6EA0FF] font-mono font-bold text-xs border border-white/10">
              {productLine.code}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#2F66F6]/80 backdrop-blur-md text-white font-mono font-bold text-xs">
              当前版本 {productLine.currentVersion || '1.0.0'}
            </span>
          </div>

          {productLine.website && (
            <div className="absolute top-14 right-4">
              <a
                href={productLine.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[#A5ADBA] hover:text-[#F8FAFC] text-xs font-medium border border-white/10 hover:border-white/30 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[#2F66F6]" />
                <span>访问官网/体验站</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          <button
            type="button"
            onClick={() => updateProductLine(productLine.id, { health: productLine.health === '已停用' ? '启用中' : '已停用' })}
            className={`absolute top-4 right-4 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${productLine.health === '已停用' ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300' : 'border-amber-500/40 bg-amber-950/60 text-amber-300'}`}
          >
            <span>{productLine.health === '已停用' ? '已停用' : '启用中'}</span>
            <span className={`relative h-4 w-7 rounded-full ${productLine.health === '已停用' ? 'bg-slate-600' : 'bg-blue-600'}`}>
              <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${productLine.health === '已停用' ? 'left-0.5' : 'left-3.5'}`} />
            </span>
          </button>
        </div>

        {/* Banner Content Body */}
        <div className="product-line-hero-body p-6 relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#F8FAFC]">{productLine.name}</h2>
              <p className="text-xs text-[#A5ADBA] max-w-3xl mt-2 leading-relaxed">
                {productLine.description}
              </p>
            </div>
            <div className="text-xs text-[#7C8796] shrink-0 text-right">
              <div>立项规划日：<span className="text-[#A5ADBA] font-mono">{productLine.createdAt || '2024-01-01'}</span></div>
              <div className="mt-1">综合负责人：<span className="text-[#6EA0FF] font-medium">{productLine.owner || productLine.ownerName || '张瑞'}</span></div>
            </div>
          </div>

          {/* Three Key Leads Display Bar (需求负责人、技术负责人、测试负责人) */}
          <div className="pt-2 border-t border-[#2C3440]">
            <div className="text-[11px] font-bold text-[#7C8796] uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>产研核心指挥体系 (三大关键责任人)</span>
              <button
                type="button"
                onClick={() => { resetLeadForm(); setIsEditLeadsOpen(true); }}
                className="text-[#2F66F6] hover:text-[#6EA0FF] font-semibold flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                调整负责人
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 需求负责人 */}
              <div className="product-line-lead-card p-3 rounded-xl bg-[#151A22] border border-[#2C3440] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs">
                  PO
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-[#7C8796]">需求负责人 (Product Owner)</div>
                  <div className="text-sm font-bold text-[#F8FAFC] mt-0.5 truncate">
                    {productLine.requirementOwner || productLine.owner || '张瑞 (产品总监)'}
                  </div>
                  <div className="text-[10px] text-purple-400/90 font-medium mt-0.5">
                    负责产品矩阵定位、需求全生命周期规划
                  </div>
                </div>
              </div>

              {/* 技术负责人 */}
              <div className="product-line-lead-card p-3 rounded-xl bg-[#151A22] border border-[#2C3440] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2F66F6]/15 border border-[#2F66F6]/30 flex items-center justify-center text-[#6EA0FF] font-bold text-xs">
                  TL
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-[#7C8796]">技术负责人 (Tech Lead)</div>
                  <div className="text-sm font-bold text-[#F8FAFC] mt-0.5 truncate">
                    {productLine.techOwner || '王浩然 (技术委员会主席)'}
                  </div>
                  <div className="text-[10px] text-[#6EA0FF]/90 font-medium mt-0.5">
                    把控系统架构演进、技术选型与高可用交付
                  </div>
                </div>
              </div>

              {/* 测试负责人 */}
              <div className="product-line-lead-card p-3 rounded-xl bg-[#151A22] border border-[#2C3440] flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  QA
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-[#7C8796]">测试负责人 (QA Lead)</div>
                  <div className="text-sm font-bold text-[#F8FAFC] mt-0.5 truncate">
                    {productLine.testOwner || '陈小敏 (资深QA测试专家)'}
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
            <div className="product-line-stat-card p-3 bg-[#151A22] border border-[#2C3440] rounded-xl">
              <span className="text-[#7C8796] text-[11px] block">包含产品数</span>
              <div className="text-lg font-bold text-[#F8FAFC] mt-1 font-mono">{currentProducts.length} 款</div>
              <span className="text-[10px] text-[#2F66F6]">矩阵覆盖</span>
            </div>
            <div className="product-line-stat-card p-3 bg-[#151A22] border border-[#2C3440] rounded-xl">
              <span className="text-[#7C8796] text-[11px] block">迭代版本数</span>
              <div className="text-lg font-bold text-[#6EA0FF] mt-1 font-mono">{lineVersions.length || productLine.versionCount || 1} 个</div>
              <span className="text-[10px] text-[#7C8796]">CI/CD流水线</span>
            </div>
            <div className="product-line-stat-card p-3 bg-[#151A22] border border-[#2C3440] rounded-xl">
              <span className="text-[#7C8796] text-[11px] block">待办需求</span>
              <div className="text-lg font-bold text-purple-400 mt-1 font-mono">{pendingReqsCount} 个</div>
              <span className="text-[10px] text-[#7C8796]">需求池待排期</span>
            </div>
            <div className="product-line-stat-card p-3 bg-[#151A22] border border-[#2C3440] rounded-xl">
              <span className="text-[#7C8796] text-[11px] block">待办缺陷</span>
              <div className="text-lg font-bold text-red-400 mt-1 font-mono">{pendingBugsCount} 处</div>
              <span className="text-[10px] text-red-400/80">待修复验证</span>
            </div>
            <div className="product-line-stat-card p-3 bg-[#151A22] border border-[#2C3440] rounded-xl">
              <span className="text-[#7C8796] text-[11px] block">研发任务中</span>
              <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">{pendingTasksCount} 项</div>
              <span className="text-[10px] text-[#7C8796]">在研特性</span>
            </div>
            <div className="product-line-stat-card p-3 bg-[#151A22] border border-[#2C3440] rounded-xl">
              <span className="text-[#7C8796] text-[11px] block">落地客户数</span>
              <div className="text-lg font-bold text-amber-400 mt-1 font-mono">{productLine.customerCount || 28} 家</div>
              <span className="text-[10px] text-[#7C8796]">央国企与500强</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="product-line-tabs border-b border-[#2C3440] flex items-center gap-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'products'
              ? 'border-[#2F66F6] text-[#2F66F6]'
              : 'border-transparent text-[#7C8796] hover:text-[#F8FAFC]'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>包含产品矩阵 ({currentProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'versions'
              ? 'border-[#2F66F6] text-[#2F66F6]'
              : 'border-transparent text-[#7C8796] hover:text-[#F8FAFC]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>版本迭代计划 ({lineVersions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'members'
              ? 'border-[#2F66F6] text-[#2F66F6]'
              : 'border-transparent text-[#7C8796] hover:text-[#F8FAFC]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>成员团队 ({productLine.members?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('requirements')}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'requirements'
              ? 'border-[#2F66F6] text-[#2F66F6]'
              : 'border-transparent text-[#7C8796] hover:text-[#F8FAFC]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>待办需求 ({lineReqs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bugs')}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'bugs'
              ? 'border-[#2F66F6] text-[#2F66F6]'
              : 'border-transparent text-[#7C8796] hover:text-[#F8FAFC]'
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>缺陷管理 ({lineBugs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 px-3.5 font-bold transition-colors flex items-center gap-1.5 border-b-2 ${
            activeTab === 'tasks'
              ? 'border-[#2F66F6] text-[#2F66F6]'
              : 'border-transparent text-[#7C8796] hover:text-[#F8FAFC]'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>研发任务 ({lineDevTasks.length})</span>
        </button>
      </div>

      {/* Tab 1: 包含产品矩阵 */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#F8FAFC]">产品线所纳管的产品矩阵</h3>
              <p className="text-xs text-[#7C8796] mt-0.5">
                在此产品线业务边界下研发、交付与运营的具体标准化产品及模块组件
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddProductOpen(true)}
              className="product-line-primary-action flex items-center gap-1.5 px-3 py-1.5 bg-[#2F66F6] hover:bg-[#3B73FF] text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              添加产品
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentProducts.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-[#121923] border border-[#2C3440] rounded-xl text-xs text-[#7C8796]">
                暂无包含产品，点击右上角“添加产品”进行产品纳管配置
              </div>
            ) : (
              currentProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-[#121923] border border-[#2C3440] rounded-xl p-4.5 space-y-3 hover:border-[#2F66F6]/50 transition-colors shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-[11px] text-[#6EA0FF] bg-[#2F66F6]/10 px-2 py-0.5 rounded">
                          {p.code || 'PRD'}
                        </span>
                        <h4 className="font-bold text-sm text-[#F8FAFC] mt-1.5">{p.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.status === '运营中'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                          : p.status === '研发中'
                          ? 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                      }`}>
                        {p.status || '运营中'}
                      </span>
                    </div>

                    <p className="text-xs text-[#A5ADBA] leading-relaxed line-clamp-3">
                      {p.description || '高内聚关键服务与业务组件'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#2C3440] flex items-center justify-between text-xs">
                    <span className="text-[#7C8796] font-mono text-[11px]">
                      当前版本: <span className="text-[#F8FAFC] font-semibold">{p.version || 'V1.0.0'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(p.id, p.name)}
                      className="text-[#7C8796] hover:text-red-400 text-[11px] flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      移除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: 版本迭代计划 */}
      {activeTab === 'versions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#F8FAFC]">版本迭代演进路线</h3>
              <p className="text-xs text-[#7C8796] mt-0.5">
                记录该产品线已发布及规划中的各版本周期、关键更新与关联需求
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setEditingVersion(null); setIsCreateVersionOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2F66F6] hover:bg-[#3B73FF] text-[#F8FAFC] rounded-lg text-xs font-semibold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              创建新版本
            </button>
          </div>

          <div className="space-y-3">
            {lineVersions.length === 0 ? (
              <div className="text-center py-12 bg-[#121923] border border-[#2C3440] rounded-xl text-xs text-[#7C8796]">
                暂无版本迭代记录，点击右上角“创建新版本”规划版本交付
              </div>
            ) : (
              lineVersions.map((v) => (
                <div
                  key={v.id}
                  className="bg-[#121923] border border-[#2C3440] rounded-xl p-4.5 shadow-xs space-y-3 hover:border-[#3A4655] transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg bg-[#2F66F6]/15 text-[#6EA0FF] font-mono font-bold text-xs border border-[#2F66F6]/30">
                        {v.code || 'V1.0'}
                      </span>
                      <h4 className="font-bold text-sm text-[#F8FAFC]">{v.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#7C8796]">
                        起止周期: {v.startDate || '2026-09-01'} ~ {v.endDate || v.releaseDate || '2026-09-30'}
                      </span>
                      <StatusTag status={v.status === '规划中' ? '待开始' : v.status === '已发布' ? '已结束' : v.status} />
                      <button type="button" onClick={() => { setEditingVersion(v); setIsCreateVersionOpen(true); }} className="px-2 py-1 rounded bg-[#18212C] text-[#6EA0FF] hover:bg-[#202936]">编辑</button>
                    </div>
                  </div>

                  <p className="text-xs text-[#A5ADBA] bg-[#151A22] p-3 rounded-lg leading-relaxed">
                    {v.changelog || v.content || '版本常规升级与性能优化，攻关重大业务功能。'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-[#7C8796] pt-1">
                    <div className="flex items-center gap-4">
                      <span>包含需求：<strong className="text-[#6EA0FF] font-mono font-semibold">{v.requirementsCount || v.reqCount || 0}</strong> 项</span>
                      <span>关联缺陷：<strong className="text-red-400 font-mono font-semibold">{v.bugCount || 0}</strong> 处</span>
                      {v.linkedRequirementIds && v.linkedRequirementIds.length > 0 && (
                        <span className="text-[11px] text-[#2F66F6]">
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

      {/* Tab 3: 成员团队 */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#F8FAFC]">产品线成员协同配置</h3>
              <p className="text-xs text-[#7C8796] mt-0.5">
                支持配置产品线需求、架构、研发、测试与运维人员权限与职责
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsManageMembersOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2F66F6] hover:bg-[#3B73FF] text-[#F8FAFC] rounded-lg text-xs font-semibold shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              管理成员名单
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {(productLine.members || []).map((member, index) => {
              const m = typeof member === 'string'
                ? { id: `legacy-${index}-${member}`, name: member, role: '产品线成员' }
                : member;
              return (
              <div
                key={m.id}
                className="bg-[#121923] border border-[#2C3440] rounded-xl p-4 flex items-center gap-3 shadow-xs hover:border-[#3A4655]"
              >
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-[#2F66F6]/30 to-purple-600/30 border border-[#2F66F6]/40 flex items-center justify-center font-bold text-[#6EA0FF] text-xs shrink-0">
                  {m.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[#F8FAFC] truncate">{m.name}</div>
                  <div className="text-[11px] text-[#6EA0FF] font-medium mt-0.5 truncate">{m.role}</div>
                  {m.email && <div className="text-[10px] text-[#7C8796] truncate mt-0.5">{m.email}</div>}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: 待办需求池 */}
      {activeTab === 'requirements' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#F8FAFC]">需求表中本产品线关联需求</h3>
            <span className="text-xs text-[#7C8796]">共 {lineReqs.length} 项需求</span>
          </div>

          <div className="space-y-2">
            {lineReqs.length === 0 ? (
              <div className="text-center py-10 bg-[#121923] border border-[#2C3440] rounded-xl text-xs text-[#7C8796]">
                暂无关联需求，可在需求池中提报并归属至该产品线
              </div>
            ) : (
              lineReqs.map((r) => (
                <div
                  key={r.id}
                  className="bg-[#121923] border border-[#2C3440] rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#6EA0FF]">{r.code || r.id}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#2F66F6]/15 text-[#6EA0FF] text-[10px] font-mono">{lineVersions.find((version) => version.linkedRequirementIds?.includes(r.id))?.code || '未分配版本'}</span>
                      <span className="font-bold text-[#F8FAFC]">{r.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-950/60 text-red-400 border border-red-800/50">
                        {r.priority}
                      </span>
                    </div>
                    <p className="text-[#A5ADBA] leading-relaxed">{r.description}</p>
                    <div className="text-[11px] text-[#7C8796] flex items-center gap-3">
                      {r.customerName && <span>客户: {r.customerName}</span>}
                      {r.submitter && <span>提报人: {r.submitter}</span>}
                      <span>时间: {r.createdAt}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-[#18212C] text-[#A5ADBA] shrink-0">
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: 缺陷管理 */}
      {activeTab === 'bugs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#F8FAFC]">本产品线缺陷清单</h3>
            <span className="text-xs text-[#7C8796]">共 {lineBugs.length} 处缺陷</span>
          </div>

          <div className="space-y-2">
            {lineBugs.length === 0 ? (
              <div className="text-center py-10 bg-[#121923] border border-[#2C3440] rounded-xl text-xs text-[#7C8796]">
                目前该产品线架构健康，暂无未关闭缺陷
              </div>
            ) : (
              lineBugs.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#121923] border border-[#2C3440] rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-red-400">{b.code || b.id}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#2F66F6]/15 text-[#6EA0FF] text-[10px] font-mono">{b.versionName || '未分配版本'}</span>
                      <span className="font-bold text-[#F8FAFC]">{b.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-950/60 text-red-400">
                        {b.severity}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#18212C] text-[#A5ADBA]">
                        {b.type || '功能缺陷'}
                      </span>
                    </div>
                    <p className="text-[#A5ADBA] leading-relaxed">{b.description}</p>
                    <div className="text-[11px] text-[#7C8796] flex items-center gap-3">
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
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#F8FAFC]">本产品线活跃研发特性任务</h3>
            <span className="text-xs text-[#7C8796]">共 {lineDevTasks.length} 项特性开发</span>
          </div>

          <div className="space-y-2">
            {lineDevTasks.length === 0 ? (
              <div className="text-center py-10 bg-[#121923] border border-[#2C3440] rounded-xl text-xs text-[#7C8796]">
                暂无研发中特性，可将版本关联需求转入任务排期
              </div>
            ) : (
              lineDevTasks.map((t) => (
                <div
                  key={t.id}
                  className="bg-[#121923] border border-[#2C3440] rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#2F66F6]/15 text-[#6EA0FF] text-[10px] font-mono">{t.versionName || '未分配版本'}</span>
                      <span className="font-bold text-[#F8FAFC]">{t.title}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-950/60 text-purple-400">
                        {t.priority}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#7C8796] flex items-center gap-3">
                      <span>开发人: <strong className="text-[#A5ADBA]">{t.developer}</strong></span>
                      {t.repo && <span>仓库: <span className="font-mono text-[#6EA0FF]">{t.repo}</span></span>}
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

      {/* Modal 1: Add Product Modal */}
      <Modal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        title={`添加产品至【${productLine.name}】`}
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsAddProductOpen(false)}
              className="px-4 py-2 bg-[#18212C] text-[#A5ADBA] rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              form="add-product-form"
              className="px-4 py-2 bg-[#2F66F6] hover:bg-[#3B73FF] text-[#F8FAFC] rounded-lg text-xs font-semibold shadow-xs"
            >
              保存产品
            </button>
          </>
        }
      >
        <form id="add-product-form" onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#A5ADBA] mb-1">
              产品规范名称 *
            </label>
            <input
              type="text"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="例如：桌面多维协同工作台 (Desktop Suite)"
              className="w-full p-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#A5ADBA] mb-1">
                产品编码 (Code)
              </label>
              <input
                type="text"
                value={prodCode}
                onChange={(e) => setProdCode(e.target.value)}
                placeholder="例如：PRD-OS-DESK"
                className="w-full p-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC] font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-medium text-[#A5ADBA] mb-1">
                当前版本号
              </label>
              <input
                type="text"
                value={prodVersion}
                onChange={(e) => setProdVersion(e.target.value)}
                placeholder="例如：V3.5.0"
                className="w-full p-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#6EA0FF] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#A5ADBA] mb-1">
              运营状态
            </label>
            <select
              value={prodStatus}
              onChange={(e) => setProdStatus(e.target.value as any)}
              className="w-full p-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC]"
            >
              <option value="运营中">运营中</option>
              <option value="研发中">研发中</option>
              <option value="规划中">规划中</option>
              <option value="维护期">维护期</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#A5ADBA] mb-1">
              产品定位与能力描述
            </label>
            <textarea
              rows={3}
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
              placeholder="明确该产品的关键特性、交付形态与支撑的业务场景..."
              className="w-full p-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC]"
            />
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Leads Modal */}
      <Modal
        isOpen={isEditLeadsOpen}
        onClose={() => { resetLeadForm(); setIsEditLeadsOpen(false); }}
        title={`配置产研核心负责人 - ${productLine.name}`}
        footer={
          <>
            <button
              type="button"
              onClick={() => { resetLeadForm(); setIsEditLeadsOpen(false); }}
              className="px-4 py-2 bg-[#18212C] text-[#A5ADBA] rounded-lg text-xs font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              form="edit-leads-form"
              className="px-4 py-2 bg-[#2F66F6] hover:bg-[#3B73FF] text-[#F8FAFC] rounded-lg text-xs font-semibold shadow-xs"
            >
              保存负责人配置
            </button>
          </>
        }
      >
        <form id="edit-leads-form" onSubmit={handleSaveLeads} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-[#A5ADBA] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              需求负责人 (Product Owner / PO) *
            </label>
            <div className="flex flex-col gap-1.5" required>
            <label className="text-xs font-medium text-[var(--text-primary)]">需求负责人 (Product Owner / PO) <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={leadReqOwner ? [leadReqOwner] : undefined}
              onChange={(value: any) => setLeadReqOwner(value?.[0] || '')}
              options={Array.from(new Set([currentUser.name, productLine.owner, productLine.ownerName, leadReqOwner, ...requirementTasks.map((task) => task.ownerName)].filter(Boolean) as string[])).map((opt: any) => typeof opt === 'string' ? { label: opt, value: opt } : opt)}
              placeholder="搜索并选择负责人"
              className="w-full"
            />
          </div>
            <p className="text-[11px] text-[#7C8796] mt-1">负责业务调研、PRD规划评审与需求优先级排序</p>
          </div>

          <div>
            <label className="block font-semibold text-[#A5ADBA] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2F66F6]" />
              技术负责人 (Tech Lead / 架构师) *
            </label>
            <div className="flex flex-col gap-1.5" required>
            <label className="text-xs font-medium text-[var(--text-primary)]">技术负责人 (Tech Lead / 架构师) <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={leadTechOwner ? [leadTechOwner] : undefined}
              onChange={(value: any) => setLeadTechOwner(value?.[0] || '')}
              options={Array.from(new Set([currentUser.name, leadTechOwner, ...devTasks.map((task) => task.developer)].filter(Boolean) as string[])).map((opt: any) => typeof opt === 'string' ? { label: opt, value: opt } : opt)}
              placeholder="搜索并选择负责人"
              className="w-full"
            />
          </div>
            <p className="text-[11px] text-[#7C8796] mt-1">负责技术选型、架构高可用审查与研发任务攻坚</p>
          </div>

          <div>
            <label className="block font-semibold text-[#A5ADBA] mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              测试负责人 (QA Lead / 质量主管) *
            </label>
            <div className="flex flex-col gap-1.5" required>
            <label className="text-xs font-medium text-[var(--text-primary)]">测试负责人 (QA Lead / 质量主管) <span className="text-red-500">*</span></label>
            <Cascader
              showSearch
              value={leadTestOwner ? [leadTestOwner] : undefined}
              onChange={(value: any) => setLeadTestOwner(value?.[0] || '')}
              options={Array.from(new Set([currentUser.name, leadTestOwner, ...bugs.map((bug) => bug.assignee)].filter(Boolean) as string[])).map((opt: any) => typeof opt === 'string' ? { label: opt, value: opt } : opt)}
              placeholder="搜索并选择负责人"
              className="w-full"
            />
          </div>
            <p className="text-[11px] text-[#7C8796] mt-1">负责版本封版验收、自动化测试回归与缺陷归零把控</p>
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
