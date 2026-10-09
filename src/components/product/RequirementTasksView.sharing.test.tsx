// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RequirementTasksView, WorkOrderPicker } from './RequirementTasksView';
import { useApp } from '../../context/AppContext';
import { productRepository } from '../../services/productRepository';
import { copyToClipboard } from '../../utils/copyToClipboard';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../services/session', () => ({ readSession: () => null }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { workOrderCandidates: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productRepository', () => ({ productRepository: {
  businessTasks: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  businessTask: vi.fn(), workItemDetail: vi.fn(),
  workItemTypes: vi.fn().mockResolvedValue([]),
  workItems: vi.fn().mockResolvedValue({ page: { items: [], total: 0 } }),
  workItemRelations: vi.fn().mockResolvedValue({ relations: [] }),
  businessTaskActivities: vi.fn().mockResolvedValue([]), workItemActivities: vi.fn().mockResolvedValue([]),
  commentBusinessTask: vi.fn().mockResolvedValue(undefined), commentWorkItem: vi.fn().mockResolvedValue(undefined),
} }));
vi.mock('../../utils/copyToClipboard', () => ({ copyToClipboard: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./WorkItemCreatePanel', async () => ({ WorkItemDetailHeader: () => null, WorkItemRelationTabs: (await vi.importActual<typeof import('./WorkItemCreatePanel')>('./WorkItemCreatePanel')).WorkItemRelationTabs, WorkItemCreatePanel: ({ isOpen, title, headerActions, children, onClose }: { isOpen: boolean; title: React.ReactNode; headerActions?: React.ReactNode; children: React.ReactNode; onClose: () => void }) => isOpen ? <div>{title}{headerActions}{children}<button onClick={onClose}>关闭分享详情</button></div> : null }));

const addToast = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/manager/app/crm_presales_tasks?detailId=shared-task');
  vi.mocked(useApp).mockReturnValue({ currentUser: { name: '测试人员' }, requirementTasks: [], designTasks: [], productLines: [], projects: [], versions: [], customers: [], bugs: [], devTasks: [], requirementPool: [], risks: [], addToast } as unknown as ReturnType<typeof useApp>);
});
afterEach(cleanup);

it.each([
  ['requirement', '产品任务'], ['design', '设计任务'], ['bug', '缺陷'], ['presales', '售前任务'], ['delivery', '交付任务'],
] as const)('opens the real %s creation form over a collaboration detail and closes without navigation', async (kind, label) => {
  window.history.replaceState(null, '', '/app/wb_work_order?detailId=assistance-1');
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '协同产品' }] } as unknown as ReturnType<typeof useApp>);
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><RequirementTasksView taskKind={kind} itemLabel={label} creationContext={{ productLineId: 'line-1', sourceWorkOrder: { id: 'assistance-1', title: '来源事项' } as import('../../types').RequirementTask, onClose }} /></QueryClientProvider>);
  expect(await screen.findByText(`新建${label}`)).toBeVisible();
  expect(productRepository.businessTask).not.toHaveBeenCalled();
  expect(productRepository.workItemDetail).not.toHaveBeenCalled();
  expect(screen.queryByText('我负责的')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '关闭分享详情' }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(window.location.pathname).toBe('/app/wb_work_order');
  expect(window.location.search).toBe('?detailId=assistance-1');
});

const renderTasks = (kind: 'presales' | 'dev' = 'presales') => render(<React.StrictMode><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} /></QueryClientProvider></React.StrictMode>);

it('loads business task shares independently of the list and copies the business number', async () => {
  vi.mocked(productRepository.businessTask).mockResolvedValue({ id: 'shared-task', code: 'PS-001', title: '分享任务', status: '待处理', ownerName: '测试人员' } as Awaited<ReturnType<typeof productRepository.businessTask>>);
  renderTasks();
  const copyNumber = await screen.findByRole('button', { name: '复制任务编号' });
  await act(async () => fireEvent.click(copyNumber));
  await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith('PS-001'));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '复制详情链接' })));
  await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith(`${window.location.origin}/manager/app/crm_presales_tasks?detailId=shared-task`));
  expect(productRepository.businessTask).toHaveBeenCalledWith('presales', 'shared-task');
  fireEvent.click(screen.getByRole('button', { name: '关闭分享详情' }));
  expect(window.location.search).toBe('');
});

it('loads a product task share with product context when the list is empty', async () => {
  window.history.replaceState(null, '', '/manager/app/prod_rd_tasks?detailId=shared-task&productLineId=line-1');
  vi.mocked(productRepository.workItemDetail).mockResolvedValue({ id: 'shared-task', code: 'DEV-001', category: 'dev', title: '研发任务', productLineId: 'line-1' } as Awaited<ReturnType<typeof productRepository.workItemDetail>>);
  renderTasks('dev');
  fireEvent.click(await screen.findByRole('button', { name: '复制详情链接' }));
  await waitFor(() => expect(copyToClipboard).toHaveBeenCalledWith(`${window.location.origin}/manager/app/prod_rd_tasks?detailId=shared-task&productLineId=line-1`));
  expect(productRepository.workItemDetail).toHaveBeenCalledWith('line-1', 'shared-task');
});

it('reports an inaccessible task share without displaying copy actions', async () => {
  vi.mocked(productRepository.businessTask).mockRejectedValue(new Error('无权访问'));
  renderTasks();
  await waitFor(() => expect(addToast).toHaveBeenCalledWith('error', '产品任务详情加载失败', '无权访问'));
  expect(screen.queryByRole('button', { name: '复制任务编号' })).not.toBeInTheDocument();
});

it('loads persisted task operations and retains a failed comment for retry', async () => {
  vi.mocked(productRepository.businessTask).mockResolvedValue({ id: 'shared-task', code: 'PS-001', title: '分享任务', status: '待处理', ownerName: '测试人员' } as Awaited<ReturnType<typeof productRepository.businessTask>>);
  vi.mocked(productRepository.businessTaskActivities).mockResolvedValue([
    { id: 'create', eventType: 'WORK_ITEM_CREATED', operatorName: '测试人员', createdAt: '2026-10-08 10:00', content: {} },
    { id: 'edit', eventType: 'WORK_ITEM_UPDATED', operatorName: '测试人员', content: { changes: [{ field: 'title', from: '旧任务', to: '分享任务' }] } },
    { id: 'state', eventType: 'WORK_ITEM_TRANSITIONED', operatorName: '测试人员', content: { fromName: '待处理', toName: '已完成' } },
  ]);
  vi.mocked(productRepository.commentBusinessTask).mockRejectedValueOnce(new Error('网络断开'));
  renderTasks();
  await screen.findByText('创建了任务');
  expect(screen.getByText('将标题从“旧任务”修改为“分享任务”')).toBeTruthy();
  expect(screen.getByText('将状态从“待处理”变更为“已完成”')).toBeTruthy();
  const input = screen.getByPlaceholderText('记录进展、问题或需要协同的事项...');
  fireEvent.change(input, { target: { value: '需要复查' } });
  fireEvent.click(screen.getByRole('button', { name: '发布评论' }));
  await waitFor(() => expect(addToast).toHaveBeenCalledWith('error', '评论发布失败', '网络断开'));
  expect(input).toHaveValue('需要复查');
  expect(screen.queryByText('发表了评论')).toBeNull();
  vi.mocked(productRepository.businessTaskActivities).mockResolvedValue([{ id: 'comment', eventType: 'WORK_ITEM_COMMENTED', content: { content: '需要复查' } }]);
  fireEvent.click(screen.getByRole('button', { name: '发布评论' }));
  await screen.findByText('发表了评论');
  expect(input).toHaveValue('');
  expect(productRepository.commentBusinessTask).toHaveBeenCalledWith('presales', 'shared-task', '需要复查');
});


it.each(['design', 'dev', 'test'] as const)('preselects the allocated product task in %s creation before candidates load', async (kind) => {
  window.history.replaceState(null, '', '/app/prod_rd_tasks');
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '协同产品' }] } as unknown as ReturnType<typeof useApp>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><RequirementTasksView taskKind={kind} creationContext={{ productLineId: 'line-1' }} /></QueryClientProvider>);
  await screen.findByText('新建产品任务');
  const task = { id: 'product-1', title: '当前待分配产品任务', productLineName: '协同产品', assigneeName: '产品负责人', status: { name: '处理中' } };
  act(() => window.dispatchEvent(new CustomEvent('product-task-create', { detail: { targetKind: kind, parent: task, relatedProductTask: task } })));
  fireEvent.click(screen.getByRole('button', { name: '关联任务 · 1' }));
  expect(screen.getByRole('button', { name: '当前待分配产品任务', exact: true })).toBeVisible();
  expect(screen.getByText('负责人：产品负责人')).toBeVisible();
  expect(screen.getByText('当前状态：处理中')).toBeVisible();
});

it('shows only collaboration in the product creation relation area', async () => {
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '协同产品' }] } as unknown as ReturnType<typeof useApp>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><RequirementTasksView taskKind="requirement" creationContext={{ productLineId: 'line-1' }} /></QueryClientProvider>);
  await screen.findByText('新建产品任务');
  expect(screen.getByRole('button', { name: '协同事项 · 0' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /关联任务 ·/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /子任务 ·|支撑项 ·|工时 ·/ })).not.toBeInTheDocument();
});

it('filters product task options by status instead of collaboration type', () => {
  const candidates = ['待处理', '处理中', '已完成'].map((status, index) => ({ id: String(index), title: `${status}产品任务`, type: 'requirement' as const, typeLabel: '产品任务', status }));
  const onChange = vi.fn();
  render(<WorkOrderPicker candidates={candidates} selectedIds={[]} onChange={onChange} relationMode="productTask" />);
  fireEvent.click(screen.getByRole('button', { name: /选择关联事项/ }));
  expect(screen.queryByRole('button', { name: /线上问题|售前支持|交付支持|其他问题/ })).not.toBeInTheDocument();
  for (const status of ['待处理', '处理中', '已完成']) {
    fireEvent.click(screen.getByRole('button', { name: `${status} (1)` }));
    expect(screen.getByText(`${status}产品任务`)).toBeVisible();
    candidates.filter((item) => item.status !== status).forEach((item) => expect(screen.queryByText(item.title)).not.toBeInTheDocument());
  }
  fireEvent.click(screen.getByText('已完成产品任务'));
  expect(onChange).toHaveBeenCalledWith(['2']);
});
