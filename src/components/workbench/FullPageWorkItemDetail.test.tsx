// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FullPageWorkItemDetail, isFullPageDetail } from './FullPageWorkItemDetail';
import { requirementRepository } from '../../services/requirementRepository';
import { productRepository } from '../../services/productRepository';

vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { detail: vi.fn() } }));
vi.mock('../../services/productRepository', () => ({ productRepository: { workItemDetail: vi.fn(), businessTask: vi.fn() } }));
vi.mock('../product/RequirementTasksView', () => ({ RequirementTasksView: ({ initialDetail, detailPresentation }: { initialDetail: { title: string }; detailPresentation: string }) => <div>任务整页：{initialDetail.title}，{detailPresentation}</div> }));
vi.mock('./RequirementPoolView', () => ({ RequirementPoolView: ({ initialDetail, fullPage }: { initialDetail: { title: string }; fullPage: boolean }) => <div>事项整页：{initialDetail.title}，{String(fullPage)}</div> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('direct links load the task detail in full-page mode', async () => {
  vi.mocked(productRepository.workItemDetail).mockResolvedValue({ id: 'task-1', title: '任务甲', category: 'dev', status: '待处理' } as never);
  render(<MemoryRouter><FullPageWorkItemDetail viewId="prod_rd_tasks" search="?detailId=task-1&detailView=full&productLineId=line-1"/></MemoryRouter>);
  expect(await screen.findByText('任务整页：任务甲，page')).toBeInTheDocument();
  expect(productRepository.workItemDetail).toHaveBeenCalledWith('line-1', 'task-1');
  expect(screen.getByRole('button', { name: /返回列表/ })).toBeInTheDocument();
});

it('direct links load the matter detail and distinguish legacy drawer links', async () => {
  vi.mocked(requirementRepository.detail).mockResolvedValue({ id: 'matter-1', title: '事项甲', status: '待处理' } as never);
  render(<MemoryRouter><FullPageWorkItemDetail viewId="wb_work_order" search="?detailId=matter-1&detailView=full"/></MemoryRouter>);
  expect(await screen.findByText('事项整页：事项甲，true')).toBeInTheDocument();
  expect(requirementRepository.detail).toHaveBeenCalledWith('matter-1');
  expect(isFullPageDetail('wb_work_order', '?detailId=matter-1')).toBe(false);
  expect(isFullPageDetail('wb_work_order', '?detailId=matter-1&detailView=full')).toBe(true);
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
