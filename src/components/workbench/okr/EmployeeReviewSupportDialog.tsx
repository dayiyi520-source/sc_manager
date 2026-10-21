import { Alert, Button, Empty, Modal, Spin, Tag } from 'antd';
import type { OkrKrReview, OkrWeeklyReviewSnapshot } from '../../../services/okrRepository';
import type { EmployeeReviewSupport } from '../../../services/supervisorReview';

export function EmployeeReviewSupportDialog({ target, supports, savedSnapshots = target.employeeReviewSnapshots || [], loading, error, onRetry, onClose }: {
  target: OkrKrReview; supports: EmployeeReviewSupport[]; savedSnapshots?: OkrWeeklyReviewSnapshot[];
  loading: boolean; error?: unknown; onRetry?: () => void; onClose: () => void;
}) {
  const historical = savedSnapshots.filter(snapshot => !supports.some(support => support.record.id === snapshot.id));
  const rows = [
    ...supports.map(support => ({ id: support.record.id, status: support.record.status, authorName: support.authorName, title: support.record.payload.title, startDate: support.record.payload.startDate, endDate: support.record.payload.endDate, contributions: support.contributions, items: support.record.payload.items || [], historical: false })),
    ...historical.map(snapshot => ({ ...snapshot, contributions: snapshot.krReviews.map(row => ({ ...row, employeeReviewSnapshots: undefined })), historical: true })),
  ];
  return <Modal open title="员工复盘支撑" width={960} onCancel={onClose} footer={<Button onClick={onClose}>关闭</Button>}>
    <div className="space-y-4">
      <p className="break-words text-sm">{target.objectiveTitle} · {target.keyResultTitle}</p>
      <p className="text-xs text-[var(--text-muted)]">直属员工本周期已提交、且明确关联当前 KR 的复盘内容</p>
      {error ? <Alert type="error" showIcon title="员工复盘加载失败" action={<Button onClick={onRetry}>重试</Button>}/> : <Spin spinning={loading}>
        {rows.length ? <div className="space-y-4">{rows.map(row => <article key={row.id} className="space-y-3 rounded-md border border-[var(--border-main)] p-4">
          <header className="flex flex-wrap items-center justify-between gap-2"><strong>{row.authorName || '人员已停用'} · {row.title}</strong><Tag>{row.historical ? '已保存支撑' : row.status === 'reviewed' ? '已评价' : '已提交'}</Tag></header>
          <p className="text-xs text-[var(--text-muted)]">{row.startDate} 至 {row.endDate}</p>
          {row.contributions.map(contribution => <div key={`${contribution.objectiveId}:${contribution.keyResultId}`} className="space-y-2 border-t border-[var(--border-main)] pt-3">
            <div className="flex flex-wrap justify-between gap-2"><b className="break-words">{contribution.keyResultTitle}</b><span>{contribution.previousProgress}% → {contribution.currentProgress}%</span></div>
            {contribution.evidenceNote && <p className="whitespace-pre-wrap break-words">工作任务说明：{contribution.evidenceNote}</p>}
            {contribution.achievement && <p className="whitespace-pre-wrap break-words">本期成果：{contribution.achievement}</p>}
            {contribution.blocker && <p className="whitespace-pre-wrap break-words">风险与所需支持：{contribution.blocker}</p>}
            {contribution.nextPlan && <p className="whitespace-pre-wrap break-words">后续计划：{contribution.nextPlan}</p>}
            {(row.items || []).filter(item => contribution.workIds.includes(item.workId)).map(item => <p key={item.workId} className="break-words">{item.title} · {item.status}{item.result ? ` · ${item.result}` : ''}</p>)}
            {!contribution.evidenceNote && !contribution.achievement && !contribution.blocker && !contribution.workIds.length && <p className="text-xs text-[var(--text-muted)]">本期仅更新进度，暂无补充说明</p>}
          </div>)}
        </article>)}</div> : <Empty description="暂无员工复盘支撑"/>}
      </Spin>}
    </div>
  </Modal>;
}
