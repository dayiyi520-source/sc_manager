// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mockApiRequest } from './mockApi';
import { MOCK_USERS } from '../data/mockSnapshot';
const creator = MOCK_USERS.find(user => user.role === 'admin')!;
const processor = MOCK_USERS.find(user => user.id !== creator.id)!;
const linked = { id: 'linked', code: 'TASK-1', title: '反馈任务', category: 'dev', status: '已完成', ownerName: '任务负责人', assigneeId: 'task-owner', sourceWorkOrderIds: ['matter'], relatedTaskIds: [] };
const direct = { id: 'linked', taskId: 'linked', title: '反馈任务', taskType: '研发任务', status: '已完成', assigneeName: '任务负责人' };
const matter = (status = '待验收') => ({ id: 'matter', code: 'MATTER-1', category: 'requirement', workOrderType: '其他问题', specialFields: { problemType: '其他' }, title: '协同事项', description: '原事项描述', expectedCompleteDate: '2026-10-20', creatorId: creator.id, creatorName: creator.name, assigneeId: creator.id, ownerName: creator.name, status, revision: 2, events: [{ id: 'completed', eventType: '事项完成', fromStatus: '处理中', toStatus: '待验收', operatorName: processor.name, createdAt: '2026-10-12', metadata: { processingAssigneeId: processor.id, processingAssigneeName: processor.name } }], workItems: [direct], media: [] });
const seed = (status = '待验收') => localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([matter(status), linked]));
const post = (route: string, body: Record<string, unknown>) => mockApiRequest('/api/requirements/matter/' + route, { method: 'POST', body: JSON.stringify(body) });
const detail = () => mockApiRequest('/api/requirements/matter');
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem('shichuang.session', JSON.stringify({ user: creator })); seed(); });
it('uses the last matter processor and stores task feedback without changing any task state or assignee', async () => {
  const before = JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems')!);
  await post('acceptance-failed', { revision: 2, reason: '接口结果不符合要求', workItemId: 'linked', taskOwnerId: processor.id });
  const result = await detail();
  expect(result).toMatchObject({ status: '处理中', assigneeId: processor.id, ownerName: processor.name, revision: 3 });
  expect(result.workItems).toEqual(before[0].workItems);
  expect(JSON.parse(localStorage.getItem('shichuang.frontend.mock.workItems')!)[1]).toEqual(before[1]);
  expect(result.events.at(-1)).toMatchObject({ eventType: '验收未通过', reason: '接口结果不符合要求', metadata: { taskTitle: '反馈任务', taskCode: 'TASK-1', workItemId: 'linked' } });
});
it('supports whole-matter feedback without a selected task', async () => {
  await post('acceptance-failed', { revision: 2, reason: '整体内容需补充', taskOwnerId: processor.id });
  expect((await detail()).status).toBe('处理中');
  expect((await detail()).events.at(-1).metadata.workItemId).toBeUndefined();
});
it('rejects invalid feedback and stale submissions without partial writes', async () => {
  const before = localStorage.getItem('shichuang.frontend.mock.workItems');
  await expect(post('acceptance-failed', { revision: 2, reason: ' ' })).rejects.toThrow('原因');
  await expect(post('acceptance-failed', { revision: 1, reason: '反馈' })).rejects.toThrow('更新');
  await expect(post('acceptance-failed', { revision: 2, reason: '反馈', workItemId: 'other' })).rejects.toThrow('不属于');
  await expect(post('acceptance-failed', { revision: 2, reason: '反馈', taskOwnerId: creator.id })).rejects.toThrow('上一次');
  expect(localStorage.getItem('shichuang.frontend.mock.workItems')).toBe(before);
});
it('allows an explicitly selected active owner only when history cannot identify the original processor', async () => {
  const data = matter(); data.events = [];
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([data, linked]));
  await expect(post('acceptance-failed', { revision: 2, reason: '反馈' })).rejects.toThrow('无法识别');
  await post('acceptance-failed', { revision: 2, reason: '反馈', taskOwnerId: processor.id });
  expect((await detail()).assigneeId).toBe(processor.id);
});
it('closes a returned matter independently of tasks and records creator closure', async () => {
  seed('已退回');
  await post('transition', { action: 'close', revision: 2 });
  const result = await detail();
  expect(result).toMatchObject({ id: 'matter', code: 'MATTER-1', status: '已完成', revision: 3 });
  expect(result.workItems).toEqual([direct]);
  expect(result.events.at(-1)).toMatchObject({ eventType: '事项关闭', metadata: { completionType: 'CREATOR_CLOSED' } });
  await expect(post('transition', { action: 'close', revision: 3 })).rejects.toThrow('已退回');
});
it('atomically edits and resubmits a returned matter without recreating it or altering task relations', async () => {
  seed('已退回');
  await post('reopen', { assigneeId: processor.id, revision: 2, changes: { title: '修改后的事项', description: '修改后描述', id: 'fake', creatorName: 'fake', workItems: [], status: '已完成' } });
  const result = await detail();
  expect(result).toMatchObject({ id: 'matter', code: 'MATTER-1', title: '修改后的事项', description: '修改后描述', creatorName: creator.name, status: '待处理', assigneeId: processor.id, revision: 3 });
  expect(result.workItems).toEqual([direct]);
  expect(result.events.at(-1).eventType).toBe('重新发起');
});
it('requires an independent reason for reopening and preserves existing history and attachments', async () => {
  seed('已完成');
  await expect(post('reopen', { assigneeId: processor.id, revision: 2, changes: { title: '调整内容' } })).rejects.toThrow('重新开启原因');
  await post('reopen', { assigneeId: processor.id, revision: 2, reason: '  补充资料  ', changes: { title: '调整内容', media: [{ id: 'file', name: '资料.pdf', type: 'file', dataUrl: 'data:application/pdf;base64,YQ==' }] } });
  const result = await detail();
  expect(result).toMatchObject({ status: '待处理', progress: 0, title: '调整内容', media: [{ id: 'file', name: '资料.pdf' }] });
  expect(result.events).toHaveLength(2);
  expect(result.events.at(-1)).toMatchObject({ eventType: '事项重开', reason: '补充资料' });
});
it('enforces creator identity and valid business state for close and resubmit', async () => {
  seed('已退回'); sessionStorage.setItem('shichuang.session', JSON.stringify({ user: processor }));
  await expect(post('transition', { action: 'close', revision: 2 })).rejects.toThrow('创建人');
  await expect(post('reopen', { assigneeId: processor.id, revision: 2 })).rejects.toThrow('创建人');
  sessionStorage.setItem('shichuang.session', JSON.stringify({ user: creator })); seed('处理中');
  await expect(post('reopen', { assigneeId: processor.id, revision: 2 })).rejects.toThrow('重新发起');
});
