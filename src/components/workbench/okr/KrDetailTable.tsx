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
  mode?: 'product' | 'delivery';
  productOptions?: Record<string, string[]>;
}
export function KrDetailTable({ rows, label, stages = [], disabled = false, deadlineLimit, lockedRows = [], onChange, mode = 'product', productOptions = {} }: Props) {
  if (!rows.length) return null;
  const stageLabel = mode === 'delivery' ? '目标里程碑' : '达成阶段';
  const patch = (id: string, value: Partial<OkrKrDetail>) => onChange?.(rows.map(row => row.id === id ? { ...row, ...value } : row));
  const dateColumn = (key: 'plannedStartDate' | 'plannedEndDate', title: string) => ({
    title: <span>{title} <span className="okr-required-marker">*</span></span>, key,
    render: (_: unknown, row: OkrKrDetail) => onChange ? <DatePicker aria-required="true" aria-label={`${row.name} ${title}`} placeholder={title} disabledDate={date => Boolean(deadlineLimit && date.isAfter(dayjs(deadlineLimit), 'day')) || (key === 'plannedEndDate' && Boolean(row.plannedStartDate && date.isBefore(dayjs(row.plannedStartDate), 'day')))} disabled={disabled || Boolean(lockedRows.find(item => item.id === row.id)?.[key])} value={row[key] ? dayjs(row[key]) : null} onChange={value => patch(row.id, { [key]: value?.format('YYYY-MM-DD') })}/> : row[key] || '未设置',
  });
  return <div className="okr-kr-detail-table" aria-label={label}>
    <Table<OkrKrDetail> size="small" rowKey="id" pagination={false} dataSource={rows} columns={[
      { title: mode === 'delivery' ? '项目' : '产品', dataIndex: 'name', key: 'name' },
      mode === 'delivery' ? { title: '选择产品', key: 'version', render: (_: unknown, row: OkrKrDetail) => onChange ? <Select aria-label={`${row.name} 选择产品`} placeholder="选择产品" disabled={disabled} value={row.version} options={(productOptions[row.name] || []).map(value => ({ value, label: value }))} onChange={version => patch(row.id, { version })}/> : row.version || '未设置' } : { title: '迭代版本', key: 'version', render: (_: unknown, row: OkrKrDetail) => onChange ? <Select aria-label={`${row.name} 迭代版本`} placeholder="选择迭代版本" disabled={disabled} value={row.version} options={(productOptions[row.name] || []).map(value => ({ value, label: value }))} onChange={version => patch(row.id, { version })}/> : row.version || '未设置' },
      mode === 'delivery' ? { title: '当前里程碑', key: 'currentStage', render: (_: unknown, row: OkrKrDetail) => row.currentStage || '演示阶段' } : { title: <span>{stageLabel} <span className="okr-required-marker">*</span></span>, key: 'stage', render: (_: unknown, row: OkrKrDetail) => onChange ? <Select aria-required="true" aria-label={`${row.name} ${stageLabel}`} placeholder={`选择${stageLabel}`} disabled={disabled} value={row.stage} options={[...new Set([...stages, ...(row.stage ? [row.stage] : [])])].map(value => ({ value, label: value }))} onChange={stage => patch(row.id, { stage })}/> : row.stage || '未设置' },
      ...(mode === 'delivery' ? [{ title: '目标里程碑', key: 'targetStage', render: (_: unknown, row: OkrKrDetail) => onChange ? <Select aria-label={`${row.name} 目标里程碑`} placeholder="选择后续里程碑" disabled={disabled} value={row.targetStage} options={stages.slice(Math.max(0, stages.indexOf(row.currentStage || '') + 1)).map(value => ({ value, label: value }))} onChange={targetStage => patch(row.id, { targetStage })}/> : row.targetStage || '未设置' }] : []),
      ...(mode === 'product' ? [dateColumn('plannedStartDate', '开始时间'), dateColumn('plannedEndDate', '结束时间')] : []),
    ]}/>
  </div>;
}
