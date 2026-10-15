import { describe, it, expect } from 'vitest';
import { departmentObjectiveProgress } from './departmentObjectiveProgress';
describe('部门 O 整体进度', () => {
  it('uses saved KR weights and O weights rather than a plain KR average', () => {
    expect(departmentObjectiveProgress([{ id: 'o', period: '2026-10', payload: { title: 'O', weight: 25, keyResults: [{ id: 'a', title: 'A', weight: 80, progress: 20 }, { id: 'b', title: 'B', weight: 20, progress: 0 }] } }, { id: 'o2', period: '2026-10', payload: { title: 'O2', weight: 75, progress: 80 } }])).toBe(64);
  });
  it('does not invent a historical O progress when snapshot is missing', () => expect(departmentObjectiveProgress(undefined)).toBeUndefined());
});
