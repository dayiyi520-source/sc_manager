import React, { useState } from 'react';
import { Alert, Button, Descriptions, Empty, Progress, Tabs, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import type { TestTaskOverview } from '../../types/testManagement';
import { RequirementTasksView, type WorkItemDetailContext } from './RequirementTasksView';
import { TestExecutionResults } from './TestExecutionResults';
import { TestPlanPanel } from './TestPlanPanel';
import { CollapsibleDescription } from './CollapsibleDescription';

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

const TestTaskDetail: React.FC<WorkItemDetailContext> = ({ task }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const types = useQuery({ queryKey: ['test-work-item-types', task.productLineId], queryFn: () => productRepository.workItemTypes(task.productLineId || '', '测试'), enabled: !!task.productLineId, retry: false });
  const typeName = types.data?.find((item) => item.id === task.workItemTypeId)?.name || task.requirementType || '';
  if (!task.parentWorkItemId) return <TestRootOverview workItemId={task.id} task={task} />;
  if (types.isLoading) return <div className="test-task-loading">正在识别测试子任务类型...</div>;
  if (typeName === '用例编写') return <div className="test-case-authoring-state"><h3>关联用例</h3><p>在“用例库”中按当前来源需求创建或维护用例，再由可执行测试子任务加入测试计划。</p></div>;
  const basicInfo = <div className="test-task-basic-info"><Descriptions column={2} size="small" bordered items={[{ key: 'owner', label: '负责人', children: task.ownerName || '未设置' }, { key: 'status', label: '状态', children: task.status || '未设置' }, { key: 'priority', label: '优先级', children: task.priority || '未设置' }, { key: 'version', label: '版本', children: task.versionName || '未设置' }, { key: 'product', label: '产品线', children: task.productLineName || '未设置' }, { key: 'due', label: '截止时间', children: task.dueDate || '未设置' }]} /><section className="test-task-basic-description"><h3>任务描述</h3><CollapsibleDescription value={task.description} /></section></div>;
  return <Tabs className="test-task-detail-tabs" items={[
    { key: 'basic', label: '基本信息', children: basicInfo },
    { key: 'plan', label: '测试计划', children: <TestPlanPanel workItemId={task.id} productLineId={task.productLineId || ''} sourceRequirementId={task.requirementId} onExecutionCreated={() => setRefreshKey((value) => value + 1)} /> },
    { key: 'executions', label: '执行记录', children: <TestExecutionResults workItemId={task.id} productLineId={task.productLineId || ''} refreshKey={refreshKey} /> },
    { key: 'defects', label: '关联缺陷', children: <div className="test-case-authoring-state"><h3>关联缺陷</h3><p>失败结果可关联多个同需求缺陷，详情与状态继续由现有缺陷管理页面维护。</p></div> },
  ]} />;
};

export const TestTaskWorkspace: React.FC<{ productLineFilter?: string }> = ({ productLineFilter = 'all' }) => <RequirementTasksView productLineFilter={productLineFilter} itemLabel="测试任务" taskKind="test" createPolicy={{ requireRequirement: true, allowedChildTypeNames: ['用例编写', '测试任务', '测试验收', '安全测试', '回归测试'] }} renderDetail={(context) => <TestTaskDetail {...context} />} />;
