import './supervisorReview.css';
import { Alert, Button, Collapse, Empty, Input, InputNumber, Radio, Spin, Tag } from 'antd';
import type { OkrKrReview } from '../../../services/okrRepository';
import type { EmployeeReviewSupport } from '../../../services/supervisorReview';
import type { EmployeeActionGroup } from '../../../services/supervisorSupportPanels';
import { employeeEvidenceForKr } from '../../../services/supervisorSupportPanels';
import { ReviewRiskCallout } from './ReviewRiskCallout';

export function SupervisorKrReviewCard({ review, employeeActions, supports, busy, editable, supportLoading, supportError, onRetry, onUpdate, onEmployeeSupport }: {
  review: OkrKrReview; employeeActions: EmployeeActionGroup[]; supports: EmployeeReviewSupport[];
  busy: boolean; editable: boolean; supportLoading: boolean; supportError?: unknown; onRetry?: () => void;
  onUpdate: (patch: Partial<OkrKrReview>) => void; onEmployeeSupport: (authorId: string, reportIds: string[]) => void;
}) {
  const disabled = busy || !editable;
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
    <div className="okr-supervisor-kr-change flex flex-wrap items-center gap-4 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-xs">
      <span>KR 变化：<strong>{review.previousProgress}% → {review.currentProgress}%</strong></span>
      <label className="flex items-center gap-2"><span className="shrink-0 whitespace-nowrap">本期进度</span><InputNumber aria-label={`${review.keyResultTitle}本期进度`} min={0} max={100} precision={0} suffix="%" value={review.currentProgress} disabled={disabled} onChange={value => onUpdate({ currentProgress: value ?? 0 })}/></label>
      <Radio.Group value={review.health} disabled={disabled} onChange={event => onUpdate({ health: event.target.value })} aria-label={`${review.keyResultTitle}健康状态`}><Radio value="normal">正常</Radio><Radio value="risk">有风险</Radio><Radio value="blocked">已阻塞</Radio></Radio.Group>
    </div>
    {review.health !== 'normal' && <ReviewRiskCallout value={review.blocker} label={`${review.keyResultTitle}风险原因`} disabled={disabled} onChange={value => onUpdate({ blocker: value })}/>}
    <div className="okr-supervisor-support-divider" aria-hidden="true"/>
    <div className="okr-supervisor-support-panels space-y-4">
      <Collapse defaultActiveKey={['employees']} expandIconPosition="end" items={[{
        key: 'employees', label: <div className="okr-supervisor-panel-title"><strong>员工复盘支撑</strong><span>{count(groups.size)}人相关 · {count(pending)}份待查看</span></div>,
        children: error || <Spin spinning={supportLoading}>{groups.size ? <div className="okr-supervisor-employee-list">{[...groups.values()].map(group => {
          const reports = sourceReports.filter(report => report.authorId === group.authorId);
          const unread = reports.some(report => report.status !== 'reviewed' && !viewed.has(report.id));
          return <article key={group.authorId} className="okr-supervisor-employee-row">
            <div className="min-w-0 space-y-2"><strong>{group.authorName}</strong>{group.actions.map(action => <p key={`${action.objectiveId}:${action.id}`} className="break-words text-[var(--text-muted)]">个人 A：{action.title} · 当前进度{action.progress}%</p>)}</div>
            <div className="flex shrink-0 flex-wrap items-center gap-2"><Tag color={!reports.length ? 'default' : unread ? 'warning' : 'success'}>{!reports.length ? '未提交' : unread ? '待查看' : '已查看'}</Tag><Button type="link" disabled={busy || !reports.length || supportLoading} onClick={() => onEmployeeSupport(group.authorId, reports.map(report => report.id))}>查看本期复盘</Button></div>
          </article>;
        })}</div> : <Empty description="暂无对齐的员工 A"/>}</Spin>,
      }]}/>
      <Collapse defaultActiveKey={['evidence']} expandIconPosition="end" items={[{
        key: 'evidence', label: <div className="okr-supervisor-panel-title"><strong>关联工作证据</strong><span>{count(evidence.length)}项</span></div>,
        children: error || <Spin spinning={supportLoading}>{evidence.length ? <div className="okr-supervisor-employee-list">{evidence.map(item => <article key={item.workId} className="okr-supervisor-evidence-row">
          <div className="flex flex-wrap items-center justify-between gap-2"><strong className="break-words">{item.title}</strong><span><Tag>{item.missing ? '引用失效' : item.workType === 'ticket' ? '协同事项' : '任务'}</Tag><Tag>{item.status}</Tag></span></div>
          <p className="text-xs text-[var(--text-muted)]">关联员工：{item.employeeNames.join('、')}</p>
          {item.result && <p className="whitespace-pre-wrap break-words">{item.result}</p>}
          {item.missing && <p className="text-xs text-[var(--warning)]">保留历史关联，当前未能读取这条工作证据。</p>}
        </article>)}</div> : <Empty description="暂无员工关联工作证据"/>}</Spin>,
      }]}/>
    </div>
    <label className="block space-y-2"><span className="text-sm font-semibold">主管判断与协调</span><Input.TextArea className="okr-supervisor-judgment" aria-label={`${review.keyResultTitle}主管判断与协调`} placeholder="填写对 KR 进展的判断、需要协调的资源与后续安排" value={review.supervisorJudgment || ''} disabled={disabled} maxLength={10000} showCount rows={4} onChange={event => onUpdate({ supervisorJudgment: event.target.value })}/></label>
  </section>;
}
