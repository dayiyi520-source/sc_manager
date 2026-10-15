export type WorkbenchFeedType = 'dynamic' | 'feedback' | 'competitor';
export type WorkbenchFeed = { id: string; type: WorkbenchFeedType };

export const unreadFeedIds = (feeds: WorkbenchFeed[], readIds: ReadonlySet<string>) => new Set(feeds.filter((feed) => !readIds.has(feed.id)).map((feed) => feed.id));

export const hasUnreadFeed = (feeds: WorkbenchFeed[], readIds: ReadonlySet<string>, type: WorkbenchFeedType) => feeds.some((feed) => feed.type === type && !readIds.has(feed.id));
