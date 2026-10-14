import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Input, Space, Table, theme } from 'antd';
import type { Customer, Lead, Opportunity } from '../../types';
import type { PageResult } from '../../services/apiClient';
import { customerDirectoryRepository } from '../../services/customerDirectoryRepository';

type Kind = 'customers' | 'leads' | 'opportunities';
const labels = { customers: ['客户档案', '客户名称'], leads: ['线索管理', '线索名称'], opportunities: ['商机管理', '商机名称'] };
const fields: Record<Kind, Array<[string, string, number?]>> = {
  customers: [['name', '客户名称', 260], ['region', '省份'], ['schoolLevel', '办学层次'], ['schoolType', '办学类型'], ['ownership', '公办民办'], ['website', '挂网地址', 200], ['type', '客户类型'], ['source', '数据来源']],
  opportunities: [['name', '商机名称', 320], ['customerName', '客户名称', 220], ['source', '客户来源'], ['operationCenter', '运营中心'], ['announcement', '挂网公告'], ['ownerName', '销售负责人'], ['presalesOwnerName', '售前负责人'], ['stage', '商机阶段'], ['amount', '预计金额（元）', 140], ['grade', '商机等级'], ['unfollowedDays', '未跟进天数'], ['status', '状态'], ['isTrial', '是否转试用']],
  leads: [['name', '线索名称', 240], ['customerName', '客户名称', 220], ['source', '线索来源'], ['products', '意向业务', 200], ['ownerName', '线索负责人'], ['leadType', '线索类型'], ['operationCenter', '所属运营中心', 140], ['collaborationCount', '关联协同'], ['sharedCount', '共享信息'], ['taskCount', '关联任务'], ['registrarName', '登记人'], ['createdAt', '登记时间', 180], ['status', '状态']],
};
export function CustomerDirectoryView({ kind }: { kind: Kind }) {
  const { token } = theme.useToken();
  const [draft, setDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = useQuery<PageResult<Customer | Lead | Opportunity>>({ queryKey: ['customer-directory', kind, keyword, page, pageSize], queryFn: () => customerDirectoryRepository[kind]({ keyword, page, pageSize }) });
  const [title, field] = labels[kind];
  return <section aria-label={title} style={{ background: token.colorBgContainer, borderRadius: token.borderRadiusLG, padding: 24, minHeight: '100%' }}>
    <h1 style={{ fontSize: 18, color: token.colorText, margin: '0 0 24px' }}>{title}</h1>
    <Space style={{ marginBottom: 24 }}>
      <Input.Search aria-label={field} placeholder={`请输入${field}`} allowClear value={draft} onChange={event => setDraft(event.target.value)} onSearch={() => { setKeyword(draft.trim()); setPage(1); }} style={{ width: 260 }} />
      <Button type="primary" onClick={() => { setKeyword(draft.trim()); setPage(1); }}>查询</Button>
      <Button onClick={() => { setDraft(''); setKeyword(''); setPage(1); }}>重置</Button>
    </Space>
    {kind === 'leads' && <h2 style={{ fontSize: 14, marginBottom: 16 }}>全部线索（{query.data?.total || 0}）</h2>}
    {query.error && <Alert type="error" showIcon title="数据加载失败" description={query.error.message} action={<Button onClick={() => query.refetch()}>重试</Button>} />}
    <Table rowKey="id" size="middle" loading={query.isFetching} dataSource={query.data?.items || []} scroll={{ x: kind === 'customers' ? 1200 : 1900 }} locale={{ emptyText: <Empty /> }} columns={fields[kind].map(([key, title, width]) => ({ key, dataIndex: key, title, width: width || 120, render: (value: unknown) => value === true ? '是' : value === false ? '否' : Array.isArray(value) ? value.join('、') || '—' : value === 0 ? '0' : value ? String(value) : '—' }))} pagination={{ current: page, pageSize, total: query.data?.total || 0, showSizeChanger: true, showTotal: total => `共 ${total} 条数据`, onChange: (next, size) => { setPage(next); setPageSize(size); } }} />
  </section>;
}
