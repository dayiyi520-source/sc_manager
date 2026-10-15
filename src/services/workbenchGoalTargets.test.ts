import { describe, it, expect } from 'vitest';
import { workbenchGoalTargets } from './workbenchGoalTargets';
import type { CurrentUser } from '../types';
import type { OkrRecord } from './okrRepository';
const viewer: CurrentUser = { id: 'e', name: '员工', department: '产品', role: 'product_manager', roleTitle: '产品经理', avatar: '' };
const department: OkrRecord = { id: 'o', kind: 'objective', ownerId: 'm', status: 'active', periodKey: '2026-10', version: 1, payload: { title: '部门 O', goalLevel: 'department', keyResults: [{ id: 'kr', title: '部门 KR', weight: 80, progress: 20, assigneeIds: ['e'] }] } };
describe('工作台本人目标', () => {
  it('shows the inherited KR as title and only personal actions below', () => {
    const personal: OkrRecord = { ...department, id: 'personal', ownerId: 'e', payload: { goalLevel: 'personal', title: '承接', sourceObjectiveId: 'o', sourceKrId: 'kr', keyResults: [{ id: 'kr', title: '部门 KR', weight: 100, progress: 0, executionActions: [{ id: 'a', title: '本人动作', ownerId: 'e', weight: 100, progress: 35 }, { id: 'b', title: '他人动作', ownerId: 'other', progress: 99 }] }] } };
    const result = workbenchGoalTargets([department, personal], viewer);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ objective: '部门 KR', primaryLabel: 'KR', progress: 35 });
    expect(result[0].keyResults.map(row => row.content)).toEqual(['本人动作']);
  });
  it('does not substitute a department O when no personal goal exists', () => {
    expect(workbenchGoalTargets([department], { ...viewer, id: 'unrelated' })).toEqual([]);
  });
});
