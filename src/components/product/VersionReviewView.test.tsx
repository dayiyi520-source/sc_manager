// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VersionReviewView } from './VersionReviewView';

const mocks = vi.hoisted(() => ({
  allVersionReviews: vi.fn(),
  versionReviews: vi.fn(),
  versionReview: vi.fn(),
  workItems: vi.fn(),
  createAndSubmitVersionReview: vi.fn(),
}));

vi.mock('../../services/productRepository', () => ({ productRepository: {
  allVersionReviews: mocks.allVersionReviews,
  versionReviews: mocks.versionReviews,
  versionReview: mocks.versionReview,
  createVersionReview: vi.fn(),
  createAndSubmitVersionReview: mocks.createAndSubmitVersionReview,
  updateVersionReview: vi.fn(),
  updateAndSubmitVersionReview: vi.fn(),
  submitVersionReview: vi.fn(),
  deleteVersionReview: vi.fn(),
  workItems: mocks.workItems,
} }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ productLines: [{ id: 'line-1', name: '星河平台', versions: [{ id: 'version-1', name: '秋季迭代' }] }] }) }));

const renderView = (productLineFilter = 'all') => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><VersionReviewView productLineFilter={productLineFilter} /></QueryClientProvider>);

describe('VersionReviewView', () => {
  beforeEach(() => {
    mocks.allVersionReviews.mockResolvedValue([{ id: 'review-1', meetingTopic: '秋季版本评审会', reviewType: '版本评审', productLineId: 'line-1', productLineName: '星河平台', versionId: 'version-1', versionName: '秋季迭代', initiatorName: '张三', participantNames: '李四、王五', reviewDate: '2026-09-21', participantCount: 3, conclusion: '通过', status: 'SUBMITTED', revision: 1, createdAt: '2026-09-21T08:00:00Z', updatedAt: '2026-09-21T09:00:00Z' }]);
    mocks.versionReviews.mockResolvedValue([]);
    mocks.versionReview.mockResolvedValue({ id: 'review-1', meetingTopic: '秋季版本评审会', reviewType: '版本评审', reviewDate: '2026-09-21', participantCount: 3, conclusion: '通过', summary: '评审完成', status: 'SUBMITTED', revision: 1, createdAt: '2026-09-21T08:00:00Z', updatedAt: '2026-09-21T09:00:00Z', participants: [] });
    mocks.workItems.mockResolvedValue({ page: { items: [], total: 0 } });
  });

  it('shows the global review list before a product version is selected', async () => {
    renderView();
    expect(await screen.findByText('星河平台')).toBeInTheDocument();
    expect(screen.getByText('秋季迭代')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '产品线' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '迭代版本' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '会议主题' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '评审类型' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '发起人' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '参与人' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '详情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '参与人数' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '结论' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '状态' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '更新时间' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建评审/ })).toBeEnabled();
  }, 15000);

  it('opens a global row in its own product and version context', async () => {
    renderView();
    fireEvent.click(await screen.findByText('星河平台'));
    await waitFor(() => expect(mocks.versionReview).toHaveBeenCalledWith('line-1', 'version-1', 'review-1'));
    expect(await screen.findByDisplayValue('评审完成')).toBeInTheDocument();
  });

  it('moves product and version selection into the create form', async () => {
    renderView();
    await screen.findByText('星河平台');
    expect(screen.queryByLabelText('评审产品线')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /新建评审/ }));
    expect(await screen.findByLabelText('会议主题')).toBeInTheDocument();
    expect(screen.getByLabelText('会议类型')).toBeInTheDocument();
    expect(screen.getByLabelText('所属产品线')).toBeInTheDocument();
    expect(screen.getByLabelText('所属版本')).toBeInTheDocument();
    expect(screen.getByLabelText('会议时间')).toBeInTheDocument();
    expect(screen.getByLabelText('参与人')).toBeInTheDocument();
    expect(screen.getByLabelText('关联任务')).toBeInTheDocument();
    expect(screen.getByLabelText('评审结论')).toBeInTheDocument();
    expect(screen.getByLabelText('议题结论')).toBeInTheDocument();
    expect(screen.getByLabelText('遗留问题')).toBeInTheDocument();
    expect(screen.getByText('会议附件')).toBeInTheDocument();
  });

  it('shows an empty state when no accessible reviews exist', async () => {
    mocks.allVersionReviews.mockResolvedValueOnce([]);
    renderView();
    expect(await screen.findByText('暂无可访问的版本评审')).toBeInTheDocument();
  });

  it('prefills the active product line when creating from product context', async () => {
    renderView('line-1');
    await screen.findByText('秋季版本评审会');
    fireEvent.click(screen.getByRole('button', { name: /新建评审/ }));
    expect(await screen.findByLabelText('所属产品线')).toHaveAttribute('disabled');
    expect(screen.getByText('星河平台')).toBeInTheDocument();
  });
});
