import { describe, expect, it } from 'vitest';
import type { RequirementTask, RequirementWorkOrderCandidate } from '../types';
import { collaborationCandidatesFor } from './collaborationCandidates';

describe('新增任务的来源协同事项', () => {
  const source = { id: 'source-id', title: '交付设计协同', creatorName: '张三', expectedCompleteDate: '2026-10-20' } as RequirementTask;

  it('候选列表尚未加载时保留来源标题及字段', () => {
    expect(collaborationCandidatesFor([], [], source)).toEqual([expect.objectContaining({
      id: source.id, title: source.title, creatorName: '张三', expectedCompleteDate: '2026-10-20'
    })]);
  });

  it.each([undefined, 'WORK_ORDER'])('同 ID 候选的来源为 %s 时仍优先保留当前事项', (sourceType) => {
    const candidate = { id: source.id, type: 'requirement', title: source.id, typeLabel: '需求', sourceType } as RequirementWorkOrderCandidate;
    const result = collaborationCandidatesFor([candidate], [], source);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ title: source.title, creatorName: '张三', expectedCompleteDate: '2026-10-20' });
  });

  it('普通任务同 ID 记录不会挤掉可关联的协同事项', () => {
    const candidates = [
      { id: 'other', type: 'task', title: '普通任务', typeLabel: '任务' },
      { id: 'other', type: 'requirement', title: '其他协同事项', typeLabel: '协同事项', sourceType: 'WORK_ORDER' }
    ] as RequirementWorkOrderCandidate[];
    expect(collaborationCandidatesFor(candidates, [])).toEqual([expect.objectContaining({ title: '其他协同事项' })]);
  });
});
