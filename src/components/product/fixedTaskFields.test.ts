import { describe, expect, it } from 'vitest';
import { fixedTaskFields } from './fixedTaskFields';

const properties = (kind: string, scene: 'CREATE' | 'DETAIL', variant: 'product' | 'project' | 'other' = 'product') => fixedTaskFields(kind, scene, variant).fields.filter((field) => field.sort >= 0).map((field) => field.fieldCode);
const dates = ['plannedStartDate', 'plannedEndDate', 'expectedCompleteDate', 'estimatedHours'];
describe('fixed task field contracts', () => {
  it('fixes product order, required collaboration and version and detail-only actual hours', () => {
    expect(properties('requirement', 'CREATE')).toEqual(['needsCollaboration', 'assignee', 'priority', 'productLine', 'version', 'project', ...dates, 'attachments']);
    expect(properties('requirement', 'DETAIL')).toEqual(['needsCollaboration', 'assignee', 'priority', 'productLine', 'version', 'project', ...dates, 'actualHours', 'attachments']);
    const fields = fixedTaskFields('requirement', 'CREATE');
    expect(['title', 'needsCollaboration', 'assignee', 'priority', 'productLine', 'version', 'plannedStartDate', 'plannedEndDate'].every(fields.required)).toBe(true);
    expect(fields.visible('relatedTasks')).toBe(false);
    expect(fields.visible('actualHours')).toBe(false);
  });
  it.each(['product', 'project', 'other'] as const)('uses independent %s design ownership and required rules', (variant) => {
    const owner = variant === 'product' ? ['productLine', 'version'] : variant === 'project' ? ['project', 'productLine'] : ['sourceDepartment', 'productLine'];
    const fields = fixedTaskFields('design', 'CREATE', variant);
    expect(properties('design', 'CREATE', variant)).toEqual(['taskType', 'assignee', 'priority', ...owner, ...dates, 'attachments']);
    expect(fields.required(owner[0])).toBe(true);
    expect(fields.required(owner[1])).toBe(false);
    expect(fields.visible('relatedTasks')).toBe(true);
    expect(fixedTaskFields('design', 'DETAIL', variant).visible('relatedTasks')).toBe(true);
  });
  it.each(['dev', 'test'])('fixes %s fields and distinct creation/detail relation tabs', (kind) => {
    expect(properties(kind, 'CREATE')).toEqual(['assignee', 'priority', 'productLine', 'version', 'project', ...dates, 'attachments']);
    const detail = fixedTaskFields(kind, 'DETAIL');
    expect(detail.visible('relatedTasks')).toBe(false);
    expect(detail.visible('actualHours')).toBe(true);
    expect(fixedTaskFields(kind, 'CREATE').visible('relatedTasks')).toBe(true);
    expect(detail.order('dueDate')).toBe(detail.order('plannedEndDate'));
  });

  it.each([
    ['ops', ['assignee', 'priority', 'project', 'productLine', 'plannedStartDate', 'plannedEndDate', 'expectedCompleteDate', 'estimatedHours', 'attachments']],
    ['presales', ['assignee', 'priority', 'source', 'customer', 'plannedStartDate', 'plannedEndDate', 'expectedCompleteDate', 'estimatedHours', 'attachments']],
    ['delivery', ['assignee', 'priority', 'project', 'customer', 'plannedStartDate', 'plannedEndDate', 'expectedCompleteDate', 'estimatedHours', 'attachments']],
  ] as const)('fixes %s business task fields', (kind, expected) => {
    const fields = fixedTaskFields(kind, 'CREATE');
    expect(fields.fields.filter((field) => field.sort >= 0).map((field) => field.fieldCode)).toEqual(expected);
    expect(fields.visible('relatedTasks')).toBe(true);
    expect(fields.visible('workItemType')).toBe(false);
  });

  it.each(['requirement', 'design', 'dev', 'test'])('does not add legacy fields to %s forms or change existing list columns', (kind) => {
    const fields = fixedTaskFields(kind, 'CREATE');
    expect(['expectedGoal', 'status', 'cc', 'actualHours', 'children', 'hours', 'support'].some(fields.visible)).toBe(false);
    expect(fixedTaskFields(kind, 'LIST').fields).toEqual([]);
    expect(fixedTaskFields(kind, 'LIST').visible('priority')).toBe(true);
  });
});
