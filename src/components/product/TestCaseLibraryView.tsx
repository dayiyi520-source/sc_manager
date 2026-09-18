import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Dropdown, Empty, Form, Input, Modal, Select, Spin, Table, Tag, Tree } from 'antd';
import { CopyOutlined, DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';
import type { TestCase, TestCaseDirectory, TestPriority, TestResultStatus } from '../../types/testManagement';
import { TestCaseEditorDrawer } from './TestCaseEditorDrawer';

type TestCaseLibraryViewProps = { productLineFilter?: string };
const RESULT_LABEL: Record<TestResultStatus, string> = { NOT_EXECUTED: '未执行', PASSED: '通过', FAILED: '失败' };

export const TestCaseLibraryView: React.FC<TestCaseLibraryViewProps> = ({ productLineFilter = 'all' }) => {
  const lineId = productLineFilter === 'all' ? 'all' : productLineFilter;
  const queryClient = useQueryClient();
  const [directoryId, setDirectoryId] = useState('');
  const [selectedProductLineId, setSelectedProductLineId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [priority, setPriority] = useState<TestPriority | ''>('');
  const [enabled, setEnabled] = useState<boolean | undefined>(true);
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false);
  const [directoryName, setDirectoryName] = useState('');
  const [directoryProductLineId, setDirectoryProductLineId] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<React.Key[]>([]);
  const [batchAction, setBatchAction] = useState<string>();
  const [batchValue, setBatchValue] = useState<string>();
  const [copyingDirectory, setCopyingDirectory] = useState<TestCaseDirectory>();
  const [copyName, setCopyName] = useState('');
  const [renamingDirectory, setRenamingDirectory] = useState<TestCaseDirectory>();
  const [renameName, setRenameName] = useState('');
  const activeLineId = productLineFilter === 'all' ? selectedProductLineId || 'all' : productLineFilter;

  const directories = useQuery({ queryKey: ['test-case-directories', lineId], queryFn: () => productRepository.testCaseDirectories(lineId), enabled: true, retry: false });
  const productLines = useQuery({ queryKey: ['test-case-product-lines'], queryFn: () => productRepository.productLines(), enabled: true, retry: false });
  const employees = useQuery({ queryKey: ['team-member-options'], queryFn: teamRepository.options, enabled: batchAction === 'owner', retry: false });
  const cases = useQuery({ queryKey: ['test-cases', activeLineId, directoryId, keyword, priority, enabled, page], queryFn: () => productRepository.testCases(activeLineId, { directoryId, keyword, priority, enabled, page, pageSize: 20 }), enabled: true, retry: false });
  useEffect(() => { setSelectedProductLineId(''); setDirectoryId(''); }, [productLineFilter]);
  const createDirectory = useMutation({
    mutationFn: () => productRepository.createTestCaseDirectory(lineId, { parentId: directoryId || null, productLineId: productLineFilter === 'all' ? directoryProductLineId : productLineFilter, name: directoryName.trim() }),
    onSuccess: () => { setDirectoryModalOpen(false); setDirectoryName(''); setDirectoryProductLineId(''); void queryClient.invalidateQueries({ queryKey: ['test-case-directories', lineId] }); },
    onError: (reason) => setActionError(reason instanceof Error ? reason.message : '创建目录失败'),
  });
  const batchUpdate = useMutation({
    mutationFn: () => productRepository.batchUpdateTestCases(activeLineId, { caseIds: selectedCaseIds.map(String), operation: batchAction!.toUpperCase() as 'MOVE' | 'OWNER' | 'PRIORITY', value: batchValue }),
    onSuccess: async () => { setBatchAction(undefined); setBatchValue(undefined); setSelectedCaseIds([]); await Promise.all([cases.refetch(), directories.refetch()]); },
    onError: (reason) => setActionError(reason instanceof Error ? reason.message : '批量操作失败'),
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
    setBatchAction(value);
  };
  const directoryLine = (item: TestCaseDirectory) => item.productLineId || (productLineFilter === 'all' ? '' : productLineFilter);
  const renameDirectory = (item: TestCaseDirectory) => { setRenamingDirectory(item); setRenameName(item.name); };
  const removeDirectory = (item: TestCaseDirectory) => { Modal.confirm({ title: '确认删除目录？', content: '仅允许删除空目录；含有子目录或测试用例时无法删除。', okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: async () => { try { await productRepository.deleteTestCaseDirectory(directoryLine(item), item.id); await directories.refetch(); } catch (reason) { setActionError(reason instanceof Error ? reason.message : '删除目录失败'); throw reason; } } }); };

  return <div className="test-case-library">
    {actionError && <Alert closable onClose={() => setActionError('')} type="error" showIcon title="操作失败" description={actionError} />}
    <header className="test-case-library-toolbar">
      <div><h2>测试用例库</h2></div>
      <div className="test-case-library-actions"><Input allowClear prefix={<SearchOutlined />} value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="搜索编号或标题" /><Select allowClear value={priority || undefined} onChange={(value) => { setPriority(value || ''); setPage(1); }} placeholder="优先级" options={(['P0', 'P1', 'P2', 'P3'] as TestPriority[]).map((value) => ({ label: value, value }))} /><Select value={enabled === undefined ? 'all' : String(enabled)} onChange={(value) => { setEnabled(value === 'all' ? undefined : value === 'true'); setPage(1); }} options={[{ label: '全部状态', value: 'all' }, { label: '已启用', value: 'true' }, { label: '已停用', value: 'false' }]} /><Select placeholder="匹配操作" options={[{ label: '匹配全部', value: 'all' }, { label: '匹配标题', value: 'title' }, { label: '匹配编号', value: 'code' }]} /><Button aria-label="刷新用例库" icon={<ReloadOutlined />} loading={cases.isFetching} onClick={refresh} /><Button type="primary" icon={<PlusOutlined />} disabled={directories.isLoading || directories.isError} onClick={() => openEditor()}>新建用例</Button></div>
    </header>
    <div className="test-case-library-grid">
      <aside className="test-case-directory-rail">
        <div className="test-case-panel-heading"><span>功能目录</span><Button type="text" aria-label="新建功能目录" icon={<PlusOutlined />} onClick={() => { setDirectoryId(''); setDirectoryProductLineId(productLineFilter === 'all' ? '' : productLineFilter); setDirectoryModalOpen(true); }} /></div>
        {directories.isLoading ? <Spin /> : directories.isError ? <Alert type="error" showIcon title="目录加载失败" action={<Button size="small" onClick={() => directories.refetch()}>重试</Button>} /> : <Tree blockNode selectedKeys={directoryId ? [directoryId] : selectedProductLineId ? [`product-line:${selectedProductLineId}`] : []} treeData={productLineFilter === 'all' ? directoryTree : [{ key: '__current-product-line__', title: <span className="test-case-directory-title"><span>{productLines.data?.find((line) => line.id === productLineFilter)?.name || '当前产品线'}</span><b>{cases.data?.total || 0}</b></span>, children: directoryTree }]} onSelect={(keys) => { const key = String(keys[0] || ''); if (key === '__current-product-line__') { setDirectoryId(''); setPage(1); return; } if (key.startsWith('product-line:')) { setSelectedProductLineId(key.slice('product-line:'.length)); setDirectoryId(''); setPage(1); return; } setSelectedProductLineId(''); setDirectoryId(key); setPage(1); }} />}
      </aside>
      <main className="test-case-data-plane">
        {selectedCaseIds.length > 0 && <div className="test-case-batch-bar"><span>已选中 {selectedCaseIds.length} 条用例</span><Select value={undefined} placeholder={`批量操作${selectedCaseIds.length}条`} onChange={handleBatchAction} options={[{ label: '移动用例', value: 'move' }, { label: '删除用例', value: 'delete' }, { label: '修改负责人', value: 'owner' }, { label: '修改优先级', value: 'priority' }]} /><Button onClick={() => setSelectedCaseIds([])}>取消选择</Button></div>}
        {cases.isError ? <div className="test-case-table-state"><Alert type="error" showIcon title="用例加载失败" description="请检查网络后重试。" action={<Button onClick={() => cases.refetch()}>重试</Button>} /></div> : <Table<TestCase> rowKey="id" rowSelection={{ selectedRowKeys: selectedCaseIds, onChange: setSelectedCaseIds }} loading={cases.isLoading} dataSource={cases.data?.items || []} scroll={{ x: 1040 }} pagination={{ current: page, pageSize: 20, total: cases.data?.total || 0, showSizeChanger: false, onChange: setPage }} locale={{ emptyText: <div className="test-case-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前目录暂无测试用例" /><Button type="primary" icon={<PlusOutlined />} disabled={directories.isLoading || directories.isError} onClick={() => openEditor()}>添加用例</Button></div> }} columns={[
          { title: '编号', dataIndex: 'code', width: 120, render: (value, row) => <button type="button" className="test-case-code test-case-code-button" title={`查看${value}`} onClick={() => openEditor(row)}>{value}</button> },
          { title: '标题', dataIndex: 'title', width: 280, ellipsis: true, render: (value, row) => <button className="test-case-title-button" title={value} onClick={() => openEditor(row)}>{value}</button> },
          { title: '创建时间', dataIndex: 'createdAt', width: 160, render: (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-' },
          { title: '负责人', dataIndex: 'ownerName', width: 120, ellipsis: true },
          { title: '优先级', dataIndex: 'priority', width: 88, render: (value) => <Tag>{value}</Tag> },
          { title: '类型', dataIndex: 'workItemTypeName', width: 120, ellipsis: true },
          { title: '阶段', dataIndex: 'statusName', width: 100, render: (value) => <Tag>{value}</Tag> },
          { title: '最新执行结果', dataIndex: 'latestResult', width: 120, render: (value) => value === 'PASSED' ? '已通过' : value === 'FAILED' ? '未通过' : '未执行' },
        ]} />}
      </main>
    </div>
    <Modal title={batchAction === 'move' ? '移动用例' : batchAction === 'owner' ? '修改负责人' : '修改优先级'} open={!!batchAction} onCancel={() => { setBatchAction(undefined); setBatchValue(undefined); }} onOk={() => batchUpdate.mutate()} okButtonProps={{ disabled: !batchValue }} confirmLoading={batchUpdate.isPending} okText="保存" cancelText="取消"><Select className="w-full" showSearch optionFilterProp="label" value={batchValue} onChange={setBatchValue} loading={batchAction === 'owner' && employees.isLoading} status={batchAction === 'owner' && employees.isError ? 'error' : undefined} placeholder={batchAction === 'move' ? '选择目标目录' : batchAction === 'owner' ? '选择负责人' : '选择优先级'} options={batchAction === 'move' ? (directories.data || []).map((item) => ({ label: `${item.productLineName ? `${item.productLineName} / ` : ''}${item.name}`, value: item.id })) : batchAction === 'priority' ? ['P0', 'P1', 'P2', 'P3'].map((value) => ({ label: value, value })) : (employees.data || []).map((item) => ({ label: `${item.name} · ${item.department || '未分配部门'}`, value: item.id }))} /></Modal>
    <Modal title="复制目录" open={!!copyingDirectory} onCancel={() => { setCopyingDirectory(undefined); setCopyName(''); }} onOk={() => copyDirectory.mutate()} okButtonProps={{ disabled: !copyName.trim() }} confirmLoading={copyDirectory.isPending} okText="复制" cancelText="取消"><Form layout="vertical"><Form.Item label="新目录名称" required><Input autoFocus value={copyName} onChange={(event) => setCopyName(event.target.value)} maxLength={120} /></Form.Item><div className="text-xs text-[var(--text-muted)]">目录下的子目录、测试用例和步骤将一并复制。</div></Form></Modal>
    <Modal title="重命名目录" open={!!renamingDirectory} onCancel={() => { setRenamingDirectory(undefined); setRenameName(''); }} onOk={() => renameDirectoryMutation.mutate()} okButtonProps={{ disabled: !renameName.trim() }} confirmLoading={renameDirectoryMutation.isPending} okText="保存" cancelText="取消"><Form layout="vertical"><Form.Item label="目录名称" required><Input autoFocus value={renameName} onChange={(event) => setRenameName(event.target.value)} maxLength={120} /></Form.Item></Form></Modal>
    <Modal title={directoryId ? '新建子目录' : '新建根目录'} open={directoryModalOpen} onCancel={() => setDirectoryModalOpen(false)} footer={[<Button key="cancel" onClick={() => setDirectoryModalOpen(false)}>取消</Button>, <Button key="save" type="primary" loading={createDirectory.isPending} disabled={!directoryName.trim() || (productLineFilter === 'all' && !directoryProductLineId)} onClick={() => createDirectory.mutate()}>保存</Button>]}><Form layout="vertical"><Form.Item label="产品线" required={productLineFilter === 'all'}>{productLineFilter === 'all' ? <Select placeholder="请选择产品线" value={directoryProductLineId || undefined} onChange={setDirectoryProductLineId} options={(productLines.data || []).map((item) => ({ label: item.name, value: item.id }))} /> : <Input value={productLines.data?.find((item) => item.id === productLineFilter)?.name || '当前产品线'} disabled />}</Form.Item><Form.Item label="目录名称" required><Input autoFocus value={directoryName} onChange={(event) => setDirectoryName(event.target.value)} maxLength={120} placeholder="请输入目录名称" /></Form.Item></Form></Modal>
    <TestCaseEditorDrawer open={editorOpen} productLineId={editingCase?.productLineId || activeLineId} directories={directories.data || []} initialCase={editingCase} onClose={() => setEditorOpen(false)} onSaved={(_saved, continueCreating) => { if (!continueCreating) setEditorOpen(false); void cases.refetch(); void directories.refetch(); }} />
  </div>;
};
