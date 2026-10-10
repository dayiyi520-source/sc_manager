import { describe, expect, it } from 'vitest';
import type { RequirementTask } from '../../types';
import { isWorkOrderInScope, ownerDepartment } from './requirementScope';

const viewer = { id: 'me', name: '本人', department: '产品部' };
const people = [{ id: 'other', name: '同事', department: '产品部' }, { id: 'sales', name: '销售', department: '销售部' }];
const item = { id: 'matter', creatorId: 'other', creatorName: '同事', assigneeId: 'other', ownerName: '同事', department: '销售部' } as RequirementTask;
describe('协同事项范围', () => {
  it('uses IDs when present and falls back to names for legacy records', () => {
    expect(isWorkOrderInScope({ ...item, creatorName: viewer.name }, 'mine_created', viewer)).toBe(true);
    expect(isWorkOrderInScope({ ...item, assigneeId: 'me' }, 'mine_owned', viewer)).toBe(true);
  });
  it('matches the owner name when legacy data carries a stale owner ID', () => {
    expect(isWorkOrderInScope({ ...item, assigneeId: 'legacy-owner', ownerName: viewer.name }, 'mine_owned', viewer)).toBe(true);
  });
  it('participation requires personal transfer and excludes current ownership and CC-only records', () => {
    expect(isWorkOrderInScope(item, 'mine_participating', viewer, [], new Set(['matter']))).toBe(true);
    expect(isWorkOrderInScope({ ...item, assigneeId: 'me' }, 'mine_participating', viewer, [], new Set(['matter']))).toBe(false);
    expect(isWorkOrderInScope({ ...item, ccNames: ['本人'] }, 'mine_participating', viewer)).toBe(false);
  });
  it('uses current owner organization rather than stored matter department', () => {
    expect(isWorkOrderInScope(item, 'department', viewer, people)).toBe(true);
    expect(isWorkOrderInScope({ ...item, assigneeId: 'sales' }, 'department', viewer, people)).toBe(false);
    expect(isWorkOrderInScope(item, 'department', { ...viewer, department: '' }, people)).toBe(false);
    expect(ownerDepartment(item, [])).toBe('');
  });
  it('does not guess departments for ambiguous legacy names', () => {
    expect(ownerDepartment({ ...item, assigneeId: undefined }, [...people, { id: 'duplicate', name: '同事', department: '销售部' }])).toBe('');
  });
});
