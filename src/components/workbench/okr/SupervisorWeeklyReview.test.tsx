// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OkrPayload, OkrPerson, OkrRecord } from '../../../services/okrRepository';
import type { OKRItem } from '../../../types';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import { ReviewReadOnlyView } from './ReviewReadOnlyView';
import { createReviewCopyDraft } from './reviewCopy';
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
  it('uses collapsible counted left-aligned panels and automatically computes the two-line O summary', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<WeeklyReviewEditor {...baseProps} records={[goal, support]} onSaveDraft={save}/>);
    const card = screen.getByRole('region', { name: '主管 KR 复盘：部门 KR' });
    expect(screen.getByText('KR1：部门 KR')).toBeInTheDocument();
    expect(screen.queryByText('目标1：部门月度目标')).not.toBeInTheDocument();
    expect(screen.getByTitle('部门月度目标')).toHaveClass('okr-supervisor-objective-title');
    expect(screen.getByLabelText('目标权重 100%')).toBeInTheDocument();
    expect(screen.getByLabelText('目标进度 40% → 40%')).toBeInTheDocument();
    expect(within(card).getByText('1人相关 · 1份待查看')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /员工复盘支撑/ })).toHaveAttribute('aria-expanded', 'true');
    expect(within(card).getByRole('button', { name: /关联工作证据/ })).toHaveAttribute('aria-expanded', 'true');
    const judgment = within(card).getByRole('textbox', { name: '部门 KR主管判断与协调' });
    fireEvent.change(judgment, { target: { value: ' 优先协调测试资源 ' } });
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0]).toMatchObject({ reviewMode: 'supervisor', krReviews: [{ keyResultId: 'manager-kr', supervisorJudgment: '优先协调测试资源', employeeReviewSnapshots: [{ id: 'employee-review', authorName: '员工', krReviews: [{ evidenceNote: '已完成关键验证' }] }] }] });
  });
  it('expands/collapses each panel independently and views an employee report without losing judgment', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<WeeklyReviewEditor {...baseProps} records={[goal, support]} onSaveDraft={save}/>);
    fireEvent.change(screen.getByRole('textbox', { name: '部门 KR主管判断与协调' }), { target: { value: '保留判断' } });
    const panel = screen.getByRole('button', { name: /员工复盘支撑/ });
    fireEvent.click(panel);
    expect(panel).toHaveAttribute('aria-expanded', 'false');
    expect(within(screen.getByRole('region', { name: '主管 KR 复盘：部门 KR' })).getByRole('button', { name: /关联工作证据/ })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(panel);
    fireEvent.click(screen.getByRole('button', { name: '查看本期复盘' }));
    const dialog = screen.getByRole('dialog', { name: '员工复盘支撑' });
    expect(within(dialog).getByText('员工 · 员工本周复盘')).toBeInTheDocument();
    expect(within(dialog).getByText('工作证据说明：已完成关键验证')).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /关\s*闭/ }));
    expect(screen.getByText('1人相关 · 0份待查看')).toBeInTheDocument();
    expect(screen.getByText('已查看')).toBeInTheDocument();
    expect(screen.getByDisplayValue('保留判断')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0].krReviews?.[0].viewedEmployeeReviewIds).toEqual(['employee-review']);
    expect(screen.queryByRole('dialog', { name: '关联工作证据' })).not.toBeInTheDocument();
  });
  it('shows empty/error support feedback and can retry', () => {
    const retry = vi.fn();
    const { rerender } = render(<WeeklyReviewEditor {...baseProps} records={[]} onSaveDraft={vi.fn(async () => true)} onRefreshRecords={retry}/>);
    expect(screen.getByText('暂无对齐的员工 A')).toBeInTheDocument();
    expect(screen.getByText('暂无员工关联工作证据')).toBeInTheDocument();
    rerender(<WeeklyReviewEditor {...baseProps} records={[]} recordsError={new Error('断网')} onSaveDraft={vi.fn(async () => true)} onRefreshRecords={retry}/>);
    expect(screen.getAllByText('员工复盘加载失败')).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: /重\s*试/ })[0]);
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: /存草稿/ })).toBeDisabled();
  });
  it.each(['有风险', '已阻塞'])('matches employee risk styling and places it before the support divider for %s', status => {
    render(<WeeklyReviewEditor {...baseProps} records={[goal, support]} onSaveDraft={vi.fn(async () => true)}/>);
    fireEvent.click(screen.getByRole('radio', { name: status }));
    const risk = screen.getByText('风险原因及所需支持').closest('.okr-review-risk-callout')!;
    expect(risk).toBeInTheDocument();
    const changes = document.querySelector('.okr-supervisor-kr-change')!;
    const divider = document.querySelector('.okr-supervisor-support-divider')!;
    expect(changes.compareDocumentPosition(risk) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(risk.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText('目标状态：风险')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));
    expect(screen.getByText('风险或阻塞状态的 KR 必须填写原因')).toBeInTheDocument();
  });
  it('includes aligned employee A without a report and only employee-linked evidence in the read-only evidence section', () => {
    const extraPerson = { ...employee, id: 'employee2', name: '第二员工' };
    const extraGoal = { ...goal, id: 'employee2-goal', ownerId: 'employee2', payload: { ...goal.payload, keyResults: [{ ...goal.payload.keyResults![0], executionActions: [{ id: 'employee2-a', ownerId: 'employee2', title: '没有提交的 A', progress: 30 }] }] } };
    const evidenceSupport = { ...support, payload: { ...support.payload, krReviews: [{ ...contribution, workIds: ['task', 'ticket'] }], items: [{ workId: 'task', title: '员工关联任务', status: '已完成', workType: 'task' as const, result: '通过验收', impact: '' }, { workId: 'ticket', title: '员工关联事项', status: '处理中', workType: 'ticket' as const, result: '', impact: '' }, { workId: 'other', title: '不应展示的任务', status: '处理中', result: '', impact: '' }] } };
    render(<WeeklyReviewEditor {...baseProps} people={[manager, employee, extraPerson]} records={[goal, extraGoal, evidenceSupport]} onSaveDraft={vi.fn(async () => true)}/>);
    expect(screen.getByText('2人相关 · 1份待查看')).toBeInTheDocument();
    expect(screen.getByText('个人 A：没有提交的 A · 当前进度30%')).toBeInTheDocument();
    expect(screen.getByText('未提交')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /关联工作证据.*2项/ })).toBeInTheDocument();
    expect(screen.getByText('员工关联任务')).toBeInTheDocument();
    expect(screen.getByText('员工关联事项')).toBeInTheDocument();
    expect(screen.queryByText('不应展示的任务')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('员工关联任务进展说明')).not.toBeInTheDocument();
  });
  it('shows changes since the prior submitted week and follows untouched live progress without losing judgment', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const old: OkrRecord = { ...support, id: 'previous', ownerId: 'manager', payload: { ...support.payload, startDate: '2026-10-05', endDate: '2026-10-11', krReviews: [{ ...contribution, objectiveId: 'manager-o', keyResultId: 'manager-kr', currentProgress: 25 }] } };
    const records = [old];
    const { rerender } = render(<WeeklyReviewEditor {...baseProps} records={records} onSaveDraft={save}/>);
    expect(within(screen.getByRole('region', { name: '主管 KR 复盘：部门 KR' })).getByText('25% → 40%')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '部门 KR主管判断与协调' }), { target: { value: '保留主管判断' } });
    rerender(<WeeklyReviewEditor {...baseProps} records={records} okrs={[{ ...objective, keyResults: [{ ...objective.keyResults[0], progress: 50 }] }]} onSaveDraft={save}/>);
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0].krReviews?.[0]).toMatchObject({ previousProgress: 25, currentProgress: 50, supervisorJudgment: '保留主管判断' });
  });
  it('restores per-KR judgment and historical support; copying keeps judgment but clears evidence', () => {
    const payload: OkrPayload = { title: '主管周报', reviewType: 'week', reviewMode: 'supervisor', ...period, krReviews: [{ ...contribution, objectiveId: 'manager-o', objectiveTitle: '部门月度目标', keyResultId: 'manager-kr', keyResultTitle: '部门 KR', supervisorJudgment: '已保存判断', viewedEmployeeReviewIds: ['employee-review'], employeeReviewSnapshots: [{ id: 'employee-review', authorName: '员工', title: '历史员工周报', ...period, status: 'submitted', krReviews: [contribution], assistance: [], items: [] }] }] };
    const copy = createReviewCopyDraft(payload);
    expect(copy.krReviews?.[0]).toMatchObject({ supervisorJudgment: '已保存判断', viewedEmployeeReviewIds: [], employeeReviewSnapshots: [] });
    render(<WeeklyReviewEditor {...baseProps} records={[]} initialPayload={payload} recordStatus="draft" onSaveDraft={vi.fn(async () => true)}/>);
    expect(screen.getByDisplayValue('已保存判断')).toBeInTheDocument();
    expect(screen.getByText('1人相关 · 0份待查看')).toBeInTheDocument();
    expect(screen.getByText('已查看')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看本期复盘' }));
    expect(screen.getByText('员工 · 历史员工周报')).toBeInTheDocument();
  });
  it('retains supervisor judgment and employee evidence in the read-only submitted detail', () => {
    render(<ReviewReadOnlyView onBack={vi.fn()} onCopy={vi.fn()} review={{ id: 'r', authorId: 'manager', author: '主管', authorDept: '产品部', type: 'week', reviewMode: 'supervisor', cycleName: '主管周报', summary: '', uncompletedReason: '', selfScore: 90, suggestions: '', helpNeeded: '', sendTo: [], createdAt: '', status: 'submitted', krReviews: [{ ...contribution, supervisorJudgment: '协调后的判断', employeeReviewSnapshots: [{ id: 'employee-review', authorName: '员工', title: '员工支撑', ...period, status: 'submitted', krReviews: [contribution], assistance: [], items: [] }] }] }}/>);
    expect(screen.getByText('主管判断与协调')).toBeInTheDocument();
    expect(screen.getByText('协调后的判断')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '员工复盘支撑（1）' }));
    expect(screen.getByText('员工 · 员工支撑')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
