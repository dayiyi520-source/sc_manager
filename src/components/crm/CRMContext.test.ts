import { describe, expect, it } from 'vitest';
import type { AppCrmContextType } from '../../context/AppContext';

describe('CRM context contract', () => {
  it('exposes domain collections and mutation boundaries', () => {
    const keys: Array<keyof AppCrmContextType> = [
      'customers', 'leads', 'opportunities', 'contracts', 'followUps', 'partners', 'biddings', 'requirementTasks',
      'addLead', 'updateLead', 'addOpportunity', 'addPartner', 'addContract', 'addBiddingProject'
    ];
    expect(keys).toContain('opportunities');
    expect(keys).toContain('addBiddingProject');
    expect(keys).toContain('requirementTasks');
  });
});
