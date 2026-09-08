import React from 'react';

export interface CRMDetailTab<TKey extends string> {
  key: TKey;
  label: string;
}

export const CRMDetailTabs = <TKey extends string>({ tabs, activeKey, onChange }: { tabs: CRMDetailTab<TKey>[]; activeKey: TKey; onChange: (key: TKey) => void }) => (
  <div className="flex gap-4 overflow-x-auto border-b border-[var(--border-main)]" role="tablist">
    {tabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={activeKey === tab.key} onClick={() => onChange(tab.key)} className={`shrink-0 border-b-2 pb-2 font-semibold ${activeKey === tab.key ? 'border-[var(--primary)] text-[var(--active-text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>{tab.label}</button>)}
  </div>
);
