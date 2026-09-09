import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from '@/components/common/octicons-compat';

type InlineEditableSelectProps = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  tone?: 'default' | 'status';
};

export const InlineEditableSelect: React.FC<InlineEditableSelectProps> = ({ value, options, onChange, placeholder = '未设置', searchable = true, tone = 'default' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const filteredOptions = useMemo(() => options.filter((option) => option.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [options, query]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const height = Math.min(300, Math.max(80, filteredOptions.length * 32 + (searchable ? 36 : 0)));
      const top = rect.bottom + height > window.innerHeight && rect.top > height ? rect.top - height - 4 : rect.bottom + 4;
      setMenuStyle({ position: 'fixed', left: rect.left, width: Math.max(176, rect.width), top: Math.max(8, top), zIndex: 1200 });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => { window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true); };
  }, [open, filteredOptions.length, searchable]);

  return <div ref={rootRef} className="relative min-w-28" onClick={(event) => event.stopPropagation()}>
    <button ref={triggerRef} type="button" onClick={() => setOpen((current) => !current)} className={`inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-left transition-colors ${tone === 'status' ? 'bg-[var(--bg-surface-soft)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)]'}`} aria-expanded={open}>
      <span className="max-w-36 truncate">{value || placeholder}</span>
      <ChevronDown className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
    </button>
    {open && createPortal(<div style={menuStyle} className="overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] shadow-xl">
      {searchable && <label className="dropdown-search-row relative flex h-9 items-center gap-2 border-b border-[var(--border-main)] px-2.5"><Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入关键词搜索" className="app-dropdown-search min-w-0 flex-1 bg-transparent text-xs text-[var(--text-body)] outline-none placeholder:text-[var(--text-muted)]" /></label>}
      <div className="max-h-56 overflow-y-auto">
        {filteredOptions.length ? filteredOptions.map((option) => {
          const disabledStatus = tone === 'status' && options.indexOf(option) < options.indexOf(value);
          return <button type="button" key={option} disabled={disabledStatus} title={disabledStatus ? '状态不可逆，只能向后推进' : undefined} onClick={() => { if (disabledStatus) return; onChange(option); setOpen(false); setQuery(''); }} className={`dropdown-menu-option flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)] ${disabledStatus ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : ''}`}><span className="truncate">{option}</span>{option === value && <Check className="h-3.5 w-3.5 text-[var(--primary)]" />}</button>;
        }) : <p className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">暂无匹配数据</p>}
      </div>
    </div>, document.body)}
  </div>;
};
