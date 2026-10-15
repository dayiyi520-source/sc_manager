import { Button, Progress, Tag } from 'antd';
import { BookIcon, ChecklistIcon, PeopleIcon } from '@primer/octicons-react';
import type { PerformanceReview } from '../../../types';

export function MyReviewCard({ review, onView, onCopy, onSubmit, departmentProgress }: { key?: string; departmentProgress?: number; review: PerformanceReview; onView: () => void; onCopy?: () => void; onSubmit: () => void }) {
  const plans = review.krReviews || [];
  const progress = review.reviewMode === 'supervisor' ? departmentProgress ?? 0 : plans.length ? Math.round(plans.reduce((sum, row) => sum + row.currentProgress, 0) / plans.length) : 0;
  const risks = plans.filter(row => row.health !== 'normal').length;
  const monthly = review.type === 'month';
  const department = review.reviewMode === 'supervisor';
  const preview = monthly ? review.suggestions : review.nextWeekPlan;
  const stats = [{ label: '工作证据', value: new Set(review.linkedWorkItems?.map(row => row.id)).size, Icon: ChecklistIcon }, { label: '协助', value: review.assistance?.length || 0, Icon: PeopleIcon }, { label: '知识', value: review.knowledgeEntries?.length || 0, Icon: BookIcon }];
  return <article className="okr-my-review-card rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4" aria-label={`${review.cycleName}复盘卡片`}>
    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><Tag color={review.type === 'week' ? 'blue' : 'purple'}>{department ? monthly ? '部门月报' : '部门周报' : monthly ? '月报' : '周报'}</Tag><h3 className="my-3 text-base font-semibold truncate" title={review.cycleName}>{review.cycleName}</h3><p className="text-xs text-[var(--text-muted)]">{review.authorDept || '部门未设置'} · {review.createdAt}</p></div><Tag color={review.status === 'reviewed' ? 'success' : review.status === 'submitted' ? 'processing' : 'default'}>{review.status === 'reviewed' ? '已评价' : review.status === 'submitted' ? '已提交' : '草稿'}</Tag></div>
    <div className="py-4"><div className="flex justify-between text-sm"><span>{review.reviewMode === 'supervisor' ? '部门目标整体进度' : '我的计划进度'}</span><strong>{review.reviewMode === 'supervisor' ? departmentProgress == null ? '未记录' : `${progress}%` : plans.length ? `${progress}%` : '—'}</strong></div><Progress percent={progress} showInfo={false}/><p className="text-xs text-[var(--text-muted)]">{plans.length} 项{review.reviewMode === 'supervisor' ? 'KR' : '计划'} · {risks} 项风险或逾期</p></div>
    {monthly && <div className="grid grid-cols-2 gap-3 mb-4" aria-label="月度统计"><div className="rounded border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3"><p className="text-xs text-[var(--text-muted)]">本月任务</p><strong>{review.monthlyMetrics?.taskCount ?? '—'}</strong></div><div className="rounded border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3"><p className="text-xs text-[var(--text-muted)]">总工时</p><strong>{review.monthlyMetrics?.totalHours == null ? '—' : `${review.monthlyMetrics.totalHours} 小时`}</strong></div></div>}
    <div className="grid grid-cols-3 gap-3" aria-label="复盘内容统计">{stats.map(({ label, value, Icon }) => <div key={label} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-3 space-y-2"><span className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Icon/>{label}</span><strong className="block text-lg tabular-nums">{value}</strong></div>)}</div>
    {department && review.summary && <div className="my-4 text-sm"><b>{monthly ? '本月部门补充总结' : '部门补充总结'}</b><p className="line-clamp-2 whitespace-pre-wrap text-[var(--text-body)]">{review.summary}</p></div>}
    {preview && <div className="my-4 text-sm"><b>{monthly ? department ? '部门反馈问题梳理与分析' : '问题与建议' : department ? '部门下周计划' : '下周计划'}</b><p className="line-clamp-2 whitespace-pre-wrap text-[var(--text-body)]">{preview}</p></div>}
    <div className="flex flex-wrap justify-end gap-2 mt-4">{review.status === 'draft' && <Button type="primary" onClick={onSubmit}>提交</Button>}<Button onClick={onView}>查看详情</Button>{onCopy && <Button onClick={onCopy}>复制为本期</Button>}</div>
  </article>;
}
