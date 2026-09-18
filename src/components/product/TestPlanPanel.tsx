import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal, Radio, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import type { CreateTestExecutionInput, TestCase, TestExecution, TestExecutionScope, TestPlanCase } from '../../types/testManagement';
import { TestCaseEditorDrawer } from './TestCaseEditorDrawer';

type TestPlanPanelProps = {
  workItemId: string;
  productLineId: string;
  sourceRequirementId?: string;
  onExecutionCreated?: (execution: TestExecution) => void;
};

export const TestPlanPanel: React.FC<TestPlanPanelProps> = ({ workItemId, productLineId, sourceRequirementId, onExecutionCreated }) => {
  const plan = useQuery({ queryKey: ['test-plan', workItemId], queryFn: () => productRepository.testPlan(workItemId), retry: false });
  const directories = useQuery({ queryKey: ['test-case-directories', productLineId], queryFn: () => productRepository.testCaseDirectories(productLineId), retry: false });
  const availableCases = useQuery({ queryKey: ['test-case-picker', productLineId], queryFn: () => productRepository.testCases(productLineId, { enabled: true, page: 1, pageSize: 100 }), enabled: false, retry: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [environment, setEnvironment] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [roundOpen, setRoundOpen] = useState(false);
  const [roundForm] = Form.useForm<CreateTestExecutionInput>();

  useEffect(() => {
    if (!plan.data) return;
    setSelectedIds(plan.data.cases.map((item) => item.testCaseId));
    setEnvironment(plan.data.environment || '');
  }, [plan.data]);

  const openPicker = () => { setPickerOpen(true); void availableCases.refetch(); };
  const savePlan = async (ids = selectedIds) => {
    if (!plan.data) return;
    setSaving(true); setError('');
    try { await productRepository.saveTestPlan(workItemId, { testCaseIds: ids, environment, revision: plan.data.revision }); await plan.refetch(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '保存测试计划失败'); }
    finally { setSaving(false); }
  };
  const createRound = async () => {
    try {
      const values = await roundForm.validateFields();
      setSaving(true); setError('');
      const created = await productRepository.createTestExecution(workItemId, { ...values, requestId: crypto.randomUUID(), testCaseIds: values.scopeType === 'CUSTOM' ? selectedIds : [] });
      setRoundOpen(false); onExecutionCreated?.(created);
    } catch (reason) { if (reason instanceof Error) setError(reason.message || '创建执行轮次失败'); }
    finally { setSaving(false); }
  };

  if (plan.isLoading) return <div className="test-task-loading">正在加载测试计划...</div>;
  if (plan.isError) return <Alert type="error" showIcon title="测试计划加载失败" action={<Button onClick={() => plan.refetch()}>重试</Button>} />;
  if (!plan.data?.executable) return <Alert type="info" showIcon title="当前子任务不执行测试轮次" description="用例编写任务仅维护关联用例。" />;

  return <div className="test-plan-panel">
    {error && <Alert closable onClose={() => setError('')} type="error" showIcon title="操作失败" description={error} />}
    <div className="test-task-section-heading"><div><h3>测试计划</h3><span>已选择 {plan.data.cases.length} 条用例</span></div><Space><Button onClick={openPicker}>选择用例</Button><Button icon={<PlusOutlined />} onClick={() => setEditorOpen(true)}>新建用例</Button><Button type="primary" disabled={!plan.data.cases.length} onClick={() => { roundForm.setFieldsValue({ scopeType: 'ALL', name: `第 ${(plan.data?.revision || 0) + 1} 轮测试`, environment, testCaseIds: [] }); setRoundOpen(true); }}>开始执行</Button></Space></div>
    <label className="test-plan-environment"><span>默认测试环境</span><Input value={environment} onChange={(event) => setEnvironment(event.target.value)} onBlur={() => void savePlan()} maxLength={255} placeholder="例如：测试环境" /></label>
    <Table<TestPlanCase> size="small" rowKey="testCaseId" dataSource={plan.data.cases} pagination={false} locale={{ emptyText: '尚未选择测试用例' }} columns={[
      { title: '编号', dataIndex: 'code', width: 120, render: (value) => <span className="test-case-code">{value}</span> },
      { title: '用例标题', dataIndex: 'title', ellipsis: true },
      { title: '优先级', dataIndex: 'priority', width: 80, render: (value) => <Tag>{value}</Tag> },
      { title: '负责人', dataIndex: 'ownerName', width: 120, ellipsis: true },
      { title: '最近结果', dataIndex: 'latestResult', width: 100, render: (value) => value || '无记录' },
    ]} />
    <Modal title="选择测试用例" open={pickerOpen} onCancel={() => setPickerOpen(false)} onOk={async () => { await savePlan(); setPickerOpen(false); }} confirmLoading={saving} width="min(920px, 94vw)">
      {availableCases.isError ? <Alert type="error" showIcon title="可用用例加载失败" action={<Button onClick={() => availableCases.refetch()}>重试</Button>} /> : <Table<TestCase> size="small" loading={availableCases.isFetching} rowKey="id" dataSource={availableCases.data?.items || []} rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)) }} pagination={false} scroll={{ y: 420 }} columns={[{ title: '编号', dataIndex: 'code', width: 120 }, { title: '标题', dataIndex: 'title', ellipsis: true }, { title: '优先级', dataIndex: 'priority', width: 80 }, { title: '负责人', dataIndex: 'ownerName', width: 120 }]} />}
    </Modal>
    <Modal title="新建测试执行" open={roundOpen} onCancel={() => setRoundOpen(false)} onOk={() => void createRound()} confirmLoading={saving}><Form form={roundForm} layout="vertical"><Form.Item name="scopeType" label="执行范围" rules={[{ required: true }]}><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: '全部用例', value: 'ALL' }, { label: '失败用例回归', value: 'FAILED_ONLY' }, { label: '自定义范围', value: 'CUSTOM' }]} /></Form.Item><Form.Item name="name" label="轮次名称" rules={[{ required: true, whitespace: true }]}><Input maxLength={120} /></Form.Item><Form.Item name="environment" label="测试环境"><Input maxLength={255} /></Form.Item><Form.Item name="buildVersion" label="构建版本"><Input maxLength={120} /></Form.Item></Form></Modal>
    <TestCaseEditorDrawer open={editorOpen} productLineId={productLineId} directories={directories.data || []} sourceRequirementId={sourceRequirementId} onClose={() => setEditorOpen(false)} onSaved={(created) => { setEditorOpen(false); const ids = [...selectedIds, created.id]; setSelectedIds(ids); void savePlan(ids); }} />
  </div>;
};
