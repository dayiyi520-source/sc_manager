import type { OkrRecord } from './okrRepository';

export function restoreReturnedInitialDraft(record: OkrRecord): OkrRecord {
  if (record.kind !== 'objective' || record.changeRequest?.purpose !== 'initial' || record.changeRequest.status !== 'returned'
    || !['submitted', 'returned'].includes(record.status)) return record;
  return { ...record, status: 'draft', payload: record.changeRequest.payload };
}
