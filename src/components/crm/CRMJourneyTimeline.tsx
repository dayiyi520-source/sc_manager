import React from 'react';
import { RotateCw, Clock3 } from '@/components/common/octicons-compat';
import { useQuery } from '@tanstack/react-query';
import { crmRepository } from '../../services/crmRepository';
import type { CrmJourneyEvent } from '../../types';

export const CRMJourneyTimeline: React.FC<{ filters: Record<string, string | number>; title?: string }> = ({ filters, title = '业务历程' }) => {
  const query = useQuery({ queryKey: ['crm', 'journey', filters], queryFn: () => crmRepository.journey({ ...filters, page: 1, pageSize: 100 }) });
  const formatTime = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
  };
  const events: CrmJourneyEvent[] = query.data?.items || [];
  return <section className="space-y-3" aria-live="polite">
    <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>{query.isFetching && <Clock3 className="h-4 w-4 animate-pulse text-[var(--active-text)]" />}</div>
    {query.isError ? <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-muted)]"><p>历程加载失败，请重试。</p><button type="button" onClick={() => void query.refetch()} className="mt-2 inline-flex items-center gap-1 text-[var(--active-text)]"><RotateCw className="h-3.5 w-3.5" />重试</button></div> : null}
    {!query.isError && query.isLoading ? <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-6 text-center text-xs text-[var(--text-muted)]">正在加载历程…</div> : null}
    {!query.isError && !query.isLoading && events.length === 0 ? <div className="rounded-lg border border-dashed border-[var(--border-main)] p-6 text-center text-xs text-[var(--text-muted)]">暂无关联历程</div> : null}
    {events.length > 0 ? <ol className="relative ml-2 border-l border-[var(--border-main)] pl-5">{events.map((event) => <li key={event.id} className="relative pb-5 last:pb-0"><span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--primary)] ring-4 ring-[var(--bg-card)]" /><div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="font-semibold text-[var(--active-text)]">{event.eventType}</span>{event.status && <span className="text-[var(--text-muted)]">{event.status}</span>}<time className="ml-auto text-[var(--text-muted)]">{formatTime(event.occurredAt)}</time></div><p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{event.title}</p>{event.description && <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--text-body)]">{event.description}</p>}</li>)}</ol> : null}
  </section>;
};
