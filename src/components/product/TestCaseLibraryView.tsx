import React, { useMemo, useState } from 'react';
import { Alert, Button, Empty, Input, Modal, Select, Spin, Switch, Table, Tag, Tree } from 'antd';
import { EditOutlined, FolderAddOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import type { TestCase, TestCaseDirectory, TestPriority, TestResultStatus } from '../../types/testManagement';
import { TestCaseEditorDrawer } from './TestCaseEditorDrawer';

type TestCaseLibraryViewProps = { productLineFilter?: string };
const RESULT_LABEL: Record<TestResultStatus, string> = { NOT_EXECUTED: '未执行', PASSED: '通过', FAILED: '失败' };

const BananaEmptyMark = () => <div className="test-case-banana" aria-hidden="true"><span /><i /></div>;

export const TestCaseLibraryView: React.FC<TestCaseLibraryViewProps> = ({ productLineFilter = 'all' }) => {
  const lineId = productLineFilter === 'all' ? '' : productLineFilter;
  const queryClient = useQueryClient();
  const [directoryId, setDirectoryId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [priority, setPriority] = useState<TestPriority | ''>('');
  const [enabled, setEnabled] = useState<boolean | undefined>(true);
  const [page, setPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<TestCase | null>(null);
  const [directoryModalOpen, setDirectoryModalOpen] = useState(false);
  const [directoryName, setDirectoryName] = useState('');
  const [actionError, setActionError] = useState('');

  const directories = useQuery({ queryKey: ['test-case-directories', lineId], queryFn: () => productRepository.testCaseDirectories(lineId), enabled: !!lineId, retry: false });
  const cases = useQuery({ queryKey: ['test-cases', lineId, directoryId, keyword, priority, enabled, page], queryFn: () => productRepository.testCases(lineId, { directoryId, keyword, priority, enabled, page, pageSize: 20 }), enabled: !!lineId, retry: false });
  const createDirectory = useMutation({
    mutationFn: () => productRepository.createTestCaseDirectory(lineId, { parentId: directoryId || null, name: directoryName.trim() }),
    onSuccess: () => { setDirectoryModalOpen(false); setDirectoryName(''); void queryClient.invalidateQueries({ queryKey: ['test-case-directories', lineId] }); },
    onError: (reason) => setActionError(reason instanceof Error ? reason.message : '创建目录失败'),
  });

  const directoryTree = useMemo(() => {
    const build = (parentId: string | null): Array<{ key: string; title: React.ReactNode; children: ReturnType<typeof build> }> => (directories.data || []).filter((item) => (item.parentId || null) === parentId).map((item) => ({
      key: item.id,
      title: <span className="test-case-directory-title"><span>{item.name}</span><b>{item.caseCount}</b></span>,
      children: build(item.id),
    }));
    return build(null);
  }, [directories.data]);

  const refresh = () => { void directories.refetch(); void cases.refetch(); };
  const openEditor = (value?: TestCase) => { setEditingCase(value || null); setEditorOpen(true); };
  const updateEnabled = async (value: TestCase, next: boolean) => {
    setActionError('');
    try {
      await productRepository.setTestCaseEnabled(lineId, value.id, value.revision, next);
      await Promise.all([cases.refetch(), directories.refetch()]);
    } catch (reason) { setActionError(reason instanceof Error ? reason.message : '更新状态失败'); }
  };

  if (!lineId) return <div className="test-case-library-state"><BananaEmptyMark /><h2>请选择产品线</h2><p>用例目录、编号和负责人均按产品线隔离。</p><Button type="primary" aria-label="新建用例" disabled icon={<PlusOutlined />}>新建用例</Button></div>;

  return <div className="test-case-library">
    {actionError && <Alert closable onClose={() => setActionError('')} type="error" showIcon title="操作失败" description={actionError} />}
    <header className="test-case-library-toolbar">
      <div><h2>测试用例库</h2><p>维护可复用步骤，并在测试计划中引用。</p></div>
      <div className="test-case-library-actions"><Button aria-label="刷新用例库" icon={<ReloadOutlined />} loading={cases.isFetching} onClick={refresh} /><Button type="primary" icon={<PlusOutlined />} disabled={!directories.data?.length} onClick={() => openEditor()}>新建用例</Button></div>
    </header>
    <div className="test-case-library-grid">
      <aside className="test-case-directory-rail">
        <div className="test-case-panel-heading"><span>功能目录</span><Button type="text" aria-label="新建功能目录" icon={<FolderAddOutlined />} onClick={() => setDirectoryModalOpen(true)} /></div>
        {directories.isLoading ? <Spin /> : directories.isError ? <Alert type="error" showIcon title="目录加载失败" action={<Button size="small" onClick={() => directories.refetch()}>重试</Button>} /> : <Tree blockNode selectedKeys={directoryId ? [directoryId] : []} treeData={[{ key: '', title: <span className="test-case-directory-title"><span>全部用例</span><b>{cases.data?.total || 0}</b></span>, children: directoryTree }]} onSelect={(keys) => { setDirectoryId(String(keys[0] || '')); setPage(1); }} />}
      </aside>
      <main className="test-case-data-plane">
        <div className="test-case-filters"><Input allowClear prefix={<SearchOutlined />} value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="搜索编号或标题" /><Select allowClear value={priority || undefined} onChange={(value) => { setPriority(value || ''); setPage(1); }} placeholder="优先级" options={(['P0', 'P1', 'P2', 'P3'] as TestPriority[]).map((value) => ({ label: value, value }))} /><Select value={enabled === undefined ? 'all' : String(enabled)} onChange={(value) => { setEnabled(value === 'all' ? undefined : value === 'true'); setPage(1); }} options={[{ label: '全部状态', value: 'all' }, { label: '已启用', value: 'true' }, { label: '已停用', value: 'false' }]} /></div>
        {cases.isError ? <div className="test-case-table-state"><Alert type="error" showIcon title="用例加载失败" description="请检查网络后重试。" action={<Button onClick={() => cases.refetch()}>重试</Button>} /></div> : <Table<TestCase> rowKey="id" loading={cases.isLoading} dataSource={cases.data?.items || []} scroll={{ x: 1040 }} pagination={{ current: page, pageSize: 20, total: cases.data?.total || 0, showSizeChanger: false, onChange: setPage }} locale={{ emptyText: <Empty image={<BananaEmptyMark />} description="当前目录暂无测试用例" /> }} columns={[
          { title: '编号', dataIndex: 'code', width: 120, render: (value) => <span className="test-case-code">{value}</span> },
          { title: '用例标题', dataIndex: 'title', width: 280, ellipsis: true, render: (value, row) => <button className="test-case-title-button" title={value} onClick={() => openEditor(row)}>{value}</button> },
          { title: '优先级', dataIndex: 'priority', width: 88, render: (value) => <Tag>{value}</Tag> },
          { title: '负责人', dataIndex: 'ownerName', width: 120, ellipsis: true },
          { title: '最新结果', dataIndex: 'latestResult', width: 108, render: (value?: TestResultStatus) => value ? <Tag color={value === 'PASSED' ? 'success' : value === 'FAILED' ? 'error' : 'default'}>{RESULT_LABEL[value]}</Tag> : <span className="test-case-muted">无记录</span> },
          { title: '引用', dataIndex: 'referenceCount', width: 72 },
          { title: '状态', dataIndex: 'enabled', width: 92, render: (value, row) => <Switch size="small" checked={value} aria-label={`${row.title}启用状态`} onChange={(next) => void updateEnabled(row, next)} /> },
          { title: '操作', key: 'actions', width: 72, fixed: 'right', render: (_, row) => <Button type="text" aria-label={`编辑${row.title}`} icon={<EditOutlined />} onClick={() => openEditor(row)} /> },
        ]} />}
      </main>
      <aside className="test-case-inspector">
        <div className="test-case-panel-heading"><span>库概览</span></div>
        <dl><div><dt>当前范围</dt><dd>{directoryId ? directories.data?.find((item) => item.id === directoryId)?.name : '全部目录'}</dd></div><div><dt>用例数量</dt><dd>{cases.data?.total || 0}</dd></div><div><dt>过滤状态</dt><dd>{enabled === undefined ? '全部' : enabled ? '已启用' : '已停用'}</dd></div></dl>
      </aside>
    </div>
    <Modal title={directoryId ? '新建子目录' : '新建根目录'} open={directoryModalOpen} onCancel={() => setDirectoryModalOpen(false)} onOk={() => createDirectory.mutate()} confirmLoading={createDirectory.isPending} okButtonProps={{ disabled: !directoryName.trim() }}><Input autoFocus value={directoryName} onChange={(event) => setDirectoryName(event.target.value)} maxLength={120} placeholder="请输入目录名称" /></Modal>
    <TestCaseEditorDrawer open={editorOpen} productLineId={lineId} directories={directories.data || []} initialCase={editingCase} onClose={() => setEditorOpen(false)} onSaved={() => { setEditorOpen(false); void cases.refetch(); void directories.refetch(); }} />
  </div>;
};
