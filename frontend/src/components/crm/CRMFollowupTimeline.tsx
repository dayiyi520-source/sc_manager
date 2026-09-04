import React from 'react';
import type { FollowUpRecord } from '../../types';

const formatTime = (value?: string) => {
  if (!value) return '未填写时间';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
};

export const CRMFollowupTimeline: React.FC<{ records: FollowUpRecord[]; emptyText?: string }> = ({ records, emptyText = '暂无跟进记录' }) => (
  <section className="space-y-3">
    <h3 className="text-xl font-semibold text-[var(--text-primary)]">跟进记录</h3>
    {records.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border-main)] p-6 text-center text-xs text-[var(--text-muted)]">{emptyText}</div> :
      <ol className="relative space-y-6 py-2 before:absolute before:bottom-0 before:left-1/2 before:top-0 before:w-px before:bg-[var(--border-main)]">
        {records.slice().sort((a, b) => formatTime(b.followTime || b.date).localeCompare(formatTime(a.followTime || a.date))).map((record) => (
          <li key={record.id} className="relative grid grid-cols-2 gap-8">
            <span className="absolute left-1/2 top-4 z-10 h-8 w-8 -translate-x-1/2 rounded-full border-4 border-[var(--bg-surface)] bg-emerald-500" />
            <div className="col-start-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-[var(--active-text)]">{record.followType || record.method || '跟进'}</span>
              {record.assistanceType && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">{record.assistanceType}</span>}
              <time className="ml-auto text-[var(--text-muted)]">{formatTime(record.followTime || record.date)}</time>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-[var(--text-body)]">{record.content}</p>
            {record.productLines?.length ? <p className="mt-1 text-xs text-[var(--text-muted)]">产品线：{record.productLines.join('、')}</p> : null}
            {record.feedback && <p className="mt-1 text-xs text-[var(--text-body)]">反馈：{record.feedback}</p>}
            </div>
          </li>
        ))}
      </ol>}
  </section>
);
