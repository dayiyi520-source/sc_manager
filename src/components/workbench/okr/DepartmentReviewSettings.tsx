import { useState } from 'react';
import { Alert, Button, Checkbox, Empty, Input, Modal, Table, Tag } from 'antd';
import { GearIcon } from '@primer/octicons-react';
import type { DepartmentReviewExclusion, OkrPayload, OkrPerson, OkrRecord } from '../../../services/okrRepository';
import { okrRepository } from '../../../services/okrRepository';
import { departmentRoundReviews } from '../../../services/departmentReviewSubmission';
import { ModernReviewReadOnlyView } from './ModernReviewReadOnlyView';
import type { PerformanceReview } from '../../../types';

export function DepartmentReviewSettings({ payload, records, people, ownerId, disabled, loading, error, onRefresh, onChange }: {
  payload: OkrPayload; records: OkrRecord[]; people: OkrPerson[]; ownerId: string; disabled: boolean; loading: boolean; error?: unknown;
  onRefresh?: () => void; onChange: (rows: DepartmentReviewExclusion[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DepartmentReviewExclusion[]>([]);
  const [message, setMessage] = useState('');
  const [reading, setReading] = useState<OkrRecord>();
  const [marking, setMarking] = useState(false);
  const rows = departmentRoundReviews(payload, records, people, ownerId);
  const selected = (id: string) => draft.find(row => row.employeeId === id);
  const person = people.find(row => row.id === reading?.ownerId);
  const report: PerformanceReview | undefined = reading ? {
    ...reading.payload, id: reading.id, type: reading.payload.reviewType || 'week', cycleName: reading.payload.title,
    author: person?.name || '人员已停用', authorDept: person?.department || '', summary: reading.payload.summary || '',
    selfScore: reading.payload.selfScore || 0, suggestions: reading.payload.suggestions || '', uncompletedReason: reading.payload.uncompletedReason || '',
    helpNeeded: reading.payload.helpNeeded || '', sendTo: reading.payload.sendTo || [], createdAt: reading.createdAt || '', status: reading.status as PerformanceReview['status'],
    linkedWorkItems: reading.payload.items?.map(item => ({ id: item.workId, title: item.title, type: item.workType || 'task', status: item.status })),
  } : undefined;
  return <>
    <Button aria-label="本轮提交设置" icon={<GearIcon/>} disabled={disabled || loading || Boolean(error)} onClick={() => { setDraft((payload.departmentReviewExclusions || []).map(row => ({ ...row }))); setMessage(''); setOpen(true); }}/>
    <Modal open={open} title={`本轮部门${payload.reviewType === 'month' ? '月报' : '周报'}提交设置`} width="80%" onCancel={() => { if (!marking) setOpen(false); }} okText="应用设置" cancelText="取消" okButtonProps={{ disabled: disabled || loading || Boolean(error) || marking }} onOk={() => {
      if (draft.some(row => !row.reason.trim())) { setMessage('请为每位排除员工填写原因'); return; }
      onChange(draft.map(row => ({ ...row, reason: row.reason.trim() }))); setOpen(false);
    }}>
      <div className="space-y-4">
        <p>{payload.startDate} 至 {payload.endDate}。排除仅对本轮生效，随草稿保存或提交；未排除员工必须已提交且主管已读。</p>
        {message && <Alert type="error" showIcon title={message}/>}
        {error && <Alert type="error" showIcon title="员工复盘加载失败" action={<Button onClick={onRefresh}>重试</Button>}/>}
        <Table loading={loading} rowKey={row => row.employee.id} pagination={false} dataSource={rows} locale={{ emptyText: <Empty description="暂无部门员工"/> }} columns={[
          { title: '员工', render: (_, row) => row.employee.name },
          { title: '本轮复盘', render: (_, row) => <Tag color={!row.review ? 'warning' : row.review.viewedBy?.includes(ownerId) ? 'success' : 'processing'}>{!row.review ? '未提交' : row.review.viewedBy?.includes(ownerId) ? '已读' : '未读'}</Tag> },
          { title: '查看', render: (_, row) => <Button type="link" disabled={!row.review || marking} onClick={() => { setMessage(''); setReading(row.review); }}>查看复盘</Button> },
          { title: '不计入本轮判断', render: (_, row) => <Checkbox aria-label={`排除${row.employee.name}`} disabled={disabled || loading || Boolean(error) || marking} checked={Boolean(selected(row.employee.id))} onChange={event => setDraft(current => event.target.checked ? [...current, { employeeId: row.employee.id, employeeName: row.employee.name, reason: '' }] : current.filter(item => item.employeeId !== row.employee.id))}/> },
          { title: '排除原因', render: (_, row) => <Input.TextArea aria-label={`${row.employee.name}排除原因`} autoSize={{ minRows: 1, maxRows: 3 }} maxLength={500} disabled={disabled || loading || Boolean(error) || marking || !selected(row.employee.id)} value={selected(row.employee.id)?.reason || ''} onChange={event => setDraft(current => current.map(item => item.employeeId === row.employee.id ? { ...item, reason: event.target.value } : item))} placeholder="请填写本轮排除原因"/> },
        ]}/>
      </div>
    </Modal>
    {reading && report && <Modal open title={reading.payload.title} width="80%" onCancel={() => { if (!marking) setReading(undefined); }} cancelText="关闭" okText="确认已读" confirmLoading={marking} onOk={async () => {
      setMarking(true);
      try { await okrRepository.markViewed(reading.id, ownerId); onRefresh?.(); setReading(undefined); }
      catch (cause) { setMessage(cause instanceof Error ? cause.message : '标记已读失败，请重试'); }
      finally { setMarking(false); }
    }}><ModernReviewReadOnlyView review={report}/>{message && <Alert type="error" title={message} showIcon/>}</Modal>}
  </>;
}
