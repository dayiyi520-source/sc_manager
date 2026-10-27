import { feedReading } from '../../services/workbenchFeedReading';
// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from 'antd';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkbenchFeedsView } from './WorkbenchFeedsView';
import { FEEDS_KEY, listWorkbenchFeeds } from '../../services/workbenchFeeds';
vi.mock('./okr/OkrProvider', () => ({ OkrProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ productLines: [{ id: 'p', name: '产品甲', versions: [{ id: 'v', name: 'V1' }] }, { id: 'p2', name: '产品乙', versions: [{ id: 'v2', name: 'V2' }] }], versions: [], projects: [{ id: 'j', name: '项目甲', customerId: 'c', customerName: '客户甲' }], customers: [{ id: 'c', name: '客户甲' }], currentUser: { id: 'me', name: '本人' } }) }));
vi.mock('../../services/projectDeliveryMap', () => ({ projectDeliveryMap: () => [{ id: 'j', name: '项目甲', products: [{ id: 'p', name: '产品甲' }] }], resolveProjectProductLines: (project: unknown, products: Array<{ id: string }>) => project ? products.filter(row => row.id === 'p') : [] }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: () => Promise.resolve([{ id: 'me', name: '本人', department: '产品部' }, { id: 'other', name: '同事', department: '产品部' }, { id: 'third', name: '其他成员', department: '研发部' }]) } }));
vi.mock('../product/LazyRichTextEditor', () => ({ LazyRichTextEditor: ({ value, onInput, placeholder }: { value: string; onInput: (text: string, html: string) => void; placeholder: string }) => <textarea aria-label="信息简介" value={value} placeholder={placeholder} onChange={e => onInput(e.target.value, `<p><strong>${e.target.value}</strong></p>`)} /> }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); Modal.destroyAll(); vi.restoreAllMocks(); });
async function option(label: string, text: string) {
  fireEvent.mouseDown(await screen.findByLabelText(label));
  fireEvent.click(await screen.findByText(text, { selector: '.ant-select-item-option-content' }));
}
describe('动态与评价新增', () => {
  it('clears category updates independently and marks a message read only after details open', async () => {
    const feed = { id: 'reading-one', type: 'feedback', title: '阅读机制验收', content: '内容', time: '2026-10-21', authorId: 'other' };
    localStorage.setItem(FEEDS_KEY, JSON.stringify([feed]));
    const view = render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('tab', { name: '信息广场 (1)' }));
    expect(feedReading('me').browsed).toContain(feed.id);
    expect(feedReading('me').opened).not.toContain(feed.id);
    expect(screen.getByLabelText('搜索动态与评价').closest('.workbench-search')).toBeInTheDocument();
    expect(screen.getByLabelText('新消息')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '产品动态 (0)' }));
    fireEvent.click(screen.getByRole('tab', { name: '信息广场 (1)' }));
    expect(screen.getByLabelText('新消息')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: feed.title }));
    await waitFor(() => expect(feedReading('me').opened).toContain(feed.id));
    expect(screen.queryByLabelText('新消息')).not.toBeInTheDocument();
    view.unmount();
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    await screen.findByRole('button', { name: feed.title });
    expect(screen.queryByLabelText('新消息')).not.toBeInTheDocument();
  });

  it('only permits manual creation in the square and shows the confirmed property order', async () => {
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    await screen.findByRole('tab', { name: /产品动态/ });
    expect(screen.queryByRole('button', { name: '新建' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /信息广场/ }));
    fireEvent.click(screen.getByRole('button', { name: '新建' }));
    const dialog = await screen.findByRole('dialog');
    expect([...dialog.querySelectorAll('aside .ant-form-item-label')].map(label=>label.textContent)).toEqual(['关联项目','关联产品','关联客户','信息标签','可见范围']);
    expect(screen.queryByLabelText('类型')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('关联版本')).not.toBeInTheDocument();
    expect(screen.queryByText('全员')).not.toBeInTheDocument();
    expect(screen.queryByText('可见人员')).not.toBeInTheDocument();
  });
  it('saves with optional associations empty, persists metadata and restores the list after remount', async () => {
    sessionStorage.setItem('shichuang.workbench.feedTab','square');
    const view=render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'新建'}));
    fireEvent.change(screen.getByLabelText('标题'),{target:{value:'信息广场验收'}});
    fireEvent.change(screen.getByLabelText('信息简介'),{target:{value:'广场正文'}});
    await option('信息标签','经验分享');
    await waitFor(()=>expect(screen.getByLabelText('可见范围')).not.toBeDisabled());
    fireEvent.mouseDown(screen.getByLabelText('可见范围'));
    const org=await screen.findByText('师创组织',{selector:'.ant-cascader-menu-item-content'});
    fireEvent.click(org.closest('li')!.querySelector('.ant-cascader-checkbox')!);
    fireEvent.click(screen.getByLabelText('标题'));
    fireEvent.click(screen.getByRole('button',{name:/保\s*存/}));
    await waitFor(()=>expect(listWorkbenchFeeds()[0].title).toBe('信息广场验收'));
    expect(listWorkbenchFeeds()[0]).toMatchObject({type:'square',tags:['经验分享'],audienceScopes:[['shichuang']]});
    expect(listWorkbenchFeeds()[0].projectId).toBeUndefined();
    view.unmount();render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    expect(await screen.findByRole('heading',{name:'信息广场验收'})).toBeInTheDocument();
  });
  it('requires information tags and the organization range before saving', async () => {
    sessionStorage.setItem('shichuang.workbench.feedTab','square');
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'新建'}));
    fireEvent.change(screen.getByLabelText('标题'),{target:{value:'必填验证'}});
    fireEvent.change(screen.getByLabelText('信息简介'),{target:{value:'正文'}});
    await waitFor(()=>expect(screen.getByRole('button',{name:/保\s*存/})).not.toBeDisabled());
    fireEvent.click(screen.getByRole('button',{name:/保\s*存/}));
    expect(await screen.findByText('请选择信息标签',{selector:'.ant-form-item-explain-error'})).toBeInTheDocument();
    expect(await screen.findByText('请选择可见范围',{selector:'.ant-form-item-explain-error'})).toBeInTheDocument();
    expect(listWorkbenchFeeds().some(feed=>feed.title==='必填验证')).toBe(false);
  });
  it('retains search and returns to the originating page', async () => {
    const back=vi.fn();render(<WorkbenchFeedsView onBack={back} backLabel="返回代理商待办"/>);
    fireEvent.click(screen.getByRole('button',{name:'返回代理商待办'}));expect(back).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('搜索动态与评价')).toHaveAttribute('placeholder','搜索标题');
  });
  const seed = () => localStorage.setItem(FEEDS_KEY, JSON.stringify([{ id: 'editable', type: 'competitor', title: '可编辑资讯', content: '原简介', contentHtml: '<p>原简介</p>', newsType: '专家报告', tags:['专家报告'], audienceScopes:[['shichuang']], time: '2026-10-20T00:00:00Z', authorId: 'me', visibility: 'all' }]));
  it('完整列表仅点击标题打开详情', async () => {
    seed(); sessionStorage.setItem('shichuang.workbench.feedTab', 'competitor');
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    const title = await screen.findByRole('heading', { name: '可编辑资讯' });
    fireEvent.click(title.closest('article')!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(within(title).getByRole('button', { name: '可编辑资讯' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
  async function editSeed() {
    seed(); sessionStorage.setItem('shichuang.workbench.feedTab', 'competitor');
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: '可编辑资讯' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.querySelector('.ant-modal-header')).not.toHaveTextContent('编辑');
    expect(dialog.querySelector('.ant-modal-footer')).toHaveTextContent('编辑');
    fireEvent.click(within(dialog).getByRole('button', { name: /^编\s*辑$/ }));
    return dialog;
  }
  it('在同一居中弹窗切换编辑，保存标题、分类、富文本后回详情并刷新数量', async () => {
    const dialog = await editSeed();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(document.querySelectorAll('.workbench-feed-modal')).toHaveLength(1);
    expect(document.querySelector('.ant-drawer')).toBeNull();
    expect(within(dialog).getByRole('button', { name: /取\s*消/ })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /保\s*存/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '修改后的资讯' } });
    fireEvent.change(screen.getByLabelText('信息简介'), { target: { value: '修改后的正文' } });
    await option('信息标签', '政策文件');
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(within(dialog).getByRole('heading', { name: '修改后的资讯' })).toBeInTheDocument());
    expect(within(dialog).getByText(/政策文件/)).toBeInTheDocument();
    expect(within(dialog).getByText('修改后的正文').tagName).toBe('STRONG');
    expect(screen.getByRole('tab', { name: '信息广场 (1)' })).toBeInTheDocument();
    expect(listWorkbenchFeeds()[0]).toMatchObject({ title: '修改后的资讯', contentHtml: '<p><strong>修改后的正文</strong></p>' });
  });
  it('未修改直接取消，有修改可继续编辑或确认放弃，均不保存', async () => {
    let confirmation: any;
    vi.spyOn(Modal, 'confirm').mockImplementation(options => { confirmation = options; return { destroy: vi.fn(), update: vi.fn() } as any; });
    await editSeed();
    fireEvent.click(screen.getByRole('button', { name: '取 消' }));
    expect(screen.queryByText('是否放弃本次编辑')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^编\s*辑$/ }));
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '未保存标题' } });
    fireEvent.click(screen.getByRole('button', { name: '取 消' }));
    expect(confirmation.title).toBe('是否放弃本次编辑');
    act(() => confirmation.onCancel());
    expect(screen.getByLabelText('标题')).toHaveValue('未保存标题');
    fireEvent.click(screen.getByRole('button', { name: '取 消' }));
    act(() => confirmation.onOk());
    await waitFor(() => expect(screen.queryByLabelText('标题')).not.toBeInTheDocument());
    expect(listWorkbenchFeeds()[0].title).toBe('可编辑资讯');
    expect(within(screen.getByRole('dialog')).getByRole('heading', { name: '可编辑资讯' })).toBeInTheDocument();
  });
  it('删除二次确认，取消保留，确认关闭详情并同步数量与存储', async () => {
    let confirmation: any;
    vi.spyOn(Modal, 'confirm').mockImplementation(options => { confirmation = options; return { destroy: vi.fn(), update: vi.fn() } as any; });
    seed(); sessionStorage.setItem('shichuang.workbench.feedTab', 'competitor');
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: '可编辑资讯' }));
    fireEvent.click(screen.getByRole('button', { name: /^删\s*除$/ }));
    expect(confirmation.title).toBe('删除“可编辑资讯”？');
    expect(listWorkbenchFeeds()).toHaveLength(1);
    act(() => confirmation.onCancel?.());
    expect(listWorkbenchFeeds()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^删\s*除$/ }));
    act(() => confirmation.onOk());
    await waitFor(() => expect(screen.queryByRole('heading', { name: '可编辑资讯' })).not.toBeInTheDocument());
    expect(listWorkbenchFeeds()).toHaveLength(0);
    expect(screen.getByRole('tab', { name: '信息广场 (0)' })).toBeInTheDocument();
  });
  it('来源同步的信息暂时开放编辑和删除', async () => {
    seed(); const [feed] = listWorkbenchFeeds();
    localStorage.setItem(FEEDS_KEY, JSON.stringify([{ ...feed, source: { module: '产品', recordId: 'source' } }]));
    sessionStorage.setItem('shichuang.workbench.feedTab', 'competitor');
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: '可编辑资讯' }));
    expect(within(screen.getByRole('dialog')).getAllByRole('button', { name: /编\s*辑|删\s*除/ })).toHaveLength(2);
  });

});

it('信息广场按标签与标题组合筛选，产品动态保留产品筛选', async () => {
 localStorage.setItem(FEEDS_KEY,JSON.stringify([{id:'a',type:'square',title:'报告标题',content:'正文关键词',time:'2026-10-22',tags:['专家报告']},{id:'b',type:'square',title:'分享标题',content:'正文',time:'2026-10-22',tags:['经验分享']}]));
 sessionStorage.setItem('shichuang.workbench.feedTab','square');
 render(<WorkbenchFeedsView onBack={vi.fn()}/>);
 expect(await screen.findByRole('button',{name:'报告标题'})).toBeInTheDocument();
 expect(screen.queryByLabelText('筛选关联产品')).not.toBeInTheDocument();
 await option('选择标签','专家报告');
 expect(screen.queryByRole('button',{name:'分享标题'})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('搜索动态与评价'),{target:{value:'正文关键词'}});
 expect(screen.queryByRole('button',{name:'报告标题'})).not.toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('搜索动态与评价'),{target:{value:'报告'}});
 expect(screen.getByRole('button',{name:'报告标题'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('tab',{name:/产品动态/}));
 expect(screen.getByLabelText('筛选关联产品')).toBeInTheDocument();
 expect(screen.queryByLabelText('选择标签')).not.toBeInTheDocument();
});
