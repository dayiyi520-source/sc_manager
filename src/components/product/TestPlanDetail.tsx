import './testPlanDetail.css';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Button, Empty, Input, Modal, Select, Spin, Table } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productRepository, type UnifiedWorkItem } from '../../services/productRepository';
import { RequirementTasksView } from './RequirementTasksView';
import { TestPlanCaseDefects } from './TestPlanCaseDefects';
import type { TestCase, TestPlan, TestPlanCase, TestPlanCaseStatus } from '../../types/testManagement';

export type TestPlanRecord = { plan: TestPlan; task: UnifiedWorkItem; productName?: string; versionName?: string };
type SavedCase = TestPlanCase & Partial<TestCase>;

export const TestPlanDetail: React.FC<{ record: TestPlanRecord; onBack: () => void }> = ({ record, onBack }) => {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [savedDirectoryId, setSavedDirectoryId] = useState<string>();
  const [addDirectoryId, setAddDirectoryId] = useState<string>();
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [defectCase, setDefectCase] = useState<SavedCase>();
  const [defectMode, setDefectMode] = useState<'create' | 'link'>();
  const [defectKeyword, setDefectKeyword] = useState('');
  const [defectId, setDefectId] = useState<string>();
  const defectRequestId = useRef('');
  const [createdDefectId, setCreatedDefectId] = useState<string>();
  const defects = useQuery({ queryKey: ['test-plan-defects', record.task.productLineId, defectKeyword], queryFn: () => productRepository.workItems(record.task.productLineId, 'bug', defectKeyword), enabled: Boolean(defectMode), retry: false });
  const persistCases = async (ids: string[], results = record.plan.cases) => {
    const saved = await productRepository.saveTestPlan(record.task.id, record.plan.id || '', { testCaseIds: ids, name: record.plan.name || '', environment: record.plan.environment, startDate: record.plan.startDate, endDate: record.plan.endDate, ownerId: record.plan.ownerId || undefined, ownerName: record.plan.ownerName || undefined, revision: record.plan.revision, caseResults: results.map((item) => ({ testCaseId: item.testCaseId, executionStatus: item.executionStatus || 'NOT_EXECUTED', defectIds: item.defectIds || [] })) });
    Object.assign(record.plan, saved);
    await queryClient.invalidateQueries({ queryKey: ['test-plan-list'] });
  };
  const updateCase = async (item: SavedCase, patch: Partial<TestPlanCase>) => {
    setSaving(true); setSaveError('');
    try { await persistCases(record.plan.cases.map((row) => row.testCaseId), record.plan.cases.map((row) => row.testCaseId === item.testCaseId ? { ...row, ...patch } : row)); return true; }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : '保存用例失败'); return false; }
    finally { setSaving(false); }
  };
  const closeDefect = () => { if (saving) return; setDefectMode(undefined); setDefectCase(undefined); setDefectId(undefined); setCreatedDefectId(undefined); setDefectKeyword(''); };
  const linkDefect = async (id: string) => {
    if (defectCase && await updateCase(defectCase, { defectIds: [...new Set([...(defectCase.defectIds || []), id])] })) { setDefectMode(undefined); setCreatedDefectId(undefined); setDefectId(undefined); }
  };
  const createDefect = async (values: Parameters<typeof productRepository.createWorkItem>[0]) => {
    if (!defectCase) return;
    setSaveError(''); setSaving(true);
    let savedDefectId = createdDefectId;
    try {
      const created = createdDefectId ? { id: createdDefectId } : await productRepository.createWorkItem({ ...values, requestId: defectRequestId.current });
      savedDefectId = String(created.id);
      setCreatedDefectId(savedDefectId);
      await persistCases(record.plan.cases.map((row) => row.testCaseId), record.plan.cases.map((row) => row.testCaseId === defectCase.testCaseId ? { ...row, defectIds: [...new Set([...(row.defectIds || []), String(created.id)])] } : row));
      await queryClient.invalidateQueries({ queryKey: ['product-bugs'] });
      setDefectMode(undefined); setCreatedDefectId(undefined);
    } catch (reason) { setSaveError(`${savedDefectId ? '缺陷已创建，关联未完成：' : ''}${reason instanceof Error ? reason.message : '创建或关联缺陷失败'}`); throw reason; }
    finally { setSaving(false); }
  };
  const currentIds = record.plan.cases.map((item) => item.testCaseId);
  const directories = useQuery({ queryKey: ['test-plan-case-directories', record.task.productLineId], queryFn: () => productRepository.testCaseDirectories(record.task.productLineId || ''), enabled: Boolean(record.task.productLineId), retry: false });
  const planCases = useQuery({ queryKey: ['test-plan-case-details', record.task.productLineId, record.plan.id, currentIds.join(',')], queryFn: () => productRepository.testCases(record.task.productLineId || '', { page: 1, pageSize: 500 }), enabled: Boolean(record.task.productLineId && currentIds.length), retry: false });
  const cases = useQuery({ queryKey: ['test-plan-cases', record.task.productLineId, addDirectoryId, keyword], queryFn: () => productRepository.testCases(record.task.productLineId || '', { directoryId: addDirectoryId, includeDescendants: Boolean(addDirectoryId), keyword, page: 1, pageSize: 100 }), enabled: addOpen && Boolean(record.task.productLineId), retry: false });
  const directoryOptions = useMemo(() => (directories.data || []).map((item) => ({ value: item.id, label: item.name })), [directories.data]);
  const availableCases = (cases.data?.items || []).filter((item) => !currentIds.includes(item.id));
  const saveCases = async () => {
    if (!selectedIds.length) return;
    setSaveError('');
    setSaving(true);
    try {
      await persistCases([...currentIds, ...selectedIds]);
      setSelectedIds([]);
      setAddDirectoryId(undefined);
      setAddOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['test-plan-list'] });
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message || '保存用例失败' : '保存用例失败');
    } finally { setSaving(false); }
  };
  const savedCases = useMemo<SavedCase[]>(() => record.plan.cases.map((item) => ({ ...(planCases.data?.items || []).find((candidate) => candidate.id === item.testCaseId), ...item })), [planCases.data?.items, record.plan.cases]);
  const savedDirectories = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; count: number }>();
    savedCases.forEach((item) => {
      const id = item.directoryId || 'uncategorized';
      const name = item.directoryName || '未分类';
      const current = groups.get(id);
      groups.set(id, { id, name, count: (current?.count || 0) + 1 });
    });
    return [...groups.values()];
  }, [savedCases]);
  const visibleSavedCases = savedCases.filter((item) => !savedDirectoryId || (item.directoryId || 'uncategorized') === savedDirectoryId);
  const caseColumns = [{ title: '标题', dataIndex: 'title', ellipsis: true }, { title: '编号', dataIndex: 'code', width: 120 }, { title: '负责人', dataIndex: 'ownerName', width: 140 }, { title: '优先级', dataIndex: 'priority', width: 90 }];
  const statusOptions = [{ value: 'NOT_EXECUTED', label: '待测试' }, { value: 'PASSED', label: '已通过' }, { value: 'FAILED', label: '未通过' }, { value: 'DEFERRED', label: '暂缓' }];
  const savedColumns = [...caseColumns, { title: '状态', width: 140, render: (_: unknown, item: SavedCase) => <Select aria-label={`${item.title}测试状态`} className={`test-plan-case-status is-${item.executionStatus || 'NOT_EXECUTED'}`} value={item.executionStatus || 'NOT_EXECUTED'} options={statusOptions} disabled={saving} onChange={(executionStatus: TestPlanCaseStatus) => void updateCase(item, { executionStatus })} /> }, { title: '缺陷', width: 160, render: (_: unknown, item: SavedCase) => <TestPlanCaseDefects item={item} productLineId={record.task.productLineId} saving={saving} onRemove={(id) => updateCase(item, { defectIds: (item.defectIds || []).filter((value) => value !== id) })} onAdd={(mode) => { setSaveError(''); setDefectCase(item); setDefectId(undefined); setDefectKeyword(''); setCreatedDefectId(undefined); defectRequestId.current = `plan-defect-${record.plan.id}-${item.testCaseId}-${crypto.randomUUID()}`; setDefectMode(mode); }} /> }];
  return <div className="test-plan-detail-page">
    <div className="test-plan-detail-breadcrumb"><Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button><i /><span>测试计划</span><i /><strong>{record.plan.name || '未命名计划'}</strong><Button aria-label="添加用例" className="test-plan-add-case-button" type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加用例</Button></div>
    {saveError && <Alert type="error" showIcon title={saveError} closable onClose={() => setSaveError('')} />}
    <div className="test-plan-detail-layout">
      <main className="test-plan-detail-content">{record.plan.cases.length ? <div className="test-plan-case-browser"><aside className="test-plan-case-directories"><button type="button" className={!savedDirectoryId ? 'is-active' : ''} onClick={() => setSavedDirectoryId(undefined)}>全部用例 <span>{savedCases.length}</span></button>{savedDirectories.map((directory) => <button type="button" key={directory.id} className={savedDirectoryId === directory.id ? 'is-active' : ''} onClick={() => setSavedDirectoryId(directory.id)}>{directory.name} <span>{directory.count}</span></button>)}</aside><section className="test-plan-case-list"><Table rowKey="testCaseId" size="small" pagination={false} loading={planCases.isLoading} dataSource={visibleSavedCases} columns={savedColumns} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前目录暂无用例" /> }} /></section></div> : <div className="test-plan-detail-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容" /></div>}</main>
    </div>
    <Modal title="添加用例" open={addOpen} onCancel={() => { setAddOpen(false); setSelectedIds([]); }} onOk={() => void saveCases()} okText="添加" cancelText="取消" confirmLoading={saving} width="min(1100px, calc(100vw - 32px))" destroyOnHidden>
      <div className="test-plan-add-cases"><aside><Select showSearch allowClear value={addDirectoryId} onChange={setAddDirectoryId} optionFilterProp="label" placeholder="搜索并选择功能目录" options={directoryOptions} className="w-full" /><div className="mt-3 text-xs text-[var(--text-muted)]">当前目录</div></aside><section>{saveError && <Alert className="mb-3" type="error" showIcon closable onClose={() => setSaveError('')} title="保存失败" description={saveError} />}<Input.Search allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题或编号" className="mb-3" />{cases.isError ? <Alert type="error" showIcon title="用例加载失败" action={<Button size="small" onClick={() => void cases.refetch()}>重试</Button>} /> : <Spin spinning={cases.isLoading}><Table rowKey="id" size="small" pagination={false} dataSource={availableCases} rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)), getCheckboxProps: (item: TestCase) => ({ disabled: currentIds.includes(item.id) }) }} columns={caseColumns as any} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前目录暂无可添加用例" /> }} /></Spin>}</section></div>
    </Modal>
    <Modal title="关联缺陷" open={defectMode === 'link'} onCancel={closeDefect} onOk={() => defectId && void linkDefect(defectId)} okText="确定" cancelText="取消" confirmLoading={saving} okButtonProps={{ disabled: !defectId || defects.isFetching || defects.isError }} destroyOnHidden>
      {saveError && <Alert type="error" title={saveError} showIcon />}
      {defects.isError && <Alert type="error" title="缺陷加载失败" action={<Button onClick={() => void defects.refetch()}>重试</Button>} />}
      <Select className="w-full" aria-label="搜索关联缺陷" showSearch allowClear filterOption={false} placeholder="请输入工作项ID或标题进行搜索" onSearch={setDefectKeyword} value={defectId} onChange={setDefectId} loading={defects.isFetching} options={(defects.data?.page.items || []).filter((item) => !defectCase?.defectIds?.includes(item.id)).map((item) => ({ value: item.id, label: `${item.code} · ${item.title}` }))} />
    </Modal>
    {defectMode === 'create' && <RequirementTasksView itemLabel="缺陷管理" taskKind="bug" productLineFilter={record.task.productLineId} creationContext={{ productLineId: record.task.productLineId, versionId: record.task.versionId || undefined, assigneeId: defectCase?.ownerId || undefined, assigneeName: defectCase?.ownerName, title: defectCase?.title, onClose: closeDefect, onSubmit: createDefect }} />}
  </div>;
};
