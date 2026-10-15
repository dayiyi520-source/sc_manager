import { describe, it, expect } from 'vitest';
import { workbenchGoalTargets } from './workbenchGoalTargets';
import type { CurrentUser } from '../types';
import type { OkrRecord } from './okrRepository';

const currentCycle = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

const employee: CurrentUser = { id: 'employee', name: '员工', department: '产品', role: 'product_manager', roleTitle: '产品经理', avatar: '' };
const supervisor: CurrentUser = { id: 'supervisor', name: '主管', department: '产品', role: 'product_manager', roleTitle: '产品主管', avatar: '' };
const root: CurrentUser = { id: 'root', name: '根组织', department: '公司', role: 'admin', roleTitle: '系统管理员', avatar: '' };

const department: OkrRecord = {
  id: 'department-o', kind: 'objective', ownerId: 'supervisor', status: 'active', periodKey: currentCycle, version: 1,
  payload: {
    title: '部门 O', goalLevel: 'department', keyResults: [
      { id: 'department-kr-1', title: '部门 KR 1', weight: 60, progress: 20, assigneeIds: ['employee'] },
      { id: 'department-kr-2', title: '部门 KR 2', weight: 40, progress: 50, assigneeIds: ['other'] },
    ],
  },
};
const company: OkrRecord = {
  id: 'company-o', kind: 'objective', ownerId: 'root', status: 'active', periodKey: currentCycle, version: 1,
  payload: {
    title: '公司 O', goalLevel: 'company', keyResults: [
      { id: 'company-kr-1', title: '公司 KR 1', weight: 50, progress: 10, assigneeIds: ['supervisor'] },
      { id: 'company-kr-2', title: '公司 KR 2', weight: 50, progress: 70, assigneeIds: ['other'] },
    ],
  },
};

describe('工作台本人目标', () => {
  it('员工显示承接的 KR 及本人动作，不显示部门 O', () => {
    const personal: OkrRecord = {
      ...department, id: 'personal', ownerId: 'employee',
      payload: { goalLevel: 'personal', title: '承接', sourceObjectiveId: 'department-o', sourceKrId: 'department-kr-1', keyResults: [{ id: 'department-kr-1', title: '部门 KR 1', weight: 100, progress: 0, executionActions: [{ id: 'a', title: '本人动作', ownerId: 'employee', weight: 100, progress: 35 }, { id: 'b', title: '他人动作', ownerId: 'other', progress: 99 }] }] },
    };
    const result = workbenchGoalTargets([department, personal], employee);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ objective: '部门 KR 1', primaryLabel: 'KR', progress: 35 });
    expect(result[0].keyResults.map(row => row.content)).toEqual(['本人动作']);
  });

  it('主管显示本人部门 O 及全部部门 KR，即使只承接其中一条 KR', () => {
    const result = workbenchGoalTargets([department], supervisor);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ objective: '部门 O', primaryLabel: 'O' });
    expect(result[0].keyResults.map(row => row.content)).toEqual(['部门 KR 1', '部门 KR 2']);
  });

  it('根组织显示本人公司 O 及全部公司 KR', () => {
    const result = workbenchGoalTargets([company], root);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ objective: '公司 O', primaryLabel: 'O' });
    expect(result[0].keyResults.map(row => row.content)).toEqual(['公司 KR 1', '公司 KR 2']);
  });

  it('普通员工没有个人目标时不替换为部门 O', () => {
    expect(workbenchGoalTargets([department], { ...employee, id: 'unrelated' })).toEqual([]);
  });

  it('不纳入非当前周期、继承或已删除目标', () => {
    const result = workbenchGoalTargets([
      department,
      { ...department, id: 'old', periodKey: 'previous-cycle' },
      { ...department, id: 'inherited', payload: { ...department.payload, inherited: true } },
      { ...department, id: 'deleted', status: 'deleted' },
    ], supervisor);
    expect(result.map(item => item.id)).toEqual(['department-o']);
  });
});

it('uses explicit goal role instead of an old job title for workbench hierarchy', () => {
  const person = { id: supervisor.id, name: supervisor.name, department: supervisor.department, rootFlag: 0, supervisorId: root.id, version: 0, goalRole: 'supervisor' as const };
  expect(workbenchGoalTargets([department], { ...supervisor, roleTitle: '产品经理' }, person)[0]?.primaryLabel).toBe('O');
  expect(workbenchGoalTargets([department], supervisor, { ...person, goalRole: 'employee' })).toEqual([]);
});
