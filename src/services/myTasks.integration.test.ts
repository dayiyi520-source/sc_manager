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

  it('returns an empty list without a viewer and preserves item detail routing', async () => {
    expect(await requirementRepository.myTasks()).toEqual([]);
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
      { id: 'detail-item', title: '事项详情', category: 'requirement' },
    ]));
    expect(await requirementRepository.detail('detail-item')).toMatchObject({ id: 'detail-item', title: '事项详情' });
    await expect(requirementRepository.detail('missing-item')).rejects.toThrow('事项不存在');
  });
});
