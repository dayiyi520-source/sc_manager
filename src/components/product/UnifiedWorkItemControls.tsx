import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, DatePicker, Input, Popover, Select } from 'antd';
import dayjs from 'dayjs';
import { Check, Filter, List, Search } from '@/components/common/octicons-compat';

export type UnifiedFilterState = {
  title: string;
  status: string[];
  owner: string[];
  creator: string[];
  customer: string[];
  version: string[];
  cc: string[];
  createdAt: [string, string];
  plannedStartDate: [string, string];
  operators?: Partial<Record<'status' | 'owner' | 'creator' | 'customer' | 'version' | 'cc', 'include' | 'exclude'>>;
  dateOperators?: Partial<Record<'createdAt' | 'plannedStartDate', 'between' | 'equals' | 'after' | 'before'>>;
};

type Props = {
  searchOpen: boolean;
  searchDraft: string;
  ownerPickerOpen: boolean;
  ownerNames: string[];
  ownerOptions: string[];
  filterOpen: boolean;
  filters: UnifiedFilterState;
  groupOpen: boolean;
  groupQuery: string;
  groupBy: string;
  groupOptions: Array<[string, string]>;
  filterOptions: { status: string[]; owner: string[]; creator: string[]; customer: string[]; version: string[]; cc: string[] };
  onSearchOpenChange: (open: boolean) => void;
  onSearchDraftChange: (value: string) => void;
  onSearchApply: () => void;
  onOwnerPickerOpenChange: (open: boolean) => void;
  onOwnerNamesChange: (values: string[]) => void;
  onFilterOpenChange: (open: boolean) => void;
  onFiltersChange: (filters: UnifiedFilterState) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
  onGroupOpenChange: (open: boolean) => void;
  onGroupQueryChange: (value: string) => void;
  onGroupByChange: (value: string) => void;
  hideVersionFilter?: boolean;
  controlsOnly?: boolean;
  panelOnly?: boolean;
  extra?: React.ReactNode;
  filterPanelTarget?: HTMLElement | null;
};

const multiOptions = (values: string[]) => values.map((value) => ({ label: value, value }));

export const WorkItemGroupMenu: React.FC<{ query: string; groupBy: string; options: Array<[string, string]>; onQueryChange: (value: string) => void; onSelect: (key: string) => void }> = ({ query, groupBy, options, onQueryChange, onSelect }) => (
  <div className="w-48 space-y-2">
    <Input allowClear prefix={<Search className="h-4 w-4" />} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索分组字段" />
    {options.filter(([, label]) => label.includes(query.trim())).map(([key, label]) => <Button block style={{ justifyContent: 'flex-start', textAlign: 'left' }} type="text" key={key} onClick={() => onSelect(key)}>按{label}分组{groupBy === key && <Check className="ml-auto h-4 w-4" />}</Button>)}
    <Button block style={{ justifyContent: 'flex-start', textAlign: 'left' }} type="text" onClick={() => onSelect('none')}>取消分组{groupBy === 'none' && <Check className="ml-auto h-4 w-4" />}</Button>
  </div>
);

export const UnifiedWorkItemControls: React.FC<Props> = (props) => {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ((!props.searchOpen && !props.filterOpen) || props.controlsOnly || props.panelOnly) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !props.filterPanelTarget?.contains(event.target as Node) && !(event.target as Element).closest('.ant-select-dropdown, .ant-picker-dropdown')) {
        props.onSearchOpenChange(false);
        props.onOwnerPickerOpenChange(false);
        props.onFilterOpenChange(false);
      }
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [props.filterOpen, props.filterPanelTarget, props.onFilterOpenChange, props.onOwnerPickerOpenChange, props.onSearchOpenChange, props.searchOpen]);
  const setFilter = <K extends keyof UnifiedFilterState>(key: K, value: UnifiedFilterState[K]) => props.onFiltersChange({ ...props.filters, [key]: value });
  const multiRow = (label: string, key: 'status' | 'owner' | 'creator' | 'customer' | 'version' | 'cc') => (
    <div className="grid h-14 grid-cols-[96px_88px_minmax(0,1fr)] items-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)]">
      <div className="flex h-full items-center px-3 font-medium text-[var(--text-body)]">{label}</div>
      <div className="flex h-full items-center border-x border-[var(--border-main)]"><Select aria-label={`${label}过滤方式`} variant="borderless" value={props.filters.operators?.[key] || 'include'} onChange={(value) => props.onFiltersChange({ ...props.filters, operators: { ...props.filters.operators, [key]: value } })} options={[{ label: '包含', value: 'include' }, { label: '不包含', value: 'exclude' }]} className="w-full" /></div>
      <Select mode="multiple" showSearch optionFilterProp="label" allowClear value={props.filters[key]} onChange={(value) => setFilter(key, value)} options={multiOptions(props.filterOptions[key])} placeholder="请选择或输入关键字查询" variant="borderless" className="w-full px-2" />
    </div>
  );
  const dateRow = (label: '创建时间' | '计划开始时间', key: 'createdAt' | 'plannedStartDate') => (
    <div className="grid h-14 grid-cols-[96px_88px_minmax(0,1fr)] items-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)]">
      <div className="flex h-full items-center px-3 font-medium text-[var(--text-body)]">{label}</div>
      <div className="flex h-full items-center border-x border-[var(--border-main)]"><Select aria-label={`${label}过滤方式`} variant="borderless" value={props.filters.dateOperators?.[key] || 'between'} onChange={(value) => props.onFiltersChange({ ...props.filters, dateOperators: { ...props.filters.dateOperators, [key]: value } })} options={[{ label: '介于', value: 'between' }, { label: '等于', value: 'equals' }, { label: '大于', value: 'after' }, { label: '小于', value: 'before' }]} className="w-full" /></div>
      <div className={`grid items-center gap-2 px-2 ${(props.filters.dateOperators?.[key] || 'between') === 'between' ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1'}`}><DatePicker aria-label={`${label}开始`} variant="borderless" placeholder={(props.filters.dateOperators?.[key] || 'between') === 'between' ? '起始日期' : '选择日期'} className="w-full" value={props.filters[key][0] ? dayjs(props.filters[key][0]) : null} onChange={(date) => props.onFiltersChange({ ...props.filters, [key]: [date ? date.format('YYYY-MM-DD') : '', props.filters[key][1]] })} /><>{(props.filters.dateOperators?.[key] || 'between') === 'between' && <><span>-</span><DatePicker aria-label={`${label}结束`} variant="borderless" placeholder="结束日期" className="w-full" value={props.filters[key][1] ? dayjs(props.filters[key][1]) : null} onChange={(date) => props.onFiltersChange({ ...props.filters, [key]: [props.filters[key][0], date ? date.format('YYYY-MM-DD') : ''] })} /></>}</></div>
    </div>
  );
  const activeCount = [props.filters.title, ...['status', 'owner', 'creator', 'customer', 'version', 'cc'].map((key) => props.filters[key as keyof UnifiedFilterState]), props.filters.createdAt, props.filters.plannedStartDate].filter((value) => Array.isArray(value) ? value.some(Boolean) : Boolean(value)).length;
  const controls = <div className="flex items-center justify-end gap-2">
      <div className="relative flex items-center gap-1">
        {props.searchOpen && <Input aria-label="搜索迭代任务" autoFocus allowClear prefix={<Search className="h-4 w-4" />} value={props.searchDraft} onChange={(event) => { const value = event.target.value; props.onSearchDraftChange(value); props.onOwnerPickerOpenChange(value.includes('@')); }} onPressEnter={props.onSearchApply} placeholder="输入标题或@负责人" className="w-64" />}
        <Button type="text" aria-label="搜索" aria-pressed={props.searchOpen} onClick={() => { props.onSearchOpenChange(!props.searchOpen); props.onFilterOpenChange(false); props.onGroupOpenChange(false); }} icon={<Search className="h-4 w-4" />} />
        {props.searchOpen && props.ownerPickerOpen && <div className="absolute left-0 top-11 z-50 w-[min(88vw,300px)]"><Select aria-label="搜索负责人" open mode="multiple" autoFocus showSearch allowClear optionFilterProp="label" value={props.ownerNames} onChange={props.onOwnerNamesChange} options={multiOptions(props.ownerOptions)} placeholder="搜索负责人或职位" className="w-full" onOpenChange={props.onOwnerPickerOpenChange} /></div>}
      </div>
      <Badge count={activeCount} size="small"><Button type="text" aria-label="过滤器" aria-pressed={props.filterOpen} onClick={() => { props.onFilterOpenChange(!props.filterOpen); props.onSearchOpenChange(false); props.onGroupOpenChange(false); }} icon={<Filter className="h-4 w-4" />} /></Badge>
      <Popover trigger="click" open={props.groupOpen} onOpenChange={props.onGroupOpenChange} placement="bottomRight" content={<WorkItemGroupMenu query={props.groupQuery} groupBy={props.groupBy} options={props.groupOptions} onQueryChange={props.onGroupQueryChange} onSelect={props.onGroupByChange} />}><Button type="text" aria-label="分组" aria-pressed={props.groupOpen} icon={<List className="h-4 w-4" />} /></Popover>
      {props.extra}
    </div>;
  const panel = props.filterOpen && <div data-testid="iteration-filter-panel" className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] p-4"><div className="grid gap-3 lg:grid-cols-2"><div className="grid h-14 grid-cols-[96px_minmax(0,1fr)] items-center rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)]"><div className="px-3 font-medium">标题</div><Input variant="borderless" value={props.filters.title} onChange={(event) => setFilter('title', event.target.value)} placeholder="请输入标题关键词" /></div>{multiRow('状态', 'status')}{multiRow('负责人', 'owner')}{multiRow('创建人', 'creator')}{multiRow('关联客户', 'customer')}{!props.hideVersionFilter && multiRow('迭代版本', 'version')}{dateRow('创建时间', 'createdAt')}{dateRow('计划开始时间', 'plannedStartDate')}{multiRow('参与人', 'cc')}</div><div className="mt-4 flex justify-end gap-2"><Button onClick={props.onClearFilters}>清空</Button><Button type="primary" onClick={props.onApplyFilters}>应用过滤</Button></div></div>;
  if (props.controlsOnly) return <div ref={rootRef}>{controls}</div>;
  if (props.panelOnly) return <div ref={rootRef}>{panel}</div>;
  return <div ref={rootRef} className="space-y-3">{controls}{props.filterPanelTarget && panel ? createPortal(panel, props.filterPanelTarget) : panel}</div>;
};
