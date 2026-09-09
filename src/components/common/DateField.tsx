import React, { useRef } from 'react';
import { Calendar } from './octicons-compat';

export const DateField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}> = ({ label, value, onChange, required = false, disabled = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return <div className="block text-xs leading-5 text-[var(--text-muted)]"><label className="block">{label}{required && ' *'}</label><span className="group relative mt-1 block h-8"><span className={`pointer-events-none absolute inset-0 flex items-center justify-between rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] px-3 ${value ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} ${disabled ? 'opacity-60' : 'group-hover:border-[var(--border-subtle)]'}`}><span className="truncate text-xs leading-5">{value || '请选择日期'}</span><Calendar className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100" /></span><input ref={inputRef} type="date" value={value} onChange={(event) => onChange(event.target.value)} onClick={() => inputRef.current?.showPicker?.()} aria-label={label} required={required} disabled={disabled} className="absolute inset-0 h-8 w-full cursor-pointer rounded-lg border border-transparent bg-transparent text-transparent opacity-0 outline-none disabled:cursor-not-allowed" /></span></div>;
};
