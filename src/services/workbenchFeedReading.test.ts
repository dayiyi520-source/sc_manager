// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browseFeedCategory, feedReading, FEED_READING_CHANGED, openFeedMessage, readingKey } from './workbenchFeedReading';
import type { WorkbenchFeed } from './workbenchFeeds';
const first: WorkbenchFeed = { id: 'one', type: 'dynamic', title: '标题', content: '正文', time: '2026-10-21' };
const second: WorkbenchFeed = { ...first, id: 'two', type: 'feedback' };
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
describe('per-user category browsing and message reading', () => {
  it('browsing clears only category updates and opening clears only that message', () => {
    browseFeedCategory('me', [first, second], 'dynamic');
    expect(feedReading('me')).toEqual({ browsed: ['one'], opened: [] });
    openFeedMessage('me', first);
    expect(feedReading('me')).toEqual({ browsed: ['one'], opened: ['one'] });
    expect(feedReading('other')).toEqual({ browsed: [], opened: [] });
  });
  it('retains persisted state, ignores the legacy global key and recognizes newly published messages', () => {
    localStorage.setItem('shichuang.frontend.mock.workbench.feedRead', '["one"]');
    expect(feedReading('me').opened).toEqual([]);
    browseFeedCategory('me', [first], 'dynamic');
    openFeedMessage('me', first);
    const saved = JSON.parse(localStorage.getItem(readingKey('me'))!);
    expect(saved).toEqual(feedReading('me'));
    expect(saved.browsed).not.toContain('new');
    expect(saved.opened).not.toContain('new');
    browseFeedCategory('me', [first, {...first, id:'new'}], 'dynamic');
    expect(feedReading('me')).toEqual({browsed:['one','new'],opened:['one']});
  });
  it('notifies other views and tolerates damaged storage without marking messages read', () => {
    localStorage.setItem(readingKey('me'), 'invalid');
    expect(feedReading('me')).toEqual({browsed:[],opened:[]});
    const changed = vi.fn(); window.addEventListener(FEED_READING_CHANGED, changed);
    try { openFeedMessage('me', first); expect(changed).toHaveBeenCalledOnce(); }
    finally { window.removeEventListener(FEED_READING_CHANGED, changed); }
  });
  it('does not record a successful read when persistence fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => openFeedMessage('me', first)).toThrow('quota');
    expect(feedReading('me').opened).toEqual([]);
  });
});
