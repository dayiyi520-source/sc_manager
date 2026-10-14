import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Input, Radio, Select, Skeleton, Switch, Tag } from 'antd';
import { ChevronDownIcon, ChevronRightIcon } from '@primer/octicons-react';
import { PersonAvatar } from '../../common/PersonIdentity';
import { periodLabel } from '../../../services/okrPeriods';
import { okrRepository, type OkrPerson, type OkrRecord, type OkrWork } from '../../../services/okrRepository';
import { confirmationMembers, confirmationRequests, goalDifferences } from './goalConfirmation';
import { buildMyTargetViewItems, MyTargetMonthSection } from './MyTargetMonthSection';
import { CompanyObjectiveDetail } from './CompanyObjectiveDetail';

export function GoalConfirmationWorkspace({ records, people, viewerId, selectedMemberId, selectedCycles, onSelectCycles, onSelectMember, onRefresh, loading, loadError, work, workLoading, workError, onRetryWork }: {
  records: OkrRecord[]; people: OkrPerson[]; viewerId: string; selectedMemberId?: string; selectedCycles?: string[]; onSelectCycles?: (cycles: string[]) => void; onSelectMember: (id: string) => void;
  onRefresh: () => Promise<unknown>; loading: boolean; loadError?: Error | null; work: OkrWork[]; workLoading: boolean; workError: Error | null; onRetryWork: () => void;
}) {
  const members = confirmationMembers(people, viewerId);
  const requests = confirmationRequests(records, people, viewerId);
  const [defaultMemberId] = useState(() => (members.find(person => requests.some(record => record.ownerId === person.id)) || members[0])?.id);
  const member = members.find(person => person.id === (selectedMemberId || defaultMemberId)) || members[0];
  const [comparison, setComparison] = useState(true);
  const [expandedChanges, setExpandedChanges] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [decisions, setDecisions] = useState<Record<string, 'approve' | 'return'>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<OkrRecord>();
  useEffect(() => { setFilter('pending'); setDetail(undefined); setExpandedChanges({}); }, [viewerId, selectedMemberId]);
  const memberRecords = requests.filter(record => record.ownerId === member?.id);
  const availableCycles = [...new Set(records.filter(record => record.kind === 'objective' && record.ownerId === member?.id && record.changeRequest?.status === 'pending').map(record => record.periodKey))].sort().reverse();
  const effectiveCycles = selectedCycles || availableCycles;
  const chosen = effectiveCycles.filter(cycle => availableCycles.includes(cycle));
  const pendingIds = new Set(requests.map(record => record.id));
  const visible = memberRecords.filter(record => chosen.includes(record.periodKey) && (filter === 'all' || pendingIds.has(record.id)));
  const submit = async (record: OkrRecord) => {
    if (busyId || !pendingIds.has(record.id)) return;
    const decision = decisions[record.id] || 'approve'; const feedback = (notes[record.id] || '').trim();
    if (decision === 'return' && !feedback) { setErrors(current => ({ ...current, [record.id]: '请填写修改建议' })); return; }
    setBusyId(record.id); setErrors(current => ({...current,[record.id]:''}));
    try {
      await okrRepository.update(record, decision === 'approve' ? 'approve-change' : 'return-change', { feedback }, viewerId);
      await onRefresh();
      setNotes(current => ({...current,[record.id]:''}));
    } catch (reason) { setErrors(current => ({...current,[record.id]:reason instanceof Error ? reason.message : '提交失败，请重试'})); }
    finally { setBusyId(undefined); }
  };
  const approveAll = async (items: OkrRecord[]) => { for (const record of items) { setDecisions(current => ({ ...current, [record.id]: 'approve' })); await submit(record); } };
  return <section className="okr-confirmation-workspace" aria-label="目标确认工作区">
    <header className="okr-confirmation-heading"><div className="okr-confirmation-member">{member && <PersonAvatar name={member.name}/>}<Select aria-label="确认成员" value={member?.id} disabled={!!busyId || loading || !members.length} options={members.map(person => ({value:person.id,label:person.name}))} onChange={id => { onSelectMember(id); }}/></div>
      <div className="okr-confirmation-tools">{comparison && <div className="okr-confirmation-legend"><span className="is-before">删除的内容</span><span className="is-after">新增的内容</span></div>}<label><span>修改对比</span><Switch aria-label="修改对比" checked={comparison} onChange={setComparison}/></label><Select aria-label="确认周期" mode="multiple" placeholder="选择周期" maxTagCount="responsive" value={effectiveCycles.filter(cycle => availableCycles.includes(cycle))} options={availableCycles.map(value => ({value,label:periodLabel(value)}))} disabled={!!busyId || loading} onChange={onSelectCycles || (() => undefined)}/></div>
    </header>
    {loading ? <Skeleton active/> : loadError ? <Alert type="error" title="目标确认加载失败" description={loadError.message} action={<Button onClick={() => void onRefresh()}>重试</Button>}/> : (!member || !chosen.length) ? <div className="okr-confirmation-empty"><Empty description={!member ? '暂无可确认成员' : !chosen.length && availableCycles.length > 0 ? '请选择周期' : filter === 'pending' ? '暂无待确认目标' : '暂无目标'}/></div> : chosen.map(cycle => {
      const cycleRecords=memberRecords.filter(record=>record.periodKey===cycle); const pending=cycleRecords.filter(record=>pendingIds.has(record.id));
      return <section key={cycle} className="okr-confirmation-cycle" aria-label={periodLabel(cycle)+'目标确认'}>
        <header><h3>{periodLabel(cycle)}</h3><div className="okr-confirmation-cycle-filter"><Radio.Group aria-label="确认项筛选" value={filter} onChange={event=>setFilter(event.target.value)} optionType="button" options={[{value:'pending',label:'待确认项（'+pending.length+'）'},{value:'all',label:'全部（'+cycleRecords.length+'）'}]}/>{filter === 'pending' && pending.length > 0 && <Button type="link" onClick={() => void approveAll(pending)}>全部通过</Button>}</div></header>
        {!visible.some(record=>record.periodKey===cycle) && <div className="okr-confirmation-empty"><Empty description={filter==='pending'?'暂无待确认目标':'暂无目标'}/></div>}
        {visible.filter(record=>record.periodKey===cycle).map(record=>{
          const change=record.changeRequest; const pending=pendingIds.has(record.id); const proposed=pending && change ? {...record,payload:change.payload} : record;
          const differences=change && change.purpose!=='initial' ? goalDifferences(record.payload,change.payload,people) : [];
          return <article className="okr-confirmation-card" key={record.id} aria-label={'确认目标：'+proposed.payload.title}>
            <section className="okr-confirmation-change-card"><div className="okr-confirmation-change-header"><strong>{change?.purpose==='initial'?'新增目标':change?.purpose==='delete'?'删除目标':change?.purpose==='alignment'?'调整对齐':'修改信息'}</strong>{(change?.purpose==='update' || change?.purpose==='alignment') && <Button type="text" className="okr-confirmation-change-toggle" aria-expanded={expandedChanges[record.id] || false} aria-controls={`okr-confirmation-changes-${record.id}`} onClick={() => setExpandedChanges(current => ({...current,[record.id]:!current[record.id]}))}>查看明细 {expandedChanges[record.id] ? <ChevronDownIcon/> : <ChevronRightIcon/>}</Button>}</div>
              {expandedChanges[record.id] && (differences.length ? <section id={`okr-confirmation-changes-${record.id}`} className="okr-confirmation-differences" aria-label="目标修改对比">{differences.map(row => <div key={row.id}><strong>{row.label}</strong><span className={comparison ? 'is-before' : ''}>{row.before}</span><span aria-hidden="true">→</span><span className={comparison ? 'is-after' : ''}>{row.after}</span></div>)}</section> : <p>本次无可见内容变化，请核对修改原因。</p>)}
            </section>
            <section className="okr-confirmation-objective-card"><Tag className="okr-confirmation-status" color={pending?'processing':change?.status==='returned'?'warning':'success'}>{pending?'待确认':change?.status==='returned'?'建议修改':'已确认'}</Tag><MyTargetMonthSection periodKey={cycle} targets={buildMyTargetViewItems([proposed],[],records,people,record.ownerId)} viewMode="list" collapsed={false} onToggle={()=>{}} onOpenTarget={()=>setDetail(proposed)}/></section>

            {pending && <footer><Radio.Group aria-label={proposed.payload.title+'确认操作'} value={decisions[record.id]||'approve'} disabled={!!busyId} onChange={event=>{setDecisions(current=>({...current,[record.id]:event.target.value}));setErrors(current=>({...current,[record.id]:''}));}}><Radio value="approve">确认目标</Radio><Radio value="return">建议修改</Radio></Radio.Group><Button type="primary" disabled={!!busyId && busyId!==record.id} loading={busyId===record.id} onClick={()=>void submit(record)}>提交</Button>
              {decisions[record.id]==='return' && <Input.TextArea aria-label="修改建议" aria-required rows={3} maxLength={1000} placeholder="填写需要调整的内容" value={notes[record.id]||''} disabled={!!busyId} onChange={event=>setNotes(current=>({...current,[record.id]:event.target.value}))}/>}
              {errors[record.id] && <Alert type="error" title={errors[record.id]} showIcon action={<Button disabled={!!busyId} onClick={()=>void onRefresh()}>刷新目标</Button>}/>}
            </footer>}
          </article>;
        })}
      </section>;
    })}
    {detail && <CompanyObjectiveDetail record={detail} records={records} people={people} work={work} workLoading={workLoading} workError={workError} onRetryWork={onRetryWork} onClose={()=>setDetail(undefined)}/>}
  </section>;
}
