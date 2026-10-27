import React from 'react';
import { Button, DatePicker, Select, Space, Table, Tooltip } from 'antd';
import { PencilIcon, PlusIcon, TrashIcon } from '@primer/octicons-react';
import dayjs from 'dayjs';
import type { OkrKrDetail } from '../../../services/okrRepository';

interface Props {
  assigneeOptions?: Array<{ value: string; label: string }>;
  personalMetrics?: boolean;
  key?: React.Key;
  rows: OkrKrDetail[];
  label: string;
  stages?: string[];
  deliveryStageOptions?: Record<string, string[]>;
  disabled?: boolean;
  deadlineLimit?: string;
  lockedRows?: OkrKrDetail[];
  onChange?: (rows: OkrKrDetail[]) => void;
  mode?: 'product' | 'delivery';
  onAddVersion?: (name: string) => void;
  onRemove?: (id: string) => void;
  identityEditable?: boolean;
  onSelectChildren?: (name: string) => void;
  removableIds?: Set<string>;
  placeholder?: boolean;
  productOptions?: Record<string, string[]>;
}
export function KrDetailTable({ assigneeOptions, personalMetrics = false, rows, label, stages = [], deliveryStageOptions = {}, disabled = false, deadlineLimit, lockedRows = [], onChange, mode = 'product', productOptions = {}, onAddVersion, onRemove, identityEditable = true, onSelectChildren, placeholder = false, removableIds }: Props) {
  if (!rows.length && !placeholder) return null;
  const displayRows: OkrKrDetail[] = rows.length ? rows : [{ id: 'placeholder', name: '', version: '' }];
  const stageLabel = mode === 'delivery' ? '目标里程碑' : '阶段';
  const patch = (id: string, value: Partial<OkrKrDetail>) => onChange?.(rows.map(row => row.id === id ? { ...row, ...value } : row));
  const dateColumn = (key: 'plannedStartDate' | 'plannedEndDate', title: string) => ({
    title: <span>{title} <span className="okr-required-marker">*</span></span>, key,
    render: (_: unknown, row: OkrKrDetail) => onChange ? <DatePicker aria-required="true" aria-label={`${row.name || '暂未选择'} ${title}`} placeholder={title} disabledDate={date => Boolean(deadlineLimit && date.isAfter(dayjs(deadlineLimit), 'day')) || (key === 'plannedEndDate' && Boolean(row.plannedStartDate && date.isBefore(dayjs(row.plannedStartDate), 'day')))} disabled={disabled || row.id === 'placeholder' || Boolean(lockedRows.find(item => item.id === row.id)?.[key])} value={row[key] ? dayjs(row[key]) : null} onChange={value => patch(row.id, { [key]: value?.format('YYYY-MM-DD') })}/> : row[key] || '未设置',
  });
  return <div className="okr-kr-detail-table" aria-label={label}>
    <Table<OkrKrDetail> size="small" rowKey="id" pagination={false} scroll={{ x: true }} dataSource={displayRows} columns={[
      { title: mode === 'delivery' ? '项目' : '产品', dataIndex: 'name', key: 'name', render: (name: string) => name || '暂未选择' },
      mode === 'delivery' ? { title: identityEditable ? '选择产品' : '项目产品', key: 'version', render: (_: unknown, row: OkrKrDetail) => onChange && identityEditable ? <Select aria-label={`${row.name} 选择产品`} placeholder="选择产品" disabled={disabled} value={row.version} options={[...new Set([...(productOptions[row.name] || []), ...(row.version ? [row.version] : [])])].map(value => ({ value, label: value, disabled: rows.some(other => other.id !== row.id && other.name === row.name && other.version === value) }))} onChange={version => patch(row.id, { version })}/> : row.version || (row.id === 'placeholder' ? '暂未选择' : '未设置') } : { title: '迭代版本', key: 'version', render: (_: unknown, row: OkrKrDetail) => onChange && identityEditable ? <Select aria-label={`${row.name} 迭代版本`} placeholder="选择迭代版本" disabled={disabled} value={row.version} options={[...new Set([...(productOptions[row.name] || []), ...(row.version ? [row.version] : [])])].map(value => ({ value, label: value, disabled: rows.some(other => other.id !== row.id && other.name === row.name && other.version === value) }))} onChange={version => patch(row.id, { version })}/> : row.version || (row.id === 'placeholder' ? '暂未选择' : '未设置') },
      mode === 'delivery' ? { title: '当前里程碑', key: 'currentStage', render: (_: unknown, row: OkrKrDetail) => row.currentStage || '未设置' } : { title: <span>{stageLabel} <span className="okr-required-marker">*</span></span>, key: 'stage', render: (_: unknown, row: OkrKrDetail) => onChange ? <Select aria-required="true" aria-label={`${row.name || '暂未选择'} ${stageLabel}`} placeholder={`选择${stageLabel}`} disabled={disabled || row.id === 'placeholder'} value={row.stage} options={[...new Set([...stages, ...(row.stage ? [row.stage] : [])])].map(value => ({ value, label: value }))} onChange={stage => patch(row.id, { stage })}/> : row.stage || '未设置' },
      ...(mode === 'delivery' ? [{ title: '目标里程碑', key: 'targetStage', render: (_: unknown, row: OkrKrDetail) => onChange ? <Select aria-label={`${row.name || '暂未选择'} 目标里程碑`} placeholder="选择后续里程碑" disabled={disabled || row.id === 'placeholder'} value={row.targetStage} options={(() => { const options=deliveryStageOptions[`${row.name}\u0000${row.version}`] || stages; const index=options.indexOf(row.currentStage || ''); return options.slice(index < 0 ? 0 : index + 1).map(value => ({ value, label: value })); })()} onChange={targetStage => patch(row.id, { targetStage })}/> : row.targetStage || '未设置' }] : []),
      ...(mode === 'product' ? [dateColumn('plannedStartDate', '开始时间'), dateColumn('plannedEndDate', '结束时间')] : []),
      ...(personalMetrics ? [{ title: '进度', key: 'progress', render: (_: unknown, row: OkrKrDetail) => `${row.progress ?? 0}%` }, { title: '权重', key: 'weight', render: (_: unknown, row: OkrKrDetail) => `${row.weight ?? 100}%` }] : assigneeOptions ? [{ title: '承接人', key: 'assignees', render: (_: unknown, row: OkrKrDetail) => onChange ? <Select aria-label={`${row.name} ${row.version || ''} 承接人`} mode="multiple" allowClear showSearch optionFilterProp="label" disabled={disabled || row.id === 'placeholder'} value={row.assigneeIds || []} options={assigneeOptions} onChange={assigneeIds => patch(row.id, { assigneeIds })}/> : (row.assigneeIds || []).map(id => assigneeOptions.find(option => option.value === id)?.label || id).join('、') || '——' }] : []),
      ...(onRemove || onAddVersion || onSelectChildren ? [{ title: '操作', key: 'operations', render: (_: unknown, row: OkrKrDetail) => <Space>{onSelectChildren && <Tooltip title="修改"><Button type="text" icon={<PencilIcon/>} disabled={disabled} aria-label={`修改${row.name}明细`} onClick={() => onSelectChildren(row.name)}/></Tooltip>}{onAddVersion && <Button type="text" icon={<PlusIcon/>} disabled={disabled || !(productOptions[row.name] || []).some(version => !rows.some(item => item.name === row.name && item.version === version)) || rows.some(item => item.name === row.name && !item.version)} aria-label={`${row.name} 添加版本`} onClick={() => onAddVersion(row.name)}>添加版本</Button>}{onRemove && row.id !== 'placeholder' && (!removableIds || removableIds.has(row.id)) && <Button type="text" icon={<TrashIcon/>} disabled={disabled} aria-label={`移除${row.name}${row.version ? ` ${row.version}` : ''}明细`} onClick={() => onRemove(row.id)}/>}</Space> }] : []),
    ]}/>
  </div>;
}
