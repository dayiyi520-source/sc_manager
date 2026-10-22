import { ReviewProgressCell } from './EmployeeReviewDetailTable';
import { completedActualHours } from './reviewActualHours';
import './supervisorReview.css';
import { Alert, Button, Collapse, Empty, Spin, Table, Tag } from 'antd';
import type { OkrWork, OkrKrReview } from '../../../services/okrRepository';
import type { EmployeeReviewSupport } from '../../../services/supervisorReview';
import { employeeEvidenceForKr } from '../../../services/supervisorSupportPanels';

export function SupervisorKrReviewCard({ review, supports, busy, editable, supportLoading, supportError, onRetry, onUpdate, onEmployeeSupport, viewerId, viewerName, selfAssigned = false, ownEvidence = [], onAddEvidence, onRemoveEvidence, assignedEmployees = [] }: {
  assignedEmployees?: Array<{ authorId: string; authorName: string }>;
  viewerId?: string; viewerName?: string; selfAssigned?: boolean; ownEvidence?: OkrWork[]; onAddEvidence?: () => void; onRemoveEvidence?: (id: string) => void;
  review: OkrKrReview; supports: EmployeeReviewSupport[];
  busy: boolean; editable: boolean; supportLoading: boolean; supportError?: unknown; onRetry?: () => void;
  onUpdate: (patch: Partial<OkrKrReview>) => void; onEmployeeSupport: (authorId: string, reportIds: string[]) => void;
}) {
  const snapshots = review.employeeReviewSnapshots || [];
  const viewed = new Set(review.viewedEmployeeReviewIds || []);
  const sourceReports = [
    ...supports.map(support => ({ authorId: support.record.ownerId, authorName: support.authorName, id: support.record.id, status: support.record.status, contributions: support.contributions })),
    ...snapshots.filter(snapshot => !supports.some(support => support.record.id === snapshot.id)).map(snapshot => ({ authorId: snapshot.authorId || snapshot.authorName || snapshot.id, authorName: snapshot.authorName || '人员已停用', id: snapshot.id, status: snapshot.status, contributions: snapshot.krReviews })),
  ];
  const groups = new Map(assignedEmployees.filter(person => person.authorId !== viewerId).map(person => [person.authorId, person]));
  const submittedReports = sourceReports.filter(report => groups.has(report.authorId) && ['submitted', 'reviewed', 'active'].includes(report.status));
  const pending = submittedReports.filter(report => report.status !== 'reviewed' && !viewed.has(report.id)).length;
  const employeeRows = [...groups.values()].map(group => {
    const reports = submittedReports.filter(report => report.authorId === group.authorId);
    const contributions = (review.contributors || []).filter(row => row.authorId === group.authorId && row.submitted);
    const values = contributions.length ? contributions : reports.flatMap(report => report.contributions);
    const average = (key: 'previousProgress' | 'currentProgress') => values.length ? String(Math.round(values.reduce((sum, row) => sum + row[key], 0) / values.length * 10) / 10) + '%' : '——';
    return { ...group, reports, previousProgress: reports.length ? average('previousProgress') : '——', currentProgress: reports.length ? average('currentProgress') : '——' };
  });
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
      ...(review.detailRows?.length ? [{ title: '迭代版本', dataIndex: 'version' }, { title: '阶段', dataIndex: 'stage' }, { title: '开始时间', dataIndex: 'plannedStartDate' }, { title: '结束时间', dataIndex: 'plannedEndDate' }] : []),
      { title: '进度', render: (_, row) => { const value = review.detailProgress?.find(item => item.id === row.id); return <span>{value?.previousProgress ?? 0}% → {value?.currentProgress ?? 0}%</span>; } },
      { title: '更改进度', key: 'self', render: (_: unknown, row: { id: string; name: string; assigneeIds?: string[] }) => {
        if (!(review.detailRows?.length ? row.assigneeIds?.includes(viewerId || '') : selfAssigned)) return '——';
        const contribution = review.contributors?.find(item => item.authorId === viewerId && item.detailId === row.id);
        const value = review.supervisorProgress?.find(item => item.id === row.id)?.currentProgress ?? contribution?.currentProgress ?? 0;
        return <ReviewProgressCell label={`${viewerName || '主管'}进度：${row.name}`} previous={contribution?.previousProgress ?? 0} value={value} disabled={busy || !editable || supportLoading || Boolean(supportError)} onChange={next => onUpdate({ supervisorProgress: [...(review.supervisorProgress || []).filter(item => item.id !== row.id), { id: row.id, currentProgress: next }] })}/>;
      } },
    ]}/>
    <div className="okr-supervisor-support-divider" aria-hidden="true"/>
    <div className="okr-supervisor-support-panels space-y-4">
      <Collapse defaultActiveKey={[]} expandIconPosition="end" items={[{
        key: 'employees', label: <div className="okr-supervisor-panel-title"><strong>员工复盘支撑</strong><span>{count(groups.size)}人相关 · {count(pending)}份待查看</span></div>,
        children: error || <Spin spinning={supportLoading}><Table size="small" pagination={false} rowKey="authorId" dataSource={employeeRows} locale={{ emptyText: <Empty description="暂无指派员工"/> }} columns={[
          { title: '员工', dataIndex: 'authorName' },
          { title: '复盘前进度', dataIndex: 'previousProgress' },
          { title: '当前进度', dataIndex: 'currentProgress' },
          { title: '是否提交', render: (_, row) => <Tag color={row.reports.length ? 'success' : 'default'}>{row.reports.length ? '已提交' : '未提交'}</Tag> },
          { title: '查看', render: (_, row) => <Button type="link" disabled={busy || !row.reports.length || supportLoading} onClick={() => onEmployeeSupport(row.authorId, row.reports.map(report => report.id))}>查看本期复盘</Button> },
        ]}/></Spin>,
      }]}/>
      <Collapse defaultActiveKey={['evidence']} expandIconPosition="end" items={[{
        key: 'evidence',
        label: <div className="okr-supervisor-panel-title"><strong>关联工作任务</strong><span>{count(new Set([...evidence.map(item => item.workId), ...ownEvidence.map(item => item.id)]).size)}项</span></div>,
        extra: <Button onClick={event => { event.stopPropagation(); onAddEvidence?.(); }} disabled={busy || !editable || supportLoading || Boolean(supportError)}>关联工作任务</Button>,
        children: <div aria-label="统一工作任务列表">
          {error ? error : <Spin spinning={supportLoading}><div className="border border-[var(--border-main)] rounded overflow-hidden bg-[var(--bg-card)]">
            <Table size="small" rowKey="id" pagination={false} dataSource={[...evidenceRows.values()]} locale={{ emptyText: <Empty description="暂无关联工作任务"/> }} columns={[
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
