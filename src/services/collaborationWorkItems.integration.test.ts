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

  it('事项完成后在全历程保存富文本和附件信息', async () => {
    const page = await mockApiRequest('/api/requirements?page=1&pageSize=1') as { items: Array<{ id: string }> };
    const requirementId = page.items[0].id;
    const staged = await mockApiRequest('/api/attachments/stage', {
      method: 'POST',
      body: JSON.stringify({ name: '完成截图.png', mimeType: 'image/png', size: 12, dataUrl: 'data:image/png;base64,abc' }),
    }) as { id: string };
    const before = await mockApiRequest(`/api/requirements/${requirementId}`) as { revision?: number; version?: number; status?: string };
    if (before.status !== '处理中') {
      await mockApiRequest(`/api/requirements/${requirementId}/transition`, { method: 'POST', body: JSON.stringify({ status: '处理中', reason: '开始处理' }) });
    }
    const processing = await mockApiRequest(`/api/requirements/${requirementId}`) as { revision?: number; version?: number };

    await mockApiRequest(`/api/requirements/${requirementId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ revision: processing.revision ?? processing.version ?? 0, note: '完成说明', noteHtml: '<p><strong>完成说明</strong></p>', attachmentIds: [staged.id] }),
    });

    const detail = await mockApiRequest(`/api/requirements/${requirementId}`) as { ownerName?: string; creatorName?: string; assigneeId?: string; creatorId?: string; events: Array<{ eventType: string; reason: string; metadata?: { noteHtml?: string; attachments?: Array<{ name: string }>; ownerChanged?: boolean; fromAssigneeName?: string; assigneeName?: string } }> };
    const event = detail.events.find((item) => item.eventType === '事项完成');
    expect(event).toMatchObject({ reason: '完成说明', metadata: { noteHtml: '<p><strong>完成说明</strong></p>', attachments: [{ name: '完成截图.png' }] } });
    expect(detail.ownerName).toBe(detail.creatorName);
    expect(detail.assigneeId).toBe(detail.creatorId);
    expect(event?.metadata).toMatchObject({ ownerChanged: true, fromAssigneeName: expect.any(String), assigneeName: detail.creatorName });
  });

  it('验收通过和不通过都立即写入详情，未通过时退回所选任务负责人', async () => {
    const page = await mockApiRequest('/api/requirements?page=1&pageSize=1') as { items: Array<{ id: string }> };
    const requirementId = page.items[0].id;
    const created = await mockApiRequest(`/api/requirements/${requirementId}/work-items/batch`, {
      method: 'POST',
      body: JSON.stringify({ tasks: [{ taskType: '研发任务', assigneeName: '毛景强' }] }),
    }) as { items: Array<{ id: string }> };
    const taskId = created.items[0].id;
    let detail = await mockApiRequest(`/api/requirements/${requirementId}`) as { revision?: number; version?: number; status?: string; workItems: Array<{ id: string; status?: string; assigneeName?: string }>; events?: Array<{ eventType: string }> };
    if (detail.status !== '处理中') {
      await mockApiRequest(`/api/requirements/${requirementId}/transition`, { method: 'POST', body: JSON.stringify({ status: '处理中', reason: '开始处理' }) });
      detail = await mockApiRequest(`/api/requirements/${requirementId}`) as typeof detail;
    }
    await mockApiRequest(`/api/requirements/${requirementId}/work-items/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status: '已完成' }) });
    detail = await mockApiRequest(`/api/requirements/${requirementId}`) as typeof detail;
    await mockApiRequest(`/api/requirements/${requirementId}/complete`, { method: 'POST', body: JSON.stringify({ revision: detail.revision ?? detail.version ?? 0, note: '请验收' }) });
    detail = await mockApiRequest(`/api/requirements/${requirementId}`) as typeof detail;
    expect(detail.status).toBe('待验收');

    await mockApiRequest(`/api/requirements/${requirementId}/acceptance-failed`, {
      method: 'POST',
      body: JSON.stringify({ revision: detail.revision ?? detail.version ?? 0, workItemId: taskId, taskOwnerId: '', reason: '需要补充' }),
    });
    detail = await mockApiRequest(`/api/requirements/${requirementId}`) as typeof detail;
    expect(detail.status).toBe('处理中');
    expect(detail.workItems.find((item) => item.id === taskId)).toEqual(expect.objectContaining({ status: '处理中', assigneeName: '毛景强' }));
    expect(detail.events.at(-1)).toMatchObject({ eventType: '验收未通过' });
  });
});

it('持久化产品任务和反向关联设计任务后，事项聚合卡片可读取并同步状态', async () => {
  localStorage.clear();
  const { loadCollaborationRelatedTasks } = await import('./collaborationRelatedTasks');
  const { productRepository } = await import('./productRepository');
  const requirements = await mockApiRequest('/api/requirements?page=1&pageSize=1') as { items: Array<{ id: string }> };
  const products = await mockApiRequest('/api/product-lines') as Array<{ id: string; workItemTypes: Array<{ id: string; category: string; enabled: boolean }> }>;
  const product = products[0];
  product.workItemTypes = await productRepository.workItemTypes(product.id);
  const requirementId = requirements.items[0].id;
  const create = async (category: 'requirement' | 'design', title: string, extras: Record<string, unknown>) => mockApiRequest('/api/work-items', {
    method: 'POST', body: JSON.stringify({ requestId: title, productLineId: product.id, category, taskTypeId: product.workItemTypes.find((type) => type.category === (category === 'requirement' ? '需求' : '设计') && type.enabled)!.id, title, ...extras }),
  }) as Promise<{ id: string }>;
  const upstream = await create('requirement', '来源产品任务', { requirementId, sourceType: 'WORK_ORDER', sourceWorkOrderIds: [requirementId] });
  const downstream = await create('design', '反向关联设计任务', { relatedTaskIds: [upstream.id] });
  let result = await loadCollaborationRelatedTasks(requirementId, [], [product.id]);
  expect(result.items.map((item) => item.id)).toEqual(expect.arrayContaining([upstream.id, downstream.id]));
  expect(result.indirectIds.has(downstream.id)).toBe(true);
  await mockApiRequest(`/api/work-items/${downstream.id}?productLineId=${product.id}`, { method: 'PUT', body: JSON.stringify({ status: '已完成', revision: 0 }) });
  result = await loadCollaborationRelatedTasks(requirementId, [], [product.id]);
  expect(result.items.find((item) => item.id === downstream.id)?.status).toBe('已完成');
});
