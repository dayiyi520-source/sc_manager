import { describe, expect, it } from 'vitest';
import type { OkrRecord } from '../../../services/okrRepository';
import { copyableCompanyObjectives, createCompanyObjectiveCopy } from './CompanyObjectiveCopyDialog';

const source: OkrRecord = {
  id: 'source', kind: 'objective', ownerId: 'me', periodKey: '2026-09', status: 'active', version: 2,
  payload: {
    title: '经营质量', objectiveType: 'target', weight: 40, progress: 75, deadline: '2026-09-30',
    alignments: [{ parentObjectiveId: 'old' }], finalScore: 88, note: '历史备注',
    keyResults: [{ id: 'old-a', title: '完成交付', weight: 100, progress: 75, deadline: '2026-09-30', assigneeIds: ['manager'] }],
  },
};

describe('company objective copying', () => {
  it('allows only my submitted objectives from earlier periods', () => {
    expect(copyableCompanyObjectives([
      source,
      { ...source, id: 'draft', status: 'draft' },
      { ...source, id: 'other', ownerId: 'other' },
      { ...source, id: 'current', periodKey: '2026-10' },
    ], 'me', '2026-10').map(record => record.id)).toEqual(['source']);
  });

  it('copies editable fields with fresh action IDs and clears historical state', () => {
    const copy = createCompanyObjectiveCopy(source);
    expect(copy).toMatchObject({ title: '经营质量', objectiveType: 'challenge', weight: 40 });
    expect(copy.keyResults?.[0]).toMatchObject({ title: '完成交付', weight: 100, progress: 0, assigneeIds: ['manager'] });
    expect(copy.keyResults?.[0].id).not.toBe('old-a');
    expect(copy.keyResults?.[0].deadline).toBeUndefined();
    expect(copy).not.toHaveProperty('deadline');
    expect(copy).not.toHaveProperty('progress');
    expect(copy).not.toHaveProperty('finalScore');
    expect(copy).not.toHaveProperty('alignments');
    expect(source.payload.keyResults?.[0].progress).toBe(75);
  });
});
