import { describe, expect, it } from 'vitest';
import type { OkrPerson, OkrRecord } from './okrRepository';
import { validateReviewProgress } from './okrReviewProgressSync';
import { monthlyReviewTargets } from './okrReviewTargets';
import { reviewTemplateFor, reviewEditorState } from './okrReviewTemplates';

const employee: OkrPerson = { id: 'me', name: '本人', department: '产品部', supervisorId: 'supervisor', rootFlag: 0, version: 0 };
const personal: OkrRecord = { id: 'personal', kind: 'objective', ownerId: 'me', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '当前月度目标', goalModelVersion: 2, goalLevel: 'personal', origin: 'assigned', keyResults: [{ id: 'kr', title: '承接 KR', progress: 30, weight: 100, businessObject: '产品甲', version: 'V2', executionActions: [{ id: 'a', title: '本人实际 A', ownerId: 'me', progress: 40, weight: 100 }, { id: 'other-a', title: '他人 A', ownerId: 'other', progress: 80 }] }] } };

describe('live monthly review targets', () => {
  it('reads personal A with current title, progress, product and version from the monthly record', () => {
    const [target] = monthlyReviewTargets([personal], 'me', [employee]);
    expect(target).toMatchObject({ id: 'personal', cycle: '2026-10', primaryLabel: 'KR', objective: '当前月度目标', keyResults: [{ id: 'a', content: '本人实际 A', progress: 40, businessObject: '产品甲', version: 'V2', parentKeyResultId: 'kr', parentKeyResultTitle: '承接 KR', parentKeyResultProgress: 30 }] });
    const changed = { ...personal, payload: { ...personal.payload, title: '修改后的月度目标' } };
    expect(monthlyReviewTargets([changed], 'me', [employee])[0].objective).toBe('修改后的月度目标');
  });
  it('projects actual execution history separately from lifecycle status', () => {
    const row: OkrRecord = { ...personal, progressHistory: [{ id: 'h', itemId: 'a', operatorId: 'me', createdAt: '2026-10-12', previousProgress: 30, progress: 40, status: 'risk', note: '依赖变化', attachments: [] }] };
    const result = monthlyReviewTargets([row], 'me', [employee])[0];
    expect(result.status).toBe('active');
    expect(result.keyResults[0].executionStatus).toBe('risk');
  });
  it('does not reuse assigned upstream KRs or pending/inherited/deleted goals as personal A', () => {
    const upstream = { ...personal, id: 'upstream', ownerId: 'supervisor', payload: { ...personal.payload, goalLevel: 'department' as const, keyResults: [{ id: 'source', title: '上级 KR', weight: 100, progress: 10, assigneeIds: ['me'] }] } };
    const candidates = [upstream, { ...personal, id: 'draft', status: 'draft' }, { ...personal, id: 'deleted', status: 'deleted' }, { ...personal, id: 'inherited', payload: { ...personal.payload, inherited: true } }, { ...personal, id: 'pending', changeRequest: { id: 'c', purpose: 'initial' as const, status: 'pending' as const, reason: '', reviewerId: 'supervisor', payload: personal.payload, baseVersion: 0, requestedAt: '' } }];
    expect(monthlyReviewTargets(candidates, 'me', [employee])).toEqual([]);
  });
  it('does not substitute KR for A when a current personal goal has no actions', () => {
    const record = { ...personal, payload: { ...personal.payload, keyResults: [{ id: 'kr', title: '无本人动作的 KR', weight: 100, progress: 20 }] } };
    expect(monthlyReviewTargets([record], 'me', [employee])[0].keyResults).toEqual([]);
  });
  it('retains actual legacy owned breakdown actions with their parent context', () => {
    const source: OkrRecord = { ...personal, id: 'source', ownerId: 'supervisor', payload: { title: '历史月度目标', keyResults: [{ id: 'source-kr', title: '上级动作', weight: 100, progress: 0, businessObject: '产品甲' }] } };
    const action: OkrRecord = { id: 'legacy-a', kind: 'action', ownerId: 'me', periodKey: '2026-09', status: 'active', version: 0, payload: { title: '已保存拆解动作', parentObjectiveId: 'source', parentKeyResultId: 'source-kr', progress: 25 } };
    expect(monthlyReviewTargets([source, action], 'me', [employee])[0].keyResults).toMatchObject([{ id: 'legacy-a', content: '已保存拆解动作', progress: 25, businessObject: '产品甲' }]);
  });
});

describe('review template classification', () => {
  it('uses organization roots and reporting relationships, not admin permissions or names', () => {
    const supervisor = { ...employee, id: 'supervisor', name: '主管', jobTitle: '团队负责人' };
    const boss = { ...employee, id: 'boss', rootFlag: 1 };
    const people = [employee, supervisor, boss];
    expect(reviewTemplateFor(employee, people)).toBe('employee');
    expect(reviewTemplateFor(supervisor, people)).toBe('supervisor');
    expect(reviewTemplateFor(boss, people)).toBe('boss');
    expect(reviewTemplateFor({ ...employee, id: 'user-admin', name: '林志豪' }, [])).toBe('employee');
    expect(reviewTemplateFor({ ...employee, jobTitle: '产品主管' }, [])).toBe('supervisor');
    expect(reviewTemplateFor(undefined, people)).toBeUndefined();
  });
  it('only shows persisted draft or returned state when that state exists', () => {
    expect(reviewEditorState()).toMatchObject({ label: '待填写' });
    expect(reviewEditorState('draft')).toMatchObject({ label: '草稿' });
    expect(reviewEditorState('returned')).toMatchObject({ label: '已退回' });
  });
});

describe('department review goal scope', () => {
  const manager = { ...employee, id: 'supervisor', goalRole: 'supervisor' as const, supervisorId: 'boss' };
  const department: OkrRecord = { ...personal, id: 'department', ownerId: manager.id, payload: { ...personal.payload, goalLevel: 'department', keyResults: [{ id: 'shared-kr', title: '部门交付结果', weight: 100, progress: 0, assigneeIds: ['me', manager.id], details: [{ id: 'v1', name: '产品', version: 'V1.0.0', assigneeIds: ['me'] }, { id: 'v2', name: '产品', version: 'V1.2.0', assigneeIds: [manager.id] }] }] } };
  const pending = (purpose: 'initial' | 'update' | 'delete'): OkrRecord => ({ ...department, id: `pending-${purpose}`, changeRequest: { id: 'change', purpose, status: 'pending', reviewerId: 'boss', reason: '申请', requestedAt: '', baseVersion: 1, payload: department.payload } });
  const managerPersonal: OkrRecord = { ...department, id: 'manager-personal', payload: { ...department.payload, goalLevel: 'personal', sourceObjectiveId: department.id, sourceKrId: 'shared-kr', keyResults: [{ ...department.payload.keyResults![0], details: [department.payload.keyResults![0].details![1]] }] } };
  const records: OkrRecord[] = [department, managerPersonal, ...['draft', 'submitted', 'deleted'].map(status => ({ ...department, id: status, status })), pending('initial'), pending('update'), pending('delete'), { ...department, id: 'company', payload: { ...department.payload, goalLevel: 'company' as const } }, { ...department, id: 'old-action', kind: 'action' }];
  it('uses the single effective department objective and all of its detail rows', () => {
    const targets = monthlyReviewTargets(records, manager.id, [manager, employee]);
    expect(targets.map(row => row.id)).toEqual(['department']);
    expect(targets[0].keyResults).toHaveLength(1);
    expect(targets[0].keyResults[0].details?.map(row => row.id)).toEqual(['v1', 'v2']);
  });
  it.each(['week', 'month'] as const)('rejects excluded goals at the %s save boundary', reviewType => {
    const row = { objectiveId: department.id, objectiveTitle: '部门目标', keyResultId: 'shared-kr', keyResultTitle: '部门交付结果', previousProgress: 0, currentProgress: 0, health: 'normal' as const, achievement: '', blocker: '', nextPlan: '', workIds: [] };
    const payload = { title: '部门复盘', reviewType, startDate: '2026-10-01', endDate: '2026-10-31', krReviews: [row] };
    expect(() => validateReviewProgress(payload, manager.id, records, [manager, employee])).not.toThrow();
    for (const objectiveId of ['manager-personal', 'draft', 'submitted', 'deleted', 'pending-initial', 'pending-update', 'pending-delete']) {
      expect(() => validateReviewProgress({ ...payload, krReviews: [{ ...row, objectiveId }] }, manager.id, records, [manager, employee])).toThrow('复盘目标不属于本人或当前周期');
    }
  });
  it('does not merge independent department goals merely because they share the same title', () => {
    const second = { ...department, id: 'another-real-goal' };
    expect(monthlyReviewTargets([department, second], manager.id, [manager, employee])).toHaveLength(2);
  });
});
