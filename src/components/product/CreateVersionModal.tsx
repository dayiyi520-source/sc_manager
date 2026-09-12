import React, { useEffect, useState } from 'react';
import { Button, Cascader, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { Calendar, Check, Clock, FileText, Layers } from '../common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { ProductLine, VersionIteration } from '../../types';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLine?: ProductLine;
  editingVersion?: VersionIteration | null;
  onSuccess?: (version: VersionIteration) => void;
}

export const CreateVersionModal: React.FC<CreateVersionModalProps> = ({ isOpen, onClose, productLine, editingVersion = null, onSuccess }) => {
  const { addVersion, updateVersion, addToast, productLines } = useApp();
  const [selectedProductLineId, setSelectedProductLineId] = useState(productLine?.id || '');
  const [versionName, setVersionName] = useState(editingVersion?.name || '');
  const [versionCode, setVersionCode] = useState(editingVersion?.code || '');
  const [versionOwner, setVersionOwner] = useState(editingVersion?.ownerName || productLine?.ownerName || productLine?.owner || '');
  const [startDate, setStartDate] = useState(editingVersion?.startDate || '');
  const [endDate, setEndDate] = useState(editingVersion?.endDate || '');
  const [content, setContent] = useState(editingVersion?.content || editingVersion?.changelog || '');
  const [productLinePickerOpen, setProductLinePickerOpen] = useState(false);
  const versionStatus = editingVersion?.status || '规划中';

  useEffect(() => {
    if (!isOpen) return;
    setVersionName(editingVersion?.name || '');
    setVersionCode(editingVersion?.code || '');
    setSelectedProductLineId(productLine?.id || editingVersion?.productLineId || '');
    setVersionOwner(editingVersion?.ownerName || productLine?.ownerName || productLine?.owner || '');
    setStartDate(editingVersion?.startDate || '');
    setEndDate(editingVersion?.endDate || '');
    setContent(editingVersion?.content || editingVersion?.changelog || '');
  }, [editingVersion, isOpen, productLine?.id, productLine?.name, productLine?.owner, productLine?.ownerName]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const selectedProductLine = productLines.find((line) => line.id === selectedProductLineId);
    if (!selectedProductLine) {
      addToast('warning', '请选择所属产品线');
      return;
    }
    if (!versionName.trim() || !versionCode.trim() || !versionOwner.trim()) {
      addToast('warning', '请填写版本名称、版本号和版本负责人');
      return;
    }
    const nextVersion: Partial<VersionIteration> = {
      name: versionName.trim(), code: versionCode.trim(), ownerName: versionOwner.trim(),
      productLineId: selectedProductLine.id, productLineName: selectedProductLine.name,
      startDate: startDate || undefined, endDate: endDate || undefined, releaseDate: endDate || undefined,
      status: versionStatus, content: content.trim(), changelog: content.trim(),
      requirementsCount: 0, reqCount: 0, linkedRequirementIds: []
    };
    const saved = editingVersion
      ? await updateVersion(editingVersion.id, nextVersion)
      : await addVersion(nextVersion);
    if (!saved) return;
    onSuccess?.(nextVersion as VersionIteration);
    onClose();
  };

  const activeProductLine = productLines.find((line) => line.id === selectedProductLineId);
  const productLineOptions = productLines.map((line) => ({
    value: line.id,
    label: line.code ? `${line.name} (${line.code})` : line.name
  }));
  const people = Array.from(new Set([
    activeProductLine?.ownerName, activeProductLine?.owner, activeProductLine?.requirementOwner, activeProductLine?.techOwner, activeProductLine?.testOwner,
    ...(activeProductLine?.members || []).map((member) => typeof member === 'string' ? member : member.name)
  ].filter(Boolean) as string[]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[var(--bg-surface)] text-[var(--text-body)] border border-[var(--border-main)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-surface-soft)]">
          <div className="flex items-center gap-2.5"><div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]"><Layers className="w-5 h-5" /></div><div><h3 className="text-base font-bold text-[var(--text-primary)]">{editingVersion ? '修改迭代版本' : '创建迭代版本'}</h3><div className="mt-2 flex items-center gap-[5px] text-xs"><span className="text-[var(--text-muted)]">所属产品线：</span>{(productLine || editingVersion?.productLineId) ? <div className="flex items-center gap-2 font-semibold text-[var(--active-text)]"><span>{activeProductLine?.name || productLine?.name || editingVersion?.productLineName || '未关联产品线'}</span><span className="font-mono text-[var(--primary)]">{activeProductLine?.code || productLine?.code || '—'}</span></div> : <Cascader
            aria-label="选择所属产品线"
            options={productLineOptions}
            value={selectedProductLineId ? [selectedProductLineId] : undefined}
            open={productLinePickerOpen}
            onOpenChange={setProductLinePickerOpen}
            onChange={(values) => {
              const value = values[0];
              if (typeof value !== 'string') return;
              const line = productLines.find((item) => item.id === value);
              if (!line) return;
              setSelectedProductLineId(line.id);
              if (!editingVersion) setVersionOwner(line.ownerName || line.owner || '');
            }}
            displayRender={() => activeProductLine ? `${activeProductLine.name}${activeProductLine.code ? ` (${activeProductLine.code})` : ''}` : '未选择产品线'}
            showSearch
            placeholder="未选择产品线"
            variant="borderless"
            suffixIcon={null}
            className={`version-product-line-cascader ${activeProductLine ? '' : 'is-empty'}`}
            popupClassName="version-product-line-dropdown"
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
          />}</div></div></div>
          <Button type="text" onClick={onClose} aria-label="关闭创建版本">✕</Button>
        </div>
        <form id="create-version-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="md:col-span-2"><label className="block font-semibold text-[var(--text-body)] mb-1.5">版本名称 <span className="text-red-400">*</span></label><Input required value={versionName} onChange={(event) => setVersionName(event.target.value)} placeholder="请输入版本名称" /></div><div><label className="block font-semibold text-[var(--text-body)] mb-1.5">版本号 (Version Code) <span className="text-red-400">*</span></label><Input required value={versionCode} onChange={(event) => setVersionCode(event.target.value)} placeholder="请输入版本号" /></div></div>
          <div><label className="block font-semibold text-[var(--text-body)] mb-1.5">版本负责人 <span className="text-red-400">*</span></label><Select showSearch allowClear value={versionOwner || undefined} onChange={(value) => setVersionOwner(value || '')} options={people.map((name) => ({ value: name, label: name }))} optionFilterProp="label" placeholder="请选择版本负责人" className="w-full" /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block font-semibold text-[var(--text-body)] mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />预计开始时间</label><DatePicker value={startDate ? dayjs(startDate) : null} onChange={(value) => setStartDate(value?.format('YYYY-MM-DD') || '')} className="w-full" placeholder="请选择日期" /></div><div><label className="block font-semibold text-[var(--text-body)] mb-1.5 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-400" />预计结束时间</label><DatePicker value={endDate ? dayjs(endDate) : null} onChange={(value) => setEndDate(value?.format('YYYY-MM-DD') || '')} className="w-full" placeholder="请选择日期" /></div></div>
          <div><label className="block font-semibold text-[var(--text-body)] mb-1.5 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-[var(--active-text)]" />版本内容 / 发版说明范围</label><Input.TextArea rows={3} value={content} onChange={(event) => setContent(event.target.value)} placeholder="请输入该版本的更新内容介绍" /></div>
        </form>
        <div className="px-6 py-4 border-t border-[var(--border-main)] flex items-center justify-end bg-[var(--bg-surface-soft)]/80"><div className="flex items-center gap-3"><Button onClick={onClose}>取消</Button><Button type="primary" htmlType="submit" form="create-version-form" icon={<Check className="w-3.5 h-3.5" />}>保存</Button></div></div>
      </div>
    </div>
  );
};
