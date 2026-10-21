import { directoryProjects } from '../../services/customerDirectoryData';
// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  createWorkItem: vi.fn().mockResolvedValue({}), designTasks: vi.fn().mockResolvedValue({ items: [], total: 0 }), workItems: vi.fn().mockResolvedValue({ page: { items: [], total: 0 } }), tasks: vi.fn().mockResolvedValue({ items: [], total: 0 }), businessTasks: vi.fn(), updateBusinessTask: vi.fn().mockResolvedValue(null),
  workItemActivities: vi.fn().mockResolvedValue([]), updateWorkItem: vi.fn(), businessTask: vi.fn(), workItemDetail: vi.fn(), workItemTypes: vi.fn().mockResolvedValue([]),
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

const profiles = [
  { kind: 'bug', fields: ['负责人','验证者','优先级','关联产品','迭代版本','关联项目','缺陷类型','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'requirement', fields: ['需要协同','负责人','优先级','关联产品','迭代版本','关联项目','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'dev', fields: ['负责人','优先级','关联产品','迭代版本','关联项目','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'test', fields: ['负责人','优先级','关联产品','迭代版本','关联项目','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'design', variant: 'product', fields: ['任务类型','负责人','优先级','关联产品','迭代版本','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'design', variant: 'project', fields: ['任务类型','负责人','优先级','关联项目','关联产品','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'design', variant: 'other', fields: ['任务类型','负责人','优先级','来源部门','关联产品','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
] as const;
it.each(profiles)('renders fixed $kind $variant creation fields without a field configuration service', async (profile) => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={profile.kind} designVariant={'variant' in profile ? profile.variant : 'product'} /></QueryClientProvider>);
  if (profile.kind === 'design') {
    fireEvent.click(screen.getByRole('button', { name: '新建设计任务' }));
    const label = { product: '产品设计', project: '项目设计', other: '其他设计' }[profile.variant];
    fireEvent.click(await screen.findByRole('menuitem', { name: label }));
  } else fireEvent.click(screen.getByRole('button', { name: '新建' }));
  await screen.findByText('标题', { selector: 'label' });
  expect(screen.getByText('期望完成时间', { exact: true })).toBeInTheDocument();
  const propertyForm = document.querySelector('.requirement-new-properties')!;
  const items = Array.from(propertyForm.querySelectorAll(':scope > .ant-form-item')).sort((a,b)=>Number((a as HTMLElement).style.order)-Number((b as HTMLElement).style.order));
  expect(items.map((item)=>item.querySelector('label')?.textContent)).toEqual(profile.fields);
  expect(screen.getByRole('button',{name:'协同事项 · 0'})).toBeVisible();
  expect(Boolean(screen.queryByRole('button',{name:'关联任务 · 0'}))).toBe(profile.kind!=='requirement');
  expect(screen.queryByText('实际工时（小时）')).not.toBeInTheDocument();
});

it.each(['requirement', 'design', 'dev', 'test', 'presales', 'ops', 'delivery'] as const)('offers company scope after department for %s tasks', async kind => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} /></QueryClientProvider>);
  const companyTab = await screen.findByRole('tab', { name: '全公司的·0' });
  const tabs = screen.getAllByRole('tab');
  expect(tabs.indexOf(companyTab)).toBe(tabs.findIndex(tab => tab.textContent === '我部门的·0') + 1);
  fireEvent.click(companyTab);
  expect(companyTab).toHaveAttribute('aria-selected', 'true');
});

it('allows collaboration choices while creating a product task', async () => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="requirement" /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: '新建' }));
  const design = await screen.findByRole('checkbox', { name: '设计' });
  expect(design).toBeEnabled();
  expect(screen.getByRole('checkbox', { name: '开发' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: '测试' })).toBeChecked();
  fireEvent.click(design);
  expect(design).toBeChecked();
});

it('restores the hidden default type each time a product task form opens', async () => {
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '检查产品' }] } as unknown as ReturnType<typeof useApp>);
  vi.mocked(productRepository.workItemTypes).mockResolvedValue([{ id: 'type-1', name: '默认需求', enabled: true, isDefault: true }] as never);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="requirement" productLineFilter="line-1" /></QueryClientProvider>);
  for (let attempt = 0; attempt < 2; attempt++) {
    fireEvent.click(screen.getByRole('button', { name: '新建' }));
    fireEvent.change(screen.getByPlaceholderText('例如：支持达梦DM8数据库读写分离与主备秒级切换'), { target: { value: '检查默认类型' } });
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
      expect(screen.getByRole('alert')).toHaveTextContent('请选择关联产品的迭代版本');
    });
    expect(screen.queryByText('请选择产品任务类型')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭面板' }));
  }
});

it('offers an explicit type choice when the template has no default', async () => {
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '检查产品' }] } as unknown as ReturnType<typeof useApp>);
  vi.mocked(productRepository.workItemTypes).mockResolvedValue([{ id: 'type-1', name: '手选需求', enabled: true }] as never);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="requirement" productLineFilter="line-1" /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: '新建' }));
  const label = await screen.findByText('任务类型', { selector: 'label' });
  const typeItem = label.closest('.ant-form-item')!;
  fireEvent.mouseDown(within(typeItem as HTMLElement).getByRole('combobox'));
  fireEvent.click(await screen.findByText('手选需求', { selector: '.ant-select-item-option-content' }));
  fireEvent.change(screen.getByPlaceholderText('例如：支持达梦DM8数据库读写分离与主备秒级切换'), { target: { value: '手选类型任务' } });
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent('请选择关联产品的迭代版本');
});

it('saves a new product task with the template default and preserves entered values on failure', async () => {
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '检查产品' }], versions: [{ id: 'version-1', name: '检查版本', productLineId: 'line-1' }] } as unknown as ReturnType<typeof useApp>);
  vi.mocked(productRepository.workItemTypes).mockResolvedValue([{ id: 'type-1', name: '默认需求', enabled: true, isDefault: true }] as never);
  vi.mocked(productRepository.createWorkItem).mockRejectedValueOnce(new Error('写入失败')).mockResolvedValue({} as never);
  const onCreated = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="requirement" creationContext={{ productLineId: 'line-1', versionId: 'version-1', assigneeName: '当前用户', title: '验收创建', onCreated }} /></QueryClientProvider>);
  await screen.findByDisplayValue('验收创建');
  const dates = screen.getAllByPlaceholderText('请选择日期');
  for (const [index, value] of ['2026-10-16', '2026-10-17'].entries()) {
    fireEvent.change(dates[index], { target: { value } });
    fireEvent.keyDown(dates[index], { key: 'Enter', code: 'Enter' });
    fireEvent.blur(dates[index]);
  }
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ })); });
  await waitFor(() => expect(productRepository.createWorkItem).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole('alert')).toHaveTextContent('写入失败');
  expect(screen.getByDisplayValue('验收创建')).toBeVisible();
  const retrySave = screen.getByText('保 存').closest('button')!;
  await waitFor(() => expect(retrySave).not.toHaveClass('ant-btn-loading'));
  fireEvent.click(retrySave);
  await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  expect(productRepository.createWorkItem).toHaveBeenLastCalledWith(expect.objectContaining({ title: '验收创建', taskTypeId: 'type-1', needsCollaboration: ['dev', 'test'], plannedStartDate: '2026-10-16', plannedEndDate: '2026-10-17' }));
});

it('opens allocation and saves the downstream task with its source product task', async () => {
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '检查产品' }], versions: [{ id: 'version-1', name: '检查版本', productLineId: 'line-1' }] } as unknown as ReturnType<typeof useApp>);
  vi.mocked(productRepository.workItemTypes).mockResolvedValue([{ id: 'type-dev', name: '默认研发', enabled: true, isDefault: true }] as never);
  vi.mocked(productRepository.workItems).mockImplementation(async (_line, category) => ({ page: { items: category === 'requirement' ? [{ id: 'parent-1', title: '来源产品任务', category: 'requirement', productLineId: 'line-1', versionId: 'version-1', versionName: '检查版本', needsCollaboration: ['dev'] }] : [], total: category === 'requirement' ? 1 : 0 } }) as never);
  vi.mocked(productRepository.createWorkItem).mockResolvedValue({} as never);
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="dev" itemLabel="研发任务" /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole('tab', { name: '待分配任务·1' }));
  fireEvent.click(await screen.findByRole('button', { name: '分配任务' }));
  await screen.findByRole('heading', { name: '新建研发任务' });
  expect(screen.getByRole('button', { name: '关联任务 · 1' })).toBeVisible();
  fireEvent.change(screen.getByPlaceholderText('例如：支持达梦DM8数据库读写分离与主备秒级切换'), { target: { value: '分配验收研发' } });
  const ownerLabel = screen.getByText('负责人', { selector: 'label' });
  fireEvent.mouseDown(within(ownerLabel.closest('.ant-form-item') as HTMLElement).getByRole('combobox'));
  fireEvent.click(await screen.findByText(/^当前用户/, { selector: '.ant-select-item-option-content' }));
  const dates = screen.getAllByPlaceholderText('请选择日期');
  for (const [index, value] of ['2026-10-16', '2026-10-17'].entries()) {
    fireEvent.change(dates[index], { target: { value } });
    fireEvent.keyDown(dates[index], { key: 'Enter', code: 'Enter' });
    fireEvent.blur(dates[index]);
  }
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ })); });
  await waitFor(() => expect(productRepository.createWorkItem).toHaveBeenCalledWith(expect.objectContaining({ title: '分配验收研发', taskTypeId: 'type-dev', requirementId: 'parent-1', relatedTaskIds: ['parent-1'], versionId: 'version-1' })));
  await waitFor(() => expect(screen.queryByRole('heading', { name: '新建研发任务' })).not.toBeInTheDocument());
});

it('selects and saves the version belonging to the chosen product when product names repeat or version names are stale', async () => {
  vi.mocked(useApp).mockReturnValue({ ...useApp(), productLines: [{ id: 'line-1', name: '院校门户系统' }, { id: 'line-2', name: '院校门户系统' }], versions: [{ id: 'version-1', name: '正确迭代', productLineId: 'line-1', productLineName: '历史产品名' }, { id: 'version-2', name: '其他产品迭代', productLineId: 'line-2', productLineName: '院校门户系统' }] } as unknown as ReturnType<typeof useApp>);
  vi.mocked(productRepository.workItemTypes).mockResolvedValue([{ id: 'type-1', name: '默认需求', enabled: true, isDefault: true }] as never);
  vi.mocked(productRepository.createWorkItem).mockResolvedValue({} as never);
  const onCreated = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind="requirement" creationContext={{ productLineId: 'line-1', assigneeName: '当前用户', title: '同名产品创建验收', onCreated }} /></QueryClientProvider>);
  await screen.findByDisplayValue('同名产品创建验收');
  const versionLabel = screen.getByText('迭代版本', { selector: 'label' });
  fireEvent.mouseDown(within(versionLabel.closest('.ant-form-item') as HTMLElement).getByRole('combobox'));
  const option = await screen.findByText('正确迭代', { selector: '.ant-select-item-option-content' });
  expect(screen.queryByText('其他产品迭代', { selector: '.ant-select-item-option-content' })).not.toBeInTheDocument();
  fireEvent.click(option);
  const dates = screen.getAllByPlaceholderText('请选择日期');
  for (const [index, value] of ['2026-10-16', '2026-10-17'].entries()) {
    fireEvent.change(dates[index], { target: { value } });
    fireEvent.keyDown(dates[index], { key: 'Enter', code: 'Enter' });
    fireEvent.blur(dates[index]);
  }
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ })); });
  await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  expect(productRepository.createWorkItem).toHaveBeenCalledWith(expect.objectContaining({ productLineId: 'line-1', versionId: 'version-1', title: '同名产品创建验收' }));
});

it.each(['requirement', 'design', 'dev', 'test', 'bug', 'ops', 'presales', 'delivery'] as const)('restores optional expected completion in existing %s task details and displays its historical value', async kind => {
  const historic = task('history-' + kind, { expectedCompleteDate: '2026-12-31', plannedStartDate: '2026-10-21', dueDate: '2026-10-30' });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} initialDetail={historic}/></QueryClientProvider>);
  await screen.findByRole('button', { name: `操作${historic.title}` });
  expect(screen.getByText('期望完成时间', { exact: true })).toBeInTheDocument();
  expect(screen.getByDisplayValue('2026-12-31')).toBeInTheDocument();
  expect(historic.expectedCompleteDate).toBe('2026-12-31');
});

it.each(['requirement', 'bug'] as const)('shows an optional project after version in %s details and restores its saved value', async kind => {
  const project = directoryProjects()[0];
  const historic = task('project-' + kind, { productLineId: 'line-1', projectId: project.id, projectName: project.name, revision: 0 });
  vi.mocked(productRepository.workItemDetail).mockResolvedValue(historic);
  vi.mocked(productRepository.updateWorkItem).mockResolvedValue({ ...historic, projectId: '', projectName: '', revision: 1 });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} initialDetail={historic} detailPresentation="page"/></QueryClientProvider>);
  await screen.findByRole('button', { name: `操作${historic.title}` });
  const label = await screen.findByText('关联项目', { selector: 'label' });
  expect(label).not.toHaveClass('ant-form-item-required');
  const item = label.closest('.ant-form-item') as HTMLElement;
  const version = screen.getByText('迭代版本', { selector: 'label' }).closest('.ant-form-item') as HTMLElement;
  expect(Number(item.style.order)).toBe(Number(version.style.order) + 1);
  expect(within(item).getByRole('combobox')).toBeEnabled();
  expect(item).toHaveTextContent(project.name);
  fireEvent.mouseDown(item.querySelector('.ant-select-clear')!);
  fireEvent.click(item.querySelector('.ant-select-clear')!);
  await waitFor(() => expect(productRepository.updateWorkItem).toHaveBeenCalledWith('line-1', historic.id, expect.objectContaining({ projectId: '', projectName: '' })));
});
