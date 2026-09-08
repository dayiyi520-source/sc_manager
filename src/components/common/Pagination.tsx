import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export const Pagination: React.FC<{
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}> = ({ total, page, pageSize, onPageChange, onPageSizeChange }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-main)] px-4 py-3 text-xs text-[var(--text-muted)]">
    <span>共 {total} 条，第 {currentPage} / {pageCount} 页</span>
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2">每页
        <select aria-label="每页条数" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="app-control h-8 px-2 text-xs">
          {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
        </select> 条
      </label>
      <button type="button" aria-label="上一页" disabled={currentPage <= 1} onClick={() => onPageChange(Math.max(1, currentPage - 1))} className="app-button-secondary inline-flex h-8 items-center gap-1 px-2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeftIcon size={14} />上一页</button>
      <button type="button" aria-label="下一页" disabled={currentPage >= pageCount} onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))} className="app-button-secondary inline-flex h-8 items-center gap-1 px-2 disabled:cursor-not-allowed disabled:opacity-40">下一页<ChevronRightIcon size={14} /></button>
    </div>
  </div>;
};
