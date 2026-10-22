// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import { findReviewForPayload } from './useOriginalOkr';
import { employeeReviewHealth } from './employeeReviewHealth';
import { completedActualHours } from './reviewActualHours';
import { employeeReviewBaseline, reviewDraftTargets } from './reviewDraftTargets';
import type { OKRItem } from '../../../types';
import type { OkrPayload, OkrRecord } from '../../../services/okrRepository';

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

const props = {
  okrs: [],
  work: [],
  busy: false,
  workLoading: false,
  onRefreshWork: vi.fn(),
  onSaveDraft: vi.fn(async () => true),
  onSubmit: vi.fn(async () => true),
  onCancel: vi.fn(),
};

describe('WeeklyReviewEditor approver routing', () => {
  it('shows the direct supervisor as the automatically assigned approver', () => {
    render(<WeeklyReviewEditor {...props} reviewerName="直属主管" />);

    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));

    expect(screen.getByText('直属主管')).toBeInTheDocument();
    expect(screen.getByText('直属上级（系统自动设置）')).toBeInTheDocument();
  });

  it('blocks submission when a non-root employee has no supervisor', () => {
    render(<WeeklyReviewEditor {...props} />);

    fireEvent.click(screen.getByRole('button', { name: '提交周报' }));

    expect(screen.getByText(/尚未配置直属上级，无法确定审批人/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '确认提交周报' })).not.toBeInTheDocument();
  });
});

describe('review period identity', () => {
  it('omits the progress-change summary from the weekly title', () => {
    render(<WeeklyReviewEditor {...props}/>);
    expect(screen.queryByText(/暂无进度变动/)).not.toBeInTheDocument();
  });
  it('hides assistance and knowledge tables until rows are added', () => {
    render(<WeeklyReviewEditor {...props}/>);
    expect(screen.queryByRole('columnheader', { name: '事项类型' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '内容摘要' })).not.toBeInTheDocument();
    expect(screen.getByText('暂无需要协助事项')).toBeInTheDocument();
    expect(screen.getByText('暂无知识沉淀')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发起协同' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建知识沉淀' })).toBeInTheDocument();
  });
  it('shows the two tables for saved rows', () => {
    render(<WeeklyReviewEditor {...props} initialPayload={{ title: '草稿', assistance: [{ workId: 'assist', subject: '协助验收', result: '', assistanceType: '售前支持', expectedAssignee: '同事', content: '', expectedDueDate: '' }], knowledgeEntries: [{ id: 'knowledge', title: '设计经验', category: '应知应会' }] }}/>)
    expect(screen.getByRole('columnheader', { name: '事项类型' })).toBeInTheDocument();
    for (const name of ['标题', '场景与痛点', '执行动作与复盘结论', '操作']) expect(screen.getAllByRole('columnheader', { name }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('columnheader', { name: '分类' })).not.toBeInTheDocument();
    expect(screen.queryByText('暂无需要协助事项')).not.toBeInTheDocument();
    expect(screen.queryByText('暂无知识沉淀')).not.toBeInTheDocument();
  });
  it('matches an existing review only by owner, type, and exact period', () => {
    const payload: OkrPayload = { title: '本周复盘', reviewType: 'week', startDate: '2026-09-21', endDate: '2026-09-27' };
    const records: OkrRecord[] = [{
      id: 'review-1', kind: 'review', ownerId: 'me', periodKey: '2026-09-21/2026-09-27', status: 'draft', version: 0,
      payload: { ...payload, title: '已有草稿' }
    }];

    expect(findReviewForPayload(records, 'me', '2026-09-21/2026-09-27', payload)?.id).toBe('review-1');
    expect(findReviewForPayload(records, 'other', '2026-09-21/2026-09-27', payload)).toBeUndefined();
    expect(findReviewForPayload(records, 'me', '2026-09-14/2026-09-20', payload)).toBeUndefined();
  });

  it('uses the collaboration type menu and the five weekly sections', () => {
    render(<WeeklyReviewEditor {...props} />);
    expect(screen.queryByRole('button', { name: '临时任务' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    for (const name of ['产品需求', '线上问题', '售前支持', '交付支持', '其他协同']) expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    expect(screen.getByText('2. 插播任务')).toBeInTheDocument();
    expect(screen.getByText('暂无插播任务')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建知识沉淀' })).toBeInTheDocument();
  });
});

 describe('weekly review creation status', () => {
  it('starts pending before the first draft save', () => {
    render(<WeeklyReviewEditor {...props} />);
    expect(screen.getByText('待填写')).toBeInTheDocument();
    expect(screen.queryByText('草稿状态')).not.toBeInTheDocument();
  });
  it.each([['draft', '草稿'], ['returned', '已退回']])('restores persisted %s state', (recordStatus, label) => {
    render(<WeeklyReviewEditor {...props} recordStatus={recordStatus} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

const employeeGoal: OKRItem = { id: 'mine', ownerId: 'me', ownerName: '本人', department: '产品部', cycle: '2026-10', category: 'my', objective: '承接目标', primaryLabel: 'KR', progress: 60, weight: 100, deadline: '2026-10-31', keyResults: [{ id: 'my-a', content: '我的动作', progress: 80, weight: 100, deadline: '2026-10-31', parentKeyResultId: 'shared-kr', parentKeyResultTitle: '共享 KR', parentKeyResultProgress: 70 }] };
const week = { startDate: '2026-10-12', endDate: '2026-10-18' };

describe('employee weekly personal progress', () => {
  it('uses only the same employee and A from an earlier submitted week', () => {
    const history: OkrRecord[] = [
      { id: 'prior', kind: 'review', ownerId: 'me', periodKey: 'old', status: 'submitted', version: 1, payload: { title: 'prior', reviewType: 'week', startDate: '2026-10-05', endDate: '2026-10-11', krReviews: [{ ...reviewDraftTargets([employeeGoal])[0], currentProgress: 35, detailProgress: [{ id: 'd1', previousProgress: 0, currentProgress: 42 }] }] } },
      { id: 'other', kind: 'review', ownerId: 'coworker', periodKey: 'old', status: 'submitted', version: 1, payload: { title: 'other', reviewType: 'week', startDate: '2026-10-05', endDate: '2026-10-11', krReviews: [{ ...reviewDraftTargets([employeeGoal])[0], currentProgress: 90 }] } },
    ];
    expect(employeeReviewBaseline(reviewDraftTargets([employeeGoal]), history, 'me', week.startDate)[0]).toMatchObject({ previousProgress: 35, currentProgress: 35, detailProgress: [{ id: 'd1', previousProgress: 42, currentProgress: 42 }] });
    expect(employeeReviewBaseline(reviewDraftTargets([employeeGoal]), history, 'new-person', week.startDate)[0]).toMatchObject({ previousProgress: 0, currentProgress: 0 });
  });
  it('classifies all four thresholds against elapsed time and handles missing or zero duration', () => {
    const health = (progress: number) => employeeReviewHealth(progress, '2026-10-01', '2026-10-11', '2026-10-11');
    expect(health(100)).toBe('正常');
    expect(health(90)).toBe('正常');
    expect(health(89)).toBe('风险');
    expect(health(75)).toBe('风险');
    expect(health(74)).toBe('逾期');
    expect(employeeReviewHealth(55, '2026-10-01', '2026-10-11', '2026-10-06')).toBe('超预期');
    expect(employeeReviewHealth(0, undefined, undefined, '2026-10-06')).toBeNull();
  });
  it('renders shared KR progress read-only and a single personal progress input without subtable', () => {
    render(<WeeklyReviewEditor {...props} viewer={{ id: 'me', name: '本人', department: '产品部' }} records={[]} okrs={[employeeGoal]} periodOverride={week} reviewerName="主管"/>);
    expect(screen.queryByText('目标1：承接目标')).not.toBeInTheDocument();
    expect(screen.getByText('O1')).toBeInTheDocument();
    expect(screen.getByLabelText('部门KR进度')).toHaveTextContent('70%');
    expect(screen.getByText('我负责的部门KR：我的动作')).toBeInTheDocument();
    fireEvent.click(screen.getByText('我负责的部门KR：我的动作'));
    expect(screen.queryByText(/所属 KR：/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('部门KR进度')).toHaveTextContent('70%');
    expect(screen.getByRole('spinbutton', { name: '本期更新进度' })).toHaveValue('0');
    expect(screen.queryByText('健康状态:')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('KR子表进度更新')).not.toBeInTheDocument();
  });
  it('edits per-detail personal progress, aggregates the plan, and saves without shared KR sync', () => {
    const goal = { ...employeeGoal, keyResults: [{ ...employeeGoal.keyResults[0], businessObject: '师创云平台', parentKeyResultDetails: [{ id: 'd1', name: 'V1.0.0', stage: '产品设计', plannedStartDate: '2026-10-13', plannedEndDate: '2026-10-16' }, { id: 'd2', name: 'V1.1.0', stage: '测试', plannedStartDate: '2026-10-17', plannedEndDate: '2026-10-20' }] }] };
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<WeeklyReviewEditor {...props} onSaveDraft={save} viewer={{ id: 'me', name: '本人', department: '产品部' }} records={[]} okrs={[goal]} periodOverride={week} reviewerName="主管"/>);
    fireEvent.click(screen.getByText('我负责的部门KR：我的动作'));
    expect(screen.getByLabelText('KR子表进度更新')).toBeInTheDocument();
    for (const heading of ['产品', '迭代版本', '阶段', '开始时间', '结束时间', '进度修改']) expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /师创云平台 V1.0.0 产品设计 2026-10-13 2026-10-16/ })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /师创云平台 V1.1.0 测试 2026-10-17 2026-10-20/ })).toBeInTheDocument();
    expect(screen.getAllByText(/当前进度/)).toHaveLength(2);
    expect(screen.queryByRole('spinbutton', { name: '本期更新进度' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '我的动作风险原因及所需支持' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '我的动作风险原因及所需支持' }), { target: { value: '需要协调设计资源' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'V1.0.0 本期更新进度' }), { target: { value: '60' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'V1.1.0 本期更新进度' }), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0]).toMatchObject({ syncKrProgress: false, krReviews: [{ blocker: '需要协调设计资源', currentProgress: 50, detailProgress: expect.arrayContaining([{ id: 'd1', previousProgress: 0, currentProgress: 60 }, { id: 'd2', previousProgress: 0, currentProgress: 40 }]) }] });
  });
  it('restores subtable progress and risk explanation in a draft, and disables edits when submitted', () => {
    const goal = { ...employeeGoal, keyResults: [{ ...employeeGoal.keyResults[0], parentKeyResultDetails: [{ id: 'd1', name: '产品甲', version: 'V1', stage: '产品设计', plannedStartDate: '2026-10-13', plannedEndDate: '2026-10-16' }] }] };
    const initialPayload: OkrPayload = { title: '已存草稿', ...week, reviewType: 'week', krReviews: [{ ...reviewDraftTargets([goal])[0], currentProgress: 10, health: 'risk', blocker: '等资源', detailProgress: [{ id: 'd1', previousProgress: 0, currentProgress: 10 }] }] };
    render(<WeeklyReviewEditor {...props} viewer={{ id: 'me', name: '本人', department: '产品部' }} records={[]} okrs={[goal]} periodOverride={week} initialPayload={initialPayload} recordStatus="submitted" reviewerName="主管"/>);
    fireEvent.click(screen.getByText('我负责的部门KR：我的动作'));
    expect(screen.getByRole('spinbutton', { name: '产品甲 V1本期更新进度' })).toHaveValue('10');
    expect(screen.getByRole('spinbutton', { name: '产品甲 V1本期更新进度' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '我的动作风险原因及所需支持' })).toHaveValue('等资源');
    expect(screen.getByRole('textbox', { name: '我的动作风险原因及所需支持' })).toBeDisabled();
  });
  it('shows risk support only for an automatically risky plan and preserves its text when status recovers', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<WeeklyReviewEditor {...props} onSaveDraft={save} viewer={{ id: 'me', name: '本人', department: '产品部' }} records={[]} okrs={[employeeGoal]} periodOverride={week} reviewerName="主管"/>);
    fireEvent.click(screen.getByText('我负责的部门KR：我的动作'));
    const reason = screen.getByRole('textbox', { name: '我的动作风险原因及所需支持' });
    fireEvent.change(reason, { target: { value: '等待协作方确认' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '本期更新进度' }), { target: { value: '100' } });
    expect(screen.queryByRole('textbox', { name: '我的动作风险原因及所需支持' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('spinbutton', { name: '本期更新进度' }), { target: { value: '0' } });
    expect(screen.getByRole('textbox', { name: '我的动作风险原因及所需支持' })).toHaveValue('等待协作方确认');
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0].krReviews?.[0].blocker).toBe('等待协作方确认');
  });
});

describe('completed actual hours', () => {
  it('never substitutes estimated hours or shows hours on an unfinished task', () => {
    expect(completedActualHours({ kind: 'task', status: '进行中', actualHours: 6 })).toBeUndefined();
    expect(completedActualHours({ kind: 'task', status: '已完成', actualHours: 6 })).toBe(6);
    expect(completedActualHours({ kind: 'task', status: '已完成', actualHours: 0 })).toBeUndefined();
  });
});
