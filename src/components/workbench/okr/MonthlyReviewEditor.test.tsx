// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthlyReviewEditor } from './MonthlyReviewEditor';
import type { OkrPayload, OkrWork } from '../../../services/okrRepository';
class Observer { observe() {} disconnect() {} unobserve() {} }
globalThis.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;
import type { OKRItem } from '../../../types';

const props = { okrs: [], records: [], currentUserId: 'me', viewer: { id: 'me', name: '本人' }, busy: false, onCancel: vi.fn(), periodOverride: { startDate: '2026-10-01', endDate: '2026-10-31' } };
const initialPayload: OkrPayload = { title: '月报', suggestions: '问题\n建议', otherNotes: '历史补充', nextMonthArrangement: '历史安排',
  extraWork: { workIds: ['t'], description: '', impact: 'none' }, items: [{ workId: 't', title: '已关联任务', status: '处理中', result: '', impact: '', sourceLabel: '产品甲', actualHours: 4 }],
  assistance: [{ workId: 'c', subject: '协调资源', assistanceType: '售前支持', expectedAssignee: '同事', status: '处理中', result: '协同内容' }],
  knowledgeEntries: [{ id: 'k', title: '排查经验', category: '产研规范', content: '经验正文' }] };

describe('personal monthly editor', () => {
  it('explains missing knowledge titles and saves the entry after the title is filled', async () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const view = render(<MonthlyReviewEditor {...props} onSaveDraft={save} onSubmit={vi.fn(async () => true)}/>);
    fireEvent.click(screen.getByRole('button', { name: '新建知识沉淀' }));
    fireEvent.change(screen.getByPlaceholderText('简要概括文档核心内容，便于全员高效检索...'), { target: { value: '月度经验摘要' } });
    fireEvent.click(screen.getByRole('button', { name: '确认添加' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('请输入文档名称');
    expect(screen.getByRole('textbox', { name: '文档名称' })).toHaveFocus();
    fireEvent.change(screen.getByRole('textbox', { name: '文档名称' }), { target: { value: '  月度排查经验  ' } });
    expect(screen.getByRole('textbox', { name: '文档名称' })).toHaveAttribute('aria-invalid', 'false');
    fireEvent.click(screen.getByRole('button', { name: '确认添加' }));
    expect(screen.getByRole('button', { name: '月度排查经验' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    const saved = save.mock.calls[0][0];
    expect(saved.knowledgeEntries).toEqual([expect.objectContaining({ title: '月度排查经验', summary: '月度经验摘要' })]);
    view.unmount();
    render(<MonthlyReviewEditor {...props} initialPayload={saved} onSaveDraft={save} onSubmit={vi.fn(async () => true)}/>);
    expect(screen.getByRole('button', { name: '月度排查经验' })).toBeInTheDocument();
  });

  it('shows month, department and default empty cards without table headers', () => {
    render(<MonthlyReviewEditor {...props} viewer={{ id: 'me', name: '本人', department: '产品部' }} onSaveDraft={vi.fn(async () => true)} onSubmit={vi.fn(async () => true)}/>);
    expect(screen.getByText('月报')).toBeInTheDocument();
    expect(screen.getByText('2026年第10月 月报-产品部')).toBeInTheDocument();
    expect(screen.queryByText('复盘本月目标、工作证据、问题建议与协助事项')).not.toBeInTheDocument();
    for (const text of ['暂无插播任务', '暂无需要协助事项', '暂无知识沉淀']) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '事项类型' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '分类' })).not.toBeInTheDocument();
  });
  it('shows department fallback and restored association tables only when populated', () => {
    render(<MonthlyReviewEditor {...props} initialPayload={initialPayload} onSaveDraft={vi.fn(async () => true)} onSubmit={vi.fn(async () => true)}/>);
    expect(screen.getByText('2026年第10月 月报-部门未设置')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '事项类型' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '分类' })).toBeInTheDocument();
    expect(screen.queryByText('暂无需要协助事项')).not.toBeInTheDocument();
    expect(screen.queryByText('暂无知识沉淀')).not.toBeInTheDocument();
  });

  it('keeps goal evidence in a weekly-style empty panel, then shows its table for saved links', () => {
    const objective: OKRItem = { id: 'mine', ownerId: 'me', ownerName: '本人', department: '产品部', cycle: '2026-10', category: 'my', objective: '月度目标', primaryLabel: 'KR', progress: 0, weight: 100, deadline: '2026-10-31', keyResults: [{ id: 'a', content: '我的动作', progress: 0, weight: 100, deadline: '2026-10-31' }] };
    const empty = render(<MonthlyReviewEditor {...props} okrs={[objective]} onSaveDraft={vi.fn(async () => true)} onSubmit={vi.fn(async () => true)}/>);
    fireEvent.click(screen.getByText('我的计划：我的动作'));
    expect(screen.getByText('(暂未关联本期工作证据)')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '来源归属' })).not.toBeInTheDocument();
    empty.unmount();
    const draft: OkrPayload = { title: '月报草稿', reviewType: 'month', startDate: '2026-10-01', endDate: '2026-10-31', krReviews: [{ objectiveId: 'mine', objectiveTitle: '月度目标', keyResultId: 'a', keyResultTitle: '我的动作', previousProgress: 0, currentProgress: 0, health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: ['task'] }], items: [{ workId: 'task', title: '实际任务', status: '进行中', sourceLabel: '产品线 / V1', result: '', impact: '' }] };
    render(<MonthlyReviewEditor {...props} okrs={[objective]} initialPayload={draft} onSaveDraft={vi.fn(async () => true)} onSubmit={vi.fn(async () => true)}/>);
    fireEvent.click(screen.getByText('我的计划：我的动作'));
    expect(screen.getByRole('columnheader', { name: '来源归属' })).toBeInTheDocument();
    expect(screen.getByText('实际任务')).toBeInTheDocument();
  });
  it('uses employee monthly reports for department support and saves the two department sections', () => {
    const people = [{ id: 'm', name: '主管', department: '产品部', supervisorId: 'boss', rootFlag: 0, version: 1 }, { id: 'e', name: '员工甲', department: '产品部', supervisorId: 'm', rootFlag: 0, version: 1 }];
    const objective: OKRItem = { id: 'department', ownerId: 'm', ownerName: '主管', department: '产品部', cycle: '2026-10', category: 'my', objective: '部门目标', progress: 0, weight: 100, deadline: '2026-10-31', keyResults: [{ id: 'kr', content: '部门KR', progress: 0, weight: 100, deadline: '2026-10-31' }] };
    const goal = { id: 'goal', ownerId: 'e', kind: 'objective' as const, status: 'active', periodKey: '2026-10', version: 1, payload: { title: '本人目标', sourceObjectiveId: 'department', sourceKrId: 'kr', keyResults: [{ id: 'kr', title: '承接', progress: 0, weight: 100, executionActions: [{ id: 'action', title: '个人动作甲', ownerId: 'e', progress: 0 }] }] } };
    const report = { id: 'monthly', ownerId: 'e', kind: 'review' as const, status: 'submitted', periodKey: '2026-10', version: 1, payload: { title: '员工月报', reviewType: 'month' as const, ...props.periodOverride, krReviews: [{ objectiveId: 'goal', objectiveTitle: '本人目标', keyResultId: 'action', keyResultTitle: '个人动作甲', previousProgress: 10, currentProgress: 60, executionHealth: '正常' as const, health: 'normal' as const, achievement: '', blocker: '', nextPlan: '', workIds: [] }] } };
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<MonthlyReviewEditor {...props} template="supervisor" currentUserId="m" viewer={{ id: 'm', name: '主管', department: '产品部' }} people={people} records={[goal, report, { ...report, id: 'weekly', payload: { ...report.payload, reviewType: 'week', krReviews: [{ ...report.payload.krReviews[0], currentProgress: 99 }] } }]} okrs={[objective]} onSaveDraft={save} onSubmit={vi.fn(async () => true)}/>);
    expect(screen.getByText('部门月报')).toBeInTheDocument();
    expect(screen.getByLabelText('月度概览')).toBeInTheDocument();
    expect(screen.getByText('3. 本月部门补充总结')).toBeInTheDocument();
    expect(screen.getByText('4. 部门反馈问题梳理与分析')).toBeInTheDocument();
    fireEvent.click(screen.getByText('KR1：部门KR'));
    expect(screen.getByRole('columnheader', { name: '员工甲' })).toBeInTheDocument();
    expect(screen.getByText('个人动作：个人动作甲 · 当前进度60%')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '本月部门补充总结' }), { target: { value: '部门总结' } });
    fireEvent.change(screen.getByRole('textbox', { name: '部门反馈问题梳理与分析' }), { target: { value: '部门问题分析' } });
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0]).toMatchObject({ reviewType: 'month', reviewMode: 'supervisor', summary: '部门总结', suggestions: '部门问题分析', krReviews: [{ currentProgress: 60, employeeReviewSnapshots: [{ id: 'monthly' }] }] });
  });
  it('removes the monthly summary input and keeps an existing summary only for history', () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<MonthlyReviewEditor {...props} initialPayload={{ title: '历史', summary: '旧总结' }} onSaveDraft={save} onSubmit={vi.fn(async () => true)}/>);
    expect(screen.queryByText('本月总结')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('总结本月核心成果、业务价值、关键变化与主要问题')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0].summary).toBe('旧总结');
  });
  it('matches weekly personal target structure and saves per-detail month progress without altering shared KR', () => {
    const objective: OKRItem = { id: 'mine', ownerId: 'me', ownerName: '本人', department: '产品部', cycle: '2026-10', category: 'my', objective: '承接目标', primaryLabel: 'KR', progress: 60, weight: 100, deadline: '2026-10-31', keyResults: [{ id: 'my-a', content: '我的动作', progress: 80, weight: 100, deadline: '2026-10-31', parentKeyResultProgress: 70, businessObject: '师创云平台', parentKeyResultDetails: [{ id: 'd1', name: 'V1.0.0', stage: '产品设计', plannedStartDate: '2026-10-13', plannedEndDate: '2026-10-16' }] }] };
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<MonthlyReviewEditor {...props} okrs={[objective]} onSaveDraft={save} onSubmit={vi.fn(async () => true)}/>);
    expect(screen.queryByText('本月总结')).not.toBeInTheDocument();
    expect(screen.queryByText('目标1：承接目标')).not.toBeInTheDocument();
    expect(screen.getByText('承接目标').parentElement).toHaveTextContent('70%');
    expect(screen.getByText('我的计划：我的动作')).toBeInTheDocument();
    fireEvent.click(screen.getByText('我的计划：我的动作'));
    expect(screen.getByLabelText('KR子表进度更新')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '我的动作风险原因及所需支持' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '我的动作风险原因及所需支持' }), { target: { value: '资源协调' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'V1.0.0 本期更新进度' }), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[0][0]).toMatchObject({ reviewMode: 'monthly', syncKrProgress: false, krReviews: [{ currentProgress: 45, blocker: '资源协调', detailProgress: [{ id: 'd1', previousProgress: 0, currentProgress: 45 }] }] });
  });

  it('shows the five sections, new metrics and restored associations; saves and reopens suggestions and knowledge', async () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const work: OkrWork[] = [{ id: 't', sourceId: 't', kind: 'task', title: '已关联任务', status: '处理中', assigneeId: 'me', actualHours: 4, estimatedHours: 0, createdAt: '', updatedAt: '', dueDate: '', linkVersion: 0, sourceWorkOrderIds: '[]', statusChanges: [{ status: '处理中', createdAt: '2026-10-01' }] }];
    const { unmount } = render(<MonthlyReviewEditor {...props} work={work} initialPayload={initialPayload} onSaveDraft={save} onSubmit={vi.fn(async () => true)}/>);
    for (const title of ['1. 本月目标复盘', '2. 插播任务', '3. 遇到的问题或者建议', '4. 需要协助事项', '5. 知识沉淀']) expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.queryByText('KR 达成')).not.toBeInTheDocument();
    expect(screen.queryByText('下个月安排')).not.toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByLabelText('月度概览')).getByText('4')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('textbox', { name: '遇到的问题或者建议' }), { target: { value: '新的问题\n新的建议' } });
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    const saved = save.mock.calls[0][0];
    expect(saved).toMatchObject({ reviewType: 'month', suggestions: '新的问题\n新的建议', knowledgeEntries: initialPayload.knowledgeEntries, assistance: initialPayload.assistance, monthlyMetrics: { taskCount: 1, collaborationCount: 0, totalHours: 4 }, nextMonthArrangement: '历史安排' });
    unmount();
    render(<MonthlyReviewEditor {...props} work={work} initialPayload={saved} onSaveDraft={save} onSubmit={vi.fn(async () => true)}/>);
    expect(screen.getByRole('textbox', { name: '遇到的问题或者建议' })).toHaveValue('新的问题\n新的建议');
    fireEvent.click(screen.getByRole('button', { name: '排查经验' }));
    expect(screen.getByText('经验正文')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭知识详情' }));
    fireEvent.click(screen.getByRole('button', { name: '删除知识沉淀排查经验' }));
    fireEvent.click(screen.getByRole('button', { name: /存草稿/ }));
    expect(save.mock.calls[1][0].knowledgeEntries).toEqual([]);
  });
  it('allows submitting a month without OKR and preserves the five-section payload', async () => {
    const submit = vi.fn(async (_payload: OkrPayload) => true);
    render(<MonthlyReviewEditor {...props} initialPayload={initialPayload} onSaveDraft={vi.fn(async () => true)} onSubmit={submit}/>);
    fireEvent.click(screen.getByRole('button', { name: '提交月报' }));
    const confirmation = screen.getByRole('dialog', { name: '提交月报确认' });
    expect(within(confirmation).getByText('确认提交 2026 年 10 月的个人月报吗？')).toBeInTheDocument();
    expect(within(confirmation).getByText(/本份月报不可直接修改/)).toBeInTheDocument();
    expect(screen.queryByText(/自动汇总/)).not.toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole('button', { name: '返回检查' }));
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '提交月报' }));
    fireEvent.click(screen.getByRole('button', { name: '确认提交' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ suggestions: '问题\n建议', knowledgeEntries: initialPayload.knowledgeEntries })));
  });

  it('shows submitted snapshots in the monthly layout even after goals and live work change', async () => {
    const onCopy = vi.fn();
    const saved: OkrPayload = { ...initialPayload, startDate: '2026-10-01', endDate: '2026-10-31',
      monthlyMetrics: { taskCount: 7, collaborationCount: 2, totalHours: 16 },
      krReviews: [{ objectiveId: 'removed', objectiveTitle: '原月度目标', keyResultId: 'removed-action', keyResultTitle: '已保存的个人计划', previousProgress: 0, currentProgress: 80,
        executionHealth: '超预期', health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: ['t'],
        detailRows: [{ id: 'detail', name: '原产品', version: 'V1.0', stage: '产品设计' }], detailProgress: [{ id: 'detail', previousProgress: 0, currentProgress: 80 }] }] };
    render(<MonthlyReviewEditor {...props} recordStatus="submitted" initialPayload={saved} work={[{ id: 't', title: '后续改名任务', actualHours: 99 } as OkrWork]}
      onCopy={onCopy} onSaveDraft={vi.fn(async () => true)} onSubmit={vi.fn(async () => true)}/>);
    expect(screen.getByText('我的计划：已保存的个人计划')).toBeInTheDocument();
    fireEvent.click(screen.getByText('我的计划：已保存的个人计划'));
    expect(screen.getByText('原产品')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue('80');
    expect(screen.getByRole('spinbutton')).toBeDisabled();
    expect(screen.queryByText('后续改名任务')).not.toBeInTheDocument();
    expect(screen.getAllByText('已关联任务').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText('16')).toBeInTheDocument());
    expect(screen.queryByText('月度目标已变化，请确认失效内容')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '提交月报' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '存草稿' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '删除操作' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '复制为本期' }));
    expect(onCopy).toHaveBeenCalledOnce();
  });
});
