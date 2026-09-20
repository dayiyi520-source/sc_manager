import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { EmployeeOption } from '../../types';
import { formatEmployeeOptionLabel } from '../common/PersonIdentity';
import './WorkflowAssigneeSelect.css';

type Props = {
  label: string;
  value: string;
  options: Array<string | EmployeeOption>;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function WorkflowAssigneeSelect({ label, value, options, placeholder, onChange, disabled = false }: Props) {
  const id = useId();
  const anchorName = `--workflow-owner-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = value.trim().toLocaleLowerCase();
  const normalizedOptions = Array.from(new Map(options.map((option) => {
    const name = typeof option === 'string' ? option : option.name;
    const label = typeof option === 'string' ? option : formatEmployeeOptionLabel(option);
    return [name, { name, label }];
  })).values());
  const filtered = normalizedOptions.filter(option => option.label.toLocaleLowerCase().includes(query)).slice(0, 8);
  const supportsFloating = typeof HTMLElement !== 'undefined'
    && typeof HTMLElement.prototype.showPopover === 'function'
    && typeof CSS !== 'undefined' && CSS.supports('position-anchor', '--owner');
  const expanded = open && !disabled && supportsFloating;

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!expanded || !menu) return;
    menu.showPopover();
    return () => { if (menu.isConnected) menu.hidePopover(); };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !inputRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [expanded]);

  const openMenu = () => { setActiveIndex(-1); setOpen(true); };
  const selectOption = (option: { name: string }) => { onChange(option.name); setOpen(false); setActiveIndex(-1); };
  const fieldClass = 'mt-1 h-10 w-full rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors hover:border-[var(--border-subtle)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50';

  if (!supportsFloating) return <label className="block text-xs text-[var(--text-muted)]">{label}
    <select value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className={fieldClass}>
      <option value="">{placeholder || '请选择负责人'}</option>
      {normalizedOptions.map(option => <option key={option.name} value={option.name}>{option.label}</option>)}
    </select>
  </label>;

  return <>
    <label htmlFor={id} className="block text-xs text-[var(--text-muted)]">{label}
      <input
        id={id}
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? `${id}-options` : undefined}
        aria-activedescendant={expanded && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        style={{ anchorName }}
        className={fieldClass}
        onFocus={openMenu}
        onClick={() => { if (!open) openMenu(); }}
        onBlur={() => setOpen(false)}
        onChange={event => { onChange(event.target.value); openMenu(); }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setActiveIndex(index => {
              if (!filtered.length) return -1;
              if (index < 0) return event.key === 'ArrowDown' ? 0 : filtered.length - 1;
              return (index + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length;
            });
          }
          if (event.key === 'Enter' && expanded) {
            event.preventDefault();
            if (filtered[activeIndex]) selectOption(filtered[activeIndex]);
          }
        }}
      />
    </label>
    {expanded && createPortal(
      <div
        id={`${id}-options`}
        ref={menuRef}
        popover="manual"
        role="listbox"
        aria-label={label}
        style={{ positionAnchor: anchorName }}
        className="workflow-assignee-menu rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1 text-xs text-[var(--text-primary)] shadow-lg"
        onMouseDown={event => event.preventDefault()}
      >
        {filtered.length ? filtered.map((option, index) => <button
          key={option.name}
          id={`${id}-option-${index}`}
          type="button"
          role="option"
          aria-selected={value === option.name}
          tabIndex={-1}
          onClick={() => selectOption(option)}
          className={`block w-full break-words px-3 py-2 text-left transition-colors hover:bg-[var(--bg-surface-soft)] active:bg-[var(--bg-card)] ${activeIndex === index ? 'bg-[var(--bg-surface-soft)]' : ''}`}
        >{option.label}</button>) : <p role="status" className="px-3 py-2 text-[var(--text-muted)]">暂无匹配负责人</p>}
      </div>, document.body,
    )}
  </>;
}
