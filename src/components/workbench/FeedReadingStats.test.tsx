// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { FeedReadingStats } from './FeedReadingStats';
import { teamRepository } from '../../services/teamRepository';
import { openFeedMessage, readingKey } from '../../services/workbenchFeedReading';
import type { WorkbenchFeed } from '../../services/workbenchFeeds';
vi.mock('../../services/teamRepository',()=>({teamRepository:{options:vi.fn()}}));
const feed:WorkbenchFeed={id:'receipt-test',type:'square',title:'阅读测试',content:'正文',time:'2026-10-22',audienceScopes:[['shichuang','产品部']]};
const employees=[{id:'me',name:'本人',department:'产品部'},{id:'other',name:'同事',department:'产品部'},{id:'outside',name:'不可见员工',department:'市场部'}];
beforeEach(()=>{localStorage.clear();vi.clearAllMocks();vi.mocked(teamRepository.options).mockResolvedValue(employees);});
afterEach(cleanup);
it('shows scoped counts, read frequency and latest time on hover or keyboard focus',async()=>{
 openFeedMessage('me',feed);openFeedMessage('me',feed);render(<FeedReadingStats feed={feed}/>);
 const read=await screen.findByRole('button',{name:'已读（1）'});expect(screen.getByRole('button',{name:'未读（1）'})).toBeInTheDocument();
 fireEvent.focus(read);
 const popup=await screen.findByRole('tooltip');expect(within(popup).getByText('本人')).toBeInTheDocument();
 expect(within(popup).getAllByRole('columnheader').map(header=>header.textContent)).toEqual(['员工','状态（次数）','最近已读时间']);
 expect(within(popup).getByText('已读（2次）')).toBeInTheDocument();
 expect(within(popup).getByText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
 expect(screen.queryByText('不可见员工')).not.toBeInTheDocument();
});
it('shows only employee and status for unread people',async()=>{
 render(<FeedReadingStats feed={feed}/>);
 fireEvent.focus(await screen.findByRole('button',{name:'未读（2）'}));
 const popup=await screen.findByRole('tooltip');
 expect(within(popup).getAllByRole('columnheader').map(header=>header.textContent)).toEqual(['员工','状态']);
 expect(within(popup).getAllByText('未读')).toHaveLength(2);
});
it('renders legacy reads as one visit and keeps missing timestamps explicit',async()=>{
 localStorage.setItem(readingKey('me'),JSON.stringify({opened:[feed.id]}));
 render(<FeedReadingStats feed={feed}/>);
 fireEvent.focus(await screen.findByRole('button',{name:'已读（1）'}));
 const popup=await screen.findByRole('tooltip');
 expect(within(popup).getByText('已读（1次）')).toBeInTheDocument();
 expect(within(popup).getByText('时间未记录')).toBeInTheDocument();
});
it('refreshes counts after another tab records a read',async()=>{
 render(<FeedReadingStats feed={feed}/>);await screen.findByRole('button',{name:'未读（2）'});
 localStorage.setItem(readingKey('other'),JSON.stringify({browsed:[],opened:[feed.id],openedAt:{[feed.id]:'2026-10-22T08:30:00Z'}}));
 fireEvent(window,new StorageEvent('storage',{key:readingKey('other')}));
 expect(await screen.findByRole('button',{name:'已读（1）'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'未读（1）'})).toBeInTheDocument();
});
it('does not invent zero counts on directory failure and supports retry',async()=>{
 vi.mocked(teamRepository.options).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(employees);
 render(<FeedReadingStats feed={feed}/>);expect(await screen.findByText('阅读统计加载失败')).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'已读（0）'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:/重\s*试/}));
 expect(await screen.findByRole('button',{name:'未读（2）'})).toBeInTheDocument();
});
