// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { requirementRepository } from './requirementRepository';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe('my tasks routing', () => {
  it('loads only unfinished tasks belonging to the selected member', async () => {
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
      { id: 'mine', title: '我的研发任务', category: 'dev', assigneeId: 'user-admin', status: '处理中' },
      { id: 'finished', title: '已完成任务', category: 'dev', assigneeId: 'user-admin', status: '已完成' },
      { id: 'cancelled', title: '已取消任务', category: 'dev', assigneeId: 'user-admin', status: '已取消' },
      { id: 'other', title: '其他成员任务', category: 'dev', assigneeId: 'other-user', status: '处理中' },
    ]));

    const tasks = await requirementRepository.myTasks('user-admin');
    expect(tasks.filter((task) => task.taskGroup === 'mine')).toEqual([
      expect.objectContaining({ sourceId: 'mine', title: '我的研发任务', targetPage: 'prod_rd_tasks' }),
    ]);
    expect(await requirementRepository.myTasks('unknown-user')).toEqual([]);
  });

  it('完整待办包含已完成和已取消，但不包含其他用户或删除记录', async () => {
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
      { id: 'pending', title: '处理中', category: 'dev', assigneeId: 'user-admin', status: '处理中' },
      { id: 'done', title: '已完成', category: 'dev', assigneeId: 'user-admin', status: '已完成' },
      { id: 'cancel', title: '已取消', category: 'dev', assigneeId: 'user-admin', status: '已取消' },
      { id: 'other', title: '他人任务', category: 'dev', assigneeId: 'other', status: '已完成' },
      { id: 'deleted', title: '已删除', category: 'dev', assigneeId: 'user-admin', deleted: true, status: '已完成' },
      { id: 'unassigned', title: '未分配', category: 'dev', assigneeId: '', ownerName: '', status: '已完成' },
    ]));
    expect((await requirementRepository.myTasks('user-admin', true)).filter(row => row.taskGroup === 'mine').map(row => row.sourceId)).toEqual(['pending', 'done', 'cancel']);
    expect((await requirementRepository.myTasks('user-admin')).filter(row => row.taskGroup === 'mine').map(row => row.sourceId)).toEqual(['pending']);
    expect(await requirementRepository.myTasks(undefined, true)).toEqual([]);
    expect(await requirementRepository.myTasks('unknown-user', true)).toEqual([]);
  });

  it('returns an empty list without a viewer and preserves item detail routing', async () => {
    expect(await requirementRepository.myTasks()).toEqual([]);
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
      { id: 'detail-item', title: '事项详情', category: 'requirement' },
    ]));
    expect(await requirementRepository.detail('detail-item')).toMatchObject({ id: 'detail-item', title: '事项详情' });
    await expect(requirementRepository.detail('missing-item')).rejects.toThrow('事项不存在');
  });
  it('跨天任务进度保存到原工作项，重新查询仍保留，且不改变状态', async () => {
    sessionStorage.setItem('shichuang.session', JSON.stringify({ user: { id: 'me', name: '本人' } }));
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
      { id: 'multi', title: '跨天工作', category: 'dev', assigneeId: 'me', status: '处理中', progress: 20, revision: 3, plannedStartDate: '2026-10-19', plannedEndDate: '2026-10-23' },
    ]));
    expect(await requirementRepository.updateWorkItemProgress('multi', 55, 3)).toMatchObject({ progress: 55, revision: 4 });
    expect((await requirementRepository.myTasks('me', true)).find(row => row.sourceId === 'multi')).toMatchObject({ progress: 55, revision: 4, status: '处理中' });
    expect(await requirementRepository.detail('multi')).toMatchObject({ progress: 55, revision: 4, status: '处理中' });
    expect(await requirementRepository.updateWorkItemProgress('multi', 55, 4)).toMatchObject({ progress: 55, revision: 4 });
    await expect(requirementRepository.updateWorkItemProgress('multi', 60, 3)).rejects.toThrow('更新');
  });
  it('拒绝越界进度、他人事项、已结束事项及失效记录', async () => {
    sessionStorage.setItem('shichuang.session', JSON.stringify({ user: { id: 'me', name: '本人' } }));
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
      { id: 'mine', title: '本人', category: 'dev', assigneeId: 'me', status: '处理中' },
      { id: 'done', title: '完成', category: 'dev', assigneeId: 'me', status: '已完成' },
      { id: 'other', title: '他人', category: 'dev', assigneeId: 'other', status: '处理中' },
      { id: 'removed', title: '删除', category: 'dev', assigneeId: 'me', status: '处理中', deleted: true },
    ]));
    for (const progress of [-1, 101, 1.5]) await expect(requirementRepository.updateWorkItemProgress('mine', progress, 0)).rejects.toThrow('0 至 100');
    await expect(requirementRepository.updateWorkItemProgress('other', 50, 0)).rejects.toThrow('本人');
    await expect(requirementRepository.updateWorkItemProgress('done', 50, 0)).rejects.toThrow('已结束');
    await expect(requirementRepository.updateWorkItemProgress('removed', 50, 0)).rejects.toThrow('删除');
    expect((await requirementRepository.myTasks('me', true)).find(row => row.sourceId === 'done')?.progress).toBe(100);
  });

});
