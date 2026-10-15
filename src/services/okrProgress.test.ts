import { describe, it, expect } from 'vitest';
import { mutateOkrLifecycle } from './mockOkrLifecycle';
import { canUpdateProgress, goalChangeInformation } from './okrProgress';
import type { OkrRecord, OkrPerson } from './okrRepository';
const people: OkrPerson[] = [{ id: 'owner', name: '本人', department: '研发', supervisorId: 'boss', rootFlag: 0, version: 1 }, { id: 'boss', name: '上级', department: '公司', supervisorId: null, rootFlag: 1, version: 1 }];
const record: OkrRecord = { id: 'goal', kind: 'objective', ownerId: 'owner', periodKey: '2026-10', status: 'active', version: 1, payload: { title: '目标', keyResults: [{ id: 'kr', title: '结果', weight: 100, progress: 0, executionActions: [{ id: 'a', ownerId: 'owner', title: '动作', weight: 100, progress: 0 }] }] } };
const update = { action: 'update-progress', viewerId: 'owner', version: 1, itemId: 'a', progress: 45, progressStatus: 'normal' as const, note: '完成首轮验收', attachments: [{ name: 'evidence.txt', data: 'data:text/plain;base64,b2s=' }] };
describe('独立进度更新', () => {
  it('rejects manual updates for owners and supervisors, preserving history', () => {
    for (const viewerId of ['owner', 'boss']) {
      expect(canUpdateProgress(record, 'kr', viewerId, [record])).toBe(false);
      expect(canUpdateProgress(record, 'a', viewerId, [record])).toBe(false);
      expect(() => mutateOkrLifecycle('goal', { ...update, viewerId }, [record], people)).toThrow('只能查看历史');
    }
    expect(record.progressHistory).toBeUndefined();
  });
  it('summarizes detail date and A deadline changes for both applicant and reviewer', () => {
    const before = { ...record.payload, keyResults: [{ ...record.payload.keyResults![0], details: [{ id: 'v', name: '版本1', stage: '开发', plannedStartDate: '2026-10-01', plannedEndDate: '2026-10-20' }] }] };
    const after = { ...before, keyResults: [{ ...before.keyResults[0], details: [{ ...before.keyResults[0].details[0], plannedEndDate: '2026-10-25' }], executionActions: [{ ...before.keyResults[0].executionActions![0], deadline: '2026-10-25' }] }] };
    const info = goalChangeInformation(before, after);
    expect(info).toContain('2026-10-20'); expect(info).toContain('2026-10-25'); expect(info).toContain('截止日期');
  });
});
