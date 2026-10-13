import React, { useEffect, useState } from 'react';
import { Button, Drawer, Empty, Input, Radio } from 'antd';
import { SearchIcon, XIcon } from '@primer/octicons-react';
import { periodLabel } from '../../../services/okrPeriods';
import { sourceKeyResults } from '../../../services/okrThreeLevelRules';
import type { OkrRecord } from '../../../services/okrRepository';

export function GoalAlignmentDrawer({ open, records, cycle, value, onCancel, onConfirm }: { open: boolean; records: OkrRecord[]; cycle: string; value: string; onCancel: () => void; onConfirm: (value: string) => void }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(value);
  useEffect(() => { if (open) { setSearch(''); setSelected(value); } }, [open, value]);
  const options = records.flatMap(source => [
    ...(source.kind === 'objective' ? [{ id: `${source.id}:`, label: source.payload.title, kind: 'O', parent: periodLabel(source.periodKey) }] : []),
    ...sourceKeyResults(source).map(kr => ({ id: `${source.id}:${kr.id}`, label: kr.title, kind: 'KR', parent: `${periodLabel(source.periodKey)} · ${source.kind === 'objective' ? source.payload.title : ''}` })),
  ]);
  const chosen = options.find(option => option.id === selected);
  const visible = options.filter(option => `${option.label} ${option.parent}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <Drawer title="添加对齐" open={open} placement="bottom" size="calc(100dvh - 3rem)" rootClassName="company-copy-modal" destroyOnHidden onClose={onCancel} footer={<><Button onClick={onCancel}>取消</Button><Button type="primary" disabled={!!selected && !chosen} onClick={() => onConfirm(selected)}>确定</Button></>}>
    <div className="company-copy-layout">
      <aside className="company-copy-sidebar"><Input aria-label="搜索对齐目标" placeholder="搜索目标或关键结果" prefix={<SearchIcon/>} value={search} onChange={event => setSearch(event.target.value)}/><div className="company-copy-scope is-active">直属上级</div></aside>
      <section className="company-copy-results" aria-label="可对齐的上级目标"><div className="company-copy-heading"><strong>直属上级已生效目标</strong><span>{periodLabel(cycle)}</span></div>{visible.length ? <div className="company-copy-list">{visible.map(option => <label className="company-copy-item" key={option.id}><Radio name="goal-alignment" checked={selected === option.id} onChange={() => setSelected(option.id)}/><span><b>{option.kind} · {option.label}</b>{option.parent && <small>{option.parent}</small>}</span></label>)}</div> : <div className="company-copy-empty"><Empty description={search ? '没有匹配的目标' : '当前周期暂无可对齐的上级生效目标'}/></div>}</section>
      <aside className="company-copy-selected"><strong>已选择的对齐（{chosen ? 1 : 0}）</strong>{chosen ? <div className="company-copy-selected-item"><span>{chosen.kind} · {chosen.label}</span><Button type="text" aria-label="移除对齐" icon={<XIcon/>} onClick={() => setSelected('')}/></div> : <div className="company-copy-empty"><Empty description="暂无选择"/></div>}{selected && !chosen && <p role="alert">原对齐来源已变化，请重新选择或移除。</p>}</aside>
    </div>
  </Drawer>;
}
