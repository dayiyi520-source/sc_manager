// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

describe('协同事项关联任务卡片契约', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('创建多个任务后在事项详情持久化多张卡片，并同步任务状态', async () => {
    const page = await mockApiRequest('/api/requirements?page=1&pageSize=1') as { items: Array<{ id: string }> };
    const requirementId = page.items[0].id;
    const created = await mockApiRequest(`/api/requirements/${requirementId}/work-items/batch`, {
      method: 'POST',
      body: JSON.stringify({ tasks: [
        { taskType: '设计任务', assigneeName: '林志豪' },
        { taskType: '研发任务', assigneeName: '毛景强' },
      ] }),
    }) as { items: Array<{ id: string; title: string; taskType: string; assigneeName: string; status: string }> };

    expect(created.items).toHaveLength(2);
    let detail = await mockApiRequest(`/api/requirements/${requirementId}`) as { workItems: Array<Record<string, string>> };
    expect(detail.workItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ taskType: '设计任务', assigneeName: '林志豪', status: '待处理' }),
      expect.objectContaining({ taskType: '研发任务', assigneeName: '毛景强', status: '待处理' }),
    ]));

    await mockApiRequest(`/api/requirements/${requirementId}/work-items/${created.items[0].id}/status`, { method: 'PATCH', body: JSON.stringify({ status: '已完成' }) });
    detail = await mockApiRequest(`/api/requirements/${requirementId}`) as { workItems: Array<Record<string, string>> };
    expect(detail.workItems.find((item) => item.id === created.items[0].id)?.status).toBe('已完成');
  });
});
