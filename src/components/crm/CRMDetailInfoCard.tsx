import React from 'react';

export interface CRMDetailField {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}

export const CRMDetailInfoCard: React.FC<{ fields: CRMDetailField[]; className?: string }> = ({ fields, className = '' }) => (
  <div className={`grid grid-cols-2 gap-4 rounded-xl bg-[var(--bg-elevated)] p-4 ${className}`}>
    {fields.map((field) => (
      <div key={field.label} className={field.wide ? 'col-span-2' : ''}>
        <span className="block text-[var(--text-muted)]">{field.label}</span>
        <div className="mt-1 font-semibold text-[var(--text-primary)]">{field.value || '未填写'}</div>
      </div>
    ))}
  </div>
);
