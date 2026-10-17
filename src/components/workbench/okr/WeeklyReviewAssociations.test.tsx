// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WeeklyReviewEditor } from './WeeklyReviewEditor';
import type { OkrPayload } from '../../../services/okrRepository';

vi.mock('../RequirementPoolView', () => ({ RequirementPoolView: ({ creationType, onCreated, onCancelCreation }: any) => <div>
  <span>创建类型：{creationType}</span>
  <button onClick={onCancelCreation}>取消创建</button>
  <button onClick={() => onCreated({ id: 'matter-1', title: '修复线上故障', workOrderType: creationType, ownerName: '张三', status: '待处理' })}>保存事项</button>
</div> }));
class Observer { observe() {} unobserve() {} disconnect() {} }
globalThis.IntersectionObserver = Observer as unknown as typeof IntersectionObserver;
const props = { okrs: [], work: [], busy: false, workLoading: false, onRefreshWork: vi.fn(), onSaveDraft: vi.fn(async () => true), onSubmit: vi.fn(async () => true), onCancel: vi.fn() };

describe('weekly review associations', () => {
  it('keeps submitted goals and evidence as saved and exposes only copy and cancel actions', () => {
    const onCopy = vi.fn();
    const payload: OkrPayload = { title: '历史周报', reviewType: 'week', startDate: '2026-09-14', endDate: '2026-09-20', nextWeekPlan: '已存计划',
      krReviews: [{ objectiveId: 'removed', objectiveTitle: '原目标', keyResultId: 'a', keyResultTitle: '原个人计划', previousProgress: 0, currentProgress: 40, executionHealth: '正常', health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: ['work'] }],
      items: [{ workId: 'work', title: '保存时的工作证据', status: '已完成', actualHours: 8, result: '', impact: '' }] };
    render(<WeeklyReviewEditor {...props} recordStatus="submitted" initialPayload={payload} periodOverride={{ startDate: '2026-09-14', endDate: '2026-09-20' }}
      work={[{ id: 'work', title: '后续改名', status: '已完成', actualHours: 99 } as any]} onCopy={onCopy}/>);
    expect(screen.getByText('原目标')).toBeInTheDocument();
    expect(screen.getByText('我的计划：原个人计划')).toBeInTheDocument();
    expect(screen.getByText('保存时的工作证据')).toBeInTheDocument();
    expect(screen.queryByText('后续改名')).not.toBeInTheDocument();
    expect(screen.queryByText('月度目标已变化，请确认失效内容')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '下周计划' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: '关联工作证据' }).every(button => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.queryByRole('button', { name: '存草稿' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '提交周报' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '移除关联工作' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '复制为本期' }));
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('adds knowledge, saves its full content, reopens it and saves removal', async () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    const view = render(<WeeklyReviewEditor {...props} onSaveDraft={save}/>);
    fireEvent.click(screen.getByRole('button', { name: '新建知识沉淀' }));
    fireEvent.click(screen.getByRole('button', { name: '确认添加' }));
    expect(await screen.findByText('请输入标题')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '标题' }), { target: { value: '故障排查经验' } });
    fireEvent.change(screen.getByRole('textbox', { name: '场景与痛点' }), { target: { value: '排查摘要' } });
    fireEvent.change(screen.getByRole('textbox', { name: '执行动作与复盘结论' }), { target: { value: '先检查告警，再定位日志。' } });
    fireEvent.change(screen.getByRole('textbox', { name: '关联资料链接' }), { target: { value: 'https://example.com/doc' } });
    fireEvent.click(screen.getByRole('button', { name: '确认添加' }));
    await screen.findByRole('button', { name: '故障排查经验' });
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    const saved = save.mock.calls[0][0];
    expect(saved.knowledgeEntries).toEqual([expect.objectContaining({ title: '故障排查经验', linkUrl: 'https://example.com/doc', scenarioAndPain: '排查摘要', actionsAndConclusion: '先检查告警，再定位日志。' })]);
    view.unmount();
    render(<WeeklyReviewEditor {...props} initialPayload={saved} onSaveDraft={save}/>);
    fireEvent.click(screen.getByRole('button', { name: '故障排查经验' }));
    expect(screen.getAllByText('先检查告警，再定位日志。').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '关闭知识详情' }));
    fireEvent.click(screen.getByRole('button', { name: '删除知识沉淀故障排查经验' }));
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0].knowledgeEntries).toEqual([]);
  });

  it('restores task snapshots without showing unsubmitted hours while removing only the association', async () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<WeeklyReviewEditor {...props} onSaveDraft={save} initialPayload={{ title: '复盘', extraWork: { workIds: ['task-1'], description: '', impact: 'block' }, items: [{ workId: 'task-1', title: '已关联任务', status: '进行中', sourceLabel: '平台产品 / V2', actualHours: 0, result: '', impact: '' }] }}/>);
    expect(screen.getByText('已关联任务')).toBeInTheDocument();
    expect(screen.getByText('平台产品 / V2')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('对本月目标的影响')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '移除额外工作' }));
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].extraWork).toMatchObject({ workIds: [], impact: 'none' });
    expect(save.mock.calls[0][0].items).toEqual([]);
  });

  it('opens the selected collaboration form, cancels or associates the created item and removes its link', async () => {
    const save = vi.fn(async (_payload: OkrPayload) => true);
    render(<WeeklyReviewEditor {...props} onSaveDraft={save}/>);
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '线上问题' }));
    expect(screen.getByText('创建类型：线上问题')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '取消创建' }));
    expect(screen.queryByText('修复线上故障')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '发起协同' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '线上问题' }));
    fireEvent.click(screen.getByRole('button', { name: '保存事项' }));
    const section = screen.getByRole('region', { name: '需要协助事项' });
    expect(within(section).getByText('修复线上故障')).toBeInTheDocument();
    expect(within(section).getByText('张三')).toBeInTheDocument();
    expect(within(section).getByText('待处理')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }));
    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0].assistance).toEqual([expect.objectContaining({ workId: 'matter-1', subject: '修复线上故障', assistanceType: '线上问题', expectedAssignee: '张三', status: '待处理' })]);
    fireEvent.click(screen.getByRole('button', { name: '移除协同事项修复线上故障' }));
    fireEvent.click(screen.getByRole('button', { name: '存草稿' }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1][0].assistance).toEqual([]);
  });
});
