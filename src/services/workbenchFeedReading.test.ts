// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browseFeedCategory, feedReading, FEED_READING_CHANGED, openFeedMessage, readingKey, feedEmployeeReceipts } from './workbenchFeedReading';
import type { WorkbenchFeed } from './workbenchFeeds';
const first: WorkbenchFeed = { id: 'one', type: 'dynamic', versionId: 'v', source: {module:'产品发布',recordId:'v'}, title: '标题', content: '正文', time: '2026-10-21' };
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
    expect(saved).toMatchObject(feedReading('me'));
    expect(Number.isFinite(new Date(saved.openedAt.one).getTime())).toBe(true);
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

it('retains first read time while each successful open increments count and updates latest time',()=>{
 vi.useFakeTimers();
 try {
  vi.setSystemTime(new Date('2026-10-22T08:00:00Z'));openFeedMessage('me',first);
  const initial=JSON.parse(localStorage.getItem(readingKey('me'))!);
  expect(initial.openedAt.one).toBe('2026-10-22T08:00:00.000Z');
  expect(initial.openedCount.one).toBe(1);
  expect(initial.lastOpenedAt.one).toBe(initial.openedAt.one);
  vi.setSystemTime(new Date('2026-10-22T09:00:00Z'));openFeedMessage('me',first);browseFeedCategory('me',[first,second],'square');
  const saved=JSON.parse(localStorage.getItem(readingKey('me'))!);
  expect(saved.openedAt.one).toBe(initial.openedAt.one);
  expect(saved.openedCount.one).toBe(2);
  expect(saved.lastOpenedAt.one).toBe('2026-10-22T09:00:00.000Z');
  expect(feedEmployeeReceipts(first,[{id:'me',name:'本人',department:'产品部'}])[0]).toMatchObject({read:true,readCount:2,lastReadAt:saved.lastOpenedAt.one});
 } finally {vi.useRealTimers();}
});
it('counts unique eligible employees only and keeps unread records separate from legacy reads without timestamps',()=>{
 const feed={...second,audienceScopes:[['shichuang','产品部']] as [string,string][]};
 const employees=[{id:'me',name:'本人',department:'产品部'},{id:'other',name:'同事',department:'产品部'},{id:'legacy',name:'历史读者',department:'产品部'},{id:'outside',name:'其他部门',department:'市场部'},{id:'agency',name:'代理商',department:'产品部',organizationId:'agency'}];
 openFeedMessage('me',feed);localStorage.setItem(readingKey('legacy'),JSON.stringify({browsed:[],opened:[feed.id]}));
 const rows=feedEmployeeReceipts(feed,[...employees,employees[0]]);
 expect(rows).toHaveLength(3);expect(rows.filter(row=>row.read)).toHaveLength(2);expect(rows.find(row=>row.id==='me')?.readAt).toBeTruthy();
 expect(rows.find(row=>row.id==='legacy')).toMatchObject({read:true,readAt:undefined,readCount:1,lastReadAt:undefined});
 expect(rows.find(row=>row.id==='other')).toMatchObject({read:false,readAt:undefined,readCount:undefined,lastReadAt:undefined});
 openFeedMessage('legacy',feed);const legacy=JSON.parse(localStorage.getItem(readingKey('legacy'))!);
 expect(legacy.openedAt).toBeUndefined();expect(legacy.openedCount[feed.id]).toBe(2);
 expect(feedEmployeeReceipts(feed,employees).find(row=>row.id==='legacy')?.lastReadAt).toBe(legacy.lastOpenedAt[feed.id]);
});
it('uses a legacy first timestamp as latest until a new open and does not count a failed repeat',()=>{
 localStorage.setItem(readingKey('me'),JSON.stringify({opened:[first.id],openedAt:{[first.id]:'2026-10-21T08:00:00Z'}}));
 const employee={id:'me',name:'本人',department:'产品部'};
 expect(feedEmployeeReceipts(first,[employee])[0]).toMatchObject({readCount:1,lastReadAt:'2026-10-21T08:00:00Z'});
 vi.spyOn(Storage.prototype,'setItem').mockImplementationOnce(()=>{throw new Error('quota')});
 expect(()=>openFeedMessage('me',first)).toThrow('quota');
 expect(feedEmployeeReceipts(first,[employee])[0]).toMatchObject({readCount:1,lastReadAt:'2026-10-21T08:00:00Z'});
 openFeedMessage('me',first);
 expect(feedEmployeeReceipts(first,[employee])[0].readCount).toBe(2);
});
it('fails explicitly on damaged receipt storage and leaves failed writes unread',()=>{
 localStorage.setItem(readingKey('bad'),'broken');
 expect(()=>feedEmployeeReceipts(first,[{id:'bad',name:'损坏读者',department:'产品部'}])).toThrow('阅读记录无法读取');
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')});
 expect(()=>openFeedMessage('me',first)).toThrow('quota');expect(feedReading('me').opened).toEqual([]);
});
