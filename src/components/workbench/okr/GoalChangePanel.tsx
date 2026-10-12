import { sourceKeyResults } from '../../../services/okrThreeLevelRules';
import React, { useState } from 'react';
import { Alert, Button, Descriptions, Input, Modal, Space, Tag, Typography, Select } from 'antd';
import { okrRepository, type OkrRecord, type OkrPerson } from '../../../services/okrRepository';

export function GoalChangePanel({ records, people, viewerId, onRefresh }: { records: OkrRecord[]; people: OkrPerson[]; viewerId: string; onRefresh: () => Promise<unknown> }) {
  const [review, setReview] = useState<OkrRecord>();
  const [suggestedSource, setSuggestedSource] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showSource, setShowSource] = useState<OkrRecord>();
  const requests = records.filter(record => record.changeRequest?.status === 'pending' && record.changeRequest.reviewerId === viewerId);
  const ownRequests = records.filter(record => record.ownerId === viewerId && record.changeRequest?.status === 'pending');
  const sync = records.filter(record => record.ownerId === viewerId && !record.payload.inherited && record.payload.sourceObjectiveId && records.find(source => source.id === record.payload.sourceObjectiveId)?.version !== record.payload.sourceVersion);
  const mutate = async (record: OkrRecord, action: string) => {
    if (busy) return;
    if (action === 'return-change' && !feedback.trim()) { setError('请填写退回原因'); return; }
    setBusy(true); setError('');
    try { await okrRepository.update(record, action, { feedback, ...(action === 'return-change' && suggestedSource ? { suggestedSource } : {}) }, viewerId); await onRefresh(); setReview(undefined); setShowSource(undefined); setFeedback(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '操作失败，请重试'); }
    finally { setBusy(false); }
  };
  if (!requests.length && !ownRequests.length && !sync.length) return null;
  return <div className="okr-own-actions" aria-label="目标审核与同步">
    {error && <Alert type="error" title={error} showIcon/>}
    {requests.map(record => <Alert key={record.id} type="info" title={`${people.find(person => person.id === record.ownerId)?.name || '成员'}的${record.changeRequest?.purpose === 'initial' ? '自主目标' : record.changeRequest?.purpose === 'alignment' ? '对齐申请' : '目标修改'}待审核`} description={record.payload.title} action={<Button disabled={busy} onClick={() => { setReview(record); setSuggestedSource(''); setFeedback(''); setError(''); }}>查看修改</Button>}/>)}
    {ownRequests.map(record => <Alert key={record.id} type="info" title={`“${record.payload.title}”的申请待审核`} action={<Button disabled={busy} onClick={() => void mutate(record, 'withdraw-change')}>撤回申请</Button>}/>)}
    {sync.map(record => <Alert key={record.id} type="warning" title="上级目标已更新，请核对来源并确认同步" description={record.payload.title} action={<Button disabled={busy} onClick={() => setShowSource(record)}>查看来源变更</Button>}/>)}
    <Modal open={!!review} title={review?.changeRequest?.purpose === 'initial' ? '审核自主目标' : '审核目标修改'} footer={null} mask={{ closable: false }} closable={!busy} keyboard={!busy} onCancel={() => setReview(undefined)}>
      {review?.changeRequest && <><Descriptions column={1} items={[{ key: 'reason', label: '修改原因', children: review.changeRequest.reason },{ key: 'before', label: '生效目标', children: review.payload.title },{ key: 'after', label: '申请目标', children: review.changeRequest.payload.title }]}/><Typography.Text strong>关键结果与本人动作变更</Typography.Text>{[...new Set([...(review.payload.keyResults || []).map(kr => kr.id), ...(review.changeRequest.payload.keyResults || []).map(kr => kr.id)])].map(id => { const previous = review.payload.keyResults?.find(kr => kr.id === id); const next = review.changeRequest?.payload.keyResults?.find(kr => kr.id === id); return <div key={id} className="okr-own-actions"><Tag>{!previous ? '新增 KR' : !next ? '移除 KR' : 'KR 对比'}</Tag><p>{previous?.title || '无'} → {next?.title || '无'}</p><p>原计划：{previous?.deadline || next?.deadline || '未设置'}；预计：{previous?.forecastDeadline || '未设置'} → {next?.forecastDeadline || '未设置'}；权重：{previous?.weight ?? '无'} → {next?.weight ?? '无'}%</p><p>业务内容：{[previous?.businessObject, previous?.version, previous?.stage, previous?.action, previous?.result].filter(Boolean).join(' / ') || '无'} → {[next?.businessObject, next?.version, next?.stage, next?.action, next?.result].filter(Boolean).join(' / ') || '无'}</p><p>承接人员：{previous?.assigneeIds?.map(id => people.find(person => person.id === id)?.name || id).join('、') || '无'} → {next?.assigneeIds?.map(id => people.find(person => person.id === id)?.name || id).join('、') || '无'}</p>{(next?.executionActions || []).map(action => { const old = previous?.executionActions?.find(item => item.id === action.id); return <p key={action.id}>A：{old?.title || '新增'} → {action.title}；预计：{action.forecastDeadline || action.deadline || '未设置'}；实际完成：{action.actualCompletedAt || '未完成'}；延期原因：{action.delayReason || '无'}</p>; })}{(previous?.executionActions || []).filter(action => !next?.executionActions?.some(item => item.id === action.id)).map(action => <p key={action.id}>移除 A：{action.title}</p>)}</div>; })}<Select aria-label="建议补充对齐" allowClear placeholder="要求补充对齐（可选，退回时提供）" value={suggestedSource || undefined} options={records.filter(source=>source.ownerId===viewerId && source.periodKey===review?.periodKey && source.kind==='objective' && ['active','reviewed'].includes(source.status)).flatMap(source=>[{value:`${source.id}:`,label:`O · ${source.payload.title}`},...(source.payload.keyResults||[]).map(kr=>({value:`${source.id}:${kr.id}`,label:`KR · ${kr.title}`}))])} onChange={value=>setSuggestedSource(value || '')}/><Input.TextArea aria-label="审核意见" maxLength={1000} placeholder="审核意见（退回时必填）" value={feedback} disabled={busy} onChange={event => setFeedback(event.target.value)}/>{error && <Alert type="error" title={error}/>}<Space><Button danger disabled={busy} onClick={() => void mutate(review, 'return-change')}>退回修改</Button><Button type="primary" loading={busy} onClick={() => void mutate(review, 'approve-change')}>批准生效</Button></Space></>}
    </Modal>
    <Modal open={!!showSource} title="确认上级目标同步" okText="确认已核对" cancelText="稍后处理" confirmLoading={busy} closable={!busy} mask={{ closable: false }} onCancel={() => setShowSource(undefined)} onOk={() => showSource && void mutate(showSource, 'acknowledge-source')}>
      <p>此前关联：{showSource?.payload.sourceTitle}</p><p>当前来源：{(() => { const source = records.find(record => record.id === showSource?.payload.sourceObjectiveId); return source ? sourceKeyResults(source).find(kr => kr.id === showSource?.payload.sourceKrId)?.title || source.payload.title : '来源已撤回，请联系上级'; })()}</p><p>确认后保留本人已填写的目标与动作；需要调整部门计划时请提交修改申请。</p>{error && <Alert type="error" title={error}/>}
    </Modal>
  </div>;
}
