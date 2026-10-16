// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RequirementTasksView, WorkOrderPicker } from './RequirementTasksView';
import { useApp } from '../../context/AppContext';
import { productRepository } from '../../services/productRepository';
import { teamRepository } from '../../services/teamRepository';
import { readSession } from '../../services/session';
import { copyToClipboard } from '../../utils/copyToClipboard';

vi.mock('../../context/AppContext', () => ({ useApp: vi.fn() }));
vi.mock('../../services/session', () => ({ readSession: vi.fn(() => null) }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { workOrderCandidates: vi.fn().mockResolvedValue([]) } }));
vi.mock('../../services/productRepository', () => ({ productRepository: {
  businessTasks: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  createBusinessTask: vi.fn().mockResolvedValue(undefined),
  businessTask: vi.fn(), workItemDetail: vi.fn(), requirementSummary: vi.fn().mockResolvedValue({ linkedItems: [] }),
  workItemReview: vi.fn().mockResolvedValue(null), saveWorkItemReview: vi.fn(),
  workItemTypes: vi.fn().mockResolvedValue([]),
  workItems: vi.fn().mockResolvedValue({ page: { items: [], total: 0 } }),
  workItemRelations: vi.fn().mockResolvedValue({ relations: [] }),
  testPlans: vi.fn().mockResolvedValue([]),
  availableTestPlans: vi.fn().mockResolvedValue([]),
  associateTestPlans: vi.fn().mockResolvedValue(undefined),
  businessTaskActivities: vi.fn().mockResolvedValue([]), workItemActivities: vi.fn().mockResolvedValue([]),
  commentBusinessTask: vi.fn().mockResolvedValue(undefined), commentWorkItem: vi.fn().mockResolvedValue(undefined),
} }));
vi.mock('./LazyRichTextEditor', () => ({ LazyRichTextEditor: () => <div>复盘富文本编辑器</div> }));
vi.mock('../../utils/copyToClipboard', () => ({ copyToClipboard: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./WorkItemCreatePanel', async () => ({ WorkItemDetailHeader: () => null, WorkItemRelationTabs: (await vi.importActual<typeof import('./WorkItemCreatePanel')>('./WorkItemCreatePanel')).WorkItemRelationTabs, WorkItemCreatePanel: ({ isOpen, title, headerActions, children, properties, footer, onClose }: { isOpen: boolean; title: React.ReactNode; headerActions?: React.ReactNode; children: React.ReactNode; properties?: React.ReactNode; footer?: React.ReactNode; onClose: () => void }) => isOpen ? <div>{title}{headerActions}{children}{properties}{footer}<button onClick={onClose}>关闭分享详情</button></div> : null }));

const addToast = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readSession).mockReturnValue(null);
  vi.mocked(productRepository.workItems).mockReset().mockResolvedValue({ page: { items: [], total: 0 } } as never);
  vi.mocked(productRepository.testPlans).mockReset().mockResolvedValue([]);
  vi.mocked(productRepository.availableTestPlans).mockReset().mockResolvedValue([]);
  vi.mocked(productRepository.associateTestPlans).mockReset().mockResolvedValue(undefined);
  vi.mocked(productRepository.workItemDetail).mockReset().mockImplementation(async (_lineId: string, id: string) => ({ id, code: id, category: 'test', title: '测试详情任务', productLineId: 'line-1', status: { name: '待测试', group: 'NOT_STARTED' }, revision: 0 }) as never);
  vi.mocked(teamRepository.options).mockResolvedValue([{ id: 'owner-1', name: '负责人甲', department: '测试部' }, { id: 'qa-2', name: '验证者乙', department: '测试部' }] as never);
  sessionStorage.clear();
  window.history.replaceState(null, '', '/manager/app/crm_presales_tasks?detailId=shared-task');
  vi.mocked(useApp).mockReturnValue({ currentUser: { name: '测试人员' }, requirementTasks: [], designTasks: [], productLines: [], projects: [], versions: [], customers: [], bugs: [], devTasks: [], requirementPool: [], risks: [], addToast } as unknown as ReturnType<typeof useApp>);
});
afterEach(cleanup);

it.each([
  ['requirement', '产品任务'], ['design', '设计任务'], ['dev', '研发任务'], ['test', '测试任务'], ['bug', '缺陷'], ['presales', '售前任务'], ['delivery', '交付任务'],
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
  expect(screen.getByRole('button', { name: '当前待分配产品任务' })).toBeVisible();
  expect(screen.getByText('负责人：产品负责人')).toBeVisible();
  expect(screen.getByText('状态：处理中')).toBeVisible();
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

it.each([['product', '产品设计'], ['project', '项目设计'], ['other', '其他设计']] as const)('locks the %s design type first and hides the duplicate project field for material design', async (variant, label) => {
  window.history.replaceState(null, '', '/app/prod_design_tasks');
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '协同产品', workItemTypes: [{ id: 'different', name: '其他设计', category: '设计', enabled: true, default: true }] }] } as unknown as ReturnType<typeof useApp>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="design" itemLabel="设计任务" designVariant={variant} creationContext={{ productLineId: 'line-1' }} /></QueryClientProvider>);
  await screen.findByText('新建设计任务');
  const field = screen.getByText('任务类型').closest('.ant-form-item')!;
  await waitFor(() => expect(field).toHaveTextContent(label));
  expect(field).toHaveStyle({ order: '0' });
  expect(field.querySelector('.ant-select')).toHaveClass('ant-select-disabled');
  if (variant === 'project') expect(screen.getByText('关联项目')).toBeVisible();
  else expect(screen.queryByText('关联项目')).not.toBeInTheDocument();
});

it('hides related tasks in a product detail', async () => {
  window.history.replaceState(null, '', '/app/prod_req_tasks');
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="requirement" initialDetail={{ id: 'p-1', title: '产品详情', status: '待处理', relatedTaskIds: ['d-1'] } as import('../../types').RequirementTask} /></QueryClientProvider>);
  expect(screen.queryByRole('button', { name: /关联任务 ·/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '协同事项 · 0' })).toBeVisible();
});

it('opens a source collaboration title in a new tab from task creation', async () => {
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  window.history.replaceState(null, '', '/manager/app/wb_work_order?detailId=m-1');
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="requirement" creationContext={{ productLineId: 'line-1', sourceWorkOrder: { id: 'm-1', title: '来源协同标题' } as import('../../types').RequirementTask }} /></QueryClientProvider>);
  await screen.findByText('新建产品任务');
  fireEvent.click(screen.getByRole('button', { name: '协同事项 · 1' }));
  fireEvent.click(screen.getByRole('button', { name: '来源协同标题' }));
  expect(open).toHaveBeenCalledWith(`${window.location.origin}/manager/app/wb_work_order?detailId=m-1`, '_blank');
  open.mockRestore();
});

it.each(['design', 'dev', 'test'] as const)('shows product task cards with status in %s detail and opens the referenced product', async (kind) => {
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);
  window.history.replaceState(null, '', `/app/prod_${kind}_tasks`);
  const product = { id: 'p-1', title: '关联产品任务', productLineId: 'line-1', category: 'requirement', status: { name: '处理中' }, assigneeName: '产品负责人' };
  vi.mocked(productRepository.workItems).mockResolvedValue({ page: { items: [product, { ...product, id: 'not-product', category: 'design', title: '不应作为候选' }], total: 2 } } as never);
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '产品' }] } as unknown as ReturnType<typeof useApp>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} initialDetail={{ id: 'detail-1', title: '下游详情', category: kind, relatedTaskIds: ['p-1'] } as import('../../types').RequirementTask} /></QueryClientProvider>);
  if (kind === 'design') { fireEvent.click(screen.getByRole('button', { name: '关联任务 · 1' })); }
  else { expect(screen.queryByRole('button', { name: '关联任务 · 1' })).not.toBeInTheDocument(); return; }
  fireEvent.click(await screen.findByRole('button', { name: '关联产品任务' }));
  expect(screen.getByText('状态：处理中')).toBeVisible();
  expect(open).toHaveBeenCalledWith(`${window.location.origin}/app/prod_req_tasks?detailId=p-1&productLineId=line-1`, '_blank');
  fireEvent.click(screen.getByRole('button', { name: /已关联 1 条事项/ }));
  expect(screen.queryByText('不应作为候选')).not.toBeInTheDocument();
  open.mockRestore();
});

it.each(['presales', 'delivery'] as const)('blocks %s creation with missing dates even without field configuration', async (kind) => {
  window.history.replaceState(null, '', '/app/wb_work_order');
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '协同产品' }] } as unknown as ReturnType<typeof useApp>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} creationContext={{ productLineId: 'line-1', title: '日期必填验收' }} /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: /^保\s*存$/ }));
  expect(addToast).toHaveBeenCalledWith('warning', '请选择计划开始时间');
  expect(productRepository.createBusinessTask).not.toHaveBeenCalled();
  const start = screen.getByText('计划开始时间').closest('.ant-form-item')!;
  const end = screen.getByText('计划完成时间').closest('.ant-form-item')!;
  expect(start.querySelector('label')).toHaveClass('ant-form-item-required');
  expect(end.querySelector('label')).toHaveClass('ant-form-item-required');
  const input = start.querySelector('input')!;
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: '2026-10-10' } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });
  fireEvent.blur(input);
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() => expect(addToast).toHaveBeenCalledWith('warning', '请选择计划完成时间'));
  expect(productRepository.createBusinessTask).not.toHaveBeenCalled();
  expect(screen.getByDisplayValue('日期必填验收')).toBeInTheDocument();
  const endInput = end.querySelector('input')!;
  fireEvent.focus(endInput);
  fireEvent.change(endInput, { target: { value: '2026-10-11' } });
  fireEvent.keyDown(endInput, { key: 'Enter', code: 'Enter', keyCode: 13 });
  fireEvent.blur(endInput);
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  await waitFor(() => expect(addToast).toHaveBeenCalledWith('warning', expect.stringMatching(/请选择关联商机或投标项|请选择关联项目|请选择关联客户/)));
  expect(productRepository.createBusinessTask).not.toHaveBeenCalled();
});


it.each(['requirement', 'design', 'dev', 'test', 'bug'] as const)('offers archive and the appropriate review action for %s task details', async (kind) => {
  window.history.replaceState(null, '', '/manager/app/prod_rd_tasks?detailId=shared-task&productLineId=line-1');
  vi.mocked(productRepository.workItemDetail).mockResolvedValue({ id: 'shared-task', code: 'TASK-001', category: kind, title: '验收任务', productLineId: 'line-1' } as Awaited<ReturnType<typeof productRepository.workItemDetail>>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: '操作验收任务' }));
  expect(await screen.findByText('归档')).toBeInTheDocument();
  expect(screen.queryByText('复制并关联')).not.toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: /添加子任务/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('menuitem', { name: /复盘总结/ })).not.toBeInTheDocument();
});

it('requires a project before selecting the optional ops product and hides task type', async () => {
  window.history.replaceState(null, '', '/app/proj_ops_tasks');
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="ops" /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: '新建' }));
  const items = Array.from(document.querySelectorAll('.requirement-new-properties .ant-form-item'));
  const project = items.find((item) => item.textContent?.includes('关联项目'))!;
  const product = items.find((item) => item.textContent?.includes('关联产品'))!;
  expect(project.querySelector('label')).toHaveClass('ant-form-item-required');
  expect(product.querySelector('label')).not.toHaveClass('ant-form-item-required');
  expect(product.querySelector('input')).toBeDisabled();
  expect(project).toHaveStyle({ order: '-2' });
  expect(product).toHaveStyle({ order: '-1' });
  expect(screen.queryByText('运维任务类型')).not.toBeInTheDocument();
});

it.each([['product', '产品设计', '协同产品'], ['project', '项目设计', '归属项目'], ['other', '其他设计', '产品部']] as const)('opens a %s design form with the correct source from a matter', async (variant, label, sourceName) => {
  window.history.replaceState(null, '', '/app/wb_work_order');
  vi.mocked(useApp).mockReturnValue({ ...useApp(), currentUser: { id: 'viewer', name: '测试人员', department: '产品部' }, productLines: [{ id: 'line-1', name: '协同产品' }], projects: [{ id: 'project-1', name: '归属项目' }] } as unknown as ReturnType<typeof useApp>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="design" itemLabel="设计任务" designVariant={variant} creationContext={{ productLineId: 'line-1', sourceWorkOrder: { id: 'matter', title: '来源事项', department: '产品部', projectId: 'project-1', projectName: '归属项目' } as import('../../types').RequirementTask }} /></QueryClientProvider>);
  await screen.findByText('新建设计任务');
  const typeField = screen.getByText('任务类型').closest('.ant-form-item')!;
  expect(typeField).toHaveTextContent(label);
  expect(typeField.querySelector('.ant-select')).toHaveClass('ant-select-disabled');
  const sourceField = screen.getByText(variant === 'product' ? '关联产品' : variant === 'project' ? '关联项目' : '来源部门').closest('.ant-form-item')!;
  expect(sourceField).toHaveTextContent(sourceName);
  if (variant === 'project') expect(screen.getByText('关联产品')).toBeVisible();
  if (variant === 'other') expect(screen.getByText('关联产品')).toBeVisible();
});
it('opens operations creation from a matter with its associated project and collaboration preselected', async () => {
  window.history.replaceState(null, '', '/app/wb_work_order');
  vi.mocked(useApp).mockReturnValue({ ...useApp(), projects: [{ id: 'project-1', name: '归属项目' }] } as unknown as ReturnType<typeof useApp>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="ops" itemLabel="运维任务" creationContext={{ productLineId: '', sourceWorkOrder: { id: 'matter', title: '来源事项', projectId: 'project-1' } as import('../../types').RequirementTask }} /></QueryClientProvider>);
  await screen.findByText('新建运维任务');
  expect(screen.getByRole('button', { name: '协同事项 · 1' })).toBeVisible();
  expect(screen.getByText('关联项目').closest('.ant-form-item')).toHaveTextContent('归属项目');
});


it.each([
  ['dev', ['动态 · 0', '协同事项 · 0', '关联任务 · 0']],
  ['test', ['动态 · 0', '协同事项 · 0', '关联任务 · 0', '测试计划 · 1']],
] as const)('shows %s detail associations in the requested order', async (kind, expected) => {
  const task = { id: `${kind}-detail`, code: 'TASK-01', category: kind, title: '目标任务', status: '处理中', productLineId: 'line-1', productLineName: '协同产品', relatedTaskIds: [], sourceWorkOrderIds: [] } as import('../../types').RequirementTask;
  vi.mocked(productRepository.testPlans).mockResolvedValue([{ id: 'plan-1', workItemId: task.id, executable: true, name: '单任务回归计划', ownerName: '负责人甲', revision: 0, cases: [] }] as never);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><RequirementTasksView taskKind={kind} itemLabel={kind === 'dev' ? '研发任务' : '测试任务'} initialDetail={task} /></QueryClientProvider>);
  await screen.findByRole('button', { name: expected[0] });
  if (kind === 'test') await screen.findByRole('button', { name: '测试计划 · 1' });
  const expectedLabels: readonly string[] = expected;
  const associationTabs = [...document.querySelectorAll('button')].map(button => button.textContent?.trim() || '').filter(label => expectedLabels.includes(label));
  expect(associationTabs).toEqual(expected);
  if (kind === 'test') {
    expect(productRepository.testPlans).toHaveBeenCalledWith(task.id);
    fireEvent.click(screen.getByRole('button', { name: '测试计划 · 1' }));
    expect(await screen.findByRole('region', { name: '关联测试计划' })).toHaveTextContent('单任务回归计划');
  }
  view.unmount();
});


it('selects existing plans from the plan table and persists the relation on the test task', async () => {
  const task = { id: 'test-task-target', code: 'TEST-01', category: 'test', title: '目标测试任务', status: '待测试', productLineId: 'line-1', relatedTaskIds: [], sourceWorkOrderIds: [] } as import('../../types').RequirementTask;
  const plan = { id: 'plan-existing', workItemId: 'test-task-source', executable: true, name: '既有回归计划', ownerName: '负责人甲', revision: 2, cases: [] };
  vi.mocked(productRepository.testPlans).mockResolvedValueOnce([]).mockResolvedValue([{ ...plan, workItemId: task.id }] as never);
  vi.mocked(productRepository.availableTestPlans).mockResolvedValue([{ plan, workItemTitle: '来源测试任务', workItemCode: 'TEST-02' }] as never);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><RequirementTasksView taskKind="test" itemLabel="测试任务" initialDetail={task} /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: '测试计划 · 0' }));
  fireEvent.click(screen.getByRole('button', { name: '新增关联测试计划' }));

  const picker = await screen.findByRole('dialog');
  expect(within(picker).getByText('选择关联测试计划')).toBeInTheDocument();
  const row = await within(picker).findByRole('row', { name: /既有回归计划.*TEST-02.*来源测试任务/ });
  fireEvent.click(within(row).getByRole('checkbox'));
  fireEvent.click(within(picker).getByRole('button', { name: /关\s*联/ }));

  await waitFor(() => expect(productRepository.associateTestPlans).toHaveBeenCalledWith(task.id, [plan.id]));
  expect(await screen.findByRole('button', { name: '测试计划 · 1' })).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: '关联测试计划' })).getByText('既有回归计划')).toBeInTheDocument();
});

it('retains the selected plan and displays an error when the relation save fails', async () => {
  const task = { id: 'test-task-failed', code: 'TEST-03', category: 'test', title: '保存失败测试任务', status: '待测试', productLineId: 'line-1', relatedTaskIds: [], sourceWorkOrderIds: [] } as import('../../types').RequirementTask;
  const plan = { id: 'plan-retry', workItemId: 'test-task-source', executable: true, name: '待关联计划', revision: 0, cases: [] };
  vi.mocked(productRepository.availableTestPlans).mockResolvedValue([{ plan, workItemTitle: '来源任务', workItemCode: 'TEST-02' }] as never);
  vi.mocked(productRepository.associateTestPlans).mockRejectedValue(new Error('保存失败，请重试'));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><RequirementTasksView taskKind="test" itemLabel="测试任务" initialDetail={task} /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: '测试计划 · 0' }));
  fireEvent.click(screen.getByRole('button', { name: '新增关联测试计划' }));
  const picker = await screen.findByRole('dialog');
  expect(within(picker).getByText('选择关联测试计划')).toBeInTheDocument();
  const row = await within(picker).findByRole('row', { name: /待关联计划.*TEST-02.*来源任务/ });
  fireEvent.click(within(row).getByRole('checkbox'));
  fireEvent.click(within(picker).getByRole('button', { name: /关\s*联/ }));
  expect(await within(picker).findByText('保存失败，请重试')).toBeInTheDocument();
  expect(within(row).getByRole('checkbox')).toBeChecked();
  expect(within(picker).getByRole('button', { name: /取\s*消/ })).toBeEnabled();
});

it('shows empty and retryable error states for test plans in test task details', async () => {
  const task = { id: 'test-plan-state', code: 'TEST-01', category: 'test', title: '测试任务', status: '待测试', productLineId: 'line-1', relatedTaskIds: [], sourceWorkOrderIds: [] } as import('../../types').RequirementTask;
  vi.mocked(productRepository.testPlans).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('计划读取失败')).mockResolvedValueOnce([]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><RequirementTasksView taskKind="test" itemLabel="测试任务" initialDetail={task} /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: '测试计划 · 0' }));
  expect(await screen.findByText('暂无关联测试计划')).toBeInTheDocument();
  await act(async () => { await client.invalidateQueries({ queryKey: ['test-task-plans', task.id] }); });
  expect(await screen.findByText('测试计划加载失败')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '重试' }));
  expect(await screen.findByText('暂无关联测试计划')).toBeInTheDocument();
});

it('defaults a new defect owner and verifier to the creator and allows changing each independently', async () => {
  window.history.replaceState(null, '', '/app/prod_bugs');
  vi.mocked(teamRepository.options).mockResolvedValue([{ id: 'user-admin', name: '当前用户' }, { id: 'owner-1', name: '负责人甲' }, { id: 'qa-2', name: '验证者乙' }] as never);
  vi.mocked(useApp).mockReturnValue({ ...useApp(), currentUser: { id: 'user-admin', name: '当前用户' }, productLines: [{ id: 'line-1', name: '协同产品' }], versions: [{ id: 'version-1', name: 'V1.0', productLineId: 'line-1', productLineName: '协同产品' }] } as unknown as ReturnType<typeof useApp>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="bug" itemLabel="缺陷" /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: '新建' }));
  const ownerItem = screen.getByText('负责人', { selector: '.ant-form-item-label label' }).closest('.ant-form-item')!;
  const owner = ownerItem.querySelector('.ant-select input')!;
  expect(owner.closest('.ant-select')).toHaveTextContent('当前用户');
  const verifierItem = screen.getByText('验证者', { selector: '.ant-form-item-label label' }).closest('.ant-form-item')!;
  const verifier = verifierItem.querySelector('.ant-select input')!;
  expect(verifier.closest('.ant-select')).toHaveTextContent('当前用户');
  fireEvent.mouseDown(owner);
  fireEvent.click(await screen.findByText(/^负责人甲/, { selector: '.ant-select-item-option-content' }));
  expect(verifier.closest('.ant-select')).toHaveTextContent('当前用户');
  fireEvent.mouseDown(verifier);
  fireEvent.click(await screen.findByText('验证者乙', { selector: '.ant-select-item-option-content' }));
  expect(verifier.closest('.ant-select')).toHaveTextContent('验证者乙');
  expect(owner.closest('.ant-select')).toHaveTextContent('负责人甲');
  expect(screen.getByText('迭代版本', { selector: '.ant-form-item-label label' })).toBeInTheDocument();
  expect(screen.queryByText('关联版本')).not.toBeInTheDocument();
});

it('keeps creator defaults when opening a defect from a collaboration item', async () => {
  window.history.replaceState(null, '', '/app/wb_work_order');
  vi.mocked(teamRepository.options).mockResolvedValue([{ id: 'user-admin', name: '当前用户' }] as never);
  vi.mocked(useApp).mockReturnValue({ ...useApp(), currentUser: { id: 'user-admin', name: '当前用户' }, productLines: [{ id: 'line-1', name: '协同产品' }] } as unknown as ReturnType<typeof useApp>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="bug" itemLabel="缺陷" creationContext={{ productLineId: 'line-1', sourceWorkOrder: { id: 'matter-1', title: '来源事项' } as import('../../types').RequirementTask }} /></QueryClientProvider>);
  await screen.findByText('新建缺陷');
  const ownerItem = screen.getByText('负责人', { selector: '.ant-form-item-label label' }).closest('.ant-form-item')!;
  const verifierItem = screen.getByText('验证者', { selector: '.ant-form-item-label label' }).closest('.ant-form-item')!;
  expect(ownerItem.querySelector('.ant-select')).toHaveTextContent('当前用户');
  expect(verifierItem.querySelector('.ant-select')).toHaveTextContent('当前用户');
});

it('shows fixed independent defect types and the requested bug creation fields', async () => {
  window.history.replaceState(null, '', '/app/prod_bugs');
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="bug" /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('button', { name: '新建' }));
  expect(screen.getByText('验证者').closest('.ant-form-item')).toHaveStyle({ order: '1' });
  expect(screen.queryByText('期望结果')).not.toBeInTheDocument();
  expect(screen.queryByText('支撑项')).not.toBeInTheDocument();
  expect(screen.queryByText('子任务')).not.toBeInTheDocument();
  expect(screen.getByText(/关联任务/)).toBeInTheDocument();
  const typeItem = [...document.querySelectorAll('.requirement-new-properties .ant-form-item')].find(item => item.textContent?.includes('缺陷类型'))!;
  expect(typeItem).toBeTruthy();
  expect(typeItem.textContent).toContain('系统缺陷');
  expect(typeItem.querySelector('input')).not.toBeDisabled();
  fireEvent.mouseDown(typeItem.querySelector('input')!);
  for (const label of ['系统缺陷','样式缺陷','线上故障','安全漏洞']) expect(screen.getByText(label, { selector: '.ant-select-item-option-content' })).toBeInTheDocument();
});


it('filters defects awaiting my verification and offers the full company scope in order', async () => {
  vi.mocked(readSession).mockReturnValue({ user: { id: 'qa' } } as never);
  window.history.replaceState(null, '', '/app/prod_bugs');
  vi.mocked(useApp).mockReturnValue({ ...useApp(), currentUser: { id: 'qa', name: '测试人员', department: '测试部' }, productLines: [{ id: 'line', name: '产品' }] } as unknown as ReturnType<typeof useApp>);
  const records = [
    { id: 'mine', title: '待我验证缺陷', verifierId: 'qa', status: { name: '已修复' } },
    { id: 'closed', title: '已关闭缺陷', verifierId: 'qa', status: { name: '已关闭' } },
    { id: 'other', title: '他人验证缺陷', verifierId: 'other', status: { name: '已修复' } }
  ].map(task => ({ ...task, category: 'bug', productLineId: 'line', assigneeName: '测试人员', createdAt: '2026-10-01', priority: '中' }));
  vi.mocked(productRepository.workItems).mockResolvedValue({ page: { items: records, total: records.length } } as never);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="bug" /></QueryClientProvider>);
  const pending = await screen.findByRole('tab', { name: '待我验证的·1' });
  expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['我负责的·3', '我创建的·0', '待我验证的·1', '我部门的·0', '全公司的·3']);
  fireEvent.click(pending);
  expect(await screen.findByText('待我验证缺陷')).toBeVisible();
  expect(screen.queryByText('已关闭缺陷')).not.toBeInTheDocument();
  expect(screen.queryByText('他人验证缺陷')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: '全公司的·3' }));
  expect(await screen.findByText('已关闭缺陷')).toBeVisible();
  expect(screen.getByText('他人验证缺陷')).toBeVisible();
});

it('refreshes design source ownership from the current product catalog after rename', () => {
  window.history.replaceState(null, '', '/app/prod_design_tasks');
  const context = { ...useApp(), currentUser: { id: 'me', name: '测试人员', department: '产品部' }, designTasks: [{ id: 'design', title: '保留的设计标题', designVariant: 'product', productLineId: 'line-1', productLineName: '旧产品名称', versionName: 'V1.0', status: '待处理', priority: '中', ownerName: '测试人员', createdAt: '2026-10-15' }], productLines: [{ id: 'line-1', name: '新产品名称' }] };
  vi.mocked(useApp).mockReturnValue(context as unknown as ReturnType<typeof useApp>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const page = <QueryClientProvider client={client}><RequirementTasksView taskKind="design" itemLabel="设计任务" designVariantFilter="all" /></QueryClientProvider>;
  const { rerender } = render(page);
  expect(screen.getByRole('cell', { name: '新产品名称 / V1.0' })).toBeVisible();
  vi.mocked(useApp).mockReturnValue({ ...context, productLines: [{ id: 'line-1', name: '再次修改产品名' }] } as unknown as ReturnType<typeof useApp>);
  rerender(<QueryClientProvider client={client}><RequirementTasksView taskKind="design" itemLabel="设计任务" designVariantFilter="all" /></QueryClientProvider>);
  expect(screen.getByRole('cell', { name: '再次修改产品名 / V1.0' })).toBeVisible();
  expect(screen.getByText('保留的设计标题')).toBeVisible();
  expect(screen.queryByRole('cell', { name: '新产品名称 / V1.0' })).not.toBeInTheDocument();
});

it('shows saved collaboration choices as read-only in product task details', async () => {
  window.history.replaceState(null, '', '/app/prod_req_tasks?detailId=shared-task&productLineId=line-1');
  vi.mocked(productRepository.workItemDetail).mockResolvedValue({ id: 'shared-task', code: 'REQ-001', category: 'requirement', title: '产品任务', productLineId: 'line-1', needsCollaboration: ['design', 'test'], revision: 0 } as Awaited<ReturnType<typeof productRepository.workItemDetail>>);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="requirement" /></QueryClientProvider>);
  const design = await screen.findByRole('checkbox', { name: '设计' });
  expect(design).toBeDisabled();
  expect(design).toBeChecked();
  expect(screen.getByRole('checkbox', { name: '开发' })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: '开发' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: '测试' })).toBeDisabled();
  expect(screen.getByRole('checkbox', { name: '测试' })).toBeChecked();
});
