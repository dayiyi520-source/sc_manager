import React, { useEffect } from 'react';
import { X } from '@/components/common/octicons-compat';

export const WorkItemCreatePanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  properties?: React.ReactNode;
  editor?: React.ReactNode;
  footer?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  showContinueOption?: boolean;
  presentation?: 'workspace' | 'drawer';
}> = ({ isOpen, onClose, title, children, properties, editor, footer, secondaryAction, showContinueOption = true, presentation = 'workspace' }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="关闭面板" className="absolute inset-0 h-full w-full cursor-default bg-black/40" onClick={onClose} />
      <aside className={`work-item-panel ${presentation === 'drawer' ? 'absolute inset-y-0 right-0 flex w-[min(100%,1280px)] flex-col overflow-hidden border-l border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-body)] shadow-2xl' : 'absolute inset-4 flex flex-col overflow-hidden rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-body)] shadow-2xl sm:inset-6 lg:inset-y-[clamp(32px,8vh,96px)] lg:inset-x-[clamp(32px,10vw,192px)]'}`}>
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-card)] px-6">
          <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="关闭" className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto"><div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_320px]"> <main className="min-w-0 px-8 py-6">{editor || children}</main>{properties && <aside className="border-l border-[var(--border-main)] bg-[var(--bg-card)] px-6 py-6 lg:sticky lg:top-0 lg:self-start lg:max-h-full" aria-label="字段设置">{properties}</aside>}</div></div>
        {footer && <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--border-main)] bg-[var(--bg-card)] px-6 py-3">{showContinueOption && <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" />继续新建下一个</label>}<span className="flex-1" />{secondaryAction}{footer}</footer>}
      </aside>
    </div>
  );
};
