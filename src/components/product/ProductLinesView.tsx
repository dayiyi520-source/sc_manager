import React, { useEffect, useState } from 'react';
import { Input, Button, Select, Switch, Table } from "antd";
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes,
  Layers,
  Globe,
  Users,
} from '../common/octicons-compat';
import { ViewModeSwitch } from '../common/ViewModeSwitch';
import { useApp } from '../../context/AppContext';
import { StatusTag, Modal } from '../common/UIComponents';
import { EmptyState } from '../common/Data/EmptyState';
import { ProductLine } from '../../types';
import { ProductLineDetailView, type ProductLineSettingsSection } from './ProductLineDetailView';
import { teamRepository } from '../../services/teamRepository';
import { normalizeProductWebsiteUrl } from './productWebsite';
import { employeeSelectOptions } from '../common/PersonIdentity';
import { WorkItemCategoryIcon } from './WorkItemCategoryIcon';
import { formatVersionPublishedAt, latestReleasedVersion, productLineDisplayStatus } from './productLinePresentation';
import { Pagination } from '../common/Pagination';
import { productRepository } from '../../services/productRepository';

export { normalizeProductWebsiteUrl } from './productWebsite';
export { formatVersionPublishedAt, latestReleasedVersion, productLineDisplayStatus } from './productLinePresentation';

export const productLineVersionCount = (productLineId: string, items: Array<{ productLineId?: string }>) =>
  items.filter((version) => version.productLineId === productLineId).length;

export const productLineMemberCount = (productLine: ProductLine) => new Set([
  ...(productLine.members || []).map((member) => typeof member === 'string' ? member : member.name),
  productLine.owner,
  productLine.ownerName,
  productLine.requirementOwner,
  productLine.requirementOwnerSecondary,
  productLine.techOwner,
  productLine.techOwnerSecondary,
  productLine.testOwner,
  productLine.testOwnerSecondary,
].filter(Boolean)).size;

export const matchesProductLineFilters = (line: ProductLine, query: string, owner: string, status: string, displayedStatus: string) => {
  const keyword = query.trim().toLowerCase();
  return (!keyword || line.name.toLowerCase().includes(keyword) || line.code?.toLowerCase().includes(keyword))
    && (!owner || (line.ownerName || line.owner || '') === owner)
    && (!status || displayedStatus === status);
};

const ResponsibilitySummary: React.FC<{ productLine: ProductLine; compact?: boolean }> = ({ productLine, compact = false }) => {
  const groups = [
    ['产品', productLine.requirementOwner, productLine.requirementOwnerSecondary],
    ['研发', productLine.techOwner, productLine.techOwnerSecondary],
    ['测试', productLine.testOwner, productLine.testOwnerSecondary],
  ] as const;
  const longestName = Math.max(2, ...groups.flatMap(([, primary, secondary]) => [primary || '未设置', secondary || '未设置'].map((name) => Array.from(name).length)));
  const badgeWidth = longestName * 12 + 34;

  return (
    <div className={`${compact ? 'gap-y-1' : 'gap-y-1.5'} grid w-max max-w-full items-center gap-x-1.5 text-left`} style={{ gridTemplateColumns: `28px repeat(2, minmax(0, ${badgeWidth}px))` }}>
      {groups.map(([label, primary, secondary]) => (
        <React.Fragment key={label}>
          <span className="text-left text-[var(--text-muted)]">{label}</span>
          <span className="responsibility-person responsibility-person-primary w-full" title={primary || '未设置'}>
              <span className="responsibility-role">主</span>
              <span className="responsibility-name responsibility-name-primary truncate">{primary || '未设置'}</span>
          </span>
          <span className="responsibility-person responsibility-person-secondary w-full" title={secondary || '未设置'}>
              <span className="responsibility-role">次</span>
              <span className="responsibility-name responsibility-name-secondary truncate">{secondary || '未设置'}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export const ProductLinesView: React.FC = () => {
  const {
    productLines,
    addProductLine,
    versions,
    requirementTasks,
    designTasks,
    bugs,
    devTasks,
    addToast,
    openPageTab
  } = useApp();
  const employeeOptionsQuery = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, retry: false });
  const productStatusesQuery = useQuery({ queryKey: ['research-status-templates', 'PRODUCT'], queryFn: () => productRepository.researchStatusTemplates('PRODUCT'), retry: false });

  // Active detail view state
  const [selectedProductLineId, setSelectedProductLineId] = useState<string | null>(null);
  const [selectedSettingsSection, setSelectedSettingsSection] = useState<ProductLineSettingsSection | null>(null);

  // Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, ownerFilter, statusFilter, pageSize]);

  // New Product Line Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formOwnerUserId, setFormOwnerUserId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCommercialAvailability, setFormCommercialAvailability] = useState<ProductLine['commercialAvailability']>('不可商用');
  const [formVisibility, setFormVisibility] = useState<ProductLine['visibility']>('公开');
  const [formSort, setFormSort] = useState(0);
  const [formWebsite, setFormWebsite] = useState('');
  const [initializeWorkItemTemplate, setInitializeWorkItemTemplate] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

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

  const sortedProductLines = [...productLines].sort((a, b) => {
    const sortDiff = (a.sort ?? 0) - (b.sort ?? 0);
    if (sortDiff !== 0) return sortDiff;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  const displayStatus = productLineDisplayStatus;
  const filteredLines = sortedProductLines.filter((line) => matchesProductLineFilters(line, searchQuery, ownerFilter, statusFilter, displayStatus(line)));
  const pagedLines = filteredLines.slice((page - 1) * pageSize, page * pageSize);
  const ownerFilterOptions = [...new Set(productLines.map((line) => line.ownerName || line.owner || '').filter(Boolean))].sort().map((name) => ({ label: name, value: name }));
  const statusFilterOptions = (productStatusesQuery.data || []).filter((status) => status.enabled).map((status) => ({ label: status.name, value: status.name }));

  const resetCreateForm = () => {
    setFormName('');
    setFormCode('');
    setFormOwnerUserId('');
    setFormDescription('');
    setFormCommercialAvailability('不可商用');
    setFormVisibility('公开');
    setFormSort(0);
    setFormWebsite('');
    setInitializeWorkItemTemplate(true);
  };

  // Submit new product line
  const handleSaveLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim() || !formOwnerUserId || !formVisibility) {
      addToast('warning', '请填写产品名称、编码并选择负责人');
      return;
    }
    if (!Number.isInteger(formSort) || formSort < 0 || formSort > 999) {
      addToast('warning', '排序必须是 0-999 的整数');
      return;
    }
    const normalizedWebsite = normalizeProductWebsiteUrl(formWebsite);
    if (formWebsite.trim() && !normalizedWebsite) {
      addToast('warning', '请输入有效的产品网址', '网址须以 http:// 或 https:// 开头');
      return;
    }
    const selectedOwner = employeeOptionsQuery.data?.find((employee) => employee.id === formOwnerUserId);
    if (!selectedOwner) {
      addToast('error', '负责人不可用', '请刷新团队组织后重新选择');
      return;
    }

    setIsCreating(true);
    const saved = await addProductLine({
      name: formName.trim(),
      code: formCode.trim(),
      ownerUserId: selectedOwner.id,
      ownerName: selectedOwner.name,
      visibility: formVisibility,
      sort: formSort,
      description: formDescription.trim() || '该产品还没有任何简介内容。',
      commercialAvailability: formCommercialAvailability,
      website: normalizedWebsite || undefined,
      requirementOwner: '',
      techOwner: '',
      testOwner: '',
      members: [{
        id: `mem-${Date.now()}`,
        userId: selectedOwner.id,
        name: selectedOwner.name,
        role: '管理员'
      }],
      customerCount: 0,
      initializeWorkItemTemplate
    });
    setIsCreating(false);
    if (!saved) return;
    setIsModalOpen(false);
    resetCreateForm();
  };

  // Helper to compute statistics for each card
  const getLineStats = (line: ProductLine) => {
    const lineReqs = requirementTasks.filter((r) => r.productLineId === line.id || r.productLineName === line.name);
    const lineDesignTasks = designTasks.filter((task) => task.productLineId === line.id || task.productLineName === line.name);
    const lineBugs = bugs.filter((b) => b.productLineId === line.id || b.productLineName === line.name);
    const lineTasks = devTasks.filter((t) => t.productLineName === line.name || (t as any).productLineId === line.id);
    const lineTests = requirementTasks.filter((task) => (task.category === 'test' || task.workOrderType === 'test') && (task.productLineId === line.id || task.productLineName === line.name));
    const assistance = lineReqs.filter((task) => task.sourceType === 'WORK_ORDER' && ['待处理', '已搁置'].includes(task.status)).length;

    const pendingReqs = Number(line.pendingRequirementCount ?? line.pendingReqCount ?? lineReqs.filter((r) => r.status !== '已转任务' && r.status !== '已转版本' && r.status !== '已拒绝').length);
    const pendingBugs = lineBugs.filter((b) => b.status !== '已关闭' && b.status !== '已拒绝').length;
    const activeTasks = lineTasks.filter((t) => t.status !== '已合并上线').length;

    return { pendingReqs, pendingBugs, activeTasks, designTasks: lineDesignTasks.filter((task) => !['已关闭', '已拒绝', '已完成'].includes(task.status)).length, testTasks: lineTests.filter((task) => !['已关闭', '已拒绝', '已完成'].includes(task.status)).length, assistance };
  };

  // 顶部指标反映全部可见产品，不随列表筛选缩小统计范围。
  const allStats = productLines.reduce((total, line) => {
    const stats = getLineStats(line);
    return { products: total.products + 1, assistance: total.assistance + stats.assistance, productTasks: total.productTasks + stats.pendingReqs, designTasks: total.designTasks + stats.designTasks, devTasks: total.devTasks + stats.activeTasks, testTasks: total.testTasks + stats.testTasks, bugs: total.bugs + stats.pendingBugs };
  }, { products: 0, assistance: 0, productTasks: 0, designTasks: 0, devTasks: 0, testTasks: 0, bugs: 0 });

  const ownerOptions = employeeSelectOptions(employeeOptionsQuery.data || []);
  const openLineTaskPage = (line: ProductLine, menuId: string) => {
    sessionStorage.setItem('shichuang.productLineFilter', line.id);
    openPageTab(menuId);
  };
  const openAllTaskPage = (menuId: string) => {
    sessionStorage.removeItem('shichuang.productLineFilter');
    openPageTab(menuId);
  };

  const listColumns = [
    {
      title: '产品',
      key: 'product',
      width: 210,
      fixed: 'left' as const,
      render: (_: unknown, pl: ProductLine) => (
        <button type="button" className="flex min-w-0 items-center gap-2 text-left text-[var(--primary)]" onClick={() => setSelectedProductLineId(pl.id)}>
          <span className="product-line-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]"><Boxes className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block truncate font-semibold text-[var(--primary)]">{pl.name}</span><span className="block truncate font-mono text-[11px] text-[var(--text-muted)]">{pl.code}</span></span>
        </button>
      ),
    },
    { title: '状态', key: 'status', width: 110, render: (_: unknown, pl: ProductLine) => <StatusTag type={displayStatus(pl) === '已停用' ? 'default' : 'info'} status={displayStatus(pl)} /> },
    { title: '负责人', key: 'owner', width: 120, render: (_: unknown, pl: ProductLine) => <span className="truncate text-[var(--text-body)]" title={pl.ownerName || pl.owner || '未设置'}>{pl.ownerName || pl.owner || '未设置'}</span> },
    { title: '责任人', key: 'responsibility', width: 300, render: (_: unknown, pl: ProductLine) => <ResponsibilitySummary productLine={pl} compact /> },
    {
      title: '线上版本', key: 'version', width: 150,
      render: (_: unknown, pl: ProductLine) => {
        const version = latestReleasedVersion(pl);
        return version
          ? <div className="text-left"><div className="font-mono font-semibold text-[var(--text-body)]">{version.code || version.name}</div><div className="mt-0.5 text-[11px] text-[var(--text-muted)]">发布时间 {formatVersionPublishedAt(version)}</div></div>
          : <div className="text-left text-[var(--text-body)]">暂无线上版本</div>;
      }
    },
    {
      title: '待办统计',
      key: 'pending',
      children: [
        { title: '协助事项', key: 'assistance', width: 88, align: 'center' as const, render: (_: unknown, pl: ProductLine) => <span className="text-[var(--text-primary)]">{getLineStats(pl).assistance}</span> },
        { title: '产品任务', key: 'productTasks', width: 88, align: 'center' as const, render: (_: unknown, pl: ProductLine) => <span className="text-[var(--text-primary)]">{getLineStats(pl).pendingReqs}</span> },
        { title: '设计任务', key: 'designTasks', width: 88, align: 'center' as const, render: (_: unknown, pl: ProductLine) => <span className="text-[var(--text-primary)]">{getLineStats(pl).designTasks}</span> },
        { title: '研发任务', key: 'devTasks', width: 88, align: 'center' as const, render: (_: unknown, pl: ProductLine) => <span className="text-[var(--text-primary)]">{getLineStats(pl).activeTasks}</span> },
        { title: '测试任务', key: 'testTasks', width: 88, align: 'center' as const, render: (_: unknown, pl: ProductLine) => <span className="text-[var(--text-primary)]">{getLineStats(pl).testTasks}</span> },
        { title: '缺陷任务', key: 'bugs', width: 88, align: 'center' as const, render: (_: unknown, pl: ProductLine) => <span className="font-semibold text-[var(--danger)]">{getLineStats(pl).pendingBugs}</span> },
      ],
    },
    {
      title: '操作', key: 'actions', width: 230, fixed: 'right' as const,
      render: (_: unknown, pl: ProductLine) => {
        const productWebsiteUrl = normalizeProductWebsiteUrl(pl.website);
        return <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
          <Button size="small" onClick={() => { sessionStorage.setItem('shichuang.productLineFilter', pl.id); sessionStorage.setItem('shichuang.productLineTargetTab', 'detail'); window.dispatchEvent(new Event('shichuang:product-line-context')); openPageTab('prod_versions'); }}>版本管理 ({productLineVersionCount(pl.id, versions)})</Button>
          <Button size="small" onClick={() => { setSelectedSettingsSection('members'); setSelectedProductLineId(pl.id); }}>成员管理 ({productLineMemberCount(pl)})</Button>
          <Button size="small" disabled={!productWebsiteUrl} title={productWebsiteUrl ? '打开产品网址' : '暂未配置产品网址'} onClick={() => { if (productWebsiteUrl) window.open(productWebsiteUrl, '_blank', 'noopener,noreferrer'); }}>产品网址</Button>
        </div>;
      },
    },
  ];

  return (
    <div className="product-lines-view space-y-6 animate-in fade-in duration-150">
      {/* Action Toolbar */}
      <div className="product-lines-toolbar bg-[var(--bg-surface)] border border-[var(--border-main)] rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索产品名称/编码..."
            className="product-lines-search min-w-48 max-w-xs flex-1"
          />
          <Select allowClear showSearch optionFilterProp="label" aria-label="负责人筛选" className="w-36" placeholder="负责人" value={ownerFilter || undefined} onChange={(value) => setOwnerFilter(value || '')} options={ownerFilterOptions} />
          <Select allowClear aria-label="状态筛选" className="w-32" placeholder="状态" value={statusFilter || undefined} onChange={(value) => setStatusFilter(value || '')} options={statusFilterOptions} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ViewModeSwitch value={viewMode} onChange={setViewMode} ariaLabel="产品视图" />
          <Button type="primary" icon={<PlusOutlined />} id="btn-add-product-line" onClick={() => { resetCreateForm(); setIsModalOpen(true); }}>新建产品</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-3"><div className="text-[11px] text-[var(--text-muted)]">产品</div><div className="mt-1 font-mono text-xl font-bold text-[var(--primary)]">{allStats.products}</div></div>
        {[
          ['协助事项', allStats.assistance, 'prod_req_tasks', 'text-[var(--text-primary)]'],
          ['产品任务', allStats.productTasks, 'prod_req_tasks', 'text-[var(--text-primary)]'],
          ['设计任务', allStats.designTasks, 'prod_design_tasks', 'text-[var(--text-primary)]'],
          ['研发任务', allStats.devTasks, 'prod_dev_tasks', 'text-[var(--text-primary)]'],
          ['测试任务', allStats.testTasks, 'prod_test_tasks', 'text-[var(--text-primary)]'],
          ['缺陷任务', allStats.bugs, 'prod_bugs', 'text-[var(--danger)]'],
        ].map(([label, value, menuId, color]) => <button type="button" key={String(label)} onClick={() => openAllTaskPage(String(menuId))} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-3 text-left transition-colors hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><div className="text-[11px] text-[var(--text-muted)]">{label}</div><div className={`mt-1 font-mono text-xl font-bold ${color}`}>{value}</div></button>)}
      </div>

      {/* Product Lines Cards Grid / Ant Design list table */}
      {viewMode === 'list' ? (
        <div className="product-lines-list overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
          <Table<ProductLine>
            className="product-lines-ant-table"
            rowKey="id"
            columns={listColumns}
            dataSource={pagedLines}
            pagination={false}
            scroll={{ x: 1650 }}
            size="middle"
          />
          <Pagination total={filteredLines.length} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      ) : (
      filteredLines.length === 0 ? (
        <div className="product-lines-empty rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)]">
          <EmptyState
            title={productLines.length === 0 ? '暂无产品' : '未找到匹配产品'}
            description={productLines.length === 0 ? '创建第一个产品，开始管理产品迭代和工作项' : '请调整搜索条件后重试'}
            action={productLines.length === 0 ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { resetCreateForm(); setIsModalOpen(true); }}>新建产品</Button>
            ) : (
              <Button onClick={() => { setSearchQuery(''); setOwnerFilter(''); setStatusFilter(''); }}>清除筛选</Button>
            )}
          />
        </div>
      ) : <div className="product-lines-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredLines.map((pl) => {
          const stats = getLineStats(pl);
          const versionCount = productLineVersionCount(pl.id, versions);
          const memberCount = productLineMemberCount(pl);
          const onlineVersion = latestReleasedVersion(pl);
          const productWebsiteUrl = normalizeProductWebsiteUrl(pl.website);

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
                      <StatusTag type={displayStatus(pl) === '已停用' ? 'default' : 'info'} className={displayStatus(pl) === '已停用' ? 'product-line-health-disabled' : 'product-line-health-enabled'} status={displayStatus(pl)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div onClick={() => setSelectedProductLineId(pl.id)} className="product-line-body flex flex-1 flex-col justify-between space-y-3 p-4 text-xs cursor-pointer">
                {/* Meta info row: Owner & Website */}
                  <div className="space-y-2 text-[11px] text-[var(--text-muted)]">
                  <div className="flex items-center justify-between gap-3"><span>负责人</span><strong className="truncate font-medium text-[var(--text-body)]">{pl.owner || pl.ownerName || '未设置'}</strong></div>
                  <div className="space-y-1.5 text-left"><span className="block">责任人</span><div className="flex min-w-0 justify-end font-medium text-[var(--text-body)]"><ResponsibilitySummary productLine={pl} compact /></div></div>
                  <div className="flex min-w-0 items-center justify-between gap-4 border-t border-[var(--border-main)] pt-3 text-left">
                    <span className="min-w-0 truncate font-mono font-semibold text-[var(--text-body)]">线上版本：{onlineVersion?.code || onlineVersion?.name || '暂无发布'}</span>
                    <span className="shrink-0 text-[11px] text-[var(--text-muted)]">发布时间：{onlineVersion ? formatVersionPublishedAt(onlineVersion) : '无发布'}</span>
                  </div>
                </div>

                {/* Description */}
                <p
                  onClick={() => setSelectedProductLineId(pl.id)}
                  className="text-[var(--text-body)] leading-relaxed line-clamp-2 cursor-pointer border-t border-[var(--border-main)] pt-3"
                >
                  {pl.description}
                </p>

                {/* 待办需求、缺陷和研发任务显示 (满足需求2 - 参考图设计) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 border-t border-[var(--border-main)] pt-3">
                  {/* 待办需求 */}
                  <div
                    onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_req_tasks'); }}
                    className="rounded-md px-1 py-1.5 text-center cursor-pointer bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1 text-[var(--text-primary)] text-[10px] font-medium mb-0.5">
                      <WorkItemCategoryIcon category="assistance" className="w-3 h-3 text-purple-400" />
                      <span>协助事项</span>
                    </div>
                    <span className="product-line-pending-req text-sm font-bold font-mono text-[var(--text-primary)]">
                      {stats.assistance}
                    </span>
                  </div>

                  <div onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_req_tasks'); }} className="rounded-md px-1 py-1.5 text-center cursor-pointer bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-elevated)] transition-colors"><div className="flex items-center justify-center gap-1 text-[var(--text-primary)] text-[10px] font-medium mb-0.5"><WorkItemCategoryIcon category="requirement" className="w-3 h-3 text-cyan-400" /><span>产品任务</span></div><span className="text-sm font-bold font-mono text-[var(--text-primary)]">{stats.pendingReqs}</span></div>
                  <div onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_design_tasks'); }} className="rounded-md px-1 py-1.5 text-center cursor-pointer bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-elevated)] transition-colors"><div className="flex items-center justify-center gap-1 text-[var(--text-primary)] text-[10px] font-medium mb-0.5"><WorkItemCategoryIcon category="design" className="w-3 h-3 text-pink-400" /><span>设计任务</span></div><span className="text-sm font-bold font-mono text-[var(--text-primary)]">{stats.designTasks}</span></div>
                  {/* 研发任务 */}
                  <div
                    onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_dev_tasks'); }}
                    className="rounded-md px-1 py-1.5 text-center cursor-pointer bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1 text-[var(--text-primary)] text-[10px] font-medium mb-0.5">
                      <WorkItemCategoryIcon category="dev" className="w-3 h-3 text-emerald-400" />
                      <span>研发任务</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-[var(--text-primary)]">
                      {stats.activeTasks}
                    </span>
                  </div>

                  <div onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_test_tasks'); }} className="rounded-md px-1 py-1.5 text-center cursor-pointer bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-elevated)] transition-colors"><div className="flex items-center justify-center gap-1 text-[var(--text-primary)] text-[10px] font-medium mb-0.5"><WorkItemCategoryIcon category="test" className="w-3 h-3 text-amber-400" /><span>测试任务</span></div><span className="text-sm font-bold font-mono text-[var(--text-primary)]">{stats.testTasks}</span></div>
                  <div onClick={(event) => { event.stopPropagation(); openLineTaskPage(pl, 'prod_bugs'); }} className="rounded-md px-1 py-1.5 text-center cursor-pointer bg-[var(--bg-surface-soft)] hover:bg-[var(--bg-elevated)] transition-colors"><div className="flex items-center justify-center gap-1 text-[var(--text-primary)] text-[10px] font-medium mb-0.5"><WorkItemCategoryIcon category="bug" className="h-3 w-3 text-[var(--danger)]" /><span>缺陷任务</span></div><span className="font-mono text-sm font-bold text-[var(--danger)]">{stats.pendingBugs}</span></div>
                </div>

                {/* Footer Controls: 版本管理 & 成员管理 (满足需求2) */}
                <div className="pt-2 border-t border-[var(--border-main)]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        sessionStorage.setItem('shichuang.productLineFilter', pl.id);
                        sessionStorage.setItem('shichuang.productLineTargetTab', 'detail');
                        window.dispatchEvent(new Event('shichuang:product-line-context'));
                        openPageTab('prod_versions');
                      }}
                      icon={<Layers className="w-3.5 h-3.5 text-[var(--primary)]" />}
                    >
                      <span className="whitespace-nowrap">版本管理 ({versionCount})</span>
                    </Button>

                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSettingsSection('members');
                        setSelectedProductLineId(pl.id);
                      }}
                      icon={<Users className="w-3.5 h-3.5 text-purple-400" />}
                    >
                      <span className="whitespace-nowrap">成员管理 ({memberCount})</span>
                    </Button>

                    <Button
                      size="small"
                      disabled={!productWebsiteUrl}
                      title={productWebsiteUrl ? '打开产品网址' : '暂未配置产品网址'}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!productWebsiteUrl) return;
                        window.open(productWebsiteUrl, '_blank', 'noopener,noreferrer');
                      }}
                      icon={<Globe className="w-3.5 h-3.5 text-[var(--primary)]" />}
                    >
                      <span className="whitespace-nowrap">产品网址</span>
                    </Button>
                  </div>

                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal: 新建产品 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { resetCreateForm(); setIsModalOpen(false); }}
        title="新建产品"
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
              loading={isCreating}
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
              <label className="block font-semibold text-[var(--text-body)] mb-1">产品名称 *</label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="请输入产品名称" />
            </div>
            <div>
              <label className="block font-semibold text-[var(--text-body)] mb-1">产品编码 *</label>
              <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder={'请输入小写字母和“_”组成的产品代码，如stu、ai_stu。'} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col" required>
            <label className="text-xs font-semibold text-[var(--text-body)] mb-1">产品负责人 <span className="text-[var(--danger)]">*</span></label>
            <Select
              showSearch
              allowClear
              value={formOwnerUserId || undefined}
              onChange={(value) => setFormOwnerUserId(value || '')}
              options={ownerOptions}
              placeholder="搜索并选择负责人"
              className="w-full"
              optionFilterProp="label"
              loading={employeeOptionsQuery.isLoading}
              disabled={employeeOptionsQuery.isLoading || employeeOptionsQuery.isError}
              status={employeeOptionsQuery.isError ? 'error' : undefined}
            />
            {employeeOptionsQuery.isError && <p className="mt-1 text-[11px] text-[var(--danger)]">有效员工加载失败，请先检查团队组织数据</p>}
          </div>
            <div>
              <label className="block font-semibold text-[var(--text-body)] mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
                产品网址
              </label>
            <Input
              type="url"
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
              placeholder="请输入产品网址"
              prefix={<Globe className="w-3.5 h-3.5 text-[var(--primary)]" />}
            />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1">可见范围 <span className="text-[var(--danger)]">*</span></label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(['公开', '私密'] as const).map((value) => (
                <button type="button" key={value} onClick={() => setFormVisibility(value)} className={`rounded-md border p-3 text-left transition-colors ${formVisibility === value ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border-main)] bg-[var(--bg-surface-soft)] hover:border-[var(--primary)]/60'}`}>
                  <span className="block font-semibold text-[var(--text-body)]">{value}</span>
                  <span className="mt-1 block text-[11px] text-[var(--text-muted)]">{value === '公开' ? '组织全员可访问' : '仅产品成员可见'}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1">排序</label>
            <Input type="number" min={0} max={999} step={1} value={formSort} onChange={(e) => setFormSort(Number(e.target.value))} />
          </div>

          {/* 4. 产品描述 */}
          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1">
              产品描述
            </label>
            <div className="relative"><Input.TextArea rows={2} maxLength={1000} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="请输入产品的简介或者业务范围..." style={{ paddingBottom: 22 }} /><span className="pointer-events-none absolute bottom-1.5 right-2 text-[11px] text-[var(--text-muted)]">{formDescription.length} / 1000</span></div>
          </div>

          <div><label className="mb-1 block font-semibold text-[var(--text-body)]">是否商用</label><Select value={formCommercialAvailability} onChange={setFormCommercialAvailability} options={[{ value: '可商用', label: '可商用' }, { value: '不可商用', label: '不可商用' }]} className="w-full" /></div>

          <div className="flex items-center justify-between gap-4 rounded-md border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3">
            <div>
              <div className="font-semibold text-[var(--text-body)]">工作项设置模板</div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">自动创建需求、设计、研发、测试、缺陷和用例类型及基础状态。</p>
            </div>
            <Switch aria-label="工作项设置模板" checked={initializeWorkItemTemplate} disabled={isCreating} onChange={setInitializeWorkItemTemplate} />
          </div>

        </form>
      </Modal>

    </div>
  );
};
