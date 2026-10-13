import React from 'react';
import { DatePicker, Select, Table } from 'antd';
import dayjs from 'dayjs';
import type { OkrKrDetail } from '../../../services/okrRepository';

interface Props {
  key?: React.Key;
  rows: OkrKrDetail[];
  label: string;
  stages?: string[];
  disabled?: boolean;
  deadlineLimit?: string;
  lockedRows?: OkrKrDetail[];
  onChange?: (rows: OkrKrDetail[]) => void;
}
export function KrDetailTable({ rows, label, stages = [], disabled = false, deadlineLimit, lockedRows = [], onChange }: Props) {
  if (!rows.length) return null;
  const stageLabel = label === '项目产品' ? '推进阶段' : '完成阶段';
  const patch = (id: string, value: Partial<OkrKrDetail>) => onChange?.(rows.map(row => row.id === id ? { ...row, ...value } : row));
  const dateColumn = (key: 'plannedStartDate' | 'plannedEndDate', title: string) => ({
    title: <span>{title} <span className="okr-required-marker">*</span></span>, key,
    render: (_: unknown, row: OkrKrDetail) => onChange ? <DatePicker aria-required="true" aria-label={`${row.name} ${title}`} placeholder={title} disabledDate={date => Boolean(deadlineLimit && date.isAfter(dayjs(deadlineLimit), 'day')) || (key === 'plannedEndDate' && Boolean(row.plannedStartDate && date.isBefore(dayjs(row.plannedStartDate), 'day')))} disabled={disabled || Boolean(lockedRows.find(item => item.id === row.id)?.[key])} value={row[key] ? dayjs(row[key]) : null} onChange={value => patch(row.id, { [key]: value?.format('YYYY-MM-DD') })}/> : row[key] || '未设置',
  });
  return <div className="okr-kr-detail-table" aria-label={label}>
    <Table<OkrKrDetail> size="small" rowKey="id" pagination={false} dataSource={rows} columns={[
      { title: label, dataIndex: 'name', key: 'name' },
      { title: <span>{stageLabel} <span className="okr-required-marker">*</span></span>, key: 'stage', render: (_: unknown, row: OkrKrDetail) => onChange ? <Select aria-required="true" aria-label={`${row.name} ${stageLabel}`} placeholder={`选择${stageLabel}`} disabled={disabled} value={row.stage} options={[...new Set([...stages, ...(row.stage ? [row.stage] : [])])].map(value => ({ value, label: value }))} onChange={stage => patch(row.id, { stage })}/> : row.stage || '未设置' },
      dateColumn('plannedStartDate', '预计开始时间'), dateColumn('plannedEndDate', '预计完成时间'),
    ]}/>
  </div>;
}
