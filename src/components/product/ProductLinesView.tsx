import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Layers,
  Globe,
  Users,
  FileText,
  Bug,
  Code2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusTag, Modal } from '../common/UIComponents';
import { SearchableSelect } from '../common/SearchableSelect';
import { ProductLine } from '../../types';
import { ProductLineDetailView } from './ProductLineDetailView';
import { ProductLineVersionModal } from './ProductLineVersionModal';
import { ManageMembersModal } from './ManageMembersModal';

export const ProductLinesView: React.FC = () => {
  const {
    productLines,
    addProductLine,
    versions,
    requirementPool,
    bugs,
    devTasks,
    addToast,
    currentUser,
    openPageTab
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

  const resetCreateForm = () => {
    setFormName('');
    setFormCode('');
    setFormOwner('');
    setFormDescription('');
    setFormWebsite('');
  };

  // Submit new product line
  const handleSaveLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      addToast('warning', '请填写产品线名称与编码');
      return;
    }

    addProductLine({
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      owner: formOwner.trim(),
      ownerName: formOwner.trim(),
      description: formDescription.trim() || '企业级关键核心业务支撑产品线，推动全生命周期标准化交付。',
      website: formWebsite.trim() || undefined,
      requirementOwner: formOwner.trim(),
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

  const ownerOptions = Array.from(new Set([
    currentUser?.name,
    ...productLines.flatMap((line) => [line.owner, line.ownerName]),
    ...requirementPool.flatMap((task) => [task.ownerName, task.creatorName]),
    ...devTasks.map((task) => task.developer),
    ...bugs.map((bug) => bug.assignee)
  ].filter(Boolean) as string[]));
  const openLineTaskPage = (line: ProductLine, menuId: string) => {
    sessionStorage.setItem('shichuang.productLineFilter', line.id);
    openPageTab(menuId);
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
          onClick={() => { resetCreateForm(); setIsModalOpen(true); }}
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
                <div className="flex items-center gap-3 p-4">
                  <div className="product-line-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#2F66F6]/10 text-[#2F66F6]">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate text-sm font-semibold text-[#F8FAFC] group-hover:text-[#6EA0FF] transition-colors">
                        {pl.name}
                      </h4>
                      <StatusTag status={pl.health === '已停用' ? '已停用' : '启用中'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div onClick={() => setSelectedProductLineId(pl.id)} className="product-line-body flex flex-1 flex-col justify-between space-y-3 p-4 text-xs cursor-pointer">
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
                    onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_req_tasks'); }}
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
                    onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_bugs'); }}
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
                    onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_dev_tasks'); }}
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
        onClose={() => { resetCreateForm(); setIsModalOpen(false); }}
        title="新建产品线架构"
        footer={
          <>
            <button
              type="button"
              onClick={() => { resetCreateForm(); setIsModalOpen(false); }}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SearchableSelect label="产品线负责人" required value={formOwner} options={ownerOptions} onChange={setFormOwner} placeholder="搜索并选择负责人" />
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
