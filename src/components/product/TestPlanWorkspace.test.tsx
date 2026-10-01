// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestPlanWorkspace } from './TestPlanWorkspace';
const mocks = vi.hoisted(() => ({ workItems: vi.fn(), testPlans: vi.fn(), createTestPlan: vi.fn() }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ productLines: [{ id: 'line-1', name: '产品一' }], versions: [{ id: 'v1', name: '版本一', productLineId: 'line-1' }], currentUser: { name: '测试人员' } }) }));
vi.mock('../../services/productRepository', () => ({ productRepository: { workItems: mocks.workItems, testPlans: mocks.testPlans, createTestPlan: mocks.createTestPlan } }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([{ id: 'e1', name: '测试人员' }]) } }));
vi.mock('./TestPlanPanel', () => ({ TestPlanPanel: () => <div>计划详情</div> }));
const renderWorkspace = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TestPlanWorkspace productLineFilter="line-1" /></QueryClientProvider>);
describe('TestPlanWorkspace', () => {
  beforeEach(() => {
    mocks.createTestPlan.mockResolvedValue({ id: 'new-plan', cases: [] });
    mocks.workItems.mockResolvedValue({ page: { items: [{ id: 'task-1', code: 'T-1', title: '主测试任务', productLineId: 'line-1', assigneeName: '测试人员', creatorName: '其他人', ccNames: ['测试人员'], versionId: 'v1', status: { name: '待处理' } }, { id: 'task-2', code: 'T-2', title: '其他主任务', productLineId: 'line-1', assigneeName: '其他人', creatorName: '测试人员', status: { name: '处理中' } }], total: 2 } });
    mocks.testPlans.mockImplementation(async (taskId: string) => [{ id: `plan-${taskId}`, workItemId: taskId, executable: true, name: `${taskId}计划`, ownerName: taskId === 'task-2' ? '其他人' : '测试人员', revision: 0, cases: [] }]);
  });
  it('聚合测试任务下的计划并按计划展示', async () => { renderWorkspace(); expect(await screen.findByText('task-1计划')).toBeInTheDocument(); expect(screen.getByText('task-2计划')).toBeInTheDocument(); expect(screen.getByText('主测试任务')).toBeInTheDocument(); });
  it('标签分类控制计划列表而不是任务列表', async () => { renderWorkspace(); await screen.findByText('task-1计划'); fireEvent.click(screen.getByText(/我负责的/)); expect(screen.getByText('task-1计划')).toBeInTheDocument(); expect(screen.queryByText('task-2计划')).not.toBeInTheDocument(); fireEvent.click(screen.getByText(/我创建的/)); expect(screen.getByText('task-2计划')).toBeInTheDocument(); expect(screen.queryByText('task-1计划')).not.toBeInTheDocument(); });
  it('列表下方不再展示执行表，右上角新建按钮打开计划弹窗', async () => { renderWorkspace(); await screen.findByText('task-1计划'); expect(screen.queryByText('计划详情')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: /新建/ })); expect(await screen.findByText('新建测试计划')).toBeInTheDocument(); });
  it('点击计划标题打开计划详情', async () => { renderWorkspace(); const title = await screen.findByRole('button', { name: 'task-1计划' }); fireEvent.click(title); expect(await screen.findByText('测试环境')).toBeInTheDocument(); expect(screen.getByText('引用用例')).toBeInTheDocument(); });
  it('使用统一分页组件展示总数和页码', async () => { renderWorkspace(); await screen.findByText('task-1计划'); expect(screen.getByText('共 2 条，第 1 / 1 页')).toBeInTheDocument(); expect(screen.getByRole('button', { name: '上一页' })).toBeInTheDocument(); });
});
