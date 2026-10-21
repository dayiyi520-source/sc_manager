import { useEffect, useState } from 'react';
import { message } from 'antd';
import { browseFeedCategory, feedReading, FEED_READING_CHANGED, readingKey } from '../../services/workbenchFeedReading';
import type { FeedType, WorkbenchFeed } from '../../services/workbenchFeeds';
export function useFeedReading(userId: string, feeds: WorkbenchFeed[]) {
  const [, refresh] = useState(0);
  useEffect(() => {
    const changed = () => refresh(value => value + 1);
    const stored = (event: StorageEvent) => { if (!event.key || event.key === readingKey(userId)) changed(); };
    window.addEventListener(FEED_READING_CHANGED, changed);
    window.addEventListener('storage', stored);
    return () => { window.removeEventListener(FEED_READING_CHANGED, changed); window.removeEventListener('storage', stored); };
  }, [userId]);
  const state = feedReading(userId);
  return {
    isNew: (id: string) => !state.opened.includes(id),
    hasUpdates: (type: FeedType) => feeds.some(feed => feed.type === type && !state.browsed.includes(feed.id)),
    browse: (type: FeedType) => { try { browseFeedCategory(userId, feeds, type); } catch { void message.warning('浏览状态保存失败，刷新后可能再次显示更新提示'); } },
  };
}
