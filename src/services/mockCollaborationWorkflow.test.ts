import { describe, expect, it } from 'vitest';
import { applyCollaborationWorkflow } from './mockCollaborationWorkflow';
import type { EmployeeOption, RequirementTask } from '../types';
const creator = { id: 'c', name: '创建人' };
const processor = { id: 'p', name: '负责人' } as EmployeeOption;
const matter = { id: 'm', title: '原事项', description: '原描述', dueDate: '2026-12-01', workOrderType: '其他问题', specialFields: { problemType: '其他' }, creatorId: 'c', status: '已退回', revision: 1, events: [], workItems: [{ id: 'task' }] } as unknown as RequirementTask;
const context = { items: [matter], people: [processor], viewer: creator, now: '2026-10-15', eventId: 'e' };
describe('collaboration closed status', () => {
  it('closes only a creator-owned returned matter and preserves original work', () => {
    const result = applyCollaborationWorkflow('close', 'm', { revision: 1 }, context);
    expect(result).toMatchObject({ id: 'm', status: '已关闭', revision: 2, workItems: [{ id: 'task' }] });
    expect(result.events?.at(-1)).toMatchObject({ eventType: '事项关闭', fromStatus: '已退回', toStatus: '已关闭' });
    expect(matter.status).toBe('已退回');
    expect(() => applyCollaborationWorkflow('close', 'm', { revision: 0 }, context)).toThrow('更新');
    expect(() => applyCollaborationWorkflow('close', 'm', { revision: 1 }, { ...context, viewer: processor })).toThrow('创建人');
    expect(() => applyCollaborationWorkflow('close', 'm', { revision: 1 }, { ...context, items: [{ ...matter, status: '处理中' }] })).toThrow('已退回');
  });
  it('reopens a closed matter with an independent reason and a valid owner', () => {
    const closed = applyCollaborationWorkflow('close', 'm', { revision: 1 }, context);
    const ctx = { ...context, items: [closed] };
    expect(() => applyCollaborationWorkflow('reopen', 'm', { revision: 2, assigneeId: 'p' }, ctx)).toThrow('原因');
    expect(() => applyCollaborationWorkflow('reopen', 'm', { revision: 2, assigneeId: 'invalid', reason: '补充' }, ctx)).toThrow('负责人');
    const opened = applyCollaborationWorkflow('reopen', 'm', { revision: 2, assigneeId: 'p', reason: '补充' }, ctx);
    expect(opened).toMatchObject({ status: '待处理', assigneeId: 'p', revision: 3, workItems: [{ id: 'task' }] });
    expect(opened.events).toHaveLength(2);
    expect(opened.events?.at(-1)).toMatchObject({ eventType: '事项重开', reason: '补充' });
  });
});
