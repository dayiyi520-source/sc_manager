import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Dropdown, Empty, Form, Input, Modal, Progress, Radio, Select, Space, Table, Tag, Tooltip } from 'antd';
import { DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type { Dayjs } from 'dayjs';
import { productRepository } from '../../services/productRepository';
import type { RequirementTask } from '../../types';
import type { CreateTestExecutionInput, TestCase, TestExecution, TestExecutionCase, TestPlan, TestPlanCase, TestResultStatus } from '../../types/testManagement';
import { DefectCreatePanel, type DefectCreateValues } from './DefectCreatePanel';
import { TestCaseEditorDrawer } from './TestCaseEditorDrawer';

type TestPlanPanelProps = { task: RequirementTask; workItemId: string; productLineId: string; sourceRequirementId?: string; employeeNames: string[]; onExecutionCreated?: (execution: TestExecution) => void };
type PlanFormValues = { name: string; environment?: string; dateRange?: [Dayjs, Dayjs] };

export const TestPlanPanel: React.FC<TestPlanPanelProps> = ({ task, workItemId, productLineId, sourceRequirementId, employeeNames, onExecutionCreated }) => {
  const plans = useQuery({ queryKey: ['test-plans', workItemId], queryFn: () => productRepository.testPlans(workItemId), retry: false });
  const rounds = useQuery({ queryKey: ['test-executions', workItemId], queryFn: () => productRepository.testExecutions(workItemId), retry: false });
  const directories = useQuery({ queryKey: ['test-case-directories', productLineId], queryFn: () => productRepository.testCaseDirectories(productLineId), retry: false });
  const availableCases = useQuery({ queryKey: ['test-case-picker', productLineId], queryFn: () => productRepository.testCases(productLineId, { enabled: true, page: 1, pageSize: 100 }), enabled: false, retry: false });
  const [expandedPlanId, setExpandedPlanId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [pickerPlan, setPickerPlan] = useState<TestPlan | null>(null);
  const [editorPlan, setEditorPlan] = useState<TestPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [roundOpen, setRoundOpen] = useState(false);
  const [roundPlan, setRoundPlan] = useState<TestPlan | null>(null);
  const [resultCase, setResultCase] = useState<TestExecutionCase | null>(null);
  const [failedReason, setFailedReason] = useState('');
  const [defectCase, setDefectCase] = useState<TestExecutionCase | null>(null);
  const [defectActionOpen, setDefectActionOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [defectQuery, setDefectQuery] = useState('');
  const [defectId, setDefectId] = useState('');
  const [planForm] = Form.useForm<PlanFormValues>();
  const [roundForm] = Form.useForm<CreateTestExecutionInput>();

  useEffect(() => { if (!expandedPlanId && plans.data?.[0]?.id) setExpandedPlanId(plans.data[0].id); }, [expandedPlanId, plans.data]);
  const activeRound = rounds.data?.find((item) => item.testPlanId === expandedPlanId && item.status === 'IN_PROGRESS');
  const activeExecution = useQuery({ queryKey: ['test-execution', activeRound?.id], queryFn: () => productRepository.testExecutionDetail(activeRound!.id), enabled: !!activeRound, retry: false });
  const defectOptions = useQuery({ queryKey: ['test-defect-search', productLineId, defectQuery], queryFn: () => productRepository.workItems(productLineId, 'bug', defectQuery), enabled: referenceOpen, retry: false });
  const currentCases = useMemo(() => new Map((activeExecution.data?.cases || []).map((item) => [item.testCaseId, item])), [activeExecution.data]);

  const openCreatePlan = () => { planForm.setFieldsValue({ name: `${task.title}测试计划`, environment: '' }); setCreateOpen(true); };
  const createPlan = async () => {
    try {
      const values = await planForm.validateFields(); setSaving(true); setError('');
      const created = await productRepository.createTestPlan(workItemId, { testCaseIds: [], name: values.name.trim(), environment: values.environment?.trim(), startDate: values.dateRange?.[0].format('YYYY-MM-DD'), endDate: values.dateRange?.[1].format('YYYY-MM-DD'), revision: 0 });
      setCreateOpen(false); planForm.resetFields(); setExpandedPlanId(created.id || ''); await plans.refetch();
    } catch (reason) { if (reason instanceof Error) setError(reason.message || '创建测试计划失败'); }
    finally { setSaving(false); }
  };
  const savePlan = async (plan: TestPlan, ids: string[]) => {
    if (!plan.id) return; setSaving(true); setError('');
    try { await productRepository.saveTestPlan(workItemId, plan.id, { testCaseIds: ids, name: plan.name || `${task.title}测试计划`, environment: plan.environment, startDate: plan.startDate, endDate: plan.endDate, revision: plan.revision }); await plans.refetch(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '保存测试计划失败'); }
    finally { setSaving(false); }
  };
  const openPicker = (plan: TestPlan) => { setPickerPlan(plan); setSelectedIds(plan.cases.map((item) => item.testCaseId)); void availableCases.refetch(); };
  const createRound = async () => {
    if (!roundPlan?.id) return;
    try {
      const values = await roundForm.validateFields(); setSaving(true); setError('');
      const created = await productRepository.createTestExecution(workItemId, { ...values, planId: roundPlan.id, requestId: crypto.randomUUID(), testCaseIds: values.scopeType === 'CUSTOM' ? selectedIds : [] });
      setRoundOpen(false); setExpandedPlanId(roundPlan.id); await rounds.refetch(); onExecutionCreated?.(created);
    } catch (reason) { if (reason instanceof Error) setError(reason.message || '创建人工执行轮次失败'); }
    finally { setSaving(false); }
  };
  const saveCaseResult = async (testCase: TestExecutionCase, result: Exclude<TestResultStatus, 'NOT_EXECUTED'>, actualResult?: string) => {
    setSaving(true); setError('');
    try { const updated = await productRepository.saveTestResult(testCase.id, { result, actualResult, evidence: testCase.evidence || [], revision: testCase.revision }); await activeExecution.refetch(); await rounds.refetch(); onExecutionCreated?.(updated); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '保存人工执行结果失败'); }
    finally { setSaving(false); }
  };
  const changeResult = (testCaseId: string, value: Exclude<TestResultStatus, 'NOT_EXECUTED'>) => {
    const current = currentCases.get(testCaseId); if (!current) { setError('请先点击“开始手工执行”创建执行轮次'); return; }
    if (value === 'FAILED') { setResultCase(current); setFailedReason(current.actualResult || ''); return; } void saveCaseResult(current, 'PASSED');
  };
  const linkDefect = async (createdId?: string) => {
    if (!defectCase || !(createdId || defectId)) return; setSaving(true); setError('');
    try { await productRepository.linkTestResultDefect(defectCase.id, createdId || defectId, defectCase.revision); setReferenceOpen(false); setDefectId(''); setDefectCase(null); await activeExecution.refetch(); await rounds.refetch(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '关联缺陷失败'); }
    finally { setSaving(false); }
  };
  const createDefect = async (values: DefectCreateValues) => {
    if (!defectCase) return; setSaving(true); setError('');
    try { const created = await productRepository.createTask('bug', { ...values, productLineId, productLineName: task.productLineName, versionName: task.versionName, requirementId: task.requirementId, linkedTaskId: workItemId, status: '待修复', createdAt: new Date().toISOString() }); setDefectActionOpen(false); await linkDefect(created.id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '创建缺陷失败'); setSaving(false); }
  };

  if (plans.isLoading) return <div className="test-task-loading">正在加载测试计划...</div>;
  if (plans.isError) return <Alert type="error" showIcon title="测试计划加载失败" action={<Button onClick={() => plans.refetch()}>重试</Button>} />;

  return <div className="test-plan-panel">
    {error && <Alert closable onClose={() => setError('')} type="error" showIcon title="操作失败" description={error} />}
    <div className="test-task-section-heading"><div><h3>测试计划</h3><span>共 {plans.data?.length || 0} 条，执行结果由测试人员逐条填写</span></div><Button type="primary" icon={<PlusOutlined />} onClick={openCreatePlan}>新建测试计划</Button></div>
    {!plans.data?.length ? <div className="test-plan-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未创建测试计划"><Button type="primary" icon={<PlusOutlined />} onClick={openCreatePlan}>新建测试计划</Button></Empty></div> : plans.data.map((plan) => {
      const expanded = expandedPlanId === plan.id; const planRounds = (rounds.data || []).filter((item) => item.testPlanId === plan.id); const inProgress = planRounds.find((item) => item.status === 'IN_PROGRESS'); const latest = planRounds[0]; const passRate = latest?.total ? Math.round((latest.passed / latest.total) * 100) : 0;
      return <section className="test-plan-item" key={plan.id}>
        <div className="test-plan-summary" role="button" tabIndex={0} onClick={() => setExpandedPlanId(expanded ? '' : plan.id || '')} onKeyDown={(event) => event.key === 'Enter' && setExpandedPlanId(expanded ? '' : plan.id || '')}>
          <span className="test-plan-expand">{expanded ? <DownOutlined /> : <RightOutlined />}</span><strong>{plan.name}</strong><span>{task.ownerName || '未设置'}</span><span>{plan.startDate || '未设置'} 至 {plan.endDate || '未设置'}</span><Tag color={inProgress ? 'processing' : latest ? 'success' : 'default'}>{inProgress ? `手工执行中 (${inProgress.passed + inProgress.failed}/${inProgress.total})` : latest ? '已执行' : '未开始'}</Tag><div className="test-plan-rate"><Progress percent={passRate} showInfo={false} size="small" /><span>{passRate}%</span></div><span>{plan.cases.length} 条用例</span>
        </div>
        {expanded && <div className="test-plan-expanded">
          <div className="test-task-section-heading"><div><h3>引用的测试用例</h3><span>共 {plan.cases.length} 条 · 环境：{plan.environment || '未填写'}</span></div><Space wrap><Button onClick={() => openPicker(plan)}>引用用例</Button><Button icon={<PlusOutlined />} onClick={() => setEditorPlan(plan)}>新建用例</Button><Button type="primary" disabled={!plan.cases.length || !!inProgress} onClick={() => { setRoundPlan(plan); setSelectedIds(plan.cases.map((item) => item.testCaseId)); roundForm.setFieldsValue({ planId: plan.id || '', scopeType: 'ALL', name: `第 ${planRounds.length + 1} 轮测试`, environment: plan.environment, buildVersion: task.versionName, testCaseIds: [], requestId: '' }); setRoundOpen(true); }}>{inProgress ? '手工执行中' : '开始手工执行'}</Button></Space></div>
          <Table<TestPlanCase> size="small" rowKey="testCaseId" dataSource={plan.cases} pagination={false} locale={{ emptyText: '尚未引用测试用例' }} columns={[
            { title: '编号', dataIndex: 'code', width: 116, render: (value) => <span className="test-case-code">{value}</span> }, { title: '标题', dataIndex: 'title', ellipsis: true }, { title: '优先级', dataIndex: 'priority', width: 88, render: (value) => <Tag>{value}</Tag> }, { title: '执行人', dataIndex: 'ownerName', width: 120, ellipsis: true },
            { title: '人工执行结果', width: 136, render: (_value, item) => { const current = currentCases.get(item.testCaseId); return <Select className="test-plan-result-select" value={current?.result || item.latestResult || 'NOT_EXECUTED'} loading={saving} onChange={(value) => changeResult(item.testCaseId, value)} options={[{ value: 'NOT_EXECUTED', label: '未执行', disabled: true }, { value: 'PASSED', label: '已通过' }, { value: 'FAILED', label: '未通过' }]} />; } },
            { title: '缺陷', width: 76, align: 'center', render: (_value, item) => { const current = currentCases.get(item.testCaseId); const disabled = current?.result !== 'FAILED'; return <Tooltip title={disabled ? '人工执行结果为未通过后可处理缺陷' : '新建或引用缺陷'}><Dropdown disabled={disabled} trigger={['click']} menu={{ items: [{ key: 'create', label: '新建缺陷' }, { key: 'reference', label: '引用缺陷' }], onClick: ({ key }) => { setDefectCase(current || null); if (key === 'create') setDefectActionOpen(true); else setReferenceOpen(true); } }}><Button type="text" aria-label={`处理${item.title}的缺陷`} disabled={disabled} icon={<PlusOutlined />} /></Dropdown></Tooltip>; } },
          ]} />
        </div>}
      </section>;
    })}
    <Modal title="新建测试计划" open={createOpen} onCancel={() => setCreateOpen(false)} onOk={() => void createPlan()} confirmLoading={saving} destroyOnHidden><Form form={planForm} layout="vertical"><Form.Item name="name" label="计划名称" rules={[{ required: true, whitespace: true, message: '请输入计划名称' }]}><Input maxLength={120} /></Form.Item><Form.Item name="environment" label="测试环境"><Input placeholder="例如：测试环境" maxLength={255} /></Form.Item><Form.Item name="dateRange" label="计划起止时间" rules={[{ required: true, message: '请选择计划起止时间' }]}><DatePicker.RangePicker className="w-full" /></Form.Item></Form></Modal>
    <Modal title="引用测试用例" open={!!pickerPlan} onCancel={() => setPickerPlan(null)} onOk={async () => { if (pickerPlan) await savePlan(pickerPlan, selectedIds); setPickerPlan(null); }} confirmLoading={saving} width="min(920px, 94vw)">{availableCases.isError ? <Alert type="error" showIcon title="可用用例加载失败" action={<Button onClick={() => availableCases.refetch()}>重试</Button>} /> : <Table<TestCase> size="small" loading={availableCases.isFetching} rowKey="id" dataSource={availableCases.data?.items || []} rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys.map(String)) }} pagination={false} scroll={{ y: 420 }} columns={[{ title: '编号', dataIndex: 'code', width: 120 }, { title: '标题', dataIndex: 'title', ellipsis: true }, { title: '优先级', dataIndex: 'priority', width: 80 }, { title: '负责人', dataIndex: 'ownerName', width: 120 }]} />}</Modal>
    <Modal title="新建人工测试执行" open={roundOpen} onCancel={() => setRoundOpen(false)} onOk={() => void createRound()} confirmLoading={saving}><Form form={roundForm} layout="vertical"><Form.Item name="scopeType" label="执行范围" rules={[{ required: true }]}><Radio.Group optionType="button" buttonStyle="solid" options={[{ label: '全部用例', value: 'ALL' }, { label: '失败用例回归', value: 'FAILED_ONLY' }, { label: '自定义范围', value: 'CUSTOM' }]} /></Form.Item><Form.Item name="name" label="轮次名称" rules={[{ required: true, whitespace: true }]}><Input maxLength={120} /></Form.Item><Form.Item name="environment" label="测试环境"><Input maxLength={255} /></Form.Item><Form.Item name="buildVersion" label="构建版本"><Input maxLength={120} /></Form.Item></Form></Modal>
    <Modal title="记录人工失败结果" open={!!resultCase} onCancel={() => setResultCase(null)} onOk={async () => { if (!resultCase || !failedReason.trim()) { setError('请填写实际结果和失败现象'); return; } await saveCaseResult(resultCase, 'FAILED', failedReason.trim()); setResultCase(null); }} confirmLoading={saving}><Input.TextArea rows={5} value={failedReason} onChange={(event) => setFailedReason(event.target.value)} placeholder="填写实际结果和失败现象" /></Modal>
    <Modal title="引用已有缺陷" open={referenceOpen} onCancel={() => { setReferenceOpen(false); setDefectId(''); }} onOk={() => void linkDefect()} okButtonProps={{ disabled: !defectId }} confirmLoading={saving}><Form layout="vertical"><Form.Item label="缺陷标题"><Select showSearch filterOption={false} onSearch={setDefectQuery} value={defectId || undefined} onChange={setDefectId} loading={defectOptions.isFetching} placeholder="输入缺陷标题搜索" options={(defectOptions.data?.page.items || []).map((item) => ({ value: item.id, label: `${item.code} · ${item.title}` }))} /></Form.Item></Form></Modal>
    <DefectCreatePanel open={defectActionOpen} productLineName={task.productLineName} versionName={task.versionName} requirementTitle={task.sourceWorkOrderTitles?.[0]} employeeNames={employeeNames} initialTitle={defectCase ? `${defectCase.title}执行失败` : ''} initialDescription={defectCase?.actualResult || ''} saving={saving} onClose={() => setDefectActionOpen(false)} onSubmit={createDefect} />
    <TestCaseEditorDrawer open={!!editorPlan} productLineId={productLineId} directories={directories.data || []} sourceRequirementId={sourceRequirementId} onClose={() => setEditorPlan(null)} onSaved={(created, continueCreating) => { if (!editorPlan) return; if (!continueCreating) setEditorPlan(null); const ids = Array.from(new Set([...editorPlan.cases.map((item) => item.testCaseId), created.id])); void savePlan(editorPlan, ids); }} />
  </div>;
};
