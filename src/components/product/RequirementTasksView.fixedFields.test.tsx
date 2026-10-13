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
  designTasks: vi.fn().mockResolvedValue({ items: [], total: 0 }), workItems: vi.fn().mockResolvedValue({ page: { items: [], total: 0 } }), tasks: vi.fn().mockResolvedValue({ items: [], total: 0 }), businessTasks: vi.fn(), updateBusinessTask: vi.fn().mockResolvedValue(null),
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

const profiles = [
  { kind: 'requirement', fields: ['需要协同','负责人','优先级','关联产品','迭代版本','关联项目','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'dev', fields: ['负责人','优先级','关联产品','迭代版本','关联项目','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'test', fields: ['负责人','优先级','关联产品','迭代版本','关联项目','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'design', variant: 'product', fields: ['任务类型','负责人','优先级','关联产品','迭代版本','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'design', variant: 'project', fields: ['任务类型','负责人','优先级','关联项目','关联产品','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
  { kind: 'design', variant: 'other', fields: ['任务类型','负责人','优先级','来源部门','关联产品','计划开始时间','计划完成时间','期望完成时间','预计工时（小时）','附件'] },
] as const;
it.each(profiles)('renders fixed $kind $variant creation fields even when old settings hide fields', async (profile) => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={profile.kind} designVariant={'variant' in profile ? profile.variant : 'product'} /></QueryClientProvider>);
  if (profile.kind === 'design') {
    fireEvent.click(screen.getByRole('button', { name: '新建设计任务' }));
    const label = { product: '产品设计', project: '项目设计', other: '其他设计' }[profile.variant];
    fireEvent.click(await screen.findByRole('menuitem', { name: label }));
  } else fireEvent.click(screen.getByRole('button', { name: '新建' }));
  await screen.findByText('标题', { selector: 'label' });
  const propertyForm = document.querySelector('.requirement-new-properties')!;
  const items = Array.from(propertyForm.querySelectorAll(':scope > .ant-form-item')).sort((a,b)=>Number((a as HTMLElement).style.order)-Number((b as HTMLElement).style.order));
  expect(items.map((item)=>item.querySelector('label')?.textContent)).toEqual(profile.fields);
  expect(screen.getByRole('button',{name:'协同事项 · 0'})).toBeVisible();
  expect(Boolean(screen.queryByRole('button',{name:'关联任务 · 0'}))).toBe(profile.kind!=='requirement');
  expect(screen.queryByText('实际工时（小时）')).not.toBeInTheDocument();
  expect(productRepository.workItemFieldConfigurations).not.toHaveBeenCalled();
});

it.each(['requirement', 'design', 'dev', 'test', 'presales', 'ops', 'delivery'] as const)('offers company scope after department for %s tasks', async kind => {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequirementTasksView taskKind={kind} /></QueryClientProvider>);
  const companyTab = await screen.findByRole('tab', { name: '全公司的·0' });
  const tabs = screen.getAllByRole('tab');
  expect(tabs.indexOf(companyTab)).toBe(tabs.findIndex(tab => tab.textContent === '我部门的·0') + 1);
  fireEvent.click(companyTab);
  expect(companyTab).toHaveAttribute('aria-selected', 'true');
});
