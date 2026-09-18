import React, { useMemo, useState } from 'react';
import { Alert, Button, Drawer, Empty, Progress, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import type { TestExecution } from '../../types/testManagement';
import { TestExecutionWorkspace } from './TestExecutionWorkspace';

export const TestExecutionResults: React.FC<{ workItemId: string; productLineId: string; refreshKey?: number }> = ({ workItemId, productLineId, refreshKey = 0 }) => {
  const rounds = useQuery({
    queryKey: ['test-executions-with-details', workItemId, refreshKey],
    queryFn: async () => {
      const summaries = await productRepository.testExecutions(workItemId);
      return Promise.all(summaries.map(async (item) => ({ ...await productRepository.testExecutionDetail(item.id), planName: item.planName, testPlanId: item.testPlanId })));
    },
    retry: false,
  });
  const [selectedId, setSelectedId] = useState('');
  const summary = useMemo(() => {
    const items = rounds.data || [];
    const total = items.reduce((sum, item) => sum + item.total, 0);
    const passed = items.reduce((sum, item) => sum + item.passed, 0);
    const failed = items.reduce((sum, item) => sum + item.failed, 0);
    const notExecuted = items.reduce((sum, item) => sum + item.notExecuted, 0);
    const defects = new Set(items.flatMap((item) => item.cases.flatMap((testCase) => testCase.defects.map((defect) => defect.id)))).size;
    return { total, passed, failed, notExecuted, defects, rate: total ? Math.round((passed / total) * 100) : 0 };
  }, [rounds.data]);
  if (rounds.isError) return <Alert type="error" showIcon title="执行记录加载失败" action={<Button onClick={() => rounds.refetch()}>重试</Button>} />;
  return <div className="test-execution-results">
    <div className="test-task-section-heading"><div><h3>人工执行记录</h3><span>每个轮次由测试人员逐条填写结果，点击查看进入执行工作台</span></div></div>
    <div className="test-execution-metrics"><div><span>执行用例</span><b>{summary.total}</b></div><div><span>通过</span><b className="success">{summary.passed}</b></div><div><span>失败</span><b className="danger">{summary.failed}</b></div><div><span>未执行</span><b>{summary.notExecuted}</b></div><div><span>通过率</span><b>{summary.rate}%</b></div><div><span>缺陷</span><b className="warning">{summary.defects}</b></div></div>
    <div className="test-execution-progress"><span>全部轮次</span><Progress percent={summary.rate} success={{ percent: summary.rate }} showInfo={false} /><strong>{summary.rate}%</strong></div>
    <Table<TestExecution> size="small" loading={rounds.isLoading} rowKey="id" dataSource={rounds.data || []} pagination={false} locale={{ emptyText: <Empty description="尚未创建测试执行轮次" /> }} columns={[
      { title: '测试计划', dataIndex: 'planName', ellipsis: true, render: (value) => value || '未命名计划' },
      { title: '执行轮次', dataIndex: 'name', ellipsis: true, render: (value, row) => <span><b>{value}</b><small className="test-round-number">第 {row.roundNo} 轮</small></span> },
      { title: '通过', dataIndex: 'passed', width: 80, render: (value) => <span className="test-result-success">{value}</span> },
      { title: '失败', dataIndex: 'failed', width: 80, render: (value) => <span className="test-result-danger">{value}</span> },
      { title: '未执行', dataIndex: 'notExecuted', width: 88 },
      { title: '缺陷', width: 72, render: (_value, row) => new Set(row.cases.flatMap((item) => item.defects.map((defect) => defect.id))).size },
      { title: '状态', dataIndex: 'status', width: 112, render: (value) => <Tag color={value === 'IN_PROGRESS' ? 'processing' : 'success'}>{value === 'IN_PROGRESS' ? '人工执行中' : '已完成'}</Tag> },
      { title: '操作', width: 80, render: (_value, row) => <Button type="link" onClick={() => setSelectedId(row.id)}>查看</Button> },
    ]} />
    <Drawer title={(rounds.data || []).find((item) => item.id === selectedId)?.name || '执行详情'} open={!!selectedId} onClose={() => setSelectedId('')} size="min(1040px, 78vw)" destroyOnHidden>
      {selectedId && <TestExecutionWorkspace executionId={selectedId} productLineId={productLineId} onChanged={() => void rounds.refetch()} />}
    </Drawer>
  </div>;
};
