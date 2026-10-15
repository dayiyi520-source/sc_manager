import { CircleIcon, CheckCircleIcon, AlertIcon, ClockIcon } from '@primer/octicons-react';
import './supervisorReview.css';
import { Alert, Button, Collapse, Empty, Spin, Table, Tag, InputNumber } from 'antd';
import type { OkrWork, OkrKrReview } from '../../../services/okrRepository';
import type { EmployeeReviewSupport } from '../../../services/supervisorReview';
import type { EmployeeActionGroup } from '../../../services/supervisorSupportPanels';
import { employeeEvidenceForKr } from '../../../services/supervisorSupportPanels';

export function SupervisorKrReviewCard({ review, employeeActions, supports, busy, editable, supportLoading, supportError, onRetry, onUpdate, onEmployeeSupport, viewerId, selfAssigned = false, ownEvidence = [], onAddEvidence, onRemoveEvidence }: {
  viewerId?: string; selfAssigned?: boolean; ownEvidence?: OkrWork[]; onAddEvidence?: () => void; onRemoveEvidence?: (id: string) => void;
  review: OkrKrReview; employeeActions: EmployeeActionGroup[]; supports: EmployeeReviewSupport[];
  busy: boolean; editable: boolean; supportLoading: boolean; supportError?: unknown; onRetry?: () => void;
  onUpdate: (patch: Partial<OkrKrReview>) => void; onEmployeeSupport: (authorId: string, reportIds: string[]) => void;
}) {
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
  const count = (value: number) => supportLoading || supportError ? '—' : value;
  const error = supportError ? <Alert type="error" showIcon title="员工复盘加载失败" action={<Button onClick={onRetry}>重试</Button>}/> : null;
  return <section className="space-y-4" aria-label={`主管 KR 复盘：${review.keyResultTitle}`}>
    <Table size="small" rowKey="id" pagination={false} scroll={{ x: true }} dataSource={review.detailRows?.length ? review.detailRows : [{ id: review.keyResultId, name: review.keyResultTitle }]} columns={[
      { title: review.detailRows?.length ? '产品' : 'KR名称', dataIndex: 'name', ellipsis: true },
      ...(review.detailRows?.length ? [{ title: '迭代版本', dataIndex: 'version' }, { title: '达成阶段', dataIndex: 'stage' }, { title: '开始时间', dataIndex: 'plannedStartDate' }, { title: '结束时间', dataIndex: 'plannedEndDate' }] : []),
      { title: '进度', render: (_, row) => { const value = review.detailProgress?.find(item => item.id === row.id); return `${value?.previousProgress ?? 0}% → ${value?.currentProgress ?? 0}%`; } },
      ...[...new Map((review.contributors || []).filter(item => item.authorId !== viewerId).map(item => [item.authorId, item.authorName])).entries()].map(([authorId, authorName]) => ({ title: authorName, key: `employee:${authorId}`, render: (_: unknown, row: { id: string }) => {
        const value = review.contributors?.find(item => item.authorId === authorId && item.detailId === row.id);
        return value ? `${value.previousProgress}% → ${value.currentProgress}%` : '—';
      } })),
      ...(selfAssigned ? [{ title: '本人进度', key: 'self', render: (_: unknown, row: { id: string; name: string }) => {
        const value = review.supervisorProgress?.find(item => item.id === row.id)?.currentProgress ?? review.contributors?.find(item => item.authorId === viewerId && item.detailId === row.id)?.currentProgress ?? 0;
        return <InputNumber aria-label={`本人进度：${row.name}`} min={0} max={100} precision={0} suffix="%" value={value} disabled={busy || !editable || supportLoading || Boolean(supportError)} onChange={next => onUpdate({ supervisorProgress: [...(review.supervisorProgress || []).filter(item => item.id !== row.id), { id: row.id, currentProgress: next ?? 0 }] })}/>;
      } }] : []),
    ]}/>
    <div className="okr-supervisor-support-divider" aria-hidden="true"/>
    <div className="okr-supervisor-support-panels space-y-4">
      <Collapse defaultActiveKey={['employees']} expandIconPosition="end" items={[{
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
              return <div key={`${action.objectiveId}:${action.id}`} className="flex flex-wrap items-center gap-2"><p className="break-words text-[var(--text-muted)]">个人动作：{action.title} · 当前进度{saved?.currentProgress ?? action.progress}%</p><span className="inline-flex items-center gap-1" style={{ color }}><Icon/>{health || '状态未记录'}</span></div>;
            })}</div>
            <div className="flex shrink-0 flex-wrap items-center gap-2"><Tag color={!reports.length ? 'default' : unread ? 'warning' : 'success'}>{!reports.length ? '未提交' : unread ? '待查看' : '已查看'}</Tag><Button type="link" disabled={busy || !reports.length || supportLoading} onClick={() => onEmployeeSupport(group.authorId, reports.map(report => report.id))}>查看本期复盘</Button></div>
          </article>;
        })}</div> : <Empty description="暂无对齐的员工动作"/>}</Spin>,
      }]}/>
      <Collapse defaultActiveKey={['evidence']} expandIconPosition="end" items={[{
        key: 'evidence', label: <div className="okr-supervisor-panel-title"><strong>关联工作证据</strong><span>{count(new Set([...evidence.map(item => item.workId), ...ownEvidence.map(item => item.id)]).size)}项</span></div>,
        children: <div className="space-y-4">{error || <Spin spinning={supportLoading}>{evidence.length ? <div className="okr-supervisor-employee-list">{evidence.map(item => <article key={item.workId} className="okr-supervisor-evidence-row">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong className="break-words">{item.title}</strong><span><Tag>{item.missing ? '引用失效' : item.workType === 'ticket' ? '协同事项' : '任务'}</Tag><Tag>{item.status}</Tag></span></div>
          <p className="text-xs text-[var(--text-muted)]">关联员工：{item.employeeNames.join('、')}</p>
          {item.result && <p className="whitespace-pre-wrap break-words">{item.result}</p>}
          {item.missing && <p className="text-xs text-[var(--warning)]">保留历史关联，当前未能读取这条工作证据。</p>}
        </article>)}</div> : <Empty description="暂无员工关联工作证据"/>}</Spin>}
          <section className="space-y-3" aria-label="主管本人工作证据">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>主管本人工作证据</strong><Button onClick={onAddEvidence} disabled={busy || !editable || supportLoading || Boolean(supportError)}>关联工作证据</Button></div>
            {ownEvidence.length ? ownEvidence.map(item => <article key={item.id} className="okr-supervisor-evidence-row"><div className="flex items-center justify-between gap-2"><strong>{item.title}</strong><Tag>{item.status}</Tag></div>{editable && <Button type="text" danger disabled={busy} aria-label={`移除本人证据：${item.title}`} onClick={() => onRemoveEvidence?.(item.id)}>移除</Button>}</article>) : <Empty description="暂无本人关联工作证据"/>}
          </section>
        </div>,
      }]}/>
    </div>

  </section>;
}
