// @vitest-environment jsdom
import { StrictMode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedDetail } from './FeedDetail';
import type { WorkbenchFeed } from '../../services/workbenchFeeds';
import { readingKey } from '../../services/workbenchFeedReading';
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ currentUser: { id: 'viewer' } }) }));
vi.mock('../../services/teamRepository', () => ({teamRepository:{options:vi.fn().mockResolvedValue([{id:'viewer',name:'本人',department:'产品部'}])}}));
vi.mock('./WorkbenchFeedEditor', () => ({ WorkbenchFeedEditor: () => null }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);
const feed: WorkbenchFeed = { id: 'detail', type: 'dynamic', title: '详情顺序验收', content: '正文', time: '2026-10-21T10:00:00', author: '发布人甲', projectName: '项目甲', productName: '产品甲', versionName: 'V1', customer: '客户甲', newsType: '专家报告', activityName: '历史活动' };
const labels = () => [...document.querySelectorAll('aside .ant-descriptions-item-label')].map(item => item.textContent?.trim());
it('records one visit under StrictMode and another after reopening the detail', async () => {
  const first = render(<StrictMode><FeedDetail feed={feed} onClose={vi.fn()}/></StrictMode>);
  await waitFor(() => expect(JSON.parse(localStorage.getItem(readingKey('viewer')) || '{}').openedCount?.[feed.id]).toBe(1));
  first.unmount();
  render(<StrictMode><FeedDetail feed={feed} onClose={vi.fn()}/></StrictMode>);
  await waitFor(() => expect(JSON.parse(localStorage.getItem(readingKey('viewer')) || '{}').openedCount?.[feed.id]).toBe(2));
});
describe('feed detail metadata order and applicable fields', () => {
  it.each([
    ['dynamic', ['类型', '关联产品', '迭代版本', '可见范围', '来源', '发布人', '发布时间', '已读', '未读']],
    ['feedback', ['类型', '信息标签', '关联项目', '关联产品', '关联客户', '可见范围', '来源', '发布人', '发布时间', '已读', '未读']],
    ['competitor', ['类型', '信息标签', '关联项目', '关联产品', '关联客户', '可见范围', '来源', '发布人', '发布时间', '已读', '未读']],
  ] as const)('orders %s metadata and hides fields that do not apply even if legacy values remain', async (type, expected) => {
    render(<FeedDetail feed={{...feed,type,...(type === 'dynamic' ? {source:{module:'产品发布',recordId:'version'},versionId:'v'}:{})}} onClose={vi.fn()}/>);
    await screen.findByRole('heading', {name:'详情顺序验收'});
    expect(labels()).toEqual(expected);
    expect(screen.queryByText('关联活动')).not.toBeInTheDocument();
    expect(screen.queryByText('关联版本')).not.toBeInTheDocument();
    expect(screen.queryByText('资讯类别')).not.toBeInTheDocument();
  });
  it('hides empty associations while retaining common metadata', async () => {
    render(<FeedDetail feed={{...feed,type:'feedback',projectName:undefined,productName:undefined,versionName:undefined,customer:undefined}} onClose={vi.fn()}/>);
    await screen.findByRole('heading', {name:'详情顺序验收'});
    expect(labels()).toEqual(['类型', '信息标签', '可见范围', '来源', '发布人', '发布时间', '已读', '未读']);
  });
});

it('hides the source navigation for product releases and names manually posted square sources Workbench', async()=>{
 const view=render(<FeedDetail feed={{...feed,source:{module:'产品发布',recordId:'release',detailUrl:'/app/prod_versions'},versionId:'v'}} onClose={vi.fn()}/>);
 await screen.findByRole('heading',{name:feed.title});expect(screen.queryByRole('link',{name:'前往来源板块'})).not.toBeInTheDocument();
 view.unmount();render(<FeedDetail feed={{...feed,type:'square'}} onClose={vi.fn()}/>);
 expect(await screen.findByText('工作台发布',{exact:true})).toBeInTheDocument();expect(screen.queryByText('手动发布',{exact:true})).not.toBeInTheDocument();
});

 it('permits any viewer to edit and delete square information while keeping product releases read-only', async () => {
 const view = render(<FeedDetail feed={{...feed,type:'square',authorId:'another-user'}} onClose={vi.fn()}/>);
 expect(await screen.findByRole('button',{name:'编辑'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'删除'})).toBeInTheDocument();
 view.unmount();
 render(<FeedDetail feed={{...feed,authorId:'viewer',versionId:'v',source:{module:'产品发布',recordId:'v'}}} onClose={vi.fn()}/>);
 expect(screen.queryByRole('button',{name:'编辑'})).not.toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'删除'})).not.toBeInTheDocument();
 });
