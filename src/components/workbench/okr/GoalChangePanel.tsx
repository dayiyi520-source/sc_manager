import { GoalChangeSummary } from './GoalChangeSummary';
import { CompanyObjectiveDetail } from './CompanyObjectiveDetail';
import type { OkrWork } from '../../../services/okrRepository';
import { sourceKeyResults } from '../../../services/okrThreeLevelRules';
import { goalDifferences } from './goalConfirmation';
import React, { useState } from 'react';
import { Alert, Button, Descriptions, Input, Modal, Space, Tag, Typography, Select } from 'antd';
import { okrRepository, type OkrRecord, type OkrPerson } from '../../../services/okrRepository';

export function GoalChangePanel({ showRequests = true, records, people, viewerId, onRefresh, work, workLoading, workError, onRetryWork }: { showRequests?: boolean; work: OkrWork[]; workLoading: boolean; workError: Error | null; onRetryWork: () => void; records: OkrRecord[]; people: OkrPerson[]; viewerId: string; onRefresh: () => Promise<unknown> }) {
  const [review, setReview] = useState<OkrRecord>();
  const [suggestedSource, setSuggestedSource] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [showSource, setShowSource] = useState<OkrRecord>();
  const requests = showRequests ? records.filter(record => record.changeRequest?.status === 'pending' && record.changeRequest.reviewerId === viewerId) : [];
  const sync = records.filter(record => record.ownerId === viewerId && !record.payload.inherited && !record.payload.sourceWithdrawalAcknowledged && record.payload.sourceObjectiveId && records.find(source => source.id === record.payload.sourceObjectiveId)?.version !== record.payload.sourceVersion);
  const mutate = async (record: OkrRecord, action: string) => {
    if (busy) return;
    if (action === 'return-change' && !feedback.trim()) { setError('请填写退回原因'); return; }
    setBusy(true); setError('');
    try { await okrRepository.update(record, action, { feedback, ...(action === 'return-change' && suggestedSource ? { suggestedSource } : {}) }, viewerId); await onRefresh(); setReview(undefined); setShowDetail(false); setShowSource(undefined); setFeedback(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '操作失败，请重试'); }
    finally { setBusy(false); }
  };
  if (!requests.length && !sync.length) return null;
  return <div className="okr-own-actions" aria-label="目标审核与同步">
    {error && <Alert type="error" title={error} showIcon/>}
    {requests.map(record => <Alert key={record.id} type="info" title={`${people.find(person => person.id === record.ownerId)?.name || '成员'}的${record.changeRequest?.purpose === 'delete' ? '目标删除申请' : record.changeRequest?.purpose === 'initial' ? '新目标' : record.changeRequest?.purpose === 'alignment' ? '对齐申请' : '目标修改'}待审核`} description={record.payload.title} action={<Button disabled={busy} onClick={() => { setShowDetail(false); setReview(record); setSuggestedSource(''); setFeedback(''); setError(''); }}>{record.changeRequest?.purpose === 'initial' ? '查看目标' : '查看修改'}</Button>}/>)}
    {sync.map(record => <Alert key={record.id} type="warning" title="上级目标已更新，请核对来源并确认同步" description={record.payload.title} action={<Button disabled={busy} onClick={() => setShowSource(record)}>查看来源变更</Button>}/>)}
    <Modal open={!!review && review.changeRequest?.purpose !== 'initial'} title={review?.changeRequest?.purpose === 'delete' ? '确认删除目标' : review?.changeRequest?.purpose === 'initial' ? '确认新目标' : '审核目标修改'} footer={null} mask={{ closable: false }} closable={!busy} keyboard={!busy} onCancel={() => { setReview(undefined); setShowDetail(false); }}>
      {review?.changeRequest && <><Descriptions column={1} items={[{ key: 'info', label: '修改信息', children: review.changeRequest.purpose === 'delete' ? '申请删除当前目标' : <GoalChangeSummary before={review.payload} after={review.changeRequest.payload} people={people}/> }, { key: 'reason', label: '修改原因', children: review.changeRequest.reason }]}/><Button onClick={() => setShowDetail(true)}>查看目标详情</Button><Select aria-label="建议补充对齐" allowClear placeholder="要求补充对齐（可选，退回时提供）" value={suggestedSource || undefined} options={records.filter(source=>source.ownerId===viewerId && source.periodKey===review?.periodKey && source.kind==='objective' && ['active','reviewed'].includes(source.status)).flatMap(source=>[{value:`${source.id}:`,label:`O · ${source.payload.title}`},...(source.payload.keyResults||[]).map(kr=>({value:`${source.id}:${kr.id}`,label:`KR · ${kr.title}`}))])} onChange={value=>setSuggestedSource(value || '')}/><Input.TextArea aria-label="审核意见" maxLength={1000} placeholder="审核意见（退回时必填）" value={feedback} disabled={busy} onChange={event => setFeedback(event.target.value)}/>{error && <Alert type="error" title={error}/>}<Space><Button danger disabled={busy} onClick={() => void mutate(review, 'return-change')}>退回修改</Button><Button type="primary" loading={busy} onClick={() => void mutate(review, 'approve-change')}>{review.changeRequest.purpose === 'delete' ? '确认删除' : '批准生效'}</Button></Space></>}
    </Modal>
    {showDetail && review?.changeRequest && <CompanyObjectiveDetail record={{...review, payload: review.changeRequest.payload}} records={records} people={people} work={work} workLoading={workLoading} workError={workError} onRetryWork={onRetryWork} onClose={() => setShowDetail(false)}/> }
    {review?.changeRequest?.purpose === 'initial' && <CompanyObjectiveDetail record={{...review, payload: review.changeRequest.payload}} records={records} people={people} work={work} workLoading={workLoading} workError={workError} onRetryWork={onRetryWork} onClose={() => setReview(undefined)} busy={busy} reviewFooter={<Space orientation="vertical" style={{width:'100%'}}><Input.TextArea aria-label="审核意见" placeholder="审核意见（退回时必填）" maxLength={1000} value={feedback} disabled={busy} onChange={event => setFeedback(event.target.value)}/>{error && <Alert type="error" title={error}/>}<Space><Button danger disabled={busy} onClick={() => void mutate(review, 'return-change')}>退回修改</Button><Button type="primary" loading={busy} onClick={() => void mutate(review, 'approve-change')}>批准生效</Button></Space></Space>}/>}
    <Modal open={!!showSource} title="确认上级目标同步" okText="确认已核对" cancelText="稍后处理" confirmLoading={busy} closable={!busy} mask={{ closable: false }} onCancel={() => setShowSource(undefined)} onOk={() => showSource && void mutate(showSource, 'acknowledge-source')}>
      {showSource && (() => {
        const source = records.find(record => record.id === showSource.payload.sourceObjectiveId);
        const sourceKr = source && sourceKeyResults(source).find(kr => kr.id === showSource.payload.sourceKrId);
        const next = sourceKr?.title || source?.payload.title || '来源已撤回，请联系上级';
        const previous = showSource.payload.sourceTitle || '未设置';
        const oldKr = showSource.payload.sourceKrData || (showSource.payload.goalLevel === 'personal' ? showSource.payload.keyResults?.[0] : undefined);
        const changes = oldKr && sourceKr ? goalDifferences({title:previous,keyResults:[oldKr]}, {title:next,keyResults:[{...sourceKr,id:oldKr.id,executionActions:oldKr.executionActions}]}, people) : [];
        return <div className="okr-source-sync-changes is-compact" aria-label="上级来源变化">
          {previous !== next && <div className="okr-source-sync-summary"><strong>对齐来源</strong><span className="is-before">{previous}</span><span aria-hidden="true">→</span><span className="is-after">{next}</span></div>}
          {changes.filter(row => row.label !== '目标内容').map(row => <div className="okr-source-sync-summary" key={row.id}><strong>{row.label}</strong><span className="is-before">{row.before}</span><span aria-hidden="true">→</span><span className="is-after">{row.after}</span></div>)}
          {!oldKr && source && <p>没有旧来源快照，无法逐项比较；请查看上级最新目标。</p>}
          {previous === next && !changes.length && oldKr && <p>来源版本已更新，本地未发现可见内容变化；请查看上级最新目标。</p>}
        </div>;
      })()}
      {error && <Alert type="error" title={error}/>}
    </Modal>
  </div>;
}
