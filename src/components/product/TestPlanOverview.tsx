import React from 'react';
import { Alert, Avatar, Button, Empty, Progress, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { productRepository } from '../../services/productRepository';
import type { TestPlanRecord } from './TestPlanDetail';
import type { TestPlanCase } from '../../types/testManagement';

const states = [
  { value: 'PASSED', label: '已通过', color: 'var(--success)' },
  { value: 'FAILED', label: '未通过', color: 'var(--danger)' },
  { value: 'DEFERRED', label: '暂缓', color: 'var(--warning)' },
  { value: 'NOT_EXECUTED', label: '待测试', color: 'var(--border-main)' }
] as const;
const statistics = (cases: TestPlanCase[]) => {
  const counts = states.map((state) => cases.filter((item) => (item.executionStatus || 'NOT_EXECUTED') === state.value).length);
  return { counts, total: cases.length, tested: counts[0] + counts[1], rate: cases.length ? Math.round(counts[0] / cases.length * 100) : 0, defects: new Set(cases.flatMap((item) => item.defectIds || [])).size };
};
export const TestPlanOverview: React.FC<{ record: TestPlanRecord }> = ({ record }) => {
  const { plan, task } = record;
  const summary = statistics(plan.cases);
  const defectIds = [...new Set<string>(plan.cases.flatMap((item) => item.defectIds || []))];
  const defects = useQuery({ queryKey: ['test-plan-overview-defects', task.productLineId, defectIds.join(',')], queryFn: () => Promise.all(defectIds.map((id) => productRepository.workItemDetail(task.productLineId, id))), enabled: defectIds.length > 0, retry: false });
  const groups = new Map<string, TestPlanCase[]>();
  plan.cases.forEach((item) => { const name = item.ownerName || '未分配'; groups.set(name, [...(groups.get(name) || []), item]); });
  const people = [...groups].map(([name, cases]) => ({ name, ...statistics(cases) }));
  let offset = 0;
  const gradient = states.map((state, index) => { const start = offset; offset += summary.total ? summary.counts[index] / summary.total * 100 : 0; return `${state.color} ${start}% ${offset}%`; }).join(', ');
  const owner = plan.ownerName || task.assigneeName;
  return <div className="test-plan-overview">
    <div className="test-plan-overview-top">
      <section className="test-plan-overview-card"><h2>计划信息</h2><dl className="test-plan-info">{[
        ['计划名称', plan.name || '未命名计划'], ['关联项目', record.productName || task.productLineName || '—'], ['关联测试任务', task.title], ['关联迭代', record.versionName || task.versionName || '—'], ['测试环境', plan.environment || '—'], ['计划时间', `${plan.startDate || '—'} 至 ${plan.endDate || '—'}`]
      ].map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value}</dd></React.Fragment>)}</dl></section>
      <section className="test-plan-overview-card"><h2>执行状态</h2><div className="test-plan-execution-summary"><div className="test-plan-status-ring" style={{ background: summary.total ? `conic-gradient(${gradient})` : 'var(--border-main)' }} role="img" aria-label={`执行通过率 ${summary.rate}%`}><div><strong>{summary.rate}<small>%</small></strong><span>执行通过率</span></div></div><ul>{states.map((state, index) => <li key={state.value}><span><i style={{ background: state.color }} />{state.label}</span><span>{summary.counts[index]}</span><span>{summary.total ? Math.round(summary.counts[index] / summary.total * 100) : 0}%</span></li>)}</ul></div></section>
      <section className="test-plan-overview-card"><h2>计划人员</h2><div className="test-plan-owner"><span>负责人</span>{owner ? <div><Avatar>{owner.slice(0, 1)}</Avatar><span>{owner}</span></div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无负责人" />}</div></section>
    </div>
    <section className="test-plan-overview-card"><h2>执行人员</h2><Table rowKey="name" pagination={false} dataSource={people} scroll={{ x: 1000 }} columns={[
      { title: '用例执行人', dataIndex: 'name', render: (name: string) => <span className="test-plan-person"><Avatar size="small">{name.slice(0, 1)}</Avatar>{name}</span> },
      { title: '分配用例数量', dataIndex: 'total' }, { title: '已测数量', dataIndex: 'tested' },
      ...states.slice(0, 3).map((state, index) => ({ title: state.label, render: (_: unknown, row: typeof people[number]) => <span style={{ color: state.color }}>{row.counts[index]}</span> })),
      { title: '缺陷数量', dataIndex: 'defects' }, { title: '通过率', width: 200, render: (_: unknown, row: typeof people[number]) => <Progress percent={row.rate} size="small" strokeColor="var(--primary)" /> }
    ]} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无执行人员" /> }} /></section>
    <section className="test-plan-overview-card test-plan-overview-defects"><h2>相关缺陷</h2>{defects.isError ? <Alert type="error" title="相关缺陷加载失败" action={<Button onClick={() => void defects.refetch()}>重试</Button>} /> : defectIds.length ? <Table rowKey="id" pagination={false} loading={defects.isLoading} dataSource={defects.data || []} columns={[{ title: '编号', dataIndex: 'code' }, { title: '缺陷标题', dataIndex: 'title' }, { title: '状态', render: (_, item) => item.status?.name || '—' }, { title: '负责人', dataIndex: 'assigneeName' }]} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" />}</section>
  </div>;
};
