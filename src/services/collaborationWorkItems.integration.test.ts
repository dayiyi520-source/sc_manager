// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';

describe('协同事项关联任务卡片契约', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('评论以会话用户保存，刷新可读，重试不重复且不改变事项状态', async () => {
    const record = { id: 'comment-flow', category: 'requirement', workOrderType: '客户诉求', status: '已完成', ownerName: '原负责人', revision: 2, events: [] };
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([record]));
    const submit = (content = '讨论内容', requestId = 'request-1', revision = 2) => mockApiRequest('/api/requirements/comment-flow/comments', { method: 'POST', body: JSON.stringify({ content, requestId, revision, operatorName: '伪造作者' }) });
    await expect(submit()).rejects.toThrow('请登录');
    sessionStorage.setItem('shichuang.session', JSON.stringify({ user: { id: 'viewer-1', name: '讨论者' } }));
    await expect(submit('  ')).rejects.toThrow('1至1000字');
    await expect(submit('长'.repeat(1001))).rejects.toThrow('1至1000字');
    await expect(submit('讨论内容', 'request-1', 1)).rejects.toThrow('其他人更新');
    expect(await submit()).toMatchObject({ status: '已完成', ownerName: '原负责人', revision: 3, events: [expect.objectContaining({ eventType: '发表评论', operatorName: '讨论者', metadata: expect.objectContaining({ commentContent: '讨论内容' }) })] });
    await submit();
    const detail = await mockApiRequest('/api/requirements/comment-flow') as { events: unknown[]; revision: number };
    expect(detail.events).toHaveLength(1);
    expect(detail.revision).toBe(3);
    await expect(submit('不同正文')).rejects.toThrow('标识已使用');
    expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems')!)[0].events).toHaveLength(1);
  });

  it('必选有效星级才可完成，评分评价持久化且重复提交被阻止', async () => {
    const record = { id: 'rated-flow', category: 'requirement', workOrderType: '客户诉求', title: '验收评价', status: '待验收', creatorName: '创建人', ownerName: '处理人', revision: 2, events: [], workItems: [] };
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([record]));
    const submit = (rating?: number, revision = 2) => mockApiRequest('/api/requirements/rated-flow/acceptance-passed', { method: 'POST', body: JSON.stringify({ revision, rating, comment: '处理及时' }) });
    for (const score of [undefined, 0, 6, 1.5]) await expect(submit(score)).rejects.toThrow('1至5星');
    expect(await mockApiRequest('/api/requirements/rated-flow')).toMatchObject({ status: '待验收', revision: 2, events: [] });
    await expect(submit(5, 1)).rejects.toThrow('其他人更新');
    await submit(5);
    expect(await mockApiRequest('/api/requirements/rated-flow')).toMatchObject({ status: '已完成', revision: 3, events: [expect.objectContaining({ eventType: '验收通过', operatorName: '创建人', reason: '处理及时', metadata: expect.objectContaining({ rating: 5 }) })] });
    expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems')!)[0].events[0].metadata.rating).toBe(5);
    await expect(submit(5, 3)).rejects.toThrow('状态不允许');
  });

  it('事项退回后统一状态并持久化创建人责任，创建人可继续完成', async () => {
    const record = { id: 'returned-flow', category: 'requirement', workOrderType: '客户诉求', title: '退回验收', status: '待处理', creatorId: 'creator-id', creatorName: '创建人', ownerName: '原负责人', assigneeName: '原负责人', assigneeId: 'owner-id', revision: 2, events: [], workItems: [] };
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([record]));
    await mockApiRequest(`/api/requirements/${record.id}/transition`, { method: 'POST', body: JSON.stringify({ action: 'reject', reason: '资料不完整' }) });
    const detail = await mockApiRequest(`/api/requirements/${record.id}`) as typeof record;
    expect(detail).toMatchObject({ status: '已退回', ownerName: '创建人', assigneeName: '创建人', assigneeId: 'creator-id', revision: 3 });
    expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems')!)[0]).toMatchObject({ status: '已退回', ownerName: '创建人', assigneeId: 'creator-id' });
    expect(detail.events).toEqual([expect.objectContaining({ eventType: '退回', operatorName: '原负责人', metadata: { ownerChanged: true, fromAssigneeName: '原负责人', assigneeName: '创建人' } })]);
    const page = await mockApiRequest('/api/requirements?status=已退回') as { items: typeof record[] };
    expect(page.items.map(item => item.id)).toContain(record.id);
    await expect(mockApiRequest(`/api/requirements/${record.id}/transition`, { method: 'POST', body: JSON.stringify({ action: 'reject', reason: '再次退回' }) })).rejects.toThrow('仅待处理');
    await mockApiRequest(`/api/requirements/${record.id}/complete`, { method: 'POST', body: JSON.stringify({ revision: 3, note: '创建人处理完成' }) });
    expect(await mockApiRequest(`/api/requirements/${record.id}`)).toMatchObject({ status: '待验收', ownerName: '创建人', revision: 4 });
  });

  it('历史已驳回事项兼容为已退回并恢复创建人责任，不改变其他任务', async () => {
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([
      { id: 'legacy-return', category: 'requirement', workOrderType: '客户诉求', status: '已驳回', creatorId: 'creator-id', creatorName: '创建人', ownerName: '原负责人', assigneeId: 'old-id', events: [] },
      { id: 'other-design', category: 'design', status: '已驳回', ownerName: '设计负责人' },
    ]));
    expect(await mockApiRequest('/api/requirements/legacy-return')).toMatchObject({ status: '已退回', ownerName: '创建人', assigneeId: 'creator-id' });
    expect(await mockApiRequest('/api/requirements/other-design')).toMatchObject({ status: '已驳回', ownerName: '设计负责人' });
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

describe('事项重新开启持久化', () => {
  it('保存待处理状态、负责人和历程，重新读取保持一致，重复重开被拒绝', async () => {
    localStorage.clear();
    const page = await mockApiRequest('/api/requirements?page=1&pageSize=100') as { items: Array<any> };
    const record = page.items[0];
    const items = JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems') || JSON.stringify(page.items));
    items.find((item: any) => item.id === record.id).status = '已完成';
    localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify(items));
    const members = await mockApiRequest('/api/team-members') as Array<any>;
    const owner = members.find((item) => item.status === 'enabled');
    const payload = { assigneeId: owner.id, revision: record.revision ?? record.version ?? 0, reason: '补充客户诉求' };
    await expect(mockApiRequest(`/api/requirements/${record.id}/reopen`, { method: 'POST', body: JSON.stringify({ ...payload, revision: -1 }) })).rejects.toThrow('更新');
    const result = await mockApiRequest(`/api/requirements/${record.id}/reopen`, { method: 'POST', body: JSON.stringify(payload) }) as any;
    const detail = await mockApiRequest(`/api/requirements/${record.id}`) as any;
    expect(detail).toMatchObject({ status: '待处理', ownerName: owner.name, assigneeId: owner.id, progress: 0, revision: payload.revision + 1 });
    expect(detail.events.at(-1)).toMatchObject({ eventType: '事项重开', reason: payload.reason });
    await expect(mockApiRequest(`/api/requirements/${record.id}/reopen`, { method: 'POST', body: JSON.stringify({ ...payload, revision: result.revision }) })).rejects.toThrow('仅已完成');
  });
});
