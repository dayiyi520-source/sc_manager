import { describe, it, expect } from 'vitest';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import { canUpdateProgress, goalChangeInformation } from './okrProgress';
import type { OkrRecord, OkrPerson } from './okrRepository';
const people: OkrPerson[] = [{ id: 'owner', name: '本人', department: '研发', supervisorId: 'boss', rootFlag: 0, version: 1 }, { id: 'boss', name: '上级', department: '公司', supervisorId: null, rootFlag: 1, version: 1 }];
const record: OkrRecord = { id: 'goal', kind: 'objective', ownerId: 'owner', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '目标', keyResults: [{ id: 'kr', title: '结果', weight: 100, progress: 0, executionActions: [{ id: 'a', ownerId: 'owner', title: '动作', weight: 100, progress: 0 }] }] } };
const update = { action: 'update-progress', viewerId: 'owner', version: 1, itemId: 'a', progress: 45, progressStatus: 'normal' as const, note: '完成首轮验收', attachments: [{ name: 'evidence.txt', data: 'data:text/plain;base64,b2s=' }] };
describe('独立进度更新', () => {
  it('persists evidence and updates A, KR and objective together without creating an approval', () => {
    const result = mutateOkrLifecycle('goal', update, [record], people)!;
    expect(result.records[0].payload.progress).toBe(45);
    expect(result.records[0].payload.keyResults?.[0].progress).toBe(45);
    expect(result.records[0].payload.keyResults?.[0].executionActions?.[0].progress).toBe(45);
    expect(result.records[0].progressHistory?.[0]).toMatchObject({ previousProgress: 0, progress: 45, operatorId: 'owner', note: update.note, attachments: update.attachments });
    expect(result.records[0].changeRequest).toBeUndefined();
    expect(() => mutateOkrLifecycle('goal', update, result.records, people)).toThrow('已被更新');
  });
  it('allows an unaligned own KR but blocks aligned KRs and other people’s A', () => {
    expect(canUpdateProgress(record, 'kr', 'owner', [record])).toBe(true);
    const child = { ...record, id: 'child', ownerId: 'boss', payload: { title: '下级', sourceObjectiveId: 'goal', sourceKrId: 'kr' } };
    expect(canUpdateProgress(record, 'kr', 'owner', [record, child])).toBe(false);
    expect(() => mutateOkrLifecycle('goal', { ...update, itemId: 'kr' }, [record, child], people)).toThrow('只能查看历史');
    expect(() => mutateOkrLifecycle('goal', { ...update, viewerId: 'boss' }, [record], people)).toThrow('只能查看历史');
  });
  it('rejects incomplete notes, invalid progress and pending approval states', () => {
    expect(() => mutateOkrLifecycle('goal', { ...update, note: ' ' }, [record], people)).toThrow('更新说明');
    expect(() => mutateOkrLifecycle('goal', { ...update, progress: 101 }, [record], people)).toThrow('有效进度');
    expect(canUpdateProgress({ ...record, status: 'draft' }, 'a', 'owner', [record])).toBe(false);
  });
  it('summarizes detail date and A deadline changes for both applicant and reviewer', () => {
    const before = { ...record.payload, keyResults: [{ ...record.payload.keyResults![0], details: [{ id: 'v', name: '版本1', stage: '开发', plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-20' }] }] };
    const after = { ...before, keyResults: [{ ...before.keyResults[0], details: [{ ...before.keyResults[0].details[0], plannedEndDate: '2026-10-25' }], executionActions: [{ ...before.keyResults[0].executionActions![0], deadline: '2026-10-25' }] }] };
    const info = goalChangeInformation(before, after);
    expect(info).toContain('2026-10-20'); expect(info).toContain('2026-10-25'); expect(info).toContain('截止日期');
  });
});
