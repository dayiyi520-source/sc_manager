import { describe, expect, it } from 'vitest';
import { hasUnreadFeed, unreadFeedIds } from './feedUnread';

describe('工作台推送未读状态', () => {
  const feeds = [{ id: 'dynamic-1', type: 'dynamic' as const }, { id: 'feedback-1', type: 'feedback' as const }];
  it('按标签识别未读推送', () => {
    const unread = unreadFeedIds(feeds, new Set(['dynamic-1']));
    expect([...unread]).toEqual(['feedback-1']);
    expect(hasUnreadFeed(feeds, new Set(['dynamic-1']), 'dynamic')).toBe(false);
    expect(hasUnreadFeed(feeds, new Set(['dynamic-1']), 'feedback')).toBe(true);
  });
});
