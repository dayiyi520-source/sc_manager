import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from './octicons-compat';

export type SearchableSelectProps = {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  emptyText?: string;
  clearable?: boolean;
  multiple?: boolean;
  selectedValues?: string[];
  onChangeMultiple?: (values: string[]) => void;
  compact?: boolean;
  hideLabel?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  options,
  placeholder = '请选择',
  onChange,
  required = false,
  disabled = false,
  error,
  emptyText = '没有匹配项',
  clearable = false,
  multiple = false,
  selectedValues = [],
  onChangeMultiple,
  compact = false,
  hideLabel = false,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedOptions = useMemo(() => Array.from(new Set(options.filter(Boolean))), [options]);
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedOptions.filter((option) => option.toLocaleLowerCase().includes(normalizedQuery)).slice(0, 8);
  }, [normalizedOptions, query]);
  const currentValues = multiple ? selectedValues : value ? [value] : [];
  const open = controlledOpen ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const openMenu = () => {
    if (!disabled) {
      setQuery('');
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className="relative text-xs">
      {!hideTrigger && <label className="block text-[var(--text-muted)]">
        {!hideLabel && <span>{label}{required && ' *'}</span>}
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          onClick={openMenu}
          className={`${hideLabel ? '' : 'mt-1'} flex h-8 w-full items-center justify-between rounded-lg border bg-[var(--bg-surface)] px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${error ? 'border-red-500' : 'border-[var(--border-main)]'} ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-[var(--border-strong)]'} ${currentValues.length ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
        >
          {compact && multiple && currentValues.length > 0 ? <span className="flex min-w-0 flex-1 flex-wrap gap-1 py-1">
            {currentValues.map((selectedValue) => <span key={selectedValue} className="group/chip inline-flex max-w-32 items-center gap-1 rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-[var(--active-text)]">
              <span className="max-w-[3em] truncate" title={selectedValue}>{selectedValue}</span>
              <span role="button" aria-label={`移除${selectedValue}`} onClick={(event) => { event.stopPropagation(); onChangeMultiple?.(currentValues.filter((item) => item !== selectedValue)); }} className="opacity-0 transition-opacity group-hover/chip:opacity-100"><X className="h-3 w-3" /></span>
            </span>)}
          </span> : <span className="min-w-0 truncate">{multiple && currentValues.length > 0 ? `已选择 ${currentValues.length} 项` : value || placeholder}</span>}
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </label>}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] shadow-xl">
          <div className="dropdown-search-row flex h-9 items-center gap-2 border-b border-[var(--border-main)] px-2.5">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入关键词搜索"
              className="app-dropdown-search h-8 min-w-0 flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
            {query && <button type="button" aria-label="清除搜索" onClick={() => setQuery('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X className="h-4 w-4" /></button>}
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {clearable && (multiple ? currentValues.length > 0 : value) && <button type="button" onClick={() => { multiple ? onChangeMultiple?.([]) : onChange(''); setOpen(false); }} className="flex w-full items-center rounded-md px-3 py-2 text-left text-[var(--text-muted)] hover:bg-[var(--bg-surface-soft)]">暂不关联</button>}
            {filteredOptions.length === 0 ? <p className="px-3 py-4 text-center text-[var(--text-muted)]">{emptyText}</p> : filteredOptions.map((option) => (
              <button type="button" key={option} onClick={() => {
                if (multiple) {
                  const nextValues = currentValues.includes(option) ? currentValues.filter((item) => item !== option) : [...currentValues, option];
                  onChangeMultiple?.(nextValues);
                } else {
                  onChange(option);
                  setOpen(false);
                }
                setQuery('');
              }} className="dropdown-menu-option flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-surface-soft)]">
                <span className="min-w-0 truncate">{option}</span>
                {currentValues.includes(option) && <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />}
              </button>
            ))}
          </div>
        </div>
      )}
      {multiple && !compact && currentValues.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">
        {currentValues.map((selectedValue) => <span key={selectedValue} className="inline-flex max-w-full items-center gap-1 rounded-md bg-[var(--bg-surface-soft)] px-2 py-1 text-[var(--text-body)]">
          <span className="max-w-[240px] truncate">{selectedValue}</span>
          <button type="button" aria-label={`移除${selectedValue}`} onClick={() => onChangeMultiple?.(currentValues.filter((item) => item !== selectedValue))}><X className="h-3 w-3" /></button>
        </span>)}
      </div>}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
};
