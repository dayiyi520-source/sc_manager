import { describe, expect, it } from 'vitest';
import { collaborationDesignVariant, isCollaborationCreator, lastCollaborationProcessor } from './collaborationWorkflow';
import type { RequirementTask } from '../types';
const people = [{ id: 'processor', name: '处理人' }, { id: 'creator', name: '创建人' }];
const task = (events: RequirementTask['events']): RequirementTask => ({ id: 'm', title: '事项', status: '待验收', ownerName: '创建人', assigneeId: 'creator', creatorId: 'creator', creatorName: '创建人', events } as RequirementTask);
describe('collaboration workflow identities', () => {
  it('never lets a matching name override a different stable creator id', () => expect(isCollaborationCreator(task([]), { id: 'other', name: '创建人' })).toBe(false));
  it('recovers stable processing identity even after the matter owner changes to the creator', () => {
    expect(lastCollaborationProcessor(task([{ id: 'e', eventType: '事项完成', fromStatus: '处理中', operatorName: '旧姓名', createdAt: '', metadata: { processingAssigneeId: 'processor', processingAssigneeName: '处理人' } }]), people)).toMatchObject({ id: 'processor', resolved: true });
  });
  it('supports historical completion metadata without defaulting to the current acceptance owner', () => {
    expect(lastCollaborationProcessor(task([{ id: 'e', eventType: '事项完成', operatorName: '处理人', createdAt: '', metadata: JSON.stringify({ fromAssigneeName: '处理人' }) as never }]), people).id).toBe('processor');
    expect(lastCollaborationProcessor(task([]), people).resolved).toBe(false);
  });
  it('requires manual resolution for inactive or ambiguous processing identities', () => {
    const events = [{ id: 'e', eventType: '事项完成', operatorName: '处理人', createdAt: '' }];
    expect(lastCollaborationProcessor(task(events), []).resolved).toBe(false);
    expect(lastCollaborationProcessor(task(events), [...people, { id: 'duplicate', name: '处理人' }]).resolved).toBe(false);
  });
  it('uses the most recent actual processing cycle', () => {
    const events = [{ id: 'old', eventType: '事项完成', fromStatus: '处理中', operatorName: '旧处理人', createdAt: '' }, { id: 'new', eventType: '事项完成', fromStatus: '处理中', operatorName: '处理人', createdAt: '' }, { id: 'closed', eventType: '事项关闭', operatorName: '创建人', createdAt: '' }];
    expect(lastCollaborationProcessor(task(events), people).id).toBe('processor');
  });
});

it.each([['客户诉求', 'product'], ['产品需求', 'product'], ['交付支持', 'project'], ['项目交付', 'project'], ['售前支持', 'other'], ['线上问题', 'other'], ['其他问题', 'other']] as const)('maps %s to %s design', (type, variant) => {
  expect(collaborationDesignVariant({ requirementType: type })).toBe(variant);
});
