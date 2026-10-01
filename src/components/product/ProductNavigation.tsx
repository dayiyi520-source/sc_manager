import React, { useState } from 'react';
import { Input } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { ChevronLeft, ChevronRight, Search } from '@/components/common/octicons-compat';

type ProductNavigationProps = {
  productLines: Array<{ id: string; name: string; code?: string }>;
  value: string;
  onChange: (value: string) => void;
};

export const ProductNavigation: React.FC<ProductNavigationProps> = ({ productLines, value, onChange }) => {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const keyword = query.trim().toLowerCase();
  const items = productLines.filter((line) => !keyword || `${line.name} ${line.code || ''}`.toLowerCase().includes(keyword));

  return (
    <aside role="navigation" className={`flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-xs transition-[width] ${collapsed ? 'w-16' : 'w-56'}`} aria-label="产品导航栏">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-main)] bg-[var(--bg-surface-soft)] px-3">
        {!collapsed && <span className="font-semibold text-[var(--text-primary)]">产品</span>}
        <button type="button" aria-label={collapsed ? '展开产品导航栏' : '收起产品导航栏'} onClick={() => setCollapsed((current) => !current)} className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--primary)]">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      {!collapsed && <div className="shrink-0 border-b border-[var(--border-main)] p-3"><Input aria-label="搜索产品" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索产品" prefix={<Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />} allowClear /></div>}
      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <button type="button" aria-current={value === 'all' ? 'page' : undefined} aria-label="全部产品" title="全部产品" onClick={() => onChange('all')} className={`mb-1 flex h-9 w-full items-center rounded-md text-left transition ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'} ${value === 'all' ? 'bg-[var(--primary)]/10 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)]'}`}>
          <ApartmentOutlined className="shrink-0" />{!collapsed && <span className="truncate font-semibold">全部</span>}
        </button>
        {items.map((line) => <button type="button" key={line.id} aria-current={value === line.id ? 'page' : undefined} aria-label={`产品：${line.name}`} title={line.name} onClick={() => onChange(line.id)} className={`mb-1 flex h-9 w-full items-center rounded-md text-left transition ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'} ${value === line.id ? 'bg-[var(--primary)]/10 text-[var(--active-text)]' : 'text-[var(--text-body)] hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)]'}`}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--bg-surface-soft)] font-mono text-[11px] font-semibold">{line.name.slice(0, 1)}</span>{!collapsed && <span className="truncate">{line.name}</span>}
        </button>)}
        {!collapsed && items.length === 0 && <p className="px-3 py-6 text-center text-[var(--text-muted)]">暂无匹配产品</p>}
      </nav>
    </aside>
  );
};
