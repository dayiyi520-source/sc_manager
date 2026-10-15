import { useState } from 'react';
import { ReviewProgressCell } from './EmployeeReviewDetailTable';
import { completedActualHours } from './reviewActualHours';
import { CircleIcon, CheckCircleIcon, AlertIcon, ClockIcon } from '@primer/octicons-react';
import './supervisorReview.css';
import { Alert, Button, Collapse, Empty, Spin, Table, Tag, Modal } from 'antd';
import type { OkrWork, OkrKrReview } from '../../../services/okrRepository';
import type { EmployeeReviewSupport } from '../../../services/supervisorReview';
import type { EmployeeActionGroup } from '../../../services/supervisorSupportPanels';
import { employeeEvidenceForKr } from '../../../services/supervisorSupportPanels';

export function SupervisorKrReviewCard({ review, employeeActions, supports, busy, editable, supportLoading, supportError, onRetry, onUpdate, onEmployeeSupport, viewerId, viewerName, selfAssigned = false, ownEvidence = [], onAddEvidence, onRemoveEvidence }: {
  viewerId?: string; viewerName?: string; selfAssigned?: boolean; ownEvidence?: OkrWork[]; onAddEvidence?: () => void; onRemoveEvidence?: (id: string) => void;
  review: OkrKrReview; employeeActions: EmployeeActionGroup[]; supports: EmployeeReviewSupport[];
  busy: boolean; editable: boolean; supportLoading: boolean; supportError?: unknown; onRetry?: () => void;
  onUpdate: (patch: Partial<OkrKrReview>) => void; onEmployeeSupport: (authorId: string, reportIds: string[]) => void;
}) {
  const [progressDetailId, setProgressDetailId] = useState<string>();
  const snapshots = review.employeeReviewSnapshots || [];
  const viewed = new Set(review.viewedEmployeeReviewIds || []);
  const sourceReports = [
    ...supports.map(support => ({ authorId: support.record.ownerId, authorName: support.authorName, id: support.record.id, status: support.record.status, contributions: support.contributions })),
    ...snapshots.filter(snapshot => !supports.some(support => support.record.id === snapshot.id)).map(snapshot => ({ authorId: snapshot.authorId || snapshot.authorName || snapshot.id, authorName: snapshot.authorName || '人员已停用', id: snapshot.id, status: snapshot.status, contributions: snapshot.krReviews })),
  ];
  const groups = new Map(employeeActions.map(group => [group.authorId, group]));
  for (const report of sourceReports) {
    if (!groups.has(report.authorId)) groups.set(report.authorId, { authorId: report.authorId, authorName: report.authorName, actions: report.contributions.map(row => ({ id: row.keyResultId, objectiveId: row.objectiveId, title: row.keyResultTitle, progress: row.currentProgress })) });
  }
  const pending = sourceReports.filter(report => report.status !== 'reviewed' && !viewed.has(report.id)).length;
  const evidence = employeeEvidenceForKr(supports, snapshots);
  const evidenceRows = new Map(evidence.map(item => [item.workId, {
    id: item.workId, title: item.title, status: item.status, sourceLabel: item.sourceLabel || '—',
    hours: completedActualHours(item), sourceEmployees: item.employeeNames, removable: false,
  }]));
  for (const item of ownEvidence) {
    const previous = evidenceRows.get(item.id);
    evidenceRows.set(item.id, {
      id: item.id, title: previous?.title || item.title, status: previous?.status || item.status,
      sourceLabel: previous?.sourceLabel || [item.productLineName, item.versionName].filter(Boolean).join(' / ') || '—',
      hours: previous?.hours ?? completedActualHours(item), sourceEmployees: [...new Set([...(previous?.sourceEmployees || []), viewerName || '人员未设置'])], removable: true,
    });
  }
  const count = (value: number) => supportLoading || supportError ? '—' : value;
  const error = supportError ? <Alert type="error" showIcon title="员工复盘加载失败" action={<Button onClick={onRetry}>重试</Button>}/> : null;
  return <section className="space-y-4" aria-label={`主管 KR 复盘：${review.keyResultTitle}`}>
    <Table size="small" rowKey="id" pagination={false} scroll={{ x: true }} dataSource={review.detailRows?.length ? review.detailRows : [{ id: review.keyResultId, name: review.keyResultTitle }]} columns={[
      { title: review.detailRows?.length ? '产品' : 'KR名称', dataIndex: 'name', ellipsis: true },
      ...(review.detailRows?.length ? [{ title: '迭代版本', dataIndex: 'version' }, { title: '达成阶段', dataIndex: 'stage' }, { title: '开始时间', dataIndex: 'plannedStartDate' }, { title: '结束时间', dataIndex: 'plannedEndDate' }] : []),
      { title: '进度', render: (_, row) => { const value = review.detailProgress?.find(item => item.id === row.id); return <Button type="link" onClick={() => setProgressDetailId(row.id)}>{value?.previousProgress ?? 0}% → {value?.currentProgress ?? 0}%</Button>; } },
      { title: '更改进度', key: 'self', render: (_: unknown, row: { id: string; name: string; assigneeIds?: string[] }) => {
        if (!(review.detailRows?.length ? row.assigneeIds?.includes(viewerId || '') : selfAssigned)) return '——';
        const contribution = review.contributors?.find(item => item.authorId === viewerId && item.detailId === row.id);
        const value = review.supervisorProgress?.find(item => item.id === row.id)?.currentProgress ?? contribution?.currentProgress ?? 0;
        return <ReviewProgressCell label={`${viewerName || '主管'}进度：${row.name}`} previous={contribution?.previousProgress ?? 0} value={value} disabled={busy || !editable || supportLoading || Boolean(supportError)} onChange={next => onUpdate({ supervisorProgress: [...(review.supervisorProgress || []).filter(item => item.id !== row.id), { id: row.id, currentProgress: next }] })}/>;
      } },
    ]}/>
    <Modal open={Boolean(progressDetailId)} title="本期员工进度更新" onCancel={() => setProgressDetailId(undefined)} footer={<Button onClick={() => setProgressDetailId(undefined)}>关闭</Button>}>
      <Table size="small" pagination={false} rowKey="authorId" dataSource={(review.contributors || []).filter(row => row.detailId === progressDetailId && row.authorId !== viewerId && row.submitted)} columns={[{title:'员工姓名',dataIndex:'authorName'},{title:'复盘前进度',render:(_,row)=>`${row.previousProgress}%`},{title:'复盘后进度',render:(_,row)=>`${row.currentProgress}%`}]} locale={{emptyText:<Empty description="本期暂无已提交更新"/>}}/>
    </Modal>
    <div className="okr-supervisor-support-divider" aria-hidden="true"/>
    <div className="okr-supervisor-support-panels space-y-4">
      <Collapse defaultActiveKey={[]} expandIconPosition="end" items={[{
        key: 'employees', label: <div className="okr-supervisor-panel-title"><strong>员工复盘支撑</strong><span>{count(groups.size)}人相关 · {count(pending)}份待查看</span></div>,
        children: error || <Spin spinning={supportLoading}>{groups.size ? <div className="okr-supervisor-employee-list">{[...groups.values()].map(group => {
          const reports = sourceReports.filter(report => report.authorId === group.authorId);
          const unread = reports.some(report => report.status !== 'reviewed' && !viewed.has(report.id));
          return <article key={group.authorId} className="okr-supervisor-employee-row">
            <div className="min-w-0 space-y-2"><strong>{group.authorName}</strong>{group.actions.map(action => {
              const saved = reports.flatMap(report => report.contributions).find(row => row.objectiveId === action.objectiveId && row.keyResultId === action.id);
              const health = saved?.executionHealth;
              const Icon = health === '超预期' ? CheckCircleIcon : health === '正常' ? CircleIcon : health === '风险' ? AlertIcon : ClockIcon;
              const color = health === '超预期' ? 'var(--success)' : health === '风险' ? 'var(--warning)' : health === '逾期' ? 'var(--danger)' : 'var(--text-muted)';
              return <div key={`${action.objectiveId}:${action.id}`} className="flex flex-wrap items-center gap-2"><p className="break-words text-[var(--text-muted)]">个人动作：{action.title}</p><span className="inline-flex items-center gap-1" style={{ color }}><Icon/>{health || '状态未记录'}</span></div>;
            })}</div>
            <div className="flex shrink-0 flex-wrap items-center gap-2"><Tag color={!reports.length ? 'default' : unread ? 'warning' : 'success'}>{!reports.length ? '未提交' : unread ? '待查看' : '已查看'}</Tag><Button type="link" disabled={busy || !reports.length || supportLoading} onClick={() => onEmployeeSupport(group.authorId, reports.map(report => report.id))}>查看本期复盘</Button></div>
          </article>;
        })}</div> : <Empty description="暂无对齐的员工动作"/>}</Spin>,
      }]}/>
      <Collapse defaultActiveKey={['evidence']} expandIconPosition="end" items={[{
        key: 'evidence',
        label: <div className="okr-supervisor-panel-title"><strong>关联工作证据</strong><span>{count(new Set([...evidence.map(item => item.workId), ...ownEvidence.map(item => item.id)]).size)}项</span></div>,
        extra: <Button onClick={event => { event.stopPropagation(); onAddEvidence?.(); }} disabled={busy || !editable || supportLoading || Boolean(supportError)}>关联工作证据</Button>,
        children: <div aria-label="统一工作证据列表">
          {error ? error : <Spin spinning={supportLoading}><div className="border border-[var(--border-main)] rounded overflow-hidden bg-[var(--bg-card)]">
            <Table size="small" rowKey="id" pagination={false} dataSource={[...evidenceRows.values()]} locale={{ emptyText: <Empty description="暂无关联工作证据"/> }} columns={[
              { title: '标题', dataIndex: 'title', ellipsis: true },
              { title: '来源归属', dataIndex: 'sourceLabel', ellipsis: true },
              { title: '状态', dataIndex: 'status' },
              { title: '任务工时', render: (_, row) => row.hours == null ? '—' : `${row.hours} 小时` },
              { title: '来源员工', render: (_, row) => row.sourceEmployees.join('、') },
              { title: '操作', hidden: !editable, render: (_, row) => row.removable ? <Button type="text" danger disabled={busy} aria-label={`移除本人证据：${row.title}`} onClick={() => onRemoveEvidence?.(row.id)}>删除</Button> : '—' },
            ]}/>
          </div></Spin>}
        </div>,
      }]}/>
    </div>

  </section>;
}
