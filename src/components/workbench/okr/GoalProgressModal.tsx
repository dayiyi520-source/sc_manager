import React from 'react';
import { Button, Empty, Modal } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import type { OkrRecord, OkrPerson } from '../../../services/okrRepository';
import { progressSubject } from '../../../services/okrProgress';
const statuses = [{value:'ahead',label:'超预期'},{value:'normal',label:'正常'},{value:'risk',label:'风险'},{value:'overdue',label:'逾期'}];
export function GoalProgressModal({ record, itemId, people, onClose }: { key?: React.Key; record: OkrRecord; itemId: string; records: OkrRecord[]; people: OkrPerson[]; viewerId: string; onClose: () => void; onRefresh: () => Promise<unknown> }) {
  const subject = progressSubject(record, itemId);
  const entries = (record.progressHistory || []).filter(entry => entry.itemId === itemId);
  const points = [{ time: dayjs(record.createdAt).format('MM-DD HH:mm'), progress: entries[0]?.previousProgress ?? subject?.progress ?? 0 }, ...entries.map(entry => ({ time: dayjs(entry.createdAt).format('MM-DD HH:mm'), progress: entry.progress }))];
  return <Modal open width={1000} title={`历史进度 / ${subject?.title || record.payload.title}`} onCancel={onClose} footer={<Button onClick={onClose}>关闭</Button>}><div className="okr-progress-layout is-history"><section className="okr-progress-chart"><h3>进度变化</h3><ResponsiveContainer width="100%" height={360}><LineChart data={points}><CartesianGrid stroke="var(--border-main)"/><XAxis dataKey="time"/><YAxis domain={[0, 100]} unit="%"/><Tooltip/><Line dataKey="progress" name="当前进度" stroke="var(--primary)" strokeWidth={2} isAnimationActive={false}/></LineChart></ResponsiveContainer></section><section className="okr-progress-records"><h3>更新记录</h3>{entries.length ? [...entries].reverse().map(entry => <article key={entry.id}><strong>{people.find(person => person.id === entry.operatorId)?.name || '未知人员'} · {entry.previousProgress}% → {entry.progress}%</strong><p>{dayjs(entry.createdAt).format('YYYY-MM-DD HH:mm')} · {statuses.find(item => item.value === entry.status)?.label}</p><p className="okr-progress-note">{entry.note}</p>{entry.attachments.map((file, i) => <a key={i} href={file.data} download={file.name}>{file.name}</a>)}</article>) : <Empty description="暂无更新记录"/>}</section></div></Modal>;
}
