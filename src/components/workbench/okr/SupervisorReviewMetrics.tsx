import { Skeleton } from 'antd';
import { AlertIcon, MeterIcon, PeopleIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import type { OKRItem } from '../../../types';
import type { OkrKrReview, OkrPerson, OkrRecord } from '../../../services/okrRepository';
import type { ReviewPeriod } from '../../../services/okrReviewRules';
import { employeeSupportsForKr } from '../../../services/supervisorReview';
import { supervisorObjectiveSummary } from '../../../services/supervisorSupportPanels';

export function supervisorReviewMetrics(objectives: OKRItem[], reviews: OkrKrReview[], records: OkrRecord[], people: OkrPerson[], supervisorId: string, period: ReviewPeriod) {
  const weight = objectives.reduce((sum, objective) => sum + objective.weight, 0);
  const summaries = objectives.map(objective => supervisorObjectiveSummary(objective, reviews.filter(row => row.objectiveId === objective.id), dayjs().format('YYYY-MM-DD')));
  // Department progress uses objective weights; each objective already aggregates its KR weights.
  const progress = (previous: boolean) => weight ? Math.round(objectives.reduce((sum, objective, index) => sum + objective.weight * (previous ? summaries[index].previousProgress : summaries[index].currentProgress), 0) / weight * 10) / 10 : 0;
  const memberIds = new Set(people.filter(person => supervisorId && person.supervisorId === supervisorId && person.id !== supervisorId).map(person => person.id));
  const submittedIds = new Set(records.filter(record => record.kind === 'review' && memberIds.has(record.ownerId)
    && ['submitted', 'reviewed', 'active'].includes(record.status) && record.payload.reviewType === 'week'
    && record.payload.startDate === period.startDate && record.payload.endDate === period.endDate).map(record => record.ownerId));
  const pendingRisks = new Set<string>();
  for (const review of reviews) {
    for (const support of employeeSupportsForKr(records, people, supervisorId, review, period)) {
      if (review.viewedEmployeeReviewIds?.includes(support.record.id)) continue;
      for (const contribution of support.contributions) {
        if (contribution.health === 'risk' || contribution.health === 'blocked') pendingRisks.add(`${support.record.id}/${contribution.objectiveId}/${contribution.keyResultId}`);
      }
    }
  }
  return { previousProgress: progress(true), currentProgress: progress(false), submitted: submittedIds.size, total: memberIds.size, pendingRisks: pendingRisks.size };
}

type Props = { objectives: OKRItem[]; reviews: OkrKrReview[]; records: OkrRecord[]; people: OkrPerson[]; supervisorId: string; period: ReviewPeriod; loading: boolean; error?: unknown };

export function SupervisorReviewMetrics({ objectives, reviews, records, people, supervisorId, period, loading, error }: Props) {
  const metrics = supervisorReviewMetrics(objectives, reviews, records, people, supervisorId, period);
  const cards = [
    { title: '部门月目标进度', icon: <MeterIcon/>, value: `${metrics.previousProgress}% → ${metrics.currentProgress}%`, note: '上周进度 → 当前进度' },
    { title: '员工已提交', icon: <PeopleIcon/>, value: `${metrics.submitted}/${metrics.total}`, note: '本期已提交人数 / 直属员工总人数' },
    { title: '待确认风险', icon: <AlertIcon/>, value: `${metrics.pendingRisks}`, note: '尚未查看的员工风险与阻塞项' },
  ];
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="部门周报指标" aria-busy={loading}>
    {cards.map(card => <section key={card.title} aria-label={card.title} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 transition-colors hover:border-[var(--border-subtle)]">
      <div className="flex items-center gap-2 text-sm text-[var(--text-body)]">{card.icon}<span>{card.title}</span></div>
      <div className="my-2 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
        {loading ? <Skeleton active paragraph={false} title/> : error ? <span className="text-sm text-[var(--danger)]">加载失败</span> : card.value}
      </div>
      <p className="m-0 text-xs text-[var(--text-muted)]">{card.note}</p>
    </section>)}
  </div>;
}
