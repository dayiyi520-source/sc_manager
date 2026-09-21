import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, Checkbox, Dropdown, Empty, Form, Input, Modal, Select, Spin, Table, Tag, Tree } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined, FolderOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';
import type { TestCase, TestCaseDirectory, TestPriority } from '../../types/testManagement';
import { TestCaseEditorDrawer } from './TestCaseEditorDrawer';
import { PersonIdentity } from '../common/PersonIdentity';
import { TestCaseBatchActionModal, type TestCaseBatchAction } from './TestCaseBatchActionModal';
import { Filter, Search, X } from '@/components/common/octicons-compat';
import { readSession } from '../../services/session';

type TestCaseLibraryViewProps = { productLineFilter?: string };
export type TestCaseGroup = { key: string; title: string; path: string; items: TestCase[] };
type TestCaseTableRow = TestCase | { id: string; __group: true; path: string; count: number };
type CaseFilterState = { code: string; title: string; owner: string; createdFrom: string; createdTo: string; priority: string; type: string };

const createEmptyCaseFilters = (): CaseFilterState => ({ code: '', title: '', owner: '', createdFrom: '', createdTo: '', priority: '', type: '' });

const isGroupRow = (row: TestCaseTableRow): row is Extract<TestCaseTableRow, { __group: true }> => '__group' in row;

export function groupTestCasesByDirectory(items: TestCase[], directories: TestCaseDirectory[]): TestCaseGroup[] {
  const byId = new Map(directories.map((directory) => [directory.id, directory]));
  const pathCache = new Map<string, string>();
  const pathOf = (id: string) => {
    if (pathCache.has(id)) return pathCache.get(id)!;
    const names: string[] = [];
    const productLineName = byId.get(id)?.productLineName;
    const seen = new Set<string>();
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
      names.unshift(current.name);
      seen.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    if (productLineName) names.unshift(productLineName);
    const path = names.join(' / ') || '未分类';
    pathCache.set(id, path);
    return path;
  };
  const groups = new Map<string, TestCaseGroup>();
  items.forEach((item) => {
    const key = item.directoryId || '__uncategorized__';
    const path = item.directoryId && byId.has(item.directoryId) ? pathOf(item.directoryId) : '未分类';
    const existing = groups.get(key);
    if (existing) existing.items.push(item);
    else groups.set(key, { key, title: path.split(' / ').at(-1) || path, path, items: [item] });
  });
  return [...groups.values()].sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'));
}

export const TestCaseLibraryView: React.FC<TestCaseLibraryViewProps> = ({ productLineFilter = 'all' }) => {
  const lineId = productLineFilter === 'all' ? 'all' : productLineFilter;
  const currentSessionUser = readSession()?.user;
  const currentUserName = currentSessionUser?.name || '';
  const currentUserId = currentSessionUser?.id || '';
  const queryClient = useQueryClient();
  const [directoryId, setDirectoryId] = useState('');
  const [selectedProductLineId, setSelectedProductLineId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my_owned' | 'my_created'>('all');
  const [priority, setPriority] = useState<TestPriority | ''>('');
  const [enabled, setEnabled] = useState<boolean | undefined>(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<CaseFilterState>(createEmptyCaseFilters);
  const [appliedFilters, setAppliedFilters] = useState<CaseFilterState>(createEmptyCaseFilters);
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false);
  const [directoryName, setDirectoryName] = useState('');
  const [directoryProductLineId, setDirectoryProductLineId] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<React.Key[]>([]);
  const [batchAction, setBatchAction] = useState<TestCaseBatchAction>();
  const [batchValue, setBatchValue] = useState<string>();
  const [batchDirectoryPath, setBatchDirectoryPath] = useState<string[]>([]);
  const [batchError, setBatchError] = useState('');
  const [copyingDirectory, setCopyingDirectory] = useState<TestCaseDirectory>();
  const [copyName, setCopyName] = useState('');
  const [renamingDirectory, setRenamingDirectory] = useState<TestCaseDirectory>();
  const [renameName, setRenameName] = useState('');
  const activeLineId = productLineFilter === 'all' ? selectedProductLineId || 'all' : productLineFilter;
  const batchDirectoryId = batchDirectoryPath.at(-1)?.startsWith('product-line:') ? undefined : batchDirectoryPath.at(-1);
  const controlsRef = useRef<HTMLDivElement>(null);

  const directories = useQuery({ queryKey: ['test-case-directories', lineId], queryFn: () => productRepository.testCaseDirectories(lineId), enabled: true, retry: false });
  const productLines = useQuery({ queryKey: ['test-case-product-lines'], queryFn: () => productRepository.productLines(), enabled: true, retry: false });
  const selectedLineTypes = useQuery({ queryKey: ['test-case-work-item-types', activeLineId], queryFn: () => productRepository.workItemTypes(activeLineId, '用例'), enabled: activeLineId !== 'all', retry: false });
  const employees = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, enabled: batchAction === 'owner', retry: false });
  const cases = useQuery({ queryKey: ['test-cases', activeLineId, directoryId, keyword, priority, enabled, activeTab, currentUserName, currentUserId, page], queryFn: () => productRepository.testCases(activeLineId, { directoryId, includeDescendants: Boolean(directoryId), keyword, priority, ownerId: activeTab === 'my_owned' ? currentUserId : undefined, creatorName: activeTab === 'my_created' ? currentUserName : undefined, enabled, page, pageSize: 100 }), enabled: true, retry: false });
  useEffect(() => { setSelectedProductLineId(''); setDirectoryId(''); }, [productLineFilter]);
  useEffect(() => {
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (controlsRef.current?.contains(target) || target.closest('.ant-select-dropdown, .ant-picker-dropdown, .ant-popover')) return;
      setSearchOpen(false);
      setFilterOpen(false);
    };
    document.addEventListener('pointerdown', handleOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown);
  }, []);
  const createDirectory = useMutation({
    mutationFn: () => productRepository.createTestCaseDirectory(lineId, { parentId: directoryId || null, productLineId: productLineFilter === 'all' ? directoryProductLineId : productLineFilter, name: directoryName.trim() }),
    onSuccess: () => { setDirectoryModalOpen(false); setDirectoryName(''); setDirectoryProductLineId(''); void queryClient.invalidateQueries({ queryKey: ['test-case-directories', lineId] }); },
    onError: (reason) => setActionError(reason instanceof Error ? reason.message : '创建目录失败'),
  });
  const batchUpdate = useMutation({
    mutationFn: () => productRepository.batchUpdateTestCases(activeLineId, { caseIds: selectedCaseIds.map(String), operation: batchAction!.toUpperCase() as 'MOVE' | 'OWNER' | 'PRIORITY', value: batchAction === 'move' ? batchDirectoryId : batchValue }),
    onSuccess: async () => { setBatchAction(undefined); setBatchValue(undefined); setBatchDirectoryPath([]); setBatchError(''); setSelectedCaseIds([]); await Promise.all([cases.refetch(), directories.refetch()]); },
    onError: (reason) => setBatchError(reason instanceof Error ? reason.message : '批量操作失败'),
  });
  const copyDirectory = useMutation({
    mutationFn: () => productRepository.copyTestCaseDirectory(directoryLine(copyingDirectory!), copyingDirectory!.id, { parentId: copyingDirectory!.parentId, name: copyName.trim() }),
    onSuccess: async () => { setCopyingDirectory(undefined); setCopyName(''); await Promise.all([directories.refetch(), cases.refetch()]); },
    onError: (reason) => setActionError(reason instanceof Error ? reason.message : '复制目录失败'),
  });
  const renameDirectoryMutation = useMutation({
    mutationFn: () => productRepository.renameTestCaseDirectory(directoryLine(renamingDirectory!), renamingDirectory!.id, renameName.trim()),
    onSuccess: async () => { setRenamingDirectory(undefined); setRenameName(''); await directories.refetch(); },
    onError: (reason) => setActionError(reason instanceof Error ? reason.message : '重命名目录失败'),
  });

  const directoryTree = useMemo(() => {
    const build = (parentId: string | null, lineId?: string): Array<{ key: string; title: React.ReactNode; children: ReturnType<typeof build> }> => (directories.data || []).filter((item) => (item.parentId || null) === parentId && (!lineId || item.productLineId === lineId)).map((item) => ({
      key: item.id,
      title: <span className="test-case-directory-title"><span>{item.name}</span><b>{item.caseCount}</b><span className="test-case-directory-actions"><button type="button" className="test-case-directory-add" aria-label={`在${item.name}下新建子目录`} onClick={(event) => { event.stopPropagation(); setDirectoryId(item.id); setDirectoryProductLineId(item.productLineId || productLineFilter); setDirectoryModalOpen(true); }}><PlusOutlined /></button><Dropdown trigger={['click']} menu={{ onClick: ({ key }) => { if (key === 'rename') renameDirectory(item); if (key === 'delete') removeDirectory(item); if (key === 'copy') { setCopyingDirectory(item); setCopyName(`${item.name} - 副本`); } }, items: [{ key: 'rename', label: '重命名', icon: <EditOutlined /> }, { key: 'delete', label: '删除', icon: <DeleteOutlined />, danger: true }, { key: 'copy', label: '复制', icon: <CopyOutlined /> }] }}><button type="button" className="test-case-directory-more" aria-label={`${item.name}更多操作`} onClick={(event) => event.stopPropagation()}><MoreOutlined /></button></Dropdown></span></span>,
      children: build(item.id, item.productLineId),
    }));
    if (productLineFilter !== 'all') return build(null, productLineFilter);
    const lineIds = [...new Set((directories.data || []).map((item) => item.productLineId).filter(Boolean))] as string[];
    return lineIds.map((lineId) => ({
      key: `product-line:${lineId}`,
      title: <span className="test-case-directory-title"><span>{directories.data?.find((item) => item.productLineId === lineId)?.productLineName || '未命名产品线'}</span><b>{directories.data?.filter((item) => item.productLineId === lineId).reduce((total, item) => total + item.caseCount, 0) || 0}</b></span>,
      children: build(null, lineId),
    }));
  }, [directories.data, productLineFilter]);

  const refresh = () => { void directories.refetch(); void cases.refetch(); };
  const openEditor = (value?: TestCase) => { setEditingCase(value || null); setEditorOpen(true); };
  const updateEnabled = async (value: TestCase, next: boolean) => {
    setActionError('');
    try {
      await productRepository.setTestCaseEnabled(value.productLineId || activeLineId, value.id, value.revision, next);
      await Promise.all([cases.refetch(), directories.refetch()]);
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : '更新状态失败'); }
  };
  const handleBatchAction = (value: string) => {
    if (value === 'delete') {
      Modal.confirm({ title: '确认删除用例？', content: `将删除选中的 ${selectedCaseIds.length} 条用例，已被测试任务引用的用例不会被删除。`, okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { try { await productRepository.batchUpdateTestCases(activeLineId, { caseIds: selectedCaseIds.map(String), operation: 'DELETE' }); setSelectedCaseIds([]); await Promise.all([cases.refetch(), directories.refetch()]); } catch (reason) { setActionError(reason instanceof Error ? reason.message : '批量删除失败'); } } });
      return;
    }
    setBatchValue(undefined);
    setBatchDirectoryPath([]);
    setBatchError('');
    setBatchAction(value as TestCaseBatchAction);
  };
  const directoryLine = (item: TestCaseDirectory) => item.productLineId || (productLineFilter === 'all' ? '' : productLineFilter);
  const scopedCases = useMemo(() => (cases.data?.items || []).filter((item) => activeTab === 'all' || (activeTab === 'my_owned' ? item.ownerName === currentUserName : item.creatorName === currentUserName)), [activeTab, cases.data?.items, currentUserName]);
  const tabCounts = useMemo(() => ({ all: cases.data?.total || 0, my_owned: (cases.data?.items || []).filter((item) => item.ownerName === currentUserName).length, my_created: (cases.data?.items || []).filter((item) => item.creatorName === currentUserName).length }), [cases.data?.items, cases.data?.total, currentUserName]);
  const filteredCases = useMemo(() => scopedCases.filter((item) => {
    const created = item.createdAt ? String(item.createdAt).slice(0, 10) : '';
    return (!appliedFilters.code || item.code.includes(appliedFilters.code)) && (!appliedFilters.title || item.title.toLocaleLowerCase().includes(appliedFilters.title.toLocaleLowerCase())) && (!appliedFilters.owner || item.ownerName === appliedFilters.owner) && (!appliedFilters.createdFrom || created >= appliedFilters.createdFrom) && (!appliedFilters.createdTo || created <= appliedFilters.createdTo) && (!appliedFilters.priority || item.priority === appliedFilters.priority) && (!appliedFilters.type || item.workItemTypeName === appliedFilters.type);
  }), [scopedCases, appliedFilters]);
  const activeFilterCount = [appliedFilters.code, appliedFilters.title, appliedFilters.owner, appliedFilters.createdFrom || appliedFilters.createdTo, appliedFilters.priority, appliedFilters.type].filter(Boolean).length;
  const appliedFilterLabels: Array<{ key: keyof CaseFilterState; text: string }> = [
    appliedFilters.code && { key: 'code', text: `编号：“${appliedFilters.code}”` },
    appliedFilters.title && { key: 'title', text: `标题：“${appliedFilters.title}”` },
    appliedFilters.owner && { key: 'owner', text: `执行人 ${appliedFilters.owner}` },
    (appliedFilters.createdFrom || appliedFilters.createdTo) && { key: 'createdFrom', text: `创建时间 ${appliedFilters.createdFrom || '不限'} 至 ${appliedFilters.createdTo || '不限'}` },
    appliedFilters.priority && { key: 'priority', text: `优先级 ${appliedFilters.priority}` },
    appliedFilters.type && { key: 'type', text: `类型 ${appliedFilters.type}` },
  ].filter(Boolean) as Array<{ key: keyof CaseFilterState; text: string }>;
  const removeAppliedFilter = (key: keyof CaseFilterState) => {
    setAppliedFilters((current) => ({ ...current, ...(key === 'createdFrom' ? { createdFrom: '', createdTo: '' } : { [key]: '' }) }));
    setFilterDraft((current) => ({ ...current, ...(key === 'createdFrom' ? { createdFrom: '', createdTo: '' } : { [key]: '' }) }));
  };
  const ownerOptions = useMemo(() => [...new Set((cases.data?.items || []).map((item) => item.ownerName).filter(Boolean))].map((value) => ({ label: value, value })), [cases.data?.items]);
  const typeOptions = useMemo(() => {
    const configuredTypes = activeLineId === 'all'
      ? (productLines.data || []).flatMap((line) => line.workItemTypes || [])
      : selectedLineTypes.data || productLines.data?.find((line) => line.id === activeLineId)?.workItemTypes || [];
    return [...new Set(configuredTypes.filter((item) => item.category === '用例' && item.enabled).map((item) => item.name))].map((value) => ({ label: value, value }));
  }, [activeLineId, productLines.data, selectedLineTypes.data]);
  const filterRow = (label: string, control: React.ReactNode) => <div className="test-case-filter-row"><div className="test-case-filter-label">{label}</div><div className="test-case-filter-value">{control}</div></div>;
  const groups = useMemo(() => groupTestCasesByDirectory(filteredCases, directories.data || []), [filteredCases, directories.data]);
  const tableRows = useMemo<TestCaseTableRow[]>(() => groups.flatMap((group) => [{ id: `group:${group.key}`, __group: true, path: group.path, count: group.items.length }, ...group.items]), [groups]);
  const toggleGroupSelection = (group: TestCaseGroup, checked: boolean) => {
    const groupIds = group.items.map((item) => item.id);
    setSelectedCaseIds((current) => checked
      ? [...current, ...groupIds.filter((id) => !current.includes(id))]
      : current.filter((id) => !groupIds.includes(String(id))));
  };
  const groupSelectionState = (group: TestCaseGroup) => {
    const selectedCount = group.items.filter((item) => selectedCaseIds.includes(item.id)).length;
    return { checked: selectedCount === group.items.length && group.items.length > 0, indeterminate: selectedCount > 0 && selectedCount < group.items.length };
  };
  const columns = [
    { title: '编号', dataIndex: 'code', width: 120, render: (value: string, row: TestCaseTableRow) => isGroupRow(row) ? <span className="test-case-group-row-label"><FolderOutlined /> {row.path}<b>{row.count} 条</b></span> : <button type="button" className="test-case-code test-case-code-button" title={`查看${value}`} onClick={() => openEditor(row)}>{value}</button> },
    { title: '标题', dataIndex: 'title', width: 280, ellipsis: true, render: (value: string, row: TestCaseTableRow) => isGroupRow(row) ? null : <button className="test-case-title-button" title={value} onClick={() => openEditor(row)}>{value}</button> },
    { title: '创建时间', dataIndex: 'createdAt', width: 160, render: (value: string, row: TestCaseTableRow) => isGroupRow(row) ? null : value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-' },
    { title: '负责人', dataIndex: 'ownerName', width: 140, render: (value: string, row: TestCaseTableRow) => isGroupRow(row) ? null : <PersonIdentity name={value} emptyLabel="未设置" variant="list" /> },
    { title: '优先级', dataIndex: 'priority', width: 88, render: (value: string, row: TestCaseTableRow) => isGroupRow(row) ? null : <Tag>{value}</Tag> },
    { title: '类型', dataIndex: 'workItemTypeName', width: 120, ellipsis: true, render: (_value: string, row: TestCaseTableRow) => isGroupRow(row) ? null : row.workItemTypeName },
    { title: '阶段', dataIndex: 'statusName', width: 100, render: (value: string, row: TestCaseTableRow) => isGroupRow(row) ? null : <Tag>{value}</Tag> },
  ];
  const renameDirectory = (item: TestCaseDirectory) => { setRenamingDirectory(item); setRenameName(item.name); };
  const removeDirectory = (item: TestCaseDirectory) => { Modal.confirm({ title: '确认删除目录？', content: '仅允许删除空目录；含有子目录或测试用例时无法删除。', okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { try { await productRepository.deleteTestCaseDirectory(directoryLine(item), item.id); await directories.refetch(); } catch (reason) { setActionError(reason instanceof Error ? reason.message : '删除目录失败'); throw reason; } } }); };

  return <div className="test-case-library">
    {actionError && <Alert closable onClose={() => setActionError('')} type="error" showIcon title="操作失败" description={actionError} />}
    <header className="test-case-library-toolbar" ref={controlsRef}>
      <div className="test-case-library-toolbar-top">
        <div role="tablist" aria-label="用例范围" className="requirement-scope-tabs inline-flex h-10 items-center gap-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-1">
          {([['all', '全部'], ['my_owned', '我负责的'], ['my_created', '我创建的']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={activeTab === value} onClick={() => { setActiveTab(value); setPage(1); }} className="requirement-scope-tab h-8 rounded-md px-4 text-xs font-semibold whitespace-nowrap">{label}·{tabCounts[value]}</button>)}
        </div>
        <div className="test-case-library-actions"><div className={`test-case-search ${searchOpen ? 'is-open' : ''}`}>{searchOpen && <Input allowClear prefix={<Search className="h-4 w-4" />} value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} onPressEnter={() => { setKeyword(searchDraft); setPage(1); setSearchOpen(false); }} placeholder="搜索编号或标题" />}<Button type="text" aria-label="搜索" aria-pressed={searchOpen} icon={<Search className="h-4 w-4" />} onClick={() => { setSearchDraft(keyword); setSearchOpen((value) => !value); setFilterOpen(false); }} /></div><Badge count={activeFilterCount} size="small" offset={[-2, 2]}><Button type="text" aria-label="过滤器" aria-pressed={filterOpen} icon={<Filter className="h-4 w-4" />} onClick={() => { setFilterDraft(appliedFilters); setFilterOpen((value) => !value); setSearchOpen(false); }} /></Badge><Button type="primary" icon={<PlusOutlined />} disabled={directories.isLoading || directories.isError} onClick={() => openEditor()}>新建用例</Button></div>
      </div>
      {filterOpen && <div className="test-case-filters"><div className="test-case-filter-grid">
        {filterRow('编号', <Input aria-label="编号过滤值" variant="borderless" value={filterDraft.code} onChange={(event) => setFilterDraft((value) => ({ ...value, code: event.target.value }))} placeholder="请输入完整编号" />)}
        {filterRow('标题', <Input aria-label="标题过滤值" variant="borderless" value={filterDraft.title} onChange={(event) => setFilterDraft((value) => ({ ...value, title: event.target.value }))} placeholder="请输入标题关键词" />)}
        {filterRow('执行人', <Select aria-label="执行人" variant="borderless" allowClear showSearch optionFilterProp="label" value={filterDraft.owner || undefined} onChange={(value) => setFilterDraft((current) => ({ ...current, owner: value || '' }))} options={ownerOptions} placeholder="请选择或输入关键字查询" />)}
        <div className="test-case-filter-row"><div className="test-case-filter-label">创建时间</div><div className="test-case-filter-date-value"><Input aria-label="创建时间开始" type="date" variant="borderless" value={filterDraft.createdFrom} onChange={(event) => setFilterDraft((value) => ({ ...value, createdFrom: event.target.value }))} /><span>-</span><Input aria-label="创建时间结束" type="date" variant="borderless" value={filterDraft.createdTo} onChange={(event) => setFilterDraft((value) => ({ ...value, createdTo: event.target.value }))} /></div></div>
        {filterRow('优先级', <Select aria-label="优先级" variant="borderless" allowClear value={filterDraft.priority || undefined} onChange={(value) => setFilterDraft((current) => ({ ...current, priority: value || '' }))} options={(['P0', 'P1', 'P2', 'P3'] as TestPriority[]).map((value) => ({ label: value, value }))} placeholder="请选择优先级" />)}
        {filterRow('类型', <Select aria-label="类型" variant="borderless" allowClear showSearch optionFilterProp="label" value={filterDraft.type || undefined} onChange={(value) => setFilterDraft((current) => ({ ...current, type: value || '' }))} options={typeOptions} placeholder="请选择类型" />)}
      </div><div className="test-case-filter-actions"><Button onClick={() => { const empty = createEmptyCaseFilters(); setFilterDraft(empty); setAppliedFilters(empty); }}>清空</Button><Button type="primary" onClick={() => { setAppliedFilters(filterDraft); setFilterOpen(false); }}>应用过滤</Button></div></div>}
      {activeFilterCount > 0 && <div className="test-case-applied-filters">{appliedFilterLabels.map(({ key, text }) => <span key={key} className="test-case-filter-tag">{text}<button type="button" aria-label={`删除${text}`} onClick={() => removeAppliedFilter(key)}><X className="h-3 w-3" /></button></span>)}<button type="button" className="test-case-clear-filters" onClick={() => { const empty = createEmptyCaseFilters(); setFilterDraft(empty); setAppliedFilters(empty); }}>清空过滤条件</button></div>}
    </header>
    <div className="test-case-library-grid">
      <aside className="test-case-directory-rail">
        <div className="test-case-panel-heading"><span>功能目录</span><Button type="text" aria-label="新建功能目录" icon={<PlusOutlined />} onClick={() => { setDirectoryId(''); setDirectoryProductLineId(productLineFilter === 'all' ? '' : productLineFilter); setDirectoryModalOpen(true); }} /></div>
        {directories.isLoading ? <Spin /> : directories.isError ? <Alert type="error" showIcon title="目录加载失败" action={<Button size="small" onClick={() => directories.refetch()}>重试</Button>} /> : <Tree blockNode selectedKeys={directoryId ? [directoryId] : selectedProductLineId ? [`product-line:${selectedProductLineId}`] : []} treeData={productLineFilter === 'all' ? directoryTree : [{ key: '__current-product-line__', title: <span className="test-case-directory-title"><span>{productLines.data?.find((line) => line.id === productLineFilter)?.name || '当前产品线'}</span><b>{cases.data?.total || 0}</b></span>, children: directoryTree }]} onSelect={(keys) => { const key = String(keys[0] || ''); if (key === '__current-product-line__') { setDirectoryId(''); setPage(1); return; } if (key.startsWith('product-line:')) { setSelectedProductLineId(key.slice('product-line:'.length)); setDirectoryId(''); setPage(1); return; } setSelectedProductLineId(directories.data?.find((item) => item.id === key)?.productLineId || (productLineFilter === 'all' ? '' : productLineFilter)); setDirectoryId(key); setPage(1); }} />}
      </aside>
      <main className="test-case-data-plane">
        {selectedCaseIds.length > 0 && <div className="test-case-batch-bar"><span>已选中 {selectedCaseIds.length} 条用例</span><Select value={undefined} placeholder={`批量操作${selectedCaseIds.length}条`} onChange={handleBatchAction} options={[{ label: '移动用例', value: 'move' }, { label: '删除用例', value: 'delete' }, { label: '修改负责人', value: 'owner' }, { label: '修改优先级', value: 'priority' }]} /><Button onClick={() => setSelectedCaseIds([])}>取消选择</Button></div>}
        {cases.isError ? <div className="test-case-table-state"><Alert type="error" showIcon title="用例加载失败" description="请检查网络后重试。" action={<Button onClick={() => cases.refetch()}>重试</Button>} /></div> : <div className="test-case-group-list">{groups.length === 0 && !cases.isLoading ? <div className="test-case-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前目录暂无测试用例" /><Button type="primary" icon={<PlusOutlined />} disabled={directories.isLoading || directories.isError} onClick={() => openEditor()}>添加用例</Button></div> : <Table<TestCaseTableRow> rowKey="id" rowClassName={(row) => isGroupRow(row) ? 'test-case-group-table-row' : ''} rowSelection={{ selectedRowKeys: selectedCaseIds, onChange: setSelectedCaseIds, getCheckboxProps: (row) => ({ disabled: isGroupRow(row) }), renderCell: (_checked, row, _index, originNode) => isGroupRow(row) ? null : originNode }} loading={cases.isLoading} dataSource={tableRows} scroll={{ x: 1040 }} pagination={false} columns={columns} components={{ body: { row: (props: React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key'?: string; children?: React.ReactNode }) => { const row = tableRows.find((item) => String(item.id) === String(props['data-row-key'])); if (!row || !isGroupRow(row)) return <tr {...props} />; const group = groups.find((item) => `group:${item.key}` === row.id); const state = group ? groupSelectionState(group) : { checked: false, indeterminate: false }; return <tr {...props} className="test-case-group-table-row"><td colSpan={columns.length + 1}><span className="test-case-group-row-label"><Checkbox aria-label={`全选${row.path}`} checked={state.checked} indeterminate={state.indeterminate} onChange={(event) => group && toggleGroupSelection(group, event.target.checked)} /><FolderOutlined /> {row.path}<b>{row.count} 条</b></span></td></tr>; } } }} />}{groups.length > 0 && <div className="test-case-group-pagination"><span>共 {cases.data?.total || 0} 条</span><Button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button><span>第 {page} 页</span><Button disabled={page * 100 >= (cases.data?.total || 0)} onClick={() => setPage(page + 1)}>下一页</Button></div>}</div>}
      </main>
    </div>
    <TestCaseBatchActionModal open={!!batchAction} action={batchAction} directories={directories.data || []} directoryPath={batchDirectoryPath} value={batchValue} employees={employees.data || []} employeesLoading={employees.isLoading} employeesError={employees.isError} directoriesLoading={directories.isLoading} directoriesError={directories.isError} submitting={batchUpdate.isPending} error={batchError} onDirectoryPathChange={(path) => { setBatchDirectoryPath(path); setBatchValue(path.at(-1)); setBatchError(''); }} onValueChange={(value) => { setBatchValue(value); setBatchError(''); }} onCancel={() => { setBatchAction(undefined); setBatchValue(undefined); setBatchDirectoryPath([]); setBatchError(''); }} onSubmit={() => batchUpdate.mutate()} />
    <Modal title="复制目录" open={!!copyingDirectory} onCancel={() => { setCopyingDirectory(undefined); setCopyName(''); }} onOk={() => copyDirectory.mutate()} okButtonProps={{ disabled: !copyName.trim() }} confirmLoading={copyDirectory.isPending} okText="复制" cancelText="取消"><Form layout="vertical"><Form.Item label="新目录名称" required><Input autoFocus value={copyName} onChange={(event) => setCopyName(event.target.value)} maxLength={120} /></Form.Item><div className="text-xs text-[var(--text-muted)]">目录下的子目录、测试用例和步骤将一并复制。</div></Form></Modal>
    <Modal title="重命名目录" open={!!renamingDirectory} onCancel={() => { setRenamingDirectory(undefined); setRenameName(''); }} onOk={() => renameDirectoryMutation.mutate()} okButtonProps={{ disabled: !renameName.trim() }} confirmLoading={renameDirectoryMutation.isPending} okText="保存" cancelText="取消"><Form layout="vertical"><Form.Item label="目录名称" required><Input autoFocus value={renameName} onChange={(event) => setRenameName(event.target.value)} maxLength={120} /></Form.Item></Form></Modal>
    <Modal title={directoryId ? '新建子目录' : '新建根目录'} open={directoryModalOpen} onCancel={() => setDirectoryModalOpen(false)} footer={[<Button key="cancel" onClick={() => setDirectoryModalOpen(false)}>取消</Button>, <Button key="save" type="primary" loading={createDirectory.isPending} disabled={!directoryName.trim() || (productLineFilter === 'all' && !directoryProductLineId)} onClick={() => createDirectory.mutate()}>保存</Button>]}><Form layout="vertical"><Form.Item label="产品线" required={productLineFilter === 'all'}>{productLineFilter === 'all' ? <Select placeholder="请选择产品线" value={directoryProductLineId || undefined} onChange={setDirectoryProductLineId} options={(productLines.data || []).map((item) => ({ label: item.name, value: item.id }))} /> : <Input value={productLines.data?.find((item) => item.id === productLineFilter)?.name || '当前产品线'} disabled />}</Form.Item><Form.Item label="目录名称" required><Input autoFocus value={directoryName} onChange={(event) => setDirectoryName(event.target.value)} maxLength={120} placeholder="请输入目录名称" /></Form.Item></Form></Modal>
    <TestCaseEditorDrawer open={editorOpen} productLineId={editingCase?.productLineId || activeLineId} directories={directories.data || []} initialCase={editingCase} onClose={() => setEditorOpen(false)} onSaved={(_saved, continueCreating) => { if (!continueCreating) setEditorOpen(false); void cases.refetch(); void directories.refetch(); }} />
  </div>;
};
