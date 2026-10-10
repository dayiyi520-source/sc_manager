// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { productRepository } from './productRepository';
import { mockApiRequest } from './mockApi';

let lineId = '';
const create = async (category = 'requirement') => {
  const products = await mockApiRequest('/api/product-lines');
  lineId = products[0].id;
  const types = await productRepository.workItemTypes(lineId);
  const label = ({ requirement: '需求', design: '设计', dev: '研发', test: '测试', bug: '缺陷' } as Record<string, string>)[category];
  const type = types.find((item) => item.enabled && item.category === label)!;
  return mockApiRequest('/api/work-items', { method: 'POST', body: JSON.stringify({ category, productLineId: lineId, taskTypeId: type.id, title: '复盘验收任务' }) });
};
const review = { title: '迭代经验', content: '改进点', contentHtml: '<p><strong>改进点</strong><img src="data:image/png;base64,YQ=="></p>', media: [{ id: 'attachment-1', name: '证据.txt', type: 'file' as const, dataUrl: 'data:text/plain;base64,YQ==' }], revision: 0 };

describe('任务复盘与归档本地持久化', () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it.each(['requirement', 'design', 'dev', 'test'])('%s 保存后重新读取保留富文本图片和附件，禁止旧版本覆盖', async (category) => {
    const item = await create(category);
    expect(await productRepository.workItemReview(lineId, item.id)).toBeNull();
    const saved = await productRepository.saveWorkItemReview(lineId, item.id, review);
    expect(saved).toMatchObject({ ...review, revision: 1 });
    expect(await productRepository.workItemReview(lineId, item.id)).toEqual(saved);
    await expect(productRepository.saveWorkItemReview(lineId, item.id, review)).rejects.toThrow('已被更新');
    const activities = await productRepository.workItemActivities(lineId, item.id);
    expect(activities.at(-1)).toMatchObject({ eventType: 'WORK_ITEM_REVIEWED', content: { review: saved } });
  });
  it('拒绝跨产品、空标题、不安全附件与缺陷复盘', async () => {
    const item = await create();
    await expect(productRepository.saveWorkItemReview('other-line', item.id, review)).rejects.toThrow('不存在');
    await expect(productRepository.saveWorkItemReview(lineId, item.id, { ...review, title: ' ' })).rejects.toThrow('标题');
    await expect(productRepository.saveWorkItemReview(lineId, item.id, { ...review, media: [{ ...review.media[0], dataUrl: 'javascript:alert(1)' }] })).rejects.toThrow('附件');
    const bug = await create('bug');
    await expect(productRepository.saveWorkItemReview(lineId, bug.id, review)).rejects.toThrow('不支持');
  });
  it.each(['requirement', 'design', 'dev', 'test', 'bug'])('%s 归档后列表移除、产品隔离，恢复后重新显示', async (category) => {
    const item = await create(category);
    await productRepository.deleteWorkItem(lineId, item.id, item.revision);
    await productRepository.deleteWorkItem(lineId, item.id, item.revision);
    const list = await productRepository.workItems(lineId, category);
    expect(list.page.items.find((task) => task.id === item.id)).toBeUndefined();
    expect(await productRepository.workItemDetail(lineId, item.id)).toBeNull();
    const archived = await productRepository.recycleBin(lineId);
    expect(archived).toEqual([expect.objectContaining({ id: item.id, title: item.title, revision: item.revision + 1 })]);
    expect(await productRepository.recycleBin('other-line')).toEqual([]);
    await expect(productRepository.saveWorkItemReview(lineId, item.id, review)).rejects.toThrow('已归档');
    await productRepository.restoreRecycleBinItem(lineId, item.id, archived[0].revision);
    expect((await productRepository.workItems(lineId, category)).page.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: item.id })]));
  });
  it('归档拒绝旧版本和跨产品；批量验证失败不产生部分归档', async () => {
    const one = await create();
    const two = await create();
    await expect(productRepository.deleteWorkItem('other-line', one.id, one.revision)).rejects.toThrow('不存在');
    await expect(productRepository.deleteWorkItem(lineId, one.id, one.revision + 1)).rejects.toThrow('已更新');
    await expect(productRepository.batchWorkItems({ operation: 'delete', targets: [{ id: one.id, productLineId: lineId, revision: one.revision }, { id: two.id, productLineId: lineId, revision: two.revision + 1 }] })).rejects.toThrow('已更新');
    expect(await productRepository.recycleBin(lineId)).toEqual([]);
  });
  it('恢复保留复盘，彻底删除后不可恢复', async () => {
    const item = await create();
    const saved = await productRepository.saveWorkItemReview(lineId, item.id, review);
    await productRepository.deleteWorkItem(lineId, item.id, item.revision);
    await productRepository.restoreRecycleBinItem(lineId, item.id, item.revision + 1);
    expect(await productRepository.workItemReview(lineId, item.id)).toEqual(saved);
    await productRepository.deleteWorkItem(lineId, item.id, item.revision + 2);
    await productRepository.purgeRecycleBinItem(lineId, item.id, item.revision + 3);
    expect(await productRepository.recycleBin(lineId)).toEqual([]);
    await expect(productRepository.restoreRecycleBinItem(lineId, item.id, item.revision + 3)).rejects.toThrow('不存在');
  });
});
