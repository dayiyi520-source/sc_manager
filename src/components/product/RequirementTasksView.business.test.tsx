// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { openTaskCompletionDialog } from './TaskCompletionDialog';
import { directoryProjects } from '../../services/customerDirectoryData';
import { RequirementTasksView } from './RequirementTasksView';
import { useApp } from '../../context/AppContext';
import { productRepository } from '../../services/productRepository';
import type { RequirementTask } from '../../types';
vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../services/session', () => ({ readSession: () => ({ token: 'test-session' }) }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([{ id: 'u1', name: '当前用户', department: '交付部' }, { id: 'u2', name: '部门同事', department: '交付部' }]) } }));
vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { workOrderCandidates: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productRepository', () => ({ productRepository: {
  archivedTaskRecords: vi.fn().mockResolvedValue([]), restoreArchivedTask: vi.fn().mockResolvedValue(null), workItems: vi.fn().mockResolvedValue({ page: { items: [], total: 0 } }),
  businessTasks: vi.fn(), updateBusinessTask: vi.fn().mockResolvedValue(null),
  businessTask: vi.fn(), reviewBusinessTask: vi.fn().mockResolvedValue(null), workItemDetail: vi.fn(), workItemTypes: vi.fn().mockResolvedValue([]),
  workItemReview: vi.fn().mockResolvedValue(null), workItemRelations: vi.fn().mockResolvedValue({ relations: [] }), businessTaskActivities: vi.fn().mockResolvedValue([])
} }));
vi.mock('./TaskCompletionDialog', () => ({ openTaskCompletionDialog: vi.fn() }));
vi.mock('./LazyRichTextEditor', () => ({ LazyRichTextEditor: () => <div /> }));
const task = (id: string, value: Partial<RequirementTask> = {}): RequirementTask => ({ id, title: '任务-' + id, status: '待处理', priority: '中', ownerName: '当前用户', assigneeId: 'u1', creatorName: '其他人', creatorId: 'other', department: '交付部', productLineName: '', versionName: '', estimatedHours: 0, dueDate: '', createdAt: '2026-10-12', ...value });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(productRepository.archivedTaskRecords).mockResolvedValue([]);
  vi.mocked(productRepository.restoreArchivedTask).mockResolvedValue(undefined);
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
  expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(kind === 'delivery' ? ['我负责的·0', '我创建的·0', '我部门的·0', '全公司的·0', '我归档的·0', '待审核·0'] : ['我负责的·0', '我创建的·0', '我部门的·0', '全公司的·0', '我归档的·0']);
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
  fireEvent.click(screen.getByRole('tab', { name: '全公司的·14' }));
  fireEvent.click(screen.getByRole('button', { name: '下一页' }));
  expect(await screen.findByRole('button', { name: '任务-created' })).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: '我负责的·12' }));
  expect(await screen.findByRole('button', { name: '任务-0' })).toBeVisible();
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

it('renders the presales empty state without a field configuration service', async () => {
  mount('presales');
  await screen.findByText('没有符合当前搜索、过滤或分组条件的售前任务');
});


it.each(['approve', 'reject'] as const)('locks pending status and replaces the menu with %s review controls', async action => {
  const sample = task('review', { status: '处理中', completionApproval: 'pending', creatorId: 'u1', creatorName: '当前用户', assigneeId: 'u2', ownerName: '部门同事' });
  vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [sample], total: 1, page: 1, pageSize: 200 });
  vi.mocked(productRepository.reviewBusinessTask).mockImplementationOnce(async () => {
    vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 200 });
  });
  mount('delivery');
  fireEvent.click(await screen.findByRole('tab', { name: '待审核·1' }));
  expect(screen.getByRole('combobox', { name: sample.title + '状态' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: '操作' + sample.title })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: action === 'approve' ? /^通\s*过$/ : /^拒\s*绝$/ }));
  await waitFor(() => expect(productRepository.reviewBusinessTask).toHaveBeenCalledWith(sample.id, action));
  await screen.findByRole('tab', { name: '待审核·0' });
});

it('disables review for non-reviewers and preserves a pending task when review fails', async () => {
  const sample = task('review-error', { status: '处理中', completionApproval: 'pending', creatorId: 'u1' });
  vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [sample], total: 1, page: 1, pageSize: 200 });
  vi.mocked(productRepository.reviewBusinessTask).mockRejectedValueOnce(new Error('网络中断'));
  mount('delivery');
  fireEvent.click(await screen.findByRole('tab', { name: '待审核·1' }));
  fireEvent.click(screen.getByRole('button', { name: /^通\s*过$/ }));
  await waitFor(() => expect(useApp().addToast).toHaveBeenCalledWith('error', '审核失败', '网络中断'));
  expect(screen.getByRole('tab', { name: '待审核·1' })).toBeVisible();
  await waitFor(() => expect(screen.getByRole('button', { name: /^通\s*过$/ })).not.toBeDisabled());
});

it('keeps review buttons disabled for the owner who is not the creator', async () => {
  const sample = task('unauthorized-review', { status: '处理中', completionApproval: 'pending' });
  vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [sample], total: 1, page: 1, pageSize: 200 });
  mount('delivery');
  fireEvent.click(await screen.findByRole('tab', { name: '待审核·1' }));
  expect(screen.getByRole('button', { name: /^通\s*过$/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /^拒\s*绝$/ })).toBeDisabled();
});

it('requests completion hours before persisting delivery completion', async () => {
  const sample = task('complete', { status: '处理中' });
  vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [sample], total: 1, page: 1, pageSize: 200 });
  mount('delivery');
  const select = await screen.findByRole('combobox', { name: sample.title + '状态' });
  fireEvent.mouseDown(select);
  fireEvent.click(document.querySelectorAll('.ant-select-item-option-content')[2]);
  expect(openTaskCompletionDialog).toHaveBeenCalledWith(expect.any(Function), false, true);
  expect(productRepository.updateBusinessTask).not.toHaveBeenCalled();
  const save = vi.mocked(openTaskCompletionDialog).mock.calls[0][0];
  await act(async () => { await save(3.5, '', { content: '验收说明', media: [] }); });
  expect(productRepository.updateBusinessTask).toHaveBeenCalledWith('delivery', sample.id, { status: '已完成', actualHours: 3.5, completionReview: { content: '验收说明', media: [] } });
});

it('filters by project and uses business statuses instead of the generic development stages', async () => {
  const project = directoryProjects()[0];
  const one = task('project-one', { projectId: project.id, projectName: project.name, customerName: '不是项目的客户名' });
  const two = task('project-two', { projectName: '另一个项目' });
  vi.mocked(productRepository.businessTasks).mockResolvedValue({ items: [one, two], total: 2, page: 1, pageSize: 200 });
  mount('delivery');
  await screen.findByRole('button', { name: one.title });
  fireEvent.click(screen.getByRole('button', { name: '过滤器' }));
  expect(screen.queryByText('关联客户')).not.toBeInTheDocument();
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '状态' }));
  const statuses = Array.from(document.querySelectorAll('.ant-select-item-option-content')).map(item => item.textContent);
  expect(statuses).toEqual(['待处理', '处理中', '已完成']);
  expect(statuses).not.toContain('待审核');
  fireEvent.keyDown(screen.getByRole('combobox', { name: '状态' }), { key: 'Escape' });
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '关联项目' }));
  const option = Array.from(document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option-content')).find(item => item.textContent === project.name)!;
  fireEvent.click(option);
  fireEvent.click(screen.getByRole('button', { name: '应用过滤' }));
  expect(screen.getByRole('button', { name: one.title })).toBeVisible();
  expect(screen.queryByRole('button', { name: two.title })).not.toBeInTheDocument();
  expect(screen.getByText(`关联项目 包含 ${project.name}`)).toBeVisible();
});

const archiveKinds = ['requirement', 'design', 'dev', 'test', 'bug', 'ops', 'delivery', 'presales'] as const;
it.each(archiveKinds)('filters %s archives by operator ID, preserves columns and restores from the menu', async kind => {
  const mine = task('archived-mine', { title: '本人归档的任务', archived: true, archivedById: 'u1', operatorName: '当前用户', ownerName: '其他人', creatorName: '其他人', productLineId: 'line-1', revision: 4 });
  const other = task('archived-other', { title: '其他人归档的任务', archived: true, archivedById: 'u2', operatorName: '当前用户', ownerName: '当前用户', productLineId: 'line-1', revision: 2 });
  vi.mocked(useApp).mockReturnValue({ ...vi.mocked(useApp)(), productLines: [{ id: 'line-1', name: '测试产品' }] } as ReturnType<typeof useApp>);
  vi.mocked(productRepository.archivedTaskRecords).mockResolvedValue([mine, other]);
  vi.mocked(productRepository.restoreArchivedTask).mockImplementation(async () => { vi.mocked(productRepository.archivedTaskRecords).mockResolvedValue([other]); });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} /></QueryClientProvider>);
  const columns = screen.getAllByRole('columnheader').map(header => header.textContent);
  const archiveTab = await screen.findByRole('tab', { name: '我归档的·1' });
  const tabs = screen.getAllByRole('tab');
  expect(tabs[tabs.findIndex(tab => tab.textContent?.startsWith('全公司的')) + 1]).toBe(archiveTab);
  fireEvent.click(archiveTab);
  expect(await screen.findByText(mine.title)).toBeInTheDocument();
  expect(screen.queryByText(other.title)).not.toBeInTheDocument();
  expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(columns);
  expect(screen.getByRole('combobox', { name: `${mine.title}负责人` })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: `操作${mine.title}` }));
  fireEvent.click(await screen.findByRole('menuitem', { name: /取消归档/ }));
  await waitFor(() => expect(productRepository.restoreArchivedTask).toHaveBeenCalledWith(kind, mine.id, 4));
  await waitFor(() => expect(screen.queryByText(mine.title)).not.toBeInTheDocument());
  expect(await screen.findByRole('tab', { name: '我归档的·0' })).toBeInTheDocument();
});

it('keeps the archived row and reports restoration conflicts', async () => {
  const mine = task('archived-conflict', { archived: true, archivedById: 'u1', revision: 3 });
  vi.mocked(productRepository.archivedTaskRecords).mockResolvedValue([mine]);
  vi.mocked(productRepository.restoreArchivedTask).mockRejectedValue(new Error('任务已更新，请刷新后重试'));
  mount('presales');
  fireEvent.click(await screen.findByRole('tab', { name: '我归档的·1' }));
  fireEvent.click(await screen.findByRole('button', { name: `操作${mine.title}` }));
  fireEvent.click(await screen.findByRole('menuitem', { name: /取消归档/ }));
  await waitFor(() => expect(vi.mocked(useApp)().addToast).toHaveBeenCalledWith('error', '取消归档失败', '任务已更新，请刷新后重试'));
  expect(screen.getByText(mine.title)).toBeInTheDocument();
});

it('shows an archive load error, retries, and uses the official empty state', async () => {
  vi.mocked(productRepository.archivedTaskRecords).mockRejectedValueOnce(new Error('读取失败')).mockResolvedValue([]);
  mount('presales');
  fireEvent.click(screen.getByRole('tab', { name: '我归档的·—' }));
  expect(await screen.findByText('归档任务加载失败')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
  await waitFor(() => expect(screen.queryByText('归档任务加载失败')).not.toBeInTheDocument());
  expect(document.querySelector('.ant-empty')).not.toBeNull();
});

it('moves back to the remaining archive page after restoring the last row', async () => {
  const records = Array.from({ length: 11 }, (_, index) => task('archive-page-' + index, { archived: true, archivedById: 'u1', revision: 1, createdAt: `2026-10-${String(index + 1).padStart(2, '0')}` }));
  vi.mocked(productRepository.archivedTaskRecords).mockResolvedValue(records);
  vi.mocked(productRepository.restoreArchivedTask).mockImplementation(async (_kind, id) => {
    vi.mocked(productRepository.archivedTaskRecords).mockResolvedValue(records.filter(task => task.id !== id));
  });
  mount('presales');
  fireEvent.click(await screen.findByRole('tab', { name: '我归档的·11' }));
  fireEvent.click(screen.getByRole('button', { name: '下一页' }));
  const last = records[0];
  fireEvent.click(await screen.findByRole('button', { name: `操作${last.title}` }));
  fireEvent.click(await screen.findByRole('menuitem', { name: /取消归档/ }));
  expect(await screen.findByRole('tab', { name: '我归档的·10' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('共 10 条，第 1 / 1 页')).toBeInTheDocument());
  expect(screen.getByText(records[1].title)).toBeInTheDocument();
});

it('does not keep a restored row when the following archive reload fails', async () => {
  const mine = task('restored-before-refresh', { archived: true, archivedById: 'u1', revision: 1 });
  vi.mocked(productRepository.archivedTaskRecords).mockResolvedValue([mine]);
  vi.mocked(productRepository.restoreArchivedTask).mockImplementation(async () => { vi.mocked(productRepository.archivedTaskRecords).mockRejectedValue(new Error('读取失败')); });
  mount('presales');
  fireEvent.click(await screen.findByRole('tab', { name: '我归档的·1' }));
  fireEvent.click(await screen.findByRole('button', { name: `操作${mine.title}` }));
  fireEvent.click(await screen.findByRole('menuitem', { name: /取消归档/ }));
  await waitFor(() => expect(screen.queryByText(mine.title)).not.toBeInTheDocument());
  expect(vi.mocked(useApp)().addToast).toHaveBeenCalledWith('success', '任务已取消归档');
  expect(await screen.findByText('归档任务加载失败')).toBeInTheDocument();
});
