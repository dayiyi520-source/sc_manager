// @vitest-environment jsdom
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestPlanDetail, type TestPlanRecord } from './TestPlanDetail';
const mocks = vi.hoisted(() => ({ save: vi.fn(), create: vi.fn() }));
vi.mock('../../services/productRepository', () => ({ productRepository: {
  workItemDetail: vi.fn().mockResolvedValue({ id: 'b1', title: '登录缺陷', status: { name: '待确认' }, assigneeName: '张三' }),
  testCaseDirectories: vi.fn().mockResolvedValue([]), testCases: vi.fn().mockResolvedValue({ items: [{ id: 'c1', title: '用例库标题', latestResult: 'FAILED' }] }),
  saveTestPlan: mocks.save, createWorkItem: mocks.create,
  workItems: vi.fn().mockResolvedValue({ page: { items: [{ id: 'b1', code: 'BUG-1', title: '登录缺陷' }] } }),
  workItemTypes: vi.fn().mockResolvedValue([{ id: 'bt', name: '功能缺陷', category: '缺陷', enabled: true, isDefault: true }]),
} }));
vi.mock('../../services/teamRepository', () => ({ teamRepository: { options: vi.fn().mockResolvedValue([{ id: 'e2', name: '李四' }, { id: 'e1', name: '张三' }]) } }));
vi.mock('../../services/session', () => ({ readSession: () => null }));
vi.mock('../../services/requirementRepository', () => ({ requirementRepository: { workOrderCandidates: vi.fn().mockResolvedValue([]) } }));
// Keep this test focused on the plan-to-shared-form contract and retry behavior.
vi.mock('./RequirementTasksView', () => ({ RequirementTasksView: ({ itemLabel, taskKind, creationContext }: any) => {
  const [error, setError] = React.useState('');
  return <section><h2>新建{itemLabel}</h2><span>{creationContext.assigneeName}</span><input readOnly value={creationContext.title} /><button onClick={() => void creationContext.onSubmit({ productLineId: creationContext.productLineId, versionId: creationContext.versionId, category: taskKind, taskTypeId: 'bt', title: creationContext.title, assigneeId: creationContext.assigneeName === '张三' ? 'e1' : undefined }).catch((reason: Error) => setError(reason.message))}>保存</button><span>{error}</span></section>;
} }));
vi.mock('./LazyRichTextEditor', () => ({ LazyRichTextEditor: () => <div>富文本编辑器</div> }));
vi.mock('../../context/AppContext', () => { const context = { designTasks: [], projects: [], customers: [], devTasks: [], requirementPool: [], risks: [], bugs: [], productLines: [{ id: 'line', name: '产品' }], versions: [{ id: 'v1', name: '版本', productLineName: '产品' }], currentUser: { name: '当前用户' }, requirementTasks: [], addToast: vi.fn(), setBugs: vi.fn() }; return { useApp: () => context }; });
const renderDetail = () => {
  const record = { productName: '产品', versionName: '版本', plan: { id: 'plan', workItemId: 'task', name: '测试计划', revision: 0, cases: [{ testCaseId: 'c1', linkId: 'link', title: '登录', code: 'C1', priority: 'P1', ownerName: '张三' }] }, task: { id: 'task', title: '测试任务', productLineId: 'line', versionId: 'v1' } } as TestPlanRecord;
  mocks.save.mockImplementation(async (_task, _plan, body) => ({ ...record.plan, revision: record.plan.revision + 1, cases: record.plan.cases.map((item) => ({ ...item, ...body.caseResults.find((result: any) => result.testCaseId === item.testCaseId) })) }));
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TestPlanDetail record={record} onBack={() => {}} /></QueryClientProvider>);
  return record;
};
describe('测试计划状态与缺陷操作', () => {
  beforeEach(() => { mocks.save.mockReset(); mocks.create.mockReset(); });
  it('默认显示用例及添加入口，概览隐藏入口且统计使用计划结果', async () => {
    renderDetail();
    expect(screen.getByRole('tab', { name: '用例' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: '添加用例' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: '概览' }));
    expect(screen.queryByRole('button', { name: '添加用例' })).not.toBeInTheDocument();
    expect(screen.getByText('计划信息')).toBeVisible();
    expect(screen.getByRole('img', { name: '执行通过率 0%' })).toBeVisible();
    expect(screen.getByText('相关缺陷')).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: '用例' }));
    expect(screen.getByRole('button', { name: '添加用例' })).toBeVisible();
    expect(await screen.findByLabelText('登录测试状态')).toBeVisible();
  });
  it('概览按计划状态统计人员数据，关联缺陷去重展示', async () => {
    const record = renderDetail();
    record.plan.cases = (['PASSED', 'PASSED', 'FAILED', 'DEFERRED'] as const).map((executionStatus, index) => ({ ...record.plan.cases[0], testCaseId: `c${index + 1}`, executionStatus, defectIds: ['b1'] }));
    fireEvent.click(screen.getByRole('tab', { name: '概览' }));
    expect(screen.getByRole('img', { name: '执行通过率 50%' })).toBeVisible();
    const panel = screen.getByRole('tabpanel', { name: '概览' });
    const row = within(panel).getByText('张三').closest('tr')!;
    expect(within(row).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['张张三', '4', '3', '2', '1', '1', '1', '50%']);
    expect(await within(panel).findByText('登录缺陷')).toBeVisible();
    expect(within(panel).getAllByText('登录缺陷')).toHaveLength(1);
  });
  it('默认待测试，修改为暂缓后保存；失败保留原值', async () => {
    renderDetail();
    expect(await screen.findByText('待测试')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('登录测试状态'));
    fireEvent.click(await screen.findByText('暂缓', { selector: '.ant-select-item-option-content' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('task', 'plan', expect.objectContaining({ caseResults: [{ testCaseId: 'c1', executionStatus: 'DEFERRED', defectIds: [] }] })));
    await waitFor(() => expect(screen.getByText('暂缓', { selector: '.ant-select-content' })).toBeInTheDocument());
    mocks.save.mockRejectedValueOnce(new Error('保存失败'));
    fireEvent.mouseDown(screen.getByLabelText('登录测试状态'));
    fireEvent.click(await screen.findByText('已通过', { selector: '.ant-select-item-option-content' }));
    expect(await screen.findByText('保存失败')).toBeInTheDocument();
    expect(screen.getByText('暂缓', { selector: '.ant-select-content' })).toBeInTheDocument();
  });
  it('加号打开关联弹窗，未选择禁用确定，关联后显示缺陷数量', async () => {
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: '登录添加缺陷' }));
    fireEvent.click(await screen.findByText('关联缺陷'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /确\s*定/ })).toBeDisabled();
    fireEvent.mouseDown(within(dialog).getByLabelText('搜索关联缺陷'));
    fireEvent.click(await screen.findByText('BUG-1 · 登录缺陷', { selector: '.ant-select-item-option-content' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /确\s*定/ }));
    expect(await screen.findByText('缺陷 1')).toBeInTheDocument();
    expect(mocks.save).toHaveBeenCalledWith('task', 'plan', expect.objectContaining({ caseResults: [{ testCaseId: 'c1', executionStatus: 'NOT_EXECUTED', defectIds: ['b1'] }] }));
  });
  it('悬停缺陷标签显示标题状态负责人，删除只解除用例关联', async () => {
    renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: '登录添加缺陷' }));
    fireEvent.click(await screen.findByText('关联缺陷'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.mouseDown(within(dialog).getByLabelText('搜索关联缺陷'));
    fireEvent.click(await screen.findByText('BUG-1 · 登录缺陷', { selector: '.ant-select-item-option-content' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /确\s*定/ }));
    const badge = await screen.findByRole('button', { name: /缺陷 1/ });
    fireEvent.mouseEnter(badge);
    expect(await screen.findByText('缺陷标题')).toBeInTheDocument();
    expect(await screen.findByText('登录缺陷')).toBeInTheDocument();
    expect(screen.getByText('待确认')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '解除关联登录缺陷' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /缺陷 1/ })).not.toBeInTheDocument());
    expect(mocks.save).toHaveBeenLastCalledWith('task', 'plan', expect.objectContaining({ caseResults: [{ testCaseId: 'c1', executionStatus: 'NOT_EXECUTED', defectIds: [] }] }));
  });
  it('在当前页新建缺陷并保存关联，关联失败重试不重复创建', async () => {
    renderDetail();
    mocks.create.mockResolvedValue({ id: 'new-bug' });
    mocks.save.mockRejectedValueOnce(new Error('关联失败'));
    fireEvent.click(await screen.findByRole('button', { name: '登录添加缺陷' }));
    fireEvent.click(await screen.findByText('新建缺陷'));
    await waitFor(() => expect(document.body.textContent?.includes('新建缺陷管理')).toBe(true));
    expect(screen.queryByText('提报新缺陷 Bug')).not.toBeInTheDocument();
    expect(await screen.findByDisplayValue('登录')).toBeInTheDocument();
    const submit = await screen.findByRole('button', { name: /^保\s*存$/ });
    await waitFor(() => expect(submit).not.toHaveClass('ant-btn-loading'));
    fireEvent.click(submit);
    expect(await screen.findAllByText(/关联失败/)).not.toHaveLength(0);
    fireEvent.click(submit);
    expect(await screen.findByText('缺陷 1')).toBeInTheDocument();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ productLineId: 'line', versionId: 'v1', category: 'bug', taskTypeId: 'bt', title: '登录', assigneeId: 'e1' }));
  });
});
