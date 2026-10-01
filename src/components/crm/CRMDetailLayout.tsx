import React from 'react';

export const CRMDetailLayout: React.FC<{
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  showHeader?: boolean;
  children: React.ReactNode;
}> = ({ title, subtitle, onBack, backLabel = '返回列表', actions, tabs, showHeader = true, children }) => (
  <section className="space-y-5 text-xs animate-in fade-in duration-150">
    {showHeader && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-main)] pb-4">
      <div className="flex min-w-0 items-center gap-3">
        {onBack && <button type="button" onClick={onBack} className="shrink-0 rounded-md border border-[var(--border-main)] px-2.5 py-1.5 text-[var(--text-muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--active-text)]">{backLabel}</button>}
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {actions}
    </div>}
    {tabs}
    <div className="space-y-5">{children}</div>
  </section>
);
