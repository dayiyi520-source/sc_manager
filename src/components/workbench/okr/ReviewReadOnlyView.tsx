import React from 'react';
import { Button, Empty, Progress, Tag } from 'antd';
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

const impactLabel = (impact?: string) => ({
  none: '无明显影响',
  block: '挤占 KR 投入',
  support: '支持 KR',
}[impact || ''] || impact || '无明显影响');

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
  const krReviews = review.krReviews || [];
  const extraWorkRows = parseExtraWork(review.extraWork?.description);
  const average = krReviews.length
    ? Math.round(krReviews.reduce((sum, kr) => sum + kr.currentProgress, 0) / krReviews.length)
    : review.selfScore;

  return (
    <div className="okr-review-readonly" role="region" aria-label={`${review.cycleName}只读详情`}>
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

      <section className="okr-review-readonly-metrics" aria-label="复盘概览">
        <div><Progress type="circle" percent={average} size={56} /><span><b>KR 平均进度</b><small>{average}%</small></span></div>
        <div><Target /><span><b>自评分</b><small>{review.selfScore} 分</small></span></div>
        <div><CheckCircle /><span><b>主管评分</b><small>{review.leaderScore == null ? '暂无' : `${review.leaderScore} 分`}</small></span></div>
      </section>

      <section className="okr-review-readonly-section">
        <div className="okr-review-readonly-title"><FileText /><h3>整体工作摘要</h3></div>
        <p>{review.summary || '暂无摘要内容'}</p>
      </section>

      <section className="okr-review-readonly-section">
        <div className="okr-review-readonly-title"><Target /><h3>OKR 目标复盘</h3><span>{krReviews.length} 个 KR</span></div>
        {krReviews.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无 KR 复盘" /> : (
          <div className="okr-review-readonly-krs">
            {krReviews.map((kr, index) => (
              <article key={`${kr.keyResultId}-${index}`}>
                <div className="okr-review-readonly-kr-head">
                  <strong><span>KR{index + 1}</span>{kr.keyResultTitle}</strong>
                  <div><small>{kr.previousProgress}% → {kr.currentProgress}%</small><Tag color={kr.health === 'normal' ? 'success' : kr.health === 'risk' ? 'warning' : 'error'}>{kr.health === 'normal' ? '正常' : kr.health === 'risk' ? '有风险' : '已阻塞'}</Tag></div>
                </div>
                <Progress percent={kr.currentProgress} showInfo={false} size="small" />
                <div className="okr-review-readonly-kr-grid">
                  <div><b>本期成果</b><p>{kr.achievement || '未填写'}</p></div>
                  <div><b>风险与阻塞</b><p>{kr.blocker || '无'}</p></div>
                  <div><b>下一步计划</b><p>{kr.nextPlan || '未填写'}</p></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="okr-review-readonly-columns">
        <section className="okr-review-readonly-section">
          <div className="okr-review-readonly-title"><FileText /><h3>非 OKR 额外工作</h3></div>
          {extraWorkRows.length > 0 ? <div className="okr-review-readonly-extra-list">{extraWorkRows.map((item, index) => <div key={`${item.content}-${index}`}><span><Tag>{item.source || '手工记录'}</Tag><b>{item.content || '未命名工作'}</b></span><small>{item.status || '未填写状态'} · {item.hours ? `${item.hours} 小时` : '未填写耗时'} · {impactLabel(item.impact)}</small></div>)}</div> : <p>{review.extraWork?.description || '暂无额外工作记录'}</p>}
          {review.extraWork?.impact && <small>对 OKR 的影响：{impactLabel(review.extraWork.impact)}</small>}
        </section>
        <section className="okr-review-readonly-section">
          <div className="okr-review-readonly-title"><CheckCircle /><h3>协助与协同事项</h3></div>
          {review.assistance?.length ? review.assistance.map((item, index) => <p key={`${item.subject}-${index}`}><b>{item.subject}</b>：{item.result}</p>) : <p>暂无协同事项</p>}
        </section>
      </div>

      {review.type === 'month' && (
        <div className="okr-review-readonly-columns">
          <section className="okr-review-readonly-section"><div className="okr-review-readonly-title"><FileText /><h3>其他补充</h3></div><p>{review.otherNotes || '暂无其他补充'}</p></section>
          <section className="okr-review-readonly-section"><div className="okr-review-readonly-title"><Target /><h3>下个月安排</h3></div><p>{review.nextMonthArrangement || '暂无下个月安排'}</p></section>
        </div>
      )}

      {review.feedback && <section className="okr-review-readonly-feedback"><AlertTriangle /><div><b>主管批复与评价</b><p>{review.feedback}</p></div></section>}
    </div>
  );
}
