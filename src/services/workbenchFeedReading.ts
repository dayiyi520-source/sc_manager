import type { FeedType, WorkbenchFeed } from './workbenchFeeds';
export const FEED_READING_CHANGED = 'shichuang.workbench.reading.changed';
export const readingKey = (userId: string) => `shichuang.workbench.reading.v1.${encodeURIComponent(userId)}`;
type ReadingState = { browsed: string[]; opened: string[] };
export function feedReading(userId: string): ReadingState {
  try {
    const value = JSON.parse(localStorage.getItem(readingKey(userId)) || '{}');
    return { browsed: Array.isArray(value?.browsed) ? value.browsed.filter((id: unknown) => typeof id === 'string') : [], opened: Array.isArray(value?.opened) ? value.opened.filter((id: unknown) => typeof id === 'string') : [] };
  } catch { return { browsed: [], opened: [] }; }
}
function save(userId: string, kind: keyof ReadingState, ids: string[]) {
  const state = feedReading(userId);
  const merged = [...new Set([...state[kind], ...ids])];
  if (merged.length === state[kind].length) return;
  localStorage.setItem(readingKey(userId), JSON.stringify({ ...state, [kind]: merged }));
  window.dispatchEvent(new Event(FEED_READING_CHANGED));
}
export const browseFeedCategory = (userId: string, feeds: WorkbenchFeed[], type: FeedType) => save(userId, 'browsed', feeds.filter(feed => feed.type === type).map(feed => feed.id));
export const openFeedMessage = (userId: string, feed: WorkbenchFeed) => save(userId, 'opened', [feed.id]);
