import React, { useEffect, useRef } from 'react';
import { Drawer } from 'antd';
import { X } from '@/components/common/octicons-compat';
import { PersonAvatar } from '../common/PersonIdentity';

export const WorkItemDetailHeader: React.FC<{
  title: string;
  titleEditable?: boolean;
  onTitleSave?: (title: string) => void;
  creatorName?: string;
  createdAt?: string;
  updaterName?: string;
  updatedAt?: string;
}> = ({ title, titleEditable = false, onTitleSave, creatorName, createdAt, updaterName, updatedAt }) => {
  const [draft, setDraft] = React.useState(title);
  const [editing, setEditing] = React.useState(false);
  const cancelled = useRef(false);
  useEffect(() => setDraft(title), [title]);
  const commit = () => {
    if (cancelled.current) { cancelled.current = false; return; }
    const next = draft.trim();
    setEditing(false);
    if (next && next !== title) onTitleSave?.(next);
  };
  const formatDate = (value?: string) => {
    if (!value) return '未设置';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
  };
  const creator = creatorName || '未设置';
  const updater = updaterName || creatorName || '未设置';
  return <header className="mb-6 border-b border-[var(--border-main)] pb-5">
    {editing && titleEditable ? <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') commit(); if (event.key === 'Escape') { cancelled.current = true; setDraft(title); setEditing(false); } }} className="h-10 w-full rounded-lg border border-[var(--primary)] bg-[var(--bg-surface)] px-3 text-xl font-semibold text-[var(--text-primary)] outline-none ring-2 ring-[var(--primary)]/20" /> : <button type="button" disabled={!titleEditable} onClick={() => titleEditable && setEditing(true)} className={`block w-full text-left text-xl font-semibold leading-8 text-[var(--text-primary)] ${titleEditable ? 'cursor-text rounded-md hover:bg-[var(--bg-surface-soft)]' : 'cursor-default'}`}>{title || '未设置'}</button>}
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
      <span className="inline-flex items-center gap-2"><PersonAvatar name={creator} size={24} /><span>{creator}</span><span>{formatDate(createdAt)} 创建</span></span>
      <span className="inline-flex items-center gap-2"><PersonAvatar name={updater} size={24} /><span>{updater}</span><span>{formatDate(updatedAt || createdAt)} 更新</span></span>
    </div>
  </header>;
};

export const WorkItemAssociationHint: React.FC<{ label: string; description: string }> = ({ label, description }) => (
  <section className="rounded-lg border border-dashed border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3 py-2">
    <span className="block text-xs font-medium text-[var(--text-primary)]">{label}</span>
    <span className="mt-1 block text-xs text-[var(--text-muted)]">{description}</span>
  </section>
);

export const WorkItemRelationTabs: React.FC<{
  items: Array<{ key: string; label: string; count?: number; description: string; content?: React.ReactNode }>;
}> = ({ items }) => {
  const [activeKey, setActiveKey] = React.useState(items[0]?.key || '');
  useEffect(() => {
    if (!items.some((item) => item.key === activeKey)) setActiveKey(items[0]?.key || '');
  }, [activeKey, items]);
  const active = items.find((item) => item.key === activeKey) || items[0];
  if (!items.length || !active) return null;
  return <section className="mt-5 border-b border-[var(--border-main)]">
    <div className="flex min-w-0 flex-wrap gap-x-6 border-b border-[var(--border-main)]">
      {items.map((item) => <button key={item.key} type="button" onClick={() => setActiveKey(item.key)} className={`relative min-h-10 px-1 pb-2 text-xs font-medium transition-colors ${active.key === item.key ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
        {item.label}{typeof item.count === 'number' ? ` · ${item.count}` : ''}
        {active.key === item.key && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[var(--primary)]" />}
      </button>)}
    </div>
    <div className="py-4">{active.content || <WorkItemAssociationHint label={active.label} description={active.description} />}</div>
  </section>;
};

export const WorkItemCreatePanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  properties?: React.ReactNode;
  editor?: React.ReactNode;
  footer?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  detailHeader?: React.ReactNode;
  showContinueOption?: boolean;
  continueChecked?: boolean;
  onContinueCheckedChange?: (checked: boolean) => void;
  presentation?: 'workspace' | 'drawer';
}> = ({ isOpen, onClose, title, children, properties, editor, footer, secondaryAction, detailHeader, showContinueOption = true, continueChecked, onContinueCheckedChange, presentation = 'workspace' }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  if (presentation === 'drawer') {
    return <Drawer open onClose={onClose} title={title} size="min(1200px, 88vw)" destroyOnHidden footer={footer ? <div className="flex items-center gap-3">{secondaryAction}<span className="flex-1" />{footer}</div> : undefined}>
      <div className={properties ? 'work-item-panel-grid grid min-h-full lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]' : 'min-h-full'}><main className="min-w-0 px-2 py-2">{detailHeader}{editor || children}</main>{properties && <aside className="border-l border-[var(--border-main)] bg-[var(--bg-card)] px-6 py-6" aria-label="字段设置">{properties}</aside>}</div>
    </Drawer>;
  }
  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="关闭面板" className="absolute inset-0 h-full w-full cursor-default bg-black/40" onClick={onClose} />
      <aside className={`work-item-panel ${presentation === 'drawer' ? 'absolute inset-y-0 right-0 flex w-[min(100%,1280px)] flex-col overflow-hidden border-l border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-body)] shadow-2xl' : 'absolute inset-4 flex flex-col overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-body)] shadow-2xl sm:inset-6 lg:inset-y-8 lg:inset-x-[clamp(32px,10vw,192px)]'}`}>
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-card)] px-6">
          <h2 className="truncate text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="关闭" className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"><X className="h-5 w-5" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto"><div className={properties ? 'work-item-panel-grid grid min-h-full lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]' : 'min-h-full'}> <main className="min-w-0 px-6 py-4">{editor || children}</main>{properties && <aside className="border-l border-[var(--border-main)] bg-[var(--bg-card)] px-6 py-4 lg:sticky lg:top-0 lg:self-start lg:max-h-full" aria-label="字段设置">{properties}</aside>}</div></div>
        {footer && <footer className="flex shrink-0 items-center gap-3 border-t border-[var(--border-main)] bg-[var(--bg-card)] px-6 py-3">{showContinueOption && <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><input type="checkbox" checked={continueChecked} onChange={(event) => onContinueCheckedChange?.(event.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />继续新建下一个</label>}<span className="flex-1" />{secondaryAction}{footer}</footer>}
      </aside>
    </div>
  );
};
