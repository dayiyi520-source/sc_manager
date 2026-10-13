// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MonthlyReviewEditor } from './MonthlyReviewEditor';
import type { OkrPayload, OkrWork } from '../../../services/okrRepository';

const props = { okrs: [], records: [], currentUserId: 'me', viewer: { id: 'me', name: '本人' }, busy: false, onCancel: vi.fn(), periodOverride: { startDate: '2026-10-01', endDate: '2026-10-31' } };
const initialPayload: OkrPayload = { title: '月报', suggestions: '问题\n建议', otherNotes: '历史补充', nextMonthArrangement: '历史安排',
  extraWork: { workIds: ['t'], description: '', impact: 'none' }, items: [{ workId: 't', title: '已关联任务', status: '处理中', result: '', impact: '', sourceLabel: '产品甲', actualHours: 4 }],
  assistance: [{ workId: 'c', subject: '协调资源', assistanceType: '售前支持', expectedAssignee: '同事', status: '处理中', result: '协同内容' }],
  knowledgeEntries: [{ id: 'k', title: '排查经验', category: '产研规范', content: '经验正文' }] };

describe('personal monthly editor', () => {
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
    fireEvent.click(screen.getByRole('button', { name: '确认提交' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ suggestions: '问题\n建议', knowledgeEntries: initialPayload.knowledgeEntries })));
  });
});
