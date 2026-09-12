import React, { useState } from 'react';
import { Input, Button, Select } from "antd";
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Boxes,
  Layers,
  Globe,
  Users,
  FileText,
  Bug,
  Code2,
} from '../common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { StatusTag, Modal } from '../common/UIComponents';
import { ProductLine } from '../../types';
import { ProductLineDetailView, type ProductLineSettingsSection } from './ProductLineDetailView';

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
  const [selectedSettingsSection, setSelectedSettingsSection] = useState<ProductLineSettingsSection | null>(null);

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
        initialSettingsSection={selectedSettingsSection || undefined}
        onBack={() => {
          setSelectedProductLineId(null);
          setSelectedSettingsSection(null);
        }}
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
      description: formDescription.trim() || '该产品线还没有任何简介内容。',
      website: formWebsite.trim() || undefined,
      requirementOwner: '',
      techOwner: '',
      testOwner: '',
      members: [{
        id: `mem-${Date.now()}`,
        name: formOwner.trim() || currentUser.name,
        role: '管理员'
      }],
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
      customerCount: 0,
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
      pendingReqs,
      pendingBugs,
      activeTasks
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
      <div className="product-lines-toolbar bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Input
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索产品线名称 / 编码 / 负责人..."
            className="product-lines-search w-full"
          />
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          id="btn-add-product-line"
          onClick={() => { resetCreateForm(); setIsModalOpen(true); }}
          className="shrink-0"
        >
          新建产品线
        </Button>
      </div>

      {/* Product Lines Cards Grid (满足需求2 & 需求3) */}
      <div className="product-lines-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredLines.map((pl) => {
          const stats = getLineStats(pl);

          return (
            <div
              key={pl.id}
              className="product-line-card group bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-lg overflow-hidden shadow-xs hover:border-[var(--primary)]/60 transition-colors duration-200 flex flex-col justify-between"
            >
              {/* Compact header: keep product identity visible without a decorative cover. */}
              <div
                onClick={() => setSelectedProductLineId(pl.id)}
                className="product-line-cover relative w-full overflow-hidden cursor-pointer border-b border-[var(--border-main)]"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="product-line-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--active-text)] transition-colors">
                        {pl.name}
                      </h4>
                      <StatusTag type={pl.health === '已停用' ? 'default' : 'info'} className={pl.health === '已停用' ? 'product-line-health-disabled' : 'product-line-health-enabled'} status={pl.health === '已停用' ? '已停用' : '启用中'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div onClick={() => setSelectedProductLineId(pl.id)} className="product-line-body flex flex-1 flex-col justify-between space-y-3 p-4 text-xs cursor-pointer">
                {/* Meta info row: Owner & Website */}
                <div className="space-y-2 text-[11px] text-[var(--text-muted)]">
                  <div className="flex items-center justify-between gap-3"><span>负责人</span><strong className="truncate font-medium text-[var(--text-body)]">{pl.owner || pl.ownerName || '未设置'}</strong></div>
                  <div className="flex items-center justify-between gap-3"><span>当前版本</span><span className="font-mono text-[var(--text-body)]">{pl.currentVersion || 'V1.0.0'}</span></div>
                  <div className="flex items-center justify-between gap-3"><span>版本数量</span><span className="text-[var(--text-body)]">{pl.versionCount || versions.filter((v) => v.productLineId === pl.id).length || 0} 个</span></div>
                </div>

                {/* Description */}
                <p
                  onClick={() => setSelectedProductLineId(pl.id)}
                  className="text-[var(--text-body)] leading-relaxed line-clamp-2 cursor-pointer border-t border-[var(--border-main)] pt-3"
                >
                  {pl.description}
                </p>

                {/* 待办需求、缺陷和研发任务显示 (满足需求2 - 参考图设计) */}
                <div className="grid grid-cols-3 gap-2 border-t border-[var(--border-main)] pt-3">
                  {/* 待办需求 */}
                  <div
                    onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_req_tasks'); }}
                    className="rounded-md px-1.5 py-2 text-center cursor-pointer bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1 text-purple-400 text-[11px] font-medium mb-0.5">
                      <FileText className="w-3 h-3" />
                      <span>待办需求</span>
                    </div>
                    <span className="product-line-pending-req text-base font-bold font-mono text-[var(--text-primary)]">
                      {stats.pendingReqs}
                    </span>
                  </div>

                  {/* 待办缺陷 */}
                  <div
                    onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_bugs'); }}
                    className="rounded-md px-1.5 py-2 text-center cursor-pointer bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-elevated)] transition-colors"
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
                    className="rounded-md px-1.5 py-2 text-center cursor-pointer bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-elevated)] transition-colors"
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
                <div className="pt-2 border-t border-[var(--border-main)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        sessionStorage.setItem('shichuang.productLineFilter', pl.id);
                        sessionStorage.setItem('shichuang.productLineTargetTab', 'detail');
                        window.dispatchEvent(new Event('shichuang:product-line-context'));
                        openPageTab('prod_versions');
                      }}
                      icon={<Layers className="w-3.5 h-3.5 text-[var(--primary)]" />}
                    >
                      <span>版本管理</span>
                    </Button>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSettingsSection('members');
                        setSelectedProductLineId(pl.id);
                      }}
                      icon={<Users className="w-3.5 h-3.5 text-purple-400" />}
                    >
                      <span>成员管理 ({new Set([
                        ...(pl.members || []).map((member) => typeof member === 'string' ? member : member.name),
                        pl.owner,
                        pl.ownerName,
                        pl.requirementOwner,
                        pl.techOwner,
                        pl.testOwner
                      ].filter(Boolean)).size})</span>
                    </Button>
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
        title="新建产品线"
        footer={
          <>
            <Button
              onClick={() => { resetCreateForm(); setIsModalOpen(false); }}
            >
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              form="create-product-line-form"
            >
              保存
            </Button>
          </>
        }
      >
        <form
          id="create-product-line-form"
          onSubmit={handleSaveLine}
          className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--text-body)] mb-1">产品线名称 *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="请输入产品线名称" />
            </div>
            <div>
              <label className="block font-semibold text-[var(--text-body)] mb-1">产品线编码 *</label>
              <Input value={formCode} onChange={(e) => setFormCode(e.target.value.toUpperCase())} placeholder="例如：OS" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col" required>
            <label className="text-xs font-semibold text-[var(--text-body)] mb-1">产品线负责人 <span className="text-[var(--danger)]">*</span></label>
            <Select
              showSearch
              allowClear
              value={formOwner || undefined}
              onChange={(value) => setFormOwner(value || '')}
              options={ownerOptions.map((opt: string) => ({ label: opt, value: opt }))}
              placeholder="搜索并选择负责人"
              className="w-full"
              optionFilterProp="label"
            />
          </div>
            <div>
              <label className="block font-semibold text-[var(--text-body)] mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
                产品线网址 (官网/体验站)
              </label>
            <Input
              type="url"
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
              placeholder="请输入产品线网址"
              prefix={<Globe className="w-3.5 h-3.5 text-[var(--primary)]" />}
            />
            </div>
          </div>

          {/* 4. 产品线描述 */}
          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1">
              产品线描述与业务边界
            </label>
            <Input.TextArea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="明确该产品线的技术架构、核心攻坚方向与支撑的企业应用生态..."
            />
          </div>

        </form>
      </Modal>

    </div>
  );
};
