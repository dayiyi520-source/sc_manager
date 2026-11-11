// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { loadInvoiceLedger, saveInvoiceLedger } from './invoiceLedgerRepository';

afterEach(() => localStorage.clear());

it('saves and reloads invoice ledger records and related finance state', () => {
  const snapshot = {
    invoices: [{ id: 'invoice-1', invoiceNo: 'FP-001', type: '销项', amount: 1200, taxRate: '6%', status: '待审批' }],
    paymentSchedules: [{ id: 'stage-1', stageName: '验收款', amount: 1000, invoicedAmount: 1200 }],
    invoiceApprovals: [{ id: 'approval-1', invoiceId: 'invoice-1', reason: '超额说明', status: '待审批' }],
    taxProfiles: [{ id: 'profile-1', companyName: '测试抬头', taxId: '123', bankName: '', bankAccount: '', addressPhone: '' }],
    supplierOptions: ['测试供应商']
  } as unknown as ReturnType<typeof loadInvoiceLedger>;

  saveInvoiceLedger(snapshot);

  expect(loadInvoiceLedger()).toEqual(snapshot);
});

it('seeds and persists mock invoices, profiles, suppliers, and payment stages on first load', () => {
  const ledger = loadInvoiceLedger();

  expect(ledger.invoices).toHaveLength(4);
  expect(ledger.taxProfiles).toHaveLength(2);
  expect(ledger.supplierOptions).toHaveLength(2);
  expect(ledger.paymentSchedules[0]).toMatchObject({ id: 'demo-stage-contract-1-stage-2', invoicedAmount: 768000 });
  expect(loadInvoiceLedger()).toEqual(ledger);
});

it('recovers demo ledger data from malformed stored data', () => {
  localStorage.setItem('shichuang.frontend.mock.invoiceLedger', '{');

  expect(loadInvoiceLedger().invoices).toHaveLength(4);
});
