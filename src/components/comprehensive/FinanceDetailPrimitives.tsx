import React from 'react';

export interface FinanceDetailValue {
  label: string;
  value?: React.ReactNode;
  emphasis?: boolean;
  wide?: boolean;
}

export function FinanceDetailMetrics({ items }: { items: FinanceDetailValue[] }) {
  return <dl className="finance-detail-metrics">{items.map((item) => <div className="finance-detail-metric" key={item.label}>
    <dt>{item.label}</dt>
    <dd>{item.value ?? '—'}</dd>
  </div>)}</dl>;
}

export function FinanceDetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="finance-detail-section">
    <h3>{title}</h3>
    {children}
  </section>;
}

export function FinanceDetailFields({ items }: { items: FinanceDetailValue[] }) {
  return <dl className="finance-detail-fields">{items.map((item) => <div className={item.wide ? 'is-wide' : undefined} key={item.label}>
    <dt>{item.label}</dt>
    <dd className={item.emphasis ? 'is-emphasis' : undefined}>{item.value ?? '—'}</dd>
  </div>)}</dl>;
}
