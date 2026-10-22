import { Alert, Button, Empty } from 'antd';
import { CommentDiscussionIcon, PackageIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import { feedCategory, type FeedCategory, type WorkbenchFeed } from '../../services/workbenchFeeds';
import { FeedSummary } from './FeedSummary';

export function WorkbenchFeedCard({ category, feeds, error, onRetry, onMore, onOpen, isNew, hasUpdates }: {
  category: FeedCategory; feeds: WorkbenchFeed[]; error?: string; onRetry: () => void; onMore: () => void;
  onOpen: (feed: WorkbenchFeed) => void; isNew: (id: string) => boolean; hasUpdates: boolean;
}) {
  const title = category === 'dynamic' ? '产品动态' : '信息广场';
  const items = feeds.filter(feed => feedCategory(feed) === category);
  return <section aria-label={title} className="lg:col-span-6 overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)]">
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-main)] px-4 py-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">{category === 'dynamic' ? <PackageIcon /> : <CommentDiscussionIcon />}{title}{hasUpdates && <i title={`${title}有更新`} className="h-1 w-1 rounded-full bg-[var(--danger)]"/>}</h2>
      <Button type="link" size="small" aria-label={`查看更多${title}`} onClick={onMore}>查看更多</Button>
    </div>
    <div className="max-h-80 space-y-4 overflow-y-auto p-4">
      {error ? <Alert type="error" showIcon title={`${title}加载失败`} description={error} action={<Button onClick={onRetry}>重试</Button>}/> : !items.length ? <Empty description={`暂无${title}`} /> : items.slice(0, 5).map(feed => <article key={feed.id} className="space-y-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4 transition-colors hover:border-[var(--primary)]">
        <div className="flex items-start justify-between gap-4"><button type="button" className="min-w-0 break-words text-left text-sm font-semibold text-[var(--primary)] hover:underline focus-visible:outline focus-visible:outline-[var(--primary)] active:opacity-70" onClick={() => onOpen(feed)}>{feed.title}</button>{isNew(feed.id) && <span aria-label="新消息" className="shrink-0 text-xs text-[var(--danger)]">新</span>}</div>
        <div className="text-xs text-[var(--text-muted)]">{dayjs(feed.time).isValid() ? dayjs(feed.time).format('YYYY-MM-DD HH:mm') : feed.time} · {feed.author || '未记录发布人'}</div>
        <div className="text-xs text-[var(--text-muted)]">{[feed.productName, feed.versionName, feed.projectName, feed.customer, feed.source?.module].filter(Boolean).join(' · ')}</div>
        <FeedSummary content={feed.content}/>
      </article>)}
    </div>
  </section>;
}
