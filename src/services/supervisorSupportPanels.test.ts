import { describe, expect, it } from 'vitest';
import type { OKRItem } from '../types';
import type { OkrKrReview, OkrPerson, OkrRecord } from './okrRepository';
import { employeeActionsForKr, employeeEvidenceForKr, supervisorObjectiveSummary } from './supervisorSupportPanels';
import { employeeSupportsForKr } from './supervisorReview';
const period = { startDate: '2026-10-12', endDate: '2026-10-18' };
const people: OkrPerson[] = [{ id: 'manager', name: '主管', department: '产品', rootFlag: 0, supervisorId: 'boss', version: 0 }, { id: 'employee', name: '员工', department: '产品', rootFlag: 0, supervisorId: 'manager', version: 0 }];
const kr: OkrKrReview = { objectiveId: 'o', objectiveTitle: '目标', keyResultId: 'kr', keyResultTitle: 'KR', previousProgress: 20, currentProgress: 60, health: 'normal', achievement: '', blocker: '', nextPlan: '', workIds: [] };
const goal: OkrRecord = { id: 'g', kind: 'objective', ownerId: 'employee', periodKey: '2026-10', status: 'active', version: 0, payload: { title: '承接', sourceObjectiveId: 'o', sourceKrId: 'kr', keyResults: [{ id: 'kr', title: 'KR', progress: 0, weight: 100, executionActions: [{ id: 'a', title: '当前员工 A', ownerId: 'employee', progress: 65 }, { id: 'foreign', title: '他人 A', ownerId: 'other', progress: 80 }] }] } };
const report: OkrRecord = { id: 'r', kind: 'review', ownerId: 'employee', periodKey: '2026-10-12/2026-10-18', status: 'submitted', version: 0, payload: { title: '本周', reviewType: 'week', ...period, krReviews: [{ ...kr, objectiveId: 'g', keyResultId: 'a', keyResultTitle: '员工 A', workIds: ['task', 'ticket'] }], items: [{ workId: 'task', title: '关联任务', workType: 'task', status: '已完成', result: '完成验证', impact: '' }, { workId: 'ticket', title: '关联协同', workType: 'ticket', status: '处理中', result: '', impact: '' }, { workId: 'unrelated', title: '同报告其他工作', workType: 'task', status: '处理中', result: '', impact: '' }] } };
const objective: OKRItem = { id: 'o', objective: '目标', ownerId: 'manager', ownerName: '主管', department: '产品', category: 'my', cycle: '2026-10', weight: 75, progress: 99, deadline: '', status: 'active', keyResults: [{ id: 'kr', content: 'KR', progress: 60, weight: 25, deadline: '' }, { id: 'kr2', content: 'KR2', progress: 80, weight: 75, deadline: '' }] };

describe('supervisor support panels data', () => {
  it('lists real current aligned employee A even without a report and excludes unrelated A', () => {
    expect(employeeActionsForKr([goal], people, 'manager', kr, period)).toMatchObject([{ authorId: 'employee', authorName: '员工', actions: [{ id: 'a', title: '当前员工 A', progress: 65 }] }]);
    expect(employeeActionsForKr([goal], people, 'manager', { ...kr, keyResultId: 'other' }, period)).toEqual([]);
    expect(employeeActionsForKr([{ ...goal, status: 'draft' }], people, 'manager', kr, period)).toEqual([]);
    expect(employeeActionsForKr([{ ...goal, periodKey: '2026-09' }], people, 'manager', kr, period)).toEqual([]);
  });
  it('derives evidence only from matching employee A report work IDs, preserving source/results and deduplicating', () => {
    const supports = employeeSupportsForKr([goal, report], people, 'manager', kr, period);
    const rows = employeeEvidenceForKr([...supports, ...supports], []);
    expect(rows.map(row => row.workId)).toEqual(['task', 'ticket']);
    expect(rows[0]).toMatchObject({ title: '关联任务', workType: 'task', result: '完成验证', employeeNames: ['员工'] });
    expect(rows[1]).toMatchObject({ workType: 'ticket', title: '关联协同' });
  });
  it('retains a clearly labeled missing-evidence row instead of inventing a task', () => {
    const supports = employeeSupportsForKr([goal, { ...report, payload: { ...report.payload, items: [] } }], people, 'manager', kr, period);
    expect(employeeEvidenceForKr(supports, [])[0]).toMatchObject({ workId: 'task', missing: true });
  });
  it('uses KR weights for O progress and reads actual execution status rather than lifecycle labels', () => {
    const rows = [kr, { ...kr, keyResultId: 'kr2', previousProgress: 40, currentProgress: 80 }];
    expect(supervisorObjectiveSummary(objective, rows, '2026-10-13')).toMatchObject({ weight: 100, previousProgress: 35, currentProgress: 75, status: 'normal' });
    expect(supervisorObjectiveSummary({ ...objective, keyResults: objective.keyResults.map(row => ({ ...row, executionStatus: 'ahead' as const })) }, rows, '2026-10-13').status).toBe('ahead');
    expect(supervisorObjectiveSummary(objective, [kr, { ...rows[1], health: 'risk' }], '2026-10-13').status).toBe('risk');
    expect(supervisorObjectiveSummary({ ...objective, keyResults: [{ ...objective.keyResults[0], deadline: '2026-10-01' }] }, [kr], '2026-10-13').status).toBe('overdue');
    expect(supervisorObjectiveSummary({ ...objective, keyResults: objective.keyResults.map(row => ({ ...row, weight: 0 })) }, rows, '2026-10-13').currentProgress).toBe(0);
  });
});
