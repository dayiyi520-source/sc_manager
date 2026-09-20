/* @vitest-environment jsdom */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VersionTestReportPanel } from './VersionTestReportPanel';

const mocks = vi.hoisted(() => ({
  testReports: vi.fn(),
  versionTestReports: vi.fn(),
  versionTestReportPlans: vi.fn(),
}));

vi.mock('../../services/productRepository', () => ({ productRepository: {
  testReports: mocks.testReports,
  versionTestReports: mocks.versionTestReports,
  versionTestReportPlans: mocks.versionTestReportPlans,
  versionTestReport: vi.fn(),
  createVersionTestReport: vi.fn(),
  updateVersionTestReport: vi.fn(),
  deleteVersionTestReport: vi.fn(),
} }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ productLines: [{ id: 'line-1', name: '核心产品线', versions: [{ id: 'version-1', name: '秋季迭代' }] }] }) }));
vi.mock('./LazyRichTextEditor', () => ({ LazyRichTextEditor: () => <div>报告总结编辑器</div> }));

const renderPanel = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VersionTestReportPanel productLineId="line-1" versionId="version-1" versionName="秋季迭代" /></QueryClientProvider>);

describe('VersionTestReportPanel', () => {
  beforeEach(() => {
    mocks.testReports.mockReset();
    mocks.versionTestReports.mockReset();
    mocks.versionTestReportPlans.mockReset();
    mocks.testReports.mockResolvedValue([]);
    mocks.versionTestReports.mockResolvedValue([]);
    mocks.versionTestReportPlans.mockResolvedValue([{ id: 'plan-1', name: '冒烟计划', taskTitle: '登录测试', ownerName: '测试员' }]);
  });

  it('shows the empty action and opens the searchable multi-select form', async () => {
    renderPanel();
    expect(await screen.findByText('暂无测试报告')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /新建报告/ }));
    expect(screen.getByRole('dialog', { name: '新建测试报告' })).toBeInTheDocument();
    expect(screen.getByLabelText('报告名称')).toBeInTheDocument();
    expect(screen.getByLabelText('选择产品线')).toBeInTheDocument();
    expect(screen.getByLabelText('选择迭代')).toBeInTheDocument();
    expect(screen.getByLabelText('关联计划')).toBeInTheDocument();
  });

  it('renders report list fields and the top-right create action', async () => {
    mocks.versionTestReports.mockResolvedValue([{ id: 'report-1', name: '回归报告', reportType: '测试报告', productLineName: '核心产品线', versionName: '秋季迭代', creatorName: '张三', firstPlanName: '冒烟计划', planCount: 2, revision: 0, createdAt: '2026-09-19T10:00:00', updatedAt: '2026-09-19T10:00:00' }]);
    renderPanel();
    expect(await screen.findByText('回归报告')).toBeInTheDocument();
    expect(screen.getByText('冒烟计划等2个')).toBeInTheDocument();
    expect(screen.getByText('测试报告')).toBeInTheDocument();
    expect(screen.getByText('核心产品线')).toBeInTheDocument();
    expect(screen.getByText('秋季迭代')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建报告/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /修改/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
  });

  it('renders the global report list without selecting a product line or iteration first', async () => {
    mocks.testReports.mockResolvedValue([{ id: 'report-global', name: '全局测试报告', reportType: '测试报告', productLineId: 'line-1', productLineName: '核心产品线', versionId: 'version-1', versionName: '秋季迭代', creatorName: '张三', firstPlanName: '冒烟计划', planCount: 1, revision: 0, createdAt: '2026-09-19T10:00:00', updatedAt: '2026-09-19T10:00:00' }]);
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VersionTestReportPanel productLineId="" versionId="" versionName="" /></QueryClientProvider>);

    expect(await screen.findByText('全局测试报告')).toBeInTheDocument();
    expect(mocks.testReports).toHaveBeenCalledTimes(1);
    expect(mocks.versionTestReports).not.toHaveBeenCalled();
    expect(screen.getByText('核心产品线')).toBeInTheDocument();
    expect(screen.getByText('秋季迭代')).toBeInTheDocument();
  });
});
