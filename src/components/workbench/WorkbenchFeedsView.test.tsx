// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkbenchFeedsView } from './WorkbenchFeedsView';
import { listWorkbenchFeeds } from '../../services/workbenchFeeds';
vi.mock('./okr/OkrProvider', () => ({ OkrProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ productLines: [{ id: 'p', name: '产品甲', versions: [{ id: 'v', name: 'V1' }] }, { id: 'p2', name: '产品乙', versions: [{ id: 'v2', name: 'V2' }] }], versions: [], projects: [{ id: 'j', name: '项目甲', customerId: 'c', customerName: '客户甲' }], customers: [{ id: 'c', name: '客户甲' }], currentUser: { id: 'me', name: '本人' } }) }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function option(label: string, text: string) {
  fireEvent.mouseDown(await screen.findByLabelText(label));
  fireEvent.click(await screen.findByText(text, { selector: '.ant-select-item-option-content' }));
}
describe('动态与评价新增', () => {
  it('产品版本联动清空旧值，保存后刷新恢复', async () => {
    const result = render(<WorkbenchFeedsView onBack={vi.fn()}/>);
    fireEvent.click(screen.getByRole('button', { name: '新增动态与评价' }));
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '测试产品发布' } });
    fireEvent.change(screen.getByLabelText('简要'), { target: { value: '版本已完成验证' } });
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
  });
  it('评价选择项目自动回显客户，类型切换清理产品关联', async () => {
    render(<WorkbenchFeedsView onBack={vi.fn()}/>); fireEvent.click(screen.getByRole('button', { name: '新增动态与评价' }));
    await option('关联产品', '产品甲');
    await option('类型', '评价吐槽');
    await option('关联项目', '项目甲');
    expect(await screen.findByDisplayValue('客户甲')).toHaveAttribute('readonly');
    expect(screen.queryByLabelText('关联产品')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '测试项目评价' } });
    fireEvent.change(screen.getByLabelText('简要'), { target: { value: '客户反馈' } });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(listWorkbenchFeeds()[0].authorId).toBe('me'));
    expect(listWorkbenchFeeds()[0]).toMatchObject({ customer: '客户甲', projectName: '项目甲' });
    expect(listWorkbenchFeeds()[0].productId).toBeUndefined();
    expect(sessionStorage.getItem('shichuang.workbench.feedTab')).toBe('feedback');
  });
  it('行业资讯选择资讯类型、活动选填且没有客户字段，保存失败可重试', async () => {
    sessionStorage.setItem('shichuang.workbench.feedTab', 'competitor');
    render(<WorkbenchFeedsView onBack={vi.fn()}/>); fireEvent.click(screen.getByRole('button', { name: '新增动态与评价' }));
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '行业交流记录' } });
    fireEvent.change(screen.getByLabelText('简要'), { target: { value: '交流内容' } });
    fireEvent.change(await screen.findByLabelText('关联活动'), { target: { value: '产品交流会' } });
    await option('资讯类型', '专家报告');
    expect(screen.queryByLabelText('关联客户')).not.toBeInTheDocument();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    expect(await screen.findByText('保存失败，浏览器存储不可用或空间不足，请重试')).toBeInTheDocument();
    expect(screen.getByDisplayValue('行业交流记录')).toBeInTheDocument();
    write.mockRestore(); fireEvent.click(screen.getByRole('button', { name: '保 存' }));
    await waitFor(() => expect(listWorkbenchFeeds()[0]).toMatchObject({ title: '行业交流记录', activityName: '产品交流会', newsType: '专家报告' }));
  });

  it('移除标题说明区并可返回我的任务，输入框具有指定占位文案', async () => {
    const back = vi.fn(); render(<WorkbenchFeedsView onBack={back}/>);
    expect(screen.queryByRole('heading', { name: '动态与评价' })).not.toBeInTheDocument();
    expect(screen.queryByText('查看产品动态、项目评价与行业资讯')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回我的任务' })); expect(back).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '新增动态与评价' }));
    expect(screen.getByPlaceholderText('请输入标题')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('请输入内容简要')).toBeInTheDocument();
  });

});
