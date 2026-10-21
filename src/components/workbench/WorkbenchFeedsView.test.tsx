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
    fireEvent.click(await screen.findByRole('tab', { name: '评价吐槽 (1)' }));
    expect(feedReading('me').browsed).toContain(feed.id);
    expect(feedReading('me').opened).not.toContain(feed.id);
    expect(screen.getByLabelText('搜索动态与评价').closest('.workbench-search')).toBeInTheDocument();
    expect(screen.getByLabelText('新消息')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '产品动态 (0)' }));
    fireEvent.click(screen.getByRole('tab', { name: '评价吐槽 (1)' }));
    expect(screen.getByLabelText('新消息')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: feed.title }));
    await waitFor(() => expect(feedReading('me').opened).toContain(feed.id));
    expect(screen.queryByLabelText('新消息')).not.toBeInTheDocument();
    view.unmount();
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    await screen.findByRole('button', { name: feed.title });
    expect(screen.queryByLabelText('新消息')).not.toBeInTheDocument();
  });

  it('产品版本联动清空旧值，保存后刷新恢复', async () => {
    const result = render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: '新建' }));
    const createDialog = await screen.findByRole('dialog');
    expect(createDialog.closest('.workbench-feed-modal')).toBeInTheDocument();
    expect(createDialog).toHaveStyle({ padding: '0px' });
    expect(createDialog.querySelector('.ant-modal-header')).toHaveStyle({ padding: '16px 24px' });
    expect(createDialog.querySelector('.ant-modal-body')).toHaveStyle({ padding: '0px' });
    expect(createDialog.querySelector('form')).toHaveStyle({ padding: '24px' });
    expect(within(createDialog).getByRole('button', { name: /取\s*消/ })).toBeInTheDocument();
    expect(within(createDialog).getByRole('button', { name: /保\s*存/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '测试产品发布' } });
    fireEvent.change(screen.getByLabelText('信息简介'), { target: { value: '版本已完成验证' } });
    await option('关联产品', '产品甲'); await option('关联版本', 'V1');
    await option('关联产品', '产品乙');
    expect(screen.getByLabelText('关联版本').closest('.ant-select')).not.toHaveTextContent('V1');
    await option('关联版本', 'V2');
    const before = listWorkbenchFeeds().length;
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(listWorkbenchFeeds()[0].authorId).toBe('me'));
    expect(listWorkbenchFeeds()).toHaveLength(before + 1);
    expect(listWorkbenchFeeds()[0]).toMatchObject({ title: '测试产品发布', productName: '产品乙', versionName: 'V2' });
    result.unmount(); render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    expect(await screen.findByRole('heading', { name: '测试产品发布' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '测试产品发布' }));
    fireEvent.click(await screen.findByRole('button', { name: /^编\s*辑$/ }));
    expect(await screen.findByDisplayValue('测试产品发布')).toBeInTheDocument();
    expect(screen.getByLabelText('信息简介')).toHaveValue('版本已完成验证');
    fireEvent.change(screen.getByLabelText('信息简介'), { target: { value: '更新后的简介' } });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(listWorkbenchFeeds()[0].content).toBe('更新后的简介'));
    expect(listWorkbenchFeeds()).toHaveLength(before + 1);
  });
  it('评价选择项目自动回显客户，类型切换清理产品关联', async () => {
    render(<WorkbenchFeedsView onBack={vi.fn()}/>); fireEvent.click(screen.getByRole('button', { name: '新建' }));
    await option('关联产品', '产品甲');
    await option('类型', '评价吐槽');
    await waitFor(() => expect(screen.getByLabelText('关联产品').closest('.ant-select')).toHaveClass('ant-select-disabled'));
    await option('关联项目', '项目甲');
    await option('关联产品', '产品甲');
    expect(await screen.findByDisplayValue('客户甲')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '测试项目评价' } });
    fireEvent.change(screen.getByLabelText('信息简介'), { target: { value: '客户反馈' } });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(listWorkbenchFeeds()[0].authorId).toBe('me'));
    expect(listWorkbenchFeeds()[0]).toMatchObject({ customer: '客户甲', projectName: '项目甲', productId: 'p', productName: '产品甲' });
    expect(sessionStorage.getItem('shichuang.workbench.feedTab')).toBe('feedback');
  });
  it('行业资讯移除活动且没有客户字段，保存失败可重试', async () => {
    sessionStorage.setItem('shichuang.workbench.feedTab', 'competitor');
    render(<WorkbenchFeedsView onBack={vi.fn()}/>); fireEvent.click(screen.getByRole('button', { name: '新建' }));
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '行业交流记录' } });
    fireEvent.change(screen.getByLabelText('信息简介'), { target: { value: '交流内容' } });
    expect(screen.queryByLabelText('关联活动')).not.toBeInTheDocument();
    await option('资讯类型', '专家报告');
    expect(screen.queryByLabelText('关联客户')).not.toBeInTheDocument();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    expect(await screen.findByText('保存失败，浏览器存储不可用或空间不足，请重试')).toBeInTheDocument();
    expect(screen.getByDisplayValue('行业交流记录')).toBeInTheDocument();
    write.mockRestore(); fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(listWorkbenchFeeds()[0]).toMatchObject({ title: '行业交流记录', newsType: '专家报告' }));
  });

  it('指定范围支持勾选部门和单个成员，保存为去重成员范围', async () => {
    sessionStorage.setItem('shichuang.workbench.feedTab', 'competitor');
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: '新建' }));
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '部门共享资讯' } });
    fireEvent.change(screen.getByLabelText('信息简介'), { target: { value: '指定范围内容' } });
    await option('资讯类型', '专家报告');
    await option('可见范围', '指定人员');
    fireEvent.mouseDown(await screen.findByLabelText('可见人员'));
    const department = await screen.findByText('产品部', { selector: '.ant-select-tree-title' });
    fireEvent.click(department.closest('.ant-select-tree-treenode')!.querySelector('.ant-select-tree-checkbox')!);
    const member = await screen.findByText('其他成员', { selector: '.ant-select-tree-title' });
    fireEvent.click(member.closest('.ant-select-tree-treenode')!.querySelector('.ant-select-tree-checkbox')!);
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(listWorkbenchFeeds()[0].title).toBe('部门共享资讯'));
    expect(listWorkbenchFeeds()[0].audienceIds?.sort()).toEqual(['me', 'other', 'third']);
  });

  it('移除标题说明区并可返回我的待办，输入框具有指定占位文案', async () => {
    const back = vi.fn(); render(<WorkbenchFeedsView onBack={back}/>);
    expect(screen.queryByRole('heading', { name: '动态与评价' })).not.toBeInTheDocument();
    expect(screen.queryByText('查看产品动态、项目评价与行业资讯')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回我的待办' })); expect(back).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '新建' }));
    expect(screen.getByPlaceholderText('请输入标题')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入信息简介')).toBeInTheDocument();
  });

  const seed = () => localStorage.setItem(FEEDS_KEY, JSON.stringify([{ id: 'editable', type: 'competitor', title: '可编辑资讯', content: '原简介', contentHtml: '<p>原简介</p>', newsType: '专家报告', time: '2026-10-20T00:00:00Z', authorId: 'me', visibility: 'all' }]));
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
    await option('资讯类型', '政策文件');
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(within(dialog).getByRole('heading', { name: '修改后的资讯' })).toBeInTheDocument());
    expect(within(dialog).getByText('政策文件')).toBeInTheDocument();
    expect(within(dialog).getByText('修改后的正文').tagName).toBe('STRONG');
    expect(screen.getByRole('tab', { name: '行业资讯 (1)' })).toBeInTheDocument();
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
    expect(screen.getByRole('tab', { name: '行业资讯 (0)' })).toBeInTheDocument();
  });
  it('来源同步的信息不显示编辑和删除', async () => {
    seed(); const [feed] = listWorkbenchFeeds();
    localStorage.setItem(FEEDS_KEY, JSON.stringify([{ ...feed, source: { module: '产品', recordId: 'source' } }]));
    sessionStorage.setItem('shichuang.workbench.feedTab', 'competitor');
    render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(await screen.findByRole('button', { name: '可编辑资讯' }));
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /编\s*辑|删\s*除/ })).toBeNull();
  });

});
