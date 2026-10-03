import React, { useMemo, useState } from 'react';
import { Alert, Button, Empty, Input, Modal, Select, Spin, Table } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productRepository, type UnifiedWorkItem } from '../../services/productRepository';
import type { TestCase, TestPlan, TestPlanCase } from '../../types/testManagement';

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
      const saved = await productRepository.saveTestPlan(record.task.id, record.plan.id || '', { testCaseIds: [...currentIds, ...selectedIds], name: record.plan.name || '', environment: record.plan.environment, startDate: record.plan.startDate, endDate: record.plan.endDate, workItemId: record.plan.workItemId, productLineId: record.task.productLineId, versionId: record.task.versionId, ownerId: record.plan.ownerId || undefined, ownerName: record.plan.ownerName || undefined, revision: record.plan.revision });
      Object.assign(record.plan, saved);
      setSelectedIds([]);
      setAddDirectoryId(undefined);
      setAddOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['test-plan-list'] });
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message || '保存用例失败' : '保存用例失败');
    } finally { setSaving(false); }
  };
  const savedCases = useMemo<SavedCase[]>(() => record.plan.cases.map((item) => ({ ...item, ...(planCases.data?.items || []).find((candidate) => candidate.id === item.testCaseId) })), [planCases.data?.items, record.plan.cases]);
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
  return <div className="test-plan-detail-page">
    <div className="test-plan-detail-breadcrumb"><Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button><i /><span>测试计划</span><i /><strong>{record.plan.name || '未命名计划'}</strong><Button aria-label="添加用例" className="test-plan-add-case-button" type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>添加用例</Button></div>
    <div className="test-plan-detail-layout">
      <main className="test-plan-detail-content">{record.plan.cases.length ? <div className="test-plan-case-browser"><aside className="test-plan-case-directories"><button type="button" className={!savedDirectoryId ? 'is-active' : ''} onClick={() => setSavedDirectoryId(undefined)}>全部用例 <span>{savedCases.length}</span></button>{savedDirectories.map((directory) => <button type="button" key={directory.id} className={savedDirectoryId === directory.id ? 'is-active' : ''} onClick={() => setSavedDirectoryId(directory.id)}>{directory.name} <span>{directory.count}</span></button>)}</aside><section className="test-plan-case-list"><Table rowKey="testCaseId" size="small" pagination={false} loading={planCases.isLoading} dataSource={visibleSavedCases} columns={caseColumns as any} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前目录暂无用例" /> }} /></section></div> : <div className="test-plan-detail-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无内容" /></div>}</main>
    </div>
    <Modal title="添加用例" open={addOpen} onCancel={() => { setAddOpen(false); setSelectedIds([]); }} onOk={() => void saveCases()} okText="添加" cancelText="取消" confirmLoading={saving} width="min(1100px, calc(100vw - 32px))" destroyOnHidden>
      <div className="test-plan-add-cases"><aside><Select showSearch allowClear value={addDirectoryId} onChange={setAddDirectoryId} optionFilterProp="label" placeholder="搜索并选择功能目录" options={directoryOptions} className="w-full" /><div className="mt-3 text-xs text-[var(--text-muted)]">当前目录</div></aside><section>{saveError && <Alert className="mb-3" type="error" showIcon closable onClose={() => setSaveError('')} title="保存失败" description={saveError} />}<Input.Search allowClear value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索标题或编号" className="mb-3" />{cases.isError ? <Alert type="error" showIcon title="用例加载失败" action={<Button size="small" onClick={() => void cases.refetch()}>重试</Button>} /> : <Spin spinning={cases.isLoading}><Table rowKey="id" size="small" pagination={false} dataSource={availableCases} rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)), getCheckboxProps: (item: TestCase) => ({ disabled: currentIds.includes(item.id) }) }} columns={caseColumns as any} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前目录暂无可添加用例" /> }} /></Spin>}</section></div>
    </Modal>
  </div>;
};
