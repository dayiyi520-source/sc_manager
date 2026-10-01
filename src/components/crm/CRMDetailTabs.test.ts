import { describe, expect, it } from 'vitest';
import type { CRMDetailTab } from './CRMDetailTabs';

describe('CRMDetailTab contract', () => {
  it('keeps stable keys and labels for detail navigation', () => {
    const tabs: CRMDetailTab<'journey' | 'collab'>[] = [
      { key: 'journey', label: '全历程跟进记录' },
      { key: 'collab', label: '跨模块联动协作状态' }
    ];
    expect(tabs.map((tab) => tab.key)).toEqual(['journey', 'collab']);
    expect(tabs[1].label).toContain('协作');
  });
});
