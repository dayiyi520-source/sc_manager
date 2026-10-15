// @vitest-environment jsdom
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OkrPayload, OkrPerson, OkrRecord } from '../../../services/okrRepository';
import type { OKRItem } from '../../../types';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import { ReviewReadOnlyView } from './ReviewReadOnlyView';
import { createReviewCopyDraft } from './reviewCopy';
import { supervisorReviewMetrics } from './SupervisorReviewMetrics';
class Observer { observe() {} disconnect() {} unobserve() {} }
globalThis.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;
const period = { startDate: '2026-10-12', endDate: '2026-10-18' };
const manager: OkrPerson = { id: 'manager', name: '主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 0 };
const employee: OkrPerson = { ...manager, id: 'employee', name: '员工', supervisorId: 'manager' };
const objective: OKRItem = { id: 'manager-o', ownerId: 'manager', ownerName: '主管', cycle: '2026-10', category: 'my', department: '产品部', objective: '部门月度目标', progress: 40, weight: 100, deadline: '', status: 'active', keyResults: [{ id: 'manager-kr', content: '部门 KR', progress: 40, weight: 100, deadline: '', businessObject: '产品甲', version: 'V1' }] };
const goal: OkrRecord = { id: 'employee-goal', ownerId: 'employee', kind: 'objective', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '员工目标', sourceObjectiveId: 'manager-o', sourceKrId: 'manager-kr', keyResults: [{ id: 'manager-kr', title: '承接 KR', weight: 100, progress: 0, executionActions: [{ id: 'employee-a', ownerId: 'employee', title: '员工 A', progress: 60 }] }] } };
const contribution = { objectiveId: 'employee-goal', objectiveTitle: '员工目标', keyResultId: 'employee-a', keyResultTitle: '员工 A', previousProgress: 20, currentProgress: 60, health: 'normal' as const, achievement: '', blocker: '', nextPlan: '', workIds: [], evidenceNote: '已完成关键验证' };
const support: OkrRecord = { id: 'employee-review', ownerId: 'employee', kind: 'review', periodKey: `${period.startDate}/${period.endDate}`, status: 'submitted', version: 1, payload: { title: '员工本周复盘', reviewType: 'week', ...period, krReviews: [contribution] } };
const baseProps = { template: 'supervisor' as const, people: [manager, employee], viewer: { id: 'manager', name: '主管', department: '产品部' }, periodOverride: period, okrs: [objective], work: [], busy: false, workLoading: false, reviewerName: '老板', onCancel: vi.fn(), onRefreshWork: vi.fn(), onSubmit: vi.fn(async () => true) };

describe('supervisor weekly review', () => {
  it('blocks submission for missing or unread employee reports and proceeds only when read', () => {
    const submit = vi.fn(async () => true);
    const { rerender } = render(<WeeklyReviewEditor {...baseProps} records={[]} onSubmit={submit} onSaveDraft={vi.fn(async () => true)}/>);
    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));
    expect(screen.getByText(/本轮周报未提交：员工/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '确认提交周报' })).not.toBeInTheDocument();
    rerender(<WeeklyReviewEditor {...baseProps} records={[support]} onSubmit={submit} onSaveDraft={vi.fn(async () => true)}/>);
    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));
    expect(screen.getByText(/本轮复盘尚未读：员工/)).toBeInTheDocument();
    rerender(<WeeklyReviewEditor {...baseProps} records={[{ ...support, viewedBy: ['manager'] }]} onSubmit={submit} onSaveDraft={vi.fn(async () => true)}/>);
    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));
    expect(screen.getByRole('dialog', { name: '确认提交周报' })).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('shows department metrics and six sections and saves the restored summary and plan', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<WeeklyReviewEditor {...baseProps} records={[goal, support]} initialPayload={{ title: '草稿', summary: '原总结', nextWeekPlan: '原计划' }} onSaveDraft={save}/>);
    expect(screen.getByText('部门周报')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '部门月目标进度' })).getByText('0% → 60%')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '员工已提交' })).getByText('1/1')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: '待确认风险' })).getByText('0')).toBeInTheDocument();
    for (const title of ['1. 部门月目标复盘', '2. 插播任务', '3. 部门补充总结', '4. 部门下周计划', '5. 需要协助的事项', '6. 知识沉淀']) expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '部门补充总结' })).toHaveValue('原总结');
    fireEvent.change(screen.getByRole('textbox', { name: '部门补充总结' }), { target: { value: ' 新总结 ' } });
    fireEvent.change(screen.getByRole('textbox', { name: '部门下周计划' }), { target: { value: ' 新计划 ' } });
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0]).toMatchObject({ summary: '新总结', nextWeekPlan: '新计划' });
  });
  it('deduplicates submitted employees and pending risks and filters periods, drafts and other teams', () => {
    const riskReport = { ...support, payload: { ...support.payload, krReviews: [{ ...contribution, health: 'risk' as const }] } };
    const target = { ...contribution, objectiveId: objective.id, keyResultId: objective.keyResults[0].id };
    const records = [goal, riskReport, riskReport, { ...support, id: 'duplicate-person' }, { ...support, id: 'draft', status: 'draft', ownerId: 'employee2' }, { ...support, id: 'past', ownerId: 'employee2', payload: { ...support.payload, startDate: '2026-10-05' } }, { ...support, id: 'other-team', ownerId: 'outsider' }];
    const people = [manager, employee, { ...employee, id: 'employee2' }, { ...employee, id: 'outsider', supervisorId: 'other' }];
    expect(supervisorReviewMetrics([objective], [target], records, people, manager.id, period)).toMatchObject({ submitted: 1, total: 2, pendingRisks: 1 });
    expect(supervisorReviewMetrics([objective], [{ ...target, viewedEmployeeReviewIds: [riskReport.id] }], records, people, manager.id, period).pendingRisks).toBe(0);
    expect(supervisorReviewMetrics([], [], [], [], manager.id, period)).toEqual({ previousProgress: 0, currentProgress: 0, submitted: 0, total: 0, pendingRisks: 0 });
  });
  it('weights department progress by objective and KR weights', () => {
    const targets = [{ ...contribution, objectiveId: objective.id, keyResultId: objective.keyResults[0].id, previousProgress: 20, currentProgress: 40 }, { ...contribution, objectiveId: 'o2', keyResultId: 'kr2', previousProgress: 60, currentProgress: 80 }];
    const objectives = [{ ...objective, weight: 25 }, { ...objective, id: 'o2', weight: 75, keyResults: [{ ...objective.keyResults[0], id: 'kr2' }] }];
    expect(supervisorReviewMetrics(objectives, targets, [], [], manager.id, period)).toMatchObject({ previousProgress: 50, currentProgress: 70 });
  });
  it('updates pending risks after viewing support and shows loading/error instead of zero', () => {
    const riskReport = { ...support, payload: { ...support.payload, krReviews: [{ ...contribution, health: 'blocked' as const, blocker: '依赖延期' }] } };
    const { rerender } = render(<WeeklyReviewEditor {...baseProps} records={[goal, riskReport]} onSaveDraft={vi.fn(async () => true)}/>);
    expect(within(screen.getByRole('region', { name: '待确认风险' })).getByText('1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('KR1：部门 KR'));
    fireEvent.click(screen.getByRole('button', { name: '查看本期复盘' }));
    expect(within(screen.getByRole('region', { name: '待确认风险' })).getByText('0')).toBeInTheDocument();
    rerender(<WeeklyReviewEditor {...baseProps} records={[]} recordsLoading onSaveDraft={vi.fn(async () => true)}/>);
    expect(screen.getByLabelText('部门周报指标')).toHaveAttribute('aria-busy', 'true');
    expect(within(screen.getByRole('region', { name: '待确认风险' })).queryByText('0')).not.toBeInTheDocument();
    rerender(<WeeklyReviewEditor {...baseProps} records={[]} recordsError={new Error('断网')} onSaveDraft={vi.fn(async () => true)}/>);
    expect(within(screen.getByRole('region', { name: '待确认风险' })).getByText('加载失败')).toBeInTheDocument();
  });
  it('disables summary and plan for submitted records', () => {
    render(<WeeklyReviewEditor {...baseProps} records={[]} recordStatus="submitted" onSaveDraft={vi.fn(async () => true)}/>);
    expect(screen.getByRole('textbox', { name: '部门补充总结' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '部门下周计划' })).toBeDisabled();
  });
  it('defaults to the progress card, expands a calculated employee table and removes manual judgment', () => {
    render(<WeeklyReviewEditor {...baseProps} records={[goal, support]} onSaveDraft={vi.fn(async () => true)}/>);
    expect(screen.getByText('员工支撑 1 人 · 工作证据 0 项')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '主管 KR 复盘：部门 KR' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('KR1：部门 KR'));
    expect(screen.getByRole('columnheader', { name: 'KR名称' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^员工$/ })).toBeInTheDocument();
    expect(screen.getByText('个人动作：员工 A · 当前进度60%')).toBeInTheDocument();
    expect(screen.queryByText('主管判断与协调')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
  it('uses employee names as columns and shows saved action health with an icon', () => {
    const member = { ...employee, name: '张三' };
    const report = { ...support, payload: { ...support.payload, krReviews: [{ ...contribution, executionHealth: '风险' as const }] } };
    render(<WeeklyReviewEditor {...baseProps} people={[manager, member]} records={[goal, report]} onSaveDraft={vi.fn(async () => true)}/>);
    fireEvent.click(screen.getByText('KR1：部门 KR'));
    expect(screen.getByRole('columnheader', { name: '张三' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /^员工$/ })).not.toBeInTheDocument();
    expect(screen.queryByText('本周未提交')).not.toBeInTheDocument();
    const status = screen.getByText('风险', { selector: 'span' });
    expect(status.querySelector('svg')).toBeInTheDocument();
  });
  it('merges employee extra work, assistance and knowledge without deletion and saves their source snapshot', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const report = { ...support, payload: { ...support.payload, extraWork: { workIds: ['extra-task'], description: '', impact: 'none' }, items: [{ workId: 'extra-task', title: '员工插播任务', status: '已完成', actualHours: 2, result: '', impact: '' }], assistance: [{ workId: 'help', subject: '员工协助', result: '需要支持' }], knowledgeEntries: [{ id: 'knowledge', title: '员工经验', category: '应知应会' }] } };
    render(<WeeklyReviewEditor {...baseProps} records={[goal, report]} onSaveDraft={save}/>);
    expect(screen.getByText('员工插播任务')).toBeInTheDocument();
    expect(screen.getByText('员工协助')).toBeInTheDocument();
    expect(screen.getByText('员工经验')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '删除操作' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '移除额外工作' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0].departmentContentSnapshots).toHaveLength(1);
    expect(save.mock.calls[0][0].departmentContentSnapshots?.[0].knowledgeEntries?.[0].title).toBe('员工经验');
  });
});

describe('supervisor self-assignment editing and saved recovery', () => {
  it.each(['week', 'month'] as const)('keeps owner progress and evidence after saving and reopening %s', async reviewType => {
    const source: OkrRecord = { id: objective.id, ownerId: manager.id, kind: 'objective', status: 'active', version: 1, periodKey: '2026-10', payload: { title: '部门 O', goalLevel: 'department', keyResults: [{ id: 'manager-kr', title: '部门 KR', weight: 100, progress: 0, assigneeIds: [manager.id] }] } };
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const work = [{ id: 'owner-task', sourceId: 'owner-task', title: '主管验证任务', kind: 'task', status: '已完成', assigneeId: manager.id, ownerName: manager.name, createdAt: '2026-10-12', completedAt: '2026-10-13', updatedAt: '2026-10-13', dueDate: '', actualHours: 1, estimatedHours: 1, linkVersion: 0, sourceWorkOrderIds: '[]' }];
    const { unmount } = render(<WeeklyReviewEditor {...baseProps} reviewType={reviewType} records={[source]} work={work} onSaveDraft={save}/>);
    fireEvent.click(screen.getByText('KR1：部门 KR'));
    fireEvent.change(screen.getByRole('spinbutton', { name: '主管进度：部门 KR' }), { target: { value: '70' } });
    fireEvent.click(within(screen.getByRole('region', { name: '主管 KR 复盘：部门 KR' })).getByRole('button', { name: '关联工作证据' }));
    expect(screen.getByText(/全部产品/)).toBeInTheDocument();
    const picker = screen.getByRole('dialog');
    const choices = within(picker).getAllByRole('checkbox');
    fireEvent.click(choices[choices.length - 1]);
    fireEvent.click(within(picker).getByRole('button', { name: '确认关联' }));
    await waitFor(() => expect(screen.getByText('主管验证任务')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0].krReviews?.[0]).toMatchObject({ currentProgress: 70, supervisorProgress: [{ id: 'manager-kr', currentProgress: 70 }], workIds: ['owner-task'] });
    const payload = save.mock.calls[0][0];
    expect(payload.objectiveSnapshots?.[0].payload.keyResults?.[0].progress).toBe(70);
    unmount();
    render(<WeeklyReviewEditor {...baseProps} reviewType={reviewType} records={[source]} initialPayload={payload} onSaveDraft={save}/>);
    fireEvent.click(screen.getByText('KR1：部门 KR'));
    expect(screen.getByRole('spinbutton', { name: '主管进度：部门 KR' })).toHaveValue('70');
    expect(screen.getByText('主管验证任务')).toBeInTheDocument();
  });
});

it('offers supervisor pending tasks in extra work and saves their source as the supervisor name', () => {
  const save = vi.fn(async (_payload: OkrPayload) => true);
  const work = [{ id: 'pending-own', sourceId: 'pending-own', title: '主管待测试工作', kind: 'task', status: '待测试', assigneeId: manager.id, ownerName: manager.name, createdAt: '2026-10-12', updatedAt: '2026-10-12', dueDate: '', actualHours: 0, estimatedHours: 1, linkVersion: 0, sourceWorkOrderIds: '[]' }];
  render(<WeeklyReviewEditor {...baseProps} records={[]} work={work} onSaveDraft={save}/>);
  const extra = screen.getByText('2. 插播任务').closest('section')!;
  fireEvent.click(within(extra).getByRole('button', { name: '关联工作证据' }));
  const picker = screen.getByRole('dialog');
  expect(within(picker).getByText(/主管待测试工作/)).toBeInTheDocument();
  const choices = within(picker).getAllByRole('checkbox');
  fireEvent.click(choices[choices.length - 1]);
  fireEvent.click(within(picker).getByRole('button', { name: '确认关联' }));
  const row = within(extra).getByText('主管待测试工作').closest('tr')!;
  expect(within(row).getByText('主管')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
  expect(save.mock.calls[0][0].extraWork?.workIds).toContain('pending-own');
});
