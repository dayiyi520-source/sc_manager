import { MonthlyOverview } from './MonthlyOverview';
import { KnowledgeAttachments } from '../KnowledgeAttachments';
import { ModernReviewReadOnlyView } from './ModernReviewReadOnlyView';
import React, { useState } from 'react';
import type { OkrKrReview } from '../../../services/okrRepository';
import { completedActualHours } from './reviewActualHours';
import { EmployeeReviewSupportDialog } from './EmployeeReviewSupportDialog';
import { Button, Empty, Progress, Table, Tag } from 'antd';
import type { PerformanceReview } from '../../../types';
import { AlertTriangle, CheckCircle, FileText, Target } from '@/components/common/octicons-compat';

type ReviewReadOnlyViewProps = {
  review: PerformanceReview & { authorId: string };
  onBack: () => void;
  onCopy: () => void;
};

const statusLabel = {
  draft: '草稿',
  submitted: '已提交',
  reviewed: '已评价',
} as const;

const statusColor = {
  draft: 'default',
  submitted: 'processing',
  reviewed: 'success',
} as const;

type StoredExtraWork = { content?: string; source?: string; status?: string; hours?: string; impact?: string };

const parseExtraWork = (description?: string): StoredExtraWork[] => {
  if (!description?.startsWith('[')) return [];
  try {
    const parsed: unknown = JSON.parse(description);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is StoredExtraWork => typeof item === 'object' && item !== null)
      : [];
  } catch {
    return [];
  }
};

export function ReviewReadOnlyView({ review, onBack, onCopy }: ReviewReadOnlyViewProps) {
  const [supportTarget, setSupportTarget] = useState<OkrKrReview | null>(null);
  const krReviews = review.krReviews || [];
  const extraWorkRows = parseExtraWork(review.extraWork?.description);
  const average = krReviews.length
    ? Math.round(krReviews.reduce((sum, kr) => sum + kr.currentProgress, 0) / krReviews.length)
    : review.selfScore;

  if (['structured', 'monthly', 'supervisor'].includes(review.reviewMode || '')) return <ModernReviewReadOnlyView review={review} onBack={onBack} onCopy={onCopy}/>;
  return (
    <div className={`okr-review-readonly${review.type === 'month' ? ' okr-review-readonly-month' : ''}`} role="region" aria-label={`${review.cycleName}只读详情`}>
      <header className="okr-review-readonly-header">
        <div className="okr-review-readonly-heading">
          <div>
            <div className="okr-review-readonly-tags">
              <Tag color={review.type === 'week' ? 'blue' : 'purple'}>{review.type === 'week' ? '周报复盘' : '月报复盘'}</Tag>
              <Tag color={statusColor[review.status]}>{statusLabel[review.status]}</Tag>
              <Tag>只读</Tag>
            </div>
            <h2>{review.cycleName}</h2>
            <p>{review.author} · {review.authorDept} · {review.createdAt}</p>
          </div>
        </div>
        <div className="okr-review-readonly-actions">
          <Button aria-label="取消" onClick={onBack}>取消</Button>
          <Button type="primary" onClick={onCopy}>复制为本期</Button>
        </div>
      </header>

      {review.type === 'month' ? <MonthlyOverview progress={review.monthlyMetrics?.overallProgress ?? average} points={review.monthlyMetrics?.progressTrend} metrics={review.monthlyMetrics}/> : <section className="okr-review-readonly-metrics" aria-label="复盘概览">
          <div><Progress type="circle" percent={average} size={56}/><span><b>KR 平均进度</b><small>{average}%</small></span></div>
          <div><Target/><span><b>自评分</b><small>{review.selfScore} 分</small></span></div>
          <div><CheckCircle/><span><b>主管评分</b><small>{review.leaderScore == null ? '暂无' : `${review.leaderScore} 分`}</small></span></div>
      </section>}

      {review.type === 'week' && <section className="okr-review-readonly-section">
        <div className="okr-review-readonly-title"><FileText /><h3>{review.reviewMode === 'supervisor' ? '部门补充总结' : '整体工作摘要'}</h3></div>
        <p className="whitespace-pre-wrap break-words">{review.summary || '暂无摘要内容'}</p>
      </section>}

      <section className="okr-review-readonly-section">
        <div className="okr-review-readonly-title"><Target /><h3>{review.type === 'month' ? '本月目标复盘' : 'OKR 目标复盘'}</h3><span>{krReviews.length} 个 KR</span></div>
        {review.type === 'month' && <p>{review.summary || '暂无本月总结'}</p>}
        {krReviews.length === 0 ? <Empty description="暂无 KR 复盘" /> : (
          <div className="okr-review-readonly-krs">
            {krReviews.map((kr, index) => (
              <article key={`${kr.keyResultId}-${index}`}>
                <div className="okr-review-readonly-kr-head">
                  <strong><span>{review.type === 'month' ? 'A' : 'KR'}{index + 1}</span>{kr.keyResultTitle}</strong>
                  <div><small>{kr.previousProgress}% → {kr.currentProgress}%</small><Tag color={kr.health === 'normal' ? 'success' : kr.health === 'risk' ? 'warning' : 'error'}>{kr.health === 'normal' ? '正常' : kr.health === 'risk' ? review.reviewMode === 'structured' ? '风险' : '有风险' : review.reviewMode === 'structured' ? '逾期' : '已阻塞'}</Tag></div>
                </div>
                <Progress percent={kr.currentProgress} showInfo={false} size="small" />
                <div className="okr-review-readonly-kr-grid">
                  <div><b>{review.reviewMode === 'supervisor' ? '主管判断与协调' : '本期成果'}</b><p className="whitespace-pre-wrap break-words">{review.reviewMode === 'supervisor' ? kr.supervisorJudgment || '未填写' : kr.achievement || '未填写'}</p></div>
                  <div><b>风险与阻塞</b><p>{kr.blocker || '无'}</p></div>
                  <div><b>下一步计划</b><p>{kr.nextPlan || '未填写'}</p></div>
                </div>
                {review.reviewMode === 'supervisor' && <Button onClick={() => setSupportTarget(kr)}>员工复盘支撑（{kr.employeeReviewSnapshots?.length || 0}）</Button>}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="okr-review-readonly-columns">
        <section className="okr-review-readonly-section">
          <div className="okr-review-readonly-title"><FileText /><h3>插播任务</h3></div>
          {<Table size="small" rowKey="id" pagination={false} dataSource={(review.linkedWorkItems || []).filter(item => review.extraWork?.workIds.includes(item.id))} locale={{ emptyText: <Empty description="暂无关联插播任务" /> }} columns={[
            { title: '标题', dataIndex: 'title' }, { title: '来源归属', render: (_, item) => item.sourceLabel || '—' },
            { title: '状态', dataIndex: 'status' }, { title: '任务工时', render: (_, item) => completedActualHours({ status: item.status, actualHours: item.actualHours, kind: item.type === 'task' ? 'task' : 'collaboration' }) == null ? '—' : `${item.actualHours} 小时` },
          ]}/>}
          {extraWorkRows.length > 0 ? <div className="okr-review-readonly-extra-list">{extraWorkRows.map((item, index) => <div key={`${item.content}-${index}`}><span><Tag>{item.source || '手工记录'}</Tag><b>{item.content || '未命名工作'}</b></span><small>{item.status || '未填写状态'} · {item.hours ? `${item.hours} 小时` : '未填写耗时'}</small></div>)}</div> : review.extraWork?.description ? <p>{review.extraWork.description}</p> : review.type !== 'week' ? <p>暂无额外工作记录</p> : null}
        </section>
        {review.type === 'month' && <section className="okr-review-readonly-section"><div className="okr-review-readonly-title"><FileText/><h3>对公司或部门发展有帮助的意见和建议</h3></div><p className="whitespace-pre-wrap break-words">{review.suggestions || review.otherNotes || '暂无问题或建议'}</p></section>}
        <section className="okr-review-readonly-section">
          <div className="okr-review-readonly-title"><CheckCircle /><h3>{review.type === 'month' ? '需要协助事项' : '协助与协同事项'}</h3></div>
          {review.assistance?.length ? review.assistance.map((item, index) => <p key={`${item.subject}-${index}`}><b>{item.subject}</b>：{item.result}{item.workId && <small> · {item.assistanceType === '客户诉求' ? '产品需求' : item.assistanceType === '其他问题' ? '其他协同' : item.assistanceType} · {item.expectedAssignee || '—'} · {item.status || '—'}</small>}</p>) : <p>暂无协同事项</p>}
        </section>
      </div>

      {review.type === 'week' && <section className="okr-review-readonly-section"><div className="okr-review-readonly-title"><Target/><h3>下周计划</h3></div><p>{review.nextWeekPlan || '暂无下周计划'}</p></section>}

      {<section className="okr-review-readonly-section">
        <div className="okr-review-readonly-title"><FileText /><h3>知识沉淀</h3></div>
        {review.knowledgeEntries?.length ? review.knowledgeEntries.map(item => <article key={item.id}><b>{item.title}</b><KnowledgeAttachments attachments={item.attachments}/><p className="whitespace-pre-wrap break-words">{item.summary}</p><p className="whitespace-pre-wrap break-words">{item.content}</p>{item.linkUrl && <p className="break-words">链接地址：{item.linkUrl}</p>}</article>) : <Empty description="暂无知识沉淀" />}
      </section>}

      {review.type === 'month' && review.nextMonthArrangement && (
        <div className="okr-review-readonly-columns">
          <section className="okr-review-readonly-section"><div className="okr-review-readonly-title"><Target /><h3>下个月安排</h3></div><p>{review.nextMonthArrangement || '暂无下个月安排'}</p></section>
        </div>
      )}

      {supportTarget && <EmployeeReviewSupportDialog target={supportTarget} supports={[]} loading={false} onClose={() => setSupportTarget(null)}/>}
      {review.feedback && <section className="okr-review-readonly-feedback"><AlertTriangle /><div><b>主管批复与评价</b><p>{review.feedback}</p></div></section>}
    </div>
  );
}
