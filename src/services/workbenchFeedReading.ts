import type { EmployeeOption } from '../types';
import { canViewWorkbenchFeed, feedCategory, type FeedType, type WorkbenchFeed } from './workbenchFeeds';
export const FEED_READING_CHANGED = 'shichuang.workbench.reading.changed';
export const readingKey = (userId: string) => `shichuang.workbench.reading.v1.${encodeURIComponent(userId)}`;
type StoredReadingState = { browsed?: string[]; opened?: string[]; openedAt?: Record<string, string>; openedCount?: Record<string, number>; lastOpenedAt?: Record<string, string> };
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
  const previous = JSON.parse(localStorage.getItem(readingKey(userId)) || '{}') as StoredReadingState;
  localStorage.setItem(readingKey(userId), JSON.stringify({ ...previous, ...state, [kind]: merged }));
  window.dispatchEvent(new Event(FEED_READING_CHANGED));
}
export const browseFeedCategory = (userId: string, feeds: WorkbenchFeed[], type: FeedType) => save(userId, 'browsed', feeds.filter(feed => feedCategory(feed) === (type === 'dynamic' ? 'dynamic' : 'square')).map(feed => feed.id));
export function openFeedMessage(userId: string, feed: WorkbenchFeed) {
  const state = feedReading(userId);
  let previous: StoredReadingState = {};
  try { previous = JSON.parse(localStorage.getItem(readingKey(userId)) || '{}') || {}; } catch { /* 保留既有容错，实际打开后重新记录已读。 */ }
  const alreadyRead = state.opened.includes(feed.id);
  const now = new Date().toISOString();
  const previousCount = previous.openedCount?.[feed.id];
  const readCount = alreadyRead && Number.isSafeInteger(previousCount) && previousCount! > 0 ? previousCount! : alreadyRead ? 1 : 0;
  const openedAt = alreadyRead ? previous.openedAt : { ...previous.openedAt, [feed.id]: now };
  localStorage.setItem(readingKey(userId), JSON.stringify({ ...previous, ...state,
    opened: alreadyRead ? state.opened : [...state.opened, feed.id], openedAt,
    openedCount: { ...previous.openedCount, [feed.id]: readCount + 1 },
    lastOpenedAt: { ...previous.lastOpenedAt, [feed.id]: now }
  }));
  window.dispatchEvent(new Event(FEED_READING_CHANGED));
}

export type FeedEmployeeReceipt = { id: string; name: string; read: boolean; readAt?: string; readCount?: number; lastReadAt?: string };
export function feedEmployeeReceipts(feed: WorkbenchFeed, employees: EmployeeOption[]): FeedEmployeeReceipt[] {
  return [...new Map(employees.map(employee => [employee.id, employee])).values()]
    .filter(employee => canViewWorkbenchFeed(feed, { ...employee, department: employee.department || '' }))
    .map(employee => {
      const raw = localStorage.getItem(readingKey(employee.id));
      let state: StoredReadingState = {};
      if (raw) {
        try {
          state = JSON.parse(raw);
          if (!state || typeof state !== 'object' || Array.isArray(state) || (state.opened !== undefined && (!Array.isArray(state.opened) || state.opened.some(id => typeof id !== 'string')))) throw new Error('invalid');
        } catch { throw new Error('阅读记录无法读取，请刷新后重试'); }
      }
      const read = Boolean(state.opened?.includes(feed.id));
      const readAt = read && typeof state.openedAt?.[feed.id] === 'string' && Number.isFinite(new Date(state.openedAt[feed.id]).getTime()) ? state.openedAt[feed.id] : undefined;
      const latest = state.lastOpenedAt?.[feed.id];
      const lastReadAt = read && typeof latest === 'string' && Number.isFinite(new Date(latest).getTime()) ? latest : readAt;
      const storedCount = state.openedCount?.[feed.id];
      return { id: employee.id, name: employee.name, read, readAt,
        readCount: read ? Number.isSafeInteger(storedCount) && storedCount! > 0 ? storedCount : 1 : undefined, lastReadAt };
    });
}
