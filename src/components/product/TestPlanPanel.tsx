import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Form, Input, Modal, Progress, Radio, Select, Space, Table, Tag, Tooltip } from 'antd';
import { DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import type { DefectBug, RequirementTask } from '../../types';
import type { CreateTestExecutionInput, TestCase, TestExecution, TestExecutionCase, TestPlanCase, TestResultStatus } from '../../types/testManagement';
import { TestCaseEditorDrawer } from './TestCaseEditorDrawer';

type TestPlanPanelProps = {
  task: RequirementTask;
  workItemId: string;
  productLineId: string;
  sourceRequirementId?: string;
  onExecutionCreated?: (execution: TestExecution) => void;
};

export const TestPlanPanel: React.FC<TestPlanPanelProps> = ({ task, workItemId, productLineId, sourceRequirementId, onExecutionCreated }) => {
  const plan = useQuery({ queryKey: ['test-plan', workItemId], queryFn: () => productRepository.testPlan(workItemId), retry: false });
  const rounds = useQuery({ queryKey: ['test-executions', workItemId], queryFn: () => productRepository.testExecutions(workItemId), retry: false });
  const activeRound = rounds.data?.find((item) => item.status === 'IN_PROGRESS');
  const activeExecution = useQuery({ queryKey: ['test-execution', activeRound?.id], queryFn: () => productRepository.testExecutionDetail(activeRound!.id), enabled: !!activeRound, retry: false });
  const directories = useQuery({ queryKey: ['test-case-directories', productLineId], queryFn: () => productRepository.testCaseDirectories(productLineId), retry: false });
  const availableCases = useQuery({ queryKey: ['test-case-picker', productLineId], queryFn: () => productRepository.testCases(productLineId, { enabled: true, page: 1, pageSize: 100 }), enabled: false, retry: false });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [environment, setEnvironment] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [roundOpen, setRoundOpen] = useState(false);
  const [resultCase, setResultCase] = useState<TestExecutionCase | null>(null);
  const [failedReason, setFailedReason] = useState('');
  const [defectCase, setDefectCase] = useState<TestExecutionCase | null>(null);
  const [defectForm] = Form.useForm<Partial<DefectBug>>();
  const [roundForm] = Form.useForm<CreateTestExecutionInput>();

  useEffect(() => {
    if (!plan.data) return;
    setSelectedIds(plan.data.cases.map((item) => item.testCaseId));
    setEnvironment(plan.data.environment || '');
  }, [plan.data]);

  const currentCases = useMemo(() => new Map((activeExecution.data?.cases || []).map((item) => [item.testCaseId, item])), [activeExecution.data]);
  const latestRound = rounds.data?.[0];
  const passRate = latestRound?.total ? Math.round((latestRound.passed / latestRound.total) * 100) : 0;
  const openPicker = () => { setPickerOpen(true); void availableCases.refetch(); };

  const savePlan = async (ids = selectedIds, nextEnvironment = environment) => {
    if (!plan.data) return;
    setSaving(true); setError('');
    try { await productRepository.saveTestPlan(workItemId, { testCaseIds: ids, environment: nextEnvironment, revision: plan.data.revision }); await plan.refetch(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '保存测试计划失败'); }
    finally { setSaving(false); }
  };

  const createPlan = async () => {
    await savePlan([], environment);
    setCreateOpen(false);
    setExpanded(true);
  };

  const createRound = async () => {
    try {
      const values = await roundForm.validateFields();
      setSaving(true); setError('');
      const created = await productRepository.createTestExecution(workItemId, { ...values, requestId: crypto.randomUUID(), testCaseIds: values.scopeType === 'CUSTOM' ? selectedIds : [] });
      setRoundOpen(false); await rounds.refetch(); onExecutionCreated?.(created);
    } catch (reason) { if (reason instanceof Error) setError(reason.message || '创建执行轮次失败'); }
    finally { setSaving(false); }
  };

  const saveCaseResult = async (testCase: TestExecutionCase, result: Exclude<TestResultStatus, 'NOT_EXECUTED'>, actualResult?: string) => {
    setSaving(true); setError('');
    try {
      const updated = await productRepository.saveTestResult(testCase.id, { result, actualResult, evidence: testCase.evidence || [], revision: testCase.revision });
      await activeExecution.refetch(); await rounds.refetch(); onExecutionCreated?.(updated);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '保存执行结果失败'); }
    finally { setSaving(false); }
  };

  const changeResult = (testCaseId: string, value: Exclude<TestResultStatus, 'NOT_EXECUTED'>) => {
    const current = currentCases.get(testCaseId);
    if (!current) { setError('请先点击“开始执行”创建执行轮次'); return; }
    if (value === 'FAILED') { setResultCase(current); setFailedReason(current.actualResult || ''); return; }
    void saveCaseResult(current, 'PASSED');
  };

  const createDefect = async () => {
    if (!defectCase) return;
    try {
      const values = await defectForm.validateFields();
      setSaving(true); setError('');
      const created = await productRepository.createTask('bug', { ...values, productLineId, productLineName: task.productLineName, versionName: task.versionName, requirementId: task.requirementId, linkedTaskId: workItemId, status: '待修复', createdAt: new Date().toISOString() });
      await productRepository.linkTestResultDefect(defectCase.id, created.id, defectCase.revision);
      setDefectCase(null); defectForm.resetFields(); await activeExecution.refetch(); await rounds.refetch();
    } catch (reason) { if (reason instanceof Error) setError(reason.message || '创建缺陷失败'); }
    finally { setSaving(false); }
  };

  if (plan.isLoading) return <div className="test-task-loading">正在加载测试计划...</div>;
  if (plan.isError) return <Alert type="error" showIcon title="测试计划加载失败" action={<Button onClick={() => plan.refetch()}>重试</Button>} />;
  if (!plan.data?.executable) return <Alert type="info" showIcon title="当前测试类型不支持执行" />;

  if (!plan.data.id) return <div className="test-plan-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未创建测试计划"><Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建测试计划</Button></Empty><Modal title="创建测试计划" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => void createPlan()} confirmLoading={saving}><label className="test-plan-environment"><span>计划名称</span><Input value={`${task.title}测试计划`} disabled /></label><label className="test-plan-environment"><span>测试环境</span><Input value={environment} onChange={(event) => setEnvironment(event.target.value)} placeholder="例如：测试环境" maxLength={255} /></label></Modal></div>;

  return <div className="test-plan-panel">
    {error && <Alert closable onClose={() => setError('')} type="error" showIcon title="操作失败" description={error} />}
    <div className="test-plan-summary" role="button" tabIndex={0} onClick={() => setExpanded((value) => !value)} onKeyDown={(event) => event.key === 'Enter' && setExpanded((value) => !value)}>
      <span className="test-plan-expand">{expanded ? <DownOutlined /> : <RightOutlined />}</span>
      <strong>{task.title}测试计划</strong><span>{task.ownerName || '未设置'}</span><span>{task.plannedStartDate || '未设置'} 至 {task.dueDate || '未设置'}</span><Tag color={activeRound ? 'processing' : latestRound ? 'success' : 'default'}>{activeRound ? `进行中 (${activeRound.passed + activeRound.failed}/${activeRound.total})` : latestRound ? '已执行' : '未开始'}</Tag><div className="test-plan-rate"><Progress percent={passRate} showInfo={false} size="small" /><span>{passRate}%</span></div><span>{plan.data.cases.length} 条用例</span>
    </div>
    {expanded && <div className="test-plan-expanded">
      <div className="test-task-section-heading"><div><h3>引用的测试用例</h3><span>共 {plan.data.cases.length} 条</span></div><Space><Button onClick={openPicker}>引用用例</Button><Button icon={<PlusOutlined />} onClick={() => setEditorOpen(true)}>新建用例</Button><Button type="primary" disabled={!plan.data.cases.length || !!activeRound} onClick={() => { roundForm.setFieldsValue({ scopeType: 'ALL', name: `第 ${(rounds.data?.length || 0) + 1} 轮测试`, environment, buildVersion: task.versionName, testCaseIds: [] }); setRoundOpen(true); }}>{activeRound ? '执行中' : '开始执行'}</Button></Space></div>
      <Table<TestPlanCase> size="small" rowKey="testCaseId" dataSource={plan.data.cases} pagination={false} locale={{ emptyText: '尚未引用测试用例' }} columns={[
        { title: '编号', dataIndex: 'code', width: 116, render: (value) => <span className="test-case-code">{value}</span> },
        { title: '标题', dataIndex: 'title', ellipsis: true },
        { title: '优先级', dataIndex: 'priority', width: 88, render: (value) => <Tag>{value}</Tag> },
        { title: '执行人', dataIndex: 'ownerName', width: 120, ellipsis: true },
        { title: '状态', width: 128, render: (_value, item) => { const current = currentCases.get(item.testCaseId); return <Select className="test-plan-result-select" value={current?.result || item.latestResult || 'NOT_EXECUTED'} loading={saving} onChange={(value) => changeResult(item.testCaseId, value)} options={[{ value: 'NOT_EXECUTED', label: '未执行', disabled: true }, { value: 'PASSED', label: '已通过' }, { value: 'FAILED', label: '未通过' }]} />; } },
        { title: '缺陷', width: 76, align: 'center', render: (_value, item) => { const current = currentCases.get(item.testCaseId); const disabled = current?.result !== 'FAILED'; return <Tooltip title={disabled ? '用例标记为未通过后可创建缺陷' : '将该问题转为缺陷'}><Button type="text" aria-label={`为${item.title}创建缺陷`} disabled={disabled} icon={<PlusOutlined />} onClick={() => { setDefectCase(current || null); defectForm.setFieldsValue({ title: `${item.title}执行失败`, description: current?.actualResult || '', priority: '高', severity: '严重缺陷', assignee: task.ownerName }); }} /></Tooltip>; } },
      ]} />
      <label className="test-plan-environment"><span>默认测试环境</span><Input value={environment} onChange={(event) => setEnvironment(event.target.value)} onBlur={() => void savePlan()} maxLength={255} placeholder="例如：测试环境" /></label>
    </div>}
    <Modal title="引用测试用例" open={pickerOpen} onCancel={() => setPickerOpen(false)} onOk={async () => { await savePlan(); setPickerOpen(false); }} confirmLoading={saving} width="min(920px, 94vw)">{availableCases.isError ? <Alert type="error" showIcon title="可用用例加载失败" action={<Button onClick={() => availableCases.refetch()}>重试</Button>} /> : <Table<TestCase> size="small" loading={availableCases.isFetching} rowKey="id" dataSource={availableCases.data?.items || []} rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)) }} pagination={false} scroll={{ y: 420 }} columns={[{ title: '编号', dataIndex: 'code', width: 120 }, { title: '标题', dataIndex: 'title', ellipsis: true }, { title: '优先级', dataIndex: 'priority', width: 80 }, { title: '负责人', dataIndex: 'ownerName', width: 120 }]} />}</Modal>
    <Modal title="新建测试执行" open={roundOpen} onCancel={() => setRoundOpen(false)} onOk={() => void createRound()} confirmLoading={saving}><Form form={roundForm} layout="vertical"><Form.Item name="scopeType" label="执行范围" rules={[{ required: true }]}><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: '全部用例', value: 'ALL' }, { label: '失败用例回归', value: 'FAILED_ONLY' }, { label: '自定义范围', value: 'CUSTOM' }]} /></Form.Item><Form.Item name="name" label="轮次名称" rules={[{ required: true, whitespace: true }]}><Input maxLength={120} /></Form.Item><Form.Item name="environment" label="测试环境"><Input maxLength={255} /></Form.Item><Form.Item name="buildVersion" label="构建版本"><Input maxLength={120} /></Form.Item></Form></Modal>
    <Modal title="记录失败结果" open={!!resultCase} onCancel={() => setResultCase(null)} onOk={async () => { if (!resultCase || !failedReason.trim()) { setError('请填写实际结果和失败现象'); return; } await saveCaseResult(resultCase, 'FAILED', failedReason.trim()); setResultCase(null); }} confirmLoading={saving}><Input.TextArea rows={5} value={failedReason} onChange={(event) => setFailedReason(event.target.value)} placeholder="填写实际结果和失败现象" /></Modal>
    <Modal title="转为缺陷" open={!!defectCase} onCancel={() => setDefectCase(null)} onOk={() => void createDefect()} confirmLoading={saving}><Form form={defectForm} layout="vertical"><Form.Item name="title" label="缺陷标题" rules={[{ required: true, whitespace: true }]}><Input maxLength={255} /></Form.Item><Form.Item name="description" label="缺陷描述"><Input.TextArea rows={4} /></Form.Item><Form.Item name="severity" label="严重程度" rules={[{ required: true }]}><Select options={['致命阻断', '严重缺陷', '一般问题', '轻微优化'].map((value) => ({ value, label: value }))} /></Form.Item><Form.Item name="priority" label="优先级" rules={[{ required: true }]}><Select options={['紧急', '高', '中', '低'].map((value) => ({ value, label: value }))} /></Form.Item><Form.Item name="assignee" label="负责人"><Input /></Form.Item></Form></Modal>
    <TestCaseEditorDrawer open={editorOpen} productLineId={productLineId} directories={directories.data || []} sourceRequirementId={sourceRequirementId} onClose={() => setEditorOpen(false)} onSaved={(created, continueCreating) => { if (!continueCreating) setEditorOpen(false); const ids = Array.from(new Set([...selectedIds, created.id])); setSelectedIds(ids); void savePlan(ids); }} />
  </div>;
};
