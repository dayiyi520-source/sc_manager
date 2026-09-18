import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, DatePicker, Empty, InputNumber, Progress, Select, Table, Tabs, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { productRepository } from '../../services/productRepository';
import type { TestTaskOverview } from '../../types/testManagement';
import { RequirementTasksView, type WorkItemDetailContext } from './RequirementTasksView';
import { TestExecutionResults } from './TestExecutionResults';
import { TestPlanPanel } from './TestPlanPanel';
import { CollapsibleDescription } from './CollapsibleDescription';
import { LazyRichTextEditor as RichTextEditor } from './LazyRichTextEditor';

const BLOCKER_LABEL: Record<string, string> = {
  REQUIRED_CHILD_INCOMPLETE: '仍有必需子任务未完成',
  UNEXECUTED_CASES: '最新有效轮次仍有未执行用例',
  OPEN_BLOCKING_DEFECTS: '仍有未关闭的 P0/P1 缺陷',
};

const TestRootOverview: React.FC<{ workItemId: string; task: WorkItemDetailContext['task'] }> = ({ workItemId, task }) => {
  const overview = useQuery({ queryKey: ['test-task-overview', workItemId], queryFn: () => productRepository.testTaskOverview(workItemId), retry: false });
  if (overview.isLoading) return <div className="test-task-loading">正在计算主任务汇总...</div>;
  if (overview.isError || !overview.data) return <Alert type="error" showIcon title="主任务汇总加载失败" action={<Button onClick={() => overview.refetch()}>重试</Button>} />;
  const value: TestTaskOverview = overview.data;
  const completion = value.total ? Math.round((value.passed / value.total) * 100) : 0;
  const conclusion = value.conclusion === 'PASSED' ? '通过' : value.conclusion === 'CONDITIONAL_PASS' ? '有条件通过' : '未通过';
  return <div className="test-task-overview"><div className="test-task-metrics"><div><span>子任务</span><b>{value.completedChildCount}/{value.childCount}</b></div><div><span>去重用例</span><b>{value.caseCount}</b></div><div><span>最新轮次</span><b>{value.executionCount}</b></div><div><span>关联缺陷</span><b>{value.defectCount}</b></div></div><section className="test-task-conclusion"><div><span>测试结论</span><h3>{conclusion}</h3></div><Progress type="circle" percent={completion} size={72} strokeColor="var(--primary)" trailColor="var(--border-main)" /></section>{value.blockers.length > 0 && <Alert type="warning" showIcon title="当前不可完成" description={<ul>{value.blockers.map((item) => <li key={item}>{BLOCKER_LABEL[item] || item}</li>)}</ul>} />}<div className="test-task-result-strip"><span><i className="passed" />通过 {value.passed}</span><span><i className="failed" />失败 {value.failed}</span><span><i />未执行 {value.notExecuted}</span></div><section><div className="test-case-panel-heading"><span>关联缺陷</span><Tag color={value.blockingDefectCount ? 'error' : 'default'}>{value.blockingDefectCount} 个阻断</Tag></div>{value.defects.length ? value.defects.map((defect) => <div className="test-defect-summary" key={defect.id}><span className="test-case-code">{defect.code}</span><strong title={defect.title}>{defect.title}</strong><Tag>{defect.priority}</Tag><span>{defect.status}</span></div>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关联缺陷" />}</section></div>;
};

const TestTaskDefects: React.FC<{ workItemId: string }> = ({ workItemId }) => {
  const overview = useQuery({ queryKey: ['test-task-defects', workItemId], queryFn: () => productRepository.testTaskOverview(workItemId), retry: false });
  if (overview.isLoading) return <div className="test-task-loading">正在加载关联缺陷...</div>;
  if (overview.isError) return <Alert type="error" showIcon title="关联缺陷加载失败" action={<Button onClick={() => overview.refetch()}>重试</Button>} />;
  return <Table rowKey="id" size="small" pagination={false} dataSource={overview.data?.defects || []} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本次测试尚未产生缺陷" /> }} columns={[
    { title: '缺陷编号', dataIndex: 'code', width: 120 },
    { title: '缺陷标题', dataIndex: 'title', ellipsis: true },
    { title: '优先级', dataIndex: 'priority', width: 96, render: (value) => <Tag>{value}</Tag> },
    { title: '状态', dataIndex: 'status', width: 108 },
    { title: '负责人', dataIndex: 'assigneeName', width: 120, render: (value) => value || '未设置' },
  ]} />;
};

const TestTaskDetail: React.FC<WorkItemDetailContext> = ({ task, editing, onUpdate, employeeNames, versions, statusControl }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [description, setDescription] = useState(task.description || '');
  const [descriptionHtml, setDescriptionHtml] = useState(task.descriptionHtml || '');
  const descriptionEditor = useRef<HTMLDivElement | null>(null);
  useEffect(() => { setDescription(task.description || ''); setDescriptionHtml(task.descriptionHtml || ''); }, [task.id, task.description, task.descriptionHtml]);
  const types = useQuery({ queryKey: ['test-work-item-types', task.productLineId], queryFn: () => productRepository.workItemTypes(task.productLineId || '', '测试'), enabled: !!task.productLineId, retry: false });
  const typeName = types.data?.find((item) => item.id === task.workItemTypeId)?.name || task.requirementType || '';
  if (types.isLoading) return <div className="test-task-loading">正在识别测试子任务类型...</div>;
  if (typeName === '用例编写') return <div className="test-case-authoring-state"><h3>关联用例</h3><p>在“用例库”中按当前来源需求创建或维护用例，再由可执行测试子任务加入测试计划。</p></div>;
  const requirementLabel = task.requirementId ? task.sourceWorkOrderTitles?.[0] || task.requirementId : '未关联';
  const lineVersions = versions.filter((version) => !version.productLineName || version.productLineName === task.productLineName);
  const basicInfo = <div className="test-task-basic-info">
    <div className="test-task-basic-grid">
      <label><span>负责人</span>{editing ? <Select showSearch optionFilterProp="label" value={task.ownerName || undefined} options={employeeNames.map((name) => ({ label: name, value: name }))} onChange={(ownerName) => onUpdate({ ownerName })} placeholder="未设置" /> : <b>{task.ownerName || '未设置'}</b>}</label>
      <label><span>状态</span>{editing ? statusControl : <b>{task.status || '未设置'}</b>}</label>
      <label><span>优先级</span>{editing ? <Select value={task.priority || undefined} options={['P0', 'P1', 'P2', 'P3'].map((value) => ({ value, label: value }))} onChange={(priority) => onUpdate({ priority })} /> : <b>{task.priority || '未设置'}</b>}</label>
      <label><span>迭代版本</span>{editing ? <Select allowClear showSearch optionFilterProp="label" value={task.versionId || undefined} options={lineVersions.map((version) => ({ label: version.name, value: version.id }))} onChange={(versionId) => onUpdate({ versionId, versionName: lineVersions.find((version) => version.id === versionId)?.name || '' })} placeholder="未设置" /> : <b>{task.versionName || '未设置'}</b>}</label>
      <label><span>产品线</span><b>{task.productLineName || '未设置'}</b></label>
      <label><span>计划开始时间</span>{editing ? <DatePicker value={task.plannedStartDate ? dayjs(task.plannedStartDate) : null} onChange={(date) => onUpdate({ plannedStartDate: date?.format('YYYY-MM-DD') || '' })} /> : <b>{task.plannedStartDate || '未设置'}</b>}</label>
      <label><span>计划完成时间</span>{editing ? <DatePicker value={task.dueDate ? dayjs(task.dueDate) : null} onChange={(date) => onUpdate({ dueDate: date?.format('YYYY-MM-DD') || '' })} /> : <b>{task.dueDate || '未设置'}</b>}</label>
      <label><span>预计工时（小时）</span>{editing ? <InputNumber min={0} precision={2} value={task.estimatedHours || 0} onChange={(estimatedHours) => onUpdate({ estimatedHours: estimatedHours || 0 })} /> : <b>{task.estimatedHours || 0}</b>}</label>
    </div>
    <section className="test-task-basic-description"><h3>任务描述</h3>{editing ? <RichTextEditor key={`test-detail-${task.id}`} editor={descriptionEditor} value={description} htmlValue={descriptionHtml} onInput={(text, html) => { setDescription(text); setDescriptionHtml(html); }} onBlur={() => onUpdate({ description, descriptionHtml })} placeholder="详细记录测试范围、环境和验收标准..." /> : <CollapsibleDescription value={description} emptyText="未填写任务描述" />}</section>
  </div>;
  return <div className="test-task-detail-page"><header className="test-task-detail-header"><div className="test-task-detail-meta"><span>所属需求：{requirementLabel}</span><i /> <span>产品线/版本号：{task.productLineName || '未设置'} / {task.versionName || '未设置'}</span><i /> <span>负责人：{task.ownerName || '未设置'}</span></div></header><Tabs className="test-task-detail-tabs" items={[
    { key: 'basic', label: '基本信息', children: basicInfo },
    { key: 'plan', label: '测试计划', children: <TestPlanPanel task={task} workItemId={task.id} productLineId={task.productLineId || ''} sourceRequirementId={task.requirementId} onExecutionCreated={() => setRefreshKey((value) => value + 1)} /> },
    { key: 'executions', label: '执行记录', children: <TestExecutionResults workItemId={task.id} productLineId={task.productLineId || ''} refreshKey={refreshKey} /> },
    { key: 'defects', label: '关联缺陷', children: <TestTaskDefects workItemId={task.id} /> },
  ]} /></div>;
};

export const TestTaskWorkspace: React.FC<{ productLineFilter?: string }> = ({ productLineFilter = 'all' }) => <RequirementTasksView productLineFilter={productLineFilter} itemLabel="测试任务" taskKind="test" createPolicy={{ allowedChildTypeNames: ['用例编写', '测试任务', '测试验收', '安全测试', '回归测试'] }} renderDetail={(context) => <TestTaskDetail {...context} />} />;
