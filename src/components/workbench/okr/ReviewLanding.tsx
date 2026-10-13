import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Empty, Spin, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { CalendarIcon, ChevronRightIcon, ClockIcon } from '@primer/octicons-react';
import type { OKRItem } from '../../../types';
import type { OkrRecord, OkrSettings } from '../../../services/okrRepository';
import { backfillReviews, currentReviewPeriod, recentSubmittedReviews, reviewWriteAccess, type BackfillReview, type ReviewPeriod, type ReviewType } from '../../../services/okrReviewRules';
import './reviewLanding.css';

type Props = {
  exempt?: boolean;
  records: OkrRecord[];
  objectives: OKRItem[];
  ownerId: string;
  settings?: OkrSettings;
  loading?: boolean;
  settingsLoading?: boolean;
  settingsError?: unknown;
  busy?: boolean;
  onRetry: () => void;
  onOpen: (type: ReviewType, period: ReviewPeriod, draft?: OkrRecord) => void;
  onViewAll: () => void;
  onViewReview: (id: string) => void;
};

export function ReviewLanding({ records, objectives, ownerId, settings, loading = false, settingsLoading = false, settingsError, busy = false, exempt = false, onRetry, onOpen, onViewAll, onViewReview }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [now, setNow] = useState(() => dayjs());
  useEffect(() => {
    const update = () => setNow(dayjs());
    const timer = window.setInterval(update, 60_000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  const recent = recentSubmittedReviews(records, ownerId);
  const backfills = backfillReviews(records, objectives, ownerId, settings, now);
  const blocked = loading || settingsLoading || Boolean(settingsError) || !settings || busy;
  const openBackfill = (item: BackfillReview) => {
    setDrawerOpen(false);
    onOpen(item.type, { startDate: item.startDate, endDate: item.endDate }, item.draft);
  };
  const writeButton = (type: ReviewType) => {
    const period = currentReviewPeriod(type, now);
    const access = reviewWriteAccess(settings, type, now);
    const existing = records.find(record => record.kind === 'review' && record.ownerId === ownerId && record.payload.reviewType === type && record.payload.startDate === period.startDate && record.payload.endDate === period.endDate && record.status !== 'deleted');
    const alreadySubmitted = existing && ['active', 'submitted', 'reviewed'].includes(existing.status);
    const disabled = exempt ? busy : blocked || !access.allowed || Boolean(alreadySubmitted);
    const reason = exempt ? '你无需写复盘总结' : settingsError ? '填写日期配置加载失败，请重试' : settingsLoading || !settings ? '正在加载填写日期配置' : alreadySubmitted ? '本周期已提交，可在我的复盘列表查看' : access.reason;
    return <Tooltip title={reason || undefined}><span tabIndex={disabled ? 0 : undefined} aria-label={reason || undefined}><Button type={type === 'week' ? 'primary' : 'default'} disabled={disabled} onClick={() => onOpen(type, period, existing)} icon={<CalendarIcon/>}>{type === 'week' ? '写周报' : '写月报'}</Button></span></Tooltip>;
  };
  return <div className="review-landing">
    {settingsError ? <Alert type="error" showIcon title="填写日期配置加载失败" action={<Button size="small" onClick={onRetry}>重试</Button>}/> : null}
    <section className="review-landing-pending" aria-label="待填写">
      <header className="review-landing-head"><h2>待填写</h2><Button type="text" disabled={blocked} onClick={() => setDrawerOpen(true)}>可补交的<ChevronRightIcon/></Button></header>
      <div className="review-landing-start"><Spin spinning={loading || settingsLoading}><Empty description="选择复盘周期开始撰写"/></Spin><p>记录本阶段的工作成果、OKR 进度与改进计划</p><div className="review-landing-actions">{writeButton('week')}{writeButton('month')}</div></div>
    </section>
    <section aria-label="最近提交的">
      <header className="review-landing-head"><h2>最近提交的</h2><Button type="text" onClick={onViewAll}>查看全部<ChevronRightIcon/></Button></header>
      {loading ? <div className="review-landing-status"><Spin tip="正在加载最近提交"/></div> : recent.length ? <div className="review-recent-grid">{recent.map(record => {
        const time = record.submittedAt || record.createdAt;
        return <button type="button" key={record.id} className="review-recent-card" disabled={busy} onClick={() => onViewReview(record.id)} aria-label={`查看复盘：${record.payload.title}`}><div className="review-recent-title"><span className="review-cycle-icon"><CalendarIcon/></span><strong title={record.payload.title}>{record.payload.title}</strong></div><div className="review-recent-meta"><Tag color={record.payload.reviewType === 'week' ? 'blue' : 'purple'}>{record.payload.reviewType === 'week' ? '周报' : '月报'}</Tag><span>{time && dayjs(time).isValid() ? `${record.submittedAt ? '提交于' : '记录于'} ${dayjs(time).format('MM-DD HH:mm')}` : '时间未记录'}</span></div></button>;
      })}</div> : <Empty description="暂无已提交的复盘"/>}
    </section>
    <Drawer title="已逾期的总结" placement="right" size="min(100vw, 36rem)" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <div className="review-backfill-list">{backfills.length ? backfills.map(item => <article className="review-backfill-card" key={`${item.type}:${item.startDate}`}><div><strong title={item.title}>{item.title}</strong><p><ClockIcon/>周期截至 {dayjs(item.endDate).format('YYYY-MM-DD')}{item.draft ? <Tag>草稿</Tag> : null}</p></div><Button disabled={busy} onClick={() => openBackfill(item)}>填写</Button></article>) : <Empty description="暂无可补交的总结"/>}</div>
    </Drawer>
  </div>;
}
