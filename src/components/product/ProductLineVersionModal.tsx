import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  GitBranch
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProductLine, VersionIteration } from '../../types';
import { StatusTag } from '../common/UIComponents';
import { CreateVersionModal } from './CreateVersionModal';

interface ProductLineVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productLine: ProductLine;
}

export const ProductLineVersionModal: React.FC<ProductLineVersionModalProps> = ({
  isOpen,
  onClose,
  productLine
}) => {
  const { versions, updateVersion, addToast } = useApp();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (!isOpen) return null;

  const lineVersions = versions.filter(
    (v) => v.productLineId === productLine.id || v.productLineName === productLine.name
  );

  const handlePublish = (ver: VersionIteration) => {
    updateVersion(ver.id, { status: '已发布' });
    addToast('success', `版本 ${ver.code} 已成功发布上线`);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-[var(--bg-surface)] text-[var(--text-body)] border border-[var(--border-main)] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-surface-soft)]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  版本管理 - {productLine.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  当前主力版本：<span className="text-[var(--active-text)] font-mono font-bold">{productLine.currentVersion || 'V1.0.0'}</span> · 共 {lineVersions.length} 个历史与在研迭代
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A5ADBA]">
                查看所有版本交付时间线，支持快速新增迭代规划与上线发布
              </span>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2F66F6] hover:bg-[#3B73FF] text-[#F8FAFC] rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                创建新版本
              </button>
            </div>

            <div className="space-y-3">
              {lineVersions.length === 0 ? (
                <div className="text-center py-10 bg-[#151A22] border border-[#2C3440] rounded-xl text-xs text-[#7C8796]">
                  暂无版本记录，点击上方“创建新版本”制定首个版本规划
                </div>
              ) : (
                lineVersions.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-[#2C3440] bg-[#151A22] space-y-2.5 hover:border-[#3A4655] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded bg-[#2F66F6]/15 text-[#6EA0FF] font-mono font-bold text-xs border border-[#2F66F6]/30">
                          {v.code}
                        </span>
                        <span className="font-bold text-[#F8FAFC] text-sm">{v.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#7C8796] flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {v.startDate || '2026-09-01'} ~ {v.endDate || v.releaseDate || '2026-09-30'}
                        </span>
                        <StatusTag status={v.status === '规划中' ? '待开始' : v.status === '已发布' ? '已结束' : v.status} />
                      </div>
                    </div>

                    <p className="text-[#A5ADBA] bg-[#121923] p-2.5 rounded-lg leading-relaxed text-[11px]">
                      {v.changelog || v.content || '版本常规升级与维护。'}
                    </p>

                    <div className="flex items-center justify-between text-[#7C8796] pt-1">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span>关联需求：<strong className="text-[#6EA0FF] font-mono">{v.requirementsCount || v.reqCount || 0}</strong> 项</span>
                        <span>关联缺陷：<strong className="text-red-400 font-mono">{v.bugCount || 0}</strong> 处</span>
                      </div>
                      {v.status !== '已发布' && (
                        <button
                          type="button"
                          onClick={() => handlePublish(v)}
                          className="px-2.5 py-1 rounded bg-[#2F66F6]/15 hover:bg-[#2F66F6]/30 text-[#6EA0FF] hover:text-white font-semibold text-[11px] transition-colors"
                        >
                          发布上线
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--border-main)] flex justify-end bg-[var(--bg-surface-soft)]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[var(--bg-elevated)] text-[var(--text-body)] hover:text-[var(--text-primary)] rounded-lg text-xs font-semibold transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      <CreateVersionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        productLine={productLine}
      />
    </>
  );
};
