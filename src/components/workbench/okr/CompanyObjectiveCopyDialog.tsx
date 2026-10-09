import React, { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Drawer, Empty, Input, Select, Spin } from 'antd';
import { SearchIcon, XIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import type { OkrPayload, OkrRecord } from '../../../services/okrRepository';

const submittedStatuses = new Set(['active', 'submitted', 'reviewed']);

export const copyableCompanyObjectives = (records: OkrRecord[], ownerId: string, destinationPeriod: string) =>
  records.filter(record => record.kind === 'objective' && record.ownerId === ownerId && record.periodKey < destinationPeriod && submittedStatuses.has(record.status));

export const createCompanyObjectiveCopy = (source: OkrRecord): OkrPayload => ({
  title: source.payload.title,
  objectiveType: 'challenge',
  weight: source.payload.weight ?? 100,
  keyResults: (source.payload.keyResults || []).map(kr => ({
    id: crypto.randomUUID(),
    title: kr.title,
    weight: kr.weight,
    progress: 0,
    assigneeIds: [...(kr.assigneeIds || [])],
  })),
});

interface Props {
  open: boolean;
  records: OkrRecord[];
  ownerId: string;
  destinationPeriod: string;
  loading: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (copies: OkrPayload[]) => void;
}

export const CompanyObjectiveCopyDialog: React.FC<Props> = ({ open, records, ownerId, destinationPeriod, loading, error, onCancel, onConfirm }) => {
  const eligible = useMemo(() => copyableCompanyObjectives(records, ownerId, destinationPeriod), [records, ownerId, destinationPeriod]);
  const periods = useMemo(() => [...new Set(eligible.map(record => record.periodKey))].sort().reverse(), [eligible]);
  const [period, setPeriod] = useState<string>();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setPeriod(periods[0]);
      setSearch('');
      setSelectedIds([]);
    }
  }, [open, ownerId, destinationPeriod]);
  useEffect(() => { if (open && !periods.includes(period || '')) setPeriod(periods[0]); }, [open, period, periods]);

  const visible = eligible.filter(record => record.periodKey === period && record.payload.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const selected = selectedIds.map(id => eligible.find(record => record.id === id)).filter((record): record is OkrRecord => Boolean(record));
  return <Drawer
    title="复制目标"
    open={open}
    placement="bottom"
    size="calc(100dvh - 3rem)"
    rootClassName="company-copy-modal"
    destroyOnHidden
    onClose={onCancel}
    footer={<><Button onClick={onCancel}>取消</Button><Button type="primary" disabled={selected.length === 0 || loading || !!error} onClick={() => { onConfirm(selected.map(createCompanyObjectiveCopy)); setSelectedIds([]); }}>确定{selected.length > 0 ? `（${selected.length}）` : ''}</Button></>}
  >
    <div className="company-copy-layout">
      <aside className="company-copy-sidebar"><Input aria-label="搜索我的目标" placeholder="搜索目标" prefix={<SearchIcon/>} value={search} onChange={event => setSearch(event.target.value)}/><div className="company-copy-scope is-active">我的目标</div></aside>
      <section className="company-copy-results" aria-label="我的已提交目标"><div className="company-copy-heading"><strong>我的目标</strong><Select aria-label="来源周期" value={period} placeholder="选择周期" options={periods.map(value => ({value, label: dayjs(value).format('YYYY年MM月')}))} onChange={setPeriod}/></div>
        {loading ? <div className="company-copy-empty"><Spin tip="加载目标中"/></div> : error ? <div className="company-copy-empty"><Empty description="目标加载失败，请关闭后重试"/></div> : visible.length ? <div className="company-copy-list">{visible.map(record => <label className="company-copy-item" key={record.id}><Checkbox checked={selectedIds.includes(record.id)} onChange={event => setSelectedIds(ids => event.target.checked ? [...ids, record.id] : ids.filter(id => id !== record.id))}/><span><b>{record.payload.title}</b><small>{dayjs(record.periodKey).format('YYYY年MM月')} · {(record.payload.keyResults || []).length} 项动作</small></span></label>)}</div> : <div className="company-copy-empty"><Empty description={search ? '没有匹配的目标' : '该周期暂无已提交目标'}/></div>}
      </section>
      <aside className="company-copy-selected"><strong>已选择的目标（{selected.length}）</strong>{selected.length ? selected.map(record => <div className="company-copy-selected-item" key={record.id}><span>{record.payload.title}</span><Button type="text" aria-label={`移除${record.payload.title}`} icon={<XIcon/>} onClick={() => setSelectedIds(ids => ids.filter(id => id !== record.id))}/></div>) : <div className="company-copy-empty"><Empty description="暂无选择"/></div>}</aside>
    </div>
  </Drawer>;
};
