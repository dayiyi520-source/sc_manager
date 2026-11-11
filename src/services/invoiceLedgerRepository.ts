import type { InvoiceApprovalRecord, InvoiceRecord, PaymentSchedule, TaxProfile } from '../types';
import {
  DEMO_APPROVALS_SNAPSHOT,
  DEMO_INVOICES_SNAPSHOT,
  DEMO_PAYMENT_SCHEDULES_SNAPSHOT,
  DEMO_SUPPLIERS_SNAPSHOT,
  DEMO_TAX_PROFILES_SNAPSHOT
} from './invoiceLedgerDemoData';

const STORAGE_KEY = 'shichuang.frontend.mock.invoiceLedger';

export interface InvoiceLedgerSnapshot {
  invoices: InvoiceRecord[];
  paymentSchedules: PaymentSchedule[];
  invoiceApprovals: InvoiceApprovalRecord[];
  taxProfiles: TaxProfile[];
  supplierOptions: string[];
}

const emptySnapshot = (): InvoiceLedgerSnapshot => ({
  invoices: [],
  paymentSchedules: [],
  invoiceApprovals: [],
  taxProfiles: [],
  supplierOptions: []
});

const demoSnapshot = (): InvoiceLedgerSnapshot => ({
  invoices: DEMO_INVOICES_SNAPSHOT.map((invoice) => ({ ...invoice })),
  paymentSchedules: DEMO_PAYMENT_SCHEDULES_SNAPSHOT.map((schedule) => ({ ...schedule })),
  invoiceApprovals: DEMO_APPROVALS_SNAPSHOT.map((approval) => ({ ...approval })),
  taxProfiles: DEMO_TAX_PROFILES_SNAPSHOT.map((profile) => ({ ...profile })),
  supplierOptions: [...DEMO_SUPPLIERS_SNAPSHOT]
});

export function loadInvoiceLedger(): InvoiceLedgerSnapshot {
  if (typeof localStorage === 'undefined') return emptySnapshot();
  const value = localStorage.getItem(STORAGE_KEY);
  if (!value) {
    const initial = demoSnapshot();
    try { saveInvoiceLedger(initial); } catch { /* Keep the initial demo available for this session. */ }
    return initial;
  }
  try {
    const parsed = JSON.parse(value) as Partial<InvoiceLedgerSnapshot>;
    return {
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : DEMO_INVOICES_SNAPSHOT.map((invoice) => ({ ...invoice })),
      paymentSchedules: Array.isArray(parsed.paymentSchedules) ? parsed.paymentSchedules : DEMO_PAYMENT_SCHEDULES_SNAPSHOT.map((schedule) => ({ ...schedule })),
      invoiceApprovals: Array.isArray(parsed.invoiceApprovals) ? parsed.invoiceApprovals : DEMO_APPROVALS_SNAPSHOT.map((approval) => ({ ...approval })),
      taxProfiles: Array.isArray(parsed.taxProfiles) ? parsed.taxProfiles : DEMO_TAX_PROFILES_SNAPSHOT.map((profile) => ({ ...profile })),
      supplierOptions: Array.isArray(parsed.supplierOptions) ? parsed.supplierOptions : [...DEMO_SUPPLIERS_SNAPSHOT]
    };
  } catch {
    const initial = demoSnapshot();
    try { saveInvoiceLedger(initial); } catch { /* Keep the initial demo available for this session. */ }
    return initial;
  }
}

export function saveInvoiceLedger(snapshot: InvoiceLedgerSnapshot): void {
  if (typeof localStorage === 'undefined') throw new Error('当前环境不支持保存发票台账');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
