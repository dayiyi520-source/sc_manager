// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { mutateCollaboration } from './mockCollaborationMutations';
import { applyCollaborationWorkflow } from './mockCollaborationWorkflow';
import { mockApiRequest } from './mockApi';
import { MOCK_USERS } from '../data/mockSnapshot';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
it('requires dates only when transferring product demands and persists the selected date', () => {
  const context = { items: [], people: [{ id: 'me', name: '本人' }], viewer: { id: 'me', name: '本人' }, save: () => undefined, id: () => 'new', now: '2026-10-28' };
  const body = { title: '记录', description: '原始诉求', workOrderType: '客户诉求', productLineId: 'p', assigneeId: 'me', specialFields: { transferToProduct: '不需要', requestSource: '客户', projectName: '项目' } };
  expect(mutateCollaboration(['api', 'requirements'], 'POST', body, context)).toMatchObject({ status: '待处理', assigneeId: 'me' });
  const transfer = { ...body, expectedCompleteDate: '2026-11-10', specialFields: { ...body.specialFields, transferToProduct: '需要' } };
  expect(() => mutateCollaboration(['api', 'requirements'], 'POST', transfer, context)).toThrow('产品需求描述');
  const valid = { ...transfer, specialFields: { ...transfer.specialFields, productDescription: '产品实现说明' } };
  expect(() => mutateCollaboration(['api', 'requirements'], 'POST', { ...valid, expectedCompleteDate: undefined }, context)).toThrow('期望完成时间');
  expect(mutateCollaboration(['api', 'requirements'], 'POST', valid, context)).toMatchObject({ status: '待处理', expectedCompleteDate: '2026-11-10' });
  const editing = { ...valid, id: 'editing', status: '待处理', creatorId: 'me', revision: 0 };
  expect(() => mutateCollaboration(['api', 'requirements', 'editing'], 'PUT', { expectedCompleteDate: '' }, { ...context, items: [editing] } as never)).toThrow('期望完成时间');
  expect(() => mutateCollaboration(['api', 'requirements'], 'POST', { ...body, workOrderType: '线上问题' }, context)).toThrow('期望完成时间');
});
it('reopens a record-only product demand without dates while retaining the original contract', () => {
  const item = { id: 'm', title: '记录', description: '原始诉求', workOrderType: '客户诉求', productLineId: 'p', creatorId: 'me', status: '已退回', revision: 1, specialFields: { transferToProduct: '不需要', requestSource: '客户', projectName: '项目' } };
  const result = applyCollaborationWorkflow('reopen', 'm', { revision: 1, assigneeId: 'me' }, { items: [item] as never, people: [{ id: 'me', name: '本人' }], viewer: { id: 'me', name: '本人' }, now: '2026-10-28', eventId: 'event' });
  expect(result).toMatchObject({ status: '待处理', revision: 2 });
});
it('requires a date when reopening transferred product demands and retains it after saving', () => {
  const item = { id: 'm', title: '转产品', description: '原始诉求', workOrderType: '客户诉求', productLineId: 'p', creatorId: 'me', status: '已退回', revision: 1, specialFields: { transferToProduct: '需要', productDescription: '产品实现', requestSource: '客户', projectName: '项目' } };
  const context = { items: [item] as never, people: [{ id: 'me', name: '本人' }], viewer: { id: 'me', name: '本人' }, now: '2026-10-28', eventId: 'event' };
  expect(() => applyCollaborationWorkflow('reopen', 'm', { revision: 1, assigneeId: 'me' }, context)).toThrow('期望完成时间');
  expect(applyCollaborationWorkflow('reopen', 'm', { revision: 1, assigneeId: 'me', changes: { expectedCompleteDate: '2026-11-10' } }, context)).toMatchObject({ status: '待处理', expectedCompleteDate: '2026-11-10' });
});
it('manually completes record-only matters after creation, persists and rejects foreign or repeated completion', async () => {
  const user = MOCK_USERS[0];
  sessionStorage.setItem('shichuang.session', JSON.stringify({ user }));
  const item = { id: 'record-only', title: '仅记录', category: 'requirement', workOrderType: '客户诉求', specialFields: { transferToProduct: '不需要' }, status: '待处理', revision: 0, assigneeId: user.id, ownerName: user.name, creatorId: user.id, events: [], workItems: [] };
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([item]));
  await mockApiRequest('/api/requirements/record-only/complete', { method: 'POST', body: JSON.stringify({ revision: 0, note: '记录完成' }) });
  expect(await mockApiRequest('/api/requirements/record-only')).toMatchObject({ status: '已完成', revision: 1 });
  await expect(mockApiRequest('/api/requirements/record-only/complete', { method: 'POST', body: JSON.stringify({ revision: 1 }) })).rejects.toThrow('状态');
  localStorage.setItem('shichuang.frontend.mock.workItems', JSON.stringify([item]));
  sessionStorage.setItem('shichuang.session', JSON.stringify({ user: { id: 'foreign', name: '他人' } }));
  await expect(mockApiRequest('/api/requirements/record-only/complete', { method: 'POST', body: JSON.stringify({ revision: 0 }) })).rejects.toThrow('负责人');
});

it('saves and reads back the date for transferred demands, while record-only creation accepts no date', async () => {
  const user = MOCK_USERS[0];
  sessionStorage.setItem('shichuang.session', JSON.stringify({ user }));
  const employees = await mockApiRequest('/api/team-members/options') as Array<{ id: string }>;
  const body = { title: '日期校验', description: '原始诉求', workOrderType: '客户诉求', productLineId: 'p', assigneeId: employees[0].id, specialFields: { transferToProduct: '需要', requestSource: '客户', projectName: '项目', productDescription: '产品实现说明' } };
  await expect(mockApiRequest('/api/requirements', { method: 'POST', body: JSON.stringify(body) })).rejects.toThrow('期望完成时间');
  const created = await mockApiRequest('/api/requirements', { method: 'POST', body: JSON.stringify({ ...body, expectedCompleteDate: '2026-11-10' }) });
  expect(await mockApiRequest(`/api/requirements/${created.id}`)).toMatchObject({ expectedCompleteDate: '2026-11-10' });
  const record = await mockApiRequest('/api/requirements', { method: 'POST', body: JSON.stringify({ ...body, specialFields: { ...body.specialFields, transferToProduct: '不需要' } }) });
  expect(await mockApiRequest(`/api/requirements/${record.id}`)).toMatchObject({ status: '待处理', specialFields: expect.objectContaining({ transferToProduct: '不需要' }) });
});
