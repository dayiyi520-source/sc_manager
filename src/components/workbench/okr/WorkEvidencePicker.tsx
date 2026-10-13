import { useMemo, useState } from 'react';
import { Alert, Button, Empty, Input, Modal, Select, Table, Tabs, Tag } from 'antd';
import { SearchIcon } from '@primer/octicons-react';
import type { OkrWork } from '../../../services/okrRepository';
import type { EvidenceViewer } from '../../../services/reviewEvidenceRepository';
import { filterEvidence } from './evidenceFilters';
import { workSource } from './workAggregation';

interface Props {
  work: OkrWork[]; viewer?: EvidenceViewer; product?: string; version?: string;
  startDate: string; endDate: string; selectedIds: string[]; blockedIds?: ReadonlySet<string>;
  loading?: boolean; error?: unknown; onRetry?: () => void;
  onConfirm: (ids: string[]) => void; onCancel: () => void;
}
export function WorkEvidencePicker({ work, viewer, product, version, startDate, endDate, selectedIds, blockedIds = new Set(), loading = false, error, onRetry, onConfirm, onCancel }: Props) {
  const [source, setSource] = useState<'task' | 'ticket'>('task');
  const [selection, setSelection] = useState<string[]>(selectedIds);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const candidates = useMemo(() => ({
    task: filterEvidence(work, { viewer, product, version, startDate, endDate, source: 'task' }),
    ticket: filterEvidence(work, { viewer, product, version, startDate, endDate, source: 'ticket' }),
  }), [work, viewer, product, version, startDate, endDate]);
  const eligible = candidates[source];
  const matchesKeyword = (item: OkrWork) => !keyword.trim() || `${item.title} ${item.sourceId}`.toLowerCase().includes(keyword.trim().toLowerCase());
  const tabCounts = {
    task: candidates.task.filter(item => matchesKeyword(item) && (source !== 'task' || status === 'all' || status === item.status)).length,
    ticket: candidates.ticket.filter(item => matchesKeyword(item) && (source !== 'ticket' || status === 'all' || status === item.status)).length,
  };
  const rows = eligible.filter(item => matchesKeyword(item) && (status === 'all' || status === item.status));
  return <Modal open className="okr-work-association-modal" title="关联工作证据" width={1120} onCancel={onCancel} footer={[
    <span key="count" className="okr-work-association-count">已选 <strong>{selection.length}</strong> 项工作证据</span>,
    <Button key="cancel" onClick={onCancel}>取消</Button>,
    <Button key="confirm" type="primary" disabled={loading || Boolean(error)} onClick={() => onConfirm([...new Set<string>(selection)])}>确认关联</Button>,
  ]}>
    <div className="okr-work-association-body">
      <p className="okr-work-association-context">{product ? `关联产品：${product}` : '当前 A 未指定产品'}{source === 'task' && version ? ` · 版本：${version}` : ''} · 周期：{startDate} 至 {endDate}</p>
      <Tabs activeKey={source} items={[{ key: 'task', label: `我的任务（${loading || error ? '—' : tabCounts.task}）` }, { key: 'ticket', label: `协同事项（${loading || error ? '—' : tabCounts.ticket}）` }]} onChange={value => { setSource(value as 'task' | 'ticket'); setStatus('all'); }}/>
      <div className="okr-work-association-filters"><Input allowClear prefix={<SearchIcon/>} value={keyword} onChange={event => setKeyword(event.target.value)} placeholder={`搜索${source === 'task' ? '任务' : '协同事项'}名称或编号`}/><Select aria-label="工作证据状态" value={status} onChange={setStatus} options={[{ value: 'all', label: '全部状态' }, ...[...new Set(eligible.map(item => item.status))].map(value => ({ value, label: value }))]}/></div>
      {error ? <Alert type="error" title="工作证据加载失败" showIcon action={<Button onClick={onRetry}>重试</Button>}/> : null}
      <Table<OkrWork> rowKey="id" loading={loading} dataSource={rows} pagination={{ pageSize: 20 }} scroll={{ x: 760, y: 420 }} locale={{ emptyText: <Empty description="当前条件下暂无可关联工作证据"/> }} rowSelection={{
        selectedRowKeys: selection, preserveSelectedRowKeys: true,
        onChange: keys => {
          const visible = new Set(rows.map(row => row.id));
          setSelection(current => [...new Set([...current.filter(id => !visible.has(id)), ...keys.map(String)])]);
        },
        getCheckboxProps: item => ({ disabled: (blockedIds.has(item.id) && !selectedIds.includes(item.id)) || loading || Boolean(error) }),
      }} columns={[
        { title: '来源', render: (_, item) => <Tag>{workSource(item) === 'ticket' ? '协同事项' : '任务'}</Tag>, width: 100 },
        { title: '编号 / 名称', render: (_, item) => <span title={item.title}>{item.sourceId} · {item.title}</span>, ellipsis: true },
        { title: '产品 / 版本', render: (_, item) => `${item.productLineName || '—'}${item.versionName ? ` / ${item.versionName}` : ''}`, ellipsis: true },
        { title: '状态', dataIndex: 'status', width: 100 },
        { title: '负责人', dataIndex: 'ownerName', width: 100 },
        { title: '创建人', dataIndex: 'creatorName', width: 100 },
        { title: '创建时间', render: (_, item) => item.createdAt?.slice(0, 10) || '—', width: 112 },
      ]}/>
    </div>
  </Modal>;
}
