import React, { useState } from 'react';
import { Alert, Button, Empty, Input, InputNumber, Modal, Radio, Upload } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import { okrRepository, type OkrRecord, type OkrPerson, type OkrProgressEntry } from '../../../services/okrRepository';
import { canUpdateProgress, progressSubject } from '../../../services/okrProgress';

const statuses = [{ value: 'ahead', label: '超预期' }, { value: 'normal', label: '正常' }, { value: 'risk', label: '风险' }, { value: 'overdue', label: '逾期' }];
export function GoalProgressModal({ record, itemId, records, people, viewerId, onClose, onRefresh }: { key?: React.Key; record: OkrRecord; itemId: string; records: OkrRecord[]; people: OkrPerson[]; viewerId: string; onClose: () => void; onRefresh: () => Promise<unknown> }) {
  const subject = progressSubject(record, itemId);
  const editable = canUpdateProgress(record, itemId, viewerId, records);
  const [history, setHistory] = useState(!editable);
  const [progress, setProgress] = useState(subject?.progress || 0);
  const entries = (record.progressHistory || []).filter(entry => entry.itemId === itemId);
  const [status, setStatus] = useState<OkrProgressEntry['status']>(entries.at(-1)?.status || 'normal');
  const [note, setNote] = useState('');
  const [attachments, setAttachments] = useState<OkrProgressEntry['attachments']>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const points = [{ time: dayjs(record.createdAt).format('MM-DD HH:mm'), progress: entries[0]?.previousProgress ?? subject?.progress ?? 0 }, ...entries.map(entry => ({ time: dayjs(entry.createdAt).format('MM-DD HH:mm'), progress: entry.progress }))];
  const save = async () => {
    if (busy || !editable) return;
    if (!note.trim()) { setError('请填写更新说明'); return; }
    setBusy(true); setError('');
    try { await okrRepository.update(record, 'update-progress', { itemId, progress, progressStatus: status, note, attachments }, viewerId); await onRefresh(); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '进度更新失败'); }
    finally { setBusy(false); }
  };
  return <Modal open className="okr-progress-modal" width={1000} title={<div className="okr-progress-title">{history ? '历史进度' : '更新进度'}<span className="okr-progress-title-divider">/</span> <span title={subject?.title}>{subject?.title}</span></div>} mask={{ closable: !busy }} closable={!busy} onCancel={onClose} footer={history ? <Button disabled={busy} onClick={() => setHistory(false)}>更新进度</Button> : <div className="okr-progress-footer"><Button type="link" disabled={busy} onClick={() => setHistory(true)}>查看历史进度</Button><span/><Button disabled={busy} onClick={onClose}>取消</Button><Button type="primary" disabled={!editable} loading={busy} onClick={() => void save()}>更新进度</Button></div>}>
    {!history && !editable && <Alert className="okr-progress-readonly" type="info" showIcon title="当前进度仅可查看，不能修改"/>}
    {error && <Alert type="error" title={error} showIcon/>}
    {history ? <div className="okr-progress-layout is-history"><section className="okr-progress-chart"><h3>进度变化</h3><ResponsiveContainer width="100%" height={360}><LineChart data={points}><CartesianGrid stroke="var(--border-main)"/><XAxis dataKey="time"/><YAxis domain={[0, 100]} unit="%"/><Tooltip/><Line dataKey="progress" name="当前进度" stroke="var(--primary)" strokeWidth={2} isAnimationActive={false}/></LineChart></ResponsiveContainer></section><section className="okr-progress-records"><h3>更新记录</h3>{entries.length ? [...entries].reverse().map(entry => <article key={entry.id}><strong>{people.find(person => person.id === entry.operatorId)?.name || '未知人员'} · {entry.previousProgress}% → {entry.progress}%</strong><p>{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')} · {statuses.find(item => item.value === entry.status)?.label}</p><p className="okr-progress-note">{entry.note}</p>{entry.attachments.map((file, i) => <a key={i} href={file.data} download={file.name}>{file.name}</a>)}</article>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无更新记录"/>}</section></div> : <div className="okr-progress-layout is-update"><section className="okr-progress-values"><h3>当前进度</h3><InputNumber aria-label="当前进度" min={0} max={100} precision={0} suffix="%" value={progress} disabled={busy || !editable} onChange={value => setProgress(value ?? 0)}/><p>起始值：0% → 目标值：100%</p><h3>状态</h3><Radio.Group aria-label="进度状态" className="okr-progress-status-options" value={status} disabled={busy || !editable} onChange={event => setStatus(event.target.value)}>{statuses.map(item => <Radio key={item.value} value={item.value} className={`okr-progress-status is-${item.value}`}>{item.label}</Radio>)}</Radio.Group></section><section className="okr-progress-update"><h3><span className="okr-required-marker">*</span> 更新说明</h3><Input.TextArea aria-label="更新说明" aria-required="true" rows={10} maxLength={2000} value={note} disabled={busy || !editable} onChange={event => setNote(event.target.value)}/><h3>附件 <span className="okr-progress-optional">选填 · 最多 3 个，总大小 1MB</span></h3><Upload disabled={busy || !editable} fileList={attachments.map((file, i) => ({ uid: String(i), name: file.name, status: 'done' }))} onRemove={file => { if (!editable || busy) return false; setAttachments(items => items.filter((_, i) => String(i) !== file.uid)); }} beforeUpload={async file => {
      if (!editable || busy) return Upload.LIST_IGNORE;
      if (attachments.length >= 3 || file.size > 1024 * 1024) { setError('附件最多 3 个，总大小不能超过 1MB'); return Upload.LIST_IGNORE; }
      try { const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); setAttachments(items => { if (items.length >= 3 || items.reduce((sum, item) => sum + item.data.length, data.length) > 1400000) { setError('附件最多 3 个，总大小不能超过 1MB'); return items; } return [...items, { name: file.name, data }]; }); } catch { setError('附件读取失败，请重新选择'); } return Upload.LIST_IGNORE;
    }}><Button disabled={busy || !editable}>添加附件</Button></Upload></section></div>}
  </Modal>;
}
