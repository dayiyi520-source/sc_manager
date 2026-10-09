import React, { useEffect, useState } from 'react';
import { Input, Button, Select, Table } from "antd";
import { SearchOutlined } from '@ant-design/icons';
import {
  Boxes,
  Layers,
  Globe,
  Users,
} from '../common/octicons-compat';
import { ViewModeSwitch } from '../common/ViewModeSwitch';
import { useApp } from '../../context/AppContext';
import { StatusTag } from '../common/UIComponents';
import { EmptyState } from '../common/Data/EmptyState';
import { ProductLine } from '../../types';
import { ProductLineDetailView, type ProductLineSettingsSection } from './ProductLineDetailView';
import { normalizeProductWebsiteUrl } from './productWebsite';
import { WorkItemCategoryIcon } from './WorkItemCategoryIcon';
import { formatVersionPublishedAt, latestReleasedVersion, productLineDisplayStatus } from './productLinePresentation';
import { Pagination } from '../common/Pagination';
import { normalizeResponsibilityNames, responsibilitySummary } from './productResponsibilityPresentation';

export { normalizeProductWebsiteUrl } from './productWebsite';
export { formatVersionPublishedAt, latestReleasedVersion, productLineDisplayStatus } from './productLinePresentation';

export const productLineVersionCount = (productLineId: string, items: Array<{ productLineId?: string }>) =>
  items.filter((version) => version.productLineId === productLineId).length;

export const productLineMemberCount = (productLine: ProductLine) => new Set([
  ...(productLine.members || []).map((member) => typeof member === 'string' ? member : member.name),
  productLine.owner,
  productLine.ownerName,
  productLine.requirementOwner,
  ...normalizeResponsibilityNames(productLine.requirementOwnerSecondary),
  productLine.techOwner,
  ...normalizeResponsibilityNames(productLine.techOwnerSecondary),
  productLine.testOwner,
  ...normalizeResponsibilityNames(productLine.testOwnerSecondary),
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
  const longestName = Math.max(2, ...groups.flatMap(([, primary, secondary]) => [primary || '未设置', responsibilitySummary(secondary).label || '未设置'].map((name) => Array.from(name).length)));
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
          <span className="responsibility-person responsibility-person-secondary w-full" title={responsibilitySummary(secondary).title || '未设置'}>
              <span className="responsibility-role">次</span>
              <span className="responsibility-name responsibility-name-secondary truncate">{responsibilitySummary(secondary).label || '未设置'}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

export const ProductLinesView: React.FC = () => {
  const {
    productLines,
    versions,
    requirementTasks,
    designTasks,
    bugs,
    devTasks,
    openPageTab
  } = useApp();

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
  const statusFilterOptions = ['空闲中', '迭代中'].map((status) => ({ label: status, value: status }));

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
    { title: '状态', key: 'status', width: 110, render: (_: unknown, pl: ProductLine) => <StatusTag type={displayStatus(pl) === '空闲中' ? 'default' : 'info'} status={displayStatus(pl)} /> },
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
        { title: '协同事项', key: 'assistance', width: 88, align: 'center' as const, render: (_: unknown, pl: ProductLine) => <span className="text-[var(--text-primary)]">{getLineStats(pl).assistance}</span> },
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-3"><div className="text-[11px] text-[var(--text-muted)]">产品</div><div className="mt-1 font-mono text-xl font-bold text-[var(--primary)]">{allStats.products}</div></div>
        {[
          ['协同事项', allStats.assistance, 'prod_req_tasks', 'text-[var(--text-primary)]'],
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
            description={productLines.length === 0 ? '暂无可查看的产品' : '请调整搜索条件后重试'}
            action={productLines.length === 0 ? undefined : (
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
                      <StatusTag type={displayStatus(pl) === '空闲中' ? 'default' : 'info'} className={displayStatus(pl) === '空闲中' ? 'product-line-health-disabled' : 'product-line-health-enabled'} status={displayStatus(pl)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div onClick={() => setSelectedProductLineId(pl.id)} className="product-line-body flex flex-1 flex-col justify-between space-y-3 p-4 text-xs cursor-pointer">
                {/* Responsibility and online version information */}
                  <div className="space-y-2 text-[11px] text-[var(--text-muted)]">
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
                      <span>协同事项</span>
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

    </div>
  );
};
