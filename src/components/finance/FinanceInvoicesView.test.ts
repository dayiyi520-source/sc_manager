import { describe, expect, it } from 'vitest';
import { evaluateInvoiceApproval } from './FinanceInvoicesView';

describe('invoice approval rules', () => {
  it('requires approval when a sales invoice exceeds the stage balance', () => {
    expect(evaluateInvoiceApproval({ invoiceType: '销项发票', requestedAmount: 1200, scheduleAmount: 1000, invoicedAmount: 200 })).toEqual({
      availableAmount: 800,
      overAmount: 400,
      needsApproval: true
    });
  });

  it('does not require approval for an input invoice', () => {
    expect(evaluateInvoiceApproval({ invoiceType: '进项发票', requestedAmount: 1200, scheduleAmount: 1000, invoicedAmount: 200 }).needsApproval).toBe(false);
  });
});
