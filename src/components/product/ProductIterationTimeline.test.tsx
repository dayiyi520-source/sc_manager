/* @vitest-environment jsdom */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductIterationTimeline } from './ProductIterationTimeline';
import { productRepository } from '../../services/productRepository';

vi.mock('../../services/productRepository', () => ({ productRepository: { iterationTimeline: vi.fn() } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const versions = [{ id: 'v', name: '秋季版本 V1.0', code: 'V1.0', status: '进行中', startDate: '2026-09-01', endDate: '2026-10-30' }];
function mount(onOpenVersion = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ProductIterationTimeline productLineId="p" versions={versions} onOpenVersion={onOpenVersion} /></QueryClientProvider>);
  return onOpenVersion;
}
describe('产品迭代甘特图界面', () => {
  it('按版本分组显示顶层产品任务，支持收起，无百分比和进度条', async () => {
    vi.mocked(productRepository.iterationTimeline).mockResolvedValue([
      { id: 'r', code: 'R', title: '产品任务一', category: 'requirement', productLineId: 'p', versionId: 'v', plannedStartDate: '2026-09-01', plannedEndDate: '2026-10-10', status: { name: '处理中', group: 'IN_PROGRESS' } },
      { id: 'd', code: 'D', title: '设计子任务', category: 'design', productLineId: 'p', versionId: 'v', parentWorkItemId: 'r', plannedStartDate: '2026-09-05', plannedEndDate: '2026-09-20' }
    ]);
    const open = mount();
    fireEvent.click(await screen.findByRole('button', { name: '秋季版本 V1.0：V1.0' }));
    expect(open).toHaveBeenCalledWith('v');
    fireEvent.click(screen.getByRole('tab', { name: '任务视角' }));
    expect(screen.getByText('产品任务一')).toBeTruthy();
    expect(screen.queryByText('设计子任务')).toBeNull();
    expect(document.querySelectorAll('.iteration-stage')).toHaveLength(2);
    expect(document.querySelectorAll('.iteration-stage-placeholder')).toHaveLength(2);
    expect(screen.getByText('产品开发 · 排期不完整')).toBeTruthy();
    expect(screen.getByText('测试验收 · 排期不完整')).toBeTruthy();
    expect(document.body.textContent).not.toContain('%');
    expect(screen.queryByRole('progressbar')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '收起 V1.0' }));
    expect(screen.queryByText('产品任务一')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '展开 V1.0' }));
    expect(screen.getByText('产品任务一')).toBeTruthy();
  });
  it('无排期时保留四个灰色占位，部分排期的阶段标灰而不是完整彩条', async () => {
    vi.mocked(productRepository.iterationTimeline).mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const ui = (id: string) => <QueryClientProvider client={client}><ProductIterationTimeline productLineId={id} versions={versions} onOpenVersion={vi.fn()} /></QueryClientProvider>;
    const rendered = render(ui('empty'));
    await screen.findByRole('button', { name: '秋季版本 V1.0：V1.0' });
    expect(document.querySelectorAll('.iteration-stage-placeholder')).toHaveLength(4);
    expect(document.querySelectorAll('.iteration-stage')).toHaveLength(0);
    vi.mocked(productRepository.iterationTimeline).mockResolvedValue([
      { id: 'd1', code: 'D1', title: '已排期设计', category: 'design', productLineId: 'partial', versionId: 'v', plannedStartDate: '2026-09-05', plannedEndDate: '2026-09-20' },
      { id: 'd2', code: 'D2', title: '未排期设计', category: 'design', productLineId: 'partial', versionId: 'v' }
    ]);
    rendered.rerender(ui('partial'));
    await screen.findByText('UI设计 · 排期不完整');
    expect(document.querySelectorAll('.iteration-stage-placeholder')).toHaveLength(3);
    expect(document.querySelector('.iteration-stage.iteration-stage-incomplete')).toBeTruthy();
    expect(document.querySelectorAll('.iteration-stage:not(.iteration-stage-incomplete)')).toHaveLength(0);
  });
  it('接口失败显示重试并重新读取', async () => {
    vi.mocked(productRepository.iterationTimeline).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    mount();
    fireEvent.click(await screen.findByRole('button', { name: /重\s*试/ }));
    expect(await screen.findByRole('button', { name: '秋季版本 V1.0：V1.0' })).toBeTruthy();
    expect(productRepository.iterationTimeline).toHaveBeenCalledTimes(2);
  });
});
