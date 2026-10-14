import React, { useEffect, useState } from 'react';
import { Alert, Button, Empty, Modal, Select } from 'antd';
import { PlusIcon } from '@primer/octicons-react';
import type { OkrKrDetail } from '../../../services/okrRepository';
import { KrDetailTable } from './KrDetailTable';
import { deliveryCurrentStage, projectDeliveryMap } from '../../../services/projectDeliveryMap';

interface Props {
  rows: OkrKrDetail[];
  mode: 'product' | 'delivery';
  parentOptions: string[];
  childOptions: Record<string, string[]>;
  deliveryStageOptions?: Record<string, string[]>;
  stages: string[];
  disabled: boolean;
  deadlineLimit?: string;
  onChange: (rows: OkrKrDetail[]) => void;
  openPicker?: boolean;
  onPickerClose?: () => void;
  embedded?: boolean;
  initialRowIds?: string[];
}

export function replaceKrDetailSelection(rows: OkrKrDetail[], parent: string, children: string[]): OkrKrDetail[] {
  const selected = [...new Set(children)].map(version => rows.find(row => row.name === parent && row.version === version) || { id: crypto.randomUUID(), name: parent, version });
  const first = rows.findIndex(row => row.name === parent);
  if (first < 0) return [...rows, ...selected];
  return rows.flatMap((row, index) => index === first ? selected : row.name === parent ? [] : [row]);
}

export function KrBusinessDetailEditor({ rows, mode, parentOptions, childOptions, stages, disabled, deadlineLimit, onChange, deliveryStageOptions = {}, openPicker = false, onPickerClose, embedded = false, initialRowIds = [] }: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = openPicker || localOpen;
  const close = () => { setLocalOpen(false); onPickerClose?.(); };
  const [parent, setParent] = useState<string>();
  const [children, setChildren] = useState<string[]>([]);
  const [selectionError, setSelectionError] = useState('');
  const product = mode === 'product';
  const parentLabel = product ? '产品' : '项目';
  const childLabel = product ? '迭代版本' : '项目产品';
  const parents = [...new Set([...parentOptions, ...rows.map(row => row.name)])];
  const availableChildren = parent ? [...new Set([...(childOptions[parent] || []), ...rows.filter(row => row.name === parent).map(row => row.version).filter((value): value is string => Boolean(value))])] : [];
  useEffect(() => { if (disabled) { setLocalOpen(false); onPickerClose?.(); } }, [disabled]);
  useEffect(() => { if (openPicker) { setParent(undefined); setChildren([]); setSelectionError(''); } }, [openPicker]);
  const selectParent = (value: string) => {
    setParent(value);
    setChildren(rows.filter(row => row.name === value).map(row => row.version).filter((value): value is string => Boolean(value)));
    setSelectionError('');
  };
  const start = (value?: string) => {
    setParent(value);
    setChildren(rows.filter(row => row.name === value).map(row => row.version).filter((version): version is string => Boolean(version)));
    setSelectionError('');
    setLocalOpen(true);
  };
  const confirm = () => {
    if (!parent || !parents.includes(parent) || !children.length || children.some(value => !availableChildren.includes(value))) {
      setSelectionError(`可选${parentLabel}或${childLabel}已变化，请重新选择`);
      return;
    }
    const next = replaceKrDetailSelection(rows, parent, children).map(row => mode === 'delivery' && !rows.some(previous => previous.id === row.id) ? {...row, currentStage: deliveryCurrentStage(projectDeliveryMap(), row.name, row.version || '')} : row);
    onChange(next);
    close();
  };
  return <div className="okr-business-detail-editor">
    {!embedded && <Button icon={<PlusIcon/>} disabled={disabled || !parents.length} onClick={() => start()}>添加{parentLabel}</Button>}
    <KrDetailTable rows={rows} label={product ? '产品明细' : '项目明细'} mode={mode} productOptions={childOptions} stages={stages} deliveryStageOptions={deliveryStageOptions} deadlineLimit={deadlineLimit} disabled={disabled} identityEditable={false} placeholder={!rows.length} onSelectChildren={name => start(name || undefined)} removableIds={new Set(rows.filter(row => !initialRowIds.includes(row.id)).map(row => row.id))} onRemove={id => onChange(rows.filter(row => row.id !== id))} onChange={onChange}/>
    <Modal open={open} title={`选择${parentLabel}与${product ? '版本' : '产品'}`} onCancel={close} onOk={confirm} okText="确定" cancelText="取消" destroyOnHidden okButtonProps={{ disabled: disabled || !parent || !children.length }}>
      <div className="okr-business-detail-picker">
        <label><span>{parentLabel}</span><Select aria-label={`关联${parentLabel}`} showSearch optionFilterProp="label" placeholder={`请选择${parentLabel}`} value={parent} disabled={disabled} options={parents.map(value => ({ value, label: value }))} onChange={selectParent} notFoundContent={<Empty description={`暂无可选${parentLabel}`}/>}/></label>
        <label><span>{childLabel}</span><Select aria-label={`关联${childLabel}`} mode="multiple" showSearch optionFilterProp="label" placeholder={`请选择${childLabel}，支持多选`} value={children} disabled={disabled || !parent || !availableChildren.length} options={availableChildren.map(value => ({ value, label: value }))} onChange={value => { setChildren(value); setSelectionError(''); }} notFoundContent={<Empty description={`暂无可选${childLabel}`}/>}/></label>
        {parent && !availableChildren.length && <Alert type="warning" showIcon title={`该${parentLabel}暂无可选${childLabel}，请更换${parentLabel}或先维护对应数据`}/>}
        {selectionError && <Alert type="error" showIcon title={selectionError}/>}
      </div>
    </Modal>
  </div>;
}
