import React from 'react';
import { DatePicker, Segmented, Select } from 'antd';
import dayjs from 'dayjs';

export type InsightFilter = { mode: 'iteration' | 'time'; versionId: string; period: number | 'custom'; range: [string, string] | null };
export const initialInsightFilter: InsightFilter = { mode: 'iteration', versionId: 'all', period: 90, range: null };

export function insightDateRange(filter: InsightFilter, today = dayjs()): [string, string] | null {
  if (filter.mode !== 'time') return null;
  return filter.period === 'custom' ? filter.range : [today.subtract(filter.period - 1, 'day').format('YYYY-MM-DD'), today.format('YYYY-MM-DD')];
}

export function filterInsightItems<T extends { versionId?: string | null; createdAt?: string }>(items: T[], filter: InsightFilter, today = dayjs()) {
  if (filter.mode === 'iteration') return filter.versionId === 'all' ? items : items.filter((item) => item.versionId === filter.versionId);
  const range = insightDateRange(filter, today);
  if (!range) return [];
  return items.filter((item) => {
    if (!item.createdAt || !dayjs(item.createdAt).isValid()) return false;
    const date = dayjs(item.createdAt).format('YYYY-MM-DD');
    return date >= range[0] && date <= range[1];
  });
}

export const ProductInsightFilter: React.FC<{ value: InsightFilter; onChange: (filter: InsightFilter) => void; versions: Array<{ id: string; name: string }> }> = ({ value, onChange, versions }) => <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3">
  <Segmented aria-label="统计方式" value={value.mode} options={[{ label: '按迭代', value: 'iteration' }, { label: '按时间', value: 'time' }]} onChange={(mode) => onChange({ ...value, mode })} />
  {value.mode === 'iteration' ? <Select aria-label="统计迭代" style={{ width: 280 }} value={value.versionId} options={[{ label: '全部迭代', value: 'all' }, ...versions.map((version) => ({ label: version.name, value: version.id }))]} onChange={(versionId) => onChange({ ...value, versionId })} /> : <>
    <Select aria-label="统计时间" style={{ width: 160, flexShrink: 0 }} value={value.period} options={[7, 14, 30, 90].map((days) => ({ label: `最近${days}天`, value: days as number | 'custom' })).concat([{ label: '自定义', value: 'custom' }])} onChange={(period) => onChange({ ...value, period })} />
    {value.period === 'custom' && <DatePicker.RangePicker style={{ width: 320, minWidth: 240 }} placeholder={['开始日期', '结束日期']} aria-label="自定义统计时间" value={value.range ? [dayjs(value.range[0]), dayjs(value.range[1])] : null} onChange={(dates) => onChange({ ...value, range: dates?.[0] && dates[1] ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')] : null })} />}
  </>}
</div>;
