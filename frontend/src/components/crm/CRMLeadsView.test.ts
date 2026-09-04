import { describe, expect, it } from 'vitest';
import { resolveLeadInitialTab } from './CRMLeadsView';

describe('resolveLeadInitialTab', () => {
  it('keeps the follow-up tab when live leads contain follow-up rows', () => {
    expect(resolveLeadInitialTab([{ status: '跟进中' }, { status: '转商机' }])).toBe('跟进中');
  });

  it('uses all leads when the live result contains only converted rows', () => {
    expect(resolveLeadInitialTab([{ status: '转商机' }, { status: '转商机' }])).toBe('all');
  });
});
