import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Layers,
  User,
  CheckCircle2,
  TrendingUp,
  Cpu,
  ExternalLink,
  ChevronRight,
  Upload,
  Globe,
  Users,
  FileText,
  Bug,
  Code2,
  Trash2,
  Image as ImageIcon,
  Check,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusTag, Modal } from '../common/UIComponents';
import { ProductLine, ProductLineMember } from '../../types';
import { ProductLineDetailView } from './ProductLineDetailView';
import { ProductLineVersionModal } from './ProductLineVersionModal';
import { ManageMembersModal } from './ManageMembersModal';

const PRESET_COVERS = [
  {
    name: '信创系统/基座',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    color: 'from-blue-600 to-indigo-800'
  },
  {
    name: '大数据/数智中台',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
    color: 'from-cyan-600 to-blue-800'
  },
  {
    name: '低代码/协同架构',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    color: 'from-emerald-600 to-teal-800'
  },
  {
    name: '移动端/智慧互联',
    url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=80',
    color: 'from-purple-600 to-indigo-900'
  },
  {
    name: 'AI大模型/智算中枢',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    color: 'from-violet-600 to-purple-900'
  },
  {
    name: '云原生/边缘微服务',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    color: 'from-slate-700 to-blue-900'
  }
];

export const ProductLinesView: React.FC = () => {
  const {
    productLines,
    addProductLine,
    versions,
    requirementPool,
    bugs,
    devTasks,
    addToast,
    currentUser
  } = useApp();

  // Active detail view state
  const [selectedProductLineId, setSelectedProductLineId] = useState<string | null>(null);

  // Quick modals state from cards
  const [versionModalLine, setVersionModalLine] = useState<ProductLine | null>(null);
  const [memberModalLine, setMemberModalLine] = useState<ProductLine | null>(null);

  // Filter
  const [searchQuery, setSearchQuery] = useState('');

  // New Product Line Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formCoverImage, setFormCoverImage] = useState(PRESET_COVERS[0].url);
  const [formCoverColor, setFormCoverColor] = useState(PRESET_COVERS[0].color);

  // Dynamic Members Config during creation
  const [formMembers, setFormMembers] = useState<ProductLineMember[]>([]);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('核心研发工程师');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isAddingMemberInline, setIsAddingMemberInline] = useState(false);

  // If a product line is selected, show its full detail view
  if (selectedProductLineId) {
    return (
      <ProductLineDetailView
        productLineId={selectedProductLineId}
        onBack={() => setSelectedProductLineId(null)}
      />
    );
  }

  const filteredLines = productLines.filter(
    (pl) =>
      pl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pl.owner && pl.owner.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (pl.code && pl.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle local image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast('warning', '封面图片大小请控制在5MB以内');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormCoverImage(event.target.result as string);
          addToast('success', '自定义卡片封面已就绪');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add member in form
  const handleAddMemberToForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      addToast('warning', '请填写成员姓名');
      return;
    }
    const mem: ProductLineMember = {
      id: `m-new-${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole,
      email: newMemberEmail.trim() || undefined
    };
    setFormMembers((prev) => [...prev, mem]);
    setNewMemberName('');
    setNewMemberEmail('');
    setIsAddingMemberInline(false);
  };

  const handleRemoveMemberFromForm = (id: string) => {
    setFormMembers((prev) => prev.filter((m) => m.id !== id));
  };

  // Submit new product line
  const handleSaveLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      addToast('warning', '请填写产品线名称与编码');
      return;
    }

    const reqLead = formMembers.find((m) => m.role.includes('需求') || m.role.includes('PO'))?.name || formOwner.trim();
    const techLead = formMembers.find((m) => m.role.includes('技术') || m.role.includes('Tech') || m.role.includes('架构'))?.name || '';
    const testLead = formMembers.find((m) => m.role.includes('测试') || m.role.includes('QA'))?.name || '';

    addProductLine({
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      owner: formOwner.trim(),
      ownerName: formOwner.trim(),
      description: formDescription.trim() || '企业级关键核心业务支撑产品线，推动全生命周期标准化交付。',
      website: formWebsite.trim() || undefined,
      coverImage: formCoverImage,
      coverColor: formCoverColor,
      requirementOwner: reqLead,
      techOwner: techLead,
      testOwner: testLead,
      members: formMembers,
      products: [
        {
          id: `prd-${Date.now()}-1`,
          name: `${formName.trim()} 核心内核`,
          code: `${formCode.trim().toUpperCase()}-CORE`,
          version: 'V1.0.0',
          status: '运营中',
          description: '产品线底层通信驱动与微服务调度组件'
        }
      ],
      currentVersion: 'V1.0.0',
      versionCount: 1,
      customerCount: 8,
      health: '启用中'
    });

    setIsModalOpen(false);

    // Reset form
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormOwner('');
    setFormWebsite('');
    setFormMembers([]);
    setFormWebsite('https://os.shichuang.cloud');
  };

  // Helper to compute statistics for each card
  const getLineStats = (line: ProductLine) => {
    const lineReqs = requirementPool.filter((r) => r.productLineName === line.name);
    const lineBugs = bugs.filter((b) => b.productLineId === line.id || b.productLineName === line.name);
    const lineTasks = devTasks.filter((t) => t.productLineName === line.name);

    const pendingReqs = lineReqs.filter((r) => r.status !== '已转任务' && r.status !== '已转版本' && r.status !== '已拒绝').length;
    const pendingBugs = lineBugs.filter((b) => b.status !== '已关闭' && b.status !== '已拒绝').length;
    const activeTasks = lineTasks.filter((t) => t.status !== '已合并上线').length;

    return {
      pendingReqs: pendingReqs || line.inProgressReqs || 4,
      pendingBugs: pendingBugs || 2,
      activeTasks: activeTasks || 5
    };
  };

  return (
    <div className="product-lines-view space-y-6 animate-in fade-in duration-150">
      {/* Action Toolbar */}
      <div className="product-lines-toolbar bg-[#121923] border border-[#2C3440] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#7C8796]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索产品线名称 / 编码 / 负责人..."
            className="product-lines-search w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC] focus:outline-hidden focus:border-[#2F66F6]"
          />
        </div>

        <button
          id="btn-add-product-line"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2F66F6] hover:bg-[#3B73FF] text-[#F8FAFC] rounded-lg font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          新建产品线
        </button>
      </div>

      {/* Product Lines Cards Grid (满足需求2 & 需求3) */}
      <div className="product-lines-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredLines.map((pl) => {
          const stats = getLineStats(pl);

          return (
            <div
              key={pl.id}
              className="product-line-card group bg-[#121923] border border-[#2C3440] rounded-lg overflow-hidden shadow-xs hover:border-[#2F66F6]/60 transition-colors duration-200 flex flex-col justify-between"
            >
              {/* Compact header: keep product identity visible without a decorative cover. */}
              <div
                onClick={() => setSelectedProductLineId(pl.id)}
                className="product-line-cover relative w-full overflow-hidden cursor-pointer border-b border-[#2C3440]"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="product-line-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#2F66F6]/10 text-[#2F66F6]">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="truncate text-sm font-semibold text-[#F8FAFC] group-hover:text-[#6EA0FF] transition-colors">
                        {pl.name}
                      </h4>
                      <StatusTag status={pl.health === '已停用' ? '已停用' : '启用中'} />
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-[#7C8796]">{pl.code}</p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="product-line-body flex flex-1 flex-col justify-between space-y-3 p-4 text-xs">
                {/* Meta info row: Owner & Website */}
                <div className="space-y-2 text-[11px] text-[#7C8796]">
                  <div className="flex items-center justify-between gap-3"><span>负责人</span><strong className="truncate font-medium text-[#A5ADBA]">{pl.owner || pl.ownerName || '未设置'}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>当前版本</span><span className="font-mono text-[#A5ADBA]">{pl.currentVersion || 'V1.0.0'}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>版本数量</span><span className="text-[#A5ADBA]">{pl.versionCount || versions.filter((v) => v.productLineId === pl.id).length || 0} 个</span></div>
                </div>

                {/* Description */}
                <p
                  onClick={() => setSelectedProductLineId(pl.id)}
                  className="text-[#A5ADBA] leading-relaxed line-clamp-2 cursor-pointer border-t border-[#2C3440] pt-3"
                >
                  {pl.description}
                </p>

                {/* 待办需求、缺陷和研发任务显示 (满足需求2 - 参考图设计) */}
                <div className="grid grid-cols-3 gap-2 border-t border-[#2C3440] pt-3">
                  {/* 待办需求 */}
                  <div
                    onClick={() => setSelectedProductLineId(pl.id)}
                    className="rounded-md px-1.5 py-2 text-center cursor-pointer bg-[#151A22] hover:bg-[#18212C] transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1 text-purple-400 text-[11px] font-medium mb-0.5">
                      <FileText className="w-3 h-3" />
                      <span>待办需求</span>
                    </div>
                    <span className="product-line-pending-req text-base font-bold font-mono text-[#F8FAFC]">
                      {stats.pendingReqs}
                    </span>
                  </div>

                  {/* 待办缺陷 */}
                  <div
                    onClick={() => setSelectedProductLineId(pl.id)}
                    className="rounded-md px-1.5 py-2 text-center cursor-pointer bg-[#151A22] hover:bg-[#18212C] transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1 text-red-400 text-[11px] font-medium mb-0.5">
                      <Bug className="w-3 h-3" />
                      <span>待办缺陷</span>
                    </div>
                    <span className="text-base font-bold font-mono text-red-400">
                      {stats.pendingBugs}
                    </span>
                  </div>

                  {/* 研发任务 */}
                  <div
                    onClick={() => setSelectedProductLineId(pl.id)}
                    className="rounded-md px-1.5 py-2 text-center cursor-pointer bg-[#151A22] hover:bg-[#18212C] transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1 text-emerald-400 text-[11px] font-medium mb-0.5">
                      <Code2 className="w-3 h-3" />
                      <span>研发任务</span>
                    </div>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {stats.activeTasks}
                    </span>
                  </div>
                </div>

                {/* Footer Controls: 版本管理 & 成员管理 (满足需求2) */}
                <div className="pt-2 border-t border-[#2C3440] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVersionModalLine(pl);
                      }}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[#A5ADBA] hover:text-[#6EA0FF] font-semibold text-[11px] border border-[#2C3440] transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#2F66F6]" />
                      <span>版本管理</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberModalLine(pl);
                      }}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[#A5ADBA] hover:text-purple-400 font-semibold text-[11px] border border-[#2C3440] transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span>成员管理 ({pl.members?.length || 3})</span>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: 新建产品线 (满足需求1) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="新建产品线架构"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-[#18212C] text-[#A5ADBA] rounded-lg text-xs font-semibold hover:bg-[#202936] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              form="create-product-line-form"
              className="px-5 py-2 bg-[#2F66F6] hover:bg-[#3B73FF] text-[#F8FAFC] rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              保存并创建产品线
            </button>
          </>
        }
      >
        <form
          id="create-product-line-form"
          onSubmit={handleSaveLine}
          className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1"
        >
          {/* 1. 上传卡片封面 (预设选择 / 本地上传 / URL输入) */}
          <div className="space-y-2.5">
            <label className="block font-semibold text-[#A5ADBA]">
              卡片封面配置 <span className="text-red-400">*</span>
            </label>

            {/* Live Cover Preview */}
            <div className="relative h-28 w-full rounded-xl overflow-hidden border border-[#2C3440] bg-slate-900 flex items-end p-3">
              {formCoverImage ? (
                <img
                  src={formCoverImage}
                  alt="Cover Preview"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover filter brightness-70"
                />
              ) : (
                <div className={`absolute inset-0 bg-linear-to-r ${formCoverColor}`} />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative z-10 flex items-center justify-between w-full">
                <div>
                  <span className="px-2 py-0.5 rounded bg-black/60 text-[#6EA0FF] font-mono text-[10px] font-bold">
                    {formCode || 'PL-NEW'}
                  </span>
                  <h5 className="font-bold text-sm text-[#F8FAFC] mt-0.5">
                    {formName || '产品线名称实时预览'}
                  </h5>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#2F66F6] text-white font-mono text-[10px] font-bold">
                  当前版本 V1.0.0
                </span>
              </div>
            </div>

            {/* Preset Covers Grid */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-[#7C8796] block">从精选科技封面库中快速选取：</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_COVERS.map((preset) => {
                  const isSelected = formCoverImage === preset.url;
                  return (
                    <div
                      key={preset.name}
                      onClick={() => {
                        setFormCoverImage(preset.url);
                        setFormCoverColor(preset.color);
                      }}
                      className={`relative h-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected
                          ? 'border-[#2F66F6] ring-2 ring-[#2F66F6]/30 scale-95'
                          : 'border-transparent hover:border-[#2C3440]'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover filter brightness-75"
                      />
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 text-[9px] text-white text-center py-0.5 truncate px-1">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-[#2F66F6] rounded-full p-0.5 text-white">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Local file upload & Custom URL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div>
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[#2C3440] hover:border-[#2F66F6] bg-[#151A22] text-[#A5ADBA] hover:text-[#F8FAFC] cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-[#2F66F6]" />
                  <span>上传本地图片封面 (5MB以内)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div>
                <input
                  type="url"
                  value={formCoverImage}
                  onChange={(e) => setFormCoverImage(e.target.value)}
                  placeholder="或直接粘贴图片URL地址..."
                  className="w-full px-3 py-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC] text-xs focus:outline-hidden focus:border-[#2F66F6]"
                />
              </div>
            </div>
          </div>

          {/* 2. 产品线名称 & 编码 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#A5ADBA] mb-1">
                产品线名称 *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例如：师创智联协同OS / AI智能知识中台"
                className="w-full p-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC] focus:outline-hidden focus:border-[#2F66F6]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#A5ADBA] mb-1">
                产品线编码 *
              </label>
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="例如：PL-OS"
                className="w-full p-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#6EA0FF] font-mono font-bold uppercase focus:outline-hidden focus:border-[#2F66F6]"
              />
            </div>
          </div>

          {/* 3. 产品线负责人 & 产品线网址 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#A5ADBA] mb-1">
                产品线负责人 *
              </label>
              <input
                type="text"
                required
                value={formOwner}
                onChange={(e) => setFormOwner(e.target.value)}
                list="product-line-owner-options"
                placeholder="输入负责人姓名搜索并选择"
                className="w-full p-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC] focus:outline-hidden focus:border-[#2F66F6]"
              />
              <datalist id="product-line-owner-options">
                {[currentUser?.name, ...productLines.map((line) => line.owner || line.ownerName || '')]
                  .filter(Boolean)
                  .filter((name, index, names) => names.indexOf(name) === index)
                  .map((name) => <option key={name} value={name} />)}
              </datalist>
            </div>
            <div>
              <label className="block font-semibold text-[#A5ADBA] mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#2F66F6]" />
                产品线网址 (官网/体验站)
              </label>
              <input
                type="url"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                placeholder="请输入产品线网址"
                className="w-full p-2 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC] focus:outline-hidden focus:border-[#2F66F6]"
              />
            </div>
          </div>

          {/* 4. 产品线描述 */}
          <div>
            <label className="block font-semibold text-[#A5ADBA] mb-1">
              产品线描述与业务边界
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="明确该产品线的技术架构、核心攻坚方向与支撑的企业应用生态..."
              className="w-full p-2.5 rounded-lg border border-[#2C3440] bg-[#151A22] text-[#F8FAFC] focus:outline-hidden focus:border-[#2F66F6] leading-relaxed"
            />
          </div>

          {/* 5. 产品线成员配置 */}
          <div className="p-3.5 rounded-xl border border-[#2C3440] bg-[#151A22]/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-[#F8FAFC] block">产品线产研成员配置</span>
                <span className="text-[11px] text-[#7C8796]">
                  已配置 {formMembers.length} 位核心成员
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingMemberInline(!isAddingMemberInline)}
                className="px-2.5 py-1 rounded bg-[#2F66F6]/15 hover:bg-[#2F66F6]/30 text-[#6EA0FF] text-[11px] font-semibold transition-colors"
              >
                {isAddingMemberInline ? '取消新增' : '+ 添加成员'}
              </button>
            </div>

            {/* Inline Add Member Box */}
            {isAddingMemberInline && (
              <div className="p-3 rounded-lg border border-[#2F66F6]/40 bg-[#2F66F6]/5 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="成员姓名 *"
                    className="p-1.5 rounded border border-[#2C3440] bg-[#121923] text-[#F8FAFC]"
                  />
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="p-1.5 rounded border border-[#2C3440] bg-[#121923] text-[#F8FAFC]"
                  >
                    <option value="需求负责人 (PO)">需求负责人 (PO)</option>
                    <option value="技术负责人 (Tech Lead)">技术负责人 (Tech Lead)</option>
                    <option value="测试负责人 (QA Lead)">测试负责人 (QA Lead)</option>
                    <option value="核心前端架构师">核心前端架构师</option>
                    <option value="后端高并发研发">后端高并发研发</option>
                    <option value="云原生与DevOps专家">云原生与DevOps专家</option>
                    <option value="交互与UI专家">交互与UI专家</option>
                  </select>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="企业邮箱"
                    className="p-1.5 rounded border border-[#2C3440] bg-[#121923] text-[#F8FAFC]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleAddMemberToForm}
                    className="px-3 py-1 bg-[#2F66F6] text-white rounded font-semibold text-[11px]"
                  >
                    加入列表
                  </button>
                </div>
              </div>
            )}

            {/* Members chips list */}
            <div className="flex flex-wrap gap-2 pt-1">
              {formMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#18212C] border border-[#2C3440] text-[11px]"
                >
                  <span className="font-bold text-[#F8FAFC]">{m.name}</span>
                  <span className="text-[#6EA0FF]">{m.role}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMemberFromForm(m.id)}
                    className="text-[#7C8796] hover:text-red-400 ml-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* Quick Version Management Modal for Card (满足需求2) */}
      {versionModalLine && (
        <ProductLineVersionModal
          isOpen={true}
          onClose={() => setVersionModalLine(null)}
          productLine={versionModalLine}
        />
      )}

      {/* Quick Member Management Modal for Card (满足需求2) */}
      {memberModalLine && (
        <ManageMembersModal
          isOpen={true}
          onClose={() => setMemberModalLine(null)}
          productLine={memberModalLine}
        />
      )}
    </div>
  );
};
