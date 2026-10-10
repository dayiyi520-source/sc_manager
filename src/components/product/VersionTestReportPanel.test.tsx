/* @vitest-environment jsdom */
import React from 'react';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VersionTestReportPanel } from './VersionTestReportPanel';

const mocks = vi.hoisted(() => ({
  create: vi.fn(), update: vi.fn(), remove: vi.fn(), download: vi.fn(), confirm: vi.fn(),
  testReports: vi.fn(),
  versionTestReports: vi.fn(),
  versionTestReport: vi.fn(),
}));

vi.mock('../../services/productRepository', () => ({ productRepository: {
  testReports: mocks.testReports,
  versionTestReports: mocks.versionTestReports,
  versionTestReport: mocks.versionTestReport,
  createVersionTestReport: mocks.create,
  updateVersionTestReport: mocks.update,
  deleteVersionTestReport: mocks.remove,
} }));
vi.mock('../../utils/testReportDownload', () => ({ downloadTestReport: mocks.download }));
vi.mock('../common/Feedback', () => ({ showDeleteConfirm: mocks.confirm }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ productLines: [{ id: 'line-1', name: '核心产品', versions: [{ id: 'version-1', name: '秋季迭代' }] }] }) }));
vi.mock('./LazyRichTextEditor', () => ({ LazyRichTextEditor: () => <div>报告总结编辑器</div> }));

const renderPanel = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ConfigProvider theme={{ token: { motion: false } }}><VersionTestReportPanel productLineId="line-1" versionId="version-1" versionName="秋季迭代" /></ConfigProvider></QueryClientProvider>);

describe('VersionTestReportPanel', () => {
  it('persists a new report with empty plans and keeps the form and error on failure', async () => {
    mocks.create.mockRejectedValueOnce(new Error('存储空间不足')).mockResolvedValueOnce({ id: 'saved-report' });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /新建报告/ }));
    const dialog = screen.getByRole('dialog', { name: '新建测试报告' });
    fireEvent.change(within(dialog).getByLabelText('报告名称'), { target: { value: '新报告' } });
    fireEvent.mouseDown(within(dialog).getByLabelText('报告类型'));
    fireEvent.click(await screen.findByText('功能测试', { selector: '.ant-select-item-option-content' }));
    fireEvent.change(dialog.querySelector('input[type="file"]')!, { target: { files: [new File(['image'], '测试截图.png', { type: 'image/png' })] } });
    expect(await within(dialog).findByText('测试截图.png')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /新\s*建/ }));
    expect(await within(dialog).findByText('存储空间不足')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('报告名称')).toHaveValue('新报告');
    expect(mocks.create).toHaveBeenCalledWith('line-1', 'version-1', expect.objectContaining({ name: '新报告', reportType: '功能测试', attachments: [expect.objectContaining({ name: '测试截图.png', url: expect.stringContaining('data:image/png;base64,') })] }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /新\s*建/ })).not.toHaveClass('ant-btn-loading'));
    mocks.versionTestReports.mockResolvedValue([{ id: 'saved-report', name: '新报告', productLineId: 'line-1', revision: 0 }]);
    fireEvent.click(within(dialog).getByRole('button', { name: /新\s*建/ }));
    expect(await screen.findByText('新报告')).toBeInTheDocument();
    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(mocks.versionTestReports).toHaveBeenCalledTimes(2);
  });

  it('downloads the latest detail and deletes only after confirmation', async () => {
    const item = { id: 'report-1', name: '回归报告', productLineId: 'line-1', versionId: 'version-1', revision: 3 };
    mocks.versionTestReports.mockResolvedValue([item]);
    mocks.versionTestReport.mockResolvedValue({ ...item, summary: '最新总结' });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: '更多报告操作' }));
    fireEvent.click(await screen.findByText('下载报告'));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledWith(expect.objectContaining({ summary: '最新总结' })));
    fireEvent.click(screen.getByRole('button', { name: '更多报告操作' }));
    fireEvent.click(await screen.findByText('删除'));
    expect(mocks.remove).not.toHaveBeenCalled();
    mocks.versionTestReports.mockResolvedValue([]);
    await mocks.confirm.mock.calls[0][0].onOk();
    expect(mocks.remove).toHaveBeenCalledWith('line-1', 'version-1', 'report-1', 3);
    expect(await screen.findByText('暂无测试报告')).toBeInTheDocument();
  });

  beforeEach(() => {
    mocks.create.mockReset(); mocks.update.mockReset(); mocks.remove.mockReset(); mocks.download.mockReset(); mocks.confirm.mockReset();
    mocks.testReports.mockReset();
    mocks.versionTestReports.mockReset();
    mocks.versionTestReport.mockReset();
    mocks.testReports.mockResolvedValue([]);
    mocks.versionTestReports.mockResolvedValue([]);
  });

  it('requires an attachment and filters the list by the selected product', async () => {
    mocks.testReports.mockResolvedValue([{ id: 'r1', name: '产品一报告', productLineId: 'line-1' }, { id: 'r2', name: '其他产品报告', productLineId: 'line-2' }]);
    render(<QueryClientProvider client={new QueryClient()}><VersionTestReportPanel productLineId="line-1" versionId="" versionName="" /></QueryClientProvider>);
    expect(await screen.findByText('产品一报告')).toBeInTheDocument();
    expect(screen.queryByText('其他产品报告')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /新建报告/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('报告名称'), { target: { value: '报告' } });
    fireEvent.mouseDown(within(dialog).getByLabelText('报告类型'));
    fireEvent.click(await screen.findByText('功能测试', { selector: '.ant-select-item-option-content' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /新\s*建/ }));
    expect(await within(dialog).findByText('请上传至少一个报告附件')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('shows the empty action and opens the searchable multi-select form', async () => {
    renderPanel();
    expect(await screen.findByText('暂无测试报告')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /新建报告/ }));
    expect(screen.getByRole('dialog', { name: '新建测试报告' })).toBeInTheDocument();
    expect(screen.getByLabelText('报告名称')).toBeInTheDocument();
    expect(await screen.findByLabelText('报告类型')).toBeInTheDocument();
    expect(screen.getByLabelText('选择产品')).toBeInTheDocument();
    expect(screen.getByLabelText('选择迭代')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /选择本地文件/ })).toBeInTheDocument();
  });

  it('renders report list fields and the top-right create action', async () => {
    mocks.versionTestReports.mockResolvedValue([{ id: 'report-1', name: '回归报告', productLineId: 'line-1', reportType: '回归测试', productLineName: '核心产品', versionName: '秋季迭代', creatorName: '张三', firstPlanName: '冒烟计划', planCount: 2, revision: 0, createdAt: '2026-09-19T10:00:00', updatedAt: '2026-09-19T10:00:00' }]);
    renderPanel();
    expect(await screen.findByText('回归报告')).toBeInTheDocument();
    expect(screen.queryByText('关联测试计划')).not.toBeInTheDocument();
    expect(screen.getByText('回归测试')).toBeInTheDocument();
    expect(screen.getByText('核心产品')).toBeInTheDocument();
    expect(screen.getByText('秋季迭代')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建报告/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑报告' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '更多报告操作' }));
    expect(await screen.findByText('下载报告')).toBeInTheDocument();
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('allows editing the report type and cancels back to the report list', async () => {
    mocks.versionTestReports.mockResolvedValue([{ id: 'report-1', name: '回归报告', reportType: '回归测试', productLineId: 'line-1', productLineName: '核心产品', versionId: 'version-1', versionName: '秋季迭代', creatorName: '张三', firstPlanName: '冒烟计划', planCount: 1, revision: 0, createdAt: '2026-09-19T10:00:00', updatedAt: '2026-09-19T10:00:00' }]);
    mocks.versionTestReport.mockResolvedValue({
      id: 'report-1', name: '回归报告', reportType: '回归测试', summary: '本轮回归通过', creatorName: '张三', versionName: '秋季迭代', planCount: 1, revision: 0,
      createdAt: '2026-09-19T10:00:00', updatedAt: '2026-09-19T10:00:00',
      plans: [{ id: 'plan-1', name: '冒烟计划', taskTitle: '登录测试', ownerName: '测试员', status: '已完成', passRate: 100 }],
      statistics: { total: 1, defects: 0, urgent: 0, severe: 0 },
      resultDistribution: [{ name: '已通过', value: 1 }], repairDistribution: [{ name: '已解决', value: 0 }],
      severityDistribution: [], priorityDistribution: [], urgentDefects: [],
    });

    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: '编辑报告' }));

    const editDialog = await screen.findByRole('dialog', { name: '编辑测试报告' });
    expect(editDialog).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '返回报告列表' })).not.toBeInTheDocument();
    expect(await screen.findByLabelText('报告类型')).toBeInTheDocument();
    expect(screen.getByLabelText('选择产品')).toBeInTheDocument();
    expect(screen.getByLabelText('选择迭代')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /选择本地文件/ })).toBeInTheDocument();
    expect(screen.queryByText('报告总结编辑器')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /取\s*消/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存报告/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /取\s*消/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '编辑测试报告' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '编辑报告' })).toBeInTheDocument();
  });

  it('requires an attachment when editing and preserves the report revision', async () => {
    mocks.versionTestReports.mockResolvedValue([{ id: 'report-empty', name: '无计划报告', productLineId: 'line-1', versionId: 'version-1', revision: 2 }]);
    mocks.versionTestReport.mockResolvedValue({ id: 'report-empty', name: '无计划报告', reportType: '功能测试', summary: '', revision: 2, attachments: [{ name: '原报告.pdf', url: 'data:application/pdf;base64,AAAA' }], plans: [], statistics: { total: 0, defects: 0, urgent: 0, severe: 0 }, resultDistribution: [], repairDistribution: [], severityDistribution: [], priorityDistribution: [], urgentDefects: [] });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: '编辑报告' }));
    await screen.findByLabelText('报告名称');
    fireEvent.click(screen.getByRole('button', { name: /保存报告/ }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('line-1', 'version-1', 'report-empty', expect.objectContaining({ revision: 2 })));
  });

  it('renders the global report list without selecting a product line or iteration first', async () => {
    mocks.testReports.mockResolvedValue([{ id: 'report-global', name: '全局测试报告', reportType: '测试报告', productLineId: 'line-1', productLineName: '核心产品', versionId: 'version-1', versionName: '秋季迭代', creatorName: '张三', firstPlanName: '冒烟计划', planCount: 1, revision: 0, createdAt: '2026-09-19T10:00:00', updatedAt: '2026-09-19T10:00:00' }]);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VersionTestReportPanel productLineId="" versionId="" versionName="" /></QueryClientProvider>);

    expect(await screen.findByText('全局测试报告')).toBeInTheDocument();
    expect(mocks.testReports).toHaveBeenCalledTimes(1);
    expect(mocks.versionTestReports).not.toHaveBeenCalled();
    expect(screen.getByText('核心产品')).toBeInTheDocument();
    expect(screen.getByText('秋季迭代')).toBeInTheDocument();
  });
});
