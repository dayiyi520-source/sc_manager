import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Layers,
  FileText,
  Search,
  CheckCircle2,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Filter
} from '../common/octicons-compat';
import { useApp } from '../../context/AppContext';
import { ProductLine, VersionIteration, RequirementPoolItem } from '../../types';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLine: ProductLine;
  editingVersion?: VersionIteration | null;
  onSuccess?: (version: VersionIteration) => void;
}

export const CreateVersionModal: React.FC<CreateVersionModalProps> = ({
  isOpen,
  onClose,
  productLine,
  editingVersion = null,
  onSuccess
}) => {
  const { requirementPool, addVersion, updateVersion, addToast } = useApp();

  const [versionName, setVersionName] = useState(editingVersion?.name || `${productLine.name} 2026年Q4升级迭代版`);
  const [versionCode, setVersionCode] = useState(() => {
    const current = editingVersion?.code || productLine.currentVersion || 'V1.0.0';
    const match = current.match(/V?(\d+)\.(\d+)\.?(\d+)?/i);
    if (match) {
      const major = parseInt(match[1] || '1', 10);
      const minor = parseInt(match[2] || '0', 10) + 1;
      return `V${major}.${minor}.0`;
    }
    return 'V2.0.0';
  });
  const [startDate, setStartDate] = useState(editingVersion?.startDate || (() => new Date().toISOString().split('T')[0]));
  const [endDate, setEndDate] = useState(() => {
    if (editingVersion?.endDate) return editingVersion.endDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [content, setContent] = useState(editingVersion?.content || editingVersion?.changelog || '');
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>(editingVersion?.linkedRequirementIds || []);
  const [reqSearch, setReqSearch] = useState('');
  const [onlyCurrentLineReqs, setOnlyCurrentLineReqs] = useState(false);
  const [versionStatus, setVersionStatus] = useState(editingVersion?.status || '待开始');

  useEffect(() => {
    if (!isOpen) return;
    setVersionName(editingVersion?.name || `${productLine.name} 2026年Q4升级迭代版`);
    setVersionCode(editingVersion?.code || 'V2.0.0');
    setStartDate(editingVersion?.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(editingVersion?.endDate || '');
    setContent(editingVersion?.content || editingVersion?.changelog || '');
    setSelectedReqIds(editingVersion?.linkedRequirementIds || []);
    setVersionStatus(editingVersion?.status || '待开始');
  }, [editingVersion, isOpen, productLine.name]);

  // Filter requirements from requirementPool (需求表)
  const availableReqs = useMemo(() => {
    return requirementPool.filter((item) => {
      if (onlyCurrentLineReqs && item.productLineName && item.productLineName !== productLine.name) {
        return false;
      }
      if (!reqSearch.trim()) return true;
      const q = reqSearch.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.customerName && item.customerName.toLowerCase().includes(q)) ||
        (item.submitter && item.submitter.toLowerCase().includes(q))
      );
    });
  }, [requirementPool, onlyCurrentLineReqs, productLine.name, reqSearch]);

  if (!isOpen) return null;

  const toggleReq = (id: string) => {
    setSelectedReqIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectedReqs = requirementPool.filter((item) => selectedReqIds.includes(item.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim() || !versionCode.trim()) {
      addToast('warning', '请填写版本名称与版本号');
      return;
    }
    if (!startDate || !endDate) {
      addToast('warning', '请选择预计开始与结束时间');
      return;
    }

    const newVersion: Partial<VersionIteration> = {
      name: versionName.trim(),
      code: versionCode.trim(),
      productLineId: productLine.id,
      productLineName: productLine.name,
      startDate,
      endDate,
      releaseDate: endDate,
      status: versionStatus,
      content: content.trim() || `${productLine.name} 规划版本演进，涵盖核心需求落地与性能优化。`,
      changelog: content.trim() || `${productLine.name} 规划版本演进，涵盖核心需求落地与性能优化。`,
      requirementsCount: selectedReqIds.length,
      reqCount: selectedReqIds.length,
      linkedRequirementIds: selectedReqIds
    };

    if (editingVersion) updateVersion(editingVersion.id, newVersion);
    else addVersion(newVersion);
    if (onSuccess) {
      onSuccess(newVersion as VersionIteration);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] text-[var(--text-body)] border border-[var(--border-main)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-surface-soft)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">创建迭代版本</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                所属产品线：<span className="text-[var(--active-text)] font-medium">{productLine.name}</span> ({productLine.code})
              </p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1.5">版本状态</label>
            <select value={versionStatus} onChange={(e) => setVersionStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--text-primary)]">
              <option value="待开始">待开始</option>
              <option value="迭代中">迭代中</option>
              <option value="已超时">已超时</option>
              <option value="已结束">已结束</option>
            </select>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="create-version-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Row 1: 版本名称 & 版本号 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block font-semibold text-[var(--text-body)] mb-1.5">
                版本名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="例如：师创智联OS V3.6.0 (信创适配增强版)"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[var(--text-body)] mb-1.5">
                版本号 (Version Code) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
                placeholder="例如：V3.6.0"
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--active-text)] font-mono font-bold uppercase focus:outline-hidden focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Row 2: 预计开始时间 & 预计结束时间 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[var(--text-body)] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                预计开始时间 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[var(--text-body)] mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                预计结束时间 (封版交付日) <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {/* Row 3: 版本内容 */}
          <div>
            <label className="block font-semibold text-[var(--text-body)] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--active-text)]" />
              版本内容 / 发版说明范围
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请输入该版本的主要演进内容、核心里程碑目标、关键模块重构与对标交付场景..."
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface-soft)] text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--primary)] leading-relaxed"
            />
          </div>

          {/* Row 4: 关联需求 (需求取自需求表 requirementPool) */}
          <div className="border border-[var(--border-main)] rounded-xl p-4 bg-[var(--bg-surface-soft)]/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--text-primary)] text-xs">关联需求 (取自需求表)</span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--active-text)] text-[11px] font-mono font-bold">
                    已选 {selectedReqIds.length} 项
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  勾选需求池中需要并入本版本迭代规划的业务与产品需求
                </p>
              </div>

              <div className="flex items-center gap-2">
              </div>
            </div>

            {/* Filter toolbar */}
            <div className="flex items-center gap-2 pt-1">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  placeholder="快速搜索需求标题 / 编号 / 客户..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs"
                />
              </div>
              <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-body)] cursor-pointer shrink-0 select-none">
                <input
                  type="checkbox"
                  checked={onlyCurrentLineReqs}
                  onChange={(e) => setOnlyCurrentLineReqs(e.target.checked)}
                  className="rounded border-[var(--border-main)] text-[var(--primary)] focus:ring-0"
                />
                仅当前产品线
              </label>
            </div>

            {reqSearch.trim() && availableReqs.length > 0 && (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--border-main)]/60">
                {availableReqs.map((req) => {
                  const isChecked = selectedReqIds.includes(req.id);
                  return <button type="button" key={req.id} onClick={() => toggleReq(req.id)} className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2 ${isChecked ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30' : 'hover:bg-[var(--bg-elevated)]/70 border border-transparent'}`}>
                    <span className="font-mono text-[var(--active-text)] text-[11px]">{req.code || req.id}</span><span className="text-[var(--text-primary)] truncate">{req.title}</span><span className="ml-auto text-[10px] text-[var(--text-muted)]">{isChecked ? '已选择' : '选择'}</span>
                  </button>;
                })}
              </div>
            )}

            {selectedReqs.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedReqs.map((req) => (
                  <span key={req.id} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2 py-1 text-[11px] text-[var(--text-body)]">
                    <span className="font-mono text-[var(--active-text)]">{req.code || req.id}</span>
                    <span className="max-w-48 truncate">{req.title}</span>
                    <button type="button" onClick={() => toggleReq(req.id)} className="text-[var(--text-muted)] hover:text-red-400" aria-label={`移除${req.title}`}>×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Requirements list，仅在输入搜索后展示 */}
            {false && (
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-[var(--border-main)]/60">
              {availableReqs.length === 0 ? (
                <div className="text-center py-6 text-[var(--text-muted)] text-xs">
                  暂无匹配的需求记录
                </div>
              ) : (
                availableReqs.map((req) => {
                  const isChecked = selectedReqIds.includes(req.id);
                  return (
                    <div
                      key={req.id}
                      onClick={() => toggleReq(req.id)}
                      className={`pt-2 first:pt-0 p-2.5 rounded-lg cursor-pointer transition-colors flex items-start gap-3 ${
                        isChecked
                          ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30'
                          : 'hover:bg-[var(--bg-elevated)]/70 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent div
                        className="mt-0.5 rounded border-[var(--border-main)] text-[var(--primary)] focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-[var(--active-text)] text-[11px]">
                            {req.code || req.id}
                          </span>
                          <span className="font-medium text-[var(--text-primary)] truncate">
                            {req.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              req.priority.includes('P0')
                                ? 'bg-red-950/60 text-red-400 border border-red-800/50'
                                : req.priority.includes('P1')
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                                : 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                            }`}
                          >
                            {req.priority}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-[var(--bg-elevated)] text-[var(--text-body)]">
                            {req.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-1">
                          {req.productLineName && (
                            <span>产品线: <span className="text-[var(--text-body)]">{req.productLineName}</span></span>
                          )}
                          {req.customerName && (
                            <span>客户: <span className="text-[var(--text-body)]">{req.customerName}</span></span>
                          )}
                          {req.submitter && (
                            <span>提报人: <span className="text-[var(--text-body)]">{req.submitter}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>)}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-surface-soft)]/80">
          <div className="text-xs text-[var(--text-muted)]">
            创建后版本将进入 <span className="text-[var(--active-text)] font-medium">规划中</span> 状态并自动同步至研发迭代矩阵
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] text-[var(--text-body)] rounded-lg text-xs font-semibold transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              form="create-version-form"
              className="flex items-center gap-1.5 px-5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-primary)] rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              立即创建版本
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
