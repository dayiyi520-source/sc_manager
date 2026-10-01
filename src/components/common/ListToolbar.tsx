import React from 'react';
import { SearchIcon } from '@primer/octicons-react';

export const ListToolbar: React.FC<{
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  searchPosition?: 'left' | 'right';
}> = ({ searchValue, onSearchChange, searchPlaceholder = '搜索', filters, actions, children, searchPosition = 'right' }) => {
  const search = onSearchChange ? <div className="relative"><SearchIcon size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" /><input value={searchValue || ''} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="app-control h-10 w-64 pl-8 pr-3 text-xs" /></div> : null;
  return <div className="list-toolbar flex flex-col gap-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{searchPosition === 'left' && search}{children}{filters}{searchPosition === 'right' && search}</div>
    <div className="flex shrink-0 items-center gap-2">{actions}</div>
  </div>;
}
