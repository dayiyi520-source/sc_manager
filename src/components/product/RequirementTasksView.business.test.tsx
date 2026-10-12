// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RequirementTasksView } from './RequirementTasksView';
import { useApp } from '../../context/AppContext';
import { productRepository } from '../../services/productRepository';
import type { RequirementTask } from '../../types';
vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../services/session', () => ({ readSession: () => ({ token: 'test-session' }) }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([{ id: 'u1', name: '当前用户', department: '交付部' }, { id: 'u2', name: '部门同事', department: '交付部' }]) } }));
vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { workOrderCandidates: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productRepository', () => ({ productRepository: {
  businessTasks: vi.fn(), updateBusinessTask: vi.fn().mockResolvedValue(null),
  workItemFieldConfigurations: vi.fn().mockResolvedValue({ scenes: [{ scene: 'LIST', fields: [{ fieldCode: 'priority', visible: false }, { fieldCode: 'creator', visible: false }] }] }),
  businessTask: vi.fn(), workItemDetail: vi.fn(), workItemTypes: vi.fn().mockResolvedValue([]),
  workItemReview: vi.fn().mockResolvedValue(null), workItemRelations: vi.fn().mockResolvedValue({ relations: [] }), businessTaskActivities: vi.fn().mockResolvedValue([])
} }));
vi.mock('./LazyRichTextEditor', () => ({ LazyRichTextEditor: () => <div /> }));
const task = (id: string, value: Partial<RequirementTask> = {}): RequirementTask => ({ id, title: '任务-' + id, status: '待处理', priority: '中', ownerName: '当前用户', assigneeId: 'u1', creatorName: '其他人', creatorId: 'other', department: '交付部', productLineName: '', versionName: '', estimatedHours: 0, dueDate: '', createdAt: '2026-10-12', ...value });
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/app/crm_presales_tasks');
  vi.mocked(useApp).mockReturnValue({ currentUser: { id: 'u1', name: '当前用户', department: '交付部' }, requirementTasks: [], designTasks: [], productLines: [], projects: [], opportunities: [], biddings: [], versions: [], customers: [], bugs: [], devTasks: [], requirementPool: [], risks: [], addToast: vi.fn() } as unknown as ReturnType<typeof useApp>);
  vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 200 });
});
afterEach(cleanup);
const mount = (kind: 'presales' | 'delivery') => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} itemLabel={kind === 'presales' ? '售前任务' : '交付任务'} /></QueryClientProvider>);
it.each(['presales', 'delivery'] as const)('shows exact %s columns and the shared text-only empty state', async kind => {
  const { container } = mount(kind);
  await screen.findByText('没有符合当前搜索、过滤或分组条件的' + (kind === 'presales' ? '售前任务' : '交付任务'));
  expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['标题', '状态', '优先级', '来源归属', ...(kind === 'delivery' ? ['项目阶段'] : []), '负责人', '创建人', '创建时间', '操作']);
  expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['我负责的·0', '我创建的·0', '我部门的·0']);
  expect(container.querySelector('.test-case-banana')).toBeNull();
  expect(screen.getByText(/没有符合当前搜索、过滤或分组条件的/).closest('td')).toHaveClass('px-4', 'py-12', 'text-center');
});
it('uses complete counts while locally paging and switching scopes', async () => {
  const owned = Array.from({ length: 12 }, (_, i) => task(String(i)));
  const created = task('created', { ownerName: '销售人员', assigneeId: 'u3', creatorId: 'u1', creatorName: '当前用户', department: '销售部' });
  const department = task('department', { ownerName: '部门同事', assigneeId: 'u2' });
  vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [...owned, created, department], total: 14, page: 1, pageSize: 200 });
  mount('presales');
  await screen.findByRole('tab', { name: '我负责的·12' });
  expect(screen.getByRole('tab', { name: '我部门的·13' })).toBeVisible();
  expect(screen.getAllByRole('button', { name: /^任务-\d+$/ })).toHaveLength(10);
  fireEvent.click(screen.getByRole('tab', { name: '我创建的·1' }));
  await screen.findByRole('button', { name: '任务-created' });
  expect(screen.queryByRole('button', { name: '任务-0' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '我部门的·13' }));
  await screen.findByRole('button', { name: '任务-0' });
  expect(screen.queryByRole('button', { name: '任务-created' })).not.toBeInTheDocument();
});
it('renders the requested source, stage and missing creator without guessing', async () => {
  vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [task('delivery', { projectName: '智慧校园', customerName: '客户院校', creatorName: undefined, creatorId: undefined, specialFields: { projectStage: 'UAT验收' } })], total: 1, page: 1, pageSize: 200 });
  mount('delivery');
  await screen.findByText('智慧校园 / 客户院校');
  expect(screen.getByText('UAT验收')).toBeVisible();
  expect(screen.getByRole('tab', { name: '我创建的·0' })).toBeVisible();
});
it('shows loading, reports a failed request and recovers through retry', async () => {
  let reject: (error: Error) => void = () => undefined;
  vi.mocked(productRepository.businessTasks).mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  mount('delivery');
  expect(screen.getByText('正在加载交付任务...')).toBeVisible();
  expect(screen.getByRole('tab', { name: '我负责的·—' })).toBeVisible();
  reject(new Error('网络中断'));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert')).toHaveTextContent('交付任务加载失败');
  fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
  await screen.findByText('没有符合当前搜索、过滤或分组条件的交付任务');
  await waitFor(() => expect(screen.getByRole('tab', { name: '我负责的·0' })).toBeVisible());
});

it.each(['presales', 'delivery'] as const)('keeps only collaboration and related task entries in %s creation', async kind => {
  mount(kind);
  await screen.findByText('没有符合当前搜索、过滤或分组条件的' + (kind === 'presales' ? '售前任务' : '交付任务'));
  fireEvent.click(screen.getByRole('button', { name: '新建' }));
  await screen.findByText(kind === 'presales' ? '新建售前任务' : '新建交付任务');
  expect(screen.getByRole('button', { name: '协同事项 · 0' })).toBeVisible();
  expect(screen.getByRole('button', { name: '关联任务 · 0' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /^子任务 ·|^支撑项 ·|^工时 ·/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '关联任务 · 0' }));
  expect(screen.getByRole('button', { name: /请选择关联任务|请选择协同事项/ })).toBeVisible();
});
it.each(['presales', 'delivery'] as const)('limits %s details to activity, collaboration and related tasks', async kind => {
  const sample = task('detail');
  vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [sample], total: 1, page: 1, pageSize: 200 });
  mount(kind);
  fireEvent.click(await screen.findByRole('button', { name: sample.title }));
  expect(await screen.findByRole('button', { name: '动态 · 0' })).toBeVisible();
  expect(screen.getByRole('button', { name: '协同事项 · 0' })).toBeVisible();
  expect(screen.getByRole('button', { name: '关联任务 · 0' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /^子任务 ·|^支撑项 ·|^工时$|^测试计划 ·/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '协同事项 · 0' }));
  expect(screen.getByRole('button', { name: /请选择关联任务|请选择协同事项/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '关联任务 · 0' }));
  expect(screen.getByRole('button', { name: /请选择关联任务|请选择协同事项/ })).toBeVisible();
});
