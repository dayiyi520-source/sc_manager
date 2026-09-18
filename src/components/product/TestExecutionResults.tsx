import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import type { TestExecution } from '../../types/testManagement';
import { TestExecutionWorkspace } from './TestExecutionWorkspace';

export const TestExecutionResults: React.FC<{ workItemId: string; productLineId: string; refreshKey?: number }> = ({ workItemId, productLineId, refreshKey = 0 }) => {
  const rounds = useQuery({ queryKey: ['test-executions', workItemId, refreshKey], queryFn: () => productRepository.testExecutions(workItemId), retry: false });
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => { if (!selectedId && rounds.data?.[0]) setSelectedId(rounds.data[0].id); }, [rounds.data, selectedId]);
  if (rounds.isError) return <Alert type="error" showIcon title="执行记录加载失败" action={<Button onClick={() => rounds.refetch()}>重试</Button>} />;
  return <div className="test-execution-results"><Table<TestExecution> size="small" loading={rounds.isLoading} rowKey="id" dataSource={rounds.data || []} pagination={false} locale={{ emptyText: <Empty description="尚未创建测试执行轮次" /> }} onRow={(row) => ({ onClick: () => setSelectedId(row.id) })} rowClassName={(row) => row.id === selectedId ? 'test-round-selected' : ''} columns={[{ title: '轮次', dataIndex: 'roundNo', width: 72, render: (value) => `#${value}` }, { title: '名称', dataIndex: 'name', ellipsis: true }, { title: '状态', dataIndex: 'status', width: 96, render: (value) => <Tag color={value === 'IN_PROGRESS' ? 'processing' : 'default'}>{value === 'IN_PROGRESS' ? '执行中' : '已结束'}</Tag> }, { title: '通过', dataIndex: 'passed', width: 72 }, { title: '失败', dataIndex: 'failed', width: 72 }, { title: '未执行', dataIndex: 'notExecuted', width: 80 }]} />{selectedId && <TestExecutionWorkspace executionId={selectedId} productLineId={productLineId} onChanged={() => void rounds.refetch()} />}</div>;
};
