import { describe, it, expect } from 'vitest';
import { syncProductTemplates, migrateWorkItems, isPendingVerification } from './workItemTemplateSync';
const definition = { states: [{ key: 'todo', name: '待处理', enabled: true }, { key: 'fixed', name: '已修复', enabled: true }, { key: 'done', name: '已关闭', enabled: true }], transitions: [{ key: 'fix', from: 'todo', to: 'fixed' }] };
const templates = [{ id: 'system-bug', name: '系统缺陷', category: '缺陷', enabled: true, workflow: { id: 'global-flow', status: 'PUBLISHED', definition } }];
const members = [{ id: 'qa', name: '真实测试成员', status: 'enabled', jobTitle: '测试工程师' }, { id: 'disabled', name: '已离职', status: 'disabled' }];
describe('product templates and historical defect migration', () => {
  it('updates every product workflow and preserves matching type identity', () => {
    const products = syncProductTemplates([{ id: 'p', workItemTypes: [{ id: 'existing', name: '系统缺陷', category: '缺陷', workflows: [{ id: 'existing-flow', status: 'PUBLISHED', definition: { states: [] } }] }] }, { id: 'p2' }], templates);
    expect(products[0].workItemTypes[0]).toMatchObject({ id: 'existing', workflows: [{ id: 'existing-flow', definition }] });
    expect(products[1].workItemTypes[0].workflows[0].definition).toEqual(definition);
    expect(syncProductTemplates(products, templates)).toEqual(products);
  });
  it('repairs deleted bindings, preserves valid state, and persists real enabled verifier', () => {
    const products = syncProductTemplates([{ id: 'p' }], templates);
    const migrated = migrateWorkItems([{ id: 'b', category: 'bug', productLineId: 'p', workflowId: 'removed', taskTypeId: 'removed', status: '已修复', statusKey: 'old', verifierId: 'disabled', revision: 2 }], products, members);
    expect(migrated[0]).toMatchObject({ status: '已修复', statusKey: 'fixed', verifierId: 'qa', verifierName: '真实测试成员', revision: 3 });
    expect(migrated[0].workflowId).toBe(products[0].workItemTypes[0].workflows[0].id);
    expect(migrateWorkItems(migrated, products, members)).toEqual(migrated);
  });
  it('redistributes invalid historical states once and honors future state changes', () => {
    const products = syncProductTemplates([{ id: 'p' }], templates);
    const migrated = migrateWorkItems(Array.from({ length: 9 }, (_, index) => ({ id: `bug-${index}`, category: 'bug', productLineId: 'p', status: '失效状态' })), products, members);
    expect(new Set(migrated.map(task => task.statusKey)).size).toBe(3);
    migrated[0] = { ...migrated[0], status: '已关闭', statusKey: 'done' };
    expect(migrateWorkItems(migrated, products, members)).toEqual(migrated);
  });
  it('does not remap collaboration matter statuses through product task workflows', () => {
    const requirementTemplate = { id: 'system-requirement', name: '产品需求', category: '需求', enabled: true, workflow: { id: 'requirement-flow', status: 'PUBLISHED', definition: { states: [{ key: 'todo', name: '待处理', enabled: true }, { key: 'doing', name: '处理中', enabled: true }, { key: 'done', name: '已完成', enabled: true }], transitions: [] } } };
    const products = syncProductTemplates([{ id: 'p' }], [requirementTemplate]);
    const matter = { id: 'matter-1', category: 'requirement', workOrderType: '客户诉求', productLineId: 'p', taskTypeId: products[0].workItemTypes[0].id, workflowId: products[0].workItemTypes[0].workflows[0].id, status: '已退回', statusKey: 'returned', revision: 4 };
    expect(migrateWorkItems([matter], products, members)[0]).toEqual(matter);
  });
  it('preserves collaboration-owned statuses instead of applying product task workflows', () => {
    const requirement = { id: 'system-requirement', name: '产品需求', category: '需求', enabled: true, workflow: { id: 'requirement-flow', status: 'PUBLISHED', definition: { states: [{ key: 'todo', name: '待处理', enabled: true }, { key: 'doing', name: '处理中', enabled: true }, { key: 'done', name: '已完成', enabled: true }], transitions: [] } } };
    const products = syncProductTemplates([{ id: 'p' }], [requirement]);
    for (const status of ['待处理', '处理中', '待验收', '已退回', '已完成', '已关闭']) {
      const matter = { id: `matter-${status}`, category: 'requirement', workOrderType: '客户诉求', productLineId: 'p', status, revision: 4 };
      expect(migrateWorkItems([matter], products, members)[0]).toEqual(matter);
    }
  });
  it('respects disabled templates and refreshes definitions on subsequent edits', () => {
    const first = syncProductTemplates([{ id: 'p' }], templates);
    const updated = syncProductTemplates(first, [{ ...templates[0], enabled: false, workflow: { ...templates[0].workflow, definition: { ...definition, states: definition.states.slice(1) } } }]);
    expect(updated[0].workItemTypes[0].enabled).toBe(false);
    expect(updated[0].workItemTypes[0].workflows[0].definition.states).toHaveLength(2);
  });
  it('does not fabricate employees when none are enabled', () => {
    const task = { id: 'bug', category: 'bug', status: '已修复' };
    expect(migrateWorkItems([task], [], [])).toEqual([task]);
  });
  it('filters assigned defects waiting for verification by identity and excludes closed bugs', () => {
    const user = { id: 'qa', name: '真实测试成员' };
    expect(isPendingVerification({ verifierId: 'qa', status: '已修复' }, user)).toBe(true);
    expect(isPendingVerification({ verifierId: 'other', verifierName: user.name, status: '已修复' }, user)).toBe(false);
    expect(isPendingVerification({ verifierName: user.name, status: '待验证' }, user)).toBe(true);
    expect(isPendingVerification({ verifierId: 'qa', status: '已关闭' }, user)).toBe(false);
    expect(isPendingVerification({ verifierId: 'qa', status: '处理中' }, user)).toBe(false);
  });
});
