import React from 'react';
import type { FollowUpRecord } from '../../types';

const formatTime = (value?: string) => {
  if (!value) return '未填写时间';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
};

export const CRMFollowupTimeline: React.FC<{ records: FollowUpRecord[]; emptyText?: string }> = ({ records, emptyText = '暂无跟进记录' }) => (
  <section className="space-y-3">
    <h3 className="text-sm font-semibold text-[var(--text-primary)]">跟进记录</h3>
    {records.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border-main)] p-6 text-center text-xs text-[var(--text-muted)]">{emptyText}</div> :
      <ol className="divide-y divide-[var(--border-main)]">
        {records.slice().sort((a, b) => formatTime(b.followTime || b.date).localeCompare(formatTime(a.followTime || a.date))).map((record) => (
          <li key={record.id} className="relative py-4 first:pt-0 last:pb-0">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--primary)] align-middle" />
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-semibold text-[var(--active-text)]">{record.followType || record.method || '跟进'}</span>
              {record.assistanceType && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">{record.assistanceType}</span>}
              <time className="ml-auto text-[var(--text-muted)]">{formatTime(record.followTime || record.date)}</time>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-primary)]">{record.content}</p>
            {record.productLines?.length ? <p className="mt-1 text-xs text-[var(--text-muted)]">产品线：{record.productLines.join('、')}</p> : null}
            {record.feedback && <p className="mt-1 text-xs text-[var(--text-body)]">反馈：{record.feedback}</p>}
          </li>
        ))}
      </ol>}
  </section>
);
